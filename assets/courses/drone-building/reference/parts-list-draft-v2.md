# Drone building — reference parts list, draft v2

**Status:** Draft, Sep 9 2026. Source is Joe's second list (Sep 9, in conversation) plus his notes: plug-and-play parts only exist for ≤ 2" drones, so minimal-solder on a 3–3.5" build "is just not working"; soldering is acceptable if it keeps the drone viable; power and motors should be the only solder; the F722 stack is pricey and slow to ship so he will shop around; goggles = cheapest in production, or a monitor so the teacher sees too; PETG final print, PLA prototypes.

Every line below was desk-checked Sep 9 against manufacturer pages, Flywoo's wiring PDF, the FAA DOC list, and the Betaflight config repo (sources §9). v1 ([`parts-list-draft-v1.md`](parts-list-draft-v1.md)) keeps the material table (§3), goggles options (§8), material-choice mechanism (§9), and the first desk check; this file supersedes it for **parts**.

---

## 1. Joe's v2 list, verified

| Role | Part | Qty | $ | Verified | Bucket |
|------|------|----:|--:|----------|--------|
| Camera + video link | DJI O4 Air Unit | 1 | 140 | 30 × 30 × 6 mm, 25.5 M2, 8.2 g w/ camera; 6-pin plug; 3.7–13.2 V; 4K/60 onboard; camera has its own 14 mm-wide / 16 mm-hole mount | Confirmed (v1 §7.1) |
| Frame | FlyFishRC Tony 5 O4 Pro Sub250 | 1 | 55 | **5-inch, 215 mm wheelbase**, 57 g, 4 mm arms, 20×20 / 25.5 M3 stack, 12×12 M2 motors, O4 *Pro* camera plates, strap included. Sub-250 only with 2004 motors and 5" bi-blades. **Wrong size class** for 1404s and 3.5" props. Mfr price $39.99 | **Replace** |
| Motors | XILO Stealth 1404 4500KV | 4 | 78 | **12×12 mm 4× M2** (not Ø9), T-mount 1.5 mm, 9.2 g bare, 24 AWG × 150 mm bare leads, to 4S, 225 W, rec. prop 3". No thrust table; sibling FlyFish 1404 4500KV ≈ 16.5 A/motor on 3S tri-blade. **3S is the right cell count** — 4500KV + 3.5" on 4S is over-propped (>20 A, heat) | Confirmed; 3S: Joe |
| GPS + Remote ID | NewBeeDrone BeeID V1.1 M10Q | 1 | 40 | **FAA DOC RID000001995, Broadcast Module.** Standalone broadcaster (own M10 GPS + baro, BLE) powered from FC 5 V; FC reads GPS over one UART at 115200. 5.2 g, 22 × 15.6 × 8 mm. **No compass, no battery.** Setup via its own WiFi page (192.168.4.1), no app; serial shown there. Ships with a pre-wired JST harness (pitch unstated) | Confirmed; connector pitch: in person |
| Battery | Amazon a.co/d/06WtDNdG | 2 | 32 | Link does not resolve for us. Must be **XT60** to match the stack pigtail and charger, or the $9 adapter stays on the aircraft | **Joe: product name, cells, mAh, dims, connector** |
| Charger | Gens Ace Imars Mini G-Tech 60 W 2–4S 5 A, XT60 | 1 | 33 | Balance charger, XT60 output. One pack at a time — a class needs 2–3, or a multi-port unit | Confirmed; qty: ours |
| Smoke stopper | Amazon a.co/d/0f6Xw8ji | 1 | 10 | Link does not resolve; any XT60 smoke stopper works | Joe: product name |
| Receiver | BetaFPV ELRS 2.4 GHz Nano | 1 | 13 | **Solder pads**, ships 4 loose 30 AWG wires + pin header, no plug. 0.7 g, T-antenna on U.FL, ELRS 3.3.0; binds to any 3.x Pocket | Confirmed; see §3 |
| Transmitter | RadioMaster Pocket (Crush) ELRS 2.4 | 1 | 85 | Standard classroom radio; binding phrase per team | Confirmed |
| Props | Gemfan 3525 Hurricane 3-blade, 1.5 mm | 2 sets | 6 | **3.5"**, 2.5" pitch, T-mount (M2 screws), 1.8 g each. Gemfan recommends 1806–2004 motors / 250–380 g — a 1404 is below their range; fine on 3S as a trainer | Confirmed |
| Battery adapter | Amazon a.co/d/03Agt1Zq | 1 | 9 | Presumably XT60↔XT30. Prefer a pack that needs no adapter (one fewer failure point in flight) | Joe |
| Goggles | DJI Goggles N3 | 1 | 230 | Full O4 link, fits over glasses, phone live view via USB-C → classroom display. No HDMI; a monitor is not possible except via a $1,000 DJI RC Pro relay | Confirmed (v1 §8) |
| Flight stack | Flywoo GOKU F722 Pro Mini V2 45A 32-bit 20×20 | 1 | 90 | F722, ICM42688, **DPS310 baro**, **AT7456E OSD**, 16 MB flash, 6 UARTs, 20×20 M2, 15.7 mm assembled. ESC 45 A AM32, **3–6S**, **motor and battery pads**, XT60 pigtail + capacitor included, current sensor. **Plug sockets:** RX 4-pin (UART2), GPS 4-pin (UART5, no SDA/SCL), DJI 6-pin (UART3), camera, buzzer/LED. Target `FLYWOOF722PROV2`, baro enabled. **In stock at GetFPV $90.99** (Pyrodrone $94.99; RDQ sold out) — no China shipping needed | Confirmed |

