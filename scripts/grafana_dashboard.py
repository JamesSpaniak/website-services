#!/usr/bin/env python3
"""Build the "DroneEdge — API & Stripe health" Grafana dashboard (observability.md § 5).

    python3 scripts/grafana_dashboard.py           # create/update in Grafana + save JSON
    python3 scripts/grafana_dashboard.py --dry-run # only write docs/tech/grafana/dashboard-health.json

Reads GRAFANA_URL / GRAFANA_TOKEN (Editor service account) from
~/.config/droneedge/grafana.env. Metric and label names were checked against
the live stack on 2026-10-03 (labels are http_route / http_status_code /
http_method — not path / status / method).
"""
import json
import sys
import urllib.request
from pathlib import Path

REPO = Path(__file__).resolve().parent.parent
OUT = REPO / "docs" / "tech" / "grafana" / "dashboard-health.json"
UID = "droneedge-health"
FOLDER_UID = "droneedge-alerts"
DS = {"type": "prometheus", "uid": "grafanacloud-prom"}
S = 'service_name="droneedge"'
HTTP = f"http_server_duration_milliseconds"

panels: list[dict] = []
_y = 0
_x = 0
_id = 0


def row(title: str) -> None:
    global _y, _x, _id
    if _x:
        _y += 8
        _x = 0
    _id += 1
    panels.append({"id": _id, "type": "row", "title": title, "collapsed": False,
                   "gridPos": {"h": 1, "w": 24, "x": 0, "y": _y}, "panels": []})
    _y += 1


def panel(kind: str, title: str, targets: list[tuple[str, str]], w: int = 6, h: int = 8,
          unit: str = "short", thresholds: list | None = None, desc: str = "",
          options: dict | None = None) -> None:
    global _y, _x, _id
    if _x + w > 24:
        _y += h
        _x = 0
    _id += 1
    steps = [{"color": "green", "value": None}] + [
        {"color": c, "value": v} for v, c in (thresholds or [])
    ]
    panels.append({
        "id": _id, "type": kind, "title": title, "description": desc, "datasource": DS,
        "gridPos": {"h": h, "w": w, "x": _x, "y": _y},
        "targets": [{"refId": chr(65 + i), "datasource": DS, "expr": e, "legendFormat": l,
                     "instant": kind in ("stat", "bargauge", "table"), "range": kind not in ("stat", "bargauge", "table")}
                    for i, (e, l) in enumerate(targets)],
        "fieldConfig": {"defaults": {"unit": unit, "thresholds": {"mode": "absolute", "steps": steps}},
                        "overrides": []},
        "options": options or {},
    })
    _x += w


# ── Overview ────────────────────────────────────────────────────────────────
row("Overview")
panel("stat", "API reporting", [(f"sum(count_over_time(target_info{{{S}}}[5m])) > bool 0", "")],
      w=4, thresholds=[], desc="1 = metrics arriving in the last 5 min. Alert: API not reporting.",
      options={"colorMode": "background"})
panel("stat", "Requests / min", [(f"sum(rate({HTTP}_count{{{S}}}[5m])) * 60", "")], w=5)
panel("stat", "5xx rate", [(f'(sum(rate({HTTP}_count{{{S},http_status_code=~"5.."}}[5m])) or vector(0)) / clamp_min(sum(rate({HTTP}_count{{{S}}}[5m])), 0.001)', "")],
      w=5, unit="percentunit", thresholds=[(0.01, "orange"), (0.05, "red")])
panel("stat", "p95 latency", [(f"histogram_quantile(0.95, sum by (le) (rate({HTTP}_bucket{{{S}}}[5m])))", "")],
      w=5, unit="ms", thresholds=[(800, "orange"), (1500, "red")])
panel("stat", "Firing alerts", [('count(ALERTS{alertstate="firing"}) or vector(0)', "")], w=5,
      thresholds=[(1, "red")], desc="From Grafana-managed alert state, if exposed; see Alerting → Alert rules.")

