#!/usr/bin/env python3
"""Convert the author's compiled question-bank CSV into a unit-level bulk import.

Source: assets/courses/faa-107/questions/Compiled Question Bank Sorted.xlsx - questions sorted and dups delet.csv
Output: assets/courses/faa-107/questions/faa_107_questions_unit_level.bulk.json  (POST /questions/import)
        assets/courses/faa-107/questions/faa_107_questions_unit_level_review.csv (per-row disposition)

Questions are scoped to TOP-LEVEL units only (unit_ref set, sub_unit_ref null),
per docs/tech/course-content-restructure-plan.md § "Question model". The CSV's
Category column maps to a unit; Sub Category is only used to disambiguate
categories that span multiple units (airports & airspace, weather, operations).

Usage:
    python3 scripts/build_unit_level_questions.py [--course-id 35]
"""

from __future__ import annotations

import argparse
import csv
import json
import re
from pathlib import Path

REPO = Path(__file__).resolve().parent.parent
QUESTIONS = REPO / "assets/courses/faa-107/questions"
SRC = QUESTIONS / "Compiled Question Bank Sorted.xlsx - questions sorted and dups delet.csv"
OUT_BULK = QUESTIONS / "faa_107_questions_unit_level.bulk.json"
OUT_REVIEW = QUESTIONS / "faa_107_questions_unit_level_review.csv"

# Top-level unit refs in assets/courses/faa-107/faa_107_course.json:
#   u1  PART 107 REGULATIONS            u6  WEATHER EFFECTS ON AIRCRAFT PERFORMANCE
#   u2  Airports, Airspace, Data Sources u7  LOADING AND PERFORMANCE
#   u3  Airspace Classifications         u8  EMERGENCY PROCEDURES
#   u4  AIRPORT OPERATIONS               u9  AERONAUTICAL DECISION MAKING
#   u5  WEATHER                          u10 RADIO COMMUNICATION PROCEDURES


def contains(sub: str, *needles: str) -> bool:
    return any(n in sub for n in needles)


def map_airports_airspace(sub: str) -> str:
    """'airports & airspace' spans u2/u3/u4 — sub-category decides."""
    if contains(
        sub, "airspace class", "class b", "class c", "class d", "class e", "class g",
        "controlled", "moa", "mtr", "prohibited", "restricted", "special use",
        "other airspace", "operating requirements",
    ):
        return "u3"
    if contains(
        sub, "airport operations", "runway", "traffic pattern", "wildlife",
        "towed airport", "towered", "airport classif", "intro to airports",
    ):
        return "u4"
    # charts, lat/long, NOTAMs, MEF, ATIS, data sources, general → u2
    return "u2"


def map_weather(sub: str) -> str:
    """'weather' spans u5 (sources/reports) and u6 (effects on performance)."""
    if contains(
        sub, "effects on performance", "effets on performance", "clouds", "icing",
        "frost", "wind", "temp", "thunderstorm", "inversion", "density",
    ):
        return "u6"
    return "u5"


def map_operations(sub: str) -> str:
    """'operations' spans u8/u9/u10 (+1 stray u4 row)."""
    if contains(sub, "communication", "radio"):
        return "u10"
    if contains(sub, "emergency"):
        return "u8"
    if sub.strip() == "airport operations":
        return "u4"
    # adm, crm, imsafe, pave, physiology, risk, maintenance, preflight, night ops
    return "u9"


# Keyword inference for rows with no Category (the combined "ADM, Emergency,
# Communications and Loading Test" block) and for 'additional topics'.
INFERENCE_RULES: list[tuple[str, tuple[str, ...]]] = [
    ("u8", ("emergency", "deviation from part 107", "deviate from any portion")),
    ("u10", ("ctaf", "phonetic", "radio", "call sign")),
    ("u7", ("stall", "load factor", "gs will", "center of gravity", "center of pressure",
            "balance", "straight and level", "air density", "weighs")),
    ("u9", ("adm", "aeronautical decision", "attitude", "imsafe", "pave", "crm",
            "crew resource", "situational awareness", "risk management", "hazardous",
            "dehydration", "judgment", "six-sigma", "maintenance and inspection",
            "accidents occur", "rpic should document", "remain calm", "informed of the situation")),
]


