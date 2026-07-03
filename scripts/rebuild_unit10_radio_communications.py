#!/usr/bin/env python3
"""Rebuild Unit 10 (Radio Communication Procedures) in faa_107_course.json."""

from __future__ import annotations

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
COURSE_PATH = ROOT / "assets" / "articles" / "faa_107_course.json"


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


def build_unit10() -> dict:
    remote_practices_children = [
        lesson(
            1061,
            "Recommended Communications Practices",
            "Apply recommended frequency checks and traffic awareness when operating near non-towered airports.",
            "When flying within 5 miles of a non-towered airport, check appropriate frequencies on the Chart Supplement and sectional charts for the area.\n\nPilots must be alert and look for other traffic when operating near an airport without an operating control tower.\n\nCTAF is a radio frequency used for making airport advisory communications.\n\nIt may be provided by UNICOM, MULTICOM, a Flight Service Station (FSS), or a control tower frequency.",
        ),
        lesson(
            1062,
            "UNICOM",
            "Describe UNICOM services, the standard frequency, and how UNICOM advisories differ from ATC instructions.",
            "UNICOM is a non-government radio station used at airports without a control tower or FSS, or at a full-time or part-time UNICOM station.\n\n122.8 is the frequency.\n\nGives airport advisory information when pilots request it, including:\n- Runway in use\n- Local weather observations\n- Airport conditions\n\nUNICOM advisories are not ATC instructions — pilots still self-announce and maintain traffic awareness.",
        ),
        lesson(
            1063,
            "MULTICOM",
            "Explain when and how pilots use the MULTICOM frequency for self-announce at non-towered airports.",
            "At non-towered airports without a UNICOM, or any other listed frequency, pilots should use the MULTICOM frequency of 122.9 to self-announce.\n\nAt airports lacking air traffic control, pilots use the MULTICOM frequency as a CTAF to self-announce their intentions.",
        ),
        lesson(
            1064,
            "Flight Service Station (FSS)",
            "Distinguish FSS preflight and in-flight services from ATC clearances.",
            "Flight Service Station (FSS) is an air traffic facility providing pilots with preflight and in-flight services, such as:\n- Weather briefings\n- Flight plan processing\n- Search and rescue initiation\n- NOTAM updates\n\nUnlike Air Traffic Control (ATC), FSS does not issue clearances.",
        ),
    ]

    standard_calls_children = [
        lesson(
            1081,
            "Initial 10-Mile Call",
            "Recognize the standard format for an initial 10-mile inbound call at a non-towered airport.",
            'Example:\n"Town and Country traffic, Cessna 123 Bravo Foxtrot is 10 miles south inbound for landing, Town and Country traffic."',
        ),
    ]

    return {
        "id": 10,
        "title": "RADIO COMMUNICATION PROCEDURES",
        "sub_title": "",
        "description": "Understand radio communication in the National Airspace System, standard phraseology and the phonetic alphabet, CTAF and advisory frequencies, and recommended practices for remote pilots operating near airports — without transmitting unless it is an emergency.",
        "text_content": "Radio communication is critical for safe aircraft operations in the National Airspace System (NAS). Although remote pilots are not required to communicate on aviation frequencies, they should understand traffic patterns, radio behavior of manned aircraft, and standard phraseology. Do NOT transmit on aviation frequencies unless it is an emergency.",
        "video_url": None,
        "status": "NOT_STARTED",
        "sub_units": [
            lesson(
                101,
                "Radio Communication in the NAS",
                "Explain why radio communication matters in the NAS and how pilots use radios before, during, and after flight.",
                "Radio communication is critical for safe aircraft operations in the National Airspace System (NAS).\n\nPilots use radios to:\n- Give and receive information before, during, and after flight\n- Communicate safety issues such as unexpected weather or inflight emergencies",
            ),
            lesson(
                102,
                "Understanding Proper Radio Procedures",
                "Apply AIM phraseology standards and the phonetic alphabet to interpret manned-aircraft communications near your operation.",
                "Proper radio phraseology improves safety and efficiency.\n\nThe AIM Pilot/Controller Glossary provides standard terminology and examples of proper radio transmissions.\n\nThe phonetic alphabet is used for aircraft identification (e.g., \"Alpha, Bravo, Charlie\"). Do not make up your own words to denote the letters.\n\nKnowing this helps remote pilots understand manned-aircraft communications around them.\n\nMonitoring radio frequencies of local tower may be a requirement of airspace authorization.",
            ),
            lesson(
                103,
                "Phonetic Alphabet",
                "Recall the ICAO phonetic alphabet used for aircraft identification and radio communications.",
                "Phonetic alphabet letters used in radio communications:\n\nAlpha, Bravo, Charlie, Delta, Echo, Foxtrot, Golf, Hotel, India, Juliet, Kilo, Lima, Mike, November, Oscar, Papa, Quebec, Romeo, Sierra, Tango, Uniform, Victor, Whiskey, X-ray, Yankee, Zulu",
            ),
            lesson(
                104,
                "Common Traffic Advisory Frequency (CTAF)",
                "Define CTAF, identify what services may provide it, and explain when remote pilots should monitor it.",
                "CTAF — Common Traffic Advisory Frequency.\n\nUsed to conduct airport advisory practices at non-towered airports. Monitor if working near a non-towered airport.\n\nCTAF may be:\n- UNICOM\n- MULTICOM\n- FSS\n- Tower frequency (when Tower is closed)",
            ),
            lesson(
                105,
                "Communication Frequencies and Chart Supplements",
                "Use Chart Supplement U.S. and sectional charts to find communication frequencies and understand remote pilot monitoring responsibilities.",
                "Example communication frequency information appears in Chart Supplements U.S.\n\nAlthough remote pilots are not required to communicate, they should understand:\n- Traffic patterns\n- Radio behavior of manned aircraft\n- Standard phraseology\n\nDo NOT transmit on aviation frequencies unless it is an emergency.",
            ),
            lesson(
                106,
                "Recommended Traffic Advisory Practices for Remote Pilots",
                "Navigate advisory frequency types and recommended self-announce practices when operating near non-towered airports.",
                "This section covers recommended communications practices near non-towered airports, including UNICOM, MULTICOM, and Flight Service Station (FSS) advisory services.",
                remote_practices_children,
            ),
            lesson(
                107,
                "Aircraft Call Signs and Identification",
                "Interpret U.S. aircraft registration call signs and naming conventions for light GA, turboprop/jet, and airline operations.",
                "U.S. aircraft have unique \"N\" registration numbers (e.g., N123AB).\n\nPronounced using the phonetic alphabet (e.g., November One-Two-Three-Alpha-Bravo).\n\nLight GA aircraft: use manufacturer name.\nExample: Cessna 172 → \"Cessna One-Two-Three-Alpha-Bravo\"\n\nLarger aircraft (turbo-prop/jet): use model name.\nExample: Citation → \"Citation One-Two-Three-Alpha-Bravo\"\n\nAirliners: use company name + flight number.\nExample: Southwest 711 → \"Southwest Seven-One-One\"\n\nSome airlines use special call signs.\nExample: British Airways → \"Speedbird\"",
            ),
            lesson(
                108,
                "Standard Radio Calls for Incoming Aircraft",
                "Recognize standard self-announce radio calls used by manned aircraft at non-towered airports.",
                "Standard radio calls help pilots at non-towered airports coordinate traffic. The initial 10-mile call is a common inbound announcement format.",
                standard_calls_children,
            ),
        ],
    }


