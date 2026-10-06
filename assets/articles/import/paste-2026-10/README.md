# Paste batch: October 2026

Paste-ready article JSON from the [Oct 2026 article review](../../../../docs/marketing/article-review-2026-10.md) §4b.

**These files are the current version of these articles.** The older JSON files for the same slugs in `import/` are superseded.

**`seo_phrases` is left out on purpose.** The admin importer used to append a "Topics & related search terms" block whenever that field was present. Fixed Oct 4 2026: the importer no longer appends it, and `prepareArticleBodyHtml` strips the block from already-published articles at render, so the field is safe to include again.

## Re-import after the slugs + tags deploy (Oct 2026)

Each file now carries `slug` and `tags`, and links between published articles use slugs (`/articles/drone-careers-2026`) instead of IDs, so they work on every environment.

1. Deploy first (backend migration `1765000013000` adds `slug` + `tags`; existing articles get a slug from their title automatically).
2. Admin → Articles → edit #39, #40, #41, #42 → paste the **whole JSON** into the body field → check the Slug and Tags fields filled in → **Update**. The hero image is kept unless the JSON sets one.
3. Check each `/articles/<slug>` loads and the old `/articles/<id>` redirects to it.

| File | Slug | Tags |
|---|---|---|
| 01 | `part-107-high-school-cte` | Schools, Part 107 |
| 02 | `drone-careers-2026` | Careers, Part 107 |
| 03 | `drone-grant-application-language` | Schools, Funding |
| 04 | `drone-education-programs-2026` | Schools, Careers |
| 05 | `drone-grants-for-schools` | Schools, Funding |
| 06 | `who-gets-to-build-drones` | Building, Careers |

**Links still pointing at `/articles` on purpose** (their target isn't published yet; hidden articles 404 for readers, so a link to one would be broken):
- 01 "funding a school drone program in 2026" and 03 "2026 guide to drone grants for schools" → switch to `/articles/drone-grants-for-schools` when 05 is published.
- 02 "Who Gets to Build Drones?" → switch to `/articles/who-gets-to-build-drones` when 06 is published.

Keep tags to the shared set (Schools, Funding, Careers, Part 107, Building) so the topic filter and per-topic RSS feeds stay useful.

## How to apply each file

1. Admin → Articles → open the article (edits) or click **New Article** (new ones).
2. Paste the **whole JSON** into the body field. Title, sub-heading and body fill in automatically.
3. **Then** upload the hero image, if the table below lists one. Pasting JSON with a `hero_image` replaces the image field; JSON without one leaves the current image alone (fixed Oct 6 2026).
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

**After all six are saved:** (superseded by slugs — see the re-import section above) note their IDs. Then replace the generic `/articles` links with the real ones:
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
