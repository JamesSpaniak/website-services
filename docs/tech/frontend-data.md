# Frontend — configuration, permissions, API usage, Stripe

Next.js App Router app in **`drone/`**. The browser talks to the backend **only through** the same-origin path **`/api/*`**, which is proxied to the Nest service (see §1). Detailed backend routes and authorization rules are in [`backend-data.md`](./backend-data.md).

---

## 1. API and environment configuration

### Proxy (`/api` → backend)

`drone/src/app/api/[...path]/route.ts` forwards every method to:

`API_INTERNAL_BASE_URL` **or** `NEXT_PUBLIC_API_BASE_URL` **or** `http://localhost:3000`

It strips `host`, forwards query strings, and fixes missing `Content-Type` for JSON bodies when needed.

### Client vs server base URL (`api-client.tsx`)

| Context | Base used |
|---------|-----------|
| **Browser** | `/api` (relative — hits the Next route handler above) |
| **Server / SSR helpers** | `API_INTERNAL_BASE_URL` → `NEXT_PUBLIC_API_BASE_URL` → `http://localhost:3000` |

The shared `apiClient` sets `Content-Type: application/json`, `X-Request-Id`, and `Authorization: Bearer <access_token>` when tokens exist in `localStorage`. On **401**, it attempts **`POST /api/auth/refresh`** with the refresh token, updates tokens, and retries once.

### Tokens and cookies

- **Access / refresh:** stored in `localStorage` (`access_token`, `refresh_token`).
- **Cookie:** on login/refresh, `access_token` is mirrored to a **Lax** cookie (`max-age=86400`) so **Edge middleware** can read the JWT for route gating without `localStorage`.
- **Logout:** clears `localStorage` and expires the cookie.

### Environment variables (frontend-relevant)

| Variable | Purpose |
|----------|---------|
| `NEXT_PUBLIC_API_BASE_URL` | Fallback backend URL for server-side fetches and proxy target. |
| `API_INTERNAL_BASE_URL` | Preferred for server-side / Docker (direct backend hostname). |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Stripe.js / Elements on course purchase flow. |
| `NEXT_PUBLIC_SITE_URL` | Canonical site URL (metadata, sitemap). |
| `NEXT_PUBLIC_LOG_API_TIMINGS` | When `'true'`, logs API duration in the client logger. |

### Next.js config (`next.config.mjs`)

- **`images.remotePatterns`:** allows `https://media.thedroneedge.com/**` for `next/image`.

### Server-only fetches (bypass `/api` proxy)

Some RSC/metadata code calls the backend **directly** with `API_INTERNAL_BASE_URL` (no browser cookies):

- `drone/src/app/articles/[articleId]/page.tsx` — article for metadata + page.
- `drone/src/app/sitemap.ts` — published articles list.

These align with backend **`GET /articles`** and **`GET /articles/:id`** (public).

---

## 2. Permissions model (UI + edge)

Backend enforcement is described in [`backend-data.md`](./backend-data.md) §3. The frontend layers:

### JWT payload (middleware)

`drone/src/middleware.ts` decodes the access JWT **without verifying** the signature (verification happens on every API call server-side). It uses the **`role`** claim for coarse route gating.

| Route prefix | Middleware rule |
|--------------|-----------------|
| `/admin/*` | Cookie present + JWT **`role === 'admin'`** |
| `/manager/*` | Cookie present + any authenticated user (`requiredRoles: null`) |

Org roles (**manager** / **member**) are **not** in the JWT; `/manager` only requires a logged-in user at the edge. **Org manager vs member** is enforced in **`ManagerGuard`** + API.

### Client guards

| Component | Rule |
|-----------|------|
| **`AuthGuard`** | `getProfile()` succeeded → render; else redirect to `/login`. Used e.g. for course detail (`/courses/[courseId]`). |
| **`AdminGuard`** | `user.role === 'admin'` or redirect `/`. Wraps `/admin` page (defense in depth with middleware). |
| **`ManagerGuard`** | `user.organization?.role === 'manager'` **or** `user.role === 'admin'`; else redirect `/`. Wraps `/manager`. |

### Profile shape (`UserDto`)

