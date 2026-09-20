# Drone building — reference parts list, draft v4

**Status:** Draft, Sep 12 2026. Source is Joe's fourth list (Sep 12): same cart as v3 except **FC + ESC are the matched Flywoo F722 Mini V2 45 A stack again ($90)**. He had split them after a Flywoo ship-date misread (day/month vs month/day); the stack was available. Desk-checked against v2 stack facts and the v3 named pack. v3 ([`parts-list-draft-v3.md`](parts-list-draft-v3.md)) is superseded for **parts**.

Joe's cart totals **$840 video / $458 no-video**. No-video is now 840 − O4 − goggles − camera cable (Tony 5 and class gear still in that number). Kit split in §5.

---

## 1. Joe's v4 list, verified

| Role | Part | Qty | $ | Verified | Bucket |
|------|------|----:|--:|----------|--------|
| Camera + video link | [DJI O4 Air Unit](https://www.getfpv.com/dji-o4-air-unit.html) | 1 | 140 | Unchanged from v3. **Video only** | Confirmed |
| Frame | [FlyFishRC Tony 5 O4 Pro Sub250](https://www.getfpv.com/flyfishrc-tony-5-o4-pro-sub250-freestyle-frame-kit.html) | 1 | 55 | **5" / 215 mm**, FlyFish spec is **5" props**. Not a 3.5" sibling for 1404 + 3525. **Parked** with the Video SKU | **Parked** |
| Motors | [XILO Stealth 1404 4500KV](https://www.getfpv.com/xilo-stealth-1404-motor-4500kv.html) | 4 | 78 | Unchanged | Confirmed |
| GPS + Remote ID | [NewBeeDrone BeeID V1.1](https://www.getfpv.com/newbeedrone-beeid-v1-1-m10q-gps-module-remote-id.html) | 1 | 40 | Unchanged | Confirmed; pitch: in person |
| Battery | [Flywoo Explorer 1000 mAh 3S LiHV XT30UP, 2 pcs](https://flywoo.net/products/2pcs-explorer-1000mah-lihv-3s-80c-battery-flywoo-xt30up-) | 1 (2 packs) | 33 | Named. 66 g, 58 × 24.5 × 23.5 mm. Charge as **LiHV** | Closed for the tray |
| Charger | [ToolkitRC M4AC 30 W](https://flywoo.net/products/toolkitrc-m4ac-30w-2-5a-ac-smart-battery-balance-charger-xt30-xt60-output-for-1-4s-lipo-lihv-life-battery?sku=18057623952378812638142494) | 1 | 30 | Pick **XT30** SKU, LiHV mode | Class item |
| Smoke stopper | [SpeedyBee XT30/XT60 smoke stopper](https://a.co/d/0f6Xw8ji) | 1 | 10 | Dual-plug electronic fuse, 2–6S (7–25 V), ~1 A max, green LED / beep. **Use the XT30 pair only** (Explorer pack). Never plug both battery inputs at once. Props-off first power only — do not throttle or fly through it | **Closed** — class item |
| Receiver | [RadioMaster XR2 Nano](https://www.getfpv.com/radios/receivers/radiomaster-xr2-nano-elrs-2-4ghz-receiver.html) | 1 | 13 | 4 joints, tower antenna | Confirmed |
| Transmitter | [RadioMaster Pocket Crush](https://www.getfpv.com/radiomaster-pocket-crush-radio-controller-w-elrs-2-4ghz.html) | 1 | 85 | Batteries not included | Class item |
| Props | [Gemfan 3525](https://www.getfpv.com/gemfan-3525-hurricane-3-blade-propeller-set-of-4-1-5mm.html) | 2 sets | 6 | No prop screws in the pack | Confirmed |
| Goggles | [DJI Goggles N3](https://store.dji.com/product/dji-goggles-n3?vid=177141) | 1 | 230 | Video / class set | Confirmed |
| **FC + ESC** | [Flywoo GOKU F722 Mini V2 45 A 20×20 stack](https://flywoo.net/products/goku-f722-mini-v2-45a-32bit-20x20-stack?sku=18069198561683335206294030) | 1 | 90 | **Matched stack restored.** Same FC as v2/v3 (`FLYWOOF722PROV2`, baro, OSD, RX/GPS/DJI sockets, **M2** 20×20) + G45M 45 A AM32 ESC, 8-pin ribbon, capacitor, **XT30 pigtail in the box** (corrected Sep 18 — v4 originally recorded XT60 here, in §2 and in §3; the box ships XT30, so the pack mates directly and no pigtail needs sourcing). Assembled ~15.7 mm. In stock at GetFPV as of the v2 desk check | **Closed** — mix-and-match from v3 is gone |
| Radio cells | [Sony VTC5A 18650, 2 pcs](https://www.getfpv.com/sony-vtc5a-18650-2600mah-3-7v-li-ion-battery-2pcs.html) | 1 | 18 | Pocket, not aircraft | Class; confirm fit |
| O4 coax | [RunCam O4 90°–90°](https://www.getfpv.com/runcam-o4-o4-pro-coaxial-cable-90-to-90.html) | 1 | 12 | Video only | Video |

**Not on the list, still needed:** hardware pack + strap + M2×7 prop screws (Base), LiPo bags + fire can, printed guards, spares, extra chargers. ~~XT30 pigtail~~ — **not needed, the stack ships XT30** (corrected Sep 18).

---

## 2. What changed against v3

| Topic | v3 | Joe v4 | Our read |
|-------|-----|--------|----------|
| FC + ESC | Separate FC $45 + HGLRC 60 A $57; pinout/M2 vs M3 open | **Matched stack $90** | **Accept.** Closes pinout, hole size, and the oversized ESC pocket. Firmware and sockets unchanged. ~$12 cheaper, ~7 g lighter than the HGLRC ESC |
| Connector | XT30 pack vs HGLRC XT60 lead | Same pack; **stack ships XT30** | **Closed Sep 18.** The v3/v4 "stack ships XT60" note was wrong. Pack and pigtail are both XT30 — nothing to source, nothing to adapt. Still 2 of the 16 joints (the pigtail is soldered to the BAT pads either way) |
| Smoke stopper | Unresolved Amazon link | **SpeedyBee dual XT30/XT60**, $10 | **Accept.** Classroom: XT30 in and XT30 out; 1 A trip; props off |
| Totals | $852 / $482 | $840 / $458 | $12 is the stack vs split. No-video now correctly drops the camera cable too |
| Everything else | — | Same as v3 | Tony 5 parked with Video; battery/RX/charger/goggles unchanged |

---

## 3. Stack + XT30 pack — the remaining lead

The stack is the board pair we already desk-checked (v2 §1). One leftover from naming the Explorer pack:

| Check | State |
|-------|--------|
| FC↔ESC ribbon, M2 holes, 20×20, target `FLYWOOF722PROV2` | Closed |
| Pack XT30UP vs included pigtail | **Closed Sep 18 — the stack ships XT30.** Earlier v3/v4 text said XT60; that was wrong. Solder the included XT30 pigtail to the BAT pads (2 of the 16 joints). No adapter, no extra part, XT30 class-wide holds |
| Smoke stopper | **Closed.** SpeedyBee dual XT30/XT60, $10. Sit it between the Explorer pack and the XT30 pigtail. Dual plugs are a convenience (the stack's leftover XT60 still fits) — **only one battery input at a time.** 1 A max: first power, props off, no throttle. 3S LiHV ~13 V is inside 7–25 V. Treat the "finds ~90% of shorts" line as a bench aid, not a guarantee |
| O4 on 3S LiHV (13.05 V vs 13.2 V max) | OK. Never 4S |

**Joints (Base):** 16 on the ESC + 4 at the XR2 = **20** Solder SKU. Unchanged.

---

## 4. Printed frame — still not on the cart

Unchanged from v3 §4. Students print the structure; buy the hardware pack (screws, nylon standoffs, lock nuts, strap, ties, shrink, **M2×7 prop screws**).

---

## 5. Cost framing (Joe's list prices, pre-tax)

| | Base (printed frame) | Video (CF placeholder) |
|--|---------------------:|------------------------:|
| Stack (FC+ESC) | $90 | $90 |
| RX | $13 | $13 |
| Motors ×4 | $78 | $78 |
| BeeID | $40 | $40 |
| Batteries ×2 | $33 | $33 |
| Props ×2 sets | $6 | $6 |
| Frame | ~$12 filament + hardware + strap | $55 CF (Tony 5 — TBD) |
| O4 + 90–90 cable | — | $152 |
| **Per aircraft** | **~$272 → call it $275** | **~$467 → call it $465** until a 3.5" frame replaces Tony 5 |

Joe's **$458 no-video** = Base electronics + radio + 18650s + charger + smoke + **Tony 5** (no O4, goggles, or camera cable).

Class of 10 Base: 10 × $275 = $2,750 + 5 radios $515 + 18650s $90 + chargers $90 + smoke $20 + bags $40 + spares $300 ≈ **$3,800**. Ten Video: 10 × $465 = $4,650 + same + 2 N3 $460 ≈ **$6,100**. Pre-soldered +$25–40/kit.

---

## 6. AUW estimate (v4)

| | Base | Video |
|--|------|-------|
| Joints | 16 (ESC) + 4 (XR2) | same; O4 0; BeeID 0 if pitch matches |
| AUW | motors 40 + stack ~17 + RX 1 + BeeID 5 + props 7 + battery **66** + wiring ~12 + printed frame/guards ~70 ≈ **~220 g** | CF ~57 + O4 9 + cable/guards ~15 ≈ **~235–245 g** |

Lighter than v3 (HGLRC ESC was 14 g). Weigh one of each.

---

## 7. Alignment — verdict

**Closed this pass:** mix-and-match FC/ESC (point 2); SpeedyBee smoke stopper (point 3, named). Matched stack is the reference again.

**Parked:** Video SKU / Tony 5 (point 1) — do not hang 1404 + 3525 on a 5" frame; revisit Video after Base. See below.

**Still open:** XT30 pigtail on the ESC; hardware pack (point 4); do not print props (point 5, decided). Gemfan 3525 stays the Base prop.

---

## 7a. Tony 5 and the Video SKU (parked)

FlyFish's own spec: **5" props, 215 mm True-X, 57 g, 12×12 M2 motors, 20×20/25.5 M3 stack, 19/20 mm camera plates, O4-ready**. Their sub-250 example is **2004 motors + 5" bi-blades + 6S 380 mAh + AIO**, 248.7 g — and they say **O4 pushes that to ~260 g**.

That is not our Base electronics (1404 4500KV, Gemfan 3525, 3S 1000 mAh). Three ways to "make it work," only one of which is a real aircraft:

| Approach | What happens |
|----------|----------------|
| Bolt 1404s + 3525s onto Tony 5 | Motors fit. Props do not fill a 5" wheelbase. Extra arm length catches wind without extra disc. Guards are the wrong size. **Do not.** |
| Put 5" props on the 1404 4500KV | Motors are a 3.5" class. They will pull too much current and heat. **Do not.** |
| Give Video its own 5" powertrain (2004 or 2207, 5" props, likely 4S) | This *does* fly, and a real 5" handles outdoor wind better than a 3.5" — more disc area and thrust margin, not the carbon span by itself. It is a **different kit**: different motors, props, pack, charger current, AUW, Unit 4 numbers. Breaks the "Video = Base + O4 + CF frame" ladder. |

**Wind:** wheelbase alone does not add stability. Thrust-to-weight and prop disc do. A 5" with 5" props is the usual outdoor/cinematic platform; a 3.5" 1404 is a school/park flyer. Forcing 3.5" props onto a 5" frame is the worse of both (more area to weathervane, same small disc). If we later want a wind-capable Video SKU, that is a deliberate 5" kit — not Tony 5 on this BOM.

**Decision (Sep 12):** park Video. Ship the **Base course + Base kit**. Video / Pre-soldered / a 5" camera kit stay quote options on the same stack until we pick a real frame (3.5" sibling, or a separate 5" BOM).

---

## 8. Open items

| Item | Owner |
|------|-------|
| Video-kit frame — Tony 5 parked (not a 3.5" sibling; a real 5" would be a different BOM). Revisit after Base | Joe, later |
| ~~XT30 pigtail on the stack ESC~~ — **closed Sep 18**, the stack ships XT30 | — |
| SpeedyBee smoke stopper — **closed**; classroom: XT30 only, 1 A, props off | — |
| M4AC SKU is the XT30 face | Joe |
| VTC5A pair seats in the Pocket | In person |
| BeeID harness vs GPS socket; XR2 CRSF vs RX socket; capacitor; first-flash Setup tab; battery fit | In person |
| One Base + one Video weighed; photos | Joe |
| Hardware pack (screws, standoffs, strap, M2×7) | Ours + Joe's PLA-frame photo |
| LiHV leaf in Unit 1 | Ours |
| Regen CAD from this list (battery + matched stack; drop HGLRC) | Ours |

---

## 9. Sources

- Stack: [Flywoo F722 Mini V2 45 A](https://flywoo.net/products/goku-f722-mini-v2-45a-32bit-20x20-stack?sku=18069198561683335206294030) · [GetFPV](https://www.getfpv.com/flywoo-goku-f722-pro-mini-v2-45a-32bit-20x20-stack.html) · target `FLYWOOF722PROV2`
- Smoke stopper: Joe's Amazon listing (SpeedyBee store, dual XT30/XT60, $9.99, a.co/d/0f6Xw8ji)
- Tony 5: [FlyFishRC](https://www.flyfish-rc.com/products/tony-5-o4-pro-sub250-fpv-freestyle-frame) (5" props, 215 mm, 12×12 M2, 19/20 mm cam, O4-ready)
- All other lines: parts list v3 §9 (unchanged URLs)
