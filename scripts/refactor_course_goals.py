#!/usr/bin/env python3
"""Merge description facts into text_content; rewrite description as learning goals."""

from __future__ import annotations

import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
COURSE_PATH = ROOT / "assets" / "articles" / "faa_107_course.json"

# Unit 1 — recommended merge (learning goals + material already in repo; goals upgraded)
GOAL_OVERRIDES: dict[int | str, str] = {
    35: (
        "Apply the FAA's Part 107 rules for civil sUAS operations, including pilot roles, "
        "operational limits, airspace, Remote ID, waivers, and flight over people and at night."
    ),
    1: (
        "Apply the FAA's Part 107 rules governing commercial sUAS operations, covering pilot roles, "
        "operational limitations, airspace requirements, Remote ID compliance, waivers, and regulations "
        "for night flight and flight over people and moving objects."
    ),
    11: "Identify which small unmanned aircraft operations are governed by Part 107 and which operations are explicitly excluded.",
    12: "Outline the roles, responsibilities, and communication requirements for RPIC, visual observer, and control operator under Part 107.",
    13: "Summarize the core operational rules for sUAS flights, including registration, compliance, accident reporting, medical fitness, and general flight limitations.",
    131: "Explain requirements for aircraft registration, mandatory compliance inspections, and penalties for falsifying records.",
    132: "Summarize rules for mandatory accident reporting, in-flight emergencies, and prohibitions against reckless or hazardous operations.",
    133: "Identify physical and mental fitness requirements for crew members, including prohibitions on operating while impaired by medical conditions, alcohol, or drugs.",
    134: "State the rules for operating a sUAS from moving vehicles or platforms and the limitations on transporting property for compensation.",
    135: "Define Visual Line of Sight (VLOS) requirements and state the prohibition on controlling more than one unmanned aircraft at a time.",
    136: "Explain the mandatory see-and-avoid requirement and the prohibition against interfering with manned aircraft operations.",
    137: "Define autonomous flight under Part 107 and explain the RPIC's continued responsibility and ability to take control during programmed missions.",
    138: "Outline preflight assessment requirements and restrictions on operating in controlled, prohibited, and restricted airspace.",
    139: "State specific performance limitations for sUAS regarding speed, altitude, cloud clearance, and minimum visibility.",
    14: "Explain Certificate of Waiver requirements, which Part 107 rules may be waived, and how to obtain controlled-airspace authorization.",
    15: "Explain the purpose and compliance methods for Remote ID (Standard UA, broadcast module, and FRIA) and required broadcast information.",
    16: "Differentiate the four drone categories for operations over people, MoC/DoC requirements, and restrictions on sustained flight over crowds or moving vehicles.",
    17: "Identify training and anti-collision lighting requirements for night flight, common hazards, and mitigation strategies for low-light operations.",
}

# Unit 12 text_content enhancement (documentation line)
UNIT_12_EXTRA = (
    "Preflight Familiarization, Inspection, & Actions require reviewing manufacturer instructions "
    "and inspecting aircraft components (propellers, battery, control link) and ensuring required "
    "documentation is available."
)

# Unit 131 text_content enhancement
UNIT_131_CERT = (
    "remote pilot certificate with a sUAS rating, photo ID with your birthdate and signature"
)


GOAL_PREFIXES = (
    "by the end",
    "you will",
    "learn to",
    "apply ",
    "identify ",
    "explain ",
    "summarize ",
    "define ",
    "describe ",
    "outline ",
    "state ",
    "recognize ",
    "differentiate ",
    "detail ",
    "understand ",
    "list ",
    "compare ",
)


def normalize(s: str) -> str:
    return re.sub(r"\s+", " ", s).strip().lower()


def is_goal_style(desc: str) -> bool:
    d = desc.strip().lower()
    if len(d) < 15:
        return False
    if d.startswith(GOAL_PREFIXES):
        return True
    if d.startswith(("defines ", "define ", "explains ", "explain ", "details ", "detail ")):
        return True
    if d.startswith(("this unit provides", "this section covers", "an overview of")):
        return True
    if d.startswith(("rules for", "requirements for", "the mandatory", "the requirements")):
        return True
    if d.startswith(("explores ", "exploring ", "defining ", "summarizes ")):
        return True
    # Short catalog lines without regulatory detail
    if len(d) < 220 and not re.search(r"\d{2,}|\*\*|cfR|part \d", d, re.I):
        return True
    return False


def merge_description_into_text(desc: str, text: str, node_id) -> str:
    if not desc:
        return text
    if not text:
        return desc
    if desc in text or normalize(desc) in normalize(text):
        return text
    if is_goal_style(desc):
        return text
    # Course/unit intro nodes: keep short text_content; goal lives in description only
    if node_id in (1, 35):
        return text
    return f"**Overview:** {desc}\n\n{text}"