`role`: string (`user` | `pro` | `admin` per backend).  
`pro_membership_expires_at`, optional **`organization`: `{ id, name, role: 'manager' \| 'member' }**` from **`GET /auth/profile`**.

### Feature-level checks

- **Course access:** `CourseData.has_access` from API drives paywall vs content; **`PurchaseFlow`** when `has_access === false` and `price > 0`.
- **Comments:** `user?.role === 'admin'` passed as `isAdmin` for moderation UI.
- **Header:** Admin link to `/admin` when `user.role === 'admin'`.

---

## 3. Stripe implementation (client)

| Step | Location |
|------|----------|
| Load Stripe | `loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!)` in `courses/[courseId]/page.tsx` |
| Provider | `<Elements stripe={stripePromise}>` wraps `CourseComponent` |
| Payment UI | `PurchaseFlow` — `CardElement`, `useStripe`, `useElements` |
| Create intent | **`POST /api/purchases/create-payment-intent`** via `createPaymentIntent(courseId)` → `{ clientSecret }` |
| Confirm | `stripe.confirmCardPayment(clientSecret, { payment_method: { card: elements.getElement(CardElement)! } })` |
| Fulfillment | Server-side **`POST /purchases/webhook`** (Stripe signature); **not** called from the frontend. Client polls `getCourseById` for `has_access` (15 × 2s). |
| Reconcile | **`POST /api/purchases/confirm-payment`** via `confirmCoursePurchase(paymentIntentId)` — idempotent recovery when Stripe succeeded but the webhook wasn't observed (poll timeout / page refresh). The pending PI id is stashed in `sessionStorage` (`pendingPurchasePi:{courseId}`) so the "Restore my access" button survives reloads. |

Admin manual grant **`POST /purchases/course`** exists as `purchaseCourse` in `api-client` for tooling; the main user purchase path is PaymentIntent + webhook.

**Logged-out purchase intent:** `PurchaseFlow` requires a session — logged-out users see "Create account & checkout" → `/register?redirect=/courses/{id}?purchase=1`. Redirect helpers live in `drone/src/app/lib/auth-redirect.ts` (`PURCHASE_QUERY`, `sanitizeRedirect`, `stashPostAuthRedirect` — sessionStorage carries the redirect through email verification).

**Secrets:** only **`NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`** on the client. **`STRIPE_SECRET_KEY`** / **`STRIPE_WEBHOOK_SECRET`** stay on the backend.

---

## 4. Outbound calls and integrations

### Through `apiClient` / `buildUrl` (backend REST)

All functions in `drone/src/app/lib/api-client.tsx` map to the backend routes listed in [`backend-data.md`](./backend-data.md) §4. Grouped by area:

| Area | Endpoints used from the client |
|------|--------------------------------|
| Auth | `auth/login`, `auth/register`, `auth/refresh`, `auth/logout`, `auth/profile`, `auth/forgot-password`, `auth/reset-password`, `auth/verify-email` |
| Users | `users/me`, `users/:username` |
| Courses / progress | `courses`, `courses/:id`, `progress/courses`, `progress/courses/:id`, `progress/courses/:id/reset`, `progress/courses/:courseId/units/:unitId`, `courses/:courseId/units/:unitId/media` |
| Articles (public + admin) | `articles`, `articles/:id`, `articles/admin/all`, `articles` POST, `articles/:id` PATCH/DELETE |
| Comments | `articles/:articleId/comments`, `comments/:id` PATCH/DELETE, `comments/:id/upvote` |
| Purchases | `purchases/create-payment-intent`, `purchases/confirm-payment`, `purchases/course` |
| Media | `media/presigned-url`, `media/profile-picture`, `media` GET/DELETE, `media?folder&subfolder` |
| Organizations | `organizations/my`, `organizations/invite-info`, `organizations`, `organizations/:id`, members, invite-codes, courses, progress |
| Audit / analytics | `audit/my`, `audit/users/:userId`, `audit/analytics/overview`, `audit/analytics/daily` |
| Email | `email/contact`, `email/consultation` |
| Analytics | `analytics/event` (see below) |
| Logging | `logs` (see below) |

### Direct `fetch` (not via full `apiClient` helpers)

