# Drone building — course outline v3

**Status:** Consolidated outline as of Sep 8 2026. Merges Joe's v2 tables, his v3 answers, and the review decisions into one document that drafting works from. Decisions here are **locked** unless marked *open*. Rationale and history live in [`drone-building-course-review-v2.md`](drone-building-course-review-v2.md); do not repeat it here.

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
| **Base kit** | Flyer only: 3–3.5" guarded quad, minimal-solder, no GPS, no camera |
| **Video kit** | Base kit + stock CF frame + camera + VTX (+ optional goggles, optional GPS+mag). Feeds the Video & Photography course |
| **Minimal-solder** | Only the joints that cannot be plugs: motor leads to AIO pads (unless plugged), battery pigtail, capacitor. Joint count is a BOM field |
| **Tier A / Tier B** | CAD scope. A = modify/design small printed parts on a stock frame (Video kit or short-time schools). B = design printed structure from measured parts (Base kit) |
| **Print-and-ship** | Our service: teacher uploads class STLs at end of Unit 5; we print, QC, ship one batch |
| **Stock frame** | Known-good frame in every kit; the guaranteed flyer if a student design fails |
| **AUW** | All-up weight with battery. Target light (≈250 g) for cost and crash energy; soft cap, not a gate |
| **RPIC** | Remote Pilot in Command holding a Part 107 certificate. Teacher or paid employee, present on every flight day |
| **Part 107 path** | The class flies under Part 107: every aircraft registered regardless of weight, Remote ID broadcast module per aircraft, VLOS |
| **Smoke stopper** | Current-limiting plug between battery and aircraft for first power-on |
| **Failsafe** | Configured behavior on signal loss (drop/disarm). Must be demonstrated props-off before any motor spin |
| **Bench** | Props-off, then restrained-props checks before the first flight |
| **Ours / Joe** | Ownership tag. Joe = hardware, build steps, parts. Ours = everything else |

---

## 2. Locked decisions

| Area | Decision |
|------|----------|
| Airframe | 3–3.5" with prop guards |
| Firmware | Betaflight. Screenshots on **2026.6**; text says "2025.12 or newer" |
| Sensors | **Option A** for Base: gyro + accel, FC/AIO with barometer, **no GPS**. Video kit may add GPS + mag for hold modes and rescue |
| Kits | Base and Video. Video kit ships a CF frame |
| Soldering | Minimal-solder default; joint count published per kit |
| Weight | Light target ≈250 g, soft cap; weigh-in at Unit 5 and Unit 8 |
| Authority | Part 107 path; RPIC on every flight day; register all aircraft; RID broadcast module per aircraft |
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
- LiPo: handling, charging in a bag, storage voltage, puffing, heat, fire can, never unattended, disposal
- Tools and PPE: iron temperature, tip care, fume extraction, eye protection, hot-work zone
- Incident procedure: burn, cut, runaway motor, puffed or hot pack

**Session 2 — Bench rules (demo)**
- Props off until Unit 8 bench; where props live in the meantime
- Smoke stopper on every first power-on
- Arming discipline; arm / disarm / failsafe / unplug vocabulary
- Sign the **shop cert** (gate)

Teacher assets: cert checklist; per-unit safety briefs for Units 2–8.

### Unit 2 — Function of components (3 sessions) — *Joe parts, ours text*

**Stem A — Power train:** frame · motors (KV, size) · props (size, pitch, direction) · battery (cells, capacity, C) · ESC / AIO (4-in-1 vs AIO vs separate)
**Stem B — Brain and radio:** FC (gyro, accel, baro) · receiver and protocol · Remote ID module · connectors and polarity (XT30/XT60, JST, motor pads) · capacitor on the battery lead · antenna basics
**Stem C — Video kit parts:** camera · VTX · goggles/monitor · optional GPS + mag. *Tagged Video kit.*
**Lab:** parts ID on the real kit; kit BOM handout with AUW and solder-joint count.
**Quiz:** 8–10 photo items.

### Unit 3 — Laws for the custom drone (1 session) — *ours; RID module pick from Joe*

