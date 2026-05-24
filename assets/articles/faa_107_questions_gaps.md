# FAA Part 107 — Question Bank Bulk Upload

Generated from `Compiled questions Part 107 Testing.xlsx - test.csv`, `Compiled questions Part 107 Testing.xlsx - end of unit questions.csv`, and `faa_107_course.json`.

- Raw rows: 466 (test) + 147 (end-of-unit)
- Duplicates dropped: 152
- **Unique questions: 461**
- **Final-exam-only** (`standard=FINAL_EXAM`, `unit_id=null`): **77**

## Bulk upload format

The backend exposes a JSON bulk-import endpoint (admin only):

```text
POST /questions/import
Content-Type: application/json
Authorization: Bearer <admin token>

{
  "course_id": 35,
  "questions": [
    {
      "course_id": 35,
      "unit_id": 1,
      "sub_unit_id": 11,
      "question_text": "…",
      "choices": [
        {"id": 1, "text": "…", "is_correct": false},
        {"id": 2, "text": "…", "is_correct": true},
        {"id": 3, "text": "…", "is_correct": false}
      ],
      "explanation": "…",
      "standard": null,
      "priority": 2,
      "difficulty": "medium",
      "status": "active"
    }
  ]
}
```

Output file: `assets/articles/faa_107_questions.bulk.json` — 461 questions ready to upload.

## Final-exam-only questions

77 questions are tagged for **end-of-course / full-course exams only**:

- `standard`: `"FINAL_EXAM"`
- `priority`: `3` (supplemental — fills large exams last)
- `unit_id` / `sub_unit_id`: `null` — **excluded** from unit and sub-unit quiz generation
- `difficulty`: `hard` when a figure is required

Review column `topical_unit_id` in the CSV shows which unit the question
belongs to topically before final-exam scoping.

## Counts by unit (quiz-scoped; excludes FINAL_EXAM null unit_id)


| Unit | Title | Questions |
| ---: | --- | ---: |
| 1 | Part 107 Regulations | 131 |
| 2 | Airports, Airspace & Data Sources | 34 |
| 3 | Airspace Classifications | 15 |
| 4 | Airport Operations | 53 |
| 5 | Weather (Sources / METAR / TAF) | 17 |
| 6 | Weather Effects on Aircraft Performance | 84 |
| 7 | Loading & Performance | 17 |
| 8 | Emergency Procedures | 1 |
| 9 | Aeronautical Decision Making | 32 |

## Counts by unit / sub-unit

| Unit | Sub-unit | Questions |
| ---: | ---: | ---: |
| 1 | 11 | 8 |
| 1 | 12 | 14 |
| 1 | 14 | 8 |
| 1 | 15 | 18 |
| 1 | 16 | 13 |
| 1 | 17 | 13 |
| 1 | 131 | 21 |
| 1 | 132 | 9 |
| 1 | 133 | 8 |
| 1 | 134 | 4 |
| 1 | 135 | 2 |
| 1 | 137 | 3 |
| 1 | 138 | 2 |
| 1 | 139 | 5 |
| 1 | — | 3 |
| 2 | 22 | 10 |
| 2 | 231 | 5 |
| 2 | 241 | 19 |
| 3 | 31 | 8 |
| 3 | 321 | 5 |
| 3 | 334 | 1 |
| 3 | 341 | 1 |
| 4 | 41 | 16 |
| 4 | 43 | 16 |
| 4 | 45 | 2 |
| 4 | 421 | 17 |
| 4 | 422 | 2 |
| 5 | 51 | 5 |
| 5 | 531 | 5 |
| 5 | 551 | 7 |
| 6 | 611 | 32 |
| 6 | 612 | 23 |
| 6 | 631 | 5 |
| 6 | 632 | 2 |
| 6 | 642 | 1 |
| 6 | 651 | 2 |
| 6 | 652 | 3 |
| 6 | 661 | 9 |
| 6 | 662 | 5 |
| 6 | 671 | 1 |
| 6 | 673 | 1 |
| 7 | 71 | 17 |
| 8 | 81 | 1 |
| 9 | 95 | 5 |
| 9 | 911 | 20 |
| 9 | 931 | 3 |
| 9 | 932 | 1 |
| 9 | 941 | 3 |

