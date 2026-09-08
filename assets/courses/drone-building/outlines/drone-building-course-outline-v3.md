# Drone building — course outline v3.1

**Status:** Consolidated outline as of Sep 8 2026 (v3.1, evening). Merges Joe's v2 tables, his v3 answers, his Sep 8 parts quote and frame/material/RID notes, and the review decisions into one document that drafting works from. Decisions here are **locked** unless marked *open*. Rationale and history live in [`drone-building-course-review-v2.md`](drone-building-course-review-v2.md); parts, weights, and costs live in [`../reference/parts-list-draft-v1.md`](../reference/parts-list-draft-v1.md). Do not repeat either here.

**v3.1 changes:** printed-frame scope (whole frame, hardware only bought), material call (PETG default), stack pattern 16×16, built-in ELRS RX, no OSD on the Base kit, GPS+mag part named for the Video kit, Remote ID modules shared across the class, reference parts list added.

**Not a payload.** No course JSON, questions, or homepage track yet. Part 107 remains P0.

**Iteration rule:** Joe edits hardware/build facts and pushes to `branch-joe`; we fold into this file and bump the version. Curriculum, safety, regs, assessments, and ops are ours.

---

## 1. Terms

| Term | Meaning in this course |
|------|------------------------|
| **Unit** | Top-level block (1–8). Has a session count, a safety brief, stems, and an assessment or checkpoint |
| **Stem** | Lesson group inside a unit; 3–6 leaves; one short intro video |
| **Leaf** | One reading page, 150–350 words, concept + example + figure; text-only unless marked *step clip* |
| **Session** | One class period, 45–60 min |
| **Lab** | A session where students work on hardware or CAD; always opens with the unit safety brief |
| **Step clip** | 1–2 min video of one bench or Configurator action, paired with a leaf. Used in Units 6–8 |
| **Gate** | A checkpoint that must be signed off before the next activity is allowed. Three are non-negotiable (§4) |
| **Checkpoint** | Completion evidence (photo, file, teacher tick) that earns points but does not block |
| **Base kit** | Flyer only: 3" guarded quad on a **student-printed frame**, minimal-solder, no GPS, no camera. Electronics: FC/ESC stack with built-in ELRS RX and barometer, 4 motors, 3S pack |
| **Video kit** | Same electronics + stock CF frame + DJI O4 Air Unit (camera and video link in one part). Optional GPS+mag module. Goggles shared per class. Feeds the Video & Photography course |
| **Minimal-solder** | Only the joints that cannot be plugs: motor leads to ESC pads (≈12, unless the ESC has motor plugs), battery pigtail (2), capacitor (2). RX and video link are plug-in. Joint count is a BOM field |
| **Tier A / Tier B** | CAD scope. A = modify/design small printed parts (guards, camera cage, mounts) on the stock CF frame (Video kit or short-time schools). B = design the **whole printed frame** from measured parts (Base kit) |
| **Print-and-ship** | Our service: teacher uploads class STLs at end of Unit 5; we print, QC, ship one batch |
| **Stock frame** | Known-good frame; the guaranteed flyer if a student design fails. Video kit: the CF frame. Base kit: our stock-frame STL, pre-printed for print-and-ship schools |
| **Frame material** | **PETG** default for student prints; PLA acceptable for a first iteration; ABS/ASA only on an enclosed, ventilated printer; nylon not for student prints; TPU for guards and bumpers |
| **AUW** | All-up weight with battery. Target light (≈250 g) for cost and crash energy; soft cap, not a gate |
| **RPIC** | Remote Pilot in Command holding a Part 107 certificate. Teacher or paid employee, present on every flight day |
| **Part 107 path** | The class flies under Part 107: every aircraft registered separately regardless of weight, Remote ID met with a broadcast module whose serial is listed on each aircraft's registration, VLOS |
| **RID module** | **Holy Stone HSRID** strap-on broadcast module (FAA accepted; own GPS and battery; 14–16 g; $40; no wiring to the FC). **Shared across the class:** one per aircraft airborne at a time, moved between registered aircraft. Must be charged before flight days |
| **Smoke stopper** | Current-limiting plug between battery and aircraft for first power-on |
| **Failsafe** | Configured behavior on signal loss (drop/disarm). Must be demonstrated props-off before any motor spin |
| **Bench** | Props-off, then restrained-props checks before the first flight |
| **Ours / Joe** | Ownership tag. Joe = hardware, build steps, parts. Ours = everything else |

