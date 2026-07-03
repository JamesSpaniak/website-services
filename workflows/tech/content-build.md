# Content build workflow

Rebuild course units, questions, and media from source assets in `assets/`.

## FAA 107 course units (from outlines)

Rebuild scripts live in `scripts/`:

| Script | Unit |
|--------|------|
| `rebuild_unit1_regulations.py` | Unit 1 — Regulations |
| `rebuild_unit2_airports.py` | Unit 2 — Airports |
| `rebuild_unit3_airspace.py` | Unit 3 — Airspace |
| `rebuild_unit4_airport_operations.py` | Unit 4 — Airport operations |

Source outlines: `assets/articles/*.docx`, `assets/articles/*.txt`

Output: updates `assets/articles/faa_107_course.json` (review diff before admin upload).

## Question bank

```bash
python3 scripts/build_faa_107_questions.py
```

See [`docs/tech/exam-generator-and-course-linking.md`](../../docs/tech/exam-generator-and-course-linking.md).

## Publish course to production DB

1. Validate JSON locally / staging.
2. Admin course editor or API `PUT /courses/:id` with updated payload.
3. Follow [`docs/tech/unit-refs-migration.md`](../../docs/tech/unit-refs-migration.md) when changing unit refs.

## Video upload

```bash
./scripts/bulk-upload-videos.sh
```

Raw uploads → S3 raw bucket → MediaConvert → HLS on media CloudFront.

## API types (after backend DTO changes)

```bash
./scripts/generate-api-types.sh
```

## Related docs

- [`docs/tech/course-editing-roadmap.md`](../../docs/tech/course-editing-roadmap.md)
- [`docs/tech/backend-data.md`](../../docs/tech/backend-data.md) — media upload endpoints
