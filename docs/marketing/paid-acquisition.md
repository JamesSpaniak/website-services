# Paid acquisition — Drone Edge

Canonical reference for **paid media**: when to spend, what funnel shape to use, how to build trust and proof on cold traffic, and the 70/20/10 budget rule. Growth to date is organic (SEO/GEO + school outreach); this doc covers the paid layer that sits on top of it — **not** a replacement for it.

Positioning and claims: [`docs/sales/positioning.md`](../sales/positioning.md). Content truth rules apply to ad copy too: [`content-vision.md`](content-vision.md). Organic plan: [`seo-geo-strategy.md`](seo-geo-strategy.md). Tracking implementation: [`docs/tech/analytics-and-attribution.md`](../tech/analytics-and-attribution.md). Execution steps: [`workflows/marketing/paid-ads.md`](../../workflows/marketing/paid-ads.md).

**Decided (Jul 2026):** budget **$2,500** + owned drone equipment · measurement **GA4 + first-party** · **Meta ads first**, Google Search second · **no group funnel** — participate in existing communities · **no native mobile app** — a PWA instead ([`docs/tech/pwa-and-mobile-app.md`](../tech/pwa-and-mobile-app.md)).

---

## Readiness — do not spend yet

Paid traffic amplifies whatever the funnel already does. Today it would amplify an incomplete product. **These gates come first:**

| Gate | Why it blocks spend | Source |
|------|---------------------|--------|
| Part 107 video recordings shipped | 197 nodes, 0 with video. Cold traffic that lands on a text-only "course" bounces and the spend is gone. | [`TODO.md`](../TODO.md) P0 |
| Conversion events instrumented | Without `signup_completed` / `purchase_completed`, bidding algorithms have nothing to optimize toward and you cannot compute CAC. | [`TODO.md`](../TODO.md) S10 · [`analytics-and-attribution.md`](../tech/analytics-and-attribution.md) |
| Free Unit 1 preview + working join CTAs | The offer cold traffic responds to is "try it," not "buy it." | [`TODO.md`](../TODO.md) S3, S6 |
| Public pricing page | Hidden pricing kills paid conversion rates and raises support load. | [`TODO.md`](../TODO.md) S2 |
| Bundle SKU live in Stripe | Doubles affordable CAC; see unit economics below. | [`TODO.md`](../TODO.md) § Paid acquisition |
| Dead social links fixed | Footer `#` hrefs and empty profiles read as "abandoned company" to a stranger evaluating a purchase. | [`TODO.md`](../TODO.md) S7 |
| Consent banner | Required before non-essential pixels fire; Google Consent Mode v2 signals for EEA/UK. | [`analytics-and-attribution.md`](../tech/analytics-and-attribution.md) |

Order of operations: **finish the product → instrument the funnel → run a small B2B search test → only then consider paid social.**

---

## Unit economics — read before budgeting

Paid acquisition math differs sharply between the two motions, and this determines everything else in this doc.

| | B2C — $29 course ladder | B2B — schools / CTE |
|---|---|---|
| Order value | $29 per course, three courses planned (Part 107, Video & Photography, AI & Drones) | Thousands, multi-year renewal potential |
| Realistic paid CPA | Paid social rarely lands a $29 impulse purchase under $29 directly; optimize on the free signup instead | Cost per qualified consultation can justifiably run $100–400 |
| Sales cycle | Minutes | Months, committee-based, budget-cycle dependent |
| Optimize for | Free-preview signup (enough volume to train a bidder), not purchase | Cost per *qualified* consultation, not raw form fills |

### The three-course ladder changes the B2C math

With one $29 course there was no honest way to pay more than ~$28 for a customer. Three courses give a backend to sell into. **Modelled below — these are assumptions to validate with real data, not facts:**

| Input | Assumption | Note |
|-------|-----------|------|
| First purchase | $29 | Part 107 is the entry product |
| Course 2 attach | 20% | Unvalidated — measure it before trusting it |
| Course 3 attach | 10% | Unvalidated |
| Gross LTV | ~$38 | `29 + 0.20×29 + 0.10×29` |
| Stripe fees | ~$1.70 across ~1.3 transactions | 2.9% + $0.30 each |
| **Net LTV** | **~$36** | Break-even CAC |
| **Target CAC** | **~$18** | Break-even ÷ 2, leaves margin for content cost and refunds |
| **Target cost per free signup** | **~$5** | At an assumed 15% signup→purchase rate; the number Meta actually optimizes toward |

