# Assets

Source content and brand files for TheDroneEdge. Nothing here is served directly except copies synced to `drone/public/` or uploaded to S3/DB.

```
assets/
├── Drone_Pathways_Curriculum_Sample_compressed.pdf
│                       Competitor sample (PCS Edventures) — not our curriculum
├── courses/            One folder per course
│   ├── faa-107/        Live Part 107 payload, questions, outlines, images
│   │   ├── faa_107_course.json
│   │   ├── questions/
│   │   ├── outlines/
│   │   ├── images/
│   │   ├── reference/
│   │   └── videos/
│   └── drone-building/ Outline draft only — no payload or catalog track
│       └── outlines/
├── articles/           Site articles (/articles routes)
│   ├── drafts/         Editorial text drafts (.txt)
│   ├── import/         Import JSON payloads for the admin editor / API
│   └── images/         Hero + inline article images
├── visuals/            Brand kit from the designer (logo, colors, fonts, mockups, social)
├── media/              Marketing drone flight footage — masters + edits (mostly gitignored)
├── archive/            Ad-hoc logs and scratch files (not product content)
```

| Folder | Doc / workflow |
|--------|----------------|
| [`courses/`](courses/) | [`workflows/tech/content-build.md`](../workflows/tech/content-build.md) · [`workflows/tech/course-images.md`](../workflows/tech/course-images.md) |
| [`articles/`](articles/) | [`workflows/marketing/content-and-seo.md`](../workflows/marketing/content-and-seo.md) |
| [`visuals/`](visuals/) | [`docs/marketing/brand-assets.md`](../docs/marketing/brand-assets.md) · merch: [`docs/marketing/merch.md`](../docs/marketing/merch.md) |
| [`media/`](media/) | [`media/README.md`](media/README.md) · [`docs/marketing/brand-assets.md`](../docs/marketing/brand-assets.md) |

**Competitor curriculum samples** (not product content): `Drone_Pathways_Curriculum_Sample_compressed.pdf` — PCS Edventures FLEX UAV / Drone Pathways. Analysis: [`docs/sales/competitor-analysis.md`](../docs/sales/competitor-analysis.md) §12.

**Drive + git storage plan:** [`docs/tech/assets-and-drive-storage-plan.md`](../docs/tech/assets-and-drive-storage-plan.md)

**Agent guide:** [`AGENTS.md`](AGENTS.md)

Company doc hub: [`docs/README.md`](../docs/README.md)

## Keeping docs current

Course or question changes must update [`docs/tech/course-content-restructure-plan.md`](../docs/tech/course-content-restructure-plan.md) and [`docs/tech/exam-generator-and-course-linking.md`](../docs/tech/exam-generator-and-course-linking.md) — see the full table in [`AGENTS.md`](AGENTS.md).
