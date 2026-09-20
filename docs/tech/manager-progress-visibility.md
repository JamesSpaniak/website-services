# Manager progress visibility — implementation plan

How a teacher (org **manager**) sees what students are doing — watching videos, opening lessons, completing sections — and what it takes to close the gaps. This is the **teacher-facing read path** over the same event source proposed in [`product-analytics.md`](product-analytics.md). Same rows, different purpose: product analytics tunes the money model in aggregate; this doc puts one class, one student, today, in front of the person teaching them.

**Status legend:** ⬜ open · 🔶 partial · ✅ done

Related: [`analytics-implementation-plan.md`](analytics-implementation-plan.md) (the unified build plan — this doc is its teacher-facing slice) · [`product-analytics.md`](product-analytics.md) · [`backend-data.md`](backend-data.md) · [`frontend-data.md`](frontend-data.md) · backlog rows **MP1–MP9** / **MPD1–MPD5** in [`../TODO.md`](../TODO.md)

---

## 1. What a teacher sees today

**Status (2026-09-11): MP1–MP7 and PA12 are built (not yet deployed — TODO PA34).** The table below records the state *before* this wave for context, with the shipped answer in the last column.

| Question a teacher asks | Before | Now (built) |
|-------------------------|-------|-------|
| Which students have started / finished the course? | ✅ Status badge, `units_completed / units_total`, % bar per student, per course; class filter | ✅ unchanged, plus active-this-week and class-hours in the course header |
| Which sections has Maya completed? | 🔶 Data existed but the UI never rendered `detailedProgress` | ✅ **Lesson grid** (unit × student, status glyph + video %, completion date tooltip) under each course |
| What did Maya do this week? | 🔶 Audit log only (login, course started, unit completed, exam) | ✅ **Learning (30d)** timeline from `product_events` (`GET /organizations/:id/members/:userId/timeline`) beside the Account audit log |
| When was Maya last active? | ❌ No column | ✅ `progress.last_activity_at` → **Last active** column (green ≤ 7 d, amber ≤ 14 d, red beyond) |
| Has Maya watched the Unit 3 video? How much? | ❌ Nothing reached the backend | ✅ `video_progress` (union of watched ranges, completed ≥ 90 %) → **Videos** column + per-unit % in the grid |
| How long has the class spent in the course? | ❌ No dwell / heartbeat | ✅ `lesson_heartbeat` → **Time 7d** column, class-time bars on `/manager/overview` (**PA8**) |
| Who is falling behind? | ❌ By eye | ✅ `/manager/overview` **stalled** badge (started, no activity 14 d) + `stalled_member_ids` from `GET /organizations/:id/utilization`; default quietest-first sort still open (**PA38**) |
| Export for a gradebook | 🔶 Class-exam CSV only | ✅ **Export CSV** on `/manager/progress` (`GET /organizations/:id/progress/export.csv?classId=`) |
| Last exam score | ✅ `latest_exam_score` | ✅ plus attempt count, **best**, quizzes passed/attempted, **effort** badge, per-lesson **Q** in the grid, student **Quizzes** tab (first/best/latest + section breakdown) |

SQL for every number above: [`analytics-queries.md`](analytics-queries.md) § 6.

**How completion actually works today** — worth stating because it shapes what "watched vs completed" should mean:

- Opening a unit page fires `PATCH /progress/courses/:id/units/:ref` with `IN_PROGRESS` if it was `NOT_STARTED` (`unit.tsx`).
- `COMPLETED` is a learner action **or** a passed lesson quiz:
  - Visible **Mark complete & continue** at the end of each leaf lesson (**U4**). The kebab `StatusUpdater` remains for reverting status.
  - Passing a `unit` / `sub_unit` exam (≥70) auto-marks that scoped ref `COMPLETED`. Full-course practice/finals do **not**.
- Video reaching 90% still does **not** auto-complete (**MPD1**).
- `ProgressService.updateUnitProgress` writes `unit_statuses[ref]`, promotes course status to `IN_PROGRESS`, recomputes `units_completed`, and audits `UNIT_COMPLETED`. Course-level `COMPLETED` is still a separate kebab on the course page.

So a 0% "Completed" column with many "Viewed" rows is expected until students use the CTA or pass the quiz. Admin lesson funnel **Quiz passed** is the honest finish signal for Part 107.

**Roles:** "teacher" = org `manager`. There is no per-class teacher role; a manager sees the whole org and filters by class. See **MPD5**.

---

## 2. Same source, two purposes

