# Observability — Grafana Cloud (free tier) alerts, dashboards, capacity

Canonical reference for what the API exports to Grafana Cloud, what alert rules
and panels must exist there, and how much of the **free tier** we use.
Owner action items are tracked as **PA39** in [`TODO.md`](../TODO.md).

Related: [`architecture.md`](architecture.md) § Observability & ops (CloudWatch
side), [`analytics-implementation-plan.md`](analytics-implementation-plan.md)
§ 12 (why these metrics exist), [`analytics-queries.md`](analytics-queries.md)
Q0.3 (same signals from SQL), [`backend-data.md`](backend-data.md) § Cross-cutting.

---

## 1. What is exported today

| Stream | Path | Status |
|--------|------|--------|
| **Metrics** | `backend/src/telemetry.ts` → `PeriodicExportingMetricReader` (30 s) → OTLP http/protobuf → `otlp-gateway-prod-us-east-2.grafana.net/otlp` → Grafana Cloud Metrics (Mimir) | Live in prod |
| **Traces** | Same SDK → Grafana Cloud Traces (Tempo). Auto-instrumentation: http, express, pg, nestjs-core, runtime-node (fs/dns/net/grpc disabled) | Live in prod |
| **Logs** | Winston → CloudWatch `/ecs/droneedge-dev/api-server` only. **Not** shipped to Loki | CloudWatch only |
| **Host metrics** | `nestjs-otel` `hostMetrics: true` (cpu, memory, network per interface) | Live |
| **Frontend** | Nothing (no Faro / Frontend Observability). Product analytics go to Postgres via `/analytics/event` | — |

Auth: `OTEL_EXPORTER_OTLP_HEADERS` from Secrets Manager `droneedge-dev-grafana-otel-headers`.
Grafana-side, OTLP metric names are translated to Prometheus style:
`product_events.accepted` → `product_events_accepted_total`, `analytics.maintenance.step_ms`
→ `analytics_maintenance_step_ms_milliseconds_{bucket,sum,count}`,
`analytics.reconcile.mismatches` → `analytics_reconcile_mismatches`. Resource
attributes surface as `job="droneedge"` / `service_name="droneedge"`. Confirm the
exact names in **Explore → Metrics browser** before saving a rule — the gateway's
suffix rules changed twice in 2025.

### Custom instruments (meter `droneedge`)

| Instrument | Type | Labels (bounded) | Emitted by |
|------------|------|------------------|------------|
| `product_events.accepted` | counter | `source` = `browser` \| `server` | `ProductEventsService` |
| `product_events.dropped` | counter | `reason` = `invalid` \| `anonymous` \| `course_scoped_anonymous` \| `no_access` \| `identify_skipped` | `ProductEventsService` |
| `product_events.failures` | counter | `stage` = `batch` \| `insert` \| `video_progress` \| `progress_touch` \| `server` | `ProductEventsService`, `AnalyticsController` |
| `orders.record_failures` | counter | — | `PurchaseService.recordCourseOrder` |
| `entitlements.write_failures` | counter | `op` = `grantCourse` \| `syncPro` \| `revokeCourse` \| `revokeByOrderItems` \| `revokePro` | `EntitlementService` — grants also rethrow while `ENTITLEMENTS_AUTHORITATIVE=true` |
| `analytics.maintenance.step_ms` | histogram (ms) | `step`, `status` = `ok` \| `error` | `AnalyticsMaintenanceService` |
| `analytics.maintenance.failures` | counter | `step` | same |
| `analytics.maintenance.lock_skipped` | counter | — | same (a second instance hit the advisory lock) |
| `analytics.reconcile.mismatches` | gauge | `check` (7 fixed names, see `backend-data.md`) | same, refreshed nightly |
| `page.view` | counter | `route` (template, e.g. `/courses/:id/units/:id`), `channel` = `direct` \| `internal` \| `search` \| `social` \| `other` | `AnalyticsService` |
| `article.view`, `course.view` | counter | `article_id` / `course_id` (catalog-bounded) | `AnalyticsService` |
| `auth.login`, `auth.login_failed`, `auth.token_refresh`, `auth.registration` | counter | — | `AnalyticsService` |

