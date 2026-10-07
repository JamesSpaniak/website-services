# Pricing, sales, promo codes and giveaways

Canonical reference for where prices and discounts live, how the site stays in step with Stripe, and what the admin **Pricing & promos** tab shows. Step-by-step tasks (run a sale, create a code, change a price) are in [`../../workflows/sales/pricing-and-promos.md`](../../workflows/sales/pricing-and-promos.md). Checkout mechanics: [`purchase-flows.md`](purchase-flows.md).

## 1. Rule: Stripe owns money, the site reads it

| Thing | Source of truth | Our copy |
|-------|-----------------|----------|
| Course list price | Stripe **Price** found by its **lookup key** (e.g. `part107_course`) | `courses.price` + `products.list_price_cents`, overwritten by the sync (§ 3) |
| Pro price | Stripe Price — lookup key if set on the `PRO_MONTHLY` product row, else `STRIPE_PRO_PRICE_ID_MONTHLY` | `products.stripe_price_id` / `list_price_cents` |
| Discounts (sales, codes) | Stripe **coupons** + **promotion codes** | None. Read live (cached 60 s) |
| Site-wide sale | A promotion code with metadata `site_sale = true` | None |
| What each order paid / which code | Stripe Checkout Session | `checkout_completions` (§ 5), `orders` |
| Free giveaways | Our **signup links** (no money moves) | `signup_links` |

Never lower the list price to run a sale — use a coupon so the site can show ~~$129~~ $79 and refunds/reports keep the real list price.

**Keep Stripe and the website in sync.** Change prices and discounts **only in Stripe**. Then press **Sync now** in Admin → Pricing & promos (or wait: the API re-reads Stripe every 5 minutes for prices and every 60 s for promotions, and at boot). Do not edit the course price in the admin course editor while the course has a lookup key — the next sync overwrites it. The tab flags any product whose database price differs from Stripe.

## 2. Fallback: nothing here is blocking

Every piece degrades to the pre-Oct 7 behaviour:

- **No lookup key / Stripe unreachable / price invalid** → course checkout sends an inline `price_data` from `courses.price` (with `tax_code`), exactly as before. Problems are logged and counted as `stripe.config_errors{check="product_price"}` (alert "Stripe config error").
- **No site sale** → checkout shows Stripe's own "Add promotion code" box; a `?promo=` code is pre-applied as before.
- **`GET /pricing` fails** → the site shows the price it already has (`course.price` from the course API, or the `$129` / `$35` fallbacks in `lib/pricing.ts`).

Moving the live course from the inline price to a Stripe product is a TODO (**PP1**), not a launch blocker. Until it is done, coupons limited to specific products (`applies_to`) cannot apply to the course — use percent-off coupons with no product restriction.

## 3. Price sync

`PricingService` (`backend/src/purchases/pricing.service.ts`):

1. For each active `products` row with a `stripe_lookup_key` (or, for Pro, a configured price id), fetch the active Stripe Price (`prices.list({ lookup_keys, active: true, expand: ['data.product'] })`).
2. Validate: same mode as the secret key, `currency = usd`, one-time for courses / recurring for Pro, product has a `tax_code` when Managed Payments is on.
3. Write `products.stripe_price_id`, `stripe_product_id`, `list_price_cents`, `price_synced_at`; for a course also `courses.price`. Each correction is logged as drift (`pricing.drift_corrected` log line) so a stray admin edit is visible.
4. Cache the resolved price for 5 minutes; checkout uses `line_items: [{ price }]` when resolved, inline `price_data` otherwise.

Runs at boot, on cache expiry, and from **Sync now** (`POST /pricing/admin/sync`). To change which Stripe price a product uses, move the lookup key in Stripe (`transfer_lookup_key` when creating the new price) — no deploy and no database edit. To link a product the first time, set its lookup key in the admin tab (`PATCH /pricing/admin/products/:sku`).

Lookup keys are per Stripe mode, so use the **same key name** in the sandbox and live accounts. Course ids differ per environment (1 locally, 35 in prod), so the key is stored on the per-environment `products` row (`COURSE_<id>`).

## 4. Discounts at checkout — best offer wins

For each checkout the server builds the candidate list:

1. the buyer's code (`de_promo` cookie from a `?promo=CODE` link), if it is an active Stripe promotion code;
2. the active **site sale**: the newest active promotion code whose metadata has `site_sale = true` and that has not expired or run out.

