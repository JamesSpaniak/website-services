# Backend API — configuration, data model, permissions, routes

NestJS service (`backend/`). Database: **PostgreSQL** via TypeORM. API docs: **`/api`** (Swagger) when the server is running.

---

## 1. API configuration overview

### Environment (database)

| Variable | Purpose |
|----------|---------|
| `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD` | PostgreSQL connection |
| `DB_SSL` | When `true` / `1`, uses TLS (`rejectUnauthorized: false`) |
| `synchronize` | **`false`** — schema changes via migrations only |

Connection is defined in `src/config/app.config.ts`.

### Environment (auth & security)

| Variable | Purpose |
|----------|---------|
| `JWT_SECRET` | Signs access tokens (short-lived; default ~15m in `auth.module`) |
| Refresh tokens | Stored in `sessions` table (selector + hashed verifier) |

JWT payload is validated in `JwtStrategy`; **`token_version`** on `users` must match the token or the session is rejected (logout / password change invalidates old tokens).

### Environment (integrations)

| Area | Variables (typical) |
|------|---------------------|
| Stripe | `STRIPE_SECRET_KEY`; `STRIPE_WEBHOOK_SECRET` only when Terraform `stripe_webhook_enabled = true` (unset in prod today → webhook handler returns 400; one-time course purchases still complete via `POST /purchases/confirm-payment`, which retrieves the PaymentIntent server-side, records the order and grants the entitlement) |
| Email | SMTP / provider settings used by `EmailModule` |
| Media / CloudFront | `CLOUDFRONT_MEDIA_DOMAIN`, signing keys for video URLs |
| OpenTelemetry | `OTEL_EXPORTER_OTLP_*`, `OTEL_SERVICE_NAME` — optional; loaded via `telemetry.ts` before Nest bootstrap |
| Analytics archive | `ANALYTICS_ARCHIVE_BUCKET` (S3 bucket for `product_events` partitions older than `ANALYTICS_RETENTION_MONTHS`, default 12). Unset → archival step is a no-op. Bucket `droneedge-dev-analytics-archive` + task-role `s3:PutObject` + env live since 2026-09-12 (PA35). |
| Access ledger | `ENTITLEMENTS_AUTHORITATIVE=true` (live in prod since 2026-09-12) makes `CourseService.hasAccess` read `entitlements` (`EntitlementService.hasLiveAccess`) instead of `user_courses_purchased` + `users.role/pro_membership_expires_at`; org seats stay relational (`hasOrgCourseAccess`). Set `false` to roll back. While authoritative, `grantCourse`/`syncPro` **rethrow** on failure (a missing row would mean no access) — revokes never throw (an expired Pro row is already dead; a missed course revoke surfaces in `access_diff`). Every ledger write failure increments `entitlements.write_failures{op}`. `purchaseCourse` and `grantCourseAccess` treat "legacy row present, ledger row missing" as a repair, not a duplicate. Note the legacy `pro_membership_expires_at` is `timestamp without time zone` (TZ-dependent in Node); ledger `starts_at`/`ends_at` are `timestamptz` and compared in SQL. `GET /reporting/health` reports the flag. |

### Cross-cutting behavior

