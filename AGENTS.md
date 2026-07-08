# Agent guide — repo root

Entry point for AI agents (Cursor, Claude Code, CI bots) working in this monorepo. Full rules live in [`docs/AGENTS.md`](docs/AGENTS.md); this file defines the doc system and the standard working sequence.

## Doc system — definitions

| File type | Audience | Contains |
|-----------|----------|----------|
| `README.md` (per folder) | Humans | What the folder is, quick start, layout |
| `AGENTS.md` (per folder) | Agents | Editing rules, sensitive operations, change → doc table |
| `docs/{tech,sales,marketing}/*.md` | Both | **Canonical reference** — stable facts, architecture, strategy |
| `workflows/<domain>/*.md` | Both | **Runbooks** — ordered steps you execute |
| `docs/TODO.md` / `docs/TODO_COMPLETED.md` | Both | Open backlog / dated archive of shipped items |
| `docs/SKILLS.md` | Agents | Task → doc/workflow/script lookup |

Rule of thumb: **facts change → edit the doc; process changes → edit the workflow; work ships → move the TODO row.**

## How to work in this repo

1. **Find the task.** Start at [`docs/SKILLS.md`](docs/SKILLS.md) (task → doc mapping) or [`docs/TODO.md`](docs/TODO.md) (prioritized backlog).
2. **Read the folder guide** for the area you're touching (table below) — it lists conventions and which docs are canonical.
3. **Make minimal, pattern-matching changes.** Each folder's AGENTS.md lists its conventions.
4. **Update docs in the same session:** the folder's change → doc table tells you exactly which reference doc to refresh.
5. **Close the loop:** if the work completes a backlog item, move its row from `docs/TODO.md` to `docs/TODO_COMPLETED.md` with today's date.

## Per-folder agent guides

| Folder | What it is | Guide | README |
|--------|-----------|-------|--------|
| `backend/` | NestJS API (Postgres, Stripe, S3) | [`backend/AGENTS.md`](backend/AGENTS.md) | [`backend/README.md`](backend/README.md) |
| `drone/` | Next.js 15 frontend | [`drone/AGENTS.md`](drone/AGENTS.md) | [`drone/README.md`](drone/README.md) |
| `docs/` | Company reference docs | [`docs/AGENTS.md`](docs/AGENTS.md) | [`docs/README.md`](docs/README.md) |
| `workflows/` | Executable runbooks | [`workflows/AGENTS.md`](workflows/AGENTS.md) | [`workflows/README.md`](workflows/README.md) |
| `assets/` | Course JSON, articles, brand | [`assets/AGENTS.md`](assets/AGENTS.md) | [`assets/README.md`](assets/README.md) |
| `terraform/`, `pipeline.sh` | AWS infra + deploy | [`docs/tech/architecture.md`](docs/tech/architecture.md) | — |
| `scripts/` | Helper scripts (review before running) | — | [`scripts/README.md`](scripts/README.md) |
| `outreach/` | Contact lists (PII — mostly gitignored) | [`docs/AGENTS.md`](docs/AGENTS.md) | [`outreach/README.md`](outreach/README.md) |

## Critical safety rules (apply everywhere)

- **`./pipeline.sh --env dev` deploys the live production stack.** Never run a deploy, terraform apply, or production DB change without being asked. Details: [`docs/AGENTS.md`](docs/AGENTS.md) § Safe vs sensitive operations.
- **Terraform owns all AWS resources.** Declare new infra in `terraform/` and let `terraform apply` create it — do **not** create/delete resources with the AWS CLI or console (no `aws … create-*`, `put-secret-value`, etc.). Solve ordering traps in Terraform (`depends_on`, dedicated value resources), not with manual CLI steps. See [`docs/tech/architecture.md`](docs/tech/architecture.md) § Resource ownership.
- **Only commit when the user asks.** Never commit terraform state, `.env`, secrets, or outreach CSVs.
- **No unsupervised outreach.** Drafting emails is fine; sending or importing to a CRM requires explicit approval.
- **Don't invent product or FAA claims** — verify against [`docs/sales/features.md`](docs/sales/features.md).

## Keeping docs current

When you ship behavior or process changes anywhere in the repo, update the **folder README/AGENTS** and the **canonical reference doc** for that area in the same session (each folder's AGENTS.md has the change → doc table). Do not leave `docs/` or workflows stale after a deploy or API change.
