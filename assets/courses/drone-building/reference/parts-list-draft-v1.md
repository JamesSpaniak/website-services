# Drone building — reference parts list, draft v1

**Status:** Draft, Sep 8 2026 — **superseded for parts by [`parts-list-draft-v2.md`](parts-list-draft-v2.md) (Sep 9)**. Still current here: §3 material table, §5 Part 107 module rules, §8 goggles options, §9 material choice, and the §7.1 desk check of the v1 parts. Source is Joe's GetFPV quote ([`getfpv-quote-2026-09-08.pdf`](getfpv-quote-2026-09-08.pdf)) plus his notes: "reasonable list of parts; need more research to confirm compatibility and add hardware. GPS isn't strictly necessary and the O4 unit could be removed for the non-photo version. Doesn't include monitor/goggles, a controller, or RID module."

This is a **reference list, not a SKU**. Prices are GetFPV list prices on the quote date, before tax and shipping. Joe owns compatibility; we own the kit split, safety notes, and cost framing. Items marked *verify* are unconfirmed.

---

## 1. Quoted parts

| Part | Qty | Unit | Total | Base kit | Video kit | Notes |
|------|----:|-----:|------:|:--------:|:---------:|-------|
| Flywoo GOKU GN405 Nano HD Stack V3 — F405 FC + 20A 2–4S 4-in-1 BLHeli_S ESC, built-in ELRS 2.4 GHz RX, **16×16 mm** | 1 | $77.99 | $77.99 | ✔ | ✔ | **DP310 barometer** (Option A satisfied). ICM-42688P, 6 UARTs, 16 MB blackbox, USB-C. **Motor and battery are solder pads; O4 is a plug (UART3, cable included); GPS is pads.** Box includes **XT30U pigtail + capacitor**, M2×18 screws. 12.5 mm stack height, 7.9 g. **No OSD chip** — see §4. Betaflight target `FLYWOOF405NANO` |
| DJI O4 Air Unit | 1 | $139.99 | $139.99 | — | ✔ | Digital HD video with onboard recording. Plugs straight into the GOKU FC. Requires DJI goggles (not on the quote) |
| Lumenier QAV-S Mini 3" freestyle frame (CF) | 1 | $51.99 | $51.99 | — | ✔ | Stock CF frame for the Video kit. 147 mm, 56 g, 3 mm arms, stack 16/20/25.5. **No prop guards, no battery strap.** **Arms are 12×12 M2 — the Spark 1404 (Ø9) does not bolt on without an adapter**; O4 camera needs a printed 14→20 mm adapter. Frame choice reopened (§7.1a) |
| VCI Hobby Spark 1404 4000KV motor | 4 | $13.99 | $55.96 | ✔ | ✔ | **Ø9 mm 4× M2 mount, T-mount 1.5 mm shaft, 10.1 g with leads.** 4S-rated; no 3S data published — ~3.5–4:1 estimated on 3S. Joe to confirm KV choice (§7.1b) |
| Lumenier 1000 mAh 3S 35C LiPo, XT60 | 1 | $18.99 | $18.99 | ✔ | ✔ | **70 × 35 × 18 mm, 81 g, XT60.** 35 A continuous clears the ESC. **The stack ships an XT30 pigtail** — as quoted they do not mate; class standard should be XT30 and this pack swapped for an XT30 3S (§7.1b) |
| HGLRC M100 Pro GPS | 1 | $19.99 | $19.99 | — | optional | **QMC5883L magnetometer**, 7.9 g, SH1.0 6-pin — Option C for hold modes and GPS Rescue. FC side is **pads (6 joints)**. **Back-ordered at GetFPV.** Not in Base per Option A |
| | | **Subtotal** | **$364.91** | | | As quoted, all six lines |

## 2. Not on the quote (needed)