- **Throttling:** `@nestjs/throttler` via `UserThrottlerGuard` — tracker is the JWT `sub` when a valid access token is present (cookie or Bearer), else client IP. Global 30/min; stricter on `forgot-password` / `reset-password`; `POST /analytics/event` 120/min; `POST /logs` 10/min. Authenticated classroom traffic is per-user (**PA32**); **login / register / `/logs` before a JWT still share one IP bucket** (school NAT, coffee shop). Edge WAF is a separate 20 000 req/IP / 5 min cap on CloudFront. Shared-IP policy: [`TODO.md`](../TODO.md) classroom rate limits.
- **Request ID:** `RequestIdMiddleware` (correlation in logs).
- **HTTP logging:** `LoggingInterceptor` logs `METHOD url duration` (health checks excluded).
- **Errors:** `HttpExceptionFilter` — 5xx and unhandled exceptions log **stack traces**; some DB constraint errors mapped to friendly messages.
- **Analytics never blocks business flows.** `ProductEventsService.record` (server events) and every `EntitlementService` write catch + log and return; `PurchaseService.recordCourseOrder` swallows an order-insert failure so the Stripe webhook still grants access (and Stripe is not asked to retry). The safety net is the nightly reconciliation (`paid_grant_without_order` flags such grants; `POST /purchases/admin/backfill-order` repairs them from Stripe) plus bounded-label OTel metrics: `product_events.accepted{source}`, `product_events.dropped{reason}`, `product_events.failures{stage}`, `orders.record_failures`, `analytics.maintenance.step_ms{step,status}`, `analytics.maintenance.failures{step}`, `analytics.maintenance.lock_skipped`, and the gauge `analytics.reconcile.mismatches{check}`. Alert on any `failures`, any `orders.record_failures`, `accepted` flat-lining in school hours, and `reconcile.mismatches > 0` on a gate check.
- **Nightly job is cluster-exclusive:** `AnalyticsMaintenanceService.runAll` takes `pg_try_advisory_lock` for the run, so a second API task's 00:30 tick is a logged no-op rather than a colliding `REFRESH … CONCURRENTLY`.
- **Stripe webhook:** Raw body middleware **only** for `POST /purchases/webhook` (signature verification).

---

## 2. Data model (entities)

Relationships are TypeORM entities under `backend/src/**/types/*.entity.ts`.

### `users`

- Core identity: `username`, `email`, `password` (hashed), `first_name`, `last_name`, `picture_url`.
- **Role:** `user` \| `pro` \| `admin` (`Role` enum).
- **Email verification:** `is_email_verified`, `email_verification_token`, `email_verification_expires_at`.
- **Sessions / security:** `token_version` (invalidates JWTs when bumped).
- **Pro:** `pro_membership_expires_at` (active Pro when in the future).
- **Purchases:** many-to-many **`user_courses_purchased`** → `courses`. The join table carries **access provenance**: `source` (`purchase` \| `admin_grant` \| `signup_link`, default `purchase` so the Stripe write path needs no changes), `granted_by_user_id`, `signup_link_id`, `granted_at` (migration `1745100007000`). Access checks read only the FK pair; provenance is written by admin grants and signup-link redemption via raw inserts.

### `signup_links`

- Admin-generated promo/gift links (`/register?signup=CODE`), **not** tied to organizations (contrast `invite_codes`).
- `code` (unique), `kind` (`one_time` implemented; `campaign` reserved), `email` (optional lock — also triggers a send via `EmailService.sendSignupLinkEmail`), `course_ids` (int array), `note`, `max_uses`/`use_count`, `discount_percent`/`price_override` (schema-ready for future discounted campaign checkout), creator/redeemer refs, `expires_at`.
- Redeeming grants each course via `user_courses_purchased` with `source='signup_link'` + `signup_link_id`, so per-link redemptions stay queryable. Managed by `SignupLinkService` (users module); consume runs in a transaction with a row lock.

### `courses`

- `title` (unique), `payload` (JSON string of `CourseDetails`: unit tree with **string unit refs**), `price`, `hidden`.
- **`CourseDetails` media:** `images_url` (string array) on the course root and on each `UnitData` node for hero/gallery images (legacy `image_url` was merged into `images_url` by migration `1745100006000` and removed). Video remains `video_url` where applicable.
- M2M: **`purchased_by_users`** (users), **`organizations`** (orgs that may grant access via `organization_courses`).

### `course_units`

- Normalized index of the payload's unit tree, rebuilt transactionally on every course save (`CourseUnitService.rebuild`).
- Per node: `course_id` + `ref` (unique pair), `parent_ref`, `legacy_id` (old numeric id, when derivable), `path`, `depth`, `position`, `title`.
- Referenced by `questions.unit_ref`/`sub_unit_ref` and `exams.scope_refs` (by convention — validated on write, no FK).
- See [`unit-refs-migration.md`](./unit-refs-migration.md).

### `progress`

- Per user + course: **`userId`**, **`courseId`** (unique pair).
- `unit_statuses` (JSONB): map of unit `ref` → `ProgressStatus` (replaced the old full-payload copy).
- `status`, `units_completed`, `units_total`, `exam_scores` (JSONB snapshots keyed by scope_refs/pool), `latest_exam_score` (final exams only), `updated_at`.
- Analytics timestamps (migration `1765000000000`): `created_at` (= course started), `completed_at`, `last_activity_at` (bumped by progress writes and, throttled to once a minute, by learning events), `unit_completed_at` JSONB (unit `ref` → ISO time of first completion).

