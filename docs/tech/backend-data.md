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
| Stripe | `STRIPE_SECRET_KEY`; `STRIPE_WEBHOOK_SECRET` only when Terraform `stripe_webhook_enabled = true` (unset in prod today → webhook handler returns 400; course purchases still complete via the `confirm-checkout` / `confirm-payment` fallback, which retrieves the payment server-side, records the order and grants the entitlement). The webhook route gets a **raw** body (`main.ts`) for signature verification |
| Email | SMTP / provider settings used by `EmailModule` (Google Workspace relay — transactional only: verification, reset, contact) |
| Marketing email (SES) | `SES_FROM_ADDRESS` (`Drone Edge <hello@news.thedroneedge.com>`), `SES_REPLY_TO` (`support@`), `SES_CONFIGURATION_SET`, `SES_EVENTS_TOPIC_ARN`, `MARKETING_POSTAL_ADDRESS` (CAN-SPAM footer — **`MarketingMailerService` refuses to send while empty**), `LEADS_UNSUBSCRIBE_SECRET` (HMAC for unsubscribe links; Terraform-generated; rotating it breaks every link already sent), optional `SES_MAX_SEND_RATE` (default 10/s). Credentials = task role (`ses:SendEmail` on the `news.` identity + config set). Terraform: `terraform/ses.tf` |
| Docs / hardening | Swagger `/api` is **off when `NODE_ENV=production`** (set `ENABLE_SWAGGER=true` to turn it on temporarily). Log lines mask email addresses (`common/pii.ts` `maskEmail`); TypeORM CLI logs errors only in production |
| Media / CloudFront | `CLOUDFRONT_MEDIA_DOMAIN`, signing keys for video URLs |
| OpenTelemetry | `OTEL_EXPORTER_OTLP_*`, `OTEL_SERVICE_NAME` — optional; loaded via `telemetry.ts` before Nest bootstrap |
| Analytics archive | `ANALYTICS_ARCHIVE_BUCKET` (S3 bucket for `product_events` partitions older than `ANALYTICS_RETENTION_MONTHS`, default 12). Unset → archival step is a no-op. Bucket `droneedge-dev-analytics-archive` + task-role `s3:PutObject` + env live since 2026-09-12 (PA35). |
| Access ledger | `ENTITLEMENTS_AUTHORITATIVE=true` (live in prod since 2026-09-12) makes `CourseService.hasAccess` read `entitlements` (`EntitlementService.hasLiveAccess`) instead of `user_courses_purchased` + `users.role/pro_membership_expires_at`; org seats stay relational (`hasOrgCourseAccess`). Set `false` to roll back. While authoritative, `grantCourse`/`syncPro` **rethrow** on failure (a missing row would mean no access) — revokes never throw (an expired Pro row is already dead; a missed course revoke surfaces in `access_diff`). Every ledger write failure increments `entitlements.write_failures{op}`. `purchaseCourse` and `grantCourseAccess` treat "legacy row present, ledger row missing" as a repair, not a duplicate. Note the legacy `pro_membership_expires_at` is `timestamp without time zone` (TZ-dependent in Node); ledger `starts_at`/`ends_at` are `timestamptz` and compared in SQL. `GET /reporting/health` reports the flag. |

### Cross-cutting behavior

