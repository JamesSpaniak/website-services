# Analytics & attribution

How Drone Edge measures product usage, conversions, and ad performance — what exists today, what to add for paid media, and where the boundary sits between **marketing analytics** and **system telemetry (OpenTelemetry)**.

Strategy this serves: [`docs/marketing/paid-acquisition.md`](../marketing/paid-acquisition.md). Frontend data flow: [`frontend-data.md`](frontend-data.md). API surface: [`backend-data.md`](backend-data.md). Infra: [`architecture.md`](architecture.md). Mobile/app question: [`pwa-and-mobile-app.md`](pwa-and-mobile-app.md).

**Decided stack (Jul 2026):** **GA4** for platform reporting and Google Ads integration · **Meta Pixel + Conversions API** as the first paid channel · **Postgres `audit_logs` as the ledger of record** · **OpenTelemetry for ops only**. Sequenced build items live in [`docs/TODO.md`](../TODO.md) § Paid acquisition.

---

## Current state

| Layer | What exists | Where |
|-------|-------------|-------|
| Client events | `page_view`, `article_view`, `course_view`, `exam_start`, `exam_submit` via `sendBeacon` → `POST /api/analytics/event` | `drone/src/app/lib/analytics.ts`, `ui/components/page-analytics.tsx` |
| Event ingestion | `AnalyticsController` → `AnalyticsService` → OpenTelemetry **counters** | `backend/src/analytics/` |
| Telemetry export | OTLP → Grafana Cloud (traces + metrics), auto-instrumentation loaded via `--require ./dist/src/telemetry.js` | `backend/src/telemetry.ts`, `terraform/ecs_backend.tf` |
| Durable product events | Postgres `audit_logs` — `REGISTER`, `LOGIN`, `COURSE_STARTED`, `UNIT_COMPLETED`, `COURSE_COMPLETED`, `COURSE_PURCHASED`, `PRO_UPGRADE` | `backend/src/audit/` |
| Purchase truth | Stripe `payment_intent.succeeded` webhook → `PurchaseService.purchaseCourse` → audit `COURSE_PURCHASED` | `backend/src/purchases/purchase.service.ts` |
| Optional third party | Umami script, gated on `NEXT_PUBLIC_UMAMI_WEBSITE_ID` (not set in Terraform) | `drone/src/app/layout.tsx` |
| Logging | Winston → CloudWatch in prod; frontend warn/error → `POST /logs` | `backend/src/main.ts`, `drone/src/app/lib/logger.ts` |

**Not present:** GA4, GTM, Meta Pixel, PostHog, Segment, Mixpanel, Plausible, Hotjar, Clarity, any consent banner, any server-side conversion API, any click-ID capture.

### Known defects to fix before building on this

| Issue | Detail |
|-------|--------|
| Exam events dropped | `analytics.ts` sends `exam_start` / `exam_submit` but `AnalyticsController` has no case for them. |
| `EXAM_SUBMITTED` never written | The audit enum value exists and admin SQL aggregates it, but no code path calls `auditService.log(..., EXAM_SUBMITTED)`. |
| Funnel gaps | No `signup_started`, `checkout_started`, `purchase_completed`, or `consultation_submitted` client events (**S10**). |
| Open ingestion | `POST /analytics/event` and `POST /logs` are unauthenticated (**M4**). Fine for page views, unacceptable once conversion events drive ad bidding — spoofed conversions poison the bidding model. |

---

## Accounts and platform setup

Everything below is free except ad spend. Create them in this order — several depend on the one above.

### Google

| # | Account | Purpose | Notes |
|---|---------|---------|-------|
| G1 | **Google Analytics 4** property + web data stream | Platform reporting, Google Ads audience/conversion sharing | Note the measurement ID (`G-XXXXXXXX`) → `NEXT_PUBLIC_GA_MEASUREMENT_ID` |
| G2 | **Google Search Console** | Organic ranking data; link to GA4 | May already exist for the SEO work |
| G3 | **Google Ads** account | Search campaigns (phase 2) and the conversion tag | Create early even with zero spend — conversion history accrues |
| G4 | Link GA4 ↔ Google Ads ↔ Search Console | Enables conversion import and the organic/paid join | Three separate links, all in GA4 admin |
| G5 | **YouTube channel** | Host drone footage; organic search and GEO value | Same Google account; see [`docs/marketing/seo-geo-strategy.md`](../marketing/seo-geo-strategy.md) |

