# Workflows

Operational runbooks — **do this, then that**. Reference docs (facts, strategy, architecture) live under [`docs/`](../docs/).

| Domain | Folder | When to use |
|--------|--------|-------------|
| Sales | [`sales/`](sales/) | Outreach, email, pipeline from contact → call → quote |
| Marketing | [`marketing/`](marketing/) | Articles, SEO cadence, news publish pipeline |
| Tech | [`tech/`](tech/) | Deploy, course/content builds, infra tasks |

**Agent guide:** [`AGENTS.md`](AGENTS.md)

Start at [`docs/README.md`](../docs/README.md) for the full company doc map.

## Keeping docs current

When a runbook step changes, edit the workflow `.md` here. When underlying facts change (URLs, infra, product behavior), update the linked doc under `docs/` too. See the change → doc table in [`AGENTS.md`](AGENTS.md).