| Call | Purpose |
|------|---------|
| **`fetch(uploadUrl, { method: 'PUT', body: file })`** | S3 upload after presigned URL from backend (`uploadMediaToS3`). |
| **`fetch(buildUrl('logs'), …)`** in `logToServer` | Client logs; **no** `Authorization` header (public backend route; abuse risk noted in backend doc). |
| **`navigator.sendBeacon` / `fetch`** in `analytics.ts` | **`POST /api/analytics/event`** — page/article/course view events (backend OTLP metrics). |

### Course exams

The **Exam** UI (`exam.tsx`) submits answers via **`submitUnitExam`** → **`POST progress/courses/:courseId/units/:unitId/exam/submit`** (authenticated). Grading and **`retries_taken`** / **`retries_allowed`** are enforced on the server; the UI updates local unit state after submit. Unit and nested section exams use each unit’s **`id`** as **`unitId`**. Progress status uses **`PATCH progress/courses/:courseId/units/:unitId`** (including marking a unit **in progress** when the unit page loads with **NOT_STARTED**).

---

## 5. Analytics and observability

- **`usePageAnalytics`** (root layout via `PageAnalytics`) calls **`trackPageView`** on route changes.
- **`trackArticleView`**, **`trackCourseView`** send structured events to **`POST /analytics/event`**.
- Client **`logger`** can forward to **`POST /logs`** via `logToServer`.

---

## 6. Pages — route map

**Global shell** (`app/layout.tsx`): wraps all routes with `ThemeProvider`, `AuthProvider`, `PageAnalytics` ( **`trackPageView`** → `POST /analytics/event` on client navigations), optional **Umami** script when `NEXT_PUBLIC_UMAMI_WEBSITE_ID` is set, `HeaderComponent` (nav + auth menu + Book a Call CTA), and `FooterComponent` (nav columns + socials).

Below: **page file** → **permissions** → **HTTP/API** (backend names match [`backend-data.md`](./backend-data.md) §4) → **UI components** (primary children; nested components may call additional APIs).

### `/` — `app/page.tsx`

| | |
|--|--|
| **Permissions** | Public (RSC). `HomeAuthCta` uses session from `AuthProvider` (no API by itself). |
| **API** | Server-side **`GET /articles`** (direct fetch, `revalidate: 3600`) for the "Recent Articles" section; static teaser cards as fallback when unreachable. |
| **Components** | Full-viewport hero (`BrandLogo`, `HomeAuthCta`, `HeroScrollNext`), course-track cards (FAA 107 / Video / AI — Video & AI tracks are coming-soon stubs), For Schools callout, `ArticlePreviewComponent` grid, `JsonLd` (organization + website). |

### `/about` — `app/about/page.tsx`

| | |
|--|--|
| **Permissions** | Public. |
| **API** | None. |
| **Components** | `PageShell`, `ImageComponent`, `SocialMediaLinks`. |

### `/contact` — `app/contact/page.tsx`

| | |
|--|--|
| **Permissions** | Public. |
| **API** | **`POST /email/contact`** via `ContactFormComponent` → `sendContactMessage`. |
| **Components** | `PageShell`, `ContactFormComponent`. |

### `/login` — `app/login/page.tsx`

| | |
|--|--|
| **Permissions** | Public; redirects to `?redirect=` target (or `/profile`) if already logged in (`useAuth`). `?redirect=` is sanitized (`sanitizeRedirect`) and stashed to sessionStorage (`stashPostAuthRedirect`). |
| **API** | **`LoginComponent`:** `POST /auth/login` (via `useAuth().login` → `login` in `api-client`). In **signup** mode: **`POST /auth/register`** → `createUser`. |
| **Components** | Two-column layout: `LoginComponent` + **`LoginConversionPanel`** (Part 107 pitch; try-free / purchase CTAs; purchase-intent copy when redirect contains `purchase=1`). `LoadingComponent`, Suspense wrapper. |

### `/register` — `app/register/page.tsx`

| | |
|--|--|
| **Permissions** | Public; redirects to `/profile` if logged in. Optional `?code=` invite. `?redirect=` supported — sanitized, stashed to sessionStorage, and drives purchase-intent messaging (`redirectIndicatesPurchase`). |
| **API** | **`GET /organizations/invite-info?code=`** when `code` present → `getInviteCodeInfo`. **`POST /auth/register`** → `createUser` (includes `invite_code` when valid). |
| **Components** | `PageShell`, `ErrorComponent`, inline form (Heroicon), Suspense wrapper. |

