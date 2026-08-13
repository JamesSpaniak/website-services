# Course content restructure plan — FAA 107

Plan for rebalancing the Part 107 course tree (`assets/courses/faa_107_course.json`), merging split example sections, standardizing video placement, simplifying the question model to unit-level / final-exam-only scoping, applying the author's content-review notes, and cleaning markdown artifacts course-wide.

Status: **deployed to prod** (Jul 8 2026) — restructured payload live; unit-level question bank imported. Repo canonical: `faa_107_course.json` (**150 nodes** / **114 leaves**, string refs `u{n}`, Ch.1–5 + Ch.8 done; Ch.6–7 + Ch.9–10 partial through Aug 5 2026; **do not combine** `u5`/`u6`; numeric twin / refs twin removed), `faa_107_questions_unit_level.bulk.json` (463 unit-scoped items). Remaining: admin re-publish of reviewed Ch.1–10 edits and the first 4 Ch.1 video references (ship **Ch.3+4 together**), `u422` runway figures, Ch.6/7/9/10 images, remaining Ch.7/9/10 author notes, leaf `ExamPlayer` removal, final-exam pool carry-over (see below).

Post-deploy edit (Jul 8 2026, **not yet re-uploaded**): course retitled in the repo payload to **"FAA Part 107 Remote Pilot Certification Prep"** (with matching sub_title/description/text_content) so it no longer duplicates unit 1's "PART 107 REGULATIONS" title. Prod still shows the old title until the payload is re-uploaded via admin.

## Findings

### Unit 7 is one-leaf-per-slide

Unit 7 (Loading and Performance) was imported one leaf per PowerPoint slide from
`assets/courses/outlines/7- Loading & Performance 2026.pptx.txt`: **31 flat children averaging ~46 words each**, including slide artifacts ("QUESTIONS AND COMMENTS", 8 words) that are not course content. Every other unit was editorially grouped (3–10 children, 100–250 word leaves, max depth 3). The outline itself is two decks concatenated — "Weight, Balance and Loading" and "Load Factors and Performance" — which gives the natural stem split.

### Examples split from their concepts

Leaves that only exist to hold the example for a sibling concept leaf:

| Unit | Concept leaf | Example leaf | Action |
|------|-------------|--------------|--------|
| 3 Airspace | Class B Airspace | Class B Chart Examples | merge into concept |
| 3 Airspace | Class C Airspace | Class C Chart Examples | merge into concept |
| 3 Airspace | Class D Airspace | Class D Chart Example (KLUK) | merge into concept |
| 3 Airspace | Class E Fundamentals | Class E Chart Examples — 700'/1,200' AGL | merge into concept |
| 7 Loading | Load Factor vs Bank Angle - Rapid Increase | … - Calculation Example | merge (part of unit 7 rebuild) |

Keep as standalone leaves (substantial applied-practice content, not orphaned examples):
`CTAF Runway Position and Heading Examples` (unit 4, 270w) and `Example Emergency Scenario` (unit 8, 108w).

## Target structure rules

- **Max 3 levels**: unit → lesson stem → leaf.
- **Stems have 3–6 leaves**; a unit with >10 direct children needs stems.
- **Leaves are 150–350 words**, self-contained: concept + example + figures in one `text_content`. No separate "example" leaves.
- No slide artifacts ("Questions and Comments", bare "Key Takeaways" under 30 words → fold into the last content leaf or unit outro).

Unit 4 (Airport Operations, 10 flat leaves) is borderline but acceptable; unit 7 is the only clear violation.

## Video strategy

**One video per lesson stem; leaves are text-only; optional extra videos on genuinely visual leaves.**

