#!/usr/bin/env python3
"""Rebuild Unit 3 (Airspace Classifications) per airspace outline alignment."""

from __future__ import annotations

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
COURSE_PATH = ROOT / "assets" / "articles" / "faa_107_course.json"
LEAF_PATH = ROOT / "assets" / "articles" / "faa_107_course_leaf_paths.csv"

UNIT3_INDEX = """This unit covers airspace categories, controlled classes A through G, chart-reading skills for the knowledge test, special use airspace, and other designated areas.

Lessons follow the airspace outline: categories and symbols, controlled-airspace overview, each class with chart examples where the outline provides them, Class E subtypes (E2, E3, E4), chart-question methodology, then special use and other airspace."""


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


def build_controlled_sub_units() -> list:
    return [
        lesson(
            321,
            "Class A Airspace",
            "Describe Class A vertical limits, IFR requirement, coastal coverage, and why it is not charted.",
            "CLASS A\nClass A is the highest level of airspace. It extends from 18,000 feet mean sea level (MSL) up to and including flight level (FL600) (60,000 feet). The 60,000' altitude is shortened to 600 (the hundredths place). It includes airspace over water within 12 NM of the coast. All pilots must operate aircraft under instrument flight rules (IFR). Primary users are high-altitude commercial flights and long-haul aircraft. No markings are found on charts because its vertical boundaries are known and not charted.",
        ),
        lesson(
            322,
            "Class B Airspace",
            "Define Class B dimensions, structure, ATC authorization requirement, and solid blue chart markings.",
            "CLASS B AIRSPACE\nClass B airspace extends from the surface to 10,000 feet mean sea level (MSL) around the busiest airports. It consists of a surface area and two or more layers, resembling an upside-down wedding cake. Think about how an aircraft lands or takes off from the airport—larger airports need more airspace.\n\nRemote pilots must receive authorization from ATC before operating in Class B airspace. Markings are solid blue lines. Layer altitudes are shown in blue and charted in MSL, displayed as a fraction (for example 125/SFC and 125/30). The bottom number represents the floor and the top number represents the ceiling, both in hundreds of feet (ex: 100/25 = 12,500' MSL ceiling, 2,500' MSL floor). The layer that starts at ground level is noted as SFC in the bottom portion of the fraction.",
        ),
        lesson(
            3221,
            "Class B Chart Examples",
            "Read Class B layer fractions and blue line markings using Atlanta (ATL) and Baltimore/Washington (BWI) examples.",
            "CLASS B EXAMPLE — Atlanta, GA (ATL) (Hartsfield/Jackson)\nMarkings are solid blue lines. Layer altitudes are shown in blue. Charted in MSL and displayed as a fraction—for example 125/SFC and 125/30.\n\nCLASS B EXAMPLE — Baltimore/Washington Intl Thurgood Marshall Airport\nMarkings are solid blue lines. Layer altitudes are shown in blue. Charted in MSL and displayed as a fraction—for example 100/SFC and 100/15.",
        ),
        lesson(
            323,
            "Class C Airspace",
            "Define Class C dimensions, tower and radar requirements, inner and outer rings, authorization, and magenta markings.",
            "CLASS C\nClass C airspace normally extends from the surface to 4,000 feet (MSL). Airports in Class C have an operational control tower. They are not as busy as Class B but still important. Class C airspace is serviced by radar approach control and has instrument flight rules (IFR) operations.\n\nThe area is individually tailored and usually consists of a surface area with a 5 nautical mile (NM) radius. The outer circle is a 10 NM radius that extends from 1,200' to 4,000' MSL. Authorization is required before operating in Class C airspace. Markings are solid magenta lines. Layer altitudes are written in magenta.",
        ),
        lesson(
            3231,
            "Class C Chart Examples",
            "Interpret Class C magenta rings and altitudes using Toledo Express (TOL) and Anchorage (PANC) examples.",
            "CLASS C EXAMPLE — Toledo Express (TOL)\nToledo Express has an operational control tower—a requirement for Class C. Markings are solid magenta lines. Layer altitudes are written in magenta.\n- Inner Ring: Floor surface to ceiling of 4,700 feet MSL\n- Outer Ring: Floor 2,000 feet MSL to ceiling 4,700 feet MSL\n\nCLASS C EXAMPLE — Anchorage, Alaska (PANC)\n- Inner core: Surface to 4,100' MSL within 5 NM\n- Outer ring: 1,400' to 4,100' MSL\n- Class E extensions for approach paths",
        ),
        lesson(
            324,
            "Class D Airspace",
            "Describe Class D dimensions, tower requirement, part-time reversion, authorization, and dashed blue markings.",
            "CLASS D\nClass D airspace normally extends from the surface to 2,500' above the airport elevation MSL. It surrounds airports that have an operational control tower and is less busy than Class C airspace. Class D airspace is one layer and is individually tailored. Some Class D areas have arrival extensions or departures for Class D or Class E, and some have a 5 NM radius around the airport.\n\nIf the control tower is part-time, the airspace reverts to Class E or G airspace. Remote pilots must receive ATC authorization before operating in Class D airspace. Markings are dashed blue lines. The airspace ceiling is indicated by a number in a dashed box; its altitude is given in hundreds of feet. The fraction format is not used because there is only one layer starting at the surface.",
        ),
        lesson(
            3241,
            "Class D Chart Example (KLUK)",
            "Read dashed blue Class D boundaries and ceiling notation at Cincinnati Municipal/Lunken Field (KLUK).",
            "CLASS D — Cincinnati Municipal/Lunken Field Airport (KLUK)\nDashed blue line markings. The airspace ceiling is indicated by a number in a dashed box; its altitude is given in hundreds of feet.\n- An outer ring marked 30 represents 3,000 feet MSL\n- An area marked (-21) indicates up to but not including 2,100' MSL",
        ),
        lesson(
            3242,
            "Class D with Class E Extension",
            "Recognize Class D combined with Class E extensions and apply communication and authorization requirements at Concord-Padgett (JQF).",
            "CLASS D WITH A CLASS E EXTENSION — Concord-Padgett Regional Airport (JQF)\nClass D is controlled airspace; pilots are required to communicate with air traffic control when the tower is operational. This example shows Class D airspace with a Class E extension depicted with magenta dashed lines.\n\nSample test question: (Refer to FAA-CT-8080-2H, Figure 23, area 3.) What is the floor of the Savannah Class E airspace at the shelf area (outer circle)? Use the chart-question steps lesson to work through figure-based airspace questions like this one.",
        ),
        lesson(
            325,
            "Class E Fundamentals",
            "Explain Class E purpose, vertical limits, default bases, federal airways, and MSL versus AGL references.",
            "CLASS E\nClass E is the least busy controlled airspace. It is controlled airspace not classified as Class A, B, C, or D. A large amount of the airspace over the U.S. is Class E and provides sufficient airspace for the safe control of aircraft during IFR operations.\n\nClass E extends up to, but not including, 18,000' MSL (the lower limit of Class A). All airspace above 60,000' MSL is Class E airspace. In areas where charts do not depict a Class E base, Class E begins at 14,500' MSL. In most areas, the Class E airspace base is 1,200 ft AGL. In some areas, the Class E airspace base is at the surface or 700 feet AGL.\n\nSome Class E airspace begins at an MSL altitude instead of an AGL altitude. Federal Airways, shown as blue lines on a sectional chart, are usually found within Class E airspace. Remote pilots do not need ATC authorization to operate in Class E except when in Class E2. Class E airspace acts as a transition zone into other airspaces.\n\nClass E airspace can change its classification based on certain conditions. For instance, at small airports with part-time control towers, the airspace changes from Class D to Class E after the tower closes.",
        ),
        lesson(
            326,
            "Class E Chart Examples — 700' and 1,200' AGL",
            "Identify Class E transition areas and 1,200' AGL shelves using vignette markings and the KEHO example.",
            "CLASS E EXAMPLE — Shelby-Cleveland County Regional Airport (KEHO)\nClass E airspace beginning at 700 feet above ground level (AGL), shown with a faded magenta line (vignette).\n\nClass E airspace with the floor 1,200' or greater above the surface that abuts Class G is represented by a blue vignette. The faded side of the vignette represents the typical floor of 1,200 feet AGL.",
        ),
        lesson(
            327,
            "Class E2 Surface Areas",
            "Define Class E2 surface areas, authorization requirements, and chart markings using PUJ, MTJ, and Bethel (PABE) examples.",
            "CLASS E2 — Paulding Northwest Atlanta (PUJ)\nClass E2 starts at the surface. It is typically circular and centered on the airport to contain instrument approach procedures. Prior authorization from Air Traffic Control (ATC) is required.\n\nCLASS E2 EXAMPLE — Montrose Rgnl (MTJ)\nDashed magenta lines with no intersecting lines indicate Class E airspace starting at the surface. The Class E transition area—a faded magenta vignette around the airport—indicates Class E airspace beginning at 700' AGL. Class G uncontrolled airspace exists below the Class E transition area, from the surface up to 700' AGL outside the dashed magenta lines.\n\nBETHEL ALASKA (PABE) CLASS E2\nClass E can appear even with a blue dashed line. It indicates controlled airspace beginning at the surface—it can be Class E or Class D. A blue dashed line is normally Class D, but if there is no operating control tower, the same line may be used for Class E. Bethel has no control tower; airspace starts at the surface and is controlled Class E.",
        ),
        lesson(
            328,
            "Class E3 and E4 Extensions",
            "Distinguish Class E3 and E4 extensions from Class E2 and state authorization requirements for each.",
            "CLASS E3\nClass E3 is an extension to a Class C surface area. It extends Class E airspace from the surface to provide IFR approach or departure paths. It has an operating control tower. Class E3 is depicted by dashed magenta lines extending from Class C. No ATC authorization is required in E3, but authorization is needed in adjacent Class C airspace.\n\nCLASS E4\nClass E4 is an extension of a Class D or Class E surface area. It differs from an E2 area because it is not centered on the airport but extends another designated surface area, typically to accommodate instrument approach and departure paths. No ATC authorization is needed in E4. A dashed magenta line separates the airspace. Class D airspace authorization from ATC is needed when operating in the Class D portion.",
        ),
        lesson(
            329,
            "Class G Airspace",
            "Define Class G as uncontrolled airspace, its typical vertical limits, and the fact that it is not charted.",
            "CLASS G AIRSPACE\nClass G airspace is uncontrolled airspace. Class G is anywhere that is not Class A, B, C, D, or E. In the U.S., Class G starts at the surface and goes up to where Class E airspace begins—usually 700 or 1,200 feet AGL. Class G airspace is not depicted on the sectional chart. No prior authorization is required to fly in Class G airspace.",
        ),
    ]


