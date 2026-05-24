#!/usr/bin/env python3
"""Collect public school outreach contact candidates into CSV files only.

This script does not send email, schedule outreach, or call any CRM API. It
fetches configured public pages, extracts source-backed contact candidates, and
writes CSV outputs for manual review.

Run:
  python3 scripts/collect_school_contacts.py
"""

from __future__ import annotations

import argparse
import csv
import hashlib
import html
import re
import sys
import time
import urllib.parse
import urllib.request
import urllib.robotparser
from dataclasses import dataclass
from datetime import datetime, timezone
from html.parser import HTMLParser
from pathlib import Path
from typing import Iterable


ROOT = Path(__file__).resolve().parents[1]
DEFAULT_CONFIG = ROOT / "scripts" / "contact_sources.yaml"
DEFAULT_OUTPUT = ROOT / "data" / "outreach" / "contact-candidates.csv"
DEFAULT_REPORT = ROOT / "data" / "outreach" / "contact-collection-report.csv"

USER_AGENT = "DroneEdgeContactCollector/0.1 (CSV-only contact research)"

EMAIL_RE = re.compile(r"[A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Za-z]{2,}")
PHONE_RE = re.compile(
    r"(?:\+?1[-.\s]?)?(?:\(?\d{3}\)?[-.\s]?)\d{3}[-.\s]?\d{4}"
    r"(?:\s*(?:ext\.?|x|#)\s*\d+)?",
    re.IGNORECASE,
)

OUTPUT_FIELDS = [
    "organization",
    "organization_type",
    "state",
    "source_url",
    "source_title",
    "source_type",
    "contact_name",
    "title",
    "department",
    "email",
    "phone",
    "role_tags",
    "confidence",
    "review_status",
    "notes",
    "collected_at",
]

REPORT_FIELDS = [
    "source_name",
    "url",
    "extractor",
    "status",
    "candidate_count",
    "high_confidence",
    "medium_confidence",
    "low_confidence",
    "discovered_link_count",
    "error",
]

TARGET_LINK_PATTERNS = [
    "career and technical",
    "cte",
    "curriculum",
    "instruction",
    "teaching and learning",
    "grants",
    "procurement",
    "purchasing",
    "accounts payable",
    "postsecondary",
    "college and career",
    "career readiness",
    "school directory",
    "central office",
    "technology",
    "instructional technology",
    "computer science",
    "stem",
    "science",
    "ai",
]

REJECT_CONTEXT_PATTERNS = [
    "student records",
    "nurse",
    "health services",
    "food services",
    "transportation",
    "attendance",
    "homeless",
    "bullying",
    "harassment",
    "discipline",
    "athletics",
    "benefits",
    "payroll",
    "employment",
    "human resources",
]

TAG_RULES = [
    ("cte", ["career and technical", "cte", "vocational"]),
    ("stem", ["science", "stem", "engineering", "technology education", "tech ed"]),
    ("ai_cs", ["computer science", " ai ", "artificial intelligence", "instructional technology"]),
    ("curriculum", ["curriculum", "instruction", "teaching and learning"]),
    ("career_readiness", ["college and career", "workforce", "career readiness", "career exploration"]),
    ("grants", ["grant", "federal programs", "title iv", "perkins"]),
    ("procurement", ["procurement", "purchasing", "accounts payable", "business office"]),
    ("leadership", ["superintendent", "assistant superintendent", "director", "deputy secretary"]),
    ("board", ["school board", "board secretary", "board of directors"]),
]

SHORT_TOKEN_PATTERNS = {"ai", "cs", "cte", "stem"}


@dataclass
class Source:
    name: str
    url: str
    organization: str
    organization_type: str
    state: str
    extractor: str


