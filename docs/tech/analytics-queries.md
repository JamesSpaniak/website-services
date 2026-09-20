# Analytics query cookbook — tables, views, and what each query tells us

Reference for producing a **dashboard snapshot / PDF report** from the product-analytics store without clicking through the UI. Every query below is copy-pasteable `psql`, states its parameters, what it returns, and which report section or admin screen it feeds. An agent asked for "a snapshot" should run the **Report recipe** in § 6 top to bottom.

Companion docs: [`analytics-implementation-plan.md`](analytics-implementation-plan.md) (design, phases), [`product-analytics.md`](product-analytics.md) (why these numbers), [`manager-progress-visibility.md`](manager-progress-visibility.md) (teacher read path), [`backend-data.md`](backend-data.md) (endpoints).

---

## 0. Before you query

**Where the data lives.** Same Postgres as the app (`DB_*` env in the backend task). Read-only is enough for everything here. Locally: `psql "$DATABASE_URL"` against the dev container from [`local-dev.md`](local-dev.md). Never run these against production without being asked; they are read-only but the views are refreshed by the app, not by you.

**Fresh vs. nightly.** Two classes of source:

| Source | Freshness | Use for |
|---|---|---|
| Live tables — `product_events`, `video_progress`, `progress`, `entitlements`, `orders`, `order_items`, `exam_attempt_history` | real time | "what happened today", per-student drill-down, manager screens |
| Rollup — `product_events_daily` | nightly at 00:30 UTC; the cron recomputes the last 2 days so late events land | any *minutes / active days* aggregate |
| Materialized views — `v_*` | nightly after the rollup (same job) | every headline number, cohorts, revenue, org utilization |

Check freshness first; put the timestamps on the report cover page:

```sql
-- Q0.1  Freshness & pipeline health   → report cover, admin Overview footer   (GET /reporting/health)
SELECT
  (SELECT MAX(ran_at)      FROM analytics_reconciliation WHERE check_name = 'views_refreshed') AS views_refreshed_at,
  (SELECT MAX(computed_at) FROM product_events_daily)                                          AS rollup_computed_at,
  (SELECT COUNT(*) FROM product_events WHERE occurred_at >= now() - interval '24 hours')       AS events_24h,
  (SELECT pg_size_pretty(pg_total_relation_size('product_events')))                           AS product_events_size,
  (SELECT COUNT(*) FROM pg_inherits i JOIN pg_class p ON p.oid = i.inhparent
     WHERE p.relname = 'product_events')                                                       AS partitions;
```

```sql
-- Q0.2  Reconciliation — must be all zeros before entitlements can replace user_courses_purchased (PD22 gate = 14 clean nights)
SELECT DISTINCT ON (check_name) check_name, mismatches, ran_at, detail
FROM analytics_reconciliation
WHERE check_name <> 'views_refreshed'
ORDER BY check_name, ran_at DESC;
```
Returns one row per check. **Gate checks** (must be 0 for 14 nights, `AnalyticsMaintenanceService.GATE_CHECKS`): `ucp_without_entitlement`, `entitlement_without_ucp`, `pro_user_without_entitlement`, `pro_entitlement_without_user`, `access_diff` (user × course pairs where the legacy access rule and the ledger disagree — the one that decides PD22), `paid_grant_without_order` (a Stripe purchase was granted but its `orders` row failed; repair with `POST /purchases/admin/backfill-order`). **Informational:** `legacy_purchase_without_order` (pre-ledger purchases carrying a catalog price until the Stripe backfill runs; not counted in clean nights). `detail` lists the offending ids. Rehearsed on a scrubbed prod clone 2026-09-12 (`scripts/prod-db-clone.sh`): all seven checks were 0.

```sql
-- Q0.3  Ingest health, last hour vs. the same hour yesterday   → "is tracking alive?" (also OTel product_events.accepted / .failures)
SELECT source,
       COUNT(*) FILTER (WHERE occurred_at >= now() - interval '1 hour')                                          AS last_hour,
       COUNT(*) FILTER (WHERE occurred_at BETWEEN now() - interval '25 hours' AND now() - interval '24 hours')   AS same_hour_yesterday,
       COUNT(DISTINCT user_id) FILTER (WHERE occurred_at >= now() - interval '1 hour')                           AS users_last_hour
FROM product_events
WHERE occurred_at >= now() - interval '25 hours'
GROUP BY source;
```
`web` rows come from browsers, `server` rows from purchase / Pro / grant paths. `web = 0` during school hours while `server > 0` means the frontend pipeline is broken (or throttled), not the site.

**Force a refresh** (admin only, runs rollup → view refresh → reconcile): `POST /reporting/refresh`, or in SQL, in this order:
```sql
REFRESH MATERIALIZED VIEW CONCURRENTLY v_user_entitlements;
REFRESH MATERIALIZED VIEW CONCURRENTLY v_user_course_usage;
REFRESH MATERIALIZED VIEW CONCURRENTLY v_entitlement_utilization;
REFRESH MATERIALIZED VIEW CONCURRENTLY v_user_revenue;
REFRESH MATERIALIZED VIEW CONCURRENTLY v_org_utilization;
REFRESH MATERIALIZED VIEW CONCURRENTLY v_course_funnel;
REFRESH MATERIALIZED VIEW CONCURRENTLY v_cohort_retention;
```

**Privacy.** Anything with `username` / `email` is internal. Manager exports are scoped to their org by the API; when producing a company PDF, aggregate — do not paste user lists into a shareable document. See [`product-analytics.md`](product-analytics.md) § 10.

---

## 1. Schema map

```
products ──< order_items >── orders ──(user_id | organization_id)
                 │
                 └──< entitlements (course_id NULL = Pro / all courses)
                              │
users ──< progress ──────────┤   per user × course: status, units, timestamps
      ──< video_progress ────┤   per user × unit: position, ranges, % watched
      ──< exam_attempt_history
      ──< product_events (monthly partitions) ──rollup──> product_events_daily

v_user_entitlements → v_user_course_usage → v_entitlement_utilization
                                          → v_user_revenue · v_org_utilization · v_course_funnel · v_cohort_retention
```

### 1.1 Live tables

