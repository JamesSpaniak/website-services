# Unit 2–3 image quality review (Sep 14 2026)

Author reported blurry text on unit 2/3 figures. Root cause: many source PNGs are small
(16 under 500 px long edge) and get upscaled 2–4× to the content column; the worst carry
dense chart-legend text. One (`Special Use Airspace.png`) is also cropped mid-text at its
right edge.

**Mapping of record: [`unit-2-3-image-quality-review.csv`](unit-2-3-image-quality-review.csv)** —
one row per live image: file → unit id/title → dimensions → verdict → current CloudFront URL →
position (`order`) in the unit's `images_url`. Fill `replacement_file` as Drive copies arrive.

## Verdicts (61 images)

| Verdict | Count | Meaning |
|---------|-------|---------|
| `replace_p1` | 16 | Blurry now — small source + dense text (u243 ×6, u33 ×2, plus one each in u38/u244/u325/u331/u335/u345/u347/u348). |
| `replace_p2` | 15 | Soft but readable (500–700 px range) — replace opportunistically. |
| `added_for_comparison` | 3 | Sep 14 2026: both received replacements uploaded and **added alongside** the originals (not swapped) so the author can compare live — new u22 image 3 (`navigation-latitude-and-longitude-3-of-8-44f61689.png`, old figure now image 4) and new u211 image 3 (`aircraft-by-numbers-1of-1-da658d3d.png`, originals kept as images 1–2). After the author picks a winner, remove the losers from `images_url` and republish. |
| `keep` | 27 | ≥1000 px or simple graphics that read fine (all Class B/C/D/E sectional excerpts are in this group). |

## Retake plan — no Drive exports available (Sep 14 2026)

The author has no higher-quality versions for now, so the CSV now carries `retake_source` /
`retake_note` columns: how each blurry figure can be **regenerated from public FAA sources**
instead of waiting on Drive.

| `retake_source` | Count | How |
|-----------------|-------|-----|
| `faa-geotiff` | 18 | Crop from FAA VFR raster charts (free ~300 DPI GeoTIFFs) — same pipeline as [`docs/tech/sectional-chart-experience-plan.md`](../../../../docs/tech/sectional-chart-experience-plan.md). Crops come out crisp at native resolution (~42 m/px); callouts (circles/boxes) re-added in code. |
| `faa-pdf` | 10 | Render from FAA PDFs at 300 DPI: Chart Users' Guide (legend panels, communication boxes), Airman Knowledge Testing Supplement FAA-CT-8080-2H (special-use table, quiz figures), digital Chart Supplement (example page). Vector sources → pixel-perfect. Also fixes the cut-off text on `Special Use Airspace.png`. |
| `author-original` | 3 | Cannot be regenerated from FAA sources: the lat/long globe graphic, the Points A–D practice grid, and the Testing Supplement book photo. Need the original slides (or redraw). |

**Done Sep 14 2026 — first three retakes** (from the on-disk Jacksonville SEC, via
[`scripts/sectional_crop.py`](../../../../scripts/sectional_crop.py); originals in
[`retakes/`](retakes/), appended alongside the old figures for live comparison):

- u335 Alert Area → A-293 west of Daytona Beach, label circled (matches lesson text).
- u333 Warning Area → W-137E/W-138E offshore St. Augustine, labels circled (old figure was Seattle-chart W-570).
- u348 ADIZ → CONTIGUOUS U.S. ADIZ dotted line, label boxed, coast context.

**Done Sep 14 2026 (evening) — 13 more retakes, all remaining `faa-pdf` rows plus the DFW/Miami
GeoTIFF rows** (files in [`retakes/`](retakes/), `replacement_file` filled in the CSV):

- u243 ×7: five AKTS-legend panels (airport data block/text, airspace info ×2, communication
  boxes, rendered at 300 DPI from FAA-CT-8080-2H Appendix 1) and two DFW SEC crops with red
  callouts (DFW Intl and Ralph M Hall/Rockwall Muni airport data blocks).
- u231: Coeur d'Alene (COE) entry from the digital Chart Supplement NW (p48, 300 DPI).
- u22: Key West quiz figure re-cropped from the Miami SEC GeoTIFF with the 25°N/82°W graticule
  labels — same framing as the old figure at ~3× resolution.
- u325: Class E airspace markings section from Chart Users' Guide p27 (300 DPI).
- u33: full SUA tabulation (P/R/W/A + MOA tables) from the DFW SEC chart margin — fixes the
  old cut-off text.
- u244: Fort Worth group obstacle + stadium symbols circled on the DFW SEC.
- u24 (and candidate for u345): STADIUM VFR checkpoint flag circled near Dallas Love on the
  DFW SEC.

