# Progress tracking accuracy — test plan & risk register

**Goal:** every number a teacher sees about a student is defined, tested, and monitored, so it can be trusted (no phantom completions, no silently missing study time) — without making the learner experience worse (no nagging, no "watch the credits to get credit").

**Status:** Phases 1, 1b, 2 and 4 (PTA6) committed (`571bce0`) and deployed 2026-10-05; PTA6 alerts applied 2026-10-06. **All decisions PTD1–PTD7 made 2026-10-04**; PTD3 + PTD6 implemented. **PTA2** (35-day rollup rebuild) skipped 2026-10-06 — older days keep the previous counts. Phases 3 (PTA5) and 5 (PTA7) not started. Open risk: **R16** (ad blockers — Phase 3). Track rows **PTA5, PTA7, PTA8** in [`../TODO.md`](../TODO.md); decisions **PTD1–PTD7** in § 6.

Related: [`manager-progress-visibility.md`](manager-progress-visibility.md) (teacher views), [`analytics-implementation-plan.md`](analytics-implementation-plan.md) (ingest, video § 4.5), [`analytics-queries.md`](analytics-queries.md) (schema + SQL), [`frontend-data.md`](frontend-data.md) (client events).

---

## 1. How progress flows today (one-paragraph map)

Two write paths feed the teacher views:

1. **Explicit status** — `PATCH /progress/courses/:id/units/:ref` writes `progress.unit_statuses` (JSON map). Sources: auto `IN_PROGRESS` on opening a lesson (`drone/…/unit.tsx`), **Mark complete**, the kebab menu, and a quiz pass ≥ 70 (`ExamAttemptService.markScopedUnitsComplete`).
2. **Behaviour stream** — `drone/src/app/lib/analytics.ts` batches events (5 s / 20 events / `sendBeacon` on hide) to `POST /analytics/event` → `ProductEventsService.recordBatch` → `product_events` (+ `video_progress` upsert, `progress.last_activity_at` bump). Nightly `rollupDaily` → `product_events_daily`.

Teacher endpoints (`/organizations/:id/progress|engagement|utilization`) read both live: rollup for past days + raw `product_events` for today.

## 2. Metric contract (what each teacher-facing number means)

| Metric (where shown) | Counts as 1 | Does **not** count | Tolerance |
|---|---|---|---|
| **Unit completed** (progress grid, % complete) | Unit ref is `COMPLETED` in `unit_statuses` | An automatic "opened it" write from a stale tab | **Exact** — 0 false completions, 0 lost completions |
| **Video watched** (✓ / x of y) | Distinct seconds actually played ≥ the completion rule in § 3 | Scrubbing/seeking to the end; replaying the same 10 s | Exact against the rule |
| **Minutes engaged** (7d / 30d) | One 30 s heartbeat bucket per user × course while the tab is visible and the student is active or a video plays | A second tab/window open at the same time | ±10 % of a scripted session |
| **Lessons viewed** (engagement) | Distinct lessons opened per day | Reloads / revisits the same day | Exact |
| **Last active** | Any learning event or progress write | Login alone (PD7) | ≤ 2 min lag |
| **Active this week / Active seats (30d)** | `last_activity_at` within 7 / 30 days | — | Exact |
| **Day boundaries** ("today", daily series, 7/30-day windows) | The organization's local day (`organizations.timezone`, default `America/New_York`) — **PTD4** | — | Exact |
| **Who / what is counted** | Students (`role = member`) on the org's **assigned** courses — never managers, never unassigned courses — **PTD5** | — | Exact |

Any change to these definitions updates this table first.

## 3. Video completion rule (with outro / end grace)

Learners routinely stop a video in the last few seconds (end card, credits, "see you next lesson"). The rule must not punish that, and it must not reward scrubbing.

```
content   = duration − outro_seconds          (outro_seconds per video, default 0, capped at 50 % of duration)
watched   = distinct seconds played inside [0, content]
required  = max(0.75 × content, min(0.90 × content, content − 10 s))
completed = watched ≥ required
```

| Video | Outro | Required | Effect |
|---|---|---|---|
| 5:00 | 0 | 270 s (90 %) | Stopping with 30 s left still completes |
| 1:00 | 0 | 50 s | Stopping with 10 s left completes (plain 90 % would need 54 s) |
| 0:15 | 0 | 11.3 s (75 % floor) | Short clips still need most of the clip |
| 3:00 | 25 s credits | 140 s of the first 155 s | Credits never need to be watched |

