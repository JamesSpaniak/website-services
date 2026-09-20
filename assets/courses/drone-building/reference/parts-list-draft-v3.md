# Drone building — reference parts list, draft v3

**Status:** Draft, Sep 11 2026 — **superseded for parts by [`parts-list-draft-v4.md`](parts-list-draft-v4.md) (Sep 12)**. Kept for the split-FC/ESC desk check. The matched stack is back; the named Explorer pack and XR2 from this file still stand.

Joe's cart totals **$852 video / $482 no-video**. Those mix per-aircraft and class items (and keep the CF frame + camera cable in "no video"). Split in §5. This file is the reference, not a SKU.

---

## 1. Joe's v3 list, verified

| Role | Part | Qty | $ | Verified | Bucket |
|------|------|----:|--:|----------|--------|
| Camera + video link | [DJI O4 Air Unit](https://www.getfpv.com/dji-o4-air-unit.html) | 1 | 140 | 30 × 30 × 6 mm, 8.2 g w/ camera; 6-pin plug; **3.7–13.2 V**; 4K/60 onboard; 50 mm coax in the box | Confirmed (v1 §7.1). **Video only** |
| Frame | [FlyFishRC Tony 5 O4 Pro Sub250](https://www.getfpv.com/flyfishrc-tony-5-o4-pro-sub250-freestyle-frame-kit.html) | 1 | 55 | **5-inch, 215 mm wheelbase**, 57 g, 12×12 M2 motors, 20×20 / 25.5 stack (**M3**), O4 *Pro* camera plates. **Wrong size class** for 1404s and 3.5" props | **Replace** (same as v2) |
| Motors | [XILO Stealth 1404 4500KV](https://www.getfpv.com/xilo-stealth-1404-motor-4500kv.html) | 4 | 78 | 12×12 M2, T-mount 1.5 mm, 9.2 g, 24 AWG × 150 mm, rec. ESC 10–20 A. Box: M2×5/6/8 **motor-mount** screws, not T-mount prop screws | Confirmed |
| GPS + Remote ID | [NewBeeDrone BeeID V1.1 M10Q](https://www.getfpv.com/newbeedrone-beeid-v1-1-m10q-gps-module-remote-id.html) | 1 | 40 | FAA DOC RID000001995. 5.2 g, 22 × 15.6 × 8 mm. Plug into FC GPS socket if pitch matches | Confirmed; connector pitch: in person |
| Battery | [Flywoo Explorer 1000 mAh 3S LiHV 80C XT30UP, 2 pcs](https://flywoo.net/products/2pcs-explorer-1000mah-lihv-3s-80c-battery-flywoo-xt30up-) | 1 (2 packs) | 33 | **Named.** 3S1P LiHV, 80C, **XT30UP**, 66 g, **58 × 24.5 × 23.5 mm**. Flywoo's "full 11.4 V / storage 13.05 V" labels are swapped — treat as LiHV: full **4.35 V/cell = 13.05 V**, storage ~3.85 V/cell. O4's 13.2 V ceiling still clears 13.05 V | **Closed** for the tray; **XT30** class-wide |
| Charger | [ToolkitRC M4AC 30 W 2.5 A](https://flywoo.net/products/toolkitrc-m4ac-30w-2-5a-ac-smart-battery-balance-charger-xt30-xt60-output-for-1-4s-lipo-lihv-life-battery?sku=18057623952378812638142494) | 1 | 30 | AC in, LiPo/LiHV/LiFe 1–4S, one pack at a time. Sold as **XT30 or XT60 SKU** — pick **XT30** to match the pack. LiHV mode required | Confirmed; class item |
| Smoke stopper | [Amazon a.co/d/0f6Xw8ji](https://a.co/d/0f6Xw8ji) | 1 | 10 | Link still does not resolve. Must be **XT30** to sit between pack and pigtail (class standard flipped from XT60) | Joe: product name + connector |
| Receiver | [RadioMaster XR2 Nano ELRS 2.4 GHz](https://www.getfpv.com/radios/receivers/radiomaster-xr2-nano-elrs-2-4ghz-receiver.html) | 1 | 13 | 0.8 g, 16 × 12 × 6 mm, **integrated tower antenna** (no T-antenna), castellated pads, CRSF wire in the box. **4 joints at the RX**; FC end uses the 4-pin RX cable in the FC box | Confirmed; accepts the open v2 RX question |
| Transmitter | [RadioMaster Pocket Crush ELRS 2.4](https://www.getfpv.com/radiomaster-pocket-crush-radio-controller-w-elrs-2-4ghz.html) | 1 | 85 | Batteries **not included** | Confirmed; class item |
| Props | [Gemfan 3525 Hurricane 3-blade, 1.5 mm](https://www.getfpv.com/gemfan-3525-hurricane-3-blade-propeller-set-of-4-1-5mm.html) | 2 sets | 6 | 3.5", T-mount, ~1.8 g. Pack is **props only** — no M2 prop screws | Confirmed |
| Goggles | [DJI Goggles N3](https://store.dji.com/product/dji-goggles-n3?vid=177141) | 1 | 230 | Same as v1 §8. Video / class set | Confirmed |
| FC | [Flywoo GOKU F722 Pro Mini V2 20×20](https://flywoo.net/products/goku-f7-mini-v2-20x20-flight-controller) (URL slug says "F7"; product is the **F722 Pro Mini V2**) | 1 | 45 | Same FC as the v2 stack, sold separately. ICM42688, DPS310 baro, AT7456E OSD, plug sockets RX/GPS/DJI, dual 4-in-1 ESC sockets, target `FLYWOOF722PROV2`. Box: FC↔ESC cable, GPS/RX/DJI/camera/buzzer cables, M2 + M3 shock balls. **M2 20×20**. 9.9 g | Confirmed |
| ESC | [HGLRC Mini V1 60A 8S BL32 4-in-1](https://www.getfpv.com/electronics/electronic-speed-controllers-esc/4-in-1-esc-s/hglrc-mini-v1-60a-8s-bl32-4-in-1-esc.html) | 1 | 57 | 20×20 but **M3** holes, 46.8 × 34 × 6.5 mm, 14 g, 3–8S, 60 A. Retail listings include capacitor, SH1.0-8P cable, **XT60** pigtail parts. Overkill vs XILO's 10–20 A suggestion; heavier and larger than the Flywoo G45M it replaces | **Mix-and-match** — see §3 |
| Radio cells | [Sony VTC5A 18650 2600 mAh, 2 pcs](https://www.getfpv.com/sony-vtc5a-18650-2600mah-3-7v-li-ion-battery-2pcs.html) | 1 | 18 | **For the Pocket, not the aircraft.** GetFPV: **flat-top**, unprotected. Pocket bay is tight (~65 mm); unprotected 18650s fit; protected/button-top often do not | Class item; confirm fit |
| O4 coax | [RunCam O4 / O4 Pro coaxial 90°–90°](https://www.getfpv.com/runcam-o4-o4-pro-coaxial-cable-90-to-90.html) | 1 | 12 | Stock O4 includes 50 mm. Longer 90–90 is for routing on a large frame. **Video only**; skip on a 3.5" printed Base | Video; length TBD with the CF frame |

**Not on Joe's list, still needed:** hardware pack + battery strap (Base printed frame), M2 T-mount prop screws (~M2×7), LiPo bags + fire can, printed prop guards, spares, extra chargers (one M4AC is one pack at a time), soldering tools (school), XT30 pigtail if we do not use the ESC's XT60.

---

## 2. What changed against v2 and the outline

| Topic | v2 / outline v3.2 | Joe v3 | Our read |
|-------|---------------------|--------|----------|
| FC + ESC | Matched Flywoo F722 Mini V2 **stack** 45 A AM32, $90, M2, XT60 pigtail in the box | **Split:** same FC $45 + HGLRC 60 A 8S $57 = $102 | Same FC and firmware. ESC is a different brand, **M3** holes, larger board, XT60 pigtail vs XT30 pack. Pinout of Flywoo ESC socket vs HGLRC 8-pin is **in person**. Prefer the matched stack if stock allows; fold this list until Joe says otherwise |
| Battery | Unnamed Amazon, assumed XT60 | **Flywoo Explorer 1000 mAh 3S LiHV, 2-pack $33, XT30UP**, 58 × 24.5 × 23.5 mm, 66 g | **Closed.** Tray unblocked. Class connector **XT30**. Charge as **LiHV** |
| Connector | XT60 lock | Pack XT30UP; ESC listings ship XT60 | **Lock XT30.** Solder an XT30 pigtail (2 joints). Drop in-flight adapters. Smoke stopper must be XT30 |
| Receiver | BetaFPV Nano, pads, T-antenna | **XR2 Nano**, castellated pads, CRSF wire, **tower antenna** | **4 RX joints.** Unit 5: drop T-antenna mount; keep a keep-out for the ceramic tower (not under carbon) |
| Charger | Gens Ace Imars Mini 60 W XT60 | ToolkitRC M4AC 30 W, LiHV-capable | Accept. Buy the XT30 SKU. Still one pack at a time — class needs 2–3 |
| Radio power | Not listed | Sony VTC5A 18650 ×2 | Correct bucket (class). Confirm they seat in the Pocket |
| Camera cable | Not listed | RunCam 90–90 $12 | Video routing; not Base |
| Frame (Video) | Tony 5 rejected | Tony 5 still on the list | Still a **5" frame**. Shortlist unchanged (v2 §4) |
| Per-aircraft (Base electronics + print) | ~$280 | Joe $482 "no video" mixes class gear + CF frame | Recast §5: Base **~$285**, Video **~$470** placeholder until the CF frame is real |

---

## 3. Mix-and-match stack — what has to be true

The FC is the board we already desk-checked. The ESC is not.

| Check | Risk | Who |
|-------|------|------|
| **FC↔ESC 8-pin pinout** | Flywoo FC ships its own ribbon; HGLRC ships SH1.0-8P. Signal order, current sensor, and telemetry must match or motors/FC power are wrong | Joe, first build |
| **Hole size** | FC **M2**, ESC **M3**, both 20×20. Use M2 screws + grommets/standoffs; do not run M3 through the FC | In person |
| **ESC footprint** | 46.8 × 34 mm vs the old G45M ~33 × 30. Design brief stack pocket is more than a 20×20 hole pattern — the ESC overhangs | Unit 5 brief |
| **Pigtail** | ESC kit is XT60; pack is XT30UP | Solder XT30 to the ESC pads (the 2 battery joints). Do not fly with an adapter |
| **Current / cells** | 60 A 8S vs 1404s on 3S | Electrically fine, heavier (~7 g vs G45M) and pricier. Harmless if Joe wants supply-chain flexibility |
| **O4 on LiHV 3S** | 13.05 V full vs 13.2 V max | OK. Never 4S through this O4 port |

**Solder joints (Base):** motors 12 + XT30 pigtail 2 + capacitor 2 = **16 on the ESC** + **4 at the XR2** = **20** for students on the Solder SKU. BeeID 0 (if pitch matches). O4 0. Pre-soldered SKU: we do all 20.

---

## 4. Printed frame — still not on the cart

Unchanged from the v2 conversation: students print arms, plates, guards, tray, BeeID pocket. Buy fasteners.

| Item | Source |
|-------|--------|
| Filament (PLA proto, PETG final) | School / print-and-ship; ~40–60 g |
| Hardware pack | **Not on the list:** M2 stack screws, nylon standoffs, lock nuts, zip ties, heat-shrink, battery strap |
| T-mount prop screws | **M2 × ~7 mm × 8+.** Not in the Gemfan box; XILO screws are for the **arm** |
| Dummy prop hub (optional) | Print for Unit 5 fit check — **do not fly** |

---

## 5. Cost framing (Joe's list prices, pre-tax)

**Per aircraft** (electronics + printed Base extras):

| | Base (printed frame) | Video (CF frame placeholder) |
|--|---------------------:|------------------------------:|
| FC + ESC | $102 | $102 |
| RX | $13 | $13 |
| Motors ×4 | $78 | $78 |
| BeeID | $40 | $40 |
| Batteries ×2 | $33 | $33 |
| Props ×2 sets | $6 | $6 |
| Frame | ~$12 filament + hardware + strap | $55 CF (Tony 5 — TBD) |
| O4 | — | $140 |
| O4 90–90 cable | — | $12 |
| **Per aircraft** | **~$284 → call it $285** | **~$479 → call it $470** until a 3.5" frame replaces Tony 5 |

Joe's **$482 no-video** = our Base electronics **plus** radio $85 + 18650s $18 + charger $30 + smoke $10 + Tony 5 $55 + camera cable $12. Split those as class / Video.

**Class-level** (from his list + still-missing):

| Item | Approx. | Notes |
|------|--------:|-------|
| Pocket Crush | $85 | per team |
| 18650 pair | $18 | per radio; confirm Pocket fit |
| M4AC charger | $30 | ×2–3, XT30 SKU, LiHV mode |
| Smoke stopper | $10 | ×2, **XT30** |
| N3 goggles | $230 | Video, 1–2 |
| LiPo bags + fire can | ~$40 | not on list |
| Spares 10–15 % | | motors, one FC+ESC, packs |

Worked class of 10 Base: 10 × $285 = $2,850 + 5 radios $515 + 18650s $90 + chargers $90 + smoke $20 + bags $40 + spares $300 ≈ **$3,900**. Ten Video: 10 × $470 = $4,700 + same class items + 2 N3 $460 ≈ **$6,200**. Pre-soldered still +$25–40/kit.

---

## 6. Solder-joint and AUW estimates (v3 parts)

| | Base | Video |
|--|------|-------|
| Joints | 16 (ESC) + 4 (XR2) | same; O4 0; BeeID 0 (if pitch matches) |
| AUW estimate | motors 40 + FC 10 + ESC 14 + RX 1 + BeeID 5 + props 7 + battery **66** + wiring/cap/XT30 ~12 + printed frame + guards ~70 ≈ **~225 g** | CF ~57 + O4 9 + cable/guards ~15 in place of printed frame ≈ **~240–250 g** |

Pack is **~19 g lighter** than the v2 85 g assumption. Sub-250 has more room on Base. Video still waits on a 3.5" frame. Weigh one of each.

---

## 7. Alignment with the plan — verdict

**Aligned:** two kits (Base printed / Video CF), Part 107 + BeeID per aircraft, 3.5" / 1404 / Gemfan 3525, N3 goggles, PETG frames, RPIC on flight days, Solder / Pre-soldered SKUs, Betaflight `FLYWOOF722PROV2`.

**Changed, accept:** named Flywoo Explorer 1000 mAh 3S **LiHV** (tray dims closed); **XT30** class-wide; XR2 Nano (4 RX joints, tower antenna); Pocket 18650s on the class list; M4AC charger; FC sold separately from ESC.

**Changed, needs a fix:** Tony 5 still a 5" frame; HGLRC ESC vs Flywoo FC (pinout, M2 vs M3, XT60 pigtail vs XT30 pack); smoke stopper still an unresolved Amazon link — must be XT30; hardware pack still missing.

**Do not print props.** Fly Gemfan 3525.

---

## 8. Open items

| Item | Owner |
|------|-------|
| 3.5" Video-kit frame meeting v2 §4 (shortlist 2–3). Tony 5 still out | Joe |
| Confirm Flywoo FC 8-pin ↔ HGLRC ESC pinout; or revert to the matched F722 Mini V2 45 A stack | Joe |
| XT30 pigtail on the ESC (drop the included XT60); smoke stopper **product name, XT30** | Joe |
| M4AC: confirm the ordered SKU is the **XT30** face | Joe |
| VTC5A pair seats in the Pocket without forcing | In person |
| BeeID harness pitch vs F722 GPS socket; RX socket vs XR2 CRSF wire | In person |
| One Base + one Video weighed; joints tallied; component photos | Joe |
| Hardware pack contents (screws, standoffs, strap, M2×7 prop screws) | Ours + Joe's PLA-frame photo |
| LiHV charging / storage leaf in Unit 1 (charger type = LiHV, not LiPo) | Ours |
| CAD `bom.json` patched for this list; `generated/` still from v2 until regenerated | Ours |

---

## 9. Sources

- O4: [GetFPV](https://www.getfpv.com/dji-o4-air-unit.html) · [DJI specs](https://www.dji.com/o4-air-unit/specs)
- Tony 5: [GetFPV](https://www.getfpv.com/flyfishrc-tony-5-o4-pro-sub250-freestyle-frame-kit.html)
- XILO 1404: [GetFPV](https://www.getfpv.com/xilo-stealth-1404-motor-4500kv.html) · [Lumenier](https://www.lumenier.com/products/xilo-stealth-1404-motor-4500kv)
- BeeID: [GetFPV](https://www.getfpv.com/newbeedrone-beeid-v1-1-m10q-gps-module-remote-id.html) · [FAA DOC RID000001995](https://uasdoc.faa.gov/listDocs/RID000001995)
- Flywoo Explorer 1000 3S LiHV: [Flywoo](https://flywoo.net/products/2pcs-explorer-1000mah-lihv-3s-80c-battery-flywoo-xt30up-) · [fpvracing.ch dims 58×24.5×23.5 mm, 66 g](https://fpvracing.ch/en/3s/4312-flywoo-explorer-1000mah-3s-hv-80c-xt30-2-pcs.html)
- ToolkitRC M4AC: [ToolkitRC](https://www.toolkitrc.com/product/m4ac/)
- XR2 Nano: [RadioMaster](https://radiomasterrc.com/products/xr2-nano-2-4ghz-expresslrs-receiver)
- Pocket Crush: [GetFPV](https://www.getfpv.com/radiomaster-pocket-crush-radio-controller-w-elrs-2-4ghz.html) (batteries not included)
- FC: [Flywoo GOKU F722 Pro Mini V2](https://flywoo.net/products/goku-f7-mini-v2-20x20-flight-controller) · target `FLYWOOF722PROV2`
- ESC: [HGLRC 60A Mini 8S](https://www.hglrc.com/products/hglrc-60a-4in1-mini-8s-bl32-v1-esc) · [StudioSport includes](https://www.studiosport.fr/esc-4-en-1-60a-32-bit-mini8s-v1-blheli-32-hglrc-a34637.html)
- VTC5A: [GetFPV](https://www.getfpv.com/sony-vtc5a-18650-2600mah-3-7v-li-ion-battery-2pcs.html)
- RunCam O4 coax: [GetFPV](https://www.getfpv.com/runcam-o4-o4-pro-coaxial-cable-90-to-90.html)
- Gemfan 3525: [GetFPV](https://www.getfpv.com/gemfan-3525-hurricane-3-blade-propeller-set-of-4-1-5mm.html)