| Table | Grain | Key columns | Notes |
|---|---|---|---|
| `products` | SKU | `sku`, `name`, `product_type` (course·bundle·pro_monthly·pro_yearly·seats·hardware), `grants` jsonb, `list_price_cents`, `stripe_price_id`, `related_course_id`, `active` | Catalog. `COURSE_{id}` rows auto-created for new courses. |
| `orders` | one payment | `user_id` / `organization_id`, `stripe_payment_intent_id`, `stripe_invoice_id`, `payment_method` (card·invoice·po·comp), `subtotal/discount/shipping/tax/total/refunded_cents`, `payment_status` (succeeded·failed·refunded·partially_refunded·pending), `placed_at`, `notes`, `created_by_user_id` | Idempotent on Stripe ids. Manual/PO orders via `POST /orders/manual`. |
| `order_items` | one line | `order_id`, `sku`, `product_type`, `course_id`, `quantity`, `unit_price_cents`, `unit_cost_cents`, `discount_cents`, `refunded_amount_cents`, `fulfillment_source` (digital·warehouse·dropship), `placement`, `offer_id` | `unit_cost_cents` is COGS → contribution margin. `placement`/`offer_id` tie a line to the upsell that produced it. |
| `entitlements` | user × course × source | `user_id`, `course_id` (NULL = Pro), `source` (purchase·bundle·pro·admin_grant·signup_link·trial), `product_sku`, `order_item_id`, `allocated_price_cents`, `price_estimated`, `starts_at`, `ends_at`, `revoked_at`, `revoke_reason` (refund·cancelled·expired·admin) | **Live** = `revoked_at IS NULL AND (ends_at IS NULL OR ends_at > now())`. Org seats are *not* rows here — derived from `organization_members × organization_courses`. |
| `progress` | user × course | `status`, `units_completed`, `units_total`, `unit_statuses` jsonb, `created_at` (= started), `completed_at`, `last_activity_at`, `unit_completed_at` jsonb `{unit_ref: iso}` | Pre-existing table; the four timestamp columns are new. |
| `video_progress` | user × course × unit | `position_seconds`, `max_position_seconds`, `watched_ranges` jsonb `[[s,e],…]`, `duration_seconds`, `percent_watched` (union of ranges ÷ duration), `completed` (≥ 90 %), `play_count`, `first/last_played_at` | Resume point + "did they actually watch it" (scrubbing to the end does not count). |
| `exam_attempt_history` | one submission | `user_id`, `exam_id`, `course_id`, `scope`, `scope_refs[]`, `exam_pool`, `attempt_no`, `score`, `section_breakdown` jsonb, `submitted_at` | Append-only; `exam_attempts` still holds the latest only. |
| `product_events` | one event | `user_id` / `anonymous_id`, `session_id`, `organization_id`, `class_id`, `event_name`, `occurred_at`, `course_id`, `unit_ref`, `entitlement_source`, `properties` jsonb, `event_id` | RANGE-partitioned by month (`product_events_YYYY_MM`). **Always filter on `occurred_at`** so Postgres prunes partitions. `lesson_heartbeat` = 30 s → 0.5 min. Partitions older than `ANALYTICS_RETENTION_MONTHS` (12) are archived to S3 and dropped. |
| `product_events_daily` | user × course × day | `organization_id`, `class_id`, `entitlement_source`, `minutes_engaged`, `lessons_viewed`, `videos_completed`, `units_completed`, `exams_submitted`, `events`, `computed_at` | The rollup. Survives partition archival — this is the +12-month history. |
| `analytics_reconciliation` | one check run | `check_name`, `mismatches`, `detail`, `ran_at` | Also logs `views_refreshed`. |

Event names (allow-list in `backend/src/product-events/types/product-event.dto.ts`):
`page_view article_view course_view pricing_viewed` · `lesson_viewed lesson_heartbeat video_started video_progress video_completed video_position course_started lesson_completed unit_completed course_completed` · `exam_started exam_submitted exam_category_scored` · `checkout_started purchase_completed order_recorded refund_issued pro_started pro_renewed pro_payment_failed pro_cancel_scheduled pro_cancelled pro_expired billing_portal_opened` · `upsell_shown/accepted/declined downsell_shown/accepted/declined` · `signup_started signup_completed login email_verified` · `invite_sent invite_redeemed manager_dashboard_viewed org_progress_exported class_created` · `feature_used`.

### 1.2 Materialized views

| View | Grain | What it answers | Key columns |
|---|---|---|---|
| `v_user_entitlements` | user × course × source (incl. derived `org_seat`) | "Who can open what, and why" | `user_id`, `course_id`, `source`, `product_sku`, `order_item_id`, `allocated_price_cents`, `organization_id`, `starts_at`, `ends_at`, `revoked_at`, `active` |
| `v_user_course_usage` | user × course | "What did they do with it" | `status`, `started_at`, `completed_at`, `last_activity_at`, `units_completed/total`, `pct_complete`, `first_unit_completed_at`, `videos_completed/total`, `minutes_engaged`, `lessons_viewed`, `active_days`, `exams_taken`, `best_score`, `latest_score`, `days_to_first_unit`, `days_to_complete` |
| `v_entitlement_utilization` | user × course, **one row** (attributed) | "Entitled vs used" — the core table for activation, utilization, stalled | `primary_source` (purchase/bundle > pro > org_seat > free; tie → earliest), `all_sources[]`, `first_entitled_at`, `organization_id`, `allocated_price_cents`, `status`, `pct_complete`, `minutes_engaged`, `videos_completed`, `exams_taken`, `best_score`, `activated` (first unit ≤ 7 d after access), `stalled` (no activity and access > 7 d old) |
| `v_user_revenue` | user | "What are they worth" | `gross_cents`, `refunded_cents`, `net_cents`, `cogs_cents`, `shipping_cents`, `contribution_cents` (net − cogs − shipping), `digital_cents`, `hardware_cents`, `active_mrr_cents`, `orders_count`, `course_orders`, `first/last_order_at`, `product_mix[]` |
| `v_org_utilization` | organization | "Are they using the seats" | `seats_purchased`, `seats_ordered`, `invites_sent/redeemed`, `members`, `members_activated`, `members_engaged_7d/30d`, `avg_pct_complete`, `members_completed`, `hours_engaged_total/30d`, `manager_last_seen_at`, `utilization_pct_30d` (engaged 30 d ÷ seats), `courses_assigned` |
| `v_course_funnel` | course × unit | "Where do learners drop off" | `unit_ref`, `title`, `depth`, `path`, `position`, `has_video`, `entitled`, `viewed`, `completed`, `video_completed`, `median_minutes` (heartbeats, last 90 d) |
| `v_cohort_retention` | month of first access × source | "Do later cohorts do better" | `entitled`, `activated`, `completed`, `stalled`, `second_purchase_users`, `refunded_users`, `users`, `avg_pct_complete` |

---

## 2. Headline numbers (the five that matter)

These are the numbers in `product-analytics.md` § "The five numbers". Mirrored by `GET /reporting/overview` → admin **Analytics → Overview**.

```sql
-- Q2.1  Activation rate — paid learners who completed a first unit within 7 days of access.
--       Window: access granted 7–90 days ago (so everyone had their 7 days; excludes ancient backfill).
--       → Overview card "Activation rate"
SELECT COUNT(*)                                  AS paid_entitlements,
       COUNT(*) FILTER (WHERE activated)         AS activated,
       ROUND(100.0 * COUNT(*) FILTER (WHERE activated) / NULLIF(COUNT(*), 0)) AS activation_pct
FROM v_entitlement_utilization
WHERE primary_source IN ('purchase', 'bundle', 'pro')
  AND first_entitled_at BETWEEN now() - interval '90 days' AND now() - interval '7 days';
```
*Reads:* < 60 % means the first lesson or onboarding email is the problem, not the course.