| Item | Per | Base | Video | Notes / approx. cost |
|------|-----|:----:|:-----:|----------------------|
| Props, 3" tri-blade, **T-mount (1.5 mm)** — Gemfan 3016 / 3018 or HQ T3×3 | aircraft, + spares | ✔ | ✔ | ~$3–5 / set; budget 3 sets per aircraft for a semester |
| Battery strap | aircraft | ✔ (in hardware pack) | ✔ | The CF frame does not include one |
| O4 camera adapter 14→20 mm + O4 board 25.5→20 adapter (Video, CF frame) | aircraft | — | ✔ | Printed Tier A parts; GetFPV publishes STLs. Not needed if a 1404/O4-native frame replaces the QAV-S Mini |
| Prop guards | aircraft | ✔ (printed, part of the student frame) | ✔ (printed add-on for the CF frame) | TPU or PETG, student-printed or print-and-ship |
| Frame filament / printed frame | aircraft | ✔ | — | ~30–60 g of filament, a few dollars; §3 |
| Hardware pack: M2/M3 bolts, nylon nuts, standoffs, battery strap, zip ties, heat-shrink | aircraft | ✔ | ✔ | ~$5–8; CF frame includes its own hardware |
| Battery pigtail (match connector) + low-ESR capacitor | aircraft | ✔ | ✔ | ~$3–5; two of the solder joints |
| **Remote ID broadcast module — Holy Stone HSRID** (Amazon B0CGTTNJXL, "FAA Compliant Remote Identification broadcast Module") | **per aircraft in the air at once**, not per student | ✔ | ✔ | **$39.99.** Standalone: own GPS, own battery (USB-C, ~1–1.5 h charge, 4–5 h run), 14–16 g, ~39×30×13 mm, velcro/zip-tie mount. No wiring to the FC. HSRID01 is FAA-accepted (DOC RID000000290); HSRID02/03 are the current successors — check the model on the box at uasdoc.faa.gov before first registration. See §5 |
| Radio (ELRS 2.4 GHz transmitter) | team or class | ✔ | ✔ | ~$65–130 (e.g., RadioMaster Pocket / Boxer class). ELRS binding phrase per team makes swapping aircraft easy |
| Goggles | class set (Video only) | — | ✔ | DJI O4 needs DJI goggles; the cheapest current option is the Goggles N3 class (~$230 *verify*). Shared per class, not per kit — feeds the Video & Photography course |
| LiPo charger (balance, multi-port) + LiPo bags + fire can | class | ✔ | ✔ | ~$50–120 for a 4–6 port charger; Unit 1 requirement |
| Smoke stopper | class (2–3) | ✔ | ✔ | ~$10–20 each; Unit 6 first power-on gate |
| Soldering station, fume extractor, multimeter, calipers, IR thermometer, digital scale | class | ✔ | ✔ | Most schools have these; the IR thermometer and scale are used in Unit 4 and Unit 8 |
| Spares: motors (2–4), ESC/FC stack (1), battery (1–2 per aircraft) | class | ✔ | ✔ | Crash budget; motors are the usual casualty |

## 3. Printed frame — scope and material (Joe, Sep 8)

**Scope.** Joe printed the **entire frame except bolts and nuts** in PLA and flew it. This settles the Tier B question: on the Base kit, students may design and print the whole structure (arms, plates, guards, tray). Only hardware is bought. The Base kit therefore ships **no frame** — it ships a hardware pack plus our stock-frame STL (pre-printed for print-and-ship schools).

**Material.** Joe's own second look: "PETG is heavier than ABS but about the same weight as PLA, so it should work fine. Nylon is best but harder to work with and much more expensive." Our recommendation, weighted for a classroom:

| Material | Density (g/cm³) | Glass transition | Classroom verdict |
|----------|----------------:|-----------------:|-------------------|
| PLA | ~1.24 | ~60 °C | Proven flyable (Joe). Fine for a first iteration and fit checks. Risk: softens in a hot car or sun and near hot motors; brittle in crashes |
| **PETG** | ~1.27 | ~80 °C | **Default.** ~2 % heavier than PLA, much tougher, prints on any open school printer, low odor. Takes motor heat and a hot trunk |
| ABS / ASA | ~1.04–1.07 | ~100–105 °C | ~16 % lighter than PETG for the same part (a 60 g frame saves ~10 g, about 4 % of AUW). Needs a heated, enclosed printer and ventilation (styrene fumes); warps on open printers. **Only if the school already prints ABS/ASA in an enclosure.** ASA over ABS |
| Nylon (PA6/PA12) | ~1.01–1.14 | ~70 °C (but high HDT) | Toughest, lightest per strength. Hygroscopic (must be dried), high nozzle temps, stringy, expensive. **Not for student prints.** Acceptable for our print-and-ship stock frames if we choose |
| TPU | ~1.21 | flexible | Guards, bumpers, antenna and RID mounts |

Densities and transitions are typical vendor values; give exact numbers from the filament's datasheet in the leaf. This table is the Unit 4 materials-science worked example (density × volume, and why glass transition matters next to a motor).

## 4. Compatibility and design-brief facts this list fixes

