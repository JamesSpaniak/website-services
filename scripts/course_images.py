#!/usr/bin/env python3
"""Bulk course-image pipeline: map an author image folder to course units,
upload to the S3 media bucket, and merge CloudFront URLs into the course JSON.

Three subcommands with a human/agent review gate between map and upload:

  map    Scan a folder, keyword-match filenames to unit titles, and emit
         <slug>_mapping.csv + <slug>_review.md (images embedded for review).
         Unmatched files get status=needs_review and an empty unit id.
  upload Upload resolved rows to s3://<bucket>/courses/<course>/<unit>/<slug>-<hash><ext>
         via `aws s3 cp`. Dry-run by default; pass --execute to upload.
         Rows without a unit id are refused.
  merge  Append each uploaded row's CloudFront URL to the matching unit's
         images_url array in the course JSON (deduplicated, ordered).

Publishing the JSON to prod stays manual (admin course editor / PUT /courses/:id).

Examples:
  python3 scripts/course_images.py map "assets/courses/Pictures for Airports" \
      --json assets/courses/faa_107_course.json --unit 2 --unit 3
  python3 scripts/course_images.py upload --csv assets/courses/pictures-for-airports_mapping.csv
  python3 scripts/course_images.py upload --csv ... --execute
  python3 scripts/course_images.py merge --csv ... --json assets/courses/faa_107_course.json
"""

from __future__ import annotations

import argparse
import csv
import hashlib
import json
import mimetypes
import re
import subprocess
import sys
from pathlib import Path

DEFAULT_JSON = "assets/courses/faa_107_course.json"
DEFAULT_BUCKET = "droneedge-dev-media"
DEFAULT_DOMAIN = "media.thedroneedge.com"
DEFAULT_REGION = "us-east-1"
IMAGE_EXTENSIONS = {".png", ".jpg", ".jpeg", ".gif", ".webp"}

CSV_FIELDS = [
    "local_path",
    "proposed_unit_id",
    "unit_title",
    "confidence",
    "s3_key",
    "cloudfront_url",
    "order",
    "status",
]

# Aviation abbreviations that are decisive on their own when they appear in a
# filename, even though generic token overlap would score them low.
STRONG_TOKENS = {
    "mef", "atc", "nas", "tac", "tacs", "moa", "mtr", "mtrs", "tfr", "adiz",
    "nsa", "nsas", "trsa", "notam", "notams", "atis", "ctaf",
}

STOP_WORDS = {
    "a", "an", "and", "as", "at", "by", "ex", "example", "for", "in", "of",
    "on", "or", "the", "to", "with", "vs", "pic", "pics", "picture",
    "pictures", "slide", "slides", "fig", "figure", "chartcopy", "copy",
}

# Filename synonyms -> tokens that appear in unit titles.
TOKEN_ALIASES = {
    "l": "latitude",  # "L & L" filenames
    "lat": "latitude",
    "long": "longitude",
    "aeronautical": "aeronautical",
    "sectional": "sectional",
    "supplement": "supplement",
}


def slugify(text: str) -> str:
    slug = re.sub(r"[^a-z0-9]+", "-", text.lower()).strip("-")
    return re.sub(r"-{2,}", "-", slug) or "image"


def content_hash(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1 << 20), b""):
            digest.update(chunk)
    return digest.hexdigest()[:8]


def tokenize(text: str) -> list[str]:
    raw = re.findall(r"[a-z0-9]+", text.lower())
    tokens = []
    for token in raw:
        token = TOKEN_ALIASES.get(token, token)
        if token in STOP_WORDS or (len(token) < 3 and token not in STRONG_TOKENS):
            continue
        tokens.append(token)
    return tokens


def canon_unit_id(unit_id) -> str:
    """Canonical form of a unit id, mirroring the backend's toUnitRef normalization.

    Numeric ids and their string-ref form are the same unit ("243" == "u243"),
    so CSV rows can use either form against `faa_107_course.json` (canonical
    string refs, e.g. `"u243"`).
    """
    text = str(unit_id).strip()
    if text.startswith("u") and text[1:].isdigit():
        return text[1:]
    return text