- Rendering already supports this: `drone/src/app/ui/components/section.tsx` renders `video_url` on any node (stem or leaf) when expanded, above its `sub_units` — a stem video plays as the lesson intro with text leaves below as reading/reference.
- Per-leaf videos would mean ~150 recordings where a 46-word leaf is ~30s of content wrapped in intro/outro boilerplate. Per-stem lands at roughly 35–45 videos of 4–8 minutes.
- Optional-video leaf candidates (visual, exam-critical): sectional chart reading (units 2–3), METAR/TAF decoding walkthroughs (unit 5), load-factor-vs-bank-angle chart from the testing supplement (unit 7).
- **Aug 12 first batch:** restored `u12` as the Crew Roles and Responsibilities stem above `u121`–`u124`, then attached reviewed HLS recordings to `u11`, `u12`, `u131`, and `u133`. The combined falsification/accident recording remains unmapped: merge its falsification segment into the single `u131` video, then attach its accident-reporting segment to `u132`.

## Example implementation: unit 7 rebuild (31 → 2 stems, 9 leaves)

Merged `text_content` comes from concatenating the listed source leaves (order preserved), lightly edited for flow. Reuse the first source leaf's numeric id for each merged leaf so its ref stays stable; stems get fresh ids not used anywhere else in the course tree (refs are `u{id}` and must be unique course-wide — duplicate refs are rejected on upload by `normalizeAndFlattenUnits`).

**Stem A — Weight, Balance and Loading**

| New leaf | Source leaves (current titles) |
|----------|-------------------------------|
| Forces in Flight | FORCES IN FLIGHT + FORCES DURING A TURN |
| Weight & Balance Responsibilities | WEIGHT & BALANCE CONSIDERATIONS FOR RPIC + MAXIMUM GROSS TAKEOFF WEIGHT + WEIGHT CHANGES DURING FLIGHT |
| Balance and Center of Gravity | BALANCE AND CG + BALANCE AND CG - RPIC Management + GRAVITY + CG VS. CP (Stability Concept) + CG VS. CP (Aircraft Type) |
| Weight, Lift, and Stability | WEIGHT AND LIFT RELATIONSHIP + STABILITY + STABILITY, MANEUVERABILITY & CONTROLLABILITY |

**Stem B — Load Factors and Performance**

| New leaf | Source leaves |
|----------|---------------|
| Load Factor Fundamentals | LOAD FACTORS + LOAD - Turn Stress (renamed "LOAD" per author) + LOAD FACTORS - Pilot Concerns. The "LOAD" overview leaf ("Outlines the essential understanding…") is **deleted** — author removed it from the deck |
| Load Factor in Turns | LOAD FACTOR IN STEEP TURNS + RATE OF TURN AND AIRSPEED + LOAD FACTOR VS BANK ANGLE (Rapid Increase + Calculation Example) + EXTREME BANK ANGLES |
| Stalls and Load Factor | STALLS AND LOAD FACTOR - Stall Definition + STALLING SPEED & LOAD FACTOR |
| Weight Limits and Consequences | WEIGHT AND BALANCE - Limits and Consequences + WEIGHT - Definition + WEIGHT - Lift Dependence + WEIGHT - Excessive Weight Degradations + SAFETY CONSIDERATIONS |
| Key Takeaways | KEY TAKEAWAYS (drop both QUESTIONS AND COMMENTS leaves) |

Result: every leaf lands at ~150–300 words, consistent with units 1–6.

## Question model: unit-level or final-exam-only

Decision: stop scoping questions to sub-units. Import at **unit level** (`unit_ref` set, `sub_unit_ref: null`) or as **end-of-course final exam items** (`unit_ref: null`, `standard: "FINAL_EXAM"`).

### Verified possible (no backend changes needed)

- `Question.sub_unit_ref` is nullable — "Null means the question is scoped only to the parent unit" (`backend/src/questions/types/question.entity.ts`). Import validation (`QuestionService.resolveRefs`) accepts `unit_ref` alone; it only requires the ref to exist in `course_units`.
- Unit exams filter on the denormalized `q.unit_ref = ANY(:refs)` (`ExamGeneratorService.fetchPool`), so unit-level questions are picked up by unit-scoped exams with no change.
- `Question.unit_ref` is also nullable ("applies to the full course only"). `scope: 'full_course'` applies no unit filter, and `exam_pool: 'final_only'` selects `standard = 'FINAL_EXAM'`. Both paths exist and are used today by `/courses/[courseId]/exams/final` and `/practice`.

