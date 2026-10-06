"""Create the phase-1 (severe-only) Grafana alerting setup for DroneEdge.

Usage: python3 grafana_alerts.py check   # validate every query against live data
       python3 grafana_alerts.py apply   # create folder, contact point, policy, rule group
Reads GRAFANA_URL / GRAFANA_TOKEN from ~/.config/droneedge/grafana.env.
"""
import json
import sys
import urllib.parse
import urllib.request
from pathlib import Path

env = dict(
    line.split("=", 1)
    for line in Path.home().joinpath(".config/droneedge/grafana.env").read_text().split()
)
URL, TOKEN = env["GRAFANA_URL"], env["GRAFANA_TOKEN"]
PROM = "grafanacloud-prom"
FOLDER_UID = "droneedge-alerts"
GROUP = "droneedge-critical"
EMAIL = "james@thedroneedge.com"
SVC = 'service_name="droneedge"'
HTTP = f"http_server_duration_milliseconds_count{{{SVC}"


def call(method, path, body=None, params=None):
    url = URL + path + ("?" + urllib.parse.urlencode(params) if params else "")
    req = urllib.request.Request(url, method=method)
    req.add_header("Authorization", f"Bearer {TOKEN}")
    req.add_header("Content-Type", "application/json")
    # Keep everything editable in the Grafana UI afterwards.
    req.add_header("X-Disable-Provenance", "true")
    data = json.dumps(body).encode() if body is not None else None
    try:
        with urllib.request.urlopen(req, data) as r:
            raw = r.read()
            return r.status, (json.loads(raw) if raw else None)
    except urllib.error.HTTPError as e:
        return e.code, e.read().decode()[:500]


# (title, expr, comparator, threshold, for, severity, summary, action)
RULES = [
    (
        "Stripe events dead",
        f"max(stripe_webhook_dead_events{{{SVC}}}) or vector(0)",
        "gt", 0, "0s", "critical",
        "A Stripe event failed Stripe's retries and 5 hourly replays.",
        "Someone's purchase, renewal, cancel or refund is not recorded. Check "
        "stripe_event_replays (status=dead, last_error), fix the cause, run POST "
        "/purchases/admin/replay-failed-events, then set resolved_at. "
        "Runbook: docs/tech/purchase-flows.md 'When a webhook fails'.",
    ),
    (
        "Stripe webhook signature failing",
        f'sum(increase(stripe_webhook_failures_total{{{SVC},stage="signature"}}[1h])) or vector(0)',
        "gt", 2, "0s", "critical",
        "Stripe webhook deliveries are being rejected (bad signature).",
        "Usually a wrong/rotated whsec_ or CloudFront stripping Stripe-Signature. "
        "Nothing is recorded until fixed; Stripe keeps retrying. Compare "
        "STRIPE_WEBHOOK_SECRET with Stripe Dashboard -> Webhooks. A stray bot hit "
        "can cause 1-2; 3+ in an hour is real.",
    ),
    (
        "Stripe webhook 5xx",
        f'sum(increase({HTTP},http_route="/purchases/webhook",http_status_code=~"5.."}}[15m])) or vector(0)',
        "gt", 0, "0s", "critical",
        "Our webhook handler errored on a Stripe event.",
        "Stripe retries and the hourly replay picks it up, but find the error in "
        "CloudWatch /ecs/droneedge-dev/api-server (search 'Received Stripe event').",
    ),
    (
        "Stripe config error",
        f'sum(increase(stripe_config_errors_total{{{SVC}}}[1h])) or vector(0)',
        "gt", 0, "0s", "critical",
        "The API started with a Stripe price that doesn't exist in its key's mode.",
        "Usually the live cutover left the sandbox price_ in tfvars (or the "
        "reverse). Pro checkout fails until fixed. Check CloudWatch for "
        "'StripeConfigService', fix stripe_pro_price_id_monthly in tfvars, redeploy. "
        "Runbook: docs/tech/stripe-sandbox-test-plan.md section 8.",
    ),
    (
        "Order or access write failed",
        "(sum(increase(orders_record_failures_total[1h])) or vector(0))"
        " + (sum(increase(entitlements_write_failures_total[1h])) or vector(0))",
        "gt", 0, "0s", "critical",
        "A paid purchase has no order row or no access grant.",
        "orders: POST /purchases/admin/backfill-order with the PaymentIntent id. "
        "entitlements: re-run the grant (POST /users/:id/courses) — idempotent.",
    ),
    (
        "API error rate high",
        f'(((sum(rate({HTTP},http_status_code=~"5.."}}[5m])) or vector(0))'
        f" / clamp_min(sum(rate({HTTP}}}[5m])), 0.001))"
        f' and on() (sum(increase({HTTP},http_status_code=~"5.."}}[10m])) >= 5))'
        " or vector(0)",
        "gt", 0.05, "10m", "critical",
        "More than 5% of API requests are failing with 5xx (10 min, at least 5 errors).",
        "Outage or bad deploy. Check the latest ./pipeline.sh run and CloudWatch "
        "logs; roll back by redeploying the previous image if it started with a release.",
    ),
    (
        "API not reporting",
        f"sum(count_over_time(target_info{{{SVC}}}[15m])) or vector(0)",
        "lt", 1, "5m", "critical",
        "No telemetry from the API for 15 minutes.",
        "API down, crash-looping, or the Grafana OTLP export is broken. Check ECS "
        "service droneedge-dev-api-server and https://thedroneedge.com/api/health.",
    ),
    (
        "Pro payment failed",
        "sum(increase(stripe_payments_failed_total[1h])) or vector(0)",
        "gt", 0, "0s", "warning",
        "A Pro subscription payment failed.",
        "Stripe retries the card and emails the customer automatically. Look at "
        "Stripe Dashboard -> Subscriptions (past_due). Pro access is kept while "
        "past_due and removed if Stripe finally cancels.",
    ),
    (
        "Tracking data check failed",
        "max(progress_tracking_violations) or vector(0)",
        "gt", 0, "0s", "warning",
        "A nightly progress-tracking check found rows teachers would see wrong.",
        "The check label says which: minutes_over_cap, units_completed_drift, "
        "rollup_drift or silent_learners. Sample rows are in analytics_reconciliation "
        "(check = 'tracking_<name>'). Runbook: docs/tech/progress-tracking-accuracy.md Phase 4.",
    ),
    (
        "Learner events dropped",
        'sum(increase(product_events_dropped_total{reason=~"course_scoped_anonymous|stale"}[1h]))'
        " or vector(0)",
        "gt", 20, "0s", "warning",
        "More than 20 learner events in 1 h were dropped as logged-out or stale.",
        "Usually sessions expiring mid-lesson (course_scoped_anonymous) or a client "
        "replaying an old offline queue (stale): teachers will see missing minutes. "
        "Check the latest frontend deploy and CloudWatch for 401s on /api/analytics/event.",
    ),
]


