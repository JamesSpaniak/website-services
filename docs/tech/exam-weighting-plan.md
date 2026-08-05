# Exam category weighting — data model & generation proposal

**Status:** Proposal (Aug 5 2026) — not implemented. Companion to
[`exam-generator-and-course-linking.md`](exam-generator-and-course-linking.md) (current behavior).

## 1. Problem

`ExamGeneratorService.selectQuestions()` draws uniformly at random from the flattened
scoped pool (within priority tiers 1→2→3). There is **no per-category, per-unit, or
per-section weighting**, so a generated exam's category mix mirrors whatever the question
bank happens to contain. The FAA UAG (Part 107) knowledge test has a published blueprint,
and our bank is skewed relative to it, so practice exams systematically misrepresent the
real test.

### FAA Part 107 (UAG) category blueprint

| FAA category | FAA % range |
|---|---|
| Airports & airspace | 15–25% |
| Loading and performance | 7–11% |
| Operations | 35–45% |
| Regulations | 15–25% |
| Weather | 11–16% |

Note: we added more sections under Operations in the course restructure so this area can
be divided better (see [`course-content-restructure-plan.md`](course-content-restructure-plan.md)).

### Author's audit of source practice tests (Aug 5 2026)

These are the category distributions of the compiled source tests, with the author's
annotations. They show even the hand-built tests drift out of the FAA bands — the
generator should enforce the bands instead of inheriting drift.

**2nd Rnd Practice Test (60 Q)**

| Category | Count | % | Note |
|---|---|---|---|
| Airports & airspace | 15 | 25.0% | on the high end of range |
| Loading and performance | 5 | 8.3% | |
| Operations | 18 | 30.0% | **too low** |
| Regulations | 15 | 25.0% | on the high end of range |
| Weather | 7 | 11.7% | |

**New 60-question test prep (60 Q)**

| Category | Count | % | Note |
|---|---|---|---|
| Airports & airspace | 12 | 20.0% | |
| Loading and performance | 4 | 6.7% | |
| Operations | 17 | 28.3% | **too low** |
| Regulations | 19 | 31.7% | **too high** |
| Weather | 8 | 13.3% | |

**Part 1 test key (66 Q)**

| Category | Count | % | Note |
|---|---|---|---|
| Airports & airspace | 10 | 15.2% | |
| Loading and performance | 2 | 3.0% | **too low** |
| Operations | 27 | 40.9% | |
| Regulations | 18 | 27.3% | a little high |
| Weather | 9 | 13.6% | |

**4th rnd (60 Q)**

| Category | Count | % | Note |
|---|---|---|---|
| Airports & airspace | 13 | 21.7% | |
| Loading and performance | 3 | 5.0% | low by 2 Q |
| Operations | 19 | 31.7% | too high (vs. its own target split; still below FAA min) |
| Regulations | 17 | 28.3% | too low (vs. its own target split; above FAA max) |
| Weather | 8 | 13.3% | |

### Current bank skew (unit-level bulk, 463 questions, Aug 5 2026)

From `assets/courses/faa_107_questions_unit_level.bulk.json`, grouped by the default
category→unit mapping in §3:

| Category | Units | Bank count | Bank % | FAA range | Unweighted 60-Q draw (expected) |
|---|---|---|---|---|---|
| Regulations | u1 | 108 | 23.3% | 15–25% | ~14 Q — high end, OK |
| Airports & airspace | u2, u3 | 138 | 29.8% | 15–25% | ~18 Q — **over max** |
| Weather | u5, u6 | 74 | 16.0% | 11–16% | ~10 Q — at max |
| Loading & performance | u7 | 32 | 6.9% | 7–11% | ~4 Q — **under min** |
| Operations | u4, u8, u9, u10 | 111 | 24.0% | 35–45% | ~14 Q — **far under min** |

Because selection is a uniform draw from the flattened pool, expected exam composition ≈
bank composition. A random 60-question practice exam today averages ~24% Operations vs
the FAA's 35–45% floor, and can randomly include zero questions from a small category.
The separate `FINAL_EXAM` pool (77 chart/figure questions) has `unit_ref = NULL`, so it
currently has no category at all (see §8, open question 2).

## 2. Where should the weighting live? (data model)