```sql
-- Q2.2  Entitlement utilization — median % of owned content completed, paid, ≥ 30 days of access.
--       → Overview card "Median utilization"
SELECT ROUND(percentile_cont(0.5) WITHIN GROUP (ORDER BY pct_complete)) AS median_pct,
       ROUND(percentile_cont(0.25) WITHIN GROUP (ORDER BY pct_complete)) AS p25,
       ROUND(percentile_cont(0.75) WITHIN GROUP (ORDER BY pct_complete)) AS p75,
       COUNT(*) AS n
FROM v_entitlement_utilization
WHERE primary_source IN ('purchase', 'bundle', 'pro')
  AND first_entitled_at < now() - interval '30 days';
```

```sql
-- Q2.3  Net revenue, contribution, digital vs hardware, MRR — all-time from orders (never blend digital & hardware).
--       → Overview "Contribution / payer", Revenue tab totals
SELECT SUM(gross_cents)         / 100.0 AS gross_usd,
       SUM(refunded_cents)      / 100.0 AS refunded_usd,
       SUM(net_cents)           / 100.0 AS net_usd,
       SUM(contribution_cents)  / 100.0 AS contribution_usd,
       SUM(digital_cents)       / 100.0 AS digital_usd,
       SUM(hardware_cents)      / 100.0 AS hardware_usd,
       SUM(active_mrr_cents)    / 100.0 AS mrr_usd,
       COUNT(*)                          AS payers,
       ROUND(AVG(net_cents) / 100.0, 2)  AS avg_net_per_payer_usd,
       COUNT(*) FILTER (WHERE course_orders >= 2) AS repeat_buyers
FROM v_user_revenue;
```

```sql
-- Q2.4  Pro engagement — active subscribers with no activity in 30 days (churn predictor / "save them money" queue).
--       → Pro tab
SELECT COUNT(*)                                            AS pro_active,
       COUNT(*) FILTER (WHERE last_activity_at IS NULL
                           OR last_activity_at < now() - interval '30 days') AS pro_idle_30d,
       ROUND(100.0 * COUNT(*) FILTER (WHERE last_activity_at IS NULL
                           OR last_activity_at < now() - interval '30 days') / NULLIF(COUNT(*), 0)) AS idle_pct
FROM entitlements e
LEFT JOIN LATERAL (SELECT MAX(p.last_activity_at) AS last_activity_at
                   FROM progress p WHERE p."userId" = e.user_id) a ON true
WHERE e.course_id IS NULL AND e.revoked_at IS NULL AND (e.ends_at IS NULL OR e.ends_at > now());
```

```sql
-- Q2.5  Org seat utilization — per organization and the company average.
--       → Overview card "Org utilization", Organizations tab
SELECT name, seats_purchased, members, members_engaged_30d, utilization_pct_30d, avg_pct_complete,
       hours_engaged_30d, manager_last_seen_at
FROM v_org_utilization ORDER BY utilization_pct_30d, name;

SELECT ROUND(AVG(utilization_pct_30d)) AS avg_org_utilization_pct,
       COUNT(*) FILTER (WHERE members = 0 OR utilization_pct_30d < 40) AS orgs_at_risk,
       COUNT(*) AS organizations
FROM v_org_utilization;
```

```sql
-- Q2.6  Activity pulse — learners entitled / paying / active   → Overview second row
SELECT (SELECT COUNT(DISTINCT user_id) FROM v_entitlement_utilization)                                        AS learners_entitled,
       (SELECT COUNT(DISTINCT user_id) FROM v_entitlement_utilization
         WHERE primary_source IN ('purchase','bundle','pro'))                                                 AS paying_learners,
       (SELECT COUNT(DISTINCT "userId") FROM progress WHERE last_activity_at >= now() - interval '7 days')    AS active_7d,
       (SELECT COUNT(DISTINCT "userId") FROM progress WHERE last_activity_at >= now() - interval '30 days')   AS active_30d,
       (SELECT SUM(total_cents - refunded_cents) / 100.0 FROM orders
         WHERE placed_at >= now() - interval '30 days' AND payment_status <> 'failed')                         AS revenue_30d_usd;
```

```sql
-- Q2.7  Everything by access source — the "same course, different package" comparison.   → Overview table "By access source"
SELECT primary_source,
       COUNT(*)                                   AS entitlements,
       COUNT(DISTINCT user_id)                    AS users,
       ROUND(100.0 * COUNT(*) FILTER (WHERE activated)
             / NULLIF(COUNT(*) FILTER (WHERE first_entitled_at < now() - interval '7 days'), 0)) AS activation_pct,
       ROUND(AVG(pct_complete))                   AS avg_pct_complete,
       ROUND(AVG(minutes_engaged))                AS avg_minutes,
       COUNT(*) FILTER (WHERE status = 'COMPLETED') AS completed,
       COUNT(*) FILTER (WHERE stalled)            AS stalled
FROM v_entitlement_utilization
GROUP BY 1 ORDER BY entitlements DESC;
```
*Reads:* if `org_seat` completes far below `purchase`, the B2B onboarding is the gap; if `pro` completes below `purchase`, Pro buyers are browsing rather than finishing (the downsell-to-single-course signal).

---

## 3. Revenue and orders

Mirrored by `GET /reporting/revenue?months=` → **Revenue** tab.

```sql
-- Q3.1  Net revenue by month × product type   → Revenue chart + table
--       :months = 12
SELECT date_trunc('month', o.placed_at)::date AS month, oi.product_type,
       COUNT(DISTINCT o.id)                                                            AS orders,
       SUM(oi.unit_price_cents * oi.quantity - oi.discount_cents) / 100.0              AS gross_usd,
       SUM(oi.refunded_amount_cents) / 100.0                                           AS refunded_usd,
       SUM(oi.unit_price_cents * oi.quantity - oi.discount_cents - oi.refunded_amount_cents) / 100.0 AS net_usd,
       SUM(oi.unit_cost_cents * oi.quantity) / 100.0                                   AS cogs_usd
FROM orders o JOIN order_items oi ON oi.order_id = o.id
WHERE o.payment_status <> 'failed'
  AND o.placed_at >= date_trunc('month', now()) - (:months || ' months')::interval
GROUP BY 1, 2 ORDER BY 1, 2;
```

```sql
-- Q3.2  SKU performance — units, buyers, net   → Revenue "By SKU"
SELECT oi.sku, p.name, oi.product_type,
       SUM(oi.quantity) AS units, COUNT(DISTINCT o.user_id) AS buyers,
       SUM(oi.unit_price_cents * oi.quantity - oi.discount_cents - oi.refunded_amount_cents) / 100.0 AS net_usd,
       ROUND(100.0 * SUM(oi.refunded_amount_cents) / NULLIF(SUM(oi.unit_price_cents * oi.quantity), 0), 1) AS refund_pct
FROM order_items oi
JOIN orders o ON o.id = oi.order_id AND o.payment_status <> 'failed'
LEFT JOIN products p ON p.sku = oi.sku
GROUP BY 1, 2, 3 ORDER BY net_usd DESC;
```

```sql
-- Q3.3  Payment method mix (card vs invoice/PO vs comp)   → Revenue "Payment methods"
SELECT payment_method, COUNT(*) AS orders, SUM(total_cents - refunded_cents) / 100.0 AS net_usd
FROM orders WHERE payment_status <> 'failed' GROUP BY 1 ORDER BY net_usd DESC;
```

