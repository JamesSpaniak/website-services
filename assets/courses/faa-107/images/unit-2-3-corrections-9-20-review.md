# Unit 2–3 corrections review (Sep 20 2026)

**Status: all 8 items implemented in [`faa_107_course.json`](../faa_107_course.json) Sep 20 2026.**
Still needed to go live: republish via the admin editor (`PUT /courses/35`) per the open item in
[`docs/TODO.md`](../../../../docs/TODO.md).

Source: [`corrections 9-20.docx`](../corrections%209-20.docx) (reviewer markup, 8 items + 2 reference
screenshots). Cross-checked against current [`faa_107_course.json`](../faa_107_course.json) and
[`unit-2-3-image-quality-review.md`](unit-2-3-image-quality-review.md) (the Sep 14 image-retake pass,
which anticipated several of these author decisions).

Status key: **Understood** = actionable as written, no reviewer follow-up needed. **Needs
clarification** = a specific open question before implementing.

## Unit 2 — Airports, Airspace, and Data Sources

| # | Lesson | Correction | Status |
|---|--------|-----------|--------|
| 1 | Air Traffic by the Numbers (u211) | Delete images 1 & 2 (duplicates); keep only image 3 (combined graphic). | **Understood** — confirms the pending choice already flagged `added_for_comparison` in the Sep 14 review (`aircraft-by-numbers-1of-1-da658d3d.png` vs the two originals). One data point to flag: per the current lesson text, image 3 repeats images 1–2 *except* the "5,500 aircraft in the sky at peak operational times" stat. Dropping images 1–2 entirely will drop that number unless it's kept as plain text — worth a quick confirm, but doesn't block the rest of the edit. |
| 2 | Navigation: Latitude and Longitude (u22) | (a) Delete image 4 (blurry yellow-callout duplicate), keep image 3 (blue-box version); delete the named paragraph. (b) Move image 5 (Points A–D practice grids) to after images 6 & 7. (c) Delete images 8 & 9 (quiz figures) and the named paragraph. (d) Renumber — 6 images remain. | **Understood** — all quoted deletion text matches the live `text_content` verbatim, and the arithmetic checks out (9 images − image 4 − images 8/9 = 6, matching the correction). Final order: Globe → Jacksonville chart crop → Sacramento (blue-box) → sample grid 1 → sample grid 2 → Points A–D. |
| 3 | Aeronautical Charts intro (u24) | Delete the VFR-checkpoint/stadium image (Dallas SEC, DAL) after the "explain how aeronautical charts..." text. | **Resolved — understood.** Traced the image: it's the Sep 14 retake (`vfr-checkpoint-flag-stadium-dfw-sec.png`, live now as u24's *only* image), which fully replaced the original slide crop — there's no leftover duplicate pair sitting in this lesson like the u211/u22 cases. It's also not a literal duplicate of any other image on file (different DFW-area crop than anything in u243). What it *is*: a second, less-integrated teaching of the same VFR-checkpoint-flag concept that u243 already covers properly — u243 image 4 of 8 (Ralph M Hall/Rockwall Muni) circles a real airport data block *and* calls out "a small flag symbol marks a VFR checkpoint" as part of teaching how to read a data block, whereas u24 shows the flag in isolation before airport data blocks have been introduced at all. Not a wrong-section case (the concept belongs in the intro too, conceptually), just a redundant example that u243 teaches better later. Plan: delete the image and its single describing paragraph (the "Image 1 of 1 (Dallas area...)" paragraph, which exists only to describe it) — the rest of the lesson's intro text (what charts are, what they contain) stays untouched; the lesson itself is not removed. |
| 4 | Sectional Charts (u241) | Pics are out of order: current pic 3 (index maps) → new pic 1; New Orleans → pic 2; Memphis → pic 3. Fix the explanatory text to match. | **Understood** — explicit reorder, matches current `images_url`. |
| 5 | Chart Legend, Supplement, and Airport Data (u243) | Image 5 of 8 (Sectional Aeronautical Chart overview legend) should be image 1. | **Understood**, with one assumption to confirm: the correction only states the target position for image 5. Implementation will insert it at position 1 and shift the other 7 down in their existing relative order (2,3,4,6,7,8 → 2–7) unless told otherwise. |

## Unit 3 — Airspace Classifications

| # | Lesson | Correction | Status |
|---|--------|-----------|--------|
| 6 | Class E (u325) | Image 3 (FAA Chart User's Guide markings/legend chart) should be 1st; fix the text for the other two pics to match. | **Understood** — reorder to: legend chart → Shelby-Cleveland (KEHO) → Floor-1200-abuts-G, keeping the latter two in their current relative order (not stated explicitly, but the only reasonable reading). |
| 7 | Class E2 Surface Areas (u327) | Paulding NW Atlanta (PUJ) → image 1; Monrose Rgnl (MTJ) stays image 2; Bethel (PABE) → image 3. | **Understood** — a straight swap of the current image 1 (Bethel) and image 3 (PUJ); MTJ is unchanged. |
| 8 | Special Use Airspace (u33) | "Missing pic" — add the SUA symbol/legend key (screenshot pasted in the doc, captioned "Looks like this") as image 1, and add text identifying it as image 1. | **Resolved — understood, reuse in place.** No new asset needed. The pasted screenshot is a cropped/low-res grab of an image **already in the repo**: [`images/retakes/airport-airspace-info-2-akts-legend.png`](../images/retakes/airport-airspace-info-2-akts-legend.png), currently live as image 7 of 8 in the u243 Chart Legend lesson (`airport-airspace-info-2-akts-legend-338dda2a.png`). Checked whether it's correctly placed there before reusing it: yes — u243's text explicitly pairs it with image 6 as a set ("Images 6 and 7 of 8, the airspace-information legend panels, show how controlled and special-use airspace lines and shading appear on the chart... Full class rules are taught in the next unit"), i.e. image 6 = controlled-airspace (B/C/D/E) symbol key, image 7 = special-use-airspace symbol key, taught together right before the communication-boxes image. That's the right spot — no relocation needed. Plan: leave u243 exactly as-is, and add the same file as u33 image 1 (shifting u33's current 4 images to 2–5), with a short new intro paragraph identifying it as the special-use-airspace symbol legend. |

## Summary

All 8 items are now actionable. #3 and #8 (the two open questions) are resolved above after tracing
the images back through the Sep 14 retake history: #3's image is a redundant (not literally
duplicate, not mis-sectioned) re-teaching of a concept u243 already covers better, so it and its
lone describing paragraph come out while the rest of the lesson stays; #8's reused legend image is
already correctly placed in u243 and simply gets added a second time as u33 image 1. #5 still carries
one low-risk assumption (the other 7 images in u243 keep their existing relative order when image 5
moves to the front) — flagging it, but not blocking. None of the 8 items are blocked on missing
source assets; everything referenced already exists on disk.

Next step once the open questions are resolved: apply the edits to `faa_107_course.json`
(`images_url` order + `text_content` for u211, u22, u24, u241, u243, u325, u327, u33), then update
this file and [`unit-2-3-image-quality-review.md`](unit-2-3-image-quality-review.md) to reflect the
final state, per `assets/AGENTS.md` § Keeping docs current.