[`product-analytics.md`](product-analytics.md) proposes `product_events` (**PA6**), `progress` timestamps (**PA4**), `lesson_heartbeat` (**PA8**), `v_org_utilization` (**PA10**), and a manager utilization panel (**PA12**). The teacher view needs **exactly those rows** — it just reads them at a different grain, on a different cadence, for a different person.

| | Product analytics | Manager (teacher) view |
|--|-------------------|------------------------|
| **Source rows** | `product_events`, `progress`, `video_progress`, `exam_attempts`, `audit_logs` | **Same tables, no second pipeline** |
| **Grain** | Cohort, org, SKU | One class, one student, one unit |
| **Freshness** | Nightly materialized views | Live — a teacher looks during the class period |
| **Consumer** | Founder, admin, renewal call | Teacher, in front of students |
| **Read path** | `v_*` views refreshed by the daily cron | Indexed queries scoped by `OrgManagerGuard` |
| **Privacy** | Aggregate; never to ad platforms; never marketed to students | Individual student → own teacher only (product-analytics § 10). Normal LMS behavior |
| **Question** | "Is this district going to renew?" | "Who do I talk to before Friday?" |

**Rules that follow:**

1. **One write path.** Learner client → `track()` → `POST /analytics/event` → `product_events` (+ small state tables). `PATCH /progress` remains the source of truth for completion. Nothing in this plan creates a separate telemetry endpoint for the teacher view.
2. **Two read paths.** Teacher queries hit the live tables with org scoping and tight indexes; PA10 views aggregate the same tables nightly. The teacher view must **not** depend on the nightly refresh.
3. **PA12 is a rollup of this.** "Seats engaged in the last 30 days" at org grain is the same query as "students inactive for 7+ days" at class grain. Build the class-grain version first — it is what the teacher acts on — and PA12 becomes a `GROUP BY organization_id`.
4. **The heartbeat number is the renewal number.** PA8's "students spent N hours in the curriculum" is produced by the same rows the teacher sees as "Class 3B: 14.5 h this week." Two views of one column.

---

## 3. Target state

What the `/manager/progress` page should show once this is done:

**Course header (per course, per selected class):** N of M started · avg completion · **hours engaged this week** · **K students inactive 7+ days** (click → filtered list).

**Summary table (per student):** name · status · units x/y + % · **last active** (relative, e.g. "2 d ago") · **time this week** · last exam · **videos watched x/y**.

**Expanded course — the grid (new):** students × top-level units. Cell = section status icon with a **video-watched ring** (0–100%). Hover/click → sections under that unit with `completed_at` and watch %. Uses the already-fetched detailed endpoint.

**Student panel:** activity timeline now includes *lesson viewed*, *video watched 100%*, *time in Unit 3: 22 min*, in addition to the audit rows.

**Export:** CSV of the summary table for the selected class/course.

**States a teacher must be able to distinguish:**

| State | Reading |
|-------|---------|
| Not opened | Never viewed the unit |
| Opened, not watched | `IN_PROGRESS`, video 0% |
| Watched, not marked complete | video ≥ 90%, status still `IN_PROGRESS` — the interesting one |
| Marked complete, video 0% | Declared done without watching — also interesting |
| Completed | Both |

Do **not** collapse these by auto-completing on watch (see **MPD1**). The gap between "watched" and "completed" is information.

---

## 4. Data model

All additive. Migration files go in `backend/migrations/`.

### 4.1 `progress` timestamps — **PA4**, unchanged

`created_at`, `completed_at`, `last_activity_at`. Plus one new column for the teacher grid:

- `unit_completed_at jsonb` — `{ "u3.2": "2026-09-11T14:02:00Z" }`, written next to `unit_statuses` on `COMPLETED`, deleted on revert. Additive; `unit_statuses` shape does not change, so no existing reader breaks.

`last_activity_at` is bumped by every progress write **and** by the product-event handler (throttled to once per minute per row) so a student who watches without clicking anything still reads as active.

### 4.2 `product_events` — **PA6**, two additions

Columns as specified in product-analytics § 4.2. For the teacher read path add:

- **Stamp `organization_id` server-side at write time** from `organization_members`, not at query time. Org-scoped queries then need no join and stay correct if a student is later removed from the org.
- Index `(organization_id, occurred_at)` alongside the two already proposed.

Retention: the teacher view needs one school year of raw events; product-analytics proposes pruning at 12–18 months (**PD3**). Compatible — set the floor at 15 months so a September cohort is intact through the following summer.

### 4.3 `video_progress` — new, small state table