Auto-instrumentation adds `http_server_duration_*` (labels `http_method`,
`http_status_code`, `http_route`, `net_host_name`, …), `db_client_*` (pg pool),
and `nodejs_*` / `process_*` runtime series.

### Cardinality rules (enforced in code review)

Grafana bills and caps on **active series**, not on data points. One label with
1 000 distinct values on a 16-bucket histogram is 16 000 series — more than the
whole free allowance. Therefore:

- Never put `user_id`, `username`, `email`, `title`, raw `path`, raw `referrer`,
  `anonymous_id`, `organization_id`, or request ids on a metric label. Those
  dimensions belong in `product_events` / `audit_log` and are queried with SQL.
- New labels must have a **closed, documented value set** (add a row above).
- Route labels use the template (`routeTemplate()` in `analytics.service.ts`);
  Express instrumentation already gives `http_route` as the template.
- 2026-09-12: `page.view{path,referrer}`, `article.view{title}`, `course.view{title}`,
  `auth.*{user_id,username}` were collapsed for this reason — those labels were
  the one real threat to the 10k cap.

---

## 2. Free-tier capacity (verified 2026-09-12 on grafana.com/pricing)

| Resource | Free allowance | Retention | Our estimate | Headroom |
|----------|----------------|-----------|--------------|----------|
| Metrics | **10 000 active series** | 14 days | `http_server_duration` ≈ 90 routes × ~3 status codes × 18 series ≈ **4 500–5 500**; host + runtime ≈ 150; custom ≈ 120 (`page.view` ≈ 40 routes × 5 channels dominates) → **≈ 5–6k** | ~45 % — OK, but the HTTP histogram is the thing to watch |
| Logs | 50 GB / month | 14 days | 0 (not shipped) | Full |
| Traces | 50 GB / month | 14 days | ~150 KB per traced request at 100 % sampling; 30 users ≈ <1 GB/mo; 1 000 users ≈ 10–20 GB/mo | OK to ~1 000 active users; add head sampling (`OTEL_TRACES_SAMPLER=parentbased_traceidratio`, `OTEL_TRACES_SAMPLER_ARG=0.2`) before that |
| Alerting / IRM | Included; **3 active users** for IRM/OnCall | — | 1 (admin email) | OK |
| Users | 3 active | — | 1–2 | OK |
| Frontend Observability (Faro) | 50k sessions / month | 14 days | 0 today | Optional; would cover web-vitals + JS errors if ever wanted |
| Synthetics | 100k executions / month | — | 0 today | 1 HTTP check every 5 min on `/api/health` from 2 probes ≈ 17k/mo — fits, see § 4 |

**Verdict:** the free tier is sufficient for ops alerting at the current and
12-month projected scale, provided (a) no high-cardinality labels are added and
(b) traces get head sampling somewhere past a few hundred active users.
Business analytics (funnels, utilization, cohorts) do **not** depend on Grafana
retention — they live in Postgres and are read through `/reporting/*` and
`analytics-queries.md`, so 14-day metric retention is not a constraint.

What would force **Pro ($19/mo platform fee + usage)**: >10k series that we cannot
reduce (e.g. a per-org label — do not), wanting 13-month metric history in Grafana
instead of SQL, or wanting Loki logs with >14 d retention. None is on the roadmap.

### Check actual usage (do this first)

1. Grafana Cloud portal → stack → **Cost management & billing → Usage** (active
   series, DPM, traces GB).
2. Or Explore → data source `grafanacloud-usage`:
   `grafanacloud_instance_active_series`, `grafanacloud_instance_samples_per_second`,
   `grafanacloud_traces_instance_bytes_received_per_second`.
3. Top offenders: `topk(20, count by (__name__) ({job="droneedge"}))`.
4. Add a usage alert at 8 000 series (Billing → **Usage alerts**) so a regression
   is caught before Grafana starts discarding series (it rate-limits, it does not bill, on Free).

---

## 3. Alert rules to add (Grafana Alerting → Alert rules)

