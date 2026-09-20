# Packages & pricing — Drone Edge

Offer ladder for **B2B (schools)** and **B2C (individuals)**. Dollar amounts for school packages are **internal placeholders** until leadership signs off — mark quotes **DRAFT** until approved.

Retail B2C pricing is public on course preview pages after deploy (`assets/courses/faa-107/faa_107_course.json` → **$129** one-time, Unit 1 `free_preview`). All three courses (Part 107, Video & Photography, AI & Drones) are priced at **$129** as of 2026-08-12.

**Target vs current tech + finish checklist:** [`pricing-model.md`](pricing-model.md). Checkout does **not** require email verification (logged-in account is enough); verification remains recommended for account recovery.

---

## Offer summary

| Tier | Buyer | Channel | Status |
|------|-------|---------|--------|
| **Retail — Part 107** | Individual | Stripe self-serve | Live (post-deploy) |
| **Pilot** | School — first program | Quote + manual org setup | Template ready |
| **Classroom** | School — single section/year | Quote + PO/invoice | Template ready |
| **Program / District** | Multi-section or multi-year | Quote + agreement | Template ready |

**Sales rep sells:** Pilot, Classroom, Program/District only.  
**Marketing also promotes:** Retail Part 107.

---

## B2C — Retail (individual)

| Item | Detail |
|------|--------|
| **Product** | FAA Part 107 course — full lifetime access |
| **Price** | **$129** one-time (USD) |
| **Preview** | Unit 1 free with account |
| **Purchase** | Stripe PaymentIntent (in-app Card Element) after login |
| **Includes** | All units, section practice exams, full-course practice/final exams, progress tracking |
| **Excludes** | FAA knowledge test fee (~$175 paid to testing center); in-person flight training |

### Pro membership (monthly account)

| Item | Detail |
|------|--------|
| **Product** | Active **Pro** role — access to **all** courses while the subscription is current |
| **Price** | Set in Stripe (Price ID `STRIPE_PRO_PRICE_ID_MONTHLY`); placeholder target **~$29–49/mo** until leadership signs off |
| **Purchase** | Stripe Checkout (`mode=subscription`) from profile or course purchase upsell |
| **Manage / cancel** | Stripe Customer Portal from profile |
| **After cancel** | Lifetime **course** purchases remain; Pro-only access ends at period end |

**Public pages:** `/courses/{id}/preview`, `/courses/{id}` (learning hub), `/profile` (membership).

**Bundle (not built):** three-course lifetime SKU. Price **TBD, must exceed $129** (D10 / MM1). Do not quote $69–79 — that was the $29-era leftover.

Do not discount publicly without a documented promotion. Comps use admin grant (`POST /purchases/course`, `POST /purchases/pro-membership`).

### Purchase access model

```
has_access(course) =
  admin
  OR active Pro (role=pro AND pro_membership_expires_at > now)
  OR user purchased that course (user_courses_purchased)
  OR org assignment
```

| Path | Stripe object | Permission result |
|------|---------------|-------------------|
| One course | PaymentIntent | Lifetime row in `user_courses_purchased` |
| Pro monthly | Checkout Subscription | `role=pro` + expiry synced from subscription period |
| Enterprise / schools | Off-platform quote | Org membership (not self-serve Stripe) |
---

## B2B — School packages (structure)

Fill **seat cap**, **term**, and **price** on each quote. Suggested naming:

### Pilot

**Purpose:** One teacher, one section, first evaluation semester.

| Field | Typical range (draft) |
|-------|------------------------|
| Seats | Up to **25–30** students |
| Term | **1 semester** or **90 days** from launch |
| Courses | **Part 107 (live) + drone building (standing up)** — kits optional quote line. Not Video/AI. |
| Support | 1 onboarding call + email |
| Manager seats | 1–2 |
| Price | **Quote** — internal placeholder: discuss with leadership |

**Good for:** STEM/CTE exploring drones; proof before district rollout.

### Classroom

**Purpose:** Single program running a full school year.

| Field | Typical range (draft) |
|-------|------------------------|
| Seats | Up to **30–120** (align to actual section count) |
| Term | **1 school year** (Aug–Jun or district calendar) |
| Courses | Part 107 + drone building. Video/AI later when live. |
| Support | Onboarding + mid-year check-in |
| Manager seats | 2–5 |
| Price | **Quote** — per-seat or flat classroom fee |

**Good for:** Career academies, single high school CTE pathway.

