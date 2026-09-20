# Pricing model — target vs current

Canonical commercial model for Drone Edge: what we sell, what the product does today, gaps, and steps to finish. Dollar figures marked **draft** need leadership sign-off before public marketing.

Related: [`packages.md`](packages.md) (offer ladder) · [`money-model.md`](money-model.md) (attraction / upsell / downsell / continuity design per segment) · [`purchase-flows.md`](../tech/purchase-flows.md) (Stripe flows) · [`features.md`](features.md) (capabilities).

---

## Target commercial model

### B2C (self-serve Stripe)

| SKU | Buyer | Price (target) | Access | Channel |
|-----|-------|----------------|--------|---------|
| **Course — Part 107** | Individual | **$129** one-time | Lifetime that course | In-app PaymentIntent |
| **Course — Video & Photography** | Individual | **$129** one-time | Lifetime that course | Same (when course live) |
| **Course — AI & Drones** | Individual | **$129** one-time | Lifetime that course | Same (when course live) |
| **Bundle — 3 courses** | Individual | **TBD — must exceed $129** (T16 / D10 / MM1) | Lifetime all three | Stripe one-time Price (not built). *$69–79 was a leftover from the $29-era ladder — retired Sep 17 2026.* |
| **Pro — monthly** | Individual | **$29–49/mo draft** | All courses while subscribed | Stripe Checkout subscription |
| **Pro — yearly** | Individual | Optional draft | Same as monthly | Optional Price ID |

**Access rule (target):**

```
has_access(course) =
  admin
  OR active Pro (role=pro AND expires_at > now)
  OR purchased that course
  OR org seat assignment
```

**Purchase policy (target):** logged-in account required; **email verification not required** to buy (verification remains recommended for account recovery).

### B2B (sales-led, not self-serve Stripe)

| Tier | Buyer | Price | Access | Channel |
|------|-------|-------|--------|---------|
| **Pilot** | First school program | Quote (draft) | Seats + term, Part 107 | Quote + manual org |
| **Classroom** | One section / year | Quote (draft) | Seats + school year | Quote + PO/invoice |
| **Program / District** | Multi-section / multi-year | Quote (draft) | Volume seats + agreement | Quote + contract |

Enterprise / school “membership” on the profile is a **consultation CTA**, not a Stripe SKU.

---

## Current tech state (as implemented)

| Capability | Status | Notes |
|------------|--------|-------|
| Course JSON price $129 | **Live in content** | `assets/courses/...` → DB on import |
| One-time course PaymentIntent | **Code live** | Card Element → webhook → `user_courses_purchased` |
| Confirm-payment reconcile | **Code live** | Client fallback if webhook lag |
| Admin course / Pro comp | **Code live** | `POST /purchases/course`, `POST /purchases/pro-membership` |
| Pro Checkout + portal + subscription webhooks | **Code live** | Needs Stripe Price ID + webhook events configured |
| Email verify gate on purchase | **Removed** | Unverified users can buy courses / start Pro Checkout |
| Soft verify banner | **Live** | Nudge only — does not block checkout |
| Bundle SKU | **Not built** | TODO T16 |
| Public `/pricing` page | **Not built** | TODO S2 |
| Live Stripe keys / live webhook | **Not** — sandbox only | Needs NAT egress + Secrets Manager live keys |
| B2B self-serve checkout | **Not built** | By design — quote path |
| Video / AI courses sellable | **Partial** | Pricing assumed $129; content/tracks must be launch-ready |

### Stripe modes

| Mode | When | Keys |
|------|------|------|
| **Test (sandbox)** | Local + staging until gates pass | `pk_test_` / `sk_test_` + test Price IDs |
| **Live** | After NAT, webhook, refund policy | `pk_live_` / `sk_live_` + live Price IDs |

Standard Stripe account is enough; no Enterprise plan required for Cards + Checkout + Billing Portal.

---

## Gaps → finish steps

### P0 — unblock real money

1. **NAT / egress** — backend must reach Stripe + SMTP (`docs/TODO.md` P0 NAT).
2. **Smoke test sandbox** — buy Part 107 with test card; confirm webhook grants access.
3. **Create Stripe Products/Prices (test)** — Part 107 one-time (optional if amount comes from DB); **Pro monthly** recurring → set `STRIPE_PRO_PRICE_ID_MONTHLY`.
4. **Webhook events** — `payment_intent.succeeded`, `checkout.session.completed`, `customer.subscription.created|updated|deleted`.
5. **Customer Portal** enabled in Stripe Dashboard.
6. **Refund / access policy** wording (D9) before paid ads or live keys.

### P1 — complete the commercial surface

7. **Leadership sign-off** — Pro monthly $; bundle $ **above $129** (D10 / MM1); school quote bands.
8. **Public `/pricing`** (S2) — course $129, Pro, CTA to consultation for schools.
9. **Wire tfvars** — `stripe_pro_price_id_monthly` (and yearly if used) → ECS.
10. **Live keys** — Secrets Manager + publishable key; live webhook endpoint + secret.
11. **Bundle SKU** (T16) when attach-rate economics are decided.
12. **Ship Video / AI courses** before selling those SKUs.

### P2 — polish

13. Post-purchase upsell experiments (course → Pro / bundle).
14. Stripe receipts / Customer email consistency with unverified accounts.
15. Offline conversion / Meta CAPI off purchase webhook (paid acquisition build).

---

## Decision log (short)

| Decision | Choice | Why |
|----------|--------|-----|
| Course vs Pro | Both | Lifetime single-course **or** monthly all-access |
| Email verify to buy | **Not required** | Reduce checkout friction; banner still encourages verify |
| Schools on Stripe self-serve | **No** | PO / seats / term need quote |
| Bundle | Deferred | Needs price decision (D10 / MM1). Constraint: **bundle > $129**. The $69–79 draft in older notes is retired. |

---

*Update this file when prices are signed off or a SKU ships. Keep [`packages.md`](packages.md) in sync for the offer ladder narrative. Ladder design (upsell / downsell / kits / sponsors) lives in [`money-model.md`](money-model.md) — this file stays SKU + Stripe facts only.*