### `articles`

- `title` (unique), `sub_heading`, `image_url`, `body`, optional **`content_blocks`** (JSONB), `hidden`.

### `sessions`

- Refresh tokens: `selector` (unique), `hashed_verifier`, `expires_at`, FK → `users`.

### `organizations`

- `name` (unique), `max_students`, `school_year`, `semester`.
- Relations: **`members`** (`organization_members`), **`invite_codes`**, **`classes`** (`organization_classes`), **`courses`** (M2M for org-assigned courses).

### `organization_classes`

- A class/period/section inside an org (e.g. "Period 2"). `organizationId` (FK, cascade), `name` (unique per org), `maxStudents` (nullable, display-only soft cap), `createdAt`.
- Seat enforcement stays at the org level (`max_students`); class caps are cosmetic.
- Deleting a class is blocked while it has members (move them first); DB FK is `SET NULL` as a safety net.

### `organization_members`

- `organizationId`, `userId` (unique pair), **`role`:** `manager` \| `member` (`OrgRole`), `classId` (nullable FK → `organization_classes`, `SET NULL`; null = unassigned / org-wide manager).

### `invite_codes`

- `code` (unique), `organizationId`, `role`, optional `email`, `classId` (nullable — invitee joins that class on redemption), `createdByUserId`, `usedByUserId`, `usedAt`, `expiresAt`.

### `audit_logs`

- `userId`, **`action`** (`AuditAction` enum), `metadata` (JSONB), `created_at`.

### `comments` / `comment_votes`

- Comments: `articleId`, `userId`, `parentId` (threading), `body`, `upvote_count`, timestamps.
- Votes: separate entity for per-user upvotes (see `comment-vote.entity.ts`).

### Analytics metrics (OTel)

- Marketing views (`page_view`, `article_view`, `course_view`) still increment **OpenTelemetry counters** via `AnalyticsService` for Grafana; they are *also* stored as `product_events` rows when the caller is authenticated.

### Product analytics & commerce (migrations `1765000001000`–`1765000003000`)

Full column reference and query cookbook: [`analytics-queries.md`](analytics-queries.md) § 1. Design: [`analytics-implementation-plan.md`](analytics-implementation-plan.md).

