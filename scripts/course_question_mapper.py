#!/usr/bin/env python3
"""
Map FAA Part 107 CSV questions to course unit / sub_unit IDs using the full
course hierarchy from faa_107_course.json (names and paths), not distractor keywords.
"""

from __future__ import annotations

import json
import re
from dataclasses import dataclass, field
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
COURSE_JSON = ROOT / "assets" / "articles" / "faa_107_course.json"


def _norm(s: str) -> str:
    s = s.lower().strip()
    s = s.replace("\u2013", "-").replace("\u2014", "-").replace("\u2011", "-")
    s = re.sub(r"[^\w\s/-]", " ", s)
    s = re.sub(r"\s+", " ", s)
    return s.strip()


def _tokens(s: str) -> set[str]:
    stop = {
        "a", "an", "the", "and", "or", "of", "to", "in", "for", "on", "at", "by",
        "with", "from", "as", "is", "are", "be", "that", "this", "under", "part",
    }
    return {t for t in _norm(s).split() if len(t) > 2 and t not in stop}


def unit_id_from_node_id(node_id: int) -> int:
    if node_id < 10:
        return node_id
    if node_id < 100:
        return node_id // 10
    return node_id // 100


@dataclass
class CourseNode:
    id: int
    title: str
    path: tuple[str, ...]  # includes this node's title
    unit_id: int
    is_leaf: bool
    norm_path: str = ""
    norm_title: str = ""
    aliases: list[str] = field(default_factory=list)

    def __post_init__(self) -> None:
        self.norm_path = _norm(" > ".join(self.path))
        self.norm_title = _norm(self.path[-1])


def load_course_index(path: Path = COURSE_JSON) -> dict[int, CourseNode]:
    data = json.loads(path.read_text(encoding="utf-8"))
    nodes: dict[int, CourseNode] = {}

    def walk(items: list, prefix: tuple[str, ...]) -> None:
        for item in items:
            title = (item.get("title") or "").strip()
            path = prefix + (title,)
            subs = item.get("sub_units") or []
            node = CourseNode(
                id=int(item["id"]),
                title=title,
                path=path,
                unit_id=unit_id_from_node_id(int(item["id"])),
                is_leaf=len(subs) == 0,
            )
            nodes[node.id] = node
            walk(subs, path)

    for top in data.get("units", []):
        walk([top], ())

    _attach_aliases(nodes)
    return nodes


# Exact spreadsheet Sub Category strings → sub_unit_id (after _norm)
SUB_CATEGORY_EXACT: dict[str, int] = {
    "flying over people and moving objects": 16,
    "operational rules moving over people": 16,
    "operational rules operations over people": 16,
    "operational rules transportation of property": 134,
    "operational rules vlos": 135,
    "operational rules multiple aircraft": 135,
    "operational rules autonomous flight": 137,
    "operational rules preflight": 138,
    "operational rules visibility clouds": 139,
    "operational rules weather": 139,
    "operational rules accident": 132,
    "operational rules alcohol": 133,
    "operational rules medical condition": 133,
    "operational rules hazardous operations": 132,
    "operational rules impaired": 133,
    "operational rules medication": 133,
    "operational rules emergency": 132,
    "operational rules waivers": 14,
    "operating rules waivers": 14,
    "operating rules alcohol": 133,
    "operating rules twilight": 17,
    "flying at night": 17,
    "aircraft registration": 131,
    "opeartional rules inspection compliance": 131,
    "applicability": 11,
    "roles": 12,
    "overview l l": 22,
    "l l": 22,
    "sectional terminal charts": 241,
    "aeronautical charts": 241,
    "airport data sources": 23,
    "airport operations": 41,
    "airport operations traffic patterns": 43,
    "airport operations radio communications procedures": 421,
    "airport operations non-towered airports": 421,
    "airport operations runways": 422,
    "airport operations wildlife": 45,
    "airport operations moa": 334,
    "airport operations operating requirements": 41,
    "airport classificatons": 41,
    "airports airports data sources": 23,
    "airports data sources": 23,
    "airspace classification": 31,
    "airspace classifications": 31,
    "airspace classifications moa": 334,
    "airspace classifications mtr": 342,
    "airspace classifications operating rules": 32,
    "airspace controlled vs non controlled airspace": 32,
    "controlled vs non controlled airspace": 32,
    "overview notams": 232,
    "regulations airport classifications": 41,
    "sources metar": 53,
    "sources taf": 55,
    "metar": 53,
    "taf": 55,
    "effects on performance": 61,
    "effects on performance clouds": 661,
    "effects on performance icing": 652,
    "effects on performance obstacles": 631,
    "effects on performance temperature inversion": 642,
    "effects on performance air density": 612,
    "effects on performance air density alt pressure": 612,
    "effects on performance fog": 673,
    "effects on performance fronts": 671,
    "effects on performance frost": 651,
    "effects on performance wind": 631,
    "effects on performance thunderstorms": 662,
    "loading and performance": 71,
    "adm": 91,
    "adm crfm": 93,
    "adm crm": 93,
    "emergency procedure": 81,
    "emeregency": 81,
    "maintenance inspection procedures": 95,
    "physiological factors": 94,
    "airport communications": 421,
    "airport communications traffic patterns": 43,
    "communications": 421,
    "runways": 422,
    "r signs": 44,
    "classes": 32,
    "regulations operational rules autonomous": 137,
    "airspace classifications": 31,
}


