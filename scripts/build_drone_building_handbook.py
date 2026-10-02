#!/usr/bin/env python3
"""Build the drone-building course handbook for Google Drive.

Consolidates the three canonical markdown sources into one shareable document:

  assets/courses/drone-building/outlines/drone-building-course-outline-v3.md  (curriculum)
  assets/courses/drone-building/reference/build-steps-joe-v1.md               (build steps)
  assets/courses/drone-building/reference/parts-list-draft-v4.md              (parts)

Drive edition rules (asked for Sep 23 2026):
  * outline section 2 "Locked decisions" is excluded
  * outline section 4 "Non-negotiable gates" is excluded, and the word "gate" is
    dropped from the tree / unit / assessment wording (the underlying safety
    requirements stay -- only the gate framing goes)
  * outline section 1 "Terms" moves to the reference part at the end

The markdown files stay canonical. Re-run this after folding a new outline or
parts version, then re-upload (or let the Drive step-7 publish carry it):

  python3 scripts/build_drone_building_handbook.py
  rclone copy assets/courses/drone-building/outlines \\
    gdrive:courses/drone-building/outlines --include '*.docx' --include '*.txt'

Outputs .docx (Drive converts it to a Google Doc with real headings and tables)
and a .txt twin for anything that cannot take .docx.
"""

from __future__ import annotations

import re
import sys
from pathlib import Path

REPO = Path(__file__).resolve().parent.parent
OUT_DIR = REPO / "assets" / "courses" / "drone-building" / "outlines"
STEM = "drone-building-course-handbook-v3.4"

TITLE = "Drone Building Course"
SUBTITLE = "Curriculum, build procedure and parts — Drive edition"
BYLINE = (
    "Outline v3.4 (Sep 12 2026) · parts list v4 (Sep 12 2026) · "
    "build procedure v1 (Joe, Sep 12 2026, transcribed Sep 17) · "
    "215 mm frame study (Sep 18 2026). Compiled Sep 23 2026."
)

# --------------------------------------------------------------------------
# Document content. ("kind", payload) pairs. Inline **bold** is honoured.
#   h1/h2/h3  heading
#   p         paragraph
#   note      italic paragraph (editorial framing, not course content)
#   bullets   list of strings
#   numbers   numbered list of strings
#   table     (caption_or_None, [header cells], [[row cells], ...])
#   quote     block quote
#   rule      horizontal break
# --------------------------------------------------------------------------

