# Product analytics — usage, entitlement, and revenue

How we measure **what each user actually does with what they bought**, so the money model can be tuned: stop charging people for things they don't use, and offer the thing they're ready for next.

Boundary with the other analytics doc: [`analytics-and-attribution.md`](analytics-and-attribution.md) covers **marketing attribution** — where a stranger came from and what an ad click cost. **This** doc covers what happens *after* the account exists. They share an event pipeline and a consent model; they answer different questions.

Commercial design this serves: [`docs/sales/money-model.md`](../sales/money-model.md) · [`docs/sales/pricing-model.md`](../sales/pricing-model.md) · Stripe flows: [`purchase-flows.md`](purchase-flows.md)

---

## 1. The question, and why Grafana cannot answer it

The questions the money model needs answered are all **joins between a person, what they paid, and what they used**:

- This user bought Part 107 for $129 three weeks ago and has completed zero units — are they about to refund?
- This Pro subscriber has not logged in for 45 days and is paying monthly — should we proactively offer to pause?
- This district bought 120 seats; 68 students ever logged in — what should the renewal actually be?
- Everyone who finishes Part 107 — how many buy a second course, and how long after?
- Which unit do people abandon at, and does it differ between purchasers and org seats?

None of these are aggregate time-series questions, and that is exactly what OpenTelemetry and CloudWatch are built for.

| System | Job | Why it cannot do this |
|--------|-----|-----------------------|
| **CloudWatch** | Logs, infra metrics, alarms | Log search, not analysis. No join to `users`. |
| **Grafana Cloud + OTel** (current) | Ops health — latency, error rates, throughput | **Counters are aggregates with no identity.** `page.view` carries only a route template and a channel bucket (labels were collapsed 2026-09-12 — see [`observability.md`](observability.md) § cardinality). Adding `user_id`, `course_id`, or `path` as metric attributes creates one time series per unique value — unbounded cardinality, which Grafana Cloud bills on and which degrades query performance long before the bill does. You still could not compute "% of purchasers who completed Unit 1 within 7 days," because that is a row-level join, not an aggregate. |
| **Postgres (Aurora)** | **The ledger — recommended** | Already holds `users`, `progress`, `audit_logs`, `user_courses_purchased`, `organization_members`. The join is local, free, and exact. |

This is the same three-layer split established in [`analytics-and-attribution.md`](analytics-and-attribution.md): **Postgres is the ledger, ad platforms are the feed, OTel is ops.** Product analytics is a ledger concern. Keep using Grafana for what it is good at — alerting that checkout broke — and stop asking it for business numbers.

---

## 2. Tooling decision

| Tool | Verdict | Reasoning |
|------|---------|-----------|
| **Postgres + SQL views** | **Do this now** | Zero new infrastructure, zero cost, and the only place usage and revenue can be joined without pipelines. At current scale (pre-launch) the event volume is trivial for years. |
| **Existing `/admin/analytics` tab** | **Extend it** | Already wired to `GET /audit/analytics/*`. The five numbers in § 8 belong here, visible daily, not in a separate tool. |
| **Grafana with a Postgres datasource** | Optional, free-ish | You already pay for Grafana Cloud and it can query Postgres directly. The catch: Aurora is in a private subnet, so this needs Private Data Source Connect or a self-hosted Grafana in-VPC. Reasonable if you want one pane of glass; not worth the setup as the *first* step. |
| **Metabase** | **When a non-engineer needs to ask questions** | Self-serve BI on Postgres, no SQL required for the asker. Self-host on ECS or use Cloud. Add it when the rep or leadership needs numbers without filing a ticket — not before. |
| **PostHog** | **Only for B2C marketing surfaces, if at all** | Genuinely good at funnels, retention, and cohorts without SQL, with a generous free tier. Three caveats: revenue lives in Postgres so you would have to pipe it in; it is a third-party processor, which is a procurement question for school data; and **session replay on student accounts is a district red flag**. If adopted, exclude org members entirely (§ 9). |
| **Segment / Amplitude / Mixpanel** | **No** | Cost traps at this scale; Segment in particular meters events you already own. |
| **Warehouse (BigQuery/Snowflake/dbt)** | **No** | You need roughly three orders of magnitude more data before a warehouse beats Postgres here. |

**Two operational rules if you add any BI tool:** point it at the Aurora **reader** endpoint, never the writer, and precompute the expensive joins as materialized views refreshed nightly rather than letting analysts run ad-hoc scans against live tables.

---

## 3. What is missing today

From a survey of the current schema on this branch. The first row is the one that blocks everything else.

