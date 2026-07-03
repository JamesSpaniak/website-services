# Agent guide — Drone Edge monorepo

Instructions for AI agents (Cursor, CI bots, etc.) working across **product**, **sales**, and **marketing** in this repository.

## What this repo is

- **`backend/`** — NestJS API (Postgres/Aurora, Stripe, S3/CloudFront media, auth, courses, articles).
- **`drone/`** — Next.js 15 frontend (App Router, `/api` proxy to internal ALB).
- **`terraform/`** + **`pipeline.sh`** — AWS infra and deploy (currently one production stack; see environment plan).
- **`docs/`** — Reference documentation by domain (`tech`, `sales`, `marketing`).
- **`workflows/`** — Executable runbooks (sales outreach, deploy, content pipeline).
- **`assets/`** — Course JSON, article outlines, brand files, news drafts, competitor research.
- **`scripts/`** — Python/shell helpers; not all are safe to run without review.
- **`data/outreach/`** — Generated contact lists and email drafts (may contain PII).

## Before you change code

1. Read [`docs/tech/local-dev.md`](tech/local-dev.md) for stack layout.
2. Match existing patterns in the file you edit (minimal diff).
3. Legal/privacy copy: check [`docs/tech/legal-and-privacy-site-sync.md`](tech/legal-and-privacy-site-sync.md) and synced files under `drone/src/app/legal/` and `drone/src/app/privacy/`.
4. **Do not** run `./pipeline.sh --env prod` on current Terraform state without reading [`docs/tech/environment-split-plan.md`](tech/environment-split-plan.md).

## Before you help with sales or marketing

1. Use [`workflows/sales/outreach.md`](../workflows/sales/outreach.md) for outreach process — manual-first, no unsupervised bulk email.
2. Use [`workflows/sales/email-drafts.md`](../workflows/sales/email-drafts.md) for templates; personalize first line.
3. Do not invent FAA pass rates, school adoption counts, or grant eligibility.
4. Product claims: verify against [`docs/sales/features.md`](sales/features.md) and live site.
5. Competitor figures: treat [`docs/sales/competitor-analysis.md`](sales/competitor-analysis.md) and [`assets/competitor.txt`](../assets/competitor.txt) as snapshots — verify before external use.

## Safe vs sensitive operations

| Safe to suggest | Ask first / read workflow |
|-----------------|---------------------------|
| Edit frontend/backend with tests locally | `./pipeline.sh` deploy to AWS |
| Draft outreach email in chat | Sending email or importing contacts to a CRM |
| Update course JSON in `assets/articles/` | Bulk DB migrations on production |
| Run contact scripts locally | Committing `data/outreach/*.csv` |
| Terraform plan | Terraform apply (especially prod tfvars) |

## Deploy reality (important)

`./pipeline.sh --env dev` deploys the **live production stack** today (`project_name = droneedge-dev`). See environment split plan. Pipeline must register new ECS task definition revisions for image updates (`lifecycle.ignore_changes` on container definitions).

## File placement rules

| Content type | Put it here |
|--------------|-------------|
| Architecture, API reference, infra | `docs/tech/` |
| Positioning, competitors, contact strategy | `docs/sales/` |
| SEO/GEO, brand, content strategy | `docs/marketing/` |
| Repeatable process steps | `workflows/<domain>/` |
| Course/article source data | `assets/articles/`, `assets/news/` |
| Brand logos and mockups | `assets/Logo/`, `assets/Assets/` |
| Outreach outputs | `data/outreach/` |

## Cross-links agents often need

- Product capabilities: [`docs/sales/features.md`](sales/features.md)
- School collateral URLs: [`workflows/sales/outreach.md`](../workflows/sales/outreach.md) § Reference links
- Contact scripts: `scripts/collect_school_contacts.py`, `scripts/draft_contact_emails.py`, `scripts/contact_sources.yaml`
- News → JSON: `scripts/build_news_article_json.py`, `assets/news/`

## Commits

Only commit when the user asks. Do not commit terraform state, `.env`, secrets, or outreach CSVs unless explicitly requested.