| Column | Type | Notes |
|--------|------|-------|
| `user_id`, `course_id`, `unit_ref` | PK | one row per learner per video |
| `position_seconds` | int | last playhead — the learner's resume point |
| `max_position_seconds` | int | furthest point reached |
| `watched_ranges` | jsonb | merged `[[start, end], …]` actually played — immune to scrubbing |
| `duration_seconds` | int | from `loadedmetadata` |
| `percent_watched` | smallint | union of `watched_ranges` / duration, capped 100 — **not** max position |
| `completed` | bool | `percent_watched ≥ 90` (threshold constant, not a column) |
| `first_played_at`, `last_played_at` | timestamptz | |

Why a state table when events exist: "has Maya watched the Unit 3 video?" is a current-state lookup. Scanning events per cell of a 30 × 12 grid is the wrong shape. This is the same `progress` (state) + `audit_logs` (history) pattern already in the codebase. Upserted by the same handler that inserts the event — one write, two rows. The same row gives the learner "Resume from 12:40" (plan § 4.5). Ranges rather than max position is what lets a teacher trust "watched 92 %" — a student who scrubs to the end shows ~0 %.

---

## 5. Write path

### 5.1 Client

Auth is HttpOnly cookies (`api-client.tsx` L40), so `navigator.sendBeacon` to same-origin `/api/analytics/event` already carries identity. No token plumbing needed.

| Event | Fired from | When | Payload |
|-------|-----------|------|---------|
| `lesson_viewed` | `unit.tsx` (alongside the existing `IN_PROGRESS` write) | Unit page mount / focused section change | `courseId`, `unitRef` |
| `lesson_heartbeat` (**PA8**) | new `useLessonHeartbeat(courseId, unitRef)` hook in `unit.tsx` | Every 30 s while `document.visibilityState === 'visible'`; stop on hidden | `courseId`, `unitRef`, `sessionId` |
| `video_started` | `video.tsx` `<video onPlay>` (first play only) | | `courseId`, `unitRef`, `duration` |
| `video_progress` | `video.tsx` milestones 25/50/75 only; continuous position rides on the 30 s `lesson_heartbeat` as `{ video_position, video_duration, video_playing }` (plan § 4.3 — halves row volume vs. 10 s pings) | | `position`, `duration` |
| `video_completed` | `onEnded`, or `position/duration ≥ 0.9` once | | `position`, `duration` |
| `video_position` | `onPause`, `visibilitychange → hidden`, `pagehide` via `sendBeacon` | Final position flush | `position`, `duration` |
| `lesson_completed` / `unit_completed` | server-side from `ProgressService.updateUnitProgress` — **not** the client | On `COMPLETED` | mirrors the audit row |

Implementation: `video.tsx` gains optional `onProgress`/`onEnded`-style callbacks (both the `HlsPlayer` branch and the plain `<video>` branch — one shared handler set). `course-unit-video.tsx` owns the wiring to `track()` because it already knows `courseId` and `unitId`. Add typed helpers to `lib/analytics.ts` behind the single `track()` abstraction (**T11 / PA7**); do not scatter `sendBeacon` calls.

**Embedded YouTube / Vimeo** (`<iframe>` branch): no `timeupdate` without the IFrame Player API / Vimeo SDK. Paid course media is self-hosted HLS, so instrument `<video>` first and treat embeds as `video_started`-only until **MPD2** is decided.

Rate budget: events are buffered client-side and flushed as one batch every 30 s (and on `pagehide`), so ≈ 2 req/min/user. **The existing `ThrottlerGuard` is keyed by IP** — a class of 30 behind one school NAT already exceeds 30 req/min on ordinary page loads; it must be keyed by user id before this ships (**PA32**, plan § 12.2).

### 5.2 Server

`POST /analytics/event` (`backend/src/analytics/analytics.controller.ts`):

1. Add `@UseGuards(OptionalJwtAuthGuard)` — already exists for `course.controller.ts` — so `req.user` is populated when a cookie is present and anonymous page views still work.
2. Replace the loose DTO with a discriminated one: `event` as an enum covering page/marketing events **and** the learning group; `courseId?`, `unitRef?`, `position?`, `duration?`, `sessionId?`, `eventId?` with `ValidationPipe({ whitelist: true })`. This also closes **T1** (`exam_start` / `exam_submit` silently dropped) and is a prerequisite for **T4** hardening.
3. Route by group: page/article/course views → existing OTel counters (unchanged); learning events → new `ProductEventsService.record()` in `backend/src/product-events/`:
   - resolve `organization_id` from membership,
   - `INSERT product_events`,
   - for `video_*`: upsert `video_progress`,
   - for any learning event: bump `progress.last_activity_at` (throttled; create the `progress` row with `IN_PROGRESS` if absent, matching what the unit page would do),
   - ignore events for a course the user has no access to (`CourseService.hasAccess`) — cheap guard against spoofed refs.

