# Course source assets

Canonical Part 107 course payload and question-bank tooling.

| File / folder | Purpose |
|---------------|---------|
| `faa_107_course.json` | Full course `CourseDetails` payload (upload via admin / API) |
| `faa_107_questions.bulk.json` | Generated bulk import for `/questions/import` |
| `faa_107_questions_*.csv`, `*_gaps.md` | Mapping review outputs from `scripts/build_faa_107_questions.py` |
| `Compiled questions Part 107*.csv` | Source spreadsheets for question generation |
| [`outlines/`](outlines/) | Unit source outlines (docx, pptx exports as txt) |

Regenerate questions: `python3 scripts/build_faa_107_questions.py`

Edit course structure in JSON or admin UI — do not use one-off rebuild scripts; outlines are reference only.
