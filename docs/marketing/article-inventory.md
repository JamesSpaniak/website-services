# Article inventory

Tracks **repo drafts** vs **production CMS** (admin dashboard). Public URLs use numeric id after import: `https://thedroneedge.com/articles/[id]`.

**Import:** Admin article editor → import JSON from `assets/news/articles/*.json`  
**Update this file** when an article is published, hidden, or assigned a prod id.

---

## Status legend

| Status | Meaning |
|--------|---------|
| **Published (prod)** | Live on site; admin shows Published |
| **Hidden (prod)** | In CMS but not public |
| **Ready (repo)** | Full draft in repo — import and publish |
| **Draft (repo)** | Stub in repo — expand before import |
| **Blocked** | Waiting on pilot, permission, or PDF asset |
| **Not started** | Planned only — no repo file yet |

---

## Production CMS (admin dashboard)

Sync from prod as of July 2026. Fill **Prod ID** when known (check admin or URL after publish).

| Title | Prod status | Image | Prod date | Prod ID | Repo slug |
|-------|-------------|-------|-----------|---------|-----------|
| Drone Careers in 2026: Agriculture, Fire, Delivery, and Beyond the Hobby | Published | Yes | 5/21/2026 | _fill_ | `story-11-drone-careers` |
| FPV Drones and the Rewriting of Land Warfare: What Changed After 2022 | Published | Yes | 5/20/2026 | _fill_ | `story-01-ukraine-fpv-warfare` |
| Ukraine's Drone Industrial Push: How a Country Scaled Small UAS Production | Published | Yes | 5/2/2026 | _fill_ | `advance-06-ukraine-mass-drone-production` |
| Batteries, Motors, and Endurance: The Physics Ceiling on Electric Drones | Published | Yes | 3/29/2026 | _fill_ | `advance-05-energy-propulsion` |
| Onboard AI and Computer Vision on Small Drones: From Obstacle Avoidance to Edge Inference | Published | Yes | 3/29/2026 | _fill_ | `advance-01-onboard-ml-computer-vision` |
| AI & Drones | Hidden | Yes (8 blocks) | 2/19/2026 | _fill_ | _legacy CMS — no slug file_ |

### Other published repo articles (confirm in admin)

These exist in `assets/news/articles/` — confirm Published/Hidden and dates in admin:

| Repo slug | Title (from manifest) | Prod status |
|-----------|----------------------|-------------|
| `story-02-us-china-drone-restrictions` | U.S. Policy, Chinese Drones, and the FCC Covered List | _confirm_ |
| `story-03-dji-pentagon-lawsuit` | DJI, the Pentagon, and "Chinese Military Company" Labels | _confirm_ |
| `story-04-china-drone-export-controls` | China's Drone Export Controls | _confirm_ |
| `story-05-faa-remote-id` | FAA Remote ID for Drones | _confirm_ |
| `story-06-drone-delivery-commercial` | Drone Delivery Beyond Demos | _confirm_ |
| `story-07-ai-drone-swarming-debate` | AI, Drone Swarms, and Autonomy | _confirm_ |
| `story-08-maritime-underwater-drones` | Maritime and Underwater Drones | _confirm_ |
| `story-09-counter-uas-industry` | Counter-UAS (C-UAS) | _confirm_ |
| `story-10-europe-easa-drone-rules` | European Drone Rules and EASA Frameworks | _confirm_ |
| `advance-02` … `advance-04`, `advance-06` | Advance series | _confirm_ |

---

## Outreach & GTM articles (planned)

### B2B — schools (`/articles` + link from `/schools`)

| Priority | Slug | Title | Repo file | Status | Prod ID | Notes |
|----------|------|-------|-----------|--------|---------|-------|
| **P0-a** | `school-01-part-107-cte-classroom` | Part 107 in the HS CTE Classroom + Teacher Visibility | `school-01-part-107-cte-classroom.json` | **Ready (repo)** | — | Hero: `/images/articles/school-01-part-107-cte-classroom-hero.png` |
| **P0-b** | `school-02-funding-drone-programs` | Funding Drone Programs in Schools | `school-02-funding-drone-programs.json` | **Ready (repo)** | — | Hero: `/images/articles/school-02-funding-drone-programs-hero.png` |
| P1 | `school-03-pilot-vs-full-year` | Pilot Semester vs Full-Year | `school-03-pilot-vs-full-year.json` | Draft (repo) | — | Expand before publish |
| P1 | `school-04-kits-vs-curriculum` | Drone Kits vs Curriculum | `school-04-kits-vs-curriculum.json` | Draft (repo) | — | |
| P1 | `school-05-hybrid-async-prep` | Hybrid and Async Part 107 Prep | `school-05-hybrid-async-prep.json` | Draft (repo) | — | Add screenshots |
| P2 | `school-06-case-study-template` | Case Study: [School Name] | `school-06-case-study-template.json` | **Blocked** | — | After pilot + permission |
| P2 | `school-07-pacing-guide-intro` | Semester Pacing Guide (+ PDF) | `school-07-pacing-guide-intro.json` | **Blocked** | — | PDF after pilot debrief |

### B2C — marketing funnel (`/articles` → course preview)

| ID | Slug | Title | Repo file | Status | Prod ID | Notes |
|----|------|-------|-----------|--------|---------|-------|
| A | `b2c-01-part-107-study-guide` | How to Pass the Part 107 Exam (2026) | `b2c-01-part-107-study-guide.json` | Draft (repo) | — | Expand to 1,500+ words |
| B | `b2c-02-practice-questions-prep` | Part 107 Practice Questions: What Good Prep Looks Like | `b2c-02-practice-questions-prep.json` | Draft (repo) | — | Rep objection handler |
| C | `b2c-03-twenty-nine-vs-ground-school` | $29 Part 107 vs Ground School | `b2c-03-twenty-nine-vs-ground-school.json` | Draft (repo) | — | Confirm $29 in course JSON |
| D | — | From hobbyist to commercial (90 days) | — | **Not started** | — | Defer; `story-11-drone-careers` covers most |

### Non-article assets

| Asset | Path | Status | Notes |
|-------|------|--------|-------|
| Pacing guide PDF | `assets/sales/pacing-guide-part-107.pdf` | **Not started** | Blocked on pilot debrief |
| School one-pager PDF | `assets/sales/school-overview-one-pager.pdf` | Not started | Post-reply email attachment |

---

## Publish checklist (when moving repo → prod)

1. Import JSON in admin (or paste body); set hero image if still `hero-default.svg`
2. Set status **Published** (or Hidden for review)
3. Note **Prod ID** and date in this file
4. Add link in `/schools` Resources block (B2B articles)
5. Update [`outreach-content-calendar.md`](../../workflows/marketing/outreach-content-calendar.md) rep linking table if needed
6. One social post + rep heads-up

---

## Related

- [`workflows/marketing/outreach-content-calendar.md`](../../workflows/marketing/outreach-content-calendar.md) — priorities and content model
- [`workflows/marketing/content-and-seo.md`](../../workflows/marketing/content-and-seo.md) — publish workflow
- [`assets/news/articles/manifest.json`](../../assets/news/articles/manifest.json) — slug index (legacy + story series)

*Update prod ID column after each import.*