Two consequences:

1. **A bundle SKU is the highest-leverage economic change available, and it is a Stripe change, not a content change.** A three-course bundle at $69 raises AOV immediately, converts the attach-rate assumption into a known number at checkout time, and roughly doubles the CAC you can afford. The `PRO_UPGRADE` path already exists in the backend as admin-comp only — productizing it is a small amount of work with a large effect on every number above. Do this before scaling spend.
2. **B2B optimizes on a proxy, not a sale.** A school deal that closes four months later cannot train an ad algorithm. Feed the platform the consultation request and judge the sale offline. See offline conversion import in [`analytics-and-attribution.md`](../tech/analytics-and-attribution.md).

---

## Funnel shapes

Four patterns, in order of fit for Drone Edge today.

### 1. Content-to-offer (recommended first)

`Ad → existing article → retarget readers → offer page`

Run traffic to articles that already exist under `/articles` rather than to a purpose-built sales page. The article does the persuading; the retargeting ad makes the offer to people who already demonstrated interest.

Why this fits: it reuses assets already in the repo, it matches the "useful without the sale" principle, the same asset earns organic traffic in parallel, and the click is cheap because you're not competing on commercial-intent keywords. The cost is a longer measurable path — expect the first-click article to look "unprofitable" in platform reporting and judge it on the retargeting conversion.

### 2. High-intent search (B2B)

`Search ad → /schools or /schools/funding → /consultation → rep`

Narrow keyword set, exact/phrase match, small daily budget. Terms like *drone curriculum for schools*, *Part 107 curriculum CTE*, *drone program grant funding*. Volume is low, which is fine — low volume with high intent is the point.

Non-obvious risk: education keywords attract clicks from students, hobbyists, and competitors. Use negative keywords aggressively (*free*, *jobs*, *salary*, *license cost*, *DJI*) and treat a raw form fill as unqualified until the rep marks it otherwise.

### 3. Direct-response B2C (deferred)

`Ad → landing page → free Unit 1 → email nurture → $29`

Standard direct-response. Deferred until the economics above change. When it does open up, optimize the ad platform toward the *free unit signup*, and treat the $29 as a nurture-sequence conversion rather than an ad conversion.

### 4. Group funnel — **decided against for now**

---

## Video sales assets ("VSL")

A **VSL (video sales letter)** is a single video that carries the whole persuasion job normally done by a long sales page: hook → problem → why the usual solutions fail → mechanism → proof → offer → call to action. It is often paired with a **popup or gated player** — autoplay on landing, an exit-intent modal, or a player that hides the buy button until N minutes in.

### What applies to Drone Edge

| VSL element | Verdict | Reasoning |
|-------------|---------|-----------|
| One video doing the persuasion, on `/schools` | **Adopt** | A CTE director cannot bring a rep into a committee meeting, but they can forward a 5–8 minute chaptered walkthrough. This is the single highest-leverage video asset available. |
| Short product demo (60–90s) on the B2C offer page | **Adopt** | At $29 the objection is "is this real and will it get me through the exam," which a screen recording answers faster than any script. |
| Structured script (hook / problem / mechanism / proof / offer) | **Adopt the structure** | The skeleton is just good persuasive ordering. Use it; drop the hype register. |
| 20+ minute long-form VSL | **Skip** | Long VSLs earn their length at $200–2,000 price points where you must dismantle price resistance. A $29 impulse purchase does not have that resistance. |
| Autoplay popup / modal on page load | **Reject** | Autoplaying media over 3 seconds is a WCAG 1.4.2 failure, it damages LCP on a site whose entire strategy is organic search, and it directly contradicts "practitioner, not marketer" in [`content-vision.md`](content-vision.md). |
| Hidden buy button / forced watch time | **Reject** | A dark pattern. Also poisons B2B — institutional buyers treat it as a credibility signal against you. |

**The best sales video we have is the product.** A free Unit 1 that actually teaches something outperforms any video *about* the course. Prioritize the P0 recordings over producing a separate sales video.

If a video does gate content, use an inline poster image with click-to-play, captions burned or provided as a track (also closes the WCAG 1.2.2 gap already in the backlog), and a visible transcript — the transcript is GEO-useful and the video is not.

---

## Group funnel — not doing this

A **group funnel** replaces the landing page with a community as the primary conversion asset: `ad → join a free community (Facebook Group / Discord / Skool) → nurture through posts and Q&A → offer inside the group`. It works because joining is a lower-friction ask than buying and members generate proof for each other.

