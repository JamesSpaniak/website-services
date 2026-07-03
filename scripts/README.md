# Scripts index

Scripts stay in this flat directory to avoid breaking paths. Grouped by company function — see [`docs/SKILLS.md`](../docs/SKILLS.md) for task → script mapping.

## Sales / outreach

| Script | Purpose |
|--------|---------|
| `collect_school_contacts.py` | Scrape public district pages → `data/outreach/contact-candidates.csv` |
| `draft_contact_emails.py` | Generate draft emails from approved contacts |
| `contact_sources.yaml` | Seed URLs for PA district collection |

## Marketing / content

| Script | Purpose |
|--------|---------|
| `build_news_article_json.py` | Convert `assets/news/*.txt` → import JSON |
| `brand_story11_images.py` | Branded hero images for news stories |

## Course / instructional (tech)

| Script | Purpose |
|--------|---------|
| `build_faa_107_questions.py` | Question bank generation |
| `course_question_mapper.py` | Map questions to course units |
| `rebuild_unit1_regulations.py` … `rebuild_unit4_airport_operations.py` | Unit JSON rebuild from outlines |
| `rebuild_unit10_radio_communications.py` | Unit 10 rebuild |
| `export_general_operations_review.py` | Export review CSV |
| `refactor_course_goals.py` | Course goals refactor helper |
| `plaintext_course_text_content.py` | Extract plain text from course content |

## Infra / devops

| Script | Purpose |
|--------|---------|
| `bulk-upload-videos.sh` | S3 raw video bulk upload |
| `reconcile-state.sh` | Terraform state reconciliation (sourced by pipeline) |
| `generate-api-types.sh` | Regenerate frontend types from OpenAPI |

## Analysis (adhoc)

| Script | Purpose |
|--------|---------|
| `analyze_fulllogs.py` | Log analysis helper |