### Program / District

**Purpose:** Multiple sections, campuses, or multi-year commitment.

| Field | Typical range (draft) |
|-------|------------------------|
| Seats | **100+** or unlimited cap by agreement |
| Term | **1–3 years** |
| Courses | Part 107 + drone building + later tracks when live |
| Support | Implementation plan, training session(s), named success contact |
| Custom | PO, vendor onboarding, tax-exempt invoicing, optional appendix for data/privacy |
| Price | **Quote** — volume discount |

**Good for:** District CTE, intermediate units, community college workforce.

---

## Add-ons (future / quote line items)

| Add-on | Notes |
|--------|--------|
| Extra seats mid-term | Pro-rate or annual true-up |
| Additional manager accounts | Usually included; large districts may need more |
| Teacher PD session | Half-day virtual workshop |
| Custom pacing / standards mapping doc | Manual deliverable until self-serve PDFs ship |
| Video or AI track (when live) | **Later** — built on 107 + building. Not a year-1 SKU. |
| Base kit (class pack) | Quote $1,000–$1,500/aircraft band (BOM ~$275). Solder vs Pre-soldered. Draft until parts locked. |
| Pre-soldered surcharge | +$25–40 per kit — we solder ESC/motors/pigtail. Designed, not a Stripe SKU. [`money-model.md`](money-model.md) § 4 |
| Soldering lab (if school solders) | Budget ~$1,200 / standard ~$2,000 / top-up $20–60. Qualification: “do you own irons?” |
| Kit protection plan | Paid add-on (~10–15% of kit / year). **MM3** — not designed. Do not promise crash replacements without this line. |
| Technical visit / activity | Day rate + travel. **MM6** — not priced. On-site build day, maiden flight with our RPIC, PD, showcase judging. |
| 3-year contract | Price lock + draft −10–15% vs annual. **MM4** — not in [`quote-template.md`](quote-template.md) yet. |
| Print-and-ship / creativity options | Student Unit 5 frames, colors, LEDs. Service design not started. |
| Corporate sponsor as payer | Same deliverable, different bill-to. See [`money-model.md`](money-model.md) § 5. |

**Not sold yet:** SSO/SAML, LTI, Google Classroom roster sync, white-label domain, Video/AI year-1 SKUs, self-serve B2B checkout.

---

## Quote checklist

Before sending a formal quote, confirm ([`outreach.md`](../../workflows/sales/outreach.md) § Sales package checklist):

- [ ] Tier selected (Pilot / Classroom / Program)
- [ ] Seat cap matches discussed headcount
- [ ] Term dates (start + end)
- [ ] Course list (Part 107 live; drone building as standing-up + kit line if any — not Video/AI)
- [ ] Price, valid-through date, payment terms
- [ ] Tax-exempt status if applicable
- [ ] PO required? Vendor W-9 / onboarding?
- [ ] Privacy (`/privacy`) and Terms (`/legal`) linked
- [ ] Appendix A / subscription language if using contract template
- [ ] Implementation owner and launch date

Use [`quote-template.md`](quote-template.md) for email-ready structure.

---

## Procurement & payment (B2B)

| Method | When |
|--------|------|
| **Invoice / PO** | Default for schools |
| **Credit card** | Small pilots only if district allows |
| **Stripe (retail)** | Individuals only |

Org provisioning after close:

1. Admin creates organization (or rep requests from product owner)
2. Assign course(s) to org
3. Generate invite codes or bulk invites
4. Manager onboarding call — show [`/manager`](https://thedroneedge.com/manager) dashboard

---

## Pricing governance

| Role | Responsibility |
|------|----------------|
| **Sales rep** | Qualify, propose tier, send draft quote within approved bands |
| **Leadership / founder** | Approve non-standard discount, multi-year, or district-wide deals |
| **Product / ops** | Org setup, seat caps, course assignment |

**Do not** publish B2B seat pricing on the website until leadership approves a public “starting at” number.

---

## Related docs

- [`positioning.md`](positioning.md) — ICP and messaging
- [`money-model.md`](money-model.md) — upsell / downsell / continuity ladders, kits, protection plan, 3-year contract, sponsors
- [`rep-handoff.md`](rep-handoff.md) — rep process
- [`quote-template.md`](quote-template.md) — copy-paste quote skeleton
- [`features.md`](features.md) — what the platform actually does today

*Replace placeholder bands with approved numbers when pricing is finalized.*
