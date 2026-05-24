#!/usr/bin/env python3
"""Draft short school outreach emails from contact candidates.

This script only writes CSV output for manual review. It does not send email,
connect to SMTP, or call any outreach/CRM service.

Run:
  python3 scripts/draft_contact_emails.py
"""

from __future__ import annotations

import argparse
import csv
from datetime import datetime, timezone
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
DEFAULT_INPUT = ROOT / "data" / "outreach" / "contact-candidates.csv"
DEFAULT_OUTPUT = ROOT / "data" / "outreach" / "contact-email-drafts.csv"

DRAFT_FIELDS = [
    "organization",
    "contact_name",
    "email",
    "title",
    "role_tags",
    "subject",
    "body",
    "draft_status",
    "source_url",
    "generated_at",
]


def first_name(name: str) -> str:
    cleaned = name.replace("Dr. ", "").replace("Ms. ", "").replace("Mr. ", "").strip()
    return cleaned.split()[0] if cleaned else "there"


def is_draftable(row: dict[str, str]) -> bool:
    if not row.get("email"):
        return False
    if row.get("review_status") not in {"needs_review", "approved"}:
        return False
    if row.get("contact_name", "").strip().lower() in {"", "vacant"}:
        return False
    if not row.get("role_tags"):
        return False
    return True


def audience_angle(row: dict[str, str]) -> tuple[str, str]:
    tags = set(filter(None, row.get("role_tags", "").split(";")))
    title = row.get("title", "")

    if "cte" in tags:
        return (
            "your CTE work",
            "Drone Edge may fit CTE pathways because the three-course sequence starts with FAA Part 107 prep, then extends into Drone Video & Photography and AI & Drones.",
        )
    if "ai_cs" in tags:
        return (
            "your instructional technology and AI work",
            "Drone Edge may fit programs exploring AI, computer science, and applied aviation because the three-course sequence includes FAA Part 107, Drone Video & Photography, and AI & Drones.",
        )
    if "stem" in tags:
        return (
            "your STEM and technology work",
            "Drone Edge may fit STEM programs because the three-course sequence combines FAA Part 107, Drone Video & Photography, and AI & Drones in one school-friendly pathway.",
        )
    if "grants" in tags:
        return (
            "your federal programs and funding work",
            "Drone Edge may fit STEM, CTE, or workforce funding conversations because the school offering includes FAA Part 107, Drone Video & Photography, and AI & Drones.",
        )
    if "procurement" in tags:
        return (
            "your finance and procurement work",
            "Drone Edge may fit school drone program planning because we can discuss course scope, seat counts, funding language, and the right purchase path up front.",
        )
    if "board" in tags:
        return (
            "your district leadership work",
            "Drone Edge may be relevant if the district is exploring career pathways, STEM, AI, or drone certification opportunities for students.",
        )
    if "leadership" in tags or "curriculum" in tags:
        return (
            "your curriculum leadership work",
            "Drone Edge may fit school programs because the three-course sequence covers FAA Part 107, Drone Video & Photography, and AI & Drones with flexible classroom delivery.",
        )

    if "special education" in title.lower():
        return (
            "your student support work",
            "Drone Edge may not be directly in your area, but I am trying to find the right curriculum or CTE contact for school drone programs.",
        )

    return (
        "your education work",
        "Drone Edge may fit schools exploring drone certification, STEM, media production, or AI pathways for students.",
    )


def subject_for(row: dict[str, str]) -> str:
    org = row.get("organization", "your school")
    tags = set(filter(None, row.get("role_tags", "").split(";")))
    if "cte" in tags:
        return f"Drone CTE pathway for {org}"
    if "ai_cs" in tags:
        return f"AI + drone courses for {org}"
    if "stem" in tags:
        return f"STEM drone courses for {org}"
    if "grants" in tags:
        return f"Funding-aligned drone courses for {org}"
    return f"Drone curriculum for {org}"


def draft_body(row: dict[str, str]) -> str:
    greeting = first_name(row.get("contact_name", ""))
    org = row.get("organization", "your school")
    angle_label, relevance = audience_angle(row)

    return (
        f"Hi {greeting},\n\n"
        f"I came across {angle_label} at {org} and wanted to introduce Drone Edge.\n\n"
        f"{relevance} The platform supports school accounts, progress visibility, and async or hybrid delivery.\n\n"
        "We also keep a short funding page for PA SMART, STEM, CTE, and grant-language considerations:\n"
        "https://thedroneedge.com/schools/funding\n\n"
        "Would you be open to a short intro call, or is there someone else on the curriculum, CTE, STEM, or workforce side I should contact?\n\n"
        "School overview: https://thedroneedge.com/schools\n"
        "Curriculum overview: https://thedroneedge.com/schools/curriculum\n"
        "Intro call: https://thedroneedge.com/consultation\n\n"
        "Best,\n"
        "James\n"
        "Drone Edge"
    )


def build_draft(row: dict[str, str]) -> dict[str, str]:
    return {
        "organization": row.get("organization", ""),
        "contact_name": row.get("contact_name", ""),
        "email": row.get("email", ""),
        "title": row.get("title", ""),
        "role_tags": row.get("role_tags", ""),
        "subject": subject_for(row),
        "body": draft_body(row),
        "draft_status": "needs_review",
        "source_url": row.get("source_url", ""),
        "generated_at": datetime.now(timezone.utc).isoformat(timespec="seconds"),
    }


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Draft short outreach emails into a CSV file only.")
    parser.add_argument("--input", type=Path, default=DEFAULT_INPUT)
    parser.add_argument("--output", type=Path, default=DEFAULT_OUTPUT)
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    with args.input.open(newline="", encoding="utf-8") as handle:
        rows = list(csv.DictReader(handle))

    drafts = [build_draft(row) for row in rows if is_draftable(row)]
    args.output.parent.mkdir(parents=True, exist_ok=True)
    with args.output.open("w", newline="", encoding="utf-8") as handle:
        writer = csv.DictWriter(handle, fieldnames=DRAFT_FIELDS)
        writer.writeheader()
        writer.writerows(drafts)

    print(f"Wrote drafts: {args.output}")
    print(f"Draft count: {len(drafts)}")
    print("No emails were sent.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