### Meta

| # | Account | Purpose | Notes |
|---|---------|---------|-------|
| M1 | **Facebook Page** | Mandatory — ads run *from* a Page | Cannot be skipped |
| M2 | **Meta Business Manager** (`business.facebook.com`) | Owns the Page, ad account, dataset, and domain | Create the business first, then claim assets into it |
| M3 | **Instagram business account**, linked to the Page | Instagram placements | Best-performing placement for vertical drone video |
| M4 | **Ad account** + payment method | Spending | Set an account-level spend cap as a safety net |
| M5 | **Dataset / Pixel** (Events Manager) | Browser-side events | Note the pixel ID → `NEXT_PUBLIC_META_PIXEL_ID` |
| M6 | **Domain verification** for `thedroneedge.com` | Required to configure Aggregated Event Measurement and to own your event priority | **Route 53 is Terraform-owned** — add the TXT record in `terraform/`, never in the AWS console |
| M7 | **Meta for Developers app** + System User + CAPI token | Server-side Conversions API | This is the only "app" Meta needs — **not** a mobile app. See [`pwa-and-mobile-app.md`](pwa-and-mobile-app.md) |
| M8 | **Aggregated Event Measurement** — rank 8 web events | Post-ATT iOS measurement; only the top-priority event reports for opted-out iOS users | Rank `purchase_completed` → `signup_completed` → `preview_started` → `checkout_started` → rest |

### Other

| # | Account | Purpose | Notes |
|---|---------|---------|-------|
| O1 | **LinkedIn company Page** | B2B credibility; CTE buyers check | Free; ads there are expensive and out of scope |
| O2 | Reddit / Discord identities for community participation | Named, disclosed accounts | See [`docs/marketing/paid-acquisition.md`](../marketing/paid-acquisition.md) § Group funnel |
| O3 | Stripe | **Already exists** | Needs a bundle SKU; see the unit economics section of the paid doc |

**Credential handling:** CAPI tokens, Google Ads developer tokens, and any API keys go into Secrets Manager through Terraform, following the `grafana_otel_headers` pattern in `terraform/secrets_stripe.tf`. Public IDs (GA4 measurement ID, Meta pixel ID) are `NEXT_PUBLIC_*` build args in `drone/Dockerfile` and `terraform/ecs_frontend.tf` — remember these are **inlined at Docker build time**, so a change requires a rebuild, not just a task restart.

---

## The three-layer model

Keep these separate. Most analytics messes come from asking one system to do all three jobs.

| Layer | Job | System | Cardinality |
|-------|-----|--------|-------------|
| **Ledger** | Truth. CAC, LTV, cohort retention, refund-adjusted revenue. Joinable to a user row. | Postgres (`audit_logs` + a marketing attribution table) | High — user IDs, click IDs, campaign IDs |
| **Feed** | Train ad bidding algorithms and get platform-side reporting. Not a source of truth. | Google Ads / Meta / GA4 conversion APIs | Managed by the platform |
| **Ops** | Is the funnel *working*? Latency, error rate, checkout failure rate, alerting. | OpenTelemetry → Grafana Cloud | Low — bounded label sets only |

### Where OpenTelemetry does and does not belong

OTel is infrastructure telemetry. It is the wrong tool for marketing attribution, and the current use of OTel counters for page views is already brushing against that line.

**Do not** put marketing dimensions on OTel metrics. A counter with `path`, `userId`, `gclid`, or `utm_campaign` as attributes creates one time series per unique value. That is unbounded cardinality: Grafana Cloud bills on active series, and the query performance degrades long before the bill does. You also cannot answer the questions that matter — "what fraction of users who saw the preview bought within 14 days" is a join over rows, not an aggregate over counters.