### Required follow-up in the frontend

`section.tsx` renders an `ExamPlayer` with `scope="sub_unit"` on **every leaf**. Once questions are unit-level only, every leaf exam button will error with "No active questions found for the requested scope". Remove the leaf-level `ExamPlayer` (or gate it behind a has-questions check) as part of this change; keep the unit-level player in `unit.tsx` (25 questions) and the full-course exam pages.

## Course-wide text cleanup: markdown artifacts

Remove stray markdown characters from all `text_content` / `description` fields: `*` bullets, `**bold**` markers, `#` headings, and **literal `\n` sequences** (backslash-n characters stored in the text instead of real newlines — they render verbatim because the frontend only converts real newlines to `<br />`).

Verified against the repo JSON: **17 nodes have artifacts, all in unit 9 (Aeronautical Decision Making)** — every ADM node has literal `\n`, 10 also have `*` bullets, 3 have `#`. The author's notes also quote starred text in units 2, 7, and 8 (e.g. `* **Chart Legend Access:**`) that does **not** appear in the repo JSON — the live/deployed payload is likely out of sync with the repo. **Export the live course payload and diff against the repo before cleanup** so fixes are applied to the true latest content (see caveats).

## Author content-review intake (Jul 2026)

Ongoing quality backlog: see [`assets/courses/faa_107_course_quality_review.md`](../../assets/courses/faa_107_course_quality_review.md). **Ch.1–5 + Ch.8 done**; **Ch.6–7 + Ch.9–10 partial (through Aug 5 2026)**. Ch.9 now has study-format CRM/SRM, separate Physiology/Vision leaves, shorter overviews, HTML risk lists/headings, and merged decision/IMSAFE-PAVE leaves. Ch.10 is consolidated from 11 leaves to 3. **Do not combine** weather units 5/6. Repo payload: **150 nodes / 114 leaves**, with 4 Ch.1 video references. **Open:** figures/images and remaining detailed review for Ch.7/9/10.

Raw notes from the course author, organized per unit. Slide numbers refer to the source decks in `assets/courses/outlines/`. Items marked **(structure)** change the tree; **(content)** edit text in place; **(images)** need a picture inserted; **(questions)** affect the question bank.

### Course-wide

- Remove stars / markdown everywhere (see cleanup section above).
- **(images)** Insert course images throughout — the author has them **ready in a separate folder** (get folder location, upload to media bucket, set `images_url` on the leaves listed below). Tracked in `docs/TODO.md` P0.
- Stems double as **video title slides**: the author is inserting title slides into the decks to mark where each recording stops. Keep stem titles in the course tree matching the deck title slides.

### Unit 1 — Part 107 Regulations (deck: `regulations powerpoint in an outline.txt`)

- **(structure)** Rename "Operational Rules and Limitations" → **"Operating Rules"** (match deck).
- **(structure)** Missing: **Night operations** content, slides 44–49 (distinct from the existing "Flying At Night Under Certain Conditions" waiver section — reconcile the two).
- **(content)** Missing: **Additional Roles**, slide 18.
- **(content)** Flight Crew Management — missing last bullet, **Required Documentation** (slide 20).
- **(content)** Inspection, Testing, and Compliance (slide 27): correct to "…must present their remote pilot certificate **with a sUAS rating**, photo ID **with your birthdate and signature**".
- **(content)** VLOS and Multi-Aircraft Rules — add visual observer duties (slide 53): maintain effective communication at all times; scan the airspace for collision hazards; maintain awareness of the sUA's position through direct visual observation.
- **(content)** Waivers / Airspace Authorization — add: the main job of ATC is to keep aircraft safe; it also keeps traffic moving safely and smoothly and supports national security and defense.
- **(content)** Remote ID Requirements — add: "mandatory except as stated in Part 89 in Title 14 of the Code of Federal Regulations."
- **(content)** Flying At Night — Operational Requirements: add "No waiver required unless you cannot meet the rule."
- **(content)** Recording/content order: Drugs & Alcohol content follows Medical (author reordered deck; slides 39–40 moved after slide 58) — mirror order inside "Medical Conditions, Alcohol, and Drugs".
- **(content)** Author changed slides 83–84 to **90 days** — sync site text if it references the old value.
- **(structure)** Flying Over People (slides 114–130): author added a "Categories" title slide at 121 splitting it into two recordings — mirror as two stems or ordered leaf groups.
- **(questions)** One question bank item has the right answer (90) but a wrong variant remains — fix.
- **(questions)** Right-of-Way Rules practice exam Q2 and Q3 are near-duplicates — merge/remove one.
- **(questions)** Questions in wrong sections (e.g. a Category 1 over-people question filed under Remote ID); unit practice exam pulls off-topic questions. Both are resolved by moving to **unit-level scoping** + a dedupe/re-tag pass during the bulk-file rewrite.

