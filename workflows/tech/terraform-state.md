# Terraform state

State lives in S3, one key per stack, with locking. Nothing about it is manual
during a normal deploy — `./pipeline.sh` resolves, bootstraps, and initialises
the backend on every run. This file covers the one-time migration and the things
that go wrong.

**Read [`deploy.md`](deploy.md) first.** `--env dev` is still the live production stack.

## Layout

| Thing | Value |
|-------|-------|
| Bucket | `droneedge-tfstate-<account-id>` — one per AWS account, versioned, encrypted, TLS-only, public access blocked |
| Key | `<project_name>/terraform.tfstate` — `droneedge-dev/…` and `droneedge/…` are separate states |
| Locking | S3 native (`use_lockfile = true`, Terraform ≥ 1.10). No DynamoDB table |
| Bootstrap | [`terraform/bootstrap/`](../../terraform/bootstrap/) — a root module holding only the bucket |
| Logic | [`scripts/ensure-state-backend.sh`](../../scripts/ensure-state-backend.sh) |

The key comes from `project_name` in the tfvars actually being applied, not from
`--env`. `--tfvars` can point at `prod.tfvars` while `ENVIRONMENT` is still
`dev`, and the project name is the only reliable identity of a stack.

`terraform/bootstrap/` is separate from the main module on purpose: an apply
there can only ever touch the state bucket, never the ~128 real resources. It
keeps local state, and losing that state is harmless — `ensure_state_bucket`
skips the bootstrap entirely once the bucket exists.

## One-time: migrating off the local state file

### 1. Rehearse

```bash
./scripts/verify-state-backend.sh            # or --env prod
```

Read-only against the real state key. It creates the bucket if missing, copies
the current state to a throwaway `_rehearsal/` key, binds Terraform to that copy,
runs an infra-only plan, and asserts a planted lock blocks a second run. The real
key is never written; `TF_DATA_DIR` is redirected so `terraform/.terraform` is
never rebound.

A clean verdict means the plan against S3-backed state shows **no destroys or
replacements** — that is the proof the migration will not disturb anything.

### 2. Migrate

```bash
./pipeline.sh --env dev
```

The first run finds no remote state, copies the local file up with
`terraform init -migrate-state -force-copy`, verifies the resource count
survived, and moves the local files to `terraform/.state-pre-s3-backup/<ts>/`.
Files are moved, never deleted.

Run it from the machine holding the newest local state — the laptop — and only
once. Any other machine is blocked from creating state out of thin air by the
guard below.

### 3. Confirm

```bash
./scripts/deploy-preflight.sh
```

Should report `backend: s3://…` and `state is unlocked`.

## Guards

`terraform_init_backend` refuses to apply rather than guess:

| Situation | What happens |
|-----------|--------------|
| Remote state has resources | Binds to it with `-reconfigure`. A stale local file is archived, never copied up |
| Remote absent, local has resources | Migrates, verifies the count, archives the local copy |
| Migration copies fewer resources than expected | Deletes the short remote copy so the next run retries, leaves local untouched, prints the version-recovery command |
| Remote object exists but holds 0 resources while local has some | **Aborts.** Ambiguous — a human resolves it |
| No state anywhere, but the ECS cluster is live | **Aborts.** Applying from empty state would try to recreate live infrastructure |
| No state anywhere, nothing deployed | Initialises a genuinely new stack |

## What drift detection does and does not cover

Three separate layers, with different coverage. Knowing which is which saves chasing the wrong one.

| Layer | Checked by | Coverage |
|-------|-----------|----------|
| Resource configuration, all infra | `terraform plan` — pre-deploy in `deploy-preflight.sh --plan`, post-deploy in `pipeline.sh` | **Every managed resource.** No list to maintain |
| A secret *shell* dropped out of state | `reconcile_secrets` in [`../../scripts/reconcile-state.sh`](../../scripts/reconcile-state.sh) | All declared secret shells; restores ones pending deletion and re-imports missing ones |
| Secret *values* | nothing | **Blind for 6 of 8 secrets** |

Only `db_credentials` and `test_user_password` have terraform-managed values
(`aws_secretsmanager_secret_version` with a `secret_string`). For the other six —
Stripe key, Stripe webhook secret, JWT, admin seed, Grafana OTEL headers,
CloudFront signing key — Terraform knows the shell and nothing about the value.
A value rotated or cleared in the console is invisible to `terraform plan` and to
`reconcile-state.sh` alike. That is a consequence of keeping those values outside
Terraform, not a gap a script can close; the check is that the service still works.

**Creates matter as much as destroys.** A plan that wants to *create* something
is the signature of state having lost a resource that already exists in AWS — the
apply then dies partway on `AlreadyExists` / `AlreadyAssociated`, leaving a
half-applied change. Both gates flag creates, excluding `aws_ecs_task_definition`
because a new revision is registered on every apply by design.

## Repairing drift

