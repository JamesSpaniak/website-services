# Agent guide — Drone Edge monorepo

Full rules for AI agents (Cursor, Claude Code, CI bots) working across **product**, **sales**, and **marketing** in this repository.

**Navigation:** repo index + doc-system definitions live in [`../AGENTS.md`](../AGENTS.md); task → doc lookup in [`SKILLS.md`](SKILLS.md); backlog in [`TODO.md`](TODO.md). Read this file for the rules, then the folder-level `AGENTS.md` for the area you're editing.

## What this repo is

- **`backend/`** — NestJS API (Postgres/Aurora, Stripe, S3/CloudFront media, auth, courses, articles).
- **`drone/`** — Next.js 15 frontend (App Router, `/api` proxy to internal ALB).
- **`terraform/`** + **`pipeline.sh`** — AWS infra and deploy (currently one production stack; see environment plan).
- **`docs/`** — Reference documentation by domain (`tech`, `sales`, `marketing`).
- **`workflows/`** — Executable runbooks (sales outreach, deploy, content pipeline).
- **`assets/`** — Course JSON, article outlines, brand files, news drafts.
- **`scripts/`** — Python/shell helpers; not all are safe to run without review.
- **`outreach/`** — Generated contact lists and email drafts (may contain PII).

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
5. Competitor figures: treat [`docs/sales/competitor-analysis.md`](sales/competitor-analysis.md) (Appendix A) as a snapshot — verify before external use.

## Safe vs sensitive operations

| Safe to suggest | Ask first / read workflow |
|-----------------|---------------------------|
| Edit frontend/backend with tests locally | `./pipeline.sh` deploy to AWS |
| Draft outreach email in chat | Sending email or importing contacts to a CRM |
| Update course JSON in `assets/courses/` | Bulk DB migrations on production |
| Run contact scripts locally | Committing `outreach/*.csv` |
| Terraform plan | Terraform apply (especially prod tfvars) |
| Add a resource to Terraform | Creating AWS resources by hand (`aws … create-*`, console) |

## Infrastructure — Terraform owns everything

**All AWS resources are declared in `terraform/` and created by `terraform apply`.** Never create, delete, or rename AWS resources with the AWS CLI or console — hand-made resources drift from state and get clobbered or duplicated on the next apply.

- New resource → add it to Terraform, don't `aws … create-*`.
- Ordering trap (resource needs a value before a task starts) → solve it in Terraform with a dedicated value resource + `depends_on` (see how `test_user_password` is handled), not a manual `put-secret-value`.
- Only exception: a resource type genuinely unsupported by the AWS provider (should never happen) — create it, then `terraform import` it and register it in `scripts/reconcile-state.sh`, documenting why.
- Carve-out: sensitive **secret values** are seeded out-of-band into Terraform-owned secret containers so they never hit git; the container itself is still Terraform-owned.

Full detail: [`docs/tech/architecture.md`](tech/architecture.md) § Resource ownership.

## Deploy reality (important)

`./pipeline.sh --env dev` deploys the **live production stack** today (`project_name = droneedge-dev`). See environment split plan. Pipeline must register new ECS task definition revisions for image updates (`lifecycle.ignore_changes` on container definitions).

## File placement rules

| Content type | Put it here |
|--------------|-------------|
| Architecture, API reference, infra | `docs/tech/` |
| Positioning, competitors, contact strategy | `docs/sales/` |
| SEO/GEO, brand, content strategy | `docs/marketing/` |
| Repeatable process steps | `workflows/<domain>/` |
| Course/article source data | `assets/courses/`, `assets/articles/`, `assets/news/` |
| Brand logos and mockups | `assets/visuals/Logo/`, `assets/visuals/Assets/` |
| Outreach outputs | `outreach/` |

## Cross-links agents often need

- Product capabilities: [`docs/sales/features.md`](sales/features.md)
- School collateral URLs: [`workflows/sales/outreach.md`](../workflows/sales/outreach.md) § Reference links
- Contact scripts: `scripts/collect_school_contacts.py`, `scripts/draft_contact_emails.py`, `scripts/contact_sources.yaml`
- News → JSON: `scripts/build_news_article_json.py`, `assets/news/`

## Commits

Only commit when the user asks. Do not commit terraform state, `.env`, secrets, or outreach CSVs unless explicitly requested.

## Keeping docs current

**Required for agents:** when you change code, assets, or process in any folder, update the linked reference docs in the same session. Each major folder has README + AGENTS.md with a change → doc table:

| Folder | Agent guide |
|--------|-------------|
| `backend/` | [`backend/AGENTS.md`](../backend/AGENTS.md) |
| `drone/` | [`drone/AGENTS.md`](../drone/AGENTS.md) |
| `docs/` | This file + domain READMEs under `tech/`, `sales/`, `marketing/` |
| `workflows/` | [`workflows/AGENTS.md`](../workflows/AGENTS.md) |
| `assets/` | [`assets/AGENTS.md`](../assets/AGENTS.md) |

Backlog hygiene: ship an item → move row from [`TODO.md`](TODO.md) to [`TODO_COMPLETED.md`](TODO_COMPLETED.md) with the date.