A candidate counts only if its coupon applies to this product (`applies_to.products` empty, or contains the product's Stripe product id; inline-priced courses have none) and the price meets `restrictions.minimum_amount`. The candidate with the larger discount on this product wins (ties go to the buyer's code) and is pre-applied with `discounts: [{ promotion_code }]`. With no candidate, the session sets `allow_promotion_codes: true`.

Stripe Checkout cannot pre-apply one code and also accept another, so **during a site sale buyers cannot type a different code on Stripe's page**; a code shared as a `?promo=` link still works (best offer wins). Stripe enforces `first_time_transaction`, per-customer limits and expiry at payment time — the site's displayed price may be optimistic for a code the buyer turns out not to qualify for.

Session metadata records `promo_code` and `promo_source` (`code` | `sale`), and `checkout_started` / `pro_checkout_started` product events carry them.

## 5. What was redeemed — `checkout_completions`

Written from `checkout.session.completed` (course and Pro), idempotent on the session id:

| Column | Notes |
|--------|-------|
| `stripe_checkout_session_id` | PK |
| `user_id` | FK users, `ON DELETE SET NULL` (account deletion keeps the money record, like `orders`) |
| `mode`, `sku` | `payment` / `subscription`; `COURSE_<id>` / `PRO_MONTHLY` |
| `promotion_code_id`, `promotion_code`, `coupon_id` | null when no discount |
| `promo_source` | `code` / `sale` / `checkout` (typed on Stripe's page) / null |
| `amount_subtotal_cents`, `amount_discount_cents`, `amount_tax_cents`, `amount_total_cents` | from the session |
| `stripe_payment_intent_id`, `stripe_subscription_id` | join to `orders` for refunds |
| `completed_at` | session `created` time |

The admin tab aggregates per promotion code: checkouts, discount given, revenue, refunds (joined through `orders`).

## 6. Public API

`GET /api/pricing?promo=CODE` (no auth, cached): what the site shows.

```jsonc
{
  "sale": { "code": "SALE79", "label": "$50 off", "ends_at": "2026-10-20T03:59:59Z" } | null,
  "products": {
    "COURSE_35":   { "sku": "COURSE_35", "course_id": 35, "list_cents": 12900, "final_cents": 7900, "interval": null,
                     "promotion": { "code": "SALE79", "source": "sale", "label": "$50 off", "ends_at": "…", "duration": "once" } | null },
    "PRO_MONTHLY": { "sku": "PRO_MONTHLY", "list_cents": 3500, "final_cents": 2625, "interval": "month",
                     "promotion": { "code": "EDGE25", "source": "code", "label": "25% off", "duration": "once", "duration_in_months": null } }
  }
}
```

For Pro, `final_cents` is the first period; `duration` (`once` / `repeating` / `forever`) says how long it lasts. The site renders this with `PriceText` / `PromoNote` (`drone/src/app/ui/components/price-tag.tsx`).

## 7. Admin — Pricing & promos (`/admin/pricing`)

- **Prices:** per product — Stripe lookup key (editable), Stripe price id, Stripe amount vs site amount, in-sync / drift / problem badges, **Sync now**.
- **Site sale:** the active sale (code, discount, ends), or how to start one.
- **Promotion codes:** every Stripe promotion code (active and recent inactive): discount, applies to, expiry, Stripe's redemption count / limit, first-time-only, plus our checkouts / discount / revenue / refunds. Links open the coupon in the Stripe Dashboard. Codes are **created and edited in Stripe**, not here.
- **Giveaways:** link to Admin → Users → Signup links (one-time or multi-use).

## 8. Giveaways — signup links

`/register?signup=CODE` grants the listed courses free at signup (`source = 'signup_link'`). Links are one-time (optionally locked to an email) or **multi-use** (`max_uses` 2–1000, no email lock) for events ("first 30 at the talk"). Redemptions are rows in `user_courses_purchased` / `entitlements` with the link id.

## 9. Open

- **PP1** — set lookup key `part107_course` on the live Part 107 price (sandbox done Oct 6 2026: existing prices got `part107_course` / `pro_monthly`), `tax_code txcd_10000000`, then set it on `COURSE_35` in the admin tab. Until then the live course stays inline (§ 2).
- Pro yearly is not sold; the sync ignores `PRO_YEARLY` unless it gets a key.
- Scheduled sales (start in the future) — Stripe codes have no start date; create the code on the start day, or set it inactive and activate it then.
