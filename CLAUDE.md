# Claude / agent instructions

This repo uses **`AGENTS.md`** files for AI agent guidance (Cursor, Claude Code, CI bots). `CLAUDE.md` exists only as a pointer — do not duplicate rules here.

## Read in this order

1. [`AGENTS.md`](AGENTS.md) — repo index: doc system definitions, working sequence, safety rules.
2. [`docs/AGENTS.md`](docs/AGENTS.md) — full monorepo rules (code, sales, marketing, file placement).
3. The `AGENTS.md` of the folder you're editing: [`backend/`](backend/AGENTS.md) · [`drone/`](drone/AGENTS.md) · [`workflows/`](workflows/AGENTS.md) · [`assets/`](assets/AGENTS.md).

## Non-negotiables

- `./pipeline.sh --env dev` deploys **production** — never deploy, terraform apply, or touch the prod DB unless asked.
- Only commit when the user asks; never commit `.env`, terraform state, secrets, or outreach CSVs.
- After shipping a change, update that folder's linked reference docs (see **Keeping docs current** in each AGENTS.md) and move finished items from [`docs/TODO.md`](docs/TODO.md) to [`docs/TODO_COMPLETED.md`](docs/TODO_COMPLETED.md) with the date.