class ParsedPage(HTMLParser):
    def __init__(self) -> None:
        super().__init__(convert_charrefs=True)
        self.title = ""
        self.text_parts: list[str] = []
        self.links: list[dict[str, str]] = []
        self.tables: list[dict[str, object]] = []
        self.current_heading = ""

        self._tag_stack: list[str] = []
        self._title_parts: list[str] = []
        self._heading_parts: list[str] = []
        self._heading_tag = ""
        self._link: dict[str, object] | None = None
        self._table: dict[str, object] | None = None
        self._row: list[str] | None = None
        self._cell_parts: list[str] | None = None

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        attrs_dict = {k.lower(): v or "" for k, v in attrs}
        self._tag_stack.append(tag)

        if tag == "a":
            self._link = {"href": attrs_dict.get("href", ""), "text": []}
        elif tag in {"h1", "h2", "h3", "h4"}:
            self._heading_tag = tag
            self._heading_parts = []
        elif tag == "table":
            self._table = {"heading": self.current_heading, "rows": []}
        elif tag == "tr" and self._table is not None:
            self._row = []
        elif tag in {"td", "th"} and self._row is not None:
            self._cell_parts = []

    def handle_endtag(self, tag: str) -> None:
        if tag == "title":
            self.title = normalize_space(" ".join(self._title_parts))
        elif tag in {"h1", "h2", "h3", "h4"} and self._heading_tag == tag:
            heading = normalize_space(" ".join(self._heading_parts))
            if heading:
                self.current_heading = heading
                self.text_parts.append(heading)
            self._heading_parts = []
            self._heading_tag = ""
        elif tag == "a" and self._link is not None:
            text = normalize_space(" ".join(self._link.get("text", [])))
            href = str(self._link.get("href", ""))
            if text or href:
                self.links.append({"text": text, "href": href})
            self._link = None
        elif tag in {"td", "th"} and self._cell_parts is not None and self._row is not None:
            self._row.append(normalize_space(" ".join(self._cell_parts)))
            self._cell_parts = None
        elif tag == "tr" and self._row is not None and self._table is not None:
            if any(cell for cell in self._row):
                rows = self._table["rows"]
                assert isinstance(rows, list)
                rows.append(self._row)
            self._row = None
        elif tag == "table" and self._table is not None:
            self.tables.append(self._table)
            self._table = None

        if self._tag_stack:
            self._tag_stack.pop()

    def handle_data(self, data: str) -> None:
        text = normalize_space(data)
        if not text:
            return

        self.text_parts.append(text)

        if self._tag_stack and self._tag_stack[-1] == "title":
            self._title_parts.append(text)
        if self._heading_tag:
            self._heading_parts.append(text)
        if self._link is not None:
            link_text = self._link["text"]
            assert isinstance(link_text, list)
            link_text.append(text)
        if self._cell_parts is not None:
            self._cell_parts.append(text)

    @property
    def text(self) -> str:
        return "\n".join(part for part in self.text_parts if part)


def normalize_space(value: str) -> str:
    value = (value or "").replace("\u200b", "").replace("\ufeff", "")
    return re.sub(r"\s+", " ", html.unescape(value)).strip()


def clean_email(value: str) -> str:
    value = value.replace("\u200b", "").strip()
    value = value.removeprefix("mailto:")
    value = value.split("?")[0]
    match = EMAIL_RE.search(value)
    return match.group(0).lower() if match else ""


def normalize_phone(value: str) -> str:
    match = PHONE_RE.search(value or "")
    return normalize_space(match.group(0)) if match else ""


def load_sources(path: Path) -> list[Source]:
    """Read the small YAML subset used by scripts/contact_sources.yaml."""
    sources: list[dict[str, str]] = []
    current: dict[str, str] | None = None

    for raw_line in path.read_text(encoding="utf-8").splitlines():
        line = raw_line.rstrip()
        stripped = line.strip()
        if not stripped or stripped.startswith("#") or stripped == "sources:":
            continue

        if stripped.startswith("- "):
            if current:
                sources.append(current)
            current = {}
            key_value = stripped[2:]
        else:
            key_value = stripped

        if ":" not in key_value or current is None:
            continue
        key, value = key_value.split(":", 1)
        current[key.strip()] = value.strip().strip("\"'")

    if current:
        sources.append(current)

    required = {"name", "url", "organization", "organization_type", "state", "extractor"}
    parsed: list[Source] = []
    for source in sources:
        missing = sorted(required - set(source))
        if missing:
            raise ValueError(f"Source missing {missing}: {source}")
        parsed.append(Source(**{key: source[key] for key in required}))
    return parsed


def cache_path(cache_dir: Path, url: str) -> Path:
    digest = hashlib.sha256(url.encode("utf-8")).hexdigest()
    return cache_dir / f"{digest}.html"


def robots_allowed(url: str, user_agent: str) -> bool:
    parsed = urllib.parse.urlparse(url)
    robots_url = f"{parsed.scheme}://{parsed.netloc}/robots.txt"
    robot = urllib.robotparser.RobotFileParser()
    robot.set_url(robots_url)
    try:
        robot.read()
    except Exception:
        # If robots.txt cannot be read, stay conservative but do not block official
        # public pages during manual research.
        return True
    return robot.can_fetch(user_agent, url)


