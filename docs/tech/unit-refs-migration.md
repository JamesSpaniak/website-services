# Unit refs data-model migration (PR 3) — what changed and how to deploy

This PR replaces numeric course-unit IDs with **stable string refs** across the
whole stack and introduces a normalized **`course_units`** index table. It also
removes the deprecated `image_url` and embedded `exam` blocks from course
payloads, and replaces the full-payload copy on `progress` with a compact
per-unit status map.

**Read §3 (deploy ordering) before shipping.**

---

## 1. Why

The old scheme derived meaning from numeric IDs (`N` = unit, `N*10+n` =
sub-unit, `N*100+…` = sub-sub-unit). This broke when **Unit 10 (Radio
Communication Procedures)** was added: its children are `101`–`108`, which the
prefix math attributes to Unit 1 (`101 // 100 == 1`). Unit 7's rebuilt outline
(`710`–`731`) has the same ambiguity class. Questions, exams, and progress all
keyed on those numbers, so a collision silently corrupts scoping and reporting.

## 2. What changed

### Data model

| Table | Change |
| --- | --- |
| `course_units` (**new**) | One row per unit/sub-unit: `course_id`, `ref` (unique per course), `parent_ref`, `legacy_id`, `path`, `depth`, `position`, `title`. Rebuilt transactionally on every course save. |
| `courses.payload` | Unit `id`s rewritten to string refs (`u{n}` for legacy numeric ids, UUIDs for new units). `image_url` merged into `images_url` and dropped; embedded `exam` blocks dropped. |
| `questions` | New `unit_ref` / `sub_unit_ref` (varchar). Legacy `unit_id` / `sub_unit_id` kept **one release** for rollback, no longer read or written by app code. Backfill corrects questions whose numeric ids were mis-attributed (tree walk, not prefix math). |
| `exams` | New `scope_refs` (varchar[]). Legacy `scope_ids` kept one release. Dedup/reuse keys on sorted `scope_refs`. |
| `progress` | New `unit_statuses` (jsonb map `ref → status`) replaces the full `payload` copy, which is **dropped**. `exam_scores` snapshots rewritten to `scope_refs`. |

All of the above is performed by migration
`backend/src/migrations/1745100006000-StringUnitRefsAndCourseUnits.ts`, which
runs automatically at backend boot (`migrationsRun: true`).

### API surface

- `POST /exams/generate` and `POST /exams/class` accept `scope_refs: string[]`.
  Legacy `scope_ids` is still accepted and mapped to `u{n}` refs.
- Question create/update/import accept `unit_ref` / `sub_unit_ref` and validate
  them against `course_units`; legacy numeric ids are mapped when refs are
  absent. Export emits refs + `figure_ref`.
- Attempt `section_breakdown` returns `unit_ref` / `sub_unit_ref` plus resolved
  `unit_title` / `sub_unit_title` (frontend no longer parses numeric ids).
- `PATCH /progress/courses/:courseId/units/:unitId` takes the unit **ref**
  (already a string route param — unchanged shape, new semantics).
- Course create/update (`POST`/`PUT /courses`) normalize any numeric unit ids
  in the payload to refs and rebuild `course_units` in the same transaction —
  so **re-uploading a JSON authored with numeric ids keeps working** and is
  idempotent (`101` always becomes `u101`).

### Tooling

- `scripts/course_question_mapper.py` — tree walk derives the owning unit from
  the actual tree ancestor (fixes the Unit 10 mis-attribution) and exposes
  `ref`s.
- `scripts/build_faa_107_questions.py` — bulk JSON now emits `unit_ref` /
  `sub_unit_ref` strings and `figure_ref`. Regenerate with
  `python3 scripts/build_faa_107_questions.py`.

## 3. Deploy ordering

Context: production does **not** yet have the updated `faa_107_course.json`
(units 7 and 10 were rebuilt/added), and **no user has any course progress**,
so the `progress.payload` drop is a no-op in practice.

**Recommended order — course JSON first, then code:**

| Step | Action | Why this order |
| --- | --- | --- |
| 1 | **Upload the updated `assets/courses/faa-107/faa_107_course.json`** to production via the admin course editor (`PUT /courses/35`) while the *old* code is still running. The old code accepts the numeric-id JSON as-is. | The migration in step 2 walks whatever payload is in the DB. Uploading first means units 7 and 10 get refs, `course_units` rows, and corrected question links in the same migration pass. |
| 2 | **Deploy the backend.** Migration `1745100006000` runs at boot: rewrites payloads to refs, builds `course_units`, backfills `questions.unit_ref`, `exams.scope_refs`, `progress.unit_statuses`; drops `progress.payload`. | Single atomic transformation of content + links. |
| 3 | **Deploy the frontend.** It sends `scope_refs` / `unit_ref` and reads titled breakdowns. | New backend accepts both old and new field names, so frontend can lag the backend safely — never lead it. |
| 4 | **Re-import the question bank**: upload the regenerated `assets/courses/faa-107/questions/faa_107_questions.bulk.json` (admin → Question Bank → Import JSON, or `POST /questions/import`). | The regenerated file uses string refs (including `u10x` for Unit 10) which are validated against `course_units` — this import only succeeds **after** steps 1–2. |

**Alternative (also safe): code first, then JSON.** If the backend deploys
before the JSON upload, the migration transforms the *old* course payload, and
the subsequent `PUT /courses/35` with the updated JSON normalizes numeric ids
to refs and rebuilds `course_units` transactionally. The only constraint that
is *not* flexible: **the question bulk import (step 4) must come after both
the new code and the updated course JSON**, because refs are validated against
`course_units`.

### Merge semantics for the course overwrite

Numeric ids in authored JSON map deterministically to refs (`101 → u101`), so
overwriting the course is stable across uploads: question links
(`unit_ref = "u101"`) keep pointing at the same lesson no matter how many
times the JSON is re-uploaded. Brand-new units authored in the editor get
UUID refs. Removing a unit from the JSON leaves questions pointing at a
now-missing ref — they simply drop out of scoped exam pools (the gap report
from the build script highlights these).

### Rollback

- Legacy columns (`questions.unit_id`/`sub_unit_id`, `exams.scope_ids`) are
  retained for one release; the migration's `down()` restores
  `progress.payload` as an empty object (acceptable: no production progress).
- Frontend rollback is independent — the old frontend's `scope_ids` payloads
  are still accepted by the new backend.

## 4. Post-deploy verification

1. `GET /courses/35` — unit ids are strings (`u1`, `u101`, …); no `image_url`
   or `exam` keys anywhere in the payload.
2. `SELECT count(*) FROM course_units WHERE course_id = 35;` — matches the
   node count of the JSON (197 at the time of writing).
3. Generate a **Unit 10 exam** (`scope: unit`, `scope_refs: ["u10"]`) — pool
   is non-empty after the question re-import.
4. Generate a **Unit 1 exam** — confirm no Unit 10 questions leak in (the old
   prefix-math bug).
5. Mark a lesson complete — `progress.unit_statuses` gains a `"u…": "completed"`
   entry and `units_completed` increments.
