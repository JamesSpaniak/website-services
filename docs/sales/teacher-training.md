# Teacher training — closing the teacher gap

**Status: design draft (Oct 2, 2026).** This offer does not exist yet. Don't advertise or quote teacher training until it's scoped and priced (keynote vision doc §5.4 D1). Program and curriculum facts come from the drone-building handbook ([`../../assets/courses/drone-building/outlines/drone-building-course-handbook-v3.4.txt`](../../assets/courses/drone-building/outlines/drone-building-course-handbook-v3.4.txt)), which is itself a draft. Platform facts come from [`features.md`](features.md).

**Why this doc exists:** in every historical attempt to put technology into classrooms, the teacher decided the outcome, not the device ([`../marketing/keynote-vision-two-gaps.md`](../marketing/keynote-vision-two-gaps.md) §2.7). The UK's school computer scheme had training that was "all over the place," and some schools "sent anybody, often very junior staff." Ten years into Peru's laptop program, teachers who had "received some training" still "showed limited use of technology in classrooms." In Paraguay, the only schools where the laptops worked had paid local trainers, and that money ran out. This doc is how Drone Edge avoids those three failures.

---

## 1. The goal

> **On the day of Unit 6, the teacher can run a 45-minute build session for a full class without us in the room, and knows what to do when something goes wrong.**

Not "understands drones." Not "has seen a demo." Every item below is tested against that sentence. If it doesn't help the teacher run the period, cut it.

**Design rules, from the evidence:**

| Failure in the case studies | Rule for us |
|---|---|
| UK: whoever was free got sent to training | **We name who gets trained** in the contract: the teacher who will teach it, plus a backup (§2) |
| Peru: training happened, classroom practice didn't change | **Train in the teacher's own room, on their own kit, doing the real tasks.** No slide-deck PD. |
| Paraguay: support ended when grant money ran out | **Follow-up support is in the recurring price**, not a one-off line in a grant |
| All three: the device arrived before the teacher was ready | **Readiness sign-off (§5) before students touch hardware** |

Research on teacher professional development points the same way: training that is content-specific, hands-on, collaborative, uses models of good practice, includes coaching and feedback, and is **sustained over time** works better than one-off workshops (Darling-Hammond, Hyler & Gardner, *Effective Teacher Professional Development*, Learning Policy Institute, 2017). Verify the wording before quoting it to a buyer.

---

## 2. Who gets trained

| Person | Why | What they need |
|---|---|---|
| **Lead teacher** (required) | Runs the class | Everything in §3 |
| **Backup teacher** (strongly recommended) | Sick days, turnover. One trained person is a single point of failure | Safety, bench rules, software restore, flight-day ops |
| **Administrator / CTE director** | Signs off on safety, policy, insurance, the community project | Blocks A, C and J only (~1 hour) |
| **IT contact** | Software installs, USB drivers, accounts, Wi-Fi | Pre-visit checklist (§4) |
| **Facilities / safety officer** | Battery charging and storage, fire procedure | Block B battery section (~30 min) |

---

## 3. What has to be conveyed

Organized by what the teacher must be able to **do**. Each block lists the must-know content and how we check it. "Source" points to the handbook unit the teacher will teach.

### Block A — The program map (the "why" and the shape)

- The eight units in order (Safety → Components → Laws → Physics → Design → Assembly → Software → Testing), 33–38 sessions, and **why that order**: physics comes before design so students budget weight first; nothing spins before the failsafe is proven.
- What students produce at each checkpoint, and that the bench checklist and maiden-flight rubric are the largest part of the grade.
- Which kit tier the school bought (Base: students design the whole printed frame; Video: printed parts on a stock frame) and which SKU (solder or pre-soldered).
- The Part 107 course and how it pairs with the build.
- **Check:** teacher can explain to their principal, in two minutes, what students will have done by the end.

### Block B — Safety (non-negotiable, taught first)

- **Batteries.** LiHV vs LiPo (the Explorer pack charges to 4.35 V/cell, so the charger must be set to LiHV), charging in a bag, never unattended, storage voltage, puffed or hot packs, the fire can, disposal. Where batteries live in the building.
- **Soldering** (Solder SKU only): iron temperature, tip care, fume extraction, eye protection, the hot-work zone.
- **Bench rules.** Props off until Unit 8. Smoke stopper on every first power-on. Arm / disarm / failsafe / unplug vocabulary.
- **The hard gates.** Shop cert signed before Unit 6. Failsafe demonstrated props-off before any motor spin. Bench checklist signed before an aircraft joins the flight queue.
- **Incident procedure.** Burn, cut, runaway motor, puffed or hot pack: what to do and who to tell.
- **Check:** teacher sets up the charging station, runs a smoke-stopper power-on, and walks through the incident procedure without notes.
- Source: Unit 1; safety brief at the start of Units 2–8.

