# Deploy workflow

Deploy backend and/or frontend to AWS (production stack today).

## Prerequisites

- AWS CLI authenticated (`aws sts get-caller-identity`)
- Docker running
- Terraform initialized in `terraform/`
- `terraform/env/dev.tfvars` present (this is **live prod** until environment split — see [`docs/tech/environment-split-plan.md`](../../docs/tech/environment-split-plan.md))

## Standard deploy (both services)

From repo root:

```bash
./pipeline.sh --env dev
```

This will:

1. Build and push Docker images to ECR (tag = current git short SHA)
2. `terraform apply` (infra; image URIs passed as vars)
3. Register new ECS task definitions with updated image URIs and deploy
4. Wait for ECS services to stabilize
5. Invalidate frontend CloudFront cache

## Partial deploys

```bash
./pipeline.sh --env dev --frontend-only
./pipeline.sh --env dev --backend-only
./pipeline.sh --env dev --frontend-only --no-cache   # force fresh Next.js build
./pipeline.sh --env dev --plan-only                  # terraform plan, no deploy
```

## Verify

1. ECS task definition image tag matches git SHA:
   ```bash
   aws ecs describe-task-definition --task-definition droneedge-dev-drone-frontend-task \
     --query 'taskDefinition.containerDefinitions[0].image' --output text
   ```
2. CloudWatch logs: `/ecs/droneedge-dev/frontend`, `/ecs/droneedge-dev/api-server`
3. Site: https://thedroneedge.com (hard refresh after invalidation)

## Do not

- Run `./pipeline.sh --env prod` on current Terraform state without the migration runbook.
- Assume `app.dev.thedroneedge.com` is a separate environment (same stack today).

## Related

- [`docs/tech/environment-split-plan.md`](../../docs/tech/environment-split-plan.md)
- `pipeline.sh`, `terraform/`
