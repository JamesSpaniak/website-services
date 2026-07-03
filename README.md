# TheDroneEdge — website-services

Monorepo for **TheDroneEdge.com**: Part 107 courseware, articles, school programs, and the AWS stack that runs them.

| Area | Path |
|------|------|
| **Company docs hub** | [`docs/README.md`](docs/README.md) |
| **Agent guide** | [`docs/AGENTS.md`](docs/AGENTS.md) |
| **Task index** | [`docs/SKILLS.md`](docs/SKILLS.md) |
| **Workflows** | [`workflows/`](workflows/) |
| Backend API | [`backend/`](backend/) |
| Frontend (Next.js) | [`drone/`](drone/) |
| Infrastructure | [`terraform/`](terraform/) · deploy via [`pipeline.sh`](pipeline.sh) |
| Course & news assets | [`assets/`](assets/) |
| Outreach data (local) | [`data/outreach/`](data/outreach/) |

## Deploy

```bash
./pipeline.sh --env dev   # production stack today — see docs/tech/environment-split-plan.md
```

## Product todo (engineering)

See legacy notes in git history; active planning lives in [`docs/tech/course-editing-roadmap.md`](docs/tech/course-editing-roadmap.md) and [`docs/sales/features.md`](docs/sales/features.md).

## Local development

[`docs/tech/local-dev.md`](docs/tech/local-dev.md)
