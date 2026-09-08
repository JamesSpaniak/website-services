# Parts list template — <kit name> v<N>

Copy this file per kit revision (`parts-list-<kit>-v<N>.md`). Fill every cell; write *verify* where a value is unconfirmed and *n/a* where it does not apply. Prices are list, pre-tax, with the date. Weights are measured on our scale, not vendor claims, once hardware is in hand. Worked example: [`parts-list-draft-v1.md`](parts-list-draft-v1.md).

**Status:** draft / confirmed · **Date:** · **Source quote:** (file in this folder) · **Owner of compatibility:** · **Owner of kit split and cost:**

## 1. Per-aircraft parts

| Part (make, model, SKU) | Qty | Unit $ | Total $ | Weight g | Base | Video | Joints | Connection | Notes / verify |
|--------------------------|----:|-------:|--------:|---------:|:----:|:-----:|-------:|------------|----------------|
| Frame | | | | | | | | | material / CF |
| FC | | | | | | | | | sensors: gyro · accel · baro · OSD? |
| ESC | | | | | | | | pads / plugs | current rating |
| Receiver | | | | | | | | | protocol; built-in? |
| Motors | 4 | | | | | | | pads / plugs | KV, mount pattern, prop mount |
| Props (sets) | | | | | | | | | size, pitch |
| Battery | | | | | | | | connector | cells, mAh, C, dimensions |
| Pigtail + capacitor | | | | | | | | | |
| Prop guards | | | | | | | | | printed? material |
| Hardware pack | | | | | | | | | bolts, nuts, standoffs, strap |
| Camera / video unit | | | | | — | | | | goggles required |
| GPS (+ mag?) | | | | | — | opt | | | UART + I²C |
| **Per-aircraft total** | | | | **AUW est.** | | | **joints** | | |

## 2. Class-level items (shared, not per aircraft)

| Item | Qty rule | Unit $ | Notes |
|------|----------|-------:|-------|
| Remote ID broadcast module | aircraft airborne at once (RPIC count) | | FAA DOC model string |
| Radio | per team | | protocol, bind method |
| Goggles | 1–2 per class (Video only) | | model, glasses fit, mirror method |
| Charger + LiPo bags + fire can | 1 per class | | ports |
| Smoke stopper | 2–3 | | |
| Tools: iron, extractor, multimeter, calipers, IR thermometer, scale | 1 set | | school likely has |
| Spares | 10–15 % of aircraft cost | | motors, one stack, batteries |

## 3. Facts this list fixes for the course

| Fact | Value | Feeds |
|------|-------|-------|
| Stack mount pattern | | Unit 5 brief |
| Motor mount pattern / prop mount | | Unit 5 brief |
| Battery envelope + connector | | Unit 5 brief, Unit 6 |
| Sensors present | | Unit 7 |
| Receiver | | Unit 6, Unit 7 |
| OSD / telemetry path | | Unit 7 |
| Solder joints (Base / Video) | | Unit 6, BOM, sales copy |
| AUW measured (Base / Video) | | Unit 4, Unit 5, Unit 8 |
| Hover current / flight time | | Unit 4 |

## 4. Cost framing

| | Base | Video |
|--|-----:|------:|
| Quote lines used | | |
| Not-on-quote additions | | |
| **Per aircraft** | | |
| Class of 10, landed (aircraft + class items + spares) | | |

## 5. Confirmations owed

| Check | Owner | Result / date |
|-------|-------|---------------|
| Compatibility pass (current, patterns, cables, stack height, firmware target) | | |
| One build weighed, per component and complete | | |
| Joints counted | | |
| Component photos for Unit 2 | | |
| Re-price at order | | |
