# GitHub OIDC deploy role — implementation plan

**Status:** Planned — no infrastructure changes made. Nothing in this plan has been applied.
**Date:** 2026-09-23
**Context:** [`.github/workflows/deploy.yml`](../../.github/workflows/deploy.yml) is rewritten and correct but inert: it has no way to authenticate to AWS. This plan adds an OIDC role so Actions (and therefore a phone, and later a collaborator) can deploy without a stored AWS credential. The laptop keeps its existing key and is not touched.

---

## Executive summary

The laptop deploys with a **static IAM user access key** — `arn:aws:iam::956463123464:user/droneedge_dev`, plaintext in `~/.aws/credentials`, carrying **`AdministratorAccess`**, key `AKIA…YKOT` created **2026-02-14** and still active. Not SSO, despite what [`deploy-from-cloud.md`](../../workflows/tech/deploy-from-cloud.md) implies.

Adding an OIDC role is **purely additive**. Neither [`providers.tf`](../../terraform/providers.tf) nor [`pipeline.sh`](../../pipeline.sh) names a credential source — both use the ambient default chain — so the laptop and the runner cannot interfere with each other. Laptop deploys continue to work with no extra auth step.

**Scoping the role's permissions is not worth attempting.** Terraform manages 6 IAM roles, 4 policies and 5 attachments, so the deploy identity needs IAM write, and IAM write is privilege escalation. A "scoped" policy here is theater. **All of the security value lives in the trust policy**, plus the GitHub-side approval gate.

Even as an admin role, OIDC is strictly better than the status quo on every axis except requiring GitHub: nothing stored at rest, 1-hour tokens, per-run CloudTrail attribution, and revocation by deleting one role.

---

## Verified facts

Checked on 2026-09-23 — re-verify if resuming much later.