**Not on Joe's list, still needed:** hardware pack + battery strap (Base printed frame), LiPo bags + fire can, prop guards (printed), spares, a second and third charger or a multi-port unit, tools (school). Joe's totals ($821 video / $451 no-video) mix per-aircraft and class items; split in §5.

---

## 2. What changed against v1 and the outline

| Topic | v1 / outline v3.1 | Joe v2 | Our read |
|-------|-------------------|--------|----------|
| Prop size | 3" | **3.5"** (Gemfan 3525) | Fine; within the original 3–3.5". Lock 3.5" once the frame is picked |
| Frame (Video kit) | QAV-S Mini 3" (12×12 arms, needed adapters) | Tony 5 (**5"**) | Neither works. Need a **3.5" sub-250 frame with 20×20 stack, 12×12 M2 motor mounts, standard-O4 camera plates, top battery** (§4) |
| Stack | GN405 Nano 16×16, 20 A, built-in ELRS, baro, no OSD, GPS on pads | **F722 Mini V2 20×20, 45 A, no RX, baro, OSD, RX/GPS/DJI plug sockets** | Better fit: sockets make the receiver and BeeID plug-in, OSD helps the Video kit, US stock. Costs +$13 and a $13 receiver; 45 A is overkill for 1404s but harmless. 20×20 pattern goes into the design brief |
| Receiver | Built into FC | Separate BetaFPV Nano (pads) | See §3: swap to a plug-terminated RX or accept 4 joints at the RX end |
| Sensors | Option A: no GPS on Base | **GPS on every aircraft** (comes with the RID module), no compass | Pedagogy unchanged (Angle mode, no hold modes taught on Base). GPS Rescue becomes available as a safety net; Position Hold would need a straight-line fly (no mag). Compass for the Video kit = BeeID Pro (13.4 g) on SDA/SCL pads, optional |
| Remote ID | Holy Stone HSRID, shared class set, own battery | **BeeID per aircraft**, FC-powered | Accept. +$40/aircraft, −$40–80/class; −10 g; nothing extra to charge; serial per aircraft, no moving modules; registration unchanged (module serial on each aircraft's entry). Unit 1/3/6/8 text updates |
| Connector standard | XT30 (GN405 pigtail) | **XT60** (F722 pigtail, Imars charger) | Lock XT60. Pick packs with XT60; drop the adapter |
| Cell count | 3S | Joe's pack unknown | **3S.** Motors and props are over-propped on 4S; O4 tolerates 3S direct |
| Solder joints (Base) | 16 | **16 on the ESC** (motors 12, pigtail 2, cap 2) + 0–4 at the RX end + 0 for BeeID and O4 if plugs match | Same core count. Joe's claim "power and motors are the only solder" holds if the BeeID harness fits the GPS socket and the RX is plug-terminated |
| Goggles | N3 default, Goggles 3 upgrade | N3 | Agree. "Teacher sees at the same time" = N3 phone mirror to the room display, not a monitor |
| Frame material | PETG default | PLA prototype → PETG final | Lock. Same STL; Unit 5 prints iteration 1 in PLA, turn-in in PETG |
| Per-aircraft cost (Base, printed frame) | ~$185 | **~$280** | Drivers: RID per aircraft +$40, second battery +$16, better motors +$22, RX +$13, stack +$12 |

---

## 3. Soldering: how many joints, and what it costs us in market

**Count with Joe's v2 parts (Base kit):** motors 12 + battery pigtail 2 + capacitor 2 = **16 joints on the ESC**. Receiver: the FC has a 4-pin socket but the BetaFPV Nano ships bare pads and loose wires → **4 joints at the receiver** plus a crimped/plugged FC end, unless we pick a receiver that ships with the matching plug (Joe to pick; several ELRS nano RXs ship SH1.0 cables). BeeID: pre-wired harness → **0** if the pitch matches the GPS socket (in person). O4: **0**. Realistic total **16–20**, all beginner-grade pad joints, ~30–40 min per student with a demo first.

**Market (research Sep 9, sources §9):** every school *build* kit sold at scale is no-solder — PCS Edventures RubiQ and FLEX ($4k–26k, keyed connectors), DroneBlocks DEXI-3/5 ($799–2,995, plug-and-play), Pitsco Drone Infinity ($649), Flybrix, Five33 Level 1. Soldering appears only in racing-adjacent tiers (Five33 Level 3, Drones in School repairs). Estimated loss from **requiring** soldering: **~50–70 % of buying units overall** (middle schools, general STEM electives, libraries, competition teams), but only **~20–35 % of the HS CTE-engineering core** we target — PLTW, SkillsUSA, and FIRST programs solder routinely. No district bans found; the friction is irons, fume extraction, lead-free policy, and supervision ratio.

**Recommendation — two SKUs from the same parts, no custom hardware:**

| SKU | Who solders | Student build | Price delta | Buyer |
|-----|-------------|---------------|------------:|-------|
| **Solder** (v1 default) | Students, 16–20 joints, one board | Full Unit 6 | — | CTE labs, engineering academies |
| **Pre-soldered** | We (or the vendor) solder motors, pigtail, capacitor onto the ESC and terminate the RX before shipping; students bolt, plug, and route | Unit 6 becomes mechanical + plugs; soldering moves to an optional practice-board lab | +$25–40 labor | Middle schools, general STEM, no-lab schools |

This is Joe's "custom parts to avoid it" without custom parts: a pre-built ESC + motor harness. Constraint: motor leads are fixed at 150 mm, so printed frames must keep arm length inside that — 3.5" arms are ~75–90 mm, fine. Reusability across cohorts is a selling point competitors push; the Pre-soldered SKU restores it.

---

## 4. Frame requirements for the Video kit (replaces Tony 5)

The Base kit prints its own frame, so this is only the Video kit's CF frame. Requirements: **3.5" props (≈ 150–160 mm wheelbase)**, **20×20 M2 stack** with ≥ 16 mm clear height (F722 stack is 15.7 mm; more if the O4 board stacks above), **12×12 M2 motor mounts** (XILO 1404), **camera plates that take the standard O4 camera** (14 mm mount, 16 mm holes — not only the O4 Pro's 20 mm), top-mount battery with strap, ≤ 65 g, sub-250 g with a 3S 850–1000 mAh pack, guards available or a flat arm profile students can print guards for. Joe to shortlist 2–3 candidates; we verify from spec sheets as done here.