def build_special_use_sub_units() -> list:
    return [
        lesson(
            331,
            "Restricted Areas",
            "Define restricted areas, active/inactive flight rules, hazards, and hatched blue R-chart markings.",
            "RESTRICTED AREAS\nFlight is possible with restrictions but not when active. Check active hours and affected altitudes on the sectional chart; it lists the controlling agency. These areas can contain hazards such as artillery firing, aerial gunnery, or guided missiles. Flying in the area without authorization may be extremely hazardous. They are depicted with a hatched blue border and the letter R followed by a number. Ex: R-4806 W Nellis AFR Range Complex used for military training and testing.",
        ),
        lesson(
            332,
            "Prohibited Areas",
            "Define prohibited areas, their national-security purpose, and P-number chart symbols.",
            "PROHIBITED AREAS\nAircraft of any kind is prohibited. These areas are established for national security. They are indicated on the chart with a \"P\" followed by a number such as \"47\" and special marking as shown in the legend. Examples include the DOE nuclear weapons facility in Amarillo, TX, Camp David, and the National Mall in Washington DC.",
        ),
        lesson(
            333,
            "Warning Areas",
            "Define warning areas over open water, legal jurisdiction limits, and W-number chart markings.",
            "WARNING AREAS\nWarning areas are similar to restricted areas, but the U.S. does not have sole jurisdiction over airspace over open waters. Legally, they cannot stop you from flying into a warning area. They contain activity that may be hazardous to nonparticipating aircraft. They start 3 NM from the U.S. coastline over domestic or international waters. Sectional charts depict warning areas with a blue-hatched border and a \"W\" followed by a number.",
        ),
        lesson(
            334,
            "Military Operations Areas (MOAs)",
            "Define MOAs for military training separation, lower altitude limits, and magenta chart markings.",
            "MILITARY OPERATIONS AREAS\nMOAs can have lower altitude limits due to activity. They are depicted with magenta markings like alert areas. MOAs are depicted on sectional, VFR terminal area, and en route low altitude charts with a name and are sometimes numbered. See the Gamecock example used for F-16 training.",
        ),
        lesson(
            335,
            "Alert Areas",
            "Define alert areas for high-volume training or unusual aerial activity and A-number chart markings.",
            "ALERT AREAS\nAlert areas are depicted on aeronautical charts with an \"A\" followed by a number (e.g., A-293). They are depicted with magenta markings like MOA areas. They may contain a high volume of pilot training or an unusual type of aerial activity. There are no requirements to enter alert areas, but pay attention when flying in alert areas.\n\nAlert Area A-293 is west of Daytona Beach Intl.",
        ),
        lesson(
            336,
            "Controlled Firing Areas (CFAs)",
            "Define controlled firing areas and explain why activities must stop when nonparticipating aircraft approach.",
            "CONTROLLED FIRING AREAS (CFA)\nCFAs contain activities that, if not conducted in a controlled environment, could be hazardous to nonparticipating aircraft. The difference between CFAs and other special use airspace is that activities must be suspended when a spotter aircraft, radar, or ground lookout position indicates an aircraft might be approaching the area. CFAs are not listed on aeronautical charts since they do not cause a nonparticipating aircraft to change its flight path.",
        ),
    ]


