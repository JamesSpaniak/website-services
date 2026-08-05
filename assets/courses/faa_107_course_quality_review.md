# FAA 107 course — quality review backlog

**Status:** Ch.1–Ch.5 and Ch.8 done. Ch.6–7 partial; Ch.9 restructuring and Ch.10 consolidation partial (Aug 5 2026). **Do not combine** `u5`/`u6`. Publish via `faa_107_course.json` (include reviewed Ch.5–10 edits; ship **Ch.3+4 together**).  
**Sources checked (Jul 26 2026):**

| Source | Path | Notes |
|--------|------|-------|
| Course JSON (canonical) | `faa_107_course.json` | String refs (`u{n}`); ship via admin PUT |
| Unit 1 outline | `outlines/regulations powerpoint in an outline.txt` | Present |
| Unit 2 outline | `outlines/2 -airports 2026 outline.docx` | Present |
| Image mapping (unit 2/3) | `pictures-for-airports_mapping.csv`, `pictures-for-airports_review.md` | Uploaded; Ch.2 figure↔text alignment shipped |
| Broader restructure plan | [`docs/tech/course-content-restructure-plan.md`](../../docs/tech/course-content-restructure-plan.md) | Prior author intake; this file is the focused Ch.1–4 quality backlog |

**How to use:** work top-down per chapter. For each item: confirm against outline + JSON, decide, then edit JSON (and regenerate refs if tree/ids change). Mark items done here when shipped.

---

## Coverage checklist (outline ↔ JSON)

Use this before trusting a unit as “done.” If either column is missing or thin, **review before shipping**.

| Course unit | Outline in `outlines/` | JSON in restructured payload | Quality status |
|-------------|------------------------|------------------------------|----------------|
| 1 PART 107 REGULATIONS | Yes — `regulations powerpoint in an outline.txt` | Yes | **Done** (Ch.1 pass Jul 26 2026) — see § Chapter 1 |
| 2 Airports, Airspace, and Data Sources | Yes — `2 -airports 2026 outline.docx` | Yes | **Done** (Ch.2 pass Jul 26 2026) — see § Chapter 2 |
| 3 Airspace Classifications | Yes — `3 airspace class 3 2026 outline.docx` | Yes | **Done** (Ch.3 pass Jul 26 2026) — see § Chapter 3 |
| 4 AIRPORT OPERATIONS | Yes — `4 Airport operations 2026 outline.docx` | Yes | **Done** (Ch.4 pass Jul 26 2026) — see § Chapter 4 |
| 5 WEATHER | Yes — `5 Drone Weather 2026 outline.docx` | Yes | **Done** (Ch.5 pass Jul 26 2026; descriptions polished Jul 27 2026) — see § Chapter 5 |
| 6 WEATHER EFFECTS… | Yes — `6 -Drone Weather - Part 2A - 2026 outline.docx` | Yes | **Partial** (content Jul 27 + stem regroup Aug 5 2026; images still open) — see § Chapter 6 |
| 7 LOADING AND PERFORMANCE | Yes — `7- Loading & Performance 2026.pptx.txt` | Yes | **Partial** (load-factor wording pass Aug 5 2026; images/content review continues) — see § Chapter 7 |
| 8 EMERGENCY PROCEDURES | Yes — `8 Emergency Procedures Outline.docx` | Yes | **Done** (consolidated earlier; confirmed complete Aug 5 2026) — see § Chapter 8 |
| 9 AERONAUTICAL DECISION MAKING | Yes — `9- Aeronautical decision making 2026 outline.docx` | Yes | **Partial** (overview/risk/CRM/physiology pass Aug 5 2026) — see § Chapter 9 |
| 10 RADIO COMMUNICATION PROCEDURES | Yes — `10 - Radio Communication Procedures 2026.pptx.txt` | Yes | **Partial** (11 → 3 leaf consolidation Aug 5 2026) — see § Chapter 10 |

**Rule:** if an outline is missing for a future unit, or a leaf exists in the outline but not in JSON (or vice versa), add a row under **Open gaps** at the bottom and do not mark that leaf production-ready.

---

## Chapter 1 — Operating Rules (unit `13` under PART 107 REGULATIONS)

### Current leaf order in JSON (`13` → children) — **confirmed Jul 26 2026**