For the **Base printed frame**, the design brief now reads: 12×12 M2 arm tips (XILO 1404), 20×20 stack pocket ≥ 16 mm clear, 3.5" prop clearance with guard, BeeID pocket 22 × 16 × 8 mm on the top plate with sky view, RX T-antenna mount, XT60 pack tray (dims once Joe names the pack), 150 mm motor-lead routing.

---

## 5. Cost framing (Joe's list prices, pre-tax)

| | Base (printed frame) | Video (CF frame) |
|--|---------------------:|-----------------:|
| Stack + RX | $103 | $103 |
| Motors ×4 | $78 | $78 |
| BeeID (GPS + RID) | $40 | $40 |
| Batteries ×2 | $32 | $32 |
| Props ×2 sets | $6 | $6 |
| Frame | ~$12 filament + hardware pack + strap | ~$55 CF (TBD) |
| O4 Air Unit | — | $140 |
| **Per aircraft** | **~$271 → call it $280** | **~$454 → call it $460** |

Class-level: Pocket radio $85 per team; Imars charger $33 (×2–3 or one multi-port ~$100); smoke stopper $10 ×2; N3 goggles $230 (Video, 1–2); LiPo bags + fire can ~$40; spares 10–15 %. Remote ID is no longer a class item.

Worked class of 10 Base: 10 × $280 = $2,800 + 5 radios $425 + chargers $100 + smoke stoppers $20 + bags $40 + spares $300 ≈ **$3,700** (~$370 landed per aircraft). Ten Video: 10 × $460 = $4,600 + same class items + 2 N3 $460 ≈ **$5,900**. Pre-soldered SKU adds ~$300–400 per class of 10.