**Recommendation: course-level blueprint (canonical config) + frozen snapshot on each
generated exam row.** Not exam-level as the source of truth.

Reasoning:

- Exams are generated ad hoc by students (a new `exams` row per fresh attempt) — there is
  no persistent "exam definition" object to hang config on. The blueprint is a property of
  the course/certification, not of one generated instance.
- The `exams` row already freezes `question_ids`; it should additionally freeze *which
  blueprint was applied and what was achieved* for audit/reporting, exactly like
  `is_randomized` and `exam_pool` are recorded today.
- A per-request override (teacher building a custom class exam) can be layered on later
  via `GenerateExamDto` without changing the model.

### New table: `exam_blueprint_buckets`

One row per category bucket. Grouping multiple `unit_ref`s into one named bucket is the
core requirement (e.g. Operations = u4 + u8 + u9 + u10), which is why this is not just a
column on `course_units`.

```ts
@Entity('exam_blueprint_buckets')
@Unique(['course_id', 'organization_id', 'scope_ref', 'label'])
export class ExamBlueprintBucket {
  @PrimaryGeneratedColumn() id: number;

  /** FK to courses.id */
  @Index() @Column({ type: 'int' }) course_id: number;

  /**
   * NULL → course default blueprint (admin-owned).
   * Set  → override for one organization (manager-owned, ON DELETE CASCADE).
   */
  @Index() @Column({ type: 'int', nullable: true })
  organization_id: number | null;

  /**
   * Which exams this bucket applies to:
   *  - NULL          → full_course exams (practice / final)
   *  - a unit ref    → end-of-unit quizzes for that unit (v2, see §6)
   */
  @Column({ type: 'varchar', length: 64, nullable: true })
  scope_ref: string | null;

  /** Display name, e.g. "Operations" — used in exam breakdown reporting */
  @Column({ type: 'varchar', length: 128 }) label: string;

  /**
   * course_units.ref values in this bucket. For full-course buckets these are
   * top-level unit refs (matched against questions.unit_ref); for unit-scoped
   * buckets these are section refs (matched against questions.sub_unit_ref).
   */
  @Column({ type: 'varchar', length: 64, array: true }) refs: string[];

  /** Target share of the exam, 0–100. All buckets for a (course_id, scope_ref) must sum to 100. */
  @Column({ type: 'numeric', precision: 5, scale: 2 }) target_pct: number;

  /** Published band (informational + used to validate the achieved mix), nullable. */
  @Column({ type: 'numeric', precision: 5, scale: 2, nullable: true }) min_pct: number | null;
  @Column({ type: 'numeric', precision: 5, scale: 2, nullable: true }) max_pct: number | null;

  @Column({ type: 'smallint' }) position: number;
}
```

Alternatives considered:

| Option | Verdict |
|---|---|
| JSONB `exam_blueprint` column on `courses` | Workable, but no DB-level validation, harder to edit via admin UI, and `courses.payload` is already an opaque blob we're moving *away* from parsing. |
| Category column on `course_units` | Can't express percentages, and buckets are cross-unit groupings with their own targets. |
| Weights on the `exams` row as canonical | Wrong ownership — student-generated exams are throwaway rows; config would be duplicated per generation with no single place to edit. |
| Per-question category tag | Redundant with `unit_ref` for 99% of questions; only needed for the `FINAL_EXAM` pool (open question 2). |

### Organization overrides & resolution order

An override is a **complete replacement bucket set** for a `(course_id, scope_ref)` —
all rows share the same `organization_id` and must sum to 100. No merging of individual
buckets with the course default; partial merges make validation and reasoning much
harder for little benefit (a school that wants one tweak copies the default and edits it).

At generation time the blueprint is resolved in this order:

1. **Organization override** — teacher class exams use `dto.organization_id` directly;
   student-generated exams look up the student's `organization_members` row (self-study
   students in a school get their school's blueprint too).
2. **Course default** (`organization_id IS NULL`).
3. **None** → today's unweighted behavior.

The resolved rows (not the config pointer) are what gets hashed into the fixed-exam
`dedup_key` and frozen into `blueprint_snapshot`, so two orgs assigning "the same" fixed
exam correctly get different exams, and later edits to either blueprint never mutate an
already-generated one. `blueprint_snapshot` gains an `organization_id` field recording
which override (if any) applied.