CONTENT: list[tuple] = [

("note", "This is a reading copy for the author, the hardware lead and the classroom "
         "pilot. The markdown files in the repo stay canonical — edit those, then "
         "regenerate this document. Nothing here is published course content yet: there "
         "is no course payload, no question bank, no images and no catalog entry, and "
         "Part 107 remains the priority ahead of it."),

("h1", "Part 1 — Curriculum"),

("p", "Eight units, **33–38 sessions**, written as the school edition. A compact edition "
      "would shrink only Units 5 and 8. Each unit has a session count, a written safety "
      "brief, lesson stems with leaves under them, labs or clips, and a closing assessment "
      "or checkpoint."),

("p", "**Order:** 1 Safety → 2 Components → 3 Laws → 4 Physics → 5 Design → "
      "6 Assembly → 7 Software → 8 Testing. Physics sits directly before Design on "
      "purpose — students budget weight and pick materials before they draw a frame."),

("h2", "1.1 Course at a glance"),
("table", (None,
  ["#", "Unit", "Sessions", "Type", "Assessment"],
  [["1", "Safety", "2", "Lecture + demo", "Signed shop cert"],
   ["2", "Function of components", "3", "Lecture + parts lab", "Quiz (photo ID, 8–10)"],
   ["3", "Laws for the custom drone", "1", "Lecture", "Quiz"],
   ["4", "Physics for builders", "5–6", "Lecture + 3 hands-on", "Quiz + AUW worksheet"],
   ["5", "Frame design", "5–10 (Tier B) / 2–3 (Tier A)", "CAD lab",
    "Checkpoints; critique rubric; weigh-in"],
   ["6", "Assembly", "3–4 (+1 Video)", "Bench lab",
    "Photo checkpoints; smoke-stopper power-on"],
   ["7", "Software setup", "3", "Config lab", "Failsafe demonstrated props-off"],
   ["8", "Testing and flight", "10", "Bench + flight lab",
    "Bench checklist → maiden rubric (bulk of the grade)"]])),

("h2", "1.2 Units"),

("h3", "Unit 1 — Safety (2 sessions)"),
("p", "**Session 1 — Materials and tools**"),
("bullets", [
  "LiPo / **LiHV**: handling, charging in a bag, storage voltage, puffing, heat, fire can, "
  "never unattended, disposal. **Charger mode is LiHV** for the Explorer pack (4.35 V/cell "
  "full, not LiPo's 4.2 V); radios and goggles charge on the same routine. The Remote ID "
  "module is powered by the flight controller and has no battery of its own.",
  "Tools and PPE: iron temperature, tip care, fume extraction, eye protection, hot-work zone.",
  "Incident procedure: burn, cut, runaway motor, puffed or hot pack."]),
("p", "**Session 2 — Bench rules (demo)**"),
("bullets", [
  "Props off until the Unit 8 bench; where props live in the meantime.",
  "Smoke stopper on every first power-on.",
  "Arming discipline; arm / disarm / failsafe / unplug vocabulary.",
  "Sign the shop cert — signed before Unit 6 begins."]),
("p", "Teacher assets: cert checklist; a written safety brief opening each of Units 2–8."),

("h3", "Unit 2 — Function of components (3 sessions)"),
("p", "**Stem A — Power train:** frame (printed vs carbon fiber) · motors (KV, size; "
      "1404 4500KV on 3S as the worked example) · props (3.5\", pitch, direction, "
      "T-mount) · battery (cells, capacity, C, **LiHV vs LiPo**, XT30) · ESC "
      "(4-in-1 stack vs AIO vs separate; BL32/AM32)."),
("p", "**Stem B — Brain and radio:** flight controller (gyro, accel, baro, OSD chip) · "
      "receiver and protocol (ELRS; XR2 Nano on castellated pads, then a plug at the FC) · "
      "telemetry to the radio · **BeeID: GPS and Remote ID in one module** — what each "
      "half does and why it is one per aircraft · connectors and polarity (XT30, SH1.0 "
      "plugs, ribbon, motor pads) · capacitor on the battery lead · antenna basics "
      "(XR2 ceramic tower, no T-antenna)."),
("p", "**Stem C — Video kit parts:** DJI O4 Air Unit (camera, digital video link and "
      "onboard recording in one part) · goggles · optional compass module. "
      "*Tagged Video kit.*"),
("p", "**Lab:** parts identification on the real kit; a kit BOM handout carrying all-up weight "
      "and the solder-joint count. **Quiz:** 8–10 photo items."),

("h3", "Unit 3 — Laws for the custom drone (1 session)"),
("bullets", [
  "Why this class flies under **Part 107** and what a Remote Pilot in Command is. The "
  "recreational path exists but is not ours — one sentence.",
  "**Registration:** every aircraft, regardless of weight, registered separately in "
  "FAADroneZone; the fee; marking the aircraft.",
  "**Remote ID:** what it broadcasts; a broadcast module on a homebuilt; one BeeID per "
  "aircraft with its serial (read from the module's setup page) listed on that aircraft's "
  "registration; the module must be on the FAA accepted list (BeeID: DOC RID000001995); it "
  "only broadcasts while the aircraft is powered.",
  "**Visual line of sight and goggles:** whoever flies in FPV goggles cannot see the aircraft "
  "unaided, so a **visual observer is required for every FPV flight** (107.31 / 107.33). "
  "Line-of-sight Angle-mode flying needs nobody beyond the RPIC.",
  "**Night and visibility:** anti-collision lighting for dusk or night flight.",
  "**Site brief:** airspace check, no flight over people, bystanders — short, linking to "
  "the Part 107 course.",
  "**Do not fly at home** until the aircraft is registered and Remote ID equipped.",
  "Quiz. The registration and Remote ID *actions* happen in Unit 7, once the aircraft exists."]),
("p", "Source: the Part 107 course's registration and Remote ID leaves, cut to builder scope. "
      "Link the FAA pages and re-check them at authoring time."),

("h3", "Unit 4 — Physics for builders (5–6 sessions)"),
("p", "**Session 1 — Weather review and part placement**"),
("bullets", [
  "Weather: a review leaf for Part 107 graduates, an expanded leaf for everyone else.",
  "Placement: center of gravity and battery position; cable management; receiver and antenna "
  "placement; what carbon fiber does to signals."]),
("p", "**Session 2 — Materials science**"),
("bullets", [
  "Stress vs strain; stiffness vs strength; fatigue from vibration and crashes.",
  "Printed plastics — PLA / PETG / ABS-ASA / nylon / TPU: density, glass transition, "
  "toughness, printability. Why PETG is the class default, and why a PLA frame that flies "
  "can still fail in a hot car. Layer adhesion; print orientation as a strength decision.",
  "Carbon fiber: stiff, light, conductive, dusty when cut.",
  "Hands-on: break a printed test bar in two orientations; weigh identical bars in two "
  "materials."]),
("p", "**Session 3 — Heat transfer**"),
("bullets", [
  "Heat sources: I²R in motors, ESC FETs, wires, bad joints.",
  "Heat paths: conduction into the plate, convection from prop wash (why ESCs sit under "
  "props); radiation negligible.",
  "Consequences: motor demagnetization, ESC throttling, a hot pack after flight; iron thermal "
  "mass and dwell when soldering.",
  "Hands-on: infrared thermometer log after a bench spin (repeated in Unit 8)."]),
("p", "**Sessions 4–5 — Drone power and battery mechanics**"),
("bullets", [
  "Thrust-to-weight and hover current read off a real motor chart; matching KV, prop and cell "
  "count.",
  "Battery mechanics: cell voltage window, series cells, capacity vs C vs internal resistance, "
  "sag, energy vs power density, temperature, care. LiPo vs Li-ion as a use-case choice, and "
  "one line that other chemistries exist. No electrochemistry — optional teacher note for "
  "a chemistry class.",
  "Hands-on: pack voltage before and after a bench run → watt-hours used."]),
("p", "**Session 6 — Quiz and all-up-weight worksheet.** Students budget their own design."),

("h3", "Unit 5 — Frame design (Tier B 5–10 sessions / Tier A 2–3)"),
("p", "**CAD fundamentals (2 sessions, Tier B; optional for Tier A):** sketch and constraints "
      "· extrude and cut · hole patterns · fillets · a two-part assembly "
      "· calipers on a real part · export STL. Onshape is the default (free education "
      "plan, browser-based); Fusion, Tinkercad or a school license are acceptable. No school "
      "buys CAD software."),
("p", "**Design brief — the measured constraints:**"),
("bullets", [
  "Motor mount **12 × 12 mm, 4× M2** (XILO 1404, T-mount props, 150 mm leads).",
  "Stack pattern **20 × 20 mm M2, at least 16 mm clear height** (the matched stack is "
  "~15.7 mm assembled).",
  "3.5\" prop and guard clearance.",
  "Battery envelope **58 × 24.5 × 23.5 mm, XT30, ~66 g** (Flywoo Explorer 1000 3S "
  "LiHV).",
  "**BeeID pocket 22 × 16 × 8 mm** on the top plate with a clear view of the sky.",
  "XR2 keep-out — the ceramic tower antenna must not sit under carbon.",
  "All-up-weight budget carried over from Unit 4.",
  "**Students may print the entire frame** — arms, plates, guards, tray. Only bolts, nuts "
  "and standoffs are bought.",
  "Material per the frame-material decision: PLA for prototypes, PETG for the final print."]),
("p", "**Material profiles:** one slicer-settings table (nozzle, bed, enclosure, shrinkage %, "
      "walls, infill) with a row per material. The stock frame and student frames carry "
      "`arm_thickness` and `hole_clearance` variables set from that row."),
("p", "**Tier B (Base kit):** design the whole printed frame from measured components; critique "
      "every 2–3 sessions against the rubric (fit, strength, weight, serviceability); "
      "weigh-in checkpoint; STL turn-in."),
("p", "**Tier A (Video kit, or a school short on time):** design or modify prop guards, an O4 "
      "camera cage, an antenna mount, a battery tray and a Remote ID module mount on the stock "
      "carbon frame."),
("p", "**Schools that cannot print:** our stock-frame STL, pre-printed and shipped with the Base "
      "kit; a print-and-ship batch at the end of the unit; a makerspace as fallback."),
("p", "**Grading:** completion checkpoints, plus an optional class vote for extra credit. No FEA "
      "in the student work."),

("h3", "Unit 6 — Assembly (3–4 sessions; +1 for Video)"),
("p", "Opens with the safety brief and a live soldering demo for the Solder SKU. The "
      "Pre-soldered SKU skips the soldering in steps 1–2 and receives the ESC and motor "
      "harness already assembled."),
("note", "Order below follows the outline. Joe's bench build (Part 2) reorders the first two "
         "steps — solder the ESC loose, then mount it — and that order is the one to "
         "teach. Fold it in when the outline is next revised."),
("numbers", [
  "**ESC to frame** (20 × 20 stack), capacitor and **XT30** pigtail soldered — "
  "*step clip*.",
  "**Motors to frame**, leads to the ESC pads; note rotation direction; no props — "
  "*step clip*.",
  "**FC onto the stack**, FC↔ESC 8-pin ribbon (a plug) — *step clip*.",
  "**Receiver:** solder the four XR2 CRSF leads, plug into the RX socket (UART2). **BeeID** on "
  "the GPS socket (UART5), seated in its pocket with sky view, clear of the XR2 tower — "
  "*step clip*.",
  "**Continuity and polarity check** with a multimeter, then **smoke-stopper first power-on**; "
  "confirm the BeeID and receiver LEDs — *step clip*.",
  "**Video kit:** O4 Air Unit on the DJI socket (UART3); camera in its plates; optional compass "
  "module (adds a session) — *step clip*.",
  "Closeout: strain relief, nylon standoffs, a zip-tie plan, photo checkpoint."]),
("p", "**Rules:** no props, and no motor spin until the failsafe has been demonstrated in Unit 7. "
      "An optional controller bind fits here if the FC arrives pre-flashed."),

("h3", "Unit 7 — Software setup (3 sessions)"),
("p", "Betaflight. Screenshots are taken on 2026.6; the text says \"2025.12 or newer\". Target "
      "`FLYWOOF722PROV2`."),
("p", "**Session 1 — Flash and sensors:** install Configurator · flash "
      "`FLYWOOF722PROV2` (not the older PRO target — the barometer goes missing) · "
      "accelerometer calibration · barometer check · **GPS on UART5 at 115200**, "
      "satellite count · battery voltage scale · low-voltage warnings over **ELRS "
      "telemetry to the radio and the beeper** (the Base kit has no camera, so there is no "
      "on-screen OSD; the Video kit sees OSD in the goggles) · save a settings dump from "
      "the CLI as a backup — *step clips*."),
("p", "**Session 2 — Radio and safety:** transmitter grips off and cells in before anything "
      "else — a dead radio at bind time burns the session · ELRS bind (binding "
      "phrase; receiver on UART2) · telemetry · **motor direction and order** in the "
      "motors tab, props off · arm switch · beeper switch · **failsafe set and "
      "demonstrated props-off — required before any motor spin** · GPS Rescue "
      "configured as a safety net, not a flight mode — *step clips*."),
("p", "**Session 3 — First-flight modes and registration:** Angle mode as the first-flight "
      "mode · a conservative throttle curve · (*Video kit with a compass only*) "
      "Position Hold · then the **BeeID setup page: enter aircraft weight, read the "
      "serial, register the aircraft and list that serial** in FAADroneZone. The teacher may "
      "distribute a settings backup if time is short."),

("h3", "Unit 8 — Testing and flight (10 sessions)"),
("p", "**Bench checks** — props off first, then restrained props: smoke stopper → "
      "arm / disarm → motor spin and direction → failsafe demonstration → radio "
      "range walk → BeeID broadcasting (LED, optionally a Drone Scanner app) and GPS lock "
      "→ **props fitted here**, in a fixture or with a spotter → temperature log "
      "(carried over from Unit 4). The bench checklist is signed before an aircraft joins the "
      "flight queue."),
("p", "**Maiden protocol:** RPIC present · Angle mode · line of sight, no goggles "
      "· hover only · stated abort criteria · spotter · netted cage or "
      "tether option · short flights · a failure sends the aircraft to the back of "
      "the queue."),
("p", "**FPV flights (Video kit, after the maiden):** pilot in goggles · a **visual "
      "observer assigned and named on the checklist** · the class watches the goggles' "
      "phone mirror on the room display."),
("p", "**Post-flight:** screws, motor heat, joints, pack temperature, guard damage → a "
      "debrief leaf on what the failure taught → a CAD or software iteration."),
("p", "**Ops:** flights are limited by how many RPICs are present; students do software mods "
      "while others fly; dedicated physical-modification days; stock frames on standby."),
("p", "**Grading:** the bench checklist and maiden rubric are the bulk of the course grade. "
      "Optional speed or lift contests."),

("h2", "1.3 Assessments"),
("table", (None,
  ["When", "Form", "Notes"],
  [["Unit 1", "Signed shop cert", "Signed before Unit 6"],
   ["Unit 2", "Photo ID quiz", "8–10 items on the real kit"],
   ["Unit 3", "Regulations quiz", "Builder-scoped items from the Part 107 course, re-tagged"],
   ["Unit 4", "Physics quiz + AUW worksheet", "Charts allowed"],
   ["Unit 5", "Checkpoints + critique rubric + weigh-in", "Completion grade"],
   ["Unit 6", "Photo checkpoints + smoke-stopper power-on", "Completion and safety"],
   ["Unit 7", "Failsafe demonstration + switch map", "Props off"],
   ["Unit 8", "Bench checklist → maiden rubric", "Largest single grade"]])),
("p", "No question bank exists yet for this course."),

("h2", "1.4 Kits"),
("p", "Reference configurations, not sales SKUs. Full parts, weights and costs are in Part 3."),
("table", (None,
  ["", "Base", "Video"],
  [["Frame",
    "**Student-printed whole frame** (PLA prototype, PETG final) plus a hardware pack and "
    "strap; our stock-frame STL as the fallback",
    "Stock carbon frame plus printed guards. **Parked** — the Tony 5 is a 5\" frame, not "
    "this BOM"],
   ["FC / ESC", "Flywoo GOKU F722 Mini V2 20 × 20 45 A stack (baro, OSD, plug sockets, "
    "matched G45M ESC)", "Same"],
   ["Receiver", "RadioMaster XR2 Nano on the RX socket (4 solder joints at the receiver)",
    "Same"],
   ["GPS + Remote ID", "NewBeeDrone BeeID, one per aircraft, on the GPS socket",
    "Same; optional BeeID Pro / compass"],
   ["Motors / props / battery",
    "4× XILO 1404 4500KV · Gemfan 3525 · Flywoo Explorer 1000 mAh 3S LiHV "
    "XT30UP (2 packs)", "Same"],
   ["Video", "—",
    "DJI O4 Air Unit on the DJI socket; optional longer 90–90 coax; a shared class "
    "goggles set — N3 default ($230), Goggles 3 for the RPIC"],
   ["Solder joints", "**16 on the ESC + 4 at the XR2** (Solder SKU); **0 for students** "
    "(Pre-soldered SKU)", "Same; O4 none; BeeID none"],
   ["All-up weight", "~220 g *(to be weighed)*", "~235–245 g *(to be weighed)*"],
   ["Per-aircraft cost, list", "~$275", "~$465"],
   ["CAD tier", "B — design the whole printed frame", "A — printed parts on a stock frame"],
   ["Hand-off", "—", "Feeds the Video & Photography course"]])),

("h2", "1.5 What is drafted, and what is next"),
("p", "The outline is complete and locked at v3.4. **No lesson text has been written yet** — "
      "no unit drafts, no question bank, no images, no video."),
("p", "**Ready to draft now, needing nothing from hardware:** Unit 1 (adding the LiHV charging "
      "leaf), Unit 3, Unit 4, Unit 8, the Unit 2 text (all parts are named), CAD fundamentals, "
      "the Unit 5 design brief (battery tray dimensions and the matched stack are both "
      "settled), the Unit 6 step list for both SKUs, and the Unit 7 leaves against the F722 "
      "Mini V2 stack."),
("p", "**Waiting on hardware:** Unit 2 component photos and quiz images, Unit 7 Configurator "
      "screenshots on the real flight controller, the hardware-pack photo, and the weigh-in. "
      "The Video-kit frame is parked and does not block any of this."),
("p", "**Still to design:** the material-profiles table and the two frame variables; the fleet "
      "registration workflow for Unit 3 (one Part 107 account, one entry per aircraft with its "
      "BeeID serial); the visual-observer line on the Unit 8 FPV checklist; the print-and-ship "
      "service; how several short step clips per leaf get rendered when the course UI holds one "
      "video per node; the expanded weather leaf for students who have not taken Part 107; "
      "45-minute teacher scripts for the school edition; and a per-unit draft template so the "
      "eight drafts land in the same shape."),
("p", "**Open questions of scope:** the Pre-soldered SKU (confirm roughly 25 minutes per kit "
      "against Joe's real build time, write the QA procedure, price it inside +$25–40); the "
      "classroom soldering-lab kit list as a sales qualification question; and whether a second "
      "course, \"Drone Repair and Custom Builds\", is worth pursuing — a proposal only, to "
      "be decided after this course sells."),

("rule", None),
("h1", "Part 2 — Build procedure"),

("note", "Joe assembled the v4 electronics on a bench on Sep 12 2026 and wrote down what he did. "
         "This is the first real build in the project rather than a plan, and section 2.1 is his "
         "text, renumbered but not reworded. Where it disagrees with the curriculum above, "
         "assume the build is right about **order** and the curriculum is right about "
         "**safety**. One caveat throughout: he built on a FlyFishRC Tony 5, a 5\" frame, so "
         "steps 1, 3.4 and 9.1 are specific to that frame. Steps 2 and 4–8 are "
         "frame-agnostic and drop into Unit 6 unchanged."),

("h2", "2.1 The procedure as built"),

("h3", "Step 1 — Assemble the base of the drone frame"),
("p", "1.1 Refer to the frame manual sheets."),
("note", "Frame-specific. See difference D1."),

("h3", "Step 2 — Solder the power connection to the ESC"),
("p", "2.1 Insert the shock absorbers into the mounting holes of the ESC."),
("p", "2.2 Tin the ends of the pigtail wires."),
("p", "2.3 Tin the battery solder pads on the ESC (the large pads on the bottom)."),
("p", "2.4 Melt solder on top of the ESC, insert the pigtail wires and wait for adhesion — "
      "red to positive, black to negative."),
("p", "2.5 Tin the ends of the capacitor."),
("p", "2.6 Repeat 2.4, matching + to + and − to −."),
("note", "The ESC is loose on the bench through this whole step — it is not mounted until "
         "3.2. See difference D3. The in-box pigtail is **XT30**, so it mates with the Explorer "
         "pack directly; an earlier note in the parts list saying the stack ships XT60 was "
         "wrong and has been corrected."),

("h3", "Step 3 — Solder the motors to the ESC"),
("p", "3.1 Mount all four motors to the arms, cables pointed inward, using the included bolts."),
("p", "3.2 Mount the ESC to the frame using the bolts included with the ESC."),
("p", "3.3 Tin all twelve motor solder pads (left and right sides of the ESC) and the wires."),
("p", "3.4 Route the motor wires around the frame standoffs so the wires point outward."),
("p", "3.5 Attach the motors to the solder pads, the same way as 2.4 and 2.6."),

("h3", "Step 4 — Connect the FC to the ESC"),
("p", "4.1 Insert the shock absorbers into the mounting holes on the FC."),
("p", "4.2 Insert the ribbon cable into the FC and the ESC."),
("p", "4.3 Position the FC over the ESC and secure it to the frame."),

("h3", "Step 5 — Connect the receiver to the FC"),
("p", "5.1 Solder the connector to the receiver per the wiring diagram."),
("p", "5.2 Sleeve the heat shrink included with the receiver over it — **do not heat it "
      "yet**."),
("p", "5.3 Plug the receiver into the FC, but **do not mount it to the frame yet**."),

("h3", "Step 6 — Connect the GPS to the FC"),
("p", "6.1 Plug the GPS cable into the bottom of the GPS module and into the FC."),
("p", "6.2 **Do not mount it to the frame yet.**"),

("h3", "Step 7 — Testing"),
("p", "7.1 Connect the battery pigtail to the smoke stopper."),
("p", "7.2 Connect a charged battery to the smoke stopper."),
("p", "7.3 If the smoke stopper lights green, go to step 9. If it beeps, go to step 8."),
("note", "A quick polarity and bridge check with a meter goes in before 7.1. The meter's real "
         "value is in step 8, where it is a diagnostic instrument rather than a ritual. "
         "See difference D4."),

("h3", "Step 8 — Troubleshooting"),
("p", "8.1 Try step 7 again with the receiver removed, then with the GPS removed. If the light "
      "turns green after either, you have found the faulty connection."),
("p", "8.2 If no fault is found in 8.1, check the motor connections."),
("p", "8.3 If no fault is found in 8.2, check the capacitor and the battery pigtail."),
("note", "This fault-isolation tree has no counterpart in the curriculum and is the most valuable "
         "new content in the drop. Steps 5.3 and 6.2 exist precisely so this bisect works."),

("h3", "Step 9 — Finishing up"),
("p", "9.1 Finish assembling the frame."),
("p", "9.2 The heat shrink on the receiver can now be heated — make sure the solder joints "
      "are covered."),
("p", "9.3 The receiver can be mounted toward the back of the frame, top or bottom; zip ties are "
      "sufficient."),
("p", "9.4 The GPS should be mounted on top of the drone, preferably toward the front, to "
      "minimize interference."),
("p", "9.5 Propellers stay off. They are fitted during the Unit 8 bench, after the props-off "
      "checks are signed, and then only in a fixture or with a spotter."),
("p", "9.6 Remove the grips from the back of the transmitter and insert the cells — the "
      "grips can be tricky to put back on."),
("p", "9.7 For the Video kit, go to step 10; otherwise go to software setup."),
("note", "9.5 is rewritten from Joe's original (\"leave props off until software setup is "
         "complete\") — see 2.6. 9.3 and 9.4 are the carbon-frame mounting method; the "
         "printed frame uses a pocket instead — see 2.5. 9.6 belongs at the top of Unit 7 "
         "session 2."),

("h3", "Step 10 — Video kit"),
("p", "Not written, consistent with the Video SKU being parked."),

("h2", "2.2 What the build confirms"),
("table", (None,
  ["Claim", "Evidence"],
  [["**20 solder joints** — the locked count, now from a build rather than a desk check",
    "Pigtail 2 (step 2.4) + capacitor 2 (2.6) + motors 12 (3.5) = 16 on the ESC, plus 4 at the "
    "XR2 (5.1). The ESC has six castellated motor pads per side"],
   ["**The Pre-soldered SKU boundary is clean**",
    "Every soldering action is in steps 2, 3 and 5.1 and nowhere else. Pre-soldered ships "
    "through 3.5 and 5.1 already done; steps 1, 4 and 6–9 are unchanged"],
   ["**The BeeID plugs into the FC's GPS socket** with the stack's own lead",
    "Step 6.1. Still to confirm that Joe physically seated it — see question Q1"],
   ["**The XR2 is four solder joints, then a plug**", "Its pad face is ground, 5V, TX, RX"],
   ["**The ESC is rated 3–6S**", "Silkscreen: 4IN1-32BIT-3-6S"],
   ["Both boards are **soft-mounted on grommets**", "Steps 2.1 and 4.1"]])),

("h2", "2.3 Where the build differs from the curriculum"),
("table", (None,
  ["#", "Difference", "Resolution"],
  [["D1", "Written on the FlyFishRC Tony 5 — the 5\" frame the parts list parked. Steps 1, "
    "3.4 and 9.1 are specific to it",
    "**Open, needs a decision.** See 2.7"],
   ["D2", "Whether the in-box pigtail is XT30 or XT60",
    "**Closed Sep 18 2026.** The stack ships XT30; the parts list note saying XT60 was wrong "
    "and is corrected. Pack and pigtail mate directly — nothing to source, nothing to "
    "adapt, still 2 of the 16 joints"],
   ["D3", "The curriculum mounts the ESC to the frame and *then* solders; Joe solders a loose "
    "ESC and mounts it at 3.2",
    "**Joe is right; the curriculum is wrong.** Our order was never actually built"],
   ["D4", "No continuity or polarity check before first power",
    "**Kept, repositioned.** A quick polarity and bridge check before 7.1; the meter's real "
    "home is step 8"],
   ["D5", "9.5 fits props after software setup; the curriculum holds them until the Unit 8 bench",
    "**Resolved.** Joe's reasoning is right — props are unusable before configuration "
    "— but the fitting point moves one step later, into the Unit 8 bench, because Unit 7's "
    "motor-direction work is the hazard. See 2.6"],
   ["D6", "9.3 and 9.4 zip-tie the receiver and GPS to a carbon frame; Unit 5 specifies a "
    "printed BeeID pocket and an XR2 keep-out",
    "**Both, staged.** See 2.5"],
   ["D7", "The source figures are vendor renders and manual pages — not licensable for a "
    "sold course",
    "**Reshoot and redraw.** Shot list in 2.8"]])),

("h2", "2.4 Questions for Joe"),
("table", (None,
  ["#", "Question", "Why it matters"],
  [["Q1", "**Did the BeeID lead physically seat** in the FC's GPS socket, or did you re-pin it?",
    "If it needs re-pinning, that is a new kit part and four more solder joints"],
   ["Q2", "**What did you bolt the 20 × 20 M2 stack down with?** The Tony 5's stack pattern "
    "is 20 × 20 **M3** — M2 screws through M3 holes leave 1 mm of slop",
    "Tells us whether the grommets took it up or whether the kit needs standoffs or adapters. "
    "The same question will come up on the printed frame"],
   ["Q3", "**Capacitor value and voltage** actually fitted",
    "Already an open in-person check, and it is 2 of the 16 joints"],
   ["Q4", "**Wall-clock build time**, split between soldering and assembly",
    "The only missing input for pricing the Pre-soldered SKU at +$25–40, which assumes "
    "about 25 minutes per kit"],
   ["Q5", "**Weigh it** — per component and complete",
    "Already open. Note that a Tony 5 build's all-up weight is **not** a Base-kit number"]])),

("h2", "2.5 Mounting the receiver and BeeID — staged"),
("p", "Joe's zip ties are right for bring-up and wrong for the shipped design, and both belong in "
      "the course."),
("bullets", [
  "**During bring-up (steps 5.3, 6.2, 8):** the receiver and BeeID stay loose and plugged in so "
  "step 8's bisect works. Nothing is mounted, nothing is heat-shrunk.",
  "**After a green light (9.2–9.4):** heat-shrink the XR2 joints, then mount.",
  "**On a carbon bench build:** zip ties, as Joe writes. Fine for a test flight — a 1 g "
  "receiver on two ties does not come off — but it is a rework method, not a design.",
  "**On the printed Base frame:** the Unit 5 brief already carries a BeeID pocket "
  "(22 × 16 × 8 mm, sky view) and an XR2 keep-out. Print them so both parts stay "
  "**removable without unbolting the stack**, or step 8 stops working the second time a class "
  "needs it."]),
("p", "Soldering is not an alternative to zip ties here — both parts are already plugs at "
      "the FC end. The question is only pocket versus tie, and the answer is tie during "
      "bring-up, pocket afterwards."),

("h2", "2.6 Props — when they go on"),
("p", "Joe's 9.5 is right about the reason and one step early about the timing. Props are "
      "unusable before configuration, so nothing is lost by holding them — and the window "
      "that actually matters is **Unit 7 session 2**, where motor direction and order are set "
      "from the Betaflight motors tab. That tab spins all four motors from a laptop slider; a "
      "mis-set motor order with props fitted is an injury, which is why Betaflight puts it "
      "behind an \"I understand the risks, propellers are removed\" checkbox."),
("p", "So props are fitted **inside the Unit 8 bench**, after the props-off block (arm/disarm, "
      "motor spin and direction, failsafe demonstration, radio range walk) and before "
      "restrained-prop running — never at the end of Unit 7. Until then they live in the "
      "teacher's box."),

("h2", "2.7 The frame question — CAD results"),
("p", "Joe built on a Tony 5 and then proposed it as the Base frame on the grounds that it is "
      "light, roomy and easier to work on. Three 215 mm variants were modelled against the "
      "150 mm printed baseline to settle two separable questions: does the **current 3.5\" "
      "powertrain** work on a 215 mm frame, and does a **real 5\" powertrain** work on this kit?"),
("table", (None,
  ["", "Printed 150 mm (baseline)", "215 mm carbon, 3.5\" props", "215 mm printed, 3.5\" props",
   "215 mm carbon, 5\" props on the 1404"],
  [["All-up weight", "218.1 g", "**228.7 g**", "224.8 g", "**251.7 g — over cap**"],
   ["Thrust / weight", "7.0", "6.7", "6.8", "not real — model extrapolating past the motor"],
   ["FEA safety factor, max thrust / crash", "8.9 / 2.3", "**39.1 / 7.7**", "6.3 / **1.7**",
    "9.4 / 7.0"],
   ["First arm mode", "82 Hz", "**127 Hz**", "40 Hz (below the 80 Hz idle, so not excited)",
    "113 Hz"],
   ["Max current per motor", "13.5 A", "13.5 A", "13.5 A", "**80.4 A**"],
   ["ESC temperature rise at 50 %", "—", "16 °C", "—",
    "**73 °C — fails a 60 °C limit**"],
   ["Frame + guards", "~35–45 g", "74.8 g", "70.9 g", "87.0 g"],
   ["Bottom-plate print", "18–25 g, 45–85 min", "bought",
    "**32.5 g, 1 h 45 m**, 10.2 % overhang needs supports", "bought"],
   ["Checks passed", "21 / 21", "**17 / 18**", "17 / 18", "15 / 18"]])),
("p", "**Three findings:**"),
("numbers", [
  "**A 215 mm frame with the current 1404 + 3525 electronics has no blocking issue.** 228.7 g, "
  "under the 250 g soft cap; the same thrust-to-weight; far stronger; a higher first mode; the "
  "ESC 16 °C over ambient; every physical check clean. The one \"failure\" is our own "
  "wheelbase target of 145–168 mm — a policy number we wrote, not physics. The parts "
  "list's objection was efficiency and elegance (63 mm of dead span between prop tips, guards "
  "sized for 3.5\" on a 5\" frame), and its wind claim does not show up in the gust simulation: "
  "0.1° roll excursion either way.",
  "**Do not fit 5\" props to the 1404 4500KV.** This is the one hard finding. Motor current goes "
  "from 13.5 A to 80.4 A, ESC temperature rise to 73 °C against a 60 °C limit, and "
  "all-up weight over the cap. A genuine 5\" powertrain means 2004-class motors and probably 4S "
  "— a different bill of materials, different Unit 4 numbers, different cost. Modelled "
  "properly, a real 5\" build fails four independent ways: over the weight cap by 43–64 g; "
  "motor power limit exceeded; the 45 A matched stack undersized by 2.3–2.6× (105–"
  "117 A at full throttle), which reopens the FC↔ESC question the matched stack closed; and "
  "guards and props fouling the frame.",
  "**Tier B survives at 215 mm, but degraded.** Crash safety factor falls from 2.3 to 1.7 and "
  "the first mode to 40 Hz (still below the idle band, so not excited in flight). The real cost "
  "is printer time: the bottom plate goes from 18–25 g and 45–85 minutes to 32.5 g and "
  "1 h 45 m, with supports under 10 % of its area. For a class of ten that is roughly 8 hours of "
  "printing becoming 17 on the bottom plate alone, and supports are a new failure mode for a "
  "school printer."]),
("p", "**Net:** the configuration that passes is a larger frame with the **existing 3.5\" "
      "powertrain**. That is exactly what the parts list called \"the worse of both\", and on "
      "the numbers that judgement was about elegance rather than function. The decision is open "
      "— it is the one thing blocking difference D1."),
("p", "Separately, the printed-frame variant itself still needs a pick between a solid-arm "
      "design (simplest print, 18 g bottom plate) and a vertical-truss design with a keel "
      "(7.5× arm stiffness, crash safety factor 2.3 against roughly 1, first mode 82 Hz "
      "against 52, 25 g bottom plate). Thrust-stand measurements and a calibration test print "
      "of both come before the stock frame is finalized."),

("h2", "2.8 Photo and diagram shot list"),
("p", "None of the existing figures can ship — they are vendor renders and manual pages. "
      "When hardware is in hand, these are the assets to capture in our own format. Shoot on a "
      "plain light background, one part per frame, with a scale reference in the parts shots."),
("p", "**Component stills** — for the Unit 2 photo-ID quiz and the Unit 2 leaves:"),
("table", (None,
  ["Subject", "Angles"],
  [["Flight controller", "Top with sockets and pad labels legible, bottom, edge-on for stack height"],
   ["ESC", "**Both faces** — the battery-pad face and the twelve-motor-pad face, pads readable"],
   ["Stack assembled", "Edge-on with grommets in, ruler alongside — this is the number "
    "Unit 5's clear-height check uses"],
   ["Motor", "Side, bottom (12 × 12 bolt pattern), lead exit"],
   ["Props", "Top, edge (pitch), a clockwise and counter-clockwise pair"],
   ["Battery", "Label face, connector end"],
   ["Receiver", "Pad face, antenna, with heat shrink on and off"],
   ["BeeID", "Top, bottom (connector), in-hand for scale"],
   ["Smoke stopper", "XT30 face and XT60 face"],
   ["Hardware bag", "Flat lay, numbered, our own callouts"],
   ["Charger, transmitter", "Front"]])),
("p", "**Build-step stills and clips** — one per substep for the Unit 6 leaves, each shot "
      "over-the-shoulder and from a fixed overhead: tinning a battery pad · the pigtail "
      "joint made · capacitor polarity, a good example and a **bad** one · tinning the "
      "twelve motor pads · wire routing around standoffs with wires pointing outward · "
      "the ribbon seated FC to ESC · the four XR2 joints · heat shrink before and after "
      "· the BeeID plugged in and unmounted · the smoke stopper green · the smoke "
      "stopper **beeping** (stage a fault — this is the step 8 opener)."),
("p", "**Diagrams to redraw in our own format**, off the finalized CAD rather than vendor art:"),
("numbers", [
  "**Wiring diagram** — BeeID in place of the stock GPS module, receiver on UART2, GPS on "
  "UART5, XT30 pigtail, capacitor, no camera on Base. One Base version, one Video version later.",
  "**Hardware-bag plate** with our part numbers.",
  "**Exploded assembly view**, rendered from the chosen frame variant so the frame in the "
  "diagram is the frame students print.",
  "**Solder-joint map** — all 20 joints on one ESC and receiver drawing, numbered, doubling "
  "as the Pre-soldered SKU QA sheet.",
  "**Bring-up and fault-isolation flowchart** from step 8."]),

("rule", None),
("h1", "Part 3 — Parts list"),

("note", "Draft v4, Sep 12 2026, from Joe's fourth list. The cart totals $840 with video and "
         "$458 without. Prices are list, pre-tax, and need re-checking at order time."),

("h2", "3.1 The list"),
("table", (None,
  ["Role", "Part", "Qty", "$", "Notes", "Status"],
  [["Camera + video link", "DJI O4 Air Unit", "1", "140", "**Video only**", "Confirmed"],
   ["Frame", "FlyFishRC Tony 5 O4 Pro Sub250", "1", "55",
    "**5\" / 215 mm**, specified for 5\" props. Not a 3.5\" sibling for the 1404 + 3525",
    "**Parked**"],
   ["Motors", "XILO Stealth 1404 4500KV", "4", "78", "Unchanged", "Confirmed"],
   ["GPS + Remote ID", "NewBeeDrone BeeID V1.1", "1", "40", "FAA DOC RID000001995",
    "Confirmed; harness pitch to check in person"],
   ["Battery", "Flywoo Explorer 1000 mAh 3S LiHV XT30UP, 2 pcs", "1", "33",
    "66 g, 58 × 24.5 × 23.5 mm. Charge as **LiHV**", "Closed for the tray"],
   ["Charger", "ToolkitRC M4AC 30 W", "1", "30", "Pick the **XT30** SKU, LiHV mode",
    "Class item"],
   ["Smoke stopper", "SpeedyBee XT30/XT60 smoke stopper", "1", "10",
    "Dual-plug electronic fuse, 2–6S (7–25 V), ~1 A max, green LED or beep. "
    "**Use the XT30 pair only.** Never plug both battery inputs at once. First power-on, props "
    "off, no throttle", "**Closed** — class item"],
   ["Receiver", "RadioMaster XR2 Nano", "1", "13", "4 solder joints, tower antenna", "Confirmed"],
   ["Transmitter", "RadioMaster Pocket Crush", "1", "85", "Cells not included", "Class item"],
   ["Props", "Gemfan 3525", "2 sets", "6", "No prop screws in the pack", "Confirmed"],
   ["Goggles", "DJI Goggles N3", "1", "230", "Video / shared class set", "Confirmed"],
   ["**FC + ESC**", "Flywoo GOKU F722 Mini V2 45 A 20 × 20 stack", "1", "90",
    "**Matched stack.** Target `FLYWOOF722PROV2`, barometer, OSD, RX/GPS/DJI sockets, **M2** "
    "20 × 20, plus the G45M 45 A AM32 ESC, 8-pin ribbon, capacitor and an **XT30 pigtail "
    "in the box**. Assembled ~15.7 mm", "**Closed**"],
   ["Radio cells", "Sony VTC5A 18650, 2 pcs", "1", "18", "For the transmitter, not the aircraft",
    "Class; confirm fit"],
   ["Video coax", "RunCam O4 90°–90°", "1", "12", "Video only", "Video"]])),
("p", "**Not on the list but still needed:** hardware pack, battery strap and M2 × 7 prop "
      "screws for the Base kit; LiPo bags and a fire can; printed guards; spares; extra "
      "chargers."),

("h2", "3.2 What changed against v3"),
("table", (None,
  ["Topic", "v3", "v4", "Our read"],
  [["FC + ESC", "Separate FC $45 + HGLRC 60 A ESC $57; pinout and M2-vs-M3 open",
    "**Matched stack, $90**",
    "**Accept.** Closes the pinout, the hole size and the oversized ESC pocket at once. "
    "Firmware and sockets unchanged. About $12 cheaper and 7 g lighter than the HGLRC ESC"],
   ["Connector", "XT30 pack against an XT60 ESC lead", "Same pack; the stack ships **XT30**",
    "**Closed Sep 18 2026.** The earlier \"ships XT60\" note was wrong. Pack and pigtail are "
    "both XT30 — nothing to source, nothing to adapt. Still 2 of the 16 joints"],
   ["Smoke stopper", "Unresolved listing", "**SpeedyBee dual XT30/XT60**, $10",
    "**Accept.** In the classroom: XT30 in, XT30 out, 1 A trip, props off"],
   ["Cart totals", "$852 / $482", "$840 / $458",
    "The $12 is the matched stack against the split pair"],
   ["Everything else", "—", "Unchanged",
    "The Tony 5 is parked with the Video SKU; battery, receiver, charger and goggles all stand"]])),

("h2", "3.3 The stack and the XT30 pack"),
("table", (None,
  ["Check", "State"],
  [["FC↔ESC ribbon, M2 holes, 20 × 20, target `FLYWOOF722PROV2`", "Closed"],
   ["Pack XT30UP against the included pigtail",
    "**Closed Sep 18 2026 — the stack ships XT30.** Solder the included pigtail to the "
    "battery pads (2 of the 16 joints). No adapter, no extra part; XT30 holds class-wide"],
   ["Smoke stopper",
    "**Closed.** Sits between the pack and the XT30 pigtail. The dual plugs are a convenience "
    "— **only one battery input at a time.** 1 A maximum: first power, props off, no "
    "throttle. A 3S LiHV pack at ~13 V is inside its 7–25 V range. Treat the \"finds about "
    "90 % of shorts\" claim as a bench aid, not a guarantee"],
   ["O4 on 3S LiHV (13.05 V against a 13.2 V maximum)", "Fine. Never 4S"]])),
("p", "**Solder joints, Base:** 16 on the ESC plus 4 at the receiver = **20** for the Solder SKU."),

("h2", "3.4 The printed frame"),
("p", "Not on the cart, by design. Students print the structure; the kit buys the hardware "
      "— screws, nylon standoffs, lock nuts, strap, ties, heat shrink and **M2 × 7 "
      "prop screws**."),

("h2", "3.5 Cost"),
("table", (None,
  ["", "Base (printed frame)", "Video (carbon placeholder)"],
  [["Stack (FC + ESC)", "$90", "$90"],
   ["Receiver", "$13", "$13"],
   ["Motors × 4", "$78", "$78"],
   ["BeeID", "$40", "$40"],
   ["Batteries × 2", "$33", "$33"],
   ["Props, 2 sets", "$6", "$6"],
   ["Frame", "~$12 filament, plus hardware and strap", "$55 carbon (to be replaced)"],
   ["O4 + coax", "—", "$152"],
   ["**Per aircraft**", "**~$272, call it $275**",
    "**~$467, call it $465** until a real 3.5\" frame replaces the Tony 5"]])),
("p", "**A class of ten, Base:** 10 × $275 = $2,750, plus 5 radios $515, 18650 cells $90, "
      "chargers $90, smoke stoppers $20, bags $40 and spares $300 — about **$3,800**. Ten "
      "Video aircraft come to about $6,100 including two sets of goggles. The Pre-soldered SKU "
      "adds $25–40 per kit. For comparison, competing classroom programs run $10,000–"
      "13,000 and $26,000."),

("h2", "3.6 All-up weight estimate"),
("table", (None,
  ["", "Base", "Video"],
  [["Solder joints", "16 (ESC) + 4 (receiver)", "Same; O4 none; BeeID none if the pitch matches"],
   ["All-up weight",
    "Motors 40 + stack ~17 + receiver 1 + BeeID 5 + props 7 + battery **66** + wiring ~12 + "
    "printed frame and guards ~70 ≈ **~220 g**",
    "Carbon ~57 + O4 9 + cable and guards ~15 ≈ **~235–245 g**"]])),
("p", "Both still need weighing on a real build. A Tony 5 build's weight is not a Base number."),

("h2", "3.7 Verdict, and why Video is parked"),
("p", "**Closed this pass:** the mix-and-match FC and ESC (the matched stack is the reference "
      "again) and the smoke stopper. **Still open:** the hardware pack. **Decided:** do not "
      "print props; the Gemfan 3525 stays the Base prop."),
("p", "The frame vendor's own specification is 5\" props, 215 mm, 57 g, 12 × 12 M2 motors, "
      "20 × 20 / 25.5 M3 stack, 19/20 mm camera plates, O4-ready. Their own sub-250 example "
      "uses 2004 motors, 5\" bi-blades, a 6S 380 mAh pack and an AIO board at 248.7 g — and "
      "they note that adding an O4 pushes it to about 260 g. That is not our Base electronics."),
("table", (None,
  ["Approach", "What happens"],
  [["Bolt 1404s and 3525s onto the 5\" frame",
    "Motors fit. Props do not fill a 5\" wheelbase. The extra arm length catches wind without "
    "adding disc area. Guards are the wrong size. **Do not**"],
   ["Put 5\" props on the 1404 4500KV",
    "These are 3.5\"-class motors. They pull far too much current and overheat. **Do not** "
    "— now quantified in 2.7"],
   ["Give Video its own 5\" powertrain (2004 or 2207 motors, 5\" props, probably 4S)",
    "This does fly, and a real 5\" handles outdoor wind better — more disc area and thrust "
    "margin, not the carbon span by itself. But it is a **different kit**: different motors, "
    "props, pack, charger current, all-up weight and Unit 4 numbers. It breaks the "
    "\"Video = Base + O4 + carbon frame\" ladder"]])),
("p", "**On wind:** wheelbase alone does not add stability — thrust-to-weight and prop disc "
      "area do. A 5\" airframe with 5\" props is the usual outdoor and cinematic platform; a "
      "3.5\" 1404 build is a school and park flyer. Forcing 3.5\" props onto a 5\" frame is the "
      "worse of both: more area to weathervane, the same small disc."),
("p", "**Decision:** park Video and ship the **Base course with the Base kit**. Video, "
      "Pre-soldered and a 5\" camera kit stay quote options on the same stack until a real frame "
      "is picked — either a 3.5\" sibling or a deliberate, separate 5\" bill of materials."),

("h2", "3.8 Open items"),
("table", (None,
  ["Item", "Owner"],
  [["Video-kit frame — the Tony 5 is parked; revisit after Base ships", "Joe, later"],
   ["Confirm the charger SKU is the XT30 face", "Joe"],
   ["Confirm the 18650 pair seats in the transmitter", "In person"],
   ["BeeID harness against the GPS socket; receiver CRSF wiring against the RX socket; capacitor "
    "value; the Setup tab on first flash; battery fit", "In person"],
   ["Weigh one Base and one Video build; component photos", "Joe"],
   ["Hardware pack — screws, standoffs, strap, M2 × 7", "Ours, plus a photo from Joe's "
    "printed frame"],
   ["LiHV charging leaf in Unit 1", "Ours"],
   ["Regenerate the CAD from this list", "Ours — done Sep 12 2026"],
   ["Re-price everything at order time and swap superseded parts", "Ours"]])),

("rule", None),
("h1", "Part 4 — Reference"),

("h2", "4.1 Terms"),
("p", "How each word is used in this course."),
("table", (None,
  ["Term", "Meaning in this course"],
  [["**Unit**", "A top-level block, 1–8. Has a session count, a safety brief, stems, and a "
    "closing assessment or checkpoint"],
   ["**Stem**", "A lesson group inside a unit; 3–6 leaves; one short intro video"],
   ["**Leaf**", "One reading page, 150–350 words — concept, example, figure. Text only "
    "unless marked as a step clip"],
   ["**Session**", "One class period, 45–60 minutes"],
   ["**Lab**", "A session where students work on hardware or CAD. Always opens with the unit "
    "safety brief"],
   ["**Step clip**", "A 1–2 minute video of one bench or Configurator action, paired with a "
    "leaf. Used in Units 6–8"],
   ["**Checkpoint**", "Completion evidence — a photo, a file, a teacher tick — that "
    "earns points"],
   ["**Base kit**", "Flyer only: a 3.5\" guarded quad on a **student-printed frame**, no camera. "
    "Electronics are the 20 × 20 F722 Mini V2 stack (barometer, OSD, plug sockets), XR2 "
    "Nano receiver, BeeID GPS and Remote ID module, four 1404 motors and a 3S LiHV XT30 pack"],
   ["**Video kit**", "The same electronics plus a stock carbon frame and a DJI O4 Air Unit "
    "(camera and video link in one part). Optional compass module. Goggles are shared per class"],
   ["**Solder / Pre-soldered SKU**",
    "The same parts, two builds. *Solder:* students make the 16 ESC joints (motors 12, pigtail 2, "
    "capacitor 2) and the 4 receiver joints. *Pre-soldered:* we ship the ESC and motor harness "
    "and the receiver already terminated; students bolt, plug and route, and soldering becomes "
    "an optional practice-board lab. Priced at +$25–40"],
   ["**Minimal-solder**", "The design goal: anything that can be a plug is a plug (receiver, "
    "GPS/Remote ID, video). On a 3–3.5\" build the motors and battery stay solder pads; "
    "true plug-and-play boards only exist at 2\" and under"],
   ["**Tier A / Tier B**", "CAD scope. A: modify or design small printed parts — guards, "
    "camera cage, mounts — on a stock carbon frame. B: design the **whole printed frame** "
    "from measured parts"],
   ["**Print-and-ship**", "Our service: the teacher uploads the class's STLs at the end of "
    "Unit 5, we print, QC and ship one batch"],
   ["**Stock frame**", "The known-good frame, and the guaranteed flyer if a student design "
    "fails. Carbon on the Video kit; our own STL, pre-printed, on the Base kit"],
   ["**All-up weight (AUW)**", "Weight with the battery installed. Target light, around 250 g, "
    "for cost and crash energy — a soft target, not a hard limit"],
   ["**RPIC**", "Remote Pilot in Command, holding a Part 107 certificate. A teacher or paid "
    "employee, present on every flight day"],
   ["**Part 107 path**", "This class flies under Part 107: every aircraft registered separately "
    "regardless of weight, Remote ID met with a broadcast module whose serial is listed on each "
    "aircraft's registration, and visual line of sight maintained"],
   ["**Remote ID module**", "NewBeeDrone BeeID V1.1 (FAA DOC RID000001995): GPS and Remote ID "
    "broadcaster in one 5 g module, **one per aircraft**, powered from the flight controller, "
    "plugged into the GPS socket. Its serial is read from its own WiFi setup page. No battery to "
    "charge and nothing to move between aircraft"],
   ["**Smoke stopper**", "A class tool that sits between the pack and the XT30 pigtail on first "
    "power-on. 1 A maximum, props off, one battery input only"],
   ["**Failsafe**", "The configured behavior on signal loss — drop or disarm. Demonstrated "
    "props-off before any motor spin"],
   ["**Bench**", "Props-off checks, then restrained-prop checks, before the first flight"],
   ["**Visual observer (VO)**", "A second person watching the aircraft unaided while the pilot "
    "flies in goggles. Required on every FPV flight"]])),

("h2", "4.2 Where this comes from"),
("p", "This document is generated from three markdown files, which stay canonical — edit "
      "those and regenerate, rather than editing this copy:"),
("bullets", [
  "`outlines/drone-building-course-outline-v3.md` — the curriculum in Part 1, at v3.4",
  "`reference/build-steps-joe-v1.md` — the build procedure in Part 2, at v1",
  "`reference/parts-list-draft-v4.md` — the parts list in Part 3, at v4"]),
("p", "Supporting material not reproduced here: the frame-material, goggles and Part 107 module "
      "detail in parts list v1; the rationale and history in the v2 course review; the classroom "
      "soldering-lab research note; the CAD and simulation extensions note; and the full "
      "215 mm frame study behind section 2.7."),
("p", "Two things are deliberately left out of this Drive copy: the locked-decisions table and "
      "the separate list of non-negotiable gates. Both are working-process records rather than "
      "course content. The safety requirements themselves — the signed shop cert before "
      "assembly, the failsafe demonstrated props-off before any motor spin, and the signed bench "
      "checklist before a first flight — are stated in the units where they apply."),
]