- **`products`** — catalog by `sku` (`product_type` course · bundle · pro_monthly · pro_yearly · seats · hardware, `grants` JSONB, `stripe_price_id`, `list_price_cents`, `related_course_id`). `COURSE_{id}` rows are created on demand by `OrderService.ensureCourseProduct`.
- **`orders`** / **`order_items`** — one row per payment (user *or* organization; Stripe PI / invoice / event ids for idempotency; `payment_method` card · invoice · po · comp; money columns in cents; `payment_status`) and its lines (`sku`, `product_type`, `course_id`, `quantity`, `unit_price_cents`, `unit_cost_cents`, `discount_cents`, `refunded_amount_cents`, `fulfillment_source`, `placement`, `offer_id`). Written by the Stripe webhook and `POST /orders/manual`.
- **`entitlements`** — the access ledger: `user_id`, `course_id` (NULL = Pro / all courses), `source` (purchase · bundle · pro · admin_grant · signup_link · trial), `product_sku`, `order_item_id`, `allocated_price_cents`, `starts_at`, `ends_at`, `revoked_at`, `revoke_reason`. Partial unique indexes keep one live row per (user, course, source) and one live Pro row per user. **Dual-written** next to `user_courses_purchased` / `users.pro_membership_expires_at` by `EntitlementService`; `hasAccess` still reads the legacy tables until 14 clean reconciliation nights (**PD22**). Org seats are derived, not stored here.
- **`product_events`** — behavioural stream, RANGE-partitioned by month on `occurred_at` (`product_events_YYYY_MM` + default partition; `ensure_product_events_partition(date)`). Columns: `user_id` / `anonymous_id`, `session_id`, `organization_id`, `class_id`, `event_name`, `course_id`, `unit_ref`, `entitlement_source`, `properties` JSONB, `event_id` (dedupe). Allow-listed names live in `product-events/types/product-event.dto.ts`. Always filter by `occurred_at` so partitions prune.
- **`product_events_daily`** — nightly rollup per user × course × day (`minutes_engaged` = heartbeats × 0.5, `lessons_viewed`, `videos_completed`, `units_completed`, `exams_submitted`). Survives partition archival — this is the long-term history.
- **`video_progress`** — per user × course × unit: `position_seconds`, `max_position_seconds`, `watched_ranges` JSONB, `duration_seconds`, `percent_watched` (union of ranges ÷ duration), `completed` (≥ 90 %), `play_count`, first/last played.
- **`exam_attempt_history`** — append-only submissions (`attempt_no`, `score`, `section_breakdown`, `scope`, `exam_pool`); `exam_attempts` still holds the latest.
- **`analytics_reconciliation`** — nightly check results (`check_name`, `mismatches`, `detail`) plus a `views_refreshed` marker. Checks: `ucp_without_entitlement`, `entitlement_without_ucp`, `pro_user_without_entitlement`, `pro_entitlement_without_user`, `access_diff` (user × course pairs where the legacy access rule and `hasLiveAccess` disagree — the PD22 gate proper), `paid_grant_without_order` (webhook granted but no `orders` row), and the informational `legacy_purchase_without_order` (migration backfill awaiting the Stripe backfill; excluded from "clean nights"). `AnalyticsMaintenanceService.GATE_CHECKS` lists the gating ones.
- **Materialized views** — `v_user_entitlements` → `v_user_course_usage` → `v_entitlement_utilization` → `v_user_revenue`, `v_org_utilization`, `v_course_funnel`, `v_cohort_retention`. Refreshed `CONCURRENTLY` by `AnalyticsMaintenanceService` (cron `30 0 * * *`: partitions ahead → rollup → expire Pro entitlements → refresh → reconcile → archive). `POST /reporting/refresh` runs the same pipeline on demand.

---

## 3. Permissions model

### Global roles (`Role`)

| Role | Meaning |
|------|---------|
| **`user`** | Default; course access from purchase, active Pro, or org assignment. |
| **`pro`** | If `pro_membership_expires_at` > now, treated as full course access (see `CourseService.hasAccess`). |
| **`admin`** | Full course/article/user/org management; bypasses purchase checks for course content. |

### Organization roles (`OrgRole`)

| Role | Typical use |
|------|-------------|
| **`manager`** | Org managers: members, invites, progress, course list for org; some actions still **Admin-only** (e.g. assign org courses). |
| **`member`** | Student in org; may receive course access via org-assigned courses. |

### Course access (`hasAccess`)

A user can view full course content if **any** of:

1. JWT role is **Admin**, or DB user role is **Admin**.
2. User has **active Pro** (`role === Pro` and `pro_membership_expires_at` in the future).
3. Course is in **`purchased_courses`**.
4. **`OrganizationService.hasOrgCourseAccess`** — user’s org has the course assigned.

### Guards (Nest)

| Guard | Behavior |
|-------|----------|
| **`JwtAuthGuard`** | Requires `Authorization: Bearer <access_token>`. |
| **`OptionalJwtAuthGuard`** | Attaches `req.user` when a valid token is present; anonymous OK. |
| **`RolesGuard` + `@Roles(Role.Admin)`** | Requires global **Admin** role. |
| **`OrgManagerGuard`** | User must be **Admin** **or** **manager** of the org in the route (`:id`). |

### Service-level rules (examples)

- **Comments:** edit/delete own comment or **Admin**.
- **Audit `GET /audit/users/:userId`:** **Admin** **or** org **manager** whose org contains the target user.
- **Users `PATCH /users/me`:** only the authenticated user (no id in URL).

---

## 4. API routes

Base path has **no** global prefix unless you add one in `main.ts` (default: routes as below). Comment routes use **`CommentController` with `@Controller()`**, so article comment paths are rooted at **`/articles/...`** and **`/comments/...`**.

### Authentication — `/auth`

