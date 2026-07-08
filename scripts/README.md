# Scripts index

Scripts stay in this flat directory. See [`docs/SKILLS.md`](../docs/SKILLS.md) for task → script mapping.

## Sales / outreach

| Script | Purpose |
|--------|---------|
| `collect_school_contacts.py` | Scrape public district pages → `outreach/contact-candidates.csv` |
| `draft_contact_emails.py` | Generate draft emails from approved contacts |
| `contact_sources.yaml` | Seed URLs for PA district collection |

## Marketing / content

| Script | Purpose |
|--------|---------|
| `build_news_article_json.py` | Convert `assets/news/*.txt` → import JSON |
| `brand_story11_images.py` | Branded hero images (`assets/visuals/Logo`, `assets/news/images/`) |
| `brand_school_article_images.py` | School article heroes (P0 B2B outreach) |

## Course / instructional

| Script | Purpose |
|--------|---------|
| `build_faa_107_questions.py` | Question bank generation → `assets/courses/` (legacy sub-unit scoping) |
| `build_unit_level_questions.py` | Author's sorted CSV → unit-level bulk import + review CSV |
| `course_question_mapper.py` | Map questions to course units |
| `export_general_operations_review.py` | Ops-category review export |
| `refactor_course_goals.py` | One-off: merge unit descriptions into goals |
| `plaintext_course_text_content.py` | One-off: strip markdown from unit bodies |

## Infra / devops

| Script | Purpose |
|--------|---------|
| `bulk-upload-videos.sh` | S3 raw video bulk upload |
| `reconcile-state.sh` | Terraform state reconciliation (sourced by pipeline) |
| `generate-api-types.sh` | Regenerate frontend types from OpenAPI |

## Analysis (adhoc)

| Script | Purpose |
|--------|---------|
| `analyze_fulllogs.py` | VPC flow log summary (`assets/archive/fulllogs.csv`) |

Removed: `rebuild_unit*.py` (superseded by editing `assets/courses/faa_107_course.json` directly).
