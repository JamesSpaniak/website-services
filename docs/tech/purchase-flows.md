# Purchase & membership flows

How B2C checkout works in code, what each SKU grants, and permission pitfalls.

Canonical pricing: [`docs/sales/packages.md`](../sales/packages.md) · target vs tech checklist: [`docs/sales/pricing-model.md`](../sales/pricing-model.md) · sandbox build + test plan: [`stripe-sandbox-test-plan.md`](stripe-sandbox-test-plan.md). API surface: [`backend-data.md`](backend-data.md). Frontend: [`frontend-data.md`](frontend-data.md).

---

## Flows

### A — Buy one course (lifetime)

```
Logged-in account (email verification **not** required)
  → POST /purchases/create-course-checkout { courseId }  → { url }
  → Redirect to hosted Stripe Checkout (mode=payment, price_data from courses.price,
    metadata {userId, courseId, productType=course} on session AND PaymentIntent)
  → Return /courses/:id?purchase=success&session_id=…   (cancel → ?purchase=1)
  → Stripe webhook payment_intent.succeeded
  → recordCourseOrder() → orders + order_items (idempotent on PI / event id)
  → purchaseCourse() → user_courses_purchased + entitlements(source=purchase, order_item_id)
  → product_events: purchase_completed
  → GET /courses/:id has_access=true
```