1. `131` Registration, Inspection, and Falsification *(kept combined)*  
2. `132` Accident Reporting, In-Flight Emergency, and Hazardous Operations  
3. `133` Medical Conditions, Alcohol, and Drugs  
4. `140` Operation Over People — General Rule  
5. `141` Transportation of Property *(new leaf; split from former `134`)*  
6. `134` Operation From Moving Vehicles  
7. `135` Visual Line of Sight (VLOS) and Multi-Aircraft Rules  
8. `136` Right-of-Way Rules and Operation Near Aircraft  
9. `137` Autonomous Flight and RPIC Responsibility  
10. `138` Preflight Familiarization, Inspection, and Airspace Operations  
11. `139` Operating Limitations  

Night content stays under stem `17` (not duplicated inside Operating Rules).

---

### 1.1 First Operating Rules section — title (`131`) — **DONE Jul 26 2026**

| | |
|--|--|
| **Decision** | Keep combined title **Registration, Inspection, and Falsification**. |

---

### 1.2 Second section — surface In-Flight Emergencies (`132`) — **DONE Jul 26 2026**

| | |
|--|--|
| **Shipped** | Renamed leaf to **Accident Reporting, In-Flight Emergency, and Hazardous Operations**. Body order already Accident → In-Flight Emergency → Hazardous; left unchanged. |

---

### 1.3 Section ordering — Operation Over People after Drugs / Alcohol — **DONE Jul 26 2026**

| | |
|--|--|
| **Shipped** | Moved `140` to immediately after `133`. Transportation of Property (`141`) follows `140` (outline grouping). |

---

### 1.4 Split Moving Vehicles vs Transportation of Property — **DONE Jul 26 2026**

| | |
|--|--|
| **Shipped** | `134` is **Operation From Moving Vehicles** only. New leaf `141` **Transportation of Property** (placed after OOP). Leaf-paths regenerated (172 nodes / 134 leaves). |
| **Follow-up** | Legacy leaf-scoped question bulk still maps some Property items to `u134` — unit-level bank (`faa_107_questions_unit_level.bulk.json`) is unaffected; re-map leaf-scoped rows if that import path is reused. |

---

### 1.5 Visual Observer → VLOS placement / dedupe (`123` → `135`) — **DONE Jul 26 2026**

| | |
|--|--|
| **Shipped** | Trimmed `123` to role/intro only. Moved communication/scan + brief-controller-glance content into `135` after the two VLOS definition paragraphs; multi-aircraft rule follows. Removed duplicate VO duties that previously trailed `135`. |

---

### 1.6 Night Flight Hazards — inspect language (`172`) — **DONE Jul 26 2026**

| | |
|--|--|
| **Shipped** | Replaced “reconnoiter…” with **“inspect the site during daylight before the night operation.”** Night home remains stem `17`. |

---

### Chapter 1 — additional fixes shipped Jul 26 2026

| Fix | Leaf | Change |
|-----|------|--------|
| Alcohol 8-hour wording | `133` | “within 8 hours of drinking” → **“within the previous 8 hours”** |
| Night vs civil twilight label | `171` | Relabeled the end-of-evening / start-of-morning period as **night** (not civil twilight) |
| Preflight leaf title | `138` | Renamed to **Preflight Familiarization, Inspection, and Airspace Operations** |

---

## Chapter 2 — Airports, Airspace, and Data Sources (unit `u2`)

### Current direct children in JSON — **confirmed Jul 26 2026**

1. `u21` Introduction to Air Traffic and the NAS → `u211` / `u212` / `u213`  
2. `u22` Navigation: Latitude and Longitude  
3. `u23` Airports, Charts, and Data Sources → Chart Supplement / NOTAMs / ATIS  
4. `u24` Aeronautical Charts → Sectional / TAC / Legend / Obstacles / MEF  

---

### 2.1 Section intro stem for NAS/ATC (`u21`) — **DONE Jul 26 2026**

| | |
|--|--|
| **Shipped** | New stem **Introduction to Air Traffic and the NAS** (`u21`) wrapping `u211`–`u213`. Stem text sets traffic → NAS → ATC, then points ahead to L&L / data sources / charts, and explicitly defers airspace classes and airport ops to later units. |

---

### 2.2 Course-level split + unit intro clarity — **DONE Jul 26 2026**

| | |
|--|--|
| **Decision** | Keep unit 2 / 3 / 4 split. Keep `u23` and `u24` as separate stems (recording title slides). |
| **Shipped** | Unit `u2` description + text_content rewritten: this unit is **context + finding/using airport data**; classifications next; airport ops after. |

