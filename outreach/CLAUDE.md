# Claude / agent instructions — outreach

Pointer only. The file inventory is [`README.md`](README.md); this folder has no `AGENTS.md`, so monorepo rules in [`../docs/AGENTS.md`](../docs/AGENTS.md) apply.

## Read in this order

1. [`README.md`](README.md) — what each file is and where it came from.
2. [`../workflows/sales/`](../workflows/sales/) — outreach and email-draft runbooks (manual-first).
3. [`../docs/sales/contact-collection.md`](../docs/sales/contact-collection.md) — the collection plan.

## Non-negotiables

- **This folder holds business-contact PII.** `outreach/*.csv` is gitignored and research workbooks stay local — never commit them, and check `git status` before any commit made from this repo.
- Drafting emails is fine. **Sending email or importing contacts to a CRM requires explicit approval** — no unsupervised outreach.
- Don't invent FAA pass rates, school adoption counts, or grant eligibility; verify product claims against [`../docs/sales/features.md`](../docs/sales/features.md).
