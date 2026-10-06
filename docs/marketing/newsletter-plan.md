# Newsletter plan — Drone Edge Field Notes (draft)

**Status:** 2026-10-04 — **Phase 1 code done** (NL1–NL8, plus NL16b profile preferences and the org-member guards from § 7 pulled forward); ships with the next deploy. **NL-D1 decided** (Field Notes) and **NL-D8 decided** (free for all, Pro members section); NL-D2–D7 open.

What the monthly newsletter is, who it is for, what each issue contains, how often it goes out, how it maps to the money model, what it looks like on the site and in the inbox, and the build steps. Builds on infrastructure shipped in launch batch 1 ([`../tech/launch-website-plan.md`](../tech/launch-website-plan.md) § 4 Email: W3, Z1–Z5).

Related: [`content-vision.md`](content-vision.md) (voice, truth rules) · [`../sales/money-model.md`](../sales/money-model.md) (offer ladder) · [`../sales/positioning.md`](../sales/positioning.md) (approved / prohibited claims) · [`utm-links.md`](utm-links.md) · [`../tech/analytics-and-attribution.md`](../tech/analytics-and-attribution.md).

---

## 1. Why a newsletter, and what it is not

The site already turns strangers into one-time signups (waitlist, Unit 1 free, consultation). There is no channel that keeps talking to them between that first touch and a purchase, and for schools that gap is months: a teacher who finds an article in October buys through a PO in spring. The newsletter fills that gap.

| Channel | Job | Trigger | Sender |
|---------|-----|---------|--------|
| **Transactional** | Verification, password reset, receipts, invites | User action | Workspace relay, `thedroneedge.com` |
| **Sequences** (Z6, not built) | One person, one moment: waitlist welcome, post-purchase, completion, 24-month recurrent | Event + delay | SES, `news.thedroneedge.com` |
| **Newsletter** (this doc) | Everyone on the list, same month: earn trust, keep Drone Edge in mind until the buying moment | Calendar | SES, `news.thedroneedge.com` |

The newsletter does **not** do upsells that depend on what one person did (finished a course, went quiet, bought a kit). Those belong in sequences. Keeping that split stops the newsletter from turning into a sales email.

**Promise to the reader:** one email a month, a 5-minute read, useful even if you never buy anything. Same test as articles ([`content-vision.md`](content-vision.md) principle 4).

---

## 2. Audience

| Segment | Who | Where they come from | What they want from us |
|---------|-----|----------------------|------------------------|
| **Educators** (primary) | CTE teachers, STEM coordinators, makerspace leads, district admins | School articles, `/schools`, consultation, outreach replies, talks | Classroom ideas, funding and grant timing, regulation explained for a school, proof it works |
| **Learners** | Career changers, aspiring Part 107 pilots, hobbyists going commercial | Part 107 articles, Unit 1 free, `/pricing` | Exam prep, what the certificate leads to, regulation changes |
| **Builders** | Makers, FPV hobbyists, parents of kids who build | Building waitlist, building / hobbyist articles | Build notes, parts, CAD, the Drone Building course timeline |

**Email is adults only. Students reach issues only when a teacher shares them.** Students using Drone Edge through a school account are **never** emailed the newsletter, never asked to sign up, and get **no** newsletter link or prompt anywhere in the product. The archive (`/newsletter/[slug]`) is public, and teachers can share an issue with their class from the manager dashboard (§ 6). The signup form carries "for adults 18+" next to the consent line.

**Why we don't ask students.** Our privacy notice promises we "never send marketing email to school or organization members because of their enrollment", use under-13 data only "for educational purposes that benefit the school and not for unrelated commercial purposes", and "do not use organization members' activity for marketing" ([`drone/src/app/privacy/page.tsx`](../../drone/src/app/privacy/page.tsx) §§ 3–4). On top of that: COPPA school consent covers educational use only; FERPA limits us to the school's authorized purpose; state student-privacy laws (SOPIPA-style laws in most states, Illinois SOPPA, NY Ed Law 2-d) restrict using anything learned through the school service for marketing, at any age; and most district DPAs ban marketing to students outright. A newsletter link or opt-in inside the school product is a prompt that reaches students *because of* their enrollment, so we don't add one. The teacher deciding to share is the school's choice, not ours. Have counsel confirm before any change to this rule. Same rule as [`../tech/product-analytics.md`](../tech/product-analytics.md) § 10 and the money-model rule against selling to minors on B2C.

Because a shared issue reaches students, **web issues drop the segment block** (the sales box) and keep only the content sections and the lead-article link. Classroom corner and the practice question are written so a teacher can share the page with a class as-is.

---

## 3. Frequency and calendar

