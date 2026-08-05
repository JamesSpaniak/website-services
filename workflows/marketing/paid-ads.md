# Paid ads workflow

Ordered steps to launch and run a paid campaign. Strategy and rationale (why we spend, funnel shapes, unit economics, the 70/20/10 rule): [`docs/marketing/paid-acquisition.md`](../../docs/marketing/paid-acquisition.md). Tracking implementation: [`docs/tech/analytics-and-attribution.md`](../../docs/tech/analytics-and-attribution.md).

**Paid is not live today.** Run the pre-flight gate first — if any row fails, the answer is to fix the product or the instrumentation, not to launch anyway.

---

## 1. Pre-flight gate

Verify all of these before creating a single campaign.

| Check | How to verify |
|-------|---------------|
| Landing page for this campaign is complete and fast | Load it on mobile; check LCP in Search Console / Lighthouse |
| Conversion event for this campaign's goal fires and is visible in the ledger | Trigger it manually, confirm the `audit_logs` row |
| Consent banner live; pixels default-denied | Load the page with devtools open, confirm no ad request before consent |
| Click-ID capture working | Load a page with `?gclid=test123`, confirm the attribution cookie is set |
| Conversion action configured in the ad platform and receiving test events | Platform's tag/event diagnostics screen |
| Budget cap and a stop-loss number agreed | Written in the campaign row of the tracker |
| Every claim in the creative verified | [`docs/sales/features.md`](../../docs/sales/features.md) · [`docs/sales/positioning.md`](../../docs/sales/positioning.md) |
| Negative keyword list drafted (search campaigns) | Start from the list in step 3 |

---

## 2. Define the campaign

Answer these in writing before building anything. If you cannot answer #2 and #3 in one sentence each, do not launch.

1. **Motion** — B2C or B2B? They have different economics; do not mix them in one campaign.
2. **Optimization event** — the single event the platform bids toward. B2C → `signup_completed` or `preview_started`. B2B → `consultation_submitted`. Never `purchase_completed` at low volume; the bidder needs 30+ conversions/month to learn.
3. **Target cost per that event** — derived from the unit economics table in [`paid-acquisition.md`](../../docs/marketing/paid-acquisition.md), not from a wish.
4. **Stop-loss** — the spend figure at which the campaign pauses if it has produced zero conversions.
5. **Bucket** — is this a **70**, **20**, or **10**? Record it; the review loop treats them differently.

---

## 3. Build

### Naming convention

Keep it parseable so reporting can be grouped without manual cleanup:

```
{motion}_{channel}_{funnel}_{bucket}_{yyyy-mm}
```

Examples: `b2b_gads_search-cte_70_2026-08` · `b2c_meta_article-retarget_10_2026-08`

Ad set / creative level appends the variant: `..._hook-a-thumbnail-blue`.

### UTM tags

Extends the outreach convention in [`outreach-content-calendar.md`](outreach-content-calendar.md) — do not invent a second scheme:

```
?utm_source={google|meta|linkedin|bing}
&utm_medium=cpc
&utm_campaign={campaign-name-from-above}
&utm_content={creative-id}
&utm_term={keyword}
```

Use the platform's auto-tagging for click IDs (`gclid` etc.) in addition to UTMs — they serve different systems.

### Search campaign defaults (B2B)

