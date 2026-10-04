# Paste batch: October 2026

Paste-ready article JSON from the [Oct 2026 article review](../../../../docs/marketing/article-review-2026-10.md) §4b.

**These files are the current version of these articles.** The older JSON files for the same slugs in `import/` are superseded.

**`seo_phrases` is left out on purpose.** The admin importer appends a "Topics & related search terms" block whenever that field is present (`drone/src/app/lib/article-import-json.ts`). That block is the keyword list showing on live articles.

## How to apply each file

1. Admin → Articles → open the article (edits) or click **New Article** (new ones).
2. Paste the **whole JSON** into the body field. Title, sub-heading and body fill in automatically.
3. **Then** upload the hero image, if the table below lists one. Upload after pasting, because pasting resets the image field.
4. Save. Set the status shown in the table.

## Order and status

| # | File | Action | Hero | Status |
|---|---|---|---|---|
| 1 | `01-edit-40-school-01-part-107-cte.json` | Edit #40 | Keeps current | Published |
| 2 | `02-edit-39-story-11-drone-careers.json` | Edit #39 | Keeps current (4 inline images kept) | Published |
| 3 | `03-new-school-02-grant-language.json` | New | Set in JSON (media URL, live now) | Published |
| 4 | `04-new-gap-02-drone-education-programs.json` | New | Set in JSON (media URL, live now; our Aug 8 aerial) | Published |
| 5 | `05-new-gap-03-drone-grants-for-schools.json` | New | **Needs a photo.** Shot idea: two drones on a classroom desk next to a printed budget sheet with a few line items circled | Hidden until photo, or publish without one |
| 6 | `06-new-gap-01-who-gets-to-build-drones.json` | New | **Needs a photo.** Shot idea: a 3D-printed 3.5" frame on a bench with a soldering iron and flight controller. Ask Joe for build photos. | **Hidden until `/courses/tracks/building` is live** (launch W2) |

**After all six are saved:** note their IDs. Then replace the generic `/articles` links with the real ones:
- #40: the funding-guide and education-map links.
- #39: the two "Related reading" links.
- #3 and #5: their links to each other.

Re-paste each edited file. Then record the IDs in [`article-inventory.md`](../../../../docs/marketing/article-inventory.md).

**Leave Hidden:** #35, #36 and "AI & Drones". #36 comes back later rewritten as a builder's battery/motor piece.

## Before you click Publish

- Read each piece once. AI drafts, a person approves.
- gap-03's opening is the Chichester grant story with the school unnamed (two drones, teacher asked for four). Make sure the teacher is OK with it even anonymized.
- On publish day, re-check the Part 108 status and the FCC Covered List dates.

## Social posts (once the accounts exist; E2)

**gap-02, LinkedIn (CTE / parents):**
> Two 15-year-olds who both love flying drones. One has a state drone course, a certified teacher and a competition team. The other, twenty miles away, has nothing. We mapped what drone education actually exists in 2026, from middle-school kits to UAS degrees, and the five gaps in the middle. [link]

**gap-03, LinkedIn (CTE directors, grant writers):**
> A teacher's drone grant came through this fall. It bought two drones. The teacher had asked for four. 2026 changed school funding (ESSER is gone, Title IV-A wobbled, and federal money can no longer buy DJI). Here's where the money is now, and how to budget so year two still works. [link]

**gap-01, Instagram / LinkedIn (makers, students):**
> The firmware on most FPV drones started as a Wii controller gyro taped to an Arduino. Hobbyists built the drone industry. But 36% of Part 107 holders only fly for fun, and new hobbyists are declining. Who gets to learn to build? [link] Drone Building early access: January 2027.

**#39 refresh, LinkedIn:**
> About 480,000 people hold an FAA drone pilot certificate. The certificate isn't the hard part. Updated for 2026: where drone jobs cluster and which skills beat buying a second drone. [link]
