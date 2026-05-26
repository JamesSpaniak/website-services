#!/usr/bin/env python3
"""
Build a bulk-upload JSON for the FAA Part 107 question bank.

Reads:
  - assets/articles/Compiled questions Part 107 Testing.xlsx - test.csv
  - assets/articles/Compiled questions Part 107 Testing.xlsx - end of unit questions.csv
  - assets/articles/faa_107_course.json

Writes:
  - assets/articles/faa_107_questions.bulk.json          POST body for /questions/import
  - assets/articles/faa_107_questions_review.csv           full mapping review (all questions)
  - assets/articles/faa_107_questions_needs_review.csv     rows needing mapping attention
  - assets/articles/faa_107_course_leaf_paths.csv          canonical leaf lessons
  - assets/articles/faa_107_questions_gaps.md              gap report + risks

Final-exam-only questions use standard="FINAL_EXAM", priority=3, unit_id=null,
sub_unit_id=null so they only appear in full_course exam generation (see ExamGeneratorService).

Run:  python3 scripts/build_faa_107_questions.py
"""

from __future__ import annotations

import csv
import json
import re
import sys
from collections import Counter
from dataclasses import dataclass
from pathlib import Path

from course_question_mapper import (
    build_path_index,
    hierarchy_for_sub_unit,
    load_course_index,
    map_question_to_course,
)

ROOT = Path(__file__).resolve().parents[1]
ASSETS = ROOT / "assets" / "articles"
CSV_TEST = ASSETS / "Compiled questions Part 107 Testing.xlsx - test.csv"
CSV_EOU = ASSETS / "Compiled questions Part 107 Testing.xlsx - end of unit questions.csv"
COURSE_JSON = ASSETS / "faa_107_course.json"

# Tag stored in questions.standard — filter in UI or future exam generator if needed
FINAL_EXAM_STANDARD = "FINAL_EXAM"

OUT_JSON = ASSETS / "faa_107_questions.bulk.json"
OUT_CSV = ASSETS / "faa_107_questions_review.csv"
OUT_NEEDS_REVIEW = ASSETS / "faa_107_questions_needs_review.csv"
OUT_GAPS = ASSETS / "faa_107_questions_gaps.md"

REVIEW_CSV_HEADER = [
    "sheet", "row", "category", "sub_category",
    "unit_id", "unit_title",
    "section_id", "section_title",
    "lesson_id", "lesson_title",
    "tree_depth", "maps_to_leaf",
    "sub_unit_id", "course_path", "match_score",
    "topical_unit_id",
    "final_exam_only", "final_exam_reason",
    "classified_by", "needs_review", "review_reason",
    "attention_reason",
    "source_file", "answer", "question",
]

# faa_107_course.json -> id
COURSE_ID = 35

# ── Unit map ──────────────────────────────────────────────────────────────────
# Built from faa_107_course.json. All 9 units are now present:
#   1  Part 107 Regulations
#   2  Airports, Airspace & Data Sources
#   3  Airspace Classifications
#   4  Airport Operations
#   5  Weather (sources, METAR, TAF, SIGMET/AIRMET, observations)
#   6  Weather Effects on Aircraft Performance (density alt, wind, clouds, …)
#   7  Loading & Performance
#   8  Emergency Procedures
#   9  Aeronautical Decision Making
UNITS_PRESENT = {1, 2, 3, 4, 5, 6, 7, 8, 9}
UNITS_MISSING: dict[int, str] = {}

# Slide → sub_unit_id mapping for "Regulations" sub-categories in the
# 'end of unit questions' sheet (format: "Slide N – Topic").
SLIDE_TOPIC_TO_SUBUNIT: list[tuple[str, int]] = [
    ("applicability exclusions", 11),
    ("applicability", 11),
    ("rpic duties", 12),
    ("rpic", 12),
    ("person manipulating", 12),
    ("visual observer", 12),
    ("flight crew management", 12),
    ("communication", 12),
    ("roles", 12),
    ("aircraft registration", 131),
    ("inspection & compliance", 131),
    ("inspection and compliance", 131),
    ("accident reporting", 132),
    ("in‑flight emergency", 132),
    ("in-flight emergency", 132),
    ("hazardous operations", 132),
    ("medical condition", 133),
    ("alcohol", 133),
    ("moving vehicles", 134),
    ("vlos", 135),
    ("multiple aircraft", 135),
    ("operations over people", 16),
    ("category 1", 16),
    ("category 4", 16),
    ("autonomous flight", 137),
    ("airspace", 138),  # "Slide 68 – Airspace" — preflight + airspace operations
    ("operating limitations", 139),
    ("visibility & clouds", 139),
    ("visibility and clouds", 139),
    ("waivers", 14),
    ("waiver timing", 14),
    ("night operations", 17),
    ("remote id compliance", 15),
    ("remote id", 15),
    ("fria", 15),
]

# Keyword classifier — applied in order. Each rule returns (unit_id, sub_unit_id).
# sub_unit_id may be None to scope only to the unit.
KEYWORD_RULES: list[tuple[re.Pattern, int, int | None, str]] = []


def _kw(pattern: str, unit: int, sub: int | None, label: str) -> None:
    KEYWORD_RULES.append((re.compile(pattern, re.IGNORECASE), unit, sub, label))


# Unit 1 — Regulations -------------------------------------------------------
_kw(r"\bapplicab(le|ility)\b|\bpart 107 does not apply\b", 1, 11, "Applicability")
_kw(r"\brpic\b|\bremote pilot in command\b|\bremote pilot certificate\b|"
    r"\bvisual observer\b|\bperson manipulating\b|\bcrew briefing\b", 1, 12, "Roles & Crew")
_kw(r"\bregister(ed|ation)?\b|\bpart 47\b|\bpart 48\b|\bfalsification\b|"
    r"\binspection\b.{0,30}(compliance|fa(a|aa))", 1, 131, "Registration/Inspection")
_kw(r"\baccident\b|\b\$500\b|\bin[- ]?flight emergency\b|"
    r"\bhazardous operation\b|\breckless\b|\bdrop(ped|ping)? .* hazard", 1, 132,
    "Accident/Emergency/Hazardous")
_kw(r"\bmedical\b|\balcohol\b|\bdrugs?\b|\bimpair(ed|ment)\b|\b0\.04\b|\b8 hours\b",
    1, 133, "Medical/Alcohol/Drugs")
_kw(r"\bmoving vehicle\b|\btransport(ation)? of property\b|\bsparsely populated\b",
    1, 134, "Moving vehicle/Transport")
