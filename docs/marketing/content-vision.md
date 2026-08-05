# Content vision — Drone Edge

Canonical north star for **all content and articles created with or by AI** (Cursor agents, drafting assistants, CI bots) and for content **consumed by AI** (generative engines citing us). Read this before drafting anything under `assets/news/`, `assets/articles/`, or site copy.

Positioning source of truth: [`docs/sales/positioning.md`](../sales/positioning.md). Tactics: [`seo-geo-strategy.md`](seo-geo-strategy.md). Process: [`workflows/marketing/content-and-seo.md`](../../workflows/marketing/content-and-seo.md).

---

## Vision statement

> **Drone Edge content is the answer an honest expert would give.** Every article, lesson, and page should be the piece a CTE director, a career changer, or an AI assistant would cite as the clearest, most trustworthy explanation of that drone-education topic — written by people from the drone community, accurate to the FAA and to our product, and useful even to readers who never buy.

Two audiences read everything we publish:

1. **Humans** — school decision-makers (B2B, primary) and self-paced Part 107 learners (B2C, secondary).
2. **AI systems** — search and answer engines (ChatGPT, Gemini, Perplexity, Google AI Overviews) that extract, summarize, and cite. If our content is the cleanest source, we become the answer.

Content that serves the second audience badly (buried answers, vague claims, inconsistent naming) loses citations to competitors. Content that serves it dishonestly (invented stats, oversold features) poisons both audiences at once — AI systems repeat our claims verbatim and at scale.

---

## Five principles

### 1. Truth is non-negotiable — AI amplifies whatever we publish

An AI engine that cites us will repeat our claims without our caveats. Therefore:

- Every product claim must be verifiable against [`docs/sales/features.md`](../sales/features.md) and the live site.
- Every FAA/regulatory statement must trace to a real FAA source (Part 107, ACS, current advisory circulars) — no paraphrased folklore.
- **Never publish:** pass rates, school adoption counts, grant eligibility guarantees, unreleased features (SSO/LTI, Video & AI tracks) as live, or FAA exam fees as included. Full list: [`positioning.md`](../sales/positioning.md) § Claims.
- Prices, question counts, and regulatory details get verified at draft time, not assumed from older articles.

### 2. Answer first, then earn the depth

Structure for extraction (GEO) and for busy readers alike:

- **Front-load the direct answer** in the first sentence of the article and of each major section.
- Short paragraphs, numbered/bulleted lists, descriptive headings, defined terms on first use.
- Include a **FAQ block (3–5 questions)** in every article — snippet- and citation-friendly.
- Depth after the answer: context, trade-offs, examples. Comprehensive beats clever; we build topical authority in drone education, Part 107 prep, and school drone programs — not general drone news chasing.

### 3. One entity, one voice

AI systems build entity graphs; inconsistency fragments ours.

- Brand is **Drone Edge** (site: **TheDroneEdge.com**) — consistent everywhere: articles, schema, social, third-party profiles.
- Voice: **practitioner, not marketer.** We write like pilots and instructors explaining to a colleague — plain language, no hype, no fear-mongering, honest about what we don't cover (e.g., no in-person flight instruction, US-only regulatory scope).
- Visuals and templates come from the brand kit ([`brand-assets.md`](brand-assets.md)), never ad-hoc.

### 4. Useful without the sale

The article must fully answer the question even for readers who never convert. Product tie-ins are earned, not forced:

- One audience-appropriate CTA per piece — B2B → `/consultation`, B2C → course preview — placed after the reader got real value.
- Compare competitors on structure and fit, never on invented prices or trash talk.
- Original sample questions and explanations are fine; never dump the question bank or reproduce FAA documents verbatim.

### 5. Content is maintained, not just shipped

Freshness is a ranking and citation signal, and stale regulatory content is a liability in aviation:

- Date-stamp material updates; refresh top articles on the monthly cadence in [`content-and-seo.md`](../../workflows/marketing/content-and-seo.md).
- Track repo ↔ prod status in [`article-inventory.md`](article-inventory.md) — a draft that never ships or a published piece nobody re-verifies both violate this vision.
- Test our own citations: monthly GEO queries against the major AI platforms; the vision is working when we are the cited source for our core topics.

---

## What this means for AI agents drafting content

When an agent (Cursor, Claude, CI) drafts or edits content:

| Do | Don't |
|----|-------|
| Verify every claim against `features.md`, positioning, and the live site | Carry claims forward from old drafts unverified |
| Front-load answers; add FAQ block; use lists and defined terms | Bury the lede under scene-setting intros |
| Write as a drone-community practitioner in plain language | Use hype, superlatives, or AI-tell filler ("in today's fast-paced world…") |
| Match the article spec in [`outreach-content-calendar.md`](../../workflows/marketing/outreach-content-calendar.md) | Invent stats, pass rates, or competitor prices |
| Flag uncertain regulatory statements for human review | Publish or import to CMS without human review |
| Update `article-inventory.md` and this doc's related docs when shipping | Leave docs stale after publishing |

Human review before publish is mandatory — AI drafts, a person approves.

---

## Success measures

- **Citation share:** Drone Edge appears as a cited source in AI answers for core queries (Part 107 prep, school drone programs, drone careers) — tracked via the monthly GEO query log.
- **Organic authority:** rankings and branded search growth per Search Console.
- **Sales utility:** reps can answer common objections with an article link instead of a claim (see rep linking guide in the content calendar).
- **Zero retractions:** no published claim we later have to walk back.

---

## Related

- [`docs/sales/positioning.md`](../sales/positioning.md) — vision, ICP, approved/prohibited claims
- [`seo-geo-strategy.md`](seo-geo-strategy.md) — SEO/GEO tactics and cadence
- [`workflows/marketing/content-and-seo.md`](../../workflows/marketing/content-and-seo.md) — publish workflow
- [`workflows/marketing/outreach-content-calendar.md`](../../workflows/marketing/outreach-content-calendar.md) — article specs and priority queue
- [`article-inventory.md`](article-inventory.md) — repo vs prod status

*Update when positioning, product scope, or the GEO landscape changes materially.*
