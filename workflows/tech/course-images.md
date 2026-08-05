# Course image upload workflow

Bulk-insert an author's image folder into a course: map files to units, upload to the media bucket, merge CloudFront URLs into the course JSON. Driven by `scripts/course_images.py` (three subcommands with a review gate between `map` and `upload`).

Storage convention: `s3://droneedge-dev-media/courses/{courseId}/{unitId}/{slug}-{hash8}.png`, served at `https://media.thedroneedge.com/...`. The 8-char content hash makes re-uploads idempotent and cache-safe.

## Display modes (learner UI)

| Surface | Component | Fit | Aspect | Crop? |
|---------|-----------|-----|--------|-------|
| Unit / section figures | `CourseImageStrip` default `fit="contain"` | contain | natural height, `max-h-[70vh]` | No — letterboxes tall/wide sources |
| In-course hero | `CourseImageStrip` `fit="cover"` + `image_focal_point` | cover | fixed 16:9 | Yes — center crop unless focal point set |
| Public preview page `/courses/:id/preview` | first hero URL, `object-cover` | cover | fixed 16:9 (~896px max width) | Yes — honors `image_focal_point` |
| Catalog cards `/courses` | `CoursePreviewComponent` | cover | fixed 16:9 (card width) | Yes — honors `image_focal_point` |
| Purchase thumbnail | small 200×112 cover | cover | 16:9 | Yes (tiny; not for reading charts) |

**Rule of thumb:** instructional charts/diagrams → unit `images_url` (contain). Marketing photos / course branding → course-root `images_url` (cover). Do not put dense sectional charts as the course hero unless they are already ~16:9 and the important region is near the focal point.

## Authoring guidelines — size & format

### Course hero / preview / catalog (cover)

| Spec | Recommendation |
|------|----------------|
| Aspect ratio | **16:9** (e.g. 1920×1080). Near-16:9 is fine; far from it loses edges. |
| Minimum pixels | **≥ 1600×900** preferred; **≥ 1280×720** acceptable. Below ~900px wide looks soft on the in-course hero (full content column, often wider than the preview page). |
| Format | PNG or JPEG/WebP. PNG for graphics with text/lines; JPEG OK for photos. |
| Subject framing | Keep critical content in the **center third** (or set `image_focal_point` in admin: `top`, `bottom`, `center 25%`, etc.). |
| Text on labels | Heroes are **not** for reading fine chart labels — those belong on units. |

### Unit figures (contain)

| Spec | Recommendation |
|------|----------------|
| Aspect ratio | Any — UI shows the whole image. Tall charts get extra vertical space; ultra-wide get side letterboxing. |
| Minimum pixels | **≥ 1000px on the long edge** for charts students must read. Below ~500px wide will look soft when scaled to the content column. |
| Max height in UI | Capped at **70vh**; taller sources shrink to fit (still fully visible, just smaller). |
| Format | PNG preferred for charts/legends; keep text sharp (avoid heavy JPEG compression on diagrams). |

### How much does source size matter?

The browser scales the file as-uploaded (CloudFront media is `unoptimized` in Next Image — no server-side resize/sharpen).

| Source vs display | Result |
|-------------------|--------|
| Source ≥ display CSS pixels | Sharp (or slightly downscaled — usually fine). |
| Source slightly smaller (~0.7–1×) | Mild softness; often OK for photos, weak for small text. |
| Source much smaller (&lt;0.5×) | Obvious blur/pixelation; re-export or recapture. |
| Wrong aspect + **cover** | Crop, not blur — information at edges can disappear even if the file is huge. |
| Wrong aspect + **contain** | Letterboxing only — no crop; size still drives sharpness. |

**Display widths to plan for (approx.):**

- Preview page hero: up to **~896px** wide (16:9 → ~504px tall).
- In-course hero: **full main column** (often **1100–1600px+** on large desktops) — this is the strictest sharpness target for heroes.
- Catalog card: roughly **1/3 viewport** (~300–400px) — forgiving.
- Unit figure: content column width, height up to 70vh — plan for **≥1000px** long edge on readable charts.

**Pictures for Airports lesson (Jul 2026):** many unit sources were portrait / near-square / small; contain display fixed cropping. Small files (&lt;400px) can still look soft until re-exported — display cannot invent pixels.

## Steps

| Step | Action |
|------|--------|
| 1. Map | `python3 scripts/course_images.py map "assets/courses/<Folder>" --unit <topUnitId> ...` → writes `<folder-slug>_mapping.csv` + `<folder-slug>_review.md` next to the folder |
| 2. Review | Open the review .md (images embedded) or have an agent read each image; fix `proposed_unit_id` in the CSV. Rows with empty unit id are `needs_review` and block upload |
| 3. Dry run | `python3 scripts/course_images.py upload --csv <mapping.csv>` — prints planned S3 keys, refreshes CSV keys/URLs after review edits |
| 4. Upload | Same command with `--execute` (needs AWS credentials; writes to the live media bucket) |
| 5. Merge | `python3 scripts/course_images.py merge --csv <mapping.csv> --json assets/courses/faa_107_course.json` — appends to each unit's `images_url` (deduped) |
| 7. Publish | **Manual**: paste/save the JSON via the admin course editor (`PUT /courses/:id`). Nothing touches the prod DB automatically |

## Notes

- `--unit` restricts matching to a subtree (repeatable). Filename keyword matching is only a first pass — every mapping should be visually reviewed (step 2); expect reassignments.
- The mapping CSV is the artifact of record (local path → unit → S3 key → CloudFront URL, `status` per row). Keep it until the JSON is published.
- Re-running `map` needs `--force` and discards review edits — prefer editing the CSV.
- Upload marks rows `status=uploaded` and is resumable; already-uploaded rows are skipped.
- `merge` refuses unknown unit ids and only merges `status=uploaded` rows, so a stale CSV can't corrupt the JSON.
- Unit ids are matched via the backend's ref normalization (`243` ≡ `u243`), so CSV rows may use either form against `faa_107_course.json` (canonical string refs).
- No frontend upload portal needed: uploads go direct to S3 with the AWS CLI (same precedent as `scripts/bulk-upload-videos.sh`); the API's presigned-URL flow is for the admin UI's one-off uploads.

## Example (done Jul 8 2026)

`assets/courses/Pictures for Airports` → 61 images mapped to 31 units under units 2 and 3 of course 35, uploaded, and merged into `faa_107_course.json`. Artifacts: `assets/courses/pictures-for-airports_mapping.csv`, `pictures-for-airports_review.md`.

## Related

- [`content-build.md`](content-build.md) — course/question/video publishing
- [`docs/tech/course-content-restructure-plan.md`](../../docs/tech/course-content-restructure-plan.md) § step 7 (image insertion)
- [`docs/tech/backend-data.md`](../../docs/tech/backend-data.md) — media endpoints and `images_url` semantics
- [`docs/tech/frontend-data.md`](../../docs/tech/frontend-data.md) — `CourseImageStrip` contain vs cover on course / preview routes
