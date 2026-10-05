# Tagged links (UTM sheet) — Oct 2026 announcements

One tagged link per place we hand a URL out, so the admin **Leads** tab and the queries in [`../tech/analytics-queries.md`](../tech/analytics-queries.md) § 1.1a show which one worked. Launch plan item **W8** ([`../tech/launch-website-plan.md`](../tech/launch-website-plan.md)).

*Created 2026-10-03.*

## How tagging works here

- The site keeps the tags from a visitor's **first** tagged visit for 90 days (`de_attr` cookie, set in `drone/src/middleware.ts`). A waitlist signup a week later is still credited to the link they first clicked.
- Tags land on `leads` rows (`utm_source`, `utm_medium`, `utm_campaign`, `utm_content`) and on signed-in `page_view` events.
- **Rules:** lowercase, hyphens not spaces, never change a tag after the link is out. Add a new row instead.
- `utm_source` = who/where (`actionspace`, `linkedin`), `utm_medium` = channel type (`email`, `social`, `qr`), `utm_campaign` = the moment (`oct8-announce`), `utm_content` = which link when one message has several.

## Links

### Oct 8 — announcement 1 (event organizers send it)

| Use | Link |
|-----|------|
| Organizer email — main link | `https://thedroneedge.com/?utm_source=actionspace&utm_medium=email&utm_campaign=oct8-announce` |
| Organizer email — Drone Building waitlist | `https://thedroneedge.com/courses/tracks/building?utm_source=actionspace&utm_medium=email&utm_campaign=oct8-announce&utm_content=building` |
| Organizer email — try Unit 1 free | `https://thedroneedge.com/courses?utm_source=actionspace&utm_medium=email&utm_campaign=oct8-announce&utm_content=unit1` |
| Event page / Slack / Discord post | `https://thedroneedge.com/?utm_source=actionspace&utm_medium=community&utm_campaign=oct8-announce` |

### Oct 16 — announcement 2

| Use | Link |
|-----|------|
| Organizer email — pricing | `https://thedroneedge.com/pricing?utm_source=actionspace&utm_medium=email&utm_campaign=oct16-announce` |
| Organizer email — Drone Building waitlist | `https://thedroneedge.com/courses/tracks/building?utm_source=actionspace&utm_medium=email&utm_campaign=oct16-announce&utm_content=building` |

Launch promo code (E8, batch 2): when it exists, append `&promo=CODE` to the pricing link. Don't add it before X3 ships.

### Social bios and posts (E2: LinkedIn, Instagram, YouTube)

| Use | Link |
|-----|------|
| LinkedIn company page — website field | `https://thedroneedge.com/?utm_source=linkedin&utm_medium=social&utm_campaign=bio` |
| Instagram bio | `https://thedroneedge.com/?utm_source=instagram&utm_medium=social&utm_campaign=bio` |
| YouTube channel links | `https://thedroneedge.com/?utm_source=youtube&utm_medium=social&utm_campaign=bio` |
| Any single post (copy and set `utm_content` to a short post slug) | `https://thedroneedge.com/courses/tracks/building?utm_source=linkedin&utm_medium=social&utm_campaign=oct-launch&utm_content=POST-SLUG` |

### Oct 23–25 — Boston talk

| Use | Link |
|-----|------|
| Stage QR code | `https://thedroneedge.com/boston?utm_source=actionspace&utm_medium=qr&utm_campaign=boston-talk` — **`/boston` ships in batch 3 (Y1).** Until then, do not print this QR code. If you need one earlier, point it at `/courses/tracks/building` with the same tags |
| Printed handout / one-pager | `https://thedroneedge.com/boston?utm_source=actionspace&utm_medium=print&utm_campaign=boston-talk` |

### Schools outreach (manual emails)

| Use | Link |
|-----|------|
| School email — curriculum | `https://thedroneedge.com/schools/curriculum?utm_source=outreach&utm_medium=email&utm_campaign=schools-fall26` |
| School email — book a call | `https://thedroneedge.com/consultation?utm_source=outreach&utm_medium=email&utm_campaign=schools-fall26` |

### Field Notes newsletter (monthly)

Every link in an issue: `utm_source=newsletter&utm_medium=email&utm_campaign=nl-YYYY-MM&utm_content=<section>`, sections `lead` · `rules` · `bench` · `practice-q` · `classroom` · `segment`. The forward-to-a-teacher link uses `utm_source=newsletter-forward&utm_content=forward`. The template has them pre-filled: [`assets/newsletter/_template.md`](../../assets/newsletter/_template.md). Results: [`../tech/analytics-queries.md`](../tech/analytics-queries.md) § 1.1b.

| Use | Link |
|-----|------|
| Signup page (bios, talks, email signatures) | `https://thedroneedge.com/newsletter?utm_source=<where>&utm_medium=<channel>&utm_campaign=newsletter-signup` |

## Checking results

Admin → **Leads** tab (filter by interest, CSV export) or run the "Leads by source and campaign" query in [`../tech/analytics-queries.md`](../tech/analytics-queries.md) § 1.1a.

Before handing a link out, open it in a private window and check that the page loads. The `de_attr` cookie should then appear in dev tools → Application → Cookies.
