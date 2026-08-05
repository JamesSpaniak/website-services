# Outreach data

Generated and reviewed contact data for school sales. **May contain business contact PII** — review before committing. CSVs are gitignored (`outreach/*.csv`); keep research workbooks local as well.

| File | Source |
|------|--------|
| `DroneEdge School District Research.xlsx` | Manual research workbook (PA / NJ / DE counties) — source of truth for district leadership + curriculum contacts |
| `school-district-research-contacts.csv` | Normalized export from the workbook via `scripts/import_district_research.py` |
| `contact-candidates.csv` | Aggregated candidates (`collect_school_contacts.py` + research import merge) |
| `contact-email-drafts.csv` | `scripts/draft_contact_emails.py` |
| `contact-collection-report.csv` | Collection run summary |

## Import district research

```bash
# needs openpyxl
python3 -m venv /tmp/xlsx-venv && /tmp/xlsx-venv/bin/pip install openpyxl
/tmp/xlsx-venv/bin/python scripts/import_district_research.py --merge-candidates
```

This writes `school-district-research-contacts.csv` and appends new rows into `contact-candidates.csv` (deduped by email / org+name).

Workflows: [`workflows/sales/`](../workflows/sales/) · Plan: [`docs/sales/contact-collection.md`](../docs/sales/contact-collection.md)