**Do** use OTel for the ads-adjacent job it is genuinely good at: **detecting that you are burning ad spend into a broken funnel.** Concretely worth wiring:

- Alert if `purchase_completed` is zero for N hours during a period with active spend.
- Alert on Stripe webhook handler error rate or `payment_intent` failure ratio.
- Alert on p95 latency or 5xx rate for `/courses/[courseId]` and the registration endpoint — the two pages paid traffic lands on.
- Track checkout-step drop-off as a *health* ratio, not as an attribution report.

A broken checkout that goes unnoticed for a day costs more than any attribution refinement will ever recover. That is the real OTel win in this space.

---

## Own data vs. Google Analytics

Not an either/or — they answer different questions, and one of them is non-optional if you run ads.

**You cannot skip platform conversion tracking.** Google Smart Bidding and Meta's optimizer are trained on conversions *you* report to them. Withhold that and you are paying for machine-learning-driven placement while starving the machine learning. This is the single biggest lever in paid media and it is not something a first-party warehouse replaces.

**You should not trust platform reporting as truth.** Every platform claims credit under its own attribution window. Sum the "conversions" across Google, Meta, and GA4 and you will exceed actual Stripe revenue, often substantially.

Recommended split:

| Question | Answer from |
|----------|-------------|
| What should the bidder optimize toward? | Conversions sent to Google/Meta via pixel + server API |
| What did a customer actually cost? | Postgres — `audit_logs.COURSE_PURCHASED` joined to captured click ID / campaign |
| Which channel deserves next month's budget? | Postgres, cross-checked against platform reporting for direction only |
| How is organic search doing? | Search Console (+ GA4 if added, for the Search Console join) |
| Is the funnel healthy right now? | OTel / Grafana alerts |

**On GA4 specifically — decided, we are adding it.** Its value is the Google Ads and Search Console integrations rather than its own reporting UI. Implement with `@next/third-parties/google` (`GoogleAnalytics`), gate it behind consent, and load it `afterInteractive` so it does not touch LCP on a site whose strategy is organic search. Treat its numbers as directional: when GA4 and `audit_logs` disagree about revenue, `audit_logs` is right.

---

## How much does being technical actually buy you?

Honest sizing, because this is easy to over-invest in.

**Where the real wins are, in order:**

1. **Server-side conversions off the Stripe webhook.** Browser pixels are lossy — Safari ITP caps JavaScript-set cookies at 7 days, ad blockers remove 10–30% of a technical audience, and iOS ATT suppresses app-sourced signal. A conversion reported server-side from an authoritative purchase event recovers a large share of that loss *and* is more accurate than the browser could ever be. This is worth doing well.
2. **Durable click-ID capture.** `gclid` / `gbraid` / `wbraid` / `fbclid` / `msclkid` captured on first landing and persisted server-side survives the session, the device switch, and the ad blocker. Without it, no offline conversion import is possible.
3. **Offline conversion import for B2B.** A school deal closes months after the click. Uploading the eventual won deal back to Google Ads against the stored `gclid` is how you teach the bidder that one lead type is worth 50x another. Very few competitors in this space do it.
4. **Funnel-breakage alerting.** Cheap to build, immediately valuable.

**Where the technical advantage is small:**

- **At low spend, none of this moves the needle.** Below roughly $50–100/day the bidder has too few conversions to model anything sophisticated; correct conversion *definition* and adequate volume matter far more than attribution fidelity. Do not build a warehouse before spending the first $2,000.
- **Custom attribution modeling** (multi-touch, MTA) is not worth it at this scale. Blended CAC — total spend divided by new customers, from Postgres — is more honest than any model you would build.
- **Self-hosted analytics** duplicates what `audit_logs` already gives you.

Being technical here is a genuine edge, but the edge is *signal quality into the platforms*, not dashboards. Build items 1–4 and stop.

---

## Event taxonomy

One `track()` abstraction in the frontend, extending the existing `analytics.ts`, fanning out to the first-party endpoint and — consent permitting — the ad pixels, with a shared `eventId` for deduplication.