- **Scrubbing never completes** — the server decides from merged watched ranges only; the `video_completed` event name and the browser's `ended` event no longer force completion.
- **`outro_seconds`** is set per unit in the course payload as `video_outro_seconds` (optional, integer seconds) → copied to `course_units.video_outro_seconds`. Leave it unset unless a video has a credits/end-card tail longer than ~10 s.
- `percent_watched` (shown as the ring %) stays raw watched ÷ duration; the ✓ comes from `completed`. A learner can show "84 % ✓" — intended.
- The client mirrors the rule (`drone/…/video.tsx`) only to decide *when* to send `video_completed`; the server recomputes and is authoritative.

## 4. Risk register

Severity: **H** = a teacher would see a wrong answer about a specific student; **M** = aggregate skew; **L** = edge case.
Direction: ↓ under-count (missed sends) · ↑ over-count (extra sends).

| ID | Risk | Dir | Sev | Where | Status |
|---|---|---|---|---|---|
| **R1** | Session expiry silently drops heartbeats/video/last-active. Access cookie and JWT both expire at 1 h; analytics requests then arrive with no token, are treated as a guest, and course-scoped events are dropped with a 204 | ↓ | H | `analytics.controller.ts`, `analytics.ts` | **Phase 1 fix:** 401 when a refresh cookie is present but no valid access token → client refreshes and retries the batch (event ids dedupe) |
| **R2** | Scrub-to-end marks a video watched: `ended` sends `video_completed`, server sets `completed` by event name | ↑ | H | `video.tsx`, `product-events.service.ts` | **Phase 1 fix:** § 3 rule, server ignores event name |
| **R3** | Lost update on `unit_statuses` (read-modify-write, no lock); a stale tab's auto `IN_PROGRESS` downgrades `COMPLETED` | ↓ | H | `progress.service.ts`, `unit.tsx` | **Phase 1 fix:** row lock (`SELECT … FOR UPDATE`) + `auto: true` writes only promote from not-started |
| **R4** | Concurrent first visits race on progress row creation (500 + duplicate `course_started`) | ↑ | M | `progress.service.ts` `getOrCreateProgress`, `touchProgress` | **Phase 1 fix:** `INSERT … ON CONFLICT DO NOTHING`, event only when inserted |
| **R5** | Dedupe breaks for retries > 5 min late: `occurred_at` clamped to "now − 5 min" changes each retry, so `(event_id, occurred_at)` differs | ↑ | M | `clampTime` | **Phase 1 fix:** keep true client time within 24 h (deterministic → dedupes); older dropped as `stale`; future clamped to now |
| **R6** | Rollup counts *events*: reloads inflate `lessons_viewed`, status toggles inflate `units_completed`, two windows double minutes | ↑ | M | `rollupDaily`, `org-insights.service.ts` live queries | **Phase 1 fix:** distinct units per day; minutes = distinct 30 s buckets per user × course; one shared SQL definition for rollup and live "today" |
| **R7** | Rollup only recomputes 2 days — 3+ missed nights leave permanent gaps | ↓ | M | `analytics-maintenance.service.ts` | **Phase 1 fix:** lookback extends back to the last successful rollup (cap 35 days) |
| **R8** | Concurrent batches for one video lose watched ranges (read-merge-write) | ↓ | L | `applyVideoUpdate` | **Phase 1 fix:** per-video advisory lock in a transaction |
| **R9** | Section videos register under the section ref but the heartbeat reads the top-level ref → position/ranges only reach the server at 25/50/75/90 % milestones; tail of a video can be lost on leave | ↓ | M | `use-lesson-heartbeat.ts`, `course-unit-video.tsx` | **Fixed (Phase 2):** section videos report on the heartbeat tick and on unmount / page hide |
| **R10** | One invalid event 400s the whole batch; client drops up to 20 events | ↓ | M | `product-event.dto.ts`, `analytics.ts` | **Fixed (Phase 2):** per-event validation (`validateAnalyticsEvents`), invalid ones counted as `dropped{reason=invalid}` |
| **R11** | Beacon on tab close sends only the first 20 queued events; a batch already in `fetch` is lost if the page dies | ↓ | L | `analytics.ts` | **Fixed (Phase 2):** page hide beacons the whole queue in 20-event chunks; the in-flight batch stays in sessionStorage until answered |
| **R12** | Offline > ~3 min: batch dropped after 5 attempts | ↓ | L | `analytics.ts` | **Fixed (Phase 2):** network errors never drop; offline waits for `online`; queue cap 1000 |
| **R13** | Course "completed" is manual only; parent units need a quiz pass or the kebab menu to reach 100 % | ↓ | M | `progress.service.ts`, `course.tsx` | **Fixed (PTD3)** for new completions |
| **R14** | Teacher summary includes managers' own rows and every visible course (not only assigned); timeline/quiz history show courses outside the org | ↑ | M | `organization.service.ts`, `org-insights.service.ts` | **Fixed (Phase 1b, PTD5)** |
| **R15** | All day boundaries are UTC — "today" rolls over at 8 pm ET; minutes between 00:00 UTC and the 00:30 rollup are in neither half | ↓ | M | rollup + live queries | **Fixed (Phase 1b, PTD4):** org-local days everywhere; hourly rollup; local today + yesterday read raw |
| **R16** | Ad/tracker blockers may block `/api/analytics/event` (status writes still work, minutes/video vanish) | ↓ | ? | path naming | Phase 3 — measure, rename path if hit |
| **R17** | Exam submit races: `attempt_no = MAX+1`, delete-then-insert of `exam_attempts`, read-then-save of `exam_scores` | ↑↓ | L | `exam-attempt.service.ts` | **Fixed (Phase 1b):** per user × exam advisory lock around delete/insert + history; `exam_scores` written under a row lock |
| **R18** | Rows already marked `video_progress.completed` by scrubbing stay true (completion is sticky) | ↑ | M | prod data | **Accepted 2026-10-04 (PTD2: no recompute)** |
| **R19** | Course reset deletes `progress` only; `video_progress` and events remain, so resets look like instant re-watches | ↑ | L | `resetCourseProgress` | **Fixed (PTD6)** |
| **R20** | Engagement "today" counts only `exam_submitted`; rollup counts `exam_submit` too | ↑↓ | L | `org-insights.service.ts` | Phase 1 fix (shared SQL) |
| **R21** | Remounts re-send `video_started` and milestones → `play_count` inflates | ↑ | L | `video.tsx` | **Fixed (Phase 2):** `video_started` once per video per tab session; a late resume point no longer resets tracking |

