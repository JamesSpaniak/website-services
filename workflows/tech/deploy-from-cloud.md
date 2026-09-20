# Deploy from a Claude Code cloud session

How to run a deploy from [claude.ai/code](https://claude.ai/code) or the Claude mobile app instead of the laptop. Same `./pipeline.sh --env dev` as [`deploy.md`](deploy.md) — this file covers only what is different about running it in the cloud VM.

**Read [`deploy.md`](deploy.md) first.** `--env dev` is still the **live production stack**.

## The constraint that drives everything here

`terraform/providers.tf` has **no backend block**, so Terraform state is the local file `terraform/terraform.tfstate`, which is committed to git. There is no remote state and no locking.

That means **whoever deploys must be holding the newest state**, and must commit the state it writes back. Two consequences:

- A cloud session that starts from a stale committed snapshot and runs `terraform apply -auto-approve` reconciles the difference — the destroy-and-recreate path described in [`../../docs/tech/environment-split-plan.md`](../../docs/tech/environment-split-plan.md).
- The cloud VM is ephemeral. State written there is lost unless it is committed and pushed **in the same session**.

Until state moves to an S3 backend (see [Follow-up](#follow-up-remove-the-state-handoff)), cloud deploys require a laptop → cloud state handoff every time.

## One-time environment setup

Done once per cloud environment, not per session. See [Session lifecycle](#session-lifecycle-what-persists-and-what-does-not) for what re-runs when.

### 1. Setup script

Cloud sessions ship Docker, git, Node, Python — but **not** the AWS CLI or Terraform. Install them with the environment's setup script.

At [claude.ai/code](https://claude.ai/code): environment selector (cloud icon above the message box) → settings icon → **Setup script**. Paste the contents of [`scripts/cloud-setup.sh`](../../scripts/cloud-setup.sh).

That script is the source of truth — edit it in the repo, then re-paste. It cannot be run *from* the repo, because the setup script runs before Claude Code launches. It installs the AWS CLI v2 and Terraform pinned to the version in `terraform.tfstate` (1.13.3), in parallel, in about 6 seconds.

### 2. Environment variables

Same dialog, **Environment variables** field, `.env` format:

```text
AWS_ACCESS_KEY_ID=AKIA…
AWS_SECRET_ACCESS_KEY=…
AWS_REGION=us-east-1
```

Three things to know before pasting credentials here:

- **AWS SSO does not work in cloud sessions** — it needs a browser login the VM can't do. Static IAM access keys are the only option.
- **Anyone who uses the environment can read these values.** They are plain environment variables, not secrets. The agent-proxy "API credentials" feature does not help: AWS SigV4 signs requests inside the VM, so the key has to be present there.
- Therefore use a **dedicated IAM user** scoped to what `pipeline.sh` actually calls (ECR, ECS, Secrets Manager, CloudFront, plus whatever `terraform apply` touches), not your admin keys, and rotate it on a schedule.

### 3. Network access

Leave it on **Trusted**. The default allowlist already covers `*.amazonaws.com` (STS, ECR including the account-specific `dkr.ecr` push endpoint, ECS, Secrets Manager, CloudFront) and `releases.hashicorp.com`. No Custom policy needed.

### 4. SessionStart hook

Already committed at [`.claude/settings.json`](../../.claude/settings.json) → [`scripts/cloud-session-start.sh`](../../scripts/cloud-session-start.sh). Nothing to configure.

Docker is installed but `dockerd` is not running, and the environment cache is a filesystem snapshot that does not keep running processes — so the daemon has to be started on every session. The hook does that, and no-ops on your laptop (`CLAUDE_CODE_REMOTE` is only `true` in the cloud).

## Per-deploy: the laptop → cloud handoff

### On the laptop, before the cloud session

```bash
git checkout main && git pull
cd terraform && terraform init -input=false && cd ..

# Prove the committed state matches AWS. Any destroy/replace here means the
# state in git is behind reality — do not hand it to a cloud session.
./scripts/deploy-preflight.sh --plan

git status --porcelain terraform/terraform.tfstate   # commit it if it moved
git add terraform/terraform.tfstate && git commit -m "Refresh terraform state before cloud deploy" && git push
```

### In the cloud session

```bash
git pull                                 # must include the state commit above
./scripts/deploy-preflight.sh --plan     # must exit 0
./pipeline.sh --env dev                  # or --backend-only / --frontend-only
```

### Immediately after, still in the same session

```bash
git add terraform/terraform.tfstate && git commit -m "Terraform state after cloud deploy <sha>" && git push
```

**Do not end the session before this push.** The VM is reclaimed after idle and the state goes with it, leaving AWS ahead of every copy of the state in git.

### Back on the laptop

```bash
git pull    # take the state the cloud session wrote, before deploying again
```

## Preflight

[`scripts/deploy-preflight.sh`](../../scripts/deploy-preflight.sh) is read-only — no AWS writes, no repo writes. Run it anywhere, laptop or cloud.

| Check | Fails when |
|-------|-----------|
| Toolchain | `aws`, `terraform`, or a running Docker daemon missing |
| Terraform version | binary differs from the version that wrote the state |
| AWS credentials | `sts get-caller-identity` fails, or the account differs from the one in state |
| State | file missing, branch behind `origin`, uncommitted state changes, state older than 7 days |
| Required files | `terraform/env/dev.tfvars`, `terraform/keys/cloudfront-public-key.pem` |
| `--plan` | Terraform plan fails, **or contains any destroy/replace action** |

The `--plan` mode reads the live ECS task definitions and plans against the images already running, so the plan is infra-only: anything it wants to change is real drift, not your deploy. **Any destroy or replace is a stop.**

## Session lifecycle: what persists and what does not

Configuring this is a one-time job, but the container is disposable.

| Layer | Lifetime |
|-------|----------|
| Environment config (setup script, env vars, network level) | Permanent until you edit it |
| Filesystem snapshot from the setup script | Reused by new sessions; rebuilt when you edit the setup script or the allowed hosts, and after ~7 days |
| Session VM (repo checkout, uncommitted files, running processes) | Reclaimed after idle; **anything not committed and pushed is gone** |
| `dockerd` and other processes | Per session — restarted by the SessionStart hook |

So: set the environment up once, and treat every session's disk as throwaway.

## Do not

- Deploy from a cloud session without `./scripts/deploy-preflight.sh --plan` passing.
- Deploy when the plan shows destroys or replacements — that is stale state, not a deploy.
- End a cloud session that ran `pipeline.sh` without pushing `terraform/terraform.tfstate`.
- Deploy from laptop and cloud in the same window. One writer at a time; there is no state lock.
- Put admin AWS keys in the environment variables field.

## Follow-up: remove the state handoff

The handoff above exists only because state is a file in git. Moving state to an **S3 backend with a DynamoDB lock table** removes every step in [the laptop → cloud handoff](#per-deploy-the-laptop--cloud-handoff): both machines read and write the same state, and the lock stops concurrent applies. Tracked in [`../../docs/TODO.md`](../../docs/TODO.md).

`.github/workflows/deploy.yml` is the other half of this. It fires on every push to `main` and has failed on all runs — its OIDC role ARN is built from an unset `AWS_ACCOUNT_ID` secret, and its build steps drifted from `pipeline.sh` (wrong ECR repo names, wrong build context, `terraform apply` with no tfvars). Once state is in S3, that workflow rewritten around `./pipeline.sh --env dev` on `workflow_dispatch` is a better mobile deploy path than a cloud session: one tap, no state handoff.

## Related

- [`deploy.md`](deploy.md) — the deploy itself, partial deploys, verification
- [`../../docs/tech/environment-split-plan.md`](../../docs/tech/environment-split-plan.md) — why `--env prod` is dangerous on current state
- [`../../docs/tech/architecture.md`](../../docs/tech/architecture.md) — resource ownership, NAT recovery