The course page polls `has_access` and calls `POST /purchases/confirm-checkout { sessionId }` if the webhook is slow (resolves the session's PaymentIntent → same order/entitlement path, idempotent). Legacy `create-payment-intent` + `confirm-payment` (Card Element) stay one release.

**Refund:** `charge.refunded` → `OrderService.applyRefund` — `order_items.refunded_amount_cents`, `orders.payment_status = refunded | partially_refunded`; a **full** refund revokes that line's entitlements (`revoke_reason = refund`), deletes the legacy `user_courses_purchased` row, bumps `token_version`, audits `REFUND_ISSUED`, emits `refund_issued` (**PD18**). Partial refunds change only the money.

### B — Pro monthly (all courses while subscribed)

```
Logged-in account (email verification **not** required)
  → POST /purchases/create-pro-checkout { duration: monthly }
  → Redirect to Stripe Checkout (subscription)
  → Webhooks: checkout.session.completed + customer.subscription.*
  → role=pro, pro_membership_expires_at = period end, stripe_customer_id / stripe_subscription_id
  → entitlements(course_id NULL, source=pro, ends_at = period end) via EntitlementService.syncPro
  → invoice.paid → orders (PRO_MONTHLY / PRO_YEARLY line, idempotent on invoice id) + pro_started | pro_renewed
  → invoice.payment_failed → pro_payment_failed · cancel_at_period_end → pro_cancel_scheduled
  → if the webhook is late: return page (/profile or /courses/:id ?pro=success&session_id=…)
    calls POST /purchases/confirm-pro-checkout { sessionId } → same path as checkout.session.completed
  → has_access true for every course until cancel/expire
```

Manage/cancel: `POST /purchases/billing-portal` → Stripe Customer Portal → return `/profile`. Cancellation (`customer.subscription.deleted`) → `revokePro('cancelled')` + `PRO_CANCELLED` audit + `pro_cancelled`; the midnight expiry cron → `revokePro('expired')` + `PRO_EXPIRED` + `pro_expired`.

### C — Enterprise / schools

Not Stripe self-serve. Quote → admin creates org → seat/course assignment. Profile CTA → `/consultation`. Money is recorded with **`POST /orders/manual`** (`payment_method = po | invoice | comp`, `SEATS_*` / course SKUs, optional `organizationId`) so B2B revenue and seat counts appear in `v_org_utilization` / `v_user_revenue`. Org members' course access stays derived from `organization_members × organization_courses` (no entitlement rows).

**Ledgers:** `user_courses_purchased` + `users.pro_membership_expires_at` remain the source of truth for `hasAccess`; `entitlements` is dual-written and reconciled nightly (`analytics_reconciliation`). Switch to `entitlements` after 14 clean nights (**PD22** / TODO **PA36**). Webhook events to enable in Stripe: `payment_intent.succeeded`, `checkout.session.completed`, `customer.subscription.*`, **`invoice.paid`, `invoice.payment_failed`, `charge.refunded`**.

### Access model — every payment event → access

Access rule: `has_access(course) = admin OR active Pro (role=pro AND expires_at > now) OR owns course OR org seat`. Verified against the sandbox Oct 1 2026 ([`stripe-webhook-payloads.md`](stripe-webhook-payloads.md) § 3).

| Stripe event / action | Access effect | In line? |
|-----------------------|---------------|----------|
| Course paid (`payment_intent.succeeded`, course metadata) | Lifetime access to that course | ✅ |
| Course **full** refund | Course access revoked (legacy row deleted, entitlement `refund`) | ✅ |
| Course **partial** refund | Money only; access kept | ✅ by design (goodwill credit) |
| Pro subscribed | All courses until `current_period_end` | ✅ |
| Pro renewed (`invoice.paid`, `subscription_cycle`) | Expiry moves to the new period end | ✅ |
| Renewal **fails** → `past_due` | **Access kept** during Stripe retries (expiry already moved to the new period end) | ✅ — bounded by the Dashboard rule "cancel after all retries fail" (plan U6). If that setting were "leave past_due", access would continue indefinitely |
| Retries exhausted → Stripe cancels | `customer.subscription.deleted` → Pro revoked | ✅ |
| Customer cancels in Portal (at period end) | Access until period end, then `deleted` → revoked; midnight expiry cron is the backstop | ✅ |
| Admin cancels immediately | Revoked at once | ✅ |
| Pro invoice refunded | Order marked refunded; **Pro stays active** (access follows the subscription) | ✅ by design — to fully reverse, also cancel the subscription (support procedure) |
| Pro ends while user also bought a course | Bought course kept | ✅ |
| Course buy while Pro active / second Pro checkout | Rejected (400) | ✅ |
| Chargeback / dispute | **No effect — access kept** | ❌ gap → TODO **PA43** (manual until then) |
| Duplicate webhook delivery | Orders / entitlements idempotent; **product events can double** | ⚠️ analytics only → TODO **PA42** |
| Purchase completes | `token_version` bump → in-flight JWT refreshes (see callouts) | ✅ — confirm no forced logout in the browser run |

---

### When a webhook fails: retries and fallbacks

There are four layers, each limited, and every one goes through the same idempotent code:

| Layer | Covers | Limit |
|-------|--------|-------|
| Stripe's own retries | Any non-2xx from `/purchases/webhook` (bad signature, a 500 while processing) | Live: about 3 days with growing gaps. Sandbox: a few tries over hours |
| Return-page confirm | The buyer is waiting: `confirm-checkout` (course) and `confirm-pro-checkout` (Pro), called after a few polls | Once per page visit |
| Hourly replay (`StripeEventReplayService`) | Anything still undelivered after 1 hour, for example renewals, cancels and refunds where nobody is on a page | 5 tries per event, then `dead` |
| Dead-event alert | `stripe_events_dead` in admin health, the `stripe.webhook.dead_events` gauge, and an error log | Stays flagged until a person fixes it and sets `stripe_event_replays.resolved_at` |

**Shared sandbox:** local dev and the site use the same Stripe sandbox, so each receives the other's events. `processEvent` ignores any event whose customer isn't stored on a user in this database. Customers are created per environment, so this stops a local test purchase from granting access to the prod user with the same id.

## Config

| Variable | Where | Purpose |
|----------|--------|---------|
| `STRIPE_SECRET_KEY` | Secrets Manager / `.env` | API auth (test or live) |
| `STRIPE_WEBHOOK_SECRET` | Secrets Manager / `.env` | Webhook signature |
| `STRIPE_PRO_PRICE_ID_MONTHLY` | ECS env / `.env` | Recurring Price `price_…` for Pro |
| `STRIPE_PRO_PRICE_ID_YEARLY` | ECS env / `.env` | Optional yearly Price |
| `FRONTEND_URL` | ECS / `.env` | Checkout success/cancel + portal return |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Frontend build | Unused since hosted Checkout (kept until legacy Card Element code is deleted) |

**Stripe Dashboard setup**

1. Product **Pro** → recurring monthly Price → copy `price_…` into `stripe_pro_price_id_monthly`.
2. Webhook endpoint → `https://thedroneedge.com/api/purchases/webhook` (or local Stripe CLI).
3. Events: `payment_intent.succeeded`, `checkout.session.completed`, `customer.subscription.created|updated|deleted`, `invoice.paid`, `invoice.payment_failed`, `charge.refunded`.
4. Enable Customer Portal (cancel / payment method).

---

## Permission issues (callouts)

| Issue | Effect | Mitigation |
|-------|--------|------------|
| Not logged in | Checkout blocked | Register / sign-in with return to course |
| Email not verified | **Does not block purchase** | Soft banner encourages verify for account recovery |
| Active Pro + course PI | Backend rejects one-time buy as redundant | UI offers Manage billing / course already included |
| JWT `token_version` bump after fulfill | In-flight JWT may 401 until refresh/re-login | Profile `?pro=success` reloads profile; course access still uses DB `hasAccess` |
| JWT `role` claim stale | Header may still show `user` briefly | Course gate reads DB Pro expiry, not JWT role (except Admin short-circuit) |
| Pro expires / subscription deleted | Role → `user`; lifetime course rows kept | Daily job also clears expired Pro comps |
| Admin user | Cannot buy/comp-self to Pro | Expected |
| Missing `STRIPE_PRO_PRICE_ID_MONTHLY` | `503` / UI: Pro not configured | Course one-time path still works |
| Webhook missing subscription events | Checkout pays but Pro never activates | Add events above; use portal only after customer id exists |
| Org access vs personal purchase | Either path grants `has_access` | Independent; canceling Pro does not remove org seats |
| NAT / egress down | Stripe API + webhooks fail | Infra P0 before live keys |
| Test vs live key mismatch | Price ID from wrong mode | Price IDs must match `sk_test` / `sk_live` |

---

## UI entry points

| Surface | Course one-time | Pro monthly | Enterprise |
|---------|-----------------|-------------|------------|
| `PurchaseFlow` | Hosted Checkout | Upsell → Checkout | — |
| `/profile` Membership | — | Upgrade / Manage billing | Consult link |
| Admin API | `POST /purchases/course` | `POST /purchases/pro-membership` | Org admin UI |

---

*Commercial target vs tech checklist: [`docs/sales/pricing-model.md`](../sales/pricing-model.md). Update when bundle SKU (T16) or live Price amounts are finalized.*