_kw(r"\bvisual line of sight\b|\bvlos\b|\bmultiple (small )?unmanned\b|"
    r"\bmore than one (unmanned|small)\b", 1, 135, "VLOS/Multi-aircraft")
_kw(r"\bright[- ]of[- ]way\b|\byield\b.*aircraft|\bsee and avoid\b|"
    r"\bcollision hazard\b", 1, 136, "Right-of-way")
_kw(r"\bautonomous\b|\breturn[- ]to[- ]home\b|\bpre[- ]?programmed\b", 1, 137, "Autonomous")
_kw(r"\bpreflight (familiariz|inspection|check)|\bclass b\b|\bclass c\b|\bclass d\b|"
    r"\bauthorization\b.*(controlled|airspace)|\bnotam\b|\btfr\b|\bprohibited area\b|"
    r"\brestricted area\b", 1, 138, "Preflight/Airspace ops")
_kw(r"\b400 feet\b|\b400 ft\b|\b87 knots\b|\b100 (mph|miles per hour)\b|"
    r"\b3 (statute )?miles?\b|\b500 feet below\b|\b2[,]?000 feet horizontally\b|"
    r"\bgroundspeed\b|\bagl\b", 1, 139, "Operating limitations")
_kw(r"\bwaiver\b|\bcertificate of waiver\b|\blaanc\b|\bdrone zone\b", 1, 14, "Waivers")
_kw(r"\bremote id\b|\bfria\b|\bbroadcast module\b|\bdeclaration of compliance\b|"
    r"\bmeans of compliance\b|\bdigital license plate\b", 1, 15, "Remote ID")
_kw(r"\bover (people|a person|persons)\b|\bcategory [1-4]\b|\bopen[- ]air assembly\b|"
    r"\bsustained flight\b|\b(0\.55|250\s*g)\b|\b11 ft[- ]?lb\b|\b25 ft[- ]?lb\b",
    1, 16, "Flying over people")
_kw(r"\bnight\b|\bcivil twilight\b|\banti[- ]?collision light\b|\bnight blind\b",
    1, 17, "Night ops")

# Unit 2 — Airports, Airspace & Data sources --------------------------------
_kw(r"\blatitude\b|\blongitude\b|\bmeridian\b|\bequator\b|\bdms\b|\bdecimal degrees\b",
    2, 22, "Latitude/Longitude")
_kw(r"\bchart supplement\b|\bcsu\b|\bnotam\b|\batis\b|\baeronautical information\b",
    2, 23, "Data sources")
_kw(r"\bsectional chart\b|\bterminal area chart\b|\btac\b|\bmef\b|"
    r"\bmaximum elevation figure\b|\bobstacle\b|\blegend\b|\b56[- ]day\b|"
    r"\bchart.*updated?\b|\bcharts.*update\b|\baeronautical chart\b",
    2, 241, "Charts/Sectional")
_kw(r"\bchart symbol\b|\bairport symbol\b|\bmagenta\b|\bblue\b.*airport|"
    r"\bairport color\b|\binterpret.*chart\b", 2, 242, "Chart symbols/colors")
_kw(r"\brunway elevation\b", 2, 243, "Runway elevation (chart)")
_kw(r"\bnational airspace system\b|\bnas\b|\bair traffic control\b|\batc\b",
    2, 21, "NAS/ATC")

# Unit 3 — Airspace classifications -----------------------------------------
_kw(r"\bclass a\b", 3, 321, "Class A")
_kw(r"\bclass b\b", 3, 322, "Class B")
_kw(r"\bclass c\b", 3, 323, "Class C")
_kw(r"\bclass d\b", 3, 324, "Class D")
_kw(r"\bclass e2\b|\be2 airspace\b", 3, 327, "Class E2")
_kw(r"\bclass e3\b|\be3 airspace\b|\bclass e4\b|\be4 airspace\b", 3, 328, "Class E3/E4")
_kw(r"\bclass e\b|\bclass e airspace\b", 3, 325, "Class E")
_kw(r"\bclass g\b|\buncontrolled airspace\b", 3, 329, "Class G")
_kw(r"\brefer to faa-ct-8080.*figure\b|\bairspace.*chart question\b", 3, 38, "Chart questions")
_kw(r"\brestricted area\b", 3, 331, "Restricted")
_kw(r"\bprohibited area\b", 3, 332, "Prohibited")
_kw(r"\bwarning area\b", 3, 333, "Warning")
_kw(r"\bmilitary operations? area\b|\bmoa\b", 3, 334, "MOA")
_kw(r"\balert area\b", 3, 335, "Alert")
_kw(r"\bcontrolled firing area\b|\bcfa\b", 3, 336, "CFA")
_kw(r"\blocal airport advisory\b|\blaa\b", 3, 341, "LAA")
_kw(r"\bmilitary training route\b|\bmtr\b", 3, 342, "MTR")
_kw(r"\btemporary flight restriction\b|\btfr\b", 3, 343, "TFR")
_kw(r"\bparachute jump\b", 3, 344, "Parachute jump")
_kw(r"\bvfr route\b|\bpublished vfr\b", 3, 345, "VFR Routes")
_kw(r"\bterminal radar service area\b|\btrsa\b", 3, 346, "TRSA")
_kw(r"\bnational security area\b|\bnsa\b", 3, 347, "NSA")
_kw(r"\bair defense identification zone\b|\badiz\b", 3, 348, "ADIZ")
_kw(r"\bspecial use airspace\b|\bsua\b", 3, 33, "SUA")

# Unit 4 — Airport Operations -----------------------------------------------
_kw(r"\btraffic pattern\b|\bdownwind\b|\bbase leg\b|\bfinal approach\b|"
    r"\bcrosswind\b|\bleft pattern\b|\bstandard (airport )?traffic pattern\b|"
    r"\barrival and departure\b|\barriving and departing\b", 4, 43, "Traffic Patterns")
_kw(r"\brunway (heading|number|orientation|layout|numbers?|04l|13|36)\b|"
    r"\brunway markings?\b|\brunway numbers are\b|\b\"l\" in runway\b|"
    r"\b\u201cl\u201d in runway\b|\b04l\b|\brunway 04l\b", 4, 422,
    "Runway heading/markings")
_kw(r"\bctaf\b|\bunicom\b|\bmulticom\b|\bnon[- ]?towered\b|\btowered airport\b|"
    r"\bphonetic alphabet\b|\baviation radio\b|\bradio communication\b|"
    r"\bfss\b|\bflight service station\b", 4, 421, "Towered/Non-towered procedures")