```sql
-- Q3.4  Offer / placement attribution — which upsell placements actually convert   → money-model tuning
SELECT oi.placement, oi.offer_id, COUNT(*) AS lines,
       SUM(oi.unit_price_cents * oi.quantity - oi.discount_cents) / 100.0 AS gross_usd
FROM order_items oi JOIN orders o ON o.id = oi.order_id AND o.payment_status <> 'failed'
WHERE oi.placement IS NOT NULL GROUP BY 1, 2 ORDER BY gross_usd DESC;

-- shown vs accepted from the event stream (last 90 d)
SELECT properties->>'placement' AS placement, properties->>'offerId' AS offer_id,
       COUNT(*) FILTER (WHERE event_name = 'upsell_shown')    AS shown,
       COUNT(*) FILTER (WHERE event_name = 'upsell_accepted') AS accepted,
       ROUND(100.0 * COUNT(*) FILTER (WHERE event_name = 'upsell_accepted')
             / NULLIF(COUNT(*) FILTER (WHERE event_name = 'upsell_shown'), 0), 1) AS accept_pct
FROM product_events
WHERE event_name IN ('upsell_shown', 'upsell_accepted') AND occurred_at >= now() - interval '90 days'
GROUP BY 1, 2 ORDER BY shown DESC;
```

```sql
-- Q3.5  Refunds — rate and reasons in the period   → Revenue footnote
SELECT date_trunc('month', placed_at)::date AS month,
       COUNT(*) FILTER (WHERE payment_status IN ('refunded','partially_refunded')) AS refunded_orders,
       COUNT(*) AS orders,
       SUM(refunded_cents) / 100.0 AS refunded_usd
FROM orders WHERE payment_status <> 'failed' GROUP BY 1 ORDER BY 1 DESC LIMIT 12;
```

```sql
-- Q3.6  Recent orders (audit list)   → appendix; GET /orders (admin)
SELECT o.id, o.placed_at, u.email, org.name AS organization, o.payment_method, o.payment_status,
       o.total_cents / 100.0 AS total_usd, o.refunded_cents / 100.0 AS refunded_usd,
       string_agg(oi.sku || '×' || oi.quantity, ', ' ORDER BY oi.id) AS items
FROM orders o
LEFT JOIN users u ON u.id = o.user_id
LEFT JOIN organizations org ON org.id = o.organization_id
JOIN order_items oi ON oi.order_id = o.id
GROUP BY o.id, u.email, org.name ORDER BY o.placed_at DESC LIMIT 50;
```

```sql
-- Q3.7  Pre-signup funnel by content — what anonymous visitors looked at before they became buyers   → Revenue "acquisition" panel
-- Uses the identity stitch: the `identified` event is the only row with both user_id and anonymous_id.
WITH identity AS (
  SELECT DISTINCT anonymous_id, user_id
  FROM product_events WHERE event_name = 'identified' AND anonymous_id IS NOT NULL
),
pre AS (                                        -- anonymous intent rows, attributed to the user they became
  SELECT i.user_id, pe.event_name, pe.properties ->> 'content_id' AS content_id, pe.occurred_at
  FROM product_events pe JOIN identity i ON i.anonymous_id = pe.anonymous_id
  WHERE pe.user_id IS NULL
),
buyers AS (
  SELECT DISTINCT user_id FROM entitlements WHERE source IN ('purchase', 'bundle', 'pro') AND revoked_at IS NULL
)
SELECT p.event_name, p.content_id,
       COUNT(DISTINCT p.user_id)                                        AS signed_up_after_viewing,
       COUNT(DISTINCT p.user_id) FILTER (WHERE b.user_id IS NOT NULL)   AS later_paid,
       ROUND(100.0 * COUNT(DISTINCT p.user_id) FILTER (WHERE b.user_id IS NOT NULL)
             / NULLIF(COUNT(DISTINCT p.user_id), 0), 1)                 AS paid_pct
FROM pre p LEFT JOIN buyers b ON b.user_id = p.user_id
WHERE p.event_name IN ('course_view', 'article_view', 'pricing_viewed')
GROUP BY 1, 2 ORDER BY signed_up_after_viewing DESC LIMIT 30;
```
Which course/article pages precede accounts that go on to pay. Only visitors who later signed up appear (the stitch is made at login); pure anonymous volume stays in OTel / GA4. Org members are excluded by design — their pre-login browsing is never linked.

---

## 4. Learning: courses, lessons, videos, exams

Mirrored by `GET /reporting/utilization`, `GET /reporting/courses/:id/funnel`, `GET /reporting/cohorts` → **Courses** tab.

```sql
-- Q4.1  Utilization by course   → Courses table
SELECT c.id AS course_id, c.title,
       COUNT(*)                                          AS entitled,
       COUNT(*) FILTER (WHERE eu.started_at IS NOT NULL) AS started,
       COUNT(*) FILTER (WHERE eu.activated)              AS activated,
       COUNT(*) FILTER (WHERE eu.status = 'COMPLETED')   AS completed,
       ROUND(percentile_cont(0.5) WITHIN GROUP (ORDER BY eu.pct_complete)) AS median_pct,
       ROUND(AVG(eu.minutes_engaged))                    AS avg_minutes,
       ROUND(AVG(eu.videos_completed), 1)                AS avg_videos_completed,
       ROUND(AVG(eu.best_score))                         AS avg_best_score
FROM v_entitlement_utilization eu JOIN courses c ON c.id = eu.course_id
GROUP BY 1, 2 ORDER BY entitled DESC;
```

```sql
-- Q4.2  Lesson funnel for one course — where learners stop   → Courses "Lesson funnel"
--       :course_id
-- Completed = unit_statuses COMPLETED (CTA / passed quiz / kebab).
-- Quiz passed is live from exam_attempt_history (not the nightly view).
SELECT f.unit_ref, repeat('  ', f.depth) || f.title AS lesson, f.has_video,
       f.entitled, f.viewed, f.completed, f.video_completed, f.median_minutes,
       COALESCE(q.quiz_passed, 0) AS quiz_passed,
       ROUND(100.0 * f.viewed    / NULLIF(f.entitled, 0)) AS viewed_pct,
       ROUND(100.0 * f.completed / NULLIF(f.entitled, 0)) AS completed_pct
FROM v_course_funnel f
LEFT JOIN (
  SELECT ref AS unit_ref, COUNT(DISTINCT h.user_id) AS quiz_passed
  FROM exam_attempt_history h
  JOIN exams e ON e.id = h.exam_id
  CROSS JOIN LATERAL unnest(
    CASE WHEN COALESCE(cardinality(h.scope_refs), 0) > 0
         THEN h.scope_refs
         ELSE COALESCE(e.scope_refs, '{}'::varchar[]) END
  ) AS ref
  WHERE h.course_id = :course_id AND h.score >= 70
  GROUP BY 1
) q ON q.unit_ref = f.unit_ref
WHERE f.course_id = :course_id ORDER BY f.path;
```
*Reads:* the first unit where `viewed_pct` drops by more than ~20 points from the previous one is the drop-off lesson. `median_minutes` far above neighbours = too long or confusing; far below with low `video_completed` = people skip the video.

