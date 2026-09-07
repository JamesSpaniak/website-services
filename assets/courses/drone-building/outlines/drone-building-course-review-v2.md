# Drone building course — v2 review

**Status:** Review of Joe's Sep 6 2026 feedback. **Source of truth for v2 is [`joe-drone-build-feedback-v2.md`](joe-drone-build-feedback-v2.md)** (verbatim copy of `docs/building/Drone Build Feedback.md` from `origin/branch-joe`, commits `05642b2` + `512c701`). The v1 draft ([`drone-building-course-draft.md`](drone-building-course-draft.md)) is kept for history and is superseded where the two disagree.

**Not a payload.** No course JSON, questions, images, or homepage track come from this folder yet. Part 107 recordings remain P0 ([`docs/TODO.md`](../../../../docs/TODO.md)).

**How to use:** Joe reads §2–§5, answers the questions in §9, and pushes v3 to `branch-joe`. We fold the answers back here. Once §8 is clear, authoring of 150–350 word leaves starts.

---

## 1. Version history

| Version | File | Author | Date | What it is |
|---------|------|--------|------|------------|
| v0 | [`joe-drone-building-outline.txt`](joe-drone-building-outline.txt) | Joe (`dd4ce7f`) | Aug 5 2026 | 44-line topic list, 7 headings, Testing empty |
| v1 | [`drone-building-course-draft.md`](drone-building-course-draft.md) | Drone Edge (`7c3579e`) | Sep 1 2026 | Our expansion: Safety unit, stems/leaves, gaps, ~15-period mini-course |
| **v2** | [`joe-drone-build-feedback-v2.md`](joe-drone-build-feedback-v2.md) | Joe (`05642b2`, `512c701`) | Sep 6 2026 | Answers all six open decisions, per-unit session tables, assessments |
| v2 review | this file | Drone Edge | Sep 7 2026 | Section review, technical value, additions, recommendations |

Branch facts (Sep 7): `origin/branch-joe` is 3 commits ahead of `origin/main` and only touches `docs/building/`. Our folder `assets/courses/drone-building/` is on `main` via PR #1. Joe's v0 `.txt` is unchanged; it still lists GPS as optional and starts Assembly at the battery connector, which v2 supersedes.

---

## 2. Decisions locked in v2

| Decision | v1 default | Joe v2 | Our read | Recommendation |
|----------|-----------|--------|----------|----------------|
| Airframe | 5-inch or guarded trainer | **3–3.5 inch, prop guards** (more CAD work) | Right size for a classroom: cheaper crashes, guards are a legitimate design surface | **Lock.** Weigh a reference build with battery early — a guarded 3–3.5" often lands near or above 250 g, which decides registration and Remote ID for every student aircraft |
| Firmware | Betaflight, or INAV if alt-hold | **Betaflight**; GPS hold now exists | Correct for angle-mode first flights. Position/altitude hold in Betaflight is recent and needs baro + GPS on the FC | **Lock Betaflight, pin the version**, and test hold modes on the actual kit FC before promising them in a leaf. If GPS is not in the kit, drop hold modes from v1 content |
| Soldering | Teacher-solder or full lab | Students **should** solder; no-solder kits cost more but are reusable | Agree on learning value; the buyer objection is real | **Ship two assembly tracks** in the same unit: *Solder* (default) and *Plug-in* (school opts out). Same leaves, different lab steps |
| 107 overlap | Cross-link 107 | Cover regs **here**; not all students take 107. Reuse 107 slides/quizzes, keep FAA links current | Agree. Builder regs unit is thin but must stand alone | Build the unit from `faa-107` `u1` registration/RID leaves, cut to builder scope. Do not fork the wording — link the source leaf id so updates flow once |
| Hardware | Course-owned kit BOM | Curated kits possible, expensive; no-solder reusable | Still commercial, not curricular | Publish a **reference BOM** (parts list, not a SKU) with the Components unit so schools can BYO or buy |
| Video | One 6–10 min per stem | **Text + 1–2 min per step**, mixed format | Better for a lab course; more recordings but each is retakeable | Adopt for Assembly/Software/Testing. Keep one 5–8 min intro per unit for lecture units. Note: today's course UI renders one `video_url` per node, so step clips mean one node per step or a content-block gallery — check with frontend before authoring |