### `/forgot-password` — `app/forgot-password/page.tsx`

| | |
|--|--|
| **Permissions** | Public. |
| **API** | **`POST /auth/forgot-password`** → `forgotPassword` (`ForgotPasswordComponent`). |
| **Components** | `PageShell`, `ForgotPasswordComponent`. |

### `/reset-password` — `app/reset-password/page.tsx`

| | |
|--|--|
| **Permissions** | Public; requires `?token=` query param. |
| **API** | **`POST /auth/reset-password`** → `resetPassword` (`ResetPasswordFormComponent`). |
| **Components** | `PageShell`, `ResetPasswordFormComponent` or `ErrorComponent` if token missing. |

### `/reset-password/error` — `app/reset-password/error/page.tsx`

| | |
|--|--|
| **Permissions** | Public. |
| **API** | None. |
| **Components** | `PageShell`, static copy + link to `/forgot-password`. |

### `/verify-email` — `app/verify-email/page.tsx`

| | |
|--|--|
| **Permissions** | Public; uses `?token=`. |
| **API** | **`POST /auth/verify-email`** → `verifyEmail`. |
| **Components** | `PageShell`, status messaging. The sign-in link reads the stashed redirect (`readStashedPostAuthRedirect`) so purchase/course intent survives verification. |

### `/settings` — `app/settings/page.tsx`

| | |
|--|--|
| **Permissions** | Public (no `AuthGuard`). Metadata: `robots: { index: false }`. Theme is client-only (`localStorage`). |
| **API** | None. |
| **Components** | `PageShell`, `ThemePreferenceSettings` → `ThemeToggle`. |

### `/profile` — `app/profile/page.tsx`

| | |
|--|--|
| **Permissions** | **`AuthGuard`** — JWT session required (`GET /auth/profile` on app load). |
| **API** | **`ProfileComponent`:** `PATCH /users/me` → `updateUser` (email); **`GET /progress/courses`** → `getCoursesWithProgress`; **`GET /audit/my`** → `getMyActivity`; **`media/profile-picture` + S3 PUT + `PATCH /users/me`** → `uploadProfilePicture`. **`CourseProgressPreview`:** `POST /progress/courses/:id/reset` → `resetCourseProgress`. |
| **Components** | `AuthGuard`, `PageShell`, `ProfileComponent`, `CourseProgressPreview`. |

### `/articles` — `app/articles/page.tsx`

| | |
|--|--|
| **Permissions** | Public (listed articles are published-only from API). |
| **API** | **`GET /articles`** → `getArticles`. |
| **Components** | `PageShell`, `ArticlePreviewComponent`, `LoadingComponent`, `ErrorComponent`. |

### `/articles/[articleId]` — `app/articles/[articleId]/page.tsx` + `article-page-client.tsx`

| | |
|--|--|
| **Permissions** | Public for reading. Comments require JWT for write/upvote (see below). |
| **API** | **RSC metadata:** direct **`GET /articles/:id`** (server `fetch`, revalidate). **Client:** **`GET /articles/:id`** → `getArticleById`; **`trackArticleView`** → `POST /analytics/event`. **`CommentSection`:** `GET/POST /articles/:id/comments`, `PATCH/DELETE /comments/:id`, `POST /comments/:id/upvote` (see [`backend-data.md`](./backend-data.md)). |
| **Components** | `ArticlePageClient` → `ArticleComponent` (`ImageComponent`, `ContentBlockRenderer`, `JsonLd`) + **`CommentSection`**. |

### `/courses` — `app/courses/page.tsx`

| | |
|--|--|
| **Permissions** | Public page; **`GET /courses`** is optional-JWT on backend — when logged in, responses include `has_access` per course. Waits for `AuthProvider` before fetching. |
| **API** | **`GET /courses`** → `getCourses`. |
| **Components** | `PageShell`, `CoursePreviewComponent` (preview-first card: links to `/courses/:id/preview`, plus "Try Unit 1 free" / "Purchase $X" register-redirect CTAs), `LoadingComponent`, `ErrorComponent`. |