def collect_units(node: dict, out: list[dict], restrict: set[str] | None, inside: bool) -> None:
    """Flatten the unit tree into candidate targets, honoring --unit subtrees."""
    node_id = canon_unit_id(node.get("id", ""))
    in_scope = inside or restrict is None or node_id in restrict
    if in_scope and node_id:
        out.append({
            "id": node_id,
            "title": node.get("title", ""),
            "tokens": set(tokenize(node.get("title", "")))
            | set(tokenize(node.get("description", ""))),
            "title_tokens": set(tokenize(node.get("title", ""))),
        })
    for child in node.get("sub_units", []) or []:
        collect_units(child, out, restrict, in_scope)


def load_units(json_path: Path, unit_filters: list[str]) -> list[dict]:
    course = json.loads(json_path.read_text())
    restrict = {canon_unit_id(u) for u in unit_filters} if unit_filters else None
    units: list[dict] = []
    for top in course.get("units", []):
        collect_units(top, units, restrict, inside=False)
    if not units:
        sys.exit(f"No units found in {json_path} for filter {unit_filters}")
    return units


def match_unit(filename: str, units: list[dict]) -> tuple[dict | None, str]:
    """Return (best unit, confidence) by token overlap between filename and titles."""
    file_tokens = set(tokenize(Path(filename).stem))
    best, best_score = None, 0.0
    for unit in units:
        overlap = file_tokens & unit["tokens"]
        title_overlap = file_tokens & unit["title_tokens"]
        strong = file_tokens & unit["title_tokens"] & STRONG_TOKENS
        score = len(title_overlap) * 2 + len(overlap) + len(strong) * 3
        if score > best_score:
            best, best_score = unit, score
    if best is None or best_score == 0:
        return None, "none"
    title_overlap = file_tokens & best["title_tokens"]
    if len(title_overlap) >= 2 or (title_overlap & STRONG_TOKENS):
        return best, "high"
    if title_overlap:
        return best, "medium"
    return best, "low"


def compute_key(course_id: str, unit_id: str, local_path: Path) -> str:
    slug = slugify(local_path.stem)
    return (f"courses/{course_id}/{canon_unit_id(unit_id)}/"
            f"{slug}-{content_hash(local_path)}{local_path.suffix.lower()}")


def read_rows(csv_path: Path) -> list[dict]:
    with csv_path.open(newline="") as handle:
        return list(csv.DictReader(handle))


def write_rows(csv_path: Path, rows: list[dict]) -> None:
    with csv_path.open("w", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=CSV_FIELDS)
        writer.writeheader()
        writer.writerows(rows)


def cmd_map(args: argparse.Namespace) -> None:
    folder = Path(args.folder)
    if not folder.is_dir():
        sys.exit(f"Not a directory: {folder}")
    units = load_units(Path(args.json), args.unit)

    folder_slug = slugify(folder.name)
    csv_path = folder.parent / f"{folder_slug}_mapping.csv"
    md_path = folder.parent / f"{folder_slug}_review.md"
    if csv_path.exists() and not args.force:
        sys.exit(f"{csv_path} already exists — pass --force to regenerate (this discards review edits).")

    images = sorted(
        p for p in folder.iterdir()
        if p.is_file() and p.suffix.lower() in IMAGE_EXTENSIONS
    )
    skipped = sorted(
        p.name for p in folder.iterdir()
        if p.is_file() and p.suffix.lower() not in IMAGE_EXTENSIONS
    )
    if not images:
        sys.exit(f"No images ({', '.join(sorted(IMAGE_EXTENSIONS))}) found in {folder}")

    rows = []
    order_by_unit: dict[str, int] = {}
    for image in images:
        unit, confidence = match_unit(image.name, units)
        unit_id = unit["id"] if unit else ""
        order = ""
        if unit_id:
            order_by_unit[unit_id] = order_by_unit.get(unit_id, 0) + 1
            order = str(order_by_unit[unit_id])
        rows.append({
            "local_path": str(image),
            "proposed_unit_id": unit_id,
            "unit_title": unit["title"] if unit else "",
            "confidence": confidence,
            "s3_key": compute_key(args.course_id, unit_id, image) if unit_id else "",
            "cloudfront_url": f"https://{args.domain}/{compute_key(args.course_id, unit_id, image)}" if unit_id else "",
            "order": order,
            "status": "mapped" if unit_id else "needs_review",
        })

    write_rows(csv_path, rows)

    lines = [
        f"# Image review — {folder.name}",
        "",
        f"Generated by `scripts/course_images.py map`. Fix `proposed_unit_id` in `{csv_path.name}`",
        "based on the actual image content below, then run `upload`. Rows with an empty",
        "unit id (`status=needs_review`) are refused by `upload` and `merge`.",
        "",
    ]
    for row in rows:
        rel = Path(row["local_path"]).relative_to(folder.parent)
        lines += [
            f"## {Path(row['local_path']).name}",
            "",
            f"- proposed_unit_id: `{row['proposed_unit_id'] or '(unmatched)'}`"
            f" — {row['unit_title'] or 'NO MATCH'} (confidence: {row['confidence']})",
            f"- s3_key: `{row['s3_key'] or '-'}`",
            "",
            f"![{Path(row['local_path']).name}](<{rel}>)",
            "",
        ]
    md_path.write_text("\n".join(lines))

    needs_review = sum(1 for r in rows if r["status"] == "needs_review")
    print(f"Mapped {len(rows)} images -> {csv_path}")
    print(f"Review file with embedded images -> {md_path}")
    if skipped:
        print(f"Skipped non-image files: {', '.join(skipped)}")
    if needs_review:
        print(f"{needs_review} image(s) need review (empty proposed_unit_id).")
    for confidence in ("high", "medium", "low"):
        count = sum(1 for r in rows if r["confidence"] == confidence)
        if count:
            print(f"  confidence {confidence}: {count}")


