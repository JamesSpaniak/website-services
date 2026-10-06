# Stripe sandbox — implementation & test plan

How to get every Drone Edge payment flow working end to end in the Stripe **sandbox** (test mode), locally first and then on the deployed site, before any live key exists. Each step is tagged **UI** (Stripe Dashboard, by hand), **CODE** (built locally, reviewed, pushed) or **OPS** (Terraform / deploy — touches production, run only when explicitly decided).

Related: [`purchase-flows.md`](purchase-flows.md) (how the flows work) · [`../sales/pricing-model.md`](../sales/pricing-model.md) (SKUs, Stripe state, go-live gaps) · [`local-dev.md`](local-dev.md) (running the stack) · TODO **T17**, **PA41**, **T16**, **D9**.

---

## 1. Where we are (Oct 1 2026)

| Piece | State |
|-------|-------|
| Stripe sandbox account "Drone Edge" | Created, business bank linked |
| Stripe environments | Two exist: the account's legacy **Test mode** (`pk_test_51T1cg0ED26jRI2iY…`) and a separate **Drone Edge sandbox** (`pk_test_51T1cg92Rw6cpyMy…`). The deployed site uses the **sandbox** keys. |
| Product **Drone Edge Pro** (sandbox) | `prod_VMe3HA5NfsWBxd`, price **`price_1ULulr2Rw6cpyMyJcc0cCqmA`** — $35.00 USD / month, default, created Oct 1. (An earlier copy in legacy Test mode, `prod_VMcwkjypxxl01g`, is unused — ignore.) |
| Branding icon | Square 512×512 made: `assets/visuals/Logo/PNG/Icon/IconBlackSquare512.png` |
| Course purchase ($129) | **Moved to hosted Checkout (C2, Oct 1 2026, local only)** — was PaymentIntent + legacy `CardElement`; fulfils on `payment_intent.succeeded`, fallback `POST /purchases/confirm-checkout` |
| Pro subscription | **Code live** — hosted Checkout Session `mode: subscription` ([`purchase.service.ts`](../../backend/src/purchases/purchase.service.ts) `createProCheckoutSession`), portal, webhooks for `checkout.session.completed`, `customer.subscription.*`, `invoice.paid`, `invoice.payment_failed`, `charge.refunded` |
| `STRIPE_PRO_PRICE_ID_MONTHLY` | Empty everywhere (local `.env`, `terraform/env/dev.tfvars`) → Pro checkout returns "not configured" |
| Webhook endpoint (deployed) | **Not created** (PA41) → `/api/purchases/webhook` answers 400; Pro never fulfils on the site |
| Deployed site keys | `dev.tfvars` (= production) carries a **`pk_test_`** publishable key → the live site already runs in test mode. Real cards cannot be charged today. |
| Local keys | `backend/.env` `STRIPE_SECRET_KEY` is **not** an `sk_test_` value (placeholder); `drone/.env` has no `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` |
| Stripe Node SDK | `stripe@^18.5.0`, API version pinned `2025-08-27.basil` in [`purchase.module.ts`](../../backend/src/purchases/purchase.module.ts) |

**Decision baked into this plan:** hosted full-page Checkout for everything (best mobile UX, wallets and Link for free, least code). Courses move from PaymentIntent + `CardElement` to Checkout `mode: payment` (§ 4, C2). Embedded checkout is a later option, not part of this plan.

---

## 2. Who does what

| Area | UI (Dashboard) | CODE (local → push) | OPS (prod, explicit go) |
|------|----------------|---------------------|-------------------------|
| Keys & account | Confirm which sandbox; copy `pk_test_` / `sk_test_` | Local `.env` files (never committed) | Secrets Manager values (console or Terraform) |
| Catalog | Pro price ✅; optional yearly; course prices (optional) | `products` rows reference price IDs | `stripe_pro_price_id_*` in tfvars |
| Look & feel | Branding, payment methods, Adaptive Pricing off | — | — |
| Checkout behaviour | Customer Portal, retries, emails | Session params, course Checkout, success pages | — |
| Webhooks | Create deployed endpoint, copy `whsec_` | Handler already built; small additions only | Store secret, `stripe_webhook_enabled = true`, deploy |
| Testing | Test clocks, refunds, event resend | Stripe CLI `listen` / `trigger`, e2e | Smoke on thedroneedge.com with test cards |

---

## 3. Phase 0 — Dashboard setup (UI, ~1 hour, do first)

All in the **Drone Edge sandbox** (§ 3.1) — not the account's Test mode. Nothing here needs code.

