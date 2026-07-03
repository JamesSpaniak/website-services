# Outreach content calendar

Content that supports **school sales outreach** and **B2C discovery**. Clarifies what lives at `/articles` vs static `/schools` pages vs downloadables.

Publish workflow: [`content-and-seo.md`](content-and-seo.md). Strategy: [`docs/marketing/seo-geo-strategy.md`](../../docs/marketing/seo-geo-strategy.md).

---

## Content model (three layers)

| Layer | Where | Purpose | Social / rep |
|-------|--------|---------|--------------|
| **Conversion pages** | `/schools`, `/schools/curriculum`, `/schools/funding`, `/consultation` | Short, scannable, CTA-driven — book a call, understand offer | Rep sends these in **first touch**; not long-form |
| **Reference articles** | `/articles/[id]` (CMS) | SEO, credibility, shareable links, deep answers | Rep **follow-ups**, social posts, "learn more" from schools pages |
| **Downloadables** | PDF in repo or CDN; linked from articles + schools | Pacing guide, one-pager — procurement attachments | Rep **post-reply** email attachments |

**Rule:** P0–P2 **editorial pieces are `/articles`**, not copy pasted into schools pages. Schools/consultation pages get **light cross-links** only (e.g. "Resources" block → 2–4 article cards). Do not duplicate full article body on static pages.

Articles are seeded in `assets/news/*.txt` → `assets/news/articles/*.json` → admin import. Slug in JSON is for editorial tracking; public URL is numeric id after publish (`/articles/42`).

---

## Current library (link today)

| Asset | Type | Best for |
|-------|------|----------|
| `/schools` | Conversion page | Every first touch |
| `/schools/curriculum` | Conversion page | Post-reply, curriculum leads |
| `/schools/funding` | Conversion page | Grants follow-up (concise) |
| `/consultation` | Conversion page | CTA after interest |
| `/articles/story-11-drone-careers` | Reference article | Student outcomes; B2C + rep recap |
| `/articles/story-05-faa-remote-id` | Reference article | Safety / compliance buyers |
| `/courses/35/preview` | Product surface | "See student experience" |

**Gap:** No B2B reference articles yet. Schools pages stand alone; nothing shareable for "how does this run in our classroom?"

---

## Schools / consultation page updates (not replacements)

When P0+ articles ship, add a **Resources** section (no new routes required):

| Page | Change | Links to |
|------|--------|----------|
| `/schools` | Optional "Program resources" strip (2–3 article cards) | P0 #1, P0 #2 when live |
| `/schools/curriculum` | "Implementation" links | P0 #1, P1 #6, P2 #8 (pacing PDF) |
| `/schools/funding` | "Read more" below fold | P0 #3 funding article |
| `/consultation` | Sidebar "Before the call" | P0 #1 + curriculum page |

Implementation: static `Link` list or reuse `ArticlePreviewComponent` if we add a tagged "schools" article filter later. **Phase 1:** manual links in page TSX; **Phase 2:** CMS tag `audience: schools` for dynamic list.

---

## Priority queue (B2B — rep-facing)

All numbered items below are **`/articles`** unless noted.

### P0 — Ship before second outreach batch (two articles)

