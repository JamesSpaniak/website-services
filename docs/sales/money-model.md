# Money model — attraction, upsell, downsell, continuity

How Drone Edge turns one first purchase into a customer relationship, per segment. This is the **commercial design** layer above [`packages.md`](packages.md) (offer ladder) and [`pricing-model.md`](pricing-model.md) (target vs current SKUs, Stripe state). Every dollar figure here is **draft** until leadership signs off; nothing in this file is a public claim.

Related: [`positioning.md`](positioning.md) (ICP, approved claims) · [`../marketing/paid-acquisition.md`](../marketing/paid-acquisition.md) (CAC math) · drone-building kit costs in [`assets/courses/drone-building/reference/parts-list-draft-v4.md`](../../assets/courses/drone-building/reference/parts-list-draft-v4.md) § 5 and [`soldering-lab.md`](../../assets/courses/drone-building/reference/soldering-lab.md).

---

## 1. The framework

A money model is the set of offers arranged so that acquiring a customer pays for itself quickly and the relationship keeps producing revenue afterwards. Four offer types:

| Offer type | Job | Rule of thumb |
|------------|-----|---------------|
| **Attraction (acquisition) offer** | Get a stranger to say yes once, cheaply. Ideally the first sale covers the cost of acquiring them. | Low price or free, low risk, fast result, obvious next step. |
| **Upsell** | Right after (or during) the first yes, offer the thing that makes the first purchase work better. | Highest acceptance is at the moment of purchase or the moment of first success. Complementary, not a repeat. |
| **Downsell** | When someone says no, offer a smaller, cheaper, or differently-paid version so the relationship starts anyway. | Never a discount on the same thing (trains buyers to wait). Remove something or change payment terms. |
| **Continuity** | Recurring revenue: subscriptions, annual contracts, consumables, protection plans. | Needs a recurring *reason* (new content, wear items, renewals, service), not just a recurring charge. |

The order matters: **attraction → upsell → (downsell if no) → continuity**. The website's job is to present the right offer at the right moment on that path; the sales rep's job is the same for schools.

### Where the money is

| Segment | Order size | Continuity potential | Hardware | Acquisition cost we can afford |
|---------|-----------|----------------------|----------|-------------------------------|
| **B2C individual** | $129 course; digital-only modelled LTV **~$162** (20%/10% attach — unvalidated) | Pro monthly; parts | Low-margin, optional | **~$80** target CAC digital-only — see [`../marketing/paid-acquisition.md`](../marketing/paid-acquisition.md). The old ~$18 / ~$36 figures were the $29-era model. |
| **B2B school** | Thousands per class-year; kits add $3.8k–6.1k per class of 10 | Annual seats, 3-year contracts, consumables, course 2 | Core of the building program | High ($100–400 per qualified consultation) |
| **B2B corporate sponsor / employer** | Sponsors one classroom to a district; or buys seats for its own workforce | Annual sponsorship renewal; workforce recertification cadence | Pass-through (they fund school kits) | High; relationship-driven |

Schools remain primary ([`positioning.md`](positioning.md)). B2C is the proof engine and the top of the funnel that turns teachers, parents, and hobbyists into school leads. Sponsors are a way to get a school program funded when the school's own budget says no.

---

## 2. Raw notes (Sep 10 2026)

Kept verbatim as the seed for § 3–5.

> **B2B school buys** — courses per seat · kits if building + extra parts · soldering kit pre-made · better materials · creativity options for kids · money-back guarantee (extra) · upsell for technical visits and activities? · cheaper for 3-year contract
>
> **B2B corporate sponsor** — same + social media upsells · partner with event org such as diversity .org
>
> **B2C** — courses · paid subscription (how to sell here more?) · replacement parts (with subscription upsell?) · give free parts list, sell how to build and modify · after someone buys and takes courses, what else can we sell them afterwards? · better parts, what else is realistic?

---

