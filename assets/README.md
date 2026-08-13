# Assets

Source content and brand files for TheDroneEdge. Nothing here is served directly except copies synced to `drone/public/` or uploaded to S3.

```
assets/
├── courses/          Course JSON, question bank artifacts, unit outlines
├── articles/         Standalone article import JSON (CMS payloads)
├── news/             Editorial drafts, import JSON, hero images
├── visuals/          Brand kit (logo, colors, fonts, mockups, social templates)
├── videos/           Course source video for S3 upload / transcode
├── media/            Marketing flight masters + edits (mostly gitignored)
├── archive/          Ad-hoc logs and scratch files (not product content)
```

| Folder | Doc / workflow |
|--------|----------------|
| [`courses/`](courses/) | [`workflows/tech/content-build.md`](../workflows/tech/content-build.md) |
| [`articles/`](articles/) | Admin article editor / API import |
| [`news/`](news/) | [`workflows/marketing/content-and-seo.md`](../workflows/marketing/content-and-seo.md) |
| [`visuals/`](visuals/) | [`docs/marketing/brand-assets.md`](../docs/marketing/brand-assets.md) |
| [`media/`](media/) | [`media/README.md`](media/README.md) · [`docs/marketing/brand-assets.md`](../docs/marketing/brand-assets.md) |

**Agent guide:** [`AGENTS.md`](AGENTS.md)

Company doc hub: [`docs/README.md`](../docs/README.md)

## Keeping docs current

Course or question changes must update [`docs/tech/course-content-restructure-plan.md`](../docs/tech/course-content-restructure-plan.md) and [`docs/tech/exam-generator-and-course-linking.md`](../docs/tech/exam-generator-and-course-linking.md) — see the full table in [`AGENTS.md`](AGENTS.md).