| Gap | Detail | Impact |
|-----|--------|--------|
| **No transactions table** | There is no `purchases`/`transactions` table. Course ownership is a row in `user_courses_purchased` with `source` and `granted_at` — **no amount, no Stripe payment intent id, no refund state**. Pro revenue exists only as an audit `PRO_UPGRADE` row with no dollar figure. | **Revenue, LTV, MRR, CAC payback, and refund rate are all currently uncomputable.** Every number in `money-model.md` is unmeasurable until this exists. |
| **Price at sale not stored** | `courses.price` is the *current catalog* price. When the $129 course is bundled or repriced, historical revenue silently changes. | Cohort revenue comparisons become wrong retroactively. |
| **`progress` has only `updated_at`** | No `created_at`, `completed_at`, or `last_activity_at`. | Cannot compute time-to-first-value, time-to-completion, or "last active in this course" — the core inputs to both the churn signal and the seat-utilization report. |
| **No `EXAM_SUBMITTED` audit row** | The enum value and the admin SQL both exist; nothing calls `auditService.log` with it (already tracked as **T2**). | The exams-submitted stat card reads zero forever. |
| **Exam attempts are upserted** | `exam_attempts` keeps only the latest attempt per (user, exam). | No attempt history, so "failing the same category repeatedly" — the trigger for the practice-pack offer — cannot be detected. |
| **No Pro revoke/downgrade audit** | Cancellation and the daily expiry cron write no audit row. | Churn is invisible. You can see Pro starts but not Pro ends. |
| **Page views are not in Postgres** | `POST /analytics/event` handles only `page_view`, `article_view`, `course_view`, and writes them to OTel counters with **no user id**. | No lesson-level engagement, no funnel, no per-user behavior. |
| **No dwell or session time** | Nothing tracks time in a lesson. | "Students spent 14 hours in the curriculum" — the single most persuasive number in a school renewal conversation — cannot be produced. |
| **Org courses are org-wide** | Courses attach to the organization, not to members. Seat limit is `organizations.max_students`; there is no per-member course assignment. | Seat utilization must be derived from membership plus progress, not from an assignment record. Workable, but the definition needs writing down (§ 7). |

---

## 4. Schema additions

Four changes, in dependency order. **Build detail — column lists, indexes, backfill, the `entitlements` table that this section does not cover, and a minimal `products` table pulled forward from § 4.5 — is in [`analytics-implementation-plan.md`](analytics-implementation-plan.md) § 2–3.** Where the two differ, the plan wins.

**Entitlements are the missing layer.** One paying line (a bundle, a Pro invoice, a seat PO) can grant access to several courses, and one user can hold several concurrent entitlements to the same course (own purchase + Pro + org seat). `user_courses_purchased.source` records *how* but not *from which line* or *until when*, and Pro is not per-course at all. The plan adds `entitlements` (`user_id`, `course_id` nullable for all-courses, `source`, `order_item_id`, `allocated_price_cents`, `starts_at` / `ends_at` / `revoked_at`) between orders and usage, with an attribution rule for overlaps (most specific paid wins; org utilization counts members regardless). `hasAccess` keeps its current reads until a nightly reconciliation is clean.

### 4.1 `orders` + `order_items` — the missing foundation

Append-only financial record, written from the Stripe webhook. This is the highest-priority item in this document.

**Model it as orders with line items, not as one row per payment.** Today every payment is a single digital thing, so a flat `transactions` table would work — and would have to be migrated the moment a checkout contains a bundle plus a kit plus a shirt, or someone refunds one line out of three. Since zero rows exist yet, the order-shaped version costs nothing now and avoids a painful retrofit later. See § 9 for why physical goods force this.

**`orders`** — one per payment event: `user_id`, `organization_id` (nullable), `stripe_payment_intent_id` / `stripe_invoice_id`, `stripe_customer_id`, `payment_method` (`card` | `invoice` | `po`), `subtotal_cents`, `discount_cents`, `shipping_cents`, `tax_cents`, `total_cents`, `currency`, `payment_status` (`succeeded` | `refunded` | `partially_refunded` | `failed`), `fulfillment_status` (`not_applicable` | `unfulfilled` | `shipped` | `delivered` | `returned`), `placed_at`, `raw_event_id`.

**`order_items`** — one per thing bought: `order_id`, `product_type` (`course` | `bundle` | `pro_monthly` | `pro_yearly` | `kit` | `part` | `merch` | `service` | `protection_plan`), `sku`, `course_id` (nullable), `quantity`, **`unit_price_cents`**, **`unit_cost_cents`** (COGS at time of sale), `discount_cents`, `refunded_amount_cents`, `fulfillment_source` (`digital` | `we_ship` | `dropship` | `customer_sourced`).

Notes that matter:

- Write it in the **same handler** that already grants access, so entitlement and revenue can never disagree. Idempotent on the Stripe event id — webhooks get redelivered.
- **Store the price and cost charged at the time, not a lookup to `courses.price`.** Catalog prices move and supplier prices move faster.
- **Payment status and fulfillment status are two independent state machines.** Merging them is the most common modeling mistake in a first store: a paid-but-unshipped order and a shipped-then-refunded order are both real and neither fits one column.
- Add the webhook events not currently handled: `invoice.paid` (Pro renewals — otherwise recurring revenue is invisible after month one), `charge.refunded`, and `invoice.payment_failed` (involuntary churn).
- B2B kit and seat orders are PO-paid outside Stripe. Allow manually created orders with `payment_method = 'po'`, or the entire school hardware business is invisible to analytics.

### 4.2 `product_events` — the behavioral stream

A separate table from `audit_logs`, deliberately. `audit_logs` is a compliance artifact — who did what, kept long, small volume, and likely referenced in a school DPA. Behavioral events are high-volume, prunable, and semantically different. Mixing lesson views into an audit log makes both worse.

Columns: `id`, `user_id` (nullable for anonymous), `anonymous_id`, `session_id`, `event_name`, `occurred_at`, `course_id`, `unit_ref`, `organization_id`, `properties` (jsonb), `source` (`web` | `server`).

Index on `(user_id, occurred_at)`, `(organization_id, occurred_at)`, `(event_name, occurred_at)`. **Partition by month from day one** — not because of volume (a few million rows a year at 1,000 users is an ordinary table) but because retention then becomes `DETACH PARTITION` + `DROP` instead of a multi-million-row `DELETE` with the bloat and vacuum that follow. Retrofitting partitioning onto a live table is the expensive version. Sizing, the per-IP throttle problem in classrooms, and the write-path fan-out are worked through in [`analytics-implementation-plan.md`](analytics-implementation-plan.md) § 12.

Retention: a `product_events_daily` rollup is computed incrementally from day one; raw partitions older than 12 months are exported to S3 (B2C) or deleted (org members, per **PD23**) and dropped. Needed anyway for the deletion commitments in a school DPA.

### 4.3 `progress` timestamps

Add `created_at`, `completed_at`, `last_activity_at`. A small migration that unlocks time-to-value, time-to-completion, and per-course recency — which are inputs to most of § 7.

### 4.4 Exam attempt history

Stop upserting `exam_attempts`, or add an append-only `exam_attempt_history`. Keep `section_breakdown` per attempt so weak-category detection works across attempts rather than only on the most recent one.

### 4.5 `products` + `variants` — a real catalog

Today the only sellable thing is a `courses` row with a `price` column. A store needs a catalog that is not the course table.

**`products`**: `sku`, `name`, `product_type`, `active`, **`related_course_id`** / `related_unit_ref` (nullable), `requires_shipping`, `hazmat_class` (nullable), `weight_grams`, `fulfillment_source`, `vendor`.

**`product_variants`**: `product_id`, `sku`, variant axes (shirt size/color; kit Base vs Video; Solder vs Pre-soldered), `price_cents`, `cost_cents`, `stock_on_hand` (nullable when made-to-order), `joint_count` (kits), `revision` (own-designed parts).

**`product_components`**: `parent_sku`, `component_sku`, `quantity`, `optional` — a kit is an assembly, and its parts are also sold as spares. See § 9.6.

`related_course_id` is the field that answers the question actually being asked here — how hardware links to learning. With it you can compute course→kit attach rate, ask whether kit owners complete the Building course at a higher rate than non-owners, and find which unit is the best place to surface the kit offer. Without it, the store is a separate business that happens to share a login.

---

## 5. Event taxonomy

Extends the marketing taxonomy in [`analytics-and-attribution.md`](analytics-and-attribution.md) — same `track()` abstraction, same `eventId`, writing to `product_events`.

| Group | Events |
|-------|--------|
| **Lifecycle** | `signup_started`, `signup_completed`, `login`, `email_verified` |
| **Learning** | `course_started`, `lesson_viewed`, `lesson_completed`, `unit_completed`, `course_completed`, `video_started`, `video_progress` (25/50/75/100), `lesson_heartbeat` |
| **Assessment** | `exam_started`, `exam_submitted`, `exam_category_scored` (per section, per attempt) |
| **Commerce** | `pricing_viewed`, `checkout_started`, `purchase_completed`, `pro_checkout_started`, `pro_started`, `pro_renewed`, `pro_cancelled`, `billing_portal_opened`, `refund_issued` |
| **Store** | `product_viewed`, `variant_selected`, `add_to_cart`, `remove_from_cart`, `cart_viewed`, `shipping_info_added`, `cart_abandoned`, `outbound_vendor_click` |
| **Fulfillment** | `order_shipped`, `order_delivered`, `return_requested`, `return_received`, `warranty_claim_filed`, `warranty_part_shipped` |
| **Money model** | `upsell_shown` / `_accepted` / `_declined`, `downsell_shown` / `_accepted` / `_declined`, `kit_lead`, `parts_list_downloaded`, `referral_clicked` — each carrying an `offer_id` **and a `placement`** |
| **B2B** | `invite_sent`, `invite_redeemed`, `manager_dashboard_viewed`, `org_progress_exported`, `class_created` |
| **Feature** | `feature_used` with a `feature` property — mock exam generator, sectional viewer, outline sidebar, search |

