# PWA & mobile app

Whether Drone Edge needs a mobile app, what "app" means in the Meta advertising context, how to ship an installable PWA from the existing Next.js site, and the Jul 2026 assessment of Capacitor vs React Native for App Store / Play Store.

Related: [`analytics-and-attribution.md`](analytics-and-attribution.md) · [`docs/marketing/paid-acquisition.md`](../marketing/paid-acquisition.md) · [`frontend-data.md`](frontend-data.md) · [`architecture.md`](architecture.md) · [`backend-data.md`](backend-data.md)

*Canonical for product decisions. A Cursor canvas (`app-store-options.canvas.tsx` under the local Cursor project `canvases/` folder) was used to explore this interactively — durable facts live here, not in the canvas.*

---

## Meta ads do not require a mobile app

This is the load-bearing correction. **Meta ads run to a website perfectly well.** Website conversion campaigns are Meta's most common campaign type; a mobile app is required only for *app install* and *app engagement* campaign objectives, which are not what Drone Edge would run.

The word "app" appears in Meta setup for an unrelated reason, and that is almost certainly the source of the confusion:

| "App" meaning | Required? | What it actually is |
|---------------|-----------|---------------------|
| **Meta for Developers app** | **Yes** — for the Conversions API | A registration record at `developers.facebook.com`. Free, no code, ~15 minutes. It exists so you can mint a System User access token for server-side conversion calls. Nobody installs it, and it never appears to a user. |
| **Facebook Page** | **Yes** | You cannot run Meta ads without a Page to run them from. Also free. |
| Native iOS/Android app | **No** | Only needed for app-install campaign objectives. |

So the Meta prerequisite is a developer-console app registration, not a shipped mobile product. That unblocks the ad plan immediately — see the accounts table in [`analytics-and-attribution.md`](analytics-and-attribution.md).

---

## Decision summary (Jul 2026)

| Option | Verdict |
|--------|---------|
| Meta developer app registration | **Do it now** — required for Conversions API, free, ~15 minutes |
| Facebook Page + Business Manager + ad account | **Do it now** — required to run any Meta ad |
| Installable PWA | **Do it first** — 1–2 weeks; real product value; prerequisite for any native path; no store gatekeeper |
| Capacitor shell → iOS + Android | **Defer until PWA proves installs/push** — ~4–7 weeks with AI once backend HLS additive fix lands; do not ship a plain WebView |
| React Native / Expo rewrite | **Do not** — 4–6 months; cannot replace the Next.js SEO site without giving up ISR, OG images, middleware, Tailwind |
| Native macOS | **Skip** — no B2C demand for a desktop app of a browser product |

**Framing:** buy offline study, push reminders, and a fast phone experience — not "an App Store listing." Phase the work so Phase 1 (PWA) is useful even if native never ships.

---

## PWA — recommended, and worth doing on its own merits

Independent of advertising, an installable PWA is a good fit for this product. Learners study in fragments, often on a phone, sometimes without reliable connectivity. Concretely it buys:

- **Offline access to lesson text and images** — genuinely useful for exam prep on the move.
- **Home screen presence** — an icon is a retention mechanism that costs nothing.
- **Push notifications for study reminders** — supported on Android, and on iOS for installed PWAs since 16.4. Study-streak nudges are one of the few retention levers available in a self-paced course.
- **No store fees, no review cycle, no 30% cut.** Purchases stay on the existing Stripe web checkout.

**Downside vs a store listing:** iOS install is a hidden Share-sheet flow ("Add to Home Screen"), so install rate is much lower than Android. That is acceptable for a first step and a reason to measure before native.

### Implementation sketch

The stack already supports this — Next.js 15 App Router, served over HTTPS through CloudFront, which is the only hard PWA prerequisite. Root layout already sets `appleWebApp.capable: true`; there is **no** `manifest.ts` or service worker yet.