All rules: data source = the stack's Prometheus, evaluation group `droneedge-api`,
interval 1 m, labels `team=core`, contact point **`admin-email`** (see § 4).
`for` is the pending period. Expressions assume the translated names above —
adjust after checking Explore.

| # | Rule | Expression (Prometheus) | `for` | Severity | Why / action |
|---|------|--------------------------|-------|----------|--------------|
| A1 | **Analytics ingest failing** | `sum(increase(product_events_failures_total[15m])) > 0` | 5 m | warning | Any `stage` failure means events are being lost silently. Check API logs for `product_events` errors; if `stage=insert`, check DB / partition for the current month (`Q0.3`). |
| A2 | **Order / entitlement write failed** | `increase(orders_record_failures_total[1h]) > 0 or sum by (op) (increase(entitlements_write_failures_total[1h])) > 0` | 0 | **critical** | `orders`: a paid purchase produced no `orders` row → run `POST /purchases/admin/backfill-order` with the PaymentIntent id. `entitlements` (authoritative since PA34): a grant failure means a paying user has no access — re-run the grant (`POST /users/:id/courses`) or ask them to retry the purchase; both repair the ledger idempotently. |
| A3 | **Nightly maintenance failed** | `sum by (step) (increase(analytics_maintenance_failures_total[24h])) > 0` | 0 | critical | Views/partitions/reconciliation did not complete. `GET /reporting/health`; rerun `POST /reporting/refresh` (admin). |
| A4 | **Nightly maintenance did not run** | `absent_over_time(analytics_maintenance_step_ms_milliseconds_count[26h])` | 0 | critical | Cron did not fire (task restart loop, lock never released). Fires ~02:30 ET if 00:30 job is missing. |
| A5 | **Reconciliation gate mismatch** | `max by (check) (analytics_reconcile_mismatches{check=~"ucp_without_entitlement\|entitlement_without_ucp\|pro_user_without_entitlement\|pro_entitlement_without_user\|access_diff\|paid_grant_without_order"}) > 0` | 0 | critical | Legacy tables and `entitlements` disagree → blocks PA36; someone may have access they should not (or vice-versa). Query `reconciliation_runs` for the offending rows (`Q0.2`). |
| A6 | **No events during business hours** | `sum(increase(product_events_accepted_total[60m])) == 0 and on() (hour() >= 12 and hour() < 20) and on() (day_of_week() >= 1 and day_of_week() < 6)` | 15 m | warning | Frontend queue broken, CORS/auth regression, or nobody using the product. Hours are UTC (12–20 UTC ≈ 08–16 ET; adjust for DST twice a year or accept the drift). |
| A7 | **Stripe webhook errors** | `sum(increase(http_server_duration_milliseconds_count{http_route="/purchases/webhook",http_status_code=~"5.."}[15m])) > 0` | 0 | critical | Stripe retries for 3 days, but a 5xx means a purchase/entitlement may be unrecorded. Stripe dashboard → Webhooks → failed attempts; fix, then Stripe "resend". |
| A8 | **API 5xx rate** | `sum(rate(http_server_duration_milliseconds_count{http_status_code=~"5.."}[5m])) / sum(rate(http_server_duration_milliseconds_count[5m])) > 0.02` | 10 m | warning | General health. Pair with the ECS deploy time to spot a bad release. |
| A9 | **Course page latency** | `histogram_quantile(0.95, sum by (le) (rate(http_server_duration_milliseconds_bucket{http_route=~"/courses.*"}[10m]))) > 1500` | 15 m | warning | Learners' hot path. Usually a missing index or a view scan (see `analytics-implementation-plan.md` § 12.1). |
| A10 | **Sign-up route 5xx** | `sum(increase(http_server_duration_milliseconds_count{http_route="/auth/register",http_status_code=~"5.."}[30m])) > 0` | 0 | critical | Registration is the top of every funnel. |
| A11 | **Login failures spike** | `increase(auth_login_failed_total[10m]) > 50` | 0 | warning | Credential stuffing or a broken login form. Check source IPs in CloudWatch. |
| A12 | **Maintenance lock skipped** | `increase(analytics_maintenance_lock_skipped_total[24h]) > 0` | 0 | info | Only expected if `desired_count` > 1 or a rolling deploy overlapped 00:30 ET. Noise if it repeats → move cron off the API task (PA37). |

