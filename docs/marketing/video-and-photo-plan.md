# Video and photo plan — Q4 2026

What video and photos we make, why, for which part of the funnel, how they should look, how to shoot them, and where everything lives for review. Strategy context: [`next-90-days-plan.md`](next-90-days-plan.md) § 14. Paid rules: [`paid-acquisition.md`](paid-acquisition.md). Claims: [`../sales/positioning.md`](../sales/positioning.md).

*Created 2026-10-06. Owner: you (approval), friend (camera/edit).*

---

## 1. Where everything lives (review map)

| What | File / folder | Tracked in git? |
|---|---|---|
| **This plan**: targets, mood, setup, clip list, photo list | `docs/marketing/video-and-photo-plan.md` | Yes |
| **Scripts** for every piece (V1–V10) + release text | [`assets/media/scripts/2026-q4-scripts.md`](../../assets/media/scripts/2026-q4-scripts.md) | Yes |
| **Hackathon filming prep** | [`action-space-hackathon-filming.md`](action-space-hackathon-filming.md) | Yes |
| Hackathon event brief (teams, schedule, hardware) | [`action-space-hackathon-2026.md`](action-space-hackathon-2026.md) | Yes |
| Existing flight footage: grades, best windows, ad use | [`assets/media/manifests/2026-08-flights.md`](../../assets/media/manifests/2026-08-flights.md), [`…-edit-plan.md`](../../assets/media/manifests/2026-08-flights-edit-plan.md) | Yes |
| Raw footage (new shoots) | `assets/media/raw/<type>/YYYY-MM-DD-<slug>/`, e.g. `raw/interviews/2026-10-15-teacher/`, `raw/events/2026-10-24-actionspace/` | No (gitignored) |
| Cuts for review | `assets/media/edits/review/<piece-id>/` | No |
| Approved exports | `assets/media/edits/final/<piece-id>/` | No |
| Photos | `assets/media/raw/photos/YYYY-MM-DD-<slug>/` → picks in `edits/stills/` | No |
| Signed releases | **Not in the repo.** Private Drive folder `Releases/` | — |
| Review log (what's approved, where it's used) | § 8 of this file | Yes |

---

## 2. Targets

### 2.1 Pieces

| ID | Piece | Audience | Funnel step | Placement | Formats | Length | Due |
|---|---|---|---|---|---|---|---|
| **V1** | "Can you read this?" ×6 variants | Career changers, hobbyists | Attraction → Unit 1 free | Meta test (70 bucket), Reels, Shorts, Reddit answers | 9:16, 4:5 | 15–20 s | Nov 1 |
| **V2** | "Is it legal to fly for money?" | Hobbyists going commercial | Attraction | Meta (20 bucket), Reels | 9:16, 4:5 | 20–30 s | Nov 1 |
| **V3** | "What Part 107 actually gets you" | Career changers | Attraction → `/pricing` | Meta (20 bucket), YouTube | 9:16, 16:9 | 30–45 s | Nov 15 |
| **V4** | Product demo: student view | Everyone evaluating | Core ($129) | Preview page, `/pricing`, retargeting | 16:9, 9:16 cut | 60–90 s | Oct 31 |
| **V5** | Teacher dashboard demo | Teachers, CTE leads | School attraction | `/schools`, one-pager QR, outreach, LinkedIn | 16:9 | 45–60 s | Oct 31 |
| **V6** | Teacher testimonial | Teachers, CTE leads | School proof | `/schools`, educator ads, Field Notes, Boston | 16:9 master; 9:16 30 s + 15 s | 60–90 s | Oct 22 |
| **V7** | "Earn your Part 107 over winter break" | Teachers as learners | Core ($129) → school lead | Meta to educators, LinkedIn, Field Notes | 9:16, 4:5 | 20–30 s | Nov 10 |
| **V8** | "Got a drone for the holidays?" | New drone owners | Attraction (newsletter) | Reels, Shorts, Jan ads | 9:16, 16:9 | 30–45 s | Dec 10 |
| **V9** | Preflight checklist safety short | Everyone | Authority / organic | Shorts, Reels, articles | 9:16 | 30 s | Nov 20 |
| **V10** | Hackathon: per-team shorts + recap | Builders, community | Awareness, Bench notes | YouTube, Instagram, LinkedIn, teams repost | 9:16 (shorts), 16:9 (recap) | 30–45 s / 3–5 min | Oct 27 / Nov 1 |