def cmd_upload(args: argparse.Namespace) -> None:
    csv_path = Path(args.csv)
    rows = read_rows(csv_path)

    unresolved = [r for r in rows if not r["proposed_unit_id"].strip()]
    if unresolved:
        print(f"Refusing {len(unresolved)} row(s) with empty proposed_unit_id:")
        for row in unresolved:
            print(f"  - {row['local_path']}")
        if not args.skip_unresolved:
            sys.exit("Resolve them in the CSV or rerun with --skip-unresolved to upload the rest.")

    pending = []
    for row in rows:
        unit_id = row["proposed_unit_id"].strip()
        if not unit_id or row["status"] == "uploaded":
            continue
        local = Path(row["local_path"])
        if not local.is_file():
            sys.exit(f"Missing local file: {local}")
        # Recompute so reviewer-edited unit ids get a fresh key/URL.
        row["s3_key"] = compute_key(args.course_id, unit_id, local)
        row["cloudfront_url"] = f"https://{args.domain}/{row['s3_key']}"
        pending.append(row)

    if not pending:
        print("Nothing to upload (all rows uploaded or unresolved).")
        write_rows(csv_path, rows)
        return

    if not args.execute:
        print(f"DRY RUN — would upload {len(pending)} file(s) to s3://{args.bucket}:")
        for row in pending:
            print(f"  {row['local_path']} -> s3://{args.bucket}/{row['s3_key']}")
        write_rows(csv_path, rows)
        print(f"\nCSV keys/URLs refreshed: {csv_path}")
        print("Re-run with --execute to upload.")
        return

    check = subprocess.run(
        ["aws", "sts", "get-caller-identity", "--region", args.region],
        capture_output=True,
    )
    if check.returncode != 0:
        sys.exit("AWS credentials not configured (aws sts get-caller-identity failed).")

    uploaded = 0
    for row in pending:
        local = Path(row["local_path"])
        content_type = mimetypes.guess_type(local.name)[0] or "application/octet-stream"
        target = f"s3://{args.bucket}/{row['s3_key']}"
        print(f"Uploading {local.name} -> {target}")
        result = subprocess.run(
            ["aws", "s3", "cp", str(local), target,
             "--region", args.region, "--content-type", content_type],
            capture_output=True, text=True,
        )
        if result.returncode != 0:
            print(result.stderr.strip(), file=sys.stderr)
            write_rows(csv_path, rows)
            sys.exit(f"Upload failed for {local}; progress saved to {csv_path}")
        row["status"] = "uploaded"
        uploaded += 1

    write_rows(csv_path, rows)
    print(f"\nUploaded {uploaded} file(s). CSV updated: {csv_path}")