# --------------------------------------------------------------------------
# Rendering
# --------------------------------------------------------------------------

BOLD_RE = re.compile(r"\*\*(.+?)\*\*")
ITAL_RE = re.compile(r"(?<!\*)\*(?!\*)(.+?)(?<!\*)\*(?!\*)")
CODE_RE = re.compile(r"`(.+?)`")


def inline_runs(text: str) -> list[tuple[str, bool, bool]]:
    """Split text into (chunk, bold, italic) runs from **bold** / *italic* markup."""
    runs: list[tuple[str, bool, bool]] = []
    pos = 0
    pattern = re.compile(r"\*\*(.+?)\*\*|(?<!\*)\*(?!\*)(.+?)(?<!\*)\*(?!\*)")
    for m in pattern.finditer(text):
        if m.start() > pos:
            runs.append((text[pos:m.start()], False, False))
        if m.group(1) is not None:
            runs.append((m.group(1), True, False))
        else:
            runs.append((m.group(2), False, True))
        pos = m.end()
    if pos < len(text):
        runs.append((text[pos:], False, False))
    return runs or [(text, False, False)]


def plain(text: str) -> str:
    text = BOLD_RE.sub(r"\1", text)
    text = ITAL_RE.sub(r"\1", text)
    return CODE_RE.sub(r"\1", text)