| Fact | Value | Feeds |
|------|-------|-------|
| Stack mount pattern | **16×16 mm, M2** | Unit 5 design brief (replaces "20 / 25.5 / 30.5") |
| Receiver | Built into the FC (ELRS 2.4 GHz) — no RX to mount, wire, or solder | Unit 2 Stem B, Unit 6 step 4, joint count |
| Barometer | On the FC (DP310) — Option A satisfied with no extra part | Unit 7 session 1 |
| OSD | **None on the FC.** Base kit has no camera, so no on-screen voltage. Battery voltage goes to the radio via **ELRS telemetry** plus beeper warnings. Video kit gets OSD through the O4 / goggles | Unit 7 session 1 (rewrite "OSD warnings" for Base) |
| Video link | O4 plugs directly into the FC; no VTX wiring | Unit 6 step 6, joint count |
| GPS + mag | M100 Pro on UART4 + I²C1 (RX4/TX4, SDA/SCL, 5V, GND) — **FC-side pads, 6 joints** | Unit 7 session 3 (Video kit only) |
| Motor mount | **Spark 1404: 4× M2 on Ø9 mm; T-mount props** | Unit 5 design brief (arm tips) |
| Stack pocket | 16×16 M2, **≥ 12.5 mm clear height** for FC + ESC; more if the O4 board stacks above | Unit 5 design brief |
| Battery envelope | Quoted pack **70 × 35 × 18 mm, 81 g** — but its XT60 does not match the stack's XT30 pigtail; final envelope follows the XT30 pack Joe picks (GNB 1100: 62 × 27 × 25 mm; Lumenier 850: 58 × 30 × 22 mm) | Unit 5 design brief |
| Solder joints | **Base 16** (motors 12, pigtail 2, capacitor 2). **Video 16**, +6 with GPS. Confirmed from the ESC/FC pad maps | Unit 6, BOM field, sales copy |
| Estimated AUW | Base (PETG frame + guards) **~230 g**: motors 40, battery 81, stack 8, props 8, wiring 8, RID 15, frame + guards ~70. Video **~245 g** (CF 56 + O4 9 + adapters and guards ~18), **~253 g with GPS**. Joe to weigh a real build | Unit 4 AUW worksheet, Unit 5 weight budget |

## 5. Remote ID — module reuse under Part 107

Joe: use a cheap strap-on broadcast module because "it makes the process very easy, and it can be reused across multiple drones in the class." His pick is the **Holy Stone HSRID** (Amazon B0CGTTNJXL, $39.99).

**What the module is.** A self-contained broadcaster: its own GPS receiver, its own battery, a serial number printed on the case, and a status LED (slow flash = broadcasting). It has no connection to the flight controller, so it costs zero solder joints, zero UARTs, and works on any airframe including a student-printed one. The trade-offs: **it must be charged** (4–5 h per charge; a flat module means no legal flight, so charging joins the Unit 1 battery routine and the Unit 8 bench checklist), and its **14–16 g** is ~6 % of a 240 g aircraft, already counted in the AUW estimates. HSRID01: 14 g, 39×30×13 mm, 1.5 h charge, 5 h run, FAA DOC RID000000290. HSRID02: 16 g, 1 h charge, 4 h run, adds a buzzer and app-set strobe (its strobe is not a certified anti-collision light; do not teach it as one). HSRID03: current $39.99 model on Holy Stone's store, same footprint. Whichever model ships, confirm the exact model string on the FAA DOC list and record it in the Unit 3 leaf.

**Mounting.** Top plate, GPS antenna facing the sky, away from the ELRS antenna and the O4 antennas. Comes with velcro straps and zip ties; a printed cradle sized ~40×31×14 mm is a natural Tier A/B design part, and the same cradle on every student frame is what makes swapping one module across the class quick.

What the FAA process allows (FAA Remote ID page, checked Sep 8 2026):

- Under **Part 107, each aircraft is registered separately** and gets its own registration number (~$5 each, 3 years). No change: every student aircraft is registered and marked.
- When adding an aircraft in the Part 107 dashboard, you choose "Remote ID broadcast module" and enter the **module's serial number** for that aircraft. The FAA flow explicitly supports entering the same module serial on multiple device entries.
- So the class needs **as many modules as aircraft airborne at the same time** (in practice the RPIC count, 1–2), not one per student. Each aircraft still carries its own registration marking; the module rides with whichever aircraft is flying.

Confirm the "same serial on several Part 107 registrations" behavior in FAADroneZone when the first class registers; record the result in the Unit 3 leaf. Holy Stone's own setup guide quotes the FAA text on moving a module between registered aircraft, so the vendor expects this use.

## 6. Cost framing (approximate, list prices, pre-tax)