---

## 3. Course shape and pacing

Joe's tree is a **CTE semester lab** (~31–36+ periods). v1 was a **quarter mini-course** (~15). He also moved **Laws before Physics**.

| # | Unit | v1 sessions | Joe v2 | Delta | Where it goes |
|---|------|------------:|-------:|-------|---------------|
| 1 | Safety | 2 | 1 | Cut; workshop rules deferred to school | See §4.1 — we keep a gate |
| 2 | Function of components | 2 | 3 | + optional parts session | Accept |
| 3 | Laws | 1 | 1 | Swapped ahead of Physics; adds night lighting | Accept order |
| 4 | Physics | 1 | 5 | + weather, placement, materials, power | Accept 5–6; weather becomes a review leaf, add materials / heat / battery science (§4.4) |
| 5 | Frame design | 2–3 | 5–10 | From-scratch CAD, critiques every 2–3 days | Accept as CTE; add CAD fundamentals + two tiers + non-print path (§4.5) |
| 6 | Assembly | 3–4 | 3+ | Smoke-stopper power-on inside assembly | Accept sequence; add checks (§4.6) |
| 7 | Software | 2 | 3 | + registration/RID session at end | Accept 3; fix content (§4.7) |
| 8 | Testing | 2 | 10 | RPIC-queued flights + iteration | Accept as CTE; add bench gate (§4.8) |

**Recommendation:** treat Joe's tree as the **school edition**. For a retail track, define a **compact edition** later by shrinking only Units 5 and 8 (teacher starter CAD, 2 test days) — everything else is shared. Do not price or stub either until Part 107 is done.

---

## 4. Section-by-section review

Each section: what v2 has → technical value → add → recommendation.

### 4.1 Unit 1 — Safety (1 session)

**v2 has:** Workshop safety "not covered by course, given by school"; tools (iron, screwdriver); LiPo handling, charging, heat, keep secluded until needed. Unit-specific safety repeated at the start of each later unit.

**Technical value:** Medium. LiPo handling and iron use are correct and necessary. Deferring general shop rules to the school is reasonable for CTE shops that already have them.

**Add:**
- **Props-off rule** stated once here and enforced as a gate: no propellers until Unit 8 bench.
- **Arming and failsafe vocabulary** (arm / disarm / failsafe / unplug) so Units 7–8 have shared words.
- **Smoke stopper and fire can** as named bench items (Joe uses the smoke stopper in Assembly; introduce it here).
- **Incident procedure** (burn, cut, runaway motor, LiPo puff) — one leaf.
- **Signed shop cert** checklist before Unit 6. Even if the school owns the content, the course should provide the checklist.

**Recommendation:** Keep at 1 session but make it a **gate**, not a lecture. Provide the checklist as a downloadable teacher asset.

### 4.2 Unit 2 — Function of components (3 sessions)

**v2 has:** Essential parts (frame, motors, props, ESC, FC, battery, receiver, Remote ID module); optional parts (GPS, camera, VTX, AIO vs separate ESC); 5–10 min ID quiz. Part selection by weight/use case.

**Technical value:** High. Correct scope for a first unit; AIO vs 4-in-1 vs separate ESC and "what goes where" is exactly what beginners lack.

**Add:**
- **Connectors and polarity** (XT30/XT60, JST, motor bullets, UART pads) — this is where smoke happens.
- **Capacitor on the battery lead** — Joe wires it in Assembly; name it here.
- **Antenna basics** (RX dipole/T, GPS patch) so placement in Physics/Assembly has a referent.
- **Reference BOM** for the 3–3.5" kit with photos of the actual parts students will hold.

**Recommendation:** Two stems (power train / brain and radio) plus the parts-ID lab; optional parts as a third short stem. Quiz stays 8–10 photo items.

### 4.3 Unit 3 — Laws (1 session)

**v2 has:** Remote ID module + registration process; VLOS; night lighting visibility; quiz. "Steal from 107 slides"; keep FAA links current. In Unit 7 he adds: educational use is not the recreational exception, so register + RID.

