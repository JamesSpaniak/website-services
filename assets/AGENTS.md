# Agent guide — assets

Source content and brand files in `assets/`. Nothing here is served directly except copies synced to `drone/public/` or uploaded to S3/DB.

Monorepo-wide rules: [`docs/AGENTS.md`](../docs/AGENTS.md).

## Folder map

| Path | Purpose | Workflow / doc |
|------|---------|----------------|
| [`courses/`](courses/) | Course JSON, question bulk files, outlines | [`workflows/tech/content-build.md`](../workflows/tech/content-build.md) |
| [`articles/`](articles/) | Standalone article import JSON | Admin import / API |
| [`news/`](news/) | Editorial drafts, heroes | [`workflows/marketing/content-and-seo.md`](../workflows/marketing/content-and-seo.md) |
| [`visuals/`](visuals/) | Brand kit | [`docs/marketing/brand-assets.md`](../docs/marketing/brand-assets.md) |
| [`videos/`](videos/) | Course source video for S3 upload / transcode | content-build workflow |
| [`media/`](media/) | Marketing flight masters + snips (gitignored binaries; tracked manifests) | [`media/README.md`](media/README.md), [`docs/marketing/brand-assets.md`](../docs/marketing/brand-assets.md) |

## Before editing course content

1. Read [`workflows/tech/content-build.md`](../workflows/tech/content-build.md) and [`docs/tech/course-content-restructure-plan.md`](../docs/tech/course-content-restructure-plan.md).
2. Regenerate question bulk JSON with the scripts in `scripts/` after CSV or tree changes.
3. Validate unit refs against the course tree before import — orphaned refs break scoped quizzes.

## Keeping docs current

**Required:** when course structure, question counts, or content pipeline changes, update the linked docs — not just the JSON files.

| You change… | Update… |
|-------------|---------|
| Course tree, units, exam pools | [`docs/tech/course-content-restructure-plan.md`](../docs/tech/course-content-restructure-plan.md) |
| Question import stats, gaps, scripts | [`docs/tech/exam-generator-and-course-linking.md`](../docs/tech/exam-generator-and-course-linking.md), `assets/courses/README.md` |
| Brand files or folder layout | [`docs/marketing/brand-assets.md`](../docs/marketing/brand-assets.md) |
| Marketing flight cuts / media layout | [`media/README.md`](media/README.md), [`media/manifests/`](media/manifests/), [`docs/marketing/brand-assets.md`](../docs/marketing/brand-assets.md) |
| Article/news inventory | [`docs/marketing/article-inventory.md`](../docs/marketing/article-inventory.md) |
| Deployed to prod | [`docs/TODO.md`](../docs/TODO.md) → [`docs/TODO_COMPLETED.md`](../docs/TODO_COMPLETED.md) with date |

Also refresh [`assets/README.md`](README.md) when top-level folders or primary workflows change.
