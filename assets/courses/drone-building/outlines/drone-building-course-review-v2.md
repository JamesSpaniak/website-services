# Drone building course — v2 review

**Status:** Review of Joe's Sep 6 2026 feedback. **Source of truth for v2 was `joe-drone-build-feedback-v2.md`** (verbatim copy of `docs/building/Drone Build Feedback.md` from `origin/branch-joe`, commits `05642b2` + `512c701`). That file and the v1 draft (`drone-building-course-draft.md`) were removed from this folder on Sep 8 2026 once the v3 outline carried every decision; both remain in git history at `8183817`. This review quotes what v2 said, so the rationale stands without them.

**Not a payload.** No course JSON, questions, images, or homepage track come from this folder yet. Part 107 recordings remain P0 ([`docs/TODO.md`](../../../../docs/TODO.md)).

**How to use:** This file holds rationale, verified facts, and readiness. **Drafting works from [`drone-building-course-outline-v3.md`](drone-building-course-outline-v3.md).** Joe answers §9 and pushes hardware changes to `branch-joe`; we fold them into the v3 outline.

---

## 1. Version history

| Version | File | Author | Date | What it is |
|---------|------|--------|------|------------|
| v0 | `joe-drone-building-outline.txt` (removed Sep 8; history at `8183817`; original on `origin/branch-joe`) | Joe (`dd4ce7f`) | Aug 5 2026 | 44-line topic list, 7 headings, Testing empty |
| v1 | `drone-building-course-draft.md` (removed Sep 8; history at `8183817`) | Drone Edge (`7c3579e`) | Sep 1 2026 | Our expansion: Safety unit, stems/leaves, gaps, ~15-period mini-course |
| **v2** | `joe-drone-build-feedback-v2.md` (removed Sep 8; history at `8183817`; original on `origin/branch-joe`) | Joe (`05642b2`, `512c701`) | Sep 6 2026 | Answers all six open decisions, per-unit session tables, assessments |
| v2 review | this file | Drone Edge | Sep 7 2026 | Section review, technical value, additions, recommendations |
| **v3 answers** | §2a of this file | Joe (verbal, Sep 8 2026) | Sep 8 2026 | Ordering rationale, safety ownership, battery scope, kit tiers, sub-250 g target, CF frames for video kits |
| **v3.1 parts** | [`../reference/parts-list-draft-v1.md`](../reference/parts-list-draft-v1.md) + [`../reference/getfpv-quote-2026-09-08.pdf`](../reference/getfpv-quote-2026-09-08.pdf) | Joe (quote + notes, Sep 8 2026 PM) | Sep 8 2026 | GetFPV quote ($364.91, six lines), full-PLA frame flew, material second look, shared strap-on RID module. Folded into outline v3.1 |

Branch facts (Sep 8): `origin/branch-joe` is unchanged since `512c701` (Sep 6) — no new files. Joe's v3 came in conversation and is recorded in §2a. Our folder `assets/courses/drone-building/` is on `main` via PR #1. Joe's v0 `.txt` is unchanged; it still lists GPS as optional and starts Assembly at the battery connector, which v2 supersedes.

---

## 2. Decisions locked in v2

