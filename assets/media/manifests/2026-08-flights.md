# Flight cut list — 2026-08-07 / 2026-08-08

Business / ad candidates from WV mountain flights. Masters and edits are **local only** under [`assets/media/`](../README.md) (gitignored). This manifest is tracked.

| | |
|--|--|
| **Raw** | `assets/media/raw/flights/2026-08-07/`, `…/2026-08-08/` |
| **Snips** | `assets/media/edits/snips/` (1080p H.264) |
| **Stills** | `assets/media/edits/stills/` |
| **Preview** | `assets/media/edits/previews/ad_sample_preview_v1.mp4` (~1:51) |
| **Grading** | DJI SRT gimbal motion + visual pass (Aug 2026) |

## Storage reminder

Primary long-term archive: external SSD `DroneArchive/{personal,business}/` — not iCloud. Personal/family footage never enters this repo. Cold backup later: B2 or Glacier. Site delivery: `media.thedroneedge.com` only for finished uploads.

## P0 snips (exported)

| File | Source | In–out | Motion | Subject | Ad use |
|------|--------|--------|--------|---------|--------|
| `snip_0025_mist_20s.mp4` | `0025` | 0:00–0:20 | B (alt A @ 0:59–1:11) | Mist band on mountain | Hero atmospheric |
| `snip_0006_overlook_21s.mp4` | `0006` | full (~21s) | A | Cliff overlook + deck + people | Hero / scale |
| `snip_0029_gorge_20s.mp4` | `0029` | 0:34–0:54 | A | Gorge + vertical cliffs | Hero after snip |
| `snip_0019_ridge_20s.mp4` | `0019` | 0:19–0:39 | B | Mountain / ridge establish | Hero establish |
| `snip_0030_cliff_20s.mp4` | `0030` | 3:15–3:35 | A | Cliff / forest late window | Hero after snip |
| `snip_0005_valley_9s.mp4` | `0005` | full (~9.5s) | A | Valley river gorge | Cutaway |

**Preview order:** mist → overlook → gorge → ridge → cliff → valley → `ad_sample_preview_v1.mp4`.

## Stills

| File | Grade | Use |
|------|-------|-----|
| `DJI_20260808072406_0021_D.JPG` | A+ | Golden-hour flare — Meta static / end card |
| `DJI_20260808072416_0022_D.JPG` | A | Road + mist — static / article hero |
| `DJI_20260808072546_0023_D.JPG` | A- | Backlit valley — lift shadows |
| `DJI_20260808072605_0024_D.JPG` | A | Mist still — pair with `0025` |

## Other clips (not exported this pass)

| Clip | Day | Dur | Full | Best snip window | Notes |
|------|-----|-----|------|------------------|-------|
| `0007` | 08-07 | ~9s | A | full | Candidate cutaway |
| `0008` | 08-07 | ~78s | D | 6–26s A | Scenic B-roll |
| `0009` | 08-07 | ~16s | B | 0–12s A | Candidate |
| `0010` | 08-07 | ~91s | D | 13–32s A | Through-trees texture |
| `0011` | 08-07 | ~93s | F | 53–73s A | Valley B-roll |
| `0012` | 08-07 | ~112s | D | 80–100s A | Power plant — niche / article only |
| `0013` | 08-07 | ~92s | F | 51–71s A | Usable after trim |
| `0014` | 08-07 | ~37s | A | 0–20s A | Mini-golf — low brand fit |
| `0015` | 08-07 | ~13s | C | — | Probably skip |
| `0016` | 08-07 | ~10s | F | — | **Skip** |
| `0017` | 08-07 | ~67s | C | 8–28s A | Moody ridge |
| `0018` | 08-07 | ~8s | F | — | **Skip** |
| `0020` | 08-08 | ~69s | F | 8–28s B | Usable after trim |
| `0026` | 08-08 | ~19s | F | 0–12s B | Short / trim |
| `0027` | 08-08 | ~19s | B | as-is | Cutaway |
| `0028` | 08-08 | ~16s | B | as-is | Cutaway |

## Grade legend

- **A** — smooth cinematic  
- **B** — usable with light trim  
- **C** — rough / limited  
- **D/F** — jerky overall → snip a window or skip  

## Next steps (not done here)

1. Eyeball `ad_sample_preview_v1.mp4` and P0 snips.  
2. Export 9:16 / 1:1 crops for Meta when ready to spend.  
3. Move masters off iCloud to `DroneArchive/business/` once an external SSD is ready; then delete iCloud copies after verify.  
4. Upload finished ads/course media to S3/CloudFront only — never commit binaries.