def rule_body(title, expr, op, threshold, for_, severity, summary, action):
    return {
        "title": title,
        "condition": "C",
        "data": [
            {
                "refId": "A",
                "relativeTimeRange": {"from": 3600, "to": 0},
                "datasourceUid": PROM,
                "model": {"refId": "A", "expr": expr, "instant": True, "range": False},
            },
            {
                "refId": "B",
                "datasourceUid": "__expr__",
                "model": {"refId": "B", "type": "reduce", "expression": "A", "reducer": "last"},
            },
            {
                "refId": "C",
                "datasourceUid": "__expr__",
                "model": {
                    "refId": "C",
                    "type": "threshold",
                    "expression": "B",
                    "conditions": [{"evaluator": {"type": op, "params": [threshold]}}],
                },
            },
        ],
        # Expressions return 0 via `or vector(0)`, so NoData means the query
        # itself broke — surface that rather than hide it.
        "noDataState": "Alerting",
        "execErrState": "Error",
        "for": for_,
        "labels": {"severity": severity, "team": "core"},
        "annotations": {"summary": summary, "description": action},
    }


def check():
    ok = True
    for title, expr, op, thr, *_ in RULES:
        status, res = call(
            "GET", f"/api/datasources/proxy/uid/{PROM}/api/v1/query", params={"query": expr}
        )
        if status != 200 or res.get("status") != "success":
            ok = False
            print(f"FAIL {title}: {status} {res}")
            continue
        vals = [r["value"][1] for r in res["data"]["result"]]
        print(f"ok   {title}: {vals or 'EMPTY (would be NoData)'}  (fires if {op} {thr})")
    return ok


def apply():
    print("folder", call("POST", "/api/folders", {"uid": FOLDER_UID, "title": "DroneEdge"})[0])
    cps = call("GET", "/api/v1/provisioning/contact-points")[1]
    if not any(c["name"] == "admin-email" for c in cps):
        print("contact point", call("POST", "/api/v1/provisioning/contact-points", {
            "name": "admin-email",
            "type": "email",
            "settings": {"addresses": EMAIL, "singleEmail": False},
            "disableResolveMessage": False,
        }))
    print("policy", call("PUT", "/api/v1/provisioning/policies", {
        "receiver": "admin-email",
        "group_by": ["grafana_folder", "alertname"],
        "group_wait": "30s",
        "group_interval": "5m",
        "repeat_interval": "4h",
        "routes": [{
            "receiver": "admin-email",
            "object_matchers": [["severity", "=", "warning"]],
            "repeat_interval": "24h",
        }],
    }))
    status, res = call(
        "PUT",
        f"/api/v1/provisioning/folder/{FOLDER_UID}/rule-groups/{GROUP}",
        {"title": GROUP, "interval": 60, "rules": [rule_body(*r) for r in RULES]},
    )
    print("rule group", status, res if status >= 300 else f"{len(res['rules'])} rules")


if __name__ == "__main__":
    if sys.argv[1:] == ["check"]:
        sys.exit(0 if check() else 1)
    elif sys.argv[1:] == ["apply"]:
        if check():
            apply()
    else:
        print(__doc__)