## Items flagged for review

**Total flagged:** 8

Reasons:

- (5) Matched unit but not a specific lesson
- (3) No course path match

All flagged questions are written into the JSON with `"status": "draft"` so they will be uploaded but excluded from exam generation until an admin reviews them. Once you confirm a unit / sub-unit mapping, flip the status to `active` (via PUT /questions/:id or by editing this JSON and re-importing — the import upserts by `id` if you keep IDs stable).

## Risks and concerns

### 1. Smaller bank than original compiled workbook

The Testing CSVs dedupe to **462 unique questions** (~29 fewer than the original 491-row xlsx). Most end-of-unit rows duplicate test.csv.

### 2. Chart-figure questions → FINAL_EXAM only

~77 questions require the FAA-CT-8080-2H supplement. They are scoped to full-course exams only (no `unit_id`). Students taking unit quizzes will not see them until the final. **Risk:** unit-level chart lessons have fewer practice questions unless you add non-figure variants.

The question schema has no `figure_url` field yet — figures are not embedded.

### 3. `standard=FINAL_EXAM` is not filtered by the exam API today

Exclusion from unit quizzes works via `unit_id=null`. The `FINAL_EXAM` tag is for reporting and future filtering; `ExamGeneratorService` does not yet read it.

### 4. Classification method

Questions are mapped using **Category**, **Sub Category**, and the full course hierarchy in `faa_107_course.json` (unit / section / lesson). Answer choices are **not** used for mapping. Spreadsheet columns `mapped_unit` / `mapped_topic` are omitted from review exports (often wrong).

Rows needing attention: **`faa_107_questions_needs_review.csv`** (14 rows).

### 5. Unit 8 (Emergency) still thin

Only a handful of emergency questions; most map to Regulations or Operations.

### 6. Ambiguous `Additional topics :: communications` rows

In the spreadsheet, 14 rows have this sub-category but many of them are actually about *load factor* / *center of gravity* / *FSS* — i.e. mis-labeled. The classifier ignores the sub-category and falls back to keyword matching for these, but you'll want to spot-check the ones it routed to Unit 7 / Unit 4 / Unit 9. They are flagged with `needs_review: yes` in the CSV.

### 7. Sub-units that received zero questions

These sub-units have no questions assigned. Consider authoring a few core questions for each so exams scoped to them are non-empty:

