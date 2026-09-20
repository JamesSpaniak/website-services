# Product analytics + progress visibility — implementation plan

The single build plan for **company visibility** (what each user bought, how they got access, what they used, what to offer next) and **teacher visibility** (what each student in a class did this week). One data model, one write path, three read surfaces.

Design rationale lives in [`product-analytics.md`](product-analytics.md) (why Postgres, why not Grafana, signal→offer map, privacy) and [`manager-progress-visibility.md`](manager-progress-visibility.md) (what a teacher sees today and needs). This document is the **how**: schema, endpoints, screens, sequencing, backfill, acceptance. Where this plan refines the design docs (notably `entitlements` and an early minimal `products` table), this plan wins and the design docs point here.

**Status legend:** ⬜ open · 🔶 partial · ✅ done · Backlog IDs: **PA**, **MP**, **MPD**, **PD** in [`../TODO.md`](../TODO.md)

---

## 1. The problem in one table

| Question | Who asks | Answerable today? | Blocker |
|----------|----------|-------------------|---------|
| Bought Part 107 three weeks ago, zero units done — refund risk? | Company | No | No amount stored; `progress` has no `created_at` |
| Which of my students watched the Unit 3 video? | Teacher | No | No video telemetry |
| Who in Class 3B has not logged in for a week? | Teacher | No | No `last_activity_at` |
| District bought 120 seats; how many are actually used? | Company + manager | No | No seat order record; "active" undefined |
| Bundle buyers vs single-course buyers — who completes more? | Company | No | No bundle SKU, no entitlement provenance beyond `source` |
| Pro subscriber, no login in 45 days — offer pause? | Company | No | Pro renewals invisible (`invoice.paid` unhandled) |
| User has Pro **and** bought the course — which SKU gets credit for the usage? | Company | Undefined | No attribution rule |
| Hours the class spent in the curriculum this semester | Teacher + sales | No | No heartbeat |

Every row is a join between **a person, an entitlement, and usage**. Today the three legs are: usage = `progress` (state, no time) + `audit_logs` (sparse); entitlement = `user_courses_purchased.source` + `users.role` + org membership; money = nothing local.

---

## 2. Entitlements — many packages, one course

This is the part the current design does not cover and the part most likely to be modeled wrong.

### 2.1 How access is granted today

| Path | Grants | Recorded as | Amount recorded |
|------|--------|-------------|-----------------|
| Single course, Stripe PaymentIntent | One course, lifetime | `user_courses_purchased` `source='purchase'`, `granted_at` | **No** — only in Stripe |
| Admin gift | One course | `source='admin_grant'`, `granted_by_user_id` | $0 |
| Signup / promo link | N courses on the link | `source='signup_link'`, `signup_link_id` | $0 |
| Pro subscription | **All** courses while active | `users.role='pro'`, `pro_membership_expires_at`, `stripe_subscription_id` | **No** |
| Org seat | All courses attached to the org | `organization_members` × `organization_courses` — derived, no row | Off-platform quote |
| Free preview | Unit(s) flagged `free_preview` | Nothing per user | — |
| **Bundle (T16)** — planned | Three courses, lifetime | **Nothing exists** | — |
| **School packages** (Pilot / Classroom / Program) — quoted | Seats + term | Manual org setup, `max_students` | **No** |

`CourseService.hasAccess` (`backend/src/courses/course.service.ts` L40–72) checks these in order: admin → active Pro → purchased row → org. It answers *yes/no*; it does not say *which one*, and it does not know about bundles or school packages because those are not things in the database.

### 2.2 The model: `products` → `orders` / `order_items` → `entitlements` → usage

```
products            what we sell (SKU) and what it grants
   │
orders / order_items   what was actually paid, per line, at the time
   │
entitlements        who can access which course, from which line, from when to when
   │
progress / product_events / video_progress / exam_attempt_history   what they did
```

**One paying line can grant many entitlements** (a bundle → three rows). **One user can hold many entitlements to one course** (own purchase + Pro + org seat). **Revenue lives on the line, never on the entitlement**, so nothing double-counts.

### 2.3 Attribution rule for overlapping entitlements

Usage of a course by a user is counted **once**. When several entitlements to that course are active at the time of activity, the **primary** is chosen by:

1. Most specific paid: `purchase` / `bundle` (paid for *this* course, lifetime)
2. `pro` (paid, all courses, time-bound)
3. `org_seat` (paid by the org)
4. Free: `admin_grant`, `signup_link`, `trial`
5. Tie → earliest `starts_at`

This is a **reporting** rule (`v_entitlement_utilization.primary_source`); it does not change `hasAccess`. Two consequences worth stating:

- **Org utilization is about members, not attribution.** A student who bought the course herself and also holds an org seat counts as an active seat for the school. The school paid for a seat that is being used; whose money is "credited" is a company question, not the school's.
- **Pro is evaluated per activity, not per user.** A user who bought Part 107, then went Pro, then used the Video course: Part 107 usage attributes to the purchase, Video usage to Pro.

### 2.4 Bundle price allocation

