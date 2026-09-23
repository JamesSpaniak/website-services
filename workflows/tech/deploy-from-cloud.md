# Deploy from a Claude Code cloud session

How to run a deploy from [claude.ai/code](https://claude.ai/code) or the Claude mobile app instead of the laptop. Same `./pipeline.sh --env dev` as [`deploy.md`](deploy.md) — this file covers only what is different about running it in the cloud VM.

**Read [`deploy.md`](deploy.md) first.** `--env dev` is still the **live production stack**.

## State is shared, so there is no handoff

Terraform state lives in S3 at `s3://droneedge-tfstate-<account>/<project_name>/terraform.tfstate`, with locking. The laptop, a cloud session, and CI all read and write the same object, and the lock stops two of them applying at once.

That removes the whole laptop → cloud state dance this file used to describe. A cloud session needs nothing but credentials and a checkout: `./pipeline.sh` resolves the backend itself, and nothing has to be committed afterwards.

The ephemeral VM stops mattering for state — state is never on its disk. It still matters for everything else: **anything you edit and do not push is gone when the session is reclaimed.**

Details, guards, and recovery: [`terraform-state.md`](terraform-state.md).

## One-time environment setup

Done once per cloud environment, not per session. See [Session lifecycle](#session-lifecycle-what-persists-and-what-does-not) for what re-runs when.

### 1. Setup script

Cloud sessions ship Docker, git, Node, Python — but **not** the AWS CLI or Terraform. Install them with the environment's setup script.

At [claude.ai/code](https://claude.ai/code): environment selector (cloud icon above the message box) → settings icon → **Setup script**. Paste the contents of [`scripts/cloud-setup.sh`](../../scripts/cloud-setup.sh).

That script is the source of truth — edit it in the repo, then re-paste. It cannot be run *from* the repo, because the setup script runs before Claude Code launches. It installs the AWS CLI v2 and Terraform pinned to 1.13.3, in parallel, in about 6 seconds. The pin matters: the S3 backend uses native state locking, which needs Terraform ≥ 1.10.

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

## Per-deploy

```bash
git pull
./scripts/deploy-preflight.sh --plan     # must exit 0
./pipeline.sh --env dev                  # or --backend-only / --frontend-only
```

That is the whole procedure, and it is identical on the laptop. Nothing to commit before, nothing to commit after — the state the deploy writes is already in S3 before the session ends.

The one rule that survives: **do not start a deploy while another one is running.** The state lock will reject the second writer rather than corrupt anything, but a rejected deploy still wastes a build.

## Preflight

[`scripts/deploy-preflight.sh`](../../scripts/deploy-preflight.sh) is read-only — no AWS writes, no repo writes. Run it anywhere, laptop or cloud.

| Check | Fails when |
|-------|-----------|
| Toolchain | `aws`, `terraform`, or a running Docker daemon missing |
| Terraform version | binary differs from the version that wrote the state |
| AWS credentials | `sts get-caller-identity` fails, or the account differs from the one in state |
| State backend | bucket unreachable, or no state in S3 while the ECS cluster is live |
| State lock | a lock is held — another deploy is running, or a crashed run left it behind |
| Branch | behind `origin` — you would deploy stale code |
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
- Deploy when the plan shows destroys or replacements — that is drift, not a deploy.
- Force-unlock the state because a deploy is "stuck" without first confirming nothing is running.
- Commit `terraform/terraform.tfstate`. It is gitignored and no longer authoritative; a committed copy is a trap for the next person.
- Put admin AWS keys in the environment variables field.

## The other mobile path: GitHub Actions

With state shared, a cloud session is no longer the only way to deploy from a phone. [`.github/workflows/deploy.yml`](../../.github/workflows/deploy.yml) now runs the same `./pipeline.sh --env dev` on **`workflow_dispatch`** — manual only, never on push — with a scope picker, a `plan-only` default, and a typed confirmation before a real deploy. One tap from the GitHub mobile app, no VM to configure.

It is not usable yet: it needs an IAM role GitHub can assume via OIDC and a repository secret `AWS_DEPLOY_ROLE_ARN`. Until both exist it fails at the credentials step, which is the intended default. Tracked in [`../../docs/TODO.md`](../../docs/TODO.md).

A cloud session is still the better path when you want to *look around* — read logs, inspect state, run one-off scripts — rather than just ship what is already on `main`.

## Related

- [`deploy.md`](deploy.md) — the deploy itself, partial deploys, verification
- [`terraform-state.md`](terraform-state.md) — the S3 backend, locking, state recovery
- [`../../docs/tech/environment-split-plan.md`](../../docs/tech/environment-split-plan.md) — why `--env prod` is dangerous on current state
- [`../../docs/tech/architecture.md`](../../docs/tech/architecture.md) — resource ownership, NAT recovery
