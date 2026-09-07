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
| 4 | Physics | 1 | 5 | + weather, placement, materials, power | Accept 4; trim weather to one leaf |
| 5 | Frame design | 2–3 | 5–10 | From-scratch CAD, critiques every 2–3 days | Accept as CTE; needs a bounded B2C variant |
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

**Recommendation:** Single session is fine. Build from `faa-107` `u1` registration/RID leaves so wording is maintained once. This unit is also the natural **cross-sell for the teacher's Part 107 certificate** — if the class flies under 107, the school needs a certificated RPIC, which is the product we already sell.

### 4.4 Unit 4 — Physics (5 sessions)

**v2 has:** Weather (open frames are sensitive); part placement for CG, cable management, RC signal; load/strength with 3D-print and production materials, CAD references; drone power (KV, prop size/pitch, voltage/capacity, manufacturer lift charts); quiz. Placed immediately before CAD.

**Technical value:** High for placement, materials, and power. Low-medium for weather in a *build* course — one leaf on wind/temperature effects on a small open quad is enough; the depth lives in `faa-107` `u5`/`u6`.

**Add:**
- **Thrust-to-weight and hover current** worked example from a real motor chart → "will this lift, for how long."
- **AUW budget** table students fill for their own design (frame, stack, battery, guards).
- **Vibration / soft-mount** as the bridge to gyro noise in Unit 7.
- **Legal weight line** callout linking back to Unit 3.

**Recommendation:** 4 sessions of real content + the quiz; fold weather to a single leaf in session 1. Keep `faa-107` `u7` as canonical for exam phrasing (load factor, CG vs CP); this unit uses shop language and student-owned numbers.

### 4.5 Unit 5 — Frame design (5–10 sessions)

**v2 has:** Hand out parts for measurement; minimal formal instruction; CAD tool is the school's; mandatory teacher critiques every 2–3 days; solo/pairs if no printer, groups if printing; CAD files turned in for teacher print; completion grade + optional vote. FEA from v0 is gone.

**Technical value:** High as engineering pedagogy — iteration with critique is the strongest part of the whole outline. Low as *course content* — "not much formal instruction" means there is nothing to author unless we write the scaffolding.

**Add (this is what makes the unit a course, not a studio):**
- **Design brief** with hard constraints: motor mount pattern, stack pattern (20 / 25.5 / 30.5 mm), prop clearance, guard clearance, battery envelope, RX/GPS keep-outs, max AUW from Unit 4.
- **Materials leaf:** printed PETG/nylon vs TPU guards vs carbon plate; a realistic v1 is a **hybrid** — carbon or aluminum base plate with printed guards/mounts — so students design the parts a printer is good at.
- **Critique rubric** for the every-2–3-days reviews (fit, strength, weight, serviceability).
- **Crash-replaceable parts list** so Unit 8 iteration has spare arms/guards.
- **Starter CAD** as an optional path for schools without design time.

**Recommendation:** Accept 5–10 sessions for the school edition. Name a default CAD tool for our materials (Onshape is browser-based and free for education; schools with Fusion/SolidWorks licenses use their own). Provide the brief and rubric as teacher assets. Optional FEA stays out.

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
- **Debrief leaf:** what the failure taught (wrong direction, loose motor, weak arm) — this is where the CAD iteration loop closes.
- **RPIC plan:** who is RPIC on flight days is a school constraint; the course should state it plainly (ties to Unit 3 fork).

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

- Recreational exception vs educational use — current FAA wording and what it means for who must hold Part 107.
- Registration weight threshold and Remote ID applicability for homebuilt aircraft; broadcast-module and FRIA options.
- Betaflight version with position/altitude hold and the sensors it requires.
- Actual AUW of the reference 3–3.5" build with guards and battery.

---

## 8. Still blocking a payload

| Blocker | Why it matters |
|---------|----------------|
| Solder vs plug-in kit as the **default** | Assembly lab steps, cost, and school objection |
| Print vs no-print in the target school | Grouping and turn-in in Unit 5 |
| GPS / camera / VTX in the kit or not | Unit 7 hold modes and Unit 2 optional parts |
| Who is RPIC on flight days | Unit 3 fork and Unit 8 throughput |
| Reference BOM | Photos, quiz items, AUW numbers all depend on it |
| Named CAD tool for our materials | Screenshots and the design brief |

---

## 9. Questions for Joe — v3

1. Default assembly track: solder, or plug-in with solder optional?
2. Is GPS in the base kit? If not, drop hold modes from v1 and keep GPS as an optional stem.
3. Confirm the reference parts list (motor, ESC/AIO, FC, RX, battery, props, guards) so we can weigh and photograph one build.
4. Who is RPIC on test days in the schools you have in mind — teacher with 107, or a partner?
5. CAD tool for our screenshots (Onshape default?) and whether you want a starter file for non-print schools.
6. Weather in Physics: OK to cut to one leaf and point at `faa-107` for depth?
7. Assessment: agree to add bench + maiden rubrics as the U8 grade structure?

## 10. Our next steps after v3

- Fold v3 answers into this file (§2, §8).
- Write Unit 1 checklist, Unit 7 failsafe leaf, Unit 8 bench/maiden rubric as the first teacher assets.
- Draft Units 2–4 leaves (150–350 words) from the reference BOM and `faa-107` regs leaves.
- Only then: `drone_building_course.json` with string refs (`u1`…), no homepage track until Part 107 is complete.
