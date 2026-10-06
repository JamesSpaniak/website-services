# Launch website plan — Oct 2026

Build plan for the website, sales and money-model work needed before the event announcements (**Oct 8**, **Oct 16**) and the Boston talk (**Oct 23–25**), with the full public launch targeted for **January 2027**.

**Out of scope here:** course content (Part 107 recordings, images, question fixes, Drone Building units) and article writing/rewrites. Those stay in [`../TODO.md`](../TODO.md) P0/P1.

**Related:** [`../TODO.md`](../TODO.md) · [`../sales/money-model.md`](../sales/money-model.md) · [`analytics-and-attribution.md`](analytics-and-attribution.md) · [`stripe-sandbox-test-plan.md`](stripe-sandbox-test-plan.md) · [`../marketing/boston-fundraiser-keynote-2026.md`](../marketing/boston-fundraiser-keynote-2026.md)

*Created 2026-10-03.*

---

## 1. What "ready" means on each date

| Date | Who arrives | The site must… |
|------|-------------|----------------|
| **Oct 8** — event announcement 1 | Hackathon participants, curious clicks | Say only true things (no Video/AI tracks), have no dead links, capture an email from anyone not ready to buy, and record where visitors came from |
| **Oct 16** — event announcement 2 | Same audience, second touch | Show prices and what is included, take a launch promo code, have a refund policy, and measure signup → checkout → purchase |
| **Oct 23–25** — talk | Room + QR scans + first social posts | Take live payments end to end, have a talk landing page, alert us if purchases or webhooks break. **Code freeze Oct 21** |
| **Jan 2027** — launch | Paid ads, schools | Upsell/downsell ladder, email sequences, pixels, PWA (§ 6) |

---

## 2. Terms

| Term | Meaning here |
|------|--------------|
| **Email provider (ESP)** | A service built for bulk/marketing email (Kit, Mailchimp, Buttondown, Amazon SES). We send today through **Google Workspace SMTP relay** (`backend/src/email/email.service.ts`) from `donotreply@` / `support@thedroneedge.com`. That is right for one-to-one mail: verification, password reset, contact, receipts. It is the wrong pipe for newsletters: Gmail/Yahoo bulk-sender rules require one-click unsubscribe and a spam-complaint rate under 0.3%, Workspace caps daily sends, and complaints on a newsletter damage the reputation of the same domain that delivers password resets. **Decision for now:** store waitlist emails in our own database and send one confirmation through the existing relay. Pick an ESP on a subdomain (e.g. `news.thedroneedge.com`) **before the first newsletter**, not before Oct 8 (§ 3, E1). |
| **GA4** | Google Analytics 4 — Google's free website analytics (visitors, sources, conversions). Needed later to run Google Ads. We already have **our own first-party analytics** (`page_view`, `course_view`, `purchase_completed` into Postgres via `drone/src/app/lib/analytics.ts`), so GA4 is not required for the announcements. |
| **UTM** | Tags added to a link so we know which link brought a visitor, e.g. `thedroneedge.com/?utm_source=actionspace&utm_medium=email&utm_campaign=oct8-announce`. Every link we hand out (announcement emails, social bios, the talk QR code) gets its own tags. GA4 reads them automatically; our own analytics needs W5 to keep them. |

---

## 3. Decisions needed from you