| Decision | v1 default | Joe v2 | Our read | Recommendation |
|----------|-----------|--------|----------|----------------|
| Airframe | 5-inch or guarded trainer | **3–3.5 inch, prop guards** (more CAD work) | Right size for a classroom: cheaper crashes, guards are a legitimate design surface | **Lock.** Weigh a reference build with battery early — a guarded 3–3.5" often lands near or above 250 g, which decides registration and Remote ID for every student aircraft |
| Firmware | Betaflight, or INAV if alt-hold | **Betaflight**; GPS hold now exists | Verified Sep 8: hold modes arrived in **2025.12 (4.6)**, stable Jan 2026; current is **2026.6**. GPS required for hold; baro optional; mag strongly recommended or `pos_hold_without_mag` + straight-line fly | **Locked: Betaflight, pin 2026.6 for screenshots.** Sensor option chosen in §7a: **Option A (no GPS) for the Base kit**; GPS + mag as the Video-kit upgrade |
| Soldering | Teacher-solder or full lab | Students **should** solder; no-solder kits cost more but are reusable | Agree on learning value; the buyer objection is real | **Ship two assembly tracks** in the same unit: *Solder* (default) and *Plug-in* (school opts out). Same leaves, different lab steps |
| 107 overlap | Cross-link 107 | Cover regs **here**; not all students take 107. Reuse 107 slides/quizzes, keep FAA links current | Agree. Builder regs unit is thin but must stand alone | Build the unit from `faa-107` `u1` registration/RID leaves, cut to builder scope. Do not fork the wording — link the source leaf id so updates flow once |
| Hardware | Course-owned kit BOM | Curated kits possible, expensive; no-solder reusable | Still commercial, not curricular | Publish a **reference BOM** (parts list, not a SKU) with the Components unit so schools can BYO or buy |
| Video | One 6–10 min per stem | **Text + 1–2 min per step**, mixed format | Better for a lab course; more recordings but each is retakeable | Adopt for Assembly/Software/Testing. Keep one 5–8 min intro per unit for lecture units. Note: today's course UI renders one `video_url` per node, so step clips mean one node per step or a content-block gallery — check with frontend before authoring |

---

## 2a. v3 answers (Joe, Sep 8 2026) and how they land

| Topic | Joe v3 | Our read | Result |
|-------|--------|----------|--------|
| **Unit order** | Laws → Physics → Design was intentional: physics fresh in mind when students start CAD | Agree. Retrieval is strongest right after teaching; Physics feeding straight into the design brief is the right sequence. Heat and battery stems also feed Assembly and Testing, so those units open with a one-paragraph recall, not a re-teach | **Locked.** Order 1 Safety → 2 Components → 3 Laws → 4 Physics → 5 Design → 6 Assembly → 7 Software → 8 Testing |
| **Safety** | Defer to us; "make it vital for students" | We own Unit 1 and every per-unit safety brief. Restore 2 sessions; the three gates in §5 are non-negotiable | **Ours.** Unit 1 = 2 sessions + signed cert; per-unit briefs written by us |
| **Battery content** | Avoid chemistry in the classroom; chemistry class can do electrochemistry. Is high-level battery mechanics better? | Yes. The course teaches battery **mechanics** — voltage window, series cells, capacity, C-rating, internal resistance and sag, temperature, storage, puffing, disposal, LiPo vs Li-ion as a use-case choice. No redox, no electrode chemistry. One optional teacher note points a chemistry class at the electrochemistry if they want the cross-curricular hook | **Locked.** §4.4 battery stem retitled "battery mechanics"; chemistry landscape reduced to a one-line "these exist" |
| **Soldering** | Cannot go fully no-solder; can get close. Fewer joints = easier to teach | Design the base kit around the minimum joints: motor leads to AIO/ESC pads (or pre-soldered motor plugs if the AIO supports them), battery pigtail, capacitor. Everything else plug-in (FC↔ESC ribbon, RX on a plug, camera/VTX on plugs) | **Locked direction.** "Minimal-solder" is the default track; the joint count goes in the BOM |
| **Kit tiers** | Base kit vs a higher-end camera/VTX/FPV kit that feeds the Video & Photography course so schools reuse finished drones there | Strong. It turns a one-semester build into a two-course hardware investment and gives the Video track its aircraft | **Locked.** Two kits: **Base** (flyer, guards) and **Video/FPV** (camera, VTX, optionally goggles). Unit 2 "optional parts" becomes the Video kit's required parts |
| **Weight** | Plenty of FPV kits under 250 g; all kits should target sub-250 g with or without FPV, provided student frames keep weight down | Agree, with a caveat: sub-250 g matters most on the recreational path. Under Part 107, registration is required regardless of weight and Remote ID follows registration — so the weight line helps only if the class flies recreationally (§7 verify). Either way it forces a real weight budget into the design brief | **Locked target.** Every kit, every student frame: AUW ≤ 250 g with battery. Weigh-in becomes a Unit 5 gate and a Unit 8 bench item |
| **Video-kit frame** | Video kits should ship with a CF frame; designing proper camera/VTX mounts would make Design take too long | Agree. It also cleanly splits the CAD tiers: Base kit students design printed structure (Tier B); Video kit students get a stock CF frame and design only small printed parts — camera cage, antenna mount, battery tray (Tier A) | **Locked.** CAD tier follows kit tier |
| **Operating authority** (Sep 8, second round) | An RPIC — teacher or paid employee — is present on all flight days | This selects the **Part 107 path**. Verified consequences: every aircraft registered regardless of weight (Part 107 registers each device separately, ~$5), Remote ID required and met with a broadcast module listed per aircraft, VLOS. TRUST/recreational path is off the table. The RPIC must hold a Part 107 certificate — that is our existing course | **Locked.** §7 authority item closed |
| **Weight** (Sep 8, second round) | Keep drones light to reduce kit cost; can go bigger if needed | Under 107 sub-250 g buys no regulatory relief, so it is a **cost and crash-energy target with a soft cap**, not a gate. Design brief carries a weight budget; going over is a documented trade, not a fail | **Locked.** Weigh-in stays as a Unit 5 checkpoint and Unit 8 bench item; hard 250 g gate removed |