### Block C — The law, and the teacher's role as remote pilot in command

The class flies under **Part 107**, so every flight needs a certificated remote pilot in command (RPIC) present. **The number of RPICs present is what limits how many aircraft can fly** (handbook Unit 8, Ops).

- **The teacher needs a Part 107 certificate by Unit 8.** Units 1–7 involve no flight (about 23–28 sessions), which gives the teacher runway. Until then, a Drone Edge RPIC can cover first flights. Start the teacher on the Part 107 course **before** the training visit. The FAA test fee is separate (don't imply it's included).
- Registration: every aircraft registered separately in FAADroneZone and marked.
- Remote ID: one BeeID module per aircraft, its serial listed on that aircraft's registration, broadcasting only while powered.
- Visual observer required for any FPV (goggles) flight.
- The school site: airspace check (controlled airspace may need authorization), no flight over people, bystanders, indoor vs outdoor flying. **Verify the indoor-flight position with current FAA guidance before training on it.**
- The district side: drone or equipment policy, insurance, media releases for any student photos or video.
- **Check:** teacher completes the airspace check for their own school, and knows which registration and Remote ID actions happen in Unit 7.
- Source: Unit 3; the Part 107 course.

### Block D — Build one aircraft, start to finish (the core of the visit)

**The single most important thing in the training: the teacher builds their own aircraft with their own hands.** A teacher who has built one can teach it; a teacher who watched a demo can't.