_kw(r"\bsida\b|\bsecurity identification display\b|\bbird strike\b|\bbirds?\b.*airport|"
    r"\bwildlife\b|\banimal\b.*runway", 4, 45, "Security/Wildlife")
_kw(r"\bairport sign\b|\bairport marking\b|\brunway sign\b", 4, 44, "Signs/Markings")
_kw(r"\bpublic[- ]use airport\b|\bprivate[- ]use airport\b|\bownership\b.*airport|"
    r"\bcommercial service airport\b|\breliever airport\b|\bgeneral aviation airport\b|"
    r"\bairport classifications?\b", 4, 41, "Airport classification")
_kw(r"\bairport runway\b|\bairport (operations?|layouts?)\b", 4, None, "Airport ops (generic)")

# Unit 5 — Weather (sources / observations / forecast products) -------------
# Sub-units (per faa_107_course.json):
#   51 Aviation Weather Sources Overview
#   52 Surface Aviation Weather Observations (AWOS / ASOS)
#   53 METAR Decoding     (531 header, 532 wind/vis, 533 wx/sky, 534 temp/altim/RMK)
#   54 Forecast Products  (541 TAF/FA, 542 SIGMET, 543 AIRMET/FB)
#   55 TAF Decoding       (551 header, 552 valid period/core, 553 FM/TEMPO/PROB)
_kw(r"\bbecmg\b|\btempo\b|\bprob30\b|\bprob40\b|\bfm\d{4}\b", 5, 553,
    "TAF change groups")
_kw(r"\bp6sm\b|\bvalid period\b|\b\d{4}/\d{4}\b", 5, 552, "TAF valid period")
_kw(r"\btaf\b|\bterminal aerodrome forecast\b|\baviation area forecast\b|\bfa\b",
    5, 55, "TAF")
_kw(r"\bsigmet\b|\bconvective sigmet\b|\bwst\b", 5, 542, "SIGMET")
_kw(r"\bairmet\b|\bwinds (and|&) temperatures? aloft\b|\bwinds aloft\b|\bfb forecast\b",
    5, 543, "AIRMET / FB")
_kw(r"\brvr\b|\brunway visual range\b", 5, 533, "METAR weather/sky (RVR)")
_kw(r"\bspeci\b|\bmetar\b|\baviation routine weather report\b", 5, 53, "METAR")
_kw(r"\bawos\b|\basos\b|\bsurface (aviation )?(weather )?observation\b",
    5, 52, "Surface observations")
_kw(r"\baviationweather\.gov\b|\b1800wxbrief\b|\bweather brief(ing)?\b|"
    r"\bnational weather service\b|\bnws\b", 5, 51, "Weather sources")
_kw(r"\bzulu\b|\butc\b|\bstation identifier\b|\bicao\b", 5, 531,
    "Time/Station identifier")

# Unit 6 — Weather Effects on Aircraft Performance --------------------------
# Sub-units:
#   61 Air Pressure, Density, Altitude  (611 fundamentals, 612 density altitude)
#   62 Pressure, Humidity, Performance
#   63 Wind, Turbulence, Severe Wind     (631 obstacle/terrain, 632 wind shear/microburst)
#   64 Atmospheric Stability             (641 convective currents, 642 temp inversion)
#   65 Dew Point, Icing                  (651 dew point, 652 structural icing)
#   66 Clouds & Thunderstorm Life Cycle  (661 cloud types, 662 thunderstorm stages)
#   67 Fronts, Mountain Flying, Minimums (671 fronts, 672 mountain, 673 ceiling/vis)
_kw(r"\bdensity altitude\b|\bpressure altitude\b|\bhigh[, ]+hot[, ]+(and )?humid\b",
    6, 612, "Density altitude")
_kw(r"\b29\.92 in[- ]?hg\b|\b1013\.2\s*mb\b|\bstandard sea level\b|"
    r"\binches of mercury\b|\bmilli?bar(s)?\b", 6, 611, "Standard atm. / pressure")
_kw(r"\bhumidity\b|\bwater vapor\b|\bdry (vs|or) humid\b", 6, 62,
    "Humidity / pressure effect")
_kw(r"\bmicroburst\b|\bwind shear\b", 6, 632, "Wind shear / microburst")
_kw(r"\bturbulen(t|ce)\b|\bleeward\b|\bwindward\b|\bobstacle\b.*wind|"
    r"\btree line\b|\bbluff\b|\bcanyon\b", 6, 631, "Obstacle / terrain turbulence")
_kw(r"\bconvective current\b|\bunstable (atmosphere|air)\b|\bstable air\b|"
    r"\bcumuliform\b.*(unstable|vertical)", 6, 641, "Convective currents / stability")
_kw(r"\btemperature inversion\b|\bsurface[- ]based inversion\b|\bfrontal inversion\b",
    6, 642, "Temperature inversion")
_kw(r"\bstructural icing\b|\bclear ice\b|\brime ice\b|\b32\s*[°\u00B0]?\s*f\b.*ice|"
    r"\b0\s*[°\u00B0]?\s*c\b.*ice", 6, 652, "Structural icing")
_kw(r"\bdew point\b|\bdewpoint\b|\bsaturat(ed|ion)\b.*moisture|\brelative humidity\b",
    6, 651, "Dew point")
_kw(r"\bfrost\b|\bdew\b.*(aircraft|wing|surface)", 6, 651, "Frost / dew on aircraft")
_kw(r"\bcumulonimbus\b|\bcumuliform\b|\bstanding lenticular\b|\baltocumulus\b|"
    r"\bstratus\b|\bcirrus\b|\bnimbus\b|\bcloud type\b", 6, 661, "Cloud types")
_kw(r"\bthunderstorm\b.*(stage|cumulus|mature|dissipating)|"
    r"\bcumulus stage\b|\bmature stage\b|\bdissipating stage\b|"
    r"\bthunderstorm life cycle\b", 6, 662, "Thunderstorm stages")
_kw(r"\bthunderstorm\b|\bsquall\b", 6, 66, "Thunderstorms (generic)")
_kw(r"\bcold front\b|\bwarm front\b|\bfrontal (zone|system)\b|\bair mass\b",
    6, 671, "Fronts")
_kw(r"\bmountain (flying|terrain|operation)\b|\bmountainous\b", 6, 672, "Mountain flying")
_kw(r"\bceiling\b|\bovercast\b|\bbroken\b.*(sky|cloud)|\b3 statute miles?\b.*visibility|"
    r"\b500 feet below\b|\b2[,]?000 feet horizontally\b", 6, 673,
    "Ceiling / visibility minimums")
