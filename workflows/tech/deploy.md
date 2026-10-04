# Deploy workflow

Deploy backend and/or frontend to AWS (production stack today).

## Prerequisites

- AWS CLI authenticated (`aws sts get-caller-identity`)
- Docker running
- Terraform initialized in `terraform/`
- `terraform/env/dev.tfvars` present (this is **live prod** until environment split — see [`docs/tech/environment-split-plan.md`](../../docs/tech/environment-split-plan.md))
- **If the deploy carries new migrations** (`backend/migrations/`, `backend/src/migrations/`): rehearse them on a prod clone first — [`prod-db-clone.md`](prod-db-clone.md). The backend runs pending migrations on boot (`migrationsRun: true`); a failing one crash-loops the API task.

Check all of the above at once with `./scripts/deploy-preflight.sh --plan` (read-only). Deploying from a Claude Code cloud session or phone instead of this machine: [`deploy-from-cloud.md`](deploy-from-cloud.md).

## Standard deploy (both services)

From repo root:

```bash
./pipeline.sh --env dev
```

This will:

1. Build and push Docker images to ECR (tag = current git short SHA; override with `IMAGE_TAG=… ./pipeline.sh` when deploying uncommitted work so the tag is distinguishable)
2. `terraform apply` (infra; image URIs passed as vars → Terraform registers a task-definition revision that matches `ecs_backend.tf` / `ecs_frontend.tf`: env vars, secrets, logging, image)
3. Point each ECS service at the **newest ACTIVE revision of its task family** (the one Terraform just registered) and force a new deployment. If the image differs (it should not), the pipeline clones that revision with the image swapped first
4. Wait for ECS services to stabilize
5. Invalidate frontend CloudFront cache

### How env vars reach the task (fixed 2026-09-12)

Until 2026-09-12 the task definitions had `ignore_changes = [container_definitions]` and the pipeline cloned the *service's current* revision, so env vars added in Terraform (`SEED_TEST_DATA`, `STRIPE_PRO_PRICE_ID_*`, …) never reached prod. Now: **Terraform owns the container definition**, the service keeps `ignore_changes = [task_definition]` (so an apply never re-points the service before the pipeline's health-checked rollout), and `ecs_force_deploy` deploys the family's latest revision. Adding an env var = edit `ecs_*.tf` + tfvars, run the pipeline.

**Secrets rule:** ECS refuses to start a task that references a Secrets Manager secret with no value (`ResourceInitializationError … can't find the specified secret value for staging label: AWSCURRENT`) and the rollout hangs on the old revision until the 900 s wait times out. Secret references that may be empty are therefore conditional: `TEST_USER_PASSWORD` (`seed_test_data`), `STRIPE_WEBHOOK_SECRET` (`stripe_webhook_enabled`, default false). Set the value first, then flip the variable. The Stripe webhook secret's value is Terraform-managed: the first apply with `stripe_webhook_enabled = true` needs `TF_VAR_stripe_webhook_secret=whsec_…` in the environment (the pipeline refuses without it); later deploys don't. Rotate with `--replace 'aws_secretsmanager_secret_version.stripe_webhook_secret[0]'` plus the new `TF_VAR_`.

How the webhook secret behaves across routine deploys:
- **Stored once, kept for good.** The value sits in Secrets Manager, and its version resource sits in the S3 Terraform state, so any machine running the pipeline sees it. `ignore_changes` means a deploy without `TF_VAR_stripe_webhook_secret` never blanks or overwrites it, and the pipeline guard looks at state, so it fires only before the first store.
- **A stray `TF_VAR_` does nothing.** It's ignored after the first store; changing the secret always needs the `--replace` above.
- **Turning `stripe_webhook_enabled` off** drops the version from state, and the API stops reading the secret. Turning it back on asks for the secret again, because the guard checks state. That's safe, just one more paste.
- **Live cutover:** the live endpoint has a different `whsec_`, so use the rotation command with the live secret in the same deploy that switches the keys.
- `STRIPE_EVENT_REPLAY_ENABLED` (the hourly replay of undelivered webhooks) follows `stripe_webhook_enabled` automatically and needs no secret of its own.

## Partial deploys

```bash
./pipeline.sh --env dev --frontend-only
./pipeline.sh --env dev --backend-only
./pipeline.sh --env dev --frontend-only --no-cache   # force fresh Next.js build
./pipeline.sh --env dev --plan-only                  # terraform plan, no deploy
./pipeline.sh --env dev --replace aws_nat_gateway.nat  # recreate stuck NAT (keeps EIP)
```

`--replace ADDR` is passed through to `terraform apply -replace=…`. Use it for resources that still exist in AWS/state but are dead (NAT gateway that reports `available` with zero `ConnectionAttemptCount`). Do **not** run `terraform apply` outside this script — a bare apply uses the backend defaults in `providers.tf` (the dev key) regardless of which tfvars you pass, and skips the secret/CloudFront reconciliation the pipeline does first. Repeat `--replace` for multiple addresses. After one successful replace, later deploys omit the flag.

NAT replace + image deploy in one shot (SMTP timeouts live in the API image):

```bash
./pipeline.sh --env dev --backend-only --replace aws_nat_gateway.nat
```

## Verify

1. ECS task definition image tag matches git SHA:
   ```bash
   aws ecs describe-task-definition --task-definition droneedge-dev-drone-frontend-task \
     --query 'taskDefinition.containerDefinitions[0].image' --output text
   ```
2. CloudWatch logs: `/ecs/droneedge-dev/frontend`, `/ecs/droneedge-dev/api-server`
3. Site: https://thedroneedge.com (hard refresh after invalidation)
   - Full click-through (site, waitlist, Stripe test purchases), runnable by a browser agent: [`post-deploy-smoke-test.md`](post-deploy-smoke-test.md)
4. After the first apply that creates `droneedge-dev-ops-alerts`, confirm the SNS email sent to `admin_email` (`james@thedroneedge.com`). Until then NAT alarm `droneedge-dev-nat-no-egress` is still visible under CloudWatch → Alarms but will not email. OK/ALARM both email after confirm.

## Do not

- Run `./pipeline.sh --env prod` on current Terraform state without the migration runbook.
- Assume `app.dev.thedroneedge.com` is a separate environment (same stack today).

## Related

- [`deploy-from-cloud.md`](deploy-from-cloud.md) — running this deploy from a cloud session / phone
- [`docs/tech/environment-split-plan.md`](../../docs/tech/environment-split-plan.md)
- `pipeline.sh`, `terraform/`, `scripts/deploy-preflight.sh`