---

## 2. Locked decisions

| Area | Decision |
|------|----------|
| Airframe | 3" with prop guards. Base: student-printed frame (whole structure; only bolts/nuts/standoffs bought — Joe flew a full PLA frame). Video: stock CF frame + printed guards |
| Frame material | PETG default; PLA for first prints; ABS/ASA only enclosed + ventilated; no nylon for students; TPU guards. Rationale and table in the parts list §3 |
| Firmware | Betaflight. Screenshots on **2026.6**; text says "2025.12 or newer" |
| Sensors | **Option A** for Base: gyro + accel + barometer on the FC, **no GPS**. Video kit may add the GPS+mag module (Option C) for hold modes and rescue |
| Reference electronics | 16×16 F4 stack with 20A 4-in-1 ESC, built-in ELRS 2.4 GHz RX and barometer; 4× 1404 motors; 1000 mAh 3S. Video adds DJI O4 Air Unit (plugs into the FC). Parts list is the reference, not a SKU |
| Kits | Base and Video. Video kit ships a CF frame and O4; goggles are a shared class set: **DJI Goggles N3 default** (glasses-friendly, phone mirror for the room), Goggles 3 as the RPIC upgrade. Options in the parts list §8 |
| Frame material choice | Schools may pick PLA / PETG / ASA for the Base frame. Same STL; the difference is a slicer-profile row and two model variables (`arm_thickness`, `hole_clearance`). ASA requires an enclosed, ventilated printer — a sales-qualification question, not a course change. Parts list §9 |
| Soldering | Minimal-solder default; ≈16 joints on Base (motors, pigtail, capacitor); RX and video are plug-in. Count confirmed per BOM |
| Weight | Light target ≈250 g, soft cap; weigh-in at Unit 5 and Unit 8. Estimates: Base ~230–250 g, Video ~245–265 g |
| Authority | Part 107 path; RPIC on every flight day; register every aircraft separately; RID module serial listed on each registration; modules shared, one per aircraft in the air |
| Regs | Taught in this course (Unit 3), built from `faa-107` `u1` leaves, cut to builder scope |
| Order | 1 Safety → 2 Components → 3 Laws → 4 Physics → 5 Design → 6 Assembly → 7 Software → 8 Testing. Physics sits directly before Design on purpose |
| Safety | Ours. 2 sessions + signed cert + a written brief opening every later unit |
| Battery content | Mechanics only (voltage, capacity, C, IR/sag, temperature, care). No electrochemistry; optional teacher note for chemistry class |
| CAD | Onshape default (free education plan, browser). Fusion/Tinkercad/school license acceptable. No school buys CAD |
| Video format | Lecture units: one 5–8 min intro per unit + text. Lab units: text + step clips |
| Edition | This is the **school edition** (~33–38 sessions). A compact edition shrinks only Units 5 and 8 later |

---

## 3. Course tree