**How the numbers derive from the $364.91 quote.** The quote is one *Video* aircraft with the optional GPS. The Base aircraft is the same quote with three lines removed.

| Quote line | Price | Base | Video |
|------------|------:|-----:|------:|
| GOKU stack (FC + ESC + RX) | $77.99 | ✔ | ✔ |
| 4× Spark 1404 motors | $55.96 | ✔ | ✔ |
| 1000 mAh 3S battery | $18.99 | ✔ | ✔ |
| DJI O4 Air Unit | $139.99 | — | ✔ |
| QAV-S Mini CF frame | $51.99 | — (printed instead) | ✔ |
| M100 Pro GPS + mag | $19.99 | — (Option A) | optional |
| **Quote subtotal** | **$364.91** | **$152.94** | **$344.92 / $364.91** |

Then add what the quote leaves out, per aircraft:

| Not on quote | Base | Video |
|--------------|-----:|------:|
| Printed frame filament (~40–60 g PETG) | ~$5 | — |
| Hardware pack (bolts, nuts, standoffs, strap) | ~$7 | included with CF frame |
| Props, 3 sets | ~$12 | ~$12 |
| Battery pigtail + capacitor | ~$5 | ~$5 |
| **Per aircraft, all in** | **~$182 → call it $185** | **~$362 without GPS / ~$382 with → call it $365–385** |

**Class-level, shared — not per aircraft:**

| Item | Approx. | Notes |
|------|--------:|-------|
| Radio (ELRS) | $65–130 each | one per team; can be shared with a binding phrase per aircraft |
| Remote ID module (Holy Stone HSRID) | $40 each | × aircraft airborne at once (RPIC count), so **$40–80 per class** — this is the "$40–80" figure; it is per class, not per drone |
| DJI goggles (Video kit only) | $229–550 each | 1–2 per class; see §8 |
| Charger (4–6 port) + LiPo bags + fire can | ~$100 | |
| Smoke stoppers ×2 | ~$30 | |
| Spares (motors, one stack, batteries) | 10–15 % of aircraft total | |

Worked example, class of 10 Base aircraft: 10 × $185 = $1,850 + radios (5 × $80 = $400) + 2 RID ($80) + charger/bags ($100) + smoke stoppers ($30) + spares (~$250) ≈ **$2,700**, about $270 per aircraft landed. Ten Video aircraft with GPS: 10 × $385 = $3,850 + the same class items + 2 goggles (~$460) ≈ **$5,200**. These are the numbers for the sales one-pager once Joe confirms compatibility.

## 7. Confirmation checklist (Joe) — what each item means and why it matters

Everything on the quote is plausible; none of it has been assembled. Each line below is a check that either changes a number in the course or changes a step in Unit 6.

### 7.1 Compatibility — desk-checked Sep 8 2026

Every check was run against manufacturer drawings, wiring diagrams, datasheets, and the Betaflight config repo (sources in §7.4). Each row lands in one of three buckets: **Confirmed** (published data settles it), **Joe** (a judgment call or a part choice), **In person** (only the physical part can answer).