**Done Sep 14 2026 (night) — final 11 `faa-geotiff` retakes.** The author downloaded the
remaining charts into `assets/courses/faa-107/reference/sectionals/` (Las Vegas, Atlanta,
Charlotte, Seattle, Washington, Baltimore-Washington TAC, New York SEC + TAC, Salt Lake City;
ZIPs kept as reference, TIFs extracted — all gitignored). Each retake was framed against a
download of the old live figure:

- u331 Restricted → R-4806W label circled on the Las Vegas SEC (Creech AFB / Indian Springs context).
- u327 PUJ Class E → Paulding NW Atlanta (PUJ) dashed-magenta Class E on the Atlanta SEC (no callout, matching old figure).
- u334 Gamecock MOA → composite: Charlotte SEC collar MOA table (Gamecock I row boxed) above the chart crop.
- u332 Prohibited → P-47 (Pantex, Amarillo) boxed on the Dallas-Ft Worth SEC — same area as the old figure.
- u343 TFR → P-40/R-4009 Camp David with the flight-restriction caution box circled on the Washington SEC (the old "TFR Ex Washington DC" figure showed this same area).
- u33 Ex1 → WARNING W-237A label boxed offshore the Olympic coast (Seattle SEC).
- u33 Ex2 → Coupeville NOLF / R-6701 boxed, Whidbey Island (Seattle SEC).
- u33 Seattle table → full "Special Use Airspace on Seattle Sectional Chart" tabulation from the Seattle SEC collar.
- u346 TRSA → Wilkes-Barre TRSA label circled on the New York SEC (same as old figure).
- u345 VFR Routes → Hudson River corridor boxed over Manhattan on the New York TAC (same as old figure).
- u347 NSA → Idaho National Lab NSA notice circled on the Salt Lake City SEC (same as old figure).

**Uploaded + swapped Sep 14 2026 (late).** All 24 pending retakes (25 figure slots — the DFW
STADIUM checkpoint serves both u24 and u345) were uploaded to S3 via
`scripts/course_images.py upload --csv images/retakes_mapping.csv --execute` and their
CloudFront URLs **swapped in place** of the old blurry URLs in
`assets/courses/faa-107/faa_107_course.json` (same `order` positions; new URLs verified 200).
The old URLs stay in the CSV's `current_url` column and remain valid on S3/CloudFront for
rollback. The first 3 Jacksonville retakes (u333/u335/u348) stay **appended alongside** their
originals for the live comparison already in progress.

**Remaining until live:** republish the JSON through the admin course editor (PUT /courses/35).

Still open: 3 `author-original` rows (globe, Points A–D grid, Testing Supplement book photo) —
need original slides or a redraw.

Caveats: FAA sources give **current-edition** charts, so retaken crops differ slightly from
the old screenshots (edition changes) — verify each crop against lesson text before removing
the old figure. Retakes of examples that came from other charts (like W-570) either replicate
the Jacksonville equivalent (done above — update lesson text if it names the old area) or need
the original chart downloaded.

### Source catalog for the remaining retakes

Primary sources (all public domain, no licensing concerns):