1. **Manifest** — `drone/src/app/manifest.ts` (Next's typed metadata route). Name, theme color from `lib/site-assets.ts` (`THEME_COLOR`), display `standalone`, start URL.
2. **Icons** — maskable 192/512 PNGs generated from the brand kit in `assets/visuals/Logo/` per [`docs/marketing/brand-assets.md`](../marketing/brand-assets.md). Existing `drone/public/icon.png` / `icon.svg` are a start, not enough alone.
3. **Service worker** — Serwist (the maintained successor to `next-pwa`). App-shell caching plus an offline fallback route.
4. **Install prompt** — capture `beforeinstallprompt`, surface a dismissible install affordance to logged-in learners only. Do not prompt anonymous ad traffic; it hurts the conversion you paid for.

### Caching traps specific to this codebase

These are the things that will actually break, so they are worth stating before anyone starts:

- **Never cache signed media.** Course video is HLS under `courses/videos/` on `media.thedroneedge.com`, authorized by CloudFront signed cookies (6h TTL). A service worker that caches them will serve 403s after expiry, and the failure looks like a broken player rather than a cache problem. Exclude the media domain from the service worker scope entirely.
- **Never cache authenticated API responses.** `/api/*` proxies to the internal ALB and returns per-user data. A stale cached response served to a different account on a shared device is a data leak, not a performance win. Network-only for `/api/*`.
- **Auth state and service workers interact badly.** The `access_token` cookie drives `middleware.ts` route gating; a cached HTML shell for `/admin` served to a logged-out user bypasses the intent of that gate even though the API still refuses. Keep protected routes out of the precache manifest.
- **Deploys must invalidate.** ECS rolls new task definitions and CloudFront caches `/_next/static/*`. Version the service worker and use `skipWaiting` deliberately, or users will run a stale shell against a new API.

---

## Native app — options and effort (Jul 2026)

Grounded in `drone/` (Next.js 15, 31 routes, ~66 `"use client"` files), `backend/src/auth/`, `backend/src/media/signed-url.service.ts`, and `terraform/cloudfront_media.tf`.

| Path | What you ship | Effort (with AI) | Store listing | Main risk |
|------|---------------|------------------|---------------|-----------|
| Installable PWA | Manifest, icons, SW, offline shell, web push | 1–2 weeks | No | iOS install UX drop-off |
| Plain WebView wrapper | WKWebView → thedroneedge.com | 2–4 days | Attempted | Rejected under Guideline **4.2**; paid HLS often fails in WebView anyway |
| **Capacitor + native features** | Same React code, native shell, **native video player**, push, biometrics, offline | **4–7 weeks** | Yes | Native video plugin + offline download are the real work |
| React Native / Expo | New mobile app; shared API contract only | 4–6 months | Yes | Permanent two-codebase tax; feature drift |
| Native macOS | Desktop app | — | Mac App Store | Skip |

A pure "frame the website" app will get rejected under Apple Guideline 4.2 (minimum functionality). Reviewers commonly put the device in airplane mode; a blank page or browser error fails. Expect to ship genuine native value: offline shell, push, biometrics, and preferably a native tab bar — not a bookmark with an icon.

Static `output: 'export'` is **not** viable as-is: API proxy (`app/api/[...path]/route.ts`), `middleware.ts`, dynamic OG routes, and server fetches all need a Next runtime (or a redesign).

---

## What actually blocks a mobile build

| Item | Status | Detail |
|------|--------|--------|
| **HLS signed cookies** | **Hard — the one real blocker** | `GET /courses/:courseId/units/:unitId/media` issues HttpOnly `CloudFront-Policy` / `Signature` / `Key-Pair-Id` on parent domain (e.g. `.thedroneedge.com`), path `/courses/videos`, 6h TTL, covering master + 720p/480p variants + segments. A Capacitor WebView origin (`capacitor://…`) treats those as third-party; Safari ITP drops them. Paid video will not play. |
| **API authentication** | **Already solved** | `jwt.strategy.ts` uses cookie extractor **and** `ExtractJwt.fromAuthHeaderAsBearerToken()`. `/auth/login` and `/auth/refresh` already return `{ access_token, refresh_token }` in the body (comment: kept for mobile / older clients). Web keeps HttpOnly cookies. |
| **In-app Stripe Elements** | Easy — build flag | Guideline 3.1.1 forbids in-app card entry for digital content. Hide `purchase-flow.tsx` in the app build and link out to web checkout (US). No web change. |
| **Offline capability** | Net-new | No lesson download today. Needed for 4.2 and for product value. |
| **CORS / session TTL** | Minor | `main.ts` allows a single `FRONTEND_URL` origin. DB session expires in **1 day** while refresh cookie maxAge is **30 days** — already inconsistent; worth fixing regardless. |

### Preferred HLS fix (additive — costs the website nothing)

Do **not** rewrite to per-request signed URLs for the whole tree. That would make playlists per-user (CloudFront edge cache useless), force the backend to rewrite master + variant playlists every request, and risk mid-lesson URL expiry.

Instead: when the caller is a native client, have the media endpoint also return the three CloudFront cookie **values** in the JSON body, and let the native layer install them into `WKHTTPCookieStore` / Android `CookieManager` (or pass them into a native HLS player) before playback. Signing logic, key group, 6h policy, and the web cookie path stay identical — roughly a small addition to `course.controller.ts` behind a client check.

**Do not** return those cookie values to browsers without gating — that would strip the HttpOnly protection the web currently has.

---

## What each change costs the website

Nearly every mobile alignment change is **additive**. There is one thing you must not do, and one genuine tradeoff.

| Change | Why needed | Cost to website | Verdict |
|--------|------------|-----------------|---------|
| Bearer tokens for native client | Cookies don't survive WebView origin | None — already supported; web keeps HttpOnly cookies | Additive |
| Return CloudFront cookie values in JSON (native only) | Native player must install them | None if gated on client type | Additive if gated |
| Switching the **web** to bearer tokens | Tempting "simplification" | XSS regression: tokens readable by injected scripts | **Do not** |
| Hide Stripe Elements in app build | Guideline 3.1.1 | None — build flag; web keeps Elements | Additive |
| Client-side route gating | Middleware needs Node | Keep middleware on web; duplicate gating in app can drift | Maintenance cost |
| Longer / per-client session TTL | Stay signed in | Widens revocation if raised globally — scope by client | Scope it |
| Offline lesson downloads | 4.2 + product value | Content protection: cached media is extractable | Genuine tradeoff |
| Per-request signed URLs for all HLS | Alternative to cookie JSON | Edge cache loss, playlist rewrite layer, mid-play expiry | **Avoid** |

---

## Capacitor vs React Native — developer experience

| Dimension | Capacitor | React Native (Expo) | Better for this repo |
|-----------|-----------|---------------------|----------------------|
| Starting from `drone/` | Add packages; wrap existing build. Days. | New app, router, styling. Port ~66 client components. | Capacitor |
| Inner loop | Existing Turbopack HMR; Chrome/Safari DevTools on real DOM | Fast Refresh; React DevTools, no DOM | Capacitor |
| Styling | Tailwind v4 / `globals.css` unchanged | StyleSheet / NativeWind translation layer | Capacitor |
| Build & submit | Local Xcode / Android Studio; Mac for iOS | EAS Build / Submit in cloud; certificates managed | React Native |
| OTA updates | Appflow (paid) or self-host | EAS Update (strong free tier) | React Native |
| Upgrade pain | Capacitor majors small; WebView OS drift | Expo SDK annual chore (better than bare RN) | Capacitor |
| Testing | Playwright / Vitest against shipping web code | Detox / Maestro — separate stack | Capacitor |
| Credentialed HLS | Weak if you stay on hls.js in WebView; need **native video plugin** | Strong — `react-native-video` → AVPlayer / ExoPlayer | React Native |
| Feel / scroll | Fine for reading, forms, quizzes; webby gestures | Native views | React Native |
| Feature drift | One codebase | Two codebases forever | Capacitor |

**Wrinkle:** React Native is better at the hard blocker (credentialed HLS). That is **not** enough to justify a 4–6 month rewrite, but Capacitor plans should assume a **native video plugin from day one** — do not expect `drone/.../video.tsx` + hls.js to work as-is in a WebView.

---

## Can React Native also be the website?

**Technically yes, practically no for this product.**

- React Native renders native views. Web output uses `react-native-web` + Expo Router (`single` / `static` / `server`).
- Expo Router **cannot mix** static and server rendering in one project — you pick one mode for the whole site.
- Server rendering (SDK 55+) is still alpha-oriented; static is the mature SEO path.
- Replacing Next.js would give up: App Router server components / ISR (`revalidate`), `ImageResponse` OG/Twitter images, `sitemap.ts` / `robots.ts`, `middleware.ts`, `next/image`, Tailwind v4, and the existing 31-route content + schools SEO surface.

SEO is an acquisition engine here (see marketing docs). Teams that pick React Native usually keep a **separate** marketing site — which recreates the two-codebase problem Capacitor avoids. **Do not** treat React Native as a drop-in frontend replacement for `drone/`.

---

## Store commission (US, Jul 2026) — D1 findings

Part 107 is US-only, so consumer volume sits in the storefronts where link-out policy currently matters most.

| Payment route | Platform fee | On a $29 course | Status |
|---------------|--------------|-----------------|--------|
| External link to Stripe web checkout (US App Store) | **0%** today | $0 | Contempt remedy in *Epic v. Apple*; Apple barred from collecting commission on qualifying external-link purchases until a court-approved "reasonable" rate (or SCOTUS outcome). Cert granted Jul 2026; expect further change. |
| Apple IAP, Small Business Program | 15% | ~$4.35 | Under $1M/yr proceeds |
| Apple IAP, standard | 30% | ~$8.70 | Default |
| Google Play external content links (US) | **0%** currently assessed | $0 | *Epic v. Google* injunction; Google not currently assessing link-out fees — re-verify before launch |

**Stripe** still takes ~2.9% + $0.30 regardless.

**Guideline 3.1.1 still applies:** do not take card numbers *inside* the app for digital content. Link out (US) or use StoreKit IAP. Guideline **4.2** still applies: thin wrappers fail review.

**Caveat:** the 0% figure is court-imposed, not a permanent Apple/Google contract. Build bookkeeping that can absorb a future cost-based rate. Re-check policy before submitting.

Retail price reference: [`docs/sales/packages.md`](../sales/packages.md) ($29 one-time for the FAA 107 retail SKU as of last package update).

---

## Where AI helps vs does not

| Compresses well | Barely moves |
|-----------------|--------------|
| Capacitor scaffolding, plugins, config | Xcode signing, provisioning, Apple Developer org enrollment |
| Manifest, icons, SW, offline shell | Review rejections / appeals (days per round) |
| Gating media JSON on client type; token attach in API client | Real-device WebView cookie / HLS debugging |
| Store metadata, screenshots, privacy labels | Judging whether the app deserves public reviews |

AI compresses code, not calendar. Budget wall-clock for enrollment, TestFlight, and review.

---

## Suggested sequence

1. **PWA on the web (1–2 weeks)** — `manifest.ts`, Serwist SW (with media/`/api` exclusions), offline shell, web push. Measure installs and push engagement. Required for Capacitor anyway; nothing wasted if you stop.
2. **Two additive backend changes (3–5 days)** — native-gated CloudFront cookie values in media JSON; session TTL scoped by client + fix 1-day vs 30-day mismatch; CORS origin for Capacitor if needed.
3. **Capacitor wrap + submit (3–5 weeks)** — native tab bar/splash; **native video plugin**; offline lesson download; biometrics; APNs; strip in-app card entry → web checkout; TestFlight then submit with explicit reviewer notes on native features. Android is largely free once iOS works.

---

## Is a store listing important for B2C?

**For:** App Store search ("part 107 practice test"); phone-shaped study + push; reviews as trust for a paid course; competitor apps would make absence a comparison liability (verify Pilot Institute / Drone Launch / DARTdrones).

**Against prioritizing now:** one-time purchase + short study window → weak retention economics vs subscription apps; B2B school licenses get no store benefit; mobile web already works; a mediocre listing attracts one-star reviews.

**Resolve with data:** ship PWA first; if installs and push engagement are strong, Capacitor is an easy call. If weak, a store listing was not the missing piece.

---

## Discoveries — remaining open

| # | Question | Why it matters | Status |
|---|----------|----------------|--------|
| **D1** | App Store external purchase links (US) | Native economics | **Answered Jul 2026** — 0% commission on qualifying link-outs under current contempt remedy; SCOTUS appeal pending; re-verify at submit time. See § Store commission. |
| **D2** | Does offline lesson access change completion / retention? | Main argument for any app | Open — measure via PWA |
| **D3** | Do push notifications lift completion enough to justify the permission prompt? | Declined prompt is permanent per device | Open |
| **D4** | Can free Unit 1 work offline for anonymous users? | PWA as top-of-funnel | Open |

---

## Related

- [`analytics-and-attribution.md`](analytics-and-attribution.md) — platform accounts, pixel and CAPI setup
- [`docs/marketing/paid-acquisition.md`](../marketing/paid-acquisition.md) — budget plan and channel sequencing
- [`frontend-data.md`](frontend-data.md) — routes, layout, client data flow
- [`backend-data.md`](backend-data.md) — auth cookies/Bearer, media endpoints
- [`architecture.md`](architecture.md) — CloudFront, signed media, request paths
- [`docs/TODO.md`](../TODO.md) — sequenced build and discovery items (T18–T20, D1–D4)

*Update when store policy, PWA scope, offer price points, or the Capacitor/RN decision changes.*
