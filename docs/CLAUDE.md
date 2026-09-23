# Claude / agent instructions — docs

Pointer only. [`AGENTS.md`](AGENTS.md) in this folder is the **full monorepo rulebook** for agents — read it before working anywhere in the repo, not just in `docs/`. Human doc map: [`README.md`](README.md).

## Read in this order

1. [`AGENTS.md`](AGENTS.md) — code, sales, and marketing rules; safe vs sensitive operations; file placement.
2. [`SKILLS.md`](SKILLS.md) — task → doc/workflow/script lookup.
3. [`TODO.md`](TODO.md) — prioritized backlog; finished rows move to [`TODO_COMPLETED.md`](TODO_COMPLETED.md) with the date.

## Non-negotiables

- `docs/{tech,sales,marketing}/` holds **canonical reference** — stable facts and strategy. Ordered steps belong in [`../workflows/`](../workflows/), not here.
- Don't invent product or FAA claims; verify against [`sales/features.md`](sales/features.md). Treat competitor figures in [`sales/competitor-analysis.md`](sales/competitor-analysis.md) as a dated snapshot.
- Facts change → edit the doc; process changes → edit the workflow; work ships → move the TODO row.