| # | Unit | Sessions | Type | Assessment |
|---|------|---------:|------|------------|
| 1 | Safety | 2 | Lecture + demo | **Gate:** signed shop cert |
| 2 | Function of components | 3 | Lecture + parts lab | Quiz (photo ID, 8–10) |
| 3 | Laws for the custom drone | 1 | Lecture | Quiz |
| 4 | Physics for builders | 5–6 | Lecture + 3 hands-on | Quiz + AUW worksheet |
| 5 | Frame design | 5–10 (B) / 2–3 (A) | CAD lab | Checkpoints; critique rubric; weigh-in |
| 6 | Assembly | 3–4 (+1 Video) | Bench lab | Photo checkpoints; smoke-stopper power-on |
| 7 | Software setup | 3 | Config lab | **Gate:** failsafe demo props-off |
| 8 | Testing and flight | 10 | Bench + flight lab | **Gate:** bench checklist → maiden rubric (bulk of grade) |

---

## 4. Non-negotiable gates

1. **Shop cert** signed before Unit 6.
2. **Failsafe** set and demonstrated props-off before any motor spin.
3. **Bench checklist** passed before the first RPIC-queued flight.

---

## 5. Units

Each unit: stems → leaves (bullets) → labs/clips → checkpoint or gate → owner.

### Unit 1 — Safety (2 sessions) — *ours*

**Session 1 — Materials and tools**
- LiPo: handling, charging in a bag, storage voltage, puffing, heat, fire can, never unattended, disposal; the RID module and radio charge on the same routine (a flat module = no legal flight)
- Tools and PPE: iron temperature, tip care, fume extraction, eye protection, hot-work zone
- Incident procedure: burn, cut, runaway motor, puffed or hot pack

**Session 2 — Bench rules (demo)**
- Props off until Unit 8 bench; where props live in the meantime
- Smoke stopper on every first power-on
- Arming discipline; arm / disarm / failsafe / unplug vocabulary
- Sign the **shop cert** (gate)

Teacher assets: cert checklist; per-unit safety briefs for Units 2–8.

### Unit 2 — Function of components (3 sessions) — *Joe parts, ours text*

**Stem A — Power train:** frame (printed vs CF) · motors (KV, size; 1404 on 3S as the worked example) · props (size, pitch, direction) · battery (cells, capacity, C) · ESC (4-in-1 stack vs AIO vs separate)
**Stem B — Brain and radio:** FC (gyro, accel, baro) · receiver and protocol (ELRS built into the reference FC) · telemetry to the radio · Remote ID module (shared, strap-on) · connectors and polarity (XT30/XT60, SH1.0, ribbon, motor pads) · capacitor on the battery lead · antenna basics
**Stem C — Video kit parts:** DJI O4 Air Unit (camera + digital video link + onboard recording in one part) · goggles · optional GPS + mag module. *Tagged Video kit.*
**Lab:** parts ID on the real kit; kit BOM handout with AUW and solder-joint count (from the reference parts list once Joe confirms compatibility).
**Quiz:** 8–10 photo items.

### Unit 3 — Laws for the custom drone (1 session) — *ours; RID module pick from Joe*

- Why this class flies under **Part 107** and what an RPIC is; the recreational path exists but is not ours (one sentence)
- **Registration:** every aircraft, regardless of weight, each device separately in FAADroneZone; fee; marking the aircraft
- **Remote ID:** what it broadcasts; broadcast module on a homebuilt; the module serial is listed on each aircraft's registration; the class shares modules (one per aircraft in the air); the module must be on the FAA accepted list; VLOS
- **VLOS and goggles:** whoever flies in FPV goggles cannot see the aircraft unaided, so a **visual observer** is required for every FPV flight (107.31/107.33); line-of-sight Angle-mode flying needs none beyond the RPIC
- **Night and visibility:** anti-collision lighting if flying at dusk/night
- **Site brief:** airspace check, no flight over people, bystanders — short, link to `faa-107`
- **Do-not-fly-at-home** closeout until registered and RID-equipped
- **Quiz.** Registration/RID *action* happens in Unit 7 once the aircraft is real.

Source: `faa-107` `u1` registration/RID leaves. Link FAA pages; re-check at authoring time.

### Unit 4 — Physics for builders (5–6 sessions) — *ours, Joe reviews*