def _attach_aliases(nodes: dict[int, CourseNode]) -> None:
    """Spreadsheet / slide labels → node ids (full names from course + CSV conventions)."""
    extra: list[tuple[str, int]] = [
        # Unit 1 — Regulations
        ("applicability of part 107", 11),
        ("applicability", 11),
        ("roles and crew", 12),
        ("crew management", 12),
        ("person manipulating", 12),
        ("visual observer", 12),
        ("aircraft registration", 131),
        ("registration inspection", 131),
        ("inspection compliance", 131),
        ("accident reporting", 132),
        ("hazardous operations", 132),
        ("in-flight emergency", 132),
        ("medical condition", 133),
        ("alcohol", 133),
        ("moving vehicles", 134),
        ("transportation of property", 134),
        ("visual line of sight", 135),
        ("vlos", 135),
        ("multiple aircraft", 135),
        ("right-of-way", 136),
        ("see and avoid", 136),
        ("autonomous flight", 137),
        ("preflight familiarization", 138),
        ("operating limitations", 139),
        ("visibility clouds", 139),
        ("visibility & clouds", 139),
        ("visibility and clouds", 139),
        ("rpic duties", 12),
        ("rpic", 12),
        ("10 roles", 12),
        ("waivers", 14),
        ("waiver timing", 14),
        ("remote id", 15),
        ("fria", 15),
        ("flying over people", 16),
        ("flying over people and moving objects", 16),
        ("operations over people", 16),
        ("category 1", 16),
        ("category 2", 16),
        ("category 3", 16),
        ("category 4", 16),
        ("night operations", 17),
        ("flying at night", 17),
        # Unit 2
        ("latitude longitude", 22),
        ("l & l", 22),
        ("chart supplement", 231),
        ("notam", 232),
        ("notices to airmen", 232),
        ("atis", 233),
        ("sectional chart", 241),
        ("terminal area chart", 241),
        ("airport symbols", 242),
        ("maximum elevation figure", 243),
        ("mef", 243),
        ("four essential airport data", 23),
        ("introduction to air traffic", 21),
        # Unit 3
        ("airspace classification", 31),
        ("airspace symbols", 311),
        ("controlled airspace", 32),
        ("class a airspace", 321),
        ("class b airspace", 322),
        ("class c airspace", 323),
        ("class d airspace", 324),
        ("class e2", 327),
        ("class e3", 328),
        ("class e4", 328),
        ("class e", 325),
        ("class g", 329),
        ("chart question", 38),
        ("faa-ct-8080", 38),
        ("special use airspace", 33),
        ("restricted area", 331),
        ("prohibited area", 332),
        ("warning area", 333),
        ("military operations area", 334),
        ("moa", 334),
        ("alert area", 335),
        ("controlled firing", 336),
        ("temporary flight restriction", 343),
        ("tfr", 343),
        ("military training route", 342),
        ("mtr", 342),
        ("national security area", 347),
        ("adiz", 348),
        # Unit 4
        ("airport classification", 41),
        ("airport operations", 41),
        ("runway orientation", 42),
        ("runway heading", 422),
        ("towered airport", 421),
        ("traffic pattern", 43),
        ("airport signs", 44),
        ("runway signs", 44),
        ("wildlife", 45),
        ("security identification", 45),
        ("sida", 45),
        # Unit 5
        ("weather sources", 51),
        ("awos asos", 52),
        ("metar", 53),
        ("metar decoding", 53),
        ("forecast products", 54),
        ("taf", 55),
        ("taf decoding", 55),
        ("sigmet", 542),
        ("airmet", 543),
        ("winds aloft", 543),
        # Unit 6
        ("density altitude", 612),
        ("air pressure density", 61),
        ("humidity", 62),
        ("wind shear", 632),
        ("microburst", 632),
        ("turbulence", 631),
        ("temperature inversion", 642),
        ("dew point", 651),
        ("structural icing", 652),
        ("icing", 652),
        ("cloud types", 661),
        ("thunderstorm", 662),
        ("thunderstorm life cycle", 662),
        ("effects on performance", 61),
        ("effects on performance clouds", 661),
        ("fronts mountain", 671),
        ("mountain flying", 672),
        ("ceiling visibility minimums", 673),
        ("remaining weather", 67),
        # Unit 7
        ("loading performance", 71),
        ("load factor", 715),
        ("center of gravity", 77),
        ("weight balance", 73),
        ("stall", 723),
        ("forces in flight", 71),
        ("forces during a turn", 72),
        # Unit 8
        ("emergency procedures", 81),
        ("lost link", 81),
        ("preflight planning emergency", 82),
        ("lithium", 81),
        ("battery fire", 81),
        # Unit 9
        ("aeronautical decision", 91),
        ("adm", 91),
        ("risk management", 92),
        ("hazardous attitudes", 922),
        ("imsafe", 923),
        ("pave", 924),
        ("crew resource management", 93),
        ("crm", 93),
        ("situational awareness", 933),
        ("vision scanning", 941),
        ("maintenance inspection procedures", 95),
        ("physiology vision", 94),
    ]

    for node in nodes.values():
        node.aliases.append(node.norm_path)
        node.aliases.append(node.norm_title)
        for seg in node.path:
            node.aliases.append(_norm(seg))

    for phrase, nid in extra:
        if nid in nodes:
            nodes[nid].aliases.append(_norm(phrase))