Why the resolved-rows hash matters for dedup: the existing `dedup_key` has no org
component (fixed exams are intentionally shared across orgs when identical). Hashing the
resolved buckets preserves that sharing when two orgs use the course default, while
splitting them the moment one org overrides.

### Exam row addition: `blueprint_snapshot`

```ts
/** Frozen record of the blueprint applied at generation time (null = unweighted). */
@Column({ type: 'jsonb', nullable: true })
blueprint_snapshot: {
  bucket: string;          // label
  refs: string[];
  target_pct: number;
  target_count: number;    // after apportionment
  actual_count: number;    // after shortfall redistribution
}[] | null;
```

This answers "was this exam blueprint-compliant?" forever, even if the blueprint config
changes later, and lets the exam results page show a per-category breakdown.

### Seed data — FAA 107 full-course blueprint

Targets must sum to 100; defaults sit inside each FAA band, biased toward the middle:

| Bucket | refs | target_pct | min_pct | max_pct |
|---|---|---|---|---|
| Regulations | {u1} | 20 | 15 | 25 |
| Airports & airspace | {u2, u3} | 20 | 15 | 25 |
| Weather | {u5, u6} | 13 | 11 | 16 |
| Loading & performance | {u7} | 9 | 7 | 11 |
| Operations | {u4, u8, u9, u10} | 38 | 35 | 45 |

For a 60-question exam this yields 12 / 12 / 8 / 5 / 23 (largest-remainder rounding —
see §4). Every bucket currently has enough bank supply to fill its slice (smallest:
Loading needs 5 of 32).

**Mapping caveat (confirm with author):** the FAA UAG taxonomy puts *airport operations*
under Area V (Operations), so u4 defaults to the Operations bucket. If the author prefers
u4 under "Airports & airspace" (matching the unit's chapter grouping), it's a one-row
edit — but note it moves ~7% of the bank between buckets (Airspace 29.8%→36.7%,
Operations 24.0%→17.1%) and changes nothing about feasibility.

## 3. Generation algorithm

Weighting applies when `scope = 'full_course'` and a blueprint exists for
`(course_id, scope_ref = NULL)`. Otherwise the current behavior runs unchanged (no
blueprint → no behavior change; this is the backward-compatibility story).

```
selectQuestions(dto):
  pool = fetchPool(dto)                       # unchanged SQL
  blueprint = loadBuckets(course_id, scope_ref = null)   # only for full_course
  if no blueprint or blueprint disabled: return legacySelect(pool)   # today's code

  # 1. Apportion question_count across buckets (largest remainder / Hamilton method)
  raw_i    = question_count * target_pct_i / 100
  target_i = floor(raw_i);  distribute leftover slots by descending fractional part
  # → deterministic, sums exactly to question_count

  # 2. Partition the pool by bucket (question.unit_ref ∈ bucket.refs)
  #    Questions whose unit_ref matches no bucket go to an "unbucketed" reserve.

  # 3. Fill each bucket independently with the existing priority logic:
  #    priority 1 first, then 2, then 3; shuffle within tier if randomized,
  #    sort by id if fixed. Take up to target_i.

  # 4. Shortfall redistribution: if some bucket had fewer than target_i questions,
  #    reassign the unfilled slots to the other buckets (+ unbucketed reserve),
  #    proportionally to their remaining supply, preferring buckets still below
  #    their max_pct. Repeat until slots are filled or total supply is exhausted.
  #    Log a warning and record the deficit in blueprint_snapshot.

  # 5. Order the final set:
  #    randomized → single Fisher–Yates shuffle across the combined set
  #                 (so questions are NOT grouped by category in presentation)
  #    fixed      → sort by (bucket.position, priority, id) — fully deterministic

  # 6. saveExam(...) with blueprint_snapshot = per-bucket {target, actual}
```

### Determinism properties (answering "random or deterministic?")

| Aspect | Behavior |
|---|---|
| Bucket target counts | **Always deterministic** — pure arithmetic from `question_count` × `target_pct` with largest-remainder rounding. Two generations of a 60-Q practice exam always aim for the same 12/12/8/5/23 split. |
| Which questions within a bucket | Randomized exams: unseeded shuffle per priority tier (as today). Fixed exams: sort by id (as today). |
| Presentation order | Randomized: shuffled across buckets. Fixed: stable `(bucket, priority, id)` order. |
| After generation | Frozen in `exams.question_ids` either way (unchanged). |

So randomness only ever affects *which* questions fill a bucket and their order — never
the category mix. No RNG seed is needed; the frozen `question_ids` +
`blueprint_snapshot` already give full reproducibility for audit.

### Edge cases (uneven banks)

| Case | Behavior |
|---|---|
| Bucket has more supply than target (e.g. Airspace: 138 for 12 slots) | Capped at target — this is the fix for today's over-representation. Priority-1 questions still win the bucket's slots first. |
| Bucket has less supply than target | Fill what exists, redistribute the remainder to other buckets (step 4), warn, record deficit in snapshot. Exam still reaches `question_count` if total supply allows. |
| Bucket has zero active questions | Same as above — degenerate shortfall. |
| Bucket percentages don't sum to 100 | Rejected at config write time (admin endpoint validation), and normalized defensively at read time with a logged error. |
| Question whose `unit_ref` is in no bucket | Never selected in step 3; only used as last-resort reserve in step 4. Import/admin validation should flag unbucketed units. |
| `question_count` > total pool | Returns the whole pool (unchanged from today). |
| Redistribution pushes a bucket past `max_pct` | Allowed as last resort (a full-length exam beats a short one), but flagged in the snapshot so the UI can badge the exam as "off-blueprint". |

### Interaction with priority tiers

Priority (1 core / 2 standard / 3 supplemental) becomes a *within-bucket* fill order
instead of a global one. This is the intended semantics — "core" should mean "core for
its category", not "crowds out entire categories" (which is what happens today when
priority-1 questions cluster in one unit).