## 5. Test plan by phase

### Phase 1 — backend correctness against real Postgres *(done locally 2026-10-04)*

Suite: `backend/test/progress-tracking.e2e-spec.ts` (`npm run test:e2e -- test/progress-tracking.e2e-spec.ts`, local `blog_test` DB). Pure-function tests: `backend/src/product-events/video-completion.spec.ts`.

| Test | Proves | Risk |
|---|---|---|
| Same batch twice, and again 10 min later (old `occurredAt`) → one row per event | Idempotent ingest | R5 |
| Batch with expired session (refresh cookie, no access token) → 401; with no cookies → 204 | No silent drop | R1 |
| Scrub to end + `video_completed` / `ended` → not completed | No phantom watch | R2 |
| Watch to `content − 8 s` with no outro; watch to outro start with `video_outro_seconds` → completed | End grace / outro | § 3 |
| Two parallel batches for one video → ranges = union | No lost ranges | R8 |
| 25 × parallel {auto IN_PROGRESS, COMPLETED} on one unit → always COMPLETED, `units_completed` correct | No lost update / downgrade | R3 |
| Explicit (kebab) IN_PROGRESS after COMPLETED still allowed | UX unchanged | R3 |
| 10 parallel first visits → one progress row, one `course_started` | No create race | R4 |
| Rollup: 3 reloads + 2 completion toggles + two tabs' heartbeats → lessons 1, units 1, minutes = distinct buckets; rerun → identical | Rollup semantics + idempotent | R6 |
| Rollup after 5 skipped days backfills all 5 | No gaps | R7 |
| Live "today" engagement equals rollup for the same events | One definition | R6, R20 |

