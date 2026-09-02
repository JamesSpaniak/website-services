# Agent guide — assets

Source content and brand files in `assets/`. Nothing here is served directly except copies synced to `drone/public/` or uploaded to S3/DB.

Monorepo-wide rules: [`docs/AGENTS.md`](../docs/AGENTS.md).

## Folder map

| Path | Purpose | Workflow / doc |
|------|---------|----------------|
| [`courses/`](courses/) | One folder per course: course JSON, `questions/`, `outlines/`, `images/`, `reference/`, `videos/` | [`workflows/tech/content-build.md`](../workflows/tech/content-build.md), [`workflows/tech/course-images.md`](../workflows/tech/course-images.md) |
| [`articles/`](articles/) | Site articles: `drafts/` (txt), `import/` (JSON payloads), `images/` | [`workflows/marketing/content-and-seo.md`](../workflows/marketing/content-and-seo.md) |
| [`visuals/`](visuals/) | Brand kit | [`docs/marketing/brand-assets.md`](../docs/marketing/brand-assets.md) |
| [`media/`](media/) | Marketing flight masters + snips (gitignored binaries; tracked manifests) | [`media/README.md`](media/README.md), [`docs/marketing/brand-assets.md`](../docs/marketing/brand-assets.md) |

Course lesson video sources live inside the course folder (`courses/<course>/videos/`, gitignored) — there is no separate top-level `videos/` folder. New course material lands in the matching `courses/<course>/` subfolder: question CSVs → `questions/`, unit figures / hero art → `images/`, maps · sectionals · symbol legends → `reference/`, recordings → `videos/`.

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