```sql
-- Q4.3  Video watch quality per unit (are they watching or scrubbing?)   → course content review
--       :course_id
SELECT vp.unit_ref, cu.title,
       COUNT(*)                                   AS viewers,
       COUNT(*) FILTER (WHERE vp.completed)       AS completed,
       ROUND(AVG(vp.percent_watched))             AS avg_pct_watched,
       ROUND(percentile_cont(0.5) WITHIN GROUP (ORDER BY vp.percent_watched)) AS median_pct_watched,
       ROUND(AVG(vp.play_count), 1)               AS avg_plays,
       MAX(vp.duration_seconds)                   AS duration_s
FROM video_progress vp
LEFT JOIN course_units cu ON cu.course_id = vp.course_id AND cu.ref = vp.unit_ref
WHERE vp.course_id = :course_id
GROUP BY 1, 2 ORDER BY completed DESC;
```

```sql
-- Q4.4  Exam performance per course — attempts, pass rate, lesson title   → Courses "Exams"
--       :course_id
SELECT h.exam_id, e.scope, e.exam_pool, e.scope_refs,
       COALESCE(
         NULLIF((
           SELECT string_agg(COALESCE(cu.title, u.ref), ' · ' ORDER BY u.ord)
           FROM unnest(COALESCE(e.scope_refs, '{}'::varchar[])) WITH ORDINALITY AS u(ref, ord)
           LEFT JOIN course_units cu ON cu.course_id = :course_id AND cu.ref = u.ref
         ), ''),
         CASE e.scope WHEN 'full_course' THEN 'Full course' ELSE e.scope END
       ) AS title,
       COUNT(*) AS attempts, COUNT(DISTINCT h.user_id) AS users,
       ROUND(AVG(h.score)) AS avg_score,
       ROUND(100.0 * COUNT(*) FILTER (WHERE h.score >= 70) / COUNT(*)) AS pass_pct,
       ROUND(AVG(h.attempt_no), 1) AS avg_attempt_no,
       ROUND(AVG(h.score) FILTER (WHERE h.attempt_no = 1)) AS first_try_avg,
       MAX(h.submitted_at) AS last_submitted_at
FROM exam_attempt_history h JOIN exams e ON e.id = h.exam_id
WHERE h.course_id = :course_id
GROUP BY 1, 2, 3, 4 ORDER BY attempts DESC;

-- Q4.4b Who took a given exam   → click a Courses "Exams" row
--       :course_id, :exam_id
SELECT h.user_id, u.username, u.email, h.attempt_no, h.score, h.submitted_at,
       (h.score >= 70) AS passed, h.section_breakdown
FROM exam_attempt_history h JOIN users u ON u.id = h.user_id
WHERE h.course_id = :course_id AND h.exam_id = :exam_id
ORDER BY h.submitted_at DESC;
```

```sql
-- Q4.5  Weakest units/lessons across all attempts
--       section_breakdown = [{unit_ref, sub_unit_ref, unit_title, sub_unit_title, correct, total, score_percent}, …]
--       :course_id   → curriculum priorities
SELECT COALESCE(s->>'sub_unit_ref', s->>'unit_ref', 'cross-section') AS unit_ref,
       COALESCE(s->>'sub_unit_title', s->>'unit_title')              AS title,
       SUM((s->>'correct')::int) AS correct,
       SUM((s->>'total')::int)   AS total,
       ROUND(100.0 * SUM((s->>'correct')::int) / NULLIF(SUM((s->>'total')::int), 0)) AS pct_correct
FROM exam_attempt_history h, jsonb_array_elements(h.section_breakdown) s
WHERE h.course_id = :course_id AND h.submitted_at >= now() - interval '180 days'
GROUP BY 1, 2 HAVING SUM((s->>'total')::int) >= 20
ORDER BY pct_correct ASC;

-- Same thing from the event stream (one row per section per attempt): event exam_category_scored,
-- properties {exam_id, attempt_no, unit_ref, unit_title, correct, total, score_percent}.
```

```sql
-- Q4.6  Cohorts by month of first access × source   → Courses "Cohorts"
SELECT cohort_month, primary_source, entitled, activated,
       ROUND(100.0 * activated / NULLIF(entitled, 0)) AS activation_pct,
       completed, stalled, second_purchase_users, refunded_users, avg_pct_complete
FROM v_cohort_retention ORDER BY cohort_month DESC, primary_source;
```

```sql
-- Q4.7  Time to value — days from access to first unit and to completion (paid)   → Courses footnote
SELECT primary_source,
       ROUND(percentile_cont(0.5) WITHIN GROUP (ORDER BY u.days_to_first_unit), 1) AS median_days_to_first_unit,
       ROUND(percentile_cont(0.5) WITHIN GROUP (ORDER BY u.days_to_complete), 1)   AS median_days_to_complete,
       COUNT(*) FILTER (WHERE u.days_to_complete IS NOT NULL) AS completers
FROM v_entitlement_utilization eu
JOIN v_user_course_usage u USING (user_id, course_id)
GROUP BY 1 ORDER BY 1;
```

```sql
-- Q4.8  Weekly activation trend   → Overview sparkline; GET /reporting/activation?days=
--       :days = 90
SELECT date_trunc('week', first_entitled_at)::date AS week, primary_source,
       COUNT(*) AS entitled, COUNT(*) FILTER (WHERE activated) AS activated,
       ROUND(100.0 * COUNT(*) FILTER (WHERE activated) / NULLIF(COUNT(*), 0)) AS activation_pct
FROM v_entitlement_utilization
WHERE first_entitled_at >= now() - (:days || ' days')::interval
GROUP BY 1, 2 ORDER BY 1, 2;
```

---

## 5. Engagement over time (rollup + live)

```sql
-- Q5.1  Company daily engagement, last 30 days (rollup for past days + live today)   → Activity
SELECT day, ROUND(SUM(minutes_engaged) / 60.0, 1) AS hours, COUNT(DISTINCT user_id) AS active_users,
       SUM(lessons_viewed) AS lessons, SUM(videos_completed) AS videos, SUM(units_completed) AS units, SUM(exams_submitted) AS exams
FROM product_events_daily
WHERE day >= CURRENT_DATE - 30 AND day < CURRENT_DATE
GROUP BY 1
UNION ALL
SELECT CURRENT_DATE,
       ROUND(COUNT(*) FILTER (WHERE event_name = 'lesson_heartbeat') * 0.5 / 60.0, 1),
       COUNT(DISTINCT user_id),
       COUNT(*) FILTER (WHERE event_name = 'lesson_viewed'),
       COUNT(*) FILTER (WHERE event_name = 'video_completed'),
       COUNT(*) FILTER (WHERE event_name = 'unit_completed'),
       COUNT(*) FILTER (WHERE event_name = 'exam_submitted')
FROM product_events
WHERE occurred_at >= CURRENT_DATE AND user_id IS NOT NULL
ORDER BY 1;
```