**Monthly, first Tuesday, ~10:00 ET.** Tuesday morning lands in teachers' planning time rather than Monday's backlog; first-of-month gives a fixed rhythm we can keep with one editor.

Why not weekly: we publish a batch of articles about once a month (the Oct 2026 batch was six), teachers do not want weekly vendor mail, and a missed week is worse for trust than a steady monthly. Revisit at **NL-D2** once the list passes ~2,000 and there is enough material for twice a month.

| Rule | Detail |
|------|--------|
| **Regular issue** | 1 per month. July and August merge into one **summer issue** (sent early July) because teachers are out |
| **Dispatch** | At most **1 extra send per month**, only for a real event: Drone Building early access opens (Jan 2027), a major FAA rule is finalized (Part 108). Short, one topic, one link |
| **Never** | Promo-only blasts, countdowns, "last chance" sends ([`../sales/money-model.md`](../sales/money-model.md) § 6 copy rules) |

### School-year arc

Educator content follows when schools make decisions, so the right topic arrives in the month the reader needs it:

| Months | School-side reality | Lead topics |
|--------|--------------------|-------------|
| **Sep–Oct** | New year, programs launching, fall grant cycles | Starting a program, grant language, Part 107 in CTE |
| **Nov–Dec** | Grant writing, next-year planning begins | Funding guide, "fund the teacher too", kit planning |
| **Jan–Feb** | Course catalogs for next year get set | Drone Building early access, curriculum pacing, pathways |
| **Mar–May** | Budgets and POs, spring flying season | Budget and quote prep, safety-day planning, pilots for fall |
| **Jun–Aug** | PD season, summer camps | Teacher training, summer build projects (merged summer issue) |

### First six issues (tentative)

Lead items draw on the Oct 2026 batch (`assets/articles/import/paste-2026-10/`) so issue 1 needs no new articles.

| Issue | Send | Lead item | Bench notes | Dispatch? |
|-------|------|-----------|-------------|-----------|
| #1 | Tue Nov 3 2026 | *Who Gets to Build Drones?* (skills gap) | Why we design a 3.5" guarded quad | — |
| #2 | Tue Dec 1 | *Drone Grants for Schools (2026): Fund the Teacher Too* + *How to Describe a Drone Program in a Grant Application* | Solder vs pre-soldered, and why both | — |
| #3 | Tue Jan 5 2027 | *Drone Education Programs in 2026: Middle School to Jobs* | Early access is open: what's in it | **Yes**: Building early-access opens |
| #4 | Tue Feb 2 | *Part 107 in High School CTE* | Betaflight setup, first-flight safety gates | — |
| #5 | Tue Mar 2 | *Drone Careers in 2026* | First classroom build report (only with school permission) | — |
| #6 | Tue Apr 6 | New: Remote ID for home-built and FPV drones (article-review queue #7) | Crash, repair, reprint | — |

---

## 4. What each issue contains