### Dedup key change (fixed class exams)

`buildDedupKey` must include a blueprint fingerprint (e.g. hash of the bucket rows or a
`blueprint_version` counter bumped on edit) so editing the blueprint stops reusing
stale fixed exams:

```
{course_id}:{scope}:{refs}:{version}:{count}:{pool}:bp{hash}:fixed
```

## 4. Worked example (60-question practice exam, current bank)

| Bucket | target_pct | raw | floor | +remainder | final target | bank supply | actual |
|---|---|---|---|---|---|---|---|
| Regulations | 20 | 12.0 | 12 | — | 12 | 108 | 12 |
| Airports & airspace | 20 | 12.0 | 12 | — | 12 | 138 | 12 |
| Weather | 13 | 7.8 | 7 | +1 | 8 | 74 | 8 |
| Loading & performance | 9 | 5.4 | 5 | — | 5 | 32 | 5 |
| Operations | 38 | 22.8 | 22 | +1 | 23 | 111 | 23 |
| **Total** | 100 | | 58 | +2 | **60** | 463 | **60** |

Every generated practice exam lands inside the FAA bands regardless of bank skew — the
bank imbalance now only affects *variety* (how often questions repeat across attempts),
not *composition*. Ops has 111 questions for 23 slots, so rotation is still healthy.

## 5. API & admin changes

| Change | Detail |
|---|---|
| `GET /questions/blueprint?course_id=&organization_id=` | Returns the resolved bucket set plus which level it came from (`default` / `org override` / `none`). Admin, org managers (own org), and the exam player (read-only, for the breakdown UI). |
| `PUT /questions/blueprint` (admin) | Replace the course-default bucket set for a `(course_id, scope_ref)`; validates sum=100, refs exist in `course_units`, no ref in two buckets. |
| `PUT /questions/blueprint/org/:organizationId` (manager) | Same payload/validation, guarded by the existing `OrgManagerGuard`; writes rows with `organization_id` set. `DELETE` removes the override and falls back to the course default. |
| `GenerateExamDto` | Optional `use_blueprint?: boolean` (default `true`). Teachers can pass `false` for an unweighted scoped exam. No per-request custom weights in v1 — a teacher wanting custom weights sets an org override first. |
| Exam responses | Include `blueprint_snapshot` so the exam player / results page can show a category breakdown ("You scored 4/12 in Regulations"). This also feeds the standards-failure reporting we already do via `question.standard`. |
| Frontend | No change to generate calls in v1 (`practice/page.tsx`, `final/page.tsx` pick up weighting automatically). Results-page category breakdown is a fast follow. |

