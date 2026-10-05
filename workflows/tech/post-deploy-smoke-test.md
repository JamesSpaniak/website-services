# Post-deploy smoke test (agent-runnable)

Run after every `./pipeline.sh --env dev` deploy, which is the **live production site**. Written so a browser agent (Claude in Chrome, in the owner's logged-in Chrome) or a person can follow it. Takes about 15 minutes.

Each step lists what to do, what to **expect**, and when to **stop**. Record results in the table at the bottom and paste it back to the owner.

**Related:** [`deploy.md`](deploy.md) · [`../../docs/tech/stripe-sandbox-test-plan.md`](../../docs/tech/stripe-sandbox-test-plan.md) (full Stripe matrix) · [`../../docs/tech/launch-website-plan.md`](../../docs/tech/launch-website-plan.md) § 4 W9

*Created 2026-10-03 for launch batch 1 + Stripe sandbox.*

---

## Rules for the agent

1. **Payments: confirm test mode, then ask.** Before entering any card, check that the Stripe Checkout page shows the **"Sandbox" / "Test mode"** badge. If there is no badge, **stop** — live keys may be active and a real card would be charged. Even in test mode, ask the owner before each Pay click.
2. **Only test cards:** `4242 4242 4242 4242` (succeeds) and `4000 0000 0000 0002` (declined). Use any future expiry, any CVC and any ZIP. Never type a real card number.
3. **Use the owner's account as it is.** Don't create extra accounts on production, except in step B5 if the owner says yes. Don't change the password, email or profile.
4. **Leave Admin alone except to look.** Only the Users, Leads and Analytics tabs are needed, and only for reading. Never press Send in the broadcast panel; **Count recipients** is the only allowed button.
5. **Stripe Dashboard:** the owner logs in. Refunds (step S4) need the owner's go-ahead.
6. **Don't get stuck.** If a step fails twice, record it as FAIL with what you saw (URL, message, screenshot) and move on. Don't retry in a loop.

## Preconditions

- The deploy finished and the pipeline output shows the new ECS task running.
- The owner is logged in at `https://thedroneedge.com` with an account that **does not own Part 107**.
- The owner has the Stripe Dashboard open in **sandbox** (Developers → Webhooks → endpoint `we_1UMRxw…`).

---

## A. Site (launch batch 1) — logged out or in

| # | Do | Expect | Stop if |
|---|----|--------|---------|
| A1 | Open `/` | Hero, then **two** track cards: FAA Part 107 and Drone Building ("Early access"). No Video or AI cards | Video/AI cards still show (old build is cached or not deployed) |
| A2 | Look at the header | **Pricing** link. When logged out: **Log in** and **Sign up** buttons. Open the header at phone width too | — |
| A3 | Open `/courses/tracks/video`, then `/courses/tracks/ai` | Each ends up on `/courses` (redirect), never a 404 | — |
| A4 | Open `/courses/tracks/building` | "Early access — January 2027", what you build, waitlist form. No price | — |
| A5 | Open `/pricing` | Four plans: Free, Part 107 **$129** (Recommended, "Full refund available. Refund policy"), Pro **$35/mo** ("Cancel anytime."), Schools **From $79/seat**. A strip reads "Full refund available · Lifetime course access · Cancel Pro anytime" with a link to the full policy | Any price differs |
| A6 | Click **Refund & access policy** | `/refunds` loads with 7 sections (30-day tried-it refund, 14-day changed-your-mind, Pro, how to request, lifetime access, FAA fee, questions) | — |
| A7 | Footer | Learn column has Pricing. Company column has Terms, Privacy, **Refund Policy**. Tagline doesn't mention video or AI | — |
| A8 | Open `/schools/curriculum` | Part 107 *Available now*, Drone Building *Early access — January 2027*, Video and AI *Planned* | — |
| A9 | Open `/schools/funding`, search the page for "video and AI" | Not found | — |
| A10 | Open `/?utm_source=smoketest&utm_medium=agent&utm_campaign=w9`, then DevTools → Application → Cookies | Cookie `de_attr` exists and contains `smoketest`. Skip this check if DevTools isn't available | — |
| A11 | `GET https://thedroneedge.com/api/api` (the old Swagger URL) | **Not** the Swagger UI (expect 404) | Swagger UI loads |

## B. Waitlist + email (W3, Z1–Z5)

| # | Do | Expect | Stop if |
|---|----|--------|---------|
| B1 | On `/courses/tracks/building`, enter **the owner's email** and submit | "You're on the list" success message | Error, or a spinner that never ends |
| B2 | Submit the same email again | Same success message. No second confirmation email is sent (by design) | — |
| B3 | Admin → **Leads** | A row with that email, interest `building`, utm_source `smoketest` (if A10 ran first in the same browser). Status shows whether a confirmation was sent | Row missing |
| B4 | Confirmation email | **Until SES production access is granted, it will not arrive.** That's expected; record "SES sandbox". Once access is granted: it comes from `hello@news.thedroneedge.com`, and in Gmail "Show original" shows **DKIM: PASS** and an **Unsubscribe** link next to the sender | After access is granted, it doesn't arrive within 5 minutes |
| B5 | (Only after B4 arrives) Click the footer link **Unsubscribe or change preferences** | `/unsubscribe` shows a masked email and the list. Click "Unsubscribe from all" → confirmation. Leads tab shows the row as unsubscribed | — |
| B6 | Admin → Leads → broadcast panel: pick `building`, any subject, body ≥ 20 chars, **Count recipients** only | Shows a count. If SES isn't configured it also warns that Send will be refused. **Do not press Send** | — |

## S. Stripe (sandbox keys on the live site)

| # | Do | Expect | Stop if |
|---|----|--------|---------|
| S1 | Courses → Part 107 → Purchase → **Buy this course**. On Stripe Checkout, confirm the **test-mode badge**, then ask the owner and pay with `4242 4242 4242 4242` | Redirect back to the course with "Payment received — unlocking…", then Unit 2+ open | No test badge (rule 1). Or still locked after 30 s |
| S2 | Stripe Dashboard → Webhooks → endpoint → recent deliveries | `checkout.session.completed` and `payment_intent.succeeded` delivered with **200** | Any **400**: signature/secret problem. Stop the Stripe section and report it |
| S3 | Admin → Users → owner → **Show learning & revenue** | $129 order, course access with source "purchase" | — |
| S4 | (Owner approves) Stripe → Payments → that payment → **Refund** → Full | `charge.refunded` delivered with 200. After reloading the course, Unit 2 is locked again. Admin shows the order as refunded | Access still open after a reload |
| S5 | Buy again with `4000 0000 0000 0002` | Stripe shows the decline. No access, no new order | Access granted |
| S6 | Profile → **Upgrade / Go Pro** → test badge check → ask the owner → `4242…` | `/profile?pro=success`, shown as Pro, every course opens. Webhooks show `customer.subscription.created` and `invoice.paid` with 200 | — |
| S7 | Profile → **Manage billing** → Cancel subscription → return | Back on `/profile`; still Pro until the period ends. Webhook `customer.subscription.updated` 200 | Portal errors (check customer portal activation, U5) |

## Afterwards (owner)

- Refund the Pro test charge in Stripe if you want a clean ledger. This doesn't change access; Pro follows the subscription, not the refund.
- **SES events, second step:** set `ses_events_subscription_enabled = true` in `terraform/env/dev.tfvars` and run `./pipeline.sh --env dev`. In the SNS console the subscription should show **Confirmed**.
- **Branded click-tracking domain, second step** (`terraform/ses_tracking.tf`): after the first apply, wait until SES → Identities shows `click.news.thedroneedge.com` **Verified** and `curl --head https://click.news.thedroneedge.com/favicon.ico` returns `x-amz-ses-region: us-east-1` and `x-amz-ses-request-protocol: https`. Then set `ses_custom_tracking_domain_enabled = true` and run the pipeline again. Check: a newsletter **test send** has links starting `https://click.news.thedroneedge.com/CL0/…` that land on the right page.

## Results table (paste back)

```
| Step | PASS/FAIL/SKIP | Notes |
|------|----------------|-------|
| A1 | | |
| A2 | | |
| A3 | | |
| A4 | | |
| A5 | | |
| A6 | | |
| A7 | | |
| A8 | | |
| A9 | | |
| A10 | | |
| A11 | | |
| B1 | | |
| B2 | | |
| B3 | | |
| B4 | | |
| B5 | | |
| B6 | | |
| S1 | | |
| S2 | | |
| S3 | | |
| S4 | | |
| S5 | | |
| S6 | | |
| S7 | | |
```