- Parts identification on the real kit (the Unit 2 photo quiz, taken by the teacher).
- The assembly steps in the order we teach them (Joe's bench order: solder the ESC loose, then mount it). Pre-soldered SKU skips the soldering.
- Continuity and polarity check with a multimeter; smoke-stopper first power-on; reading the receiver and BeeID LEDs.
- **The common student mistakes**, seen and fixed on the teacher's own build: motor rotation, polarity, cold joints, ribbon seating, BeeID placement (needs sky view, away from the receiver antenna), strain relief.
- **Check:** teacher's aircraft passes the photo checkpoints and a smoke-stopper power-on.
- Source: Units 2 and 6.

### Block E — Software, and the session-savers

- Betaflight Configurator: flash the **correct target** (FLYWOOF722PROV2, not the older PRO target, or the barometer goes missing), calibrate, set up GPS and battery warnings.
- Radio: **charge the transmitter and fit the grips before anything else.** A dead radio at bind time burns the session. ELRS bind, arm switch, beeper.
- Failsafe set and **demonstrated with props off**. GPS Rescue as a safety net, not a flight mode. Angle mode for first flights.
- **Save and restore a settings backup.** This is the teacher's emergency tool when a student's configuration is broken and the period is ending.
- Troubleshooting cards for the top failures: radio won't bind, motor spins the wrong way, no GPS lock indoors, barometer missing.
- **Check:** teacher breaks a configuration on purpose, then restores it from backup in under five minutes.
- Source: Unit 7.

### Block F — Flying, and running flight day

- The teacher flies: Angle-mode hover, line of sight, short flights. Recommend simulator time before the visit.
- The maiden protocol: RPIC present, Angle mode, hover only, stated abort criteria, spotter, netted cage or tether, short flights. A failure sends the aircraft to the back of the queue.
- **Running a flight queue with one RPIC**: who flies, who waits, what everyone else is doing (software mods while others fly).
- Post-flight inspection: screws, motor heat, joints, pack temperature, guard damage. Then the debrief question: what did the failure teach, and what CAD or software change follows?
- **Check:** teacher runs a mock flight day with us acting as students.
- Source: Unit 8.

### Block G — The 45-minute period (classroom operations)

This is the part most training skips and most teachers struggle with.

- **Batteries per period.** How many packs, how long they charge, and the rotation so the next class isn't stuck.
- **Station rotation.** Some teams build or configure while others fly or design.
- **Setup and teardown.** What gets laid out before the bell, what gets put away, and how long each takes.
- **Inventory and tools.** Kit check-out and check-in, small-parts storage, what to count at the end of each period.
- **When parts break.** Print a spare; stock frames on standby; how to order spares and how long it takes.
- **Print planning** (Base kit): frames take hours to print, so plan overnight print queues; the makerspace or print-and-ship fallback.
- **The first day of each unit**, scripted.
- **Check:** teacher walks through a full 45-minute plan for one Unit 6 session and one Unit 8 session.
- Gap: the handbook lists **45-minute teacher scripts** as still to design. Training can't be finished until those exist.

### Block H — The Drone Edge platform and grading

- Manager dashboard: classes and periods, invite codes, assigning courses, progress by class, exam scores (see [`features.md`](features.md) § Organizations). This overlaps the existing 30–45 min manager onboarding call in [`../../workflows/sales/delivery-runbook.md`](../../workflows/sales/delivery-runbook.md).
- How the bench checklist, maiden rubric and photo checkpoints map to the teacher's gradebook.
- Using dashboard numbers as the teacher's own evidence for administrators and funders.
- **Check:** teacher creates a class, invites a test student and finds that student's progress.

### Block I — Design and CAD (Base kit only)

- Onshape basics (free education plan, runs in the browser): sketch, extrude, hole patterns, export STL.
- The design brief's measured constraints (motor mount, stack pattern, battery envelope, BeeID pocket, receiver antenna keep-out).
- The slicer settings table per material (PLA prototypes, PETG final) and the critique rubric (fit, strength, weight, serviceability).
- **Check:** teacher modifies the stock frame, slices it and starts a print.
- Source: Unit 5.

### Block J — The community project and showcase

- Choosing a real question with a local partner (runoff, canopy, the school's own roof).
- Data and privacy: the district owns the data; nothing that identifies private property gets published.
- Media releases before any student imagery is shared.
- Planning the showcase from day one, and inviting the people who'd fund year two.
- **Check:** teacher has a draft project question and a showcase date.

---

## 4. Before we arrive

The visit fails if the room isn't ready. Send this checklist 3–4 weeks out.

| Item | Owner |
|---|---|
| Lead teacher enrolled in the Part 107 course and started | Teacher |
| Kits delivered and inventoried against the BOM | Teacher + us |
| Betaflight Configurator, USB drivers, slicer installed on classroom machines; Onshape accounts working | IT |
| Charging location and battery storage approved | Facilities |
| Flight space identified (indoor gym or netted area, or an outdoor site with airspace checked) | Teacher + admin |
| District drone or equipment policy, insurance confirmed, media-release forms | Admin |
| **Our staff's school-entry requirements** (in Pennsylvania, contractors with direct contact with students typically need child-abuse, state police and FBI clearances; confirm with the district) | Us |
| Training dates **don't** overlap students being present, or the visit is split so they don't | Admin |

---

## 5. Readiness sign-off

Before students touch hardware, the lead teacher has:

- [ ] Run a smoke-stopper power-on and set up the charging station correctly
- [ ] Built one aircraft that passes the photo checkpoints
- [ ] Demonstrated the failsafe with props off
- [ ] Restored a settings backup from a broken configuration
- [ ] Flown the maiden protocol (or has a Drone Edge RPIC scheduled for the first flight days)
- [ ] Walked through a 45-minute plan for a build session and a flight session
- [ ] Created a class in the dashboard and found a student's progress
- [ ] Knows who to call, and how fast we answer

The sign-off is for the teacher's confidence and the administrator's peace of mind. It isn't an FAA credential and shouldn't be described as one.

---

## 6. Delivery format (draft)

In-person is the preferred method. Time estimates are planning guesses, to be tested at the first school.

| Phase | Format | Content |
|---|---|---|
| **Pre-work** (weeks before) | Self-paced + one call | Part 107 course started; IT checklist; simulator time; Block A on a call |
| **Day 1 on site** | In person, teacher + backup | B (safety), C (law), D (build their own aircraft) |
| **Day 2 on site** | In person; admin joins for part | E (software), F (flying), G (45-minute period), H (platform), I (CAD if Base kit), J (community project), sign-off |
| **High-risk days** | **We come back, in person if possible** | First Unit 6 soldering or power-on session; first Unit 8 flight day. These are where the safety and confidence risk is highest. |
| **First semester** | Scheduled calls + on-call | Short check-ins at the start of each unit; a named contact with a stated response time |
| **Year 2** | Refresher + new teacher | Retrain if the teacher changes; review what broke and what was slow |

### 6.1 Time per block: in person vs outline guidance

Planning estimates for a teacher building for the first time. **Untested; time them at the first school (T5).** The rule: **anything with hands or hazards happens in person; anything that's information goes in the outline.** The Peru finding (training happened, practice didn't change) is the risk of putting hands-on work in a handout.

| Block | Full in-person review | Outline only? | Recommended | Risk if outline only |
|---|---|---|---|---|
| **A** Program map | 45 min | ✅ Yes | **Outline** + 10 min on the pre-work call | Low |
| **B** Safety | 1.5 h (1 h on pre-soldered SKU) | ❌ No | **In person** | High: battery fire, burns. The charging setup and smoke-stopper must be done, not read. |
| **C** Law / RPIC | 1 h | Mostly. The Part 107 course covers the rules | **Outline** + 30 min in person for the school's own airspace check and registration plan | Medium: site-specific mistakes |
| **D** Build an aircraft | 2–2.5 h pre-soldered; 3.5–4.5 h with soldering | ❌ No | **In person.** The core of the visit | High: teacher can't diagnose student builds |
| **E** Software + session-savers | 2 h | Partly. Step clips can cover flashing | **In person** for bind, failsafe test and the backup-restore drill | High: dead periods, unsafe spin-ups |
| **F** Flying + flight day | 1–1.5 h (weather and space permitting) | ❌ No | **In person**, plus our return visit for the first class flight day | High: safety and confidence |
| **G** 45-minute period | 1 h | Partly, once the scripts exist | **Outline (scripts)** + 30 min in-person walkthrough | Medium: the period runs over and the class stalls |
| **H** Platform + grading | 30–45 min | ✅ Yes | **Remote**: the existing manager onboarding call | Low |
| **I** CAD (Base kit only) | 1.5–2 h | Mostly. Onshape's own tutorials plus our design brief | **Outline + remote session**; start one print in person | Low–medium |
| **J** Community project | 30 min | ✅ Yes | **Outline** + a call before the project starts | Low |

**Totals:**

| Approach | Teacher time | Our time on site | Fits |
|---|---|---|---|
| Everything in person | ~13–15 h | ~2.5 days | Too long. Hard to get release time for |
| **Hybrid (recommended)** | ~9–10 h in person + ~3–4 h self-paced/remote | **2 days** | Two school days with breaks |
| Hybrid, pre-soldered SKU | ~7.5–8 h in person + ~3–4 h remote | 1.5 days | Possible as one long day + a half day |
| Outline only | ~4–6 h reading | 0 | **Not recommended.** It's the OLPC model: device and documents, no supported teacher |

Two ways to shorten the visit without moving hands-on work to a handout: sell the **pre-soldered SKU** (saves about 1.5 h of training and the soldering safety block), and have the teacher **watch the step clips and fly the simulator before we arrive**.

**If we can't come in person:** a live video session with the teacher's own kit on camera, recorded step clips (the handbook already plans these per step), and a regional training day where several schools' teachers build together at one site. A regional day also creates a peer network, which the BBC report recommends ("two-way networks" with teachers).

**Pricing:** undecided. The Paraguay evidence says the follow-up support must sit in the recurring school price, not only in a one-time grant line. Grants can still fund the initial visit ("equipment plus professional development" is common RFA language; see the funding page).

---

## 7. What the teacher leaves with

- Their own built, configured aircraft (the class demo unit).
- A settings backup file for the kit.
- Troubleshooting cards (radio bind, motor direction, GPS lock, wrong target).
- Checklists: shop cert, bench checklist, maiden protocol, post-flight inspection, incident form.
- Battery plan for their period length and number of packs.
- 45-minute scripts per session (**not written yet**).
- Inventory sheet and spare-parts ordering instructions.
- A contact card: who to call, and how fast we answer.

---

## 8. Open questions

| # | Question |
|---|---|
| T1 | Price and packaging: is training included in a tier, a separate line, or both? (Keynote vision doc D1.) |
| T2 | Who are our trainers, and does each hold a Part 107 certificate and the clearances a district requires? |
| T3 | Insurance for our staff flying on school property. |
| T4 | Write the 45-minute teacher scripts and troubleshooting cards; both are prerequisites for this training. |
| T5 | Test the two-day estimate at the first school and adjust. |
| T6 | Do we offer a teacher-only Part 107 seat as part of every school deal? |