| Fact | Evidence |
|---|---|
| `thumbprint_list` is **Optional+Computed** in AWS provider 5.100.0 — no `tls` provider dependency needed | `terraform providers schema -json` |
| **No OIDC provider exists** in account `956463123464` | `aws iam list-open-id-connect-providers` → empty |
| Preflight compares **account**, not ARN — an assumed-role identity passes unchanged, no script edits needed | [`deploy-preflight.sh:142`](../../scripts/deploy-preflight.sh#L142) |
| **No architecture mismatch**: laptop is a genuine Intel i9, ECS has no `runtime_platform` (→ X86_64 default), `ubuntu-latest` is x86_64 | `sysctl machdep.cpu.brand_string`, `grep runtime_platform terraform/ecs_*.tf` |
| Runner checkout is small: git pack is 114 MiB; the 19 GB in `assets/` is untracked | `git count-objects -vH` |
| `terraform/env/dev.tfvars` and `terraform/keys/cloudfront-public-key.pem` are **tracked**, so a runner checkout has both | `git ls-files` |
| The repo is **public** | unauthenticated GitHub API returns 200 |

---

## Naming decision

The GitHub Environment is named **`aws-deploy`**, deliberately **not** `production`.

`--env dev` is [`pipeline.sh`](../../pipeline.sh)'s tfvars selector; a GitHub Environment is an approval gate plus the `environment:` claim in the OIDC subject. They share no namespace. Naming the environment `production` while the job runs `--env dev` is *technically* correct — `--env dev` is the live production stack — but it invites confusion with [`prod.tfvars`](../../terraform/env/prod.tfvars). Revisit at the environment split.

---

## Phase 1 — Terraform *(agent can do)*

New file `terraform/iam_github_oidc.tf`, following the existing lowercase topic-file convention.

- [ ] `aws_iam_openid_connect_provider` for `https://token.actions.githubusercontent.com`, client ID `sts.amazonaws.com`. Omit `thumbprint_list`.
- [ ] `aws_iam_role` `droneedge-github-deploy`, trust policy asserting `aud = sts.amazonaws.com` and `sub = repo:JamesSpaniak/website-services:environment:aws-deploy`.
- [ ] Attach `AdministratorAccess`, with a comment recording *why* scoping is not attempted (see Executive summary).
- [ ] Add the role ARN to [`outputs.tf`](../../terraform/outputs.tf).

## Phase 2 — GitHub configuration *(manual — agent cannot do this)*

`gh` is not installed on this machine, and these are UI-only settings regardless.

- [ ] **Settings → Environments → New environment → `aws-deploy`**
- [ ] **Required reviewers → yourself.** This is the gate that makes the collaborator model safe.
- [ ] **Deployment branches → Selected branches → `main`** only.
- [ ] **Environment secret** `AWS_DEPLOY_ROLE_ARN` = the Phase 1 output. Environment-scoped, *not* repo-scoped, so it only exists for jobs that cleared the gate.
- [ ] **Settings → Branches → protect `main`**: require a PR, require review, no force-push. See gap 1 — load-bearing, not optional.

## Phase 3 — Workflow *(agent can do)*

- [ ] Add `environment: aws-deploy` to the `deploy` job.
- [ ] Add `fetch-depth: 1` to the checkout step.
- [ ] Update the now-stale prerequisite comment at [`deploy.yml:7-11`](../../.github/workflows/deploy.yml#L7-L11).

## Phase 4 — Apply and test *(manual)*

- [ ] From the laptop: `./pipeline.sh --env dev --plan-only`. Confirm **exactly 2 creates**, no changes, no destroys.
- [ ] Apply. Resource count goes **128 → 130**.
- [ ] Re-run [`reconcile-state.sh`](../../scripts/reconcile-state.sh) to re-baseline. The "clean at 128" benchmark becomes 130.
- [ ] From the phone: dispatch `mode=plan-only`, approve the gate, confirm the run authenticates and the plan is clean.
- [ ] Only then try `mode=deploy` with the typed `deploy-production` confirmation.

## Phase 5 — Docs *(agent can do)*

- [ ] Close the OIDC row in [`../TODO.md`](../TODO.md) and move it to [`../TODO_COMPLETED.md`](../TODO_COMPLETED.md) with the date.
- [ ] Fix the misleading SSO line in [`deploy-from-cloud.md`](../../workflows/tech/deploy-from-cloud.md) — it implies the laptop uses SSO; it uses a static admin key.
- [ ] Document the collaborator model below in `deploy-from-cloud.md`.
- [ ] Reconsider the **Scoped IAM deploy user for cloud sessions** row in [`../TODO.md`](../TODO.md) — OIDC may let it be closed as "won't do" rather than implemented.

---

## The collaborator model

The reason to prefer OIDC over sharing a key, stated explicitly so it survives a context reset:

A helper gets **GitHub write access and no AWS credentials, ever**. They open a PR or dispatch the workflow; the `aws-deploy` environment holds the deploy for your approval; the role is assumed only for that run and only for one hour. Revoking their access is a GitHub setting, not a key rotation.

This only holds if **gap 1** is closed. The role is admin, so anyone who can land code on `main` can make the runner do anything. Branch protection and the branch-restricted environment are what convert "they have GitHub access" into "they cannot reach AWS unilaterally."

---

## Gaps and issues

**1. Branch protection is what makes the collaborator story real — and was not verifiable from this machine.** A helper with write access can push a workflow that uses the admin role for anything. Environment approval only helps if you can trust what you are approving, so you need *both* `main` protection *and* the environment restricted to `main`. Current protection settings are **unknown** (no `gh`, and the API needs auth). **Check this before granting anyone access.**

**2. The CloudFront private key is not in git, so Actions deploys silently skip the secret seed.** Only `cloudfront-public-key.pem` is tracked. [`pipeline.sh:294-304`](../../pipeline.sh#L294-L304) seeds the private key into Secrets Manager when present; [`deploy-preflight.sh:209`](../../scripts/deploy-preflight.sh#L209) only **warns** when it is absent, so the run passes and the deploy proceeds. Consequence: an Actions deploy can never re-seed that secret. Harmless while the secret holds its value; if it is ever cleared or recreated, **only a laptop deploy can fix it**. That secret is one of the 6 in the "secret values are unmonitored" TODO row.

*Decision: accept and document. Do **not** put the private key in GitHub secrets.*

**3. The role is admin and that is not fixable here.** A compromised run that clears the gate equals account takeover. Trust policy + approval + branch protection are the entire defense. Recorded so nobody later mistakes the broad policy for an oversight.

**4. Re-baselining.** This adds 2 resources to a stack that was just brought to 128 and plan-clean. Anything quoting 128 needs updating or the next reconcile reads as drift.

**5. First Actions deploy will be slow** — no Docker layer cache on a fresh runner, plus provider downloads. Expect several minutes more than the laptop. Not a hang.

---

## Out of scope, but adjacent

- **`test_user_password` is set in the committed [`dev.tfvars`](../../terraform/env/dev.tfvars), and this repo is public** — so it is world-readable today. `seed_test_data = false` so it is unused, and it is already on the secret-rotation TODO. Pre-existing; not caused by this plan.
- **The laptop's own `AdministratorAccess` key** (`AKIA…YKOT`, created 2026-02-14) is not tracked in [`../TODO.md`](../TODO.md) or [`../TODO_COMPLETED.md`](../TODO_COMPLETED.md). The deferred secret-rotation work covers Secrets Manager *values* in `droneedge-dev-*`, not this key. Once OIDC works, the laptop key could be demoted or retired — worth its own TODO row either way.
- **Not related to the prod cutover or secret rotation.** Those concern secret *values*. This plan shares no dependency with them.