| Unit | Sub-unit | Title |
| ---: | ---: | --- |
| 1 | 13 | Operational Rules and Limitations |
| 1 | 136 | Right-of-Way Rules and Operation Near Aircraft |
| 2 | 21 | Introduction to Air Traffic and Airspace |
| 2 | 23 | Four Essential Airport Data Sources |
| 2 | 232 | Notices to Airmen (NOTAMs) |
| 2 | 233 | Automated Terminal Information Service (ATIS) |
| 2 | 24 | Aeronautical Charts: Types and Interpretation |
| 2 | 242 | Interpreting Airport and Airspace Symbols |
| 2 | 243 | Obstacles and Maximum Elevation Figure (MEF) |
| 3 | 32 | Controlled Airspace Classes (A, B, C, D, E, G) |
| 3 | 322 | Class B Airspace |
| 3 | 323 | Class C Airspace |
| 3 | 324 | Class D Airspace |
| 3 | 325 | Class E and Class G Airspace |
| 3 | 33 | Special Use Airspace |
| 3 | 331 | Restricted Areas |
| 3 | 332 | Prohibited Areas |
| 3 | 333 | Warning Areas |
| 3 | 335 | Alert Areas |
| 3 | 336 | Controlled Firing Areas (CFAs) |
| 3 | 34 | Other Airspace Areas |
| 3 | 342 | Military Training Routes (MTRs) |
| 3 | 343 | Temporary Flight Restrictions (TFRs) |
| 3 | 344 | Parachute Jump Aircraft Operations |
| 3 | 345 | Published VFR Routes |
| 3 | 346 | Terminal Radar Service Areas (TRSA) |
| 3 | 347 | National Security Areas (NSA) |
| 3 | 348 | Air Defense Identification Zones (ADIZ) |
| 4 | 42 | Airport Runways and Orientation |
| 4 | 44 | Airport Signs and Markings |
| 5 | 52 | Surface Aviation Weather Observations |
| 5 | 53 | Aviation Routine Weather Report (METAR) Decoding |
| 5 | 532 | Wind and Visibility |
| 5 | 533 | Weather Phenomena and Sky Condition |
| 5 | 534 | Temperature, Altimeter, and Remarks |
| 5 | 54 | Aviation Weather Forecast Products |
| 5 | 541 | Terminal Aerodrome Forecast (TAF) and Aviation Area Forecast (FA) |
| 5 | 542 | SIGMET and Convective SIGMET (WST) |
| 5 | 543 | AIRMET and Winds/Temperatures Aloft (FB) |
| 5 | 55 | Terminal Aerodrome Forecast (TAF) Decoding |
| 5 | 552 | Valid Period and Core Forecast Elements |
| 5 | 553 | Forecast Change Groups (FM, TEMPO, PROB) |
| 6 | 61 | Air Pressure, Density, and Altitude Effects |
| 6 | 62 | Pressure, Humidity, and Performance |
| 6 | 63 | Wind, Turbulence, and Severe Wind Hazards |
| 6 | 64 | Atmospheric Stability and Temperature Inversions |
| 6 | 641 | Atmospheric Stability and Convective Currents |
| 6 | 65 | Dew Point and Structural Icing Hazards |
| 6 | 66 | Clouds and Thunderstorm Life Cycle |
| 6 | 67 | Fronts, Mountain Flying, and Operational Minimums |
| 6 | 672 | Mountain Flying Cautions |
| 7 | 72 | FORCES DURING A TURN |
| 7 | 73 | WEIGHT & BALANCE CONSIDERATIONS FOR RPIC |
| 7 | 74 | LOAD |
| 7 | 75 | MAXIMUM GROSS TAKEOFF WEIGHT |
| 7 | 76 | WEIGHT CHANGES DURING FLIGHT |
| 7 | 77 | BALANCE AND CENTER OF GRAVITY (CG) |
| 7 | 78 | BALANCE AND CENTER OF GRAVITY (CG) - RPIC Management |
| 7 | 79 | GRAVITY |
| 7 | 710 | CG VS. CP RELATIONSHIP - Stability Concept |
| 7 | 711 | CG VS. CP RELATIONSHIP - Aircraft Type |
| 7 | 712 | WEIGHT AND LIFT RELATIONSHIP |
| 7 | 713 | STABILITY |
| 7 | 714 | STABILITY, MANEUVERABILITY & CONTROLLABILITY |
| 7 | 715 | LOAD FACTORS |
| 7 | 716 | LOAD - Turn Stress |
| 7 | 717 | LOAD FACTORS - Pilot Concerns |
| 7 | 718 | LOAD FACTOR IN STEEP TURNS |
| 7 | 719 | RATE OF TURN (ROT) AND AIRSPEED |
| 7 | 720 | LOAD FACTOR VS BANK ANGLE - Rapid Increase |
| 7 | 721 | LOAD FACTOR VS BANK ANGLE - Calculation Example |
| 7 | 722 | EXTREME BANK ANGLES |
| 7 | 723 | STALLS AND LOAD FACTOR - Stall Definition |
| 7 | 724 | STALLING SPEED & LOAD FACTOR |
| 7 | 725 | WEIGHT AND BALANCE - Limits and Consequences |
| 7 | 726 | WEIGHT - Definition |
| 7 | 727 | WEIGHT - Lift Dependence |
| 7 | 728 | WEIGHT - Excessive Weight Degradations |
| 7 | 729 | SAFETY CONSIDERATIONS |
| 7 | 730 | KEY TAKEAWAYS |
| 7 | 731 | QUESTIONS AND COMMENTS |
| 8 | 82 | Preflight Planning, Checklists, and Crew Briefing |
| 8 | 83 | Regulatory Deviation and Documentation |
| 8 | 84 | Example Emergency Scenario |
| 9 | 91 | Aeronautical Decision Making (ADM) |
| 9 | 912 | Steps to Good Decision Making (Part 2) |
| 9 | 92 | Risk Management |
| 9 | 921 | Hazards and Risk Assessment |
| 9 | 922 | Hazardous Attitudes and Antidotes |
| 9 | 923 | Mitigating Risks: IMSAFE Checklist |
| 9 | 924 | Mitigating Risks: PAVE Checklist |
| 9 | 93 | Crew and Single-Pilot Resource Management |
| 9 | 933 | Situational Awareness |
| 9 | 94 | Physiology and Vision |
| 9 | 942 | Collision Threat Detection |

