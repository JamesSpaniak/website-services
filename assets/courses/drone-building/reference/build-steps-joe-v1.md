# Drone building — Joe's build procedure, v1

**Status:** Intake, transcribed verbatim Sep 17 2026. Source: `joe-build-steps-20260912.docx`
(Joseph Stepnowski, created Sep 12 2026, same day as [parts list v4](parts-list-draft-v4.md)),
with its figure plate `joe-build-figures-20260912.docx` → [`build-figures/`](build-figures/README.md).

This is the **first build in the folder rather than a plan** — Joe assembled the v4 electronics
on a bench and wrote down what he did. It supersedes nothing yet. [Outline v3.4](../outlines/drone-building-course-outline-v3.md)
Unit 6 was written from a desk in v3.1 (commit `8183817`, Sep 8) and never checked against a
real build; where the two disagree, **assume this file is right about order and the outline is
right about safety**.

**Transcription rule:** § 1 is Joe's text, renumbered but not reworded. Our commentary is
confined to § 2–4 and to `> [ours]` callouts. Do not edit § 1 — edit the outline instead.

---

## 1. Joe's procedure (verbatim)

### Step 1 — Assemble base of drone frame
1.1 Refer to Figure 2 and Figure 7.

> [ours] Tony 5 manual sheets. See conflict **C1**.

### Step 2 — Solder power connection to ESC
2.1 Insert shock absorbers (Figure 8 part 8) into mounting holes of ESC (Figure 11).
2.2 Tin ends of pigtail wires (Figure 8 part 7).
2.3 Tin battery solder pads on ESC (Figure 11 and Figure 12, large bottom pads).
2.4 Melt solder on top of ESC, insert pigtail wires and wait for adhesion (red to positive, black to negative).
2.5 Tin ends of capacitor (Figure 8 part 9).
2.6 Repeat 2.4, matching +/+ and −/−.