def sync_unit7_from_source(units: list) -> None:
    """Apply minor fact syncs from 7- Loading & Performance 2026.pptx.txt."""
    unit7 = next(u for u in units if u.get("id") == 7)
    for sub in unit7.get("sub_units", []):
        if sub.get("id") == 78:
            sub["text_content"] = (
                "CG is not fixed; depends on weight distribution.\n"
                "Position shifts as loads move or are used, ex: fuel.\n"
                "RPIC must:\n"
                "- Determine CG shift and its effect.\n"
                "- Ensure CG remains within allowable limits or relocate or shed weight before flight.\n"
                "- If adding additional cameras or sensors – need to check proper loading."
            )
        if sub.get("id") == 720:
            sub["text_content"] = (
                "Load factor increases rapidly beyond a 45°–50° bank, and stall speed increases significantly.\n"
                "Examples:\n"
                "- 60° bank → 2 Gs\n"
                "- 80° bank → 5.76 Gs\n"
                "Wing must produce lift equal to these load factors to maintain altitude.\n"
                "This chart is in the testing supplement you will have during the test. "
                "Explain how the load factor increases at a significant rate after a bank has reached 45° or 50°. "
                "The wing must produce lift equal to these load factors if altitude is to be maintained. "
                "Show example with a paper airplane or your drone."
            )


def main() -> None:
    data = json.loads(COURSE_PATH.read_text(encoding="utf-8"))
    units: list = data["units"]

    if any(u.get("id") == 10 for u in units):
        units[:] = [u for u in units if u.get("id") != 10]

    sync_unit7_from_source(units)
    units.append(build_unit10())
    units.sort(key=lambda u: int(u["id"]))

    COURSE_PATH.write_text(json.dumps(data, indent=4, ensure_ascii=False) + "\n", encoding="utf-8")
    print(f"Updated {COURSE_PATH} — Unit 10 added, Unit 7 synced.")


if __name__ == "__main__":
    main()