def build_other_airspace_sub_units() -> list:
    return [
        lesson(
            341,
            "Local Airport Advisory (LAA)",
            "Describe local airport advisory services, frequencies, and weather data available from Flight Service.",
            "LOCAL AIRPORT ADVISORY\nAn advisory service provided by Flight Service facilities, located on the landing airport, using a discrete ground-to-air frequency or the tower frequency when the tower is closed.\n\nServices include local airport advisories, automated weather reporting with voice broadcasting, and a continuous Automated Surface Observing System (ASOS)/Automated Weather Observing Station (AWOS) data display, other continuous direct reading instruments, or manual observations available to the specialist.",
        ),
        lesson(
            342,
            "Military Training Routes (MTRs)",
            "Identify MTR naming conventions for VFR and IFR routes and recognize that military aircraft may exceed 250 knots below 10,000 feet.",
            "MILITARY TRAINING ROUTES\nMilitary Training Routes (MTRs) are routes that military aircraft fly during training. Military aircraft can exceed 250 knots below 10,000 feet.\n\n- VFR routes (VR): MTRs with no segment above 1,500' are identified by four-digit numbers (e.g., VR1007) and flown under Visual Flight Rules. VFR routes are not ATC-controlled.\n- IFR routes (IR): MTRs that include one or more segments above 1,500' AGL are identified by three or fewer digit numbers (e.g., IR21, VR207) and flown under Instrument Flight Rules. IFR routes are under ATC control.",
        ),
        lesson(
            343,
            "Temporary Flight Restrictions (TFRs)",
            "Explain TFR content as NOTAMs, common reasons TFRs are issued, and which TFRs appear on sectional charts.",
            "TEMPORARY FLIGHT RESTRICTIONS (TFRS)\nTFR areas relating to national security are indicated with a broken blue line. Note: only TFRs relating to national security are charted.\n\nA TFR is a type of Notice to Airmen (NOTAM). It includes the location of the temporary restriction, time period, area in statute miles, altitudes affected, FAA coordination facility and telephone number, and reason for the restriction. The pilot should check NOTAMs as part of flight planning.\n\nA TFR is an area where air travel is restricted due to a hazardous condition, a special event, or a general warning for the entire airspace. Reasons include:\n- Protect persons and property in the air or on the surface from an existing or imminent hazard\n- Provide a safe environment for the operation of disaster relief aircraft\n- Prevent an unsafe congestion of aircraft above an incident or event (e.g., Super Bowl)\n- Protect declared national disasters for humanitarian reasons in the State of Hawaii\n- Protect the President, Vice President, or other public figures\n- Provide a safe environment for space agency operations",
        ),
        lesson(
            344,
            "Parachute Jump Aircraft Operations",
            "Locate parachute jump operation information in the Chart Supplement U.S. and on sectional charts.",
            "PARACHUTE JUMP AIRCRAFT OPERATIONS\nOperations are published in the Chart Supplement U.S. Sites that are used frequently are depicted on sectional charts.",
        ),
        lesson(
            345,
            "Published VFR Routes",
            "Define published VFR routes for navigating complex airspace and identify where they are charted.",
            "PUBLISHED VFR ROUTES\nPublished VFR routes are for transitioning around, under, or through some complex airspace. Terms include VFR flyway, VFR corridor, Class B airspace VFR transition route, and terminal area VFR route. They are found on VFR terminal area planning charts—for example, charts covering the New York City area.",
        ),
        lesson(
            346,
            "Terminal Radar Service Areas (TRSA)",
            "Define TRSAs, their radar-separation purpose, and solid grey line chart markings.",
            "TERMINAL RADAR SERVICE AREAS (TRSA)\nTerminal Radar Service Areas are areas where participating pilots can receive additional radar services. The purpose of the service is to provide separation between all IFR operations and participating VFR aircraft. TRSAs are depicted on sectional charts with a solid grey line.",
        ),
        lesson(
            347,
            "National Security Areas (NSA)",
            "Define national security areas, voluntary avoidance requests, and NOTAM-based flight prohibitions.",
            "NATIONAL SECURITY AREAS (NSAS)\nNational Security Areas exist anywhere there is a requirement for increased security and safety of ground facilities. Flight in NSAs may be temporarily prohibited by regulation under the provisions of 14 CFR part 99. Prohibitions are disseminated via NOTAM. Pilots are requested to voluntarily avoid flying in the area.",
        ),
        lesson(
            348,
            "Air Defense Identification Zones (ADIZ)",
            "Define ADIZ purpose along the U.S. perimeter and recognize magenta dotted boundary markings.",
            "AIR DEFENSE IDENTIFICATION ZONES (ADIZ)\nAn Air Defense Identification Zone surrounds the country's perimeter, protecting the country from unknown aircraft. The government treats unidentified aircraft entering the ADIZ as possible threats and may intercept them with military aircraft. Sectional charts depict ADIZ boundaries with a magenta line with dots.",
        ),
    ]