### 4. Unclassified rows

77 rows could not be confidently assigned. They are present in the JSON with `unit_id: null` and `status: draft`. Sample:

- *(sheet `test` row 3)* `(Refer to FAA-CT-800-2H, Figure 21). What is the airport located approximately 47 degrees 40 minutes N latitude and 101 degrees 26 minutes w`
- *(sheet `test` row 4)* `(Refer to FAA-CT-8080-2G, Figure 23) What’s the lower altitude limit of Class E airspace at Statesboro Bulloch County Airport (TBR)?`
- *(sheet `test` row 5)* `(Refer to FAA-CT-8080-2H, Figure 12.) The wind direction and velocity at KJFK is from`
- *(sheet `test` row 6)* `(Refer to FAA-CT-8080-2H, Figure 12.) What are the current conditions for Chicago Midway Airport (KMDW)?`
- *(sheet `test` row 7)* `(Refer to FAA-CT-8080-2H, Figure 12.) Which stations are reporting weather that would prohibit UAS operations?`
- *(sheet `test` row 8)* `(Refer to FAA-CT-8080-2H, Figure 15.) What is the valid period for the TAF for KMEM?`
- *(sheet `test` row 9)* `(Refer to FAA-CT-8080-2H, Figure 2.) If an unmanned airplane weighs 33 pounds, what approximate weight would the airplane structure be requi`
- *(sheet `test` row 10)* `(Refer to FAA-CT-8080-2H, Figure 20 Area 1) The Fentress NALF Airport (NFE) is in what type of airspace?`
- *(sheet `test` row 11)* `(Refer to FAA-CT-8080-2H, Figure 20, area 2.) Why would the small flag at Lake Drummond of the sectional chart be important to a remote pilo`
- *(sheet `test` row 12)* `(Refer to FAA-CT-8080-2H, Figure 20, area 3.) With ATC authorization, you are operating your small unmanned aircraft approximately 4 SM sout`
- *(sheet `test` row 13)* `(Refer to FAA-CT-8080-2H, Figure 20, area 4.) A small UA is being launched 2 NM northeast of the town of Hertford. What is the height of the`
- *(sheet `test` row 14)* `(Refer to FAA-CT-8080-2H, Figure 20, area 5.) How would a remote PIC "CHECK NOTAMS" as noted in the CAUTION box regarding the unmarked ballo`
- *(sheet `test` row 15)* `(Refer to FAA-CT-8080-2H, Figure 21, area 1.) After receiving authorization from ATC to operate a small UA near Minot International airport `
- *(sheet `test` row 16)* `(Refer to FAA-CT-8080-2H, Figure 21, area 2.) Which airport is located at approximately 47 degrees 41 minutes 00 seconds N latitude and 101 `
- *(sheet `test` row 17)* `(Refer to FAA-CT-8080-2H, Figure 21.) You have been hired by a farmer to use your small UA to inspect his crops. The area that you are to su`
- *(sheet `test` row 18)* `(Refer to FAA-CT-8080-2H, Figure 22, area 2.) At Coeur D'Alene which frequency should be used as a Common Traffic Advisory Frequency (CTAF) `
- *(sheet `test` row 19)* `(Refer to FAA-CT-8080-2H, Figure 22, area 2.) Weather information is available at the Coeur d'Alene (COE) Airport`
- *(sheet `test` row 20)* `(Refer to FAA-CT-8080-2H, Figure 23, area 4.) What is the required flight visibility for a remote pilot operating an unmanned aircraft near `
- *(sheet `test` row 21)* `(Refer to FAA-CT-8080-2H, Figure 24, area 3, and Legend 1.) For information about the parachute operations at Tri-County Airport, refer to`
- *(sheet `test` row 23)* `(Refer to FAA-CT-8080-2H, Figure 25, area 2.) What is the base of Class B airspace at Lakeview (30F) Airport?`