**Decision: skip it.** Two reasons. It is a staffing commitment rather than a media spend — a named owner posting several times a week for months before it compounds — and a group with four members is *negative* proof, advertising that nobody bought. It also does not fit the B2B side at all; a curriculum director will not join a Facebook group to evaluate a purchase.

**Instead: participate in communities that already exist.** Zero cost, immediate, and it is already the community-engagement line in [`seo-geo-strategy.md`](seo-geo-strategy.md). Target the places Part 107 questions actually get asked — the drone and Part 107 subreddits, drone Discord servers, and pilot Facebook groups — answering questions substantively without pitching, per the "useful without the sale" principle in [`content-vision.md`](content-vision.md).

Two things this buys beyond traffic: it is the cheapest source of real language for ad copy (the exact phrasing people use to describe their confusion), and it surfaces the recurring questions that make good articles and good ad hooks. Revisit an owned community only if the same questions keep recurring and there is a cohort of actual students to seed it with.

Rules: use a real named account, disclose the affiliation, never astroturf, and respect each community's self-promotion rules. Getting banned from the main drone subreddit is an unrecoverable own goal in a niche this small.

---

## Long-form content and proof

### Long-form as the pre-sell

Cold traffic does not buy from an ad; it buys after something changed its mind. Long-form — an in-depth article, a long landing page, or a chaptered video — is the asset that does that work before the offer appears. Drone Edge already produces exactly this shape of content for SEO, which is why funnel pattern 1 above is the natural first paid test rather than a from-scratch sales page.

Practical rules:

- **Message match.** The ad's promise must be the page's H1. A mismatch shows up as a high bounce rate that looks like a targeting problem and is actually a copy problem.
- **One CTA, placed after value delivered** — same rule as [`content-vision.md`](content-vision.md) principle 4.
- **Long-form is not padding.** Length that does not raise conviction lowers conversion.

### Proof, ranked by what we can actually show today

| Tier | Proof type | Available now? |
|------|-----------|----------------|
| 1 | **Demonstration** — screen recordings, real sample questions, the free unit, the manager dashboard | **Yes.** This is the entire proof arsenal available today and it is stronger than most people assume. |
| 2 | **Authority** — named instructors, real Part 107 credentials, drone-community background | **Yes**, and underused. |
| 3 | **Social** — learner testimonials, pass stories, reviews | **No** — blocked until there are students (**S4**). |
| 4 | **Institutional** — school logos, case study, standards alignment artifacts | **No** — blocked on the first pilot ([`TODO.md`](../TODO.md) P2). |

**Ads must not manufacture tiers 3 and 4.** No pass rates, no "trusted by X schools," no invented reviews — the prohibited-claims list in [`positioning.md`](../sales/positioning.md) applies to every ad, thumbnail, and headline. This constraint is not a handicap: demonstration ads (show the actual product) reliably outperform testimonial ads on cold traffic anyway.

### Trust mechanics on the landing surface

Paid traffic is strangers, and strangers audit before they buy. Everything below is a conversion lever, not decoration:

- Visible price and what is and is not included (FAA exam fee is **not** included — say so).
- A refund/access policy stated plainly.
- Real names and faces of who made the course.
- Working social profiles and a real contact path.
- Fast load and no layout shift — paid clicks are pre-paid, so a slow page burns money the organic version does not.
- No countdown timers, no fake scarcity, no "only 3 seats left." Institutional buyers are the audience most allergic to these, and they are the higher-value segment.

---

## The 70/20/10 rule

An allocation discipline for ad spend and creative production. It exists to solve one problem: teams either flog a single winning ad until it burns out, or scatter budget across novelty and never compound.

| Bucket | Share | What goes in it |
|--------|-------|-----------------|
| **70 — proven** | 70% of spend and creative volume | The concept that is currently working, run as **many minor variants**: new hook, new first three seconds, different thumbnail, headline swap, 9:16 vs 1:1, different sample question on screen. |
| **20 — adjacent** | 20% | Same offer, meaningfully different angle: a new audience segment, a new format, a different pain entry point (career-changer vs hobbyist-going-legal vs school-buyer). |
| **10 — exploratory** | 10% | Genuinely speculative: a new channel, a new offer construct, a contrarian message. Most of these fail. Their job is to produce the *next* 70. |

### How to actually run it