def build_docx(path: Path) -> None:
    from docx import Document
    from docx.enum.text import WD_ALIGN_PARAGRAPH
    from docx.shared import Pt, RGBColor

    doc = Document()

    style = doc.styles["Normal"]
    style.font.name = "Calibri"
    style.font.size = Pt(10.5)
    style.paragraph_format.space_after = Pt(7)

    title = doc.add_paragraph()
    run = title.add_run(TITLE)
    run.bold = True
    run.font.size = Pt(26)
    title.paragraph_format.space_after = Pt(2)

    sub = doc.add_paragraph()
    run = sub.add_run(SUBTITLE)
    run.font.size = Pt(13)
    run.font.color.rgb = RGBColor(0x44, 0x44, 0x44)
    sub.paragraph_format.space_after = Pt(8)

    by = doc.add_paragraph()
    run = by.add_run(BYLINE)
    run.italic = True
    run.font.size = Pt(9)
    run.font.color.rgb = RGBColor(0x66, 0x66, 0x66)

    def add_text(par, text: str) -> None:
        for chunk, bold, ital in inline_runs(CODE_RE.sub(r"\1", text)):
            run = par.add_run(chunk)
            run.bold = bold
            run.italic = ital

    for kind, payload in CONTENT:
        if kind == "rule":
            par = doc.add_paragraph()
            par.alignment = WD_ALIGN_PARAGRAPH.CENTER
            run = par.add_run("• • •")
            run.font.color.rgb = RGBColor(0x99, 0x99, 0x99)
        elif kind in ("h1", "h2", "h3"):
            level = int(kind[1])
            doc.add_heading(plain(payload), level=level)
        elif kind == "p":
            add_text(doc.add_paragraph(), payload)
        elif kind == "note":
            par = doc.add_paragraph()
            par.paragraph_format.left_indent = Pt(14)
            run = par.add_run(plain(payload))
            run.italic = True
            run.font.color.rgb = RGBColor(0x55, 0x55, 0x55)
            run.font.size = Pt(10)
        elif kind == "quote":
            par = doc.add_paragraph(style="Intense Quote")
            add_text(par, payload)
        elif kind == "bullets":
            for item in payload:
                add_text(doc.add_paragraph(style="List Bullet"), item)
        elif kind == "numbers":
            for item in payload:
                add_text(doc.add_paragraph(style="List Number"), item)
        elif kind == "table":
            caption, headers, rows = payload
            if caption:
                add_text(doc.add_paragraph(), caption)
            table = doc.add_table(rows=1, cols=len(headers))
            table.style = "Table Grid"
            for cell, text in zip(table.rows[0].cells, headers):
                cell.text = ""
                par = cell.paragraphs[0]
                run = par.add_run(plain(text))
                run.bold = True
                run.font.size = Pt(9.5)
            for row in rows:
                cells = table.add_row().cells
                for cell, text in zip(cells, row):
                    cell.text = ""
                    par = cell.paragraphs[0]
                    par.paragraph_format.space_after = Pt(2)
                    for chunk, bold, ital in inline_runs(CODE_RE.sub(r"\1", text)):
                        run = par.add_run(chunk)
                        run.bold = bold
                        run.italic = ital
                        run.font.size = Pt(9.5)
            doc.add_paragraph()
        else:
            raise ValueError(f"unknown content kind: {kind}")

    doc.save(path)


