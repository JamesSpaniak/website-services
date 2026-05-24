#!/usr/bin/env python3
"""Export rows with Operations / General operations for spreadsheet review."""

from __future__ import annotations

import csv
from collections import Counter
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
REVIEW = ROOT / "assets" / "articles" / "faa_107_questions_review.csv"
OUT_CSV = ROOT / "assets" / "articles" / "faa_107_general_operations_review.csv"
OUT_MD = ROOT / "assets" / "articles" / "faa_107_general_operations_review.md"

UNIT_NAMES = {
    1: "Unit 1 — Part 107 Regulations",
    2: "Unit 2 — Airports, Airspace & Data Sources",
    3: "Unit 3 — Airspace Classifications",
    4: "Unit 4 — Airport Operations",
    5: "Unit 5 — Weather (sources)",
    6: "Unit 6 — Weather Effects on Performance",
    7: "Unit 7 — Loading & Performance",
    8: "Unit 8 — Emergency Procedures",
    9: "Unit 9 — Aeronautical Decision Making",
}


def suggest(row: dict) -> tuple[str, str, str, str]:
  uid = row.get("unit_id") or ""
  cat = (row.get("category") or "").lower()
  sub = (row.get("sub_category") or "").lower()
  final = (row.get("final_exam_only") or "").lower() == "yes"
  classified = row.get("classified_by") or ""
  notes_extra = row.get("final_exam_reason") or ""

  if "wildlife" in sub or "bird" in sub:
    return (
      "Operations",
      "Airport operations and traffic patterns",
      "Replace K/L",
      "Wildlife near airports — Unit 4 (not General operations or Regulations)",
    )

  if final:
    action = "Clear K/L or leave blank — final-exam figure question"
    notes = notes_extra or "FAA-CT figure required; not for unit quiz"
    if "weather" in cat or "taf" in sub:
      topic = "TAF interpretation" if "taf" in sub else "METAR interpretation" if "metar" in sub else "General weather concepts"
      return "Weather and Weather Sources", topic, action, notes
    if "loading" in cat or "performance" in sub:
      return "Aircraft Loading and Performance", "Weight, balance, and performance", action, notes
    if "traffic" in sub or "pattern" in sub:
      return "Operations", "Airport operations and traffic patterns", action, notes
    if "airport" in cat or "airspace" in cat:
      return (
        "Airspace Classification and Operating Requirements",
        "Controlled vs uncontrolled airspace / ATC authorization",
        action,
        notes,
      )
    if "regulation" in cat:
      return "Regulations", "Part 107 regulations and compliance", action, notes
    return "", "", action, notes

  if str(uid) == "1":
    return "Regulations", "Part 107 regulations and compliance", "Replace K/L", "Clear General operations; Category=Regulations"

  if str(uid) == "2":
    if "l &l" in sub or "latitude" in sub:
      note = "Navigation L&L (Unit 2)"
    elif "chart" in sub or "sectional" in sub:
      note = "Charts (Unit 2)"
    elif "notam" in sub:
      note = "NOTAMs/TFRs (Unit 2)"
    else:
      note = "Airports & data sources (Unit 2)"
    return (
      "Airspace Classification and Operating Requirements",
      "Controlled vs uncontrolled airspace / ATC authorization",
      "Replace K/L",
      note,
    )

  if str(uid) == "3":
    return (
      "Airspace Classification and Operating Requirements",
      "Controlled vs uncontrolled airspace / ATC authorization",
      "Replace K/L",
      "Airspace classification (Unit 3)",
    )

  if str(uid) == "4" or ("airport" in cat and ("traffic" in sub or "runway" in sub or "ctaf" in sub)):
    return "Operations", "Airport operations and traffic patterns", "Replace K/L", "Airport ops (Unit 4)"

  if str(uid) == "5":
    if "taf" in sub:
      topic = "TAF interpretation"
    elif "metar" in sub:
      topic = "METAR interpretation"
    else:
      topic = "General weather concepts"
    return "Weather and Weather Sources", topic, "Replace K/L", f"Unit 5 — {topic}"

  if str(uid) == "6":
    if "density" in sub or "pressure" in sub or "altitude" in sub:
      topic = "Density altitude & performance"
    else:
      topic = "General weather concepts"
    return "Weather and Weather Sources", topic, "Replace K/L", f"Unit 6 — {topic}"

  if str(uid) == "7":
    return "Aircraft Loading and Performance", "Weight, balance, and performance", "Replace K/L", "Loading (Unit 7)"

  if str(uid) == "8":
    return "Regulations", "Part 107 regulations and compliance", "Replace K/L", "Emergency (Unit 8) — consider new Category"

  if str(uid) == "9":
    return "Operations", "Aeronautical decision-making and risk management", "Replace K/L", "ADM (Unit 9)"

  if "additional" in cat:
    return "Operations", "Aeronautical decision-making and risk management", "Replace K/L", "Additional topics → ADM"

  return "", "", "Clear K/L", f"Review manually — {classified[:80]}"


