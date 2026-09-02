# Organization classes (periods) — design plan

**Status:** Phase 1 **shipped Sep 1, 2026** (backend + admin/manager/register UI + migration `1762600000000-AddOrganizationClasses`). Phase 2 (per-class teachers) remains deferred. Decisions taken at implementation: class deletion is **blocked** while the class has members (open question 1 → yes); class soft cap is **display-only** (open question 2); `school_year`/`semester` stay org-level (open question 3).
**Driver:** One teacher running two class periods (25 + 30 students) of the same FAA 107 course. Today the only options are one mixed-roster org or two orgs with two teacher accounts (a user can belong to only one org, enforced in `organization.service.ts`).

## Decision summary

Add a **class** (period/section/cohort) sub-entity under `Organization` instead of allowing multi-org membership.

- One school = one org. The one-org-per-user constraint **stays** — it protects seat accounting and keeps `GET /organizations/my`, `ManagerGuard`, and the manager shell single-org. No org switcher needed.
- Classes are a **grouping layer inside the org**: rosters, invites, progress views, and class exams become class-aware.
- **Managers stay org-wide by default** (single teacher email manages every class). Per-class teachers are an optional second phase.
- Seats (`max_students`) remain **org-level** — that is what is purchased. Classes get an optional soft cap for display only (phase 1).

Result for the driving scenario: one org ("Lincoln HS", 55 seats, FAA 107 assigned) with classes "Period 2" (25) and "Period 5" (30), one manager account for the teacher.

## Data model changes

### New table `organization_classes`

| Column | Type | Notes |
|--------|------|-------|
| `id` | PK | |
| `organization_id` | int FK → `organizations`, `ON DELETE CASCADE` | indexed |
| `name` | varchar | unique per org (`UNIQUE (organization_id, name)`), e.g. "Period 2" |
| `max_students` | int nullable | optional soft cap; org cap remains authoritative |
| `created_at` | timestamptz | |

New entity `backend/src/organizations/types/organization-class.entity.ts`, mirroring `OrganizationMember` style.

### Column additions (all nullable → backward compatible, no data migration)

| Table | New column | Semantics |
|-------|-----------|-----------|
| `organization_members` | `class_id` FK → `organization_classes`, `ON DELETE SET NULL` | Student's class. `NULL` = unassigned (and the default for managers = org-wide manager). |
| `invite_codes` | `class_id` FK, `ON DELETE SET NULL` | Invite lands the student directly in this class on redemption. `NULL` = org-level invite. |
| `class_exams` | `class_id` FK, `ON DELETE SET NULL` | Exam assigned to one class. `NULL` = whole org (current behavior; the `label` convention like "Unit 3 Quiz — Period 2" becomes structured). |

One migration in `backend/migrations/` (e.g. `1762600000000-AddOrganizationClasses.ts`). Existing orgs simply have zero classes and all members unassigned — nothing changes for them.

### Explicitly not doing

- Multi-org membership (superseded by this design).
- A `class_members` junction (student in multiple classes) — one `class_id` per member is enough; revisit only if a real school needs it.
- Per-class course assignment — courses stay org-level (`organization_courses`).
- Per-class seat enforcement in phase 1 (org cap is the hard limit).

## Phase 1 — classes as grouping/filtering (solves the driver)

All managers remain org-wide. No permission changes; `OrgManagerGuard` untouched.

### Backend API (all under existing `@Controller('organizations')`, guard `OrgManagerGuard` unless noted)

| Method | Path | Purpose |
|--------|------|---------|
| `GET` | `/organizations/:id/classes` | List classes with per-class member counts |
| `POST` | `/organizations/:id/classes` | Create class (`name`, optional `max_students`) |
| `PATCH` | `/organizations/:id/classes/:classId` | Rename / change soft cap |
| `DELETE` | `/organizations/:id/classes/:classId` | Delete (members become unassigned via `SET NULL`) |
| `PATCH` | `/organizations/:id/members/:userId/class` | Assign/move/clear a member's class (`class_id: number \| null`) |

Modified existing surface:

- `GenerateInviteCodeDto` / `BulkGenerateInviteCodesDto`: optional `class_id` (validated to belong to the org). `bulkGenerateInviteCodes` and `generateInviteCode` persist it; invite email copy may include class name.
- `validateAndConsumeInviteCode`: copies `class_id` from invite → membership row.
- `getInviteCodeInfo` (`GET /organizations/invite-info`): add `class_name` so the register page can show "Lincoln HS — Period 2".
- `getMembers` / `OrganizationMemberResponse`: add `class_id` + `class_name`.
- `getOrgProgressSummary` / `getOrgCourseDetailedProgress`: optional `?classId=` query filter (also add `class_id` to each row so the frontend can filter client-side if preferred).
- `getInviteCodes` / `InviteCodeResponse`: add `class_id` + `class_name`.
- `GenerateClassExamDto` (questions module): optional `class_id`; `listClassExams` returns it; `getClassResults` filters attempts/roster to that class when set. Student-facing `GET /exams/class/assigned` shows org-wide exams plus exams for the student's class only.
- `getMyOrganization` (`/organizations/my`): add `class_id` + `class_name` so students see their period.

### Admin flow (`/admin/organizations`)

- Org detail panel gains a **Classes** section: list / create / rename / delete, per-class member counts vs soft cap.
- Single + bulk invite panels gain a **class selector** (optional, defaults to "No class / whole org"). Typical setup: paste Period 2's 25 emails with class = Period 2, then Period 5's 30 emails with class = Period 5.
- Org create/edit, course assignment, seat cap: unchanged.

### Manager flow (`/manager`)

- **Members tab:** class column, class filter dropdown, per-row "move to class" action (uses the new member-class endpoint). "Add member" gains class selector.
- **Invites tab:** class selector on invite creation; class column in the list. Add the **bulk invite panel** here too (API already allows managers; only the admin UI exposes it today — this is the natural moment to close that gap).
- **Progress tab:** class filter dropdown on summary and per-course detail.
- **Class exams tab:** class selector when generating an exam (replaces the "put the period in the label" convention); results view filtered to the class roster; CSV export inherits the filter.
- **Shell header:** keep org-wide seat usage; optionally append per-class counts ("Period 2: 24/25 · Period 5: 30/30").

### Student flow

- Register via invite link → lands in org **and** class automatically; register page shows org + class name.
- Profile/`/organizations/my` shows "Lincoln HS — Period 2".
- Assigned exams list shows org-wide exams + their class's exams only.
- No other student-facing changes; course access still flows from org-assigned courses.

## Phase 2 (optional, later) — per-class teachers

Only needed when different classes have different teachers **and** teachers must not see each other's rosters. If all teachers are trusted org-wide, phase 1 already supports multiple managers.

- Semantics: manager with `class_id = NULL` → org-wide (default); manager with `class_id` set → scoped to that class.
- `OrgManagerGuard` still answers "is a manager of this org"; **services** additionally filter members/invites/progress/exam results to the manager's class when scoped.
- Class-scoped managers cannot: edit org classes, invite managers, or touch members outside their class.
- UI: manager shell shows the scoped class name; admin/member role editor gains "manager of <class>" option.

Defer until a customer actually needs isolation between teachers.

## Open questions

1. Should deleting a class be blocked while it has members (force explicit reassignment) instead of `SET NULL`? Leaning yes for safety — cheap check in the service. *(Decide at implementation.)*
2. Soft cap per class: enforce on invite (warn/block when class is full) or display-only? Phase 1 leans display-only; org cap remains the hard stop.
3. Should `school_year`/`semester` move to the class level eventually? Out of scope now; org-level fields stay.

## Implementation checklist (phase 1)

Backend
- [ ] `OrganizationClass` entity + migration (new table + 3 nullable FK columns)
- [ ] Class CRUD + member-class endpoints in `organization.controller.ts` / `organization.service.ts`
- [ ] `class_id` through invite DTOs, `validateAndConsumeInviteCode`, `getInviteCodeInfo`
- [ ] `classId` filter on progress endpoints; `class_id`/`class_name` on member, invite, membership responses
- [ ] `class_id` on `GenerateClassExamDto`, `listClassExams`, `getClassResults`, `listAssignedClassExams`
- [ ] Unit tests for seat accounting + invite redemption with classes

Frontend (`drone/`)
- [ ] Types in `lib/types/organization.ts` + api-client helpers (class CRUD, member class, classId params)
- [ ] Admin org page: classes section + class selector on invites
- [ ] Manager members/invites/progress/exams: class column, filters, selectors; bulk invite panel in manager invites
- [ ] Register page: show class name from invite-info

Docs (same session as ship)
- [ ] `docs/tech/backend-data.md` — entities + route table
- [ ] `docs/tech/frontend-data.md` — admin/manager/register flows
- [ ] `docs/sales/features.md` — orgs row (class/period grouping)
- [ ] `docs/TODO.md` → `docs/TODO_COMPLETED.md` row move