---

## 3. Course shape and pacing

Joe's tree is a **CTE semester lab** (~31–36+ periods). v1 was a **quarter mini-course** (~15). He moved **Laws before Physics** so physics is fresh going into Design — confirmed intentional in v3 and locked.

| # | Unit | v1 sessions | Joe v2 | Delta | Where it goes |
|---|------|------------:|-------:|-------|---------------|
| 1 | Safety | 2 | 1 | Cut; workshop rules deferred to school | **v3: ours, back to 2** — see §4.1; gates in §5 |
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

**v3:** Joe deferred Safety to us. We own it fully.

**Recommendation:** **2 sessions.** Session 1: LiPo (handling, charging in a bag, storage, puffing, fire can, never unattended), tools and PPE (iron temperature, fume extraction, eye protection, hot-work zone), incident procedure. Session 2: bench rules as a demonstration — props-off until Unit 8, smoke stopper on first power-up, arming discipline, failsafe vocabulary — then the **signed shop cert**. Every later unit opens with a written 3–5 line safety brief that we author, not the teacher. Provide the checklist and briefs as downloadable teacher assets.

### 4.2 Unit 2 — Function of components (3 sessions)

**v2 has:** Essential parts (frame, motors, props, ESC, FC, battery, receiver, Remote ID module); optional parts (GPS, camera, VTX, AIO vs separate ESC); 5–10 min ID quiz. Part selection by weight/use case.

**v3:** "optional parts" maps to the **Video/FPV kit** (camera, VTX, goggles) — required there, absent in the Base kit. Teach the stem once; tag leaves by kit.

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

**On RPIC — decided Sep 8:** an RPIC (teacher or paid employee) is present on every flight day, so the class flies under **Part 107**. Verified consequences for the unit: register every aircraft regardless of weight (Part 107 registers each device separately in FAADroneZone, ~$5 each); Remote ID is required and met with a **broadcast module** whose serial is listed on that aircraft's registration; fly VLOS. The recreational/TRUST fork is removed from the course; one sentence notes it exists so students know why hobby drones differ. The RPIC needs a Part 107 certificate — the school buys that from us.

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

