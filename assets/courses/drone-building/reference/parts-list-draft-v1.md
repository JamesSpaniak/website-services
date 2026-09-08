# Drone building — reference parts list, draft v1

**Status:** Draft, Sep 8 2026. Source is Joe's GetFPV quote ([`getfpv-quote-2026-09-08.pdf`](getfpv-quote-2026-09-08.pdf)) plus his notes: "reasonable list of parts; need more research to confirm compatibility and add hardware. GPS isn't strictly necessary and the O4 unit could be removed for the non-photo version. Doesn't include monitor/goggles, a controller, or RID module."

This is a **reference list, not a SKU**. Prices are GetFPV list prices on the quote date, before tax and shipping. Joe owns compatibility; we own the kit split, safety notes, and cost framing. Items marked *verify* are unconfirmed.

---

## 1. Quoted parts

| Part | Qty | Unit | Total | Base kit | Video kit | Notes |
|------|----:|-----:|------:|:--------:|:---------:|-------|
| Flywoo GOKU GN405 Nano HD Stack V3 — F405 FC + 20A 2–4S 4-in-1 BLHeli_S ESC, built-in ELRS 2.4 GHz RX, **16×16 mm** | 1 | $77.99 | $77.99 | ✔ | ✔ | **Has a DP310 barometer** (satisfies the Option A sensor pick). ICM-42688P gyro, 6 UARTs, 16 MB blackbox, USB-C, direct plug for DJI O3/O4. **No OSD chip** — see §4. FC 3 g, FC + 20A ESC 7.8 g |
| DJI O4 Air Unit | 1 | $139.99 | $139.99 | — | ✔ | Digital HD video with onboard recording. Plugs straight into the GOKU FC. Requires DJI goggles (not on the quote) |
| Lumenier QAV-S Mini 3" freestyle frame (CF) | 1 | $51.99 | $51.99 | — | ✔ | Stock CF frame for the Video kit. Freestyle frame: **no prop guards** — guards are a printed add-on (Tier A part). Base kit prints its own frame instead (§3) |
| VCI Hobby Spark 1404 4000KV motor | 4 | $13.99 | $55.96 | ✔ | ✔ | 4000KV on 3S is a normal 3" pairing. Mount pattern and shaft/prop mount *verify* (1404s are usually 9×9 mm M2 with T-mount props) |
| Lumenier 1000 mAh 3S 35C LiPo, XT60 | 1 | $18.99 | $18.99 | ✔ | ✔ | Heaviest single part (~85–95 g *verify*). XT60 is bulkier than the XT30 usual on 3" builds — either works; pick one connector class-wide so pigtails and chargers match |
| HGLRC M100 Pro GPS | 1 | $19.99 | $19.99 | — | optional | **Includes a QMC5883L magnetometer**, 7.9 g, SH1.0 6-pin cable — this is exactly Option C (GPS + mag) for hold modes and GPS Rescue. Not in Base per the Option A decision |
| | | **Subtotal** | **$364.91** | | | As quoted, all six lines |

## 2. Not on the quote (needed)

| Item | Per | Base | Video | Notes / approx. cost |
|------|-----|:----:|:-----:|----------------------|
| Props, 3" (tri-blade), matched to motor mount | aircraft, + spares | ✔ | ✔ | ~$3–5 / set; budget 3 sets per aircraft for a semester |
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
| GPS + mag | M100 Pro on a UART + I²C (SH1.0 cable; FC-side pads *verify*) | Unit 7 session 3 (Video kit only) |
| Motor mount | 1404, pattern *verify* (likely 9×9 mm M2) | Unit 5 design brief |
| Battery envelope | 1000 mAh 3S pack dimensions *verify*; connector XT60 vs XT30 decision | Unit 5 design brief |
| Estimated solder joints (Base) | Motors to ESC pads 12 + battery pigtail 2 + capacitor 2 = **~16** (0 if the ESC ships with motor plugs — *verify*). Video adds 0 (O4 plugs), GPS adds ~4–6 if FC pads are not plugged | Unit 6, BOM field |
| Estimated AUW | Base (PETG frame + guards, no GPS, no camera) **~230–250 g**; Video (CF frame + O4, + GPS) **~245–265 g**. Battery ~90 g and frame ~60–70 g dominate. Joe to weigh a real build | Unit 4 AUW worksheet, Unit 5 weight budget |

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