- **Throttling:** `@nestjs/throttler` via `UserThrottlerGuard` — tracker is the JWT `sub` when the request carries a **signed** access token (cookie or Bearer, accepted up to 7 days past expiry so the hour-mark refresh doesn't drop a class onto the school IP; it only picks the bucket, never authenticates), else the client IP from `clientIp()` (`common/client-ip.ts`). Buckets are per route. Global 30/min. Anonymous auth routes are sized for ~60 students on one NAT: login 120/min, register 120 per 10 min, `invite-info` / refresh 120/min, verify-email 60/min, forgot-password 30/min, reset-password / reset-with-code 20/min. `POST /analytics/event` 120/min; `POST /logs` 10/min. Abuse limits that aren't per IP live in `AttemptLimiter` (`common/attempt-limiter.service.ts`, in-memory per task): **8 wrong passwords per account per 10 min** (then 429 even with the right password; any password reset clears it), **reset emails 1/60 s and 5/hour per address** (counted whether or not the account exists; 429 body carries `retry_after_seconds`), **500 registrations per IP per day** (each sends a verification email through the ~10k/day Google relay). Every throttler 429 logs `route bucket=ip:a.b.c.x|user:N`. Edge WAF is a separate 20 000 req/IP / 5 min cap on CloudFront. **Client IP:** `TRUSTED_PROXY_HOPS` unset = first `X-Forwarded-For` entry (client-writable — legacy); set to N = the entry N places from the right (expected 3: CloudFront, public ALB, internal ALB). `LOG_FORWARDED_CHAIN=true` logs each request's chain to confirm N. Rollout: [`workflows/tech/shared-ip-hardening-rollout.md`](../../workflows/tech/shared-ip-hardening-rollout.md).
- **Request ID:** `RequestIdMiddleware` (correlation in logs).
- **HTTP logging:** `LoggingInterceptor` logs `METHOD url duration` (health checks excluded).
- **Errors:** `HttpExceptionFilter` — 5xx and unhandled exceptions log **stack traces**; some DB constraint errors mapped to friendly messages.
- **Analytics never blocks business flows.** `ProductEventsService.record` (server events) and every `EntitlementService` write catch + log and return; `PurchaseService.recordCourseOrder` swallows an order-insert failure so the Stripe webhook still grants access (and Stripe is not asked to retry). The safety net is the nightly reconciliation (`paid_grant_without_order` flags such grants; `POST /purchases/admin/backfill-order` repairs them from Stripe) plus bounded-label OTel metrics: `product_events.accepted{source}`, `product_events.dropped{reason}`, `product_events.failures{stage}`, `orders.record_failures`, `analytics.maintenance.step_ms{step,status}`, `analytics.maintenance.failures{step}`, `analytics.maintenance.lock_skipped`, and the gauge `analytics.reconcile.mismatches{check}`. Alert on any `failures`, any `orders.record_failures`, `accepted` flat-lining in school hours, and `reconcile.mismatches > 0` on a gate check.
- **Nightly job is cluster-exclusive:** `AnalyticsMaintenanceService.runAll` takes `pg_try_advisory_lock` for the run, so a second API task's 00:30 tick is a logged no-op rather than a colliding `REFRESH … CONCURRENTLY`.
- **Stripe webhook:** Raw body middleware **only** for `POST /purchases/webhook` (signature verification).
- **SES events:** `POST /email/ses-events` gets a **text** body parser (`main.ts`) — SNS posts JSON as `text/plain`, and CloudFront drops the `x-amz-sns-message-type` header, so the handler reads `Type` from the body.

---

## 2. Data model (entities)

Relationships are TypeORM entities under `backend/src/**/types/*.entity.ts`.

### `users`

- Core identity: `username`, `email`, `password` (hashed), `first_name`, `last_name`, `picture_url`.
- **Role:** `user` \| `pro` \| `admin` (`Role` enum).
- **Email verification:** `is_email_verified`, `email_verification_token`, `email_verification_expires_at`.
- **Sessions / security:** `token_version` (invalidates JWTs when bumped; also makes reset links single-use).
- **Teacher reset code:** `reset_code_hash`, `reset_code_expires_at`, `reset_code_attempts` (migration `1765000016000`; all `select: false`, read only via `UsersService.getResetCode`).
- **Pro:** `pro_membership_expires_at` (active Pro when in the future).
- **Display:** `theme_preference` (`light` \| `dark` \| `system`, nullable = never chosen; migration `1765000015000`). Returned on `UserFull` (`GET /auth/profile`).
- **Purchases:** many-to-many **`user_courses_purchased`** → `courses`. The join table carries **access provenance**: `source` (`purchase` \| `admin_grant` \| `signup_link`, default `purchase` so the Stripe write path needs no changes), `granted_by_user_id`, `signup_link_id`, `granted_at` (migration `1745100007000`). Access checks read only the FK pair; provenance is written by admin grants and signup-link redemption via raw inserts.

### `signup_links`

- Admin-generated promo/gift links (`/register?signup=CODE`), **not** tied to organizations (contrast `invite_codes`).
- `code` (unique), `kind` (`one_time`, or `campaign` when `max_uses` > 1 — multi-use giveaway, no email lock), `email` (optional lock — also triggers a send via `EmailService.sendSignupLinkEmail`), `course_ids` (int array), `note`, `max_uses`/`use_count`, `discount_percent`/`price_override` (schema-ready for future discounted campaign checkout), creator/redeemer refs, `expires_at`.
- Redeeming grants each course via `user_courses_purchased` with `source='signup_link'` + `signup_link_id`, so per-link redemptions stay queryable. Managed by `SignupLinkService` (users module); consume runs in a transaction with a row lock.

### `courses`

- `title` (unique), `payload` (JSON string of `CourseDetails`: unit tree with **string unit refs**), `price`, `hidden`.
- **`CourseDetails` media:** `images_url` (string array) on the course root and on each `UnitData` node for hero/gallery images (legacy `image_url` was merged into `images_url` by migration `1745100006000` and removed). Video remains `video_url` where applicable.
- M2M: **`purchased_by_users`** (users), **`organizations`** (orgs that may grant access via `organization_courses`).

### `course_units`

- Normalized index of the payload's unit tree, rebuilt transactionally on every course save (`CourseUnitService.rebuild`).
- Per node: `course_id` + `ref` (unique pair), `parent_ref`, `legacy_id` (old numeric id, when derivable), `path`, `depth`, `position`, `title`, `has_video`, `video_outro_seconds` (payload field of the same name — trailing credits excluded from the video completion rule; migration `1765000008000`).
- Referenced by `questions.unit_ref`/`sub_unit_ref` and `exams.scope_refs` (by convention — validated on write, no FK).
- See [`unit-refs-migration.md`](./unit-refs-migration.md).

### `progress`

- Per user + course: **`userId`**, **`courseId`** (unique pair).
- `unit_statuses` (JSONB): map of unit `ref` → `ProgressStatus` (replaced the old full-payload copy).
- `status`, `units_completed`, `units_total`, `exam_scores` (JSONB snapshots keyed by scope_refs/pool), `latest_exam_score` (final exams only), `updated_at`.
- Analytics timestamps (migration `1765000000000`): `created_at` (= course started), `completed_at`, `last_activity_at` (bumped by progress writes and, throttled to once a minute, by learning events), `unit_completed_at` JSONB (unit `ref` → ISO time of first completion).

### `articles`

- `title` (unique), **`slug`** (unique, not null — URL segment; migration `1765000013000` backfilled existing rows from the title), **`tags`** (`text[]`, default `{}`, display labels), `sub_heading`, `image_url`, `body`, optional **`content_blocks`** (JSONB), `hidden`.
- Responses also carry computed **`read_minutes`** (~230 wpm over body + text blocks, min 1). Slug rules: create without `slug` → generated from the title with `-2`, `-3`… on collision; explicit slug must match `^[a-z0-9]+(-[a-z0-9]+)*$` and be free (409 if taken); update without `slug` keeps the current one (title edits never change a URL). Tags are trimmed and de-duplicated case-insensitively, max 8 × 40 chars.

### `sessions`

- Refresh tokens: `selector` (unique), `hashed_verifier`, `expires_at`, FK → `users`.

### `organizations`

- `name` (unique), `max_students`, `school_year`, `semester`, `timezone` (IANA, default `America/New_York`, migration `1765000009000`; validated with `@IsTimeZone` on create/update) — the day boundary of every teacher view and of the org members' `product_events_daily` rows (PTD4).
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

- `userId`, **`action`** (`AuditAction` enum), `metadata` (JSONB), `created_at`. Rows cascade-delete with their user. `userId` is nullable only for **`USER_SELF_DELETED`** (the actor no longer exists; metadata keeps `targetUserId`, `username`, `email`) — migration `1765000007000-AuditLogNullableActor`.

### `comments` / `comment_votes`

- Comments: `articleId`, `userId`, `parentId` (threading), `body`, `upvote_count`, timestamps.
- Votes: separate entity for per-user upvotes (see `comment-vote.entity.ts`).

### Analytics metrics (OTel)

- Marketing views (`page_view`, `article_view`, `course_view`) still increment **OpenTelemetry counters** via `AnalyticsService` for Grafana; they are *also* stored as `product_events` rows when the caller is authenticated.

### `leads` (migration `1765000006000`, `backend/src/leads/`)

Waitlist / email capture (launch plan W3). One row per **(email, interest)** — `interest` ∈ `building` · `part107` · `schools` · `newsletter`; email stored lowercased. Columns: first-touch attribution (`source_path`, `landing_path`, `utm_source/medium/campaign/term/content`, `gclid`, `fbclid`, `ref` — from the `de_attr` cookie), `consent_at`, `confirmation_sent_at` (SES accepted the confirmation), `unsubscribed_at` (unsubscribe link or SES complaint), `bounced_at` (SES permanent bounce), `created_at`, `updated_at`. A repeat signup for an active row changes nothing and sends nothing; a signup for an unsubscribed row re-consents it (attribution keeps first touch). `POST /leads` records `lead_captured` server-side.

### Product analytics & commerce (migrations `1765000001000`–`1765000003000`)

Full column reference and query cookbook: [`analytics-queries.md`](analytics-queries.md) § 1. Design: [`analytics-implementation-plan.md`](analytics-implementation-plan.md).

- **`products`** — catalog by `sku` (`product_type` course · bundle · pro_monthly · pro_yearly · seats · hardware, `grants` JSONB, `stripe_price_id`, `list_price_cents`, `related_course_id`). `COURSE_{id}` rows are created on demand by `OrderService.ensureCourseProduct`. `stripe_lookup_key` links a row to a Stripe Price; `PricingService` writes `stripe_price_id`, `stripe_product_id`, `list_price_cents`, `price_synced_at` (and `courses.price` for a course) from Stripe — [`pricing-and-promotions.md`](pricing-and-promotions.md) § 3.
- **`checkout_completions`** — one row per completed Checkout Session (course + Pro) from `checkout.session.completed`: `promotion_code(_id)`, `coupon_id`, `promo_source` (`code` · `sale` · `checkout`), subtotal / discount / tax / total cents, PI / subscription / invoice ids. `user_id` SET NULL on account deletion. Feeds the admin promo report.
- **`orders`** / **`order_items`** — one row per payment (user *or* organization; Stripe PI / invoice / event ids for idempotency; `payment_method` card · invoice · po · comp; money columns in cents; `payment_status`) and its lines (`sku`, `product_type`, `course_id`, `quantity`, `unit_price_cents`, `unit_cost_cents`, `discount_cents`, `refunded_amount_cents`, `fulfillment_source`, `placement`, `offer_id`). Written by the Stripe webhook and `POST /orders/manual`.
- **`entitlements`** — the access ledger: `user_id`, `course_id` (NULL = Pro / all courses), `source` (purchase · bundle · pro · admin_grant · signup_link · trial), `product_sku`, `order_item_id`, `allocated_price_cents`, `starts_at`, `ends_at`, `revoked_at`, `revoke_reason`. Partial unique indexes keep one live row per (user, course, source) and one live Pro row per user. **Dual-written** next to `user_courses_purchased` / `users.pro_membership_expires_at` by `EntitlementService`; `hasAccess` still reads the legacy tables until 14 clean reconciliation nights (**PD22**). Org seats are derived, not stored here.
- **`product_events`** — behavioural stream, RANGE-partitioned by month on `occurred_at` (`product_events_YYYY_MM` + default partition; `ensure_product_events_partition(date)`). Columns: `user_id` / `anonymous_id`, `session_id`, `organization_id`, `class_id`, `event_name`, `course_id`, `unit_ref`, `entitlement_source`, `properties` JSONB, `event_id` (dedupe). Allow-listed names live in `product-events/types/product-event.dto.ts`. Always filter by `occurred_at` so partitions prune.
- **`product_events_daily`** — nightly rollup per user × course × day (`minutes_engaged` = heartbeats × 0.5, `lessons_viewed`, `videos_completed`, `units_completed`, `exams_submitted`). Survives partition archival — this is the long-term history.
- **`video_progress`** — per user × course × unit: `position_seconds`, `max_position_seconds`, `watched_ranges` JSONB, `duration_seconds`, `percent_watched` (union of ranges ÷ duration), `completed` (≥ 90 %), `play_count`, first/last played.
- **Submit concurrency:** `POST /exams/:id/submit` holds a per user × exam advisory lock (`pg_advisory_xact_lock`) around the `exam_attempts` delete + insert and the history insert, so simultaneous submits keep one latest attempt and distinct `attempt_no`s; `progress.exam_scores` is written under a row lock.
- **`exam_attempt_history`** — append-only submissions (`attempt_no`, `score`, `section_breakdown`, `scope`, `exam_pool`); `exam_attempts` still holds the latest.
- **`analytics_reconciliation`** — nightly check results (`check_name`, `mismatches`, `detail`) plus a `views_refreshed` marker. Checks: `ucp_without_entitlement`, `entitlement_without_ucp`, `pro_user_without_entitlement`, `pro_entitlement_without_user`, `access_diff` (user × course pairs where the legacy access rule and `hasLiveAccess` disagree — the PD22 gate proper), `paid_grant_without_order` (webhook granted but no `orders` row), and the informational `legacy_purchase_without_order` (migration backfill awaiting the Stripe backfill; excluded from "clean nights"). `AnalyticsMaintenanceService.GATE_CHECKS` lists the gating ones. The nightly `tracking_checks` step adds `tracking_minutes_over_cap`, `tracking_units_completed_drift`, `tracking_rollup_drift` and `tracking_silent_learners` (progress-tracking invariants, not gating — see `progress-tracking-accuracy.md` Phase 4).
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
| POST | `/auth/register` | Public | Password ≥ 8 characters. Sends verification email. Optional `invite_code` (org) and `signup_code` (promo link — validated before account creation, consumed after). |
| POST | `/auth/verify-email` | Public | |
| POST | `/auth/refresh` | Public | `refresh_token` cookie (or body token). Re-reads the user, so the new access JWT carries the current `role` / `token_version` (purchases bump it). Rotates the verifier with a conditional update: if a parallel refresh with the same cookie already rotated it, this one still returns an access token but **no** new refresh token / cookie, so the browser keeps the winner's — otherwise the user gets silently logged out. |
| GET | `/auth/profile` | JWT | Current user. |
| POST | `/auth/logout` | Public | Invalidates refresh session. |
| POST | `/auth/delete-account` | JWT | Self-service deletion (App Store 5.1.1(v), AS1). Body `{ password }`; wrong password → **400** (not 401, so the client doesn't treat it as an expired session). **403** for admins and for org **members** (students — the school manages the account); org managers may delete. Runs the shared purge (see `DELETE /users/:id`), audits `USER_SELF_DELETED` with a null actor, clears auth cookies. Throttled 5/min. |
| POST | `/auth/forgot-password` | Public | Body `{ email }` (case-insensitive lookup). Always the same neutral message. **429** per address: one link per 60 s, five per hour. Link valid **60 min** and **single-use** — the reset JWT carries `ver` = `token_version`, which the reset bumps (earlier unused links keep working until one is used; links issued before Oct 6 2026 without `ver` are refused). Until Oct 6 2026 this 400'd on every request (stray required `username` in the DTO). |
| POST | `/auth/reset-password` | Public | `{ token, password ≥ 8 }`. 401 `Invalid or expired password reset token.` on a bad, expired or already-used link. Clears the account's failed-login lockout. |
| POST | `/auth/reset-with-code` | Public | Teacher reset code: `{ username (or email), code, password ≥ 8 }`. Code case / spaces / dashes ignored. One 401 message for every failure (`That reset code is not valid or has expired…`). Wrong codes count in `users.reset_code_attempts`; the 5th kills the code. Success sets the password (bumps `token_version`), clears the code and the login lockout, audits `PASSWORD_RESET_BY_CODE`, returns `{ message, username }`. |
| POST | `/auth/organizations/:id/members/:userId/reset-code` | JWT + **Org manager** (`OrgManagerGuard`) | Returns `{ code: 'ABCD-EFGH', expires_at, username }` once; only `sha256(userId:code)` is stored. 1 h expiry, replaces any earlier code. Org **members** (students) only — 403 for managers and site admins, 404 for non-members. Audits `RESET_CODE_CREATED` on the student with `{ orgId, byUserId }`. 60/hour per manager. Lives in `AuthController` because `AuditModule` imports `OrganizationModule`. |
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
| PATCH | `/users/me` | JWT | Update self only. Bumps `token_version` (signs out other sessions). |
| PATCH | `/users/me/preferences` | JWT | `{ theme_preference: 'light'\|'dark'\|'system' }` (`UpdatePreferencesDto`). Does **not** bump `token_version` — use this, not `PATCH /users/me`, for display settings. |
| POST | `/users/:id/courses` | JWT + **Admin** | Gift course access (`source='admin_grant'`); bumps target `token_version`. |
| DELETE | `/users/:id/courses/:courseId` | JWT + **Admin** | Revoke course access (any source). |
| DELETE | `/users/:id` | JWT + **Admin** | Refuses self-delete + admin targets. Same purge as `/auth/delete-account` (`UsersService.purgeAccount`, AS3): one transaction clears the FK-less `exam_attempts`, `product_events`, `product_events_daily`, `exam_attempt_history`, nulls `exams.created_by_user_id`, deletes every `leads` row for the email (NL-A1), then the user (FK cascades: progress, entitlements, video_progress, memberships, comments, sessions, own audit rows; `orders.user_id` → NULL). Then `stripe.customers.del` (cancels any subscription); a Stripe failure doesn't undo the deletion — it logs and emails `ADMIN_EMAIL` via `EmailService.sendAdminAlert`. Audits `USER_DELETED` with the admin as actor — privacy notice § 7. |

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
| POST | `/progress/courses/:courseId/reset` | JWT | Reset course progress: deletes the `progress` row **and that course's `video_progress`** (PTD6); events and exam history stay. |
| PATCH | `/progress/courses/:courseId` | JWT | Course-level status. |
| PATCH | `/progress/courses/:courseId/units/:unitId` | JWT | Unit progress; `:unitId` is the unit **ref** (validated against `course_units`). Body `{ status, auto? }` — `auto: true` (opening a lesson) only applies when the unit has no status yet, so it never downgrades `COMPLETED`; the response carries the actual status. Response `{ id, title, status, auto_completed: string[], course_status? }`: completing the last child also completes every finished ancestor (`auto_completed`), and completing every top-level unit sets the course `COMPLETED` (`course_status`, one `course_completed` event) — PTD3; un-completing never cascades. Writes run under a row lock (`SELECT … FOR UPDATE`); progress rows are created with `ON CONFLICT DO NOTHING` (one `course_started` per user × course). |

### Articles — `/articles`

| Method | Path | Auth | Notes |
|--------|------|------|--------|
| GET | `/articles` | Public | Published list. |
| GET | `/articles/admin/all` | JWT + **Admin** | Includes hidden. |
| GET | `/articles/:idOrSlug` | Optional JWT | Digits → by id (old links); otherwise by slug. **Hidden articles 404 unless the caller is an admin** (the admin editor loads through this route with its cookie); hidden and missing return the identical 404 so slugs can't be probed. |
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
| GET | `/organizations/:id/progress` | JWT + **Org manager** | **Scope of every teacher read below (PTD5):** students only (`role = member`), the org's **assigned** courses only (`organization_courses`, hidden or not); days are the org's local days, with local today + yesterday read raw from `product_events` and older days from the rollup. Summary per member × assigned course incl. `started_at`, `completed_at`, `last_activity_at`, `minutes_7d`, `videos_completed/total`, `exams_taken`, `best_exam_score`, `quizzes_passed/attempted`, `effort` (`passing` · `trying` · `struggling` · `stopped` · `browsing` · `not_trying`); optional `?classId=`. |
| GET | `/organizations/:id/progress/export.csv` | JWT + **Org manager** | Same rows as CSV (`text/csv`, attachment). Emits `org_progress_exported`. Declared before the `:courseId` route. |
| GET | `/organizations/:id/progress/:courseId` | JWT + **Org manager** | **404** when the course is not assigned to the org. Detailed: course skeleton with each member's unit statuses, `unit_completed_at`, `videos` (per-unit %, completed, position), `quizzes` (per-unit best/latest/attempts/passed), `last_activity_at`; optional `?classId=`. |
| GET | `/organizations/:id/engagement?days=&classId=` | JWT + **Org manager** | `{ days, members[], series[] }` — per member minutes, lessons, videos, units, exams, active days, last activity on assigned courses (rollup + raw for local today/yesterday); `series[]` by local day, `active_members` = members with engaged minutes that day. |
| GET | `/organizations/:id/utilization` | JWT + **Org manager** | Live seat utilization (`OrgUtilizationResponse`: seats, invites, activated, engaged 7/30 d, hours, `stalled_member_ids`). |
| GET | `/organizations/:id/members/:userId/exams` | JWT + **Org manager** | Quiz gradebook: per-lesson summaries (first/best/latest, tries) + attempt log with section breakdown; `effort` plus 30d start vs submit counts. |
| GET | `/organizations/:id/members/:userId/timeline?limit=` | JWT + **Org manager** | Member's learning events on assigned courses, last 30 d, heartbeats excluded. |

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
| POST | `/purchases/create-course-checkout` | JWT | Body `{ courseId }` → `{ url }`. Hosted Stripe Checkout (`mode: payment`) — **one course**, lifetime, priced from the linked Stripe Price (lookup key) or else `courses.price` (`price_data`). Best of the `?promo=` code and the site sale is pre-applied (`discounts`), otherwise `allow_promotion_codes`. Course metadata copied to the PaymentIntent so `payment_intent.succeeded` fulfils. Returns to `/courses/:id?purchase=success&session_id=…` (cancel → `?purchase=1`). Logged-in only; **email verification not required**. Rejects if already owned or active Pro. |
| GET | `/pricing` | Public | `?promo=CODE` optional → `{ sale, products: { COURSE_<id>, PRO_MONTHLY: { list_cents, final_cents, interval, promotion } } }` — what the site shows ([`pricing-and-promotions.md`](pricing-and-promotions.md) § 6). |
| GET | `/pricing/admin/overview` | JWT + **Admin** | Price sync status per product, site sale, all Stripe promotion codes with checkout / discount / revenue / refund stats, signup-link totals. |
| POST | `/pricing/admin/sync` | JWT + **Admin** | Re-read prices + promotions from Stripe now; returns the overview. |
| PATCH | `/pricing/admin/products/:sku` | JWT + **Admin** | Body `{ stripe_lookup_key: string \| null }` — link / unlink a product to a Stripe Price (audit `PRICING_PRODUCT_LINKED`). |
| POST | `/purchases/confirm-checkout` | JWT | Body `{ sessionId }`. Idempotent reconcile after the Checkout redirect when the webhook lags: session must be `mode=payment`, `paid`, and belong to the caller; then same path as `confirm-payment`. |
| POST | `/purchases/create-pro-checkout` | JWT | Stripe Checkout **subscription** for Pro (all courses while active). Needs `STRIPE_PRO_PRICE_ID_MONTHLY` (or yearly). Email verification **not** required. The success URL gets `session_id={CHECKOUT_SESSION_ID}` appended for `confirm-pro-checkout`. |
| POST | `/purchases/confirm-pro-checkout` | JWT | Body `{ sessionId }` → `{ active }`. The Pro version of `confirm-checkout`, called by the profile and course pages when the subscription webhook is late. The session must be `mode=subscription`, `status=complete` and belong to the caller; it then runs the same path as `checkout.session.completed`. It does nothing if the user is already Pro on that subscription, so no extra `token_version` bump. |
| POST | `/purchases/billing-portal` | JWT | Stripe Customer Portal (manage/cancel Pro). Requires `stripe_customer_id`. |
| POST | `/purchases/confirm-payment` | JWT | Idempotent reconcile from a succeeded course PaymentIntent (legacy client + `confirm-checkout` internals). |
| POST | `/purchases/webhook` | Public | Stripe signature, then `PurchaseService.processEvent`. That method is shared with the replay job, so it must stay idempotent. It **ignores** (with a 200) any event whose Stripe customer no user in this DB owns, because local dev and the site share the sandbox account and each receives the other's events. A processing error returns 500 so Stripe retries; the `stripe.webhook.failures{stage}` counter records it. Handles `payment_intent.succeeded` (order + entitlement + `purchase_completed`), `invoice.paid` / `invoice.payment_failed` (Pro orders + lifecycle events), `charge.refunded` (refund → revoke; Pro invoice resolved via `invoicePayments` on API ≥ basil), subscription lifecycle. Payload samples + field map: [`stripe-webhook-payloads.md`](stripe-webhook-payloads.md). **Not** in Swagger. |
| POST | `/purchases/pro-membership` | JWT + **Admin** | Pro comp / testing (no Stripe subscription). |
| POST | `/purchases/admin/backfill-order` | JWT + **Admin** | Repairs course entitlements with no `orders` row from Stripe: body `{ paymentIntentId }`, `{ userId, courseId }` (PI found by metadata search), or `{}` for every flagged entitlement. Records the order idempotently (`backfill_<pi>`), links `order_item_id`, sets the real amount. Returns `{ repaired[], unmatched[] }`. |
| POST | `/purchases/admin/replay-failed-events` | JWT + **Admin** | Runs the undelivered-webhook replay now, for example right after fixing an outage. Returns `{ seen, processed, failed, dead, skipped, deadUnresolved }`. Works even when the hourly cron is off. |

**Undelivered webhook replay** (`StripeEventReplayService`): every hour at :15, when `STRIPE_EVENT_REPLAY_ENABLED=true`, it asks Stripe for handled events whose delivery is still failing. Terraform sets that variable only on the deployed API; local dev leaves it off because Stripe's filter covers the whole account. It looks at events created between 1 hour and 3 days ago, up to 200 per run, and runs each one through `processEvent`. Progress is kept in `stripe_event_replays`. An event that fails 5 replays is marked `dead`: the job logs an error, sets the `stripe.webhook.dead_events` gauge, and writes the `stripe_events_dead` reconciliation check, which shows in admin health. These dead events stay flagged until someone fixes them and sets `resolved_at`. Each run also records the counter `stripe.webhook.replays{result}`. A cluster-wide advisory lock (key `7461_0002`) stops two API tasks from running it at once.

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
| POST | `/email/consultation` | Public | Consultation request. |
| POST | `/email/marketing/broadcast` | JWT + **Admin** | SES broadcast to `leads` by interest. Body `{ subject, body_markdown, interests[], mode }` — `dry_run` counts recipients (one per address, excludes unsubscribed/bounced), `test` sends `[TEST]` to the admin's own email, `send` queues the send in the background (rate-limited by `SES_MAX_SEND_RATE`; progress in logs) and returns `status: 'queued'`. 503 if SES / postal address / unsubscribe secret is missing; 409 if a broadcast is already running. Markdown only (raw HTML not rendered); `{{site_url}}` is substituted; layout, unsubscribe link and postal address are added. The old relay `POST /email/broadcast` was **removed** (bulk mail must never use the Workspace relay). |
| POST | `/email/ses-events` | Public, **SNS signature** | SES → SNS events. Verifies the SNS signature (cert must be on `sns.<region>.amazonaws.com`) and `TopicArn = SES_EVENTS_TOPIC_ARN`; confirms the subscription; permanent bounce → `leads.bounced_at`, complaint → `leads.unsubscribed_at`. Not throttled. |

### Leads — `/leads` (`backend/src/leads/`)

| Method | Path | Auth | Notes |
|--------|------|------|--------|
| POST | `/leads` | Public (`OptionalJwtAuthGuard`), **5/min/IP** | `{ email, interest, website?, source_path?, landing_path?, utm_*?, gclid?, fbclid?, ref? }` → always **202 `{ ok: true }`** for valid input (does not reveal whether the address was already listed). `website` is a honeypot — non-empty = silently dropped. A signed-in **org member** (student) is silently skipped — no row, no email (privacy § 3–4). New or re-consenting signups get the SES confirmation (`newsletter` = Field Notes copy: monthly, first Tuesday). |
| GET | `/leads/me` | JWT | Signed-in user's lists by their account email: `{ email_masked, interests: [{ interest, subscribed }] }`. **403** for org members. Profile email preferences (NL16b). |
| PATCH | `/leads/me` | JWT, 10/min | `{ interest, subscribed }`. `true` runs the normal capture (consent row + confirmation, `source_path = /profile`); `false` unsubscribes that one list. Returns the updated preferences. **403** for org members. |
| GET | `/leads/preferences?t=` | Public (token), 20/min | `{ email_masked, interests: [{ interest, subscribed }] }`. Token = `v1.<leadId>.<hmac>` (no email in the URL). 400 bad token, 404 lead gone. |
| POST | `/leads/unsubscribe` | Public (token), not throttled | Token in `?t=` (RFC 8058 one-click from the mail client's `List-Unsubscribe-Post`) or body `{ t, interests? }` (preference page). `interests` = lists to drop; omitted = all lists for that address. Returns `{ ok, email_masked, interests }`. |
| GET | `/leads?interest=&include_unsubscribed=` | JWT + **Admin** | Up to 10 000 rows, newest first. Default excludes unsubscribed/bounced. |
| GET | `/leads/export.csv` | JWT + **Admin** | Same filters, CSV (formula-injection safe). |

`POST /email/marketing/broadcast` recipients: active leads on the ticked lists, one per address, **excluding any address that belongs to an org member** (`users` ⋈ `organization_members` role `member`) — a backstop in case a student's address reached a list some other way.

### Newsletter — `/newsletter` (`backend/src/newsletter/`)

Field Notes issues, uploaded as the repo markdown file (front matter `slug`, `subject`, `preheader`, `lists`, optional `correction`). Tables (migration `1765000010000`): **`newsletter_issues`** (`slug` unique, `subject`, `preheader`, `lists` text[], `body_md` = email as approved, immutable once sent; `web_body_md` = web override after send; `corrections` jsonb `[{at, note}]`; `status` draft → approved → sending → sent; `approved_by/at`, `sent_at`, `recipients`, `sent_count`, `failed_count`) and **`newsletter_sends`** (`issue_id` × `email` unique, `status` sent|failed, `message_id`, `error`) — the resumable send log; rows for an email are deleted with the account (`UsersService.deleteUser`). **`newsletter_events`** (migration `1765000011000`): SES Delivery/Open/Click/Bounce/Complaint/Reject events for messages tagged `kind=newsletter`, joined by the `issue` tag (`SesEventsService.recordNewsletterEvent`). Clicks keep `email` + `link`; opens have `email = NULL`; no IP/UA; `likely_bot` = click within 30 s of send; `sns_message_id` unique (migration `1765000012000`) so SNS retries of one message insert once. Pruned after 12 months (nightly `pruneEvents`), deleted with the account. Comments are stripped before rendering; the `<!-- segment -->…<!-- /segment -->` block is email-only.

| Method | Path | Auth | Notes |
|--------|------|------|--------|
| GET | `/newsletter/issues` | JWT + **Admin** | Issue list (no bodies). |
| POST | `/newsletter/issues/preview` | JWT + **Admin** | `{ source }` → `{ subject, preheader, lists, email_html, email_text, web_html, warnings[] }` without saving. Uses `MarketingMailerService.renderPreview`, so it works where SES is not configured. |
| POST | `/newsletter/issues/import` | JWT + **Admin** | `{ source }`. New slug → draft. Draft/approved → replaced, approval reset. Sending → 409. Sent → only `web_body_md` changes and a `correction:` line is required (400 without). Returns `{ issue, action, preview }`. |
| GET | `/newsletter/issues/:slug` | JWT + **Admin** | `{ issue, preview }`. |
| GET | `/newsletter/issues/:slug/count` | JWT + **Admin** | `{ recipients, already_sent, ready }` — same recipient rules as the leads broadcast (opted-in lists, one per address, never an org member). |
| POST | `/newsletter/issues/:slug/test` | JWT + **Admin**, 10/min | `[TEST]` copy to the signed-in admin; inert unsubscribe link. |
| POST | `/newsletter/issues/:slug/approve` · `/unapprove` | JWT + **Admin** | draft ↔ approved. |
| POST | `/newsletter/issues/:slug/send` | JWT + **Admin** | 202. Approved (or a stopped `sending`) only; 503 if SES / postal address / unsubscribe secret is missing. Background send at the SES rate; skips addresses already `sent` for this issue, so it doubles as **resume**. Each email carries "View in browser" → `/newsletter/<slug>` and SES tags `kind=newsletter`, `issue=<slug>`. |
| GET | `/newsletter/issues/:slug/metrics` | JWT + **Admin** | `{ sent, failed, delivered, bounced, complaints, opens, clickers, human_clicks, scanner_clicks, unsubscribes, click_rate, by_section[], people[] }`. From `newsletter_sends` + `newsletter_events`; scanner clicks (≤ 30 s after send) excluded from people/sections; `opens` is unreliable by nature. |
| GET | `/newsletter/public` | Public | Sent issues older than 7 days (`slug`, `subject`, `sent_at`). |
| GET | `/newsletter/public/:slug` | Public | Any **sent** issue: `{ subject, sent_at, html (web copy, no segment block), corrections, listed }`; `listed` = ≥ 7 days since send. |

### Analytics — `/analytics`

| Method | Path | Auth | Notes |
|--------|------|------|--------|
| POST | `/analytics/event` | Public (`OptionalJwtAuthGuard`), 120/min per user | Single `AnalyticsEventDto` or `{ events: [...], anonymousId? }` (≤ 50). Marketing events → OTLP counters; every allow-listed event → `product_events` via `ProductEventsService.recordBatch`. Anonymous visitors: rows are stored only when an anonymous id is present (body `anonymousId` or `x-anonymous-id` header) **and** the event is an intent event (`article_view`, `course_view`, `pricing_viewed`, `signup_started`, `checkout_started`, offer events) — anonymous `page_view` stays OTel-only. Course-scoped events are dropped when the user cannot access the course; `video_*` / heartbeat payloads upsert `video_progress` and bump `progress.last_activity_at`. The authenticated `identified` event (`properties.anonymous_id`) is the only row carrying both `user_id` and `anonymous_id` — the identity stitch — and is dropped for org members. Batch items are validated **one by one** (`validateAnalyticsEvents`): a malformed event is dropped and counted (`dropped{reason=invalid}`), the rest of the batch is kept. Ingest failures are swallowed (204 regardless) and counted. **401** when there is no valid access token but the `refresh_token` cookie is present (expired session, not a guest) — the client refreshes and resends; header `x-analytics-guest: 1` (sent after a failed refresh) skips that check. Event time: the client `occurredAt` is kept when within the last 24 h (future skew > 5 min → now; older → dropped as `stale`), so resent batches dedupe on `(event_id, occurred_at)`. `video_progress.completed` follows the completion rule in [`progress-tracking-accuracy.md`](./progress-tracking-accuracy.md) § 3 (from merged ranges only — the `video_completed` event name no longer forces it). |

### Logging — `/logs`

| Method | Path | Auth | Notes |
|--------|------|------|--------|
| POST | `/logs` | Public | Frontend client logs (`FrontendLogDto`: `level` must be `info`\|`warn`\|`error`). Excluded from Swagger; throttled 10/min. |

### Health — `/health`

| Method | Path | Auth | Notes |
|--------|------|------|--------|
| GET | `/health` | Public | `{ status: 'ok' }` Also returns `stripe_mode` (`live` · `test` · `unset`, from the secret key prefix) to confirm the Stripe cutover; the API refuses to boot when the secret and publishable keys are in different modes (`StripeConfigService`). |

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