## 3. B2C — individuals

### 3.1 Ladder

| Step | Offer | Price (draft) | Status | Where it lives |
|------|-------|---------------|--------|----------------|
| **Attraction — free** | Unit 1 of Part 107 free with an account | $0 | Live | `/courses/{id}/preview` |
| **Attraction — free** | Free practice exam (email capture) | $0 | Not built (**S5**) | `/pricing`, articles |
| **Attraction — free** | **Free 3.5" build parts list** (BOM PDF with vendor links) — "here is exactly what to buy; the course teaches you to build and modify it" | $0 | Not built | `/courses/tracks/building` + article |
| **Core** | One course, lifetime access (Part 107 first; Video, AI, Building when live) | $129 | Live (Part 107) | In-app PaymentIntent |
| **Upsell at checkout** | Three-course bundle | TBD (**D10**) | Not built (**T16**) | Checkout order bump |
| **Upsell post-purchase** | Pro monthly (all courses + everything in § 3.3) | $29–49/mo | Code live, Price ID pending (**T17**) | Post-purchase page, `/profile` |
| **Upsell after completion** | Next course on the path (Part 107 → Building → Video/AI, or Part 107 → Video for creators) | $129 each or bundle credit | Live mechanics; needs trigger | Completion screen, email |
| **Upsell (Building course)** | **Kit** — Base (printed frame) or Video (CF frame + O4); Solder or Pre-soldered | ~$275 / ~$465 per aircraft; Pre-soldered +$25–40 | Not built; parts list v4 | Course page kit tab |
| **Upsell (kit owner)** | Better parts: CF frame, O4 Air Unit, N3 goggles, printed custom frame (print-and-ship), spares pack | $55–230 per item | Not built | Kit page, Pro parts store |
| **Downsell** | Pro monthly instead of $129 up front (lower entry, same access) | $29–49/mo | Code live | Decline path on checkout |
| **Downsell** | Payment plan on $129 via Stripe (Affirm/Klarna/Afterpay) | $129 in 3–4 | Not built; Stripe config | Checkout |
| **Downsell** | Practice-exam-only pack (question bank + mock exams, no lessons) | $29–39 | Not built | Decline path |
| **Downsell (kit)** | "Bring your own parts" — free parts list + course only; or Base instead of Video; Solder instead of Pre-soldered | $0 hardware | Parts list exists | Kit page |
| **Continuity** | Pro monthly / yearly | $29–49/mo, yearly optional | Code live | `/profile`, Customer Portal |
| **Continuity** | Consumables: props, batteries, motors, spares | per order | Not built | Parts store or affiliate links |

### 3.2 What to sell after the course is finished

The user's question — *after someone buys and takes a course, what else?* — has a real answer only if each next offer solves the problem the last one created:

| They just finished… | The new problem | Offer |
|---------------------|-----------------|-------|
| Part 107 course | "Am I actually ready for the test?" | Extra timed mock exams / weakest-category drill (Pro or practice pack) |
| Part 107 test (passed) | "Now what do I do with it?" | Video & Photography course (creative work) · AI & Drones (STEM/CS) · Building course (hands-on) · a "first paying job" content series (checklists, quoting, insurance basics — content only, no income claims) |
| Any course, 24 months later | Part 107 recurrent training is due every 24 calendar months | Recurrent refresher + refreshed practice pool inside Pro. **Be honest on the page that the FAA's own recurrent training is free**; ours is the practice and the explanation, not the certificate |
| Building course | "I want to build one" | Kit (Base → Video), Pre-soldered if they have no iron |
| Built the kit | "I crashed it" / "I want it better" | Spares pack, CF frame, O4 upgrade, goggles; print-and-ship custom frame from their own CAD |
| Flying for a season | "I want to fix and design my own" | Course 2 — Drone Repair and Custom Builds (proposal, soldering-lab § 6) |
| Anything, as a teacher/parent | "My school should have this" | **Referral to B2B**: "Bring Drone Edge to your school" CTA → `/consultation`; referral credit (Pro months or a kit discount) when a school converts |