_kw(r"\bvisibility\b.*(sm|statute|prominent)|\bfog\b", 6, 673, "Visibility / fog")
_kw(r"\baltimeter\b|\bbarometric pressure\b", 6, 61, "Pressure (generic)")

# Unit 7 — Loading & Performance --------------------------------------------
_kw(r"\bload factor\b|\bstall(ing)? speed\b|\bstall\b|\bbank angle\b|"
    r"\bcenter of gravity\b|\bcg\b|\bcenter of pressure\b|"
    r"\bweight (and|&) balance\b|\bmaximum (gross )?takeoff weight\b|\bmtow\b|"
    r"\bpayload\b|\bcenter[- ]of[- ]gravity\b|\bloading\b.*aircraft|"
    r"\blift\b.*(wing|airfoil|drag)|\bairfoil\b|\bsmooth airflow\b|\bangle of attack\b",
    7, None, "Loading/Performance")

# Unit 8 — Emergency Procedures ---------------------------------------------
_kw(r"\bemergency procedure\b|\blost link\b|\bfly[- ]?away\b|\bbattery (failure|fire)\b|"
    r"\bcontrol link lost\b|\bin[- ]?flight emergency\b", 8, None, "Emergency procedures")

# Unit 9 — Aeronautical Decision Making -------------------------------------
_kw(r"\bimsafe\b", 9, 923, "IMSAFE")
_kw(r"\bpave\b", 9, 924, "PAVE")
_kw(r"\bhazardous attitudes?\b|\banti[- ]?authority\b|\bimpulsiv\b|\binvulnerab\b|"
    r"\bmacho\b|\bresignation\b", 9, 922, "Hazardous attitudes")
_kw(r"\bcrew resource management\b|\bcrm\b|\bsingle[- ]pilot resource\b", 9, 93,
    "CRM/SRM")
_kw(r"\bsituational awareness\b", 9, 933, "Situational awareness")
_kw(r"\bscanning technique\b|\bnight[- ]blind\b|\bvision\b.*pilot", 9, 941, "Vision")
_kw(r"\baeronautical decision making\b|\badm\b|\brisk management\b|\bdecision[- ]making\b",
    9, 91, "ADM")
_kw(r"\bmaintenance\b|\bpreflight inspection\b.*maintenance|\bairworth", 9, 95,
    "Maintenance")

# More keyword rules for the long-tail.
_kw(r"\bairport ownership\b|\bownership classification\b|\bairport type\b|"
    r"\blargest group\b.*airport", 4, 41, "Airport ownership")
_kw(r"\bairspace classification\b", 3, 31, "Airspace classification (generic)")
_kw(r"\bobjects? (that are )?closer\b.*(visual field|move|moving)|\bmotion parallax\b",
    9, 941, "Motion parallax / vision")
_kw(r"\bmonetized\b|\btravel blogger\b|\bcompensation\b|\bcommercial purposes?\b",
    1, 11, "Commercial / monetized")
_kw(r"\bair force\b|\batmospheric research\b|\bgovernment\b.*sUAS|\bpublic safety\b.*sUAS",
    1, 11, "Public aircraft exclusion")
_kw(r"\boperators?.*familiar.*airport traffic\b|\bmonitoring radio traffic\b",
    4, 43, "Why know traffic patterns")
_kw(r"\b10 (calendar )?days\b|\bwithin 10 days\b", 1, 132, "10-day accident report")
_kw(r"\bunmanned aircraft means\b|\bdefinition of (an? )?unmanned\b|"
    r"\bpart 107 applies to\b|\boperations? .*excluded\b|\bexcluded from\b.*part 107|"
    r"\bpublic aircraft\b|\bsection 333\b|\b49 u\.?s\.?c\.? 44809\b",
    1, 11, "Applicability definitions")
_kw(r"\bhand over the controls\b|\bswapping (the )?(rpic|pilot)\b|"
    r"\btransfer of control\b", 1, 12, "Crew transfer")
_kw(r"\bads[- ]?b out\b", 1, 15, "ADS-B")
_kw(r"\blithium[- ]?(based )?batter(y|ies)\b|\bbattery fire\b", 8, None,
    "Lithium battery emergencies")
_kw(r"\bscan for traffic\b|\bscan(ning)? technique\b", 9, 941, "Scanning")
_kw(r"\b(work[- ]related )?stress\b|\bacute stress\b|\bchronic stress\b",
    9, 92, "Stress / Risk")
_kw(r"\bover (a )?crowd\b|\bbystanders?\b|\bflying over (people|persons)\b",
    1, 16, "Over people")
_kw(r"\bair density\b.*(takeoff|weight|performance)|\b(reduces?|reduce) (the )?air density\b",
    7, None, "Air density / performance")

# Generic Part 107 catch-all (after all topic-specific rules so it only fires
# when nothing else matched). Maps to Unit 1 generally.
_kw(r"\b14 cfr( part)? 107\b|\bsuas (operator|operation)|\bsmall (unmanned aircraft|ua)\b|"
    r"\b30 minutes after (official )?sunset\b|\bcompensation or hire\b|"
    r"\bunder part 107\b", 1, None, "Generic Part 107")
# Sectional-chart utility questions ("can/cannot use a sectional chart…")
_kw(r"\bsectional chart\b", 2, 241, "Sectional chart (fallback)")
# Chart-figure questions referencing weather/METAR-style figures → Unit 5 (Weather)
_kw(r"\brefer to[^\.]*figure 1[12]\b.*(wind|metar|reporting|visibility|kjfk|station)",
    5, None, "Figure 11/12 weather")
_kw(r"\bnotam(s)?\b|\bunmarked balloon\b", 3, 343, "NOTAMs/TFR")
# 30°/45°/60° banked turn → load factor (Unit 7)
_kw(r"\b\d{1,2}[\u00B0\u00BA]?\s*banked turn\b|\b30[- ]degree (bank|turn)\b",
    7, None, "Banked turn load factor")


# ── helpers ───────────────────────────────────────────────────────────────────

def _clean(s) -> str:
    if s is None:
        return ""
    return re.sub(r"[ \t]+", " ", str(s)).strip()


def _norm_question(s: str) -> str:
    return re.sub(r"\s+", " ", s.lower().strip())