### Unit 2 — Airports, Airspace, and Data Sources (deck: `2 -airports 2026 outline.docx`)

- **(structure)** Duplicate intro: "Airports, Airspace, and Data Sources" vs "Introduction to Air Traffic and Airspace" say the same thing — keep one, titled **"Airports, Airspace, and Data Sources"**. (The repo JSON has only the correct title; verify the live payload.)
- **(structure)** Rename "Four Essential Airport Data Sources" → **"Essential Airport Data Sources"** (delete "Four"); this stem is a video title slide ("Airports, charts and data sources").
- **(structure)** Rename "Aeronautical Charts: Types and Interpretation" → **"Aeronautical Charts"**; it should contain Sectional vs TAC, Interpreting Airport and Airspace Symbols, and Obstacles/MEF.
- **(structure)** Rename "Chart Supplement U.S. (CSU)" → drop "(CSU)".
- **(content)** Latitude/Longitude: add coordinate format example — "(39.72, -71.97) means 39.72° North and 71.97° West"; Longitude add "shown as red lines in the figure".
- **(content)** Overview of data sources: delete the red words.
- **(content)** NOTAMs / Sample NOTAM Decoding: add "NOTE: You do not need to decode a NOTAM on the test but you should understand what it is saying."
- **(content)** IFR charts: remove parentheses, make a sentence — "Data includes training, planning, departures, enroute, approaches, and taxiing charts."
- **(content)** Sectional Charts: add "Should check the chart for other legend information including air traffic control (ATC) frequencies and information on airspace."
- **(content)** "Airport Markings:" → retitle **"Example Airport Data"** (with slide 45 pic).
- **(content)** Other Information: add "Airports — locations, runway details, lighting, & services".
- **(content)** Move the "Other Information" block to the top under the intro, retitled **"Using Aeronautical Charts"**: charts include Airspace Information, Navigational and Procedural Information, Chart Limits, Culture (man-made features), Hydrography, Relief (MEF, contours).
- **(content)** Chart Legend Access: delete the bolded red fragment; add the free FAA PDF link (`https://www.faa.gov/sites/faa.gov/files/training_testing/testing/supplements/sport_rec_private_akts.pdf`); add "You should purchase one because you will have to use one on the test that they supply and you cannot zoom in like you can on a computer or mobile device."; add "Review the symbols in Appendix 1 Legend — used for airports, topographic information, obstructions, communication boxes and miscellaneous items."; add planning guidance — "During your planning process determine if your flight will be near an airport. Look at the sectional chart for the airport and get authorization if required."
- **(content)** Obstacles and MEF: delete the "**Access:** You have access to the MEF information on the test…" bullet.
- **(images)** Needed: air-traffic-by-numbers pics; globe with yellow/red lat-long lines; slides 15–18; slide 23; slide 32 (sectional vs TAC samples); slides 34–35, 37, 39; slide 41 (VFR checkpoint); slide 43; slide 45 (example airport data); slide 47 (MEF grouping); slide 48 (communication boxes); slide 49 (MEF reporting format).
- **(questions)** Many near-duplicate questions; questions filed in wrong leaves; MEF has only 1 question; NOTAM/data-source leaves have none (author to add 1–2 each); unit exam pulls from other topics. Resolved by unit-level scoping + dedupe pass.