def cmd_merge(args: argparse.Namespace) -> None:
    csv_path = Path(args.csv)
    json_path = Path(args.json)
    rows = read_rows(csv_path)

    eligible = [
        r for r in rows
        if r["proposed_unit_id"].strip() and r["cloudfront_url"].strip()
        and r["status"] == "uploaded"
    ]
    skipped = len(rows) - len(eligible)
    if not eligible:
        sys.exit("No rows with status=uploaded to merge — run `upload --execute` first.")

    by_unit: dict[str, list[dict]] = {}
    for row in eligible:
        by_unit.setdefault(canon_unit_id(row["proposed_unit_id"]), []).append(row)
    for unit_rows in by_unit.values():
        unit_rows.sort(key=lambda r: (int(r["order"]) if r["order"].strip().isdigit() else 9999,
                                      r["local_path"]))

    course = json.loads(json_path.read_text())
    merged, appended = 0, 0

    def visit(node: dict) -> None:
        nonlocal merged, appended
        unit_rows = by_unit.pop(canon_unit_id(node.get("id", "")), None)
        if unit_rows is not None:
            urls = node.get("images_url") or []
            for row in unit_rows:
                if row["cloudfront_url"] not in urls:
                    urls.append(row["cloudfront_url"])
                    appended += 1
            node["images_url"] = urls
            merged += 1
        for child in node.get("sub_units", []) or []:
            visit(child)

    for top in course.get("units", []):
        visit(top)

    if by_unit:
        missing = ", ".join(sorted(by_unit))
        sys.exit(f"Unit id(s) not found in {json_path}: {missing} — fix the CSV, nothing written.")

    json_path.write_text(json.dumps(course, indent=2, ensure_ascii=False) + "\n")
    print(f"Merged {appended} URL(s) into {merged} unit(s) in {json_path}")
    if skipped:
        print(f"Skipped {skipped} row(s) not in status=uploaded.")
    print("Final step is manual: publish the JSON via the admin course editor (PUT /courses/:id).")


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__,
                                     formatter_class=argparse.RawDescriptionHelpFormatter)
    sub = parser.add_subparsers(dest="command", required=True)

    p_map = sub.add_parser("map", help="Scan folder, propose unit mapping, emit CSV + review.md")
    p_map.add_argument("folder", help="Author image folder (e.g. 'assets/courses/Pictures for Airports')")
    p_map.add_argument("--json", default=DEFAULT_JSON, help="Course JSON payload")
    p_map.add_argument("--course-id", default="35")
    p_map.add_argument("--domain", default=DEFAULT_DOMAIN)
    p_map.add_argument("--unit", action="append", default=[],
                       help="Restrict matching to this unit subtree (repeatable)")
    p_map.add_argument("--force", action="store_true", help="Overwrite an existing mapping CSV")
    p_map.set_defaults(func=cmd_map)

    p_upload = sub.add_parser("upload", help="Upload resolved rows to S3 (dry-run by default)")
    p_upload.add_argument("--csv", required=True, help="Mapping CSV from `map`")
    p_upload.add_argument("--course-id", default="35")
    p_upload.add_argument("--bucket", default=DEFAULT_BUCKET)
    p_upload.add_argument("--domain", default=DEFAULT_DOMAIN)
    p_upload.add_argument("--region", default=DEFAULT_REGION)
    p_upload.add_argument("--execute", action="store_true",
                          help="Actually upload (default is dry-run; touches the prod media bucket)")
    p_upload.add_argument("--skip-unresolved", action="store_true",
                          help="Upload resolved rows even if some rows still lack a unit id")
    p_upload.set_defaults(func=cmd_upload)

    p_merge = sub.add_parser("merge", help="Merge uploaded URLs into course JSON images_url")
    p_merge.add_argument("--csv", required=True, help="Mapping CSV (rows must be status=uploaded)")
    p_merge.add_argument("--json", default=DEFAULT_JSON, help="Course JSON payload to update")
    p_merge.set_defaults(func=cmd_merge)

    args = parser.parse_args()
    args.func(args)


if __name__ == "__main__":
    main()