**Add — battery mechanics (new stem; v3: no chemistry in the classroom):** what the pack *does*, not what happens at the electrodes. Transferable to EVs, phones, and anything students touch next.
- **Voltage**: cell window (~3.0–4.2 V), nominal 3.7 V, series cells (2S–4S) and why pack voltage sets motor speed and prop choice.
- **Capacity vs C-rating vs internal resistance**: what "sag" is, why a small high-C pack beats a big low-C pack on a 3–3.5" quad, energy density vs power density, why weight per Wh matters under a 250 g budget.
- **Temperature**: warm after flight is normal, hot is a fault; cold packs sag (ties to the heat stem and the weather review).
- **Care**: storage voltage, balance charging in a bag, puffing, cycle life, what a puffed cell tells you, disposal.
- **Use-case choice, one line each**: LiPo (high discharge) vs Li-ion 18650/21700 (long range) — and a single sentence that other chemistries exist. **Optional teacher note** points a chemistry class at the electrochemistry for a cross-curricular hook; the drone course does not teach it.
- One hands-on: measure pack voltage before/after a bench run and compute Wh used.

**Recommendation:** 5–6 sessions: (1) weather review + part placement, (2) materials science, (3) heat transfer, (4–5) drone power + battery mechanics, (6) quiz + AUW worksheet. Keep `faa-107` `u7` as canonical for exam phrasing (load factor, CG vs CP); this unit uses shop language and student-owned numbers. The three new stems are ours to draft with Joe as technical reviewer. Units 6–8 open with a short recall of the heat and battery stems rather than re-teaching them, so the Laws → Physics → Design ordering stays intact.

### 4.5 Unit 5 — Frame design (5–10 sessions)

**v2 has:** Hand out parts for measurement; minimal formal instruction; CAD tool is the school's; mandatory teacher critiques every 2–3 days; solo/pairs if no printer, groups if printing; CAD files turned in for teacher print; completion grade + optional vote. FEA from v0 is gone.

**Technical value:** High as engineering pedagogy — iteration with critique is the strongest part of the whole outline. Low as *course content* — "not much formal instruction" means there is nothing to author unless we write the scaffolding.

**Add (this is what makes the unit a course, not a studio):**
- **CAD fundamentals stem (new, 2 sessions):** if students touch CAD they need a CAD lesson — sketch and constraints, extrude/cut, hole patterns, fillets, a two-part assembly, measuring a real part with calipers, exporting STL. Skip only if the exercise is Tier A below.
- **Design brief** with hard constraints: motor mount pattern, stack pattern (20 / 25.5 / 30.5 mm), prop clearance, guard clearance, battery envelope, RX/GPS keep-outs, max AUW from Unit 4.
- **Materials leaf:** applies the Unit 4 materials stem — a realistic v1 is a **hybrid**: carbon or aluminum base plate from the kit, students design the printed parts (guards, mounts, battery tray, antenna holders) that a printer is good at and that break in crashes.
- **Critique rubric** for the every-2–3-days reviews (fit, strength, weight, serviceability).
- **Crash-replaceable parts list** so Unit 8 iteration has spare arms/guards.

**Two tiers — v3: the tier follows the kit:**