```sql
-- Q5.2  Event volume by name, last 7 days — sanity check that instrumentation is alive   → health appendix
SELECT event_name, COUNT(*) AS n, COUNT(DISTINCT user_id) AS users, MAX(occurred_at) AS last_seen
FROM product_events WHERE occurred_at >= now() - interval '7 days'
GROUP BY 1 ORDER BY n DESC;
```

```sql
-- Q5.3  Hour-of-day / day-of-week heat (when do learners study?) — last 90 days   → scheduling emails / live sessions
SELECT EXTRACT(dow FROM occurred_at) AS dow, EXTRACT(hour FROM occurred_at) AS hour,
       ROUND(COUNT(*) * 0.5) AS minutes
FROM product_events
WHERE event_name = 'lesson_heartbeat' AND occurred_at >= now() - interval '90 days'
GROUP BY 1, 2 ORDER BY 1, 2;
```

```sql
-- Q5.4  Partition inventory & sizes (capacity planning; archived partitions are gone from here)
SELECT c.relname AS partition, pg_size_pretty(pg_total_relation_size(c.oid)) AS size,
       pg_stat_get_live_tuples(c.oid) AS rows
FROM pg_inherits i JOIN pg_class c ON c.oid = i.inhrelid JOIN pg_class p ON p.oid = i.inhparent
WHERE p.relname = 'product_events' ORDER BY 1;
```

---

## 6. Manager (class) report — one organization

Everything a teacher sees, scoped by `:org_id` (and optionally `:class_id`). API equivalents under `GET /organizations/:id/…` are guarded by `OrgManagerGuard`; the CSV is `GET /organizations/:id/progress/export.csv`.

```sql
-- Q6.1  Roster progress — one row per student × assigned course   → manager Course Progress table / CSV
--       :org_id, optional :class_id
SELECT u.username, u.first_name, u.last_name, m.class_id, c.title AS course,
       COALESCE(p.status, 'NOT_STARTED') AS status,
       p.units_completed, p.units_total,
       CASE WHEN p.units_total > 0 THEN ROUND(100.0 * p.units_completed / p.units_total) END AS pct,
       p.created_at AS started_at, p.completed_at, p.last_activity_at,
       COALESCE(d.minutes_7d, 0) AS minutes_7d,
       COALESCE(v.videos_completed, 0) AS videos_completed,
       (SELECT COUNT(*) FROM course_units cu WHERE cu.course_id = c.id AND cu.has_video) AS videos_total,
       COALESCE(x.exams_taken, 0) AS exams_taken, x.latest_score
FROM organization_members m
JOIN users u ON u.id = m.user_id
JOIN organization_courses oc ON oc."organizationsId" = m.organization_id
JOIN courses c ON c.id = oc."coursesId"
LEFT JOIN progress p ON p."userId" = u.id AND p."courseId" = c.id
LEFT JOIN LATERAL (SELECT SUM(minutes_engaged) AS minutes_7d FROM product_events_daily d
                   WHERE d.user_id = u.id AND d.course_id = c.id AND d.day >= CURRENT_DATE - 7) d ON true
LEFT JOIN LATERAL (SELECT COUNT(*) FILTER (WHERE completed) AS videos_completed FROM video_progress vp
                   WHERE vp.user_id = u.id AND vp.course_id = c.id) v ON true
LEFT JOIN LATERAL (SELECT COUNT(*) AS exams_taken, (ARRAY_AGG(score ORDER BY submitted_at DESC))[1] AS latest_score
                   FROM exam_attempt_history h WHERE h.user_id = u.id AND h.course_id = c.id) x ON true
WHERE m.organization_id = :org_id AND m.role = 'member'
  AND (:class_id IS NULL OR m.class_id = :class_id)
ORDER BY c.title, u.last_name, u.username;
```

```sql
-- Q6.2  Lesson grid — unit × student status + video % for one course   → manager "Lesson grid"
--       :org_id, :course_id
SELECT u.username, cu.ref AS unit_ref, cu.title, cu.depth,
       COALESCE(p.unit_statuses->>cu.ref, 'NOT_STARTED') AS status,
       (p.unit_completed_at->>cu.ref)::timestamptz       AS completed_at,
       vp.percent_watched, vp.completed AS video_done
FROM organization_members m
JOIN users u ON u.id = m.user_id
CROSS JOIN course_units cu
LEFT JOIN progress p ON p."userId" = u.id AND p."courseId" = cu.course_id
LEFT JOIN video_progress vp ON vp.user_id = u.id AND vp.course_id = cu.course_id AND vp.unit_ref = cu.ref
WHERE m.organization_id = :org_id AND m.role = 'member' AND cu.course_id = :course_id
ORDER BY u.username, cu.path;
```

```sql
-- Q6.3  Class engagement per student over a window   → manager Overview "Students"; GET /organizations/:id/engagement?days=
--       :org_id, :days
SELECT u.username, m.class_id,
       ROUND(SUM(d.minutes_engaged)) AS minutes, COUNT(DISTINCT d.day) AS active_days,
       SUM(d.lessons_viewed) AS lessons_viewed, SUM(d.videos_completed) AS videos_completed,
       SUM(d.units_completed) AS units_completed, SUM(d.exams_submitted) AS exams_submitted,
       MAX(p.last_activity_at) AS last_activity_at
FROM organization_members m
JOIN users u ON u.id = m.user_id
LEFT JOIN product_events_daily d ON d.user_id = u.id AND d.organization_id = m.organization_id
                                 AND d.day >= CURRENT_DATE - :days
LEFT JOIN progress p ON p."userId" = u.id
WHERE m.organization_id = :org_id AND m.role = 'member'
GROUP BY 1, 2 ORDER BY minutes DESC NULLS LAST;
```

```sql
-- Q6.4  Class time per day (chart)   → manager Overview bars
--       :org_id, :days
SELECT day, ROUND(SUM(minutes_engaged)) AS minutes, COUNT(DISTINCT user_id) AS active_members
FROM product_events_daily
WHERE organization_id = :org_id AND day >= CURRENT_DATE - :days
GROUP BY 1 ORDER BY 1;
```

```sql
-- Q6.5  Stalled students — started, nothing in 14 days   → manager Overview "stalled" badge; nudge list
--       :org_id
SELECT u.username, u.email, c.title, p.units_completed, p.units_total, p.last_activity_at
FROM organization_members m
JOIN users u ON u.id = m.user_id
JOIN progress p ON p."userId" = u.id
JOIN organization_courses oc ON oc."organizationsId" = m.organization_id AND oc."coursesId" = p."courseId"
JOIN courses c ON c.id = p."courseId"
WHERE m.organization_id = :org_id AND m.role = 'member'
  AND p.status <> 'COMPLETED' AND p.last_activity_at < now() - interval '14 days'
ORDER BY p.last_activity_at;
```