Not alerted on purpose: `product_events.dropped` (expected: anonymous learning
events, no-access probes) — it is a dashboard panel, not a page.

### CloudWatch already covers

NAT egress (alarm), budget ($150/mo), RDS/ECS default metrics. Do not duplicate
those in Grafana; a future step could forward ECS `RunningTaskCount` via the
CloudWatch data source (free tier includes it) for a "task restart loop" panel.

---

## 4. Contact point & delivery

- **Contact point `admin-email`** → `james@thedroneedge.com` (Alerting → Contact
  points → New → Email). Free tier email delivery is unlimited.
- **Notification policy:** default route → `admin-email`; `severity=critical`
  → repeat every 4 h; `severity=warning|info` → group by `alertname`, repeat 24 h.
- **Mute timing** `deploy-window`: 60 min after a `./pipeline.sh` run if A8/A9
  become noisy during rollouts (create only if needed).
- Optional: **Synthetic Monitoring** HTTP check on
  `https://<frontend host>/api/health` (public, unauthenticated; the ALB uses the
  same `/health`) every 5 min from 2 probes (~17k executions/mo, within 100k) →
  alerts when the API is unreachable at all, which none of the in-process
  metrics can tell us. Assert status 200 and body contains `"status":"ok"`.
  `/reporting/health` is admin-only and cannot be used here.

---

## 5. Dashboard `DroneEdge — API & analytics health`

One dashboard, 14-day time picker default 24 h. Panels (top → bottom):

1. **Ingest** — `sum by (source) (rate(product_events_accepted_total[5m]))` (stat + timeseries); `sum by (reason) (increase(product_events_dropped_total[1h]))` (bar); `sum by (stage) (increase(product_events_failures_total[1h]))` (stat, red when >0).
2. **Nightly job** — `analytics_maintenance_step_ms_milliseconds_sum / _count by (step)` (bar gauge, last run); `analytics_reconcile_mismatches by (check)` (table, threshold >0 red); last-run time = `time() - max(timestamp(analytics_maintenance_step_ms_milliseconds_count))`.
3. **Commerce** — `orders_record_failures_total` (stat); webhook request count / 5xx (A7 query without the threshold).
4. **HTTP** — RPS by `http_route` (top 10), p50/p95 latency, 5xx ratio (A8), by-route p95 table.
5. **Auth & traffic** — `auth_*_total` rates; `page_view_total by (channel)` stacked; `page_view_total by (route)` top 10; `course_view_total by (course_id)`.
6. **Runtime** — heap used, event-loop lag (`nodejs_eventloop_lag_*`), pg pool in-use (`db_client_connections_usage`), cpu %.

Export the dashboard JSON and the alert-rule group (Alert rules → **Export** →
YAML) into `docs/tech/grafana/` once created, so they can be re-imported or
migrated to the Grafana Terraform provider later. Terraform-managing Grafana is
**not** worth it at 12 rules / 1 dashboard; revisit if a second environment or a
second stack appears (`environment-split-plan.md`).

---

## 6. Runbook: creating everything (~45 min, click-ops)

1. Portal → Billing → Usage: note current active series. If > 8 000, fix
   cardinality before adding anything.
2. Explore → confirm the metric names in § 1 exist for `job="droneedge"`.
3. Alerting → Contact points → `admin-email`; send test.
4. Alerting → Notification policies → default → `admin-email`; add the
   `severity=critical` child route (repeat 4 h).
5. Alerting → Alert rules → New → folder `DroneEdge`, group `droneedge-api`
   (1 m) → create A1–A12 from § 3 (copy the expression, set `for`, labels
   `severity`, summary = rule name, description = the "Why / action" cell).
6. Dashboards → New → import panels from § 5; save under folder `DroneEdge`.
7. Billing → Usage alerts → metrics series 8 000.
8. Export rule group + dashboard JSON → `docs/tech/grafana/`; tick PA39 in
   `TODO.md` → `TODO_COMPLETED.md`.
