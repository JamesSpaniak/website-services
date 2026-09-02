# Drone building — initial course draft outline

**Status:** Author intake draft. Not a course payload. Do not publish, stub a homepage track, or import JSON from this file.

**Source:** Joe’s topic list on `origin/branch-joe` (`docs/building/Drone Building Outline.txt`, commit `dd4ce7f`, Aug 5 2026). Verbatim copy: [`joe-drone-building-outline.txt`](joe-drone-building-outline.txt).

**Audience (open):** CTE / STEM lab and individual builders. This is **not** FAA Part 107 exam prep. Physics and regs below should cross-link the 107 course, not rewrite it thinner.

**Tree rules** (same as Part 107): unit → stem → leaf; 3–6 leaves per stem; leaves 150–350 words (concept + example + figures in one body); one intro video per stem; labs are separate from reading leaves.

---

## Open decisions (block authoring until named)

| Decision | Why it changes the tree | Draft default (confirm) |
|----------|-------------------------|-------------------------|
| Airframe class | Part count, soldering, CAD scope, crash cost | 5-inch class quad **or** a classroom trainer with prop guards — pick one for v1 |
| Firmware stack | Joe’s “angle **or** alt hold” is two stacks | **Betaflight** for angle/acro FPV; **INAV** if alt-hold / GPS hold is required |
| Soldering | Many districts restrict student soldering | Teacher-soldered power leads + student plug-in stack **or** full solder lab |
| 107 overlap | Physics + registration + RID already exist in `faa-107` | Cross-link those leaves; keep a short “builder’s version” recap only |
| Hardware | Kit vs BYOD changes BOM, photos, and pacing | Course-owned kit BOM published with the first lab unit |
| Video granularity | Same as 107 | One 6–10 min stem video; assembly/testing stems also get a bench-cam lab video |

Until those are named, treat units below as **proposed**, not locked refs.

---

## Suggested course tree (v1)

Insert a Safety unit that Joe did not list. Keep his seven headings as units 2–8. Testing stays last.

| Order | Proposed unit | Joe heading | Sessions (45–60 min) | Mix |
|------:|---------------|-------------|----------------------|-----|
| 1 | Shop safety and first power-up rules | *(not in source)* | 1 lecture + 1 shop cert | Lecture / demo |
| 2 | Function of components | Function of components | 2 | Lecture + parts ID lab |
| 3 | Physics for builders | Physics of Drone | 1 (or skip if 107 enrolled) | Lecture; 107 cross-link |
| 4 | Laws for custom / homebuilt | Laws of Custom Drones | 1 | Lecture; 107 cross-link |
| 5 | Frame design | Frame Design | 2–3 | CAD lab |
| 6 | Assembly | Assembly | 3–4 | Bench lab |
| 7 | Software setup | Software Setup | 2 | Config lab, props off |
| 8 | Testing and first flight | Testing *(empty in source)* | 2 | Bench then maiden |

**Pacing:** ~14–16 class periods as a quarter mini-course; stretch CAD + assembly if this is a full CTE lab semester.

**Video count (v1):** ~10 stem videos (one per stem below), plus 2 lab cameras (assembly, maiden). Do not plan per-leaf recordings.

---

## Unit 1 — Shop safety and first power-up rules *(recommended insert)*

Not in Joe’s list. Put it **before** any wiring or props. A build course that starts at “battery connector to ESC” is not classroom-safe.

### How to structure into class

| Stem | Leaves (3–5) | Session |
|------|----------------|---------|
| LiPo and fire | Cell damage, storage, charge bag, field fire can, never charge unattended | Period 1 lecture |
| Bench rules | Props off until Testing; arming switch discipline; one-hand-on-radio; no live props over people | Period 1 demo |
| Tools and PPE | Iron temp, fume extraction, eye protection, when students may not solder | Period 2 shop walkthrough |
| Kill / failsafe mental model | What “disarm” vs “failsafe” vs “unplug” actually does | Fold into Software later; introduce the words here |

**Lab:** Shop certification checklist signed before Unit 6. No battery connected until the teacher clears the bench.

### Expansion points

- School-specific: district science-lab vs CTE welding-shop rules, parental photo/video consent for maiden day.
- Crash retrieval beeper (Joe lists it under software) belongs in the safety brief too — lost LiPo in a field is a fire risk.
- Insurance / school flight-site: indoor netted cage vs outdoor field; who is RPIC if this is not 107.