| # | Where | Do | Why |
|---|-------|----|-----|
| U1 | Account switcher → Drone Edge sandbox → Developers → API keys | Work only in the **Drone Edge sandbox** (its `pk_test_51T1cg92…` is already in `terraform/env/dev.tfvars`). Copy its `sk_test_…` to `backend/.env`. | A price ID only works with keys from the same environment. Mismatch = "No such price". |
| U2 ✅ | Settings → Branding | Upload icon `IconBlackSquare512.png`, logo `LogoBlack.png`; set brand + accent color (§ 3.2). | Applies to Checkout, Portal, receipts, invoices. |
| U3 ✅ | Settings → Payments → Payment methods | Cards **on**, Link **on**, Apple Pay / Google Pay **on**. Leave bank debits/BNPL off for now. | Wallets + Link are the main UX win of hosted Checkout. Hosted pages need no Apple Pay domain registration. |
| U4 ✅ | Settings → Payments → Adaptive Pricing | **Off** (Studio assistant turned "localized pricing" on). | Keeps every invoice in USD so `orders.total_cents` sums cleanly. Revisit for international. |
| U5 ✅ | Settings → Billing → Customer portal | Activate. Allow: update payment method, view invoices, **cancel at period end** (collect reason). Disallow plan switching until a yearly price exists. Default return URL `https://thedroneedge.com/profile`. | `POST /purchases/billing-portal` opens it. Without activation the portal call fails. |
| U6 ✅ | Settings → Billing → Subscriptions and emails (Revenue recovery) | Smart Retries on (default policy); after final failure → **cancel subscription**; enable "failed payment" and "card expiring" customer emails. | Final cancel fires `customer.subscription.deleted` → `revokePro('cancelled')`. Status `past_due` keeps access during retries (code treats it as active). |
| U7 ✅ | Settings → Customer emails | "Successful payments" and "Refunds" receipts on. | Sandbox does not actually send them, but the setting carries to live. |
| U8 ✅ | Product catalog → Drone Edge Pro | Create the $35/mo Pro product in the sandbox (done Oct 1: `price_1ULulr2Rw6cpyMyJcc0cCqmA`). Optional: add a yearly price only once a yearly $ is signed off. Leave **Features** empty. | Our entitlement ledger is the source of truth; Stripe Entitlements would duplicate it. |
| U9 | Product catalog (optional, only if C2 uses catalog prices) | One product per sellable course with a one-time **$129** price. | C2 can instead send `price_data` built from the DB price, which needs no Dashboard products. Recommended: `price_data` (DB stays the price source). |
| U10 | Tax | Leave **off** for the sandbox. | Digital-course tax is open (**PD9**, **D9**). Turning on Stripe Tax later = one session flag. |
| U11 | Checkout Studio | No action beyond U2. Do **not** paste the Studio "Copy for agent" prompt into an agent verbatim — its "remove parameters not listed" rule would strip `customer` / `metadata.userId` and break fulfilment. | See § 4 C1 for the parameters we do adopt. |

Deployed webhook endpoint creation (U12) is in Phase 3 because it needs the deploy step.

### 3.1 Which sandbox

The account has **two separate test environments** — their keys come from different internal accounts, so nothing created in one exists in the other:

| Environment | How to get there | Key prefix | Used by |
|-------------|------------------|------------|---------|
| **Test mode** (legacy, built into the live account) | "Test mode" toggle on the main Drone Edge account | `pk_test_51T1cg0ED26jRI2iY…` | Nothing. The Pro product / Checkout Studio draft were created here on Oct 1 by mistake |
| **Drone Edge sandbox** | Account switcher (top-left "Drone Edge") → **Sandboxes** → Drone Edge sandbox | `pk_test_51T1cg92Rw6cpyMy…` | Deployed site since Feb 17 2026 (`dev.tfvars` + Secrets Manager) |

**Decision: use the Drone Edge sandbox for all pre-launch testing, local and deployed.** Reasons: the site already runs on it (no secret or deploy change for keys), sandboxes are Stripe's recommended test setup, and a sandbox can be reset or deleted without touching the live account. Cost: redo the Pro product (U8) and the settings below in the sandbox — about 10 minutes, and the settings had to be done anyway.

- Ignore the Test-mode product; archive it later or leave it. Never mix keys from the two environments.
- Don't create more sandboxes now. Each has its own keys, catalog, branding, portal and webhooks.
- The bank account belongs to the live account; sandboxes don't need one.
- Everything below is **per environment**: at go-live, U2–U8 are redone in live mode (§ 8).

**Navigation.** Settings pages are not in the left sidebar. Open them with the **gear icon (⚙) in the top-right** header → **Settings**, or type the page name into the **Search** bar. The sidebar's Payments section (Analytics, Managed Payments, Checkout, Disputes, Radar, …) is for activity, not configuration. Before each step confirm the header shows the **sandbox** name, not "Test mode".

**Managed Payments** (sidebar → Payments → Managed Payments, "3.5% add-on fee"): **do not enable.** It makes Stripe the merchant of record (handles sales tax / VAT in 80+ countries) for +3.5% per transaction on top of normal card fees (~$1.23 extra per $35 renewal, ~$4.50 per $129 course). Worth revisiting only if international sales or tax filing (**PD9**) become a real burden.

### 3.2 Step by step

**U1 — Confirm keys and environment**
1. Top-left account switcher ("Drone Edge") → **Sandboxes** → open the **Drone Edge sandbox**.
2. Sidebar bottom → **Developers** → **API keys**. Publishable key must start `pk_test_51T1cg92Rw6cpyMy…` (matches `terraform/env/dev.tfvars`).
3. **Secret key** → **Reveal** → copy `sk_test_…` into `backend/.env` `STRIPE_SECRET_KEY` (local only; never commit, never paste in docs or chat).
4. Copy the publishable key into `drone/.env` `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`.
5. After U8 and L2: `stripe prices retrieve price_1ULulr2Rw6cpyMyJcc0cCqmA` returns the $35 price. "No such price" = wrong environment.