### Unit 3 — Airspace Classifications (deck: `3 airspace class 3 2026 outline.docx`)

- **(structure)** Combine "Introduction and Airspace Categories" with the controlled-airspace-classes intro into one leaf titled **"Introduction and Airspace Classifications"**; keep the individual class leaves (B, C, D, E, G) separate.
- **(structure)** Special Use Airspace grouping (Restricted, Prohibited, Warning, MOAs, Alert, CFAs) and Other Airspace Areas grouping (LAA, MTRs, TFRs, Parachute Jump, Published VFR Routes, TRSA, NSA) — **already match the current tree**; no change.
- Chart-example merges from the table above still apply.

### Unit 4 — Airport Operations (deck: `4 Airport operations 2026 outline.docx`)

- **(structure)** Move "Towered vs. Non-Towered Airport Procedures" into an **"Airport Classification and Control"** stem alongside "Airport Categories as Defined by Law" and "Towered and Non-Towered Airports" (this also gives unit 4 its stems).
- **(content)** Traffic Patterns for Manned Aircraft: exam asks material not yet taught — add content from slides 29–35 to the leaf.
- **(images)** Many pics needed throughout the unit.

### Unit 5 — Weather — **done Jul 26–27 2026**

- Structure/content review closed (sources fold, METAR/TAF flatten, description polish). Keep separate from unit 6.

### Unit 6 — Weather Effects (Jul 26–Aug 5 2026)

- **(structure)** Folded What Is Weather? (`u60`) into unit `u6` intro body — same pattern as Ch.5 sources overview.
- **(content)** Outline pass: humidity density numbers; thunderstorm mature-stage 2,500 ft/min + plow wind; ceiling/visibility wording; stems shortened to intros.
- **(structure, Aug 5 2026)** Combined pressure/density + humidity under `u61` (`u611` / `u612` / `u62`). `u64` flat **Atmospheric Stability** (retired nested `u641`). Temperature Inversions (`u642`) moved under `u65` with dew point/icing. **Do not combine** with unit 5. Images still open.

### Unit 7 — Loading and Performance (deck: `7- Loading & Performance 2026.pptx.txt`)

- **(structure)** Author confirms the two-stem split (title slide inserted at deck slide 15): everything under one "Loading and Performance" heading, broken into **Weight, Balance and Loading** + **Load Factors and Performance** — matches the rebuild tables above.
- **(structure)** **Delete the "LOAD" overview leaf** (text beginning "Outlines the essential understanding of load…") including its quiz — author removed it from the deck. *(Supersedes its inclusion in the "Load Factor Fundamentals" merge above.)*
- **(structure)** Rename "LOAD - Turn Stress" → **"LOAD"** (it becomes part of the Load Factor Fundamentals merge).
- **(structure)** "LOAD FACTOR VS BANK ANGLE - Rapid Increase" → drop " - Rapid Increase" (merged with the calculation example per the tables above).
- **(structure)** Delete "QUESTIONS AND COMMENTS" leaves (already in plan).
- **(images)** Needed: slide 18 (load factor in steep turns), slide 20 (load factor vs bank angle chart — the testing-supplement chart), slide 21 (calculation example).
- **(questions)** Section quizzes exist where no questions do, and end-of-unit questions don't correlate to the leaves — resolved by unit-level scoping + removing the leaf `ExamPlayer`.
- **(content, Aug 5 2026)** In `u715`, internal headings are **Load** and **Load Factors** (removed text after each hyphen). In `u718`, the bank-angle chart callout now says **"See how…"**; the chart image remains to be added. In `u723`, the stall-speed relationship spells out **square root** instead of using `√`.

### Unit 8 — Emergency Procedures (deck: `8 Emergency Procedures Outline.docx`)

- **Done (confirmed Aug 5 2026):** four source leaves consolidated into one `u81` section; text retained and artifacts removed. Unit-level scoping covers the prior question mismatch.

### Unit 9 — Aeronautical Decision Making