| Source | URL | Covers |
|--------|-----|--------|
| FAA VFR raster charts (GeoTIFF, ~300 DPI, 56-day editions) | [aeronav digital VFR charts](https://www.faa.gov/air_traffic/flight_info/aeronav/digital_products/vfr/) | All 18 `faa-geotiff` rows. All needed charts now on disk under `assets/courses/faa-107/reference/sectionals/`: Jacksonville, Dallas–Ft Worth, Miami, Las Vegas, Atlanta, Charlotte, Seattle, Washington, Baltimore-Washington TAC, New York SEC + TAC, Salt Lake City (ZIP originals kept alongside extracted TIFs; all gitignored) |
| FAA Chart Users' Guide (PDF) | [aeronav chart users' guide](https://www.faa.gov/air_traffic/flight_info/aeronav/digital_products/aero_guide/) | Legend panels: airport data blocks, airspace markings, communication boxes |
| Airman Knowledge Testing Supplement FAA-CT-8080-2H (PDF) | [testing supplements](https://www.faa.gov/training_testing/testing/supplements) | Quiz Figure 1, special-use airspace legend table (also printed on the Jacksonville chart margin — see u335 row note) |
| Digital Chart Supplement (d-CS, PDF) | [aeronav d-CS](https://www.faa.gov/air_traffic/flight_info/aeronav/digital_products/dafd/) | `Ex chart supplement.png` example page |
| VFR flyway planning charts | bundled with TAC downloads (reverse side) | `VFR Routes.png` |

Alternate sources (fallbacks / different format):

| Alternative | When useful |
|-------------|-------------|
| [SkyVector](https://skyvector.com/) / [VFRMap](https://vfrmap.com/) / iFlightPlanner | Browser view of current FAA charts — fast for locating an example area before downloading the GeoTIFF; screenshots are resolution-capped by the screen, so prefer GeoTIFF crops for shipping figures |
| [FAA AIS Open Data (ArcGIS)](https://adds-faa.opendata.arcgis.com/) | Vector airspace boundaries (class airspace, SUA) as GeoJSON/shapefile — for drawing custom overlays or the Phase 2 interactive viewer, not for chart-look figures |
| [tfr.faa.gov](https://tfr.faa.gov/) | Official TFR graphics — alternative for the TFR example if a chart crop of the DC SFRA isn't preferred |
| NASA Blue Marble / [Natural Earth](https://www.naturalearthdata.com/) | Public-domain globe/graticule base if we redraw the `author-original` lat/long globe instead of waiting for slides |

## Text alignment pass (Sep 14 2026)

All 9 image-bearing unit-2 leaves (u211, u22, u231, u24, u241, u242, u243, u244, u245) now
reference their figures by number in `text_content` ("Image N of M") and name what each red
callout marks. Two fixes came out of that review:

- **u244 obstacles figure re-annotated + re-uploaded** (`…-80508988.png`): the first retake
  circled `1198 bldgs` + the STADIUM checkpoint flag, but the lesson text described the
  `1216 (565)` example — circles now sit on `1198 bldgs`, the `1743 (1113)` tower, and
  `1216 (565)`, and the stadium-flag circle was removed (the flag is u24's subject, where the
  text now explains it).
- **u24 checkpoint figure**: the red circle (STADIUM pennant south of Dallas Love Field) is now
  explained in the leaf's own `text_content` — previously the flag explanation only existed in u243.

Known dupes awaiting the author's live comparison (image numbering will shift when losers are
removed): u211 image 3 duplicates images 1–2 (minus the 5,500-aircraft tile); u22 images 6 and 7
are identical twins ("sample L & L 1/2 no map"); u22 images 3 and 4 teach the same Sacramento
lesson in two styles.

### Unit 3 pass (same day)

All 22 image-bearing unit-3 leaves (u31, u322, u323, u324, u3242, u325, u327, u328, u38, u33,
u331, u332, u333, u334, u335, u342, u343, u344, u345, u346, u347, u348 — 38 images) got the same
treatment: "Image N of M" numbering plus an explanation of every red box/ellipse. Notable fixes:

- **Previously unexplained overlays now described in text**: u328 image 3 (two large red boxes =
  Class E4 extensions at Corpus Christi), u33 images 3–4 (R-6701/A-680 box, W-237A box),
  u333 both images (W-570A/B and W-137E/W-138E ellipses), u334 (GAMECOCK I table-row box),
  u342 (boxed VR1667/1617/1636/1668 and VR1005/VR1001 route numbers — the old text only cited
  generic examples like VR1007), u343 (P-40/R-4009 CAUTION-box ellipse), u345 (STADIUM checkpoint
  ellipse + Hudson corridor box), u346 (WILKES-BARRE TRSA label), u347 (NSA NOTICE ellipse),
  u348 (Contiguous U.S. ADIZ label boxes), u325 image 2 (red box on the blue-vignette edge near
  Millarton — box is clipped at the chart edge; candidate for a cleaner retake if the author wants).
- **Image order fixed in text**: u323 listed Toledo before Anchorage and u327 listed Paulding
  before Bethel/Montrose; both texts now follow the actual `images_url` order.
- Slide-style figures with their own text panels (u322, u324, u325 img 1–2, u327 img 1–2, u328
  img 1–2, u335 img 1, u344, u38) already carried on-image explanations; the JSON text now
  mirrors them so the explanation survives outside the image.
- Red numbered discs on old slide photos (u323 img 2, u328 img 2, u342 left panel) are AKTS
  figure area markers — now identified as such in text so they aren't mistaken for chart symbols.

## Swap procedure (per replacement)

1. Drop the Drive export next to the original; put its name in `replacement_file` in the CSV.
2. Upload via `scripts/course_images.py upload` (content hash → new URL; old URL stays valid until the JSON is republished).
3. Replace `current_url` with the new URL at the same `order` position in that unit's `images_url` in `assets/courses/faa-107/faa_107_course.json` (swap in place — do **not** append).
4. Republish the course JSON through the admin editor.

Export guidance for the author (from [`workflows/tech/course-images.md`](../../../../workflows/tech/course-images.md)):
≥1000 px long edge for anything with chart text; PNG; re-export from the source slides at
full size rather than re-screenshotting thumbnails.