def title_to_goal(title: str, old_desc: str) -> str:
    t = title.strip()
    od = (old_desc or "").strip()
    if not od:
        return f"Understand the key concepts covered in {t}."

    low = od.lower()
    if low.startswith("defines "):
        return f"Define and recognize {od[8:].lstrip().rstrip('.')}."
    if low.startswith("define "):
        return f"{od.rstrip('.')}."
    if low.startswith("explains "):
        return f"Explain {od[9:].lstrip().lstrip('the ').rstrip('.')}."
    if low.startswith("explain "):
        return f"{od.rstrip('.')}."
    if low.startswith("details "):
        return f"Describe {od[8:].lstrip().rstrip('.')}."
    if low.startswith("detail "):
        return f"{od.rstrip('.')}."
    if low.startswith("explores "):
        return f"Explain {od[9:].lstrip().rstrip('.')}."
    if low.startswith("summarizes "):
        return f"Summarize {od[11:].lstrip().rstrip('.')}."
    if low.startswith("this unit provides "):
        body = od[19:].lstrip().rstrip(".")
        return f"By the end of this unit, you will understand {body[0].lower() + body[1:] if body else body}."
    if low.startswith("an overview of "):
        return f"Explain {od[15:].lstrip().rstrip('.')}."
    if low.startswith("the mandatory "):
        return f"Explain {od.rstrip('.')}."
    if low.startswith("rules for "):
        return f"Apply and recall {od.rstrip('.')}."
    if low.startswith("requirements for "):
        return f"Explain {od.rstrip('.')}."
    if low.startswith("specific "):
        return f"State {od.rstrip('.')}."
    if low.startswith("preflight "):
        return f"Outline {od.rstrip('.')}."
    if low.startswith("defining "):
        return f"Define {od[9:].lstrip().rstrip('.')}."
    if low.startswith("identify ") or low.startswith("apply ") or low.startswith("summarize "):
        return od if od.endswith(".") else od + "."

  # Student-facing default
    core = od[0].lower() + od[1:] if len(od) > 1 else od
    if not core.endswith("."):
        core += "."
    return f"By the end of this lesson on {t}, you will {core}"


def patch_unit_12_text(text: str) -> str:
    # Fix duplicate sentence if a prior patch ran twice
    dup = (
        "Preflight Familiarization, Inspection, & Actions require reviewing manufacturer instructions and "
        "Preflight Familiarization, Inspection, & Actions require reviewing manufacturer instructions and "
    )
    if dup in text:
        text = text.replace(
            dup,
            "Preflight Familiarization, Inspection, & Actions require reviewing manufacturer instructions and ",
        )
    if "ensuring required documentation is available" in text:
        return text.replace("available..", "available.")
    old = "inspecting aircraft components (propellers, battery, control link)."
    if old in text and "ensuring required documentation" not in text:
        return text.replace(old, UNIT_12_EXTRA + ".")
    return text


def patch_unit_131_text(text: str) -> str:
    if "birthdate and signature" in text:
        return text
    return text.replace(
        "present their remote pilot certificate, photo ID, and any required",
        f"present their {UNIT_131_CERT}, and any required",
    )


def process_node(node: dict) -> None:
    nid = node.get("id")
    title = node.get("title", "")
    old_desc = (node.get("description") or "").strip()
    text = (node.get("text_content") or "").strip()

    text = merge_description_into_text(old_desc, text, nid)

    if nid == 12:
        text = patch_unit_12_text(text)
    if nid == 131:
        text = patch_unit_131_text(text)

    if nid in GOAL_OVERRIDES:
        goal = GOAL_OVERRIDES[nid]
    else:
        goal = title_to_goal(title, old_desc)

    node["text_content"] = text if text else None
    node["description"] = goal

    for sub in node.get("sub_units") or []:
        process_node(sub)


def main() -> None:
    data = json.loads(COURSE_PATH.read_text(encoding="utf-8"))
    for unit in data.get("units", []):
        process_node(unit)
    # Sync course-level fields with unit 1 when titles match
    if data.get("units"):
        u1 = data["units"][0]
        if u1.get("title") == data.get("title"):
            data["description"] = u1.get("description")
            data["text_content"] = u1.get("text_content")
    COURSE_PATH.write_text(json.dumps(data, indent=4, ensure_ascii=False) + "\n", encoding="utf-8")
    print(f"Updated {COURSE_PATH}")


if __name__ == "__main__":
    main()
