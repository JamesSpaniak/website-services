# Environment overlay audit and split plan

**Status:** Planning only — no infrastructure changes made.  
**Date:** 2026-07-03  
**Context:** `./pipeline.sh --env dev` is used for every deploy, but traffic on `thedroneedge.com` (apex, `www`, `app`, and `app.dev`) all hit the same stack.

---

## Executive summary

Your **live production site is the `droneedge-dev` stack**, not a separate prod stack. The `--env dev` flag only selects `terraform/env/dev.tfvars`, which sets `project_name = "droneedge-dev"`. That name is misleading: the stack already owns production DNS, the production database, production media, and production user data.

`terraform/env/prod.tfvars` exists but has **never been applied as a separate environment**. Running `./pipeline.sh --env prod` against the current Terraform state would **destroy and recreate ~79 resources** (including Aurora), because `project_name` changes from `droneedge-dev` to `droneedge` and almost every resource name is derived from that variable.

**Do not run `--env prod` on the current state** until you follow a deliberate migration runbook.

The hostname `app.dev.thedroneedge.com` is **not an isolated dev environment** today. It is an extra CloudFront alias on the same distribution and the same ECS services as `thedroneedge.com`.

---

## Current live architecture (what `--env dev` deploys)

| Layer | Resource pattern | Notes |
|-------|------------------|-------|
| **Project prefix** | `droneedge-dev-*` | ECR, ECS, VPC, secrets, buckets, etc. |
| **Terraform state** | Single local file `terraform/terraform.tfstate` | No S3 backend, no workspaces |
| **DNS (Route53)** | Zone: `thedroneedge.com` | All records in one zone |
| **Frontend hostnames** | `thedroneedge.com`, `www`, `app`, `app.dev` | All → one CloudFront distribution (`E18NQI6N952OXM`) |
| **Media** | `media.thedroneedge.com` | Shared CloudFront + S3 (`droneedge-dev-media`) |
| **API** | Internal only | Frontend proxies `/api/*` via internal ALB; no public `api.thedroneedge.com` record |
| **Database** | Aurora PostgreSQL Serverless v2 | `droneedge-dev-aurora-cluster`, 0.5–2 ACU, real prod data |
| **Stripe** | Test publishable key in `dev.tfvars` | Live payments depend on Secrets Manager `droneedge-dev-stripe-secret-key` |
| **Email** | Production addresses | `donotreply@`, `james@` via Google SMTP relay |
| **Deploy path** | `./pipeline.sh --env dev` | Builds images tagged with git SHA, pushes to `droneedge-dev-*` ECR, ECS force deploy |

### ECS sizing (current)

| Service | CPU / memory | Autoscale |
|---------|--------------|-----------|
| Frontend | 0.5 vCPU / 1 GB | min 1, max 3 |
| API | 0.5 vCPU / 1 GB | min 1, max 5 |
| Aurora | Serverless v2 | min 0.5 ACU, max 2 ACU |

### Pipeline behavior (relevant to deploys)

- Default environment is `dev` (`ENVIRONMENT=dev`, `TFVARS_FILE=terraform/env/dev.tfvars`).
- `project_name` from tfvars drives all AWS resource names and pipeline ECS/ECR targets.
- Terraform has `lifecycle { ignore_changes = [container_definitions] }` on both ECS task definitions, so **image updates must go through ECS task-definition registration** (recent `pipeline.sh` fix registers a new revision with the new image URI).
- CloudFront cache invalidation runs after frontend deploys.
- `NEXT_PUBLIC_SITE_URL` defaults to `https://thedroneedge.com` at Docker build time.

---

## Overlay comparison: `dev.tfvars` vs `prod.tfvars`

### `terraform/env/dev.tfvars` (what you use today)

```hcl
project_name           = "droneedge-dev"
domain_name            = "thedroneedge.com"
stripe_publishable_key = "pk_test_..."          # Stripe test mode
email_enabled          = true
email_from             = "DroneEdge <donotreply@thedroneedge.com>"
admin_email            = "james@thedroneedge.com"
frontend_debug_logging = "1"
```

### `terraform/env/prod.tfvars` (unused overlay)

```hcl
project_name         = "droneedge"               # different prefix → new resource set
domain_name          = "thedroneedge.com"        # SAME domain
api_subdomain        = "api"
frontend_subdomain   = "app"
# Inherits variable defaults for stripe, email, debug logging, etc.
```