The money-model group is called out explicitly in [`money-model.md`](../sales/money-model.md) § 6 as the thing without which "the ladder cannot be tuned." An `offer_id` on every offer event is what makes an upsell A/B test possible later.

**`placement` matters as much as `offer_id`.** The same kit offer behaves completely differently at a checkout order bump, on the post-purchase thank-you page, embedded inside a lesson, on the course completion screen, or in `/profile`. Recording placement is what turns "the kit upsell converts at 6%" into "the kit upsell converts at 14% on the completion screen and 2% at checkout, so move it." Use a fixed vocabulary: `checkout_bump`, `post_purchase`, `in_lesson`, `completion_screen`, `profile`, `cart`, `email`.

**`cart_abandoned` is genuinely new.** A one-click course purchase has no cart, so this funnel stage does not exist today. A store creates it, along with the recovery email that goes with it.

**`outbound_vendor_click`** covers the affiliate-first phase in [`money-model.md`](../sales/money-model.md) § 3.2 — carry `vendor`, `part`, and the course context so parts-list clicks can be reconciled against affiliate statements later.

**`lesson_heartbeat`** deserves a note: a ping every ~30 seconds while a lesson is open, used to derive minutes. Dwell time is noisy and easy to over-trust, but the aggregate — hours of curriculum engagement per class — is the most persuasive single number in a school renewal conversation. Worth the small cost.

**The Learning group has a second consumer.** The same `lesson_viewed` / `video_*` / `lesson_heartbeat` rows are read live, per class, by the teacher-facing manager dashboard — see [`manager-progress-visibility.md`](manager-progress-visibility.md). That doc adds two requirements to `product_events`: stamp `organization_id` at write time, and index `(organization_id, occurred_at)`. It also adds a small `video_progress` state table. One write path, two read paths; do not build a separate telemetry endpoint for the teacher view.

---

## 6. Derived views

Precompute these as materialized views, refreshed nightly by the existing daily cron (the one already handling Pro expiry).

| View | Grain | Contents |
|------|-------|----------|
| `v_user_entitlements` | user × course × entitlement | Every entitlement (`purchase`, `bundle`, `admin_grant`, `signup_link`, `pro`, derived `org_seat`), `order_item_id`, `allocated_price_cents`, active flag. `v_entitlement_utilization` picks a `primary_source` per user × course by the rule in the plan § 2.3 — not by `hasAccess` order. |
| `v_user_course_usage` | user × course | Units completed / total, % complete, first activity, last activity, exams taken, best and latest score, minutes engaged. |
| `v_entitlement_utilization` | user × course | The join of the two above — **what they can access vs. what they used.** The single most important view in this document. |
| `v_user_revenue` | user | Lifetime gross, net of refunds, **contribution margin** (revenue − COGS − shipping − returns), active MRR, first and last purchase date, product mix. |
| `v_sku_performance` | sku | Units sold, revenue, COGS, gross margin %, return rate, warranty claim rate, stockouts. |
| `v_course_hardware_attach` | course | Learners entitled, % who bought the linked kit, median days from course start to kit purchase, completion rate of kit owners vs non-owners. |
| `v_org_utilization` | organization | Seats purchased (`max_students`), invites sent, invites redeemed, members joined, members ever active, members active in last 30 days, aggregate completion, manager last seen. |
| `v_cohort_retention` | cohort month × entitlement source | Activation, completion, and second-purchase rates by acquisition cohort. |

The reason to materialize rather than query live: these are multi-table joins over the whole user base, and the admin dashboard should not run them on page load against the writer.

---

## 7. Signal → offer map

This is where measurement meets the money model. Each row is a query against the views above and a corresponding move from [`money-model.md`](../sales/money-model.md).

### B2C

