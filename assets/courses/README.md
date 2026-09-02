# Course source assets

One folder per course. Layout convention (applies to every course folder):

```
courses/<course>/
├── <course>_course.json   Canonical CourseDetails payload — ship via admin JSON editor
├── questions/             Source spreadsheets/CSVs + generated bulk import JSON + review CSVs
├── outlines/              Author unit outlines (docx, pptx exports as txt) — reference only
├── images/                Unit figures & hero art + the mapping CSVs that track them (tracked)
├── reference/             Source materials: sectional charts, maps, symbol legends (large binaries gitignored)
└── videos/                Lesson source recordings for S3/MediaConvert (gitignored)
```

## How each content type is tracked

| Content | Artifact of record | Pipeline |
|---------|-------------------|----------|
| Course tree / units / lesson text | `<course>_course.json` | Edit JSON (or admin UI) → publish via admin editor |
| Questions & tests | `questions/*.bulk.json` + review CSVs | Source CSV → `scripts/build_unit_level_questions.py` → `POST /questions/import` |
| Unit figures (charts, maps, symbols) | `images/*_mapping.csv` (file → unit → S3 key → CDN URL) | [`workflows/tech/course-images.md`](../../workflows/tech/course-images.md): map → review → upload → merge into unit `images_url` |
| Hero / decorative images | course-root `images_url` in the JSON | Same workflow; cover-crop rules in course-images.md |
| Reference sources (GeoTIFF sectionals etc.) | `reference/` (local/S3 only) | Cropped into `images/` figures — see [`docs/tech/sectional-chart-experience-plan.md`](../../docs/tech/sectional-chart-experience-plan.md) |
| Videos | `videos/` filenames ↔ `scripts/upload-faa-107-videos.sh` MAPPINGS | Upload → MediaConvert HLS → unit `video_url` |

## faa-107 (course 35)

| File / folder | Purpose |
|---------------|---------|
| `faa_107_course.json` | **Canonical** course payload. Unit ids are string refs (`"u1"`, `"u111"`, …) matching prod after the unit-refs migration. Includes Ch.1–5 + Ch.8 complete passes and Ch.6–7 + Ch.9–10 partial passes through Aug 5 2026 (**do not combine** `u5`/`u6`), **150 nodes** / **114 leaves**, 16 `video_url` entries in Ch.1 (Aug 23 2026), and 61 `images_url` entries on units 2/3. **Ship this file** through the admin JSON editor (publish Ch.3+4 together; include reviewed Ch.5–10 edits). |
| `questions/faa_107_questions_unit_level.bulk.json` | Unit-level bulk import from the author's sorted CSV (`scripts/build_unit_level_questions.py`) — current import format per `docs/tech/course-content-restructure-plan.md` |
| `questions/faa_107_questions_unit_level_review.csv` | Per-row disposition (imported / duplicate / marker / needs review) from the same script |
| `questions/faa_107_questions.bulk.json` | Legacy leaf-scoped bulk (superseded by unit-level for current imports) |
| `questions/faa_107_questions_*.csv`, `questions/*_gaps.md` | Mapping review outputs from `scripts/build_faa_107_questions.py` |
| `questions/Compiled questions Part 107*.csv`, `questions/Compiled Question Bank Sorted*.csv` | Source spreadsheets for question generation |
| `outlines/` | Unit source outlines |
| `faa_107_course_quality_review.md` | Quality-review backlog: Ch.1–5 + Ch.8 complete; Ch.6–7 + Ch.9–10 partial |
| `images/pictures-for-airports_review.md` / `images/pictures-for-airports_mapping.csv` | Unit 2/3 image upload mapping (uploaded Jul 8 2026); L&L figure order still open in quality review |
| `reference/sectionals/jacksonville/` | Jacksonville SEC GeoTIFF (+ world file) for sectional crops — gitignored, keep local/S3 |
| `videos/` | 19 lesson source recordings (gitignored) — 16 uploaded/mapped in Ch.1 via `scripts/upload-faa-107-videos.sh` (combined falsification/accident recording sits on u132 pending text split/combine); not uploaded: `registration 3-13` (confirmed duplicate of live u131), `night ops 7-13` (author reviewing vs `fly at night 18`), applicability `.mov` (superseded V1) |

**Removed (Jul 26 2026):** `faa_107_course_restructured.json` (numeric-id twin) and `faa_107_course_refs.json` (string-ref twin). One file only — edit and ship `faa_107_course.json`.

**Restructured (Aug 23 2026):** flat `assets/courses/` + `assets/videos/` folded into `faa-107/{questions,outlines,images,reference,videos}`; duplicate zips removed.

Regenerate unit-level questions: `python3 scripts/build_unit_level_questions.py`

Edit course structure in `faa_107_course.json` or the admin UI — outlines are reference only.

## drone-building (draft — not in catalog)

Author intake for a future build/assembly course. **No payload, questions, or homepage track.** Part 107 recordings remain P0.

| File | Purpose |
|------|---------|
| `README.md` | Folder status |
| `outlines/joe-drone-building-outline.txt` | Joe’s original topic list (`origin/branch-joe`, Aug 5 2026) |
| `outlines/drone-building-course-draft.md` | Proposed units, class sessions, expansion points, gaps |