# Spreadsheet Category (column H) → default course unit (1–9)
CATEGORY_TO_UNIT: dict[str, int | None] = {
    "regulations": 1,
    "airports & airspace": None,
    "airspace": 3,
    "weather": None,
    "loading & performance": 7,
    "loading and performance": 7,
    "operations": None,
    "additional topics": None,
    "additional topic": None,
}


def _parse_slide_subcategory(sub: str) -> str | None:
    m = re.match(r"slide\s*(\d+)\s*[-–]\s*(.+)", sub.strip(), re.IGNORECASE)
    if m:
        return _norm(m.group(2))
    return None


def _score_node(node: CourseNode, hay: str, tokens: set[str]) -> float:
    best = 0.0
    for alias in node.aliases:
        if not alias:
            continue
        if alias in hay:
            best = max(best, 1.0 + len(alias) / 200)
        atoks = _tokens(alias)
        if atoks:
            overlap = len(tokens & atoks) / max(len(atoks), 1)
            if overlap >= 0.55:
                best = max(best, overlap + 0.1 * len(node.path))
    return best


@dataclass
class MapResult:
    unit_id: int | None
    sub_unit_id: int | None
    course_path: str
    method: str
    score: float
    needs_review: bool = False
    review_reason: str = ""


def _descendant_leaves(nodes: dict[int, CourseNode], node: CourseNode) -> list[CourseNode]:
    prefix = node.path
    return [
        n for n in nodes.values()
        if n.is_leaf
        and len(n.path) > len(prefix)
        and n.path[: len(prefix)] == prefix
    ]