| Event | Fires | Layer | Notes |
|-------|-------|-------|-------|
| `page_view` | Route change | Ledger, Ops | Exists |
| `article_view` | Article page | Ledger | Exists |
| `course_view` | Course page | Ledger, Feed | Exists; useful as a Meta `ViewContent` |
| `signup_started` | Register form focus/submit | Ledger, Feed | **Missing** (S10) |
| `signup_completed` | `POST /auth/register` 2xx | Ledger, Feed | **Missing** — the primary B2C optimization event |
| `preview_started` | First free-unit lesson opened | Ledger, Feed | **Missing** — best proxy for B2C intent |
| `checkout_started` | Payment intent created | Ledger, Feed | **Missing** |
| `purchase_completed` | Stripe webhook success | Ledger, **Feed server-side** | Audit row exists; not reported to platforms |
| `consultation_submitted` | `/consultation` form | Ledger, Feed | **Missing** — the primary B2B optimization event |
| `consultation_qualified` | Rep marks lead qualified | Ledger, Feed (offline import) | **Missing** — the event that makes B2B bidding work |
| `exam_start` / `exam_submit` | Exam player | Ledger | Sent today but **dropped by the backend** |

Every event carries a client-generated `eventId` (UUID). The browser pixel and the server-side conversion both send it so the platform deduplicates rather than double-counting.

---

## Click ID and campaign capture

The deployment already makes this easy: Next.js SSR on ECS behind CloudFront with a same-origin `/api` proxy. That means first-party server-side capture with no third-party tagging proxy needed.

Design:

1. **Capture in `drone/src/middleware.ts`.** It already runs site-wide for the `www` → apex redirect. On a request carrying any of `gclid`, `gbraid`, `wbraid`, `fbclid`, `msclkid`, `ttclid`, or `utm_*`, set a first-party attribution cookie if one is not already present (first-touch wins; do not overwrite).
2. **Set it `HttpOnly`, `Secure`, `SameSite=Lax`, ~90 day max-age.** Server-set cookies are not subject to the ITP 7-day cap that applies to `document.cookie`, which is precisely the point.
3. **Read it server-side** on registration, checkout, and consultation submission; persist to a `marketing_attribution` row keyed by user (and by anonymous ID pre-signup).
4. **Never put click IDs on OTel attributes** — see cardinality above.

Extend the existing outreach UTM convention rather than inventing a second one:

```
?utm_source={google|meta|linkedin}&utm_medium=cpc&utm_campaign={campaign-id}&utm_content={creative-id}&utm_term={keyword}
```

Existing outreach convention (`utm_medium=email`) stays as-is: [`workflows/marketing/outreach-content-calendar.md`](../../workflows/marketing/outreach-content-calendar.md).

---

## Server-side conversions

The authoritative purchase signal is `PurchaseService.purchaseCourse`, reached from the Stripe `payment_intent.succeeded` webhook (and the `confirm-payment` reconciliation fallback). Fire platform conversions from there, not from the browser.

| Platform | Mechanism | Match keys |
|----------|-----------|------------|
| Meta | Conversions API (CAPI) | Hashed email, `fbclid`/`_fbp`, IP, user agent, `eventId` for dedupe |
| Google Ads | Enhanced Conversions for Leads, or offline conversion import | Stored `gclid`/`gbraid`/`wbraid`, hashed email |
| GA4 (if added) | Measurement Protocol | `client_id`, `session_id` |

Implementation notes specific to this codebase:

- Fire **after** the DB transaction commits, and make it idempotent — the Stripe webhook can be redelivered, and `confirm-payment` can fire for the same purchase. Key on the purchase/audit row ID so a retry does not double-report.
- Do it **out of band** (queue or fire-and-forget with logging). A Meta API timeout must never fail a Stripe webhook — a non-2xx response triggers Stripe retries and can wedge fulfillment.
- Hash PII with SHA-256 before it leaves the backend. Never log the raw email alongside the conversion payload (**L1** — PII in logs is already an open finding).
- Store API credentials in Secrets Manager via Terraform, matching how `grafana_otel_headers` is handled in `terraform/secrets_stripe.tf`. Do not add them to the ECS task definition as plaintext env.

