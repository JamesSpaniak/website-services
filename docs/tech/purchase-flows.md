# Purchase & membership flows

How B2C checkout works in code, what each SKU grants, and permission pitfalls.

Canonical pricing: [`docs/sales/packages.md`](../sales/packages.md) · target vs tech checklist: [`docs/sales/pricing-model.md`](../sales/pricing-model.md). API surface: [`backend-data.md`](backend-data.md). Frontend: [`frontend-data.md`](frontend-data.md).

---

## Flows

### A — Buy one course (lifetime)

```
Logged-in account (email verification **not** required)
  → POST /purchases/create-payment-intent { courseId }
  → Stripe.js confirmCardPayment
  → Stripe webhook payment_intent.succeeded
  → recordCourseOrder() → orders + order_items (idempotent on PI / event id)
  → purchaseCourse() → user_courses_purchased + entitlements(source=purchase, order_item_id)
  → product_events: purchase_completed
  → GET /courses/:id has_access=true
```

Client also polls `has_access` and can call `POST /purchases/confirm-payment` if the webhook was slow (same order/entitlement path, idempotent).

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
  → has_access true for every course until cancel/expire
```

Manage/cancel: `POST /purchases/billing-portal` → Stripe Customer Portal → return `/profile`. Cancellation (`customer.subscription.deleted`) → `revokePro('cancelled')` + `PRO_CANCELLED` audit + `pro_cancelled`; the midnight expiry cron → `revokePro('expired')` + `PRO_EXPIRED` + `pro_expired`.

### C — Enterprise / schools

Not Stripe self-serve. Quote → admin creates org → seat/course assignment. Profile CTA → `/consultation`. Money is recorded with **`POST /orders/manual`** (`payment_method = po | invoice | comp`, `SEATS_*` / course SKUs, optional `organizationId`) so B2B revenue and seat counts appear in `v_org_utilization` / `v_user_revenue`. Org members' course access stays derived from `organization_members × organization_courses` (no entitlement rows).

**Ledgers:** `user_courses_purchased` + `users.pro_membership_expires_at` remain the source of truth for `hasAccess`; `entitlements` is dual-written and reconciled nightly (`analytics_reconciliation`). Switch to `entitlements` after 14 clean nights (**PD22** / TODO **PA36**). Webhook events to enable in Stripe: `payment_intent.succeeded`, `checkout.session.completed`, `customer.subscription.*`, **`invoice.paid`, `invoice.payment_failed`, `charge.refunded`**.

---

## Config

| Variable | Where | Purpose |
|----------|--------|---------|
| `STRIPE_SECRET_KEY` | Secrets Manager / `.env` | API auth (test or live) |
| `STRIPE_WEBHOOK_SECRET` | Secrets Manager / `.env` | Webhook signature |
| `STRIPE_PRO_PRICE_ID_MONTHLY` | ECS env / `.env` | Recurring Price `price_…` for Pro |
| `STRIPE_PRO_PRICE_ID_YEARLY` | ECS env / `.env` | Optional yearly Price |
| `FRONTEND_URL` | ECS / `.env` | Checkout success/cancel + portal return |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Frontend build | Card Element (course path only) |

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
| `PurchaseFlow` | Card Element | Upsell → Checkout | — |
| `/profile` Membership | — | Upgrade / Manage billing | Consult link |
| Admin API | `POST /purchases/course` | `POST /purchases/pro-membership` | Org admin UI |

---

*Commercial target vs tech checklist: [`docs/sales/pricing-model.md`](../sales/pricing-model.md). Update when bundle SKU (T16) or live Price amounts are finalized.*
