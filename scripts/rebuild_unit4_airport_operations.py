#!/usr/bin/env python3
"""Rebuild Unit 4 (AIRPORT OPERATIONS) per outline alignment and fix learning goals."""

from __future__ import annotations

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
COURSE_PATH = ROOT / "assets" / "articles" / "faa_107_course.json"
LEAF_CSV = ROOT / "assets" / "articles" / "faa_107_course_leaf_paths.csv"

UNIT4_INDEX = """This unit follows the airport operations outline: legal airport categories, towered and non-towered airports with radio practices, runway surface aids and numbering, CTAF traffic examples, manned traffic patterns, airport signs and holding markings, and airport security plus wildlife hazards.

Lessons are ordered for classroom use: categories, control types, communications, runway systems, CTAF examples, traffic patterns, signs (two parts), then security and wildlife."""


def lesson(
    lid: int,
    title: str,
    description: str,
    text_content: str,
    sub_units: list | None = None,
) -> dict:
    return {
        "id": lid,
        "title": title,
        "description": description,
        "text_content": text_content,
        "video_url": None,
        "status": "NOT_STARTED",
        "sub_units": sub_units or [],
    }


def build_unit4_sub_units() -> list:
    return [
        lesson(
            411,
            "Airport Categories as Defined by Law",
            "Identify the four FAA legal categories of airports and the passenger or cargo thresholds that define each.",
            "Airport categories as defined by law:\n\n- Commercial Service Airports: Publicly owned, with at least 2,500 passenger boardings per year, including international flights stopping for non-traffic purposes (such as refueling).\n\n- Cargo Service Airports: Served by aircraft transporting only cargo when total cargo weight exceeds 100 million pounds per year.\n\n- Reliever Airports: FAA-designated airports intended to reduce congestion at commercial service airports.\n\n- General Aviation Airports: All remaining airports not in the categories above. They form the largest group in the U.S. airport system.",
        ),
        lesson(
            412,
            "Towered and Non-Towered Airports",
            "Distinguish towered from non-towered airports and describe civil, military, federal, and private airport types plus associated facilities.",
            "Two types of airports exist based on operational control: towered and non-towered.\n\nWithin those categories you will find:\n- Civil airports for the general public.\n- Military and federal government airports.\n- Private airports not open to the general public.\n\nFacilities can include seaplane bases, heliports, tilt-rotor sites, and any area used or intended for use as an airport.",
        ),
        lesson(
            421,
            "Towered vs. Non-Towered Airport Procedures",
            "Explain UNICOM and Common Traffic Advisory Frequency (CTAF) use at towered and non-towered airports and where to verify the correct frequency.",
            "Towered airports have an operating control tower coordinating traffic on the ground and in the pattern.\n\nUNICOM is a non-government station that provides airport information (weather, wind, runway in use). UNICOM may serve both towered and non-towered airports.\n\nNon-towered airports do not have an operating control tower. Two-way radio is not required by regulation for all aircraft but is strongly recommended for safety. Pilots must operate with extra caution. Pilots announce position and intentions on the Common Traffic Advisory Frequency (CTAF). CTAF is often the same as UNICOM but may instead be MULTICOM, Flight Service (FSS), or a tower frequency when the tower is closed—always verify the published frequency on the sectional chart or Chart Supplement.",
        ),
        lesson(
            423,
            "Runways: Surface Aids, Hazards, and Orientation",
            "Interpret runway surface navigational aids and describe magnetic runway numbering, including parallel runway designations and takeoff-and-landing hazards.",
            "It is essential to understand signs, markings, and lights used on airports as surface navigational aids. These aids include the airport diagram or layout, runways in use, and the direction of departing and arriving aircraft.\n\nTakeoff and landing are generally the most hazardous phases of flight. Low altitude and low airspeed leave little margin for error. Wind shear, crosswinds, fog, and low visibility are especially critical near the ground; sudden wind changes can destabilize an aircraft during landing or takeoff.\n\nRunway orientation: Runways are aligned with the prevailing wind for better lift and control. The runway designation is the magnetic heading rounded to the nearest 10 degrees and shortened to two digits (for example, 273° magnetic becomes Runway 27). Opposite ends of the same physical runway differ by 180° (Runway 27 on one end, Runway 9 on the other).\n\nRunway numbers range from 01 to 36, representing compass headings in 10-degree increments. Parallel runways add letters: L (left), C (center), R (right). For example, two parallel runways aligned with 090° magnetic are designated 09L and 09R.",
        ),
        lesson(
            422,
            "CTAF Runway Position and Heading Examples",
            "Calculate aircraft magnetic heading on downwind from the runway number and determine relative position from CTAF position reports at a non-towered airport.",
            "When you monitor the Common Traffic Advisory Frequency (CTAF) at a non-towered airport, pilots self-announce position and intentions. Use runway magnetic alignment and standard traffic pattern geometry to interpret those calls.\n\nDownwind heading (opposite the landing runway direction):\n- Runway 18 or less: treat the runway number as tens of degrees, then add 180°. Example: Runway 12 → 120° + 180° = 300° downwind heading.\n- Runway greater than 18: treat the runway number as tens of degrees, then subtract 180°. Example: Runway 24 → 240° − 180° = 60° downwind heading.\n\nExample 1 — Left downwind Runway 16: landing direction is 160° magnetic; downwind is 160° + 180° = 340°, roughly northwest.\n\nExample 2 — Midfield left downwind Runway 13: the aircraft is west of the runway centerline (pattern side opposite the runway numbers for a left pattern at this airport geometry). Knowledge-test items often list east, south, or west as choices—use the runway alignment and left-pattern rule to pick the correct quadrant.\n\nExample 3 — Midfield left downwind Runway 4: same reasoning yields west of the runway for a typical left-hand pattern configuration as used in course materials.\n\nExample 4 — Left downwind Runway 12: downwind heading = 120° + 180° = 300°.\n\nExample 5 — Left downwind Runway 24: downwind heading = 240° − 180° = 60°.\n\nExample 6 — Short final Runway 18: the aircraft is on final aligned with Runway 18 (magnetic course 180° toward the runway), which is generally north of the airport reference when Runway 18 is oriented to the south. Short final is the last segment of the final approach to touchdown.",
        ),
        lesson(
            43,
            "Traffic Patterns for Manned Aircraft",
            "Describe standard VFR traffic pattern flow, typical pattern altitudes near airports, and entry, downwind, final, and departure procedures.",
            "Airports use a standard traffic pattern to organize takeoffs and landings. The pattern may differ when a control tower assigns non-standard flows, when terrain or obstacles require changes, or when pilots deviate for safety. Never assume every aircraft is flying the published left-hand pattern; if manned traffic is nearby, landing the sUAS until the area is clear may be the safest option.\n\nEven though many propeller aircraft cruise at higher altitudes, they descend through lower altitudes near airports. On approach or departure paths, aircraft may be at roughly 500 to 1,500 feet AGL several miles from the field. Common pattern altitudes for light propeller aircraft are about 600 to 1,500 feet AGL.\n\nPatterns are normally left-hand unless ATC assigns otherwise or the chart shows a right pattern with the (RP) symbol. Left-hand patterns are not specially labeled on the chart.\n\nSignificant pattern items:\n- Enter the pattern in level flight, abeam the midpoint of the runway, at pattern altitude.\n- 1,000 feet AGL is the recommended pattern altitude unless another altitude is published.\n- Maintain pattern altitude until abeam the approach end of the landing runway on the downwind leg.\n- Complete the turn to final at least one-quarter mile from the runway.\n- After takeoff or go-around, continue straight ahead until past the departure end of the runway.\n- If remaining in the pattern, begin the turn to crosswind beyond the departure end of the runway, within 300 feet of pattern altitude.\n- If leaving the pattern, continue straight out or exit with a 45-degree turn beyond the departure end after reaching pattern altitude.",
        ),
        lesson(
            441,
            "Airport Location and Mandatory Instruction Signs",
            "Recognize location signs and mandatory instruction signs on airport movement areas and state when pilots must stop for ATC clearance.",
            "Location signs have a black background with yellow letters and identify a taxiway or runway location.\n\nMandatory instruction signs have a red background with white letters. They mark locations where pilots must stop unless cleared by ATC—effectively a \"do not enter\" until cleared. They appear at runway intersections, critical areas, and other restricted zones.\n\nAircraft must not pass a mandatory instruction sign or associated holding position until ATC clears the movement.",
        ),
        lesson(
            442,
            "Direction, ILS Holding, and Runway Holding Markings",
            "Identify direction and destination signs, ILS critical area holding requirements, and runway holding position markings at taxiway and runway intersections.",
            "Direction and destination signs have yellow backgrounds with black text and arrows and guide pilots to runways, terminals, cargo areas, and other airport locations.\n\nILS critical area holding position: When the ILS critical area is active—usually in low visibility—pilots must hold short as marked until the area is inactive or ATC clears the movement.\n\nRunway holding position marking consists of two solid lines and two broken lines across the full width of the taxiway or runway. When approaching from the side with the continuous lines, do not cross without ATC clearance. These markings appear next to holding position signs at taxiway and runway intersections (for example, holding short of Runway 15 with Runway 33 to the right). Do not proceed beyond the holding position until cleared by ATC.",
        ),
        lesson(
            451,
            "Airport Security (SIDA)",
            "Explain Security Identification Display Area (SIDA) requirements and badge and movement rules under 49 CFR Part 1542.",
            "If a drone operation requires you to enter airport property, determine whether that area is a Security Identification Display Area (SIDA).\n\nInside a SIDA you must wear a visible airport-issued identification badge and follow airport and TSA procedures under 49 CFR Part 1542. Movement in a SIDA without a displayed badge is prohibited.",
        ),
        lesson(
            452,
            "Wildlife Hazards Near Airports",
            "State reporting options for wildlife strikes, prohibitions on harassing wildlife, and immediate actions when wildlife threatens the operation.",
            "Wildlife strikes are a serious hazard to manned aircraft. Remote pilots must not attract wildlife or increase strike risk near airports.\n\nIf your small unmanned aircraft collides with wildlife, you are not required to report it to the FAA, but you may report voluntarily to the FAA Wildlife Strike Database.\n\nHarassing wildlife violates FAA policy and environmental laws. If you observe wildlife near your operation, land immediately and reassess before continuing.",
        ),
    ]