- **(content)** All 17 markdown-artifact nodes live here (literal `\n`, `*`, `#`) — covered by the course-wide cleanup.
- **(content/structure, Aug 5 2026)** Shortened repeated overviews. Risk Management uses HTML `<strong>` headings and `<ul>` lists because `text_content` does not parse Markdown. Foundation examples and principles were rewritten; `u921` likelihood levels are a headed list.
- **(structure, Aug 5 2026)** Combined Steps to Good Decision Making into `u911` (retired `u912`). Combined IMSAFE and PAVE into `u923` (retired `u924`).
- **(content/structure, Aug 5 2026)** Renamed `u93` **Workload and Crew Resource Management** and rewrote CRM/SRM + child lessons as short narrative plus study bullets. `u94` is **Physiology** with new `u940` Physiology and consolidated `u941` Vision; retired `u942`.
- **(images)** `u95` maintenance figures require exact figure/title/source mapping, matching body callouts, `images_url` attachments, and external source links where applicable. Do not publish placeholders.
- **(review candidate)** `u922` Hazardous Attitudes is the strongest remaining narrative/list candidate: convert the attitude/antidote pairs to semantic HTML.

### Unit 10 — Radio Communication Procedures

- **(structure, Aug 5 2026)** Consolidated 11 short leaves into 3 top-level lessons: `u101` **Radio Communication Fundamentals**, `u104` **CTAF, Frequencies, and Advisory Services**, and `u107` **Aircraft Identification and Standard Radio Calls**.
- **(content)** Removed repeated introductions/warnings and used narrative + HTML study lists. Retired `u102`, `u103`, `u105`, `u106`, `u1061`–`u1064`, `u108`, and `u1081`.

## Implementation steps