### Phase 1b — teacher endpoint fixtures *(done locally 2026-10-04)*
Suite: `backend/test/teacher-views.e2e-spec.ts` (9 tests). A golden class in **America/Los_Angeles**: 3 students, 1 manager, an assigned and an unassigned course, heartbeats today / 11 pm yesterday / 3 days ago / 9 days ago, quizzes, a watched video. Asserts exact numbers from `/progress` (+ CSV), `/progress/:courseId` (404 for unassigned), `/engagement?days=7|1` (minutes, active days, LA-dated series), `/utilization`, timeline and quiz history; plus R17 (two simultaneous submits → one latest attempt, attempt numbers 1 and 2). The whole fixture is also rolled up, proving the rollup and raw halves never double count.

Implementation:
- `organizations.timezone` (migration `1765000009000`, default `America/New_York`; admin Organizations page has a US time-zone picker).
- Rollup keys org members' rows by the org's local date and **rebuilds** its window (delete + insert in one transaction, `pg_try_advisory_xact_lock`); runs **hourly** for 2 days (`15 * * * *`) and nightly with catch-up.
- Teacher reads (`OrgInsightsService`): local today + yesterday from raw `product_events`, older days from the rollup (`RAW_RECENT_DAYS`, `windowSplit`); all scoped to `orgCoursesSql` and `role = 'member'`. The engagement series counts a member as active on a day when they have engaged minutes.

### Phase 2 — client tests + fixes *(done locally 2026-10-04)*
Vitest + jsdom (`cd drone && npm test`), 24 tests: `lib/analytics.test.ts` (batching, in-flight persistence, restore, network errors never drop, offline waits for `online`, 5× 5xx drop, 401 refresh-resend, guest fallback, beacon chunks, before-leave hook), `lib/use-lesson-heartbeat.test.tsx` (30 s ticks, hidden, idle vs playing video, ranges on tick, section video on tick, leave), `ui/components/video.test.tsx` (scrub, end grace, outro, `video_started` once per session, unmount flush, late resume). Backend: R10 e2e test (malformed events dropped individually). Fixes R9–R12, R21 above. Mutation-checked: re-adding `startPosition` to the tracking effect or removing the once-per-session guard fails the video tests.

### Phase 3 — scripted students (Playwright, local stack)
A scripted learner whose real activity is logged; then sign in as the teacher and assert the dashboard.

| Scenario | Expected on the teacher dashboard |
|---|---|
| Watch 3 lessons fully, mark complete | 3 complete, minutes ≈ wall time ±10 %, videos 3/3 |
| Scrub a video to the end | Video not ✓ |
| Stop with 5 s left / at outro start | Video ✓ |
| Reload a lesson 5× | Lessons viewed 1, no extra minutes |
| 70-min session (past token expiry; fake clock or `JWT_EXPIRES_IN=2m`) | All minutes present |
| Two tabs; complete in one, expand in the other | Still complete; minutes not doubled |
| Offline 10 min then online | No loss, no duplicates |
| Close tab mid-video | Position + minutes recorded |
| Browser in America/Los_Angeles at 9 pm local | Matches **PTD4** decision |
| uBlock Origin default lists | Record result (R16) |

### Phase 4 — production invariants (nightly, alert to Grafana)
SQL checks run after the rollup; any non-zero count alerts:
- user × course × day minutes > 600, or heartbeat buckets > wall-clock buckets
- `video_progress.completed` with watched < rule (after **PTD2**)
- `progress.units_completed` ≠ count of `COMPLETED` refs present in `course_units`
- rollup vs recount from raw `product_events` for a sampled day differs
- Active users with lesson events but zero heartbeats for > 60 min (missed sends)
- `product_events.dropped{reason}` — chart; alert on `course_scoped_anonymous` or `stale` spikes during school hours

**Implemented 2026-10-05 (PTA6)** — `AnalyticsMaintenanceService.trackingChecks()`, nightly step `tracking_checks` (after the rollup, so day − 2 is closed in every time zone). Each check writes its count and up to 50 sample rows to `analytics_reconciliation` as `tracking_<check>` and sets the `progress.tracking_violations{check}` gauge:

| Check | Rows counted |
|---|---|
| `minutes_over_cap` | user × course × day in the last 3 days with `minutes_engaged` > 600 |
| `units_completed_drift` | `progress` rows written in the last 2 days whose `units_completed` ≠ recount of `COMPLETED` refs in `course_units` |
| `rollup_drift` | user × course where the day − 2 rollup ≠ a recount from raw events (minutes, lessons viewed, units completed; org-local day) |
| `silent_learners` | users with ≥ 3 `lesson_viewed` and zero heartbeats in the last 24 h |