def fetch_html(
    url: str,
    cache_dir: Path | None,
    user_agent: str,
    force_refresh: bool,
    respect_robots: bool,
) -> str:
    path: Path | None = None
    if cache_dir is not None:
        cache_dir.mkdir(parents=True, exist_ok=True)
        path = cache_path(cache_dir, url)
        if path.exists() and not force_refresh:
            return path.read_text(encoding="utf-8", errors="ignore")

    if respect_robots and not robots_allowed(url, user_agent):
        raise RuntimeError(f"robots.txt disallows fetch: {url}")

    request = urllib.request.Request(
        url,
        headers={
            "User-Agent": user_agent,
            "Accept": "text/html,application/xhtml+xml",
        },
    )
    with urllib.request.urlopen(request, timeout=30) as response:
        body = response.read()
        charset = response.headers.get_content_charset() or "utf-8"
    text = body.decode(charset, errors="replace")
    if path is not None:
        path.write_text(text, encoding="utf-8")
    return text


def parse_html(raw_html: str) -> ParsedPage:
    parser = ParsedPage()
    parser.feed(raw_html)
    parser.close()
    return parser


def absolute_url(base_url: str, href: str) -> str:
    if not href:
        return ""
    if href.startswith("mailto:"):
        return href
    return urllib.parse.urljoin(base_url, href)


def role_tags(*values: str) -> list[str]:
    haystack = f" {' '.join(values).lower()} "
    tags: list[str] = []
    for tag, needles in TAG_RULES:
        if any(matches_phrase(haystack, needle) for needle in needles):
            tags.append(tag)
    return sorted(set(tags))


def matches_phrase(haystack: str, needle: str) -> bool:
    needle = needle.lower().strip()
    if needle in SHORT_TOKEN_PATTERNS:
        return re.search(rf"\b{re.escape(needle)}\b", haystack) is not None
    return needle in haystack


def is_relevant_context(*values: str) -> bool:
    tags = set(role_tags(*values))
    return bool(tags & {"cte", "stem", "ai_cs", "curriculum", "career_readiness", "grants", "procurement", "leadership", "board"})


def is_rejected_context(*values: str) -> bool:
    haystack = " ".join(values).lower()
    return any(pattern in haystack for pattern in REJECT_CONTEXT_PATTERNS)


def confidence_for(name: str, title: str, email: str, tags: Iterable[str], default: str = "medium") -> str:
    tag_set = set(tags)
    strong_tags = {"cte", "stem", "ai_cs", "curriculum", "career_readiness", "grants", "procurement"}
    if name and email and tag_set & strong_tags:
        return "high"
    if email and (name or tag_set):
        return default
    if tag_set:
        return "medium"
    if title or name:
        return "low"
    return "low"


def candidate(
    source: Source,
    page: ParsedPage,
    source_type: str,
    contact_name: str = "",
    title: str = "",
    department: str = "",
    email: str = "",
    phone: str = "",
    tags: Iterable[str] | None = None,
    confidence: str = "low",
    review_status: str | None = None,
    notes: str = "",
    source_url: str | None = None,
) -> dict[str, str]:
    tag_list = sorted(set(tags or []))
    status = review_status or ("needs_review" if confidence in {"high", "medium"} else "needs_research")
    return {
        "organization": source.organization,
        "organization_type": source.organization_type,
        "state": source.state,
        "source_url": source_url or source.url,
        "source_title": page.title,
        "source_type": source_type,
        "contact_name": normalize_space(contact_name),
        "title": normalize_space(title),
        "department": normalize_space(department),
        "email": clean_email(email),
        "phone": normalize_phone(phone),
        "role_tags": ";".join(tag_list),
        "confidence": confidence,
        "review_status": status,
        "notes": normalize_space(notes),
        "collected_at": datetime.now(timezone.utc).isoformat(timespec="seconds"),
    }


def extract_table_contacts(source: Source, page: ParsedPage) -> list[dict[str, str]]:
    contacts: list[dict[str, str]] = []

    for table in page.tables:
        rows = table.get("rows", [])
        if not isinstance(rows, list) or len(rows) < 2:
            continue

        heading = str(table.get("heading", ""))
        headers = [normalize_space(cell).lower() for cell in rows[0]]
        if not any(header in headers for header in {"name", "title", "email", "phone", "roles"}):
            continue

        for row in rows[1:]:
            values = {headers[i]: row[i] if i < len(row) else "" for i in range(len(headers))}
            name = values.get("name", "")
            title = values.get("title", "")
            email_value = clean_email(values.get("email", ""))
            phone = values.get("phone", "")
            roles = values.get("roles", "")
            tags = role_tags(title, roles, heading)
            if not email_value and not phone:
                continue
            if is_rejected_context(title, roles, heading) and not is_relevant_context(title, roles, heading):
                continue

            confidence = confidence_for(name, title, email_value, tags)
            contacts.append(
                candidate(
                    source,
                    page,
                    "table",
                    contact_name=name,
                    title=title,
                    department=heading,
                    email=email_value,
                    phone=phone,
                    tags=tags,
                    confidence=confidence,
                    notes=roles,
                )
            )

    return contacts


