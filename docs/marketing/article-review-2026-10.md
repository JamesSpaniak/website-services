# Article review: October 2026

A keep/fix/retire decision for every article in [`assets/articles/import/`](../../assets/articles/import/), checked against [`../sales/positioning.md`](../sales/positioning.md), [`../sales/features.md`](../sales/features.md), [`content-vision.md`](content-vision.md) and current facts. Status tracking stays in [`article-inventory.md`](article-inventory.md). This doc records the decisions and the reasons for them.

*Reviewed 2026-10-03. Re-check every regulatory date before publishing; several changed in 2026.*

**Facts used in this review:**
- Part 107 course: $129.
- Pro: sandbox only, not public.
- Video & AI tracks: not offered and being removed from the site.
- Drone Building: early access January 2027, waitlist, no price.
- Schools: "starting at $79/seat".

---

## 1. Problems that affect many articles

1. **Internal notes are published in article bodies.** Examples:
   - advance-01 ("SEO: what people search").
   - advance-02 ("Marketability note").
   - story-03 ("Brand-safe framing").
   - story-05 ("Mobile readers").
   - story-06 ("SEO angle").
   - story-09 ("SEO clusters").
   - story-10 ("wrap in a scroll container in your layout component").
   - school-01 ("(verify current count before external decks)").

   Most story and advance pieces also have "Hook:" labels and a "Topics & related search terms" keyword footer (the footer is now stripped at render and removed from the repo JSON, Oct 4 2026; the "Hook:" labels are not). Strip all of these before anything else is imported. If the published versions match the repo, fix advance-01 in prod now.
2. **Thirteen of 28 articles are stubs** of 92–194 words. advance-01 and advance-05 are listed as Published. Check whether the live versions are longer.
3. **22 of 28 use `hero-default.svg`.**
4. **advance-01's live hero shows weapon targeting** (`advance-01-hero-cv-targeting.png`: an FPV quad with a "DETECT 0.94 / TRACK" box on a vehicle). Swap in `advance-01-hero-cv-flight.png`.
5. **`ai_drones.json` and `video_photo.json` are course payloads, not articles.** Move them out of `import/` (e.g. to `assets/archive/`). The Hidden "AI & Drones" CMS item is probably the matching legacy entry; retire it.
6. **Internal links resolve.** No article links to `/courses/tracks/video` or `/ai`. school-01 promises those tracks in text, though.

## 2. Decisions

| Slug | Status (inventory) | Words | Decision | Top issue |
|---|---|---|---|---|
| school-01-part-107-cte-classroom | Ready | 930 | **Keep, fix** | Promises the Video/AI tracks; internal note; undersells the dashboard |
| school-02-funding-drone-programs | Ready | 552 | **Keep, fix**; becomes the companion to the new funding article | Typo; dead "when published" link |
| school-03-pilot-vs-full-year | Draft | 191 | **Rewrite** (~600 words) | "Without public B2B pricing" is stale ($79 floor) |
| school-04-kits-vs-curriculum | Draft | 192 | **Rewrite** | "Do you sell drones? No" conflicts with Drone Building |
| school-05-hybrid-async-prep | Draft | 153 | **Merge into school-01** | Repeats school-01's delivery models |
| school-06 / school-07 | Blocked | ~100 | Keep blocked | Need a pilot and the pacing PDF |
| b2c-01-part-107-study-guide | Draft | 194 | **Rewrite** (1,500+), top B2C priority | Stub for the most valuable keyword |
| b2c-02-practice-questions-prep | Draft | 162 | **Rewrite** with sample questions + FAQ | "600+" not verified |
| b2c-03-twenty-nine-vs-ground-school | Draft (stale) | 146 | **Rewrite**; new slug `part-107-online-vs-ground-school` | Says $29 throughout |
| story-11-drone-careers | Published | 1,582 | **Keep, fix**; the new jobs article links to it | Unsourced pay bands; no Part 108; placeholder "related reading" |
| story-01-ukraine-fpv-warfare | Published | 919 | **Retire (unpublish)** | Warfare piece with unsourced figures, on a site sold to schools |
| advance-06-ukraine-mass-drone-production | Published | 614 | **Retire**; reuse the supply-chain lesson in the DJI buyer's guide | Off-mission; duplicates story-01's ending |
| advance-01-onboard-ml-computer-vision | Published | 187 | **Rewrite** for students/makers; absorb advance-04 | Stub, leaked SEO section, targeting hero |
| advance-05-energy-propulsion | Published | 142 | **Rewrite** as a builder's battery/motor/prop piece | Best bridge to Drone Building |
| advance-02-swarm-coordination-autonomy | confirm | 132 | **Retire** (or merge with story-07 into one classroom-safe piece) | Stub; overlaps story-07 |
| advance-03-detect-avoid-bvlos | confirm | 123 | **Rewrite** as "Part 108 BVLOS explained"; absorb story-06 | Doesn't mention Part 108 |
| advance-04-gps-denied-navigation | confirm | 130 | **Merge into advance-01** | Placeholder graph; electronic-warfare framing |
| story-02-us-china-drone-restrictions | confirm | 377 | **Rewrite** as "Can schools still buy DJI? 2026 guide"; absorb story-03/04 | FCC dates stale |
| story-03-dji-pentagon-lawsuit | confirm | 145 | **Merge into story-02** | Missing the Aug 2026 appeals ruling |
| story-04-china-drone-export-controls | confirm | 124 | **Retire** (one paragraph in story-02) | Stub, 2024 framing |
| story-05-faa-remote-id | confirm | 158 | **Rewrite** (1,000+, FAQ), high priority | Vague on a core Part 107 topic |
| story-06-drone-delivery-commercial | confirm | 144 | **Merge into advance-03** | "BVLOS waiver" framing is outdated |
| story-07-ai-drone-swarming-debate | confirm | 134 | **Retire** (or merge, see advance-02) | "Autonomous weapons" keyword |
| story-08-maritime-underwater-drones | confirm | 134 | **Retire** | Naval topic, out of scope |
| story-09-counter-uas-industry | confirm | 135 | **Retire** (or rewrite as "Can I jam or shoot down a drone? No: the law") | B2G topic; leaked note |
| story-10-europe-easa-drone-rules | confirm | 147 | **Retire** | We cover US rules only |