For comparison, PCS Edventures sells 10 no-solder RubiQ drones for $25,995 and DroneBlocks 5 DEXI-5 for $10.5–13.2k; our landed numbers are a fraction of that with more build content.

---

## 6. Solder-joint and AUW estimates (v2 parts)

| | Base | Video |
|--|------|-------|
| Joints | 16 (ESC) + 0–4 (RX end) | same; O4 plug 0; BeeID 0 (if pitch matches) |
| AUW estimate | motors 40 + stack ~17 + RX 2 + BeeID 5 + props 7 + battery ~85 (3S 850–1000, TBD) + wiring/cap/XT60 12 + printed frame + guards ~70 ≈ **~240 g** | CF frame ~60 + O4 9 + camera adapter/guards ~15 in place of the printed frame ≈ **~245–255 g** |

The 45 A stack and XT60 hardware add ~10 g over v1. Sub-250 is tighter; still a soft cap per the outline.

---

## 7. Alignment with the plan — verdict

**Aligned:** two kits (Base printed / Video CF), Part 107 path with per-aircraft registration, minimal-solder as *the goal* with soldering accepted for v1, Betaflight 2026.6, barometer on the FC, N3 goggles, PETG frames, RPIC on flight days, 3–3.5" class, sub-250 soft cap.

**Changed, accept:** 3.5" props; 20×20 F722 stack with plug sockets; separate ELRS receiver; BeeID as combined GPS + Remote ID per aircraft (replaces the shared strap-on and the Option A "no GPS" line — GPS is now present but hold modes are still not taught on Base); XT60 standard; PLA-prototype → PETG-final flow.

**Changed, needs a fix:** the Tony 5 is a 5" frame; the battery, smoke stopper, and adapter are unidentified Amazon links; the receiver ships without a plug.

**New decision for us:** ship two SKUs (Solder / Pre-soldered) from day one — §3.

---

## 8. Open items

| Item | Owner |
|------|-------|
| 3.5" Video-kit frame meeting §4 (shortlist 2–3) | Joe |
| Battery: product name, cells (3S), mAh, dims, XT60 | Joe |
| Smoke stopper and adapter product names (or drop the adapter) | Joe |
| Receiver that ships with the FC's 4-pin plug, or accept 4 RX-end joints | Joe |
| BeeID harness pitch vs F722 GPS socket; RX socket pitch | In person |
| Confirm FC socket cables are included in the stack box | In person |
| One Base + one Video build weighed; joints tallied; component photos | Joe, in person |
| Pre-soldered SKU: labor time per kit, price, who solders (us vs vendor) | Ours |
| Fleet registration workflow: one Part 107 account, per-aircraft entries with BeeID serials | Ours (Unit 3) |
| Unit 7: GPS on UART5 at 115200, GPS Rescue config as safety net, no hold modes on Base | Ours |

