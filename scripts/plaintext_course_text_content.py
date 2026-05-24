#!/usr/bin/env python3
"""Strip markdown from course unit text_content — courses render plain HTML + <br> only."""

from __future__ import annotations

import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
COURSE_PATH = ROOT / "assets" / "articles" / "faa_107_course.json"


def markdown_to_plain(text: str) -> str:
    if not text:
        return text

    s = text.replace("\r\n", "\n").replace("\r", "\n")

    # [label](url) -> label (url)
    s = re.sub(r"\[([^\]]+)\]\(([^)]+)\)", r"\1 (\2)", s)

    # ATX headings -> plain line (title is already in UI)
    s = re.sub(r"^#{1,6}\s+(.+?)\s*$", r"\1", s, flags=re.MULTILINE)

    # Bold / strong
    s = re.sub(r"\*\*([^*]+)\*\*", r"\1", s)
    s = re.sub(r"__([^_]+)__", r"\1", s)

    # Italic (single asterisk, not bullets)
    s = re.sub(r"(?<!\*)\*([^*\n]+?)\*(?!\*)", r"\1", s)

    # Markdown bullets (* or - at line start) -> dash list
    s = re.sub(r"^(\s*)[*+-]\s+", r"\1- ", s, flags=re.MULTILINE)

    # Stray markdown emphasis chars on their own
    s = s.replace("**", "").replace("__", "")

    # Collapse excessive blank lines
    s = re.sub(r"\n{3,}", "\n\n", s)

    return s.strip()


def walk(units: list) -> int:
    n = 0
    for u in units:
        if u.get("text_content"):
            plain = markdown_to_plain(u["text_content"])
            if plain != u["text_content"]:
                u["text_content"] = plain
                n += 1
        n += walk(u.get("sub_units") or [])
    return n


def main() -> None:
    data = json.loads(COURSE_PATH.read_text(encoding="utf-8"))
    changed = walk(data.get("units", []))
    COURSE_PATH.write_text(json.dumps(data, indent=4, ensure_ascii=False) + "\n", encoding="utf-8")
    print(f"Updated {changed} text_content fields in {COURSE_PATH}")


if __name__ == "__main__":
    main()
