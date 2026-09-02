# Marketing flight media (local)

Working set for **business / ad / course-candidate** drone footage. Masters and edits are **gitignored** — only this README and [`manifests/`](manifests/) are committed.

```
assets/media/
├── README.md                 # this file (tracked)
├── manifests/                # cut lists, ratings (tracked; no binaries)
├── raw/flights/YYYY-MM-DD/   # 4K masters + SRT (gitignored)
└── edits/
    ├── snips/                # per-shot exports (gitignored)
    ├── stills/               # still copies for ads (gitignored)
    └── previews/             # combined sample previews (gitignored)
```

## What belongs here

- Business / marketing / education-ad candidates only.
- **Not** personal or family flights — those stay on the external archive under `DroneArchive/personal/`.

## Storage model (hybrid)

| Layer | Location | Role |
|-------|----------|------|
| Primary archive | External SSD `DroneArchive/{personal,business}/` | Long-term masters (not iCloud) |
| Working set | This folder (`raw/` + `edits/`) | Edit next to the repo |
| Cold backup (later) | Backblaze B2 or S3 Glacier Instant Retrieval | Offsite |
| Site delivery | `media.thedroneedge.com` / `droneedge-dev-media` | Finished product uploads only |

Do **not** use iCloud Obsidian for 4K masters, Git LFS for bulk video, or `droneedge-dev-raw-video` as a library (7-day lifecycle).

Course lesson source destined for the MediaConvert pipeline goes under the course folder (e.g. [`assets/courses/faa-107/videos/`](../courses/faa-107/)), not here.

## Manifests

Tracked cut lists live in [`manifests/`](manifests/). After new flights, update the manifest in the same session as the snips.