---

### 2.3 Latitude and Longitude pictures — order and color clarity (`u22`) — **DONE Jul 26 2026**

| | |
|--|--|
| **Shipped** | Reordered `images_url`: Globe → L&L Lines → Reading lines → Points A–D → samples → quiz figures. Rewrote text with per-figure color rules (globe yellow/red vs chart black ticks / yellow callouts). |
| **Out of scope** | `Latitude and Longitude Extra Practice Key.docx` left as instructor key (not mapped into course). |

---

### 2.4 ATIS — ATIS Alpha / ATIS Bravo (`u233`) — **DONE Jul 26 2026**

| | |
|--|--|
| **Shipped** | Teaching labels **ATIS Alpha / ATIS Bravo**. Sample radio phrase kept as **“with information Bravo”** (standard ATC wording), with a short note that it reports the ATIS letter. |

---

### 2.5 Sectional Charts — Testing Supplement out of preflight step (`u241`) — **DONE Jul 26 2026**

| | |
|--|--|
| **Shipped** | Last paragraph is chart-legend / ATC / airspace check only. Testing Supplement guidance remains on `u243`. |

---

### 2.6 Terminal Area Charts — drop purple sectional claim (`u242`) — **DONE Jul 26 2026**

| | |
|--|--|
| **Shipped** | TACs cover the busiest airports with a zoomed-in view (e.g. Class B near a major city); Miami TAC called out. Purple/sectional “and receive” language removed. Scale/revision facts kept. |

---

### 2.7 Chart Legend image↔text alignment (`u243`) — **DONE Jul 26 2026**

| | |
|--|--|
| **Shipped** | Reordered images: airport-data legend slides → example airport data → sectional legend sheet → airspace-info legends → communications boxes. Text now references each figure group; airspace legends framed as chart recognition (full class rules stay in unit 3). |

---

### 2.8 Man-Made Obstacles — MSL/AGL + grouped triangles (`u244`) — **DONE Jul 26 2026**

| | |
|--|--|
| **Shipped** | Explicit top=MSL / bottom=AGL with Fort Worth figure callout (**1216** / **565**); grouped **two or more triangles** → height shown (MSL) is highest of group; lighting retained. |

---

## Chapter 3 — Airspace Classifications (unit `u3`)

### Controlled-classes order after Ch.3 — **confirmed Jul 26 2026**

Under `u32` Controlled Airspace Classes: A → B → C → D → D+E extension → **Class E stem** (`u325` → E2 / E3–E4) → G.  
All **35** unit-3 `images_url` entries preserved on the same node ids.

---

### 3.1 Section 1 intro — shape metaphors for B / C / D / E (`u31`) — **DONE Jul 26 2026**

| | |
|--|--|
| **Shipped** | Intro shape block: B/C upside-down wedding cake; D cylinder from the ground; E varies but covers the entire U.S. at some level; G uncontrolled/go. Deduped the old closing wedding-cake-only sentence into the bullet list. Light alignment on `u323` (wedding cake) and `u324` (cylinder). `All Airspace Classifications` image kept on `u31`. |

---

### 3.2 Answering Airspace and Chart Questions — Legend Page 1 (`u38`) — **DONE Jul 26 2026**

| | |
|--|--|
| **Shipped** | Step 4: **Legend (Page 1)**. Both existing `u38` images kept. |

---

### 3.3 Class B — remove `100/25` parenthetical (`u322`) — **DONE Jul 26 2026**

| | |
|--|--|
| **Shipped** | Dropped `(ex: 100/25 = …)`. Kept hundreds-of-feet + floor/ceiling + SFC language and ATL/BWI examples/images. |

---

### 3.4 Class E — rename + combine under one stem (`u325` / `u327` / `u328`) — **DONE Jul 26 2026**

| | |
|--|--|
| **Shipped** | Option **A**: stem **Class E** (`u325`, was “Fundamentals”) with children `u327` E2 and `u328` E3/E4. Overview text + 3 images stay on `u325`. `u3242` Class D with Class E Extension left separate. |

---

### 3.5 Class E3 — delete “operating control tower” (`u328`) — **DONE Jul 26 2026**

| | |
|--|--|
| **Shipped** | Removed “It has an operating control tower.” Kept extension purpose, dashed magenta, auth rules. All 3 images kept. |
| **Open** | Outline still lists that bullet until cleaned. |

---