- Exact and phrase match only to start. Broad match burns small budgets.
- Seed negatives: `free`, `jobs`, `salary`, `how to become`, `dji`, `repair`, `insurance`, `near me`, `used`, `mavic` — plus any competitor names you do not want to pay for.
- Location: US only (the product's regulatory scope is US — see [`content-vision.md`](../../docs/marketing/content-vision.md)).
- Landing page must match the query intent: funding queries → `/schools/funding`, curriculum queries → `/schools/curriculum`.

### Creative volume

Launch the 70 bucket with **at least 4–6 variants of the same concept** (different hook, thumbnail, first three seconds, headline, aspect ratio). One ad is not a campaign; it is a single data point that will fatigue.

---

## 4. Launch

1. Set the daily budget at the level you are willing to spend for two full weeks. Changing budgets mid-learning resets the platform's learning phase.
2. Launch and **do not touch anything for 7 days** unless the stop-loss trips or something is factually broken. Early-days CPA is noise.
3. Same day: confirm conversions are arriving in *both* the platform and `audit_logs`. If the platform shows conversions the ledger does not, the tracking is double-firing or the pixel is counting the wrong thing.
4. Log the campaign in the tracker: name, bucket, budget, optimization event, target CPA, stop-loss, launch date.

---

## 5. Weekly loop (70/20/10)

Every week, roughly 30 minutes.

**Step 1 — Read the ledger first, the platform second.** Pull actual new customers or qualified consultations from `audit_logs` for the period. Platform-reported conversions will be higher; that difference is expected, not a bug.

**Step 2 — Judge each bucket on its own metric.**

| Bucket | Metric | Action if it wins | Action if it loses |
|--------|--------|-------------------|--------------------|
| **70** | CPA / cost per qualified consultation | Ship 2–4 more minor variants of the winning concept | CPA drifted >30% above its own trailing baseline → refresh creative before demoting |
| **20** | Same money metric, longer window, looser threshold | Promote to 70; demote the incumbent 70 concept to 20 | Kill or iterate the angle once, then kill |
| **10** | **Leading indicators only** — hook rate / 3s views, CTR, cost per landing-page view | Promote to 20 with real budget | Kill without ceremony; that is the job |

Never evaluate a 10 on purchases. The slice is too small to ever reach significance and you will wrongly conclude that experimentation does not work.

**Step 3 — Refill the buckets.** Every kill or promotion leaves a hole. Queue the replacement in the same session so the split does not silently collapse into "100% incumbent."

**Step 4 — Check funnel health, not just ad metrics.** Rising CPA with flat CTR usually means the landing page or checkout broke, not the ads. Check the Grafana alerts and the conversion-rate-by-step figures before touching bids.

**Budget floor:** below roughly $50/day, do not run three buckets in parallel. Run 70/30 and take the exploratory slice out of *time* — one experiment week per month at full budget, rather than a permanent 10% slice that only buys noise.

---

## 6. Monthly review

1. Compute **blended CAC** from the ledger: total paid spend ÷ new customers (or qualified school leads) that month. Compare against the unit-economics targets.
2. Compare blended CAC to organic. If paid is materially worse and there is no backend product to sell, cut spend — that is the correct answer, not a failure.
3. Review the 70/20/10 split actually achieved vs. intended. Drifting toward 90/10/0 is the normal failure mode.
4. Update the creative library: archive fatigued creative, note which hooks worked and why.
5. B2B: import qualified leads and won deals back to the platform as offline conversions against the stored `gclid`.
6. Refresh negative keyword lists from the search-terms report.

---

## 7. Kill criteria

Pause immediately, no debate, if any of these are true:

- Stop-loss spend reached with zero conversions.
- A claim in live creative cannot be verified against [`features.md`](../../docs/sales/features.md).
- The landing page or checkout is erroring (Grafana alert, or manual check).
- Search terms report shows the majority of spend going to irrelevant intent.
- Conversions appear in the platform but not in `audit_logs` — the measurement is wrong and every decision made on it will be wrong too.

---

## Do not

- Do not launch before the pre-flight gate passes.
- Do not run ads to a page with incomplete course content.
- Do not invent pass rates, school counts, student counts, or grant guarantees — including in a throwaway 10-bucket test. See [`positioning.md`](../../docs/sales/positioning.md) § Claims.
- Do not use autoplay video popups, exit-intent countdowns, or fake scarcity. See [`paid-acquisition.md`](../../docs/marketing/paid-acquisition.md) § Video sales assets.
- Do not target minors; CTE audiences are reached through educators.
- Do not change budgets or optimization events mid-learning-phase.
- Do not report platform-summed conversions as revenue to anyone.
- Do not put click IDs or campaign IDs on OpenTelemetry metric attributes.

---

## Related

- [`docs/marketing/paid-acquisition.md`](../../docs/marketing/paid-acquisition.md) — strategy, funnel shapes, proof, 70/20/10 rationale
- [`docs/tech/analytics-and-attribution.md`](../../docs/tech/analytics-and-attribution.md) — event taxonomy, click-ID capture, server-side conversions
- [`outreach-content-calendar.md`](outreach-content-calendar.md) — UTM convention, article specs, priority queue
- [`content-and-seo.md`](content-and-seo.md) — organic publishing cadence
- [`docs/sales/positioning.md`](../../docs/sales/positioning.md) — approved and prohibited claims
- [`docs/sales/packages.md`](../../docs/sales/packages.md) — offer ladder and price bands