`ProgressService.updateUnitProgress`: also write `unit_completed_at[ref]` and emit `unit_completed` into `product_events` next to the existing `UNIT_COMPLETED` audit call.

---

## 6. Read path — manager API

All under `@UseGuards(JwtAuthGuard, OrgManagerGuard)`, all accept `?classId=`.

| Endpoint | Change | Returns |
|----------|--------|---------|
| `GET /organizations/:id/progress` | **extend** `MemberCourseProgressSummary` | `+ last_activity_at`, `+ completed_at`, `+ minutes_engaged_7d`, `+ videos_completed`, `+ videos_total` |
| `GET /organizations/:id/progress/:courseId` | **extend** the unit overlay | per unit: `+ completed_at`, `+ video: { percent_watched, completed } \| null` |
| `GET /organizations/:id/engagement?days=7` | **new** | per member: `minutes_engaged`, `lessons_viewed`, `videos_completed`, `last_seen_at`, `inactive: boolean` — the teacher's "who do I talk to" list; also the query PA12 rolls up |
| `GET /organizations/:id/progress/export.csv?courseId=` | **new** | summary rows as CSV; emit `org_progress_exported` (product-analytics § 5, B2B group) |
| `GET /audit/users/:userId` | unchanged | Consider a follow-up `GET /organizations/:id/members/:userId/timeline` merging audit rows with `lesson_viewed` / `video_completed` / heartbeat-derived "22 min in Unit 3"; not required for v1 |

Query notes: `minutes_engaged` = `count(lesson_heartbeat) × 0.5` over the window, per user — read straight from `product_events` on the `(organization_id, occurred_at)` index. `videos_total` = count of units in `course_units` with a `video_url`, precomputed once per request like `courseUnitCounts` already is in `getOrgProgressSummary`. Continue the existing discipline of never loading the course JSON payload in the summary path.

Emit `manager_dashboard_viewed` from the manager shell on load — product-analytics § 7 calls "manager dashboard never opened" the highest-priority B2B churn signal, and it costs one line.

---

## 7. Frontend (`drone/src/app/manager/progress/page.tsx`)

| # | Change | Depends on |
|---|--------|-----------|
| F1 | Render the grid from `detailedProgress` instead of re-showing the summary table when a course is expanded. Students × top-level units; cell = `StatusIcon`; click → sections under that unit | nothing — endpoint exists |
| F2 | Add **Last active** column (relative time) and default-sort by it ascending so the quietest students float up | § 4.1 |
| F3 | Add **Time (7d)** and **Videos** columns; video-watched ring in grid cells | § 4.3, § 6 |
| F4 | Course header: hours engaged this week · inactive count, click → filter | § 6 engagement |
| F5 | Student panel: timeline gains lesson/video entries; add `LESSON_VIEWED` / `VIDEO_COMPLETED` to `ACTION_LABELS` tone map (`lib/status-tones.ts`) | § 6 timeline or client-side merge |
| F6 | **Export CSV** button (reuse the pattern from `/manager/exams`) | § 6 export |
| F7 | Learner side: **U3** overall progress bar still open. **U4** "Mark complete & continue" shipped Sep 15 2026 (plus exam-pass auto-complete for scoped quizzes) | — |

Types live in `lib/types/organization.ts`; API functions in `lib/api-client.tsx` next to `getOrgProgress`. Match the existing table markup and theme tokens.

---

## 8. Sequencing — interleaved with the PA phases

Ordered so each step ships teacher value on its own and nothing is built twice.

| Step | Work | Backlog | Est. | Teacher gets |
|------|------|---------|------|--------------|
| **0** | F1 — render the existing detailed endpoint as a grid | **MP1** | ½ day | Section-level view per student, today |
| **1** | PA4 timestamps + `unit_completed_at`; extend summary DTO; F2 | **PA4**, **MP2** | 1 day | Last-active column, sort by quiet students |
| **2** | PA6 `product_events` + `OptionalJwtAuthGuard` + typed DTO on `/analytics/event`; `ProductEventsService`; `video_progress` table; client `video_*` + `lesson_viewed` + heartbeat (PA8) | **PA6**, **PA8**, **MP3**, **MP4**, **T1** | 3 days | Data starts accumulating; nothing visible yet |
| **3** | Engagement endpoint; F3, F4 | **MP5** | 1½ days | Watch %, time this week, inactive list |
| **4** | F5 timeline entries; F6 CSV export; `manager_dashboard_viewed` | **MP6**, **MP7** | 1 day | Richer per-student story; gradebook export |
| **5** | **PA12** org utilization panel = `GROUP BY` over step 3's query; **PA10** `v_org_utilization` reads the same tables | **PA12**, **PA10** | ½ day for PA12 | Manager-level seat utilization (the contractual number) |
| later | Embed player instrumentation (MPD2); per-class teacher role (MPD5); merged timeline endpoint | **MP8**, **MP9** | — | — |