# ── Stripe & commerce ───────────────────────────────────────────────────────
row("Stripe & commerce")
panel("stat", "Dead Stripe events", [(f"max(stripe_webhook_dead_events{{{S}}}) or vector(0)", "")],
      w=4, thresholds=[(1, "red")], options={"colorMode": "background"},
      desc="Events that failed Stripe's retries and 5 hourly replays. Must be 0. Runbook: purchase-flows.md.")
panel("stat", "Order / access write failures (24h)",
      [("(sum(increase(orders_record_failures_total[24h])) or vector(0)) + (sum(increase(entitlements_write_failures_total[24h])) or vector(0))", "")],
      w=5, thresholds=[(1, "red")], options={"colorMode": "background"})
panel("stat", "Pro payments failed (7d)", [("sum(increase(stripe_payments_failed_total[7d])) or vector(0)", "")],
      w=5, thresholds=[(1, "orange")])
panel("stat", "Paid grants without order", [('max(analytics_reconcile_mismatches{check="paid_grant_without_order"}) or vector(0)', "")],
      w=5, thresholds=[(1, "red")], desc="Nightly reconciliation. Repair: POST /purchases/admin/backfill-order.")
panel("stat", "Webhook deliveries (24h)", [(f'sum(increase({HTTP}_count{{{S},http_route="/purchases/webhook"}}[24h])) or vector(0)', "")], w=5)
panel("timeseries", "Webhook responses by status", [(f'sum by (http_status_code) (increase({HTTP}_count{{{S},http_route="/purchases/webhook"}}[15m]))', "{{http_status_code}}")],
      w=8, desc="2xx expected. 400 = bad signature (or bots), 5xx = our handler failed.")
panel("timeseries", "Webhook failures by stage", [(f"sum by (stage) (increase(stripe_webhook_failures_total{{{S}}}[15m]))", "{{stage}}")], w=8)
panel("timeseries", "Replay job results", [(f"sum by (result) (increase(stripe_webhook_replays_total{{{S}}}[1h]))", "{{result}}")],
      w=8, desc="Hourly at :15. processed = recovered an undelivered event; dead = gave up.")
panel("timeseries", "Checkout / confirm calls", [(f'sum by (http_route) (increase({HTTP}_count{{{S},http_route=~"/purchases/(create-course-checkout|create-pro-checkout|confirm-checkout|confirm-pro-checkout|billing-portal)"}}[1h]))', "{{http_route}}")],
      w=24, h=7, desc="confirm-* calls mean the buyer got back before the webhook (normal occasionally; constant = webhook problem).")

# ── HTTP ────────────────────────────────────────────────────────────────────
row("HTTP")
panel("timeseries", "Requests / s by route (top 10)", [(f"topk(10, sum by (http_route) (rate({HTTP}_count{{{S}}}[5m])))", "{{http_route}}")], w=12, unit="reqps")
panel("timeseries", "Latency p50 / p95 / p99", [
    (f"histogram_quantile({q}, sum by (le) (rate({HTTP}_bucket{{{S}}}[5m])))", f"p{int(q * 100)}") for q in (0.5, 0.95, 0.99)
], w=12, unit="ms")
panel("table", "Slowest routes (p95, 1h)", [(f"topk(10, histogram_quantile(0.95, sum by (le, http_route) (rate({HTTP}_bucket{{{S}}}[1h]))))", "{{http_route}}")],
      w=12, unit="ms", options={"showHeader": True})
panel("timeseries", "4xx / 5xx by route", [(f'sum by (http_route, http_status_code) (increase({HTTP}_count{{{S},http_status_code=~"[45].."}}[15m])) > 0', "{{http_status_code}} {{http_route}}")], w=12)

