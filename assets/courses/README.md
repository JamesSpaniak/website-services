# Course source assets

Canonical Part 107 course payload and question-bank tooling.

| File / folder | Purpose |
|---------------|---------|
| `faa_107_course.json` | **Canonical** course `CourseDetails` payload for course **35**. Unit ids are string refs (`"u1"`, `"u111"`, …) matching prod after the unit-refs migration. Includes Ch.1–5 + Ch.8 complete passes and Ch.6–7 + Ch.9–10 partial passes through Aug 5 2026 (**do not combine** `u5`/`u6`), **150 nodes** / **114 leaves**, 4 `video_url` entries in Ch.1, and 61 `images_url` entries on units 2/3. **Ship this file** through the admin JSON editor (publish Ch.3+4 together; include reviewed Ch.5–10 edits). |
| `faa_107_questions_unit_level.bulk.json` | Unit-level bulk import from the author's sorted CSV (`scripts/build_unit_level_questions.py`) — current import format per `docs/tech/course-content-restructure-plan.md` |
| `faa_107_questions_unit_level_review.csv` | Per-row disposition (imported / duplicate / marker / needs review) from the same script |
| `faa_107_questions.bulk.json` | Legacy leaf-scoped bulk (superseded by unit-level for current imports) |
| `faa_107_questions_*.csv`, `*_gaps.md` | Mapping review outputs from `scripts/build_faa_107_questions.py` |
| `Compiled questions Part 107*.csv`, `Compiled Question Bank Sorted*.csv` | Source spreadsheets for question generation |
| [`outlines/`](outlines/) | Unit source outlines (docx, pptx exports as txt) |
| `faa_107_course_quality_review.md` | Quality-review backlog: Ch.1–5 + Ch.8 complete; Ch.6–7 + Ch.9–10 partial |
| `pictures-for-airports_review.md` / `pictures-for-airports_mapping.csv` | Unit 2/3 image upload mapping (uploaded Jul 8 2026); L&L figure order still open in quality review |

**Removed (Jul 26 2026):** `faa_107_course_restructured.json` (numeric-id twin) and `faa_107_course_refs.json` (string-ref twin). One file only — edit and ship `faa_107_course.json`.

Regenerate unit-level questions: `python3 scripts/build_unit_level_questions.py`

Edit course structure in `faa_107_course.json` or the admin UI — outlines are reference only.
