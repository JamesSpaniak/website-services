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
| Stripe | `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` |
| Email | SMTP / provider settings used by `EmailModule` |
| Media / CloudFront | `CLOUDFRONT_MEDIA_DOMAIN`, signing keys for video URLs |
| OpenTelemetry | `OTEL_EXPORTER_OTLP_*`, `OTEL_SERVICE_NAME` — optional; loaded via `telemetry.ts` before Nest bootstrap |

### Cross-cutting behavior

- **Throttling:** `@nestjs/throttler` (e.g. stricter limits on `forgot-password` / `reset-password`).
- **Request ID:** `RequestIdMiddleware` (correlation in logs).
- **HTTP logging:** `LoggingInterceptor` logs `METHOD url duration` (health checks excluded).
- **Errors:** `HttpExceptionFilter` — 5xx and unhandled exceptions log **stack traces**; some DB constraint errors mapped to friendly messages.
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
- **Purchases:** many-to-many **`user_courses_purchased`** → `courses`.

### `courses`

- `title` (unique), `payload` (JSON string of `CourseDetails`: units, exams, etc.), `price`, `hidden`.
- **`CourseDetails` media:** `images_url` (string array) on the course root and on each `UnitData` node for hero/gallery images; legacy single `image_url` in stored JSON is merged into `images_url` by **`migrateCoursePayloadImages`** on read/write (`backend/src/courses/course-payload.util.ts`). Video remains `video_url` where applicable.
- M2M: **`purchased_by_users`** (users), **`organizations`** (orgs that may grant access via `organization_courses`).

### `progress`

- Per user + course: **`userId`**, **`courseId`** (unique pair).
- `payload` (JSONB): snapshot/progress shape aligned with course structure.
- `status`, `units_completed`, `units_total`, `latest_exam_score`, `updated_at`.

### `articles`

- `title` (unique), `sub_heading`, `image_url`, `body`, optional **`content_blocks`** (JSONB), `hidden`.

### `sessions`

- Refresh tokens: `selector` (unique), `hashed_verifier`, `expires_at`, FK → `users`.

### `organizations`

- `name` (unique), `max_students`, `school_year`, `semester`.
- Relations: **`members`** (`organization_members`), **`invite_codes`**, **`courses`** (M2M for org-assigned courses).

### `organization_members`

- `organizationId`, `userId` (unique pair), **`role`:** `manager` \| `member` (`OrgRole`).

### `invite_codes`

- `code` (unique), `organizationId`, `role`, optional `email`, `createdByUserId`, `usedByUserId`, `usedAt`, `expiresAt`.

### `audit_logs`

- `userId`, **`action`** (`AuditAction` enum), `metadata` (JSONB), `created_at`.

### `comments` / `comment_votes`

- Comments: `articleId`, `userId`, `parentId` (threading), `body`, `upvote_count`, timestamps.
- Votes: separate entity for per-user upvotes (see `comment-vote.entity.ts`).

### Analytics metrics

- **Not** stored as relational rows for page views. `AnalyticsService` increments **OpenTelemetry metrics** (counters) exported via OTLP when configured.

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
| POST | `/auth/login` | Public | Returns tokens + user (+ org summary if any). |
| POST | `/auth/register` | Public | Sends verification email. |
| POST | `/auth/verify-email` | Public | |
| POST | `/auth/refresh` | Public | Body: refresh token. |
| GET | `/auth/profile` | JWT | Current user. |
| POST | `/auth/logout` | Public | Invalidates refresh session. |
| POST | `/auth/forgot-password` | Public | Throttled. |
| POST | `/auth/reset-password` | Public | Throttled. |

### Users — `/users`

| Method | Path | Auth | Notes |
|--------|------|------|--------|
| GET | `/users` | JWT + **Admin** | All users (slim). |
| POST | `/users` | JWT + **Admin** | Create user. |
| GET | `/users/:username` | JWT | Public profile by username. |
| PATCH | `/users/me` | JWT | Update self only. |
| DELETE | `/users/:id` | JWT + **Admin** | |

### Courses — `/courses`

| Method | Path | Auth | Notes |
|--------|------|------|--------|
| GET | `/courses` | Optional JWT | Public list; `has_access` if logged in. |
| GET | `/courses/:id` | JWT | Full course + progress; access enforced in service. |
| POST | `/courses` | JWT + **Admin** | Create. |
| PUT | `/courses/:id` | JWT + **Admin** | Update. |
| DELETE | `/courses/:id` | JWT + **Admin** | |
| PATCH | `/courses/:courseId/units/:unitId` | JWT | Unit progress. |
| GET | `/courses/:courseId/units/:unitId/media` | JWT | Signed video URL; requires course access. |
| POST | `/courses/:courseId/units/:unitId/exam/submit` | JWT | Exam submit. |

### Progress — `/progress` (alternate surface)

| Method | Path | Auth | Notes |
|--------|------|------|--------|
| GET | `/progress/courses` | JWT | All courses with progress. |
| POST | `/progress/courses/:courseId/reset` | JWT | Reset course progress. |
| PATCH | `/progress/courses/:courseId` | JWT | Course-level status. |
| PATCH | `/progress/courses/:courseId/units/:unitId` | JWT | Unit progress. |
| POST | `/progress/courses/:courseId/units/:unitId/exam/submit` | JWT | Exam submit. |

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
| GET | `/organizations/:id/members` | JWT + **Org manager** | |
| POST | `/organizations/:id/members` | JWT + **Org manager** | Add by email. |
| DELETE | `/organizations/:id/members/:userId` | JWT + **Org manager** | |
| DELETE | `/organizations/:id/members/:userId/picture` | JWT + **Org manager** | |
| PATCH | `/organizations/:id/members/:userId/role` | JWT + **Org manager** | |
| POST | `/organizations/:id/invite-codes` | JWT + **Org manager** | |
| GET | `/organizations/:id/invite-codes` | JWT + **Org manager** | |
| POST | `/organizations/:id/invite-codes/bulk` | JWT + **Org manager** | |
| GET | `/organizations/:id/courses` | JWT + **Org manager** | |
| POST | `/organizations/:id/courses` | JWT + **Admin** | Assign courses to org. |
| DELETE | `/organizations/:id/courses/:courseId` | JWT + **Admin** | |
| GET | `/organizations/:id/progress` | JWT + **Org manager** | Summary. |
| GET | `/organizations/:id/progress/:courseId` | JWT + **Org manager** | Detailed. |

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
| POST | `/purchases/create-payment-intent` | JWT | Stripe PaymentIntent. |
| POST | `/purchases/webhook` | Public | Stripe signature; **not** in Swagger. |
| POST | `/purchases/pro-membership` | JWT + **Admin** | Pro comp / testing (no Stripe subscription). |

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
| POST | `/analytics/event` | Public | Page/article/course view metrics (OTLP counters). |

### Logging — `/logs`

| Method | Path | Auth | Notes |
|--------|------|------|--------|
| POST | `/logs` | Public | Frontend client logs; excluded from Swagger; avoid abuse in production (consider auth/rate limits). |

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
