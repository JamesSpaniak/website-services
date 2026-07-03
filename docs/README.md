# Drone Edge — company documentation

This repo runs **TheDroneEdge.com** (product) and the **go-to-market** work around it (school sales, content, SEO). Documentation is split so you can operate the business without digging through app code.

## Structure

| Area | Purpose | Location |
|------|---------|----------|
| **Reference docs** | Stable facts, architecture, positioning, plans | [`docs/tech/`](tech/), [`docs/sales/`](sales/), [`docs/marketing/`](marketing/) |
| **Workflows** | Step-by-step runbooks you execute repeatedly | [`workflows/`](../workflows/) |
| **Code** | Backend (`backend/`), frontend (`drone/`), infra (`terraform/`) | Repo root |
| **Assets** | Brand, course content, news drafts, research | [`assets/`](../assets/) |
| **Operational data** | Contact lists, email drafts (gitignored or review before commit) | [`data/outreach/`](../data/outreach/) |
| **Scripts** | Automation helpers | [`scripts/`](../scripts/) |

## Quick start by role

### Engineering / product

1. Local stack: [`docs/tech/local-dev.md`](tech/local-dev.md)
2. Deploy: [`workflows/tech/deploy.md`](../workflows/tech/deploy.md)
3. API & DB reference: [`docs/tech/backend-data.md`](tech/backend-data.md), [`docs/tech/frontend-data.md`](tech/frontend-data.md)
4. Course/content tooling: [`workflows/tech/content-build.md`](../workflows/tech/content-build.md)

### Sales (schools & B2B)

1. Operating playbook: [`workflows/sales/outreach.md`](../workflows/sales/outreach.md)
2. **Positioning & rep handoff:** [`docs/sales/positioning.md`](sales/positioning.md), [`rep-handoff.md`](sales/rep-handoff.md)
3. **Packages & quotes:** [`docs/sales/packages.md`](sales/packages.md), [`quote-template.md`](sales/quote-template.md)
4. Email templates: [`workflows/sales/email-drafts.md`](../workflows/sales/email-drafts.md)
5. Product pitch & capabilities: [`docs/sales/features.md`](sales/features.md)
6. Competitor landscape: [`docs/sales/competitor-analysis.md`](sales/competitor-analysis.md)
7. Contact collection plan: [`docs/sales/contact-collection.md`](sales/contact-collection.md)

### Marketing / growth

1. SEO & GEO strategy: [`docs/marketing/seo-geo-strategy.md`](marketing/seo-geo-strategy.md)
2. Content & distribution cadence: [`workflows/marketing/content-and-seo.md`](../workflows/marketing/content-and-seo.md)
3. Brand & media assets index: [`docs/marketing/brand-assets.md`](marketing/brand-assets.md)
4. Article inventory (repo vs prod CMS): [`docs/marketing/article-inventory.md`](marketing/article-inventory.md)

## Agent & automation entry points

- **[`AGENTS.md`](AGENTS.md)** — How AI agents should navigate this repo and what not to touch.
- **[`SKILLS.md`](SKILLS.md)** — Task → doc/workflow/script mapping for common company operations.

## Live product URLs

| Page | URL |
|------|-----|
| Home | https://thedroneedge.com |
| Schools | https://thedroneedge.com/schools |
| Curriculum | https://thedroneedge.com/schools/curriculum |
| Funding | https://thedroneedge.com/schools/funding |
| Consultation | https://thedroneedge.com/consultation |
| Courses | https://thedroneedge.com/courses |
| Articles | https://thedroneedge.com/articles |

## Conventions

- **Docs** = reference material (what things are, why, constraints).
- **Workflows** = ordered steps (do this, then that).
- Prefer updating the workflow when a process changes; update the doc when facts or strategy change.
- Contact CSVs under `data/outreach/` may contain PII — review before committing.