When a plan wants to create resources that already exist, import them instead of
applying. Imports are state-only — they change nothing in AWS.

Worked example, from the 2026-09-23 repair (ten resources had accumulated in AWS
without reaching the local state file):

```bash
cd terraform
PEM="$(cat keys/cloudfront-public-key.pem)"
TFI() { terraform import -input=false -var-file=env/dev.tfvars \
          -var "cloudfront_signing_public_key_pem=$PEM" "$1" "$2"; }

# A resource terraform created but failed to finish is tainted: drop it, then
# bind the real one. Never apply over a tainted resource that has a live twin.
terraform state rm aws_nat_gateway.nat
TFI aws_nat_gateway.nat nat-065c30853c561750e

TFI aws_s3_bucket.analytics_archive                                  droneedge-dev-analytics-archive
TFI aws_s3_bucket_versioning.analytics_archive                       droneedge-dev-analytics-archive
TFI aws_s3_bucket_public_access_block.analytics_archive              droneedge-dev-analytics-archive
TFI aws_s3_bucket_server_side_encryption_configuration.analytics_archive droneedge-dev-analytics-archive
TFI aws_s3_bucket_lifecycle_configuration.analytics_archive          droneedge-dev-analytics-archive
TFI aws_iam_policy.analytics_archive_policy  arn:aws:iam::<account>:policy/droneedge-dev-analytics-archive-policy
TFI aws_iam_role_policy_attachment.ecs_task_role_analytics_archive_attachment \
    "droneedge-dev-ecs-task-role/arn:aws:iam::<account>:policy/droneedge-dev-analytics-archive-policy"
TFI aws_cloudwatch_metric_alarm.nat_no_egress droneedge-dev-nat-no-egress
```

Most import IDs are the resource's own name or ARN; S3 sub-resources take the
bucket name; a role-policy attachment takes `<role-name>/<policy-arn>`.

Then re-check before deploying, and clean up anything the failed apply orphaned:

```bash
./scripts/deploy-preflight.sh --plan          # must be clear
aws ec2 delete-nat-gateway --nat-gateway-id <the failed one>
```

## Recovering state

Bucket versioning is on, so every write is recoverable.

```bash
aws s3api list-object-versions --bucket droneedge-tfstate-<account> \
  --prefix droneedge-dev/terraform.tfstate

aws s3api get-object --bucket droneedge-tfstate-<account> \
  --key droneedge-dev/terraform.tfstate --version-id <ID> restored.tfstate
```

Inspect `restored.tfstate`, then push it back with `terraform state push`.
Pre-migration local copies are also in `terraform/.state-pre-s3-backup/`.

## Stale locks

A run that dies mid-apply leaves `<key>.tflock` behind and every later deploy
blocks. `deploy-preflight.sh` fails loudly with the lock's timestamp.

```bash
aws s3api head-object --bucket droneedge-tfstate-<account> \
  --key droneedge-dev/terraform.tfstate.tflock      # who and when
cd terraform && terraform force-unlock <LOCK_ID>    # only if nothing is running
```

Confirm no deploy is actually in flight first — force-unlocking a live apply is
how two writers corrupt one state.

## dev and prod

Separate state keys are the prerequisite for ever running `--env prod`, and they
now exist. They are not by themselves an environment split: prod still shares the
database, CloudFront distributions, and domains described in
[`../../docs/tech/environment-split-plan.md`](../../docs/tech/environment-split-plan.md).
Do not run `--env prod` before working through that plan.

Secrets follow the same split for free — Secrets Manager entries are named
`<project_name>-*`, so a prod stack gets its own `droneedge-stripe-secret-key`
distinct from `droneedge-dev-stripe-secret-key`. For third-party credentials,
prefer two keys from the same vendor account (Stripe issues test and live keys
natively) over a second account.

## Purging published state

Checked 2026-09-22: **no commit on any remote branch contains a state file.** The
two commits that added it (`cdbaf20`, `c588938`, Feb 2026) are unreachable
objects in the local clone only — orphaned by an earlier rebase — so nothing was
published and no history rewrite or force-push is needed.

```bash
./scripts/purge-state-from-history.sh              # classify
./scripts/purge-state-from-history.sh --confirm    # act
```

The script separates the two cases because they carry different risk. With
orphans only it expires reflogs and garbage collects: local, no force-push, no
effect on other clones. **`--expire-unreachable=now` drops every unreachable
object, not just state blobs** — anything recoverable only through the reflog
goes with it. If a remote branch ever does carry state, the script rewrites with
`git filter-repo`, backs up a mirror first, and stops before the push.

Deleting blobs is hygiene, not remediation. Rotate credentials on their own
schedule; if something was ever published, removing it later does not un-publish it.

## Related

- [`deploy.md`](deploy.md) — the deploy itself
- [`deploy-from-cloud.md`](deploy-from-cloud.md) — deploying from a cloud session or phone
- [`../../docs/tech/architecture.md`](../../docs/tech/architecture.md) — resource ownership