# ── Product & auth ──────────────────────────────────────────────────────────
row("Product & auth")
panel("timeseries", "Page views by channel", [(f"sum by (channel) (increase(page_view_total{{{S}}}[1h]))", "{{channel}}")], w=8)
panel("timeseries", "Auth", [
    (f"sum(increase(auth_login_total{{{S}}}[1h])) or vector(0)", "logins"),
    (f"sum(increase(auth_login_failed_total{{{S}}}[1h])) or vector(0)", "failed logins"),
    (f"sum(increase(auth_registration_total{{{S}}}[1h])) or vector(0)", "registrations"),
    (f"sum(increase(auth_token_refresh_total{{{S}}}[1h])) or vector(0)", "token refreshes"),
], w=8)
panel("timeseries", "Product events", [
    (f"sum by (source) (increase(product_events_accepted_total{{{S}}}[1h]))", "accepted {{source}}"),
    (f"sum by (reason) (increase(product_events_dropped_total{{{S}}}[1h]))", "dropped {{reason}}"),
    (f"sum by (stage) (increase(product_events_failures_total{{{S}}}[1h]))", "FAILED {{stage}}"),
], w=8)
panel("bargauge", "Course views (24h)", [(f"sum by (course_id) (increase(course_view_total{{{S}}}[24h]))", "course {{course_id}}")], w=12)
panel("bargauge", "Top routes viewed (24h)", [(f"topk(10, sum by (route) (increase(page_view_total{{{S}}}[24h])))", "{{route}}")], w=12)

# ── Nightly analytics job ───────────────────────────────────────────────────
row("Nightly analytics job (00:30)")
panel("bargauge", "Step duration (last run)", [(f"max by (step) (increase(analytics_maintenance_step_ms_milliseconds_sum{{{S}}}[26h]))", "{{step}}")], w=12, unit="ms")
panel("table", "Reconciliation mismatches", [("max by (check) (analytics_reconcile_mismatches)", "{{check}}")],
      w=12, thresholds=[(1, "red")], desc="Gate checks must be 0. stripe_events_dead lives in the DB check list (admin health), not here.")

# ── Runtime ─────────────────────────────────────────────────────────────────
row("Runtime")
panel("timeseries", "Heap used", [(f"sum(v8js_memory_heap_used_bytes{{{S}}})", "heap")], w=6, unit="bytes")
panel("timeseries", "Event loop delay p99", [(f"max(nodejs_eventloop_delay_p99_seconds{{{S}}})", "p99")], w=6, unit="s")
panel("timeseries", "CPU", [(f"avg(process_cpu_utilization{{{S}}})", "process")], w=6, unit="percentunit")
panel("timeseries", "DB connections", [
    (f"sum by (state) (db_client_connection_count{{{S}}})", "{{state}}"),
    (f"sum(db_client_connection_pending_requests{{{S}}})", "pending"),
], w=6)

dashboard = {
    "uid": UID,
    "title": "DroneEdge — API & Stripe health",
    "tags": ["droneedge", "stripe"],
    "timezone": "browser",
    "schemaVersion": 39,
    "refresh": "1m",
    "time": {"from": "now-24h", "to": "now"},
    "panels": panels,
}

OUT.write_text(json.dumps(dashboard, indent=2) + "\n")
print(f"wrote {OUT.relative_to(REPO)} ({len(panels)} panels)")

if "--dry-run" not in sys.argv:
    env = dict(l.split("=", 1) for l in Path.home().joinpath(".config/droneedge/grafana.env").read_text().split())
    req = urllib.request.Request(env["GRAFANA_URL"] + "/api/dashboards/db", method="POST",
                                 data=json.dumps({"dashboard": dashboard, "folderUid": FOLDER_UID, "overwrite": True,
                                                  "message": "scripts/grafana_dashboard.py"}).encode())
    req.add_header("Authorization", "Bearer " + env["GRAFANA_TOKEN"])
    req.add_header("Content-Type", "application/json")
    res = json.load(urllib.request.urlopen(req))
    print(res.get("status"), env["GRAFANA_URL"] + res.get("url", ""))