### Editing UI

| Surface | Who | What |
|---|---|---|
| **Admin dashboard → course edit page** (`/admin/courses/[courseId]`) | Admin | New "Exam blueprint" panel: bucket rows (label, unit multi-select from `course_units` depth-0, target/min/max %), live sum-to-100 and unassigned-units warnings, plus a read-only "current bank supply per bucket" column so skew like today's Operations gap is visible while editing. Ships in **v1** — the migration seed is just the initial row set; ongoing editing happens here, not in migrations. |
| **Manager dashboard** (`/manager`) | Org manager | Same panel per licensed course, pre-filled from the course default, with "Reset to course default" (deletes the override). Ships in **v1.5** — the API-level override support lands in v1 so admins can set org overrides on request before the manager UI exists. |

## 6. Unit-level (per-section) weighting — v2

The same table handles the earlier ask of weighting *sections within an end-of-unit
quiz*: rows with `scope_ref = 'u1'` and `refs` containing section refs, matched against
`questions.sub_unit_ref` instead of `unit_ref`. The generator branch is identical —
only the partition key differs. Not proposed for v1 because:

- No published per-section blueprint exists inside a unit; targets would be invented.
- Unit banks are smaller (u8 has 8 questions total) so quotas would mostly trigger the
  shortfall path.
- If desired later, a sensible default is "proportional to section leaf count" rather
  than hand-set percentages — that can be computed, not configured.

## 7. Rollout plan

1. **Migration** `AddExamBlueprints` — create `exam_blueprint_buckets`, add
   `exams.blueprint_snapshot jsonb null`. Runs on boot per backend convention.
2. **Seed** the FAA 107 full-course blueprint (§2 table) in the same migration (idempotent
   insert keyed on `(course_id, scope_ref, label)`), after author confirms the u4 mapping.
3. **Generator** — implement §3 in `ExamGeneratorService` behind the "blueprint exists"
   check; extend `exam-generator.service.spec.ts`: apportionment rounding, shortfall
   redistribution, fixed-exam determinism, dedup-key invalidation, no-blueprint
   passthrough.
4. **Admin endpoints + admin-dashboard blueprint panel + org-override endpoints** (§5);
   manager-dashboard override UI as v1.5.
5. **Docs** — update [`exam-generator-and-course-linking.md`](exam-generator-and-course-linking.md)
   §selection and [`backend-data.md`](backend-data.md) entities; move the TODO row.
6. **Verify** — generate 20 practice exams locally, assert all land within min/max bands.

## 8. Open questions

1. **u4 (Airport Operations) bucket** — Operations (FAA taxonomy, default) or Airports &
   airspace (author's chapter grouping)? One-row change; needs author call.
2. **Charts final (`exam_pool = 'final_only'`)** — its 77 `FINAL_EXAM` questions have
   `unit_ref = NULL`, so they can't be bucketed today. Options: (a) leave the final
   unweighted in v1 (recommended — it's deliberately a figure/chart drill, not a
   blueprint simulation), or (b) retag those questions with real `unit_ref`s during the
   pending FINAL_EXAM re-tag work (see TODO "Part 107 post-restructure follow-ups") and
   weight it too.
3. **Practice-exam variety** — with quotas, heavy banks (Airspace 138→12 slots) repeat
   less; light banks (Loading 32→5) repeat more across attempts. Do we want a
   "recently seen" penalty per user later? Out of scope for v1.
4. **Should org overrides be clamped to the FAA bands?** A school could set Operations
   to 10% and produce non-representative practice exams. Options: hard-clamp override
   targets to the course default's min/max, or allow anything and badge off-blueprint
   exams in reporting. Leaning: allow, with a visible warning in the manager UI —
   schools may legitimately want unit-emphasis drills.
5. **Students in multiple organizations** — `organization_members` allows it; pick the
   most recent membership (or the org the exam page was reached through) and record the
   chosen `organization_id` in `blueprint_snapshot`. Rare today; decide before v1 ships.