### Missing gaps

- Entire unit is a gap in the source outline.
- No incident procedure (burn, cut, runaway motor).
- No “props off” gate that blocks Assembly’s last bullet until Testing.

---

## Unit 2 — Function of components

### Source bullets

FC · ESC · Frame · Motors · Propellers · Battery · Receiver · GPS (optional)

### How to structure into class

Flat list of eight parts is too many direct children. Split into two stems (powertrain vs brain/radio). GPS stays optional so the tree still works on a no-GPS kit.

| Stem | Leaves | Notes |
|------|--------|--------|
| Airframe and power | Frame, motors, propellers, battery, ESC | What each does, typical 5-inch sizes, series vs 4-in-1 ESC |
| Brain and radio | FC, receiver, GPS (optional), how they connect | UART vs solder pads; “FC is not the radio” |
| Parts ID lab | Photo ID of a real stack; polarity; connector types (XT60, JST, bullet) | Lab leaf, not a reading-only leaf |

**Session 1:** Powertrain lecture + pass-around parts.  
**Session 2:** FC/RX/GPS + unlabeled-parts quiz (unit quiz, 8–10 items).

### Expansion points

- 4-in-1 ESC vs separate ESCs; BLHeli vs Bluejay (name only, don’t deep-dive firmware here).
- KV, cell count, and prop pitch as a **matching** problem (wrong combo = toast motors) — tees Unit 3.
- Antenna types (dipole vs T vs GPS patch) so Unit 6 “RX and GPS positioning” has somewhere to land.
- PDB vs FC-with-PDB; capacitor on the power leads (noise / voltage spike).
- Camera / VTX as **optional** stem if this is an FPV course; omit for a GPS trainer.

### Missing gaps

- No camera, VTX, buzzer, or LED — Joe’s list is a flyable quad, not an FPV kit.
- No connector/polarity leaf (this is where beginners let smoke out).
- No BOM or “what we will actually build.”
- ESC is listed but not “4-in-1 vs 4 separate.”
- GPS “optional” needs a decision: INAV GPS-hold kit vs Betaflight headless 5-inch.

---

## Unit 3 — Physics of drone

### Source bullets

Balance · Load · Weight limits

### How to structure into class

Do **not** rebuild Part 107 unit 7 (Loading and Performance). One stem, three leaves, then a pointer.

| Stem | Leaves |
|------|--------|
| Builder physics recap | Balance / CG on a quad (battery as the movable weight); load in a turn (why arms crack); AUW vs motor/prop thrust and the 55 lb / 250 g legal lines |

**Session:** 1 lecture. If the learner is in the 107 course, assign those leaves as required reading and use this period as a **kit weigh-in lab** (scale, CG check on the actual frame).

### Expansion points

- All-up weight (AUW) budget: camera, GPS, bigger battery vs hover thrust.
- Arm flex / mid-air breakup as the “load” story for builders (not the 107 load-factor chart).
- Battery position vs pitch/roll trim after maiden.

### Missing gaps

- Thrust-to-weight, hover current, and “will this even lift.”
- Motor/prop/battery matching (KV, pitch, cell count).
- Vibration / soft-mount vs crashed gyros (bridges to calibration in Unit 7).
- Source is three words with no examples — needs figures (scale photo, CG on a 5-inch, cracked arm).

**107 overlap:** Keep `u7` as canonical for exam language (load factor, CG vs CP). This unit is shop language only.

---

## Unit 4 — Laws of custom drones

### Source bullets

Registration · RID

### How to structure into class

One stem. Do not impersonate a 107 ground school.

| Stem | Leaves |
|------|--------|
| What changes when you built it | Registration (N-number / FAA DroneZone — **verify current FAA text before authoring**); Remote ID (standard vs broadcast module vs FRIA); 107 vs recreational 44809 — which path this class is flying under |

**Session:** 1 lecture + “which rule applies to *this* kit” worksheet. Teacher names the class operating authority before any outdoor flight.

### Expansion points

- Homebuilt / amateur-built vs commercial off-the-shelf: what Remote ID hardware the kit needs.
- Weight thresholds that change the legal picture (confirm against current FAA materials; do not invent numbers in published copy).
- School ops: teacher as RPIC, student as manipulator, COA / site permission — district legal, not student reading.