@dataclass
class Row:
    sheet: str
    row_no: int
    question: str
    answer_letter: str
    choices: list[str]
    explanation: str
    category: str
    sub_category: str
    source_file: str
    mapped_unit: str = ""
    mapped_topic: str = ""
    unit_id: int | None = None
    sub_unit_id: int | None = None
    topical_unit_id: int | None = None  # unit before FINAL_EXAM nulling (for review CSV)
    classified_by: str = ""
    course_path: str = ""
    match_score: float = 0.0
    unit_title: str = ""
    section_id: int | None = None
    section_title: str = ""
    lesson_id: int | None = None
    lesson_title: str = ""
    tree_depth: int = 0
    maps_to_leaf: bool = False
    needs_review: bool = False
    review_reason: str = ""
    attention_reason: str = ""
    final_exam_only: bool = False
    final_exam_reason: str = ""


def parse_csv(path: Path, sheet_label: str) -> list[Row]:
    parsed: list[Row] = []
    with path.open(newline="", encoding="utf-8-sig") as f:
        reader = csv.reader(f)
        next(reader)  # header
        for i, r in enumerate(reader, start=2):
            if len(r) < 2:
                continue
            question = _clean(r[0])
            ans = _clean(r[1]).upper()
            if not question or ans not in {"A", "B", "C", "D"}:
                continue
            raw_choices = [
                (letter, _clean(r[col]))
                for letter, col in zip("ABCD", [2, 3, 4, 5])
                if col < len(r)
            ]
            present = [(l, t) for l, t in raw_choices if t]
            if len(present) < 2 or ans not in {l for l, _ in present}:
                continue
            choice_texts = [t for _, t in present]
            letters_present = [l for l, _ in present]

            parsed.append(Row(
                sheet=sheet_label,
                row_no=i,
                question=question,
                answer_letter=ans,
                choices=choice_texts,
                explanation=_clean(r[6]) if len(r) > 6 else "",
                category=_clean(r[7]) if len(r) > 7 else "",
                sub_category=_clean(r[8]) if len(r) > 8 else "",
                source_file=_clean(r[9]) if len(r) > 9 else "",
                mapped_unit=_clean(r[10]) if len(r) > 10 else "",
                mapped_topic=_clean(r[11]) if len(r) > 11 else "",
            ))
            parsed[-1].answer_idx = letters_present.index(ans)  # type: ignore[attr-defined]
    return parsed


def _row_quality_score(row: Row) -> int:
    """Higher = prefer this row when deduplicating."""
    score = 0
    if row.mapped_unit:
        score += 4
    if row.mapped_topic:
        score += 2
    if row.category:
        score += 2
    if row.sub_category:
        score += 2
    if "slide" in row.sub_category.lower():
        score += 5
    if row.explanation:
        score += 1
    if row.sheet == "end-of-unit":
        score += 1  # slight preference for slide-tagged EOU metadata
    return score


def merge_csv_rows(test_rows: list[Row], eou_rows: list[Row]) -> tuple[list[Row], int]:
    """Dedupe by question text. Prefer richer metadata; EOU wins on tie if Slide sub-category."""
    by_norm: dict[str, Row] = {}
    dupes_dropped = 0
    for row in test_rows + eou_rows:
        key = _norm_question(row.question)
        existing = by_norm.get(key)
        if existing is None:
            by_norm[key] = row
            continue
        dupes_dropped += 1
        if _row_quality_score(row) > _row_quality_score(existing):
            by_norm[key] = row
        elif _row_quality_score(row) == _row_quality_score(existing):
            if "slide" in row.sub_category.lower():
                by_norm[key] = row
    return list(by_norm.values()), dupes_dropped


def classify_by_slide(sub_category: str) -> int | None:
    s = sub_category.lower()
    for needle, sub in SLIDE_TOPIC_TO_SUBUNIT:
        if needle in s:
            return sub
    return None


def classify_from_mapped_columns(row: Row) -> bool:
    """Apply user Mapped Unit / Mapped Topic columns when unambiguous. Returns True if set."""
    mu = row.mapped_unit
    mt = row.mapped_topic.lower()

    if mu == "Regulations":
        row.unit_id, row.sub_unit_id = 1, classify_by_slide(row.sub_category)
        row.classified_by = f"mapped_unit=Regulations (sub={row.sub_category[:40]})"
        return True
    if mu == "Airspace Classification and Operating Requirements":
        row.unit_id, row.sub_unit_id = 3, 32
        row.classified_by = "mapped_unit=Airspace Classification"
        return True
    if mu == "Aircraft Loading and Performance":
        row.unit_id, row.sub_unit_id = 7, None
        row.classified_by = "mapped_unit=Loading & Performance"
        return True
    if mu == "Weather and Weather Sources":
        if any(x in mt for x in ("taf", "metar")):
            row.unit_id, row.sub_unit_id = 5, 55 if "taf" in mt else 53
        elif any(x in mt for x in ("cloud", "density", "fog", "general weather", "effects")):
            row.unit_id, row.sub_unit_id = 6, None
        else:
            row.unit_id, row.sub_unit_id = 5, None
        row.classified_by = f"mapped_unit=Weather ({row.mapped_topic})"
        return True
    if mu == "Operations":
        if "airport operations" in mt or "traffic pattern" in mt:
            row.unit_id, row.sub_unit_id = 4, 43
            row.classified_by = "mapped_unit=Operations → airport ops"
            return True
        if "decision" in mt or "risk management" in mt:
            row.unit_id, row.sub_unit_id = 9, 91
            row.classified_by = "mapped_unit=Operations → ADM"
            return True
        if "airspace" in mt or "atc" in mt or "controlled" in mt:
            row.unit_id, row.sub_unit_id = 3, 32
            row.classified_by = "mapped_unit=Operations → airspace"
            return True
        if "part 107" in mt or "regulation" in mt:
            row.unit_id, row.sub_unit_id = 1, None
            row.classified_by = "mapped_unit=Operations → regulations"
            return True
        if "weight" in mt or "balance" in mt or "performance" in mt:
            row.unit_id, row.sub_unit_id = 7, None
            row.classified_by = "mapped_unit=Operations → loading"
            return True
        # "General operations" is too broad — fall through to category/keywords
        return False
    return False


_COURSE_NODES: dict | None = None