### 2.2 Volume

| | Oct | Nov | Dec |
|---|---|---|---|
| Short verticals published | 4 | 12 (3/week) | 12 |
| Ad variants live | 0 | 8–10 (V1 ×6, V2, V7) | 2–4 retargeting |
| Longer pieces (V4–V6, V10 recap) | 4 | 1 | 1 (V8 long) |
| Brand photos in library | 40 | +20 | +20 |

### 2.3 Performance (starting benchmarks; replace with our own after 2 weeks)

| Metric | Where | Start target | If missed |
|---|---|---|---|
| Hook rate (3 s views ÷ impressions) | Meta | ≥ 25% | New first 3 s: different shot or question |
| Hold (15 s or ThruPlay ÷ 3 s views) | Meta | ≥ 25% | Shorten; put the answer earlier |
| Link CTR | Meta | ≥ 1% | New headline/end card; check message match with the landing page |
| Cost per free signup | First-party funnel | ≤ $12 | See next-90-days § 8 kill rules |
| Watch to 50% (V4–V6) | Site / YouTube | ≥ 40% | Cut the intro; show the product sooner |
| Shares / saves | Organic | Track | — |

---

## 3. How video connects to marketing

| Piece | Lands on | UTM `utm_content` | Bucket (70/20/10) | Also feeds |
|---|---|---|---|---|
| V1 | Unit 1 free preview (`/courses/35/preview`) or article A | `v1-<variant>` | **70** | Reddit answers, Field Notes practice question |
| V2 | Article: "Do I need Part 107?" / preview | `v2` | 20 | Holiday article |
| V3 | `/pricing` | `v3` | 20 | YouTube |
| V4 | Embedded on preview + `/pricing`; retargeting → preview | `v4` | Retargeting | Course preview page |
| V5 | `/schools`, one-pager QR | `v5` | 10 (educator test) | Rep emails |
| V6 | `/schools`; educator ads → `/schools` | `v6-<cut>` | 10 → 20 if it works | Field Notes, Boston talk, case study |
| V7 | Preview page with teacher framing | `v7` | 20 | Classroom corner |
| V8 | Holiday article → newsletter signup | `v8` | Jan 70/20 | Jan ads |
| V9 | Organic only | — | — | Holiday article, Bench notes |
| V10 | Field Notes signup, building waitlist | `v10-<team>` | Organic | Bench notes, Tello article |

Campaign names follow [`../../workflows/marketing/paid-ads.md`](../../workflows/marketing/paid-ads.md) § Naming: e.g. `b2c_meta_unit1-preview_70_2026-11` with creative `..._v1-classb`.

---

## 4. Mood and look

**One line:** *a calm, competent pilot showing you something real.* Practitioner, not marketer ([`content-vision.md`](content-vision.md) principle 3).

| Element | Do | Don't |
|---|---|---|
| **Feel** | Calm, clear, curious; "here's how this works" | Hype, "epic" trailers, fear, fake urgency |
| **Footage** | Smooth A/B-grade windows only (manifest grades); slow reveals, top-down, golden hour, mist | Whip pans, crash compilations, FPV freestyle (off-brand for this audience), anything that looks unsafe |
| **Color** | Natural, slightly muted earth tones that sit with the brand olive | Teal-orange blockbuster grade, oversaturated skies |
| **Brand colors** | Dark backgrounds `#0d0d0d` / `#262626`; olive `#4a6b2f`; light olive accent `#8ea66a`; white text | Off-brand colors; red "warning" styling except for real safety callouts |
| **Type** | **Chakra Petch** for headlines; **IBM Plex Sans** for body and captions; **Space Mono** for numbers, chart callouts, checklist items (an instrument-panel feel) | More than 2 fonts per frame; text over busy sky without a shadow or scrim |
| **Text on screen** | ≤ 7 words per card; sentence case; on screen ≥ 1.5 s per line | Paragraphs, all caps, emoji spam |
| **Callouts** | Olive or white circles and arrows on chart crops (match the course figures) | Red circles everywhere |
| **Music** | Understated ambient, light acoustic or lo-fi; licensed (platform library or a paid license from the reserve) | Trailer drums, drops, trending audio with lyrics on ads |
| **Voice** | Text + music by default; friend's voice or a disclosed synthetic voice if needed | Your voice (brand anonymity) |
| **Captions** | Always burned in on social (most people watch muted); SRT on YouTube | Auto-captions unchecked |
| **End card** | Logo, one line, URL `thedroneedge.com`, the offer ("Try Unit 1 free") | Two CTAs; countdowns |
| **People** | Hands, backs of heads, the consenting teacher, consenting adult hackathon participants | Students' faces; identifiable bystanders; school logos without OK |