1. **Reconcile live vs repo payload** — **open**: before uploading, export the deployed course and diff against the restructured file (author's notes referenced starred text not present in the repo JSON; the restructured file is built from the repo JSON).
2. ~~Course-wide text cleanup~~ — **done** in `faa_107_course.json` (literal `\n` → newlines, `*` bullets → dashes, `**`/`#` stripped; verified zero artifacts remain).
3. ~~Rebuild unit 7~~ — **done**: 2 stems / 9 leaves; "LOAD" overview leaf deleted, "LOAD - Turn Stress" folded into Load Factor Fundamentals, bank-angle leaves merged, both slide-artifact leaves dropped.
4. ~~Unit-3 merges~~ — **done**: chart examples merged into Class B/C/D/E leaves; "Introduction and Airspace Classifications" leaf combines the intro, symbols, and controlled-overview text; stem renamed "Controlled Airspace Classes".
5. ~~Units 1, 2, 4, 8 structure~~ — **done**: "Operating Rules" rename; Flying Over People split into overview + "Category Operations" stems (mirrors deck title slide 121); unit 2 stems "Airports, Charts, and Data Sources" + "Aeronautical Charts" (charts moved up a level, max depth now 3); unit 4 "Airport Classification and Control" stem; unit 8 consolidated to one leaf. **Night operations (slides 44–49) NOT added** — blocked on author confirmation (see caveats).
6. ~~Content edits with exact text~~ — **done**: waiver lead time 60 → 90 days; VO duties added to the VLOS leaf; night no-waiver sentence; coordinate format example; chart-supplement PDF link + purchase advice; "Example Airport Data" retitle; MEF own-supplement sentence removed; duplicate chart-info block deduplicated into the Aeronautical Charts stem. Items already present in the repo text (Part 89 sentence, ATC role, additional roles, required documentation, NOTAM note, red-lines sentence, sectional ATC-frequency sentence) needed no change.
7. **Insert images** — **partially done (Jul 8 2026)**: `assets/courses/Pictures for Airports` processed via `scripts/course_images.py` ([`workflows/tech/course-images.md`](../../workflows/tech/course-images.md)) — 61 images uploaded to `s3://droneedge-dev-media/courses/35/{unitId}/` and merged into `images_url` in `faa_107_course.json` (units 2 and 3 subtrees). Remaining: other author image folders (unit 7 load-factor charts, airport ops, etc.) and the manual admin publish of the JSON (tracked in `docs/TODO.md` P0).
8. ~~Canonical string-ref payload + leaf-paths~~ — **done (Jul 26 2026; refreshed Aug 12 2026 for the `u12` crew stem)**: single file `faa_107_course.json` with `u{n}` refs (**150 nodes**; stems include crew roles `u12`, `u21`, Class E `u325`, signs `u440`, weather `u61`/`u65`); twin numeric/refs files removed; `faa_107_course_leaf_paths.csv` has **114 leaves**. Prefer not to rerun legacy `scripts/build_faa_107_questions.py` just to refresh leaf paths.
9. ~~Question file for unit-level scoping~~ — **done**: `faa_107_questions_unit_level.bulk.json` (463 items from the author's sorted/deduped CSV, all `sub_unit_ref: null`, unit_refs u1–u10 all present in the restructured tree). **Gap: it contains no `FINAL_EXAM` items**, so the final-exam pool (`exam_pool: final_only`) would be empty — carry over or re-tag the 77 FINAL_EXAM items from `faa_107_questions.bulk.json` before retiring the old file.
10. **Remove the leaf-level `ExamPlayer` from `section.tsx`** — **open** (leaf quizzes will error once questions are unit-level only).
11. **Upload**: admin JSON upload of `faa_107_course.json` → `updateCourseFromPayload`, then `/questions/import` with the unit-level file (only if questions changed).
12. **Record videos per stem** (~35–45 total) and attach via `video_url` on stem nodes; stems match the deck title slides the author is inserting.
13. **Follow up with the author** for remaining detailed notes on units 6, 7, 9, and 10.

## Caveats

- **Live payload may be newer than the repo JSON**: the author's notes quote starred/markdown text (units 2, 7, 8) that does not exist in `assets/courses/faa_107_course.json` — the deployed course and the repo have diverged. Export and diff before any edit, or content fixed locally may be clobbered/mismatched on upload.
- **Author notes are partial**: unit 5 notes cut off mid-review; units 6, 9, 10 were "only checked for main headings, not detailed content". Expect a second intake round.
- **Night operations overlap**: unit 1 already has "Flying At Night Under Certain Conditions" (2 leaves); the "missing night operations, slides 44–49" note likely refers to the operating-rules night section of the reordered deck — confirm with the author before adding to avoid duplicating content.
- **Image insertion depends on an external folder**: image files are prepared outside the repo; confirm the folder location and filename→slide mapping before step 7.
- **Ref stability**: refs derive from unit ids (`u{n}`). Merged leaves must reuse an existing source id (first source leaf) or get a brand-new id; never reuse an id that now means different content, since existing questions/exams point at refs. Duplicate ids anywhere in the tree fail upload validation.
- **Deleted refs**: questions referencing removed refs are **skipped (not mislinked) on import**, and existing DB rows pointing at dead refs simply stop matching any leaf. After re-import, spot-check counts in the bulk import result (`created/updated/skipped`).
- **Existing unit 7 question mapping**: all 17 unit-7 questions currently sit on `u71` (they were dumped on the first subunit, not distributed) — moving them to unit level (`u7`, `sub_unit_ref: null`) is strictly more correct.
- **Student progress**: `Progress.unit_statuses` is a jsonb map keyed by ref; stale keys for deleted leaves are ignored on read, so restructuring does not corrupt or reset progress. Completion percentages will shift because `units_total` changes.
- **Generated exams**: existing `exams.question_ids` snapshots keep working (they reference question ids, not refs). Pending unattempted exams scoped to deleted `sub_unit` refs will fail to regenerate — acceptable; students regenerate at unit scope.
- **Course editor**: `course-editor.tsx` edits the same tree; no changes needed, but avoid concurrent edits while the restructure is in flight.
- **Videos on stems and access control**: stem videos use the same signed-URL flow as leaves (`getUnitMedia` by unit id) — no backend change, but confirm stems are included in media signing if `courses/videos/` paths are used.