def extract_relevant_links(source: Source, page: ParsedPage, source_type: str) -> list[dict[str, str]]:
    contacts: list[dict[str, str]] = []
    seen: set[str] = set()
    page_phone = normalize_phone(page.text)

    for link in page.links:
        text = normalize_space(link.get("text", ""))
        href = absolute_url(source.url, link.get("href", ""))
        if not text or not href or href.startswith("mailto:"):
            continue
        context = f"{text} {href}".lower()
        if not any(matches_phrase(context, pattern) for pattern in TARGET_LINK_PATTERNS):
            continue
        if any(pattern in context for pattern in REJECT_CONTEXT_PATTERNS):
            continue
        if href in seen:
            continue
        seen.add(href)
        tags = role_tags(text, href)
        contacts.append(
            candidate(
                source,
                page,
                source_type,
                title=text,
                department=text,
                phone=page_phone,
                tags=tags,
                confidence="low",
                review_status="needs_research",
                notes=f"Relevant follow-up link discovered: {href}",
                source_url=href,
            )
        )

    return contacts


def line_context(lines: list[str], index: int, before: int = 5, after: int = 3) -> list[str]:
    start = max(0, index - before)
    end = min(len(lines), index + after + 1)
    return [line for line in lines[start:end] if line]


def looks_like_name(value: str) -> bool:
    value = normalize_space(value)
    if not value or "@" in value or len(value) > 80:
        return False
    if any(char.isdigit() for char in value):
        return False
    words = value.replace(".", "").replace(",", "").split()
    if not 2 <= len(words) <= 5:
        return False
    return sum(word[:1].isupper() for word in words) >= 2


def extract_email_context_contacts(source: Source, page: ParsedPage, source_type: str) -> list[dict[str, str]]:
    contacts: list[dict[str, str]] = []
    lines = [normalize_space(line) for line in page.text.splitlines()]
    lines = [line for line in lines if line]
    seen_emails: set[str] = set()

    for index, line in enumerate(lines):
        for email_match in EMAIL_RE.finditer(line):
            email_value = clean_email(email_match.group(0))
            if not email_value or email_value in seen_emails:
                continue
            seen_emails.add(email_value)

            context = line_context(lines, index)
            context_text = " ".join(context)
            if is_rejected_context(context_text) and not is_relevant_context(context_text):
                continue

            name = ""
            for candidate_line in reversed(context[: context.index(line) if line in context else len(context)]):
                if looks_like_name(candidate_line):
                    name = candidate_line
                    break

            title = ""
            for candidate_line in context:
                if candidate_line == name or email_value in candidate_line.lower():
                    continue
                if is_relevant_context(candidate_line) or any(word in candidate_line.lower() for word in ["director", "supervisor", "secretary", "assistant"]):
                    title = candidate_line
                    break

            phone = normalize_phone(context_text)
            tags = role_tags(context_text)
            if not tags and source.extractor == "finalsite_directory":
                continue

            confidence = confidence_for(name, title, email_value, tags)
            contacts.append(
                candidate(
                    source,
                    page,
                    source_type,
                    contact_name=name,
                    title=title,
                    email=email_value,
                    phone=phone,
                    tags=tags,
                    confidence=confidence,
                    notes="Extracted from nearby public page text.",
                )
            )

    return contacts


def extract_contacts(source: Source, page: ParsedPage) -> list[dict[str, str]]:
    if source.extractor == "pde_oese_tables":
        return extract_table_contacts(source, page)
    if source.extractor in {"hub_page", "philly_contact_hub"}:
        return extract_relevant_links(source, page, "hub_page")
    if source.extractor == "finalsite_staff_page":
        return extract_email_context_contacts(source, page, "staff_profile")
    if source.extractor == "finalsite_directory":
        return extract_email_context_contacts(source, page, "directory_card")
    if source.extractor == "finalsite_page":
        contacts = extract_email_context_contacts(source, page, "board_page")
        contacts.extend(extract_relevant_links(source, page, "board_page"))
        return contacts
    return extract_email_context_contacts(source, page, "contact_page")


