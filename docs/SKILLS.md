# Project skills map

Task-oriented index for humans and agents. Each row points to the canonical doc or workflow. For Cursor Agent Skills (`.cursor/skills/`), add project skills over time that link back to these paths.

## Product & engineering

| Task | Start here | Scripts / code |
|------|------------|----------------|
| Run app locally | [`docs/tech/local-dev.md`](tech/local-dev.md) | `docker compose`, `backend/`, `drone/` |
| Deploy to AWS | [`workflows/tech/deploy.md`](../workflows/tech/deploy.md) | `./pipeline.sh --env dev` |
| Understand deployed infra | [`docs/tech/architecture.md`](tech/architecture.md) | `terraform/` |
| Understand API surface | [`docs/tech/backend-data.md`](tech/backend-data.md) | `backend/src/` |
| Understand frontend data flow | [`docs/tech/frontend-data.md`](tech/frontend-data.md) | `drone/src/app/lib/` |
| Edit course structure / exams | [`docs/tech/course-editing-roadmap.md`](tech/course-editing-roadmap.md) | Admin UI, course JSON |
| Rebuild FAA 107 units from outlines | [`workflows/tech/content-build.md`](../workflows/tech/content-build.md) | `scripts/rebuild_unit*.py` |
| Question bank build | [`docs/tech/exam-generator-and-course-linking.md`](tech/exam-generator-and-course-linking.md) | `scripts/build_faa_107_questions.py` |
| Unit refs migration | [`docs/tech/unit-refs-migration.md`](tech/unit-refs-migration.md) | — |
| Environment dev/prod split | [`docs/tech/environment-split-plan.md`](tech/environment-split-plan.md) | `terraform/env/*.tfvars` |
| Legal/privacy sync | [`docs/tech/legal-and-privacy-site-sync.md`](tech/legal-and-privacy-site-sync.md) | `drone/src/app/legal/`, `privacy/` |
| Bulk video upload | [`workflows/tech/content-build.md`](../workflows/tech/content-build.md) | `scripts/bulk-upload-videos.sh` |
| Regenerate API types | — | `scripts/generate-api-types.sh` |

## Sales

| Task | Start here | Scripts / data |
|------|------------|----------------|
| School outreach (full process) | [`workflows/sales/outreach.md`](../workflows/sales/outreach.md) | Spreadsheet/CRM |
| Write a cold email | [`workflows/sales/email-drafts.md`](../workflows/sales/email-drafts.md) | — |
| Collect district contacts | [`docs/sales/contact-collection.md`](sales/contact-collection.md) | `scripts/collect_school_contacts.py`, `scripts/contact_sources.yaml` |
| Generate draft emails from CSV | [`docs/sales/contact-collection.md`](sales/contact-collection.md) | `scripts/draft_contact_emails.py` |
| Pitch / procurement language | [`docs/sales/features.md`](sales/features.md) | — |
| Competitor comparison | [`docs/sales/competitor-analysis.md`](sales/competitor-analysis.md) | `assets/competitor.txt` |
| Outreach data files | — | `data/outreach/contact-candidates.csv`, `contact-email-drafts.csv` |

## Marketing

| Task | Start here | Scripts / assets |
|------|------------|------------------|
| SEO & GEO strategy | [`docs/marketing/seo-geo-strategy.md`](marketing/seo-geo-strategy.md) | — |
| Content calendar & promotion | [`workflows/marketing/content-and-seo.md`](../workflows/marketing/content-and-seo.md) | — |
| Publish news article to JSON | [`workflows/marketing/content-and-seo.md`](../workflows/marketing/content-and-seo.md) | `scripts/build_news_article_json.py`, `assets/news/` |
| Brand assets (logo, social) | [`docs/marketing/brand-assets.md`](marketing/brand-assets.md) | `assets/Logo/`, `assets/Assets/Social/` |
| Article hero / story images | [`workflows/marketing/content-and-seo.md`](../workflows/marketing/content-and-seo.md) | `scripts/brand_story11_images.py`, `assets/news/images/` |

## Adding Cursor project skills

When a workflow stabilizes, consider a skill under `.cursor/skills/<name>/SKILL.md` that:

1. Names trigger phrases (e.g. "school outreach", "deploy frontend", "rebuild unit 3").
2. Links to the workflow file above.
3. Lists forbidden actions (unsupervised email send, prod terraform apply).

Do not duplicate long prose — skills should point here and to workflows.