### 7.1 Confirm compatibility

| Check | What to do | If it fails |
|-------|-----------|-------------|
| **Motor ↔ ESC current** | 4× 1404 4000KV on 3S with 3" tri-blades draws roughly 5–8 A per motor at full throttle. The GOKU ESC is 20 A continuous per motor. Confirm with the motor's thrust chart at 3S | Fine on paper; only fails if someone swaps to 4S or heavier props |
| **Motor mount pattern** | Measure the Spark 1404's bolt circle and thread: most 1404s are **9×9 mm M2** on the base; a few are 12×12 mm. Also the prop mount: T-mount (two M2 screws through the prop) vs 1.5 mm shaft with a nut | Sets the arm-tip hole pattern in the Unit 5 design brief and which props to buy. Wrong guess = every student frame is wrong |
| **ESC motor connection: pads vs plugs** | Look at the GOKU 20A V3 board: bare solder pads for the 12 motor wires, or 3-pin motor connectors. Flywoo ships some ESCs with plug headers | Pads = 12 solder joints (the bulk of the course's soldering). Plugs = 0, and Unit 6 step 2 becomes a plug-in step. This single fact decides whether the Base kit is "16 joints" or "4 joints" |
| **FC ↔ O4 cable** | The GOKU FC advertises a direct O4 plug. Confirm the included cable's connector matches the O4 Air Unit's | Otherwise the Video kit adds ~6 solder joints |
| **GPS ↔ FC** | M100 Pro ships an SH1.0 6-pin cable. Does the GOKU FC have a matching socket on a spare UART with I²C (SDA/SCL for the mag), or only pads? | Pads = 4–6 joints for the Video kit's optional GPS; also needs I²C for the mag or the compass does nothing |
| **Battery pack dimensions and connector** | Measure the Lumenier 1000 mAh 3S (typically ~75 × 35 × 25 mm). Decide **XT30 vs XT60** class-wide: the quoted pack is XT60 (larger, heavier, common on 5"); XT30 is the 3" norm and saves a few grams | Dimensions set the battery tray envelope in the design brief. Connector sets the pigtail on every aircraft and the charger leads; must be one standard per class |
| **Stack height and standoffs** | 16×16 stack: FC on top of ESC, plus the O4 on the Video kit. Measure total stack height with the supplied standoffs | Sets the minimum frame standoff height between plates in the design brief |
| **Betaflight target** | Confirm the GOKU GN405 V3 target name in Configurator 2026.6 and that a fresh flash finds the DP310 baro and the internal ELRS on UART6 | Unit 7 screenshots and the flash step depend on it |
| **Stock check** | Re-price at order time; FPV parts rotate quickly | Swap for an equivalent and update this list |

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

While building, tally every solder joint actually made, per kit. The expected Base count is 16 (12 motor + 2 pigtail + 2 capacitor); the count goes into the BOM, the Unit 6 lab plan (minutes per student), and the sales copy ("about 16 joints per drone, all on the same board"). If the ESC has motor plugs, the count drops to 4 and the course can honestly say "near-solderless."

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
| Compatibility pass (§7.1), one build of each weighed (§7.2), joints counted (§7.3) | Joe | Blocks final numbers in Units 2, 4, 5, 6, 8 |
| Goggles tier choice per school (§8); default N3 | Ours (sales) | Video kit one-pager |
| ~~Remote ID module~~ → Holy Stone HSRID; confirm shipped model on the FAA DOC list at purchase | Ours | §5 |
| Material profiles and the two frame variables (§9) | Ours (Unit 5) + Joe's stock frame model | Unit 5 leaf and design brief |
| Re-price at order time | Joe | §1 |

Tracked in [`docs/TODO.md`](../../../../docs/TODO.md) § Drone-building course.
