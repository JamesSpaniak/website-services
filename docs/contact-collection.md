# Contact collection plan

This document plans a script-assisted workflow for collecting school outreach contacts from public education websites. The goal is not to send automated email. The goal is to build a reviewed, source-backed contact list that can feed the manual outreach workflow in `docs/outreach-workflow.md`.

Start with public pages only, keep the source URL for every record, and require human review before a contact is marked outreach-ready.

## Example sources

| Source | What it can provide | Extractor type | Notes |
| --- | --- | --- | --- |
| [Pennsylvania Department of Education contact page](https://www.pa.gov/agencies/education/contact-us) | Agency-level context, phone number, bureau/program contact form path | Static page summary | Useful for source discovery and official routing, not many named contacts. |
| [PDE OESE contact list](https://www.pa.gov/agencies/education/programs-and-services/instruction/elementary-and-secondary-education/oese-contact-list) | Named state education leaders, Bureau of Career and Technical Education contacts, curriculum contacts, email, phone, roles | Table extractor | High-value seed list for state-level CTE/curriculum contacts. |
| [School District of Philadelphia contact page](https://www.philasd.org/contactus/) | Central office directory links, CTE, curriculum, grants, procurement, teaching and learning, school directory | Directory-link extractor | Good hub page; follow selected department links rather than treating the hub as a contact list. |
| [West Chester Area School District school board page](https://www.wcasd.net/school-board) | Board/governance contacts and links to curriculum, career exploration, technology, AI, and board committees | Page + link discovery | The page has at least one direct board secretary contact; better for discovering relevant subpages. |
| [Avon Grove directory](https://www.avongrove.org/directory) | District/staff directory entries with names, roles, schools, phones, emails | Directory-card extractor | Likely paginated/dynamic; needs careful pagination handling and role filtering. |
| [Downingtown Teaching and Learning staff](https://www.dasd.org/departments/teaching-and-learning/staff) | Named teaching and learning leaders, secondary, science/STEM, AI, college/career readiness, emails, extensions | Staff-profile extractor | Very strong district-level source for curriculum/STEM contacts. |

## Collection strategy

Use a two-stage pipeline:

1. **Discovery:** fetch a small set of known pages and collect structured links that look relevant.
2. **Extraction:** parse selected pages into normalized contact records.

Do not crawl entire districts by default. District sites are large, repetitive, and often include student/family support pages that are not relevant. Start with explicit seed URLs, then optionally follow only links whose text or URL matches target topics.

Target topics:

- Career and Technical Education, CTE.
- STEM, science, technology education, engineering.
- AI, computer science, instructional technology.
- Curriculum, teaching and learning, secondary education.
- College and career readiness, workforce, career pathways.
- Grants, procurement, business office, accounts payable.
- School board or superintendent contacts only when they are the appropriate routing path.

Avoid collecting:

- Student contacts.
- Parent/family support contacts unless they route programs.
- Health, special education, disciplinary, safety, or crisis contacts unless directly relevant.
- Generic staff directory entries with no curriculum, CTE, STEM, technology, grants, procurement, or leadership signal.
- Any page behind login, CAPTCHA, or access controls.

## Output schema

Write one CSV row per contact candidate. Include enough fields for review and dedupe.

| Field | Required | Notes |
| --- | --- | --- |
| organization | Yes | District, school, agency, college, or office. |
| organization_type | Yes | `state_agency`, `district`, `school`, `community_college`, `service_agency`, `unknown`. |
| state | Yes | Usually `PA` for the first campaign. |
| source_url | Yes | Exact page where the contact was found. |
| source_title | No | HTML title or page heading. |
| source_type | Yes | `table`, `directory_card`, `staff_profile`, `hub_page`, `board_page`, `contact_page`. |
| contact_name | No | Blank for generic offices or forms. |
| title | No | Job title or role. |
| department | No | Bureau, office, school, or department. |
| email | No | Store only public business emails. |
| phone | No | Include extension if available. |
| role_tags | Yes | Normalized tags such as `cte`, `stem`, `curriculum`, `ai`, `grants`, `procurement`, `leadership`. |
| confidence | Yes | `high`, `medium`, or `low`. |
| review_status | Yes | Default `needs_review`; later `approved`, `reject`, `duplicate`, `do_not_contact`. |
| notes | No | Why this contact might matter. |
| collected_at | Yes | ISO timestamp. |

Recommended CSV path:

```text
data/outreach/contact-candidates.csv
```

Keep generated output out of commits unless intentionally adding a seed dataset. Contact lists can age quickly and may include personally identifiable business contact details.

## Script shape

Create a small script first, not a service.

Suggested path:

```text
scripts/collect_school_contacts.py
```

Suggested inputs:

```text
scripts/contact_sources.yaml
```

Example `contact_sources.yaml`:

```yaml
sources:
  - name: PDE contact page
    url: https://www.pa.gov/agencies/education/contact-us
    organization: Pennsylvania Department of Education
    organization_type: state_agency
    state: PA
    extractor: hub_page

  - name: PDE OESE contact list
    url: https://www.pa.gov/agencies/education/programs-and-services/instruction/elementary-and-secondary-education/oese-contact-list
    organization: Pennsylvania Department of Education
    organization_type: state_agency
    state: PA
    extractor: pde_oese_tables

  - name: Philadelphia district contact hub
    url: https://www.philasd.org/contactus/
    organization: School District of Philadelphia
    organization_type: district
    state: PA
    extractor: philly_contact_hub

  - name: West Chester school board
    url: https://www.wcasd.net/school-board
    organization: West Chester Area School District
    organization_type: district
    state: PA
    extractor: finalsite_page

  - name: Avon Grove directory
    url: https://www.avongrove.org/directory
    organization: Avon Grove School District
    organization_type: district
    state: PA
    extractor: finalsite_directory

  - name: Downingtown teaching and learning staff
    url: https://www.dasd.org/departments/teaching-and-learning/staff
    organization: Downingtown Area School District
    organization_type: district
    state: PA
    extractor: finalsite_staff_page
```

Core flow:

```text
load source config
for each source:
  check robots and fetch policy
  fetch page with rate limiting
  parse with source-specific extractor
  normalize names, titles, emails, phones, tags
  score confidence
  dedupe against existing output
  write contact candidates to CSV/JSONL
write run report with counts, rejects, errors, and discovered follow-up URLs
```

## Extraction approach

Use source-specific extractors because school websites vary heavily.

### Static table pages

Best for pages like the PDE OESE contact list.

Parsing:

- Use `requests` and `BeautifulSoup`.
- Find tables near relevant headings.
- Map columns like `Name`, `Title`, `Email`, `Phone`, `Roles`.
- Preserve the heading as `department`, such as `Bureau of Career and Technical Education`.
- Tag rows from CTE and curriculum bureaus as high priority.

Confidence:

- `high` when a row has name + title + email + official source URL.
- `medium` when email is missing but phone and role are present.

### Hub/contact pages

Best for PDE contact page and Philadelphia contact page.

Parsing:

- Extract page title, main office phone, and links.
- Do not create many contact rows from navigation alone.
- Create organization-level records only for useful official contact routes.
- Add discovered links to a follow-up queue when link text matches target topics.

Target link text:

- Career and Technical Education.
- Curriculum and Instruction.
- Teaching and Learning.
- Grants.
- Procurement.
- Postsecondary Readiness / College and Career.
- School Directory.
- Central Office Directory.

Confidence:

- `medium` for generic department contact links.
- `low` for navigation-only discoveries until the linked page is parsed.

### Staff profile pages

Best for Downingtown Teaching and Learning.

Parsing:

- Split content around headings, bold names, or profile blocks.
- Extract nearby email and phone/extension.
- Associate title lines near each name.
- Tag based on title and bio keywords, for example `7-12 Science`, `STEM`, `AI`, `College/Career Readiness`, `Teaching and Learning`.

Confidence:

- `high` for named staff with role + email.
- `medium` for named staff with role but no email.

### Directory cards and paginated directories

Best for Avon Grove.

Parsing:

- First try static HTML cards.
- If pagination is server-rendered, follow `next` links with a strict page limit.
- If content is JavaScript-rendered, use Playwright only for that source.
- Filter aggressively by department, title, school level, and keywords.

Target title/department keywords:

- STEM.
- Tech Ed.
- Technology Education.
- Computer Science.
- Business and Computer Science.
- Science.
- Curriculum.
- Teaching and Learning.
- Career.
- CTE.
- Principal.
- Assistant Principal.
- Superintendent.

Confidence:

- `medium` by default for broad directory matches.
- `high` only when title clearly aligns to CTE/STEM/curriculum leadership.

### Board/governance pages

Best for West Chester school board pages.

Parsing:

- Extract board secretary or board office contact if listed.
- Extract board member names only if public email/contact fields are present.
- Discover links to curriculum, career exploration, technology, AI initiatives, board committees, and school board regions.
- Do not treat board members as the default first-touch audience unless the district lacks better program contacts.

Confidence:

- `medium` for board office/secretary contacts.
- `low` for board member names without direct contact or program relevance.

## Normalization and scoring

Role tags should be deterministic so records can be filtered.

Example tag rules:

| Match | Tag |
| --- | --- |
| `career and technical`, `cte`, `vocational` | `cte` |
| `science`, `stem`, `engineering`, `technology education`, `tech ed` | `stem` |
| `computer science`, `ai`, `instructional technology` | `ai_cs` |
| `curriculum`, `instruction`, `teaching and learning` | `curriculum` |
| `college and career`, `workforce`, `career readiness` | `career_readiness` |
| `grant`, `federal programs`, `title iv`, `perkins` | `grants` |
| `procurement`, `purchasing`, `accounts payable`, `business office` | `procurement` |
| `superintendent`, `assistant superintendent`, `director` | `leadership` |

Confidence scoring:

- `high`: named person, public institutional email, relevant role, exact source URL.
- `medium`: named person or office with partial relevance, or relevant page without direct email.
- `low`: discovered link, broad directory hit, board/governance role, or weak title match.

Review defaults:

- `high` and `medium`: `needs_review`.
- `low`: `needs_research`.
- obvious non-target records: `reject`.

## Deduping

Deduping should run before appending to the master file.

Rules:

- Exact email match wins.
- If no email, match organization + normalized name.
- Keep multiple source URLs in a `source_urls` list if using JSONL; for CSV, keep the strongest source URL and add alternates to notes.
- Prefer higher confidence records.
- Preserve older notes if a later run finds the same contact.

## Compliance and site etiquette

This workflow should be conservative.

- Use only public pages.
- Respect `robots.txt` and site terms.
- Rate limit requests, for example one request every two to five seconds per domain.
- Send a clear user agent identifying the script and contact email.
- Cache pages during development.
- Do not bypass CAPTCHA, login, paywalls, or access controls.
- Do not collect student data.
- Do not collect personal social media profiles.
- Keep `do_not_contact` records and suppress them from future exports.
- Human-review every contact before outreach.

## First implementation milestone

Build the smallest useful version:

1. Add `scripts/contact_sources.yaml` with the six seed URLs.
2. Add `scripts/collect_school_contacts.py`.
3. Implement fetch, cache, and CSV writing.
4. Implement the PDE OESE table extractor.
5. Implement the Downingtown staff-profile extractor.
6. Implement generic email/phone extraction with nearby heading/title context.
7. Output `data/outreach/contact-candidates.csv`.
8. Output `data/outreach/contact-collection-report.md`.
9. Manually review results and tune keywords before adding pagination or Playwright.

This milestone should prove the data model and review flow before dealing with dynamic district directories.

## Later milestones

Second milestone:

- Philadelphia hub link extraction.
- West Chester board/page link discovery.
- Avon Grove first-page directory-card extraction.
- Better dedupe and role tagging.

Third milestone:

- Optional Playwright rendering for JavaScript-heavy directories.
- Controlled pagination with page limits.
- Domain-level throttling and retries.
- Configurable include/exclude keywords per source.

Fourth milestone:

- Export approved contacts to the outreach tracker schema in `docs/outreach-workflow.md`.
- Add a manual review UI or spreadsheet workflow.
- Add incremental runs that update existing rows instead of replacing files.

## Review workflow

After each script run:

1. Open the run report.
2. Review high-confidence contacts first.
3. Confirm each source URL manually.
4. Mark records as `approved`, `reject`, `duplicate`, `needs_research`, or `do_not_contact`.
5. Export only approved contacts into the outreach tracker.
6. Record which source types produced useful contacts and which produced noise.

## Open decisions

- Whether to commit generated contact files or keep them local only.
- Whether to use CSV only or JSONL plus CSV export.
- Whether Playwright is acceptable for dynamic directories.
- What email/domain to use in the script user agent.
- Whether to include board members in first-touch outreach or treat board pages as routing/discovery only.
- Which CRM or spreadsheet will be the master source after review.
