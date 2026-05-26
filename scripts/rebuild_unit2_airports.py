#!/usr/bin/env python3
"""Rebuild Unit 2 (Airports, Airspace, and Data Sources) per outline alignment."""

from __future__ import annotations

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
COURSE_PATH = ROOT / "assets" / "articles" / "faa_107_course.json"

UNIT2_INDEX = """This unit covers integrating sUAS into the National Airspace System, latitude and longitude navigation, and the four mandatory airport data sources: aeronautical charts, Chart Supplement U.S., NOTAMs, and ATIS.

Lessons follow the airports outline: air traffic context, NAS and ATC, coordinates and conversion, then each data source and chart type (sectional, TAC, legend, obstacles, MEF)."""


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


def build_unit2_sub_units() -> list:
    charts_children = [
        lesson(
            241,
            "Sectional Charts",
            "Describe sectional chart coverage, scale, revision cycle, and what additional legend information pilots should verify before flight.",
            "Sectional charts are the most common charts used by pilots today. They cover the entire United States and are named based on major cities shown on each chart.\n\nScale is 1:500,000. Charts provide airport data, navigational aids, airspace, and topography. Charts are revised semiannually, except Alaska sectional charts, which are revised annually.\n\nBefore flying, check the chart for other legend information, including air traffic control (ATC) frequencies and airspace details, using the chart legend and the Airmen Knowledge Testing Supplement.",
        ),
        lesson(
            242,
            "Terminal Area Charts (TACs)",
            "Compare Terminal Area Charts to sectionals and identify when to use TAC detail near busy terminal airspace.",
            "Terminal Area Charts (TACs) cover the busiest airspace. On a sectional chart, these areas are indicated by purple shading and receive a zoomed-in TAC—for example, around a Class B airport at a major city.\n\nTAC scale is 1:250,000, providing about twice the detail of a sectional chart. TACs are revised semiannually, except charts for the Virgin Islands and Puerto Rico, which are revised annually. TACs do not cover the entire United States.",
        ),
        lesson(
            243,
            "Chart Legend, Supplement, and Airport Data",
            "Use the sectional/TAC legend and testing supplement to extract airport frequencies, traffic patterns, and high-traffic VFR checkpoints.",
            "Symbols and terms on the VFR Terms and VFR Sectional and TAC tabs in the Airmen Knowledge Testing Supplement, Appendix 1, are essential references. On the knowledge test you receive a supplement copy—you cannot use your own.\n\nReview Appendix 1 legend symbols for airports, topographic information, obstructions, communication boxes, and miscellaneous chart features.\n\nAirport markings: blue symbols indicate an airport with a control tower; magenta symbols indicate an airport without a control tower.\n\nEvery charted airport includes data you must read before operating nearby:\n- Airport name and location identifier.\n- Common Traffic Advisory Frequency (CTAF) or control tower (CT) frequency—monitor for inbound and outbound traffic.\n- Traffic pattern direction (left or right), which shows where manned traffic will be relative to you.\n- Runway elevation, used with your position to judge whether the operating risk is acceptable.\n\nA small flag symbol marks a VFR checkpoint; expect higher air traffic volume in those areas.\n\nCharts also show airspace information, navigational and procedural information, chart limits, culture (cities, roads, railroads, towers), hydrography (bodies of water), and relief (contours and elevation figures).\n\nCommunication boxes are mainly used by manned aviation operations but remain testable knowledge for remote pilots.",
        ),
        lesson(
            244,
            "Man-Made Obstacles on Sectional Charts",
            "Identify obstacle symbols on sectional charts and interpret grouped heights, lighting, and MSL versus AGL reporting.",
            "Sectional charts depict man-made obstacles with symbols such as small triangles or tower icons (radio towers, wind turbines, and similar structures).\n\nWhen two or more obstacle symbols are grouped closely together, the height shown is the highest obstacle in that group.\n\nA lightning bolt or star above the symbol indicates the obstacle is lighted for night visibility.\n\nRemote pilots must determine the highest relevant height in MSL (mean sea level) and AGL (above ground level) when AGL is provided.",
        ),
        lesson(
            245,
            "Maximum Elevation Figure (MEF)",
            "Define the Maximum Elevation Figure (MEF), how it is formatted on sectional charts, and how to use it for terrain and obstacle awareness.",
            "The Maximum Elevation Figure (MEF) is the highest elevation—terrain or man-made obstacle—within a chart quadrant of latitude and longitude (30 minutes by 30 minutes), plus a safety buffer.\n\nMEF values are shown in hundreds of feet MSL, rounded up to the nearest hundred; the last two digits are omitted (for example, \"35\" means 3,500 feet MSL).\n\nOn the knowledge test, MEF information is read from the supplement provided—you cannot use your own copy.",
        ),
    ]

    charts_parent = lesson(
        24,
        "Aeronautical Charts: Types and Interpretation",
        "Explain how aeronautical charts support remote pilot planning and how sectional and terminal area charts fit into the four airport data sources.",
        "Aeronautical charts are the road map for pilots. They provide information remote pilots need about intended operating areas, including airport names, airport class, traffic patterns, radio frequencies, and elevations.\n\nAeronautical publications also serve as a learning guide for new pilots and a quick reference for experienced pilots. The FAA is the source for planning charts and Visual Flight Rules (VFR) and Instrument Flight Rules (IFR) publications, including training, planning, departure, en route, approach, and taxi charts.\n\nThe two chart types used most by drone operators under Part 107 are sectional charts and Terminal Area Charts (TACs).\n\nDuring planning, determine whether your flight will be near an airport, review the sectional chart for that airport, and obtain airspace authorization when required.",
        charts_children,
    )

    data_sources = lesson(
        23,
        "Four Essential Airport Data Sources",
        "List the four mandatory sources remote pilots must review when planning operations within five miles of an airport.",
        "If you plan to fly within five miles of an airport, review current airport data before the operation. Data includes communication frequencies, available services, closed runways, and airport construction.\n\nThe four sources of information are:\n- Aeronautical charts\n- Chart Supplement U.S. (formerly Airport/Facility Directory)\n- Notices to Airmen (NOTAMs)\n- Automated Terminal Information Service (ATIS)\n\nDetailed lessons for each source follow below, including chart types under aeronautical charts.",
        [
            lesson(
                231,
                "Chart Supplement U.S. (CSU)",
                "Describe the Chart Supplement U.S. content, revision cycle, and how to use the legend sample for airport planning.",
                "The Chart Supplement U.S. (formerly the Airport/Facility Directory) provides the most comprehensive information on an airport, including airports, heliports, and seaplane bases.\n\nIt is updated in print and digital formats and is revised every 56 days. Source: www.faa.gov/air_traffic/flight_info/aeronav\n\nInformation includes runway data and elevations, CTAF radio frequency, contact phone numbers, and weather sources. How to interpret entries is explained in the Chart Supplement \"Legend Sample.\"",
            ),
            lesson(
                232,
                "Notices to Airmen (NOTAMs)",
                "Define NOTAMs, identify common reasons they are issued, and locate official NOTAM sources before flight.",
                "A Notice to Airmen (NOTAM) is time-critical aeronautical information—temporary in nature or not known far enough in advance to publish in chart supplements or other operational publications. NOTAMs are disseminated immediately through the NOTAM system. Reviewing NOTAMs may change your decision to fly; use good judgment and common sense.\n\nReasons for NOTAMs include: hazards (air shows, parachute jumps, kite flying, rocket launches); flights involving dignitaries; inoperable lights on tall obstructions; temporary obstacles near airfields; and bird activity (BIRDTAM).\n\nNOTAM sources:\n- https://notams.aim.faa.gov/\n- https://tfr.faa.gov/tfr3/?page=list\n- www.1800wxbrief.com\n\nSample NOTAM (JFK crane) for study: !JFK 07/398 JFK OBST CRANE (ASN 2024-AEA-9387-OE) 404002N0734744W (1.8NM NNW JFK) 189FT (171FT AGL) FLAGGED AND LGTD 2507171151-2701151800\n- !JFK: John F. Kennedy International Airport.\n- 07/398: NOTAM number 398 issued in July.\n- OBST CRANE: obstruction (crane) near JFK.\n- 404002N0734744W: 40°40'02\" N, 73°47'44\" W.\n- 1.8 NM NNW JFK: position relative to the airport.\n- 189 FT (171 FT AGL): heights MSL and AGL.\n- FLAGGED AND LGTD: marked and lighted.\n- 2507171151-2701151800: effective times in UTC.\n\nOn the FAA knowledge test you are not required to fully decode complex NOTAM strings from memory; understand what each field represents and always check NOTAMs before flight.",
            ),
            lesson(
                233,
                "Automated Terminal Information Service (ATIS)",
                "Explain what ATIS broadcasts include, how often it is updated, and how pilots confirm they have current information with ATC.",
                "The Automated Terminal Information Service (ATIS) is a looped recording of weather and other information broadcast on a local frequency. It may include weather, runways in use, specific ATC procedures, and airport construction that could affect your plan.\n\nATIS is updated at least hourly and more often when conditions warrant. Each update receives a phonetic code (for example, Information Alpha, then Information Bravo). Before contacting ATC, listen to ATIS and state the current code on initial contact (for example, \"with information Bravo\"). This confirms you have current local weather and airport information without the controller repeating it. Use ATIS at departure and arrival airports when available.",
            ),
            charts_parent,
        ],
    )

    return [
        lesson(
            211,
            "Air Traffic by the Numbers",
            "Explain why integrating sUAS into the NAS requires a managed approach to safety and airspace integrity.",
            "Adding many small unmanned aircraft systems (sUAS) to the National Airspace System (NAS) is a complex challenge. A managed approach is necessary because of many variables and potential safety concerns. Maintaining the safety and integrity of U.S. airspace is essential as sUAS operations increase.",
        ),
        lesson(
            212,
            "National Airspace System (NAS)",
            "Identify the major components of the NAS and how each supports safe, efficient aviation operations.",
            "The National Airspace System (NAS) is a network of airspace, navigation facilities, airports, technology, and regulations that enable safe and efficient air travel in the United States.\n\nMajor components include:\n- Airspace Management: organizes controlled, uncontrolled, and special-use airspace.\n- Communication Systems: link pilots and controllers.\n- Navigation and Surveillance: radar, GPS, and related systems track aircraft and support navigation.\n- Air Traffic Services: flight planning, weather services, and traffic flow management.\n- Safety and Regulation: rules and oversight that keep operations safe.",
        ),
        lesson(
            213,
            "Air Traffic Control (ATC)",
            "State the primary purpose of ATC and the core services controllers provide to manned and unmanned operators.",
            "The primary purpose of Air Traffic Control (ATC) is to prevent collisions between aircraft operating in the system and to organize and expedite the flow of traffic.\n\nATC services include:\n- Instructions for flight paths, altitude changes, and landing or takeoff clearances.\n- Separation of aircraft.\n- Traffic flow management.\n- Emergency assistance.\n- Coordination across sectors.",
        ),
        lesson(
            22,
            "Navigation: Latitude and Longitude",
            "Convert between decimal degrees and degrees-minutes-seconds coordinates and locate positions using latitude and longitude.",
            "Latitude and longitude are among the most reliable navigation references for pilots. Pilots and remote operators use them to move between airports and other locations. Any point on Earth is defined by the intersection of a latitude line and a longitude line.\n\nLatitude: The equator is an imaginary circle between the poles and the starting reference for lines running north or south. Circles parallel to the equator (running east and west) are parallels of latitude. Latitude is measured in degrees north (N) or south (S) of the equator. The continental United States lies between about 25° and 49° N latitude. On training figures, parallels of latitude are often shown as yellow lines.\n\nLongitude: Meridian lines run from pole to pole at right angles to the equator. The Prime Meridian passes through Greenwich, England, and is the zero reference. Longitude is measured in degrees east (E) or west (W) to 180°. The 48 contiguous states lie between about 67° and 125° W longitude. On training figures, meridians are often shown as red lines.\n\nExample city: Chicago is located at approximately 42° N latitude, 88° W longitude.\n\nFormat: Degrees are divided into 60 minutes; minutes may be divided into 60 seconds. Coordinates are written degrees (°), minutes ('), and seconds (\"), with latitude listed first, then longitude. North and east are positive; south and west are negative in many digital systems.\n\nDecimal conversion (required for sectional chart work): Use the whole number as degrees; multiply the decimal portion by 60 for minutes; multiply the decimal portion of minutes by 60 for seconds.\n\nJFK example: 40.6399° N, 73.7797° W\n- Degrees: 40° and 73°\n- Minutes: 0.6399 × 60 = 38.39' and 0.7797 × 60 = 46.78'\n- Seconds: 0.39 × 60 ≈ 23\" and 0.78 × 60 ≈ 47\"\n- Result: 40°38'23\" N, 73°46'47\" W",
        ),
        data_sources,
    ]


def main() -> None:
    data = json.loads(COURSE_PATH.read_text(encoding="utf-8"))
    unit2 = data["units"][1]
    unit2["description"] = (
        "Apply NAS and ATC fundamentals, use latitude and longitude for planning, "
        "and consult aeronautical charts, Chart Supplement U.S., NOTAMs, and ATIS "
        "before operating near airports."
    )
    unit2["text_content"] = UNIT2_INDEX
    unit2["sub_units"] = build_unit2_sub_units()
    COURSE_PATH.write_text(
        json.dumps(data, indent=4, ensure_ascii=False) + "\n",
        encoding="utf-8",
    )

    # Regenerate leaf paths
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

    (ROOT / "assets" / "articles" / "faa_107_course_leaf_paths.csv").write_text(
        "\n".join(lines) + "\n",
        encoding="utf-8",
    )
    print(f"Rebuilt Unit 2: {len(unit2['sub_units'])} top-level lessons")
    print(f"Leaf paths: {len(lines) - 1}")


if __name__ == "__main__":
    main()