**Session 1 — Weather review + part placement**
- Weather: review leaf for 107 grads; expanded leaf for others (from `faa-107` `u5`/`u6`)
- Placement: CG and battery position; cable management; RX and antenna placement; what carbon does to signals

**Session 2 — Materials science**
- Stress vs strain; stiffness vs strength; fatigue from vibration and crashes
- Printed plastics: PLA / PETG / ABS-ASA / nylon / TPU — density, glass transition, toughness, printability (table in the parts list §3); why PETG is the class default and why a PLA frame that flies can still fail in a hot car; layer adhesion; print orientation as a strength decision
- Carbon fiber: stiff, light, conductive, dusty when cut
- Hands-on: break a printed test bar in two orientations; weigh identical test bars in two materials

**Session 3 — Heat transfer**
- Heat sources: I²R in motors, ESC FETs, wires, bad joints
- Heat paths: conduction into the plate, convection from prop wash (why ESCs sit under props); radiation negligible
- Consequences: motor demag, ESC throttling, hot LiPo after flight; iron thermal mass and dwell when soldering
- Hands-on: IR thermometer log after a bench spin (repeated in Unit 8)

**Sessions 4–5 — Drone power and battery mechanics**
- Thrust-to-weight and hover current from a real motor chart; KV / prop / cell-count matching
- Battery mechanics: cell voltage window, series cells, capacity vs C vs internal resistance, sag, energy vs power density, temperature, care; LiPo vs Li-ion as a use-case choice; one line that other chemistries exist. *Optional teacher note for chemistry class.*
- Hands-on: pack voltage before/after a bench run → Wh used

**Session 6 — Quiz + AUW worksheet** (students budget their own design)

### Unit 5 — Frame design (Tier B 5–10 / Tier A 2–3) — *ours brief and rubric; Joe scope and materials*

**CAD fundamentals (2 sessions, Tier B; optional Tier A):** sketch and constraints · extrude/cut · hole patterns · fillets · two-part assembly · calipers on a real part · export STL. Onshape default.
**Design brief:** motor mount **4× M2 on Ø9 mm** (Spark 1404, T-mount props) · **stack pattern 16×16 mm M2, ≥ 12.5 mm clear height** · 3" prop and guard clearance · battery envelope (XT30 3S pack, dims once Joe picks it; quoted 1000 mAh is 70 × 35 × 18 mm) · antenna / RID-module / GPS keep-outs · AUW budget from Unit 4 · **students may print the entire frame** (arms, plates, guards, tray); only bolts, nuts, and standoffs are bought · material per the Frame material decision (PETG default)
**Material profiles:** one slicer-settings table (nozzle, bed, enclosure, shrinkage %, walls, infill) with a row per material; stock frame and student frames carry `arm_thickness` and `hole_clearance` variables set from that row
**Tier B (Base kit):** design the whole printed frame from measured components; critique every 2–3 sessions using the rubric (fit, strength, weight, serviceability); weigh-in checkpoint; STL turn-in
**Tier A (Video kit / short time):** design or modify prop guards, O4 camera cage, antenna mount, battery tray, RID-module mount on the stock CF frame
**Non-print schools:** our stock-frame STL pre-printed and shipped with the Base kit; print-and-ship batch at end of unit; makerspace as fallback
**Grading:** completion checkpoints; optional class vote for extra credit. No FEA.

### Unit 6 — Assembly (3–4 sessions; +1 Video) — *Joe steps, ours safety and checks*

Opens with safety brief + live solder demo (if soldering).
1. **ESC to frame** (16×16 stack), capacitor and battery pigtail (solder) — *step clip*
2. **Motors to frame**, leads to ESC pads (or plugs); note rotation direction; **no props** — *step clip*
3. **FC to stack**, FC↔ESC ribbon (plug); ELRS antenna placement (RX is on the FC) — *step clip*
4. **Remote ID module** (HSRID) in its printed cradle or strapped to the top plate, GPS side up, clear of the ELRS and video antennas; check the broadcast LED — *step clip*
5. **Continuity/polarity check** with a multimeter → **smoke-stopper first power-on**; fix faults — *step clip*
6. **Video kit:** O4 Air Unit plugs into the FC; camera in its cage; optional GPS+mag module (+1 session) — *step clip*
7. Closeout: strain relief, nylon standoffs, zip-tie plan, photo checkpoint