### 4.1 Wardrobe and casting (friends on camera)

| Role in the shot | Wear | Why |
|---|---|---|
| **Pilot / instructor** (preflight, hands on controller, V9) | **Black brand tee** (merch event tee) or plain black, dark jeans | Reads as "the Drone Edge crew"; matches the brand |
| **Learner** (studying at a desk, "can you read this?" reaction, V1–V3, V7) | **Plain, muted solids**: charcoal, olive, navy, tan, heather gray. Black is fine on a light or wood background | A learner in a branded tee looks staged; solids look like a real person |

- **Black works** outdoors and on light or wood backgrounds. On our **dark end cards and dark desks** it disappears and phone cameras crush the fabric detail. Light the person well or switch to charcoal or olive.
- **Avoid:** other brands' logos (also an ad-review issue), bright white (blows out), fine stripes or small checks (shimmer on camera), shiny fabric, hats that shade the face, loud jewelry, smart watches (hands are in most shots).
- **Hands:** clean nails; sleeves rolled or short so the controller reads clearly.
- **Continuity:** bring one backup top in a second muted color. The same person in the same outfit across one variant set keeps the A/B test about the hook, not the wardrobe.
- **Adults only, release signed** (event-participant template adapted, with ☐ paid ads checked).
- **Friends act; they don't testify.** On screen they can study, fly and react. A friend or neighbor who **actually takes the course** can give an honest testimonial in their own words, with a disclosure line. Full rules: [`../sales/positioning.md`](../sales/positioning.md) § Testimonials and endorsements.

Templates to build once (Oct): title card, question card, answer card, end card, quote card, lower third, in 9:16 / 4:5 / 16:9, using the social templates in [`assets/visuals/Assets/Social/`](../../assets/visuals/Assets/Social/).

---

## 5. Setup by shoot type

### 5.1 Camera and audio defaults

| Setting | Value |
|---|---|
| Resolution / frame rate | 4K, **30 fps** for interviews and screens; 24 fps OK for scenic if everything in a piece matches |
| Shutter | ~2× frame rate (1/60 at 30 fps); lock exposure and focus (phone: long-press AE/AF lock) |
| Orientation | Shoot **horizontal 4K** and crop to 9:16 / 4:5, unless a second camera is dedicated to vertical |
| Audio | **Wireless lav** on every speaker (e.g. DJI Mic / Rode Wireless GO class, from the reserve); 48 kHz; 30 s room tone per location |
| Phone prep | Airplane mode + Do Not Disturb, lens wiped, storage ≥ 50 GB free, battery pack |
| Slate | Say or hold up the piece ID + take number at the start of every take |

### 5.2 Per shoot

| Shoot | Setup | Notes |
|---|---|---|
| **Interview (V6)** | Subject 1 m from a window, light on the face; camera at eye level, tripod; subject looks just off-lens at the interviewer; background with depth (classroom, drone cart), nothing with student names | Interviewer off camera, never in the edit. 2nd angle (tighter) optional |
| **Screen recording (V4, V5, V1 charts)** | Browser at 1440×900 or 1920×1080; **demo org with fake students**; bookmarks bar hidden, notifications off, a clean profile; slow deliberate mouse; record at 60 fps | Add zooms/pans in edit. Never AI-generated UI |
| **Desk / flat-lay (photos, V3, V7)** | Top-down on a tripod arm or overhead, soft window light, matte dark surface (or wood); props: laptop with course, printed sectional, plotter, controller, notebook, coffee | Leave negative space for text |
| **Outdoor flight (V9, new B-roll)** | Part 107 operation: certificated pilot, airspace checked (Aloft/LAANC), Remote ID on, no flight over people, VLOS | Film the **correct** procedure only; animate hazards instead of staging them |
| **Event run-and-gun (V10)** | Gimbal or steady handheld, lav for interviews, on-camera mic for ambience; see the filming prep file | Consent before filming people |

### 5.3 Export

