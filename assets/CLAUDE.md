# Claude / agent instructions — assets

Pointer only. Rules for this folder live in [`AGENTS.md`](AGENTS.md); the folder map for humans is [`README.md`](README.md). Monorepo-wide rules: [`../docs/AGENTS.md`](../docs/AGENTS.md).

## Read in this order

1. [`AGENTS.md`](AGENTS.md) — folder map, before-editing-course-content checklist, change → doc table.
2. [`../workflows/tech/content-build.md`](../workflows/tech/content-build.md) and [`../workflows/tech/course-images.md`](../workflows/tech/course-images.md) before touching course JSON, questions, or images.

## Non-negotiables

- Nothing here is served directly except copies synced to `drone/public/` or uploaded to S3/DB.
- New course material lands in the matching `courses/<course>/` subfolder: question CSVs → `questions/`, unit figures and hero art → `images/`, sectionals and legends → `reference/`, recordings → `videos/` (gitignored).
- Validate unit refs against the course tree before import — orphaned refs break scoped quizzes. Regenerate question bulk JSON with `scripts/` after CSV or tree changes.
- Do not rearrange Drive or `assets/` except while executing a named step in [`../docs/tech/assets-and-drive-storage-plan.md`](../docs/tech/assets-and-drive-storage-plan.md).