- Why this class flies under **Part 107** and what an RPIC is; the recreational path exists but is not ours (one sentence)
- **Registration:** every aircraft, regardless of weight, each device separately in FAADroneZone; fee; marking the aircraft
- **Remote ID:** what it broadcasts; broadcast module on a homebuilt; serial listed on that aircraft's registration; VLOS
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
- Printed plastics: PLA / PETG / nylon / TPU; layer adhesion; print orientation as a strength decision
- Carbon fiber: stiff, light, conductive, dusty when cut
- Hands-on: break a printed test bar in two orientations

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
**Design brief:** motor mount pattern · stack pattern (20 / 25.5 / 30.5 mm) · prop and guard clearance · battery envelope · RX/RID/GPS keep-outs · AUW budget from Unit 4 · which parts students may print (*open — Joe*) · which stay CF/aluminum (*open — Joe*)
**Tier B (Base kit):** design printed structure from measured components; critique every 2–3 sessions using the rubric (fit, strength, weight, serviceability); weigh-in checkpoint; STL turn-in
**Tier A (Video kit / short time):** design or modify camera cage, antenna mount, battery tray, guard rib on the stock CF frame
**Non-print schools:** stock frame in every kit; print-and-ship batch at end of unit; makerspace as fallback
**Grading:** completion checkpoints; optional class vote for extra credit. No FEA.

### Unit 6 — Assembly (3–4 sessions; +1 Video) — *Joe steps, ours safety and checks*

Opens with safety brief + live solder demo (if soldering).
1. **ESC/AIO to frame**, capacitor and battery pigtail (solder) — *step clip*
2. **Motors to frame**, leads to pads or plugs; note rotation direction; **no props** — *step clip*
3. **FC to stack**, FC↔ESC ribbon (plug) — *step clip*
4. **Receiver** on plug; antenna placement; **Remote ID module** mounted and powered — *step clip*
5. **Continuity/polarity check** with a multimeter → **smoke-stopper first power-on**; fix faults — *step clip*
6. **Video kit:** camera and VTX after essentials (+1 session) — *step clip*
7. Closeout: strain relief, nylon standoffs, zip-tie plan, photo checkpoint

Rules: no props; no motor spin until Unit 7 failsafe gate. Optional controller bind if FC is pre-flashed.

### Unit 7 — Software setup (3 sessions) — *ours text, Joe reviews; Betaflight 2026.6*

**Session 1 — Flash and sensors:** Configurator install · firmware flash · accel calibration · battery voltage scale and OSD warnings · save a settings dump (backup) — *step clips*
**Session 2 — Radio and safety:** receiver protocol and bind · telemetry · **motor direction and order** in the motors tab (props off) · arm switch · beeper switch · **failsafe set and demonstrated props-off (gate)** — *step clips*
**Session 3 — First-flight modes + registration:** Angle mode as the first-flight mode · conservative throttle curve · (*Video kit only*) GPS + mag setup, Altitude/Position Hold, GPS Rescue · then **register the aircraft and list the RID module serial** in FAADroneZone
Teacher may distribute a settings backup if time is short.

### Unit 8 — Testing and flight (10 sessions) — *ours checklists, Joe flight ops*

**Bench (gate)** — props off, then restrained props on:
smoke stopper → arm/disarm → motor spin and direction → failsafe demo → radio range walk → props on in a fixture or with a spotter → temperature log (Unit 4 heat)
**Maiden protocol:** RPIC present · Angle mode · hover only · abort criteria · spotter · netted cage or tether option · short flights · failure → back of the queue
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

| | Base | Video |
|--|------|-------|
| Frame | Student-designed printed structure on kit plate, or stock frame | Stock CF frame |
| FC / ESC | AIO with barometer, no GPS | Same, optional GPS + mag |
| Radio | RX on plug | Same |
| Remote ID | Broadcast module | Same |
| Video | — | Camera + VTX; goggles *open* |
| Solder joints | Minimal; count in BOM (*open — Joe*) | Same + camera/VTX if not plugged |
| AUW target | Light, ≈250 g soft cap (*open — Joe*) | Same |
| CAD tier | B | A |
| Hand-off | — | Video & Photography course |

---

## 8. Open items

| Item | Owner |
|------|-------|
| Two BOMs with AUW and solder-joint count | Joe |
| Tier B print scope (which structural parts students print) | Joe |
| Printed-part materials per part | Joe |
| Remote ID module that fits a 3–3.5" frame | Joe |
| Goggles/monitor in the Video kit | Joe |
| Print-and-ship service design (turnaround, cost, materials, failed-print policy) | Ours |
| Step-clip rendering vs one `video_url` per node | Ours (frontend) |
| Weather expanded leaf for non-107 students | Ours |

**Ready to draft now:** Units 1, 3, 4, 8; CAD fundamentals; Unit 7 generic leaves.
**Waits on BOMs:** Units 2, 6; Unit 5 design brief; Unit 7 screenshots.
**Payload/code:** after BOMs and after Part 107 P0 is published.