### 3.6 Military Operations Areas — purpose / advisories / IFR (`u334`) — **DONE Jul 26 2026**

| | |
|--|--|
| **Shipped** | Purpose (separate military training), controlling-agency advisories, nonparticipating IFR may be cleared through when separation can be provided; Gamecock example + image kept. |
| **Open** | Outline still thin on this content until updated. |

---

## Chapter 4 — Airport Operations (unit `u4`)

### Current tree — **confirmed Jul 26 2026**

1. `u411` Intro to Airport Operations *(merged former `u411`/`u412`/`u421`; stem `u4100` removed)*  
2. `u423` Runways: Surface Aids, Hazards, and Orientation  
3. `u43` Traffic Patterns for Manned Aircraft  
4. `u422` Runway Position and Heading Examples *(renamed; was CTAF…)*  
5. `u440` Airport Signs, Markings, and Security → `u441` / `u442` / `u451`  
6. `u452` Wildlife Hazards Near Airports  

---

### 4.1 Collapse three leaves → Intro to Airport Operations — **DONE Jul 26 2026**

| | |
|--|--|
| **Shipped** | Option **A**: single top-level leaf **`u411` Intro to Airport Operations** with merged categories + towered/non-towered + UNICOM/CTAF text. Dropped empty stem `u4100` and leaves `u412` / `u421`. Unit `u4` blurb kept short. |

---

### 4.2 Reorder + rename runway examples — **DONE Jul 26 2026**

| | |
|--|--|
| **Shipped** | After Runways: **Traffic Patterns (`u43`)** then **Runway Position and Heading Examples (`u422`)**. Dropped “CTAF” from the `u422` title (CTAF remains in body). |

---

### 4.3 Tighten examples + figure callouts (`u422`) — **DONE Jul 26 2026 (text); images OPEN**

| | |
|--|--|
| **Shipped** | Examples 2–6 shortened; callouts added (see figure / attached / image for runways 13, 4, 12, 24, 18). Downwind rules + Example 1 kept. |
| **Open** | **`images_url` still empty** — no runway 13/4/12/24/18 figures found in repo assets. Upload + merge before or right after publish if figures exist offline. |

---

### 4.4 Signs / markings / security stem — **DONE Jul 26 2026**

| | |
|--|--|
| **Shipped** | New stem **`u440` Airport Signs, Markings, and Security** with children `u441`, `u442`, `u451`. Wildlife `u452` remains next top-level sibling. |

---

## Chapter 5 — Weather (unit `u5`) — **DONE Jul 26–27 2026**

### Current tree — **updated Jul 26 2026**

1. Unit intro (`u5` `text_content`) — Aviation Weather Sources Overview *(former leaf `u51` folded here)*  
2. `u51` Surface Aviation Weather Observations *(was `u52`)*  
3. `u53` Aviation Routine Weather Report (METAR) Decoding *(flattened; former `u531`–`u534` removed)*  
4. `u54` Aviation Weather Forecast Products → `u541` / `u542` / `u543`  
5. `u55` Terminal Aerodrome Forecast (TAF) Decoding *(flattened; former `u551`–`u553` removed)*  

---

### 5.1 Sources overview → unit intro; Surface Obs as section 1 — **DONE Jul 26 2026**

| | |
|--|--|
| **Shipped** | Moved Aviation Weather Sources Overview into unit `u5` body. Surface Aviation Weather Observations is now the first section (`u51`). AWOS starts a new paragraph; report contents use an HTML `<ul>` list. |
| **Note** | Learner UI does not parse markdown bullets — only `\n` → `<br />`. HTML lists work today via `prose` + `dangerouslySetInnerHTML`. Tracked in `docs/TODO.md` for proper list/markdown rendering. |

---

### 5.2 METAR flatten + PIREP / wind / TCU·CB — **DONE Jul 26 2026**

| | |
|--|--|
| **Shipped** | Single METAR leaf: separate METAR / SPECI / PIREP paragraphs; decode body flattened without duplicate summaries; 5-/6-digit wind note; TCU/CB reported with height. |

---

### 5.3 TAF/FA METAR descriptors + TAF flatten — **DONE Jul 26 2026**

| | |
|--|--|
| **Shipped** | `u541` notes TAFs use the same descriptors/abbreviations as METAR. `u55` flattened; origin-time sentence: first two digits date, last four time UTC. |

---

### 5.4 Description polish — **DONE Jul 27 2026**