**Technical value:** Medium-high, with verification risk. The homebuilt-needs-a-broadcast-module point is correct in practice. The recreational vs educational statement is a legal claim that changes what the teacher must hold (Part 107 vs TRUST) — **verify against current FAA text before it goes in a leaf**; do not paraphrase from memory.

**Add:**
- **Which authority this class flies under** — Part 107 (teacher as RPIC) vs recreational exception — as a worksheet, not a paragraph. This is the fork for everything in Unit 8.
- **Weight threshold** and why we weigh the reference build (ties to §2 airframe).
- **FRIA / broadcast module / standard RID** as three options with the module as the default for homebuilt.
- **Site brief:** airspace check, not over people, bystanders — short, pointing to `faa-107` for depth.
- **Do-not-fly-at-home closeout** until registered and RID-equipped.

**On RPIC (ours to document, not a Joe question):** aircraft size does not change the answer. Under Part 107 an RPIC is required for every flight regardless of weight. Under the recreational exception there is no RPIC, but every flyer needs a TRUST certificate and the operation must qualify as recreational — whether a school class qualifies is the FAA wording in §7 we must verify. If students or the teacher take this course **after** Part 107, the RPIC exists by definition. The course states the fork; the school picks the path.

**Recommendation:** Single session is fine. Build from `faa-107` `u1` registration/RID leaves so wording is maintained once. This unit is also the natural **cross-sell for the teacher's Part 107 certificate** — if the class flies under 107, the school needs a certificated RPIC, which is the product we already sell.

### 4.4 Unit 4 — Physics (5 sessions)

**v2 has:** Weather (open frames are sensitive); part placement for CG, cable management, RC signal; load/strength with 3D-print and production materials, CAD references; drone power (KV, prop size/pitch, voltage/capacity, manufacturer lift charts); quiz. Placed immediately before CAD.

**Technical value:** High for placement, materials, and power. Weather is a *review* topic here — for students who have taken 107 it is a recap leaf; for students who have not, we expand it (ours to write, pulled from `faa-107` `u5`/`u6`). Either way it is not Joe's problem.

**Add — builder physics:**
- **Thrust-to-weight and hover current** worked example from a real motor chart → "will this lift, for how long."
- **AUW budget** table students fill for their own design (frame, stack, battery, guards).
- **Vibration / soft-mount** as the bridge to gyro noise in Unit 7.
- **Legal weight line** callout linking back to Unit 3.

**Add — basic materials science (new stem):** the CAD unit that follows has nothing to stand on without this.
- Stress vs strain, stiffness vs strength, and why a stiff arm and a strong arm are not the same part.
- **Fatigue**: repeated crash and vibration loads crack arms that a single load would not.
- **Printed plastics**: PLA / PETG / nylon / TPU — glass transition, layer adhesion, print orientation as a strength decision (anisotropy). Why guards are TPU and arms are not PLA.
- **Carbon fiber**: layup, why it is stiff and light, why it is conductive (antenna and mag interference; shorts) and dusty when cut.
- One hands-on: break a printed test bar in two orientations.

**Add — heat transfer for technicals (new stem):**
- **Where heat comes from**: I²R in motors, ESC FETs, and wires; why thin wire and bad solder joints get hot.
- **Where it goes**: conduction into the frame plate, convection from prop wash (why ESCs sit under the props), radiation is negligible at this scale.
- **Why it matters**: motor demag and ESC thermal throttling; LiPo temperature after a flight as a health check; iron temperature, thermal mass, and dwell time when soldering (ties to Unit 6 safety).
- One hands-on: IR thermometer on motors and ESC after a bench spin (Unit 8) and log it.

**Add — battery science for future use (new stem):** transferable to EVs, phones, and anything Joe's students touch next.
- **LiPo chemistry** at a plain-language level: cell voltage window (~3.0–4.2 V), nominal 3.7 V, series cells (2S–4S) and why voltage sets motor speed.
- **Capacity vs C-rating vs internal resistance**: what "sag" is, why a small high-C pack beats a big low-C pack for a 3–3.5" quad, energy density vs power density.
- **Care**: storage voltage, balance charging, puffing, cycle life, what a puffed cell tells you, disposal.
- **Chemistry landscape**: LiPo vs Li-ion (18650/21700 for long-range vs high discharge), a sentence each on LiFePO4 and solid-state so students know the field is moving.
- One hands-on: measure pack voltage before/after a bench run and compute Wh used.