Rules: no props; no motor spin until Unit 7 failsafe gate. Optional controller bind if FC is pre-flashed.

### Unit 7 — Software setup (3 sessions) — *ours text, Joe reviews; Betaflight 2026.6*

**Session 1 — Flash and sensors:** Configurator install · firmware flash · accel calibration · barometer check · battery voltage scale · low-voltage warnings via **ELRS telemetry on the radio and beeper** (the Base FC has no OSD; Video kit adds OSD in the goggles) · save a settings dump (backup) — *step clips*
**Session 2 — Radio and safety:** ELRS bind (binding phrase, RX built into the FC) · telemetry · **motor direction and order** in the motors tab (props off) · arm switch · beeper switch · **failsafe set and demonstrated props-off (gate)** — *step clips*
**Session 3 — First-flight modes + registration:** Angle mode as the first-flight mode · conservative throttle curve · (*Video kit only*) GPS + mag setup, Altitude/Position Hold, GPS Rescue · then **register the aircraft and list the RID module serial** in FAADroneZone
Teacher may distribute a settings backup if time is short.

### Unit 8 — Testing and flight (10 sessions) — *ours checklists, Joe flight ops*

**Bench (gate)** — props off, then restrained props on:
smoke stopper → arm/disarm → motor spin and direction → failsafe demo → radio range walk → RID module charged, fitted to *this* aircraft, broadcasting → props on in a fixture or with a spotter → temperature log (Unit 4 heat)
**Maiden protocol:** RPIC present · Angle mode · line of sight, no goggles · hover only · abort criteria · spotter · netted cage or tether option · short flights · failure → back of the queue
**FPV flights (Video kit, after the maiden):** pilot in goggles · **visual observer assigned** and named on the checklist · class watches the goggles' phone mirror on the room display
**Post-flight:** screws, motor heat, joints, LiPo temperature, guard damage → debrief leaf (what the failure taught) → CAD or software iteration
**Ops:** flights limited by RPIC count; software mods while others fly; dedicated physical-mod days; stock frames on standby
**Grading:** bench checklist + maiden rubric = bulk of the course grade. Optional speed / lift contests.

---

## 6. Assessments

| When | Form | Notes |
|------|------|-------|
| Unit 1 | Signed shop cert | Gate |
| Unit 2 | Photo ID quiz | 8–10 items on the real kit |
| Unit 3 | Regs quiz | Builder-scoped items from `faa-107`, re-tagged |
| Unit 4 | Physics quiz + AUW worksheet | Charts allowed |
| Unit 5 | Checkpoints + critique rubric + weigh-in | Completion grade |
| Unit 6 | Photo checkpoints + smoke-stopper power-on | Completion + safety |
| Unit 7 | Failsafe demo + switch map | Gate |
| Unit 8 | Bench checklist → maiden rubric | Largest grade |

No question CSV yet. Do not run the question build scripts against this folder.

---

## 7. Kits (reference, not SKUs)

Full parts, weights, and costs: [`../reference/parts-list-draft-v1.md`](../reference/parts-list-draft-v1.md).