A bundle line has one `unit_price_cents`. Each entitlement it grants stores `allocated_price_cents` = line price × (that course's standalone `courses.price` ÷ sum of standalone prices of the bundled courses), computed **at grant time** and never recomputed. Per-course revenue reports read `allocated_price_cents`; order-level revenue reads the line. Same rule for a signup link that grants several courses at $0 — allocation is zero, the shape is identical.

### 2.5 Pro as an entitlement

One `entitlements` row per subscription with `course_id NULL` (= all courses), `starts_at` = first period start, `ends_at` = `current_period_end`, **extended on every `invoice.paid`**, `revoked_at` set on `customer.subscription.deleted` or the midnight expiry cron. Each paid invoice is its own `orders` row (`product_type = pro_monthly | pro_yearly`) so MRR and renewal count are real. New courses added later are automatically covered — nothing to fan out.

### 2.6 Org seats stay derived

Org access is **not** materialized into `entitlements`. Reasons: attaching a course to an org would fan out a write per member; removing a member or course would need cascading revokes; and the org's own view is already membership-based. `v_user_entitlements` unions a derived `org_seat` row per (member, org course) with `organization_id` set and `order_item_id` pointing at the org's most recent active seat line if one exists. Seat **orders** (PO-paid) are real rows in `orders` with `organization_id`, `product_type = 'seats'`, `quantity = seats`.

### 2.7 Migration path for `hasAccess`

| Phase | `hasAccess` reads | `entitlements` |
|-------|-------------------|----------------|
| 1 | Unchanged (`user_courses_purchased`, `users`, org) | Created, **backfilled**, dual-written by every grant path |
| 1→3 | Unchanged | Nightly reconciliation query: users×courses where `hasAccess` and `entitlements` disagree must be **0** for 14 days |
| 3 | `entitlements` (one indexed query) + org path | Source of truth |
| later | — | `user_courses_purchased` becomes write-through compatibility or is dropped; `users.pro_membership_expires_at` kept as a cache |

The switch is a one-line service change gated on the reconciliation count. Do not switch before the count is clean.

**Built (2026-09-12):** the switch is the env flag `ENTITLEMENTS_AUTHORITATIVE=true` (`CourseService.hasAccess` → `EntitlementService.hasLiveAccess` + org path; unset to roll back). The gate is the `access_diff` reconciliation check — a full outer join of the legacy rule and the ledger rule per user × course — which was **0 on a scrubbed clone of production** (`scripts/prod-db-clone.sh`, 13 users, 1 grant, 2 orgs), so the flip is safe for existing data; the 14 nights now only validate the *write* paths (new purchases, Pro webhooks, grants, refunds). Nothing is dropped: `user_courses_purchased` keeps being written by `purchaseCourse` and read by the admin users page, profile "my courses", signup links and `ProductEventsService.resolveContext`, so "drop" is a later, separate migration once those readers move to `entitlements` (§ 2.7 "later").

---

## 3. Data model

All migrations additive, in `backend/src/migrations/` (per `backend/AGENTS.md`), run on boot. Amounts are integer cents. Timestamps are `timestamptz`.

### 3.1 `products` — minimal catalog (Phase 1, not Phase 5)

The design doc defers the full catalog (variants, BOM) to the store phase. A **minimal** version is needed now because the webhook must know what a Stripe price grants, and the bundle SKU (**T16**) cannot exist without it.

| Column | Type | Notes |
|--------|------|-------|
| `sku` | text PK | `COURSE_107`, `BUNDLE_3`, `PRO_MONTHLY`, `PRO_YEARLY`, `SEATS_CLASSROOM`, … |
| `name` | text | |
| `product_type` | enum | `course` · `bundle` · `pro_monthly` · `pro_yearly` · `seats` · `kit` · `part` · `merch` · `service` · `protection_plan` |
| `grants` | jsonb | `{"course_ids":[1]}` · `{"course_ids":[1,2,3]}` · `{"all_courses":true}` · `{"seats":true}` · `{}` |
| `stripe_price_id` | text nullable, unique | Lookup key from the webhook |
| `list_price_cents` | int | Catalog price; **not** used for revenue |
| `related_course_id` | int nullable | Hardware ↔ learning link (design § 9.4) |
| `requires_shipping` | bool default false | |
| `active` | bool | |
| `created_at`, `updated_at` | | |

Seed: one row per course (from `courses.price`), Pro monthly/yearly from the env price ids, the three school packages, the bundle once **D10** picks a price. Variants / components / COGS columns arrive with **PA16 / PA24**; nothing here has to change for them.

### 3.2 `orders` and `order_items`

As specified in the design doc § 4.1. Restated for completeness:

**`orders`**: `id`, `user_id` nullable (PO orders may pre-date the buyer's account), `organization_id` nullable, `stripe_payment_intent_id` nullable unique, `stripe_invoice_id` nullable unique, `stripe_checkout_session_id` nullable, `stripe_customer_id`, `stripe_event_id` unique (idempotency), `payment_method` (`card` · `invoice` · `po` · `comp`), `subtotal_cents`, `discount_cents`, `shipping_cents`, `tax_cents`, `total_cents`, `currency`, `payment_status` (`succeeded` · `refunded` · `partially_refunded` · `failed`), `fulfillment_status` (`not_applicable` · `unfulfilled` · `shipped` · `delivered` · `returned`), `placed_at`, `notes`, `created_by_user_id` nullable (manual orders), `created_at`.

**`order_items`**: `id`, `order_id`, `sku` → products, `product_type` (copied), `course_id` nullable, `quantity`, `unit_price_cents`, `unit_cost_cents` default 0, `discount_cents`, `refunded_amount_cents`, `fulfillment_source` (`digital` · `we_ship` · `dropship` · `customer_sourced`), `placement` nullable (which offer surface sold it — design § 5), `offer_id` nullable.

Indexes: `orders(user_id, placed_at)`, `orders(organization_id)`, `order_items(order_id)`, `order_items(sku)`.

### 3.3 `entitlements`

| Column | Type | Notes |
|--------|------|-------|
| `id` | bigserial PK | |
| `user_id` | int FK | |
| `course_id` | int FK **nullable** | `NULL` = all courses (Pro) |
| `source` | enum | `purchase` · `bundle` · `pro` · `admin_grant` · `signup_link` · `trial` |
| `product_sku` | text nullable | |
| `order_item_id` | bigint nullable FK | The paying line, if any |
| `allocated_price_cents` | int default 0 | § 2.4 |
| `signup_link_id`, `granted_by_user_id` | nullable | Carried over from `user_courses_purchased` |
| `stripe_subscription_id` | text nullable | Pro rows |
| `starts_at` | timestamptz | |
| `ends_at` | timestamptz nullable | Pro: current period end; lifetime: null |
| `revoked_at` | timestamptz nullable | |
| `revoke_reason` | text nullable | `refund` · `cancelled` · `expired` · `admin` |
| `created_at` | | |

Indexes: `(user_id, course_id)`, `(order_item_id)`, `(source, starts_at)`. Active predicate used everywhere: `revoked_at IS NULL AND (ends_at IS NULL OR ends_at > now())`.

**Backfill** (one migration, idempotent): `user_courses_purchased` → one row each, `source` preserved (`purchase` rows whose `granted_at` matches a backfilled order get `order_item_id` + `allocated_price_cents`; otherwise `allocated_price_cents` = the course's price at backfill with `notes` marking it estimated — see **PD1**); `users` where `role='pro'` → one `pro` row with `ends_at = pro_membership_expires_at`.

**Dual-write points** (Phase 1): `PurchaseService.purchaseCourse`, `UserService.grantCourseAccess` / revoke, `SignupLinkService.consume`, `PurchaseService.fulfillProCheckoutSession` / `syncProFromSubscription` / `clearProMembership`, `handleExpiredProMemberships` cron.

### 3.4 `progress` — timestamps (**PA4**)

Add `created_at` (default now; backfilled from earliest `COURSE_STARTED` audit row or `updated_at`), `completed_at` (backfilled from `COURSE_COMPLETED` audit), `last_activity_at`, and `unit_completed_at jsonb` (`{"u3.2": "…"}`) beside `unit_statuses`. `last_activity_at` is bumped by every progress write and, throttled to once per minute per row, by the product-event handler.

### 3.5 `product_events` (**PA6**)

| Column | Type | Notes |
|--------|------|-------|
| `id` | bigserial | |
| `user_id` | int nullable | Anonymous allowed for pre-auth funnel events |
| `anonymous_id`, `session_id` | text nullable | |
| `organization_id` | int nullable | **Stamped at write** from membership |
| `event_name` | text | Taxonomy in design § 5 |
| `occurred_at` | timestamptz | Client time clamped to ±5 min of server time |
| `course_id` | int nullable | |
| `unit_ref` | text nullable | |
| `entitlement_source` | text nullable | Primary source at the time (§ 2.3), resolved server-side for learning events |
| `class_id` | int nullable | **Stamped at write** — the per-class teacher role (**MP9**) needs it; back-filling later is a fan-out |
| `properties` | jsonb | `position`, `duration`, `offer_id`, `placement`, `feature`, … |
| `source` | text | `web` · `server` — app-level enum, not a PG enum (see § 12.5) |
| `event_id` | uuid nullable, unique | Client idempotency; shared with pixel events (**T10**) |

**Partitioned by month from day one** (`PARTITION BY RANGE (occurred_at)`); the midnight cron creates partitions two months ahead. Indexes per partition: `(user_id, occurred_at)`, `(organization_id, occurred_at)`, `(event_name, occurred_at)`. Drop the `(course_id, unit_ref, …)` index from the design — the funnel reads rollups instead.

**`product_events_daily`** — the rollup, built from day one, not at month 12: `(user_id, course_id, day)` PK, `organization_id`, `class_id`, `entitlement_source`, `minutes_engaged`, `lessons_viewed`, `videos_completed`, `units_completed`, `exams_submitted`, `events`. Computed incrementally for *yesterday* by the cron; the views and the manager's engagement query read rollups + today's live partition. ~600k rows/yr at 1,000 users. Kept indefinitely (it is the "+12-month counter").

Retention: raw partitions older than 12 months are exported to S3 and dropped (§ 12.4, **PA31**, **PD23**).

Writing `entitlement_source` at event time is what makes "kit owners vs. not" and "bundle vs. single" cohorts cheap later; resolving it retroactively against time-bounded Pro rows is possible but slow.

### 3.6 `video_progress`

| Column | Type | Notes |
|--------|------|-------|
| `user_id`, `course_id`, `unit_ref` | PK | one row per learner per video |
| `position_seconds` | int | **Last known playhead** — the resume point (§ 4.5) |
| `max_position_seconds` | int | Furthest point reached |
| `watched_ranges` | jsonb | Merged `[[start, end], …]` in seconds — what was *actually played*, immune to scrubbing |
| `duration_seconds` | int | From `loadedmetadata` |
| `percent_watched` | smallint | `sum(range lengths) / duration`, capped 100 — **not** `max_position / duration` |
| `completed` | bool | `percent_watched ≥ 90` (threshold is a constant, not a column) |
| `play_count` | smallint | Sessions with a `video_started` |
| `first_played_at`, `last_played_at`, `updated_at` | timestamptz | |

Upserted by the same handler that inserts `video_*` events and heartbeats carrying video state. Rationale for a state table: [`manager-progress-visibility.md`](manager-progress-visibility.md) § 4.3. The teacher reads `percent_watched`; the learner reads `position_seconds`.

### 3.7 `exam_attempt_history` (**PA9**)

Append-only: `id`, `user_id`, `exam_id`, `course_id`, `scope`, `scope_ref`, `attempt_no`, `score`, `section_breakdown jsonb`, `started_at`, `submitted_at`. `ExamAttemptService` inserts here on every submission **and** continues to upsert `exam_attempts` (latest) so nothing downstream changes. Also write the `EXAM_SUBMITTED` audit row (**T2**).

### 3.8 Audit rows that are missing (**PA5**)

`EXAM_SUBMITTED`, `PRO_CANCELLED` (subscription deleted), `PRO_EXPIRED` (cron), `ORDER_REFUNDED`, `ENTITLEMENT_REVOKED`. `audit_logs` stays the compliance log; `product_events` is the behavior stream. Both are written for state changes; only `product_events` gets high-volume behavior.

### 3.9 Materialized views (**PA10**), refreshed by the midnight cron after Pro expiry

| View | Grain | Key columns |
|------|-------|-------------|
| `v_user_entitlements` | user × course × entitlement | `entitlements` expanded (Pro `NULL` → every non-hidden course) **UNION** derived `org_seat` rows; `active`, `source`, `order_item_id`, `allocated_price_cents` |
| `v_user_course_usage` | user × course | `started_at`, `completed_at`, `last_activity_at`, `units_completed`, `units_total`, `pct_complete`, `videos_completed`, `videos_total`, `minutes_engaged`, `exams_taken`, `best_score`, `latest_score`, `days_to_first_unit`, `days_to_complete` |
| `v_entitlement_utilization` | user × course | Join of the two; `primary_source` per § 2.3; `all_sources text[]`; `activated` (Unit 1 within 7 d of first entitlement); `stalled` (entitled ≥ 7 d, no activity) |
| `v_user_revenue` | user | `gross_cents`, `refunded_cents`, `net_cents`, `cogs_cents`, `contribution_cents`, `active_mrr_cents`, `first_order_at`, `last_order_at`, `digital_cents`, `hardware_cents`, `product_mix text[]` |
| `v_org_utilization` | organization | `seats_purchased` (`max_students`), `seats_ordered` (sum of seat lines), `invites_sent`, `invites_redeemed`, `members`, `members_activated`, `members_engaged_7d`, `members_engaged_30d`, `avg_pct_complete`, `hours_engaged_total`, `manager_last_seen_at` |
| `v_course_funnel` | course × unit_ref | `entitled`, `viewed`, `completed`, `video_completed`, `median_minutes` — the drop-off chart |
| `v_cohort_retention` | cohort month × primary_source | `entitled`, `activated`, `completed`, `second_purchase`, `refunded` |
| `v_sku_performance`, `v_course_hardware_attach` | sku / course | Phase 5, unchanged from design § 6 |

`REFRESH MATERIALIZED VIEW CONCURRENTLY` on each (needs a unique index per view). If the reader endpoint (**PD6**) is set up, the refresh job and all `/reporting/*` reads use it.

---

## 4. Write path

### 4.1 Stripe webhook (`PurchaseService.handleWebhookEvent`)

Every branch is wrapped in one transaction and keyed on `stripe_event_id` — a redelivered event is a no-op.

| Event | Today | Adds |
|-------|-------|------|
| `payment_intent.succeeded` (`productType=course`) | grants course | `orders` + `order_items(sku=COURSE_x)`; `entitlements(purchase)`; `product_events purchase_completed` |
| `payment_intent.succeeded` (`productType=bundle`) — **new** | — | one order line `BUNDLE_3`; three `entitlements(bundle)` with allocated prices; grants each course (`user_courses_purchased` dual-write) |
| `checkout.session.completed` (`mode=subscription`) | Pro on | `orders` (first invoice) ; `entitlements(pro, course_id NULL)`; `pro_started` |
| `invoice.paid` — **new** | unhandled | `orders(product_type=pro_*)`, extend `entitlements.ends_at`, `pro_renewed` |
| `invoice.payment_failed` — **new** | unhandled | `product_events pro_payment_failed`; no access change (Stripe retries) |
| `customer.subscription.updated` | sync | also update `ends_at`, `cancel_at_period_end` → `pro_cancel_scheduled` |
| `customer.subscription.deleted` | Pro off | `revoked_at`, `revoke_reason=cancelled`, audit `PRO_CANCELLED`, `pro_cancelled` |
| `charge.refunded` — **new** | unhandled | `orders.payment_status`, `order_items.refunded_amount_cents`; **full** refund revokes that line's entitlements (`refund`) and removes `user_courses_purchased` rows; partial does not (**PD18**); audit `ORDER_REFUNDED`; `refund_issued` |

Course PaymentIntents currently carry `userId`, `courseId`, `productType`; add `sku` so the webhook resolves the product without guessing. Pro Checkout already carries the price id via the subscription; look up `products.stripe_price_id`.

### 4.2 Manual / PO orders (admin)

`POST /orders/manual` (Admin): `{ organization_id?, user_id?, payment_method: 'po'|'invoice'|'comp', items: [{ sku, quantity, unit_price_cents, course_id? }], placed_at, notes }`. For `seats` lines: records the seat purchase; **does not** change `max_students` (ops sets that when provisioning) — `v_org_utilization` shows both and a mismatch is a reconciliation flag. For `course` lines with `payment_method='comp'`: grants the course as `admin_grant` with `order_item_id` set, so comps are visible in revenue reports at $0 instead of invisible.

### 4.3 Learner events — `POST /analytics/event`

Today: untyped DTO, no auth, three page-view counters to OTel. Becomes:

- `@UseGuards(OptionalJwtAuthGuard)`; cookies carry identity, `sendBeacon` needs nothing extra.
- **Batch body**: `{ events: AnalyticsEventDto[] }` (max 50). The client buffers and flushes every 30 s and on `pagehide` via `sendBeacon`. Single-event bodies stay accepted for the marketing helpers.
- Discriminated DTO (`whitelist: true`): `event` enum over the full taxonomy; `courseId?`, `unitRef?`, `position?`, `duration?`, `sessionId?`, `eventId?`, `offerId?`, `placement?`, `feature?`, `path?`, `referrer?`, `contentId?`, `title?`.
- **Throttling**: keyed by **user id when authenticated**, IP only for anonymous (custom `ThrottlerGuard.getTracker`) — the default per-IP tracker breaks a classroom behind one NAT (§ 12.2). `/analytics/event` gets its own limit (e.g. 20 batches/min/user).
- Router: marketing group → OTel counters (unchanged) **and** `product_events` when a user is present; learning / assessment / commerce / money-model / B2B / feature groups → `ProductEventsService.record()` which inserts the batch in one statement, stamps `organization_id`, `class_id` and `entitlement_source`, upserts `video_progress` for `video_*`, bumps `progress.last_activity_at`, and **drops** learning events for courses the user cannot access (spoof guard, also covers **T4**).
- **Per-request context cache**: `(user_id, course_id) → { organization_id, class_id, entitlement_source, has_access }` cached in-process for 5 min so a batch costs ~1 query, not 5 per event.
- Anonymous learning events are dropped silently; anonymous marketing events are kept with `anonymous_id`.
- **Video pings ride the heartbeat**: the 30 s `lesson_heartbeat` carries `{ video_position, video_duration, video_playing }` when a player is mounted. Separate `video_*` rows are only the discrete milestones (`started`, 25/50/75, `completed`, final `position` on pause/hide). Halves row volume versus independent 10 s pings.

Client: all through one `track(event, props)` in `drone/src/app/lib/analytics.ts` (**T11 / PA7**). Learning instrumentation (video callbacks in `video.tsx`, wiring in `course-unit-video.tsx`, `useLessonHeartbeat` in `unit.tsx`) is specified in [`manager-progress-visibility.md`](manager-progress-visibility.md) § 5.1. Offer events carry `offer_id` + `placement` (**PA21**).

### 4.4 Server-side events

`ProgressService.updateUnitProgress` → `unit_completed` / `course_completed`; `ExamAttemptService` → `exam_submitted` + `exam_category_scored` per section; `OrganizationService` → `invite_sent`, `invite_redeemed`, `class_created`; manager shell load → `manager_dashboard_viewed`; CSV → `org_progress_exported`. Server events set `source='server'` and need no client cooperation.

### 4.5 Video: heartbeat cadence, resume, and what "watched" means

The same rows serve three consumers — the learner (resume where I left off), the teacher (did they watch it), the company (drop-off inside a video). Design once.

**Heartbeat cadence — 30 s, visible tab only, idle-cut at 5 min.**

| Cadence | Rows / 30-min session | Verdict |
|---------|----------------------:|---------|
| 10 s | 180 | Precision a minutes-level report never uses; 3× the rows |
| **30 s** | **60** | Industry default; a 1-minute lesson is still 2 heartbeats |
| 60 s | 30 | Short sessions vanish; resume point up to a minute stale |
| Adaptive (10 s → 30 s → 60 s) | ~40 | Marginal saving, more client state to get wrong — not worth it |

Rules: tick only while `document.visibilityState === 'visible'`; pause after 5 min with no pointer/keyboard/scroll input **and** no playing video (limits "left the tab open" inflation); each tick carries `{ video_position, video_duration, video_playing, ranges_delta }` if a player is mounted. Minutes engaged = ticks × 0.5.

**Resume flow.**

1. `GET /courses/:id/units/:ref/media` (already called to get the signed URL) additionally returns `resume: { position_seconds, percent_watched, completed } | null`. **Zero extra requests.**
2. Client resumes when `position > 10 s` and `position < 95 % of duration` and `!completed`; otherwise starts at 0. Show a chip — *Resume from 12:40 · Start over* — instead of silently jumping; users distrust unexplained seeks.
3. hls.js: pass `startPosition` in the `Hls` config (seeking before the manifest is parsed is ignored). Native `<video>` / iOS Safari HLS: set `currentTime` on `loadedmetadata`.
4. Save points: every heartbeat, `pause`, `ended`, `visibilitychange → hidden`, `pagehide` (via `sendBeacon`). `pagehide` is unreliable on mobile Safari, which is why the heartbeat also carries position.
5. **Local mirror**: `localStorage['de:video:{courseId}:{unitRef}'] = { position, ts }` throttled to 5 s. On load, use whichever of local/server has the later `ts`. Same-device resume is instant and survives a lost beacon; cross-device resume comes from the server row.

**"Watched" is a union of ranges, not a max position.** Track `[start, end]` segments while `playing` and no seek in flight; merge on the client; send the delta with each heartbeat; the server merges into `watched_ranges`. `percent_watched` is the union length over duration. This is what makes "watched 92 %" trustworthy to a teacher and what lets the company see *where in a video* people leave (histogram of range ends). Max position stays for the resume chip only.

**Alternatives considered.**

| Option | Where it fits | Why not primary |
|--------|---------------|-----------------|
| `localStorage` only | Kept — as the first tier of resume | Device-bound; invisible to the teacher and to analytics |
| Save on pause/unload only, no heartbeat | — | Loses position on crash and on mobile Safari; gives no engaged-minutes |
| Heartbeat + milestones (25/50/75/complete) | **Chosen** — Segment video spec, Mux, Wistia, JW Player, Coursera/Udemy all do this | — |
| Infer watching from CloudFront HLS segment logs | Later, as a **validation** of client numbers — paid media is already behind signed cookies tied to a user | Delayed, noisy with prefetch, no play/pause semantics, ties analytics to the CDN |
| Third-party video analytics (Mux Data, Wistia, Vimeo) | — | Third-party processor of student data (DPA blocker), cost per view, and the numbers would live outside Postgres |
| SCORM / xAPI + an LRS | If a district requires LMS reporting | Our events map to xAPI `progressed` / `completed` statements one-to-one; emit them from `product_events` then, don't adopt the stack now |
| WebSocket / streaming session | — | Overkill; a 30 s POST is the right granularity |

**Performance notes specific to video.** Milestone and position events are folded into the heartbeat (§ 4.3), so a playing video adds no requests. `watched_ranges` is bounded: merge on write and cap at 200 ranges per row (a pathological scrubber degrades to max-position semantics, not to an unbounded jsonb). The resume read piggybacks on an existing request. The `video_progress` upsert is one row per heartbeat per user — at 1,000 users that is ~13 upserts/s peak on a PK'd table, which is nothing.

---

## 5. Read path — API

Three surfaces, three guards. Nothing in the manager surface can see another org; nothing in the company surface is reachable by a manager.

### 5.1 Manager (teacher) — `JwtAuthGuard + OrgManagerGuard`, all accept `?classId=`

| Method | Path | Returns |
|--------|------|---------|
| GET | `/organizations/:id/progress` | **extended**: `+ last_activity_at`, `completed_at`, `minutes_engaged_7d`, `videos_completed`, `videos_total` |
| GET | `/organizations/:id/progress/:courseId` | **extended** per unit: `+ completed_at`, `video: {percent_watched, completed} \| null` |
| GET | `/organizations/:id/engagement?days=7` | per member: `minutes_engaged`, `lessons_viewed`, `videos_completed`, `exams_submitted`, `last_seen_at`, `inactive` |
| GET | `/organizations/:id/utilization` | **PA12**: `seats_purchased`, `members`, `members_activated`, `members_engaged_7d`, `members_engaged_30d`, `avg_pct_complete`, `hours_engaged_total`, `hours_engaged_7d`, per-class breakdown, `inactive_members[]` |
| GET | `/organizations/:id/members/:userId/timeline?limit=` | merged audit rows + `lesson_viewed` / `video_completed` / heartbeat-derived "N min in unit" |
| GET | `/organizations/:id/progress/export.csv?courseId=` | summary rows; names, class, progress only — no emails |

Live queries against `progress`, `video_progress`, and — for windows — `product_events_daily` for completed days **plus today's live partition** via the `(organization_id, occurred_at)` index. **Never** the nightly materialized views — a teacher looks during class. `getOrgProgressSummary` must take `classId` server-side (the UI filters client-side today) and paginate the unfiltered org view; a 1,000-member district × 5 courses is a 1 MB response otherwise.

### 5.2 Company — new `backend/src/reporting/` module, `JwtAuthGuard + RolesGuard(Admin)`

Reads the materialized views (plus a few live counts). Leaves `/audit/analytics/*` in place for the daily audit chart.

| Method | Path | Returns |
|--------|------|---------|
| GET | `/reporting/overview` | **The five numbers**: `activation_rate_30d`, `median_entitlement_utilization`, `net_revenue_30d {digital, hardware}` + `refund_rate`, `pro_inactive_share_30d`, `org_utilization[]` (top-line per org) + `refreshed_at` |
| GET | `/reporting/activation?from&to&source=` | activation rate by week and by `primary_source` |
| GET | `/reporting/utilization?courseId&source=` | distribution of `pct_complete` for entitled users; stalled count; by source |
| GET | `/reporting/revenue?from&to&group=day\|week\|month` | gross / refunded / net / contribution, split digital vs hardware, MRR, orders count, by SKU |
| GET | `/reporting/pro` | active subs, MRR, renewals this month, `inactive_30d[]` (the pause-offer queue), cancel-scheduled |
| GET | `/reporting/organizations` | `v_org_utilization` rows, sortable; seat vs order mismatch flag |
| GET | `/reporting/organizations/:id` | one org, per-class breakdown, manager last seen, timeline of invites/joins/activity |
| GET | `/reporting/courses/:id/funnel` | `v_course_funnel` — entitled → viewed → video complete → completed per unit; median minutes |
| GET | `/reporting/cohorts?by=source\|month` | `v_cohort_retention` |
| GET | `/reporting/users/:id` | **user 360**: profile, all entitlements (active + historical, with `primary` per course), orders + items, per-course usage, last 50 events, exam history |
| GET | `/reporting/signals` | Live lists for the signal→offer map: stalled purchasers, inactive Pro, completed-no-next-offer, low-utilization orgs, repeated weak exam category |
| GET | `/reporting/export/:report.csv` | any of the above as CSV |
| GET | `/orders?userId&organizationId&from&to` · POST `/orders/manual` · POST `/orders/:id/refund-note` | order ledger (Admin) |

### 5.3 Learner (self)

| Method | Path | Returns |
|--------|------|---------|
| GET | `/progress/courses` | **extended** with `last_activity_at`, `videos_completed` — feeds **U3** |
| GET | `/users/me/entitlements` | own entitlements with source + ends_at — replaces guessing in `profile.tsx` |
| GET | `/courses/:id/units/:ref/media` | **extended** — `+ resume: { position_seconds, percent_watched, completed } \| null` beside `video_url` (§ 4.5); no separate resume request |
| GET | `/users/me/video-progress/:courseId` | all videos in a course — for the course outline's watched indicators (**U3**) |

### 5.4 Response types

Backend DTOs in `backend/src/reporting/types/reporting.dto.ts`; frontend mirrors in `drone/src/app/lib/types/reporting.ts` and `lib/types/organization.ts` (extended). Regenerate with `scripts/generate-api-types.sh`.

---

## 6. Frontend

### 6.1 Learner (`drone/src/app/courses/…`, `ui/components/`)

| Change | Files | Purpose |
|--------|-------|---------|
| Video callbacks + `track()` wiring | `video.tsx`, `course-unit-video.tsx` | Milestones + watched-range tracking; position rides the heartbeat (§ 4.5) |
| Heartbeat hook | `unit.tsx` (`useLessonHeartbeat`) — 30 s, visible only, 5-min idle cut | Engaged minutes + video state |
| `lesson_viewed` | `unit.tsx` next to the `IN_PROGRESS` write | Lesson-level funnel |
| Resume chip + `startPosition` | `course-unit-video.tsx`, `video.tsx` | Reads `resume` from the existing `getUnitMedia` call; `localStorage` mirror for instant same-device resume — the learner-facing payoff of `video_progress` |
| **U3** progress bar, **U4** "Mark complete & continue" | `course.tsx`, `unit.tsx` | Raises completion-signal quality |
| Offer events with `offer_id` + `placement` | `purchase-flow.tsx`, `profile.tsx`, completion screen | Money-model tuning (**PA7 / PA21**) |
| Entitlements on profile | `profile.tsx` via `/users/me/entitlements` | "Part 107 — purchased Mar 2026 · Pro until Oct 3" |

### 6.2 Manager (`drone/src/app/manager/`)

| Route | Change |
|-------|--------|
| `/manager/overview` — **new tab, becomes default** | Utilization panel (**PA12**): seats purchased / claimed / activated / engaged 7 d + 30 d as a stacked bar; hours engaged this week and total; avg completion per class; **inactive students** list with last-seen; invites sent vs redeemed. This is the screen the seat and satisfaction guarantees are checked against |
| `/manager/progress` | Per [`manager-progress-visibility.md`](manager-progress-visibility.md) § 7: students × units grid from the detailed endpoint; **Last active** (default sort), **Time 7 d**, **Videos** columns; video ring in cells; header hours + inactive count; timeline with lesson/video entries; CSV export |
| `/manager/members` | `+ last active` column; inactive badge |
| `shell.tsx` | Fire `manager_dashboard_viewed` on mount; tab order Overview · Progress · Members · Invites · Class Exams |

### 6.3 Company (`drone/src/app/admin/`)

`/admin/analytics` becomes a small sub-navigation; existing daily audit chart stays under Activity.

| Sub-tab | Content | Endpoint |
|---------|---------|----------|
| **Overview** | Five number cards with 30-day sparklines; `refreshed_at` | `/reporting/overview` |
| **Revenue** | Net + contribution by period; digital vs hardware never blended; MRR; refund rate; by SKU table | `/reporting/revenue`, `/reporting/pro` |
| **Courses** | Course picker → funnel/drop-off chart per unit (entitled → viewed → watched → completed); median minutes; activation by source | `/reporting/courses/:id/funnel`, `/reporting/activation` |
| **Organizations** | Sortable utilization table; click → org detail with class breakdown and manager last seen; **Record PO order** button | `/reporting/organizations[/ :id]`, `/orders/manual` |
| **Pro** | Active subs, MRR, renewals, cancel-scheduled, inactive-30-day list | `/reporting/pro` |
| **Signals** | The § 7 queues from the design doc as lists with counts — the manual version of **PA13** until triggers exist | `/reporting/signals` |
| **Activity** | Existing daily audit chart, unchanged | `/audit/analytics/daily` |

`/admin/users` gains a **user 360 drawer** on row click: entitlements (with primary marker and source badges), orders, per-course usage bars, recent events, exam history — the single screen for "why did this person email support." `/admin/organizations` gains a utilization column and the PO-order action.

Use the existing card / table / theme-token patterns; charts with whatever the admin analytics page uses today (no new chart dependency unless the funnel needs it).

---

## 7. Sequencing

**Status (2026-09-12):** Phases 0–3 and 4.4 are built and verified locally (tsc, jest, smoke test) and the five pending migrations were **rehearsed against a scrubbed clone of production** (Postgres 17, `scripts/prod-db-clone.sh`: all ran in < 1 s, nightly job clean, all reconciliation checks 0) but **not deployed** — see **PA34** / **PA35** in `TODO.md`. Hardening shipped 2026-09-12: ingest/maintenance OTel metrics, advisory-locked cron, `paid_grant_without_order` check + Stripe order backfill endpoint, frontend retry queue, first-party anonymous id with identity stitch. 🔶 1.6: `EXAM_SUBMITTED` audit row still missing (product event exists). 🔶 2.3: names are allow-listed, purchase-flow call sites not yet wired (**PA7**). 🔶 3.5: `/users/me/entitlements` + resume UI shipped; `/users/me/video-progress` and profile resume list not.

Ordered so that each step ships something usable and the schema is never rewritten. Estimates are engineering days for one person familiar with the codebase; add review time.

### Phase 0 — no schema (½ d)

| # | Work | Backlog |
|---|------|---------|
| ✅ 0.1 | Render the students × units grid on `/manager/progress` from the endpoint that is already fetched | **MP1** |

### Phase 1 — foundation: entitlement, money, time (≈ 8 d)

| # | Work | Backlog | Est. |
|---|------|---------|------|
| ✅ 1.1 | `products` minimal + seed; `sku` on PaymentIntent metadata | **PA28** | 1 |
| ✅ 1.2 | `orders` / `order_items`; webhook writes them; `invoice.paid`, `invoice.payment_failed`, `charge.refunded`; idempotency on `stripe_event_id` | **PA1**, **PA2** | 2 |
| ✅ 1.3 | `entitlements` + backfill + dual-write at all grant/revoke points; nightly reconciliation query logged | **PA27** | 2 |
| ✅ 1.4 | `POST /orders/manual` + admin action for PO / comp orders | **PA3**, **PA23** | 1 |
| ✅ 1.5 | `progress` timestamps + `unit_completed_at` + backfill; extend manager summary; Last-active column | **PA4**, **MP2** | 1 |
| 🔶 1.6 | Missing audit rows (`EXAM_SUBMITTED`, `PRO_CANCELLED`, `PRO_EXPIRED`, `ORDER_REFUNDED`) | **PA5**, **T2** | ½ |
| ✅ 1.7 | `product_events` (monthly partitions) + `product_events_daily` rollup + partition/rollup cron steps; `ProductEventsService` with batch insert + context cache; `OptionalJwtAuthGuard` + typed batch DTO on `/analytics/event`; **throttler keyed by user id**; server-side events | **PA6**, **PA31**, **PA32**, **MP3**, **T1** | 2½ |

### Phase 2 — instrument behavior (≈ 4 d)

| # | Work | Backlog | Est. |
|---|------|---------|------|
| ✅ 2.1 | `video_progress` (with `watched_ranges`) + video callbacks + heartbeat hook + `lesson_viewed` + resume chip via extended `/media` response + `localStorage` mirror | **MP4**, **PA8**, **PA33** | 2½ |
| ✅ 2.2 | `exam_attempt_history` + `exam_category_scored` | **PA9** | 1 |
| 🔶 2.3 | Offer events with `offer_id` + `placement`; lifecycle + commerce events through `track()` | **PA7**, **PA21**, **T3** | 1 |

### Phase 3 — read surfaces (≈ 11 d)

| # | Work | Backlog | Est. |
|---|------|---------|------|
| ✅ 3.1 | Materialized views + refresh in the midnight cron; unique indexes for concurrent refresh | **PA10** | 1½ |
| ✅ 3.2 | Manager `engagement`, `utilization`, timeline, CSV; `/manager/progress` columns + grid rings; `/manager/overview` tab | **MP5–MP7**, **PA12** | 3 |
| ✅ 3.3 | `reporting` module: overview, revenue, pro, organizations, courses funnel, users 360, signals, CSV | **PA11**, **PA29**, **PA30** | 3 |
| ✅ 3.4 | `/admin/analytics` sub-tabs; user-360 drawer on `/admin/users`; org utilization column | **PA11**, **PA29** | 3 |
| 🔶 3.5 | `/users/me/entitlements`, `/users/me/video-progress`; profile + resume UI; **U3 / U4** | — | ½ |

### Phase 4 — switch and act (≈ 1 d + blocked)

| # | Work | Backlog | Est. |
|---|------|---------|------|
| ✅ 4.1 | `hasAccess` reads `entitlements` behind `ENTITLEMENTS_AUTHORITATIVE`; `access_diff` gate nightly; flag set `true` in tfvars for the PA34 deploy after a live trace on the prod clone (**PA36**). Ledger grant failures rethrow while authoritative; legacy-only rows are repaired by re-running the grant | **PA27** | 1 |
| ⬜ 4.2 | Trigger jobs for the signals (email) — blocked on ESP decision | **PA13**, **D7** | — |
| ⬜ 4.3 | Cohort reporting review; decide on Metabase | **PA14** | — |
| ✅ 4.4 | Archive job: partitions > 12 months → S3 (NDJSON.gz, bucket + IAM + lifecycle in Terraform) → verify count → `DETACH` + `DROP`; org-member partitions handled per **PD23** | **PA31** | 1 |

### Phase 5 — store (unchanged, only when hardware demand is proven)

**PA15–PA26** as in the design doc. `products` already exists; add variants, components, COGS, fulfillment. Nothing in Phases 1–4 changes.

**Total for Phases 0–4: ≈ 28 engineering days.** Phases 0, 1.5 and 3.2 are the teacher-facing path and can be pulled forward if a school pilot needs them first — they depend only on 1.7 and 2.1.

---

## 8. Backfill and reconciliation

| Data | Source | Method | Caveat |
|------|--------|--------|--------|
| `entitlements` from purchases/grants | `user_courses_purchased` | Migration, row-for-row, `source` preserved | Historical `allocated_price_cents` estimated from current `courses.price` unless orders are backfilled (**PD1**) |
| `entitlements` for Pro | `users` (`role='pro'`) | Migration | `starts_at` from `PRO_UPGRADE` audit row if present |
| `orders` for past card purchases | Stripe API `payment_intents` with `metadata.userId/courseId`; `invoices` for Pro | One-off script under `scripts/` (review before running; read-only against Stripe, writes to Postgres) | **PD1** decides whether to do this or start clean |
| `progress.created_at` / `completed_at` | `audit_logs` `COURSE_STARTED` / `COURSE_COMPLETED` | Migration | Falls back to `updated_at` |
| `exam_attempt_history` | `exam_attempts` (latest only) | Seed with `attempt_no = 1` | History before this point is unrecoverable |

**Reconciliation (nightly, logged, surfaced on `/reporting/overview` as a health line):**

1. `hasAccess` vs `v_user_entitlements.active` disagreement count → must be 0 before Phase 4.1.
2. Sum of `order_items.unit_price_cents` for the day vs Stripe balance transactions → flags webhook drops.
3. `organizations.max_students` vs seats ordered → flags provisioning drift.
4. `users.role='pro'` without an active `pro` entitlement, or the reverse → flags cron/webhook drift.

---

## 9. Decisions

Open items this plan needs answered; recorded in `TODO.md` alongside the existing PD/MPD rows.

| # | Question | Recommendation |
|---|----------|----------------|
| **PD18** | Refund → revoke? | Full refund revokes that line's entitlements; partial refund does not. Revocation is a state change with an audit row, never a delete |
| **PD19** | Attribution precedence for overlapping entitlements | § 2.3 as written. Revisit only if a report needs "credit Pro for everything while Pro is active" — then add a second column, do not change the first |
| **PD20** | Materialize org seats as entitlement rows? | No (§ 2.6). Derived in the view. Revisit if per-member course assignment inside an org is ever built |
| **PD21** | Bundle allocation by standalone price vs equal split | Standalone-price proportional (§ 2.4); equal split misstates the flagship course's revenue |
| **PD22** | When does `hasAccess` switch to `entitlements`? | **Decided.** After 14 consecutive clean reconciliation nights, via `ENTITLEMENTS_AUTHORITATIVE` (Terraform `var.entitlements_authoritative`). Only the read path changes; every grant path (purchase, admin grant, signup link, Pro sync, org seats) already writes the ledger and keeps working |
| **PD1** | Backfill orders from Stripe or start clean? | Backfill — the script is small and historical activation/refund rates are worth having |
| **PD7** | Contractual "active seat" | **Decided 2026-09-12.** Any learning event or progress write in the last **30 days**; login alone does not count. Teacher view uses **7 days** (**MPD3**). One query (`v_org_utilization.members_engaged_30d` / `_7d`), two constants. Shown as "Active seats (30d)" (manager Overview, admin Organizations) and "Active this week". **Track only** — no email or offer is attached (**MM9**) |
| **MPD1** | Auto-complete on video ≥ 90 %? | No — show watch % beside declared completion |
| **PD23** | Archive org-member raw events to S3 or delete at the retention boundary? | **Delete** unless the DPA explicitly covers the archive and the deletion path reaches S3. Archive B2C partitions; rollups (aggregate per user-day) are kept for all users and cascade on user deletion |

---

## 10. Privacy — what this plan adds to the design rules

Design § 10 governs. Specific to this plan:

- `entitlements`, `orders` and `product_events` for org members are education records under the DPA; the deletion path must cascade through all three plus `video_progress` and `exam_attempt_history`.
- The company `/reporting/*` surface shows individual students to admins. That is us as the service provider acting for the district — permissible — but **no student row leaves the platform** except in the manager's own CSV. Sponsor and marketing reporting reads only org-grain or cohort-grain views.
- `entitlement_source` on events is a commercial attribute stamped onto a student's learning event. It is fine in Postgres; it must never be sent to a pixel or CAPI payload (design § 10 already forbids org members there entirely).
- Update `drone/src/app/privacy/page.tsx` when 1.7 / 2.1 ship (video watch and time-on-lesson collection), per [`legal-and-privacy-site-sync.md`](legal-and-privacy-site-sync.md).

---

## 11. Acceptance

**Entitlements**
- A user who buys the bundle gets three `entitlements(bundle)` rows sharing one `order_item_id`, `allocated_price_cents` summing to the line price, and `hasAccess` true for all three courses.
- A user with an own purchase **and** active Pro shows `primary_source = purchase` for that course and `pro` for every other course in `v_entitlement_utilization`; usage is counted once per course.
- A redelivered Stripe event creates no second order, entitlement, or event row.
- `invoice.paid` extends `ends_at` and creates an `orders` row; MRR on `/reporting/pro` equals Stripe's active-subscription MRR ± rounding.
- Full `charge.refunded` sets `revoked_at` on the line's entitlements, removes access, and shows on `/reporting/revenue` as refunded; a partial refund changes only the money.
- Nightly reconciliation #1 is 0 for 14 nights before `hasAccess` switches; after the switch, e2e access tests pass unchanged.

**Usage**
- A student who plays 95 % of a video and closes the tab yields a `video_progress` row (`completed=true`), a `video_completed` event with `organization_id` and `entitlement_source` set, and `progress.last_activity_at` within a minute — with unit status still `IN_PROGRESS` unless marked.
- A student who scrubs from 0:00 to the end without playing has `max_position = duration` but `percent_watched ≈ 0` and `completed = false`.
- A student who stops at 12:40 and reopens the unit on another device sees *Resume from 12:40*; the `/media` response carried the position and no additional request was made. Reopening a completed video starts at 0:00.
- A tab left open on a lesson with no input and no playing video for 10 minutes produces at most 10 heartbeats, not 20.
- Anonymous `page_view` still increments OTel; anonymous `video_progress` is dropped without error; a learning event for a course the user cannot access is dropped.

**Teacher**
- Manager of org A cannot read any `/organizations/B/*` endpoint (403); a `member` cannot read manager endpoints.
- `/manager/overview` shows seats purchased / claimed / activated / engaged with the same numbers `v_org_utilization` reports for that org (7-day and 30-day windows both shown).
- Grid renders from one detailed call; Last-active sorts quietest first; CSV contains no email column.

**Company**
- `/reporting/overview` returns the five numbers with `refreshed_at` ≤ 24 h old; digital and hardware revenue are separate fields.
- `/reporting/users/:id` lists every entitlement a user ever had with the primary marked, every order, and per-course usage — for a test user seeded with purchase + Pro + org seat.
- `/reporting/courses/1/funnel` shows per-unit entitled → viewed → watched → completed counts that sum consistently with `v_user_course_usage`.

---

## 12. Scale, performance, retention, extensibility

Current infra (Sep 2026): Aurora PostgreSQL Serverless v2 **0.5–2 ACU**, backend ECS Fargate **0.5 vCPU / 1 GB × 1–5 tasks**, global `ThrottlerGuard` **30 req/min keyed by IP**.

### 12.1 Volume model

Per active 30-minute session, as first designed: ~60 heartbeats (30 s) + ~90 video pings (10 s) + ~10 discrete ≈ **160 events**. With video state folded into the heartbeat (§ 4.3): **≈ 75**. ~50 sessions per learner per year (school: 3/week × 18 weeks; B2C fewer). Row with indexes ≈ 500 B.

| Users | Events / yr (75 per session) | Raw storage / yr | Rollup rows / yr | Peak inserts / s (school hours, ~20 % concurrent) |
|------:|-----------------------------:|-----------------:|-----------------:|--------------------------------------------------:|
| 50 | 0.2 M | 100 MB | 30 k | < 1 |
| 100 | 0.4 M | 200 MB | 60 k | ~1 |
| 1,000 | 3.8 M | 1.9 GB | 600 k | ~13 |
| 10,000 | 38 M | 19 GB | 6 M | ~130 |

Aurora cost is noise at every tier — storage $0.10 / GB-month, I/O a few dollars a year. The one real cost lever is that daytime writes keep the cluster from idling at 0.5 ACU: roughly **$10–15 / month** at 1,000 users. Postgres is not the bottleneck; 38 M rows is an ordinary table.

### 12.2 What breaks, in order of when

| # | Risk | Breaks at | Fix (all in Phase 1) |
|---|------|-----------|----------------------|
| 1 | **Per-IP throttle in a classroom.** 30 students behind one school NAT share an IP; 30 × 2 batches/min = 60/min > 30/min → 429s. **Latent today**: 30 simultaneous course-page loads already exceed it | **30 users, now** | Custom `getTracker`: user id when authenticated, IP otherwise. Own limit on `/analytics/event`. **PA32** |
| 2 | **Query fan-out per event.** Naïve design = ~5 queries per event (membership, `hasAccess` loading `purchased_courses` + org, progress bump, `video_progress` upsert, insert). 27 events/s → 135 q/s at 1,000 users; 10× that pins 2 ACU | ~1,000 users | Batch body, in-process context cache (5 min), video state on the heartbeat, single multi-row insert. Result ≈ 1.2 queries per event, 2 requests/min/user |
| 3 | **Nightly full recompute of views.** Counting heartbeats across the whole table for `v_user_course_usage` is seconds at 4 M rows, minutes plus real I/O at 40 M | ~5–10 M rows | `product_events_daily` computed incrementally for yesterday only; views and the 7-day manager query read rollups + today |
| 4 | **Retention by `DELETE`.** Removing 4 M old rows from an unpartitioned table = hours of bloat + vacuum on the writer | Month 12 at any scale | Monthly partitions from day one; retire a month with `DETACH PARTITION` + `DROP` (instant, no vacuum). Retrofitting partitioning onto a live table is the painful version |
| 5 | **Org summary payload.** `getOrgProgressSummary` is members × courses in memory, unpaginated; a 1,000-member district × 5 courses ≈ 5,000 rows / 1 MB per load | ~500-member org | Server-side `classId` (exists, UI ignores it), pagination on the unfiltered view |
| 6 | **Materialized view refresh locks.** Plain `REFRESH` takes an exclusive lock; a manager loading `/reporting` at midnight blocks | Any scale, rarely | `REFRESH … CONCURRENTLY` (needs a unique index per view — listed in § 3.9); run after the Pro-expiry step |
| 7 | **Client clock and idle inflation.** Skewed clocks and tabs left open distort minutes | Any scale | Clamp `occurred_at` to ±5 min of server time; heartbeat only while `visibilityState === 'visible'`; present minutes rounded (**MPD4**) |

**When to add a queue (SQS/Kinesis) in front of the insert:** not before p95 latency on `/analytics/event` exceeds ~100 ms or ACU pins at max through school hours — roughly the 10k-concurrent range. Heartbeats are lossy by nature; a few seconds lost during an ECS deploy is acceptable. Do not build a buffer for this.

### 12.3 Backend and DB headroom

- ECS: 13 batched req/s at 1,000 users is far under one 0.5 vCPU Nest task; autoscaling to 5 tasks covers 10k. The in-process context cache is per task — that is fine, it is a 5-minute cache of cheap facts, not a source of truth.
- Aurora: 2 ACU (~4 GB) handles low thousands of simple q/s. Reads for `/reporting/*` and the nightly refresh should move to the **reader endpoint** when one exists (**PD6**); today there is one instance, so schedule the refresh at midnight and keep manager queries on rollups.
- Connection pool: TypeORM default 10 per task × 5 tasks = 50; Aurora at 2 ACU allows ~900. Not a constraint.

### 12.4 Retention and S3 archive

Monthly cron step, after the rollup:

1. For each `product_events` partition older than **12 months**: stream rows to `s3://<analytics-archive>/product_events/year=YYYY/month=MM/part-*.ndjson.gz` with the S3 SDK the backend already uses for media. Bucket, IAM policy (write-only for the backend task role), and lifecycle (Glacier Instant Retrieval after 90 days) are **declared in Terraform** — never created by hand.
2. Verify exported row count = partition count; write an `archive_manifests` row (partition, rows, bytes, s3 prefix, checksum).
3. `ALTER TABLE product_events DETACH PARTITION …; DROP TABLE …`.
4. **Org-member rows follow PD23** — deleted at the boundary, not archived, unless the DPA covers it.

`product_events_daily` is never archived; it is the counter that keeps activation, utilization, and hours-engaged continuous past 12 months. User deletion cascades to rollups (indexed delete) and, for archived B2C rows, to a quarterly S3 purge job driven by a `deleted_user_ids` table.

Querying the archive: only if a question ever needs raw history older than a year — then a Glue table + Athena over the NDJSON prefix, no re-import. Do not set that up in advance.

### 12.5 Extensibility

| Change | Cost |
|--------|------|
| New event type | None — `event_name` is text validated by an app-level allow-list; details in `properties` jsonb |
| New way to sell access (micro-course, unit bundle, LTI roster, trial) | New `products.grants` shape and/or `entitlements.source` value — additive. Keep `source`, `product_type`, `payment_status` as **text + app enum**, not PG enums (matches how `user_courses_purchased.source` is already done); PG enums need a migration per value |
| New metric on a dashboard | Additive column on `product_events_daily` + a view migration |
| Per-class teacher role (**MP9**) | Already served — `class_id` is stamped on events and rollups from day one |
| Second tenant dimension (district above org) | Add `district_id` to `organizations` and stamp it like `organization_id`; do not pre-build |
| Outgrowing Postgres for analysis | `product_events` is already a fact table and the S3 archive is a landing zone; Athena / BigQuery read the same files. Zero remodeling — that is the reason to archive as NDJSON rather than a Postgres dump |
| Physical goods (Phase 5) | `orders` is order-shaped and `products` exists; variants/BOM/fulfillment are new tables, not rewrites |

What is deliberately **not** extensible: `hasAccess` semantics. The entitlement precedence (§ 2.3) is a reporting concept; access remains a boolean, and the plan keeps it that way so the two can never drift into "you have access for reporting but not for reading."

---

## Keeping this doc current

Flip status markers here as steps ship. Update in the same session: [`backend-data.md`](backend-data.md) (entities, endpoints), [`frontend-data.md`](frontend-data.md) (`/manager/*`, `/admin/analytics`, learner instrumentation), [`purchase-flows.md`](purchase-flows.md) (webhook events, orders), [`../sales/features.md`](../sales/features.md) only for what is live, [`../sales/pricing-model.md`](../sales/pricing-model.md) when `products` seeds the bundle. Move **PA** / **MP** rows to [`../TODO_COMPLETED.md`](../TODO_COMPLETED.md) with the date.