**Net result:** 10 retire or merge away, 9 rewrite, 4 keep with fixes, 2 stay blocked, plus 3 new articles (§4).

## 3. Corrections to make

**school-01**
- Replace "Creative and applied STEM tracks are on our roadmap; FAA Part 107 (Safety Track) is live today" and the "Roadmap: Creative Track… STEM Track" line with: *"FAA Part 107 is live today. A Drone Building course opens in early access in January 2027 (waitlist)."*
- Remove "(verify current count before external decks)" after confirming the question count.
- "progress saves in the browser" → "progress saves to the student's account."
- Add "School packages start at $79/seat."
- Add the dashboard features it leaves out: classes/periods, the per-class filter, CSV export, the per-student quiz gradebook (first/best/latest, weak sections) and effort flags.
- Re-date it.

**school-02**
- "attestions" → "attestations".
- Link school-03 or cut "when published".
- Re-verify PA SMART.
- Link the new funding article (§4, article 3).

**school-03:** add the $79/seat floor; remove the "do not publish until leadership approves tier language" banner; "a evaluation" → "an evaluation".

**school-04:** "Do you sell drones? No." → *"Not today. Our Drone Building course (early access January 2027) will pair curriculum with optional kits."* No price.

**b2c-03:** every "$29" → "$129"; change the slug and title; don't mention Pro.

**story-11**
- Source or cut "$36k–$65k" and "six figures for leads". Use BLS/O*NET figures from [`article-stats-2026-10.md`](article-stats-2026-10.md).
- Add the Part 108 status (final rule under White House review since July 10, 2026; FAA aims to publish by end of 2026; re-check before publishing).
- Replace the placeholder "related reading" with real article IDs.

**story-02 (rewrite):**
- FCC added DJI and Autel to the Covered List on 2025-12-22. Existing authorizations stay valid.
- The Blue UAS / Buy American exemptions were extended to 2028-01-01 (July 2026).
- The FCC rule on logic-bearing components in new US-built drones takes effect 2026-10-13.
- DJI v. DoD: the D.C. Circuit partly reversed on 2026-08-14 and sent the case back.
- Verify all four against FCC orders and the court opinion before publishing.

**story-05 (rewrite):** Remote ID compliance was required from 2023-09-16, with enforcement discretion ending 2024-03-16. Cover the three ways to comply: Standard Remote ID, broadcast module, and FRIA. Verify against FAA pages.

**advance-03 (rewrite):** Part 108 NPRM published 2025-08-07; comments reopened 2026-01-28 to 2026-02-11; final rule at OIRA since 2026-07-10.

## 4. What to add

### New articles drafted Oct 2026 (import JSON in repo, human review required)