| | Base | Video |
|--|------|-------|
| Frame | **Student-printed whole frame** (PETG default) + hardware pack; our stock-frame STL as the fallback | Stock CF frame + printed guards. *Frame choice reopened:* the quoted QAV-S Mini has 12×12 arms (motor is Ø9) and a 19 mm cam cage (O4 needs an adapter) — Joe to pick adapters or a 1404/O4-native frame |
| FC / ESC | 16×16 F4 stack, 20A 4-in-1, barometer on FC, **no GPS** | Same; optional GPS + mag module |
| Motors / battery | 4× 1404 4000KV · 1000 mAh 3S | Same |
| Radio | ELRS RX built into the FC; radio per team | Same |
| Remote ID | Holy Stone HSRID, $40, **shared class set** (one per aircraft airborne) | Same |
| Video | — | DJI O4 Air Unit (plugs into FC); class goggles set: N3 default ($229), Goggles 3 for the RPIC |
| Solder joints | **16** (motors 12, pigtail 2, capacitor 2) — confirmed from the ESC pad map | 16; O4 plugs in (0); GPS option +6 |
| AUW estimate | ~230 g (*Joe to weigh*) | ~245 g, ~253 g with GPS (*Joe to weigh*) |
| Connector | **XT30** (pigtail ships with the stack); quoted XT60 pack to be swapped | Same |
| Per-aircraft cost (list, approx.) | ~$185 | ~$365–385 |
| CAD tier | B | A |
| Hand-off | — | Video & Photography course |

---

## 8. Open items

| Item | Owner | Status |
|------|-------|--------|
| ~~Two BOMs~~ → reference parts list exists; **confirm compatibility, weigh one Base and one Video build, count joints** | Joe | Parts list §7 |
| ~~Tier B print scope~~ | Joe | **Closed:** whole frame printable; hardware only bought |
| ~~Printed-part materials~~ | Joe → ours | **Closed:** PETG default; table in parts list §3 |
| ~~Remote ID module~~ → **Holy Stone HSRID** (Amazon B0CGTTNJXL); confirm which HSRID model ships and its FAA DOC entry at purchase | Ours at purchase | **Closed** (Sep 8 PM) |
| ~~Goggles model~~ → N3 default, Goggles 3 upgrade; tiers in parts list §8 | Ours | **Closed** (Sep 8 PM) |
| ~~Compatibility pass~~ → desk-checked Sep 8 from manufacturer diagrams (parts list §7.1). Motor Ø9 T-mount, ESC pads (16 joints), O4 plug on UART3, GPS pads (+6), stack 12.5 mm, battery 70×35×18 / 81 g, target `FLYWOOF405NANO` | Ours | **Closed** |
| **Joe's picks from the desk check:** motor KV on 3S (4000 vs 4500–5000), XT30 3S pack (stack ships XT30; quoted pack is XT60), Video-kit frame (QAV-S Mini needs 12→9 motor and 14→20 camera adapters, or pick a 1404/O4-native frame), GPS power pad, prop model (parts list §7.1b) | Joe | Open; design brief and Video BOM need them |
| In-person checks: capacitor value, motor lead ends, Setup-tab alignment on first flash (issue #1064), CF standoff height, battery fit (parts list §7.1c) | Joe | Open; with hardware in hand |
| Material profiles table + `arm_thickness` / `hole_clearance` variables in the stock frame | Ours + Joe's model | Open |
| VO requirement on the Unit 8 FPV checklist | Ours | Added to outline; write into the checklist |
| Confirm same RID serial on several Part 107 registrations at first class registration | Ours | Open; FAA flow supports it |
| Print-and-ship service design (turnaround, cost, materials, failed-print policy) | Ours | Open |
| Step-clip rendering vs one `video_url` per node | Ours (frontend) | Open |
| Weather expanded leaf for non-107 students | Ours | Open |

**Ready to draft now:** Units 1, 3, 4, 8; Unit 2 text (parts are named); CAD fundamentals; Unit 5 brief with *verify* placeholders; Unit 6 step list; Unit 7 leaves.
**Waits on Joe's confirmation:** Unit 2 photos and quiz images; final numbers in the Unit 5 brief; Unit 7 screenshots on the real FC.
**Payload/code:** after confirmation and after Part 107 P0 is published.
