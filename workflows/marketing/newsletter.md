# Newsletter workflow — sending Field Notes

Ordered steps to draft, approve and send one monthly issue. Strategy, sections, audience and consent rules: [`docs/marketing/newsletter-plan.md`](../../docs/marketing/newsletter-plan.md) (publishing design: § 8 "Publishing and updates"). Issue files: [`assets/newsletter/`](../../assets/newsletter/).

**Send day:** first Tuesday of the month, ~10:00 ET. July + August = one summer issue (early July). At most one extra dispatch a month, only for real news.

**The rule of thumb:** edit in the repo, upload the file. The repo file is the draft; the live site's database is the record of what was approved and sent.

---

## 1. Pre-flight (once, then re-check each month)

If any row fails, fix it before sending — do not send around it.

| Check | How to verify |
|-------|---------------|
| SES bounce/complaint events are recorded | `ses_events_subscription_enabled = true` is **applied** (not just in tfvars); a test bounce to `bounce@simulator.amazonses.com` sets `leads.bounced_at` |
| Postal address in the footer | `marketing_postal_address` set in tfvars; the test send shows it (CAN-SPAM) |
| Unsubscribe works | In the test send, the footer link opens `/unsubscribe` with your lists; Gmail / iOS Mail show their own Unsubscribe button (RFC 8058 header) |
| Production SES access | SES console → Account dashboard shows production access, not sandbox |
| Reply-to is monitored | `SES_REPLY_TO` points at an inbox someone reads (**NL-D4**); replies answered within 2 school days |

## 2. Draft — local, in git (week before send)

1. Copy [`assets/newsletter/_template.md`](../../assets/newsletter/_template.md) to `assets/newsletter/YYYY-MM.md`. Set `slug: YYYY-MM` (lowercase, e.g. `2026-11`), `subject`, `preheader`.
2. Lead item: the month's most useful article (calendar in newsletter plan § 3). Rules watch: check each line against the primary source **that week** and date it.
3. Replace every `nl-YYYY-MM` in the UTM tags. Keep the sales box between `<!-- segment -->` and `<!-- /segment -->` (email only; the web copy drops it).
4. AI may draft; a person rewrites anything that reads like marketing. Notes for yourself go in `<!-- comments -->` — they are stripped on upload.

## 3. Preview — local admin

Run the stack locally (`backend` on 3000, `drone` on 8080), sign in as admin, open **Admin → Newsletter**.

1. **Choose .md file** (or paste) → **Check (no save)**. Fix every item in "Check before sending" (unfilled `<placeholders>`, `nl-YYYY-MM`, untagged links, word count).
2. Look at all three tabs: **Email** (exact HTML subscribers get — switch to *Phone width*), **Web page** (what `/newsletter/<slug>` shows), **Plain text**.
3. Edit the file in the repo, check again. Local email sending is not configured, so nothing is ever mailed from your laptop.

## 4. Fact-check and approve — live site

| Check | Against |
|-------|---------|
| Every product claim | [`docs/sales/features.md`](../../docs/sales/features.md), [`docs/sales/positioning.md`](../../docs/sales/positioning.md) § Prohibited |
| Every FAA / FCC line | Primary source link + date; "no change" is a valid line |
| Practice question | Original — not from the course question bank |
| Commercial asks | One segment block, at most one other plain mention, no newsletter-only discounts |
| Students | Nothing addressed to students; the web copy is something a teacher could share with a class |

1. On **thedroneedge.com → Admin → Newsletter**, upload the same file → **Upload**. It creates the draft (or replaces it — the `slug` decides which issue).
2. **Send test to me** → read it on phone and desktop, Gmail dark mode; click every link, the View in browser line, the unsubscribe link.
3. Something wrong? Fix the file in the repo and upload again (approval resets automatically).
4. **Approve.**

`lists:` should be `newsletter` only. Waitlist-only leads (`building`, `part107`, `schools`) did **not** consent to the newsletter (**NL-D3**).

## 5. Send — live site

1. **Count recipients** — compare with last month (newsletter plan § 5 targets). A big unexpected jump means the wrong list.
2. **Send to N** → confirm. It sends in the background; the page refreshes the count every few seconds and the issue turns **sent** when done.

The send never mails a student in a school account (excluded even if their address is on a list), sends one copy per address, and records each address in `newsletter_sends`. If a deploy or crash stops it halfway, the issue stays **sending**: press **Resume stopped send** — addresses that already got it are skipped, so nobody gets two copies.

## 6. After sending

1. The **email can't change**. The **web copy** (`/newsletter/<slug>`, the View in browser link) can:
   - Typo → fix the file, add `correction: Fixed a typo in Rules watch` to the front matter, upload. The page shows "Updated <date>: …".
   - Factual error (rule date, price) → same web correction **plus** a one-line correction at the top of next month's issue.
   - Error that could cause harm (e.g. a wrong safety rule) → web correction and a short correction email as that month's one dispatch (new slug, e.g. `2026-11-correction`).
2. The web copy is unlisted and `noindex` for 7 days, then appears under "Recent issues" on `/newsletter`.
3. Commit the final `assets/newsletter/YYYY-MM.md` (record the send date and count in a comment).
4. Day 7: open the issue in **Admin → Newsletter → Results** — delivered, people who clicked (click rate), clicks by section, unsubscribes, complaints; *Show who clicked* lists people for follow-up (e.g. a teacher who clicked the consultation link — reach out personally, never add them to another list). Note the numbers in the issue file. For signups and purchases, run [`docs/tech/analytics-queries.md`](../../docs/tech/analytics-queries.md) § 1.1b. Ignore opens (Apple Mail Privacy Protection); "scanner clicks" are school/corporate mail filters and are already excluded.
5. Unsubscribes > 1% or complaints > 0.1%: review content and frequency before the next issue.
