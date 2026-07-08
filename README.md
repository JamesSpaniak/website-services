# TheDroneEdge — website-services

Monorepo for **TheDroneEdge.com**: FAA Part 107 courseware, articles, school (B2B) programs, and the AWS stack that runs them.

## How this repo is organized

Three layers, each with its own entry point:

1. **Code** — `backend/` (NestJS API), `drone/` (Next.js frontend), `terraform/` + `pipeline.sh` (AWS infra/deploy).
2. **Knowledge** — `docs/` holds canonical reference (facts, architecture, strategy); `workflows/` holds runbooks (ordered steps you execute).
3. **Content** — `assets/` (course JSON, articles, brand), `outreach/` (contact data, mostly gitignored), `scripts/` (helpers).

Every major folder has a `README.md` (what it is, quick start) and an `AGENTS.md` (rules for AI agents, including which docs to update on change).

| Area | Path | Start here |
|------|------|------------|
| Backend API | [`backend/`](backend/) | [`backend/README.md`](backend/README.md) |
| Frontend (Next.js) | [`drone/`](drone/) | [`drone/README.md`](drone/README.md) |
| Infrastructure & deploy | [`terraform/`](terraform/) · [`pipeline.sh`](pipeline.sh) | [`docs/tech/architecture.md`](docs/tech/architecture.md) |
| Company docs hub | [`docs/`](docs/) | [`docs/README.md`](docs/README.md) |
| Runbooks | [`workflows/`](workflows/) | [`workflows/README.md`](workflows/README.md) |
| Source content | [`assets/`](assets/) | [`assets/README.md`](assets/README.md) |
| Helper scripts | [`scripts/`](scripts/) | [`scripts/README.md`](scripts/README.md) |
| Outreach data (PII, local) | [`outreach/`](outreach/) | [`outreach/README.md`](outreach/README.md) |

## Common starting points

| I want to… | Go to |
|------------|-------|
| Run the app locally | [`docs/tech/local-dev.md`](docs/tech/local-dev.md) |
| Deploy | [`workflows/tech/deploy.md`](workflows/tech/deploy.md) — **`--env dev` is the live production stack** |
| Find a task's canonical doc | [`docs/SKILLS.md`](docs/SKILLS.md) |
| See what's prioritized | [`docs/TODO.md`](docs/TODO.md) · shipped: [`docs/TODO_COMPLETED.md`](docs/TODO_COMPLETED.md) |
| Edit course content / questions | [`workflows/tech/content-build.md`](workflows/tech/content-build.md) |
| Understand the deployed AWS stack | [`docs/tech/architecture.md`](docs/tech/architecture.md) |

## For AI agents

Start at [`AGENTS.md`](AGENTS.md) (doc system, working sequence, safety rules), then the `AGENTS.md` of the folder you're editing. [`CLAUDE.md`](CLAUDE.md) points Claude Code to the same tree.

## Keeping docs current

`docs/` and `workflows/` are the source of truth for how the business and stack work — code changes that make them stale are considered incomplete. After shipping a change, follow the **Keeping docs current** table in the relevant folder's `AGENTS.md`, and move finished backlog rows from [`docs/TODO.md`](docs/TODO.md) to [`docs/TODO_COMPLETED.md`](docs/TODO_COMPLETED.md) with the date.