def main() -> None:
  rows = list(csv.DictReader(REVIEW.open(encoding="utf-8")))
  gen = [r for r in rows if r.get("mapped_unit") == "Operations" and r.get("mapped_topic") == "General operations"]
  gen.sort(key=lambda r: (r.get("sheet", ""), int(r.get("row") or 0)))

  fieldnames = [
    "sheet",
    "row",
    "question",
    "category",
    "sub_category",
    "current_mapped_unit",
    "current_mapped_topic",
    "assigned_unit_id",
    "assigned_sub_unit_id",
    "assigned_unit_name",
    "final_exam_only",
    "classified_by",
    "suggested_mapped_unit",
    "suggested_mapped_topic",
    "suggested_action",
    "notes",
  ]

  out_rows: list[dict] = []
  for r in gen:
    su, st, action, notes = suggest(r)
    uid = r.get("unit_id") or ""
    try:
      uname = UNIT_NAMES.get(int(uid), "") if uid else "FINAL_EXAM (no unit quiz)"
    except ValueError:
      uname = ""
    out_rows.append({
      "sheet": r.get("sheet", ""),
      "row": r.get("row", ""),
      "question": r.get("question", ""),
      "category": r.get("category", ""),
      "sub_category": r.get("sub_category", ""),
      "current_mapped_unit": "Operations",
      "current_mapped_topic": "General operations",
      "assigned_unit_id": uid,
      "assigned_sub_unit_id": r.get("sub_unit_id", ""),
      "assigned_unit_name": uname,
      "final_exam_only": r.get("final_exam_only", ""),
      "classified_by": r.get("classified_by", ""),
      "suggested_mapped_unit": su,
      "suggested_mapped_topic": st,
      "suggested_action": action,
      "notes": notes,
    })

  with OUT_CSV.open("w", newline="", encoding="utf-8") as f:
    w = csv.DictWriter(f, fieldnames=fieldnames)
    w.writeheader()
    w.writerows(out_rows)

  by_action = Counter(r["suggested_action"] for r in out_rows)
  by_sug = Counter((r["suggested_mapped_unit"], r["suggested_mapped_topic"]) for r in out_rows)

  lines = [
    "# Part 107 — Operations / General operations review\n",
    "Rows where **column K = Operations** and **column L = General operations** in the Testing spreadsheets.\n",
    "`General operations` is not a course unit — it is a catch-all. "
    "Use the CSV to update K/L or clear them.\n",
    f"\n**Total rows:** {len(out_rows)}\n",
    "\n## How to use\n",
    "1. Open **`faa_107_general_operations_review.csv`** in Excel.\n",
    "2. Update **K** and **L** in the master sheet to `suggested_mapped_unit` / `suggested_mapped_topic`, "
    "or clear K/L when `suggested_action` says so.\n",
    "3. Label row 1: **K = Mapped Unit**, **L = Mapped Topic**.\n",
    "4. Keep **Category** and **Sub Category** (H/I) as the primary taxonomy.\n",
    "\n## Suggested mapping summary\n\n",
    "| Suggested Mapped Unit | Suggested Mapped Topic | Count |\n",
    "| --- | --- | ---: |\n",
  ]
  for (u, t), n in by_sug.most_common():
    lines.append(f"| {u or '*(clear)*'} | {t or '*(clear)*'} | {n} |\n")

  lines.append("\n## Suggested actions\n\n| Action | Count |\n| --- | ---: |\n")
  for a, n in by_action.most_common():
    lines.append(f"| {a} | {n} |\n")

  lines.append("\n## Course units (reference)\n\n")
  for i, name in UNIT_NAMES.items():
    lines.append(f"- **{i}** — {name.split('—', 1)[-1].strip()}\n")

  lines.append("\n## Full detail\n\nSee **`faa_107_general_operations_review.csv`**.\n")
  OUT_MD.write_text("".join(lines), encoding="utf-8")
  print(f"Wrote {len(out_rows)} rows → {OUT_CSV.name}")
  print(f"Wrote summary → {OUT_MD.name}")


if __name__ == "__main__":
  main()