| Tier | Kit | Work | Tool | Sessions | Who it fits |
|------|-----|------|------|----------|-------------|
| **A — Modify** | **Video/FPV kit** (stock CF frame) or any school short on design time | Design/modify small printed parts only: camera cage, antenna mount, battery tray, guard rib | Tinkercad or Onshape | 2–3, CAD stem optional | Schools feeding the Video & Photography course; no CAD background |
| **B — Design** | **Base kit** | Design printed structure (guards, mounts, tray; arms/plate per Joe's answer to §9 Q5) from measured components under the brief, **AUW ≤ 250 g** | Onshape (default), Fusion, or school license | 5–10 incl. 2 CAD fundamentals sessions | CTE / engineering pathways |

Joe's reasoning for the CF frame on the Video kit — designing proper camera/VTX mounts would blow up the Design schedule — is right, and it gives Tier A real content instead of a token exercise. **Weigh-in** is a Tier B gate before anything is printed.

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

**v3 — minimal-solder default:** Joe: can't go fully no-solder, can get close. Base kit joint list should be the minimum: motor leads to AIO pads (or pre-soldered motor plugs if the AIO has them), battery pigtail, capacitor. FC↔ESC ribbon, RX, camera, and VTX on plugs. The **joint count is a BOM field** so a school knows exactly how much soldering it is signing up for.

**Recommendation:** Accept Joe's order (ESC + power first) because he pairs it with the smoke stopper. Keep the **battery-before-failsafe** risk explicit: the smoke-stopper power-on is fine; **no motor spin** until Unit 7 failsafe is set. Video kit adds one session for camera/VTX install after the essentials.

### 4.7 Unit 7 — Software (3 sessions)

**v2 has:** Betaflight firmware install (follow along); receiver protocol + telemetry; enable modes for first-time pilots, throttle curve for safety, personal tune later; registration + RID once the drone is functional. Teacher settings backup if short on time.

**Technical value:** Medium. Correct skeleton, but missing the two checks that prevent a first-flight crash.

**Add (required before any spin):**
- **Failsafe** set and demonstrated props-off (drop/disarm on signal loss).
- **Motor direction and order** check in the motors tab, props off.
- **Accel/gyro calibration** and battery voltage scaling (OSD warnings).
- **Angle mode** named as the first-flight mode; arm switch; beeper on a switch (Joe's v0 had these — carry them forward).
- **Settings dump/backup** step so a re-flash doesn't cost a period.
- **GPS hold** — per §7a, **not in the Base kit**; Video-kit upgrade only. Base-kit v1 content is angle mode + failsafe + beeper.

**Recommendation:** 3 sessions is right. Move the registration/RID *action* here as Joe suggests (aircraft is real now), but teach the *rule* in Unit 3 so students know it's coming. Pin **Betaflight 2026.6** for all Configurator screenshots.

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

## 7. Facts to verify before authoring — status Sep 8 2026

| Fact | Status | Result |
|------|--------|--------|
| Recreational vs educational; RPIC or TRUST on flight days | **Closed by decision** | RPIC present every flight day → Part 107 path. TRUST/recreational removed from scope |
| Registration and Remote ID for homebuilt sub-250 g under 107 | **Verified** (FAA registration FAQ, FAA Remote ID page) | Register regardless of weight; Part 107 registers each device separately; RID via broadcast module with serial listed per aircraft; VLOS. Re-check FAA pages at authoring time; link them in the leaf |
| Betaflight hold-mode version and sensors | **Verified** (Betaflight wiki, 2025.12 + 2026.6 release notes) | Hold modes since 2025.12 (4.6, stable Jan 2026); current 2026.6. GPS required; baro optional; mag strongly recommended or `pos_hold_without_mag` + straight-line fly |
| Actual AUW of reference builds | **Estimated — Joe to weigh** | Parts list gives Base ~230–250 g, Video ~245–265 g from vendor weights; battery (~90 g) and frame (~60–70 g) dominate. Real weigh-in still needed |
| Reference FC has a barometer; GPS has a mag | **Verified** (Flywoo GN405 V3 specs; HGLRC M100 Pro specs) | DP310 baro on the FC → Option A needs no extra part. M100 Pro has QMC5883L → it is Option C for the Video kit. FC has **no OSD**; Base voltage warnings go via ELRS telemetry + beeper |
| One RID module on several Part 107 aircraft | **Verified in FAA flow; confirm in DroneZone** | Each aircraft registered separately; the FAA process lets the same module serial be entered on each aircraft's device entry. Class buys modules = aircraft airborne at once |
| CAD education licenses | **Verified** (Onshape education plans; Autodesk education) | Onshape Student/Educator free, browser, Chromebook; Fusion free for eligible students/educators, 1-year renewable, Chromebook OK; both need education verification. Tinkercad free |

### 7a. Betaflight and sensor options — pick one

| Option | Sensors | What students get | Cost / weight / teaching load | Fit |
|--------|---------|-------------------|-------------------------------|-----|
| **A — No GPS** | Gyro + accel (required), baro if the FC has one | Angle mode, failsafe drop/disarm, beeper, OSD voltage. No hold modes | Cheapest, lightest, no extra UART or solder, nothing to calibrate but accel | **Base kit v1.** Flights are short, VLOS, in a cage or small field with an RPIC; a hover-on-a-switch is not what the course is teaching |
| **B — GPS, no mag** | A + GPS module (~5 g) | Altitude Hold, Position Hold after a straight-line fly, GPS Rescue | +1 UART, +1 solder or plug, sat lock wait, "POSHOLD FAIL" until heading is learned | Weak for beginners in a cage — the straight-line prerequisite is the opposite of a small-field first flight |
| **C — GPS + mag** | B + magnetometer, baro | Position Hold from takeoff, best rescue | Mag calibration, interference from CF/wiring/motors, most to teach and to get wrong | **Video-kit upgrade.** Outdoor cinematic hover is exactly the Video & Photography use case |

**Pick: Option A for the Base kit, pin Betaflight 2026.6 for Configurator screenshots** (state "2025.12 or newer" in the text). Option C is the Video kit's optional add-on and gets its own leaf in Unit 7 tagged to that kit. Joe's BOM should therefore specify an AIO/FC **with a barometer** (cheap, useful for altitude OSD, and it keeps the Video upgrade open) and **no GPS** in the Base kit.

---

## 8. Still blocking a payload

| Blocker | Why it matters | Owner |
|---------|----------------|-------|
| ~~Solder vs plug-in default~~ → **minimal-solder locked (v3)**; ~~joint list~~ → **≈16 on Base estimated from the reference stack (v3.1)**; confirm ESC pads vs plugs | Assembly lab steps, cost, and school objection | Joe (confirm) |
| ~~GPS / camera / VTX in kit~~ → **two kits locked (v3)**; ~~GPS~~ → **Option A: no GPS in Base, GPS+mag optional on Video (§7a)**; parts named in v3.1 | Unit 7 hold modes | Closed |
| ~~Reference BOM × 2~~ → **reference parts list v1 (Sep 8 PM)** from Joe's GetFPV quote; Base = quote minus O4/GPS/CF frame. Still needs compatibility check, real AUW, joint count | Photos, quiz items, AUW numbers, Assembly steps | Joe (confirm) |
| ~~Which structural parts students may print~~ → **whole frame (v3.1)**; Joe flew a full PLA frame | Design brief and print-and-ship batch size | Closed |
| ~~Printed-part material~~ → **PETG default; ABS/ASA only enclosed + ventilated; no nylon for students (v3.1)** | Unit 4 materials stem, Unit 5 brief, print-and-ship | Closed (ours, from Joe's data) |
| Non-print school deliverable (stock frame + print-and-ship) | Whether Tier B is sellable without a printer | Us on ops |
| Print-and-ship service design | Turnaround, cost, material, failed-print policy | Us |
| ~~Operating authority~~ → **Part 107 path, RPIC on every flight day (Sep 8)** | Unit 3, Unit 8 supervision | Closed |
| Weather review vs expanded leaf | Depends on whether students took 107 first | Us |
| ~~CAD license check~~ → **verified free (Onshape, Fusion, Tinkercad)** | Screenshots and the design brief | Closed; Onshape default |

---

## 9. Questions for Joe — v4 (drone-technical only)

Answered in v3: ordering, safety ownership, battery scope, minimal-solder, kit tiers, sub-250 g, CF frame for Video kit. Answered Sep 8 PM (v3.1): reference parts (GetFPV quote), Tier B scope (whole frame), material (PETG default from his PLA/PETG/ABS/nylon comparison), RID module style (shared strap-on). Still open — all confirmations on the parts list, see its §7:

1. **Compatibility pass** on the quote: Spark 1404 mount pattern and prop mount; GOKU 20A ESC motor pads vs plugs; pack dimensions; XT30 vs XT60 class-wide.
2. **Weigh one Base and one Video build** with battery; count the joints actually soldered.
3. ~~Remote ID module product name~~ → **Holy Stone HSRID** (Amazon B0CGTTNJXL, $39.99; HSRID01 FAA DOC RID000000290; standalone GPS + battery, 14–16 g). Closed Sep 8 PM; we confirm the shipped model on the DOC list at purchase.
4. **Goggles model** for the Video kit (O4 needs DJI goggles; N3 class assumed) — one class set.

## 10. Remaining before drafting initial versions

**Ours** (no Joe dependency — can start now):

| Item | Feeds | Status |
|------|-------|--------|
| ~~Verify §7 FAA facts~~ | Units 3, 8 | **Done Sep 8** — Part 107 path; register all, RID module per aircraft |
| ~~Verify Betaflight version + sensors; CAD licenses~~ | Units 5, 7 | **Done Sep 8** — 2026.6 pinned, Option A no-GPS Base; Onshape/Fusion free |
| Consolidated v3 outline with terms | Everything downstream | **Done Sep 8** — [`drone-building-course-outline-v3.md`](drone-building-course-outline-v3.md) |
| Unit 1 Safety: 2 sessions, checklist, signed cert, per-unit safety briefs | Gate for Unit 6 | Not started — ours per v3 |
| Unit 4 stems: materials science, heat transfer, battery mechanics (no chemistry) | Unit 5 brief; Units 6–8 recall | Scoped; drafting can start |
| Weather review leaf + expanded variant for non-107 students | Unit 4 session 1 | Not started; source `faa-107` `u5`/`u6` |
| Unit 3 Laws leaves cut from `faa-107` `u1`; Part 107 registration + shared RID-module procedure | Unit 3 | Unblocked Sep 8 PM; module is the Holy Stone HSRID |
| CAD fundamentals stem (2 sessions) + Tier A guard/cage/mount + design brief + critique rubric | Unit 5 | Can start; brief has 16×16 stack, whole-frame scope, PETG; motor pattern and pack dims are *verify* placeholders |
| Unit 7 failsafe / motor-direction / calibration / telemetry-warning / backup leaves | Unit 7 | Can start against the GOKU GN405 V3 (baro, built-in ELRS, no OSD); screenshots need the real FC |
| Unit 2 parts text and Unit 6 step list | Units 2, 6 | Can start from the reference parts list; photos wait on hardware |
| Unit 8 bench checklist + maiden protocol + post-flight rubric | Unit 8 grading | Can start |
| Print-and-ship service: turnaround, cost/class, materials, failed-print policy, deadline | Non-print schools | Not started |
| Frontend check: step-clip video pattern vs one `video_url` per node | Units 6–8 authoring format | Not started |

**Joe's** (blocking):

| Item | Blocks |
|------|--------|
| ~~Base + Video BOMs~~ → **reference parts list v1 exists.** Compatibility pass, real AUW, joint count | Unit 2 photos/quiz images, final Unit 4 AUW numbers, Unit 8 weigh-in targets |
| ~~Tier B print scope + printed-part materials~~ | **Closed Sep 8 PM** |
| Goggles model (class set) | Unit 2 Video parts, Video & Photography hand-off |
| ~~Remote ID module pick~~ → **Holy Stone HSRID, closed Sep 8 PM** | — |

### Is it ready for development?

**Curriculum drafting — yes as of Sep 8 PM.** The tree, order, session counts, kit tiers, weight target, operating authority, firmware version, sensor option, CAD tool, ownership split, reference electronics, frame scope, and frame material are locked, and the §7 facts are verified. Every unit can be drafted in text now; **Units 2 and 6** use the reference parts list with *verify* placeholders where Joe still has to confirm (motor pattern, pads vs plugs, pack dims, real AUW, goggles). Nothing on the curriculum side is blocked; photos, quiz images, and screenshots wait on hardware in hand.

**Course payload / code — no.** No `drone_building_course.json`, no questions, no homepage track until: (1) both BOMs exist, (2) Part 107 recordings/publish are done (P0). The step-clip video format also needs a frontend answer before Units 6–8 are authored to it.

**Order of work:** Unit 1 → Unit 4 → Unit 3 → Unit 8 rubrics → Unit 2 → Unit 5 brief → Unit 6 → Unit 7 → (Joe confirms parts, hardware in hand: photos, screenshots) → payload. Drafting works from [`drone-building-course-outline-v3.md`](drone-building-course-outline-v3.md).
