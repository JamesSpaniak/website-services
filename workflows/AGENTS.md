# Agent guide — workflows

Executable runbooks in `workflows/<domain>/`. Monorepo-wide rules: [`docs/AGENTS.md`](../docs/AGENTS.md).

## What belongs here

| Domain | Folder | Examples |
|--------|--------|----------|
| Sales | [`sales/`](sales/) | Outreach, email drafts |
| Marketing | [`marketing/`](marketing/) | Content cadence, SEO |
| Tech | [`tech/`](tech/) | Deploy, course/content build |

**Workflows** = ordered steps (do this, then that). **Docs** = stable facts and strategy under [`docs/`](../docs/).

## Before executing

1. Read the specific workflow end-to-end before running deploy or outreach steps.
2. Sales/marketing: do not send bulk email or invent product claims — see [`docs/AGENTS.md`](../docs/AGENTS.md).
3. Deploy: [`workflows/tech/deploy.md`](tech/deploy.md) — `./pipeline.sh --env dev` hits **production** today.

## Keeping docs current

**Required:** when a repeatable process changes, update the **workflow** first. If facts, URLs, or strategy changed, update the linked **reference doc** in `docs/` too.

| You change… | Update… |
|-------------|---------|
| Step order, commands, checklists | The workflow `.md` in this folder |
| Why we do something / positioning | Matching doc under `docs/sales/` or `docs/marketing/` |
| Infra or deploy behavior | [`docs/tech/architecture.md`](../docs/tech/architecture.md), [`docs/tech/environment-split-plan.md`](../docs/tech/environment-split-plan.md) |
| New recurring process | New workflow here + link from [`docs/SKILLS.md`](../docs/SKILLS.md) and [`workflows/README.md`](README.md) |
| Shipped backlog item | [`docs/TODO.md`](../docs/TODO.md) → [`docs/TODO_COMPLETED.md`](../docs/TODO_COMPLETED.md) with date |

Also refresh [`workflows/README.md`](README.md) when adding a domain folder or primary entry point.