| Signal | Reading | Move |
|--------|---------|------|
| Purchased, no `course_started` after 7 days | Stalled onboarding; refund risk | Onboarding email; this is the activation metric to protect |
| Completed Unit 1 within 7 days of purchase | **Activated** | None — this is the health number |
| `course_completed` | Success moment, highest acceptance for the next offer | Next course, kit, or Pro — money-model § 3.2 |
| Pro active, zero logins in 30 days | **Paying for nothing** | Proactively offer pause or a downsell to a single course |
| Pro active, three or more courses in use | High-value subscriber | Offer yearly — cheaper for them, better retention for us |
| Same exam category failed across attempts | Needs targeted drill | Practice pack or Pro mock exams |
| Viewed Building track + downloaded parts list, no kit | Kit lead | Kit offer; BYO-parts downsell if declined |
| `course_completed` 24 months ago | Recurrent training due | Recurrent refresher (state plainly that the FAA's own recurrent training is free) |
| Teacher or parent email domain, high engagement | B2B referral candidate | "Bring Drone Edge to your school" CTA |

### B2B

| Signal | Reading | Move |
|--------|---------|------|
| Invites sent ≫ invites redeemed | Rollout stalled at the teacher | Onboarding intervention now, not at renewal |
| Members joined ≫ members ever active | Seats bought but unused | **Right-size the renewal** — see § 8 |
| One class far behind the others | A specific teacher needs support | Proactive check-in; this is retention work |
| Manager dashboard never opened | The champion is disengaged | Highest-priority churn signal in the B2B book |
| Org completed the Part 107 track | Ready for year 2 | Building track, kits, Course 2 — the 3-year arc in money-model § 4.3 |
| Fleet built, spares consumed | Hardware continuity | Spares replenishment, protection plan |

---

## 8. Seat utilization and the "save them money" play

The B2B version of this is the most commercially interesting thing in this document, and it needs its tension stated honestly.

**Definition, given that courses attach to organizations rather than members:**

```
seats_purchased   = organizations.max_students
seats_claimed     = count(organization_members where role = 'member')
seats_activated   = members with any progress row
seats_engaged_30d = members with activity in the last 30 days
utilization       = seats_engaged_30d / seats_purchased
```

**This is already a contractual commitment, not a new idea.** The seat guarantee in [`money-model.md`](../sales/money-model.md) § 4.2 promises unused seats are refundable or credited within 30 days of launch, and the satisfaction guarantee is explicitly "conditional on students having logged in — measurable in the manager dashboard." Neither promise is currently measurable. This work makes them operable.

**The tension:** telling a district that bought 120 seats that only 68 students used them reduces this year's renewal. That is a real cost and should not be hand-waved.

**The case for doing it anyway** is not only that it matches the "honest expert" positioning, though it does. It is that **a school at 55% utilization does not renew at all.** The realistic alternative to a right-sized renewal is a churned account and no referral. Converting a churn into a smaller, honest renewal — plus a reference customer in a market where CTE directors talk to each other — is the better trade at essentially every deal size. The defensive version is also cheaper: catch low utilization in week 3 and fix the rollout, rather than discovering it in the renewal meeting.

**Surface it in the manager dashboard, not just internally.** A manager who can see their own utilization becomes the person fixing it, which is better for everyone than a surprise at renewal.

---

## 9. Physical goods and the store

Shirts, drone parts, kits, spares, and in-course add-ons fit the model above — but only because § 4.1 is order-shaped. Hardware differs from digital in ways that change the numbers, not just the schema.

### 9.1 What physical goods break

| Concern | Digital today | With physical goods |
|---------|---------------|---------------------|
| **Margin** | ~97%; revenue ≈ profit | Kits and parts run far thinner after COGS, shipping, and returns. **Revenue stops being a useful metric.** |
| **Order shape** | One thing per payment | Many line items, partial refunds per line, mixed digital + physical in one checkout |
| **Lifecycle** | Instant | Pick, pack, ship, deliver, return — a second state machine (§ 4.1) |
| **Inventory** | Infinite | Stock, backorder, made-to-order assembly, lead times |
| **Tax** | Often simple | Physical goods create sales-tax nexus obligations per state |
| **Shipping** | None | Cost, zones, carrier, and **LiPo batteries are hazmat** (UN3480/3481) |
| **Returns** | Refund only | Refund *and* physical return, restocking, damage — plus warranty claims that are neither |
| **Buyer** | Card, self-serve | School kit orders are quoted, PO-paid, net terms, shipped to a district |

### 9.2 Margin changes the CAC math

This is the consequence most likely to be missed. The paid-acquisition targets in [`docs/marketing/paid-acquisition.md`](../marketing/paid-acquisition.md) were derived from a course ladder where revenue and margin are nearly the same number. Once hardware is in the mix that stops being true, and a blended "LTV" that adds a $129 course to a $460 kit overstates what you can afford to spend acquiring a customer.

**Target CAC must be computed from contribution margin, not revenue.** That is why `unit_cost_cents` sits on the order line and why `v_user_revenue` carries a margin column. Revenue dashboards that blend digital and hardware should be treated as vanity numbers; segment them or don't show them.

### 9.3 Warranty data prices the protection plan

The kit protection plan (**MM3** — fee, covered parts, replacement cap) is an actuarial question wearing a product costume. Its price depends on how often a class of ten aircraft destroys a given part in a school year, and nobody knows that yet.

`warranty_claim_filed` with the part SKU is how that number gets discovered. Until a season of claim data exists, the plan is priced on a guess — which is acceptable for a first cohort, as long as everyone knows it is a guess and the cap limits the downside. The same data also feeds the spares pack contents and the Course 2 (repair) curriculum, since the most-replaced parts are the ones worth teaching people to fix.

### 9.4 Course ↔ product linkage

This is the part that makes a store worth attaching to a learning platform rather than running separately. With `related_course_id` on products and the events above:

- **Attach rate** — of learners entitled to the Building course, what share bought a kit, and how long after starting?
- **Does hardware improve outcomes?** — completion rate of kit owners vs. non-owners. If it holds up, it is a real sales argument for schools, backed by your own data rather than a claim.
- **Offer placement** — which unit does a kit purchase most often follow? Put the offer there instead of guessing.
- **Reverse direction** — do kit buyers who never bought the course convert into course buyers? That decides whether hardware is a loss leader or a dead end.

### 9.5 What to build vs. what to buy

"Don't build a store" means **don't build the commerce platform** — the commodity surface around a sale. It does **not** mean don't sell physical products (kits are central to the B2B money model and the three-year arc), and it emphatically does not mean don't record purchases in our own database.

| Layer | Build or buy | Why |
|-------|--------------|-----|
| Payment processing | **Buy** — Stripe | Already in place |
| Cart and checkout UI, shipping rate calculation, sales-tax calculation, address validation, order-status emails, returns portal | **Buy** — Stripe Checkout initially | Commodity, heavily regulated, endlessly fiddly, and worth zero differentiation |
| **`orders` + `order_items` in our Postgres** | **Build — mandatory** | This is the ledger. It is the same webhook write path that already grants course access, so one write produces entitlement, revenue, and analytics at once. |
| **`products` catalog with `related_course_id`** | **Build — mandatory** | Nobody else can model how a kit relates to a course and a unit. This is the differentiator. |
| Entitlement granting from a purchase | **Build** — already exists | `purchaseCourse()` today |
| Inventory and fulfillment ops | Manual, then buy | Made-to-order at first; do not automate what happens twice a semester |
| Analytics on all of the above | **Build** | The entire point of this document |

**Storing a purchase line is not a big issue — it is the requirement.** Adding an order plus line items to the existing Stripe webhook handler is roughly a day of work against code that already runs there. What is expensive, and what "don't build a store" refers to, is the platform around it: tax tables per jurisdiction, carrier rate shopping, a returns portal, stock reservation.

**When to reconsider Shopify:** if SKU count, variants, and fulfillment outgrow Stripe Checkout. The cost is a **second system of record**, and the non-negotiable condition is unchanged — orders must still land in our `orders` table. The moment revenue lives in two unreconciled systems, every metric here silently becomes wrong. If Shopify is adopted, the order sync is part of adopting it, not a follow-up.

### 9.6 Kits are composite — model the BOM

A kit is not a SKU with a price; it is an assembly of parts, and the same parts are sold individually as spares. Model that once.

**`product_components`**: `parent_sku`, `component_sku`, `quantity`, `optional`. With it:

- **Kit COGS is computed from component costs**, not hand-maintained in a spreadsheet that goes stale the first time a supplier raises a price.
- **A warranty claim maps to a component**, which is what makes the protection plan priceable (§ 9.3) and tells you which parts the spares pack actually needs.
- **Spares and kit parts are one catalog**, two contexts.
- **Swapping a supplier part reprices every kit containing it** automatically.

Two fields worth carrying on the product itself, both already decided in the course research: **`joint_count`** (the parts-list work makes solder-joint count a BOM field so a school knows exactly what it is signing up for) and **`revision`** for anything we design ourselves — clip connectors, printed frames, adapters. Revision matters because failure rates and compatibility are per-revision; v1 clip failures must not contaminate v2's numbers.

### 9.7 Assembly track is the highest-value thing to measure

The drone-building research already establishes this as the biggest addressable-market lever in the hardware business, and it is a **testable hypothesis rather than a settled fact** — which makes it the first thing the store's analytics should answer.

What the research says: every school build kit sold at scale is no-solder (PCS Edventures, DroneBlocks, Pitsco, Flybrix), requiring soldering is estimated to cost **~50–70% of buying units overall** but only **~20–35% of the HS CTE-engineering core** we actually target, and fully no-solder is not achievable at the 3.5" size class because plug-and-play boards exist only at ≤2". The locked direction is **minimal-solder** — 16–20 beginner-grade joints — with a **Pre-soldered SKU at ~$15–20 of our cost** as the option that opens general STEM classrooms. Detail: [`parts-list-draft-v4.md`](../../assets/courses/drone-building/reference/parts-list-draft-v4.md) § 3, [`soldering-lab.md`](../../assets/courses/drone-building/reference/soldering-lab.md) § 5.

Custom clip or connector parts that further cut joint count sit on the same axis, and they are the case where `revision` on an own-designed product earns its keep.

The commercial stakes are larger than the SKU price suggests: a school that cannot solder otherwise needs a **$1,200–2,000 soldering lab** plus consumables, fume handling, and a supervision ratio. A SKU that removes that capital purchase does not just add $25–40 of margin, it removes the reason a deal dies. Which is why the qualification question in the kit flow is already "do you own irons?"

Metrics that settle it:

| Question | Measure |
|----------|---------|
| Was the 50–70% estimate right for *our* buyers? | Order mix by assembly track — Solder vs Pre-soldered vs Plug-in — segmented B2C vs school |
| Does the no-solder SKU win deals or just shift them? | Quote win rate by answer to "do you own irons?"; incremental orders vs. cannibalized Solder orders |
| How often is soldering the stated reason a deal dies? | Lost-deal reason on the quote record — the cheapest signal here and it needs no engineering |
| Does assembly track change build outcomes? | Warranty claims and build-day failures per track, by component SKU |
| Does it change learning outcomes? | Building-course completion rate by track. If Pre-soldered completes better, that is a sales argument; if it completes worse, the soldering is doing pedagogical work and the cheap SKU has a cost |
| Is a custom clip part worth designing? | Joint count reduction vs. per-unit cost and failure rate, per `revision` |

That second-to-last row is the one worth being honest about in advance: it is entirely possible that removing soldering sells more kits *and* teaches less. Measure both rather than assuming the commercial answer is the curricular one.

### 9.8 Sequencing

Follow the money model's own advice ([`money-model.md`](../sales/money-model.md) § 3.2): do not hold inventory before the supply chain is proven.

1. **Affiliate/vendor links only** — no store, no orders. Just `outbound_vendor_click` on the free parts list, reconciled monthly against affiliate statements. Accept that this attribution is lossy; it is a demand test, not a revenue line.
2. **Made-to-order kits and spares via Stripe Checkout**, assembled per order, batteries dropshipped or customer-sourced (hazmat).
3. **Merch** — shirts through a print-on-demand vendor with `fulfillment_source = 'dropship'`. Near-zero risk, and it is brand marketing more than a revenue line; do not let it distort the margin dashboards.
4. **School kit orders by PO** — manual orders, quoted, with `payment_method = 'po'`.
5. Reconsider Shopify only if and when 2–4 outgrow Stripe Checkout.

### 9.9 Store signals → offers

Extends § 7.

| Signal | Reading | Move |
|--------|---------|------|
| `add_to_cart` then `cart_abandoned` | Priced out or friction | Recovery email; if repeated on a SKU, the downsell variant (Base vs Video, Solder vs Pre-soldered) |
| Repeated `outbound_vendor_click`, no kit purchase | Wants to self-source | This is fine — sell the course, not the hardware; count it as a BYO conversion, not a loss |
| Kit delivered, no Building-course activity in 14 days | Hardware bought, learning stalled | Onboarding nudge; a crashed unopened kit becomes a refund |
| Warranty claims concentrated on one SKU | Part or instruction problem | Fix the part choice or the lesson, not the price |
| Spares consumed near end of term | Predictable replenishment | Reorder prompt to the manager before next semester |
| High-margin course buyer, zero merch | — | Do not chase it; merch margin does not justify the attention |

---

## 10. Privacy and compliance — non-negotiable

User-level tracking of school students is materially different from tracking B2C buyers, and getting it wrong is a procurement blocker rather than a fine.

- **Student usage data is an education record.** In the school motion, Drone Edge is a service provider acting on the district's behalf; the district controls the data. FERPA applies; COPPA applies to under-13s; several states add their own student-privacy statutes with contractual requirements and explicit bans on targeted advertising to students.
- **Never send org-member data to ad platforms.** No pixel, no CAPI payload, no audience upload containing a student. This extends the rule already in [`analytics-and-attribution.md`](analytics-and-attribution.md) about keeping the authenticated learning experience pixel-free.
- **Never market to the student.** Every B2B insight in § 7 goes to the org manager or the district, in aggregate. Individual student behavior may be shown to their own teacher — that is normal LMS behavior and expected — and to nobody else.
- **No session replay on org-member accounts.** If PostHog or similar is ever adopted, exclude org members at the SDK level, not by policy alone.
- **Sponsor reporting is aggregate only.** Money-model § 5.1 already says "real dashboard numbers only" — that means counts, never named students, and no student faces without a release.
- **Shipping addresses are a new PII class.** A store means home addresses — and for school kit orders, potentially a minor's address. Keep addresses out of `product_events` and out of anything exported to a sponsor or an ad platform; they belong on the order and nowhere else.
- **Retention and deletion must be defined** before the first district DPA review. This connects to the VPAT / DPA packet already on the backlog, and to the `product_events` pruning policy in § 4.2.
- Update `drone/src/app/privacy/page.tsx` alongside any change here, per [`legal-and-privacy-site-sync.md`](legal-and-privacy-site-sync.md).

---

## 11. Phases

Sequenced with estimates, file paths, and acceptance in [`analytics-implementation-plan.md`](analytics-implementation-plan.md) § 7. Summary:

**Phase 1 — make revenue and usage real**
1. `orders` + `order_items` (plus minimal `products` and `entitlements`), written from the Stripe webhook; add `invoice.paid`, `charge.refunded`, `invoice.payment_failed`.
2. `progress` timestamps: `created_at`, `completed_at`, `last_activity_at`.
3. Write the missing audit rows: `EXAM_SUBMITTED` (**T2**), Pro cancel and expiry.
4. `product_events` table + server-side write path.

**Phase 2 — instrument behavior**
5. Client event taxonomy from § 5 through the existing `track()` abstraction, including the money-model offer events (**T3**).
6. `lesson_heartbeat` for engaged minutes.
7. Exam attempt history with per-attempt `section_breakdown`.

**Phase 3 — make it answerable**
8. The materialized views in § 6, refreshed by the existing daily cron.
9. Extend `/admin/analytics` with the five numbers below.
10. Org utilization panel in the **manager** dashboard, not only the admin one — a `GROUP BY organization_id` over the class-grain engagement query in [`manager-progress-visibility.md`](manager-progress-visibility.md) § 6 (**MP5**), so "active" is defined once.

**Phase 4 — act on it**
11. Trigger jobs for the § 7 signals, feeding the email sequences (blocked on the ESP decision, **D7**).
12. Cohort and retention reporting; revisit whether Metabase is warranted.

**Phase 5 — store (only when hardware demand is proven)**
13. `outbound_vendor_click` on the parts list — the demand test, no store required.
14. `products` / `product_variants` catalog with `related_course_id`.
15. Stripe Checkout with shipping and tax; orders and line items written through the same webhook path.
16. Fulfillment state, returns, and `warranty_claim_filed`.
17. `v_sku_performance` and `v_course_hardware_attach`; margin columns on the revenue view.

### The five numbers to put on the dashboard first

Everything above exists to produce these. If only one screen ever gets built, build this one.

1. **Activation rate** — purchasers who complete Unit 1 within 7 days.
2. **Entitlement utilization** — median % of owned course content actually completed.
3. **Net revenue and contribution margin** — from `orders`, not from Stripe's dashboard, so it joins to everything else. Split digital and hardware; never show them blended.
4. **Pro engagement** — share of active subscribers with zero activity in 30 days. This is both the churn predictor and the "save them money" queue.
5. **Org seat utilization** — per organization, seats engaged in the last 30 days over seats purchased.

---

## Related

- [`docs/sales/money-model.md`](../sales/money-model.md) — the offer ladder these metrics tune
- [`docs/sales/pricing-model.md`](../sales/pricing-model.md) — SKU state and access rules
- [`purchase-flows.md`](purchase-flows.md) — Stripe flows the `transactions` writer hooks into
- [`analytics-and-attribution.md`](analytics-and-attribution.md) — marketing attribution, consent, the three-layer model
- [`analytics-implementation-plan.md`](analytics-implementation-plan.md) — the build plan: schema (incl. `entitlements`), APIs, screens, phases, backfill, acceptance — **Phases 1–3 built 2026-09-11**
- [`analytics-queries.md`](analytics-queries.md) — the SQL for every number in this doc (the five headline numbers are § 2), snapshot-report recipe
- [`manager-progress-visibility.md`](manager-progress-visibility.md) — teacher-facing read path over the same events (video watch, last active, class engagement)
- [`backend-data.md`](backend-data.md) — entities, endpoints, auth
- [`legal-and-privacy-site-sync.md`](legal-and-privacy-site-sync.md) — privacy copy sync
- [`docs/TODO.md`](../TODO.md) — PA/PD sequenced items

*Update when the schema, event taxonomy, or offer ladder changes materially.*