| Method | Path | Auth | Notes |
|--------|------|------|--------|
| POST | `/auth/login` | Public | Username **or** email (case-insensitive). 401 `No account found with that username or email.` vs `Incorrect password.` Returns tokens + user (+ org summary if any). |
| POST | `/auth/register` | Public | Sends verification email. Optional `invite_code` (org) and `signup_code` (promo link — validated before account creation, consumed after). |
| POST | `/auth/verify-email` | Public | |
| POST | `/auth/refresh` | Public | Body: refresh token. |
| GET | `/auth/profile` | JWT | Current user. |
| POST | `/auth/logout` | Public | Invalidates refresh session. |
| POST | `/auth/forgot-password` | Public | Throttled. |
| POST | `/auth/reset-password` | Public | Throttled. |
| POST | `/auth/admin/users/:id/send-password-reset` | JWT + **Admin** | Email a reset link to a specific user. |
| POST | `/auth/admin/users/:id/resend-verification` | JWT + **Admin** | Resend verification (400 if already verified). |

### Users — `/users`

| Method | Path | Auth | Notes |
|--------|------|------|--------|
| GET | `/users` | JWT + **Admin** | All users (slim). |
| GET | `/users/admin/all` | JWT + **Admin** | Detailed rows for the admin Users tab: role, verification, org, courses **with access source** (purchase/gift/promo). |
| GET | `/users/admin/signup-links` | JWT + **Admin** | List signup links with status + redemption info. |
| POST | `/users/admin/signup-links` | JWT + **Admin** | Create one-time link (`course_ids`, optional `email` lock+send, `note`, `expires_in_days`). |
| DELETE | `/users/admin/signup-links/:id` | JWT + **Admin** | Only unused links (redeemed links are kept as records). |
| GET | `/users/signup-link-info?code=` | Public | Register-page description of a `?signup=` code; `{ valid:false, reason }` instead of errors. |
| POST | `/users` | JWT + **Admin** | Create user. |
| GET | `/users/:username` | JWT | Public profile by username. |
| PATCH | `/users/me` | JWT | Update self only. |
| POST | `/users/:id/courses` | JWT + **Admin** | Gift course access (`source='admin_grant'`); bumps target `token_version`. |
| DELETE | `/users/:id/courses/:courseId` | JWT + **Admin** | Revoke course access (any source). |
| DELETE | `/users/:id` | JWT + **Admin** | Hardened: refuses self-delete + admin targets; cleans `exam_attempts`, `product_events`, `product_events_daily`, `exam_attempt_history` (all FK-less) in one transaction before delete — privacy notice § 7. |

### Courses — `/courses`

| Method | Path | Auth | Notes |
|--------|------|------|--------|
| GET | `/courses` | Optional JWT | Public list; `has_access` if logged in. |
| GET | `/courses/:id/public` | — | Marketing payload (titles/outline/hero; no lesson content). |
| GET | `/courses/:id` | JWT | Full course + progress; freemium redaction when unpurchased (`free_preview` units stay open). |
| POST | `/courses` | JWT + **Admin** | Create; normalizes unit ids to refs + rebuilds `course_units`. |
| PUT | `/courses/:id` | JWT + **Admin** | Update; same normalization/rebuild. |
| DELETE | `/courses/:id` | JWT + **Admin** | |
| GET | `/courses/:courseId/units/:unitId/media` | JWT | Signed video URL; requires purchase **or** a `free_preview` unit branch. `:unitId` is the unit **ref**. |

### Progress — `/progress` (alternate surface)

| Method | Path | Auth | Notes |
|--------|------|------|--------|
| GET | `/progress/courses` | JWT | All courses with progress. |
| POST | `/progress/courses/:courseId/reset` | JWT | Reset course progress. |
| PATCH | `/progress/courses/:courseId` | JWT | Course-level status. |
| PATCH | `/progress/courses/:courseId/units/:unitId` | JWT | Unit progress; `:unitId` is the unit **ref** (validated against `course_units`). |

### Articles — `/articles`

| Method | Path | Auth | Notes |
|--------|------|------|--------|
| GET | `/articles` | Public | Published list. |
| GET | `/articles/admin/all` | JWT + **Admin** | Includes hidden. |
| GET | `/articles/:id` | Public | By id. |
| POST | `/articles` | JWT + **Admin** | |
| PATCH | `/articles/:id` | JWT + **Admin** | |
| DELETE | `/articles/:id` | JWT + **Admin** | |

### Comments (root controller)