def _resolve_leaf(
    nodes: dict[int, CourseNode], node_id: int, hay: str, tokens: set[str]
) -> CourseNode:
    """Quiz targets must be leaf lessons; descend from section folders when needed."""
    node = nodes[node_id]
    if node.is_leaf:
        return node
    leaves = _descendant_leaves(nodes, node)
    if not leaves:
        return node
    best: tuple[float, CourseNode] | None = None
    for leaf in leaves:
        sc = _score_node(leaf, hay, tokens)
        if best is None or sc > best[0]:
            best = (sc, leaf)
    if best and best[0] >= 0.2:
        return best[1]
    return leaves[0]


def _finish_map(
    nodes: dict[int, CourseNode],
    *,
    unit_id: int | None,
    sub_unit_id: int | None,
    method: str,
    score: float,
    hay: str,
    tokens: set[str],
    needs_review: bool = False,
    review_reason: str = "",
) -> MapResult:
    if sub_unit_id is not None and sub_unit_id in nodes:
        n = _resolve_leaf(nodes, sub_unit_id, hay, tokens)
        if n.id != sub_unit_id:
            method = f"{method}_to_leaf"
        return MapResult(
            unit_id=n.unit_id,
            sub_unit_id=n.id,
            course_path=" > ".join(n.path),
            method=method,
            score=score,
            needs_review=needs_review,
            review_reason=review_reason,
        )
    return MapResult(
        unit_id=unit_id,
        sub_unit_id=sub_unit_id,
        course_path="",
        method=method,
        score=score,
        needs_review=needs_review,
        review_reason=review_reason,
    )


