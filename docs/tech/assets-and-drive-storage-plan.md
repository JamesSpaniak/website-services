# Assets + Google Drive storage plan

Drive: rclone remote `gdrive:` (`root_folder_id` `1-H-Hk6XO0BeV5WI6uBqdnQT7Te1FcRyG`) — [Drone Edge shared folder](https://drive.google.com/drive/folders/1-H-Hk6XO0BeV5WI6uBqdnQT7Te1FcRyG).

Related: [`assets/README.md`](../../assets/README.md) · [`assets/media/README.md`](../../assets/media/README.md) · [`docs/marketing/brand-assets.md`](../marketing/brand-assets.md) · [`workflows/tech/content-build.md`](../../workflows/tech/content-build.md) · pre-move listing [`assets-drive-pre-migration-listing-2026-09-17.txt`](assets-drive-pre-migration-listing-2026-09-17.txt)

## Status

**Steps 0–4 complete** (updated Sep 20 2026). **Drive matches the canonical tree and the first pull into `assets/` is done and verified.** What remains is **step 5** (prod: S3 upload + publish) and **step 6** (local folder rename), plus six manual items (M1–M6) listed in *Manual steps still required*.

**Sep 19 verification.** `rclone ls gdrive:` re-run and diffed against the step-0 listing: **identical**, 221 file paths, only the header/trailer comments differ. Drive has not drifted since Sep 17, so the snapshot is a valid rollback point. Also confirmed: **0 shortcuts**, 14 native Google Docs (the `-1` sizes), and the same **2 duplicate objects** step 0 skipped.

**Steps 1–3 no longer need the Drive UI.** `rclone backend features gdrive:` reports `Move: true`, `DirMove: true` — rclone performs these **server-side**, so the moves are scriptable, dry-runnable and download nothing. See *Steps 1–3 with rclone* below.

| Item | State |
|------|--------|
| rclone remote `gdrive:` (OAuth + `root_folder_id`) | Done |
| Plan + merge map in this file | Done |
| Step 0 — local zip of current Drive | **Done + verified Sep 19** — `.snapshots/2026-09-17-pre-migration-gdrive.zip` (2.9 GB, gitignored); unpacked copy beside it. Drive re-listed Sep 19: unchanged |
| Steps 1–3 — rearrange Drive to canonical tree | **Done Sep 19 2026** — all server-side (`DirMove`), 0 bytes transferred. Verified lossless: all 221 step-0 paths found at their mapped destinations, total size unchanged at 2.808 GiB. See *Steps 1–3 — execution log* |
| Step 4 — rclone copy into `assets/` | **Done Sep 20 2026** — see *Step 4 — execution log* |
| Step 5 — upload new lesson videos + JSON | **Not started — manual (prod)** |
| Step 6 — local `assets/marketing/` rename | **Not started** — ~30 files reference the old paths; scoped but not run |

Rollback: unzip `.snapshots/2026-09-17-pre-migration-gdrive.zip` or copy that folder back to Drive. Tracked local files remain in git; do not zip all of `assets/` (~17 GB).

## Goal

One folder tree on **Google Drive** and in git **`assets/`**, with different jobs:

- **Git** — product source of truth: course JSON, questions, outlines (docx/md/txt), mapping CSVs, article drafts, brand files we actually use.
- **Drive** — author intake + large binaries: PPTX, lesson mp4, GeoTIFF, raw DJI, Google Docs.
- **S3/CloudFront** — only what the site plays.
- **External SSD** — 4K masters if Drive gets too big.

Same relative paths (`courses/faa-107/videos/…`). `rclone copy` one way, never `sync` the Drive root. Do not put course JSON on Drive. Company `docs/` and `workflows/` stay in git.

Canonical tree:

```
courses/
  faa-107/{outlines,questions,images,videos,reference}
  photo-video/
  drone-building/          # STEM on Drive is empty; local name wins
marketing/
  brand/                   # today's visuals/
  articles/                # today's articles/
  footage/                 # today's media/
  documents/               # contracts, punch lists, logins — not git
images/
  inbox/                   # unassigned drops only; then move into a course or marketing
```

## Steps

Execute in order. Steps 1–3 are **server-side rclone moves** (no download, no UI). Step 4 is the first pull into the repo.

| # | Action | Status |
|---|--------|--------|
| **0** | Snapshot current Drive to a local zip before any moves | **Done** 2026-09-17 |
| **1** | Create empty Drive folders: `courses/`, `marketing/`, `images/inbox` | **Done** 2026-09-19 |
| **2** | Move Drive roots into those folders (see merge map) | **Done** 2026-09-19 |
| **3** | Split `FAA 107 Course/Course Materials` + `Course Videos` into `outlines/`, `questions/`, `images/`, `videos/`, `reference/`; nest as `courses/faa-107` | **Done** 2026-09-19 |
| **4** | `rclone copy --dry-run`, then copy videos / images / outlines / new DJI footage into local `assets/` | **Done** 2026-09-20 — verified with `rclone check --one-way`, 0 differences |
| **5** | Upload new lesson videos (`upload-faa-107-videos.sh`) and set `video_url` in `faa_107_course.json`; publish via admin UI. Start with `#1 VLOS 8-13 good.mp4`, then sections 2–5 | Not started |
| **6** | Later: `assets/courses/photo-video/`; rename local `visuals` / `articles` / `media` → `assets/marketing/…`; drop or archive `assets/archive/` | Not started |

### Step 0 (done) — recreate if needed

```bash
mkdir -p .snapshots/2026-09-17-pre-migration-gdrive
rclone ls gdrive: > docs/tech/assets-drive-pre-migration-listing-2026-09-17.txt
rclone copy gdrive: .snapshots/2026-09-17-pre-migration-gdrive \
  --drive-export-formats docx,xlsx,pptx,pdf -P
ditto -c -k --keepParent .snapshots/2026-09-17-pre-migration-gdrive \
  .snapshots/2026-09-17-pre-migration-gdrive.zip
```

rclone skipped two duplicate Drive objects: Photo & Video `Outline for Photo and video class.docx` and `Introduction to Lighting v2.pptx`.

### Steps 1–3 with rclone (server-side) — **executed Sep 19 2026**

`DirMove` is supported, so every move below is a Drive-side parent change: nothing downloads and
the 2.8 GiB never crosses the wire. **Run each block with `--dry-run` first.**

**Prerequisite — resolve the 2 duplicates.** Same two step 0 skipped. Interactive, because one is
an outline and one a deck; pick by eye rather than `--dedupe-mode newest`:

```bash
rclone dedupe gdrive:"Photo & Video Course" --dedupe-mode interactive
#   Photo & Video Course/notes for powerpoint development/Outline for Photo and video class.docx
#   Photo & Video Course/powerpoints photo and video/Introduction to Lighting v2.pptx
```

**Step 1 — create the shells**

```bash
rclone mkdir gdrive:courses
rclone mkdir gdrive:marketing
rclone mkdir gdrive:images/inbox
```

**Step 2 — top-level moves** (add `--dry-run` first; `moveto` handles directories)

```bash
rclone moveto gdrive:"FAA 107 Course"                   gdrive:"courses/faa-107"
rclone moveto gdrive:"Photo & Video Course"             gdrive:"courses/photo-video"
rclone moveto gdrive:"STEM Course"                      gdrive:"courses/drone-building"
rclone moveto gdrive:"Drone Edge Assets"                gdrive:"marketing/brand"
rclone moveto gdrive:"Media Content not for course"     gdrive:"marketing/footage/raw/flights"
rclone moveto gdrive:"Documents"                        gdrive:"marketing/documents"
rclone moveto gdrive:"Notes for Drone Edge To fix.docx" gdrive:"marketing/documents/Notes for Drone Edge To fix.docx"
rclone moveto gdrive:"james to fix.docx"                gdrive:"marketing/documents/james to fix.docx"
```

**Step 3 — split `courses/faa-107`.** Run after step 2. Note the folder name
`Outlines／Powerpoints` contains a **fullwidth solidus (U+FF0F)**, not a path separator — quote it.

```bash
CM='gdrive:courses/faa-107/Course Materials'

rclone moveto "$CM/Outlines／Powerpoints"            gdrive:"courses/faa-107/outlines"
rclone moveto gdrive:"courses/faa-107/Course Videos" gdrive:"courses/faa-107/videos"

for pack in "ADM" "Pictures for Airports" "airport operations pics" "weather"; do
  rclone moveto "$CM/$pack" "gdrive:courses/faa-107/images/$pack"
done

# 9 files -> questions/
rclone move "$CM" gdrive:"courses/faa-107/questions" --files-from - <<'EOF'
Compiled Question Bank Sorted.xlsx
Copy of Compiled questions Part 107.xlsx
compiled question totals.xlsx
Directions for test bank.docx
Copy of MC Questions for Part 107 KEY - regulations Power Point.docx
Copy of MC questions for Part 107 regulations Power Point.docx
Copy of part 107 regulations quiz -Key.docx
Copy of part 107 regulations quiz.docx
Activity Descriptions for website.docx
EOF

# 4 files -> reference/
rclone move "$CM" gdrive:"courses/faa-107/reference" --files-from - <<'EOF'
Additional Airspace Maps -Key.docx
Additional Airspace Maps.docx
Copy of extra maps longitude and Latitude- Key.docx
Copy of extra maps longitude and Latitude.docx
EOF

rclone rmdir "$CM"   # should now be empty
```

All 13 loose files in `Course Materials` are accounted for above (9 + 4). One judgement call:
**`Activity Descriptions for website.docx` → `questions/`** per the step-3 mapping's
"quiz/activity/test-bank docx" line, though the name reads like website copy — move it to
`reference/` instead if that is what it turns out to be.

**Verify after** — the tree should match the canonical layout and the object count must not change:

```bash
rclone lsd gdrive: && rclone lsd gdrive:courses && rclone lsd gdrive:courses/faa-107
rclone size gdrive:        # expect 221 objects / 2.808 GiB, unchanged
rclone ls   gdrive: | sed 's/^ *[0-9-]* //' | sort > /tmp/after.txt
```

If anything is wrong, the rollback is § Status — unzip the snapshot and restore.

### Steps 1–3 — execution log (Sep 19 2026)

Every move reported `Server side directory move succeeded` / `Moved (server-side)`; **0 bytes
transferred**. Resulting tree:

```
courses/faa-107/{outlines,questions,images,reference,videos}
courses/photo-video/   courses/drone-building/   (drone-building empty, as expected)
marketing/{brand,documents,footage/raw/flights}
images/inbox/
```

| Destination | Files | Size | Matches pre-move |
|---|---:|---|---|
| `courses/faa-107` | 172 | 851.8 MiB | yes |
| ↳ `videos` | 38 | 692.198 MiB | — |
| ↳ `images` | 100 | 35.072 MiB | — |
| ↳ `outlines` | 20 | 98.439 MiB | — |
| ↳ `questions` | 9 | 230.498 KiB | — |
| ↳ `reference` | 4 | 25.887 MiB | — |
| `courses/photo-video` | 23 | 30.716 MiB | yes |
| `marketing/brand` | 30 | 930.365 MiB | yes |
| `marketing/footage/raw/flights` | 9 | 1.184 GiB | yes |
| `marketing/documents` | 4 | 803.5 KiB | +3 (root docx ×2, `logins 2026.xlsx`) |
| **Drive total** | — | **2.808 GiB** | **unchanged** |

**Lossless check.** Each of the 221 step-0 paths was mapped through the merge map and confirmed
present at its new location: **221/221**. Nothing missing, nothing orphaned.

#### Three things worth knowing

**1. `courses/faa-107/Course Materials` is empty but could not be deleted.**
`rclone rmdir` returns `403 insufficientFilePermissions` — this account can reparent the folder
but not trash it, so it is owned by another member of the shared Drive. Harmless (empty, and
step 4 copies explicit subpaths), but **ask the folder's owner to delete it**.

**2. Drive's listing API is unreliable on this account — verify on size, not file count.**
Repeated `rclone lsf -R` on an idle Drive returns **221 or 225 rows on alternating calls** while
total size stays fixed. Two of the extra rows are the known duplicate files; the rest is
transient API duplication. Consequences:

- The step-0 listing (`assets-drive-pre-migration-listing-2026-09-17.txt`) **under-reports by 4**
  — `Logo/PNG/Icon/Icon{Black,White}.png` and `Logo/SVG/Logo/Logo{Black,White}.svg` are absent
  from it. All four **are** in the snapshot zip, so the rollback is complete; only the text
  listing is lossy.
- **`rclone size` is also unreliable here.** Its "Total size" alternates between **2.808 GiB**
  and **2.955 GiB** depending on whether it folds in estimated export sizes for the 14 native
  Google Docs. It is not evidence that anything changed.
- **The stable invariant is the sum over known-size objects only:** 211 objects totalling
  exactly **2.8080 GiB**, plus **14** unknown-size (native Google Docs) — reproduced identically
  on three consecutive runs. Verify with:

  ```bash
  rclone lsjson gdrive: -R --files-only | python3 -c "import json,sys; d=json.load(sys.stdin); k=[x for x in d if int(x.get('Size',-1))>=0]; print(len(k), sum(int(x['Size']) for x in k)/2**30, len(d)-len(k))"
  ```
- For path-level checks, take the **union of several listings** — a single listing is lossy.

**3. The two duplicates were not resolved.** `rclone dedupe` needs an interactive terminal. They
rode along with the directory move and now live at:

```
courses/photo-video/notes for powerpoint development/Outline for Photo and video class.docx
courses/photo-video/powerpoints photo and video/Introduction to Lighting v2.pptx
```

Still to do, by hand:
`rclone dedupe gdrive:"courses/photo-video" --dedupe-mode interactive`

### Step 2 — Drive merge map

| Now | Becomes |
|-----|---------|
| `FAA 107 Course/` | `courses/faa-107/` |
| `Photo & Video Course/` | `courses/photo-video/` |
| `STEM Course/` | `courses/drone-building/` (merge; do not keep two names) |
| `Drone Edge Assets/` | `marketing/brand/` |
| `Media Content not for course/` | `marketing/footage/raw/flights/<date>/` |
| `Documents/` + root fix-it docx + `logins 2026.xlsx` | `marketing/documents/` |

### Step 3 — split FAA 107 Course Materials

| Now | Becomes |
|-----|---------|
| `Outlines／Powerpoints` | `courses/faa-107/outlines/` |
| xlsx, quiz/activity/test-bank docx | `courses/faa-107/questions/` |
| `Pictures for Airports`, `ADM`, `airport operations pics`, `weather` | `courses/faa-107/images/<pack>/` |
| extra maps docx | `courses/faa-107/reference/` |
| `Course Videos/` | `courses/faa-107/videos/` |

### Step 4 — example rclone (after Drive matches)

```bash
rclone copy gdrive:"courses/faa-107/videos"   assets/courses/faa-107/videos   --dry-run -P
rclone copy gdrive:"courses/faa-107/images"   assets/courses/faa-107/images   --dry-run -P
rclone copy gdrive:"courses/faa-107/outlines" assets/courses/faa-107/outlines --dry-run -P --drive-export-formats docx
rclone copy gdrive:"marketing/footage"        assets/media/raw/flights/inbox  --dry-run -P
```

Use `copy`, not `sync`. Never copy `faa_107_course.json` or `*.bulk.json` up to Drive.

### Step 4 — execution log (Sep 20 2026)

Pulled with `rclone copy` (never `sync`), `--drive-export-formats docx,xlsx,pptx,pdf`.

| Drive path | Local path | Pulled | Verified |
|---|---|---|---|
| `courses/faa-107/videos` | `assets/courses/faa-107/videos` | 38 files, 692 MiB | 38 matching, 0 differences |
| `courses/faa-107/images` | `assets/courses/faa-107/images` | 38 new (62 already identical) | 100 matching, 0 differences |
| `courses/faa-107/outlines` | `assets/courses/faa-107/outlines` | **9 docx only** | 9 matching |
| `courses/faa-107/questions` | `assets/courses/faa-107/questions` | 9 files | 9 matching |
| `courses/faa-107/reference` | `assets/courses/faa-107/reference` | 4 docx, 25.9 MiB | 4 matching, 0 differences |
| `marketing/footage` | `assets/media/raw/flights/inbox` | 9 files, 1.3 GB | — (gitignored) |

Hashes that "could not be checked" are the native Google Docs — exports have no stable
checksum. Sizes and names match.

**Two deviations from the step-4 example commands, both deliberate:**

1. **The 11 PPTX (98.4 MiB) were left on Drive** — `--exclude "*.pptx"`. The Goal section assigns
   PPTX to Drive ("author intake + large binaries: **PPTX**, lesson mp4, GeoTIFF…"), so pulling
   them would contradict the plan and add ~98 MiB of binaries to git. The 9 outline **docx** were
   pulled, which is what the Goal section says git holds. If the decks are ever wanted locally,
   pull them into a gitignored path.
2. **17 duplicate videos were removed from `assets/courses/faa-107/videos/`.** An earlier ad-hoc
   pull had left Section 1 flat at the folder root; Drive nests it under `Section 1 videos/`.
   All 17 were confirmed **md5-identical** to their nested counterpart before deletion
   (925 MB → 735 MB). Two flat files were **kept** because they have no Drive counterpart:
   `#1 registration& inspection 3-13.mp4` and `Part 107 - 11 Applicablity V1.mov`.

**Git impact:** 41 new untracked paths under `assets/courses/faa-107/`. `videos/` and
`media/raw/` are gitignored; `images/`, `outlines/`, `questions/` and `reference/` are **tracked**
— roughly 60 MiB of docx/xlsx/png will enter the repo when committed. Review before committing.

---

## Manual steps still required

Things that cannot be done from a non-interactive shell or that touch production.

| # | Step | Why it is manual |
|---|------|------------------|
| ~~M1~~ | ~~Delete `courses/faa-107/Course Materials` on Drive~~ | **Done Sep 20 2026** — verified gone; `courses/faa-107` now holds exactly `images, outlines, questions, reference, videos` |
| M2 | **Resolve the 2 duplicates** — see *M2 in detail* below. Only one of the two actually needs a human | `dedupe` needs a TTY for the interactive mode |
| M3 | **Tell anyone else using the shared Drive that the paths changed** | Six root folders moved. File-ID links still work; folder bookmarks and any Drive-desktop sync roots do not |
| M4 | **Step 5 — upload videos + publish** (`scripts/upload-faa-107-videos.sh`, then `video_url` in `faa_107_course.json`, then the admin UI) | Writes to the prod S3 bucket `personal-site-raw-video` → MediaConvert → `media.thedroneedge.com`, then publishes. Production; out of scope for an agent without an explicit ask. **134 of 150 `video_url` fields are still empty; 38 videos are now local and ready** |
| M5 | **Decide whether the 11 PPTX should ever come local** | Policy call, not mechanical — see deviation 1 above |
| M6 | **Review the ~60 MiB of new tracked binaries before committing** | `images/`, `outlines/`, `questions/`, `reference/` additions are tracked by git |

### M2 in detail

Google Drive allows two files with the same name in the same folder. There are two such pairs,
and they are **not** the same kind of problem:

**Pair 1 — `courses/photo-video/powerpoints photo and video/Introduction to Lighting v2.pptx`**

| Copy | Size | Modified |
|---|---:|---|
| `…mAj9j7gLcHQc` | 1,389,703 B | 2026-07-11T14:14:06 |
| `…8Vh8eoiPKGXP` | 1,389,703 B | 2026-07-11T14:14:06 |

Byte-identical size **and** identical timestamp — the same file uploaded twice. **No judgement
needed**; either copy can go.

**Pair 2 — `courses/photo-video/notes for powerpoint development/Outline for Photo and video class.docx`**

| Copy | Size | Modified | Kind |
|---|---:|---|---|
| `…dg24mhXlRbWE` | *unknown* | 2026-07-13T18:17:41 | **native Google Doc** |
| `…VxYkqpVzc8d5` | 17,723 B | 2026-07-13T18:04:41 | uploaded **.docx** |

Different object types created 13 minutes apart — almost certainly a .docx that was uploaded and
then converted (or vice versa). Content may have diverged. **This is the one that needs eyes.**

**Safe way to resolve without a TTY.** `--dedupe-mode rename` is non-destructive: it keeps every
copy and appends a suffix, which clears the duplicate-name condition so both can then be opened
and compared normally.

```bash
rclone dedupe gdrive:"courses/photo-video" --dedupe-mode rename     # keeps both, renames
```

Then open the two `Outline for Photo and video class*.docx`, keep the better one, delete the
other. For pair 1 just delete one copy — they are identical.

Avoid `--dedupe-mode newest`: for pair 1 both timestamps are equal, so "newest" is arbitrary.

---

Step 6 (local rename) is **not** manual — it is mechanical but touches ~30 files across
`docs/`, `workflows/`, `scripts/` and `.gitignore`, so it wants its own commit on a clean tree.

### Step 6 — local rename (after Drive is stable)

| Now | Becomes |
|-----|---------|
| `assets/visuals/` | `assets/marketing/brand/` |
| `assets/articles/` | `assets/marketing/articles/` |
| `assets/media/` | `assets/marketing/footage/` |
| `assets/archive/` | delete or `marketing/documents/archive/` |

Also update [`assets/AGENTS.md`](../../assets/AGENTS.md), [`assets/README.md`](../../assets/README.md), [`docs/marketing/brand-assets.md`](../marketing/brand-assets.md), `scripts/brand_story11_images.py`, `scripts/build_news_article_json.py`.

---

## Reference

### Dual store (who owns what)

| Layer | Holds | Source of truth |
|--------|--------|-----------------|
| Git `assets/` | JSON, questions, outlines, mapping CSVs, article drafts, used brand files | Product |
| Google Drive | Same folders plus PPTX, mp4, GeoTIFF, DJI, Google Docs | Author + binaries |
| S3 / CloudFront | Site playback | Delivery |
| External SSD | 4K masters if needed | Cold archive |

| Folder | Git | Drive |
|--------|-----|-------|
| `outlines/` | yes (docx/md/txt) | yes |
| `questions/` | yes | yes |
| `images/` | yes if small / mapped | yes |
| `videos/` | **no** (gitignore) | **yes** |
| `reference/` | metadata; `.tif` gitignored | **yes** |
| course JSON / bulk JSON / review CSVs | **git only** | do not upload |
| `cad/generated/` | git as needed | not on Drive |
| `logins 2026.xlsx` | **never** | `marketing/documents/` only |

Company `docs/` and `workflows/` stay in git. Optional Drive shortcut to GitHub `docs/` under `marketing/documents/`. Course Word/PPT stays under `courses/`, not `docs/`.

rclone: Drive → local for intake (videos, images, outlines, questions, footage). local → Drive for brand only if git is cleaner. Native Google Docs (`size -1`): `--drive-export-formats docx`.

### Snapshot — Drive vs local (Sep 17 2026)

Drive still:

```
Documents/
Drone Edge Assets/
FAA 107 Course/   Course Materials/  Course Videos/  logins 2026.xlsx
Photo & Video Course/
STEM Course/      (empty)
Media Content not for course/
james to fix.docx, Notes for Drone Edge To fix.docx
```

Local `assets/`:

```
courses/faa-107/         json, outlines, questions, images, Ch.1 videos, sectionals
courses/drone-building/  outlines, parts, cad/
articles/  visuals/  media/  archive/
```

Already aligned: Pictures for Airports; Ch.1 videos (Drive also has `#1 VLOS 8-13 good.mp4`); brand kit inner folders; outline chapters 2–10 (Drive has PPTX).

On Drive, not local yet: VLOS #8; sections 2–5 videos; ADM / airport ops / weather image packs; full PPTX 1–10; question xlsx/quizzes; Photo & Video course; Apr/Sep DJI clips.

Do not merge: lesson video with marketing footage; brand with course charts; personal flights onto this Drive; empty STEM over local `drone-building` CAD.
