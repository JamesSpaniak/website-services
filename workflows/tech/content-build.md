# Content build workflow

Rebuild course questions and publish course/article/media assets.

## FAA 107 course

| Step | Action |
|------|--------|
| Edit structure | `assets/courses/faa_107_course.json` or admin course editor |
| Source outlines | Reference only: `assets/courses/outlines/` |
| Regenerate questions | `python3 scripts/build_faa_107_questions.py` |
| Review mapping | `assets/courses/faa_107_questions_review.csv`, `faa_107_questions_gaps.md` |
| Publish course | Admin `PUT /courses/:id` or API |
| Import questions | `assets/courses/faa_107_questions.bulk.json` via admin or API |

See [`docs/tech/exam-generator-and-course-linking.md`](../../docs/tech/exam-generator-and-course-linking.md).

Optional maintenance scripts (run once when needed, not part of deploy):

- `scripts/refactor_course_goals.py` — merge description into `text_content`
- `scripts/plaintext_course_text_content.py` — strip markdown from unit bodies
- `scripts/export_general_operations_review.py` — ops-category review CSV

## Article import JSON

Legacy batch payloads: `assets/articles/*.json` → admin article editor.

News pipeline: [`workflows/marketing/content-and-seo.md`](../marketing/content-and-seo.md) (`assets/news/`).

## Video upload

**Open:** Finish recordings for all Part 107 unit/section nodes — see [`docs/TODO.md`](../../docs/TODO.md) P0.

| Step | Action |
|------|--------|
| Record | One video per unit/section (or agreed granularity) |
| Upload | `./scripts/bulk-upload-videos.sh` — source: `assets/videos/` |
| Wire course | Set `video_url` on each node in `assets/courses/faa_107_course.json` |
| Publish | Admin course save or API; invalidate CDN if needed |
| Captions | Plan transcripts/captions track — WCAG (see TODO) |

Pipeline:

```bash
./scripts/bulk-upload-videos.sh
```

Source files: `assets/videos/` → S3 raw bucket → MediaConvert → HLS on media CloudFront.

## API types (after backend DTO changes)

```bash
./scripts/generate-api-types.sh
```

## Related docs

- [`docs/tech/course-editing-roadmap.md`](../../docs/tech/course-editing-roadmap.md)
- [`docs/tech/backend-data.md`](../../docs/tech/backend-data.md) — media upload endpoints
