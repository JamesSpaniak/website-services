# Pricing, sales, promo codes and giveaways

How to change a price, run a sale, hand out a code, or give the course away. Why it works this way: [`../../docs/tech/pricing-and-promotions.md`](../../docs/tech/pricing-and-promotions.md).

**One rule:** money changes happen in the **Stripe Dashboard**, never in our database or the admin course editor. After any change, open **Admin → Pricing & promos** and press **Sync now** (the site also picks changes up within 1–5 minutes).

**Try it in the sandbox first.** Make the same change in the Stripe sandbox (Dashboard → toggle *Test mode* / the sandbox account), check it on the local site (`localhost:8080/pricing`), then repeat in live. Lookup keys and codes have the same names in both.

## Run a site-wide sale (e.g. $79 for a week)

1. Stripe → **Product catalog → Coupons → New**.
   - Type: *Fixed amount* `$50.00` (or *Percentage*).
   - Duration: *Once*.
   - **Apply to specific products:** pick the course product (needs the course linked to a Stripe product — TODO **PP1** for live; until then use a *Percentage* coupon with no product limit — `38.76%` turns $129 into $79.00, and note it also discounts Pro's first month).
   - **Redemption limits → Limit the date range:** the sale's last day.
2. On the coupon → **Create promotion code**.
   - Code: e.g. `SALE79`.
   - Expires: same last day.
   - **Metadata:** key `site_sale`, value `true`. This is what makes it the site sale.
3. Admin → Pricing & promos → **Sync now**. Check:
   - *Site sale* shows the code and end date;
   - `/pricing`, the course page and course buttons show ~~$129~~ $79 with "SALE79 applied at checkout · ends …".
4. Share plain links (no code needed): `https://thedroneedge.com/pricing`. Checkout applies the sale automatically.
5. **Ending early:** Stripe → the promotion code → *Archive* (or deactivate), then Sync now. It also ends by itself at the expiry.

Only one site sale runs at a time (the newest active one wins). During a sale, buyers can't type a different code on Stripe's page; a `?promo=CODE` link still works and the bigger discount wins.

## Create a promo code for a channel (announcement, partner, creator)

1. Reuse a coupon or create one (step 1 above). Leave `site_sale` **off**.
2. Create a promotion code per channel: `EDGE25` (announcement), `BOSTON` (talk), `PARTNERNAME`…
   - Optional limits: *Limit to first-time customers*, *Limit the number of redemptions*, *Expiration date*.
3. Share the link with the code pre-applied: `https://thedroneedge.com/pricing?promo=BOSTON` (any page works; the code is remembered for 30 days). Add UTM tags per [`../../docs/marketing/utm-links.md`](../../docs/marketing/utm-links.md).
4. Results: Admin → Pricing & promos → *Promotion codes* — checkouts, discount given, revenue and refunds per code.

Codes can also be typed on Stripe's checkout page when no site sale is running.

## Give the course away (no payment)

Admin → **Users → Signup links → New signup link**.

- **One person:** Uses `1`, optionally lock to their email (we email them the link).
- **A group / event** ("first 30 at the talk"): Uses `30`, no email. Share `https://thedroneedge.com/register?signup=<code>` or a QR code of it.
- Set *Expires in* to match the offer.

Redemptions show in the table (`3 / 30 used`).

**Never make a 100%-off course code in Stripe:** a $0 checkout creates no payment, and course access is granted from the payment — the buyer would pay nothing and get nothing. Use a signup link.

## Change a list price

1. Stripe → the product → **Add another price** (same currency, one-time for the course, monthly for Pro).
2. In the new price's **Lookup key** field enter the existing key (`part107_course` / `pro_monthly`) and tick **Transfer lookup key from another price**.
3. Archive the old price (optional — existing orders keep their price).
4. Admin → Pricing & promos → **Sync now**. The *Prices* table shows the new Stripe amount and *In sync*; the site and checkout use it immediately.

Never change the price in the admin course editor while the course has a lookup key — the next sync overwrites it.

## Link a product to Stripe the first time (PP1)

1. Stripe → the product → its price → set **Lookup key** (e.g. `part107_course`). The product needs a **tax code** (`txcd_10000000`, General electronically supplied services) for Managed Payments.
2. Admin → Pricing & promos → *Prices* → type the key in that product's row → **Link**.
3. The row should show *Stripe (lookup key)*, the Stripe amount and *In sync*. A red *Problem* explains what to fix (wrong mode, no tax code, archived product…).
4. To undo: clear the key → **Unlink**. Checkout goes back to the inline price from the course.

## Checks after any change

- Admin → Pricing & promos: no *Problem* or *Drift* badges.
- `/pricing` shows the expected price; a private window with `?promo=CODE` shows the code's price.
- Alert "Stripe config error" in Grafana means a linked price failed validation — the tab says why; checkout keeps working on the inline price meanwhile.