**Recommendation:** 5–6 sessions: (1) weather review + part placement, (2) materials science, (3) heat transfer, (4–5) drone power + battery science, (6) quiz + AUW worksheet. Keep `faa-107` `u7` as canonical for exam phrasing (load factor, CG vs CP); this unit uses shop language and student-owned numbers. The three new stems are ours to draft with Joe as technical reviewer.

### 4.5 Unit 5 — Frame design (5–10 sessions)

**v2 has:** Hand out parts for measurement; minimal formal instruction; CAD tool is the school's; mandatory teacher critiques every 2–3 days; solo/pairs if no printer, groups if printing; CAD files turned in for teacher print; completion grade + optional vote. FEA from v0 is gone.

**Technical value:** High as engineering pedagogy — iteration with critique is the strongest part of the whole outline. Low as *course content* — "not much formal instruction" means there is nothing to author unless we write the scaffolding.

**Add (this is what makes the unit a course, not a studio):**
- **CAD fundamentals stem (new, 2 sessions):** if students touch CAD they need a CAD lesson — sketch and constraints, extrude/cut, hole patterns, fillets, a two-part assembly, measuring a real part with calipers, exporting STL. Skip only if the exercise is Tier A below.
- **Design brief** with hard constraints: motor mount pattern, stack pattern (20 / 25.5 / 30.5 mm), prop clearance, guard clearance, battery envelope, RX/GPS keep-outs, max AUW from Unit 4.
- **Materials leaf:** applies the Unit 4 materials stem — a realistic v1 is a **hybrid**: carbon or aluminum base plate from the kit, students design the printed parts (guards, mounts, battery tray, antenna holders) that a printer is good at and that break in crashes.
- **Critique rubric** for the every-2–3-days reviews (fit, strength, weight, serviceability).
- **Crash-replaceable parts list** so Unit 8 iteration has spare arms/guards.

**Two tiers, chosen per school:**

| Tier | Work | Tool | Sessions | Who it fits |
|------|------|------|----------|-------------|
| **A — Modify** | Change a supplied parametric guard/mount (thicker rib, moved hole, new tray) | Tinkercad or Onshape | 2–3, no CAD stem needed | Schools without design time or CAD experience |
| **B — Design** | Design printed parts from measured kit components under the brief | Onshape (default), Fusion, or school license | 5–10 incl. 2 CAD fundamentals sessions | CTE / engineering pathways |

**Non-print schools — the real question:** a CAD "starter file" is worthless without a printer. Replace that idea with:
1. **Stock frame in every kit.** Joe already wants spare known-good frames for Unit 8; make the stock frame the guaranteed flyer so no student is grounded by a design that did not print.
2. **Print-and-ship by us.** At the end of Unit 5 the teacher uploads the class STLs; we print (PETG/nylon structural, TPU guards), QC, and ship one batch. This is an operations service we own: turnaround target, cost per class, material list, failed-print policy, deadline aligned to the Unit 5 end date. It is what makes Tier B possible without a printer.
3. **Local makerspace / library** as a documented fallback where 1–2 are not wanted.

**CAD software cost (verify current terms before publishing):** Onshape has a free education plan and runs in a browser, so it works on Chromebooks with no install — our default for screenshots. Autodesk Fusion has a free education license for students and educators. Tinkercad is free and sufficient for Tier A. FreeCAD is free and open source. SolidWorks for Education is paid — schools that already have it use it. Net: **no school needs to buy CAD for this course.**

**Recommendation:** Accept 5–10 sessions for the school edition as Tier B; Tier A is the compact path. Ship the brief, rubric, and a parametric guard/mount as teacher assets. Optional FEA stays out.

### 4.6 Unit 6 — Assembly (3+ sessions)

**v2 has:** Safety review + solder demo; ESC to frame with capacitor and power lead; motors to frame and ESC, no props; FC to frame/ESC (plug connector); RX to FC and placement; first power-on with **smoke stopper**; additional parts after essentials; optional controller pairing if FC is pre-flashed. Completion + safety grade.