| # | Decision | Recommendation | Needed by | Blocks |
|---|----------|----------------|-----------|--------|
| **E1** | Email provider (TODO **D7**) | **Decided Oct 3: Amazon SES** on `news.thedroneedge.com`, Terraform-managed, **built in batch 1** (§ 4 Email) | **Oct 3** (production-access request) | W3 confirmation, broadcasts, sequences |
| **E2** | Which social accounts to create | **Decided Oct 3:** LinkedIn company page + Instagram + YouTube. **X and GitHub icons dropped** | **Oct 6** | W4 |
| **E3** | Drone Building public framing | "Early access — January 2027", waitlist only, no price shown | **Oct 5** | W2 |
| **E4** | Video & AI track pages | Remove the home cards; keep the URLs but return a redirect to `/courses` (so old links don't 404) | **Oct 5** | W1 |
| **E5** | Pro on the pricing page (**MM2**) | Show Pro only if the $35/mo price is confirmed and the webhook (PA41) is live by Oct 14; otherwise "coming soon" with no price | **Oct 12** | X1 |
| **E6** | Bundle (**MM1**/**D10**) | Do not show a bundle at launch — only one course is purchasable | — | Nothing (removes T16 from this plan) |
| **E7** | Refund/access policy (**D9**) | **Decided Oct 3:** 30-day full refund if you completed the first 3 units + one practice exam but not more than half the course or the final exam; 14-day refund if not past free Unit 1; Pro cancel anytime, no partial months; lifetime access = for as long as Drone Edge offers the course; individual purchases only. Full page `/refunds`; `/pricing` shows short taglines ("Full refund available") | **Oct 12** | X2 |
| **E8** | Launch promo code | One code, e.g. `EDGE25` = 25% off a course **or** the first Pro month (coupon `duration: once`, no product restriction), expires Nov 30, no redemption cap — created Oct 6 2026: sandbox coupon `Ymo4gCpa`, live coupon `vKTFEcc2` (`promo_1UNZpM…`); separate code per channel only if you want per-channel numbers | **Oct 14** | X3 |
| **E9** | GA4 now or later (**D8** consent) | **Decided Oct 3: GA4 now** (X5) with a bottom-strip consent banner, **public marketing pages only** — never on course, learner, manager or admin routes (students may be minors; school data) | **Oct 12** | X5 |
| **E10** | School "starting at" price (B2B price bands) | **Decided Oct 3:** "Schools: starting at **$79/seat** — many options available, book a call" ([`packages.md`](../sales/packages.md)) | — | X1 |

---

## 4. Batch 1 — by Oct 8 (deploy by **Oct 7**)

Goal: honest, no dead ends, capture email, know the source.

> **Status 2026-10-03 — code complete, not deployed.** W1, W2, W3, W5, W6, W7, W8, Z1–Z5 built, plus **X1** (`/pricing` with refund taglines; full policy at `/refunds`, E7 decided) and **X6** (register signs in immediately; no verification before checkout) pulled forward from batch 2. Backend: 59 unit + 53 e2e tests pass (incl. `test/leads.e2e-spec.ts`). Frontend: `tsc`, lint, `next build` pass. `terraform plan` shows only the SES additions + a backend task-def replace. **Not done:** W4 (social accounts), Z6 (sequences → batch 2), register-form attribution (X4/T8). **Before W9:** set `marketing_postal_address` in `env/dev.tfvars`, request SES production access, apply (subscription off), deploy, then flip `ses_events_subscription_enabled = true` and apply again. Details per item: [`../TODO.md`](../TODO.md) rows S2, S3, S5, S6, S11, T7, L1.

| ID | Item | Where | Size | Notes |
|----|------|-------|------|-------|
| **W1** | **Remove Video & AI promises** — home track cards (`COURSE_TRACKS`), footer tagline ("aerial video & photography, and AI/STEM"), funding page "optional video and AI tracks", `/courses/tracks/video` + `/ai` → redirect to `/courses`; sitemap entries | `drone/src/app/page.tsx` · `ui/components/footer.tsx` · `schools/funding/page.tsx` · `courses/tracks/*` · `sitemap.ts` | 0.5 d | TODO **S11**, funding-claim row. Check `about` + `schools/curriculum` for the same claim |
| **W2** | **Drone Building early-access page** — `/courses/tracks/building`: what you build (3.5" kit, solder/pre-soldered), who it's for (schools, makers), "January 2027", waitlist form (W3). Home gets a Drone Building card in place of the two removed | `drone/src/app/courses/tracks/building/` · `page.tsx` | 0.5 d | Marketing copy only — no course payload. Source facts from the outline v3 + parts list v4 |
| **W3** | **Waitlist / lead capture** — `leads` table (`email`, `interest` [`building`, `part107`, `schools`, `newsletter`], `source_path`, `utm_*`, `consent_at`, `unsubscribed_at`, `created_at`, unique on email+interest); `POST /leads` (throttled, honeypot field, DTO validation); confirmation email via SES (Z4/Z5) with an unsubscribe link (Z3); admin list + CSV export; `lead_captured` product event | `backend/src/leads/` (new module + migration) · `drone/src/app/ui/components/waitlist-form.tsx` · admin tab | 1.5 d | TODO **S5** (capture half). Privacy page: add "waitlist email" use — see [`legal-and-privacy-site-sync.md`](legal-and-privacy-site-sync.md) |
| **W4** | **Social links** — real URLs in footer `SOCIAL_LINKS`, `json-ld.tsx` `sameAs`; delete or fix `ui/components/socials.tsx` (three `#` links incl. GitHub) | footer · `json-ld.tsx` · `socials.tsx` | 0.25 d | TODO **S7**. Blocked on E2 (accounts exist). If an account isn't ready, remove its icon — never ship `#` |
| **W5** | **First-touch UTM capture (first-party)** — middleware reads `utm_*` / `gclid` / `fbclid` / `ref` on landing, stores a first-party cookie (first touch wins, 90 d); attached to `page_view` properties, `POST /leads`, register | `drone/src/middleware.ts` · `lib/analytics.ts` · register flow | 0.5 d | Lite version of TODO **T7** (full **T8** `marketing_attribution` table later). Admin analytics: add a "visits/leads by utm_source" view or saved query in [`analytics-queries.md`](analytics-queries.md) |
| **W6** | **Header "Sign up"** next to Log in | header component | 0.1 d | Finishes TODO **S3** (hero CTAs already shipped) |
| **W7** | **Pre-traffic hardening** — Swagger `/api` off in prod, TypeORM SQL logging off in prod, scrub PII from logs | `backend/src/main.ts` · `app.module.ts` · logging | 0.25 d | App-review **L1** |
| **W8** | **UTM link sheet** — one tagged link per announcement/social bio/QR, kept in [`../marketing/`](../marketing/) | doc | 0.1 d | Hand to the event organizers with the Oct 8 copy |
| **W9** | **Deploy + smoke test** — home, building page, waitlist submit → SES confirmation arrives at a Gmail address with DKIM pass + one-click unsubscribe works → row in admin, test broadcast to self, footer links, `/courses/tracks/video` redirects, Unit 1 free path | `./pipeline.sh --env dev` (prod) | 0.25 d | **You** run the deploy |

### Email — Amazon SES (E1, moved into batch 1 Oct 3)

Marketing mail goes through SES on its own subdomain so complaints never touch the reputation of `thedroneedge.com`, which delivers verification and password resets. Transactional mail stays on the Google Workspace relay for now. The W3 waitlist confirmation sends through SES from day one.

**Do first (today):** request SES production access in the console. New accounts start in the SES sandbox (verified recipients only, 200/day) and the review takes ~1–2 days. W9 cannot send to real waitlist signups without it.

| ID | Item | Where | Size | Notes |
|----|------|-------|------|-------|
| **Z1** | **Terraform SES** — domain identity `news.thedroneedge.com` (Easy DKIM CNAMEs, custom MAIL FROM `bounce.news…` MX + SPF, DMARC), configuration set with event destination (bounce, complaint, delivery, open, click → SNS topic → HTTPS subscription to backend); IAM `ses:SendEmail` on the ECS task role scoped to the identity + config set | new `terraform/ses.tf` · `email_dns.tf` · `ecs_backend.tf` | 0.5 d | `terraform plan` locally; **you** apply. DKIM verification takes minutes–hours after DNS |
| **Z2** | **Bounce/complaint handling** — SES account-level suppression list on (bounces + complaints); `POST /email/ses-events` verifies the SNS signature, confirms the subscription, marks `leads.bounced_at` / `unsubscribed_at` on hard bounce or complaint | `backend/src/email/` | 0.5 d | SES enforces suppression; we mirror it so admin counts are true |
| **Z3** | **Unsubscribe** — HMAC-signed token per lead; `List-Unsubscribe` (https + mailto) and `List-Unsubscribe-Post: List-Unsubscribe=One-Click` headers; `POST /leads/unsubscribe` one-click + `/unsubscribe?t=` preference page (per `interest`, or all) | `backend/src/leads/` · `drone/src/app/unsubscribe/` | 0.5 d | Required by Gmail/Yahoo bulk-sender rules and CAN-SPAM; footer also carries a postal address |
| **Z4** | **`MarketingMailer` + broadcast** — SESv2 `SendEmail` client (AWS SDK v3) separate from the nodemailer relay; admin broadcast moves to SES and targets `leads` by `interest` (+ users who opted in) instead of "all users"; send in batches under the SES rate; dry-run count + test-send to self before send | `backend/src/email/marketing-mailer.service.ts` · `email.controller.ts` · admin UI | 0.75 d | Until Z4 ships, **do not use the existing broadcast for marketing** — it bulk-sends through the Workspace relay |
| **Z5** | **Templates** — markdown in repo → HTML at send time (shared header/footer, unsubscribe link, postal address, plain-text part); first two: waitlist confirmation (W3), "launch announcement" broadcast | `backend/src/email/templates/` | 0.5 d | No visual editor by design |
| **Z6** | **Sequences** — scheduled job (Nest `@Cron`) over `leads` + product events: waitlist welcome series (day 0 / 3 / 10), post-purchase (day 0 / 7), with per-step send log for idempotency | `backend/src/email/sequences/` · migration | 1 d | Unblocks **PA13** and money-model § 6. **Stretch for Oct 7** — first to slip to batch 2 if time is short; W3 confirmation does not depend on it |

Cost: ~$0.10 per 1,000 emails plus negligible SNS. Optional later: move transactional mail onto SES too (separate configuration set) and drop the Workspace relay dependency.

**Batch 1 total ≈ 4 working days + ≈ 3.75 days of email = ≈ 7.75 days.** Oct 3–7 is 5 days, so batch 1 only fits if the email work runs alongside the site work. Order: Z1 + production-access request → W1/W2/W6/W7 → W3 + Z3–Z5 → W4/W5 → Z2 → Z6 → W9.

---

## 5. Batch 2 — by Oct 16 (deploy by **Oct 15**)

Goal: take money confidently and measure the funnel.

| ID | Item | Where | Size | Notes |
|----|------|-------|------|-------|
| **X0** | **Stripe go-live** (your weekend sandbox run first) — webhook endpoint + secret (**PA41**), live keys in Secrets Manager, live course price (and Pro if E5), one real purchase on your card + full refund, verify order/entitlement/refund rows | Stripe Dashboard · `terraform/secrets_stripe.tf` · tfvars | 1 d | [`stripe-sandbox-handoff.md`](stripe-sandbox-handoff.md) · [`stripe-sandbox-test-plan.md`](stripe-sandbox-test-plan.md) U12/O2/O3. Live keys via `-var` / Secrets Manager, never in tfvars in git |
| **X1** | **`/pricing` page** — free Unit 1 → Part 107 $129 → Pro (E5) → Schools (E10 + consultation CTA); what's included / not (FAA test fee excluded); refund line; `pricing_viewed` event; link from header, footer, course preview "View pricing" | `drone/src/app/pricing/` | 1 d | TODO **S2**; ladder from [`money-model.md`](../sales/money-model.md) § 7. No bundle (E6), no decline-path offers yet |
| **X2** | **Refund & access policy** — section in Terms + short version on `/pricing` and checkout page | `legal/terms-of-service-body.tsx` · `privacy` sync doc | 0.25 d | **D9** / E7 |
| **X3** | **Launch promo codes** — `allow_promotion_codes: true` on both Checkout sessions; `?promo=CODE` landing param pre-applies via `discounts`; coupon + promotion code created in Stripe (sandbox, then live) | `backend/src/purchases/purchase.service.ts:443, :532` + spec | 0.5 d | TODO **T21**. Promo code redemptions show which channel converted |
| **X4** | **Funnel events** — `signup_started`, `signup_completed`, `email_verified`, `checkout_started`, `consultation_submitted`, `lead_captured`, `pricing_viewed`; fix `exam_start`/`exam_submit` being dropped | register flow · purchase flow · `consultation/` · `AnalyticsController` | 1 d | TODO **T3**, **T1**, **PA7**, **PA37**. Names already in the allow-list |
| **X5** | **GA4 + consent banner** — Consent Mode v2 default denied; GA via `@next/third-parties/google` loaded only on public marketing routes (`/`, `/pricing`, `/articles/*`, `/schools/*`, `/courses` catalog + preview, `/boston`, track pages) — not `/courses/[id]` lessons, `/manager`, `/admin`, `/profile`; small bottom-strip banner (Accept / Decline, no modal, choice remembered, also shown only on those routes); link Search Console; privacy page sync | `layout.tsx` · new `consent-banner.tsx` · `privacy/page.tsx` | 1 d | TODO **G1**, **G2**, **G4**, **T6**, **T9**, **D8** (decided: in-house banner) |
| **X6** | **Free Unit 1 without email verify** — let a new account open Unit 1 before verifying | auth guard / course access | 0.5 d | TODO **S6**. Biggest drop-off fix for QR-code traffic on phones |
| **X7** | **Grafana alerts** A1–A12 — at minimum: no `purchase_completed` in 24 h while promo live, webhook 4xx/5xx, 5xx on `/`, `/pricing`, `/courses/*` | Grafana click-ops → export JSON | 0.5 d | TODO **PA39**, [`observability.md`](observability.md) § 6 |
| **X8** | **Deploy + full purchase test in prod** (live card, refund) | — | 0.25 d | **You** run the deploy |

**Batch 2 total ≈ 5–6 working days.**

---

## 6. Batch 3 — Oct 17–21 (freeze Oct 21)

| ID | Item | Size | Notes |
|----|------|------|-------|
| **Y1** | **Talk landing page** `/boston` (or `/talk`) — 3 paths: try Unit 1 free · Part 107 with the launch code pre-applied · Drone Building waitlist; plus the charity/donation link from the keynote doc if Path A | 0.5 d | QR code points here with UTM. Never collect donations on our site — keynote doc § 2 |
| **Y2** | **Load/smoke check** — 50 concurrent anonymous visits to `/boston` + 10 registers from one IP (event Wi-Fi = shared NAT) | 0.25 d | Register is 30/min/IP today — see TODO "Classroom / shared-IP rate limits". If the room shares Wi-Fi, ship the login/register 120/min/IP change from that row first |
| **Y3** | **Freeze** — no deploys Oct 21–26 except hotfixes | — | |

---

## 7. Sales / GTM / money model — your track (non-code)

High-priority items from [`../sales/`](../sales/) and [`money-model.md`](../sales/money-model.md) that the site work above depends on or that schools will ask for after the talk.

| Item | By | Why now | Source |
|------|----|---------|--------|
| Create social accounts (E2) + post 5–10 items before Oct 8 | Oct 6 | W4; empty profiles look dead | TODO **G5**, **M1**, **M3**, **O1** |
| ~~Approve B2B price floor~~ — **$79/seat starting price decided Oct 3**; per-tier bands still per quote | — | `/pricing` schools line (E10) | [`packages.md`](../sales/packages.md) |
| School one-page PDF (post-reply attachment) | Oct 21 | Schools at the talk will ask for "something to send my director" | [`rep-handoff.md`](../sales/rep-handoff.md) |
| Refund policy wording (E7) | Oct 12 | X2 | **D9** |
| Pro price + benefits (E5 / MM2) | Oct 12 | X1 | money-model § 3.3 |
| Charity path decision (F1) | **Oct 10** | Y1 donation link, talk script | keynote doc § 9 |
| Kit one-pager (Base ~$275/aircraft, class-of-10 ~$3.8k) | Oct 21 | Hardware room + Drone Building waitlist follow-up | TODO P1 Drone-building ops |

**Deferred (not before January):** bundle (MM1), checkout decline path, practice-exam pack, post-purchase upsell page, `/schools/kits`, `/sponsors`, employer path, quote optional lines (MM3/MM4/MM6), Meta pixel/CAPI, Google Ads, PWA (T18–T20), testimonials (S4, need customers first).

---

## 8. Calendar

| Days | Build (code) | You |
|------|--------------|-----|
| **Oct 3–5** (Fri–Sun) | Z1, W1, W2, W6, W7, start W3 + Z3–Z5 | **Request SES production access (Oct 3)** · apply Z1 Terraform · Stripe sandbox run · E3–E4 decisions · create social accounts |
| **Oct 6–7** | finish W3 + Z3–Z5, W4, W5, Z2, W8, Z6 (stretch) → **deploy Oct 7** (W9) | Post first social content · send UTM links to organizers |
| **Oct 5–7** | X0 prep (boot checks, `--rotate-stripe`) → deploy; cutover Oct 7 — week plan in [`../TODO.md`](../TODO.md) *Batch 3* | X0: live account, keys, coupons, `OWNERTEST` $1 purchase + refund |
| **Oct 8** | — | **X0 live Stripe** (moved up from Oct 13–15 on Oct 5) · **Announcement 1** · watch leads + utm view |
| **Oct 8–12** | X3, X4, X6, X1 draft | E5, E7, E8, E9, E10 decisions · price bands · F1 by Oct 10 |
| **Oct 13–15** | X1 final, X2, X7 (X5 if chosen) → **deploy Oct 15** (X8) | — |
| **Oct 16** | — | **Announcement 2** |
| **Oct 17–21** | Y1, Y2 → freeze | One-pager PDF, kit one-pager, rehearse |
| **Oct 23–25** | Hotfix only | Talk |

---

## 9. Doc updates when items ship

- [`../TODO.md`](../TODO.md) → move rows (S2, S3, S5, S6, S7, S11, T1, T3, T21, PA39, PA41, L1) to [`../TODO_COMPLETED.md`](../TODO_COMPLETED.md) with the date.
- [`frontend-data.md`](frontend-data.md) for new routes (`/pricing`, `/courses/tracks/building`, `/boston`); [`backend-data.md`](backend-data.md) for `leads`.
- [`legal-and-privacy-site-sync.md`](legal-and-privacy-site-sync.md) for waitlist email, UTM cookie, refund policy, GA4 if added.
- [`../sales/money-model.md`](../sales/money-model.md) § 7–9 when `/pricing` and promo codes ship.
- [`purchase-flows.md`](purchase-flows.md) for promo codes and the live-mode switch.