| Use | Spec |
|---|---|
| 9:16 Reels/Shorts/Stories | 1080×1920, H.264, ≤ 60 s; keep text inside the safe zone (avoid the top 250 px and bottom 400 px) |
| 4:5 Feed | 1080×1350 |
| 16:9 site/YouTube | 1920×1080 (4K master archived) |
| Audio | Normalized to about −14 LUFS |
| Captions | Burned in for social; `.srt` alongside for YouTube and the site |
| Site embeds | Click-to-play with a poster image, no autoplay with sound, transcript below ([`paid-acquisition.md`](paid-acquisition.md) § VSL) |

File name: `de_<piece-id>_<variant>_<ratio>_v<n>.mp4`, e.g. `de_v1_classb_9x16_v2.mp4`.

### 5.4 Gear to buy

Paid from the **$400 production reserve** in the ad plan ([`next-90-days-plan.md`](next-90-days-plan.md) § 7). Prices are rough street prices (Oct 2026); check before buying. Cameras: the friend's phone (4K) + drones we own. **Audio first:** viewers forgive soft video but not bad sound.

| Priority | Item | What to look for | ~Cost | Used for |
|---|---|---|---|---|
| **1** | **Wireless lav kit, 2 transmitters** | DJI Mic Mini / Hollyland Lark M2 class (budget) or Rode Wireless GO / DJI Mic 2 class. **Receiver plug must match the phone** (USB-C or Lightning); safety-channel or onboard recording is a bonus | $100–300 | Teacher interview, team interviews, any voice |
| **2** | **Full-height tripod + phone mount** | 60"+ tripod that holds a phone or small camera; mount with a cold shoe for a light or mic receiver | $35–70 | Interviews, B-roll, screen-to-camera shots |
| 3 | **Small LED light** | Pocket bi-color panel with a battery (Ulanzi/Neewer class); a larger panel if budget allows | $25–80 | Indoor interviews (classroom, NERD Center) |
| 4 | **Phone gimbal** | DJI Osmo Mobile class | $90–150 | Hackathon walk-and-talk, room shots |
| 5 | **Overhead arm / desk mount** | Clamp arm for top-down phone shots | $30–50 | Desk study scenes, flat-lays, sectional shots |
| 6 | Power bank + fast cable | 20,000 mAh | $25–40 | Event days |
| — | Storage | Use the existing external SSD (`DroneArchive/`); buy a 1 TB portable SSD only if it's full | $0–80 | Nightly card dumps |
| — | Music license | Platform libraries are free (Meta Sound Collection, YouTube Audio Library); a paid library subscription only if those run out | $0–20/mo | Every piece |
| — | Software | Free: QuickTime/OBS (screen), CapCut or DaVinci Resolve (edit). Paid screen-recording polish tools only if the free zoom/pan workflow is too slow | $0–30/mo | Editing |

**Tiers:**

| Tier | Buys | Total |
|---|---|---|
| **Minimum** | 1 + 2 | **~$150–250** |
| **Recommended** (fits the reserve) | 1 + 2 + 3 + 4 + 6 | **~$300–400** |
| **Later, only if video is working** (after the Dec 15 review) | Pocket gimbal camera (Osmo Pocket class) or a mirrorless vlog camera, softbox, second mic kit | $500–1,000 |

**Don't buy now:** a new camera (phones are enough at this stage), a teleprompter (no on-camera founder), a green screen, or a new drone.

---

## 6. Clip list

### 6.1 Existing footage (Aug 2026 WV flights) mapped to pieces

| Snip / still | Grade | Use in |
|---|---|---|
| `snip_0025_mist_20s` | B (A at 0:59–1:11) | V1 hook (first 2–3 s), V3 open |
| `snip_0029_gorge_20s` | A | V1 hook, V2 open |
| `snip_0019_ridge_20s` | B | V1/V3 establish shot with sky for text |
| `snip_0030_cliff_20s` | A | V1 hook, V10 recap open |
| `snip_0005_valley_9s` | A | Cutaways in any piece |
| `snip_0006_overlook_21s` | A | **Check first:** it shows people on a deck. Use only if nobody is identifiable at final crop |
| Still `0021` golden-hour flare | A+ | End card background |
| Still `0022` road + mist | A | Article hero (holiday article), V8 |
| Stills `0023`, `0024` | A-/A | Quote card backgrounds |
| `0012` power plant | — | Article only (industrial) |

Confirm every reused clip was flown as a Part 107 operation before it goes in a paid ad ([`paid-acquisition.md`](paid-acquisition.md) § Compliance).