Step 0 needs no schema change and should ship before anything else — the data is already being fetched and thrown away.

---

## 9. Decisions to make

| # | Question | Recommendation |
|---|----------|----------------|
| **MPD1** | Auto-mark a section `COMPLETED` when the video reaches 90%? | **No, for v1.** Keep video completion a learner action (+ U4 CTA) and show watch % beside it. Passing a **scoped lesson quiz (≥70)** does auto-complete that unit — quizzes are a finish signal; watch % is not. Full-course exams stay independent. |
| **MPD2** | Instrument YouTube / Vimeo embeds via their player SDKs? | **Closed 2026-09-12 — nothing needed.** All video in the three live courses is self-hosted on `media.thedroneedge.com` (0 YouTube/Vimeo URLs in the course payloads); the HLS player already reports `video_started/progress/completed`. Reopen only if an embed is ever added to a paid course. |
| **MPD3** | "Inactive" threshold for the teacher list | **Decided 2026-09-12: 7 days** for the teacher view ("Active this week"). Distinct from **PD7**'s contractual "active seat" (**30 days**, "Active seats (30d)"). Same query, two constants — do not let the contract wording drive the classroom UI. |
| **MPD4** | How to present heartbeat minutes (**PD4** overlap) | Show to teachers rounded to 5 min, labeled "time in course", and never as a precise figure. Tab-open-but-idle inflates it; visibility gating limits but does not remove that. |
| **MPD5** | Per-class teacher role | Today a manager sees the whole org. A district with several teachers needs a manager scoped to a class (`organization_members.role = 'teacher'` + `classId`, or a `class_teachers` join). Not needed for the first pilot; needed before the second school with more than one teacher. |

---

## 10. Privacy — what changes and what does not

Product-analytics § 10 already sets the rules. This plan stays inside them:

- Everything here is visible only to the student's own org manager via `OrgManagerGuard`, or to an admin. Nothing is exported to ad platforms; the authenticated learning experience stays pixel-free.
- Watch position and heartbeats are **education records**. They live in `product_events` / `video_progress` under the same retention commitment as the rest (**PD2**, **PD3**) and must be covered by the DPA packet and deletion path.
- CSV export is a disclosure to the teacher of data the teacher can already see on screen; log it (`org_progress_exported`), and keep emails and any contact data out of it — names, class, and progress only.
- No session replay, ever, on org accounts. Heartbeats are a count, not a recording.
- Update `drone/src/app/privacy/page.tsx` when video-watch tracking ships, per [`legal-and-privacy-site-sync.md`](legal-and-privacy-site-sync.md).

---

## 11. Acceptance

- A manager expands a course and sees a students × units grid with per-section status, without any additional network request beyond the existing detailed call.
- A student who plays 95% of a unit video and closes the tab produces: a `video_progress` row with `percent_watched ≥ 90`, `completed = true`; a `video_completed` event with `organization_id` set; `progress.last_activity_at` within the last minute — and the unit's status is **still `IN_PROGRESS`** unless they marked it complete (MPD1).
- Summary table sorts by last active; a student with no activity for 8 days appears in the inactive count with the default threshold.
- `GET /organizations/:id/engagement` for org A never returns a member of org B; a `member`-role caller gets 403.
- An anonymous `page_view` to `/analytics/event` still increments the OTel counter; an anonymous `video_progress` is dropped without error.
- `PA12`'s org utilization is computed from the same `engagement` query with a different window and grouping — no second definition of "active".

---

## Keeping this doc current

When steps in § 8 ship: flip the status markers here, update [`backend-data.md`](backend-data.md) (endpoints, entities) and [`frontend-data.md`](frontend-data.md) (`/manager/progress` row), refresh [`../sales/features.md`](../sales/features.md) § Manager dashboard only for what is actually live, and move the **MP** rows from [`../TODO.md`](../TODO.md) to [`../TODO_COMPLETED.md`](../TODO_COMPLETED.md).