### Missing gaps

- 107 vs 44809 is not in the source; it is the actual fork for a custom quad.
- Airspace / LAANC / not flying over people — out of scope for a *build* course but required before Testing’s outdoor maiden.
- No “do not fly the lab quad at home until registered / RID equipped” closeout.

**107 overlap:** Unit 1 regs + RID stems in `faa-107` are canonical. Cross-link; one recap leaf here is enough.

---

## Unit 5 — Frame design

### Source bullets

Dependent on physics · Use CAD software with deformation estimation · Strength design · Mounting, room for parts

### How to structure into class

This is the first **unique** unit vs 107. Two stems: why frames fail, then CAD lab. Deformation analysis is an advanced elective — don’t make FEA a v1 gate.

| Stem | Leaves | Session |
|------|--------|---------|
| Strength and packaging | Loads on arms/body; material (CF vs nylon vs printed PETG); motor spacing vs prop size; stack height, camera, GPS mast, battery strap | Lecture |
| CAD for this kit | Coordinate system; motor holes; standoff pattern; keep-outs for RX/GPS; export for print or cut | Lab 1–2 periods |

**v1 default:** Students **modify** a teacher-provided CAD (move a GPS mount, thicken an arm), not design a 5-inch from blank. Full FEA is an honors extension.

### Expansion points

- Print vs carbon plate vs injection hybrid — cost, crash replaceability, classroom tooling.
- Stack hardware: 20 / 25.5 / 30.5 mm; why mixing them fails.
- Prop-to-arm clearance and motor-wire routing channels.
- Deformation / FEA as a **demo** (teacher shows one study) rather than a student competency.

### Missing gaps

- No named CAD tool (Fusion, Onshape, SolidWorks) or classroom license plan.
- No “we are not designing a new airframe in v1” scope limit — otherwise this unit eats the semester.
- No crash-replaceable parts list (which arm SKU, which printed mount).
- Mounting “room for parts” needs a real stack photo + keep-out drawing.

---

## Unit 6 — Assembly

### Source bullets

Battery connector to ESC · Motors to ESC · Motors to Frame · Receiver to FC · GPS to FC · FC to ESC to Frame · Receiver and GPS positioning · Propellers

### How to structure into class

Treat the source list as **topics**, not build order. Typical bench order is frame → motors → ESCs/4-in-1 → FC stack → RX/GPS → power leads → **software (Unit 7)** → **props last (Unit 8)**. Starting at “battery connector to ESC” puts live power too early.

| Stem | Leaves | Session |
|------|--------|---------|
| Mechanical | Motors to frame (rotation / CW-CCW); stack standoffs; straps, pads, zip ties | Lab 1 |
| Power and signal | ESC to motors; FC to ESC; XT60/capacitor; solder vs plugs | Lab 2 |
| Radio and GPS placement | RX antenna 90°; GPS away from VTX/ESC noise, arrow forward; magnetometer vs carbon | Lab 3 |
| Closeout (no props) | Strain relief, zip-tie plan, photo inspection checklist | End of lab 3 |

**Props leaf moves to Unit 8.** Mention prop direction here as a reading leaf only; physical install is a Testing gate.

**Session count:** 3–4 labs. Teacher demo of any high-current solder. Student checkpoint photos before the next stem.

### Expansion points

- Motor wire 90° vs 180°; heat-shrink vs connectors.
- Capacitor on XT60; why it exists.
- Stack sandwich order (FC, ESC, RX, VTX) and nylon vs aluminum standoffs (shorts).
- GPS mast vs folded-in GPS; carbon and mag interference.

### Missing gaps

- Build order is scrambled vs shop practice (power first, props in the same unit as wiring).
- No continuity / polarity check before first plug-in.
- No camera/VTX if FPV is in scope.
- No torque / thread-lock notes (motors vibrating out).
- No “do not connect battery until Unit 7 failsafe is set.”

---

## Unit 7 — Software setup

### Source bullets

Installation of Firmware (need modules for additional sensors) · Calibration (sensors, battery) · Enable receiver (UART2 usually) · Bind receiver (select protocol, enable telemetry) · Flight modes (arm, beeper for crash retrieval, will want angle or alt hold to begin) · Setting controller inputs (switch to arm, switch for flight mode, button for beeper)