**Length:** 600–900 words. **Images:** at most one (the lead article's hero, from the media CDN), so the email reads fine with images off. **One primary CTA** per issue, plus the segment block.

| # | Section | What goes in it | Why it's there |
|---|---------|-----------------|----------------|
| 1 | **The one thing** | The month's lead article: 3–4 sentence answer-first summary, the single most useful number or fact, link to read more | Main value; drives article traffic (SEO/GEO signal) |
| 2 | **Rules watch** | What changed and what *didn't* in drone regulation this month, each line dated and sourced: Part 108 status, FCC Covered List, Remote ID, ACS updates. "No change" is a valid line | Our most defensible authority; nobody else does it in plain language for schools. Feeds the Pro "regulation updates" benefit later |
| 3 | **Bench notes** | Drone Building course development, written as a build log: a design choice, a part, a failure and its fix. Honest about status ("early access January 2027") | Grows and warms the building waitlist; shows the work is real |
| 4 | **Practice question** | One **original** Part 107 question (never from the bank verbatim). Answer and explanation are behind a link to the site | Click-through to Unit 1 free; reminds learners the course exists without selling |
| 5 | **Classroom corner** | One activity, lesson hook, or funding tip a teacher can use this month. Grants: point to programs and deadlines, **never** promise eligibility | Educator value; sets up the consultation ask |
| 6 | **Segment block** | One box that changes by the reader's interest (§ 5) | The one commercial moment, matched to the reader |
| 7 | **Footer** | "Reply and tell us…" prompt, forward-to-a-teacher line, preferences / unsubscribe, postal address | Replies help deliverability and are market research; CAN-SPAM; referral loop |

### Editorial rules

- Every product claim checked against [`../sales/features.md`](../sales/features.md); every FAA or FCC line links to the primary source with a date. Same prohibited list as articles: no pass rates, school counts, grant eligibility, unreleased tracks shown as live.
- Voice: practitioner, plain language, no hype ([`content-vision.md`](content-vision.md) principle 3). Subject line says what's inside; no clickbait, no fake "Re:".
- A person approves every issue before send. AI may draft.
- Each issue stands alone: assume the reader skipped last month.

---

## 5. Mapping to the money model

The newsletter is the **nurture layer** between the attraction offer and the core sale, and later the retention layer for continuity. Most of each issue is value; the ladder shows up in the practice question, the segment block, and the footer.

| Newsletter element | Money-model step ([`../sales/money-model.md`](../sales/money-model.md)) | Offer it points to | Status of that offer | Metric |
|--------------------|-----------------------------------|--------------------|----------------------|--------|
| Signup itself | **Attraction (free)** | The newsletter, optionally with a lead magnet: free 3.5" parts-list PDF, or a free practice exam (**S5**) | Parts list not built; practice exam not built | `lead_captured` with `interest = newsletter`, by `source_path` / UTM |
| Practice question | Attraction → **Core** | Unit 1 free → Part 107 $129 | Live | Clicks `utm_content=practice-q` → `signup_completed` → `purchase_completed` |
| Segment block: learners | **Core** / **Downsell** | Part 107 course; Pro monthly once **MM2** is priced | Course live; Pro price pending | Same chain, `utm_content=segment` |
| Bench notes + segment block: builders | Attraction → **Core (Jan 2027)** → **Upsell (kit)** | Building waitlist → early access → Base kit / Pre-soldered | Waitlist live; course and kit Jan 2027 | Waitlist joins from newsletter; early-access conversion |
| Classroom corner + segment block: educators | B2B **Attraction** | `/consultation` → Pilot → Classroom seats | Live (consultation) | `consultation_submitted` with newsletter UTM |
| Rules watch | **Continuity** (later) | Pro "question bank updates when regulations change"; 24-month recurrent refresher | Pro benefit list not decided (**MM2**) | Pro starts from newsletter clicks |
| "Forward to a teacher" | B2B **referral** | School lead from a B2C reader; referral credit if **MM8** decides one | MM8 open | Signups with `utm_source=newsletter-forward` |
| Sponsor line (≥ issue #6, only after `/sponsors` exists) | B2B **sponsor attraction** | "Sponsor a classroom" | Not built (**MM5**) | Sponsor inquiries |

### Ask budget

| Per issue | Allowed |
|-----------|---------|
| Primary CTA | 1, usually the lead article (not a sale) |
| Commercial asks | 1 segment block, plus at most one plain-text mention elsewhere |
| Discounts | Only real, already-public promo codes (e.g. a launch code). Never a newsletter-only discount on the same SKU; that trains readers to wait (money-model § 1 downsell rule) |
| Third-party ads | None. Revisit only if the list passes ~10k (**NL-D5**) |

### Segment block, by interest

| Reader's lead interests | Block shown |
|------------------------|-------------|
| `schools` | "Planning next year? 20-minute call, we'll map Part 107 to your pathway." → `/consultation` |
| `building` (and not `schools`) | Building status + "Tell us if you'd build in a classroom, club, or at home" (reply), Jan 2027 early access |
| `part107` | Unit 1 free / Part 107 course; Pro once priced |
| `newsletter` only | Rotate: whichever offer matches that issue's lead article |

Phase 1 sends one version to everyone, with a three-line "Which one are you?" block linking all three. Per-interest blocks come in Phase 2 (§ 8).

### What success looks like (draft targets, set our own baselines after 3 issues)

| Measure | Target / guardrail | Source |
|---------|--------------------|--------|
| List growth | +15% month over month for the first 6 months | `leads` |
| Unique click rate | Track; tune subject lines against it. **Do not use opens**: Apple Mail Privacy Protection inflates them | SES click events |
| Unsubscribes | < 0.5% per issue; above 1% means content or frequency is wrong | `leads.unsubscribed_at` |
| Complaints | < 0.1% (Gmail's hard limit is 0.3%) | SES complaint events |
| Hard bounces | < 2% | SES bounce events |
| Money | Consultations, Part 107 purchases, and waitlist joins with `utm_source=newsletter` within 30 days of each issue | `product_events`, orders |

---

## 6. What it looks like on the site

**Where signup appears**, all public marketing routes only:

| Surface | Placement | Form |
|---------|-----------|------|
| **`/newsletter`** (new) | Landing page: what you get, how often, a sample issue, form, archive list (Phase 2) | `WaitlistForm interest="newsletter"` |
| **End of every article** | After the FAQ, before sources. Highest intent: they just read the whole thing | Compact inline block (mockup below) |
| **`/articles` index** | Slim band under the page heading | Compact |
| **Site footer** | Email field + button in the footer column, on public routes | Compact |
| **`/courses/tracks/building`** | Existing building waitlist gets an extra checkbox "Also send me the monthly newsletter" (unchecked) | Two lead rows on submit |
| **`/register`** | Unchecked checkbox "Send me the monthly newsletter (adults only)". Hidden for org-invite registrations | Creates a `leads` row, so there is one unsubscribe system |
| **Consultation thank-you** | "While you wait: get Field Notes monthly" | Compact |
| **`/boston` talk page** | Fourth path alongside the existing three | Compact |
| **Manager dashboard** (teachers) | "This month's Field Notes" with **Share with your class** (copies the archive URL to paste into the class LMS or board). The teacher decides; nothing is pushed to students | None |
| **Not on** | **Nothing newsletter-related in the student-facing product**: no link, banner or form on course lessons, learner dashboard, `/profile` for org members. No signup form on `/manager`, `/admin`, checkout. On public pages, logged-in org members see no form (they may still read issues) | — |

**No popups**, no exit-intent modals: they conflict with the trust rules and annoy the educator audience.

### Article-end block (mockup)

```
┌──────────────────────────────────────────────────────────────┐
│  FIELD NOTES · monthly                                        │
│  Drone rules, classroom ideas and build notes, once a month.  │
│  Five-minute read. No spam.                                   │
│                                                              │
│  [ you@school.org                ]  [ Get Field Notes ]       │
│  For adults 18+. Unsubscribe anytime. Privacy policy.         │
│  See a past issue →                                          │
└──────────────────────────────────────────────────────────────┘
```

### `/newsletter` page (mockup)

```
Field Notes
One email a month on drone education: what changed in the rules,
what works in classrooms, and what we're learning building a
drone course from scratch.

  ✓ Rules watch: Part 107, Part 108, Remote ID, FCC, dated and sourced
  ✓ Classroom corner: one activity or funding tip you can use this month
  ✓ Bench notes: our Drone Building course, built in the open
  ✓ A practice Part 107 question, with the explanation

[ email ]  [ Get Field Notes ]
First Tuesday of each month. Adults 18+. Unsubscribe in one click.

── Recent issues ────────────────────────
  Nov 2026 · Who gets to build drones?
  Dec 2026 · Funding the teacher, not just the drones
```

### The email itself

- Single column, 600 px max, system font stack, brand header as **text + small logo** (not a banner image), dark-mode safe colors, plain-text part always sent (existing `renderEmail` already does both).
- Every link carries `utm_source=newsletter&utm_medium=email&utm_campaign=nl-2026-11&utm_content=<section>`.
- "View in browser" links to the archive page (Phase 2); in Phase 1 the link is omitted.
- From: `Drone Edge Field Notes <hello@news.thedroneedge.com>`; reply-to: a monitored inbox (**NL-D4**).

```
Drone Edge · Field Notes · November 2026
─────────────────────────────────────────
THE ONE THING
About 480,000 people hold an FAA drone pilot certificate.
Far fewer can build one. [3 sentences] → Read the article

RULES WATCH (as of Nov 1)
• Part 108 (BVLOS): still under review, not final. [FAA]
• FCC Covered List: no change since Dec 22, 2025. [FCC]

BENCH NOTES
Why our first build is a 3.5" guarded quad…

PRACTICE QUESTION
You're at 350 ft AGL near a 600 ft tower… → See the answer

CLASSROOM CORNER
A 20-minute "what does this drone weigh?" registration activity…

┌ Which one are you? ─────────────────────┐
│ Teacher → map Part 107 to your pathway  │
│ Learner → Unit 1 is free                │
│ Builder → Drone Building, Jan 2027      │
└─────────────────────────────────────────┘

Reply and tell us what you're building. Forward to a teacher.
Preferences · Unsubscribe · Drone Edge, [postal address]
```

---

## 7. Consent and the existing list

| Source | Can we send the newsletter? | Action |
|--------|-----------------------------|--------|
| `leads.interest = newsletter` | Yes | Default audience |
| `building` / `part107` / `schools` waitlist | **Not by default**: their consent line said "We'll email you about [that topic]" | In the next email they get (welcome sequence or issue #1 launch note), offer one click to "also get Field Notes monthly". Do not add them silently (**NL-D3**) |
| Registered users | No. There is no marketing opt-in on `users` | Register checkbox (§ 6) going forward; existing users get one opt-in invite in a transactional-adjacent notice only if **NL-D3** approves |
| Org members (students) | **Never.** Not emailed, not asked, no in-product link | Signup hidden; never queried by broadcast; `POST /leads` rejects `newsletter` from a logged-in org member. They see an issue only if their teacher shares the public archive URL |

### 7a. Name options (NL-D1)

| Name | Feel | Fits | Watch out |
|------|------|------|-----------|
| **Field Notes** | Practitioner, build-log | Bench notes, classroom corner | Common phrase; pair with brand: "Drone Edge Field Notes" |
| **Preflight** | Aviation checklist, "get ready" | Rules watch, Part 107 audience, teachers planning the month | Some drone apps and blogs use it; check |
| **The Drone Edge Brief** | Plain, professional | District admins, CTE directors | Least memorable; safest |
| **Line of Sight** | Rules + visibility pun (VLOS) | Regulation-led issues | Pun dates if BVLOS becomes normal |
| **Waypoints** | Monthly stops along a path | School-year arc, pathways | Generic in GIS / travel |
| **Ground School** | Learning, aviation | Education audience, Part 107 | Strongly suggests a course, may confuse with the product |
| **The Bench** | Maker, hands-on | Builders | Undersells regulation and classroom content |
| **Prop Wash** | Hobby-insider humor | FPV community | Reads too insider for teachers and admins |

Recommendation: **Field Notes** if the build-in-the-open story is the hook; **Preflight** if regulation and classroom readiness lead. Either works as "Drone Edge ___" in the From line.

### 7b. Customers and Pro subscribers (NL-D8, decided 2026-10-04)

**Decided:** the newsletter is free for everyone who opts in; Pro subscribers who opt in get an extra members-only section inside the same issue. No separate Pro newsletter, no auto-subscribe.

The newsletter is free to everyone, so it is not a perk to give away. The question is how buyers and Pro members get on the list.

| Who | Gets the newsletter? | How |
|-----|---------------------|-----|
| **Registered B2C user** | Only if they opt in | Unchecked checkbox on `/register` (NL4) |
| **Course buyer** | Only if they opt in | One-line opt-in link in the post-purchase email or thank-you page: "Want Field Notes monthly? One click." Not a sent issue, and no marketing content in the receipt itself |
| **Pro subscriber** | Only if they opt in, same as above | Once subscribed, they get a **members block** inside the same issue (new mock exams, question-bank updates after a rule change, early access). One newsletter, not two (NL17) |
| **Teacher / manager** | Only if they opt in | Checkbox in the manager welcome flow; the share card works either way |
| **Org members (students)** | Never | § 7 |

Why opt-in and not automatic: US law (CAN-SPAM) would allow emailing customers with an unsubscribe link, but our privacy notice promises "marketing emails you asked for", and auto-adding buyers raises complaint rates, which hurts SES reputation. A checked-by-default box counts as auto-adding.

**Detecting Pro at send time:** match the lead to a user with an active Pro subscription when rendering the members block (Phase 3). Prefer a `user_id` link stored when NL4 or the purchase opt-in creates the lead; fall back to `leads.email` = `users.email` (misses relay addresses such as Hide My Email, see the table above). Readers who cancel Pro keep the newsletter and lose the block.

Pre-send checklist items (enforced in the runbook): SES events subscription is **on** (so bounces and complaints are recorded; still pending per launch status), `marketing_postal_address` set, dry-run count matches expectation, test send to self reviewed on phone + desktop + Gmail dark mode.

### 7c. Apple — App Store rules and Apple Mail (reviewed Oct 4 2026)

The newsletter is compliant as built. Nothing here blocks Phase 1. Items marked **app** only apply once a native app ships ([`../tech/pwa-and-mobile-app.md`](../tech/pwa-and-mobile-app.md) § App Store compliance).

**Already aligned**

| Apple rule | How the newsletter meets it |
|------------|-----------------------------|
| 5.1.1 consent; optional data stays optional | Opt-in everywhere; `/register` checkbox unchecked; org members never asked or emailed (§ 7) |
| 3.1.3 emailing users about web purchase options | Allowed with consent + opt-out, which § 7 / § 7b already require |
| Easy opt-out | Footer preferences link + RFC 8058 one-click header; `POST /leads/unsubscribe` only, so link scanners cannot unsubscribe anyone |
| 4.8 Sign in with Apple | Not triggered — no third-party login |
| No marketing in the student product | § 6 "Not on" row |

**To do**

| # | Item | When |
|---|------|------|
| NL-A1 | Account deletion also deletes (or unsubscribes) every `leads` row for that email — otherwise a deleted user keeps getting issues. Part of **AS4** | ✅ Done Oct 4 2026 — rows are deleted in the purge transaction |
| NL-A2 | **Email preferences** toggle on `/profile` for registered users (newsletter on/off, same `leads` row). Opt-in is in-product, so opt-out should be too; reviewers look for it | ✅ Done Oct 4 2026 (NL16b) |
| NL-A3 | **App** — App Privacy label: Email Address, linked to identity, purposes *App Functionality* + *Developer's Advertising or Marketing* (**AS10**) | Before submit |
| NL-A4 | **App** — App Tracking Transparency (5.1.2): sending app-captured email or click IDs (`gclid` / `fbclid`) to Meta CAPI or Google for ad attribution is "tracking" and needs the ATT prompt. Default: exclude app-sourced leads from CAPI (M7) | Before CAPI covers app signups |
| NL-A5 | **App** — marketing push ("new issue out") needs its own opt-in and an in-app opt-out (4.5.4); lesson reminders do not | With push (T20 / APNs) |
| NL-A6 | **If Sign in with Apple is ever added** — register `news.thedroneedge.com` and the transactional From domain under *Sign in with Apple for Email Communication*, or mail to `@privaterelay.appleid.com` bounces (and gets marked `bounced_at`) | With SIWA |

**How Apple users experience the newsletter**

| Apple feature | Effect | Our handling |
|---------------|--------|--------------|
| Mail Privacy Protection | Prefetches images, so Apple Mail shows nearly everyone as "opened" | Opens ignored; clicks only (§ 5) |
| Hide My Email (iCloud+) | Safari autofills a random relay address; delivery works without any Apple registration; token unsubscribe works | ⚠️ NL17 members block joins `leads.email` to `users.email` — a relay address won't match. Match on a `user_id` link when NL4 creates the lead, or accept the miss |
| Link Tracking Protection | Mail / Messages / private Safari strip `gclid`, `fbclid` and similar | Newsletter links use UTM only (§ 6), which survives |
| iOS Mail unsubscribe banner | Uses `List-Unsubscribe` to show a one-tap Unsubscribe at the top | Headers sent; expect higher one-tap unsubscribes from iPhone than Gmail |
| iOS Mail categories | Newsletters usually sort into Promotions | "Reply and tell us…" line builds engagement signal |
| iCloud Mail filtering | Requires SPF + DKIM + DMARC | All three on `news.thedroneedge.com` ([`terraform/ses.tf`](../../terraform/ses.tf)) |

---

## 8. Implementation plan

### Phase 0 — decide and unblock (by Oct 20 2026)

| # | Item | Owner | Notes |
|---|------|-------|-------|
| NL0.1 | Make the four decisions that Phase 1 depends on (§ 9): **NL-D1** name, **NL-D2** cadence, **NL-D3** whether existing waitlist leads and users get an opt-in invite, **NL-D4** which inbox replies go to | Leadership | The rest (D5–D7) can wait until Phase 2–3 |
| NL0.2 | Flip `ses_events_subscription_enabled = true` and apply | You | Already on the launch checklist; required before any bulk send |
| NL0.3 | Confirm `marketing_postal_address` in tfvars | You | CAN-SPAM footer |

### Phase 1 — first issue with no new backend (target: issue #1, Tue Nov 3 2026) · ~2 days — ✅ code done Oct 4 2026

Shipped beyond the table: NL16b profile email preferences (`GET`/`PATCH /leads/me`), `POST /leads` ignores signed-in org members, the broadcast excludes org-member addresses, the Building waitlist offers an unchecked Field Notes box, privacy § 2/§ 3/§ 9 updated. Still open for issue #1: write `assets/newsletter/2026-11.md`, apply the SES events flag (NL0.2), decide NL-D4 (reply-to inbox).

Uses the existing `POST /leads` + admin broadcast (`dry_run` / `test` / `send`, markdown body, target by interest).

| # | Item | Where | Est. |
|---|------|-------|------|
| NL1 | `/newsletter` landing page with sample issue (static copy of issue #1 once written) | `drone/src/app/newsletter/page.tsx`, `sitemap.ts` | 0.5 d |
| NL2 | Compact signup variant of `WaitlistForm` (inline, one row) + "adults 18+" in the consent line for `newsletter` | `drone/src/app/ui/components/waitlist-form.tsx` | 0.25 d |
| NL3 | Article-end block, `/articles` band, footer field (public routes only) | `articles/[articleId]/article-page-client.tsx`, `articles/page.tsx`, `ui/components/footer.tsx` | 0.5 d |
| NL4 | Register checkbox → `POST /leads` with `interest = newsletter`, `source_path = /register`; hidden on invite flows | register page + `backend/src/leads` (no schema change) | 0.25 d |
| NL5 | Newsletter confirmation copy in `INTEREST_COPY.newsletter` (what to expect, first Tuesday) | `backend/src/leads/leads.service.ts` | 0.1 d |
| NL6 | Issue template (section skeleton + UTM placeholders) | `assets/newsletter/_template.md`; issues saved as `assets/newsletter/2026-11.md` | 0.1 d |
| NL7 | Runbook: draft → fact-check → approve → dry-run → test send → send → log results | `workflows/marketing/newsletter.md` | 0.25 d |
| NL8 | Saved query: newsletter UTM → leads, consultations, purchases within 30 days | [`../tech/analytics-queries.md`](../tech/analytics-queries.md) | 0.1 d |

Docs to update when Phase 1 ships: [`../tech/frontend-data.md`](../tech/frontend-data.md) (`/newsletter`), [`../tech/legal-and-privacy-site-sync.md`](../tech/legal-and-privacy-site-sync.md) (newsletter use of email), [`utm-links.md`](utm-links.md), [`../SKILLS.md`](../SKILLS.md) (task "send the newsletter").

~~**Known Phase 1 gap:** no per-recipient send log.~~ Closed Oct 4 2026 by the Newsletter tab (NL10): sends are logged per address and resumable.

### Publishing and updates — who does what, where (built Oct 4 2026)

**Today (Phase 1):** draft `assets/newsletter/YYYY-MM.md` locally, paste the body into **prod** Admin → Leads → Broadcast, count, test to yourself, send. Gaps: nothing records *what* was sent (only logs), there is no way to see the rendered email locally (SES is unconfigured there, so nothing sends — safe, but blind), a send can't be scheduled or safely resumed, and there is no web archive to link or correct.

**Proposal: the repo file is the draft, the database is the record.**

| Step | Where | Who | What happens |
|------|-------|-----|--------------|
| 1. Draft | Local repo (`assets/newsletter/YYYY-MM.md`, front matter: `slug`, `subject`, `preheader`, `lists`, `send_at`) | You (+ Claude) | Git history is the edit history. Nothing touches prod |
| 2. Preview | Local admin → **Newsletter** tab (same UI as prod) → *Import .md* → rendered email + web view | You | `POST /newsletter/preview` runs the real `renderEmail` (no SES needed), so local shows exactly what subscribers get. Links resolve to the local site |
| 3. Publish draft | **Prod** admin → Newsletter → *Import .md* (upload the same file) | You or admin | Upserts `newsletter_issues` by `slug` with `status = draft`. Re-importing replaces the draft — edit in the repo, import again. No new credentials: it's the existing admin login, and the same flow works on local and prod |
| 4. Review | Prod admin: preview, *Send test* (to any admin), recipient count | Admin | Editing or re-importing after approval **resets approval** |
| 5. Approve + schedule | Prod admin: *Approve* (records who/when), optional `send_at` (default first Tuesday 10:00 ET) | Admin | NL11 cron sends only `approved` issues whose `send_at` has passed. Never auto-sends a draft |
| 6. Send | Cron or *Send now* | System | Per-recipient `newsletter_sends` rows (NL10): resumable, never double-sends, status per address |
| 7. After send | Prod admin: metrics (NL14); web archive at `/newsletter/<slug>` after 7 days (NL13) | Admin | The **email** is immutable once sent. The **web** version can be corrected: edit → saved with an "Updated <date>: <what changed>" note shown on the page; corrections logged |
| 8. Record | Repo | You | Commit the final `.md` with the send date + count in its header (runbook § 5) |

**Why not repo-only (a CLI that sends from the laptop)?** It needs an API credential outside the admin login, puts prod sends on whatever machine runs it, and still needs a database record for the archive, send log and schedule. **Why not admin-only (write in the prod editor)?** You lose git history and local AI drafting, and drafts would live only in prod. The hybrid keeps both: write locally, publish by import.

**Corrections policy:** typo in a sent email → fix the web archive only, no resend. Factual error (rule date, price) → web correction plus a one-line correction at the top of next month's issue. Never send a "correction blast" unless the error could cause harm (e.g. a wrong safety rule); that counts as the month's one dispatch.

**Built Oct 4 2026** (simple version): Admin → **Newsletter** tab — upload / paste, *Check (no save)*, Email / Web page / Plain text preview (phone width toggle), test send, Approve / Back to draft, Count, Send, Resume; `newsletter_issues` + `newsletter_sends` (migration `1765000010000`); `/newsletter/<slug>` web copy (View in browser target, noindex + unlisted for 7 days) and *Recent issues* on `/newsletter`. **Not built:** scheduled send (NL11 cron — you press Send on the day), per-interest segment blocks (NL12), per-issue metrics (NL14). The Leads → Broadcast panel stays for one-off waitlist announcements. Steps: [`../../workflows/marketing/newsletter.md`](../../workflows/marketing/newsletter.md).

### Phase 2 — proper issues, archive and segments (Dec 2026 – Jan 2027) · ~4 days

| # | Item | Notes |
|---|------|-------|
| NL9 | ✅ Oct 4 2026 (upload instead of an in-browser editor) — `newsletter_issues` table (`slug`, `subject`, `preheader`, `body_md`, `segment_blocks` JSON, `status` draft/scheduled/sent, `scheduled_at`, `sent_at`) + admin Newsletter tab (edit, preview, test, schedule) | Replaces pasting into the broadcast panel |
| NL10 | ✅ Oct 4 2026 — Per-recipient send log (`newsletter_sends`: issue × lead email, status, SES message id); idempotent resume | Share the send-log design with sequences (Z6) |
| NL11 | Scheduled send (Nest `@Cron`, first Tuesday 10:00 ET) with a manual "approve" gate | Never auto-sends an unapproved issue |
| NL12 | Per-interest segment block at render time (§ 5 table); one email per address even with several interests | Dedupe by email |
| NL13 | ✅ Oct 4 2026 — Public archive `/newsletter/[slug]` (web version, "view in browser"); canonical to itself, links out to the full articles. **Segment block is not rendered on the web version** | Archive lags send by 7 days so subscribers see it first (**NL-D6**). Teachers share these URLs with students |
| NL13b | "Share with your class" card on the manager dashboard (teachers only); no newsletter link, banner or form anywhere a student can see | Depends on NL13. The `POST /leads` org-member guard already shipped in Phase 1 (all lists, not just `newsletter`) |
| NL14 | ✅ Oct 4 2026 — Admin metrics per issue (Newsletter → Results): sent, delivered, bounced, complaints, people who clicked + click rate, clicks by section (`utm_content`), unsubscribes within 7 days, scanner clicks separated, who-clicked list (admin-only). Opens shown but flagged unreliable. Attributed signups/purchases stay in the SQL queries (§ 1.1b) | SES events (`newsletter_events`) + send log. Decided: per-person clicks yes, per-person opens no, 12-month retention; branded tracking domain `click.news.…` (`terraform/ses_tracking.tf`, two-step) |
| NL15 | Attribution fix: record **session-touch** UTM on events, not only first touch. Today W5 keeps first touch for 90 days, so a newsletter click from an existing lead is credited to the original source and the newsletter looks like it earns nothing | `drone/src/middleware.ts`, `lib/attribution.ts` |
| NL16 | Opt-in invite for existing waitlist leads (if **NL-D3** = yes) | One send, one-click add |
| NL16b | Email preferences toggle on `/profile` (**NL-A2**, § 7c) | ✅ Done Oct 4 2026 (pulled into Phase 1) |

### Phase 3 — continuity and growth (2027, after Pro pricing and Building launch)

| # | Item | Depends on |
|---|------|------------|
| NL17 | Pro members section in each issue for opted-in Pro subscribers (new mock exams, question-bank updates after rule changes, early access); approved NL-D8 | MM2 (Pro benefit list) |
| NL18 | Forward-to-a-teacher tracking + referral credit | MM8 |
| NL19 | Sponsor-a-classroom slot (own offer only) | `/sponsors`, MM5 |
| NL20 | Lead magnet on `/newsletter` (parts-list PDF or practice exam) | S5 |
| NL21 | Revisit cadence (twice monthly) and educator-only edition | NL-D2, list > ~2,000 |

---

## 9. Decisions needed

| # | Decision | Recommendation | Blocks |
|---|----------|---------------|--------|
| NL-D1 | Name | **Decided 2026-10-04: Drone Edge Field Notes.** Still check trademark / existing drone newsletters before announcing | Closed |
| NL-D2 | Cadence | Monthly, first Tuesday; summer merged; ≤ 1 dispatch/month | Calendar |
| NL-D3 | Existing waitlist and users: invite to opt in, or newsletter-only list | One-click opt-in invite; never silent add | NL16 |
| NL-D4 | Reply-to inbox and who reads replies | A monitored shared inbox; replies answered within 2 school days | Template |
| NL-D5 | Third-party sponsorship / ads | None until ~10k readers | — |
| NL-D6 | Archive public immediately or after a delay; indexable? | 7-day delay, indexable, short pages that link to articles | NL13 |
| NL-D7 | Lead magnet attached to signup | Parts-list PDF (already designed, serves the kit downsell too) | NL20 |
| NL-D8 | Customers and Pro: auto-subscribe, or opt-in at register / checkout / receipt? Members-only block for Pro? | **Decided 2026-10-04:** free for everyone, opt-in everywhere (§ 7b); Pro subscribers get an extra members section in the same issue | Closed |

---

*Update this file when a decision closes or a phase ships. When Phase 1 ships, add the runbook to [`../SKILLS.md`](../SKILLS.md) and move the TODO rows.*