Alerts (`scripts/grafana_alerts.py`, both `warning`, applied 2026-10-06): "Tracking data check failed" (any violation) and "Learner events dropped" (> 20 `course_scoped_anonymous` + `stale` drops in 1 h, any time of day). Not built: the `video_progress.completed` check (PTD2 kept old ✓s, so it would flag legacy rows forever) and heartbeat-vs-wall-clock buckets (`minutes_over_cap` catches the same double counting). Covered by the "Phase 4" test in `progress-tracking.e2e-spec.ts`.

### Phase 5 — classroom pilot
One teacher (Chichester Edgemont), 3–4 students keep a one-week log (lessons, videos, rough minutes). Compare to the dashboard and publish the measured accuracy internally before quoting it to schools.

## 6. Decisions for review

| ID | Question | Recommendation | Status |
|---|---|---|---|
| **PTD1** | Video completion rule (§ 3): 90 % with 10 s end grace, 75 % floor, per-video `video_outro_seconds` | Adopt as written | **Approved 2026-10-04** — implemented (Phase 1) |
| **PTD2** | Recompute existing `video_progress.completed` from ranges with the new rule (one-off SQL on prod; flips some ✓ off) | Yes — run once after deploy, before the next school term report; announce nothing (numbers become stricter only for scrubbed videos) | **Decided 2026-10-04: no recompute.** Existing ✓s and statuses stay exactly as they are; the new rule applies to new viewing only (R18 accepted) |
| **PTD3** | Derive course/parent-unit completion from children (all leaf units ✓ → parent ✓) instead of manual only | Yes, server-side, keep manual override | **Approved 2026-10-04 — implemented:** completing the last child completes each finished ancestor, and all top-level units complete the course (`completeFinishedAncestors`). Only adds ✓s; un-completing a lesson leaves the parent alone; manual changes still work. Applies to new completions — existing rows are not backfilled |
| **PTD4** | Day boundary for teachers: per-org time zone column (default `America/New_York`) used by rollup + "today" | Yes — schools are local; UTC is wrong after 8 pm ET | **Decided 2026-10-04 — implemented (Phase 1b)** |
| **PTD5** | Teacher summary: exclude managers, limit to org-assigned courses; timeline/quiz history limited to org courses | Yes — privacy and accuracy | **Decided 2026-10-04 — implemented (Phase 1b).** Assigned courses show even when hidden from the public catalog; an org with no assigned courses shows an empty progress table |
| **PTD6** | On course reset, also clear `video_progress` for that course (events stay for history) | Yes | **Approved 2026-10-04 — implemented:** course reset also deletes that course's `video_progress`; "reset all" deletes all of the user's. Events and exam history stay |
| **PTD7** | Auto-mark a leaf lesson complete when its video is ✓ (was **MPD1**, recommendation then: manual) | Keep manual; show "watched" beside it. Revisit after the pilot | **Decided 2026-10-04: keep manual** (closes **MPD1**). Revisit after the pilot |

## 7. Change log

| Date | Change |
|---|---|
| 2026-10-05 | Phase 4 (PTA6): four nightly tracking checks, `progress.tracking_violations` gauge, two Grafana warning rules (not applied). 1 new e2e test |
| 2026-10-04 | Decisions: PTD1 ✓, PTD2 no recompute (R18 accepted), PTD3 ✓ implemented, PTD6 ✓ implemented, PTD7 keep manual. 3 new e2e tests (derived completion ×2, reset); backend 101 unit + 80 e2e, frontend 24 — green |
| 2026-10-04 | Phases 1b + 2: PTD4/PTD5 decided and implemented; `teacher-views.e2e-spec.ts` (9), R10 e2e test, Vitest client suite (24); fixes R9–R12, R14, R15, R17, R21. Backend 97 unit + 77 e2e, frontend 24 — all green. Both new e2e specs stop the scheduler (the hourly rollup cron could otherwise race their TRUNCATEs) |
| 2026-10-04 | Plan written. Phase 1: fixes for R1–R8, R20; `progress-tracking.e2e-spec.ts` (14) + `video-completion.spec.ts` (10). All 14 e2e tests were run against the pre-fix code (HEAD `851cf1c`) and each failed for its intended reason; all pass after the fixes. Full suites green (84 unit, 67 e2e). Note: e2e migrations load from `dist/` — run `npm run build` before `test:e2e` after adding a migration |
