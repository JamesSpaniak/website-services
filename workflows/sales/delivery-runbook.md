# Delivery runbook — school packages (post-close)

Steps from **signed quote / PO received** through **student launch** and first success check-in. Sales rep coordinates; product/admin executes provisioning unless rep is trained.

Reference: [`docs/sales/packages.md`](../../docs/sales/packages.md), [`outreach.md`](outreach.md) § Sales package checklist, [`quote-template.md`](../../docs/sales/quote-template.md).

---

## Roles

| Role | Responsibility |
|------|----------------|
| **Sales rep** | Customer communication, timeline, recap emails, check-ins, expansion |
| **Product / admin** | Org creation, course assignment, seat caps, invite codes |
| **Leadership** | Non-standard contracts, DPA, security questionnaires |

---

## Phase 1 — Handoff (within 1 business day of close)

Rep sends internal handoff (Slack/email/ticket) with:

- [ ] Organization legal name and address  
- [ ] Primary contact (name, title, email, phone)  
- [ ] AP / billing contact if different  
- [ ] Package tier (Pilot / Classroom / Program)  
- [ ] Seat cap (students) and manager account count  
- [ ] Subscription term (start + end dates)  
- [ ] Course(s): FAA Part 107 — course ID/title  
- [ ] Quote # and payment status (PO received / invoice sent / paid)  
- [ ] Launch target date  
- [ ] Special notes: tax-exempt, vendor ID, DPA request, accessibility ask  

Copy customer-facing recap from post-call template; confirm launch date in writing.

---

## Phase 2 — Org provisioning (product/admin)

1. **Create organization** in admin tooling.  
2. **Assign course(s)** — Part 107 course to org catalog.  
3. **Set seat cap** to match quote (do not exceed without rep approval).  
4. **Create manager account(s)** for named CTE lead / teachers.  
5. **Generate invite codes** or prepare bulk invite list per agreed approach.  
6. **Verify** manager can access [`/manager`](https://thedroneedge.com/manager) and see org roster (empty until students join).

Document in handoff ticket: org ID, manager emails, invite code(s) or invite process.

---

## Phase 3 — Customer onboarding (rep + admin)

### Welcome email (rep sends)

```text
Subject: Welcome to Drone Edge — [Organization Name] launch

Hi [Name],

We're set up for [Organization Name] on Drone Edge. Summary:

- Term: [Start] – [End]
- Seats: [N] students
- Course: FAA Part 107 — [title]
- Manager login: [emails]

Next steps:
1. Manager onboarding call: [date/time] — we'll walk through the teacher dashboard and student invites.
2. Student access: [invite code / registration instructions].
3. Launch target: [date].

Links:
- School overview: https://thedroneedge.com/schools
- Privacy: https://thedroneedge.com/privacy
- Terms: https://thedroneedge.com/legal

If IT or grants needs anything before students log in, reply here and we'll route it.

Best,
[Rep name]
Drone Edge
```

### Manager onboarding call (30–45 min)

Agenda:

1. Log in — manager vs student roles  
2. **Manager dashboard** — roster, progress, exam scores  
3. Student invite flow — codes, email domain notes if any  
4. Suggested pacing — semester vs year (verbal until PDF pacing guide ships)  
5. Support path — rep email; escalate product issues to admin  
6. Q&A — privacy, proctoring, async vs classroom  

Demo path matches [`rep-handoff.md`](../../docs/sales/rep-handoff.md) § 15-minute demo script.

---

## Phase 4 — Launch

| Check | Owner |
|-------|-------|
| Students can register / redeem invites | Admin verify |
| Course visible after login | Admin verify |
| Unit 1 accessible; progress saves | Admin spot-check |
| Manager sees enrolling students within 24h of first signup | Rep confirm with buyer |
| Teacher knows where to find practice exams | Onboarding call |

Rep sends **launch confirmation** email on agreed launch date.

---

## Phase 5 — Success check-ins

| Tier | Check-in | Purpose |
|------|----------|---------|
| **Pilot** | **30 days** after first student activity | Usage, blockers, quote expansion? |
| **Classroom** | **Mid-year** (+ optional 30-day) | Seat utilization, exam usage, renewal signal |
| **Program** | **Quarterly** per agreement | Multi-site adoption, add seats |

Check-in questions:

- How many students active vs enrolled?  
- Are teachers using the manager dashboard weekly?  
- Any IT, privacy, or pacing friction?  
- Exam/practice usage — enough for your timeline?  
- Renewal / expansion / additional sections?  

Log outcomes in CRM; flag case-study candidacy if program is going well.

---

## Common blockers

| Blocker | Action |
|---------|--------|
| Privacy / FERPA review | Send `/privacy`; escalate DPA to leadership |
| Student email domain restrictions | Document workaround (personal email vs SSO wait) |
| Seat cap exceeded | Rep approves add-on quote or true-up |
| Teacher can't find manager view | Re-run dashboard demo; confirm manager role |
| Low student login week 1 | Rep nudges buyer; offer second teacher session |
| Grant reporting needs usage stats | Export from manager dashboard; manual until reporting SKU |

---

## Renewal (60–90 days before term end)

Rep:

1. Pull usage summary (active students, manager engagement).  
2. Propose renewal tier — Classroom → Program if multi-section.  
3. Send quote using [`quote-template.md`](../../docs/sales/quote-template.md).  
4. Schedule renewal call with decision maker + champion teacher.

---

## Definition of done — delivery

- [ ] Org live with correct seat cap and course  
- [ ] Manager(s) trained on dashboard  
- [ ] Students can access course on launch date  
- [ ] Welcome + launch emails sent  
- [ ] Check-in date on calendar  
- [ ] CRM stage = **Won / Active** with renewal date  

---

## Related

- [`docs/sales/go-to-market-review.md`](../../docs/sales/go-to-market-review.md) — full funnel  
- [`rep-handoff.md`](../../docs/sales/rep-handoff.md) — what rep owns vs product
