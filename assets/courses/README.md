# Course source assets

Canonical Part 107 course payload and question-bank tooling.

| File / folder | Purpose |
|---------------|---------|
| `faa_107_course.json` | Full course `CourseDetails` payload, legacy numeric unit ids (upload via admin / API) |
| `faa_107_course_refs.json` | Same payload with the unit-refs migration pre-applied (`id: 11` → `id: "u11"`) — identical result to what the backend's save-path normalization produces; use for local bulk import. **Describes the pre-restructure tree** |
| `faa_107_course_restructured.json` | **Restructured payload (Jul 2026, upload candidate)**: unit 7 rebuilt into 2 stems / 9 leaves, author-review renames/merges/text fixes, markdown cleanup (171 nodes, was 197) — see [`docs/tech/course-content-restructure-plan.md`](../../docs/tech/course-content-restructure-plan.md) |
| `faa_107_questions.bulk.json` | Generated bulk import for `/questions/import` (legacy sub-unit scoping) |
| `faa_107_questions_unit_level.bulk.json` | Unit-level bulk import from the author's sorted CSV (`scripts/build_unit_level_questions.py`) — current import format per `docs/tech/course-content-restructure-plan.md` |
| `faa_107_questions_unit_level_review.csv` | Per-row disposition (imported / duplicate / marker / needs review) from the same script |
| `faa_107_questions_*.csv`, `*_gaps.md` | Mapping review outputs from `scripts/build_faa_107_questions.py` |
| `Compiled questions Part 107*.csv`, `Compiled Question Bank Sorted*.csv` | Source spreadsheets for question generation |
| [`outlines/`](outlines/) | Unit source outlines (docx, pptx exports as txt) |

Regenerate questions: `python3 scripts/build_faa_107_questions.py`

Edit course structure in JSON or admin UI — do not use one-off rebuild scripts; outlines are reference only.
