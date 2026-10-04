# Stripe sandbox — session handoff (Oct 2 2026)

Temporary hand-off note so a new session can continue the sandbox go-live work. Delete it once §5.1 testing and the sandbox deploy are done. The full plan is in [`stripe-sandbox-test-plan.md`](stripe-sandbox-test-plan.md).

**To resume:** "Read `docs/tech/stripe-sandbox-handoff.md` and continue from § 4." (Tests are done as of Oct 3; next step is commit → U12 → deploy on go.)

---

## 1. Current Stripe implementation (summary)

- **Course ($129 on prod, $29 in local DB):** hosted Checkout `mode: payment`, priced from `courses.price` via `price_data`. Metadata is copied onto the PaymentIntent, so `payment_intent.succeeded` fulfils the order. Fallback: `POST /purchases/confirm-checkout { sessionId }`. The legacy `create-payment-intent` / `confirm-payment` path is kept for one release.
- **Pro ($35/mo):** hosted Checkout `mode: subscription`. Webhooks handle `checkout.session.completed`, `customer.subscription.*`, `invoice.paid`, `invoice.payment_failed` and `charge.refunded`. Customer Portal is opened via `POST /purchases/billing-portal`.
- **Webhook:** the raw-body parser for `/purchases/webhook` is in `backend/src/main.ts`. The production site calls the same handler at `/api/purchases/webhook`.
- **Sandbox:** "Drone Edge sandbox" (`pk_test_51T1cg92…`), **not** the legacy "Test mode". Pro price is `price_1ULulr2Rw6cpyMyJcc0cCqmA`. Dashboard steps U2–U8 are done.
- **Prod site:** already runs on sandbox keys. Prod Secrets Manager holds `sk_test_51T1cg92…` (checked Oct 2), so step O1 isn't needed.

## 2. Done this session (uncommitted, not deployed)

| File | Change |
|------|--------|
| `terraform/cloudfront_frontend.tf` | **Bug fix:** `/api/*` now forwards the `Stripe-Signature` header. Without it, every deployed webhook would fail with 400. The Next proxy `drone/src/app/api/[...path]/route.ts` already forwards all headers and the body text. |
| `terraform/variables.tf` | New sensitive `stripe_webhook_secret` variable (must be empty or start with `whsec_`) |
| `terraform/secrets_stripe.tf` | `aws_secretsmanager_secret_version.stripe_webhook_secret`: `count` on `stripe_webhook_enabled`, `ignore_changes = [secret_string]` |
| `terraform/ecs_backend.tf` | API task `depends_on` also waits for the webhook secret version |
| `terraform/env/dev.tfvars` | `stripe_pro_price_id_monthly = "price_1ULulr2Rw6cpyMyJcc0cCqmA"`, `stripe_webhook_enabled = true` |
| `pipeline.sh` | Refuses the first apply when enabled and no `TF_VAR_stripe_webhook_secret` is set |
| Docs | `stripe-sandbox-test-plan.md` (C5, O1, O2+O3), `workflows/tech/deploy.md` (secret rule + rotation), `docs/TODO.md` PA41 |

Checks run:
- `terraform validate` passes.
- `bash -n pipeline.sh` passes.
- Purchase unit tests pass 18/18.
- Backend e2e passes 43/43. `progress access control › requires auth for progress endpoints` is flaky: it failed once, then passed.
- `./scripts/deploy-preflight.sh --plan` shows: 2 add, 1 change, 1 destroy. That is the CloudFront in-place update, the secret version create (the secret has no versions today), and an API task definition replace. Any env/secret change registers a new revision, so the replace is expected. The preflight reports "do not deploy" only because it flags any replace or create on principle.

Deploy scope note: prod runs image `d15cfd3`. Three commits are undeployed:
- `e0d4f38`: S3 state backend scripts. State is already in S3 and unlocked.
- `ee42c40`: the Stripe work.
- `6b248c6`: docs.

One new migration is included: `1765000004000-SetProMonthlyCatalogPrice`. It's a one-row UPDATE that reads `STRIPE_PRO_PRICE_ID_MONTHLY` once, so the price ID must ship in the same deploy (it does).

⚠️ With `stripe_webhook_enabled = true` committed, **any** deploy is blocked until the secret has been supplied once. If something unrelated has to ship first, set it back to `false`.

## 3. Done Oct 3 2026: §5.1 click-through + automated tests (uncommitted)

- **Browser:** Playwright in `drone/` (`playwright.config.ts`, `e2e/helpers.ts`, `e2e/purchase-flows.spec.ts`, `npm run test:e2e`). 5/5 pass: T4, T5, T3 decline, T3 3DS, T6+T8. All webhooks returned 2xx. Run instructions are in the test plan § 5.1. Gotchas: the local API needs `EMAIL_ENABLED=false` or register returns 500, Node must be 20, and the shell default is 16.
- **Backend e2e:** `purchase session refresh` (3 tests) plus `truncateAll` retrying on deadlock, which was the cause of the earlier flaky test. 46/46 pass, twice.
- **Sign-out bug: confirmed and fixed.** The parallel-refresh test fails 3/3 against the old code and passes 3/3 against the fix. The fix: `auth.service.ts` rotates the verifier with a conditional update, and losers get an access token but no refresh cookie (`auth.controller.ts` skips that cookie). `api-client.tsx` also makes refresh single-flight.
- Fixtures were re-captured, including both `checkout.session.completed` variants.
- **Deploy scope grows:** the auth fix and api-client change ship with the Stripe deploy. No migration.

