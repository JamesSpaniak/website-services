# Stripe webhook payloads & sandbox test log

What each Stripe event we handle actually looks like, which fields the backend reads, what it writes, and the evidence from sandbox runs. Use it to compare a new payload (new Stripe API version, new flow) against what [`purchase-flows.md`](purchase-flows.md) expects.

Related: [`stripe-sandbox-test-plan.md`](stripe-sandbox-test-plan.md) (test matrix, setup) · [`purchase-flows.md`](purchase-flows.md) (flows + access rule) · handler: [`purchase.service.ts`](../../backend/src/purchases/purchase.service.ts) `handleWebhookEvent`.

---

## 1. Fixtures

Real sandbox events, personal data and one-time secrets redacted, stored in [`backend/test/fixtures/stripe/`](../../backend/test/fixtures/stripe/). Captured from the **Drone Edge sandbox**, event API version **`2026-01-28.clover`** (the account default — webhook payloads use this, not the SDK's pinned `2025-08-27.basil`).

Refresh after a test round (needs `stripe login` on the sandbox; refuses live mode):

```bash
python3 scripts/capture_stripe_fixtures.py --dry-run   # see what's available
python3 scripts/capture_stripe_fixtures.py             # write / refresh
```

[`purchase.webhook.spec.ts`](../../backend/src/purchases/purchase.webhook.spec.ts) replays these through the handler, so a field that moves in a future API version fails a unit test instead of production.

| Fixture | Produced by | Status |
|---------|-------------|--------|
| `payment_intent.succeeded.course` | Course payment (PI carrying course metadata — same as hosted Checkout's `payment_intent_data.metadata`) | ✅ |
| `payment_intent.succeeded.subscription-invoice` | Pro invoice payment (no metadata) | ✅ |
| `customer.subscription.created` | Pro subscribe | ✅ |
| `customer.subscription.updated.cancel-scheduled` | Portal "cancel at period end" | ✅ |
| `customer.subscription.updated.past-due` | Renewal charge failed | ✅ |
| `customer.subscription.updated.other` | Renewal period roll-over | ✅ |
| `customer.subscription.deleted` | Cancel now / retries exhausted | ✅ |
| `invoice.paid.first` | First Pro invoice (`billing_reason = subscription_create`) | ✅ |
| `invoice.paid.renewal` | Renewal (`subscription_cycle`) | ✅ |
| `invoice.payment_failed` | Renewal decline | ✅ |
| `charge.refunded.course` | Full course refund | ✅ |
| `charge.refunded.pro-invoice` | Pro invoice refund | ✅ |
| `checkout.session.completed.payment` | Course via hosted Checkout (browser) | ⏳ needs browser run (T4) |
| `checkout.session.completed.subscription` | Pro via hosted Checkout (browser) | ⏳ needs browser run (T6) |

---

## 2. Field map — what we read, where it lands

| Event | Fields read (clover path) | Effect / table |
|-------|---------------------------|----------------|
| `payment_intent.succeeded` | `metadata.{userId,courseId,productType}`, `amount_received`, `currency`, `customer`, `created` | `productType=course` → `orders` + `order_items` (`COURSE_<id>`, idempotent on PI / event id) → `user_courses_purchased` + `entitlements(source=purchase, order_item_id)` → `purchase_completed`. **No course metadata → skipped** (subscription invoice PIs). |
| `checkout.session.completed` | `mode`, `metadata.userId` / `client_reference_id`, `customer`, `subscription` | `mode=subscription` → save `stripe_customer_id`, fetch subscription → same as subscription sync. `mode=payment` → ignored (PI event fulfils). |
| `customer.subscription.created/updated` | `metadata.userId` (fallback: `customer` → `users.stripe_customer_id`), `status`, **`items.data[0].current_period_end`** (root `current_period_end` is gone in clover), `cancel_at_period_end`, `metadata.duration` | `active / trialing / past_due` → `role=pro`, `pro_membership_expires_at = period end`, `stripe_subscription_id`, `entitlements(source=pro)` via `syncPro`; `cancel_at_period_end` → `pro_cancel_scheduled`. Other statuses → `clearProMembership`. |
| `customer.subscription.deleted` | same user resolution | `role=user`, expiry + subscription id cleared, Pro entitlement revoked (`cancelled`), `PRO_CANCELLED` audit, `pro_cancelled`. |
| `invoice.paid` | **`parent.subscription_details.metadata.userId`** (fallback `customer`), **`lines.data[0].pricing.price_details.price`**, `amount_paid`, `currency`, `billing_reason`, `status_transitions.paid_at` | `orders` row (`PRO_MONTHLY` / `PRO_YEARLY`, idempotent on invoice id) + `pro_started` (first) / `pro_renewed` (cycle). Only place Pro revenue is recorded. |
| `invoice.payment_failed` | user as above, `amount_due`, `attempt_count` | `pro_payment_failed` (access unchanged; status goes `past_due`). |
| `charge.refunded` | `payment_intent`, `amount_refunded`, `refunded`; invoice via **`invoicePayments.list(payment_intent)`** (clover has no `charge.invoice`) | `orders.payment_status = refunded / partially_refunded`; full refund revokes that order's course entitlement + legacy row, `REFUND_ISSUED`, `refund_issued`. |

**clover vs older versions** — the handler already tolerated the moved fields (`parent.subscription_details`, `pricing.price_details`, item-level period end). The one gap was `charge.invoice`, fixed Oct 1 2026 (Pro refunds were silently unmatched).

---

## 3. Sandbox test log — Oct 1 2026 (local stack, Drone Edge sandbox)

Run against local API + Postgres with `stripe listen` forwarding the eight events. Users `buyer1`–`buyer3` (sandbox only). Hosted pages can't be clicked from the terminal, so Checkout completion was reproduced by creating the same objects through the API; T4/T6 browser runs remain.

| # | Flow | Result | Evidence |
|---|------|--------|----------|
| T1 / T4 (API) | Course Checkout session | ✅ | Session: `mode=payment`, `amount_total` = DB price, existing `cus_…`, metadata `{userId, courseId, productType: course}`, success `…/courses/1?purchase=success&session_id={CHECKOUT_SESSION_ID}`, cancel `…?purchase=1` |
| T1 | Course fulfilment via `payment_intent.succeeded` | ✅ after fix | `orders` succeeded 2900, entitlement `purchase` linked to order item, `has_access=true` |
| T2 | `confirm-payment` / `confirm-checkout` fallback | ✅ | Idempotent `{granted, alreadyOwned: true}`; other account → 403; unpaid session → 400 |
| T6 (API) | Pro Checkout session | ✅ | `mode=subscription`, 3500, metadata on session + subscription, `billing_address_collection=auto`, `allow_promotion_codes=false` |
| T6 | Pro fulfilment | ✅ | `role=pro`, expiry +1 month, customer + subscription ids, `orders` 3500 `PRO_MONTHLY`, Pro entitlement, `pro_started`, all courses unlocked |
| T7 | Guards | ✅ | Re-buy owned course → 400; Pro user buying course → 400; second Pro checkout → 400 |
| T8 | Cancel at period end | ✅ | `pro_cancel_scheduled`, role + access unchanged |
| T9 | Cancel now | ✅ | `role=user`, Pro entitlement revoked `cancelled`, `pro_cancelled`, access false |
| T10 | Renewal (test clock +33 d) | ✅ | 2nd `orders` row 3500, `pro_renewed`, expiry + entitlement `ends_at` +1 month |
| T11 | Renewal failure → retries exhausted | ✅ | `past_due` keeps Pro + `pro_payment_failed`; after retries Stripe cancels → revoked |
| T12 | Full course refund | ✅ | Order `refunded`, entitlement revoked `refund`, legacy row deleted, access false |
| T13 | Pro invoice refund | ✅ after fix | Order `refunded` 3500 (Pro access follows the subscription, not the refund) |
| T14 | Duplicate / concurrent delivery | ✅ after fix | Resend → 2xx, no duplicate order/entitlement |
| T15 | Missing / bad signature | ✅ | 400, nothing written |
| — | Webhook through Next.js `/api` proxy (production path) | ✅ | `localhost:8080/api/purchases/webhook` → 201, signature verified |
| — | Portal session | ✅ | `billing.stripe.com` URL returned |

### Bugs found and fixed in this run

| Bug | Impact before fix | Fix |
|-----|-------------------|-----|
| Global JSON body parser ran before the webhook → `constructEvent` got an object, not raw bytes | **Every webhook 400** — locally and, once PA41 is enabled, in production. Course buys only worked via the client `confirm-payment` fallback; Pro never fulfilled | Raw body parser for `/purchases/webhook` in [`main.ts`](../../backend/src/main.ts) |
| `charge.refunded` had no invoice id on clover | Pro refunds never recorded | Resolve invoice through `invoicePayments.list` |
| Concurrent duplicate delivery hit the `user_courses_purchased` primary key | One delivery answered 409 (Stripe retries → eventually fine, but shows as failing) | Unique violation treated as already fulfilled |
| Subscription-invoice PIs logged `payment_intent.succeeded missing metadata` as **error** | False error on every Pro payment (would trip webhook alerts, T5) | Skipped quietly when the PI has no course metadata |

### Open observations

- **Product events are not idempotent per Stripe event.** A redelivered or repeated `customer.subscription.updated` re-emits `pro_cancel_scheduled`; a duplicate `customer.subscription.deleted` emits `pro_cancelled` twice. Money/access tables are idempotent; analytics counts can double. TODO **PA42**.
- Disputes / chargebacks (`charge.dispute.*`) are not handled — access stays after a chargeback. TODO **PA43**.
- Two `stripe listen` processes forwarding at once produce concurrent duplicate deliveries — useful as a stress test, but run one listener for normal testing.