### Effective differences if you switched overlays on the same state

| Setting | dev (live) | prod (overlay) | Impact |
|---------|------------|----------------|--------|
| `project_name` | `droneedge-dev` | `droneedge` | **Renames every AWS resource** → mass destroy/create |
| `domain_name` | `thedroneedge.com` | `thedroneedge.com` | Same — both claim production domain |
| Stripe publishable key | `pk_test_*` | `""` (empty default) | Frontend checkout would break unless prod tfvars filled in |
| `frontend_debug_logging` | `"1"` | `"1"` (default) | Same |
| Email / admin | Explicit prod addresses | Defaults (same addresses) | Same |

### Terraform plan sanity check (`--env prod` on current state)

```
Plan: 79 to add, 17 to change, 79 to destroy.
aws_rds_cluster.aurora_cluster must be replaced
aws_rds_cluster_instance.aurora_instance[0] must be replaced
```

This confirms: **`prod` is not a second environment in your setup — it is a rename/migration of the single stack**, with database replacement risk (`skip_final_snapshot = true` on Aurora).

---

## Why it feels like “dev is prod”

1. **Naming:** `project_name = "droneedge-dev"` suggests non-production, but all production hostnames point here.
2. **`app.dev` subdomain:** Terraform creates `app.dev.thedroneedge.com` as a CloudFront alias on the **same** distribution as apex/`www`/`app` — not a separate stack.
3. **Single state file:** One Terraform state tracks one world. There is no parallel prod state.
4. **Real data:** Aurora, S3 media, user accounts, course content, and Stripe webhooks all live in `droneedge-dev-*` resources.
5. **Default pipeline:** `./pipeline.sh` without flags deploys to this stack.

---

## Options for true dev + prod separation

### Option A — Accept current stack as prod; add dev later (recommended)

**Idea:** Treat today's `droneedge-dev` infrastructure as production. Optionally rename labels/tfvars for clarity. Spin up a **new, smaller dev stack** when needed.

| Pros | Cons |
|------|------|
| No migration risk to live traffic | `droneedge-dev` naming stays confusing unless renamed |
| Prod keeps existing data, DNS, secrets | True dev costs extra (~$50–150/mo for minimal VPC+NAT+Aurora+ECS) |
| Can defer dev until you need it | Rename of `project_name` still hard without replacement |

**Dev hostname target:** `app.dev.thedroneedge.com` only (remove from prod CloudFront aliases when dev stack exists).

---

### Option B — Rename stack to `droneedge` via controlled migration

**Idea:** `./pipeline.sh --env prod` effectively replaces the stack because `project_name` changes.

| Pros | Cons |
|------|------|
| Clean `droneedge` naming | **High risk:** 79 destroys, Aurora replaced, downtime |
| Matches `prod.tfvars` | Must migrate DB, S3 objects, secrets, Stripe webhooks |
| | CloudFront signing key rotation complexity |
| | Route53/ACM may flap during cutover |

**Verdict:** Only with a maintenance window, DB snapshot restore, and rehearsed runbook. Not “flip a flag.”

---

### Option C — Two full stacks in parallel (same AWS account)

**Idea:** Keep `droneedge-dev` as prod; create `droneedge-staging` (or similar) with its own state, VPC, RDS, ECS.

| Pros | Cons |
|------|------|
| Real isolation for dev/staging | ~2× base infrastructure cost |
| Prod untouched during dev setup | Must split DNS: prod keeps apex/`app`; dev gets `app.dev` only |
| | Duplicate NAT gateways, Aurora, etc. |
| | Two Stripe webhook endpoints, two secret sets |

**Verdict:** Best technical isolation without touching prod. Good when you need safe experimentation.

---

### Option D — Separate AWS accounts (prod vs non-prod)

**Idea:** Production account owns `thedroneedge.com`; dev account uses `app.dev` or a separate domain.

| Pros | Cons |
|------|------|
| Strongest blast-radius isolation | Operational overhead (IAM, billing, CI) |
| Clear compliance boundary | Migration from single account is a project |
| | Cross-account media/signing if sharing assets |

**Verdict:** Ideal long-term for a commercial product; overkill until team/revenue justify it.

---

### Option E — Same stack, “dev” = local only