def classify(row: Row) -> None:
    """Map via course hierarchy (category + sub-category + lesson titles), not choices."""
    global _COURSE_NODES
    if _COURSE_NODES is None:
        _COURSE_NODES = load_course_index()

    res = map_question_to_course(
        question=row.question,
        category=row.category,
        sub_category=row.sub_category,
        explanation=row.explanation,
        nodes=_COURSE_NODES,
    )
    row.unit_id = res.unit_id
    row.sub_unit_id = res.sub_unit_id
    row.course_path = res.course_path
    row.match_score = res.score
    row.classified_by = res.method
    row.needs_review = res.needs_review
    row.review_reason = res.review_reason

    if res.sub_unit_id is not None:
        return

    haystack = f"{row.question} {row.explanation}"
    for rx, u, s_id, label in KEYWORD_RULES:
        if rx.search(haystack):
            row.unit_id, row.sub_unit_id = u, s_id
            row.classified_by = f"fallback_keyword[{label}]"
            row.needs_review = True
            row.review_reason = row.review_reason or "No hierarchy match; keyword on question text"
            return

    if res.unit_id is None:
        row.classified_by = "UNCLASSIFIED"
        row.needs_review = True
        row.review_reason = row.review_reason or "No course path match"


def enrich_hierarchy(row: Row, nodes: dict, path_index: dict[str, int]) -> None:
    """Populate unit/section/lesson columns from sub_unit_id (before FINAL_EXAM nulling)."""
    h = hierarchy_for_sub_unit(nodes, row.sub_unit_id, path_index)
    row.unit_title = h.unit_title
    row.section_id = h.section_id
    row.section_title = h.section_title
    row.lesson_id = h.lesson_id
    row.lesson_title = h.lesson_title
    row.tree_depth = h.tree_depth
    row.maps_to_leaf = h.maps_to_leaf


def attention_reason_for_row(row: Row) -> str:
    """
    Why this row belongs in the needs-review export.
    Uses category/sub_category + course mapping only (not mapped_unit/mapped_topic).
    """
    reasons: list[str] = []

    if row.needs_review:
        reasons.append(row.review_reason or "needs_review=yes")

    if row.final_exam_only:
        if not row.course_path:
            reasons.append("final_exam: missing course_path")
    else:
        if row.unit_id is None or row.sub_unit_id is None:
            reasons.append("quiz-scoped: missing unit_id or sub_unit_id")
        if row.sub_unit_id and not row.maps_to_leaf:
            reasons.append("quiz-scoped: sub_unit_id is a section folder, not a leaf lesson")

    if not row.category.strip():
        reasons.append("blank spreadsheet category (col H)")
    if not row.sub_category.strip():
        method = row.classified_by.split(" →")[0]
        if method not in {
            "slide_sub_category",
            "sub_category_exact",
            "sub_category_alias",
            "weather_sub=taf",
            "weather_sub=metar",
            "weather_sub=effects",
        }:
            reasons.append("blank spreadsheet sub_category (col I)")

    method = row.classified_by.split(" →")[0]
    if method == "UNCLASSIFIED":
        reasons.append("unclassified")
    elif method == "category_unit_only":
        reasons.append("matched unit only, no specific lesson")
    elif method.startswith("fallback_keyword"):
        reasons.append(method)
    elif method == "course_path_tokens" and row.match_score < 0.55:
        reasons.append(f"low-confidence path match (score={row.match_score:.2f})")

    # De-dupe while preserving order
    seen: set[str] = set()
    unique: list[str] = []
    for r in reasons:
        if r not in seen:
            seen.add(r)
            unique.append(r)
    return "; ".join(unique)


def review_csv_row(r: Row) -> list:
    return [
        r.sheet, r.row_no, r.category, r.sub_category,
        r.unit_id if r.unit_id is not None else "",
        r.unit_title,
        r.section_id if r.section_id is not None else "",
        r.section_title,
        r.lesson_id if r.lesson_id is not None else "",
        r.lesson_title,
        r.tree_depth if r.tree_depth else "",
        "yes" if r.maps_to_leaf else ("no" if r.sub_unit_id else ""),
        r.sub_unit_id if r.sub_unit_id is not None else "",
        r.course_path,
        f"{r.match_score:.2f}" if r.match_score else "",
        r.topical_unit_id if r.topical_unit_id is not None else "",
        "yes" if r.final_exam_only else "",
        r.final_exam_reason,
        r.classified_by,
        "yes" if r.needs_review else "",
        r.review_reason,
        r.attention_reason,
        r.source_file,
        r.answer_letter,
        r.question,
    ]


def tag_final_exam_only(row: Row) -> None:
    """
    Mark questions that should only appear in full-course (end-of-course) exams.

    Mechanism (works with current ExamGeneratorService):
      - unit_id=null, sub_unit_id=null → excluded from unit/sub_unit scoped pools
      - priority=3 (supplemental) → only fills large full_course exams
      - standard=FINAL_EXAM → documented tag for filtering/export
      - difficulty=hard when figure-based
    """
    q = row.question
    reasons: list[str] = []

    if re.search(r"\brefer to\b.*\b(figure|faa[- ]?ct)", q, re.IGNORECASE):
        reasons.append("requires FAA-CT figure (cross-section chart reading)")

    if re.search(r"\btest prep\b", row.category, re.IGNORECASE):
        reasons.append("legacy Test Prep category")

    # Integrative scenario questions spanning multiple domains (heuristic)
    if not reasons and row.unit_id and len(row.choices) >= 3:
        domains = 0
        hay = f"{q} {' '.join(row.choices)}".lower()
        domain_checks = [
            r"\bpart 107\b|\bremote pilot\b|\brpic\b",
            r"\bclass [bcdg]\b|\bairspace\b|\batc\b|\bauthorization\b",
            r"\bmetar\b|\btaf\b|\bweather\b|\bvisibility\b",
            r"\bairport\b|\bctaf\b|\brunway\b|\btraffic pattern\b",
            r"\bload factor\b|\bcenter of gravity\b|\bweight\b",
        ]
        domains = sum(1 for pat in domain_checks if re.search(pat, hay))
        is_hard = bool(re.search(r"refer to (figure|faa[- ]?ct)", q, re.IGNORECASE))
        if domains >= 3 and is_hard:
            reasons.append("integrative (3+ topic domains)")

    if not reasons:
        return

    row.final_exam_only = True
    row.final_exam_reason = "; ".join(reasons)
    row.topical_unit_id = row.unit_id
    row.unit_id = None
    row.sub_unit_id = None
    row.classified_by = (row.classified_by + " → FINAL_EXAM").strip(" →")