```sql
-- Q6.8  One student's quiz gradebook (self-serve + class exams)   → manager student panel "Quizzes"
--       :org_id, :user_id
SELECT COALESCE(cu.title, h.scope_refs[1], h.scope) AS lesson,
       COUNT(*) AS tries,
       MIN(h.score) FILTER (WHERE h.attempt_no = 1) AS first,  -- approx; use ORDER BY submitted_at in app
       MAX(h.score) AS best,
       (ARRAY_AGG(h.score ORDER BY h.submitted_at DESC))[1] AS latest,
       BOOL_OR(h.score >= 70) AS passed,
       MAX(h.submitted_at) AS last_submitted_at
FROM exam_attempt_history h
JOIN organization_members m ON m.user_id = h.user_id AND m.organization_id = :org_id
LEFT JOIN course_units cu ON cu.course_id = h.course_id AND cu.ref = h.scope_refs[1]
WHERE h.user_id = :user_id
GROUP BY 1 ORDER BY last_submitted_at DESC;

-- Attempt log (weak sections live on section_breakdown)
SELECT submitted_at, score, attempt_no, scope_refs, section_breakdown
FROM exam_attempt_history WHERE user_id = :user_id ORDER BY submitted_at DESC;
```
*Reads:* **passing** = best ≥70; **trying** = failing but active this week; **struggling** = 2+ tries, score not going up; **stopped** = failed then quiet; **browsing** = in the course, no quiz; **not_trying** = quiet, no quiz. Started-not-submitted uses `exam_started` vs `exam_submitted` in `product_events` (reliable only after 2026-09-15 client emit).

```sql
-- Q6.6  One student's learning timeline (30 d, no heartbeats)   → manager activity panel; GET /organizations/:id/members/:userId/timeline
--       :org_id, :user_id
SELECT pe.occurred_at, pe.event_name, c.title AS course, pe.unit_ref, cu.title AS unit, pe.properties
FROM product_events pe
LEFT JOIN courses c ON c.id = pe.course_id
LEFT JOIN course_units cu ON cu.course_id = pe.course_id AND cu.ref = pe.unit_ref
WHERE pe.user_id = :user_id AND pe.organization_id = :org_id
  AND pe.occurred_at >= now() - interval '30 days' AND pe.event_name <> 'lesson_heartbeat'
ORDER BY pe.occurred_at DESC LIMIT 100;
```

```sql
-- Q6.7  Org summary card   → manager Overview stats; GET /organizations/:id/utilization (live version of v_org_utilization)
--       :org_id
SELECT * FROM v_org_utilization WHERE organization_id = :org_id;
```

---

## 7. Signals → offer queues

Each list is a queue for one action in [`docs/sales/money-model.md`](../sales/money-model.md). Mirrored by `GET /reporting/signals` → **Signals** tab (rows open the user 360). Cap to 100 and hand to a human — never auto-send.

```sql
-- Q7.1  Stalled paid learners → nudge / coaching offer
SELECT eu.user_id, u.username, u.email, c.title, eu.primary_source, eu.first_entitled_at, eu.last_activity_at, eu.pct_complete
FROM v_entitlement_utilization eu JOIN users u ON u.id = eu.user_id JOIN courses c ON c.id = eu.course_id
WHERE eu.primary_source IN ('purchase','bundle','pro')
  AND eu.first_entitled_at < now() - interval '7 days'
  AND (eu.last_activity_at IS NULL OR eu.last_activity_at < now() - interval '14 days')
  AND eu.status <> 'COMPLETED'
ORDER BY eu.first_entitled_at DESC LIMIT 100;
```

```sql
-- Q7.2  Completed the course, never bought hardware → kit / parts upsell
SELECT eu.user_id, u.username, u.email, c.title, eu.completed_at
FROM v_entitlement_utilization eu
JOIN users u ON u.id = eu.user_id JOIN courses c ON c.id = eu.course_id
LEFT JOIN v_user_revenue r ON r.user_id = eu.user_id
WHERE eu.status = 'COMPLETED' AND (r.user_id IS NULL OR r.hardware_cents = 0)
  AND eu.completed_at >= now() - interval '90 days'
ORDER BY eu.completed_at DESC LIMIT 100;
```

```sql
-- Q7.3  Pro at risk → save / downsell to single course
SELECT e.user_id, u.username, u.email, e.ends_at,
       (SELECT COUNT(*) FROM product_events pe WHERE pe.user_id = e.user_id AND pe.event_name = 'pro_payment_failed'
          AND pe.occurred_at >= now() - interval '30 days') AS failed_30d,
       (SELECT MAX(p.last_activity_at) FROM progress p WHERE p."userId" = e.user_id) AS last_activity_at
FROM entitlements e JOIN users u ON u.id = e.user_id
WHERE e.course_id IS NULL AND e.revoked_at IS NULL
  AND (e.ends_at < now() + interval '14 days'
       OR EXISTS (SELECT 1 FROM product_events pe WHERE pe.user_id = e.user_id
                    AND pe.event_name IN ('pro_payment_failed','pro_cancel_scheduled')
                    AND pe.occurred_at >= now() - interval '30 days')
       OR NOT EXISTS (SELECT 1 FROM progress p WHERE p."userId" = e.user_id
                        AND p.last_activity_at >= now() - interval '21 days'))
ORDER BY e.ends_at LIMIT 100;
```

```sql
-- Q7.4  Low-utilization organizations → manager check-in before renewal
SELECT organization_id, name, seats_purchased, members, members_engaged_30d, utilization_pct_30d,
       invites_sent, invites_redeemed, manager_last_seen_at
FROM v_org_utilization WHERE members = 0 OR utilization_pct_30d < 40
ORDER BY utilization_pct_30d, name;
```

```sql
-- Q7.5  Engaged free users (grant / signup link / trial, ≥ 60 min, never paid) → convert
SELECT eu.user_id, u.username, u.email, c.title, eu.primary_source, eu.minutes_engaged, eu.pct_complete
FROM v_entitlement_utilization eu JOIN users u ON u.id = eu.user_id JOIN courses c ON c.id = eu.course_id
WHERE eu.primary_source IN ('admin_grant','signup_link','trial') AND eu.minutes_engaged >= 60
  AND NOT EXISTS (SELECT 1 FROM v_user_revenue r WHERE r.user_id = eu.user_id AND r.net_cents > 0)
ORDER BY eu.minutes_engaged DESC LIMIT 100;
```

```sql
-- Q7.6  Hot-streak learners (≥ 4 active days in 7, B2C) → Pro / next-course offer while motivated
SELECT d.user_id, u.username, SUM(d.minutes_engaged)::int AS minutes_7d, COUNT(DISTINCT d.day) AS active_days_7d
FROM product_events_daily d JOIN users u ON u.id = d.user_id
WHERE d.day >= CURRENT_DATE - 7 AND d.organization_id IS NULL
GROUP BY 1, 2 HAVING COUNT(DISTINCT d.day) >= 4
ORDER BY minutes_7d DESC LIMIT 50;
```

```sql
-- Q7.7  Pro subscribers who only use one course → downsell candidates ("save them money", builds trust)
SELECT eu.user_id, u.username, u.email,
       COUNT(*) FILTER (WHERE eu.started_at IS NOT NULL) AS courses_touched,
       MAX(eu.pct_complete) AS max_pct, r.active_mrr_cents / 100.0 AS mrr_usd
FROM v_entitlement_utilization eu JOIN users u ON u.id = eu.user_id
LEFT JOIN v_user_revenue r ON r.user_id = eu.user_id
WHERE eu.primary_source = 'pro' AND eu.first_entitled_at < now() - interval '60 days'
GROUP BY 1, 2, 3, r.active_mrr_cents
HAVING COUNT(*) FILTER (WHERE eu.started_at IS NOT NULL) <= 1
ORDER BY mrr_usd DESC;
```

