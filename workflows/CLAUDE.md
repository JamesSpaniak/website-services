# Claude / agent instructions — workflows

Pointer only. Rules for this folder live in [`AGENTS.md`](AGENTS.md); the human index is [`README.md`](README.md). Monorepo-wide rules: [`../docs/AGENTS.md`](../docs/AGENTS.md).

## Read in this order

1. [`AGENTS.md`](AGENTS.md) — what belongs here, before-executing checklist, change → doc table.
2. The specific runbook, end-to-end, before running any of its steps: [`sales/`](sales/) · [`marketing/`](marketing/) · [`tech/`](tech/).

## Non-negotiables

- **Workflows** are ordered steps. **Docs** are stable facts — those live under [`../docs/`](../docs/).
- `./pipeline.sh --env dev` in [`tech/deploy.md`](tech/deploy.md) hits **production** today. Read the whole runbook first; never deploy unless asked.
- No bulk email sending or CRM imports without explicit approval; no invented product claims.
- A changed process updates the workflow first, then the linked reference doc under `docs/` in the same session.