**U2 — Branding** ✅ done Oct 1
1. **⚙ (top-right)** → **Settings** → under **Business**, **Branding** (or search "Branding").
2. **Icon** → upload `assets/visuals/Logo/PNG/Icon/IconBlackSquare512.png`.
3. **Logo** → upload `assets/visuals/Logo/PNG/Logo/LogoBlack.png`.
4. **Brand color** `#0D0D0D`, **Accent color** `#171717` (site palette is black/white — `assets/visuals/Colors/Colors.pdf` has the official values if they differ). Check the preview: button text must stay readable.
5. Preference for logo vs icon on Checkout: **Logo**.
6. **Save**. Saving here is what applies branding — Checkout Studio's "Confirm shared settings" writes the same settings, so no Studio step is needed (the Studio draft "Full page 1" lives in Test mode anyway).

**U3 — Payment methods** ✅ done Oct 1
1. **⚙ (top-right)** → **Settings** → under **Payments**, **Payment methods** (or search "Payment methods"). It is not in the left sidebar. If several configurations are listed, open the **Default** one (Checkout uses it).
2. **Cards**: on.
3. **Apple Pay** and **Google Pay** (under Wallets): turn on. No domain registration needed for hosted Checkout.
4. **Link**: on.
5. Leave bank debits (ACH), Buy-now-pay-later (Klarna, Afterpay, Affirm), and crypto **off** for now. Note: some of these may be on by default — turn them off; they add refund and dispute paths we haven't tested.
6. Save.

**U4 — Adaptive Pricing off** ✅ done Oct 1
1. **⚙** → **Settings** → under **Payments**, **Adaptive Pricing** (or search "Adaptive Pricing"). If it doesn't exist in the sandbox, it's already off — skip.
2. Toggle **off**. Save.

**U5 — Customer portal** ✅ done Oct 1
1. **⚙** → **Settings** → under **Billing**, **Customer portal** (or search "Customer portal").
2. **Activate** (or **Activate test link**) if prompted.
3. **Functionality**:
   - Invoices: **Show invoice history** — on.
   - Customer information: allow updating **email** and **billing address** — on.
   - Payment methods: **allow customers to update** — on.
   - Cancellations: **allow customers to cancel** — on; mode **At end of billing period**; **collect cancellation reason** — on. Retention coupon: off.
   - Subscriptions: **allow switching plans** — off (only one price exists). Quantity changes — off.
4. **Business information**: headline "Manage your Drone Edge Pro membership"; terms and privacy URLs if the site has them.
5. **Default redirect link**: `https://thedroneedge.com/profile`. (The app passes its own return URL, so local runs still return to localhost.)
6. **Save**.

**U6 — Failed payments (Revenue recovery)** ✅ done Oct 1
1. **⚙** → **Settings** → under **Billing**, **Subscriptions and emails** (or sidebar **Billing → Revenue recovery → Retries**; search "Retries").
2. **Smart Retries**: on, default policy (up to 8 tries within 2 weeks is fine; any window works).
3. **If all retries fail**: subscription status → **Cancel the subscription**. (Not "mark unpaid" — our code only revokes on cancel.)
4. **Emails** section: turn on **Send emails when card payments fail**, **Send emails about expiring cards**, and the **link to a Stripe-hosted page** for updating the card.
5. Upcoming renewal reminders: optional; on is customer-friendly.
6. Save.