| | |
|--|--|
| **Shipped** | Fixed broken learning-objective blurbs on `u5`, `u54`, `u541`, `u542`, `u543`. SIGMET/AIRMET/FB body text left as-is (review closed). **Do not combine** with unit 6. |

---

## Chapter 6 — Weather Effects on Aircraft Performance (unit `u6`)

### Current tree — **updated Aug 5 2026**

1. Unit intro (`u6` `text_content`) — risk framing + What Is Weather? *(former leaf `u60` folded here)*  
2. `u61` Air Pressure, Density, Humidity, and Performance → `u611` / `u612` / `u62`  
3. `u63` Wind, Turbulence, and Severe Wind Hazards → `u631` / `u632` / `u633`  
4. `u64` Atmospheric Stability *(flat; former `u641` body)*  
5. `u65` Temperature Inversions, Dew Point, and Structural Icing Hazards → `u642` / `u651` / `u652`  
6. `u66` Clouds and Thunderstorm Life Cycle → `u661` / `u662`  
7. `u67` Fronts, Mountain Flying, and Operational Minimums → `u671` / `u672` / `u673`  

---

### 6.1 What Is Weather? → unit intro — **DONE Jul 26 2026**

| | |
|--|--|
| **Shipped** | Moved What Is Weather? into unit `u6` body (after performance/risk framing). First section is now `u61`. Retired leaf `u60`. |

---

### 6.2 Outline content pass + stem intros — **DONE Jul 27 2026**

| | |
|--|--|
| **Shipped** | `u62` humidity density numbers (H₂O / O₂ / N₂); `u662` mature-stage 2,500 ft/min downdraft + plow wind / first gust; `u673` ceiling/visibility wording tightened to outline. Stems shortened to intros (detail on leaves). **Do not combine** with unit 5. |
| **Open** | Images still not in Ch.6 JSON. |

---

### 6.3 Pressure/humidity combine; Stability alone; Inversions → icing stem — **DONE Aug 5 2026**

| | |
|--|--|
| **Shipped** | Nested `u62` under `u61` (stem retitled **Air Pressure, Density, Humidity, and Performance**). `u64` is flat **Atmospheric Stability** (former `u641` body; `u641` retired). `u642` moved under `u65` (stem retitled **Temperature Inversions, Dew Point, and Structural Icing Hazards**). Wind/clouds/fronts unchanged. |
| **Counts** | **161 nodes / 124 leaves**. |

---

## Chapter 7 — Loading and Performance (unit `u7`)

### 7.1 Load-factor wording — **DONE Aug 5 2026**

| | |
|--|--|
| **Shipped** | In `u715`, renamed the internal headings **LOAD - Turn Stress** → **Load** and **LOAD Factors - Pilot Concerns** → **Load Factors**. In `u718`, changed “Explain how the load factor increases…” → “See how…” for the planned bank-angle chart reference. In `u723`, replaced the `√` symbol with the words **square root**. |
| **Open** | Add the load-factor-vs-bank-angle image to `u718`; continue the remaining Chapter 7 content/image pass. |

---

## Chapter 8 — Emergency Procedures (unit `u8`) — **DONE Aug 5 2026**

| | |
|--|--|
| **Shipped** | Unit introduction plus one consolidated leaf, `u81` **Emergency Preparedness and Response**, covering hazards, planning/briefing, deviation authority/documentation, and the example scenario. Author confirmed Chapter 8 complete. |

---

## Chapter 9 — Aeronautical Decision Making (unit `u9`)

### 9.1 Overview, Risk Management, and leaf merges — **DONE Aug 5 2026**

| | |
|--|--|
| **Shipped** | Shortened repeated section overviews. Risk Management now uses bold HTML headings and HTML lists for **Foundation of Decisions** and **Principles of Risk Management**. `u921` likelihood levels are a headed list. Combined decision-making parts into `u911` **Steps to Good Decision Making** (retired `u912`). Combined IMSAFE/PAVE into `u923` with two sections (retired `u924`). Removed redundant Overview labels from Physiology and Maintenance. |
| **Rendering note** | Course `text_content` still does not parse Markdown lists. It renders HTML through `dangerouslySetInnerHTML`, so this pass uses `<ul>` / `<ol>` / `<li>` and `<strong>`. |
| **Counts** | **159 nodes / 122 leaves**. |

---

### 9.2 Workload/CRM and Physiology regroup — **DONE Aug 5 2026**