def map_question_to_course(
    *,
    question: str,
    category: str,
    sub_category: str,
    explanation: str = "",
    nodes: dict[int, CourseNode] | None = None,
) -> MapResult:
    """
    Map one question to the best-matching leaf (or section) in the course tree.
    Uses question + sub_category + category only (not answer choices).
    """
    if nodes is None:
        nodes = load_course_index()

    cat = _norm(category)
    sub = _norm(sub_category)
    qhay = _norm(f"{question} {explanation}")
    qtokens = _tokens(f"{sub} {qhay}")

    # --- 1) Slide label (end-of-unit sheet) ---
    slide_topic = _parse_slide_subcategory(sub_category)
    if slide_topic:
        best_slide: tuple[float, CourseNode] | None = None
        for node in nodes.values():
            if not node.is_leaf:
                continue
            for alias in node.aliases:
                if alias and (alias in slide_topic or slide_topic in alias):
                    sc = 2.0 + len(alias)
                    if best_slide is None or sc > best_slide[0]:
                        best_slide = (sc, node)
        if best_slide:
            n = best_slide[1]
            return _finish_map(
                nodes,
                unit_id=n.unit_id,
                sub_unit_id=n.id,
                method="slide_sub_category",
                score=best_slide[0],
                hay=qhay,
                tokens=qtokens,
            )

    # Generic "Operating Rules" / "Operational Rules" → best leaf under Unit 1 §13
    if sub in {"operating rules", "operational rules", "operations"}:
        op_leaves = [
            n for n in nodes.values()
            if n.is_leaf and n.unit_id == 1 and 11 <= n.id <= 139
        ]
        best_op: tuple[float, CourseNode] | None = None
        for node in op_leaves:
            sc = _score_node(node, f"{sub} {qhay}", qtokens)
            if best_op is None or sc > best_op[0]:
                best_op = (sc, node)
        if best_op and best_op[0] >= 0.25:
            n = best_op[1]
            return _finish_map(
                nodes,
                unit_id=n.unit_id,
                sub_unit_id=n.id,
                method="operational_rules_leaf",
                score=best_op[0],
                hay=qhay,
                tokens=qtokens,
            )

    # --- 2) Exact spreadsheet sub_category table ---
    if sub and sub in SUB_CATEGORY_EXACT:
        nid = SUB_CATEGORY_EXACT[sub]
        if nid in nodes:
            n = nodes[nid]
            return _finish_map(
                nodes,
                unit_id=n.unit_id,
                sub_unit_id=n.id,
                method="sub_category_exact",
                score=3.0,
                hay=qhay,
                tokens=qtokens,
            )

    # --- 3) Exact / alias match on full sub_category string ---
    if sub:
        best_alias: tuple[float, CourseNode] | None = None
        for node in nodes.values():
            for alias in node.aliases:
                if not alias:
                    continue
                if sub == alias or alias in sub or sub in alias:
                    depth = len(node.path)
                    sc = 1.5 + depth * 0.05 + (0.5 if sub == alias else 0)
                    if best_alias is None or sc > best_alias[0]:
                        best_alias = (sc, node)
        if best_alias and best_alias[0] >= 1.5:
            n = best_alias[1]
            return _finish_map(
                nodes,
                unit_id=n.unit_id,
                sub_unit_id=n.id,
                method="sub_category_alias",
                score=best_alias[0],
                hay=qhay,
                tokens=qtokens,
            )

    # --- 4) Constrain by spreadsheet category → unit ---
    allowed_units: set[int] | None = None
    if cat in CATEGORY_TO_UNIT:
        u = CATEGORY_TO_UNIT[cat]
        if u is not None:
            allowed_units = {u}
        elif cat == "airports & airspace":
            allowed_units = {2, 3, 4}
        elif cat == "weather":
            allowed_units = {5, 6}
        elif cat in {"operations", "additional topics", "additional topic"}:
            allowed_units = {1, 2, 3, 4, 5, 6, 7, 8, 9}

    # Weather sub_category hints
    if cat == "weather" and sub:
        if "taf" in sub:
            n = nodes.get(55) or nodes.get(553)
            if n:
                return _finish_map(
                    nodes, unit_id=5, sub_unit_id=n.id,
                    method="weather_sub=taf", score=3.0, hay=qhay, tokens=qtokens,
                )
        if "metar" in sub:
            n = nodes.get(53)
            if n:
                return _finish_map(
                    nodes, unit_id=5, sub_unit_id=n.id,
                    method="weather_sub=metar", score=3.0, hay=qhay, tokens=qtokens,
                )
        if any(x in sub for x in ("density", "pressure", "alt", "humidity", "performance")):
            if "cloud" not in sub or "density" in sub or "alt" in sub:
                n = nodes.get(612) or nodes.get(61)
                if n:
                    return _finish_map(
                        nodes, unit_id=6, sub_unit_id=n.id,
                        method="weather_sub=effects", score=3.0, hay=qhay, tokens=qtokens,
                    )

    # Airports & airspace sub hints
    if cat == "airports & airspace" and sub:
        if "traffic pattern" in sub:
            n = nodes[43]
            return _finish_map(
                nodes, unit_id=4, sub_unit_id=n.id,
                method="aa_sub=traffic", score=3.0, hay=qhay, tokens=qtokens,
            )
        if "moa" in sub or "military operations" in sub:
            n = nodes[334]
            return _finish_map(
                nodes, unit_id=3, sub_unit_id=n.id,
                method="aa_sub=moa", score=3.0, hay=qhay, tokens=qtokens,
            )
        if "sectional" in sub or "terminal chart" in sub:
            n = nodes[241]
            return _finish_map(
                nodes, unit_id=2, sub_unit_id=n.id,
                method="aa_sub=charts", score=3.0, hay=qhay, tokens=qtokens,
            )
        if "l &l" in sub or "latitude" in sub:
            n = nodes[22]
            return _finish_map(
                nodes, unit_id=2, sub_unit_id=n.id,
                method="aa_sub=latlon", score=3.0, hay=qhay, tokens=qtokens,
            )
        if "airport operation" in sub:
            n = nodes[41]
            return _finish_map(
                nodes, unit_id=4, sub_unit_id=n.id,
                method="aa_sub=airport_ops", score=3.0, hay=qhay, tokens=qtokens,
            )

    # Loading sub
    if cat in {"loading & performance", "loading and performance"}:
        n = _best_leaf_in_unit(nodes, 7, qhay, qtokens)
        if n:
            return _finish_map(
                nodes, unit_id=7, sub_unit_id=n.id,
                method="category=loading", score=2.5, hay=qhay, tokens=qtokens,
            )

    # --- 5) Token overlap against all leaf nodes ---
    candidates: list[tuple[float, CourseNode]] = []
    for node in nodes.values():
        if allowed_units and node.unit_id not in allowed_units:
            continue
        if not node.is_leaf:
            continue
        sc = _score_node(node, f"{sub} {qhay}", qtokens)
        if sc > 0.35:
            candidates.append((sc + len(node.path) * 0.02, node))

    if candidates:
        candidates.sort(key=lambda x: (-x[0], -len(x[1].path)))
        sc, n = candidates[0]
        second = candidates[1][0] if len(candidates) > 1 else 0
        review = sc < 0.55 or (second > 0 and sc - second < 0.08)
        return _finish_map(
            nodes,
            unit_id=n.unit_id,
            sub_unit_id=n.id,
            method="course_path_tokens",
            score=sc,
            hay=qhay,
            tokens=qtokens,
            needs_review=review,
            review_reason="Low confidence path match" if review else "",
        )

    # --- 6) Parent unit only from category ---
    if allowed_units and len(allowed_units) == 1:
        u = next(iter(allowed_units))
        return MapResult(
            unit_id=u,
            sub_unit_id=None,
            course_path=f"Unit {u} (unscoped)",
            method="category_unit_only",
            score=0.4,
            needs_review=True,
            review_reason="Matched unit but not a specific lesson",
        )

    return MapResult(
        unit_id=None,
        sub_unit_id=None,
        course_path="",
        method="unmapped",
        score=0.0,
        needs_review=True,
        review_reason="No course path match",
    )