| Method | Path | Auth | Notes |
|--------|------|------|--------|
| GET | `/articles/:articleId/comments` | Optional JWT | Threaded comments. |
| POST | `/articles/:articleId/comments` | JWT | |
| PATCH | `/comments/:commentId` | JWT | Own or Admin. |
| DELETE | `/comments/:commentId` | JWT | Own or Admin. |
| POST | `/comments/:commentId/upvote` | JWT | |

### Organizations — `/organizations`

| Method | Path | Auth | Notes |
|--------|------|------|--------|
| GET | `/organizations/my` | JWT | Current user’s org membership. |
| GET | `/organizations/invite-info?code=` | Public | Invite metadata for registration. |
| POST | `/organizations` | JWT + **Admin** | Create org. |
| GET | `/organizations` | JWT + **Admin** | List all. |
| PATCH | `/organizations/:id` | JWT + **Admin** | |
| DELETE | `/organizations/:id` | JWT + **Admin** | |
| GET | `/organizations/:id` | JWT + **Org manager** | Details. |
| GET | `/organizations/:id/members` | JWT + **Org manager** | Includes `class_id`/`class_name`. |
| POST | `/organizations/:id/members` | JWT + **Org manager** | Add by email; optional `class_id`. |
| DELETE | `/organizations/:id/members/:userId` | JWT + **Org manager** | |
| DELETE | `/organizations/:id/members/:userId/picture` | JWT + **Org manager** | |
| PATCH | `/organizations/:id/members/:userId/role` | JWT + **Org manager** | |
| PATCH | `/organizations/:id/members/:userId/class` | JWT + **Org manager** | Assign/clear member's class (`class_id: number \| null`). |
| GET | `/organizations/:id/classes` | JWT + **Org manager** | List classes with member counts. |
| POST | `/organizations/:id/classes` | JWT + **Org manager** | Create class (`name`, optional `max_students` soft cap). |
| PATCH | `/organizations/:id/classes/:classId` | JWT + **Org manager** | Rename / soft cap. |
| DELETE | `/organizations/:id/classes/:classId` | JWT + **Org manager** | Blocked while class has members. |
| POST | `/organizations/:id/invite-codes` | JWT + **Org manager** | Optional `class_id`. |
| GET | `/organizations/:id/invite-codes` | JWT + **Org manager** | |
| POST | `/organizations/:id/invite-codes/bulk` | JWT + **Org manager** | Optional `class_id`. |
| GET | `/organizations/:id/courses` | JWT + **Org manager** | |
| POST | `/organizations/:id/courses` | JWT + **Admin** | Assign courses to org. |
| DELETE | `/organizations/:id/courses/:courseId` | JWT + **Admin** | |
| GET | `/organizations/:id/progress` | JWT + **Org manager** | Summary per member × course incl. `started_at`, `completed_at`, `last_activity_at`, `minutes_7d`, `videos_completed/total`, `exams_taken`, `best_exam_score`, `quizzes_passed/attempted`, `effort` (`passing` · `trying` · `struggling` · `stopped` · `browsing` · `not_trying`); optional `?classId=`. |
| GET | `/organizations/:id/progress/export.csv` | JWT + **Org manager** | Same rows as CSV (`text/csv`, attachment). Emits `org_progress_exported`. Declared before the `:courseId` route. |
| GET | `/organizations/:id/progress/:courseId` | JWT + **Org manager** | Detailed: course skeleton with each member's unit statuses, `unit_completed_at`, `videos` (per-unit %, completed, position), `quizzes` (per-unit best/latest/attempts/passed), `last_activity_at`; optional `?classId=`. |
| GET | `/organizations/:id/engagement?days=&classId=` | JWT + **Org manager** | `{ days, members[], series[] }` — per member minutes, lessons, videos, units, exams, active days, last activity (rollup + live today). |
| GET | `/organizations/:id/utilization` | JWT + **Org manager** | Live seat utilization (`OrgUtilizationResponse`: seats, invites, activated, engaged 7/30 d, hours, `stalled_member_ids`). |
| GET | `/organizations/:id/members/:userId/exams` | JWT + **Org manager** | Quiz gradebook: per-lesson summaries (first/best/latest, tries) + attempt log with section breakdown; `effort` plus 30d start vs submit counts. |
| GET | `/organizations/:id/members/:userId/timeline?limit=` | JWT + **Org manager** | Member's learning events, last 30 d, heartbeats excluded. |