**The 70 is a concept, not an ad.** The most common failure is treating "70%" as permission to run one creative forever. Creative fatigue is real — frequency climbs, CTR decays, CPA drifts up. The defense is volume of near-identical variants around the proven concept, which also keeps the bidding algorithm supplied with fresh material without changing what is being tested.

**Judge each bucket on a different metric.** At any realistic spend level, a 10% slice will never reach statistical significance on purchases. Evaluate:

- **70** on the money metric — CPA, or cost per qualified consultation for B2B.
- **20** on the money metric, with a longer window and a looser threshold.
- **10** on *leading* indicators only — hook rate / 3-second views, CTR, cost per landing-page view. Asking a 10% test to prove itself on conversions is how teams conclude "experiments don't work."

**Write down the graduation rule before launching.** Without one, 70/20/10 silently becomes "spend 70% on whatever we launched with." Suggested defaults, tunable once there is data:

- A **10** whose leading indicator beats the current 70's benchmark over a defined window → promote to **20** with real budget.
- A **20** that hits the money metric → promote to **70**; the incumbent 70 concept demotes to 20.
- A **70** whose CPA drifts more than ~30% above its own trailing baseline → refresh creative first, then demote if refresh does not recover it.

**Below roughly $50/day, do not split three ways.** Ten percent of a small budget buys noise. Run 70/30 and take the exploratory slice out of *time* instead of budget — one experiment week per month at full budget produces a readable result where a permanent 10% slice never will.

**The 10 is not exempt from the truth rules.** Exploratory does not mean unapproved claims. Every variant, including throwaways, passes the same check against [`positioning.md`](../sales/positioning.md) and [`features.md`](../sales/features.md).

Operational cadence, naming, and the weekly review loop: [`workflows/marketing/paid-ads.md`](../../workflows/marketing/paid-ads.md).

---

## The first $2,500

Working budget: **$2,500 plus drone equipment already owned.** Decided channels: **GA4 for measurement, Meta ads first, Google Search second.**

**Frame this as a learning budget, not a growth budget.** $2,500 does not buy meaningful volume in any channel. What it buys is a validated cost-per-signup number, a creative library that tells you which hooks work, and the first cohort of real students — who are the source of the testimonials and pass stories currently blocking every proof-based ad you might want to run later. Judge it on whether you know more at the end, not on whether it returned a profit. It will not.

### Sequencing — do not run both channels at once

Two underpowered simultaneous tests produce two unreadable results. Run them back to back.

| Phase | Weeks | Spend | What happens |
|-------|-------|-------|--------------|
| **0 — Build** | 1–4 | **$0** | Accounts, instrumentation, consent, pixel/CAPI. Film and edit creative. Finish P0 course video. Ship the bundle SKU. |
| **1 — Meta test** | 5–10 | **~$900** (~$21/day) | B2C. Optimize `signup_completed` on the free unit. Target ~$5/signup. |
| **2 — Google Search test** | 11–16 | **~$900** (~$21/day) | B2B. Exact/phrase match CTE keywords → `/schools/funding`, `/schools/curriculum`. Optimize `consultation_submitted`. |
| **3 — Scale the winner** | 17+ | **~$500** | Whichever channel produced a readable, affordable conversion. |
| Reserve | — | **~$200** | Production sundries (lav mic, music licensing) and overage. |

Why Meta first despite B2B having better economics: the drone equipment is a real comparative advantage and it is a *video* advantage, which is Meta's native format. Google Search rewards keyword intent, not creative, so the gear buys nothing there. Running Meta first also produces the B2C students who unlock proof assets.

Why not spend it all: keep enough back to run the winner for a second cycle. A test that works and then stops for lack of budget has taught you something you cannot act on.

### Kill conditions specific to this budget

- Meta test reaches $400 with zero signups → stop, the offer or the landing page is wrong, not the targeting.
- Cost per signup stabilizes above ~$15 → the B2C economics do not close even with the bundle. Move remaining budget to B2B search.
- Either test cannot be measured in `audit_logs` → stop and fix the tracking before spending more.

---

## Creative production with owned equipment

The equipment removes the usual bottleneck, which means creative volume is a solved problem and the 70 bucket can be fed properly. Two constraints come first.

### Compliance — non-negotiable for a Part 107 educator

**Filming footage for the business is commercial drone operation and is itself subject to Part 107.** Every frame shipped in an ad must depict a legal, compliant operation. A drone-safety brand caught flying over people, beyond visual line of sight, or in controlled airspace without authorization has destroyed the only thing it sells.