def build_txt(path: Path) -> None:
    lines: list[str] = []
    W = 92

    lines += [TITLE.upper(), "=" * len(TITLE), plain(SUBTITLE), "", plain(BYLINE), ""]

    def wrap(text: str, indent: str = "", first: str | None = None) -> list[str]:
        import textwrap
        return textwrap.wrap(
            plain(text), width=W,
            initial_indent=first if first is not None else indent,
            subsequent_indent=indent) or [indent.rstrip()]

    for kind, payload in CONTENT:
        if kind == "rule":
            lines += ["", "-" * W, ""]
        elif kind == "h1":
            text = plain(payload)
            lines += ["", "=" * W, text.upper(), "=" * W, ""]
        elif kind == "h2":
            text = plain(payload)
            lines += ["", text, "-" * len(text), ""]
        elif kind == "h3":
            lines += ["", plain(payload), ""]
        elif kind in ("p", "quote"):
            lines += wrap(payload) + [""]
        elif kind == "note":
            lines += wrap(payload, indent="    ", first="  > ") + [""]
        elif kind == "bullets":
            for item in payload:
                lines += wrap(item, indent="    ", first="  - ")
            lines += [""]
        elif kind == "numbers":
            for i, item in enumerate(payload, 1):
                lines += wrap(item, indent="     ", first=f"  {i}. ")
            lines += [""]
        elif kind == "table":
            caption, headers, rows = payload
            if caption:
                lines += wrap(caption) + [""]
            # Column-per-line form: survives any viewer, unlike fixed-width columns.
            for row in rows:
                label = plain(row[0]) or "—"
                lines.append(f"  {label}")
                for head, cell in zip(headers[1:], row[1:]):
                    head = plain(head)
                    prefix = f"      {head}: " if head else "      "
                    lines += wrap(cell, indent="        ", first=prefix)
                lines.append("")
        else:
            raise ValueError(f"unknown content kind: {kind}")

    path.write_text("\n".join(lines).rstrip() + "\n", encoding="utf-8")


def main() -> int:
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    docx_path = OUT_DIR / f"{STEM}.docx"
    txt_path = OUT_DIR / f"{STEM}.txt"
    build_docx(docx_path)
    build_txt(txt_path)
    for p in (docx_path, txt_path):
        print(f"wrote {p.relative_to(REPO)}  ({p.stat().st_size:,} bytes)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