For B2B, the valuable upload is not the form fill — it is `consultation_qualified` and eventually the won deal, imported against the stored `gclid` with the actual deal value.

---

## Consent and privacy

There is no consent banner today. One is required before any non-essential pixel ships.

- **Default to denied.** Implement Google Consent Mode v2 with `ad_storage`, `ad_user_data`, `ad_personalization`, and `analytics_storage` denied until the user acts. This is a Google requirement for EEA/UK traffic, and the default-denied posture is the right one for a US-primary education business regardless.
- **First-party product analytics can run on legitimate interest** as long as it stays non-identifying pre-login; ad pixels cannot.
- **Schools are a sensitive buyer.** Districts ask about student data handling during procurement. Heavy third-party tracking on `/schools` and course pages is a procurement liability, not just a privacy one. Consider scoping ad pixels to marketing surfaces and keeping the authenticated learning experience pixel-free.
- Update `drone/src/app/privacy/page.tsx` in the same session as any pixel change, and follow [`legal-and-privacy-site-sync.md`](legal-and-privacy-site-sync.md).
- No targeting or profiling of minors. CTE reach goes through educators.

---

## Implementation order

Sequenced so each phase is independently useful and nothing is built before it is needed. **Numbered task rows with owners and status live in [`docs/TODO.md`](../TODO.md) § Paid acquisition** — this section is the shape, that is the tracker.

**Phase 0 — accounts**
0. Everything in the accounts tables above. Free, roughly half a day, blocks all later phases.

**Phase 1 — close the measurement gaps (do regardless of ads)**
1. Handle `exam_start` / `exam_submit` in `AnalyticsController`; write the `EXAM_SUBMITTED` audit row.
2. Add `signup_started`, `signup_completed`, `checkout_started`, `purchase_completed`, `consultation_submitted` to the client tracker and audit enum (**S10**).
3. Tighten `POST /analytics/event` and `POST /logs` (**M4**) before conversion events exist to spoof.
4. Grafana alerts on zero-purchase windows and Stripe webhook error rate.

**Phase 2 — attribution plumbing (before the first ad dollar)**
5. Consent banner + Consent Mode v2 defaults.
6. Click-ID / UTM capture in middleware → first-party cookie → `marketing_attribution` table.
7. GA4 via `@next/third-parties/google` and the Meta Pixel, both consent-gated and `afterInteractive`, sharing one `eventId` per event with the server-side call.

**Phase 3 — server-side signal (once spend is live)**
8. Meta CAPI off the Stripe webhook, idempotent and out of band.
9. Google Ads conversion tag / Enhanced Conversions, and offline conversion import for B2B qualified leads and won deals.

**Phase 4 — reporting**
10. Blended CAC query over `audit_logs` + `marketing_attribution`; surface in the admin analytics tab.

---

## Related

- [`docs/marketing/paid-acquisition.md`](../marketing/paid-acquisition.md) — why we spend, budget plan, funnel shapes, 70/20/10
- [`pwa-and-mobile-app.md`](pwa-and-mobile-app.md) — the Meta "app" clarification and PWA plan
- [`workflows/marketing/paid-ads.md`](../../workflows/marketing/paid-ads.md) — campaign launch and optimization loop
- [`frontend-data.md`](frontend-data.md) — client analytics module and layout wiring
- [`backend-data.md`](backend-data.md) — analytics, audit, and purchase endpoints
- [`architecture.md`](architecture.md) — CloudFront/ALB request paths, secrets ownership
- [`legal-and-privacy-site-sync.md`](legal-and-privacy-site-sync.md) — privacy copy sync
- [`docs/TODO.md`](../TODO.md) — S10 funnel analytics, M4 open ingestion, L1 PII in logs

*Update when analytics events, pixels, consent behavior, or conversion APIs change.*
