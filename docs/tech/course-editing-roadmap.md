# Course admin UI, payload shape, and content depth

## Current admin dashboard (courses)

**Entry:** `drone/src/app/admin/courses/page.tsx` — course list from `getCourses()`, with New / Edit / Delete plus a per-course link to the Question Bank (`/admin/questions?course=<id>`). Editing is a **route**: `/admin/courses/new` and `/admin/courses/[courseId]` render **`CourseEditor`** under the persistent admin tab bar, so other tabs (e.g. Question Bank) stay reachable while editing and the browser back button works. Save/Cancel navigate back to `/admin/courses`.

**`CourseEditor`** (`drone/src/app/ui/components/course-editor.tsx`):

- **Visual mode:** Title, subtitle, description, HTML body, **hero images** (list + uploads), video URL, price, **tree of units** with **Add sub-unit** / **Sub-unit** controls to build nested sections (same fields per node: title, description, text, **images list**, video; max depth 8).
- **JSON mode:** Raw `CourseDetails` JSON for power users; uploads copy URL to clipboard.
- **Gaps addressed recently:** Multi-image **`images_url`**, visual **sub-unit** creation, horizontal scroll gallery in learner UI, admin list shows “Image” when any gallery URL exists (`mergeCourseImages`). Unit `CourseImageStrip` uses **`fit="contain"`** (full figure, letterboxed); course hero keeps **`fit="cover"`** + focal point.
- **Lesson body lists:** Learner UI renders `text_content` with `\n` → `<br />` only (no markdown). HTML `<ul>/<li>` works via Tailwind `prose`. Tracked in `docs/TODO.md` — course lesson list/markdown rendering.

**Remaining UX gaps (enhancement plan)**

| Area | Issue | Direction |
|------|--------|-----------|
| **Structure** | Visual editor supports **Add sub-unit** (header **Sub-unit** button and **Add sub-unit** inside expanded unit; max depth 8). | Optional drag-and-drop reorder, collapse/expand all. |
| **Exams** | Exams are not editable in visual mode (JSON only). | Optional stepper or embedded form for questions/answers with correct flags (admin-only), aligned with `ExamData` in `course.dto.ts`. |
| **Preview** | **Media previews in the editor:** image URL fields render inline thumbnails; video fields have a collapsed **Preview video** toggle (`video-preview.tsx` → `VideoComponent`: HLS / direct file / YouTube-Vimeo embed). No live preview of learner `SectionComponent` / `CourseComponent` while editing. | Split pane or “Preview” tab that renders read-only components with draft state. |
| **Validation** | Little client-side validation beyond required title. | Warn on duplicate unit IDs, invalid URLs, empty ordered units. |
| **Media** | Uploads are per-field; no asset library. | Reuse recent uploads for the same course folder. |
| **Unsaved changes** | Dirty-state guard (`use-unsaved-changes.ts`): confirm on internal link clicks, Cancel, and refresh/close. | Browser back during client-side history navigation is not blocked (App Router limitation). |

---

## Backend course data state

**Storage:** `courses.payload` is a **JSON string** of `CourseDetails` (not normalized per-column). Unit refs are normalized on save via `course-unit.util.ts`; the `course_units` table indexes the tree for queries and progress.

**Freemium:** Set `free_preview: true` on a top-level unit to expose its content (and descendants) without purchase. Course price is stored on the `courses.price` column (e.g. `$129` for FAA 107).

**Public marketing:** `GET /courses/:id/public` returns a stripped payload for SSR at `/courses/:id/preview`.

**Related code:**

- **Unit index:** `CourseUnitService`, `course_units` table, migration `1745100006000-StringUnitRefsAndCourseUnits.ts`.
- **Progress:** `ProgressService.getCourseWithProgress` overlays `unit_statuses` and applies freemium redaction via `redactUnitsForFreemium`.
- **Media cleanup / orphan detection:** `CourseService.collectCourseMediaUrls`, `OrphanMediaService`.

**API:** Swagger types in `backend/src/courses/types/course.dto.ts`. Regenerate frontend types with `npm run generate:api-types` in `drone/` (requires a running backend).

**Legacy note:** `migrateCoursePayloadImages` / `course-payload.util.ts` were removed in the PR 3 unit-ref migration; image normalization now happens in the save path.

---

## Deeper content hierarchy (plan)

**Today:** `units[]` → optional `sub_units[]` → **same `UnitData` type** (recursive). There is no separate named “module / chapter / lesson” layer in the schema.

**Options to add depth without breaking clients:**

1. **Keep recursion, add labels (minimal):** Optional `kind: 'unit' \| 'section' \| 'lesson'` on `UnitData` for UI labels and outline only; navigation still uses `id` and tree walk.
2. **Explicit depth names:** Introduce `modules: ModuleData[]` where `ModuleData` contains `units` and optional `sub_units` — **breaking** for existing payloads; would require version field (`payload_version`) and migration script.
3. **Stable slugs:** Add optional `slug` per node for `/courses/:id/units/:slug` in addition to `id`.

**Backend work:** Extend DTO + validation; `ProgressService` / `findUnit` already recurse `sub_units` — ensure all progress and exam paths use **string** `unit.id` consistently (some legacy code used `parseInt`; course controller uses string match).

**Frontend work:** Breadcrumb by walking parents; optional sidebar outline component; ensure `updateUnitProgress` targets nested ids (already supported if IDs are unique in tree).

---

## References

- Learner views: `course.tsx`, `unit.tsx`, `section.tsx`, `unit-preview.tsx`.
- Image gallery: `course-image-strip.tsx` (`fit` contain vs cover), `mergeCourseImages` in `drone/src/app/lib/course-images.ts`.
