# Claude / agent instructions — scripts

Pointer only. The script index is [`README.md`](README.md); this folder has no `AGENTS.md`, so monorepo rules in [`../docs/AGENTS.md`](../docs/AGENTS.md) apply.

## Read in this order

1. [`README.md`](README.md) — every script, grouped by sales/outreach, marketing, course, infra, and adhoc analysis.
2. [`../docs/SKILLS.md`](../docs/SKILLS.md) — task → script mapping.
3. The workflow a script belongs to (each README row links it) before running that script.

## Non-negotiables

- **Not all scripts here are safe to run without review.** Read the script and its linked workflow before executing; several write to `assets/`, `outreach/`, S3, or AWS.
- Infra scripts are deploy-adjacent: `reconcile-state.sh` and `deploy-preflight.sh` back `./pipeline.sh`, which deploys **production**. Don't run a deploy path unless asked.
- Outreach scripts generate PII into [`../outreach/`](../outreach/) — generating is fine, sending or CRM import needs explicit approval.
- Scripts stay in this flat directory; add a row to [`README.md`](README.md) when you add one, and link it from [`../docs/SKILLS.md`](../docs/SKILLS.md) if it backs a recurring task.