**Also done Oct 3 2026, after the tests (uncommitted):** closed both webhook-failure gaps. See `purchase-flows.md` § "When a webhook fails".
- Gap 1: an hourly `StripeEventReplayService` (5 tries, then `dead`, which raises the `stripe_events_dead` reconciliation check and a gauge). Admin `POST /purchases/admin/replay-failed-events`. Migration `1765000005000-CreateStripeEventReplays`. Terraform sets `STRIPE_EVENT_REPLAY_ENABLED` from `stripe_webhook_enabled`.
- Gap 2: `POST /purchases/confirm-pro-checkout`. The Pro success URL now carries `session_id`, and the profile and course pages call it when the webhook is late.
- **Cross-environment guard:** `processEvent` ignores events for Stripe customers that this DB doesn't know. Without it, once the prod webhook is live, local test purchases on the shared sandbox would grant access to the prod user with the same id.
- Verified with Playwright both ways: webhooks on gives 5/5, and webhooks off still unlocks the course (`confirm-checkout`) and Pro (`confirm-pro-checkout`). Unit tests 27/27, e2e 46/46.
- Deploy scope now also has **two** migrations (…04000 and …05000).

The original task notes are kept below for reference.

User request: "complete these tests and write automated tests for it, write test around profile login."

### 3a. Browser tests (Playwright, not yet installed)

- Install in `drone/`: `npm install -D @playwright/test` then `npx playwright install chromium`. The first attempt was stopped before running, so nothing is installed.
- Suggested layout: `drone/playwright.config.ts` with `baseURL` `http://localhost:8080`, tests in `drone/e2e/`, and an npm script `test:e2e`.
- Create users through the API (`/api/auth/register`, then log in so the cookies land on `localhost:8080`) rather than through the register UI. The register form fields are `email`, `firstName`, `lastName`, `username` and `password`. Use **non-admin** users only: admins short-circuit Pro and can't buy it.
- Cases:

| Test | Steps / selectors | Expect |
|------|-------------------|--------|
| T4 course buy | `/courses/1?purchase=1` → button `Buy this course — $…` → Stripe page → card `4242 4242 4242 4242`, any future expiry, any CVC and ZIP | Back on `/courses/1?purchase=success&session_id=…`; text "Payment received — you have full access" |
| T5 cancel | Open Checkout, click Stripe's back link | Back on the course page, no order |
| T3 decline | Card `4000 0000 0000 9995` | Stripe shows the decline inline; no access |
| T3 3DS | Card `4000 0025 0000 3155` → complete the challenge (iframe) | Same as T4 |
| T6 Pro | `/profile` → `Upgrade to Pro (monthly)` → 4242 | `/profile?pro=success`; "Pro (active until …)"; any course has access |
| T8 portal | `/profile` → `Manage billing` → cancel at period end → return | Pro still shown until period end |
| Signed in | After each purchase, reload `/profile` | Still signed in, no bounce to login |

- Prerequisites: API on :3000 and Next on :8080, plus **one** webhook forwarder:
  `stripe listen --events payment_intent.succeeded,checkout.session.completed,customer.subscription.created,customer.subscription.updated,customer.subscription.deleted,invoice.paid,invoice.payment_failed,charge.refunded --forward-to localhost:3000/purchases/webhook`
  Its secret (`whsec_aa8872…`) already matches `backend/.env`.
- After the browser run, run `python3 scripts/capture_stripe_fixtures.py` to add the `checkout.session.completed` samples.

### 3b. Backend e2e: profile / login around purchases

Add a `describe('purchase session refresh')` block to `backend/test/app.e2e-spec.ts`. It already has cookie-auth helpers (H1 block, around line 868). Run with `npm run test:e2e` (DB `blog_test`).

How it works:
- A purchase bumps `users.token_version` (purchase.service.ts, order.service.ts).
- `jwt.strategy.ts` rejects a JWT whose `token_version` doesn't match the DB.
- The client (`drone/src/app/lib/api-client.tsx`) handles the 401 by calling `POST auth/refresh` (cookie), then retries once.
- Refresh (`auth.service.ts` `refreshAccessToken`) re-reads the user, so the new JWT carries the new `token_version` and `role`. It also **rotates the verifier**.

Tests to write:
1. Log in → grant Pro (admin `POST /purchases/pro-membership`, or simulate the webhook) → old access token gets 401 on `GET /auth/profile` → refresh with the cookie returns 200 → new token's profile shows `role: pro` and `pro_membership_expires_at` set.
2. The same for a course grant: `has_access` is true after refresh.
3. **Suspected bug:** two parallel `auth/refresh` calls with the same refresh cookie. Both may pass the bcrypt compare, then each saves a different verifier, so one cookie no longer matches the DB and a later refresh fails. That would log the user out. The client doesn't share one refresh across parallel 401s, and the course page polls right after checkout, so this is plausible. Write a test that reproduces it. If it's real, fix it by:
   - sharing a single refresh promise in `api-client.tsx`, and/or
   - giving the backend a short grace window that accepts the previous verifier.

## 4. After tests pass

1. Commit (only when the user asks).
2. ~~U12~~ **Done Oct 3 2026** through the Stripe CLI: sandbox endpoint `we_1UMRxw2Rw6cpyMyJJbwwf3HU` → `https://thedroneedge.com/api/purchases/webhook`, with the 8 events above. It uses the account-default API version, `2026-01-28.clover`, the same as the local test run. To get the `whsec_…`: Dashboard (sandbox) → Developers → Webhooks → that endpoint → Signing secret → Reveal. Until the deploy, every delivery gets a 400 and Stripe retries it.
3. Deploy, **only on the user's explicit go**: `TF_VAR_stripe_webhook_secret=whsec_… ./pipeline.sh --env dev`. This is production.
4. In the Dashboard, resend an event and confirm a 200. Then O5 smoke test on the site with test cards, and O6 cleanup (refund, cancel, deactivate the test account).
5. Cutover to live: § 8 of the test plan (G4–G9).