def build_unit3_sub_units() -> list:
    controlled = lesson(
        32,
        "Controlled Airspace Overview",
        "Summarize controlled airspace, MSL versus AGL references, and the classes most relevant to remote pilots.",
        "CONTROLLED AIRSPACE OVERVIEW\nControlled airspace is a generic term that covers the different classifications of airspace. It has defined dimensions within which air traffic control (ATC) service is provided.\n\nBe sure to note whether MSL or AGL is used when determining altitude: Classes A, B, C, and D use MSL; Class E and G use MSL and AGL.\n\nAirspace of concern to the remote pilot is:\n- Class A — starts at 18,000 feet MSL and covers the entire U.S.\n- Class B — busiest airports\n- Class C — mid-sized airports\n- Class D — small city airports\n- Class E (four types within) — least busy airports and covers the entire U.S. at some level\n\nIt is helpful to imagine aircraft as they approach or depart an airport. Larger airports need more area to land, which is why Class B and C airspace look like upside-down wedding cakes.",
        build_controlled_sub_units(),
    )

    special_use = lesson(
        33,
        "Special Use Airspace",
        "Identify the six special use airspace types, planning considerations, and legend information for each area.",
        "SPECIAL USE AIRSPACE\nSpecial use airspace is designated for specific activities within a defined area. If you are not involved in those activities, you may face restrictions when entering this airspace. As part of your planning, confirm whether you can fly in the area.\n\nMultiple types of special use airspace are listed in the legend of the Airman Knowledge Testing Supplement. The size, shape, floor, and ceiling of each area vary. Information in the legend includes radio frequencies used, active hours, affected altitudes on your sectional chart, and the controlling agency's contact information.\n\nSpecial use airspace types include restricted areas, prohibited areas, warning areas, military operation areas (MOAs), alert areas, and controlled firing areas (CFAs).",
        build_special_use_sub_units(),
    )

    other = lesson(
        34,
        "Other Airspace Areas",
        "Describe advisories, routes, temporary restrictions, and security-related airspace beyond the main classifications.",
        "OTHER AIRSPACE AREAS\nOther airspace areas include Local Airport Advisory (LAA), Military Training Routes (MTRs), Temporary Flight Restrictions (TFRs), parachute jump aircraft operations, published VFR routes, Terminal Radar Service Areas (TRSA), National Security Areas (NSA), and Air Defense Identification Zones (ADIZ).",
        build_other_airspace_sub_units(),
    )

    return [
        lesson(
            31,
            "Introduction and Airspace Categories",
            "Identify the two regulatory categories of airspace and the four sub-types remote pilots must distinguish.",
            "INTRO TO AIRSPACE CLASSIFICATIONS\nAIRSPACE CATEGORIES\nAirspace is broken into two categories—regulatory and nonregulatory—which are further broken down into controlled, uncontrolled, special use, and other airspace.\n\nClassification is based on complexity and concentration of aircraft movements, type of operations, level of safety required, and national and public interest.\n\nClass B and C airspace look like upside-down wedding cakes. Class G is uncontrolled airspace—not depicted on sectional charts—and no authorization is needed (G means go).",
        ),
        lesson(
            311,
            "Airspace Symbols and Chart Literacy",
            "Explain why remote pilots must understand airspace symbols and identify the type of airspace they plan to operate in.",
            "AIRSPACE INFORMATION\nIt is important to understand the various airspace symbols and the type of airspace you plan on operating in before flight.",
        ),
        controlled,
        lesson(
            38,
            "Answering Airspace and Chart Questions",
            "Apply a six-step method to answer FAA knowledge-test airspace questions using the testing supplement and chart legend.",
            "STEPS TO ANSWER AIRSPACE AND CHART QUESTIONS\n1. Read the question and identify what map or chart is needed.\n2. Open the Airman Knowledge Testing Supplement for Sport, Recreational, and Private Pilots and locate the correct figure and area referenced in the question.\n3. Find the airport or location in the question on that chart.\n4. Use the Legend (Page 11) to determine the airspace classification and whether there is a control tower—blue = controlled airport (towered), magenta = non-towered airport.\n5. Identify altitude references—Class A, B, C, and D airspace use MSL; Class E and G may use MSL or AGL.\n6. Apply the chart information to the question and select the correct answer.",
        ),
        special_use,
        other,
    ]