def to_import_dto(row: Row) -> dict:
    # choices: stable 1-based ids
    choices = []
    for idx, text in enumerate(row.choices, start=1):
        choices.append({
            "id": idx,
            "text": text,
            "is_correct": (idx - 1) == row.answer_idx,  # type: ignore[attr-defined]
        })

    difficulty = "medium"
    if re.search(r"refer to (figure|faa[- ]?ct)", row.question, re.IGNORECASE):
        difficulty = "hard"

    priority = 3 if row.final_exam_only else 2
    standard = FINAL_EXAM_STANDARD if row.final_exam_only else None

    return {
        "course_id": COURSE_ID,
        "unit_id": row.unit_id,
        "sub_unit_id": row.sub_unit_id,
        "question_text": row.question,
        "choices": choices,
        "explanation": row.explanation or None,
        "standard": standard,
        "priority": priority,
        "difficulty": difficulty,
        "status": "draft" if row.needs_review else "active",
    }


def main() -> None:
    if not CSV_TEST.exists():
        sys.exit(f"Missing input: {CSV_TEST}")
    if not CSV_EOU.exists():
        sys.exit(f"Missing input: {CSV_EOU}")
    if not COURSE_JSON.exists():
        sys.exit(f"Missing input: {COURSE_JSON}")

    test_rows = parse_csv(CSV_TEST, "test")
    eou_rows = parse_csv(CSV_EOU, "end-of-unit")
    all_rows, dupes_dropped = merge_csv_rows(test_rows, eou_rows)

    nodes = load_course_index()
    path_index = build_path_index(nodes)

    for r in all_rows:
        classify(r)
        enrich_hierarchy(r, nodes, path_index)
        tag_final_exam_only(r)
        r.attention_reason = attention_reason_for_row(r)

    # ── Build bulk-import JSON ────────────────────────────────────────────────
    bulk = {
        "course_id": COURSE_ID,
        "questions": [to_import_dto(r) for r in all_rows],
    }
    OUT_JSON.write_text(json.dumps(bulk, indent=2, ensure_ascii=False))

    # ── Review CSV ────────────────────────────────────────────────────────────
    final_exam_count = sum(1 for r in all_rows if r.final_exam_only)

    with OUT_CSV.open("w", newline="") as fh:
        w = csv.writer(fh)
        w.writerow(REVIEW_CSV_HEADER)
        for r in all_rows:
            w.writerow(review_csv_row(r))

    needs_review_rows = [r for r in all_rows if r.attention_reason]
    with OUT_NEEDS_REVIEW.open("w", newline="") as fh:
        w = csv.writer(fh)
        w.writerow(REVIEW_CSV_HEADER)
        for r in needs_review_rows:
            w.writerow(review_csv_row(r))

    # ── Gap report ────────────────────────────────────────────────────────────
    by_unit: Counter = Counter()
    by_unit_subunit: Counter = Counter()
    needs_review: list[Row] = []
    by_review_reason: Counter = Counter()
    for r in all_rows:
        if r.final_exam_only:
            continue
        by_unit[r.unit_id] += 1
        by_unit_subunit[(r.unit_id, r.sub_unit_id)] += 1
        if r.needs_review:
            needs_review.append(r)
            by_review_reason[r.review_reason] += 1

    lines = [
        "# FAA Part 107 — Question Bank Bulk Upload",
        "",
        f"Generated from `{CSV_TEST.name}`, `{CSV_EOU.name}`, and `{COURSE_JSON.name}`.",
        "",
        f"- Raw rows: {len(test_rows)} (test) + {len(eou_rows)} (end-of-unit)",
        f"- Duplicates dropped: {dupes_dropped}",
        f"- **Unique questions: {len(all_rows)}**",
        f"- **Final-exam-only** (`standard={FINAL_EXAM_STANDARD}`, `unit_id=null`): **{final_exam_count}**",
        "",
        "## Bulk upload format",
        "",
        "The backend exposes a JSON bulk-import endpoint (admin only):",
        "",
        "```text",
        "POST /questions/import",
        "Content-Type: application/json",
        "Authorization: Bearer <admin token>",
        "",
        "{",
        f"  \"course_id\": {COURSE_ID},",
        "  \"questions\": [",
        "    {",
        "      \"course_id\": 35,",
        "      \"unit_id\": 1,",
        "      \"sub_unit_id\": 11,",
        "      \"question_text\": \"…\",",
        "      \"choices\": [",
        "        {\"id\": 1, \"text\": \"…\", \"is_correct\": false},",
        "        {\"id\": 2, \"text\": \"…\", \"is_correct\": true},",
        "        {\"id\": 3, \"text\": \"…\", \"is_correct\": false}",
        "      ],",
        "      \"explanation\": \"…\",",
        "      \"standard\": null,",
        "      \"priority\": 2,",
        "      \"difficulty\": \"medium\",",
        "      \"status\": \"active\"",
        "    }",
        "  ]",
        "}",
        "```",
        "",
        f"Output file: `{OUT_JSON.relative_to(ROOT)}` — {len(all_rows)} questions ready to upload.",
        "",
        "## Final-exam-only questions",
        "",
        f"{final_exam_count} questions are tagged for **end-of-course / full-course exams only**:",
        "",
        "- `standard`: `\"FINAL_EXAM\"`",
        "- `priority`: `3` (supplemental — fills large exams last)",
        "- `unit_id` / `sub_unit_id`: `null` — **excluded** from unit and sub-unit quiz generation",
        "- `difficulty`: `hard` when a figure is required",
        "",
        "Review column `topical_unit_id` in the CSV shows which unit the question",
        "belongs to topically before final-exam scoping.",
        "",
        "## Counts by unit (quiz-scoped; excludes FINAL_EXAM null unit_id)",
        "",
        "",
        "| Unit | Title | Questions |",
        "| ---: | --- | ---: |",
    ]
    unit_titles = {
        1: "Part 107 Regulations",
        2: "Airports, Airspace & Data Sources",
        3: "Airspace Classifications",
        4: "Airport Operations",
        5: "Weather (Sources / METAR / TAF)",
        6: "Weather Effects on Aircraft Performance",
        7: "Loading & Performance",
        8: "Emergency Procedures",
        9: "Aeronautical Decision Making",
        None: "_unclassified_",
    }
    for unit in sorted(by_unit.keys(), key=lambda x: (x is None, x or 0)):
        lines.append(f"| {unit if unit is not None else '—'} | "
                     f"{unit_titles.get(unit, '?')} | {by_unit[unit]} |")

    lines += [
        "",
        "## Counts by unit / sub-unit",
        "",
        "| Unit | Sub-unit | Questions |",
        "| ---: | ---: | ---: |",
    ]
    for (u, s), n in sorted(by_unit_subunit.items(), key=lambda kv: (
        kv[0][0] is None, kv[0][0] or 0, kv[0][1] is None, kv[0][1] or 0
    )):
        lines.append(f"| {u if u is not None else '—'} | "
                     f"{s if s is not None else '—'} | {n} |")

    lines += [
        "",
        "## Items flagged for review",
        "",
        f"**Total flagged:** {len(needs_review)}",
        "",
        "Reasons:",
        "",
    ]
    for reason, n in sorted(by_review_reason.items(), key=lambda x: -x[1]):
        lines.append(f"- ({n}) {reason}")

    lines += [
        "",
        "All flagged questions are written into the JSON with `\"status\": \"draft\"` "
        "so they will be uploaded but excluded from exam generation until an admin "
        "reviews them. Once you confirm a unit / sub-unit mapping, flip the status to "
        "`active` (via PUT /questions/:id or by editing this JSON and re-importing — "
        "the import upserts by `id` if you keep IDs stable).",
        "",
        "## Risks and concerns",
        "",
        "### 1. Smaller bank than original compiled workbook",
        "",
        "The Testing CSVs dedupe to **462 unique questions** (~29 fewer than the "
        "original 491-row xlsx). Most end-of-unit rows duplicate test.csv.",
        "",
        "### 2. Chart-figure questions → FINAL_EXAM only",
        "",
        f"~{final_exam_count} questions require the FAA-CT-8080-2H supplement. They are "
        "scoped to full-course exams only (no `unit_id`). Students taking unit quizzes "
        "will not see them until the final. **Risk:** unit-level chart lessons have fewer "
        "practice questions unless you add non-figure variants.",
        "",
        "The question schema has no `figure_url` field yet — figures are not embedded.",
        "",
        "### 3. `standard=FINAL_EXAM` is not filtered by the exam API today",
        "",
        "Exclusion from unit quizzes works via `unit_id=null`. The `FINAL_EXAM` tag is "
        "for reporting and future filtering; `ExamGeneratorService` does not yet read it.",
        "",
        "### 4. Classification method",
        "",
        "Questions are mapped using **Category**, **Sub Category**, and the full "
        "course hierarchy in `faa_107_course.json` (unit / section / lesson). "
        "Answer choices are **not** used for mapping. Spreadsheet columns "
        "`mapped_unit` / `mapped_topic` are omitted from review exports (often wrong).",
        "",
        f"Rows needing attention: **`{OUT_NEEDS_REVIEW.name}`** ({len(needs_review_rows)} rows).",
        "",
        "### 5. Unit 8 (Emergency) still thin",
        "",
        "Only a handful of emergency questions; most map to Regulations or Operations.",
        "",
        "### 6. Ambiguous `Additional topics :: communications` rows",
        "",
        "In the spreadsheet, 14 rows have this sub-category but many of them are "
        "actually about *load factor* / *center of gravity* / *FSS* — i.e. "
        "mis-labeled. The classifier ignores the sub-category and falls back to "
        "keyword matching for these, but you'll want to spot-check the ones it "
        "routed to Unit 7 / Unit 4 / Unit 9. They are flagged with "
        "`needs_review: yes` in the CSV.",
        "",
        "### 7. Sub-units that received zero questions",
        "",
    ]

    # Enumerate sub-units from the course JSON that received zero questions.
    course = json.loads(COURSE_JSON.read_text())
    all_sub_ids: list[tuple[int, int, str]] = []
    for u in course["units"]:
        for su in u.get("sub_units", []):
            all_sub_ids.append((u["id"], su["id"], su["title"]))
            for ssu in su.get("sub_units", []):
                all_sub_ids.append((u["id"], ssu["id"], ssu["title"]))
    have = {(u, s) for (u, s), n in by_unit_subunit.items() if n > 0 and s is not None}
    zero = [(u, s, t) for (u, s, t) in all_sub_ids if (u, s) not in have]
    if not zero:
        lines.append("All sub-units have at least one question.")
    else:
        lines.append("These sub-units have no questions assigned. Consider authoring "
                     "a few core questions for each so exams scoped to them are non-empty:")
        lines.append("")
        lines.append("| Unit | Sub-unit | Title |")
        lines.append("| ---: | ---: | --- |")
        for (u, s, t) in zero:
            lines.append(f"| {u} | {s} | {t} |")

    lines += [
        "",
        "### 4. Unclassified rows",
        "",
    ]
    unclassified = [r for r in all_rows if r.unit_id is None]
    if not unclassified:
        lines.append("None — every row landed somewhere.")
    else:
        lines.append(f"{len(unclassified)} rows could not be confidently assigned. "
                     "They are present in the JSON with `unit_id: null` and "
                     "`status: draft`. Sample:")
        lines.append("")
        for r in unclassified[:20]:
            lines.append(f"- *(sheet `{r.sheet}` row {r.row_no})* "
                         f"`{r.question[:140]}`")

    OUT_GAPS.write_text("\n".join(lines))

    from course_question_mapper import course_paths_report
    leaf_paths = course_paths_report()
    paths_csv = ASSETS / "faa_107_course_leaf_paths.csv"
    with paths_csv.open("w", newline="") as fh:
        pw = csv.writer(fh)
        pw.writerow(["unit_id", "sub_unit_id", "course_path"])
        for row in leaf_paths:
            pw.writerow([row["unit_id"], row["sub_unit_id"], row["course_path"]])

    # Console summary
    print(f"Wrote {OUT_JSON.relative_to(ROOT)}  ({len(all_rows)} questions)")
    print(f"Wrote {OUT_CSV.relative_to(ROOT)}")
    print(f"Wrote {OUT_NEEDS_REVIEW.relative_to(ROOT)}  ({len(needs_review_rows)} need attention)")
    print(f"Wrote {OUT_GAPS.relative_to(ROOT)}")
    print(f"Wrote {paths_csv.relative_to(ROOT)}  ({len(leaf_paths)} leaf lessons)")
    print()
    print("Per-unit counts:")
    for unit in sorted(by_unit.keys(), key=lambda x: (x is None, x or 0)):
        print(f"  Unit {unit if unit is not None else '—'}: {by_unit[unit]}")
    print(f"Flagged for review: {len(needs_review)}")
    print(f"Final-exam-only: {final_exam_count}")
    print(f"Duplicates dropped: {dupes_dropped}")


if __name__ == "__main__":
    main()