| Slug | Title | Format | Status in repo |
|------|-------|--------|----------------|
| `school-01-part-107-cte-classroom` | **Part 107 in the HS CTE classroom + teacher visibility** | Single `/articles` piece (combined former #1 + #2) | **Ready** — `assets/news/articles/school-01-part-107-cte-classroom.json` |
| `school-02-funding-drone-programs` | **Funding drone programs in schools** | `/articles` companion to `/schools/funding` | **Ready** — `school-02-funding-drone-programs.json` |

**P0 page tie-in:** After prod import, link both from `/schools` Resources; funding article also from `/schools/funding`.

**Inventory:** [`docs/marketing/article-inventory.md`](../../docs/marketing/article-inventory.md)

---

### P1 — Next 60 days (implementation plan)

| Slug | Title | Repo status |
|------|-------|-------------|
| `school-03-pilot-vs-full-year` | Pilot semester vs full-year | **Draft** — expand before import |
| `school-04-kits-vs-curriculum` | Drone kits vs curriculum | **Draft** |
| `school-05-hybrid-async-prep` | Hybrid and async Part 107 prep | **Draft** |

**P1 delivery checklist (each article):**

1. Draft `assets/news/school-XX-[slug].txt`
2. Hero image (brand kit or product screenshot)
3. `build_news_article_json.py` → JSON with `seo_phrases`, FAQ block
4. Import to CMS; note numeric id in this doc
5. Add to schools resources links
6. One social post + rep slack/email "new link for [use case]"

---

### P2 — After first school win

| Slug | Title | Repo status | Trigger |
|------|-------|-------------|---------|
| `school-06-case-study-template` | Case study: [School name] | **Blocked** (template in repo) | Pilot completes + permission |
| `school-07-pacing-guide-intro` | Pacing guide + PDF | **Blocked** (intro stub in repo) | Pilot year debrief |

#### P8 — Pacing guide (define after pilot year)

**Trigger:** At least one school completes a **full pilot term** (90 days or one semester) using the platform — not at first signup.

**Why wait:** Pacing should reflect real classroom weeks (unit order, exam timing, hybrid vs block schedule). Draft outline during pilot; **finalize PDF after pilot debrief** with the school.

**Deliverables:**

| Piece | Format | Location |
|-------|--------|----------|
| Pacing PDF (16–24 weeks) | PDF | `assets/sales/pacing-guide-part-107.pdf` (or CDN) |
| Landing blurb | Short article (~400–600 words) | `/articles/[id]` — describes what's inside, links PDF |
| Page links | Static | `/schools/curriculum` → "Download pacing guide" |

**PDF contents (outline):**

- Assumptions (50-min periods vs block; 15–30 students)
- Week-by-week map to Part 107 course units
- When to assign unit exams vs course practice exam
- Manager dashboard check-in cadence for teachers
- Optional flight lab weeks (hardware not included)
- Disclaimer: sample pacing; districts adapt

**Rep use:** Post-qualification email attachment; curriculum committee reviews.

**Owner timeline:**

| Phase | When | Action |
|-------|------|--------|
| Pilot start | Month 0 | Rep logs pacing assumptions in delivery ticket |
| Mid-pilot | ~Week 6 | Marketing drafts PDF from course unit map (marked DRAFT) |
| Pilot end | Month 4–5 | Debrief with school; adjust weeks; leadership approves |
| Publish | Within 2 weeks of debrief | PDF + article + curriculum page link |

---

## B2C queue — scope (A, B, C)

Marketing-led; articles at `/articles`. Funnel: SEO / social → `/courses/35/preview` → $29 unlock. Rep may link when teachers ask "what will students see?"

### A — How to pass the Part 107 exam (2026 study guide)

| Field | Scope |
|-------|--------|
| **Format** | Long reference article (1,500–2,500 words) |
| **Audience** | Individual test-takers, career changers |
| **Intent keywords** | Part 107 study guide, how to pass Part 107, FAA drone test prep |
| **Structure** | ACS domain overview (no verbatim FAA text); study timeline (2–8 weeks); practice question strategy; test day logistics; **what we don't promise** (no pass guarantee) |
| **Product tie-in** | Unit 1 free preview; structured course vs random quizzes; link preview |
| **CTA** | `/courses/35/preview` — not consultation |
| **Overlap** | Complements `story-11-drone-careers` (careers vs exam mechanics) |
| **Not in scope** | Full question bank dump; FAA document reproduction |

### B — Part 107 practice questions: what good prep looks like

| Field | Scope |
|-------|--------|
| **Format** | Medium article (900–1,200 words) |
| **Audience** | Buyers comparing prep products; teachers evaluating depth |
| **Intent keywords** | Part 107 practice test, drone exam questions, ACS practice |
| **Structure** | What ACS alignment means; quantity vs quality; spaced practice; unit vs course exams; 2–3 **sample question styles** (original, not bank leaks); red flags in weak prep |
| **Product tie-in** | 600+ questions claim (verify live count); unit exams; preview |
| **CTA** | Preview + try Unit 1 |
| **Rep use** | "How do we know students will pass?" — send instead of quoting pass rates |
| **Not in scope** | Publishing large slices of the bank |

### C — $29 Part 107 course vs flight school ground school

| Field | Scope |
|-------|--------|
| **Format** | Comparison article (800–1,100 words) |
| **Audience** | Price-sensitive learners; hobbyists going commercial |
| **Intent keywords** | Part 107 online course, cheap Part 107 prep, ground school cost |
| **Structure** | Table: self-paced online vs in-person ground school (typical price bands **as ranges**, cite "verify locally"); what's included/excluded (FAA test fee, flight instruction); who each fits |
| **Product tie-in** | $29 one-time, Unit 1 free, lifetime access |
| **CTA** | Preview page |
| **Not in scope** | Named competitor trashing; exact competitor prices without date |

### D — From hobbyist to commercial pilot: first 90 days

Lower priority; largely covered by `story-11-drone-careers`. Defer or merge into A's timeline section unless SEO gap remains.

---

## Article spec (all `/articles` pieces)

- **Honest product scope** — Part 107 live; Creative/STEM roadmap  
- **Hero image** — branded or product screenshot  
- **Audience-appropriate CTA** — B2B → `/consultation`; B2C → course preview  
- **Internal links** — related articles, relevant schools pages  
- **FAQ block** — 3–5 questions (GEO / snippet friendly)  
- **No** pass rates, grant guarantees, or unreleased features as live  

Draft: `assets/news/*.txt` → JSON via `scripts/build_news_article_json.py`.

---

## Rep linking guide

| Stage | Send |
|-------|------|
| First email | `/schools` only |
| Follow-up — curriculum | `/schools/curriculum` + P0 #1 when live |
| Follow-up — funding | `/schools/funding` + P0 #3 article |
| Post-demo | P0 #2 + `/consultation` |
| Objection: kits | P1 #5 |
| Objection: pilot size | P1 #4 |
| Objection: prep depth | B2C #B (teachers) or preview |
| Student-facing proof | preview + B2C #A or careers article |
| Post-qualification | P2 #8 PDF when available |

UTM when tracking: `?utm_source=outreach&utm_medium=email&utm_campaign=[campaign-id]`.

---

## 90-day cadence (suggested)

| Month | Ship | Layer |
|-------|------|-------|
| M1 | `school-01`, `school-02` | Import ready JSON → prod; schools resource links |
| M2 | `school-04`, `school-05` | Expand drafts → import |
| M3 | `school-03`, `b2c-01` | Expand drafts → import |
| After pilot | `school-06`, `school-07` + PDF | Case study + pacing guide |

Rep feedback from [`outreach.md`](../sales/outreach.md) weekly review reorders queue.

---

## Related

- [`docs/sales/go-to-market-review.md`](../../docs/sales/go-to-market-review.md)
- [`workflows/sales/outreach.md`](../sales/outreach.md)
- [`docs/sales/positioning.md`](../../docs/sales/positioning.md)