### How to structure into class

This is a **props-off** config lab. UART2 / angle / beeper reads Betaflight; alt-hold reads INAV or ArduPilot. Split stems so the named stack can swap later.

| Stem | Leaves | Session |
|------|--------|---------|
| Flash and sensors | Firmware install; required sensor modules (baro/mag/GPS); accelerometer / gyro cal; battery voltage scale | Lab 1 |
| Radio | UART + protocol (CRSF vs others); bind; telemetry; arm / mode / beeper switches; **failsafe = drop or disarm, tested with props off** | Lab 1–2 |
| Modes for first flight | Angle as the v1 default; alt-hold only if the stack supports it; what “arm” means; beeper for retrieval | Lab 2 |

**Session:** 2 periods, every aircraft still prop-less. No motor-spin until Unit 8 bench test.

### Expansion points

- Blackbox / motor direction in configurator (dir-amends without resoldering).
- Rates: leave stock for v1; “don’t copy a YouTuber’s rates.”
- OSD / battery warning voltages.
- GPS: sat count, home arrow, failsafe RTH vs drop — only if INAV/Ardu.

### Missing gaps

- Firmware never named (Betaflight vs INAV vs ArduPilot).
- Failsafe is not in the source — must be a required leaf before any motor spin.
- Motor direction check is missing (wrong dir = flip on takeoff).
- UART2 “usually” needs a wiring diagram for **this** FC.
- Alt-hold without naming baro/INAV will strand teachers.
- No “save backup / dump settings” so a re-flash doesn’t wipe the lab period.

---

## Unit 8 — Testing and first flight

### Source bullets

*(heading only — no bullets)*

### How to structure into class

This is the empty hole in the source. Two stems: bench, then maiden. Outdoor maiden is optional if the school only has a netted cage.

| Stem | Leaves | Session |
|------|--------|---------|
| Bench (props off, then props on in a restraint) | Smoke test (plug in, no arm); motor spin in configurator; direction; props on in a fixture or with a spotter; range test; GPS sat lock if equipped | Lab 1 |
| Maiden | Angle-mode hover; beeper check; abort criteria; post-flight inspect (screws, burns, LiPo temp) | Lab 2 |

**Gate:** Unit 1 shop cert + Unit 7 failsafe demo signed off, or no props.

### Expansion points

- Tether / PVC hoop / netted cage for school maiden.
- Who is RPIC; student as manipulator only.
- Packed spare props, wrench, charged RX, fire can at the field.
- Short “what the crash taught us” debrief leaf (arm, solder joint, wrong motor dir).

### Missing gaps *(whole unit)*

- Smoke test, motor direction, prop install/direction, radio range, GPS lock, failsafe in the air, hover, abort, post-flight.
- No first-flight weather / site / bystander brief (keep short; point at 107 for airspace).
- No pass/fail checklist teachers can grade.

---

## Assessments (draft)

| When | Form | Notes |
|------|------|--------|
| After Unit 2 | Parts ID quiz | Photo of the class kit, 8–10 items |
| After Unit 4 | Operating-authority worksheet | 107 vs recreational; RID on *this* airframe — **verify FAA text** |
| After Unit 6 | Photo inspection rubric | Strain relief, antenna placement, no props |
| After Unit 7 | Failsafe + switch map | Teacher watches a props-off failsafe test |
| After Unit 8 | Maiden rubric | Abort criteria, not “did it fly pretty” |
| End of course | Optional written | Do **not** reuse the 107 question bank as if this were exam prep |

No question CSV yet. Do not run `scripts/build_unit_level_questions.py` against this folder.

---

## What this is not

- Not a fourth homepage track until Part 107 recordings and the Video / AI stubs are real.
- Not a kit SKU or purchasing guide.
- Not CAD-from-scratch or FEA certification.
- Not a substitute for Part 107 certification.

---

## Author next steps

1. Confirm the open decisions table (airframe, firmware, soldering, 107 cross-link).
2. Fill Unit 8 checklists and Unit 1 shop cert so labs can run.
3. Name the CAD tool and whether v1 is “modify teacher model” only.
4. Only then: BOM photos, leaf drafts at 150–350 words, then `drone_building_course.json` using string refs (`u1`…).