def infer_unit(question: str) -> str | None:
    q = question.lower()
    for ref, needles in INFERENCE_RULES:
        if any(n in q for n in needles):
            return ref
    return None


def map_row(cat: str, sub: str, question: str) -> tuple[str | None, bool]:
    """Returns (unit_ref, inferred_from_text)."""
    cat = cat.strip().lower()
    sub = sub.strip().lower()
    if cat == "regulations":
        return "u1", False
    if cat == "airports & airspace":
        return map_airports_airspace(sub), False
    if cat == "airports classification":
        return "u3", False
    if cat == "weather":
        return map_weather(sub), False
    if cat == "loading & performance":
        return "u7", False
    if cat == "operations":
        return map_operations(sub), False
    if cat == "additional topics" or cat == "":
        return infer_unit(question), True
    return None, False


FIGURE_RE = re.compile(r"figure\s+(\d+[A-Za-z]?)", re.IGNORECASE)


def extract_figure_ref(question: str) -> str | None:
    m = FIGURE_RE.search(question)
    return m.group(1) if m else None


def normalize(text: str) -> str:
    return re.sub(r"\s+", " ", text).strip().lower()


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--course-id", type=int, default=35,
                        help="course_id for the bulk file (35 = deployed FAA 107 course)")
    args = parser.parse_args()

    rows = list(csv.reader(SRC.open()))
    header, rows = rows[0], rows[1:]

    questions: list[dict] = []
    review: list[dict] = []
    seen: dict[str, int] = {}  # normalized question text → source row number

    for lineno, raw in enumerate(rows, start=2):
        r = raw + [""] * (13 - len(raw))
        question = r[1].strip()
        answer = r[2].strip().upper()
        choices_text = [r[3].strip(), r[4].strip(), r[5].strip()]
        explanation = r[7].strip() or None
        cat, sub = r[8].strip(), r[9].strip()

        def log(disposition: str, unit_ref: str | None = None, note: str = "") -> None:
            review.append({
                "row": lineno,
                "disposition": disposition,
                "unit_ref": unit_ref or "",
                "category": cat,
                "sub_category": sub,
                "note": note,
                "question": question[:140],
            })

        if not question:
            continue  # blank filler row — not worth logging

        present = [c for c in choices_text if c]
        if answer not in ("A", "B", "C") or len(present) < 2:
            # Section markers ("...End of Section Questions") and broken rows
            # (answer D with 3 choices, single-choice rows).
            is_marker = not answer and not present
            log("skipped_marker" if is_marker else "needs_review",
                note="" if is_marker else f"answer={answer or 'blank'}, choices={len(present)}")
            continue

        key = normalize(question)
        if key in seen:
            log("skipped_duplicate", note=f"first seen at row {seen[key]}")
            continue
        seen[key] = lineno

        unit_ref, inferred = map_row(cat, sub, question)
        if unit_ref is None:
            log("needs_review", note="no category and no keyword match")
            continue

        answer_idx = "ABC".index(answer)
        if answer_idx >= len(present):
            log("needs_review", note=f"answer {answer} points at empty choice")
            continue

        questions.append({
            "course_id": args.course_id,
            "unit_ref": unit_ref,
            "sub_unit_ref": None,
            "question_text": question,
            "choices": [
                {"id": i + 1, "text": text, "is_correct": i == answer_idx}
                for i, text in enumerate(present)
            ],
            "explanation": explanation,
            "standard": None,
            "figure_ref": extract_figure_ref(question),
            "priority": 2,
            "difficulty": "medium",
            "status": "active",
        })
        log("imported" + ("_inferred" if inferred else ""), unit_ref)

    OUT_BULK.write_text(json.dumps(
        {"course_id": args.course_id, "questions": questions}, indent=1) + "\n")
    with OUT_REVIEW.open("w", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=list(review[0].keys()))
        writer.writeheader()
        writer.writerows(review)

    from collections import Counter
    by_unit = Counter(q["unit_ref"] for q in questions)
    by_disposition = Counter(r["disposition"] for r in review)
    print(f"wrote {len(questions)} questions → {OUT_BULK.relative_to(REPO)}")
    print("per unit:", dict(sorted(by_unit.items(), key=lambda kv: int(kv[0][1:]))))
    print("dispositions:", dict(by_disposition))
    print(f"review file → {OUT_REVIEW.relative_to(REPO)}")


if __name__ == "__main__":
    main()
