# Quiet drones and bladeless lift — research note (Oct 2 2026)

Desk research from a Claude session, not tested. Numbers are first-principles estimates; verify on a thrust stand before quoting them in course material. Possible hook for a course-2 or Unit lab: "measure prop noise vs efficiency."

## 1. Can a bladeless fan lift a drone?

**Short answer: poorly.** A Dyson-style "bladeless" fan still has a small high-speed impeller in the base. It blows a thin jet out of the ring and the jet drags in surrounding air (Coanda entrainment). Dyson's "15× airflow" is volume moved, not thrust.

- Hover power ∝ T^1.5 / √(disk area). Lift is cheapest when you move **a lot of air slowly through a big disk**. A bladeless fan does the opposite: a small fast impeller plus duct/slot losses.
- Entrainment devices (Coanda ejectors) recover only ~1.2–1.5× the primary jet's thrust.

| Thrust source | Efficiency | Thrust-to-weight |
|---|---|---|
| Good large open prop | 8–12 g/W | ≫ 1 |
| Small drone prop | 3–7 g/W | ≫ 1 |
| Dyson-type fan (estimate) | ~2–4 g/W | ≪ 1 (100–300 g thrust, unit > 1.5 kg) |

**Related approaches:**
- **Jetoptera** — Coanda "fluidic" propulsion using turbine compressed air; experimental, larger aircraft.
- **Ion wind / EHD (no moving parts)** — MIT 2018 glider, 2.5 kg, ~3 N thrust. Silent but far too weak to hover anything useful; Berkeley flew millimeter-scale hovering versions.
- **Ducted fans** — the practical relative. Duct adds some thrust and shields tip noise, costs weight.

## 2. How quiet can a drone get?

**Noise sources, biggest first:**
1. **Blade tip speed** — noise scales ~5th–6th power of tip speed. Halving tip speed ≈ −15 dB. The biggest lever.
2. **Blade-passing tone** — the buzz at RPM × blade count.
3. **Broadband** — turbulent tip vortex and trailing edge.
4. **Motor/ESC whine** — electrical switching; easy fix.
5. **Interaction** — prop wash hitting arms, props disturbing each other.

**Limits:**
- Typical small consumer drone: ~70–80 dBA at 1 m.
- Quiet designs use large slow props (Wing, Zipline P2) or toroidal props. At 30–60 m they reach roughly 40–50 dBA — city background level, effectively inaudible.
- Close up there's a physics floor: hovering means continuously pushing air.
- Distance is free: each doubling ≈ −6 dB.

## 3. Path by budget

### Tier 0 — cheap/free, ~5–10 dB
- Bigger props + lower-KV motors at lower RPM for the same thrust (lower disk loading).
- Cut weight — every gram lowers hover RPM.
- ESC firmware with higher switching frequency / sinusoidal drive (AM32, Bluejay) to kill whine; RPM filtering; balanced props.
- Stiff frame; keep arms out of prop wash (pusher mount or wider arm spacing).

### Tier 1 — hobby budget, ~5–10 dB more perceived
- **Toroidal props** (looped blades; MIT Lincoln Lab 2023 reported much less annoying sound at similar thrust).
- **Low-pitch props with 3+ blades** — less load per blade.
- **Ducts with acoustic foam liners** — block tip noise, cost weight.
- **Uneven blade spacing or serrated trailing edges** (owl-wing trick) — spread the tone so it's less piercing.

### Tier 2 — measure before optimizing
- Thrust stand + mic at fixed 1 m. Phone app with A-weighting to start; calibrated USB mic better.
- Record dBA, spectrum, and watts → g/W together. A quiet prop that kills flight time isn't a win.

### Tier 3 — research level (skip for now)

| | Cost | Learning curve | Verdict |
|---|---|---|---|
| Blade-element tools (XROTOR/CROTOR, QPROP, OpenProp) | Free | Weeks; airfoil data, Reynolds number; predicts thrust/power, not noise | Later |
| Acoustic prediction (NASA ANOPP2, Farassat-type) | Free/restricted | Months; grad-student territory | Skip |
| Full CFD (OpenFOAM, SimScale) | Free–$$$ + compute | Months; easy to get confident wrong answers | Skip |
| **Print → test → measure loop ("Tier 3-lite")** | ~$0.50/prop + stand | Days | **Do this** |

A printed prop costs < $1 and ~1 hour, so dozens of physical iterations fit in the time it takes to learn the sim tools. Professionals validate sims on a stand anyway.

## 4. Starting designs

- **Toroidal props** — search Printables / Thingiverse for "toroidal propeller". Many community designs, some parametric (OpenSCAD / Fusion 360) for diameter/pitch. Quality varies; treat as starting points (none vetted).
- **Patent caution** — MIT Lincoln Lab patented its toroidal design. Personal/teaching use generally fine; check before selling props or kits using it.
- **Always test a store-bought baseline** of the same diameter. Commercial props are very good; beat that, not nothing.
- **Easy variables:** same diameter + lower pitch + more blades; serrations on a normal prop; lined duct around a stock prop.

## 5. Printing props

**Resin (SLA/MSLA) — best for ≤ 5" props.** Smooth surfaces, thin edges. Use tough/ABS-like resin; standard resin shatters. Printers ~$200–400 (Elegoo, Anycubic).

**FDM — larger, slower props.**
- Material: PETG, nylon, or CF-nylon. Not PLA (creeps/softens from motor heat).
- 0.2–0.25 mm nozzle for thin edges, 100% infill, slow speed.
- Print hub-down so layer lines run along the blade; otherwise blades snap at the root.
- Toroidal shapes need supports; resin handles them much better.

**After printing:**
1. Balance on a magnetic prop balancer (~$10); sand the heavy blade.
2. Sand to 400–800 grit + clear coat (reduces broadband noise).
3. **Spin-test every new print on the stand behind a shield**, ramping to full throttle, before it goes on an aircraft. Printed props can fail suddenly and throw pieces.

## 6. Tier 1 + 2 starter kit

| Item | Cost |
|---|---|
| DIY thrust stand (load cell + HX711 + Arduino + power meter) | $40–80 |
| Or commercial stand (Tyto / RCbenchmark) | $200+ |
| Measurement mic: miniDSP UMIK-1 (or phone app to start) | $0–110 |
| Software: REW or Audacity spectrum view | free |
| ESC with AM32 or Bluejay firmware | $20–40 |
| Prop balancer | ~$10 |
| Resin printer, if needed | $200–400 |

## 7. Test protocol

1. Mic 1 m away, 45° off the prop plane.
2. For each prop, set throttle to a **fixed thrust** (e.g., the drone's hover thrust per motor).
3. Record dBA, spectrum, watts → g/W.

Compare at **equal thrust** — otherwise a prop just looks quiet because it's doing less work.

**Classroom angle:** each student designs one variation (prop size, blade count, pitch, serrations); class compares dBA and g/W on a shared chart.

## Next steps (not started)

- DIY thrust stand parts list + wiring (load cell, HX711, Arduino, power meter).
- One-page test protocol + data sheet for students.