---

## 8. Pro subscription

Mirrored by `GET /reporting/pro?months=` → **Pro** tab.

```sql
-- Q8.1  Lifecycle events by month   → Pro "Lifecycle"   (:months = 12)
SELECT date_trunc('month', occurred_at)::date AS month,
       COUNT(*) FILTER (WHERE event_name = 'pro_started')        AS started,
       COUNT(*) FILTER (WHERE event_name = 'pro_renewed')        AS renewed,
       COUNT(*) FILTER (WHERE event_name = 'pro_cancel_scheduled') AS cancel_scheduled,
       COUNT(*) FILTER (WHERE event_name = 'pro_cancelled')      AS cancelled,
       COUNT(*) FILTER (WHERE event_name = 'pro_expired')        AS expired,
       COUNT(*) FILTER (WHERE event_name = 'pro_payment_failed') AS payment_failed
FROM product_events
WHERE event_name LIKE 'pro_%' AND occurred_at >= date_trunc('month', now()) - (:months || ' months')::interval
GROUP BY 1 ORDER BY 1;
```

```sql
-- Q8.2  Retention by start month   → Pro "Retention"
SELECT date_trunc('month', starts_at)::date AS cohort_month,
       COUNT(*) AS started,
       COUNT(*) FILTER (WHERE revoked_at IS NULL AND (ends_at IS NULL OR ends_at > now())) AS still_active,
       COUNT(*) FILTER (WHERE revoke_reason = 'cancelled') AS cancelled,
       COUNT(*) FILTER (WHERE revoke_reason = 'expired')   AS expired,
       ROUND(AVG(EXTRACT(EPOCH FROM (COALESCE(revoked_at, now()) - starts_at)) / 2629800.0), 1) AS avg_months
FROM entitlements WHERE course_id IS NULL GROUP BY 1 ORDER BY 1;
```

```sql
-- Q8.3  Active Pro right now, yearly share, MRR   → Pro cards
SELECT COUNT(*) AS active, COUNT(*) FILTER (WHERE product_sku = 'PRO_YEARLY') AS yearly,
       (SELECT SUM(active_mrr_cents) / 100.0 FROM v_user_revenue) AS mrr_usd
FROM entitlements WHERE course_id IS NULL AND revoked_at IS NULL AND (ends_at IS NULL OR ends_at > now());
```

---

## 9. One user (user 360)

Mirrored by `GET /reporting/users/:id` → drawer in admin **Users** and **Signals**.

```sql
-- Q9.1  :user_id
SELECT e.*, c.title FROM entitlements e LEFT JOIN courses c ON c.id = e.course_id WHERE e.user_id = :user_id ORDER BY e.starts_at DESC;
SELECT u.*, c.title FROM v_user_course_usage u JOIN courses c ON c.id = u.course_id WHERE u.user_id = :user_id;
SELECT * FROM v_user_revenue WHERE user_id = :user_id;
SELECT o.*, (SELECT json_agg(oi) FROM order_items oi WHERE oi.order_id = o.id) AS items FROM orders o WHERE o.user_id = :user_id ORDER BY placed_at DESC;
SELECT unit_ref, position_seconds, duration_seconds, percent_watched, completed, play_count, last_played_at
FROM video_progress WHERE user_id = :user_id ORDER BY last_played_at DESC;
SELECT occurred_at, event_name, course_id, unit_ref, properties FROM product_events
WHERE user_id = :user_id AND event_name <> 'lesson_heartbeat' AND occurred_at >= now() - interval '90 days'
ORDER BY occurred_at DESC LIMIT 100;
```

---

## 10. Snapshot report recipe

When asked for "a dashboard snapshot / PDF / weekly report", run in this order and lay out as numbered sections. Each item names the query and the API route that returns the same data (prefer the API when the backend is reachable — it applies the same filters and is admin-guarded).

| # | Section | Query | API |
|---|---|---|---|
| 0 | Cover: data freshness, reconciliation status | Q0.1, Q0.2 | `GET /reporting/health` |
| 1 | Five headline numbers | Q2.1 – Q2.5 | `GET /reporting/overview` |
| 2 | Activity pulse + by access source | Q2.6, Q2.7 | `GET /reporting/overview` |
| 3 | Revenue: monthly, SKU, payment method, refunds | Q3.1, Q3.2, Q3.3, Q3.5 | `GET /reporting/revenue?months=12` |
| 4 | Courses: utilization table, then the funnel for the top course | Q4.1, Q4.2, Q4.4 | `GET /reporting/utilization`, `GET /reporting/courses/:id/funnel` |
| 5 | Cohorts + time to value | Q4.6, Q4.7 | `GET /reporting/cohorts` |
| 6 | Engagement: 30-day daily chart | Q5.1 | — |
| 7 | Organizations table | Q2.5 | `GET /reporting/organizations` |
| 8 | Pro: cards, lifecycle, retention | Q8.3, Q8.1, Q8.2 | `GET /reporting/pro` |
| 9 | Signal queues (counts only in a shareable PDF; names in the internal version) | Q7.1 – Q7.7 | `GET /reporting/signals` |
| A | Appendix: event volume, partitions | Q5.2, Q5.4 | `GET /reporting/health` |

Per-organization (manager) report: Q6.7 → Q6.4 → Q6.3 → Q6.1 → Q6.5, plus Q6.2 for each assigned course. CSV of Q6.1 is `GET /organizations/:id/progress/export.csv`.

Formatting rules for the snapshot: money in USD with two decimals from `*_cents / 100.0`; percentages as integers; always print the `views_refreshed_at` timestamp next to any view-derived number; never blend digital and hardware revenue into one figure; state the window (7 d / 30 d / 90 d / all-time) in every heading.

---

## 11. Interpreting common patterns

| Pattern | Likely meaning | Next query |
|---|---|---|
| Activation < 60 %, but median utilization among activated learners is high | Onboarding problem, not content | Q4.2 on the first two units; Q4.8 weekly trend |
| `org_seat` completion ≪ `purchase` completion | Teachers assigned, students never told | Q7.4; `invites_redeemed / invites_sent` in Q2.5 |
| `pro` learners touch ≤ 1 course | Pro sold as "safe choice", not for breadth | Q7.7 (downsell list) |
| High `viewed`, low `video_completed` on a unit | Video skipped or too long | Q4.3 `median_pct_watched`, `duration_s` |
| Refund rate rising on a SKU | Expectation mismatch on the sales page | Q3.2 `refund_pct`, Q3.5 |
| `events_24h` = 0 while `active_7d` > 0 | Frontend batching broken or `/analytics/event` throttled | Q5.2; backend logs for `UserThrottlerGuard` |
| Reconciliation mismatches > 0 | A grant path bypassed `EntitlementService` | Q0.2 `detail`; grep the path in `purchase-flows.md` |

*Update this file whenever a view, table, or reporting endpoint changes — the SQL here is what agents run when asked for a report.*