---

## 9. Sources

- Tony 5: [GetFPV](https://www.getfpv.com/flyfishrc-tony-5-o4-pro-sub250-freestyle-frame-kit.html) · [FlyFishRC](https://www.flyfish-rc.com/products/tony-5-o4-pro-sub250-fpv-freestyle-frame)
- XILO 1404 4500KV: [GetFPV](https://www.getfpv.com/xilo-stealth-1404-motor-4500kv.html) · [Lumenier](https://www.lumenier.com/products/xilo-stealth-1404-motor-4500kv) · [FlyFish 1404 3S data](https://intofpv.com/t-flyfish-1404-4500kv-anyone-running-these)
- Gemfan 3525: [GetFPV](https://www.getfpv.com/gemfan-3525-hurricane-3-blade-propeller-set-of-4-1-5mm.html) · [Gemfan](https://www.gemfanhobby.com/3525-hurricane-pc-3-blade-t-mount.html)
- BeeID: [GetFPV](https://www.getfpv.com/newbeedrone-beeid-v1-1-m10q-gps-module-remote-id.html) · [NewBeeDrone](https://newbeedrone.com/products/newbeedrone-beeid-v1-1-m10q-gps-module-with-remoteid-drone-tracker) · [FAA DOC RID000001995](https://uasdoc.faa.gov/listDocs/RID000001995) · [Oscar Liang](https://oscarliang.com/newbeedrone-beeid-module/) · [BeeID Pro (compass)](https://newbeedrone.com/products/newbeedrone-beeid-pro-m10n-gps-module-with-remoteid)
- BetaFPV ELRS Nano RX: [GetFPV](https://www.getfpv.com/betafpv-elrs-2-4ghz-nano-receiver.html) · [BetaFPV](https://betafpv.com/products/elrs-nano-receiver) · [ELRS 3.x compatibility](https://github.com/ExpressLRS/ExpressLRS/releases/tag/3.5.0)
- F722 Mini V2 stack: [Flywoo](https://flywoo.net/products/goku-f722-mini-v2-45a-32bit-20x20-stack) · [FC](https://flywoo.net/products/goku-f722-pro-mini-v2-flight-controller) · [ESC](https://flywoo.net/products/goku-g45m-32bit-128k-2-6s-45a-esc) · [GetFPV](https://www.getfpv.com/flywoo-goku-f722-pro-mini-v2-45a-32bit-20x20-stack.html) · [Betaflight target](https://github.com/betaflight/config/blob/master/configs/FLWO/FLYWOOF722PROV2/config.h) · [baro issue #13821](https://github.com/betaflight/betaflight/issues/13821) · [GUI save issue #15315](https://github.com/betaflight/betaflight/issues/15315)
- FAA registration: [Remote ID](https://www.faa.gov/uas/getting_started/remote_id) · [Registry RID](https://www.faa.gov/licenses_certificates/aircraft_certification/aircraft_registry/RID)
- Market: [PCS Discover Drones](https://edventures.com/products/discover-drones) · [PCS Drone Pathways](https://dronepathways.com/) · [DroneBlocks DEXI](https://droneblocks.io/program/dexi-5-px4-stem-drone-kit/) · [Pitsco](https://www.pitsco.com/products/drone-infinity-kit) · [Five33 education](https://flyfive33.com/pages/533-educational-program) · [Drones in School](https://www.dronesinschool.com/start-a-team) · [NSTA STEM safety](https://www.nsta.org/blog/stem-course-safety-protocols-science-certified-teachers-assigned-teaching-technology-and) · [NCES engineering credit](https://nces.ed.gov/programs/digest/d22/tables/dt22_225.25.asp) · [PLTW 2025 report](https://www.pltw.org/hubfs/PLTW_Brand/PLTW_2025_Annual_Report.pdf)