Realistic caps: B2C hardware is low-margin, inventory-heavy, and batteries are hazmat to ship (UN3480/3481). Start with **vendor links / affiliate on the parts list** and a curated **spares pack** assembled per order; stock inventory only after school kit orders prove the supply chain.

### 3.3 Making the subscription worth paying for

Today Pro is "all courses while subscribed." One new course a year is not a reason to keep paying. To sell more subscriptions, Pro needs a recurring reason on the page:

| Pro benefit | Why it recurs | Effort |
|-------------|---------------|--------|
| All courses, including new tracks as they ship | New content | Live |
| Question bank updates when regulations or the ACS change; recurrent-training refresher every 24 months | Regulation cadence | Content ops |
| Unlimited timed mock exams and per-category drill | Exam prep never feels "done" | Exam generator exists; UI exposure |
| Tools: sectional viewer (`/tools/sectional`, planned), weather/airspace quick refs | Utility between courses | Planned |
| **Parts discount** (10–15 % on kits, spares, upgrades) and member-only spares pack | Ties the subscription to the hardware ladder — answers *"replacement parts with subscription upsell?"* | Store + coupon logic |
| Monthly live Q&A / build clinic (recorded) | Community and access | Staffing — start quarterly |
| Early access / member pricing on Course 2 and events | Anticipation | Policy |

Pricing shape: **monthly for the downsell path, yearly for the retention path** (two months free). Show Pro on the post-purchase page as "keep learning for $X/mo" rather than at first contact — the $129 buyer already trusts us; the stranger doesn't.

---

## 4. B2B — schools

### 4.1 Ladder