### Media — `/media`

| Method | Path | Auth | Notes |
|--------|------|------|--------|
| POST | `/media/profile-picture` | JWT | Presigned upload for own profile. |
| POST | `/media/presigned-url` | JWT + **Admin** | Arbitrary folder upload. |
| POST | `/media/multipart/*` | JWT + **Admin** | Large uploads. |
| GET | `/media` | JWT + **Admin** | List (query `folder`, `subfolder`). |
| DELETE | `/media` | JWT + **Admin** | Body: key. |
| GET | `/media/orphans` | JWT + **Admin** | Dry-run orphan scan. |
| DELETE | `/media/orphans` | JWT + **Admin** | Delete orphans. |

### Purchases — `/purchases`

| Method | Path | Auth | Notes |
|--------|------|------|--------|
| POST | `/purchases/course` | JWT + **Admin** | Manual grant (no payment). |
| POST | `/purchases/create-payment-intent` | JWT | Stripe PaymentIntent — **one course**, lifetime. Logged-in only; **email verification not required**. Rejects if already owned or active Pro. |
| POST | `/purchases/create-pro-checkout` | JWT | Stripe Checkout **subscription** for Pro (all courses while active). Needs `STRIPE_PRO_PRICE_ID_MONTHLY` (or yearly). Email verification **not** required. |
| POST | `/purchases/billing-portal` | JWT | Stripe Customer Portal (manage/cancel Pro). Requires `stripe_customer_id`. |
| POST | `/purchases/confirm-payment` | JWT | Idempotent reconcile after PaymentIntent success when webhook lag. |
| POST | `/purchases/webhook` | Public | Stripe signature; `payment_intent.succeeded` (order + entitlement + `purchase_completed`), `invoice.paid` / `invoice.payment_failed` (Pro orders + lifecycle events), `charge.refunded` (refund → revoke), subscription lifecycle. **Not** in Swagger. |
| POST | `/purchases/pro-membership` | JWT + **Admin** | Pro comp / testing (no Stripe subscription). |
| POST | `/purchases/admin/backfill-order` | JWT + **Admin** | Repairs course entitlements with no `orders` row from Stripe: body `{ paymentIntentId }`, `{ userId, courseId }` (PI found by metadata search), or `{}` for every flagged entitlement. Records the order idempotently (`backfill_<pi>`), links `order_item_id`, sets the real amount. Returns `{ repaired[], unmatched[] }`. |

Flow map + permission pitfalls: [`purchase-flows.md`](purchase-flows.md).

### Orders & entitlements — `/orders`, `/users/me/entitlements` (`backend/src/commerce/`)

| Method | Path | Auth | Notes |
|--------|------|------|--------|
| GET | `/orders?userId=&organizationId=&limit=&offset=` | JWT + **Admin** | Orders with items. |
| GET | `/orders/products` | JWT + **Admin** | Catalog (`products`). |
| GET | `/orders/:id` | JWT + **Admin** | One order with items. |
| POST | `/orders/manual` | JWT + **Admin** | Record a PO / invoice / comp order (`CreateManualOrderDto`: `userId` or `organizationId`, `paymentMethod`, `items[{sku, quantity, unitPriceCents?, unitCostCents?, discountCents?}]`, `notes`). Grants entitlements (courses, bundle allocation, Pro), audits `ORDER_RECORDED`, emits `order_recorded`. |
| GET | `/users/me/entitlements` | JWT | Caller's entitlement rows (live and revoked). |

### Reporting — `/reporting` (`backend/src/reporting/`, all JWT + **Admin**)

Every route reads the materialized views (+ a few live tables); SQL equivalents are in [`analytics-queries.md`](analytics-queries.md).

