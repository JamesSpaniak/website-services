# Sectional chart experience — plan

Status: **planning** (Aug 15 2026). How we use full FAA sectional charts (starting with Jacksonville) in the Part 107 course: preselected static figures now, an interactive pan/zoom chart viewer later.

Related: [`workflows/tech/course-images.md`](../../workflows/tech/course-images.md) (crop upload pipeline) · [`course-content-restructure-plan.md`](course-content-restructure-plan.md) (image insertion step) · [`frontend-data.md`](frontend-data.md) (`CourseImageStrip`).

## What we have

`assets/courses/faa-107/reference/sectionals/jacksonville/` (extracted from the author-supplied zip, Aug 15 2026; chart dated Jun 16 2026; gitignored) containing:

| File | What it is |
|------|------------|
| `Jacksonville SEC.tif` | **GeoTIFF raster** of the Jacksonville Sectional — 16,617 × 12,412 px, 300 dpi, 8-bit color (~55 MB) |
| `Jacksonville SEC.tfw` | World file — affine transform mapping pixel coordinates ↔ latitude/longitude |
| `Jacksonville SEC.htm` | FAA metadata page |

This is the FAA's official digital sectional product from [aeronav.faa.gov](https://aeronav.faa.gov/) (VFR raster chart series). Public domain — no licensing constraints on hosting, cropping, or embedding.

## Source data landscape — raster vs vector

**The sectional chart itself is raster-only.** The FAA's digital-Visual Chart series is explicitly "georeferenced raster images"; there is no vector edition of the sectional with its terrain shading, symbology, and label placement. New editions ship on a **56-day cycle** (current: Jul 09 2026, next: Sep 03 2026) at [faa.gov → VFR raster charts](https://www.faa.gov/air_traffic/flight_info/aeronav/digital_products/vfr/); every sectional and TAC is a free zip like the one we have.

**"Vector" is a real thing — but it's a different product.** What likely prompted the "vector" description:

| Vector source | What it contains | Where |
|---------------|------------------|-------|
| FAA AIS Open Data hub | ~73 datasets: **Class B/C/D/E airspace boundaries**, airports, runways, navaids, obstacles, frequencies — as shapefile, GeoJSON, KML, and hosted ArcGIS FeatureServers | [ais-faa.opendata.arcgis.com](https://ais-faa.opendata.arcgis.com/) |
| FAA NASR 28-day subscription | Same class-airspace shapefiles + aeronautical CSVs, refreshed every 28 days | faa.gov NASR subscription |
| FAA hosted VFR chart **tile services** | The raster sectionals pre-tiled and served as a public web map service (usable directly in Leaflet/MapLibre) | Same Open Data hub |

Implications:

- A pure-vector map (MapLibre + airspace GeoJSON over a base map) is buildable but **won't look like a sectional** — and the exam shows real sectional excerpts, so it can't replace the raster for teaching or questions.
- Vector airspace boundaries are valuable **as an overlay** on the raster viewer later (e.g., highlight/outline the Class C shelf being discussed, toggle layers). Because our GeoTIFF is georeferenced, raster and vector share the same coordinate space — overlaying is straightforward.
- The FAA's own tile service means a prototype interactive viewer can exist **without us building any tiles** (caveats below).

## Product decision (two phases)

### Phase 1 — preselected static figures in the course (now)

Author picks a few teaching areas on the Jacksonville sectional; we generate high-quality PNG crops at native 300 dpi and attach them to units via the existing `images_url` pipeline. No frontend work, ships immediately.

Why static-first for learning UX:

- **The FAA knowledge test is static.** Exam questions reference fixed figures from the Airman Knowledge Testing Supplement — no panning or zooming. Practicing on fixed excerpts is the most faithful rehearsal; an interactive map inside a *question* would train an interaction the exam doesn't allow.
- Crops render in the existing `CourseImageStrip` (contain-fit, ≤70vh) like every other figure — consistent, fast, printable.
- Crops are reproducible: with the world file we can define each crop by **lat/long bounds**, so regenerating against a new chart edition is a script re-run, not manual re-screenshotting.

### Phase 2 — interactive chart viewer, separate from the course flow (later)

A dedicated page (e.g. `/tools/sectional`) with Google-Maps-style pan/zoom of the full chart. Deliberately **outside** the lesson flow:

- Keeps lessons focused; exploration is opt-in ("Open this area in the chart viewer →" link under a figure).
- Course units can deep-link with preset center/zoom via query params (`/tools/sectional?lat=30.49&lng=-81.69&z=11`), so "selections" in the course and the interactive tool stay connected.
- Real-world value: scrolling a live sectional builds the fluency pilots actually use (SkyVector-style), a nice differentiator vs competitors' static PDFs.

**Not viable:** a single whole-chart PNG "the user can zoom." The browser must decode the full bitmap — 16,617 × 12,412 ≈ 800 MB of decode memory. Desktop stutters, mobile tabs crash. Any full-chart experience must be tiled; "image composition" only works as regional crops.

## Translating between representations

One-directional and cheap — this is why we keep the GeoTIFF as the **source of record**:

```text
GeoTIFF master (per edition)
 ├─→ static crops (gdal_translate -projwin, by lat/long)   → Phase 1 figures
 ├─→ tile pyramid (gdal2tiles → EPSG:3857 z/x/y tiles)     → Phase 2 viewer
 └─→ (optional) vector airspace GeoJSON overlays            → Phase 2 enhancement
```

There is no reverse path (crops can't reassemble a chart), so: never discard the TIFF; regenerate derived assets rather than hand-editing them.

## Technical design

### Crop pipeline (Phase 1)

1. Author supplies areas of interest (place name + rough bounds or "the Class C around JAX").
2. Commit a small manifest, e.g. `assets/courses/jacksonville-crops.csv`: `name, unit_id, min_lat, min_lng, max_lat, max_lng, note`.
3. Script (`scripts/sectional_crops.py`, to be written) reads the world file, converts bounds → pixel windows, runs `gdal_translate`/PIL, writes PNGs to a folder.
4. PNGs flow through the **existing** image workflow: `course_images.py map` → review → `upload --execute` → `merge`. No new infra.

Crop sizing: target 1,200–2,000 px on the long edge (native 300 dpi detail, well above the ≥1,000 px readability guideline; ~0.5–1.5 MB each).

### Interactive viewer (Phase 2)

| Piece | Choice | Rationale |
|-------|--------|-----------|
| Tiles | `gdal2tiles.py` (EPSG:3857) → S3 `courses/maps/jacksonville-sec-<edition>/{z}/{x}/{y}.png` behind CloudFront | Real geographic coordinates (deep links by lat/long; vector overlays possible). Est. 40–90 MB per chart, a few thousand small files. |
| Renderer | Leaflet (or MapLibre GL) raster tile layer, `maxNativeZoom` at the 300 dpi ceiling | Battle-tested pan/zoom UX, tiny client bundle, loads only visible tiles. OpenSeadragon is the simpler non-geo alternative, but we'd lose lat/long deep links and overlay ability — geo-tiling is worth it. |
| Page | New Next.js route `drone/src/app/tools/sectional/page.tsx`, client component, lazy-loaded | Isolated from course bundle; opens in a new tab from course links. |
| Prototype shortcut | FAA's hosted VFR chart tile service on the Open Data hub | Zero build; but no edition pinning, government-service reliability, and their tiles update under us — self-host for production. |

### Overlays & annotations (assessed Aug 15 2026)

**Airports overlay (Phase 2) — easy (~hours).** FAA AIS Open Data publishes an Airports point dataset (identifier, name, elevation, frequencies) as GeoJSON. Filter to the chart's bounding box (well under 1 MB), host on the media bucket, render with `L.geoJSON` — markers with info popups, identifier search, and deep-link highlighting (`?apt=CRG`). Add a zoom threshold/clustering to avoid clutter at low zooms (the raster already prints airports; the overlay adds interactivity). Same recipe extends to Class B/C/D/E airspace polygons from the same hub.

**Lat/long lines & markings — both phases, styleable per line type:**

- *Viewer (Phase 2):* Leaflet polylines support color/weight/`dashArray` — a 30′ graticule mimicking sectional ticks, latitude vs longitude styled differently, tooltip labels. Plus live cursor coordinate readout and click-to-drop lat/long markers (interactive version of the "numbers increase going north/west" lesson).
- *Static crops (Phase 1):* annotations are drawn **programmatically** at exact coordinates — the world file converts lat/long → pixel, PIL draws solid/dashed/arrowed lines, ticks, and labeled callout boxes defined in the crop manifest. Replaces hand-drawn screenshot markup (Sacramento-figure style) with consistent, regenerable annotations across editions.

### Embedding in the course

- Phase 1: crops are ordinary `images_url` entries — nothing new.
- Phase 2: figure captions / unit text link out to the viewer with preset coordinates. Optionally later, an inline "mini viewer" embed on select units — only if the standalone page proves valuable.

## Data saving & storage

**No backend or DB changes in either phase.**

| Concern | Answer |
|---------|--------|
| Course data | Crops are `images_url` strings in the course payload (existing pattern). Viewer links are plain URLs in unit text. |
| User state | None required. Viewer position/zoom lives in **URL query params** (shareable, bookmarkable). LocalStorage "resume where I left off" is a possible later nicety — explicitly not needed now. |
| Source files in git | Do **not** commit the 55 MB TIF. `.gitignore` covers `assets/courses/**/*.{zip,tif,tfw}` — extracted GeoTIFFs live in `assets/courses/faa-107/reference/` locally. Archive sources to S3 (e.g. `s3://droneedge-dev-media/sources/charts/`) so they survive laptop loss; re-downloadable from FAA regardless. |
| Manifests | The crop manifest CSV and mapping CSV **are** committed — they're the reproducibility record. |
| Chart currency | Sectionals revise every 56 days. For training, pin an edition and record its date in the manifest and S3 prefix. Refresh only when a depicted area materially changes (rarely matters for teaching concepts); refresh = re-download zip, re-run crop script, re-upload (idempotent hashing gives new URLs). |
| Serving cost | Static files on existing S3 + CloudFront; pennies/month at current traffic. Tiles cache aggressively (immutable per edition). |

## Open questions (author input)

1. Which Jacksonville areas for Phase 1 crops? Natural candidates: JAX Class C shelf rings, Craig (CRG) Class D, St. Augustine, a Class E surface area, nearby restricted areas (R-2903 etc.), a MEF quadrant, an obstacle cluster.
2. How many crops per unit, and which units beyond u2 (chart reading) — e.g. reuse for u3 airspace classes?
3. Should any crops double as quiz figures (mirroring testing-supplement style)?
4. Phase 2 timing: after remaining course images (Ch. 4/7/9) and video recordings, or earlier as a marketing differentiator?

## Phasing summary

| Phase | Scope | Effort | New infra |
|-------|-------|--------|-----------|
| 1 | Crop manifest + script, generate PNGs, existing map→review→upload→merge flow, republish JSON | Small (script ~100 lines; rest is existing pipeline) | None |
| 2 | Tile build, S3 tile hosting, `/tools/sectional` Leaflet page, deep links from course | Medium (1–2 days) | S3 prefix + one frontend route |
| 2+ | Vector airspace overlays (FAA AIS GeoJSON), layer toggles, mini-embed in units | Later, optional | None beyond Phase 2 |