| Step | Offer | Price (draft) | Status | Where it lives |
|------|-------|---------------|--------|----------------|
| **Attraction — free** | Teacher preview seat + curriculum/pacing PDF + consultation | $0 | Consultation live; PDF blocked on pilot | `/schools`, `/consultation` |
| **Attraction — low risk** | **Pilot** (one section, one semester); **Pilot fee credited toward Classroom** if they upgrade in the same school year | Quote | Template ready | Rep |
| **Core** | **Courses per seat** — Classroom (year) or Program/District (multi-year) | Quote per seat | Template ready | Rep, PO/invoice |
| **Upsell — content** | Additional tracks per seat (Video, AI, Building when live) | Per-seat add-on | Not sellable until live | Quote line |
| **Upsell — hardware** | **Kits** for the Building track: Base ~$275 per aircraft; Video ~$465 parked until a real frame; class-of-10 Base landed ~$3.8k | Quote | Base can quote; Video parked (Tony 5 is not a 3.5" sibling) | Kit one-pager, quote |
| **Upsell — hardware** | **Pre-soldered SKU** (we solder ESC/motors/pigtail/RX; students bolt and plug) | +$25–40 per kit | Designed (soldering-lab § 5) | Kit order option |
| **Upsell — hardware** | **Soldering lab kit** for the Solder SKU: budget ($1,200) / standard ($2,000) / top-up ($20–60) for 6 stations; consumables ~$100–150/semester | Pass-through + margin | Researched | Kit qualification question: "do you own irons?" |
| **Upsell — materials** | **Better materials**: CF frame instead of printed; PETG default → nylon (our print side only); O4 video on Base aircraft; N3 goggles (Video), Goggles 3 for the RPIC | $55–230 per line | Parts list v1 § 3, § 8 | Kit order option |
| **Upsell — creativity** | **Creativity options for kids**: print-and-ship of students' own Unit 5 frame designs; filament color choice per team; LED strips, custom decals, printed prop guards; end-of-semester showcase/competition day | Per class or per print | Print-and-ship service not designed | Kit page, quote |
| **Upsell — spares** | Class spares pack (10–15 % of fleet value: props, motors, batteries, stack) | ~$300 per class of 10 | Parts list v2 § 5 | Quote line |
| **Upsell — service** | **Technical visits and activities**: on-site build day, maiden-flight day with our RPIC, virtual guest session, teacher PD (half-day), competition/showcase judging | Day rate + travel | Not designed | Quote line |
| **Upsell — protection** | **Kit protection plan** (the paid "money-back guarantee"): per-aircraft per-year, covers N crash replacements of listed parts, priority replacement shipping | ~10–15 % of kit price / year | Not designed | Kit order option |
| **Downsell** | Pilot instead of Classroom; club license instead of class; per-semester instead of year | Smaller quote | Template ready | Rep |
| **Downsell (kits)** | Fewer aircraft (teams of 3–4 instead of pairs); Base instead of Video; Solder instead of Pre-soldered; curriculum-only with school-sourced parts from the free parts list | Down to $0 hardware | Parts list | Rep |
| **Continuity** | Annual seat renewal | Quote | Template ready | Rep |
| **Continuity** | **3-year contract**: price lock + discount, annual billing | −10–15 % vs annual (draft) | Not in template | Quote, Appendix A |
| **Continuity** | Consumables replenishment each semester (props, batteries) | Per order | Not built | Reorder link for managers |
| **Continuity** | **Course 2 — Drone Repair and Custom Builds** in year 2; consumes the fleet's crash spares, keeps the fleet alive without new kits | Per seat + spares budget | Proposal | Year-2 conversation |

### 4.2 The guarantee — what to include vs what to charge for

Schools buy on PO and rarely ask for cash back; the guarantee's value is in the committee meeting. Split it:

| Guarantee | Included or paid | Shape |
|-----------|------------------|-------|
| **Seat guarantee** | Included | Unused seats refundable or credited within 30 days of launch; if a program is cancelled before launch, full credit toward a later term. Costs us nothing real and removes the "what if the teacher leaves" objection. |
| **Satisfaction guarantee** | Included | If the manager reports the program is not working after the first unit, we run a fix session; if still not working, credit the remaining term. Conditional on students having logged in — measurable in the manager dashboard. |
| **Kit protection plan** | **Paid add-on** | This is the honest version of "money-back guarantee (extra)": crash replacements and priority shipping for a yearly fee. Behaves like continuity. |

**Never** tie any guarantee to FAA pass rates or grant eligibility ([`positioning.md`](positioning.md) § Prohibited).

### 4.3 Why the 3-year contract sells itself

A 3-year discount is stronger when the curriculum is a 3-year arc, so the buyer sees years 2 and 3 as new content, not a repeat:

| Year | Program | Revenue lines |
|------|---------|---------------|
| 1 | Part 107 + Building course; fleet built | Seats, kits, soldering lab, spares, visit |
| 2 | Course 2 (repair and custom builds) + Video/AI track; fleet maintained | Seats, spares, protection plan, print-and-ship, showcase |
| 3 | Advanced/competition or student-designed builds; second cohort on the same fleet | Seats, consumables, upgrades (O4, goggles), PD |

Contract terms to add to the quote template: price lock, annual billing, seat true-up, early-termination = pay-through-current-year, protection plan renews with the contract.

---

## 5. B2B — corporate sponsors and employers

Two different buyers, one page.

### 5.1 Sponsor (funds a school program)

The sponsor pays for a classroom's seats and kits at a named school or district and receives recognition. Everything in § 4 is the deliverable; the sponsor is the payer.

| Step | Offer | Price (draft) | Deliverables |
|------|-------|---------------|--------------|
| **Attraction** | "Sponsor a classroom" — one-page ask with a named school, a real budget (class-of-10 Base ≈ $3.8k + seats), and an impact report template | $5–8k | Program page listing, thank-you in the school's launch email |
| **Core** | Sponsor a school (multiple sections) or a district cohort | $15–50k | Co-branded kit box/decal, logo on the school's program page, quarterly impact report (students enrolled, units completed, aircraft built — **real dashboard numbers only**) |
| **Upsell — social media** | Content package: we film build day / flight day with our own gear (Part 107-compliant, no minors' faces without release), deliver edited clips + N posts on our channels, tag rights for theirs | $2–5k per event | Clips, post schedule, usage license |
| **Upsell — presence** | Employee volunteer day (build day mentors), career talk, showcase judging | Travel + coordination fee | Run-of-show, safety brief, RPIC on site |
| **Upsell — story** | Case-study article on `/articles` + PDF the sponsor can reuse (needs school's written permission) | Included at school tier and above | Article, images |
| **Downsell** | Sponsor kits only (school pays seats), or sponsor one team's aircraft | $300–2k | Decal, mention |
| **Continuity** | Annual renewal, multi-year naming ("The [Sponsor] Drone Lab"), grant-matching commitments | Annual | Same deliverables each year |

**Event and community partners.** Diversity-in-STEM and aviation-outreach nonprofits, workforce boards, and maker/robotics event organizers run events that need hands-on activities. Offer a **build-and-fly workshop block** (kits + our RPIC + curriculum excerpt) they can slot into an event, funded by their sponsors. We get the audience and the footage; they get a turnkey activity. Name specific organizations only after a conversation — do not list "partners" on the site until an agreement exists.

### 5.2 Employer (buys for its own people)

Utility, inspection, real-estate, agriculture, public-safety teams that need Part 107 certificates. Same seat model as schools with a manager dashboard; continuity is the **24-month recurrent cadence** and new hires. Sell via quote; do not build self-serve B2B checkout for this yet.

---

## 6. Website — what each offer needs on the site

| Page / surface | Offer(s) served | Status | Notes |
|----------------|-----------------|--------|-------|
| `/pricing` (**S2**) | B2C ladder: free Unit 1 → $129 → bundle → Pro; schools "starting at" once approved + consultation CTA | Not built | Show what is and is not included (FAA test fee excluded). Refund/access policy link (**D9**). |
| Checkout order bump | Bundle upsell | Not built (**T16**) | One checkbox: "add the other two courses for +$X." |
| Post-purchase page | Pro upsell; next-course suggestion | Not built | Thank-you page after PaymentIntent succeeds is the highest-acceptance moment on the site. |
| Course completion screen | Next course, kit, Pro, "bring this to your school" | Not built | Trigger on course `status = completed`. |
| Decline path (modal or page) | Downsells: Pro monthly, payment plan, practice pack | Not built | Only after a "no"; never on first view. |
| `/courses/tracks/building` | Free parts list (email capture), kit tab (Base/Video, Solder/Pre-soldered), better-parts list | Stub page today | Parts list PDF is both a lead magnet and the downsell for kit non-buyers. |
| `/schools/kits` (new) | School kit one-pager, soldering-lab qualification, protection plan, visits/activities, 3-year arc | Not built | Mirrors the kit one-pager in the TODO; blocked on Joe's 3.5" frame pick. |
| `/schools` pricing block | Seat tiers, 3-year option, guarantees (§ 4.2) | Not built | No public seat price until leadership approves a "starting at." |
| `/sponsors` (new) | Sponsor tiers, impact report sample, content package, event workshop block | Not built | Real numbers only in impact samples; no logos without permission. |
| `/profile` | Pro manage/cancel; parts discount code; reorder spares | Pro live; rest not built | Customer Portal already wired. |
| Email sequences | Post-purchase ladder, completion follow-ups, 24-month recurrent reminder, spares reorder | Not built (**D7** ESP decision) | Do not send from the transactional domain. |
| Analytics | `upsell_shown / accepted / declined`, `downsell_*`, `kit_lead` events | Not built (**T3**) | Without these the ladder cannot be tuned. Full design: [`../tech/product-analytics.md`](../tech/product-analytics.md). |

Copy rules for all of the above: no countdown timers or fake scarcity, prices visible, guarantees stated plainly, prohibited claims list applies ([`positioning.md`](positioning.md), [`../marketing/paid-acquisition.md`](../marketing/paid-acquisition.md) § Trust mechanics).

---

## 7. Realism check — what is worth building, in order

| Priority | Item | Why now |
|----------|------|---------|
| 1 | **Bundle SKU + post-purchase Pro upsell** | Pure Stripe/config work on live code. Resolve **D10 / MM1** first — bundle **must exceed $129**. The $69–79 draft is retired. |
| 2 | **Free parts list as lead magnet** | Costs a PDF and an email form; feeds both B2C and school kit leads; doubles as the kit downsell. |
| 3 | **School kit page + protection plan + 3-year terms in the quote template** | Sales collateral, no engineering; unblocks the first kit quote once Joe's picks land. |
| 4 | **Pro benefits beyond "all courses"** (mock exams, updates, parts discount) | Makes the subscription sellable; mostly exposing what exists plus a coupon. |
| 5 | **Sponsor page** | Unlocks funding for schools that want the program but have no budget; needs one real school to point at. |
| 6 | **Parts store / spares pack** | Only after kit orders exist; start with vendor links, then per-order packs. |
| 7 | **Technical visits, showcase days, content packages** | Sell manually via quote first; productize once demand is visible. |

### Do not

- Stock hardware inventory or ship LiPo batteries ourselves before the supply chain is proven (hazmat, margin, returns).
- Sell to minors directly on B2C; students come through school orgs.
- Discount the same SKU as a "downsell" — change what is included or how it is paid instead.
- Publish sponsor or partner names, pass rates, or school counts before permission and data exist.

---

## 7b. Measuring the ladder

Every price, attach rate, and guarantee in this file is currently **unmeasurable**. There is no transactions table — course ownership is a join row with no amount, and Pro revenue is an audit row with no dollar figure. Revenue, LTV, refund rate, and seat utilization cannot be computed today. Design and sequencing: [`../tech/product-analytics.md`](../tech/product-analytics.md); build items **PA1–PA12** in [`../TODO.md`](../TODO.md).

The commercial logic each metric unlocks:

| Ladder step | Signal that triggers it | Metric needed |
|-------------|------------------------|---------------|
| Post-purchase Pro upsell | Purchase completed | Transaction record + `upsell_shown/accepted/declined` |
| Next-course upsell | `course_completed` | Progress `completed_at` |
| Practice pack | Same exam category failed repeatedly | Exam attempt **history** (currently upserted — history is lost) |
| Kit offer / BYO downsell | Building track viewed, parts list downloaded, no kit | `kit_lead`, `parts_list_downloaded` |
| Recurrent refresher | Course completed 24 months ago | Progress `completed_at` |
| **Pro downsell ("save them money")** | Active subscriber, zero logins in 30 days | Per-user activity recency |
| **Seat right-sizing at renewal** | Seats purchased vs. members ever active | Org utilization view |
| Year-2 / 3-year arc upsell | Org completed the Part 107 track | Org-level completion |

Two things worth flagging against § 4.2: the **seat guarantee** ("unused seats refundable or credited within 30 days") and the **satisfaction guarantee** ("conditional on students having logged in — measurable in the manager dashboard") are both already promises in the quote, and neither is measurable today. The utilization work makes them operable rather than aspirational.

On the revenue tension of proactively right-sizing a district's seats: the honest framing is that a school at ~55% utilization does not renew at all, so the realistic alternative to a smaller renewal is a churned account plus no referral in a market where CTE directors talk to each other. Catch it in week 3 and fix the rollout; do not discover it in the renewal meeting.

**Student-data constraint:** B2B insights go to the manager or district in aggregate, never to the student, and student data never reaches an ad platform. See [`../tech/product-analytics.md`](../tech/product-analytics.md) § 10.

**Hardware changes the CAC math.** Once kits, parts, and merch are in the ladder, a blended LTV that adds a $129 course (~97% margin) to a $465 kit (far thinner after COGS, shipping, and returns) overstates what we can afford to spend on acquisition. Target CAC must be computed from **contribution margin**, not revenue — see [`../tech/product-analytics.md`](../tech/product-analytics.md) § 9.2. Related: the kit protection plan price (**MM3**) is an actuarial question that only warranty-claim data can answer.

---

## 8. Decisions needed

| # | Decision | Owner | Blocks |
|---|----------|-------|--------|
| MM1 | Bundle price — **must exceed $129** (**D10**). $69–79 draft retired Sep 17 2026 | Leadership | T16, `/pricing` |
| MM2 | Pro monthly/yearly price and the benefit list in § 3.3 | Leadership | T17, `/pricing` |
| MM3 | Kit protection plan: fee, covered parts, replacement cap | Ops + Joe | Kit one-pager |
| MM4 | 3-year contract discount and terms | Leadership | Quote template |
| MM5 | Sponsor tier prices and impact-report fields | Leadership | `/sponsors` |
| MM6 | Technical visit day rate and travel policy | Leadership | Quote template |
| MM7 | Parts fulfilment model: affiliate links vs per-order packs vs stock | Ops | Parts store |
| MM8 | Referral credit for B2C → school conversions | Leadership | Completion screen copy |
| MM9 | Do we proactively right-size school renewals on low seat utilization, or only on request? — **Decided 2026-09-12: track only for now.** Utilization is measured (`v_org_utilization`, admin Signals "low utilization" queue, manager "Active seats (30d)") but triggers no email, offer or renewal script. Revisit after the first renewal. "Active seat" = any learning activity in 30 days (**PD7**) | Leadership | — |
| MM10 | Pro "pause" option vs. downsell-to-single-course for inactive subscribers | Leadership | Churn-save flow |

---

---

## 9. Open gaps (tracked in TODO)

Items designed here that are **not** in the quote template, packages add-on table, or a public page yet. Each has a TODO row under **P1 — Sales & GTM → Money model**.

| Gap | What is missing | Blocks / note |
|-----|-----------------|---------------|
| **Bundle price** | No number — only the constraint “> $129” | MM1 / D10. Do not ship T16 until signed off. |
| **Checkout decline path** | No modal/page for Pro monthly, payment plan, or practice pack | Needs MM2 + Stripe payment-plan config |
| **Practice-exam pack** | No SKU, no Price ID | Downsell only — do not show on first view |
| **Quote template lines** | No 3-year discount, seat/satisfaction guarantee, kit protection, visit day-rate, soldering-lab, or sponsor payer | [`quote-template.md`](quote-template.md) still seats-only |
| **Packages add-ons** | Protection plan, visits, 3-year, soldering lab, creativity/print-and-ship not listed | [`packages.md`](packages.md) § Add-ons |
| **Employer path** | § 5.2 has no page or quote variant | Do not build self-serve checkout |
| **Event / nonprofit partners** | Workshop block is copy only; no named orgs | Outreach, then `/sponsors` |
| **Print-and-ship** | Service design not started | Building-course TODO |
| **Course 2 (repair)** | Proposal only | Year-2 conversation; depends on v1 kit sales |
| **Email sequences** | Post-purchase, completion, 24-month recurrent, spares | **D7** ESP decision first |
| **Stale $29 copy** | Article C slug/title still $29 | GTM + rep-handoff + paid-acquisition CAC cleaned Sep 17; rewrite article C before publish |

*Update this file when a ladder step ships, a price is approved, or a decision above closes. Keep [`packages.md`](packages.md) and [`pricing-model.md`](pricing-model.md) in sync for SKU facts.*