### `/courses/[courseId]` — `app/courses/[courseId]/page.tsx`

| | |
|--|--|
| **Permissions** | **`AuthGuard`** + **`Elements` (Stripe)**. Backend **`GET /courses/:id`** requires JWT and enforces access. **`?purchase=1`** auto-opens `PurchaseFlow` (`initialShowPurchase`) when the course is paid and not yet owned. |
| **API** | **`GET /courses/:id`** → `getCourseById`; **`trackCourseView`** → `POST /analytics/event`. **`CourseComponent`:** `PATCH /progress/courses/:id`, `PATCH /progress/courses/:courseId/units/:unitId`. **`PurchaseFlow`:** **`POST /purchases/create-payment-intent`**, then Stripe `confirmCardPayment`, poll `getCourseById`; reconcile via **`POST /purchases/confirm-payment`** (see §3). Logged-out state renders account-required CTAs instead of the card form. |
| **Components** | `AuthGuard`, `LoadingComponent`, `ErrorComponent`, `Elements` + **`CourseComponent`** (`CoursePurchaseBanner`, `PurchaseFlow`, `StatusUpdater`, `UnitPreviewComponent`, `VideoComponent`, `CourseImageStrip`, `CourseExamsSection`, `CourseOutlineSidebar`, `JsonLd`). |

### `/courses/[courseId]/preview` — `app/courses/[courseId]/preview/page.tsx`

| | |
|--|--|
| **Permissions** | Public (RSC — shareable / SEO landing per course). |
| **API** | Server-side **`GET /courses/:id/public`** (direct fetch, `revalidate: 3600`) for metadata + page; 404 via `notFound()` when missing. |
| **Components** | Hero image, price / unit-count badges, **`CoursePreviewActions`** (auth-aware: continue-learning + unlock for logged-in; create-account / purchase / sign-in register-redirects for logged-out), course outline with `free_preview` markers, FAQ section, `JsonLd` (course + FAQ). |

### `/courses/tracks/video`, `/courses/tracks/ai` — `app/courses/tracks/*/page.tsx`

| | |
|--|--|
| **Permissions** | Public; static "coming soon" stubs linked from the home track cards. Both tracks must ship before initial launch (see `docs/TODO.md` P0). |
| **API** | None. |
| **Components** | `PageShell`, copy + link back to `/courses`. |

### `/courses/[courseId]/units/[unitId]` — `app/courses/[courseId]/units/[unitId]/page.tsx`

| | |
|--|--|
| **Permissions** | **No `AuthGuard`** in code, but **`GET /courses/:id`** requires JWT — unauthenticated users typically see an error from the fetch. Intended for logged-in learners. |
| **API** | **`GET /courses/:id`** → `getCourseById` (client extracts unit). **`UnitComponent`:** `PATCH /progress/.../units/:unitId` → `updateUnitProgress`. **`SectionComponent`:** **`GET /courses/:courseId/units/:unitId/media`** → `getUnitMedia` for signed video URLs. |
| **Components** | `UnitComponent` → `SectionComponent`, `ExamComponent` (local scoring), `StatusUpdater`, `StatusIcon`. |

### `/admin` — `app/admin/page.tsx`

| | |
|--|--|
| **Permissions** | **Middleware:** cookie + JWT `role === 'admin'`. **`AdminGuard`:** same. Backend: Admin-only on mutating routes. |
| **API** | **Load:** `GET /articles/admin/all`, `GET /courses`, `GET /organizations`. **Articles:** `POST/PATCH/DELETE /articles`, **Courses:** `POST/PUT/DELETE /courses`. **Orgs:** `POST/PATCH/DELETE /organizations`, `GET/PATCH/DELETE .../invite-codes`, `POST .../invite-codes/bulk`, `GET/POST/DELETE .../organizations/:id/courses`. **Analytics tab:** `GET /audit/analytics/overview`, `GET /audit/analytics/daily`. |
| **Components** | `AdminGuard`, `PageShell`, `AdminDashboard` (tabs), **`ArticleEditor`** / **`CourseEditor`** (`createArticle` / `updateArticle`, `createCourse` / `updateCourse`) with **`MediaUpload`** → presigned URL + S3 PUT; course payload uses **`images_url`** (arrays) for hero/unit galleries — see [`course-editing-roadmap.md`](./course-editing-roadmap.md). **Edit course** loads **`GET /courses/:id`** (`getCourseById`) so **`sub_units`** and exams are present; **`GET /courses`** (list) strips nested content for the catalog. `LoadingComponent`, `ErrorComponent`. |

