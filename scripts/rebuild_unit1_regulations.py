#!/usr/bin/env python3
"""Rebuild Unit 1 (Part 107 Regulations) structure and content in faa_107_course.json."""

from __future__ import annotations

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
COURSE_PATH = ROOT / "assets" / "articles" / "faa_107_course.json"

UNIT1_INDEX = """This unit follows the Part 107 regulations outline: applicability, crew roles, operational rules (registration through performance limits), waivers, Remote ID, operations over people and moving objects, and night operations.

Lessons in Operational Rules (13): registration and inspection; accident reporting; medical fitness; moving vehicles and property transport; general operation over people; VLOS; right-of-way; autonomous flight; preflight and airspace; operating limitations."""


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


def build_unit1_sub_units() -> list:
    return [
        lesson(
            11,
            "Applicability of Part 107",
            "Identify which small unmanned aircraft operations are governed by Part 107 and which operations are explicitly excluded.",
            "The FAA published remote pilot certification and operating rules for civil small unmanned aircraft in August 2016. Part 107 oversees non-recreational and commercial operations of small unmanned aircraft systems (sUAS) in the National Airspace System (NAS).\n\nPart 107 applies to any operation that directly or indirectly supports a business, nonprofit, government, or compensated purpose (monetary or non-monetary).\n\nDrone operators no longer need special exemptions or permits from the FAA to fly—only a Remote Pilot certificate. Operators can fly without needing special exemptions, airworthiness requirements, pilot certification provisions, operating limitations, or external payload provisions. Initially, the rule did not permit sUAS operations at night or over people without a waiver.\n\nPart 107 DOES NOT apply to: recreational/model aircraft operated in accordance with 49 U.S.C. 44809 (hobby and recreational use), public aircraft operations, amateur rockets, moored balloons, unmanned free balloons, kites, operations conducted outside the United States, air carrier operations, and operations conducted under Section 333 exemptions.",
        ),
        lesson(
            121,
            "Remote Pilot In Command (RPIC)",
            "Describe RPIC certification, authority, preflight duties, and emergency responsibilities under Part 107.",
            "The person flying the drone must hold a Remote Pilot Certificate with a sUAS rating, or be under the direct supervision of someone who holds that certificate.\n\nThe RPIC has final authority and ultimate responsibility for the operation and safety of the sUAS and flight. The certificate must be easily accessible when flying.\n\nThe RPIC must be designated before or during the flight. The RPIC must ensure the sUA will pose no undue hazard to other people, aircraft, or property in the event of a loss of control, and must ensure the operation complies with all applicable regulations.\n\nPreflight duties include conducting preflight checks of the aircraft and control system, verifying the aircraft is safe and airworthy, confirming registration requirements are met, ensuring Visual Line of Sight (VLOS) rules will be met, and briefing the crew (visual observer and person manipulating controls) on readiness and capability.\n\nThe RPIC has final authority to modify, delay, or cancel a flight. In a true in-flight emergency requiring immediate action, the RPIC may deviate from Part 107 rules to the extent necessary to meet that emergency.",
        ),
        lesson(
            122,
            "Person Manipulating the Flight Controls",
            "Explain when a non-certificated person may manipulate flight controls and the supervision requirements for the RPIC.",
            "Under Part 107, the person manipulating the flight controls is physically operating the drone's controls but is not necessarily the Remote Pilot in Command (RPIC).\n\nIf the person manipulating the flight controls is not a certificated remote pilot, they may operate the controls only if:\n- The RPIC is supervising them directly.\n- The RPIC has the ability to immediately take control, either by standing next to them or through a radio or override system.\n- They understand the mission, safety procedures, and emergency actions.",
        ),
        lesson(
            123,
            "Visual Observer (VO)",
            "Explain the visual observer's role, when a VO is used, and VLOS duties shared with the RPIC and control operator.",
            "A Visual Observer (VO) assists the crew in avoiding hazards and obstacles and in maintaining situational awareness and VLOS. A VO is not always required but is recommended when mission complexity warrants extra eyes on the operation.\n\nWhen a VO is used, the RPIC, the person manipulating the flight controls, and the VO must maintain effective communication with each other at all times, scan the airspace for potential collision hazards, and maintain awareness of the sUA position through direct visual observation.\n\nThe VO must keep the unmanned aircraft in VLOS unaided (corrective lenses only). Briefly looking at the flight controller to locate the aircraft for a second or to check battery life—or when the aircraft is momentarily behind smoke or a chimney—is acceptable if VLOS is maintained overall.",
        ),
        lesson(
            124,
            "Flight Crew Management and Communication",
            "Apply crew briefing, workload management, and communication methods including hands-free options and clock-position reporting.",
            "Depending on operation complexity, additional crew may be needed beyond the RPIC, VO, and person manipulating the controls—for example payload operators, camera operators, or other specialists.\n\nThe RPIC is responsible for task distribution and workload management.\n\nPre-flight considerations include assessing weather, airspace, terrain, and obstacles; aircraft condition and airworthiness; and crew readiness (mental and physical).\n\nPre-flight communications must include a crew briefing on emergency procedures, contingency plans, and potential hazards. Preflight familiarization and inspection include reviewing manufacturer instructions, inspecting components (propellers, battery, control link), and ensuring required documentation is available.\n\nEffective communication between crew members may use a two-way radio, cell phone, or other technology. The RPIC may choose any communication method as long as it is safe. If the person manipulating the flight controls cannot use a handheld device safely, use hands-free options such as an earpiece, headset, or speaker mode on a cell phone.\n\nWhen flying, it is important for everyone to maintain situational awareness. Communicating the UA's location using clock coordinates is recommended: 12:00 straight ahead of the RPIC, 3:00 to the right, 6:00 behind, and 9:00 to the left.\n\nIf the UA goes out of VLOS for more than 15 seconds, initiate a failsafe return to home.",
        ),
        lesson(
            13,
            "Operational Rules and Limitations",
            "Navigate the core Part 107 operating rules grouped in this section, from registration through speed, altitude, and visibility limits.",
            UNIT1_INDEX,
            [
                lesson(
                    131,
                    "Registration, Inspection, and Falsification",
                    "Explain requirements for aircraft registration, mandatory compliance inspections, and penalties for falsifying records.",
                    "Aircraft Registration: All non-recreational drones must be registered according to 14 CFR Part 47 or Part 48. The registration number must be legibly displayed on the aircraft, and the RPIC must carry proof of registration physically or digitally.\n\nInspection, Testing, and Compliance: Upon request, the RPIC, person controlling the aircraft, or the owner must present a remote pilot certificate with a sUAS rating, photo ID with signature and date of birth, and any documents, records, or reports required under Part 107 to the FAA, NTSB, Federal, State, or local law enforcement, or TSA.\n\nUpon request, the RPIC, visual observer, owner, operator, or person manipulating the controls must allow the FAA to inspect the aircraft and involved personnel, facilities, technical data, and any manufactured small UAS, and to witness any tests necessary to verify Part 107 compliance.\n\nFalsification, Reproduction, or Alteration: Providing false information or fraudulently altering or reproducing required records or reports—including omissions—can result in denial, suspension, or revocation of a certificate or waiver, or civil penalties (fines).",
                ),
                lesson(
                    132,
                    "Accident Reporting and Hazardous Operations",
                    "Summarize rules for mandatory accident reporting, in-flight emergencies, and prohibitions against reckless or hazardous operations.",
                    "Accident Reporting: The RPIC must report an accident to the FAA within 10 days if it results in serious injury to any person or any loss of consciousness, or if it causes damage to property (other than the UAS) in excess of $500 to repair or replace (whichever is lower).\n\nIn-Flight Emergency: In an in-flight emergency requiring immediate action, the RPIC may deviate from any rule in Part 107 to the extent necessary to meet that emergency. Upon request from the Administrator, the RPIC who deviates must send a written report.\n\nHazardous Operations: No person may operate a sUAS in a reckless manner that endangers the life or property of another—for example, continuing to fly in inclement weather or in an area with many buildings, trees, or other structures. No person may allow an object to be dropped from a sUAS in a manner that creates an undue hazard to persons or property.",
                ),
                lesson(
                    133,
                    "Medical Conditions, Alcohol, and Drugs",
                    "Identify physical and mental fitness requirements for crew members, including prohibitions on operating while impaired by medical conditions, alcohol, or drugs.",
                    "Medical Condition: A medical certificate is not required to fly a sUAS or serve on the crew. However, if you know or have reason to believe your condition would interfere with safe operation, you must not fly. Examples include fatigue; medication that affects performance or situational awareness (including over-the-counter antihistamines and decongestants that may cause drowsiness); physical illness (flu, headaches) or mental illness; loss of hearing or voice that prevents communication; blurred vision that prevents satisfying see-and-avoid requirements; or temporary or permanent loss of the ability to control the drone effectively.\n\nAlcohol or Drugs: No person controlling a sUAS or serving as a crew member may have a medical condition that could risk the safety of the operation (for example epilepsy), be under the influence of alcohol, use drugs that affect capabilities, have consumed alcohol within 8 hours of drinking, or have an alcohol concentration of 0.04 or greater. If requested by law enforcement, an individual must submit to a test to indicate alcohol concentration in the blood or breath.",
                ),
                lesson(
                    134,
                    "Operation From Moving Vehicles and Transportation of Property",
                    "State the rules for operating a sUAS from moving vehicles or platforms and the limitations on transporting property for compensation.",
                    "Operation From a Moving Vehicle: When in a moving land or water vehicle, no person may operate a sUA unless the sUA is flown over a sparsely populated area and the operation is not transporting another person's property for compensation or hire. You may not operate a sUA from a moving aircraft.\n\nTransportation of Property: You may transport property under Part 107 if all operations are within one state, occur within a defined operating area, and remain fully compliant with all Part 107 requirements. You may not transport property under Part 107 if the operation is between places in the District of Columbia, crosses state lines, or in certain territories involves passing through international airspace (for example, some transport between Hawaiian islands).",
                ),
                lesson(
                    135,
                    "Visual Line of Sight (VLOS) and Multi-Aircraft Rules",
                    "Define Visual Line of Sight (VLOS) requirements and state the prohibition on controlling more than one unmanned aircraft at a time.",
                    "Visual Line of Sight (VLOS): The RPIC, person manipulating the flight controls, and VO (if used) must be able to see the UA throughout the flight unaided (corrective lenses only) in order to know the aircraft's location; determine its attitude, altitude, and direction of flight; observe the airspace for other traffic or hazards; and determine that the UA does not endanger the life or property of another.\n\nThroughout the entire flight, unaided vision (no binoculars) must be maintained by the RPIC and person manipulating the controls, or by a visual observer.\n\nOperation of Multiple Small Unmanned Aircraft: A person may not manipulate flight controls or act as RPIC or visual observer in the operation of more than one unmanned aircraft at the same time.",
                ),
                lesson(
                    136,
                    "Right-of-Way Rules and Operation Near Aircraft",
                    "Explain the mandatory see-and-avoid requirement and the prohibition against interfering with manned aircraft operations.",
                    "All sUAS must yield the right of way to all aircraft (see and avoid). The sUAS must give way to the aircraft or vehicle and may not pass over, under, or ahead of it unless well clear. No person may operate a sUA in a manner that creates a collision hazard.\n\nTo comply with see-and-avoid, the RPIC must fly the UA so that a manned aircraft pilot never needs to change flight path to avoid collision. The RPIC must know the UA's location and flight path at all times and remain aware of activity in the vicinity to avoid collision with people, property, or manned aircraft.",
                ),
                lesson(
                    140,
                    "Operation Over People — General Rule",
                    "State the baseline prohibition on flight over people and the three exceptions before applying category-specific requirements.",
                    "Except in certain category-based situations described later in this unit, no person may operate a sUA over a human being unless that person is:\n- Directly participating in the operation of the sUA;\n- Located under a covered structure or inside a stationary vehicle that can provide reasonable protection from a falling sUA; or\n- Otherwise covered by the approved category rules for operations over people (Categories 1–4).\n\nThis general rule applies before considering kinetic-energy categories, labeling, and sustained-flight restrictions over crowds or moving vehicles.",
                ),
                lesson(
                    137,
                    "Autonomous Flight and RPIC Responsibility",
                    "Define autonomous flight under Part 107 and explain the RPIC's continued responsibility and ability to take control during programmed missions.",
                    "Autonomous flight means the drone can fly parts of its mission on its own using pre-programmed instructions—for example a set route or automatic return to home if signal is lost. Under Part 107, autonomous does not mean the drone is on its own: the RPIC remains fully responsible at all times.\n\nWhen performing autonomous operations, the RPIC must have the ability to direct the sUA to ensure compliance with Part 107. If the control link is lost, the aircraft may continue a programmed mission or return to home. During autonomous flight, the RPIC must be able to command the aircraft to change route, altitude, or land—manually or through automation commands.",
                ),
                lesson(
                    138,
                    "Preflight Familiarization and Airspace Operations",
                    "Outline preflight assessment requirements and restrictions on operating in controlled, prohibited, and restricted airspace.",
                    "Preflight Familiarization, Inspection, and Actions: Before flight, the RPIC must review the operating environment and assess hazards affecting persons or property on the surface or in the air, including local weather; local airspace and flight restrictions; location of persons and property on the surface; and other ground hazards.\n\nThe RPIC must ensure all persons directly participating are informed about operating conditions, emergency procedures, contingency procedures, roles and responsibilities, and potential hazards. The RPIC must ensure control links work, sufficient power exists for the intended flight, and any object attached or carried is secure and does not adversely affect flight characteristics or controllability. Before flight, the RPIC must verify the drone meets an approved category (1–4) when required and that documentation (certificate, registration, airworthiness certificate, waiver if needed) is available.\n\nOperation in Certain Airspace: Operations in Class B, C, or D airspace or within the lateral boundaries of the surface area of Class E airspace designated for an airport are prohibited unless prior authorization is obtained. A small drone must not interfere with manned aircraft traffic patterns or operations at any airport, heliport, or seaplane base—including causing manned aircraft to alter flight path or delay takeoff or landing. Operations in prohibited or restricted areas require authorization from the using or controlling agency. A NOTAM may establish a Temporary Flight Restriction (TFR) identifying the affected area and the hazard or condition.",
                ),
                lesson(
                    139,
                    "Operating Limitations",
                    "State specific performance limitations for sUAS regarding speed, altitude, cloud clearance, and minimum visibility.",
                    "When operating a sUAS under Part 107:\n- Groundspeed may not exceed 87 knots (100 miles per hour).\n- Altitude may not exceed 400 feet above ground level (AGL), unless the sUA is flown within a 400-foot radius of a structure and does not fly higher than 400 feet above the structure's immediate uppermost limit.\n- Minimum flight visibility from the control station must be at least 3 statute miles (the average distance at which major unlit objects can be seen by day and major lighted objects by night).\n- Minimum cloud clearance: at least 500 feet below the cloud and 2,000 feet horizontally from the cloud.\n\nThese restrictions may be waived if the operator demonstrates the operation can be conducted safely under a Certificate of Waiver.",
                ),
            ],
        ),
        lesson(
            14,
            "Waivers and Airspace Authorization",
            "Explain Certificate of Waiver requirements, which Part 107 rules may be waived, processing timelines, and how to obtain controlled-airspace authorization.",
            "A waiver is special permission from the FAA that allows deviation from certain Part 107 rules only if the FAA believes the operation will still be safe. The FAA may issue a Certificate of Waiver (CoW) when you demonstrate the planned flight can be conducted safely.\n\nWaiver Application Requirements: A request must contain a complete description of the proposed operation and a justification establishing that the operation can safely be conducted under the waiver terms. Explain how safety will be maintained using equipment, technology, and/or other strategies. Even if approved, the FAA may add conditions or limits. Failing to follow every condition and limitation makes the operation illegal.\n\nRules That May Be Waived: A CoW may be issued for operation from a moving vehicle or aircraft (no waiver will be issued to allow carriage of another person's property for compensation or hire by aircraft); visual observer requirements; visual line of sight aircraft operation (same compensation/hire limitation); daylight operations; anti-collision lights required for night and civil twilight; operation of multiple small unmanned aircraft; yielding the right of way; operation over people; operation in certain airspace; and operating limitations for small unmanned aircraft.\n\nApplication Process: Use the FAA waiver portal at https://aviationsafetyportal.faa.gov/. Submit at least 60 days before the proposed operation date. Requests submitted with less notice may not be processed in time and could be cancelled or denied. Your lateness may result in the inability to conduct proposed operations on your planned dates. Actual processing time varies depending on complexity and completeness of the application—complete the application as soon as you know your date. Airspace authorizations are generally processed faster than airspace waivers and on a first-come, first-served basis.\n\nEmergencies: The FAA offers Special Governmental Interest (SGI) waivers for public safety, first responders, and critical organizations.\n\nAirspace Authorization: Operations in controlled airspace require authorization. Part 107 remote pilots must use FAA DroneZone or a Low Altitude Authorization and Notification Capability (LAANC) provider. Do not contact ATC directly by radio or phone for drone authorization. ATC's primary role is keeping aircraft safe, supporting smooth traffic flow, and supporting national security and defense when needed.",
        ),
        lesson(
            15,
            "Remote ID Requirements",
            "Summarize the Remote ID rule timeline, registration scope, and the three compliance paths (Standard UA, broadcast module, FRIA).",
            "In April 2021 the FAA introduced rules for Remote ID, operations over people and moving objects, and night operations under certain conditions. Remote ID became mandatory as of September 16, 2023 (except as stated in 14 CFR Part 89).\n\nNo person may operate a UA in the United States unless the operation meets Remote ID requirements. Remote ID is like a digital license plate broadcasting identity, location, altitude, and velocity so authorities and the public can see who is flying and whether the operation appears safe.\n\nAll drones require registration—including those flown for recreation, business, or public safety, including aircraft weighing less than 0.55 lbs.\n\nThere are three ways to meet identification requirements: Standard Remote ID UA, UA with a Remote ID broadcast module, or operation within an FAA-Recognized Identification Area (FRIA). The lessons below cover each path.",
            [
                lesson(
                    151,
                    "Standard Remote ID",
                    "Describe built-in Standard Remote ID requirements, broadcast content, and performance limits.",
                    "A Standard Remote ID unmanned aircraft is produced with built-in FAA Remote ID broadcast capability from takeoff to shutdown. New products must meet all Standard Remote ID requirements.\n\nThe drone serial number must match an FAA-accepted Declaration of Compliance and be linked to FAA registration before operation. The aircraft must self-test and must not take off if Remote ID is not functional. Remote ID must remain fully functional for the entire flight; land immediately if broadcasting fails.\n\nRemote ID equipment must not be modified, blocked, or disabled. The aircraft must broadcast required information continuously over unlicensed radio frequency spectrum and be designed to maximize broadcast range. Standard Remote ID operations are limited to VLOS.\n\nRemote ID is available to personal wireless devices in range using Bluetooth or Wi-Fi-type signals. The FAA and law enforcement may request access when needed.\n\nRequired broadcast elements include: Remote ID serial number; location and altitude; velocity; control station location and elevation; time mark; and emergency status.",
                ),
                lesson(
                    152,
                    "Remote ID Broadcast Module",
                    "Explain retrofit broadcast modules, registration linkage, and broadcast content differences from Standard Remote ID.",
                    "A broadcast module is a device produced to meet FAA requirements that broadcasts identification and location information for the drone and takeoff location. It can be added to retrofit a drone with Remote ID capability.\n\nThe module serial number must be included in the UA registration. The UA or module must be fully functional from takeoff to shutdown, must self-test, and must not take off if Remote ID is not functional. Land immediately if broadcasting fails. The pilot must maintain VLOS throughout the flight when using a broadcast module.\n\nFrom takeoff to shutdown the module broadcasts via radio frequency (Wi-Fi and Bluetooth) with range comparable to Standard Remote ID: drone ID (serial number), location and altitude, velocity, takeoff location and elevation, and time mark.",
                ),
                lesson(
                    153,
                    "FRIA and Alternative Remote Identification",
                    "Explain where Remote ID broadcast is not required, FRIA eligibility and renewal, and limited alternative compliance paths.",
                    "FAA-Recognized Identification Areas (FRIA) are geographic areas where drones may operate without broadcasting Remote ID. FRIAs are the only locations where routine operations may occur without broadcast. Both the drone and pilot must remain within the FRIA boundaries and within VLOS throughout the flight.\n\nOnly FAA-recognized Community Based Organizations (CBOs) and educational institutions (primary and secondary schools, trade schools, colleges, and universities) may request a FRIA. A FRIA is effective for 48 calendar months after FAA approval. Renewal requests must be submitted no later than 120 days before expiration. The FAA may terminate a FRIA if the application contained false information or if the area poses a risk to aviation, public safety, homeland security, or national security.\n\nAlternative Remote Identification: The Administrator may authorize operations without Remote ID for aeronautical research or to demonstrate compliance with regulations. ADS-B Out equipment cannot be used to comply with Remote ID requirements. A foreign-registered drone with Remote ID may not be flown in the United States unless a Notice of Identification is submitted to the FAA.",
                ),
            ],
        ),
        lesson(
            16,
            "Flying Over People and Moving Objects",
            "Explain how the April 2021 rule change enables routine over-people and over-vehicle operations when category and documentation requirements are met.",
            "On April 21, 2021, Part 107 was amended to permit operations over people, moving vehicles, and at night under certain conditions, eliminating the need for waivers for many typical operations.\n\nManufacturers demonstrate airworthiness for category operations through Means of Compliance (MoC) and Declaration of Compliance (DoC). Category-specific eligibility, sustained flight over crowds, and operations over moving vehicles are covered in the lessons below.",
            [
                lesson(
                    161,
                    "Means of Compliance and Declaration of Compliance",
                    "Distinguish MoC and DoC for operations over people and explain manufacturer and RPIC verification responsibilities.",
                    "Means of Compliance (MoC) is the FAA-approved method a manufacturer uses to show that a small unmanned aircraft meets safety requirements for operations over people under Part 107—including limits on exposed rotating parts, impact kinetic energy, and safety defects. There are three types: FAA-provided MoC, FAA-accepted or FAA-approved MoC submitted to the FAA, and custom MoC developed by applicants and approved if they demonstrate compliance.\n\nDeclaration of Compliance (DoC): The submitter must have proof the aircraft or broadcast module meets an FAA-accepted MoC; maintain a process to notify the public and FAA about unsafe conditions that make the aircraft non-compliant; allow FAA inspections, facility access, and records access; and confirm the aircraft has no safety defects. Records directly related to the DoC must be kept for two years (longer for custom MoC while the MoC remains accepted).\n\nThe RPIC is responsible for verifying category eligibility, labeling, and documentation before flight over people.",
                ),
                lesson(
                    162,
                    "Categories 1 and 2",
                    "Compare Category 1 and Category 2 aircraft eligibility for operations over people.",
                    "Category 1 UA:\n- Weigh 0.55 lbs (250 g) or less at takeoff, including everything attached.\n- Have no exposed rotating parts that could lacerate human skin.\n- No Declaration of Compliance (DoC) or Means of Compliance (MoC) is required.\n\nCategory 2 UA:\n- Must not cause injury exceeding 11 ft-lb of kinetic energy.\n- Must have no exposed rotating parts that could lacerate human skin and no safety defects.\n- Must be listed on an FAA-accepted DoC and MoC.\n- Must display Category 2 eligibility labeling and include manufacturer instructions.\n\nThe RPIC must verify these requirements before operating over people under Category 1 or 2.",
                ),
                lesson(
                    163,
                    "Categories 3 and 4, Sustained Flight, and Crowds",
                    "Apply Category 3 and 4 requirements and restrictions on sustained flight over open-air assemblies.",
                    "Category 3 UA:\n- Must not cause injury exceeding 25 ft-lb of kinetic energy.\n- Must have no exposed rotating parts that could lacerate human skin and no safety defects.\n- Requires FAA-accepted MoC and DoC, Category 3 labeling, and manufacturer instructions.\n- Cannot fly over crowds or open-air assemblies unless inside a closed or restricted-access area where everyone is on notice that a drone may fly overhead, or unless the operation avoids sustained flight over non-participants (hovering, circling, or remaining above the same people). Operation over a person inside a vehicle or under a covered structure that provides protection is acceptable.\n\nCategory 4 UA:\n- Must have an FAA airworthiness certificate issued under Part 21.\n- Must be operated within approved Flight Manual limitations that do not prohibit flight over people.\n- Requires maintenance, inspection, and recordkeeping per the approved data.\n\nSustained flight means hovering, circling, or repeatedly flying over the same group of people. An open-air assembly is generally a crowd of about 15–20 people gathered closely together.\n\nCategories 1, 2, or 4: You may not conduct sustained flight over an open-air assembly unless the aircraft is broadcasting Remote ID (Standard Remote ID or broadcast module).",
                ),
                lesson(
                    164,
                    "Operation Over Moving Vehicles",
                    "State when flight over people inside moving vehicles is permitted for each category.",
                    "Categories 1, 2, and 3: You may operate over a person inside a moving vehicle only if the UA remains within or over a closed- or restricted-access site, everyone inside moving vehicles at that site is on notice that a sUA may fly over them, and you do not maintain sustained flight over moving vehicles (brief transit only—no hovering, circling, or back-and-forth passes).\n\nCategory 4: The sUA must hold a Part 21 airworthiness certificate and be operated per the Flight Manual; operating limitations must not prohibit operations over human beings inside moving vehicles.",
                ),
            ],
        ),
        lesson(
            17,
            "Flying At Night Under Certain Conditions",
            "Explain when night operations are permitted without a waiver and how civil twilight lighting rules relate to anti-collision lighting.",
            "Night and civil twilight operations are allowed under Part 107 without a waiver when training and lighting requirements are met. Eligibility, civil twilight definitions, and manned-aircraft lighting recognition are covered in the first lesson below; hazards and mitigation strategies are in the second.",
            [
                lesson(
                    171,
                    "Night Eligibility, Civil Twilight, and Lighting",
                    "Identify knowledge-test and recurrent training requirements, civil twilight operating rules, and anti-collision lighting standards for night flight.",
                    "As of April 21, 2021, night operations without a waiver are allowed when:\n1) The RPIC has completed an initial knowledge test or recurrent training on or after April 6, 2021 (including the free online recurrent course at www.faasafety.gov); and\n2) The sUA has anti-collision lighting visible for at least 3 statute miles with a flash rate sufficient to avoid collision. The RPIC may dim lights if brightness would reduce safety, but lights must not be turned off under any circumstances.\n\nYou may not fly during civil twilight unless anti-collision lights meeting the above standard are on and remain on throughout the operation.\n\nCivil twilight is the period between the end of evening civil twilight and the beginning of morning civil twilight. Morning civil twilight begins 30 minutes before official sunrise and ends at official sunrise. Evening civil twilight begins at official sunset and ends 30 minutes after official sunset. In Alaska, civil twilight is determined using the Air Almanac.\n\nUnderstanding how vision works in low light supports safe night operations. Pilots use aircraft lighting to indicate direction and position: red on the left wing, green on the right wing, and white at the tail. Recognizing these lights helps you judge manned aircraft movement and maintain situational awareness near airports.\n\nNight operations still require VLOS. Controlled airspace still requires authorization. All rules for flight over people still apply when flying at night.",
                ),
                lesson(
                    172,
                    "Night Flight Hazards and Mitigation",
                    "Apply practical strategies to manage reduced visibility, depth perception, orientation, and battery effects during night sUAS operations.",
                    "Flying at night introduces hazards that may be absent or less noticeable during the day. You may struggle to see the drone, its orientation, obstacles, wildlife, and other aircraft. Depth perception decreases. Additional ground lighting may be needed.\n\nLighting and vision challenges:\n- Avoid looking directly at bright lights.\n- Use required anti-collision lights; prefer high-intensity strobe-style lights in cluttered lighting environments.\n- Check ground lighting and add extra lighting near the landing area.\n- Shift gaze 5–10° off center to reduce the night blind spot.\n- Fly closer and lower than in daytime; reconnoiter the site during daylight before the operation.\n\nVLOS challenges: Use multiple visual observers or VOs trained on night procedures; keep the aircraft lit and within VLOS.\n\nDepth perception and situational awareness: Reduce speed; increase standoff distances; keep the aircraft within a shorter radius.\n\nCircadian rhythm and fatigue: Avoid exhaustion and hypoglycemia.\n\nCold-night battery effects: Start with warmed batteries; reduce aggressive maneuvers; shorten flights; monitor battery more frequently.\n\nLoss of orientation: Use bright position lighting (different colors on different arms); fly predictable patterns; avoid unnecessary rotation; land immediately if orientation is lost.",
                ),
            ],
        ),
    ]


def main() -> None:
    data = json.loads(COURSE_PATH.read_text(encoding="utf-8"))
    unit1 = data["units"][0]
    unit1["text_content"] = (
        "Part 107 governs civil small unmanned aircraft (under 55 pounds) in the NAS. "
        "This unit covers applicability, crew roles, operating rules, waivers, Remote ID, "
        "operations over people and moving objects, and night operations."
    )
    unit1["sub_units"] = build_unit1_sub_units()
    COURSE_PATH.write_text(
        json.dumps(data, indent=4, ensure_ascii=False) + "\n",
        encoding="utf-8",
    )
    print(f"Rebuilt Unit 1 with {len(unit1['sub_units'])} top-level lessons")


if __name__ == "__main__":
    main()