def regenerate_leaf_paths(data: dict) -> None:
    lines = ["unit_id,sub_unit_id,course_path"]

    def walk(node: dict, parts: list[str], unit_id: int) -> None:
        path_parts = parts + [node["title"]]
        if not node.get("sub_units"):
            lines.append(f"{unit_id},{node['id']},{' > '.join(path_parts)}")
        for child in node.get("sub_units") or []:
            walk(child, path_parts, unit_id)

    for unit in data["units"]:
        for sub in unit.get("sub_units") or []:
            walk(sub, [unit["title"]], unit["id"])

    LEAF_PATH.write_text("\n".join(lines) + "\n", encoding="utf-8")


def main() -> None:
    data = json.loads(COURSE_PATH.read_text(encoding="utf-8"))
    unit3 = next(u for u in data["units"] if u["id"] == 3)
    unit3["description"] = (
        "Identify all airspace classifications used by remote pilots—controlled, uncontrolled, "
        "special use, and other areas—and apply chart symbols, altitude references, and "
        "authorization requirements."
    )
    unit3["text_content"] = UNIT3_INDEX
    unit3["sub_units"] = build_unit3_sub_units()

    COURSE_PATH.write_text(
        json.dumps(data, indent=4, ensure_ascii=False) + "\n",
        encoding="utf-8",
    )
    regenerate_leaf_paths(data)
    print(f"Rebuilt Unit 3: {len(unit3['sub_units'])} top-level lessons")
    print(f"Leaf paths written to {LEAF_PATH.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