| | |
|--|--|
| **Shipped** | Renamed `u93` to **Workload and Crew Resource Management**. CRM/SRM and its three child lessons now use short operational stories plus HTML study bullets; removed `Definition:` labels. Renamed `u94` to **Physiology**, added `u940` **Physiology**, and consolidated scanning + threat detection into `u941` **Vision** (retired `u942`, preserving the existing vision ref). |
| **Maintenance figure note** | For `u95`, identify the exact source figure number/title before adding media. Upload/attach each asset through `images_url`, add a matching “See Figure …” reference in the relevant paragraph, and include a learner-safe source link when the figure comes from an external reference. Do not publish placeholder figure labels or invented links. |
| **Other study-format candidates** | Strongest remaining Chapter 9 candidate: `u922` **Hazardous Attitudes and Antidotes**—convert the five attitude/antidote pairs from text hyphens to an HTML study list with bold attitude names. After figures are supplied, `u95` can become a visual inspection checklist. |

---

## Chapter 10 — Radio Communication Procedures (unit `u10`)

### 10.1 Consolidate short radio lessons — **DONE Aug 5 2026**

1. `u101` **Radio Communication Fundamentals** — NAS purpose + proper procedures + phonetic alphabet  
2. `u104` **CTAF, Frequencies, and Advisory Services** — frequency lookup + CTAF + UNICOM/MULTICOM/FSS  
3. `u107` **Aircraft Identification and Standard Radio Calls** — call signs + initial 10-mile inbound call  

| | |
|--|--|
| **Shipped** | Reduced Chapter 10 from 11 leaves to 3 top-level leaves, removed repeated warnings/introductions, and used short narrative plus HTML study lists. Retained `u101`, `u104`, and `u107`; retired `u102`, `u103`, `u105`, `u106`, `u1061`–`u1064`, `u108`, and `u1081`. |
| **Counts** | Course total: **149 nodes / 114 leaves**. |
| **Open** | Detailed author content review and any radio/Chart Supplement figures. |

---

## Open gaps / follow-ups

| Gap | Notes |
|-----|--------|
| Units 7–10 quality pass | Ch.7 load-factor wording applied (remaining content/images open); Ch.8 done; Ch.9 restructuring partial; Ch.10 consolidated (detailed review/images open) |
| Ch.6 images | No weather-effects figures in repo JSON yet |
| Ch.9 maintenance figures | `u95` needs exact figure/title/source mapping, `images_url` attachments, matching body references, and external source links where applicable |
| Legacy leaf-scoped Qs | Unit-level bank is scoped to top-level units. Legacy bulk/review files may still mention retired Ch.9 `u912` / `u924` / `u942`, Ch.10 `u102` / `u103` / `u105` / `u106*` / `u108*`, and earlier retired refs — remap if that import path is reused |
| Live vs repo payload | Export/diff before admin publish so Ch.1–10 repo edits are not clobbered |
| Unit 2 images beyond L&L | `u212`/`u213` still image-empty |
| Outline lag | E3 tower bullet / thin MOA block; outline puts runway questions after signs — course order follows this review (patterns → examples → signs) |
| **`u325` / `u440` stems** | Progress/UI that treated former leaves as flat may need re-save after publish |
| **`u422` runway figures** | Text callouts present; images not in JSON yet |
| Retired refs | Earlier: `u4100`, `u412`, `u421`, Ch.5 `u52` / `u531`–`u534` / `u551`–`u553`, Ch.6 `u60` / `u641`; Ch.9: `u912` / `u924` / `u942`; Ch.10: `u102` / `u103` / `u105` / `u106` / `u1061`–`u1064` / `u108` / `u1081` |
| Publish JSON | `faa_107_course.json` (**149 nodes / 114 leaves**); admin publish of **Ch.3+4 together** still pending; include reviewed Ch.5–10 edits — **do not combine** `u5`/`u6` (`docs/TODO.md`) |

---

## When actions are approved

1. Edit `faa_107_course.json` only for confirmed items (keep `id` values as `"u{n}"` string refs).  
2. Rebuild `faa_107_course_leaf_paths.csv` if structure or ids change.  
3. Update this file (mark items done with date) and, if structure changes, [`docs/tech/course-content-restructure-plan.md`](../../docs/tech/course-content-restructure-plan.md).  
4. Do **not** treat outline-only or JSON-only leaves as finished without a coverage-checklist pass.