**U7 — Receipts** ✅ done Oct 1
1. **⚙** → **Settings** → under **Business**, **Customer emails** (or search "Customer emails").
2. **Successful payments**: on. **Refunds**: on.
3. Save. (Test mode doesn't email real customers; this is for parity with live.)

**U8 — Create Drone Edge Pro in the sandbox** ✅ done Oct 1
1. In the sandbox: sidebar **Product catalog** → **+ Create product**.
2. **Name** `Drone Edge Pro`; **Description** `All Drone Edge courses while subscribed`; **Image** optional (`IconBlackSquare512.png`).
3. **Product tax code**: only used once Stripe Tax is on (off for now, **PD9**). Created with `Downloadable Software - personal use` (`txcd_10202000`); nothing is downloaded, so prefer `General - Electronically Supplied Services` (`txcd_10000000`) or an education-specific code — confirm with the accountant when deciding PD9.
4. **Pricing**: **Recurring**, **$35.00 USD**, **Monthly**. (Lookup key: skip — optional, the backend uses the price ID from env, not lookup keys.)
5. **Add product**. Open it and copy the price ID (`price_…`) from the Pricing row → `STRIPE_PRO_PRICE_ID_MONTHLY` (L1) and tfvars (C5).
6. Leave **Features** empty, **Trials** at "No trials", **Cross-sells** empty.
7. Optional, only with a signed-off yearly price: **Add another price** → Recurring, Yearly, amount → copy its `price_…` for `STRIPE_PRO_PRICE_ID_YEARLY`.

**U9 — Course products**: skip (plan uses `price_data` from the DB price).

**U10 — Tax**: nothing to do. Don't start the Stripe Tax setup wizard yet; leave `automatic_tax` off.

**U11 — Checkout Studio**: nothing to do. Our backend creates sessions itself; the Test-mode Studio draft can be ignored.

**U12 — Deployed webhook endpoint** (Phase 3, right before O2)
1. **Developers** → **Webhooks** (Workbench) → **Add destination** / **Add endpoint**.
2. Events from **Your account**; API version: the default shown is fine (our handler reads only stable fields).
3. Select events: `payment_intent.succeeded`, `checkout.session.completed`, `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.paid`, `invoice.payment_failed`, `charge.refunded`.
4. Destination type **Webhook endpoint** → URL `https://thedroneedge.com/api/purchases/webhook` → description "Drone Edge site (test)". Create.
5. On the endpoint page → **Signing secret** → **Reveal** → keep `whsec_…` for O2 (Terraform `-var`). Do not commit it.
6. Until O2 deploys, deliveries will fail with 400 — expected. After O3, use **Resend** on a failed event to confirm 200.

**Local webhooks need no Dashboard step** — `stripe listen` (L3) creates a temporary forwarding with its own `whsec_…`.

---

## 4. Phase 1 — Code (CODE, build locally, push via PR)

Ordered smallest → largest. C1, C3, C4 are enough to test Pro fully. C2 brings courses onto hosted Checkout.

**Status Oct 1 2026: C1–C4 built and tested locally** (not committed / deployed). Extra fixes found while testing — raw webhook body, Pro refund matching, duplicate-delivery race, false error log — are listed in [`stripe-webhook-payloads.md`](stripe-webhook-payloads.md) § 3. C5 (Terraform) not written yet.

### C1 — Pro session params (tiny) ✅

In `createProCheckoutSession`, add the Studio settings we actually want, keep everything else:

```ts
billing_address_collection: 'auto',
allow_promotion_codes: false,   // flip to true when launch / school coupons exist
```

Skip `ui_mode` (SDK 18 default `hosted` already), `integration_identifier` / `origin_context` (not in SDK 18 types or the pinned API version; attribution only), `automatic_tax` (U10), `payment_method_collection` (`always` is the default).

### C2 — Course purchase on hosted Checkout (`mode: payment`) ✅

Goal: one checkout pattern for every SKU; wallets, Link and coupons for courses; reuse the existing fulfilment code.

Backend:
1. New `POST /purchases/create-course-checkout { courseId, successPath?, cancelPath? }` — same guards as `createPaymentIntent` (owns course, active Pro, course exists).
2. Session:
   ```ts
   mode: 'payment',
   customer: await this.ensureStripeCustomer(user),
   client_reference_id: String(userId),
   line_items: [{ quantity: 1, price_data: {
     currency: 'usd', unit_amount: Math.round(Number(course.price) * 100),
     product_data: { name: course.title } } }],   // tax_code added when Stripe Tax is on (PD9)
   metadata: { userId, courseId, productType: PRODUCT_COURSE },
   payment_intent_data: { metadata: { userId, courseId, productType: PRODUCT_COURSE } },
   billing_address_collection: 'auto',
   allow_promotion_codes: false,
   success_url: `${frontend}/courses/${courseId}?purchase=success&session_id={CHECKOUT_SESSION_ID}`,
   cancel_url:  `${frontend}/courses/${courseId}?purchase=canceled`,
   ```
   **Key point:** `payment_intent_data.metadata` copies the same metadata onto the PaymentIntent, so the existing `payment_intent.succeeded` handler fulfils the course with **no webhook changes**. `checkout.session.completed` already ignores `mode !== 'subscription'`.
3. `POST /purchases/confirm-checkout { sessionId }` — client fallback when the webhook lags: retrieve the session (expand `payment_intent`), check `payment_status === 'paid'` and `metadata.userId === caller`, then reuse the existing `confirm-payment` path with the PaymentIntent id. Idempotent like today.
4. Keep `create-payment-intent` + `confirm-payment` for one release (old tabs, rollback), then delete with the `CardElement` code.

Frontend ([`purchase-flow.tsx`](../../drone/src/app/ui/components/purchase-flow.tsx), [`api-client.tsx`](../../drone/src/app/lib/api-client.tsx)):
5. Replace the `CardElement` form with a "Buy course — $129" button → `createCourseCheckout()` → `window.location.href = url` (same as the Pro button).
6. On the course page, when `?purchase=success&session_id=…`: show "Payment received — unlocking", poll `has_access` (existing logic), call `confirm-checkout` after a few seconds if still locked. `?purchase=canceled` → quiet "Checkout canceled" notice.
7. `@stripe/react-stripe-js` / `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` become unused once step 4 cleanup lands — remove then, not before.

Tests: e2e cases for create-course-checkout guards (owned course, active Pro, unknown course) with the Stripe client mocked, matching existing patterns in `backend/test/app.e2e-spec.ts`.

### C3 — Catalog row for Pro (data) ✅

`products.PRO_MONTHLY` was seeded with `stripe_price_id = NULL`, `list_price_cents = 0` (the env var was empty when the migration ran). Renewals still map correctly (unknown price → monthly), but reports show a $0 list price. Add a migration that sets `list_price_cents = 3500` and `stripe_price_id = process.env.STRIPE_PRO_PRICE_ID_MONTHLY` when present (no-op otherwise). Test and live price IDs differ, so the env var — not a hard-coded ID — stays the source.

### C4 — Docs that are wrong today ✅

- [`local-dev.md`](local-dev.md): webhook event list is missing `invoice.paid`, `invoice.payment_failed`, `charge.refunded`; add `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` for `drone/.env`.
- [`purchase-flows.md`](purchase-flows.md) Flow A after C2 ships.
- [`../sales/pricing-model.md`](../sales/pricing-model.md) / [`../sales/packages.md`](../sales/packages.md): Pro = **$35/mo** once signed off (currently "$29–49 draft").

### C5 — Terraform edits ✅ written Oct 2 2026 (applied in Phase 3)

- `terraform/env/dev.tfvars`: `stripe_pro_price_id_monthly = "price_1ULulr2Rw6cpyMyJcc0cCqmA"`, `stripe_webhook_enabled = true`; `stripe_publishable_key` unchanged (already the sandbox key).
- `stripe_webhook_secret` sensitive variable (must start `whsec_`) + `aws_secretsmanager_secret_version.stripe_webhook_secret` (`count` on `stripe_webhook_enabled`, `ignore_changes = [secret_string]`). Value comes from `TF_VAR_stripe_webhook_secret` on the **first** apply only; later deploys don't need it. `pipeline.sh` refuses the first apply if it is missing. Rotate (e.g. live cutover) with `TF_VAR_stripe_webhook_secret=whsec_… ./pipeline.sh --env dev --replace 'aws_secretsmanager_secret_version.stripe_webhook_secret[0]'`.
- **CloudFront fix:** the `/api/*` behavior forwarded only an allow-list of headers, so `Stripe-Signature` never reached the API and every deployed delivery would have failed with 400 even with a correct secret. Added to the list in `cloudfront_frontend.tf`. (The Next.js `/api/[...path]` proxy forwards all headers and the body text unchanged.)
- Preflight `--plan` (Oct 2) shows exactly: CloudFront in-place update, secret version create, API task definition replace (new revision for the env/secret change — expected, though preflight flags any replace).
- Prod `droneedge-dev-stripe-secret-key` already holds the sandbox `sk_test_51T1cg92…` key — O1 not needed.

---

## 5. Phase 2 — Local end-to-end testing

### Setup (L1–L4)

| # | Do |
|---|----|
| L1 | `backend/.env`: `STRIPE_SECRET_KEY=sk_test_…` (from U1), `STRIPE_PRO_PRICE_ID_MONTHLY=price_1ULulr2Rw6cpyMyJcc0cCqmA`, `FRONTEND_URL=http://localhost:8080`. `drone/.env`: `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_…` (needed until C2 cleanup). |
| L2 | `brew install stripe/stripe-cli/stripe` → `stripe login` (pick the Drone Edge sandbox). |
| L3 | `stripe listen --events payment_intent.succeeded,checkout.session.completed,customer.subscription.created,customer.subscription.updated,customer.subscription.deleted,invoice.paid,invoice.payment_failed,charge.refunded --forward-to localhost:3000/purchases/webhook` (current CLI requires `--events`). The `whsec_…` is stable per machine (`stripe listen --print-secret`) → `STRIPE_WEBHOOK_SECRET` in `backend/.env`, restart the API. No Dashboard endpoint is needed locally. |
| L4 | Start DB, API, frontend per [`local-dev.md`](local-dev.md). Register a normal (non-admin) test user — admins short-circuit Pro and cannot buy it. |

### Test cards

| Card | Behaviour |
|------|-----------|
| `4242 4242 4242 4242` | Succeeds |
| `4000 0025 0000 3155` | Requires 3-D Secure — complete the challenge |
| `4000 0000 0000 9995` | Declined — insufficient funds |
| `4000 0000 0000 0341` | Attaches fine, **fails on later charges** — use for renewal failure |

Any future expiry, any CVC, any ZIP.

### Test matrix

**Results of the Oct 1 2026 local run, sample payloads and field map: [`stripe-webhook-payloads.md`](stripe-webhook-payloads.md).** All rows pass. The browser-only parts of T3, T4, T5, T6, T8 passed on **Oct 3 2026** as automated Playwright tests (§ 5.1). Not automated: paying with Link / Apple Pay (T4) and updating the card in the Portal (T8). Check those by hand on the deployed sandbox (O5).

Verify each with the checks below. "Access" = `GET /courses/:id` `has_access`.

| # | Flow | Steps | Expect |
|---|------|-------|--------|
| T1 | Course buy (current PI path, before C2) | Buy Part 107 with 4242 | Access true; one `orders` row (`payment_status = succeeded`, 12900), `entitlements` source `purchase`; `purchase_completed` event |
| T2 | Course buy — webhook lag | Stop `stripe listen`, buy, wait | UI calls confirm-payment (or confirm-checkout after C2) → access true; restart listener → redelivered event is idempotent (no second order) |
| T3 | Course buy — decline / 3DS | 9995, then 3155 | Decline shows error, no order; 3DS completes → as T1 |
| T4 | Course buy on hosted Checkout (after C2) | Buy with 4242, also with Link and Apple Pay (Safari) | Redirect back to `?purchase=success`, access true, same rows as T1 |
| T5 | Course cancel (after C2) | Open Checkout, click back | Lands on `?purchase=canceled`, no order |
| T6 | Pro subscribe | Profile → Upgrade → 4242 | `/profile?pro=success`; `users.role = pro`, `pro_membership_expires_at` ≈ +1 month, `stripe_customer_id` / `stripe_subscription_id` set; Pro entitlement row; `orders` row from `invoice.paid` (3500, `PRO_MONTHLY`); `pro_started`; every course has access |
| T7 | Pro already active | Click Upgrade again / try course buy | Rejected with "Manage billing" messages |
| T8 | Portal | Manage billing → update card → cancel | Card update ok; cancel sets `cancel_at_period_end` → `pro_cancel_scheduled`; access stays until period end |
| T9 | Immediate cancel | Dashboard → subscription → Cancel immediately | `customer.subscription.deleted` → role `user`, Pro entitlement revoked, `PRO_CANCELLED` audit; previously bought courses still accessible |
| T10 | Renewal (test clock) | See procedure below; advance 1 month | Second `invoice.paid` → second `orders` row, `pro_renewed`, `pro_membership_expires_at` moves forward |
| T11 | Renewal failure | Test-clock customer with 0341 card; advance 1 month | `invoice.payment_failed` → `pro_payment_failed`; status `past_due`, access kept; advance through retries → subscription canceled → T9 effects |
| T12 | Refund — course | Dashboard → payment → Refund full | `charge.refunded` → `orders.payment_status = refunded`, entitlement revoked, `REFUND_ISSUED`, access false. Partial refund: money only, access kept |
| T13 | Refund — Pro invoice | Refund the Pro charge | Order marked refunded; Pro access follows the subscription, not the refund (cancel separately if intended) |
| T14 | Duplicate delivery | Dashboard → Events → pick a handled event → Resend | No duplicate `orders` / entitlements |
| T15 | Bad signature | `curl -X POST localhost:3000/purchases/webhook -d '{}'` | 400, nothing written |
| T16 | Pro not configured | Unset `STRIPE_PRO_PRICE_ID_MONTHLY`, restart | Upgrade shows "Pro not configured"; course path unaffected |

**Renewal with a test clock (T10/T11).** Test clocks attach to a customer at creation, and `ensureStripeCustomer` reuses an existing `users.stripe_customer_id`, so:

```bash
stripe test_helpers test_clocks create --frozen-time $(date +%s) --name pro-renewal
stripe customers create --email you+clock@example.com --test-clock clock_… -d "metadata[userId]=<id>"
# local DB only:
psql -d blog -c "UPDATE users SET stripe_customer_id='cus_…' WHERE id=<id>;"
# subscribe through the app (T6), then:
stripe test_helpers test_clocks advance clock_… --frozen-time <now + 32 days>
```

Subscription webhooks fall back to `stripe_customer_id` lookup when metadata is missing, so a subscription created in the Dashboard on that customer also maps to the user.

**Quick checks**

```sql
SELECT id, role, pro_membership_expires_at, stripe_customer_id, stripe_subscription_id FROM users WHERE id = <id>;
SELECT id, payment_status, total_cents, stripe_invoice_id, stripe_payment_intent_id, placed_at FROM orders WHERE user_id = <id> ORDER BY id;
SELECT id, course_id, source, product_sku, ends_at, revoked_at, revoke_reason FROM entitlements WHERE user_id = <id> ORDER BY id;
```

`stripe listen` output shows each event with the HTTP status our API returned — any non-200 is a bug.

---

### 5.1 Browser click-through (automated, ~1.5 min)

Everything server-side is verified; this checks what a buyer sees. Stack: Postgres (`docker compose up postgres -d`), API on 3000 started with `EMAIL_ENABLED=false` (otherwise register returns 500 because the placeholder SMTP host can't be resolved), frontend on 8080, **one** `stripe listen` (L3). Use Node ≥ 18 (`nvm use 20`).

```bash
cd drone && npm run test:e2e   # first time: npx playwright install chromium
```

[`drone/e2e/purchase-flows.spec.ts`](../../drone/e2e/purchase-flows.spec.ts) covers T4, T5, T3 decline, T3 3DS, and T6 + T8 (cancel at period end in the Portal). Each test uses a fresh non-admin user made through the API. After every purchase it reloads `/profile` to check the user is still signed in. **Oct 5 2026: 5/5 pass** against Batch 2 + go-live prep (18 webhooks, all 2xx). That run updated the selectors for the Batch 2 profile Pro card ("Go Pro" / "Manage billing", "Every course is unlocked until …") and stopped waiting for Stripe's full page `load` (it can stall on third-party scripts). **Oct 3 2026: 5/5 pass.** All 35 webhook deliveries returned 2xx, and access came from the webhook (the `confirm-checkout` fallback was never called). Notes from the run:

- T5 cancel returns to `/courses/:id?purchase=1` (the purchase screen), not `?purchase=canceled`.
- Stripe's hosted page changes its markup without notice, so if a test can't find a field, look at the failure screenshot in `drone/test-results/` first. Selectors live in [`drone/e2e/helpers.ts`](../../drone/e2e/helpers.ts).
- Backend side of "stays signed in": `backend/test/app.e2e-spec.ts` › `purchase session refresh`. It found and now guards a real logout bug: parallel refreshes with one cookie each rotated it, and the browser could keep a cookie the DB no longer matched. Fixed in `auth.service.ts` (conditional rotation) and `api-client.tsx` (single-flight refresh).

Manual steps, kept for the deployed run (O5) and for anything not automated:

1. Register a fresh user at `http://localhost:8080/register` (email sending fails locally — the account is still created; set `EMAIL_ENABLED=false` in `backend/.env` to silence it).
2. **T4** — open a paid course → *Purchase* → **Buy this course** → Stripe page shows your logo/colors, Apple Pay / Link options → pay `4242 4242 4242 4242` → lands on the course with "Payment received — unlocking…" then full access.
3. **T5** — new user, open checkout, click Stripe's back arrow → returns to the purchase screen, nothing charged.
4. **T3** — card `4000 0000 0000 9995` → Stripe shows the decline inline; `4000 0025 0000 3155` → 3-D Secure challenge → success.
5. **T6** — another new user → Profile → **Upgrade to Pro** → pay → `/profile?pro=success`, membership shows Pro, any course opens.
6. **T8** — Profile → **Manage billing** → portal shows your branding → update card → cancel → back on `/profile`; Pro stays until period end.
7. Check that you stay signed in after each purchase (the purchase bumps `token_version`; the session should refresh, not bounce to login).
8. `python3 scripts/capture_stripe_fixtures.py` — adds the two `checkout.session.completed` samples.

## 6. Phase 3 — Deployed sandbox on thedroneedge.com (UI + OPS)

The site already runs on `pk_test_`, so this is a sandbox test on the production stack. Every OPS step is a production change: run only on an explicit go, via [`../../workflows/tech/deploy.md`](../../workflows/tech/deploy.md).

| # | Type | Do |
|---|------|----|
| O1 | — | ✅ Not needed — prod secret key is already the sandbox `sk_test_51T1cg92…` (checked Oct 2). |
| U12 | UI | Developers → Webhooks → Add endpoint `https://thedroneedge.com/api/purchases/webhook`, events: `payment_intent.succeeded`, `checkout.session.completed`, `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.paid`, `invoice.payment_failed`, `charge.refunded`. Copy the signing secret. |
| O2+O3 | OPS | One deploy: `TF_VAR_stripe_webhook_secret=whsec_… ./pipeline.sh --env dev` (C5 is already in tfvars). Ships C1–C4, the raw-body fix, the CloudFront header fix and migration `1765000004000` (sets PRO_MONTHLY to 3500 + the price ID from the env var — runs once, so the price ID must be in the same deploy). |
| O4 | UI | Portal default return URL → `https://thedroneedge.com/profile` (if not set in U5). |
| O5 | Test | Repeat T1/T4, T6, T8, T9, T12, T14 on the site with test cards and a throwaway account. Dashboard → Webhooks → endpoint shows delivery status; all 200. |
| O6 | Clean up | Refund/cancel test purchases; deactivate the throwaway account so test orders stay out of analytics (or tag them). |

---

## 7. Exit criteria (sandbox complete)

- [ ] T1–T16 pass locally; O5 passes on the site.
- [ ] Every webhook delivery in the Dashboard is 200 for the test window.
- [ ] Nightly `analytics_reconciliation` shows no `access_diff` for test users.
- [ ] Docs updated (C4); TODO **T17** and **PA41** moved to `TODO_COMPLETED.md` with the date.

## 8. Going live

### 8.1 Order of work

| Step | Where | What |
|------|-------|------|
| G1 | Local | § 5.1 browser click-through passes. **Done Oct 3 2026** (automated, 5/5). |
| G2 | PR | Commit C1–C4 + fixes; review; merge. |
| G3 | Site, **sandbox** (Phase 3) | U12 endpoint, O2 tfvars (`stripe_pro_price_id_monthly = price_1ULulr2Rw6cpyMyJcc0cCqmA`, webhook secret, `stripe_webhook_enabled = true`), deploy. Repeat § 5.1 on thedroneedge.com with test cards; Dashboard → Webhooks shows only 2xx. **This is the real dress rehearsal** — same infra as live, only the keys change after it. |
| G4 | Decisions | Refund / access policy text (**D9**) on the site and in Stripe (Settings → Public details → terms/refund URL); prices signed off (Pro $35, course $129, **D10 / MM1**); tax position (**PD9**). |
| G5 | Stripe **live** account (switch out of the sandbox) | Finish account activation / identity checks if prompted; Settings → Public details: statement descriptor (e.g. `DRONEEDGE`), support email + URL; Radar default rules on. Repeat **U2–U7 in live** (sandbox settings do not carry over). Create **Drone Edge Pro** $35/mo in live → new `price_…`. |
| G6 | Stripe live | Webhooks → endpoint `https://thedroneedge.com/api/purchases/webhook`, same eight events → live `whsec_…`. Developers → API keys → live `pk_live_…` / `sk_live_…`. **Never paste live keys in chat or files** — straight into Secrets Manager / the Terraform `-var`. |
| G7 | OPS (explicit go) | tfvars: `stripe_publishable_key = pk_live_…`, `stripe_pro_price_id_monthly = <live price>`, `stripe_secret_key_managed = true`. Then, from your own terminal (keys never in chat or files): `TF_VAR_stripe_secret_key=sk_live_… TF_VAR_stripe_webhook_secret=whsec_… ./pipeline.sh --env dev --rotate-stripe`. The pipeline refuses if the secret key's mode differs from the publishable key; the API refuses to boot on a mismatch (old tasks keep serving) and reports `stripe_mode` on `GET /api/health`. Then smoke test § L of `workflows/tech/post-deploy-smoke-test.md`. Roll (revoke) the sandbox secret key that was pasted in chat. |
| G8 | Real-money smoke (you) | § 8.2. |
| G9 | Watch | First week: Dashboard → Webhooks (all 2xx), Payments, failed renewals; nightly `analytics_reconciliation` clean; Grafana alerts (**T5 / PA39**) if built. |

### 8.4 Rollback

Put `stripe_publishable_key` and `stripe_pro_price_id_monthly` back to the sandbox values in tfvars, then `TF_VAR_stripe_secret_key=sk_test_… TF_VAR_stripe_webhook_secret=<sandbox whsec_> ./pipeline.sh --env dev --rotate-stripe`. No data migration; live orders already recorded stay recorded, and `GET /api/health` reports `"stripe_mode":"test"` again. Live customers' Pro subscriptions keep renewing in Stripe live — their webhooks fail signature checks until you roll forward again (Stripe retries for 3 days, then the hourly replay picks them up once live keys are back).

### 8.5 Guards (added 2026-10-04)

- **Terraform owns the secret key value** once `stripe_secret_key_managed = true` (`aws_secretsmanager_secret_version.stripe_secret_key`, like the webhook secret) — no AWS CLI. `--rotate-stripe` replaces both values together; refuses unless both `TF_VAR_`s are set.
- **Mode mismatch:** pipeline (secret key vs tfvars publishable key) and API boot (`StripeConfigService`, `STRIPE_PUBLISHABLE_KEY` env) both refuse.
- **Wrong-mode price:** at boot the API retrieves the configured Pro price(s); not found / wrong mode / inactive → `stripe.config_errors` → Grafana **Stripe config error** (critical). The `products` PRO_* rows are pointed at the configured price ids.
- **Visibility:** `GET /api/health` → `{"status":"ok","stripe_mode":"live|test|unset"}`.

### 8.2 Real-money smoke test (your own card)

Two options; the first needs no code or catalog changes:

1. **Buy for real, then refund yourself (recommended).** Buy Part 107 at full price → confirm access, order row, receipt email, statement descriptor → Dashboard → Payments → **Refund** → confirm access revoked (also tests the refund path live). Subscribe to Pro → confirm → Dashboard → subscription → **Cancel immediately** + refund the invoice. Cost: Stripe keeps its processing fee on refunded charges (~2.9% + 30¢ → about $4 on $129, $1.32 on $35).
2. **Cheap test via a promotion code** (needs **T21** shipped): create a single-use code (e.g. `OWNERTEST`, amount off so the total is $1, max redemptions 1). Same flow, ~$0.33 fees, and it doubles as the launch-promo rehearsal.

Avoid a separate cheap "test" product or a temporary price change: hosted Checkout prices courses from `courses.price`, so a cheap product means editing the live catalog other buyers can see, and it doesn't test the real price path.

### 8.3 Launch / social-media sale: coupon, not a new price

**Use Stripe Coupons + Promotion Codes, keep the list prices.**

| Approach | Verdict |
|----------|---------|
| **Promotion code** (e.g. `LAUNCH30`: 30% off, expires on a date, optional max redemptions; Pro coupon `duration: once` = first month only, or `repeating` N months) | ✅ Checkout shows the full price struck through → the discount reads as a deal; ends automatically; per-code redemption counts = attribution per post/channel (one code per platform); orders still record what was actually paid. Needs **T21** (`allow_promotion_codes: true`, or apply the code server-side from a `?promo=` link so buyers don't have to type it). |
| Lower `courses.price` / Pro price temporarily | ❌ Everyone sees it, no auto-end, reports lose the list price, and Pro subscribers who joined at the low price **stay** on it unless migrated. |
| New "launch" product / price | ❌ for a temporary sale (two SKUs to retire, Pro launch subscribers locked at that price). ✅ only if you deliberately want a permanent **founding-member** Pro rate — then it's a separate price on the same product, offered for a window and never shown again. |

Money-model note: [`../sales/money-model.md`](../sales/money-model.md) warns against discounting the same thing because it trains buyers to wait — a dated launch code is the accepted exception; avoid recurring sales.

## 9. Open decisions

| Decision | Default in this plan |
|----------|----------------------|
| Pro price | $35/mo (Dashboard). Docs still say $29–49 draft — needs sign-off |
| Yearly Pro | Not offered until a price is set |
| Course price source | DB `courses.price` via `price_data` (not Stripe catalog) |
| Promo codes | Off now; **T21** turns them on for the launch sale and the $1 owner test (§ 8.2–8.3) |
| Adaptive Pricing | Off (USD only) |
| Stripe Tax | Off until PD9 |

*Update this file as phases complete; delete it (or fold the matrix into [`purchase-flows.md`](purchase-flows.md)) once live keys ship.*