**Technical value:** High. Smoke-stopper first power-on and "no props" are correct shop practice and were missing in v0.

**Add:**
- **Continuity/polarity check** with a multimeter before the smoke stopper.
- **Motor direction** and wire order noted at install (fixable in software, but students should see it).
- **Strain relief and standoff material** (nylon vs metal shorts) at closeout.
- **Checkpoint photos** per session (motors, ESC, FC, RX) for the completion grade.
- **Plug-in track** variant for no-solder schools (same steps, different power-lead leaf).

**Recommendation:** Accept Joe's order (ESC + power first) because he pairs it with the smoke stopper. Keep the **battery-before-failsafe** risk explicit: the smoke-stopper power-on is fine; **no motor spin** until Unit 7 failsafe is set.

### 4.7 Unit 7 — Software (3 sessions)

**v2 has:** Betaflight firmware install (follow along); receiver protocol + telemetry; enable modes for first-time pilots, throttle curve for safety, personal tune later; registration + RID once the drone is functional. Teacher settings backup if short on time.

**Technical value:** Medium. Correct skeleton, but missing the two checks that prevent a first-flight crash.

**Add (required before any spin):**
- **Failsafe** set and demonstrated props-off (drop/disarm on signal loss).
- **Motor direction and order** check in the motors tab, props off.
- **Accel/gyro calibration** and battery voltage scaling (OSD warnings).
- **Angle mode** named as the first-flight mode; arm switch; beeper on a switch (Joe's v0 had these — carry them forward).
- **Settings dump/backup** step so a re-flash doesn't cost a period.
- **GPS hold** only if GPS is in the kit; otherwise remove from v1 content.

**Recommendation:** 3 sessions is right. Move the registration/RID *action* here as Joe suggests (aircraft is real now), but teach the *rule* in Unit 3 so students know it's coming.

### 4.8 Unit 8 — Testing (10 sessions)

**v2 has:** Test flights limited by number of RPICs; short flights; failure → back of queue; software modification while others fly; dedicated physical-mod days; spare known-good frames; flight = largest grade; optional speed/lift contests.

**Technical value:** High as a lab design — queue, spares, and iteration are exactly right. Missing the bench layer between "assembled" and "in the air."

**Add:**
- **Bench checklist gate** (props off → restrained props on): motor spin/direction, failsafe demo, radio range, GPS lock if fitted, arm/disarm.
- **Maiden protocol:** angle mode, hover only, abort criteria, spotter, netted cage or tether option indoors.
- **Post-flight inspection:** screws, motor heat, solder joints, LiPo temp, guard damage.
- **Debrief leaf:** what the failure taught (wrong direction, loose motor, weak arm) — this is where the CAD iteration loop closes. Log motor/ESC/LiPo temperatures here (Unit 4 heat stem).
- **Operating authority note:** who supervises flight days follows the Unit 3 fork (107 RPIC vs recreational + TRUST). The course states it; the school decides. Not a curriculum question.

**Recommendation:** Keep 10 sessions for the school edition. Publish the checklist as the **grading rubric** so "does it fly" has a pass/fail structure teachers can defend.

### 4.9 Assessments

**v2 has:** Quizzes after U2, U3, U4; visual flight check in U8 as bulk of grade; completion checkpoints for U5–7.

**Technical value:** Adequate. Quizzes on the reading units and a practical on flight is the right split.

**Add:** the U6 photo rubric, U7 failsafe/switch-map check, and U8 bench + maiden rubric from above. Do **not** reuse the `faa-107` question bank as exam prep; pull only builder-relevant regs items and re-tag them.

---

## 5. Gates we keep regardless of edition

These are not in v2 and should not be negotiable:

1. **Shop cert signed** before Unit 6 (course provides the checklist even if the school teaches the content).
2. **Failsafe set and demonstrated props-off** before any motor spin.
3. **Bench checklist passed** before the first RPIC-queued flight.

---

## 6. Where v1 and v2 disagreed, and the call

| Topic | v1 | v2 | Call |
|-------|----|----|------|
| Course length | ~15 periods | ~31–36+ | v2 for schools; compact edition later |
| CAD | Modify teacher file | Design from measured parts | v2 with our design brief + rubric; starter file optional |
| Power-on timing | No battery until failsafe | Smoke-stopper power-on in Assembly | v2 power-on, v1 no-spin rule |
| Video | 6–10 min per stem | 1–2 min per step + text | v2 for lab units; intro video per lecture unit |
| Regs | Cross-link 107 | Teach here | v2, built from `faa-107` leaves |
| Laws/Physics order | Physics first | Laws first | v2 |

---

## 7. Facts to verify before authoring (do not paraphrase from memory)

- Recreational exception vs educational use — current FAA wording, whether a school class qualifies, and therefore whether an RPIC (107) or TRUST (recreational) is required on flight days.
- Registration weight threshold and Remote ID applicability for homebuilt aircraft; broadcast-module and FRIA options.
- Betaflight version with position/altitude hold and the sensors it requires.
- Actual AUW of the reference 3–3.5" build with guards and battery.
- Current education-license terms for Onshape, Fusion, Tinkercad (free today; confirm before it goes in a leaf).

---

## 8. Still blocking a payload

| Blocker | Why it matters | Owner |
|---------|----------------|-------|
| Solder vs plug-in kit as the **default** | Assembly lab steps, cost, and school objection | Joe |
| GPS / camera / VTX in the kit or not | Unit 7 hold modes and Unit 2 optional parts | Joe |
| Reference BOM | Photos, quiz items, AUW numbers all depend on it | Joe |
| Non-print school deliverable (stock frame + print-and-ship) | Whether Tier B is sellable without a printer | Joe on parts; us on ops |
| Print-and-ship service design | Turnaround, cost, material, failed-print policy | Us |
| Operating authority wording (107 vs recreational) | Unit 3 fork, Unit 8 supervision | Us (§7 verify) |
| Weather review vs expanded leaf | Depends on whether students took 107 first | Us |
| CAD tool default + license check | Screenshots and the design brief | Us (Onshape default) |

---

## 9. Questions for Joe — v3 (drone-technical only)

Joe owns the hardware and build answers. Regs, pacing, weather, assessments, CAD licensing, and print-and-ship ops are ours and are not listed here.

1. **Default assembly track:** solder, or plug-in with solder optional?
2. **GPS in the base kit?** If not, we drop hold modes from v1 and keep GPS as an optional stem.
3. **Reference parts list** (motor, ESC/AIO, FC, RX, battery, props, guards, base plate) so we can weigh and photograph one build.
4. **Non-print schools — what do we hand them?** A CAD file is useless without a printer. Options on the table: (a) stock frame in every kit as the guaranteed flyer, (b) we print their class STLs and ship one batch, (c) makerspace fallback. Which parts should students be *designing* (guards, mounts, tray?) vs receiving pre-made (base plate, arms?) so that option (a) still flies and option (b) is a small, printable batch?
5. **Printed-part materials:** for a 3–3.5" guarded quad, which parts are safe as PETG/nylon prints and which must stay carbon/aluminum? This sets the Tier A/B design brief.
6. **CAD scope check:** is a Tier A "modify a supplied guard/mount" exercise still worth doing technically, or is it too trivial to teach anything about the airframe?

## 10. Our next steps (parallel to v3)

- Fold v3 answers into this file (§2, §8).
- Verify §7 facts (FAA authority wording, RID/registration for homebuilt, Betaflight hold version, CAD license terms).
- Draft the three new Unit 4 stems (materials science, heat transfer, battery science) with Joe as technical reviewer.
- Write the CAD fundamentals stem and the Tier A parametric guard/mount.
- Design the print-and-ship service (turnaround, cost, materials, failed-print policy, Unit 5 deadline).
- Write Unit 1 checklist, Unit 7 failsafe leaf, Unit 8 bench/maiden rubric as the first teacher assets.
- Draft Units 2–4 leaves (150–350 words) from the reference BOM and `faa-107` regs leaves; weather as a review leaf with an expanded variant for non-107 students.
- Only then: `drone_building_course.json` with string refs (`u1`…), no homepage track until Part 107 is complete.
