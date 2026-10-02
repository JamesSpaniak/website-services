#!/usr/bin/env python3
"""Save one redacted sample of every Stripe webhook event Drone Edge handles.

Pulls recent events from the **sandbox** through the Stripe CLI (must be logged
in, `stripe login`), picks one example per event type + variant (course vs Pro,
first invoice vs renewal, cancel scheduled vs past_due, ...), strips personal
data and one-time secrets, and writes them to backend/test/fixtures/stripe/.

Re-run after each round of sandbox testing (e.g. after paying through hosted
Checkout in a browser, which is the only way to get checkout.session.completed).
Existing fixtures are kept unless a newer sample of the same variant exists.

    python3 scripts/capture_stripe_fixtures.py            # write fixtures
    python3 scripts/capture_stripe_fixtures.py --dry-run  # list what it found

Refuses to run against live mode.
"""

from __future__ import annotations

import argparse
import json
import subprocess
import sys
from pathlib import Path

REPO = Path(__file__).resolve().parent.parent
OUT_DIR = REPO / "backend" / "test" / "fixtures" / "stripe"

EVENT_TYPES = [
    "checkout.session.completed",
    "payment_intent.succeeded",
    "customer.subscription.created",
    "customer.subscription.updated",
    "customer.subscription.deleted",
    "invoice.paid",
    "invoice.payment_failed",
    "charge.refunded",
]

# Personal data and short-lived secrets. IDs stay (sandbox, needed to trace flows).
REDACT_KEYS = {
    "email", "name", "phone", "receipt_email", "customer_email", "customer_name",
    "customer_phone", "line1", "line2", "city", "state", "postal_code",
    "client_secret", "receipt_url", "hosted_invoice_url", "invoice_pdf", "url",
    "fingerprint", "last4",
}


def variant(event: dict) -> str | None:
    """Short label distinguishing the flows we care about; None = skip."""
    t = event["type"]
    obj = event["data"]["object"]
    meta = obj.get("metadata") or {}
    if t == "checkout.session.completed":
        return obj.get("mode")  # payment | subscription
    if t == "payment_intent.succeeded":
        return "course" if meta.get("productType") == "course" or meta.get("courseId") else "subscription-invoice"
    if t == "invoice.paid":
        return {"subscription_create": "first", "subscription_cycle": "renewal"}.get(obj.get("billing_reason"), obj.get("billing_reason"))
    if t == "customer.subscription.updated":
        if obj.get("status") == "past_due":
            return "past-due"
        if obj.get("cancel_at_period_end"):
            return "cancel-scheduled"
        return "other"
    if t == "charge.refunded":
        return "course" if meta.get("courseId") else "pro-invoice"
    return "default"


def redact(value):
    if isinstance(value, dict):
        return {
            k: ("REDACTED" if k in REDACT_KEYS and isinstance(v, str) and v else redact(v))
            for k, v in value.items()
        }
    if isinstance(value, list):
        return [redact(v) for v in value]
    return value


def list_events(event_type: str) -> list[dict]:
    res = subprocess.run(
        ["stripe", "events", "list", "--type", event_type, "--limit", "50"],
        capture_output=True, text=True, stdin=subprocess.DEVNULL,
    )
    if res.returncode != 0:
        sys.exit(f"stripe CLI failed for {event_type}: {res.stderr.strip()}")
    return json.loads(res.stdout).get("data", [])


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__.split("\n")[0])
    ap.add_argument("--dry-run", action="store_true")
    args = ap.parse_args()

    found: dict[str, dict] = {}
    for t in EVENT_TYPES:
        for ev in list_events(t):  # newest first
            if ev.get("livemode"):
                sys.exit("Refusing: got a live-mode event. Run `stripe switch` to the sandbox.")
            v = variant(ev)
            if v is None:
                continue
            key = f"{t}.{v}" if v != "default" else t
            found.setdefault(key, ev)

    if not args.dry_run:
        OUT_DIR.mkdir(parents=True, exist_ok=True)
    for key, ev in sorted(found.items()):
        path = OUT_DIR / f"{key}.json"
        print(f"{key:55} {ev['id']}  api={ev.get('api_version')}")
        if not args.dry_run:
            path.write_text(json.dumps(redact(ev), indent=2, sort_keys=True) + "\n")

    missing = [t for t in EVENT_TYPES if not any(k.startswith(t) for k in found)]
    if missing:
        print("\nNo sample yet for:", ", ".join(missing))
    if not args.dry_run:
        print(f"\nWrote {len(found)} fixtures to {OUT_DIR.relative_to(REPO)}")


if __name__ == "__main__":
    main()