| Method | Path | Notes |
|--------|------|-------|
| GET | `/reporting/overview` | Five headline numbers + activity pulse + `by_source[]`. |
| GET | `/reporting/activation?days=` | Weekly activation by source. |
| GET | `/reporting/utilization` | `{ buckets[], by_course[] }`. |
| GET | `/reporting/revenue?months=` | `{ monthly[], totals, by_sku[], payment_methods[] }`. |
| GET | `/reporting/pro?months=` | Active / MRR / failed / cancel-scheduled, `monthly[]`, `cohorts[]`. |
| GET | `/reporting/organizations` · `/reporting/organizations/:id` | `v_org_utilization` rows; detail adds 8-week series, per-course table, orders. |
| GET | `/reporting/courses/:id/funnel` | `{ summary, units[], exams[] }` from `v_course_funnel`. Each unit includes live `quiz_passed` (distinct users scoring ≥70 on a quiz scoped to that ref). Each exam includes `title` (joined from `scope_refs` → `course_units`), `last_submitted_at`, `first_try_avg`. |
| GET | `/reporting/courses/:id/exams/:examId/attempts` | Attempt history for one exam: user, score, attempt_no, submitted_at, passed, section_breakdown. |
| GET | `/reporting/cohorts` | `v_cohort_retention`. |
| GET | `/reporting/users/:id` | User 360: entitlements, usage, revenue, orders, events, logins. |
| GET | `/reporting/signals` | Six offer queues (stalled paid, completed-not-upsold, Pro at risk, low-utilization orgs, engaged free, hot streak). |
| GET | `/reporting/health` | Freshness, event volume, partition count, reconciliation, clean nights. |
| POST | `/reporting/refresh` | Runs `AnalyticsMaintenanceService.runAll()` now; returns the step report. |
| GET | `/reporting/export/:report.csv?courseId=` | CSV of `utilization` · `organizations` · `cohorts` · `revenue` · `usage` · `orders` · `funnel`. |


### Audit — `/audit`

| Method | Path | Auth | Notes |
|--------|------|------|--------|
| GET | `/audit/my` | JWT | Own activity + login streak. |
| GET | `/audit/users/:userId` | JWT | **Admin** or org **manager** (same org). |
| GET | `/audit/analytics/overview` | JWT + **Admin** | Dashboard stats. |
| GET | `/audit/analytics/daily?days=` | JWT + **Admin** | |

### Email — `/email`

| Method | Path | Auth | Notes |
|--------|------|------|--------|
| POST | `/email/contact` | Public | Contact form. |
| POST | `/email/broadcast` | JWT + **Admin** | Mass email. |

### Analytics — `/analytics`

| Method | Path | Auth | Notes |
|--------|------|------|--------|
| POST | `/analytics/event` | Public (`OptionalJwtAuthGuard`), 120/min per user | Single `AnalyticsEventDto` or `{ events: [...], anonymousId? }` (≤ 50). Marketing events → OTLP counters; every allow-listed event → `product_events` via `ProductEventsService.recordBatch`. Anonymous visitors: rows are stored only when an anonymous id is present (body `anonymousId` or `x-anonymous-id` header) **and** the event is an intent event (`article_view`, `course_view`, `pricing_viewed`, `signup_started`, `checkout_started`, offer events) — anonymous `page_view` stays OTel-only. Course-scoped events are dropped when the user cannot access the course; `video_*` / heartbeat payloads upsert `video_progress` and bump `progress.last_activity_at`. The authenticated `identified` event (`properties.anonymous_id`) is the only row carrying both `user_id` and `anonymous_id` — the identity stitch — and is dropped for org members. Ingest failures are swallowed (204 regardless) and counted. |

### Logging — `/logs`

| Method | Path | Auth | Notes |
|--------|------|------|--------|
| POST | `/logs` | Public | Frontend client logs (`FrontendLogDto`: `level` must be `info`\|`warn`\|`error`). Excluded from Swagger; throttled 10/min. |

### Health — `/health`

| Method | Path | Auth | Notes |
|--------|------|------|--------|
| GET | `/health` | Public | `{ status: 'ok' }` |

---

## 5. Related files

| Concern | Location |
|---------|----------|
| TypeORM entities & DB config | `src/config/app.config.ts`, `**/types/*.entity.ts` |
| JWT validation | `src/auth/jwt.strategy.ts` |
| Course access | `src/courses/course.service.ts` — `hasAccess` |
| Org authorization | `src/organizations/org-manager.guard.ts` |
| OpenAPI / Swagger | `src/main.ts` — `/api` |

This document reflects the codebase structure; if routes or guards change, update this file alongside the controller changes.