### `/manager` — `app/manager/page.tsx`

| | |
|--|--|
| **Permissions** | **Middleware:** any logged-in user with cookie. **`ManagerGuard`:** org **`role === 'manager'`** or global **admin**. |
| **API** | **`getOrganizationDetails`**, **`getOrgMembers`**, **`addOrgMember`**, **`removeOrgMember`**, **`updateMemberRole`**, **`generateInviteCode`**, **`getInviteCodes`**, **`getOrgProgress`**, **`getOrgCourseProgress`**, **`getStudentActivity`**, **`resetMemberPicture`** — all under `/organizations/...` and **`GET /audit/users/:userId`** per [`backend-data.md`](./backend-data.md). |
| **Components** | `ManagerGuard`, `PageShell`, tabbed dashboard (members / invites / progress), Heroicons. |

### `/schools`, `/schools/funding` — `app/schools/**/page.tsx`

| | |
|--|--|
| **Permissions** | Public (RSC, light `data-edu-theme` palette). |
| **API** | None. |
| **Components** | Static marketing sections (value props, dashboards, funding sources), links to `/consultation` and `/schools/curriculum`. |

### `/schools/curriculum` — `app/schools/curriculum/page.tsx`

| | |
|--|--|
| **Permissions** | Public (RSC, `data-edu-theme`). |
| **API** | Server-side **`GET /courses`** (direct fetch) for live course catalog data on the curriculum overview. |
| **Components** | Static curriculum/track sections + fetched course info. |

### `/consultation` — `app/consultation/page.tsx`

| | |
|--|--|
| **Permissions** | Public (`data-edu-theme`). |
| **API** | **`POST /email/consultation`** → `sendConsultationRequest` (`ConsultationForm`, zod-validated). |
| **Components** | Hero strip, `ConsultationForm`, what-we-discuss checklist. |

### `/legal`, `/privacy` — `app/legal/page.tsx`, `app/privacy/page.tsx`

| | |
|--|--|
| **Permissions** | Public. |
| **API** | None. |
| **Components** | Static terms (`terms-of-service-body.tsx`) / privacy notice content. |

### Other app routes (metadata / SEO)

| File | Role |
|------|------|
| `app/sitemap.ts` | Server **`GET /articles`** for URLs; uses `API_INTERNAL_BASE_URL`. |
| `app/robots.ts` | Disallow rules for `/api/`, `/admin/`, auth pages, etc. |
| `app/opengraph-image.tsx`, `app/twitter-image.tsx` | Generated OG/Twitter images (no REST API). |

---

## 7. Related files

| Concern | Location |
|---------|----------|
| API wrapper, auth header, refresh | `drone/src/app/lib/api-client.tsx` |
| Proxy to backend | `drone/src/app/api/[...path]/route.ts` |
| Edge JWT gating | `drone/src/middleware.ts` |
| Session / profile | `drone/src/app/lib/auth-context.tsx` |
| Redirect / purchase-intent helpers | `drone/src/app/lib/auth-redirect.ts` (sanitize, login/register hrefs, sessionStorage stash, `PURCHASE_QUERY`) |
| Conversion CTAs | `drone/src/app/ui/components/login-conversion-panel.tsx`, `course-preview-actions.tsx`, `course-purchase-banner.tsx` |
| Guards | `drone/src/app/lib/auth-guard.tsx`, `drone/src/app/ui/components/admin-guard.tsx`, `drone/src/app/ui/components/manager-guard.tsx` |
| Stripe Elements + purchase | `drone/src/app/courses/[courseId]/page.tsx`, `drone/src/app/ui/components/purchase-flow.tsx` |
| Analytics beacon | `drone/src/app/lib/analytics.ts`, `drone/src/app/lib/use-page-analytics.ts` |

Keep this file aligned with `api-client.tsx` and route-handler changes; mirror permission semantics with [`backend-data.md`](./backend-data.md).