**Idea:** No AWS dev environment. Developers run `docker compose` / local Next.js + local or shared dev DB.

| Pros | Cons |
|------|------|
| Cheapest | No pre-prod integration testing in AWS |
| Zero split work | Risk of “works locally, breaks in prod” |

**Verdict:** Reasonable short-term if you deploy carefully and use feature flags.

---

## Recommended direction

**Short term (now):**  
- Mentally relabel: **`droneedge-dev` = production**.  
- Continue `./pipeline.sh --env dev` until migration is ready.  
- **Never** `./pipeline.sh --env prod` on current state without the runbook below.

**Medium term (when you want a real dev environment):**  
- **Option A + C hybrid:** Keep current stack as prod; add a second stack (`droneedge-staging`) with separate Terraform state.  
- Point **only** `app.dev.thedroneedge.com` at the dev stack.  
- Keep apex, `www`, and `app` on prod.

**Long term (when scaling revenue/traffic):**  
- Consider Option D (separate AWS accounts).  
- Scale prod resources per checklist below.

---

## Migration plan (when you are ready)

### Phase 0 — Prerequisites (do first, no user impact)

- [ ] **Remote Terraform state:** S3 backend + DynamoDB lock (one state key per environment, e.g. `prod/terraform.tfstate`, `dev/terraform.tfstate`).
- [ ] **Document live secrets:** Inventory all `droneedge-dev-*` Secrets Manager entries, Stripe webhook URLs, Grafana OTEL, CloudFront signing keys.
- [ ] **Aurora snapshot:** Manual snapshot before any destructive change; verify restore procedure.
- [ ] **S3 inventory:** `droneedge-dev-media`, `droneedge-dev-raw-video` — size and sync plan for dev if copying.
- [ ] **Fill out `prod.tfvars`:** Production Stripe `pk_live_*`, `frontend_debug_logging = "0"`, email settings, budget alerts.
- [ ] **Commit pipeline ECS fix:** Ensure deploy registers new task definition revisions (image URI updates).
- [ ] **Runbook dry run:** `terraform plan` only, in a clone or with `-refresh-only`, never apply prod overlay on prod state until Phase 2 decision.

### Phase 1 — Clarify production (minimal risk)

**Goal:** Align naming and docs without replacing infrastructure.

1. Rename `terraform/env/dev.tfvars` → `terraform/env/prod.tfvars` **content merge** (keep `project_name = "droneedge-dev"` for now to avoid resource replacement).
2. Add `terraform/env/local.tfvars` or document local-only dev.
3. Update pipeline default: `--env prod` maps to the live tfvars file (even if `project_name` stays `droneedge-dev` temporarily).
4. Add README note: “Production deploy: `./pipeline.sh --env prod`” (same AWS resources until Phase 2).
5. Optional: AWS resource tags `Environment=production` via Terraform (tag-only changes).

**Downtime:** None.

### Phase 2a — Add isolated dev stack (preferred over rename)

**Goal:** `app.dev.thedroneedge.com` → new stack; prod hostnames unchanged.

1. Create new tfvars: `terraform/env/staging.tfvars` with `project_name = "droneedge-staging"`, `domain_name = "thedroneedge.com"`.
2. Initialize **separate state** (new backend key or directory).
3. `terraform apply` staging stack (new VPC, smaller Aurora min ACU, single ECS tasks).
4. Route53: update **only** `app.dev.thedroneedge.com` A record to staging CloudFront.
5. Remove `app.dev.thedroneedge.com` from **production** CloudFront aliases (Terraform change on prod state).
6. Staging Stripe: test keys + separate webhook to staging internal API.
7. Seed staging DB from anonymized snapshot or fixture data (not raw prod copy unless compliance allows).

**Downtime:** Brief DNS/CloudFront propagation for `app.dev` only. Prod apex/`app` unaffected.

### Phase 2b — Rename prod stack to `droneedge` (optional, higher risk)

Only if you need clean AWS resource names and accept migration cost.

1. Maintenance window announced.
2. Aurora final snapshot + export verification.
3. Apply prod overlay OR `terraform state mv` bulk renames (complex; apply is simpler but destructive).
4. Restore DB into new cluster if replaced.
5. Copy/sync S3 if bucket names change.
6. Update Stripe webhook to new API URL if public API is added later.
7. Invalidate all CloudFront distributions.
8. Smoke test: auth, checkout, video playback, email, course progress.