def dedupe_contacts(rows: list[dict[str, str]]) -> list[dict[str, str]]:
    order = {"high": 3, "medium": 2, "low": 1}
    deduped: dict[str, dict[str, str]] = {}

    for row in rows:
        email_value = row.get("email", "")
        if email_value:
            key = f"email:{email_value}"
        else:
            key = "name:{organization}:{name}:{title}".format(
                organization=row.get("organization", "").lower(),
                name=row.get("contact_name", "").lower(),
                title=row.get("title", "").lower(),
            )
        if key in deduped:
            existing = deduped[key]
            if order.get(row.get("confidence", ""), 0) > order.get(existing.get("confidence", ""), 0):
                if existing.get("notes"):
                    row["notes"] = normalize_space(f"{row.get('notes', '')} Previous notes: {existing['notes']}")
                deduped[key] = row
            elif row.get("source_url") and row.get("source_url") not in existing.get("notes", ""):
                existing["notes"] = normalize_space(f"{existing.get('notes', '')} Also found at {row['source_url']}.")
        else:
            deduped[key] = row

    return sorted(
        deduped.values(),
        key=lambda row: (
            row.get("organization", ""),
            row.get("confidence", ""),
            row.get("contact_name", ""),
            row.get("title", ""),
        ),
    )


def write_csv(path: Path, rows: list[dict[str, str]], fields: list[str]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", newline="", encoding="utf-8") as handle:
        writer = csv.DictWriter(handle, fieldnames=fields, extrasaction="ignore")
        writer.writeheader()
        writer.writerows(rows)


def summarize(source: Source, status: str, rows: list[dict[str, str]], error: str = "") -> dict[str, str]:
    counts = {"high": 0, "medium": 0, "low": 0}
    discovered = 0
    for row in rows:
        counts[row.get("confidence", "low")] = counts.get(row.get("confidence", "low"), 0) + 1
        if row.get("review_status") == "needs_research":
            discovered += 1
    return {
        "source_name": source.name,
        "url": source.url,
        "extractor": source.extractor,
        "status": status,
        "candidate_count": str(len(rows)),
        "high_confidence": str(counts["high"]),
        "medium_confidence": str(counts["medium"]),
        "low_confidence": str(counts["low"]),
        "discovered_link_count": str(discovered),
        "error": error,
    }


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Collect public school contact candidates into CSV files only."
    )
    parser.add_argument("--config", type=Path, default=DEFAULT_CONFIG)
    parser.add_argument("--output", type=Path, default=DEFAULT_OUTPUT)
    parser.add_argument("--report", type=Path, default=DEFAULT_REPORT)
    parser.add_argument("--cache-dir", type=Path, default=None, help="Optional HTML cache directory.")
    parser.add_argument("--max-sources", type=int, default=0, help="Limit sources for smoke tests.")
    parser.add_argument("--delay", type=float, default=2.0, help="Seconds to wait between network fetches.")
    parser.add_argument("--force-refresh", action="store_true", help="Ignore cached HTML and fetch again.")
    parser.add_argument("--ignore-robots", action="store_true", help="Skip robots.txt checks.")
    parser.add_argument("--user-agent", default=USER_AGENT)
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    sources = load_sources(args.config)
    if args.max_sources > 0:
        sources = sources[: args.max_sources]

    all_rows: list[dict[str, str]] = []
    report_rows: list[dict[str, str]] = []

    for index, source in enumerate(sources):
        if index > 0 and args.delay > 0:
            time.sleep(args.delay)
        try:
            raw = fetch_html(
                source.url,
                cache_dir=args.cache_dir,
                user_agent=args.user_agent,
                force_refresh=args.force_refresh,
                respect_robots=not args.ignore_robots,
            )
            page = parse_html(raw)
            rows = dedupe_contacts(extract_contacts(source, page))
            all_rows.extend(rows)
            report_rows.append(summarize(source, "ok", rows))
            print(f"{source.name}: {len(rows)} candidate(s)")
        except Exception as exc:
            report_rows.append(summarize(source, "error", [], str(exc)))
            print(f"{source.name}: error: {exc}", file=sys.stderr)

    all_rows = dedupe_contacts(all_rows)
    write_csv(args.output, all_rows, OUTPUT_FIELDS)
    write_csv(args.report, report_rows, REPORT_FIELDS)

    print(f"Wrote candidates: {args.output}")
    print(f"Wrote report: {args.report}")
    print("No emails were sent.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