| Check | Result | Bucket |
|-------|--------|--------|
| ESC motor connection | **Bare solder pads**, M1–M4, three each. No motor plugs on the 20A V3 (the older 35A V2 had plugs; do not confuse). → **12 motor joints; Base kit = 16 joints** | Confirmed |
| Battery input | Solder pads on the ESC; an **XT30U pigtail and a capacitor are included** in the box (also M2×18 screws, nuts, gaskets, shock balls, T-antenna, DJI cable) | Confirmed (capacitor value: in person) |
| FC ↔ O4 | 6-pin plug on the FC (VBAT / GND / TX3 / RX3 / GND / SBUS), cable included, mates with O4's 6-pin 1.0 mm connector. **UART3**, MSP DisplayPort. **0 joints.** The port passes raw battery voltage: fine on 3S, **never 4S without a BEC** | Confirmed |
| GPS + mag ↔ FC | **Pads only**, no spare socket: RX4/TX4 + SDA/SCL + 5V/GND on the top pad row. I²C1 is defined in the target, so the QMC5883 compass works. Free UARTs 1, 2, 4. → **6 joints** for the Video kit's optional GPS | Confirmed (4.5 V vs 5 V pad: Joe) |
| Betaflight target | **`FLYWOOF405NANO`** (mfr FLWO), in the cloud-build repo, updated Aug 2026. DP310 baro and ICM-42688P auto-detect. ELRS on UART6 must be set manually (Serial RX + CRSF) or via Flywoo's CLI dump. **Known report:** reversed pitch/roll on 2025.12.1 with this target (config issue #1064), workaround board yaw 90° — check Setup-tab model motion on first flash | Confirmed; alignment check in person |
| Stack size | **12.5 mm assembled height**, 33.8 × 27.3 mm footprint, M2 16×16, 7.9 g. FC alone 25 × 23 × 8 mm | Confirmed |
| Motor mount pattern | Spark 1404: **4× M2 on a Ø9 mm circle** (the standard 1404 "9 mm" pattern), from the manufacturer's drawing | Confirmed |
| Prop mount | **T-mount**, 1.5 mm shaft, 2× M2 through the hub. Buy T-mount 3" props: Gemfan 3016 (VCI's test prop) or 3018, HQ T3×3 | Confirmed |
| Motor weight / leads | 10.1 g with 24 AWG 100 mm leads; almost certainly bare tinned ends (no connector shown) | Confirmed; termination in person |
| Motor on 3S | VCI publishes **4S data only**: 368 g / 11.4 A per motor on Gemfan 3016 tri at 16 V. Scaled to 3S ≈ 220–240 g and ~7 A per motor → ~900 g total, ≈3.5–4:1 on 250 g AUW. Adequate for a trainer, tame; 3S 3" builds usually run 4500–5000KV. 20 A ESC has 1.6× headroom even at the 4S peak | **Joe:** keep 4000KV on 3S, or pick a 4500–5000KV 1404 |
| Battery | Lumenier 1000 mAh 3S 35C: **70 × 35 × 18 mm, 81 g, XT60**. 35 A continuous clears the ESC. **No XT30 variant exists** of this pack | Confirmed |
| Connector standard | The stack ships an **XT30U** pigtail; the quoted pack is **XT60**. As quoted they do not mate. Class standard should follow the included pigtail: **XT30** | **Joe:** pick an XT30 3S pack (~850–1100 mAh; e.g. GNB 1100 3S XT30 62 × 27 × 25 mm 66–71 g; Lumenier 850 3S XT30 58 × 30 × 22 mm 71 g, back-ordered) or swap pigtails to XT60 class-wide |
| Frame ↔ stack | QAV-S Mini is drilled **16×16, 20×20, and 25.5×25.5**; the GN405 stack fits. Rear deck is 20×20; the O4 board is 25.5×25.5 so it sits on the main pattern or needs a 25.5→20 adapter | Confirmed |
| **Frame ↔ motor** | QAV-S Mini arms are **12×12 M2** (GetFPV kits ship it with 1507s). The Spark 1404 is **Ø9**. **They do not bolt together** as quoted | **Joe:** printed/CF 12→9 adapter plates, a 12×12-pattern motor, or a 9 mm-pattern frame such as the Lumenier QAV-S 2 Sub-250 Bardwell SE (55 g, O4-ready camera plates; confirm its motor pattern) |
| Frame ↔ O4 camera | Cage is **micro 19 mm**; the O4 camera has its own 14 mm-wide mount with M2 holes at 16 mm spacing. **Needs a printed 14→20 mm adapter** (GetFPV publishes STLs) and possibly a 20→19 shim | Confirmed; adapter is a Tier A part |
| Frame specs | 147 mm wheelbase, 56 g, 3 mm arms, 3" max prop, **no prop guards offered**, **no battery strap included**, top-mount battery | Confirmed |
| Battery envelope on the CF frame | Top-plate area for a 70 × 35 × 18 mm pack not published | In person |
| Standoff height on the CF frame | Not published; kit hardware lists M2 screws to 20 mm; the 12.5 mm stack should fit | In person |
| Goggles / radio | O4 works with Goggles N3 / 3 / 2 / Integra only; with Betaflight + ELRS no DJI radio is needed (leave the SBUS wire unconnected). Update ELRS to ≥ 3.5.4 | Confirmed |
| M100 Pro | SH1.0 6-pin VCC/GND/TX/RX/SDA/SCL, 3.6–5.5 V, 7.9 g. **Back-ordered at GetFPV.** Newer "M100" batches may carry a QMC5883**P** compass, detected only from Betaflight 2026.6 — another reason to pin 2026.6 | Confirmed; stock at order |
| Stock (Sep 8 2026) | Stack, motors, battery, frame, O4: in stock at GetFPV. GPS: back-ordered. GetFPV's stack listing wrongly says "F7" and "6-in-1"; it is F405, 4-in-1 | Confirmed; re-check at order |

### 7.1a What the desk check changes