### 6.2 New footage to capture

| # | Clip | For | Shoot type |
|---|---|---|---|
| N1 | Student flow screen recording (Unit 1 → lesson → video → quiz → progress) | V4, V1 end, V7 | Screen |
| N2 | Teacher dashboard screen recording (demo org) | V5, V6 B-roll | Screen |
| N3 | Sectional crop zooms: 6 chart features (scripts V1) | V1 | Screen (crop images in an editor or the course viewer) |
| N4 | Pricing → one-click checkout (after CK1) | V3, V4 | Screen |
| N5 | Teacher interview + B-roll | V6 | Interview |
| N6 | Preflight checklist hands, Aloft/LAANC check on a phone, Remote ID, battery check, takeoff/landing close-ups | V9, V2, V8 | Outdoor |
| N7 | Desk study scenes (laptop + printed sectional + plotter) | V3, V7 | Desk |
| N8 | Hackathon coverage + team interviews | V10 | Event |
| N9 | Unboxing / first look of a consumer drone + registration screen (FAA DroneZone) | V8 | Desk |
| N10 | Build bench: parts, hands, printed frame (when available) | Bench notes | Desk |

---

## 7. Photo shot list

Shoot each in **horizontal and vertical**, with room for text. RAW/HEIC at full resolution. No faces of minors, no school logos, no license plates, house numbers or private property without permission.

| Set | Shots | Used for |
|---|---|---|
| **Study desk** (8) | Laptop with a course lesson; printed sectional with a plotter; notebook with a practice question; hands typing; coffee + chart; Chromebook with a quiz; top-down flat-lay; close-up of a chart legend | Consumer ads, articles, Field Notes |
| **Gear** (8) | Controller in hands (adult); drone on a landing pad; batteries in a LiPo bag; prop guards; goggles on a table; Remote ID module; drone case open; full kit flat-lay | Ads, safety posts, one-pager |
| **Preflight** (6) | Checklist on a clipboard; phone showing an airspace check; hands inspecting props; battery voltage check; pilot (back view) scanning the sky; logbook | V9 thumbnails, holiday article |
| **Classroom (with the teacher's OK, no students)** (6) | Empty classroom with the drone cart; whiteboard with a lesson; the teacher at her desk (if approved); Chromebooks set out; the field where they fly (empty); equipment storage | `/schools`, one-pager, case study |
| **Teacher** (5, if approved) | Portrait (window light); working at her desk; holding a controller; quote-card crop with space for text; candid while she talks | Quote cards, `/schools`, Field Notes |
| **Hackathon** (10+) | Room wide shot; team at a table (consented); hands on a laptop with sim; Tellos lined up; net setup; flight window action; judges at a table; whiteboard diagrams; award moment; the logo on screen if sponsoring | Recap, LinkedIn, Bench notes |
| **Brand flat-lays** (4) | Logo sticker/tee with gear; merch on a dark background | Social, merch page |

Replace the current `/schools` hero (`3_kids_holding.png`) with a release-safe photo unless commercial-use releases exist ([`next-90-days-plan.md`](next-90-days-plan.md) § 12.3).

---

## 8. Review flow and log

**Every piece goes through:**

1. **Script check:** claims match [`../sales/features.md`](../sales/features.md) / positioning; FAA facts trace to a source; nothing prohibited (pass rates, school counts, building course as live, unreleased features).
2. **Rough cut** → `edits/review/<piece-id>/`. You review on a phone, muted first (does it work without sound?).
3. **Permission check:** releases on file for every identifiable person; disclosure line on V6; the flight shown was legal.
4. **Final** → `edits/final/<piece-id>/`; log it below.
5. After it runs: note hook rate, CTR and result in the log at the monthly review.

| ID | Variant | Status | Approved | Releases | Used where | Result |
|---|---|---|---|---|---|---|
| V1 | classb | Script | — | n/a | — | — |
| V1 | classd | Script | — | n/a | — | — |
| V1 | vignette | Script | — | n/a | — | — |
| V1 | obstacle | Script | — | n/a | — | — |
| V1 | restricted | Script | — | n/a | — | — |
| V1 | moa | Script | — | n/a | — | — |
| V2–V10 | — | Script | — | — | — | — |

*Update the log as pieces move; archive fatigued creative at the monthly paid review ([`../../workflows/marketing/paid-ads.md`](../../workflows/marketing/paid-ads.md) § 6).*