> [ours] The ESC is **loose on the bench** here — it is not mounted until 3.2. See conflict **C3**.
> Figure 8 part 7 is the in-box pigtail: **XT30**, so it mates with the Explorer pack directly
> (parts v4's "ships XT60" note was wrong — corrected Sep 18).

### Step 3 — Solder motors to ESC
3.1 Mount all 4 motors (Figure 13) to drone arms, cables pointed inward using included bolts.
3.2 Mount ESC to frame using bolts included with ESC (Figure 8 part 10 + 12).
3.3 Tin all 12 motor solder pads (Figure 11, pads on left and right sides) and wires.
3.4 Route motor wires around frame standoffs (Figure 1 part 10) so wires point outward.
3.5 Attach motors to solder pads, same as 2.4 and 2.6.

### Step 4 — Connect FC to ESC
4.1 Insert shock absorbers (Figure 8 part 8) into mounting holes on FC (Figure 9).
4.2 Insert cable (Figure 8 part 1) into FC and ESC.
4.3 Position FC over ESC, secure to frame using Figure 8 part 10 + 12.

### Step 5 — Connect receiver to FC
5.1 Solder connector (Figure 8 part 3) to receiver (Figure 15) according to bottom left of wiring diagram from Figure 14.
5.2 Sleeve heat shrink included with receiver over receiver, do not heat yet.
5.3 Plug in receiver to FC, but **do not mount to frame yet**.

### Step 6 — Connect GPS to FC
6.1 Plug in GPS cable (Figure 8 part 5) to bottom of GPS (Figure 16) and FC (Figure 14, top right).
6.2 **Do not mount to frame yet.**

### Step 7 — Testing
7.1 Connect drone battery pigtail to smoke stopper (Figure 17).
7.2 Connect charged battery (Figure 18) to smoke stopper.
7.3 If smoke stopper lights green, proceed to Step 9; if it beeps, proceed to Step 8.

> [ours] A quick polarity/bridge check goes in before 7.1; the meter earns its keep in step 8. See **C4**.

### Step 8 — Troubleshooting
8.1 Try Step 7 again after removing the receiver, then the GPS. If the light turns green after either, you found the faulty connection.
8.2 If no fault is found in 8.1, check motor connections.
8.3 If no fault is found in 8.2, check capacitor and battery pigtail.

> [ours] This has **no counterpart in the outline** and is the most valuable new content in the
> drop. 5.3 and 6.2 exist to make this bisect possible.

### Step 9 — Finishing up
9.1 Finish assembling the frame according to Figure 4 and Figure 6.
9.2 The heat shrink on the receiver can now be heated; make sure the solder joints get covered.
9.3 The receiver can be mounted towards the back of the frame, top or bottom; zip ties will suffice.
9.4 The GPS should be mounted on the top of the drone, preferably toward the front end to minimize interference.
9.5 Propellers should be left off until software setup is complete.
9.6 Remove grips from back of transmitter and insert batteries; the grips can be tricky to put back on.
9.7 If this is the video kit, proceed to Step 10, otherwise proceed to software setup.

> [ours] 9.3/9.4 are the CF-frame mounting method — see conflict **C6**. 9.5 is looser than our
> gate — see conflict **C5**.

### Step 10 — Video kit
*Not written.* Consistent with the Video SKU being parked (parts v4 § 7a).

---

## 2. What this confirms

| Claim | Evidence |
|---|---|
| **20 solder joints** — the locked count, now from a build, not a desk check | pigtail 2 (2.4) + capacitor 2 (2.6) + motors 12 (3.5) = 16 on the ESC; 4 at the XR2 (5.1). Figure 12 shows 6 castellated motor pads per side = 12 |
| **The Pre-soldered SKU boundary is clean** | Every solder action is in steps 2, 3 and 5.1 and nowhere else. Pre-soldered ships through 3.5 + 5.1 done; steps 1, 4, 6–9 are unchanged |
| **BeeID plugs into the FC GPS socket** with the stack's own lead (Fig 8 part 5) | 6.1. *Confirm Joe physically seated it* — this is the open "BeeID harness pitch vs GPS socket" item |
| **XR2 is 4 joints, then a plug** | Figure 15 pad face: `⏚ 5V TX RX` |
| **ESC is rated 3–6S** | Figure 11 silkscreen: `4IN1-32BIT-3-6S` |
| Both boards are **soft-mounted on grommets** | 2.1 and 4.1 (Fig 8 part 8) |

## 3. Conflicts with outline v3.4

Detail and resolution status in the outline's § 8 open items once folded. Summary:

| # | Conflict | Resolution |
|---|---|---|
| **C1** | Written on the **FlyFishRC Tony 5** — the 5" frame parts v4 § 7a parked. Steps 1, 3.4 and 9.1 are Tony 5–specific; steps 2, 4–8 are frame-agnostic | **Open — needs a call.** See § 5 |
| **C2** | ~~2.2/2.4 solder the in-box pigtail (Fig 8 part 7 = XT60)~~ | **Not a conflict — closed Sep 18.** The stack ships **XT30**; parts v4's "ships XT60" note was wrong and is corrected there, in the outline and in TODO. Pack and pigtail mate directly: no adapter, no sourced part, still 2 of the 16 joints |
| **C3** | Outline Unit 6 step 1 mounts the ESC to the frame *then* solders; Joe solders a loose ESC and mounts at 3.2 | **Joe is right. Outline is wrong** — our order was never built |
| **C4** | No continuity/polarity check before first power | **Keep, repositioned (Sep 18).** A quick polarity/bridge check before 7.1; the meter's real home is **step 8**, where it is the diagnostic instrument rather than a ritual |
| **C5** | 9.5 puts props on after software setup (end of Unit 7); our gate is no props until the Unit 8 bench | **Resolved Sep 18.** Joe's reasoning is right — props are unusable before config. Fitting point moves one step later, to *inside* the Unit 8 bench after the props-off checks, because Unit 7's motor-direction work is the hazard. See § 9 |
| **C6** | 9.3/9.4 zip-tie the RX and GPS to a CF frame; Unit 5 specifies a printed **BeeID pocket 22 × 16 × 8 mm** and an XR2 keep-out | **Both, staged.** See § 6 |
| **C7** | Figures are vendor renders and manual pages — not licensable for a sold course | **Reshoot and redraw.** See § 7 |

## 4. Parts to confirm before this becomes course text

| # | Question for Joe | Why it matters |
|---|---|---|
| ~~P1~~ | ~~Which pigtail did you actually solder~~ | **Closed Sep 18** — the stack ships XT30 |
| ~~P2~~ | ~~Source a separate XT30 pigtail~~ | **Closed Sep 18** — not needed, it is in the box |
| P3 | **Did the BeeID lead physically seat** in the FC GPS socket, or did you re-pin it? | Closes "BeeID harness pitch vs GPS socket"; if it needs re-pinning that is a new kit part and 4 more joints |
| P4 | **What did you bolt the 20×20 M2 stack down with?** Tony 5's stack pattern is 20×20 **M3** (parts v4 § 7a) — M2 screws through M3 holes is 1 mm of slop | Tells us whether the grommets took it up or whether the kit needs standoffs/adapters. Same question will arise on the printed frame |
| P5 | **Capacitor value and voltage** actually fitted (Fig 8 part 9) | Already an open in-person check; it is 2 of the 16 joints |
| P6 | **Wall-clock build time**, split solder vs assembly | The only missing input for pricing the Pre-soldered SKU at +$25–40 (soldering-lab § 5 assumes ~25 min/kit) |
| P7 | **Weigh it** — per component and complete | Already open. Note a Tony 5 build's AUW is **not** a Base-kit number |

## 5. Frame — CAD results, Sep 18 2026

Steps 2 and 4–8 are frame-agnostic and drop into Unit 6 as-is. Only steps 1, 3.4 and 9.1 depend
on the frame. `dronecad` was run on three 215 mm variants against the `base-truss` 150 mm
baseline to test whether the Tony 5 can be the Base frame (scratch kit, repo `bom.json`
untouched; the 215 mm CF is a stand-in with Tony 5's published geometry, not its STEP).

| | `base-truss` (150 mm, printed) | `tony5-asis` (215 mm CF, **3.5" props**) | `printed-215` (215 mm printed, 3.5" props) | `tony5-5in` (215 mm CF, **5" props on the 1404**) |
|---|---|---|---|---|
| AUW | 218.1 g | **228.7 g** | 224.8 g | **251.7 g — over cap** |
| Thrust/weight | 7.0 | 6.7 | 6.8 | 25.3 *(model extrapolating past the motor — not real)* |
| FEA SF max thrust / crash | 8.9 / 2.3 | **39.1 / 7.7** | 6.3 / **1.7** | 9.4 / 7.0 |
| First arm mode | 82 Hz | **127 Hz** | 40 Hz (below the 80 Hz idle — not excited in flight) | 113 Hz |
| Max current per motor | 13.5 A | 13.5 A | 13.5 A | **80.4 A** |
| ESC ΔT at 50 % | — | 16 °C | — | **73 °C — FAIL (limit 60)** |
| Frame + guards | ~35–45 g | 74.8 g | 70.9 g | 87.0 g |
| Bottom-plate print | 18–25 g, 45–85 min | n/a (bought) | **32.5 g, 1 h 45 m, 10.2 % overhang needs supports** | n/a |
| Checks | 21/21 | **17/18** | 17/18 | 15/18 |

**Verdict:**

1. **Tony 5 with the current 1404 + 3525 electronics has no blocking issue.** 228.7 g (under the
   250 g cap), same thrust/weight, far stronger, higher first mode, ESC 16 °C over ambient, every
   physical check clean. The single "FAIL" is our own wheelbase target of 145–168 mm — a policy
   number we wrote, not physics. Parts v4 § 7a's objection was efficiency and elegance (63 mm of
   dead span between prop tips, guards sized for 3.5" on a 5" frame), and its wind claim does not
   appear in the gust sim: 0.1° roll excursion on both.
2. **Do not fit 5" props to the 1404 4500KV.** This is the one hard finding. Motor current goes
   13.5 A → 80.4 A and ESC ΔT to 73 °C against a 60 °C limit, and AUW goes over the cap. Parts
   v4 § 7a said "do not"; it is now quantified. A genuine 5" powertrain is 2004-class motors and
   probably 4S — a different BOM, different Unit 4 numbers, different cost.
3. **Tier B survives at 215 mm, degraded.** Crash SF 2.3 → 1.7 and the first mode drops to 40 Hz
   (still below the idle band, so not excited in flight). The real cost is printer time: the
   bottom plate goes from 18–25 g / 45–85 min to **32.5 g / 1 h 45 m with supports under 10 % of
   its area**. For a class of ten that is roughly 8 h → 17 h of printing on the bottom plate
   alone, and supports are a new failure mode for a school printer.

**So the combination that works is a 5" frame with 3.5" props** — bigger, lighter to work on,
more mounting room, same powertrain. That is exactly what parts v4 called "the worse of both",
and on the numbers that judgement was about elegance, not function.

### 5a. A real 5" powertrain — modelled, Sep 18

Run to settle it rather than argue it. **Placeholder parts** (no motor or pack has been picked):
2004-class motors ~20 g, 5" props, and a 4S 650 mAh or 6S 380 mAh pack — the 6S column is
FlyFish's own published Tony 5 sub-250 configuration.

| | `tony5-asis` (3.5" props) | `5in-4s` | `5in-6s` |
|---|---|---|---|
| AUW | **228.7 g — PASS** | **313.7 g — FAIL** | **292.7 g — FAIL** |
| Max electrical W per motor | 154 W of 225 W | **444 W of 330 W — over** | **597 W of 330 W — over** |
| ESC draw at WOT | 54 A total vs a 45 A/motor ESC | **117 A total** | **105 A total** |
| Guards | clear | **motors foul all 4 guards** (205 mm³ each) | same |
| Prop-to-frame clearance | clear | **props touch the top plate (0.0 mm)** | same |
| Checks | 17/18 | 14/18 | 14/18 |

Four independent failures, not one marginal number:

1. **Over the weight cap by 43–64 g** — with placeholder parts, no camera, and the 250 g line
   already treated as soft. FlyFish hit 248.7 g only with an AIO board, bi-blades, no guards and
   no BeeID; our stack, guards and Remote ID module are the difference.
2. **The 45 A matched stack is undersized.** 105–117 A at WOT. A 5" powertrain means a different
   ESC, which means the Flywoo F722 Mini V2 stack — the part that closed the FC↔ESC pinout
   question in v4 — is out, and that question reopens.
3. **Guards clash with the motors.** `motor_pad_r` 12 was set to clear the 1404's Ø20.5 flange; a
   2004 bell is Ø25.5. Guard geometry would be redrawn.
4. **5" props overlap the top plate** at this layout. Frame geometry would be redrawn.

**Conclusion: 5" props are out for this kit.** Not because 5" is wrong, but because moving to it
replaces the stack, the guards, the frame geometry, the charger question and the weight story at
once — a different kit, exactly as parts v4 § 7a predicted, now with numbers. The Tony 5 frame
with the **existing 3.5" powertrain** is the configuration that passes.

## 6. Mounting the RX and BeeID — staged

Joe's zip ties are right for bring-up and wrong for the shipped design, and both belong in the
course:

- **Bring-up (steps 5.3, 6.2, 8):** RX and BeeID stay loose and plugged in so step 8's bisect
  works. Nothing is mounted, nothing is heat-shrunk.
- **After a green light (9.2–9.4):** heat-shrink the XR2 joints, then mount.
- **On the CF/bench build:** zip ties, as Joe writes. Fine for a test flight — a 1 g receiver on
  two ties does not come off — but it is a rework method, not a design.
- **On the printed Base frame:** the Unit 5 design brief already carries a BeeID pocket
  (22 × 16 × 8 mm, sky view) and an XR2 keep-out. Print them so the parts are **still removable
  without unbolting the stack**, or step 8 stops working the second time a class needs it.

Soldering is not an alternative to zip ties here — both parts are already plugs at the FC end.
The question is only pocket vs tie, and the answer is tie during bring-up, pocket afterwards.

## 9. Props — when they go on

Joe's 9.5 ("leave props off until software setup is complete") is right about the reason and one
step early about the timing. Props are unusable before configuration, so nothing is lost by
holding them — and the window that actually matters is **Unit 7 session 2**, where motor
direction and order are set from the Betaflight motors tab. That spins all four motors from a
laptop slider; a mis-set motor order with props fitted is an injury, which is why Betaflight
gates that tab behind an "I understand the risks, propellers are removed" checkbox.

So props are fitted **inside the Unit 8 bench**, after the props-off block (arm/disarm, motor
spin and direction, failsafe demo, radio range walk) and before restrained-prop running — never
at the end of Unit 7. Until then they live in the teacher's box. Replacement line for 9.5:

> Propellers stay off. They are fitted during the Unit 8 bench, after the props-off checks are
> signed, and then only in a fixture or with a spotter.

Joe's **9.6** (transmitter grips off, batteries in) has no home in the outline; it belongs at the
top of Unit 7 session 2, since a dead radio at bind time burns a session.

## 7. Photo and diagram shot list

Nothing in [`build-figures/`](build-figures/README.md) can ship. When Joe has hardware in hand,
these are the assets to capture in our own format. Shoot on a plain light background, one part
per frame, scale reference in the parts shots.

**Component stills — Unit 2 photo-ID quiz (8–10 items) and Unit 2 leaves**

| Subject | Angles |
|---|---|
| FC | top (sockets and pad labels legible), bottom, edge-on for stack height |
| ESC | **both faces** — battery-pad face and the 12-motor-pad face, pads readable | 
| Stack assembled | edge-on with grommets in, ruler alongside (this is the number Unit 5's clear-height check uses) |
| Motor | side, bottom (12×12 bolt pattern), lead exit |
| Props | top, edge (pitch), CW and CCW pair |
| Battery | label face, connector end |
| XR2 | pad face, antenna, with heat shrink on and off |
| BeeID | top, bottom (connector), in-hand for scale |
| Smoke stopper | XT30 face and XT60 face |
| Hardware bag | flat lay, numbered, our own callouts — replaces Fig 8 |
| Charger, transmitter | front |

**Build-step stills and clips — Unit 6 leaves, one per substep**

Over-the-shoulder and a fixed overhead for each: tinning a battery pad · pigtail joint made ·
capacitor polarity (a good and a **bad** example) · tinning the 12 motor pads · wire routing
around standoffs, wires pointing outward · ribbon seated FC↔ESC · the 4 XR2 joints ·
heat shrink before/after · BeeID plugged and unmounted · smoke stopper green · smoke stopper
**beeping** (stage a fault — this is the step 8 opener).

**Diagrams to redraw in our format** — do these off the finalized CAD, not off vendor art:

1. **Wiring diagram** replacing Fig 14 — BeeID in place of the GOKU GM10, XR2 on UART2, GPS on
   UART5, XT30 pigtail, capacitor, no camera on Base. One Base version, one Video version later.
2. **Hardware-bag plate** replacing Fig 8, with our part numbers.
3. **Exploded assembly view** replacing Figs 1–7 — rendered from the chosen `base-*` variant in
   [`../cad/`](../cad/README.md), so the frame in the diagram is the frame students print.
4. **Solder-joint map** — the 20 joints on one ESC/RX drawing, numbered, doubling as the
   Pre-soldered SKU QA sheet.
5. **Bring-up / fault-isolation flowchart** from step 8.

## 10. Source files

- `joe-build-steps-20260912.docx` — the procedure
- `joe-build-figures-20260912.docx` — the 18-figure plate
- [`build-figures/`](build-figures/README.md) — extracted figures + index