def regenerate_leaf_paths(data: dict) -> None:
    lines = ["unit_id,sub_unit_id,course_path"]

    def walk(unit: dict, parts: list[str], unit_id: int) -> None:
        pp = parts + [unit["title"]]
        if not unit.get("sub_units"):
            lines.append(f"{unit_id},{unit['id']},{' > '.join(pp)}")
        for child in unit.get("sub_units") or []:
            walk(child, pp, unit_id)

    for u in data["units"]:
        for su in u.get("sub_units") or []:
            walk(su, [u["title"]], u["id"])

    LEAF_CSV.write_text("\n".join(lines) + "\n", encoding="utf-8")


def main() -> None:
    data = json.loads(COURSE_PATH.read_text(encoding="utf-8"))
    unit4 = next(u for u in data["units"] if u["id"] == 4)
    unit4["description"] = (
        "Explain legal airport categories, towered and non-towered operations with CTAF and UNICOM, "
        "runway numbering and pattern announcements, manned traffic patterns, airport signs and holding "
        "markings, and airport security and wildlife rules for remote pilots."
    )
    unit4["text_content"] = UNIT4_INDEX
    unit4["sub_units"] = build_unit4_sub_units()

    COURSE_PATH.write_text(
        json.dumps(data, indent=4, ensure_ascii=False) + "\n",
        encoding="utf-8",
    )
    regenerate_leaf_paths(data)
    print(f"Rebuilt Unit 4: {len(unit4['sub_units'])} lessons")
    print(f"Wrote {LEAF_CSV}")


if __name__ == "__main__":
    main()