1. **Joint count is settled:** Base = 16 (12 motor, 2 pigtail, 2 capacitor). Video adds 0 for the O4 and 6 if the GPS option is fitted. Unit 6 and the sales copy can use these numbers.
2. **Two mismatches in the quote as written:** (a) the CF frame's 12×12 arms vs the motor's Ø9 pattern; (b) the XT60 battery vs the included XT30 pigtail. Both are cheap to fix but need Joe's pick.
3. **The Base kit (printed frame) has no mismatch:** students design arm tips for the Ø9 T-mount 1404, a 16×16 stack pocket at least 12.5 mm tall, and a tray for whichever XT30 pack Joe picks. The design brief can be finalised once the pack is chosen.
4. **Video kit frame choice reopens:** QAV-S Mini needs a motor adapter and a camera adapter and has no guards or strap. A frame designed for 1404s and the O4 camera would remove two adapters. Joe to compare.
5. **Betaflight 2026.6 pin is reinforced** by the QMC5883P detection fix and the 2025.12.1 alignment report on this target.
6. **Kit must stay 3S.** The O4 port passes VBAT; the motors are 4S-rated but the O4 is not through this port.

### 7.1b Still Joe's call

| Decision | Options | Feeds |
|----------|---------|-------|
| Motor KV on 3S | Keep Spark 1404 4000KV (tame trainer) or move to a 4500–5000KV 1404 | Unit 4 thrust numbers, flight feel |
| XT30 pack | Pick a 3S 850–1100 mAh XT30 pack; publish its dimensions | Design brief tray envelope, charger leads |
| Video-kit frame | QAV-S Mini + two adapters, or a 9 mm-pattern O4-ready 3" frame | Unit 5 Tier A parts, Video kit cost |
| GPS power pad | 4.5 V vs +5 V pad for the M100 Pro | Unit 6 Video step |
| Prop model | Gemfan 3016 vs 3018 vs HQ T3×3 for a guarded trainer | Unit 4 thrust chart, spares |

### 7.1c In person only

Capacitor value in the box · motor lead termination · Setup-tab model motion after first flash (alignment report) · CF-frame standoff height and battery-envelope fit · balance-lead type (JST-XH assumed) · substitute-pack fit in a printed tray · component photos.

### 7.2 Weigh one Base and one Video build

Build one of each and put it on a scale **with battery, props, and the RID module fitted**. Record:

| Weigh | Why |
|-------|-----|
| Each component before assembly (motor, ESC+FC, battery, frame, props, O4, GPS, RID) | Becomes the Unit 4 AUW worksheet: students add real numbers, not vendor claims |
| Bare frame (printed PETG for Base; CF for Video) | Sets the frame weight budget in the Unit 5 design brief and the weigh-in checkpoint |
| Complete aircraft, ready to fly | Confirms or corrects the ~230–250 g / ~245–265 g estimates; sets the Unit 8 bench weigh-in target |
| Hover current and flight time on the 1000 mAh pack | Fills in the Unit 4 power session with a real number; tells us whether 1000 mAh is the right pack |

Also photograph every component on a neutral background at this point — those photos are the Unit 2 quiz images.

### 7.3 Count joints

The desk check settled the count from the ESC diagram: **Base = 16** (12 motor + 2 pigtail + 2 capacitor), **Video = 16**, +6 with the GPS option. The build tally is now a confirmation, not a discovery. The count goes into the BOM, the Unit 6 lab plan (minutes per student), and the sales copy ("16 joints per drone, all on one board").

### 7.4 Sources for the desk check