For the "pretend safety" concepts specifically: film the **correct procedure**, not the hazard. If a shot requires depicting something unsafe — a fly-away, an airspace incursion, a close call — use animation, screen graphics, or a simulator rather than staging it. Staged unsafe footage gets stripped of its caption the moment someone screenshots it, and then it is just your brand flying badly.

Also: no faces of minors, no identifiable private property without permission, and no implication of FAA endorsement or affiliation.

### Concepts mapped to 70/20/10

The first round has no proven concept yet, so round one exists to *establish* the 70. Ship 5–6 variants of the demonstration concept and let the data pick.

| Bucket | Concept | Why it should work |
|--------|---------|--------------------|
| **70 (establish)** | **Demonstration.** A real sectional chart or sample question on screen — "Can you read this?" — cut against 3 seconds of aerial B-roll as the hook. Ends on the free unit. | Demonstration is the only proof tier available today, and it is genuinely the strongest on cold traffic. Volume of variants comes from swapping the question, the chart, the B-roll, and the hook line. |
| **20 (adjacent)** | **"Is it legal to fly for money?"** — the moment a hobbyist realizes they need certification. Same offer, different entry point. | Different pain, same product. Reaches people who don't yet know the term "Part 107." |
| **20 (adjacent)** | **Career-changer angle** — what a certificate actually lets you do and what it doesn't. | Matches the B2C ICP in [`positioning.md`](../sales/positioning.md); higher intent, smaller audience. |
| **10 (exploratory)** | **Safety procedure shorts** — pre-flight checklist, airspace check, correct response to a scenario. Filmed properly, no staged hazards. | Cheap to produce with owned gear, strong organic reach, and doubles as YouTube/Reddit content that costs nothing to distribute. |
| **10 (exploratory)** | **B2B classroom angle** — the manager dashboard and course structure, aimed at educators. | Tests whether Meta can reach CTE staff at all before committing search budget. |

### Reuse the footage everywhere

Ad creative is the expensive part; distribution is free. Every clip filmed should also go to YouTube (organic search and GEO value, per [`seo-geo-strategy.md`](seo-geo-strategy.md)), to the communities being participated in, and as supporting media inside articles. The safety shorts in particular are worth more as organic content than as ads — they compound, ads do not.

---

## Prohibited in paid creative

Everything in [`positioning.md`](../sales/positioning.md) § Claims, plus these paid-specific rules:

- No FAA pass rates, school counts, student counts, or grant eligibility guarantees — including in a "just testing" variant.
- No unreleased features shown as live (SSO/LTI, Video & AI tracks) until they ship.
- No implication of FAA endorsement, affiliation, or that the FAA exam fee is included.
- No autoplay-with-sound, exit-intent modals with countdowns, or fake urgency.
- No competitor pricing in creative unless verified that week — [`competitor-analysis.md`](../sales/competitor-analysis.md) Appendix A is a snapshot, not a live feed.
- No targeting minors. CTE audiences are reached through *educators*, not students.

---

## Success measures

- **Blended CAC from first-party data**, not the sum of platform-reported conversions — platforms each claim overlapping credit and the sum always exceeds reality.
- **Cost per qualified consultation** (rep-qualified, not raw form fill) for B2B.
- **Paid share of total acquisition** — if paid ever exceeds organic for B2C at a $29 price point, something is wrong with the economics, not right with the ads.
- **Creative throughput** — number of 70-bucket variants shipped per month. Low throughput is the usual root cause of rising CPA.

---

## Related

- [`docs/sales/positioning.md`](../sales/positioning.md) — ICP, messaging pillars, approved/prohibited claims
- [`docs/sales/packages.md`](../sales/packages.md) — offer ladder and price bands
- [`content-vision.md`](content-vision.md) — truth and voice rules; apply to ad copy
- [`seo-geo-strategy.md`](seo-geo-strategy.md) — the organic engine paid sits on top of
- [`docs/tech/analytics-and-attribution.md`](../tech/analytics-and-attribution.md) — pixels, conversion APIs, event taxonomy, platform accounts
- [`docs/tech/pwa-and-mobile-app.md`](../tech/pwa-and-mobile-app.md) — why Meta ads need no mobile app; PWA plan
- [`workflows/marketing/paid-ads.md`](../../workflows/marketing/paid-ads.md) — launch checklist and weekly 70/20/10 loop
- [`workflows/marketing/outreach-content-calendar.md`](../../workflows/marketing/outreach-content-calendar.md) — UTM convention, article specs

*Update when the offer ladder, price points, or readiness gates change materially.*