| Slug | Audience | Theme |
|---|---|---|
| `gap-01-who-gets-to-build-drones` | Students, hobbyists, career changers | Drone jobs, hobbyists, how building skills spread (FPV/Betaflight), CAD and printing, Drone Building early-access testers |
| `gap-02-drone-education-every-level` | Parents, teachers, CTE directors | What exists from middle school to workforce, and where the gaps are |
| `gap-03-funding-school-drone-programs-2026` | CTE directors, grant writers | Grants in 2026, funding the whole cost, the BBC Micro vs OLPC lesson |

Statistics and sources behind them: [`article-stats-2026-10.md`](article-stats-2026-10.md).

### Gaps still open, ranked

1. **Part 107 vs recreational flying** (TRUST, when you need a certificate). This is the top beginner question.
2. **Airspace and LAANC explained**, with sectional chart basics.
3. **After you pass:** IACRA, recurrent training every 24 months, first paid job. Replaces inventory item D.
4. **Can teens get Part 107?** Age 16 and testing logistics.
5. **The total cost of Part 107** (course plus testing-center fee).
6. **Flying on school property:** policy, insurance, parent permission.
7. **Remote ID for home-built and FPV drones** (FRIA vs broadcast module). Feeds Drone Building.
8. **LiPo battery safety** for classrooms and makers (can be part of the advance-05 rewrite).
9. **CTE credential alignment** for drone pathways (state-list examples).
10. **Do I need to be a pilot to teach this?** Teacher PD.
11. **Drone competitions and clubs for students.**

## 4b. Quality scorecard: articles that will be live (2026-10-03)

**How it was scored:**
- **Reading ease** is the Flesch reading-ease score (FRE): higher is easier, and 50–60 is the target for B2B readers.
- **Grade** is the Flesch-Kincaid US school grade.
- **Keyword in title** checks whether the article's exact `seo_phrases` appear in the title or intro.
- **Hero** is the top image: **branded** means a site image with the Drone Edge banner; **default** means the placeholder `hero-default.svg`.

| Article | Words | Reading ease / grade | Keyword in title | Hero | Inline images | Source links | Story / hook |
|---|---|---|---|---|---|---|---|
| #40 school-01 CTE classroom (live) | 944 | 51 / 10.2 ✅ | No | ✅ branded classroom | 0 | 0 | Weak: all explanation, no scene. Add a dashboard screenshot |
| #39 story-11 careers (live) | 1,654 | **29 / 14.0** ❌ | No | ✅ branded ag field | 4 ✅ | 0 | Strong ("wetlands, warehouses, and wildfire perimeters"). Keyword footer appears **twice**; 6 paragraphs over 80 words |
| school-02 funding (repo) | 539 | 38 / 11.7 | No | ✅ branded meeting | 0 | 0 | Flat, disclaimer-first. Overlaps gap-03 (both target "drone program funding") |
| gap-01 who builds | 1,702 | 56 / 9.6 ✅ | No | ❌ default | 0 | 0 (sources unlinked) | Good material; opens with stats instead of the MultiWii / Wii-gyro story |
| gap-02 every level | 1,477 | 48 / 11.1 | No | ❌ default | 0 | 0 | Reference-style; needs a student-path opener |
| gap-03 funding 2026 | 1,599 | 47 / 11.8 | No | ❌ default | 0 | 0 | Has a hook buried in section 4 (BBC vs OLPC); should open with "the grant bought two drones; the teacher asked for four" |

**Shared fixes:**
1. **Titles and meta descriptions are too long.** The gap titles run 79–96 characters and their sub-headings 176–181; Google cuts titles at about 60 and descriptions at about 155.
2. **No title contains its own target phrase.**
3. **No article links to an outside source.** Linking the FAA, BLS and other primary sources builds trust with readers and AI search engines.
4. **The gap drafts have no hero images.**

## 5. Order of work

1. **Now (prod):**
   - Strip the internal notes from advance-01 and swap its hero.
   - Unpublish story-01 and advance-06.
   - Retire the Hidden "AI & Drones" item.
2. **Before Oct 8:**
   - Fix and publish school-01 and school-02. They're the only Ready pieces; the tagged links and `/schools` need them.
   - Review and publish one gap article (article 1 pairs with the Drone Building waitlist).
3. **Before Oct 23 talk:** gap articles 2 and 3 (article 3 is the talk's grant follow-up); b2c-03 rewrite; story-11 fixes.
4. **Oct–Nov:**
   - Rewrite b2c-01 and story-05.
   - Write the story-02 DJI guide and the advance-03 Part 108 piece.
   - Then work down the gap list.