def _best_leaf_in_unit(
    nodes: dict[int, CourseNode], unit_id: int, hay: str, tokens: set[str]
) -> CourseNode | None:
    best: tuple[float, CourseNode] | None = None
    for node in nodes.values():
        if node.unit_id != unit_id or not node.is_leaf:
            continue
        sc = _score_node(node, hay, tokens)
        if sc > 0.3 and (best is None or sc > best[0]):
            best = (sc, node)
    return best[1] if best else None


@dataclass
class HierarchyColumns:
    unit_title: str = ""
    section_id: int | None = None
    section_title: str = ""
    lesson_id: int | None = None
    lesson_title: str = ""
    tree_depth: int = 0
    maps_to_leaf: bool = False


def _path_key(path: tuple[str, ...]) -> str:
    return _norm(" > ".join(path))


def build_path_index(nodes: dict[int, CourseNode]) -> dict[str, int]:
    return {_path_key(n.path): n.id for n in nodes.values()}


def hierarchy_for_sub_unit(
    nodes: dict[int, CourseNode],
    sub_unit_id: int | None,
    path_index: dict[str, int] | None = None,
) -> HierarchyColumns:
    """Split course_path into unit / section / lesson for review CSV columns."""
    if path_index is None:
        path_index = build_path_index(nodes)
    out = HierarchyColumns()
    if sub_unit_id is None or sub_unit_id not in nodes:
        return out

    node = nodes[sub_unit_id]
    out.tree_depth = len(node.path)
    out.maps_to_leaf = node.is_leaf
    if not node.path:
        return out

    out.unit_title = node.path[0]
    if len(node.path) >= 3:
        out.section_title = node.path[1]
        out.lesson_title = node.path[-1]
        out.section_id = path_index.get(_path_key(node.path[:2]))
        if node.is_leaf:
            out.lesson_id = sub_unit_id
    elif len(node.path) == 2:
        out.lesson_title = node.path[1]
        if node.is_leaf:
            out.lesson_id = sub_unit_id
    else:
        out.lesson_title = node.path[-1]
        if node.is_leaf:
            out.lesson_id = sub_unit_id

    return out


def course_paths_report(nodes: dict[int, CourseNode] | None = None) -> list[dict]:
    """All leaf paths for documentation / review."""
    if nodes is None:
        nodes = load_course_index()
    rows = []
    for node in sorted(nodes.values(), key=lambda n: (n.unit_id, n.path)):
        if node.is_leaf:
            rows.append({
                "unit_id": node.unit_id,
                "sub_unit_id": node.id,
                "course_path": " > ".join(node.path),
            })
    return rows
