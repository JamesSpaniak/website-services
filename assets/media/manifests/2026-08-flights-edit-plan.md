# Drone footage → ad shot edit plan

**Source:** `assets/videos/` + `assets/pictures/` + `assets/srt/` (Aug 7–8 2026)  
**Generated:** 2026-08-08  
**Target length:** 10–30s primary (Meta); ~60s only for retargeting / site loop / YouTube

## Capability

We can review this library without watching every full 4K file:

1. **SRT telemetry** → motion / jerk grades + best 12–20–30s windows  
2. **Quick Look thumbs** → subject / composition  
3. **Stills** → static ad / thumbnail rating  

Full-clip playback is still needed for a final “eyeball” pass on the shortlisted snips only.

## Length guidance

| Placement | Length | Notes |
|-----------|--------|-------|
| Meta Reels / Feed cold | **12–20s** (up to 30s) | Punchy; one continuous move |
| Meta retarget / story | up to **60s** | OK if story holds |
| Site hero loop | **15–30s** seamless | Loop-friendly snip |
| YouTube pre-roll | **15 / 30 / 60s** | 60s only if retention is strong |

## Motion grades (from gimbal rates)

- **A** — smooth cinematic  
- **B** — usable with light trim  
- **C** — rough / limited  
- **D/F** — jerky overall → snip a window or skip  

Many long clips are **D/F full** but hide **A** windows — snip those; don’t use the whole take.

## P0 — cut these first

| Out name | Source | In–out | Why |
|----------|--------|--------|-----|
| `hero_mist_20s` | `0025` | 0:00–0:20 (alt 0:59–1:11 A) | Mist band; atmosphere |
| `hero_overlook_21s` | `0006` | full | Cliff + people = scale |
| `hero_gorge_20s` | `0029` | 0:34–0:54 | Cliffs; avoid jerky climb |
| `hero_ridge_20s` | `0019` | 0:19–0:39 | Establish + sky for text |
| `hero_cliff_20s` | `0030` | 3:15–3:35 | Best late window in long flight |
| `cutaway_valley_9s` | `0005` | full | Already short + smooth |

## Stills (ad-ready now)

| Still | Grade | Use |
|-------|-------|-----|
| `0021` | A+ | Golden-hour flare — Meta static / end card |
| `0022` | A | Road + mist — static / article hero |
| `0023` | A- | Backlit valley — lift shadows |
| `0024` | A | Mist still — pair with `0025` video |

## Skip

- `0016`, `0018` — F-grade jerk; not worth rescue  
- Full runs of long flights without using the listed windows  

## Lower priority / off-brand for education ads

- `0012` power plant — article / industrial niche only  
- `0014` mini-golf — smooth but weak Drone Edge fit  

## 15s ad template

1. **0–3s** establish (`0019` or `0025`)  
2. **3–10s** scale or gorge (`0006` or `0029`)  
3. **10–15s** end card still `0021` + CTA  

Export **9:16** and **1:1** crops from 4K landscape; keep 16:9 masters.

## Files in this folder

- `thumbs/` — Quick Look contact frames  
- `motion_report.json` — per-clip telemetry scores + windows  
- `edit_plan.json` — compact machine-readable plan  

## Repo working set

Copied to `~/personal/website-services/assets/media/` (gitignored raw/edits; tracked manifests). See `assets/media/manifests/2026-08-flights.md`.