**Downtime:** Hours possible. **Data loss risk** if snapshot/restore skipped.

### Phase 3 — Production scale-up (independent of dev split)

When traffic or load requires it, adjust in **prod state only**:

| Component | Current | Scale-up levers |
|-----------|---------|-----------------|
| Frontend ECS | 512 CPU / 1024 MB, max 3 | 1024 CPU / 2048 MB; max 5–10; consider 2+ tasks always |
| API ECS | 512 CPU / 1024 MB, max 5 | Same; watch internal ALB connection limits |
| Aurora | 0.5–2 ACU | Raise max to 4–16 ACU; add reader instance if read-heavy |
| CloudFront | Default | Already edge-scaled; tune cache behaviors |
| NAT Gateway | Single | Monitor bandwidth; split VPC endpoints already present |
| WAF rate limit | 1000 req/IP | Tune per real traffic patterns |
| VPC Flow Logs | Enabled | Disable in prod if cost spikes (`enable_vpc_flow_logs = false`) |
| Log retention | 7 days | Adjust `cloudwatch_log_retention_days` |

Add observability gates before scaling: Grafana dashboards on ECS CPU, Aurora ACU, ALB 5xx, p95 latency.

### Phase 4 — Hardening

- [ ] Separate Stripe live vs test secrets per environment.
- [ ] `frontend_debug_logging = "0"` in production task env.
- [ ] CI: `main` → prod deploy; `develop` or manual → staging deploy.
- [ ] Database backups: verify PITR, test restore quarterly.
- [ ] `skip_final_snapshot = false` on production Aurora before go-live scale.

---

## DNS map (target end state)

| Hostname | Today | Target (after split) |
|----------|-------|----------------------|
| `thedroneedge.com` | prod (`droneedge-dev`) | prod |
| `www.thedroneedge.com` | prod | prod |
| `app.thedroneedge.com` | prod | prod (or redirect to apex) |
| `app.dev.thedroneedge.com` | **prod** (same CF) | **staging/dev stack** |
| `media.thedroneedge.com` | prod | prod (dev uses staging bucket or path prefix) |
| `api.thedroneedge.com` | cert only, no record | optional future public API |

---

## Immediate “do not do” list

1. **Do not** run `./pipeline.sh --env prod` on the current Terraform state.
2. **Do not** assume `app.dev` is safe to break — it currently serves production code and data.
3. **Do not** create a second Route53 zone for `thedroneedge.com` in the same account without removing the first.
4. **Do not** scale Aurora max down during experiments — prod data lives there.

---

## Quick reference commands (when migration is done)

```bash
# Production (today, until tfvars renamed)
./pipeline.sh --env dev

# Future production (after Phase 1 rename of tfvars only)
./pipeline.sh --env prod

# Future staging/dev
./pipeline.sh --env staging

# Plan only (safe audit)
./pipeline.sh --env prod --plan-only

# Force clean frontend image rebuild
./pipeline.sh --env dev --frontend-only --no-cache
```

---

## Open decisions (fill in before executing)

| Decision | Options | Notes |
|----------|---------|-------|
| Prod `project_name` | Keep `droneedge-dev` vs migrate to `droneedge` | Cosmetic vs migration risk |
| Dev data | Empty seed vs anonymized prod snapshot | Privacy/compliance |
| Dev domain | `app.dev` only vs `staging.thedroneedge.com` | `app.dev` already in cert SANs |
| AWS accounts | Single vs split | Defer until needed |
| Stripe | Test-only on dev; live only on prod | Verify webhook endpoints per stack |

---

## Related files

| File | Role |
|------|------|
| `pipeline.sh` | Build, terraform apply, ECS deploy, CloudFront invalidation |
| `terraform/env/dev.tfvars` | **Live production overlay today** |
| `terraform/env/prod.tfvars` | Unused; would rename stack if applied |
| `terraform/ecs_frontend.tf` | CloudFront aliases include `app.dev` on same distribution |
| `terraform/s3_frontend.tf` | Route53 records for all frontend hostnames |
| `terraform/providers.tf` | No remote backend configured |

---

*This document is planning guidance only. Execute phases in order when you are ready to migrate; re-run `terraform plan` before any apply.*
