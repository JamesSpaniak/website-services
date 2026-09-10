# Drone building — course outline v3.2

**Status:** Consolidated outline as of Sep 9 2026 (v3.2). Merges Joe's v2 tables, his v3 answers, his Sep 8 and Sep 9 parts lists, and the review decisions into one document that drafting works from. Decisions here are **locked** unless marked *open*. Rationale and history live in [`drone-building-course-review-v2.md`](drone-building-course-review-v2.md); parts, weights, and costs live in [`../reference/parts-list-draft-v2.md`](../reference/parts-list-draft-v2.md) (materials, goggles, and module rules stay in [v1](../reference/parts-list-draft-v1.md)). Do not repeat either here.

**v3.2 changes (Sep 9, Joe's second list):** 3.5" props; 20×20 F722 stack with plug sockets and a separate ELRS receiver; **BeeID = GPS + Remote ID per aircraft** (replaces the shared strap-on and the "no GPS on Base" line); XT60 standard; PLA prototype → PETG final; **two SKUs, Solder and Pre-soldered**; Video-kit frame reopened (Tony 5 is a 5" frame).
**v3.1 changes:** printed-frame scope (whole frame, hardware only bought), material call (PETG default), Remote ID module pick, reference parts list added.

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
| **Base kit** | Flyer only: 3.5" guarded quad on a **student-printed frame**, no camera. Electronics: 20×20 F722 stack (baro, OSD, plug sockets), ELRS receiver, BeeID GPS + Remote ID, 4× 1404, 3S XT60 pack |
| **Video kit** | Same electronics + stock CF frame + DJI O4 Air Unit (camera and video link in one part). Optional compass module. Goggles shared per class. Feeds the Video & Photography course |
| **Solder / Pre-soldered SKU** | Same parts, two builds. *Solder:* students make the 16 ESC joints (motors 12, pigtail 2, capacitor 2) and the receiver end. *Pre-soldered:* we ship the ESC + motor harness and receiver terminated; students bolt, plug, and route; soldering becomes an optional practice-board lab |
| **Minimal-solder** | The design goal: everything that can be a plug is a plug (receiver, GPS/RID, video). On a 3–3.5" build motors and battery stay pads; plug-and-play boards exist only ≤ 2" |
| **Tier A / Tier B** | CAD scope. A = modify/design small printed parts (guards, camera cage, mounts) on the stock CF frame (Video kit or short-time schools). B = design the **whole printed frame** from measured parts (Base kit) |
| **Print-and-ship** | Our service: teacher uploads class STLs at end of Unit 5; we print, QC, ship one batch |
| **Stock frame** | Known-good frame; the guaranteed flyer if a student design fails. Video kit: the CF frame. Base kit: our stock-frame STL, pre-printed for print-and-ship schools |
| **Frame material** | **PLA for prototypes, PETG for the final print** (same STL, similar settings); ABS/ASA only on an enclosed, ventilated printer; nylon not for student prints; TPU for guards and bumpers |
| **AUW** | All-up weight with battery. Target light (≈250 g) for cost and crash energy; soft cap, not a gate |
| **RPIC** | Remote Pilot in Command holding a Part 107 certificate. Teacher or paid employee, present on every flight day |
| **Part 107 path** | The class flies under Part 107: every aircraft registered separately regardless of weight, Remote ID met with a broadcast module whose serial is listed on each aircraft's registration, VLOS |
| **RID module** | **NewBeeDrone BeeID V1.1** (FAA DOC RID000001995): GPS + Remote ID broadcaster in one 5 g module, **one per aircraft**, powered from the FC, plugs into the GPS socket; serial read from its WiFi setup page. No battery to charge, nothing to move between aircraft. (The shared Holy Stone strap-on from v3.1 is the fallback if BeeID is unavailable) |
| **Smoke stopper** | Current-limiting plug between battery and aircraft for first power-on |
| **Failsafe** | Configured behavior on signal loss (drop/disarm). Must be demonstrated props-off before any motor spin |
| **Bench** | Props-off, then restrained-props checks before the first flight |
| **Ours / Joe** | Ownership tag. Joe = hardware, build steps, parts. Ours = everything else |

---

## 2. Locked decisions

| Area | Decision |
|------|----------|
| Airframe | **3.5"** with prop guards. Base: student-printed frame (whole structure; only bolts/nuts/standoffs bought — Joe flew a full PLA frame). Video: stock CF frame + printed guards (*frame open*: must take 20×20 stack, 12×12 motors, standard-O4 camera; parts list v2 §4) |
| Frame material | PLA prototype → **PETG final**; ABS/ASA only enclosed + ventilated; no nylon for students; TPU guards. Table in parts list v1 §3 |
| Firmware | Betaflight. Screenshots on **2026.6**; text says "2025.12 or newer". Target `FLYWOOF722PROV2` |
| Sensors | Gyro + accel + **barometer** on the FC; **GPS on every aircraft** (it comes with the BeeID Remote ID module); **no compass** by default. Base teaches Angle mode only; GPS Rescue may be configured as a safety net; hold modes are not taught on Base. Video kit may add a compass (BeeID Pro) for Position Hold |
| Reference electronics | **Flywoo GOKU F722 Mini V2 20×20 45 A stack** (baro, OSD, plug sockets for RX / GPS / DJI), **BetaFPV ELRS Nano RX** (or a plug-terminated equivalent), **NewBeeDrone BeeID** GPS + RID, **4× XILO 1404 4500KV** (12×12, T-mount), **Gemfan 3525** props, 3S XT60 pack. Video adds DJI O4 Air Unit (plugs into the FC). Parts list v2 is the reference, not a SKU |
| Kits | Base and Video, each in **Solder** and **Pre-soldered** SKUs. Video kit ships a CF frame and O4; goggles are a shared class set: **DJI Goggles N3 default** (glasses-friendly, phone mirror to the room display — this is how the teacher watches; no monitor path exists), Goggles 3 as the RPIC upgrade. Options in parts list v1 §8 |
| Frame material choice | Schools may pick PLA / PETG / ASA for the Base frame. Same STL; the difference is a slicer-profile row and two model variables (`arm_thickness`, `hole_clearance`). ASA requires an enclosed, ventilated printer — a sales-qualification question, not a course change. Parts list v1 §9 |
| Soldering | **16 joints on the ESC** (motors 12, pigtail 2, capacitor 2) + 0–4 at the receiver; GPS/RID and video are plug-in. Solder SKU: students do them. Pre-soldered SKU: shipped done. Research: required soldering excludes ~50–70 % of school buying units, ~20–35 % of the CTE core (parts list v2 §3) |
| Connector | **XT60** class-wide (stack pigtail and charger are XT60); packs must be XT60, no in-flight adapters |
| Weight | Light target ≈250 g, soft cap; weigh-in at Unit 5 and Unit 8. Estimates: Base ~240 g, Video ~245–255 g |
| Authority | Part 107 path; RPIC on every flight day; register every aircraft separately; each aircraft's BeeID serial listed on its registration |
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
- LiPo: handling, charging in a bag, storage voltage, puffing, heat, fire can, never unattended, disposal; radios and goggles charge on the same routine (the RID module is FC-powered — no battery)
- Tools and PPE: iron temperature, tip care, fume extraction, eye protection, hot-work zone
- Incident procedure: burn, cut, runaway motor, puffed or hot pack

**Session 2 — Bench rules (demo)**
- Props off until Unit 8 bench; where props live in the meantime
- Smoke stopper on every first power-on
- Arming discipline; arm / disarm / failsafe / unplug vocabulary
- Sign the **shop cert** (gate)

Teacher assets: cert checklist; per-unit safety briefs for Units 2–8.

### Unit 2 — Function of components (3 sessions) — *Joe parts, ours text*

**Stem A — Power train:** frame (printed vs CF) · motors (KV, size; 1404 4500KV on 3S as the worked example) · props (3.5", pitch, direction, T-mount) · battery (cells, capacity, C, XT60) · ESC (4-in-1 stack vs AIO vs separate; AM32)
**Stem B — Brain and radio:** FC (gyro, accel, baro, OSD chip) · receiver and protocol (ELRS, separate nano RX on a plug) · telemetry to the radio · **BeeID: GPS and Remote ID in one module** (what each half does; why it is per aircraft) · connectors and polarity (XT60, SH1.0 plugs, ribbon, motor pads) · capacitor on the battery lead · antenna basics
**Stem C — Video kit parts:** DJI O4 Air Unit (camera + digital video link + onboard recording in one part) · goggles · optional compass module. *Tagged Video kit.*
**Lab:** parts ID on the real kit; kit BOM handout with AUW and solder-joint count (from the reference parts list once Joe confirms compatibility).
**Quiz:** 8–10 photo items.

### Unit 3 — Laws for the custom drone (1 session) — *ours; RID module pick from Joe*

- Why this class flies under **Part 107** and what an RPIC is; the recreational path exists but is not ours (one sentence)
- **Registration:** every aircraft, regardless of weight, each device separately in FAADroneZone; fee; marking the aircraft
- **Remote ID:** what it broadcasts; broadcast module on a homebuilt; one BeeID per aircraft, its serial (from the module's setup page) listed on that aircraft's registration; the module must be on the FAA accepted list (BeeID: DOC RID000001995); the module only broadcasts while the aircraft is powered; VLOS
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
**Design brief:** motor mount **12×12 mm 4× M2** (XILO 1404, T-mount props, 150 mm leads) · **stack pattern 20×20 mm M2, ≥ 16 mm clear height** · 3.5" prop and guard clearance · battery envelope (XT60 3S pack, dims once Joe names it) · **BeeID pocket 22 × 16 × 8 mm on the top plate with sky view** · RX T-antenna mount · keep-outs · AUW budget from Unit 4 · **students may print the entire frame** (arms, plates, guards, tray); only bolts, nuts, and standoffs are bought · material per the Frame material decision (PETG default)
**Material profiles:** one slicer-settings table (nozzle, bed, enclosure, shrinkage %, walls, infill) with a row per material; stock frame and student frames carry `arm_thickness` and `hole_clearance` variables set from that row
**Tier B (Base kit):** design the whole printed frame from measured components; critique every 2–3 sessions using the rubric (fit, strength, weight, serviceability); weigh-in checkpoint; STL turn-in
**Tier A (Video kit / short time):** design or modify prop guards, O4 camera cage, antenna mount, battery tray, RID-module mount on the stock CF frame
**Non-print schools:** our stock-frame STL pre-printed and shipped with the Base kit; print-and-ship batch at end of unit; makerspace as fallback
**Grading:** completion checkpoints; optional class vote for extra credit. No FEA.

### Unit 6 — Assembly (3–4 sessions; +1 Video) — *Joe steps, ours safety and checks*

Opens with safety brief + live solder demo (Solder SKU). Pre-soldered SKU skips the solder steps in 1–2 and receives the ESC + motor harness assembled.
1. **ESC to frame** (20×20 stack), capacitor and XT60 pigtail (solder) — *step clip*
2. **Motors to frame**, leads to ESC pads; note rotation direction; **no props** — *step clip*
3. **FC to stack**, FC↔ESC 8-pin cable (plug) — *step clip*
4. **Receiver** on the RX socket (UART2), T-antenna mounted; **BeeID** on the GPS socket (UART5), seated in its pocket with sky view, clear of the antennas — *step clip*
5. **Continuity/polarity check** with a multimeter → **smoke-stopper first power-on**; BeeID LED and RX LED — *step clip*
6. **Video kit:** O4 Air Unit on the DJI socket (UART3); camera in its plates; optional compass module (+1 session) — *step clip*
7. Closeout: strain relief, nylon standoffs, zip-tie plan, photo checkpoint

Rules: no props; no motor spin until Unit 7 failsafe gate. Optional controller bind if FC is pre-flashed.

### Unit 7 — Software setup (3 sessions) — *ours text, Joe reviews; Betaflight 2026.6*

**Session 1 — Flash and sensors:** Configurator install · flash `FLYWOOF722PROV2` (not the older PRO target — baro goes missing) · accel calibration · barometer check · **GPS on UART5 at 115200, sat count** · battery voltage scale · low-voltage warnings via **ELRS telemetry on the radio and beeper** (Base has no camera, so no on-screen OSD; Video kit sees OSD in the goggles) · save a settings dump via CLI (backup) — *step clips*
**Session 2 — Radio and safety:** ELRS bind (binding phrase; RX on UART2) · telemetry · **motor direction and order** in the motors tab (props off) · arm switch · beeper switch · **failsafe set and demonstrated props-off (gate)** · GPS Rescue configured as a safety net, not a flight mode — *step clips*
**Session 3 — First-flight modes + registration:** Angle mode as the first-flight mode · conservative throttle curve · (*Video kit only, with compass*) Position Hold · then **BeeID setup page: aircraft weight, read the serial → register the aircraft and list that serial** in FAADroneZone
Teacher may distribute a settings backup if time is short.

### Unit 8 — Testing and flight (10 sessions) — *ours checklists, Joe flight ops*

**Bench (gate)** — props off, then restrained props on:
smoke stopper → arm/disarm → motor spin and direction → failsafe demo → radio range walk → BeeID broadcasting (LED; Drone Scanner app optional) and GPS lock → props on in a fixture or with a spotter → temperature log (Unit 4 heat)
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

Full parts, weights, and costs: [`../reference/parts-list-draft-v2.md`](../reference/parts-list-draft-v2.md).

| | Base | Video |
|--|------|-------|
| Frame | **Student-printed whole frame** (PLA prototype, PETG final) + hardware pack and strap; our stock-frame STL as the fallback | Stock CF 3.5" frame + printed guards. *Open:* must take 20×20 stack, 12×12 motors, standard-O4 camera (Tony 5 is a 5" frame — rejected) |
| FC / ESC | Flywoo GOKU F722 Mini V2 20×20, 45 A AM32, baro + OSD, plug sockets | Same |
| Receiver | BetaFPV ELRS Nano (or plug-terminated equivalent) on the RX socket | Same |
| GPS + Remote ID | **NewBeeDrone BeeID**, one per aircraft, on the GPS socket | Same; optional BeeID Pro / compass |
| Motors / props / battery | 4× XILO 1404 4500KV · Gemfan 3525 · 3S XT60 pack (Joe to name) | Same |
| Video | — | DJI O4 Air Unit on the DJI socket; class goggles set: N3 default ($230), Goggles 3 for the RPIC |
| Solder joints | **16 on the ESC** + 0–4 at the RX (Solder SKU); **0 for students** (Pre-soldered SKU) | Same; O4 0; BeeID 0 |
| AUW estimate | ~240 g (*Joe to weigh*) | ~245–255 g (*Joe to weigh*) |
| Per-aircraft cost (list, approx.) | ~$280 | ~$460 |
| CAD tier | B | A |
| Hand-off | — | Video & Photography course |

---

## 8. Open items

| Item | Owner | Status |
|------|-------|--------|
| ~~Two BOMs~~ → **parts list v2** (Joe, Sep 9), desk-checked | Joe → ours | **Closed** for parts; frame and battery open below |
| ~~Tier B print scope~~ | Joe | **Closed:** whole frame printable; hardware only bought |
| ~~Printed-part materials~~ | Joe → ours | **Closed:** PLA prototype, PETG final; table in parts list v1 §3 |
| ~~Remote ID module~~ → **BeeID per aircraft** (FAA DOC RID000001995), replaces the shared Holy Stone | Joe → ours | **Closed** (Sep 9) |
| ~~Goggles model~~ → N3 default, Goggles 3 upgrade; teacher view = phone mirror to the room display | Ours | **Closed** |
| ~~Compatibility pass v1~~ (Sep 8) and ~~v2~~ (Sep 9): stack sockets, target, BeeID DOC, motor 12×12 T-mount, props, RX pads — parts list v2 §1 | Ours | **Closed** |
| **Video-kit 3.5" frame** — Tony 5 is a 5" frame; need 20×20 stack, 12×12 motors, standard-O4 camera plates, top battery, ≤ 65 g (parts list v2 §4); shortlist 2–3 | Joe | Open; blocks the Video BOM |
| **Battery** — product name, 3S, mAh, dims, **XT60**; smoke stopper and adapter names (or drop the adapter) | Joe | Open; blocks the design-brief tray |
| **Receiver** — one that ships with the FC's 4-pin plug, or accept 4 joints at the RX end | Joe | Open |
| **Pre-soldered SKU** — labor time per kit, price (+$25–40), who solders (us or vendor) | Ours | Open; parts list v2 §3 |
| In-person checks: BeeID harness pitch vs GPS socket, RX socket pitch, socket cables in the box, capacitor value, Setup-tab alignment on first flash, battery fit | Joe | Open; with hardware in hand |
| Material profiles table + `arm_thickness` / `hole_clearance` variables in the stock frame | Ours + Joe's model | Open |
| VO requirement on the Unit 8 FPV checklist | Ours | Added to outline; write into the checklist |
| Fleet registration workflow: one Part 107 account, per-aircraft entries with BeeID serials | Ours (Unit 3) | Open |
| Print-and-ship service design (turnaround, cost, materials, failed-print policy) | Ours | Open |
| Step-clip rendering vs one `video_url` per node | Ours (frontend) | Open |
| Weather expanded leaf for non-107 students | Ours | Open |

**Ready to draft now:** Units 1, 3, 4, 8; Unit 2 text (parts are named); CAD fundamentals; Unit 5 brief (battery tray dims pending); Unit 6 step list for both SKUs; Unit 7 leaves against the F722 Mini V2.
**Waits on Joe:** Video-kit frame, battery, receiver pick; then Unit 2 photos and quiz images, final Unit 5 numbers, Unit 7 screenshots on the real FC.
**Payload/code:** after confirmation and after Part 107 P0 is published.
