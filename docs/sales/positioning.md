# Positioning — Drone Edge

Internal reference for sales, marketing, and product. **Primary:** B2B schools and programs. **Secondary:** B2C career changers and self-paced learners.

Keep claims aligned with [`features.md`](features.md). Do not invent pass rates, adoption counts, or grant eligibility.

---

## Vision

**Drone Edge is a web-native learning platform built by people from the drone community** — pilots, instructors, and builders who care how commercial UAS matures.

We help learners and programs move from curiosity to **credible FAA Part 107 preparation** and applied drone skills, with structured courseware, visible progress, and assessments — not a loose folder of videos and PDFs.

We support the industry’s mission: **safe operations, credible certification, and room for people from every background to learn well.**

---

## One-liner

> **Drone Edge is Part 107–aligned drone education for CTE classrooms and serious self-paced pilots — structured paths, teacher visibility, and practice exams in the browser.**

---

## Audience priority

| Priority | Who | Job to be done |
|----------|-----|----------------|
| **Primary (B2B)** | CTE directors, STEM coordinators, career academy leads, CC workforce leads | Run a cert-aligned drone pathway with accountability, hybrid delivery, and procurement-friendly framing |
| **Secondary (B2C)** | Career changers, hobbyists going commercial, tech/creative learners | Pass Part 107 (or explore drone careers) on their own schedule without flight-school pricing |
| **Not primary (yet)** | Middle-school exploratory STEM, non-US regulatory prep | Different product shape; do not oversell Part 107 readiness |

**Sales rep scope:** B2B schools and programs only. **Marketing scope:** B2B + B2C.

---

## Ideal customer profiles (ICP)

### B2B — Primary ICP

**Title:** CTE / STEM / career academy decision-maker at a US secondary or postsecondary program.

**Signals:**

- Existing or planned drone club, aviation, robotics, media production, or workforce pathway
- Interest in industry credentials (Part 107) or STEM grant language
- Need for async/hybrid delivery and teacher visibility
- Pennsylvania and neighboring states (funding page is PA-aware; expandable)

**Buyers often include:** CTE director, STEM coordinator, academy principal, workforce dean, grants coordinator (after interest), business office (PO/vendor).

**Anti-fit:** Buyer wants only block-coding kits with zero regulatory framing; buyer needs Transport Canada / EASA exam prep today; buyer expects full LMS roster sync / SSO (roadmap — see [`features.md`](features.md)).

### B2C — Secondary ICP

**Title:** Adult learner preparing for commercial drone work (real estate, inspection, media, side business).

**Signals:**

- Searching for Part 107 prep, career change, “drone license”
- Wants self-paced study, practice questions, clear price
- May discover via articles/SEO before courses

**Anti-fit:** Buyer expects guaranteed pass or FAA exam registration included; buyer wants in-person flight instruction only.

---

## Three-track product story

| Track | Status | Buyer message |
|-------|--------|---------------|
| **FAA Part 107** | Live | Structured units, 600+ practice questions (verify live count), unit and course exams, org dashboards |
| **Video & Photography** | Coming soon | Creative/production pipeline — do not sell as available |
| **AI & Drones** | Coming soon | STEM/CS pathway — do not sell as available |

Lead with **Part 107** in all school conversations. Mention other tracks as roadmap only when the buyer asks about media or CS pathways.

---

## Messaging pillars

### For schools (B2B)

1. **Outcome clarity** — Units → sections → media → exams; progress at course and unit level.
2. **Built for real delivery** — Browser-based, async/hybrid, org accounts, manager dashboard.
3. **Teacher visibility** — Cohort progress, exam scores, per-student activity (manager role).
4. **Honest preparation depth** — Growing question bank; ACS-aligned framing; no fake pass-rate claims.
5. **Funding language** — Link [`/schools/funding`](https://thedroneedge.com/schools/funding); never guarantee grant eligibility.

### For individuals (B2C)

1. **Credible Part 107 prep** — Structured course, not random YouTube.
2. **Try before you buy** — Unit 1 free preview; full course unlock (retail price on preview page).
3. **Self-paced** — Fit around a job; no classroom required.
4. **From the community** — Built by people who care about field craft and safety.

---

## Competitive frame (short)

See [`competitor-analysis.md`](competitor-analysis.md) for detail.

**We win when the buyer wants:**

- Modern web delivery + org progress visibility
- Honest Part 107 pathway + practice density
- Partner posture (consultation, implementation support)

**We lose or defer when the buyer requires:**

- Massive legacy workbook + printed kit bundles day one
- Established district-wide LMS integration (SSO/LTI — roadmap)
- Non-US regulatory prep without localization

---

## Claims — approved vs prohibited

### Approved (verify before external use)

| Claim | Source / note |
|-------|----------------|
| Structured FAA Part 107 course with nested units/sections | Live product + [`assets/courses/faa-107/faa_107_course.json`](../../assets/courses/faa-107/faa_107_course.json) |
| 600+ ACS-tagged practice questions | Site copy; verify current import count before decks |
| Org accounts, invite codes, manager dashboard | [`features.md`](features.md) |
| Browser-based, no app install | Product |
| Unit 1 free preview + retail unlock for individuals | Preview page + Stripe (after deploy) |
| Funding *considerations* for PA SMART / federal CTE | [`/schools/funding`](https://thedroneedge.com/schools/funding) — not eligibility |

### Prohibited until documented

- Pass rates or “X% of students pass”
- “Used by N schools/districts” without named permission
- Grant eligibility guarantees
- SSO, Google Classroom, LTI, roster sync (roadmap)
- Full Video/AI tracks as shippable today
- FAA exam fee included in price

---

## Brand & visual identity

Collateral must use the official kit:

| Asset | Path |
|-------|------|
| Visual identity PDF | [`assets/visuals/Presentation/VisualIdentityDroneEdge.pdf`](../../assets/visuals/Presentation/VisualIdentityDroneEdge.pdf) |
| Logos (SVG/PNG) | [`assets/visuals/Logo/`](../../assets/visuals/Logo/) |
| Colors, fonts, social templates | [`assets/visuals/`](../../assets/visuals/) |
| Index | [`docs/marketing/brand-assets.md`](../marketing/brand-assets.md) |

Site UI uses design tokens (`--brand-primary`, etc.) — PDFs and decks should match the PDF kit, not ad-hoc colors.

---

## Public URLs (share freely)

| Page | URL |
|------|-----|
| Schools overview | https://thedroneedge.com/schools |
| Curriculum | https://thedroneedge.com/schools/curriculum |
| Funding | https://thedroneedge.com/schools/funding |
| Consultation | https://thedroneedge.com/consultation |
| Course catalog | https://thedroneedge.com/courses |
| Part 107 preview (example) | https://thedroneedge.com/courses/35/preview |
| Privacy | https://thedroneedge.com/privacy |
| Terms | https://thedroneedge.com/legal |

---

## Related docs

- [`packages.md`](packages.md) — offer ladder and pricing structure
- [`rep-handoff.md`](rep-handoff.md) — day-one rep guide
- [`features.md`](features.md) — product truth
- [`workflows/sales/outreach.md`](../../workflows/sales/outreach.md) — outreach playbook

*Update when go-to-market positioning or public pricing changes.*