- Flywoo GN405 Nano HD V3 stack: [product page](https://flywoo.com/products/flywoo-goku-gn405-nano-hd-20a-stack-v3) · [FC page](https://flywoo.net/products/goku-gn405-nano-hd-fc-v3-w-tcxo-elrs-16x16) · [ESC pinout](https://img-va.myshopline.com/image/store/1673593876355/img-v3-02128-139249f5-ac84-4cc9-a889-c294680c2b0g.jpg) · [FC pad map](https://img-va.myshopline.com/image/store/1673593876355/img-v3-02mv-abe96880-00f6-4265-9594-35cdf35b16eg.webp) · [GPS wiring](https://img-va.myshopline.com/image/store/1673593876355/img-v3-02mv-678524cd-906c-4f19-b509-0f0f1feb286g.webp) · [O4 plug-and-play](https://img-va.myshopline.com/image/store/1673593876355/O4-plug-and-play.png) · [GetFPV SKU 22956](https://www.getfpv.com/flywoo-goku-v3-hd-stack-f4-fc-20a-2-4s-4-in-1-blheli-s-esc-w-led-elrs-2-4ghz-16x16.html)
- Betaflight: [FLYWOOF405NANO config](https://github.com/betaflight/config/blob/master/configs/FLWO/FLYWOOF405NANO/config.h) · [config issue #1064 (alignment)](https://github.com/betaflight/config/issues/1064) · mag issues [#14516](https://github.com/betaflight/betaflight/issues/14516), [#14838](https://github.com/betaflight/betaflight/issues/14838), [#14867](https://github.com/betaflight/betaflight/issues/14867), [#15327](https://github.com/betaflight/betaflight/issues/15327)
- VCI Spark 1404: [manufacturer page](https://www.vci-rc.com/pd.jsp?id=73) · [drawing](https://30068510.s21i.faimallusr.com/2/2/ABUIABACGAAg74HOogYooMbI1QcwnwY4jwM.jpg) · [datasheet](https://30068510.s21i.faimallusr.com/2/2/ABUIABACGAAg-YHOogYogJ7J_AYwnwY40SY.jpg) · [GetFPV](https://www.getfpv.com/vci-hobby-spark-1404-motor-4000kv.html) · [RDQ](https://www.racedayquads.com/products/vci-hobby-spark-1404-motor-4000kv)
- Lumenier 1000 mAh 3S: [GetFPV SKU 3007](https://www.getfpv.com/lumenier-1000mah-3s-35c-lipo-battery-xt60.html) · [Lumenier](https://www.lumenier.com/products/lumenier-1000mah-3s-35c-lipo-battery-xt60) · [850 3S XT30 alt](https://www.getfpv.com/lumenier-850mah-3s-35c-lipo-battery-xt-30.html) · [GNB 1100 3S XT30 alt](https://www.gaoneng.shop/products/gaoneng-gnb-lihv-3s-11.4v-1100mah-60c-xt30-lipo-battery-longrange)
- QAV-S Mini 3": [GetFPV SKU 15327](https://www.getfpv.com/lumenier-qav-s-mini-3-freestyle-quadcopter-frame.html) · [Lumenier](https://www.lumenier.com/products/lumenier-qav-s-mini-3-freestyle-quadcopter-frame) · [DIY kit (1507 motors)](https://www.getfpv.com/lumenier-qav-s-mini-3-freestyle-quadcopter-diy-kit-4s-analog.html) · [Bardwell sub-250 list](https://www.fpvknowitall.com/fpv-shopping-list-sub-250g-drones-and-parts/) · [QAV-S 2 Sub-250 Bardwell SE](https://dolphinrc.com/product/lumenier-qav-s-2-sub-250-joshua-bardwell-se-3-inch-frame-kit/)
- DJI O4: [specs](https://www.dji.com/o4-air-unit/specs) · [FAQ](https://www.dji.com/o4-air-unit/faq) · [GetFPV SKU 22794](https://www.getfpv.com/dji-o4-air-unit.html) · [Oscar Liang](https://oscarliang.com/dji-o4-air-unit-lite/)
- HGLRC M100 Pro: [HGLRC](https://www.hglrc.com/products/hglrc-m100-pro-gps) · [GetFPV SKU 23368](https://www.getfpv.com/hglrc-m100-pro-gps-module.html)

## 8. Goggles for the Video kit — options and recommendation

The DJI O4 Air Unit talks only to DJI goggles: **Goggles N3, Goggles 3, Goggles 2, Goggles Integra**. Not the original DJI FPV Goggles V1/V2, not analog goggles, not any third-party headset. Goggles are needed only to *fly* FPV; the 4K footage that feeds the Video & Photography course is recorded on the O4's onboard storage, so the hand-off works with or without goggles.

| Option | Price (new) | Display | O4 link | Glasses | Classroom viewing | Verdict |
|--------|------------:|---------|---------|---------|-------------------|---------|
| **DJI Goggles N3** | **~$229** | Single 3.5" LCD, 1080p, 60 Hz | Full 60 Mbps, Racing mode, ~24 ms | **Fits over prescription glasses** (no IPD/diopter) | Live view to a phone over USB-C via DJI Fly; phone → classroom display by AirPlay/Chromecast/HDMI adapter. Audience mode: other N3/Goggles 3 can spectate. No HDMI out | **Default.** Cheapest, the only glasses-friendly option, and the phone mirror is how the class watches |
| **DJI Goggles 3** | ~$450–550 | Dual micro-OLED, 1080p, 100 Hz, IPD + diopter | Full 60 Mbps, Racing mode, ~20 ms | Built-in diopter −6 to +2 D; no glasses inside | Same phone mirror and audience mode. Adds **Real View** pass-through cameras so the wearer can see the field without lifting the goggles | **Pilot upgrade.** Worth it for the RPIC/teacher headset; Real View is a safety feature in a classroom field |
| DJI Goggles 2 / Integra | used only, ~$250–400 | Micro-OLED | 50 Mbps, no Racing mode, ~35 ms; need FPV RC 2 if using a DJI radio | Goggles 2 has diopters; Integra does not | Phone mirror yes; cannot spectate with N3/3 users | Not for new purchase; fine if a school already owns them |
| Monitor instead of goggles | — | — | — | — | Not supported directly; the only HDMI path is via a DJI RC Pro relay (~$1,000) | **No.** Use the phone mirror |

**Recommended class sets**

| Tier | Buy | ~Cost | Who wears what |
|------|-----|------:|----------------|
| Budget | 1× N3 | $229 | Pilot wears N3; class watches the phone mirror on the room display |
| Standard | 2× N3 | $458 | Pilot + one spectator (audience mode) or two flight lines; phone mirror for the room |
| Premium | 1× Goggles 3 + 1× N3 | ~$700 | RPIC/teacher in Goggles 3 with Real View; student pilot or spectator in N3 |

Goggles are a **class set**, never per kit. Students with glasses need the N3, which is another reason it is the default.

**Regulatory note (goes in Units 3 and 8):** under Part 107 the person flying in goggles cannot maintain VLOS, so a **visual observer** watching the aircraft unaided is required whenever anyone flies FPV (14 CFR 107.31/107.33). Line-of-sight flying in Angle mode, which is how every Base kit flies and how every maiden happens, needs no goggles and no VO beyond the RPIC. Add "VO assigned" to the Unit 8 bench checklist for FPV flights.

## 9. Can students or schools pick a different frame material?

Yes, with small changes; material is a **print profile**, not a different design. The same STL of the same shape prints in PLA, PETG, or ASA. What changes:

| Material | Same STL? | Design tweak | Printer needs | Course change |
|----------|-----------|--------------|---------------|---------------|
| PLA | Yes | None | Any | None; Unit 4 leaf notes the 60 °C limit |
| **PETG** (default) | Yes | None | Any, heated bed | None |
| ABS / ASA | Yes, with **shrinkage compensation** (~0.5–0.8 %; slicers have a setting) or the design's holes sized with clearance | Bolt holes as clearance fits (2.4 mm for M2, 3.4 mm for M3) rather than press fits; small parts may want slightly thicker walls | Heated enclosure and ventilation | One row in the Unit 5 slicer-settings table; a safety line about fumes |
| Nylon | Yes, but flexes more; arms may want +0.5 mm thickness | Parametric arm thickness (an Onshape variable) covers it | Dry filament, 250 °C+ nozzle, enclosure preferred | Not offered to students; our print-and-ship option only |
| TPU | Guards and bumpers only | Not for structure | Direct-drive extruder preferred | None |

**How to make it a one-line choice:** the stock frame is modeled with two variables, `arm_thickness` and `hole_clearance`; the design brief gives the values per material; the Unit 5 leaf carries a slicer-settings table (nozzle temp, bed temp, enclosure yes/no, shrinkage %, walls, infill) with one row per material. Students who design their own frame inherit the same two variables. A school that wants ASA ticks a box on the kit order and gets the ASA row; the course text does not change. What *does* change by material is the school's printer capability (enclosure + ventilation for ABS/ASA), which is a sales-qualification question, not a curriculum one.

Do not offer material choice on the Video kit; its structure is the CF frame and only guards/mounts are printed.

## 10. Open items summary

| Item | Owner | Where |
|------|-------|-------|
| ~~Compatibility pass~~ → desk-checked Sep 8 (§7.1); **Joe decides** motor KV on 3S, XT30 pack, Video-kit frame, GPS power pad, prop model (§7.1b) | Joe | Blocks the final design brief and the Video kit BOM |
| One build of each weighed (§7.2); in-person checks (§7.1c) | Joe | Blocks final numbers in Units 2, 4, 8 |
| Goggles tier choice per school (§8); default N3 | Ours (sales) | Video kit one-pager |
| ~~Remote ID module~~ → Holy Stone HSRID; confirm shipped model on the FAA DOC list at purchase | Ours | §5 |
| Material profiles and the two frame variables (§9) | Ours (Unit 5) + Joe's stock frame model | Unit 5 leaf and design brief |
| Re-price at order time | Joe | §1 |

Tracked in [`docs/TODO.md`](../../../../docs/TODO.md) § Drone-building course.
