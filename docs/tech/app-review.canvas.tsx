import {
  Callout,
  Card,
  CardBody,
  CardHeader,
  Grid,
  H1,
  H2,
  H3,
  Pill,
  Row,
  Stack,
  Stat,
  Table,
  Text,
  type PillTone,
  type TableRowTone,
} from "cursor/canvas";
import { useCanvasState } from "cursor/canvas";

type Severity = "critical" | "high" | "medium" | "low";

interface Finding {
  id: string;
  severity: Severity;
  title: string;
  location: string;
  detail: string;
}

const severityPillTone: Record<Severity, PillTone> = {
  critical: "deleted",
  high: "warning",
  medium: "info",
  low: "neutral",
};

const severityRowTone: Record<Severity, TableRowTone | undefined> = {
  critical: "danger",
  high: "warning",
  medium: undefined,
  low: undefined,
};

const severityRank: Record<Severity, number> = { critical: 0, high: 1, medium: 2, low: 3 };

const securityFindings: Finding[] = [
  { id: "C1", severity: "critical", title: "Privilege escalation via mass assignment on PATCH /users/me", location: "backend/src/main.ts:111, users/user.service.ts:118", detail: "Global ValidationPipe has no whitelist, and updateUser merges the raw body into the entity. Any user can send {\"role\":\"admin\"} and become site admin. Fix: ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true })." },
  { id: "C2", severity: "critical", title: "Cross-tenant IDOR on class-exam manager endpoints", location: "questions/guards/manager-or-admin.guard.ts:32, exam.controller.ts:90-165", detail: "Guard only checks the caller manages *some* org, never the targeted org. A manager of Org A can read Org B's rosters and scores and assign exams into other orgs. Fix: verify manager membership for the specific orgId on every call." },
  { id: "C3", severity: "critical", title: "Hardcoded production DB password committed to Terraform", location: "terraform/database.tf:7-10", detail: "Literal password \"YourSecurePassword123!\" is in git history. Rotate now; generate with random_password and store in Secrets Manager." },
  { id: "H1", severity: "high", title: "Access/refresh tokens in localStorage + JS-readable cookie", location: "drone/src/app/lib/api-client.tsx:39-56", detail: "Any XSS exfiltrates both tokens; the refresh token grants long-lived access. Move to HttpOnly Secure cookies set by the backend." },
  { id: "H2", severity: "high", title: "Media signing silently falls back to unsigned URLs", location: "backend/src/media/signed-url.service.ts:25-28", detail: "If CloudFront signing env vars are missing, paid course video URLs are returned unsigned and shareable. Fail closed in production and require trusted signers on the CloudFront behavior." },
  { id: "M1", severity: "medium", title: "DB TLS disables certificate verification", location: "backend/src/config/app.config.ts:28", detail: "rejectUnauthorized: false accepts any cert, allowing MITM on all DB traffic. Ship the RDS CA bundle and verify." },
  { id: "M2", severity: "medium", title: "No attempt limit on exam submit; answer key readable between attempts", location: "questions/exam-attempt.service.ts:58-133, exam.controller.ts:205", detail: "A student can submit, read correct_choice_id from GET /exams/:id/attempt, then resubmit a perfect score. Enforce retries server-side and withhold answers while attempts remain." },
  { id: "M3", severity: "medium", title: "GET /users/:username leaks email and role to any logged-in user", location: "backend/src/users/user.controller.ts:42-54", detail: "Returns UserFull (email, role, org membership) for arbitrary usernames. Return a slim public profile or restrict to self/admin." },
  { id: "M4", severity: "medium", title: "Unauthenticated log and analytics ingestion", location: "logging.controller.ts:15, analytics.controller.ts:38", detail: "POST /logs and /analytics/event accept arbitrary bodies; AnalyticsEventDto validation is commented out. Re-enable validation, cap sizes, tighten throttle." },
  { id: "L1", severity: "low", title: "SQL logging on globally; PII in app logs; open Swagger at /api", location: "orm.config.ts:6, auth.service.ts, main.ts:113", detail: "Disable query logging in prod, trim PII at info level, gate Swagger. Also verify FRONTEND_URL is always set so CORS never falls back to localhost." },
];

const dataModelFindings: Finding[] = [
  { id: "H1", severity: "high", title: "Digit-based ID arithmetic is already wrong for 13 live nodes", location: "scripts/course_question_mapper.py:34-39, faa_107_course.json", detail: "Unit 10's ids (10, 101-108) decode to unit 1; depth-4 nodes (3221...) decode to nonexistent unit 32; unit 7's 710-731 are ambiguous with sub-subs of 71-73; nodes 140 and 24 violate the parent-prefix rule. Stop deriving hierarchy from digits." },
  { id: "H2", severity: "high", title: "Orphaned question links shipped in the bulk artifact", location: "assets/courses/faa-107/questions/faa_107_questions.bulk.json", detail: "sub_unit_id values 12, 41, 45 no longer exist in the course JSON after unit rebuilds. No import-time validation flags them; those questions never appear in any reachable quiz. Add payload validation to bulkImport plus a reconciliation report." },
  { id: "H3", severity: "high", title: "Exam reuse ignores scope_ids — wrong unit's exam can be served", location: "questions/exam-generator.service.ts:37-53", detail: "Reuse query matches user+course+scope+pool but never compares scope_ids: open Unit 5 quiz then Unit 6 and you get the Unit 5 exam. One-line fix: compare sorted scope_ids in the reuse query." },
  { id: "H4", severity: "high", title: "Progress blob per user: drift plus row-deleting data loss", location: "progress.service.ts:236, course-progress.service.ts:218", detail: "Renumbered units lose COMPLETED status silently, and a stale unit id causes the whole progress row (including exam_scores) to be deleted and rebuilt. Store a sparse {unit_id: status} map; never delete on stale id." },
  { id: "H5", severity: "high", title: "Two near-duplicate progress services diverge materially", location: "progress/progress.service.ts vs courses/course-progress.service.ts", detail: "One strips content from the stored blob, the other stores full course content per user; only one syncs summary columns used by org dashboards. Collapse to a single service." },
  { id: "M1", severity: "medium", title: "Export/import round-trip drops figure_ref", location: "questions/question.service.ts:171-210", detail: "figure_ref is omitted on both export and import, so export-edit-reimport wipes every FAA figure link. Export also includes archived rows despite the docstring." },
  { id: "M2", severity: "medium", title: "UnitData.id typed string in DTOs, stored as number in JSON", location: "course.dto.ts:117, drone lib/types/course.ts:46", detail: "Validation would reject the numeric ids the scripts write; frontend parseInt()s them back. Pick one representation end to end." },
  { id: "M3", severity: "medium", title: "latest_exam_score written by two conflicting paths", location: "exam-attempt.service.ts:302, progress.service.ts:129-152", detail: "The deprecated computeSummary clobbers the final-exam score (to null) on every unit-progress update via /progress routes. Remove the legacy write." },
  { id: "M4", severity: "medium", title: "Legacy embedded-exam surface half-removed", location: "course.dto.ts:31-115, progress.service.ts:83-88", detail: "Bundle B removed the frontend, but ExamData/QuestionData/AnswerData DTOs, unit.exam init, stripAnswerKeys, and the e2e seed remain — and the roadmap doc still proposes building on them. Delete the dead surface." },
  { id: "L1", severity: "low", title: "Exam.question_ids dangles by design; image_url duality is handled", location: "exam.controller.ts:234, course-payload.util.ts", detail: "Missing questions are silently filtered from exams (denominator changes). The image_url→images_url migration is actually done well; drop the deprecated field after a one-time payload rewrite." },
];

const frontendFindings: Finding[] = [
  { id: "A1", severity: "high", title: "Section accordions are click-only divs — no keyboard access", location: "ui/components/section.tsx:67-70", detail: "All content below unit level (~197 nodes, 3-4 levels deep) is behind divs with onClick only: not focusable, no aria-expanded, no Enter/Space. Convert to <button aria-expanded aria-controls>." },
  { id: "A2", severity: "high", title: "StatusUpdater menu is inaccessible — the only way to mark lessons complete", location: "ui/components/status-updater.tsx:29-40", detail: "Icon-only trigger with no label, blur-timeout close, no menuitem roles, no Escape. Add aria-label, roles, Escape/outside-click handling." },
  { id: "A4", severity: "high", title: "Videos ship without captions or transcripts; untitled iframes", location: "ui/components/video.tsx:70-138", detail: "WCAG 1.2.2 gap for a paid education product. Support a captions track on unit data, add title to embeds, link transcripts." },
  { id: "D1", severity: "high", title: "Manager dashboard hardcodes light-pastel Tailwind on the dark theme", location: "manager/page.tsx:240-623", detail: "bg-purple-100/text-purple-800 style chips look broken on the dark default. Use the token-based pattern already in the Exams tab." },
  { id: "D2", severity: "high", title: "prose-invert hardcoded — lesson text near-invisible in light theme", location: "unit.tsx:65, section.tsx:96-108", detail: "Drive prose colors from CSS variables or gate on html[data-theme=dark]." },
  { id: "D4", severity: "high", title: "Stripe CardElement illegible in dark mode", location: "ui/components/purchase-flow.tsx:131-136", detail: "Hardcoded #424770 text on a #1f1f1f surface. Pass theme-aware colors to Stripe style.base." },
  { id: "U1", severity: "high", title: "Unit pages are navigational dead ends", location: "unit.tsx, courses/[courseId]/units/[unitId]/page.tsx", detail: "No breadcrumb, no back-to-course, no next/previous lesson. Reuse the exam breadcrumb and compute prev/next from the flattened unit order." },
  { id: "U2", severity: "high", title: "The 3-4 level sub_unit tree (~197 nodes) is nearly invisible", location: "course.tsx:97-105, section.tsx:35", detail: "Sidebar lists top-level units only; everything else hides in collapsed accordions with no expand-all, deep links, or lesson counts. Add a course tree with per-node status." },
  { id: "U5", severity: "high", title: "60-question exam blocks submit until 100% answered, with no way to find the missed one", location: "exam-player.tsx:215-221", detail: "Add a question-number palette (answered/unanswered) that scrolls to #exam-q-N, plus jump-to-first-unanswered." },
  { id: "A5", severity: "medium", title: "Primary CTA contrast fails in light theme (~3.3:1)", location: "exam-player.tsx:98, course-exam-card.tsx:63", detail: "brand-primary + brand-black text fails AA in light mode. Define a per-theme --brand-primary-contrast token." },
  { id: "A6", severity: "medium", title: "Form labels not associated (htmlFor/id) across editors", location: "course-editor.tsx, question-bank-editor.tsx, manager/page.tsx", detail: "Labels sit adjacent to inputs without association; screen readers may not announce them." },
  { id: "A8", severity: "medium", title: "Lesson content injected via dangerouslySetInnerHTML without sanitization", location: "unit.tsx:65-67, section.tsx:96-108", detail: "Admin JSON accepts arbitrary HTML. Sanitize with DOMPurify (also reduces the token-theft blast radius of security H1)." },
  { id: "U4", severity: "medium", title: "Completion is manual and hidden behind an unlabeled kebab per node", location: "unit.tsx:20-41, status-updater.tsx", detail: "Add a 'Mark complete & continue' button at lesson end; consider auto-complete on video end." },
  { id: "U6", severity: "medium", title: "Exam drafts die on tab close and on in-app navigation", location: "exam-player.tsx:28-49,155-163", detail: "sessionStorage drafts + beforeunload don't survive Next.js navigation. Use localStorage, intercept in-app nav during an attempt, consider server-side persistence." },
  { id: "U7", severity: "medium", title: "Unit pages skip AuthGuard/purchase gating that course pages have", location: "units/[unitId]/page.tsx", detail: "Logged-out users on a shared unit URL get a raw error instead of the login/purchase flow used by exam pages." },
  { id: "U3", severity: "medium", title: "No overall course progress bar", location: "course.tsx:91-94", detail: "Show X of Y complete across the flattened tree; unit previews don't reflect sub-unit completion." },
  { id: "D7", severity: "low", title: "Bare spinners everywhere; error component has no retry", location: "loading.tsx, error.tsx", detail: "Add skeletons for catalog/unit pages and an onRetry prop." },
];

const salesFindings: Finding[] = [
  { id: "S1", severity: "high", title: "Course detail pages are login-gated — invisible to prospects and Google", location: "courses/[courseId]/page.tsx:73-79, course.controller.ts:79", detail: "AuthGuard redirects anonymous visitors to /login and the API requires JWT. The single most important sales page can't be seen before registering. Serve a public, server-rendered marketing view; gate only lesson content." },
  { id: "S2", severity: "high", title: "No price appears anywhere pre-purchase; no pricing page", location: "course-preview.tsx, purchase-flow.tsx:123", detail: "Catalog cards show no price, CTA, or 'Free' badge. The flagship FAA course is priced \"0\" so the (production-grade) Stripe flow never triggers — nothing is sellable today. Decide free-lead-magnet vs paid and say it loudly." },
  { id: "S3", severity: "high", title: "Hero promotes Articles over Courses; copy states category, not outcome", location: "page.tsx:110-133", detail: "The filled primary button is Articles; Courses is the outline. Rewrite hero as outcome + proof ('Pass the FAA Part 107 exam...') and swap CTA priority." },
  { id: "S4", severity: "high", title: "Zero social proof site-wide", location: "page.tsx, about/page.tsx", detail: "No testimonials, pass rate, student counts, or instructor credentials anywhere. Collect 3-5 testimonials and add a proof band to home, courses, and purchase." },
  { id: "S5", severity: "high", title: "No email capture at all", location: "footer.tsx, page.tsx", detail: "No newsletter, lead magnet, or exit capture — article SEO traffic leaves with no remarketing hook. A free 107 practice test is the natural lead magnet." },
  { id: "S6", severity: "high", title: "Login redirect loses purchase intent", location: "auth-guard.tsx:21, register/page.tsx:93", detail: "No ?redirect= param, and registration requires email verification before login — three steps of friction between 'I want this course' and seeing it." },
  { id: "S7", severity: "high", title: "Dead href=\"#\" social links on every page", location: "footer.tsx:32-51, socials.tsx", detail: "X, LinkedIn, and GitHub links go nowhere; JSON-LD sameAs is empty. Fix or remove." },
  { id: "S8", severity: "medium", title: "Course pages excluded from sitemap; JSON-LD only renders when logged in", location: "sitemap.ts, robots.ts", detail: "Highest-intent queries ('Part 107 online course') have no landing page. Follows from S1 — public course pages fix SEO too." },
  { id: "S9", severity: "medium", title: "No FAQ or guarantee anywhere", location: "site-wide", detail: "No answers to 'Is this enough to pass?', exam cost, refunds. FAQ + FAQPage schema is a trust and SEO win." },
  { id: "S10", severity: "medium", title: "Analytics lack funnel events", location: "lib/analytics.ts", detail: "Page/course/exam views exist but no signup_started, purchase_completed, consultation_submitted — the funnel being optimized isn't measurable." },
  { id: "S11", severity: "medium", title: "Three course-track cards all point at the same generic /courses list", location: "page.tsx:33-64", detail: "Two tracks appear aspirational. Give each a real destination or a waitlist that captures email." },
  { id: "S12", severity: "low", title: "B2B schools funnel is genuinely strong — reuse the pattern", location: "schools/page.tsx", detail: "Concrete claims, persistent Book-a-Call CTA, real lead form. Replicate this structure for the B2C course page." },
];

const maintFindings: Finding[] = [
  { id: "MA2", severity: "medium", title: "rebuild_unitN scripts removed", location: "assets/courses/faa-107/faa_107_course.json", detail: "Former one-off rebuild_unit*.py scripts deleted; course JSON is the single source. Still need a parameterized outline→JSON ingest and repo-vs-DB sync tool." },
  { id: "MA4", severity: "high", title: "Test coverage near zero on the risky paths", location: "backend/src/**/*.spec.ts, backend/test/", detail: "Two unit spec files; course.service.spec.ts imports a non-existent class and cannot pass. No tests for question import, exam generate/submit, or progress merge. Frontend has none." },
  { id: "MA1", severity: "medium", title: "Backend/frontend types drift (hand-duplicated)", location: "course.dto.ts vs drone lib/types/", detail: "Frontend Question lacks figure_ref; frontend CourseData has image_focal_point the backend doesn't declare. Generate frontend types from the Nest Swagger spec." },
  { id: "MA3", severity: "medium", title: "Docs drift from code", location: "docs/tech/exam-generator-and-course-linking.md, course-editing-roadmap.md", detail: "Docs say units 1-9 (unit 10 now exists), question counts are stale, and the roadmap proposes embedded-exam editing that Bundle B removed." },
  { id: "R3", severity: "medium", title: "CourseService.updateCourse is fragile", location: "course.service.ts:80-89", detail: "Assigns an M2M relation into repository.update() and has no null-check on the existing row (bad ID gives a TypeError, not a 404)." },
  { id: "R2", severity: "medium", title: "Dead/broken code accumulating", location: "course.controller.ts:171, course_question_mapper.py", detail: "Unused duplicate PATCH unit endpoint, dead mapper entries pointing at removed unit ids, a silently-overridden duplicate dict key, unused requestingUserId param." },
  { id: "MA5", severity: "low", title: "Repo hygiene: stray files and duplicated Next config", location: "repo root, drone/", detail: "combined.txt, build.log, empty workout/, __pycache__ at root; drone has both next.config.mjs and next.config.ts with diverged copies — delete one." },
  { id: "R1", severity: "low", title: "snake_case vs camelCase split by module age", location: "questions/* vs progress.entity.ts", detail: "Standardize with a naming strategy; the courses/progress modules read as an older, looser generation than the well-guarded questions module." },
];

const tabs = ["Overview", "Security", "Data Model", "Frontend", "Sales", "Maintainability"] as const;
type Tab = (typeof tabs)[number];

function sortFindings(f: Finding[]): Finding[] {
  return [...f].sort((a, b) => severityRank[a.severity] - severityRank[b.severity]);
}

function countBySeverity(all: Finding[][]): Record<Severity, number> {
  const counts: Record<Severity, number> = { critical: 0, high: 0, medium: 0, low: 0 };
  for (const group of all) for (const f of group) counts[f.severity] += 1;
  return counts;
}

function FindingsTable({ findings }: { findings: Finding[] }) {
  const sorted = sortFindings(findings);
  return (
    <Table
      headers={["ID", "Severity", "Finding", "Location"]}
      rows={sorted.map((f) => [
        f.id,
        <Pill key={f.id} tone={severityPillTone[f.severity]} size="sm">{f.severity}</Pill>,
        <Stack key={`${f.id}-t`} gap={4}>
          <Text weight="semibold" size="small">{f.title}</Text>
          <Text tone="secondary" size="small">{f.detail}</Text>
        </Stack>,
        <Text key={`${f.id}-l`} tone="tertiary" size="small" style={{ fontFamily: "monospace" }}>{f.location}</Text>,
      ])}
      rowTone={sorted.map((f) => severityRowTone[f.severity])}
      columnAlign={["left", "left", "left", "left"]}
    />
  );
}

function Overview() {
  const counts = countBySeverity([securityFindings, dataModelFindings, frontendFindings, salesFindings, maintFindings]);
  return (
    <Stack gap={20}>
      <Grid columns={4} gap={16}>
        <Stat value={counts.critical} label="Critical" tone="danger" />
        <Stat value={counts.high} label="High" tone="warning" />
        <Stat value={counts.medium} label="Medium" tone="info" />
        <Stat value={counts.low} label="Low" />
      </Grid>

      <Callout tone="danger" title="Fix this week">
        <Stack gap={6}>
          <Text size="small">1. Privilege escalation: any user can PATCH /users/me with {"{\"role\":\"admin\"}"} — harden the global ValidationPipe (Security C1).</Text>
          <Text size="small">2. Cross-tenant leak: any org manager can read every org's student rosters and scores (Security C2).</Text>
          <Text size="small">3. Rotate the DB password committed to terraform/database.tf and move it to Secrets Manager (Security C3).</Text>
          <Text size="small">4. Exam reuse ignores scope_ids, so students can be served the wrong unit's exam — a one-line query fix (Data Model H3).</Text>
          <Text size="small">5. A stale unit id deletes the user's entire progress row, wiping statuses and exam history (Data Model H4).</Text>
        </Stack>
      </Callout>

      <H2>Verdict by area</H2>
      <Stack gap={12}>
        <Row gap={8} align="start">
          <Pill tone="deleted" size="sm">Security</Pill>
          <Text size="small">Exam integrity mechanics are genuinely solid (server-side grading, answer-key stripping, verified Stripe webhooks). The weaknesses are authorization breadth and config hygiene — two trivially exploitable criticals plus a committed DB password.</Text>
        </Row>
        <Row gap={8} align="start">
          <Pill tone="warning" size="sm">Data model</Pill>
          <Text size="small">The digit-encoded unit ID convention is already broken for 13 live nodes (unit 10 decodes to unit 1), orphaned question links shipped in the bulk artifact, and two divergent progress services copy course content per user. Adopt string IDs + a course_units index table before authoring unit 11.</Text>
        </Row>
        <Row gap={8} align="start">
          <Pill tone="warning" size="sm">Frontend</Pill>
          <Text size="small">Keyboard/screen-reader users cannot open most lesson content or mark anything complete; unit pages are dead ends with the 197-node tree hidden in collapsed accordions; several surfaces break on one of the two themes.</Text>
        </Row>
        <Row gap={8} align="start">
          <Pill tone="info" size="sm">Sales</Pill>
          <Text size="small">Sales-ready for booking school consultations, not for selling courses to individuals: course pages are login-gated (invisible to prospects and Google), no price appears anywhere, no social proof, no email capture — while a production-grade Stripe flow sits unused behind a $0 price.</Text>
        </Row>
        <Row gap={8} align="start">
          <Pill tone="neutral" size="sm">Maintainability</Pill>
          <Text size="small">Sane monorepo layout, but content management via one-off rebuild scripts is unsustainable, hand-duplicated types drift between backend and frontend, and test coverage on the risky paths is near zero (one spec file cannot even compile).</Text>
        </Row>
      </Stack>

      <H2>Biggest single lever</H2>
      <Text size="small">
        A public, server-rendered course detail page (syllabus, price, outcomes, enroll CTA) fixes the top conversion
        blocker, the SEO gap, and the missing price display at once — the schools page already proves the team can build
        that page well.
      </Text>
    </Stack>
  );
}

function SecurityTab() {
  return (
    <Stack gap={16}>
      <Text size="small" tone="secondary">
        Full review of the NestJS backend (auth, guards, courses, questions/exams, progress, media, purchases, users,
        orgs, audit), the Next.js API client, pipeline.sh, and Terraform. Grading is server-side, is_correct is stripped
        before questions reach clients, the paywall redacts content, and Stripe webhooks verify signatures — the
        problems are authorization and configuration, not the core exam flow.
      </Text>
      <FindingsTable findings={securityFindings} />
      <Callout tone="info" title="Regression guard">
        Add two authorization integration tests: a regular user hitting admin routes, and a manager of Org A hitting Org
        B's class-exam endpoints.
      </Callout>
    </Stack>
  );
}

function DataModelTab() {
  return (
    <Stack gap={16}>
      <Text size="small" tone="secondary">
        Course content lives as a JSON string in courses.payload; questions, exams, exam_attempts, and progress all
        reference unit IDs from that payload by integer convention with no foreign key or validation. Five different
        places store copies of these convention-based IDs.
      </Text>

      <Card>
        <CardHeader>Entity relationships</CardHeader>
        <CardBody>
          <Stack gap={6}>
            <Text size="small"><Text as="span" weight="semibold">users</Text> —(M2M user_courses_purchased)— <Text as="span" weight="semibold">courses</Text>; users join <Text as="span" weight="semibold">organizations</Text> via organization_members.</Text>
            <Text size="small"><Text as="span" weight="semibold">courses.payload</Text> (varchar JSON string) holds the entire recursive unit tree — the source of truth for content.</Text>
            <Text size="small"><Text as="span" weight="semibold">questions</Text> link via course_id / unit_id / sub_unit_id integers — deliberately no FK, matched to the payload only by digit convention.</Text>
            <Text size="small"><Text as="span" weight="semibold">exams</Text> freeze question_ids[] and scope_ids[] (no FK); <Text as="span" weight="semibold">exam_attempts</Text> keep one row per (user, exam) with a JSONB section breakdown keyed by those same integers.</Text>
            <Text size="small"><Text as="span" weight="semibold">progress</Text> is the only module with real FKs — but stores a full per-user copy of the course payload plus denormalized exam_scores.</Text>
          </Stack>
        </CardBody>
      </Card>

      <FindingsTable findings={dataModelFindings} />

      <Callout tone="info" title="Recommended target model (before authoring unit 11)">
        <Stack gap={6}>
          <Text size="small">Give every node a stable string ID independent of position, keep the tree in the payload for authoring, and derive a normalized course_units index table (id, course_id, parent_id, legacy_id, path, depth, title, position) transactionally on course save.</Text>
          <Text size="small">Repoint questions and exam scopes at those refs, replace the per-user payload copy with a sparse unit-status map, and migrate in four steps: backfill course_units from legacy ids, backfill question refs (surfacing the known 12/41/45 orphans), migrate exam scopes, then swap progress storage.</Text>
          <Text size="small">Cheaper interim: validate IDs at import, walk the real tree instead of digit arithmetic, and fix the exam-reuse scope check — that closes the live bugs without schema change.</Text>
        </Stack>
      </Callout>
    </Stack>
  );
}

function FrontendTab() {
  return (
    <Stack gap={16}>
      <Text size="small" tone="secondary">
        Design, accessibility, and usability of the Next.js course experience. Worth keeping: skip link + main landmark,
        exam-player fieldset/legend/progressbar semantics, exam breadcrumbs, 44px touch targets, and auto-marking
        IN_PROGRESS on unit open. The gaps below are ordered by severity.
      </Text>
      <FindingsTable findings={frontendFindings} />
      <Callout tone="warning" title="Top fix">
        Keyboard access first: converting the section accordions to real buttons and labeling the StatusUpdater unblocks
        assistive-tech users from the entire lesson tree — everything else is secondary until content is reachable.
      </Callout>
    </Stack>
  );
}

function SalesTab() {
  return (
    <Stack gap={16}>
      <Text size="small" tone="secondary">
        Verdict: a polished B2B (schools/CTE) funnel bolted onto a broken B2C funnel. The consultation path works; the
        individual-buyer path dead-ends at a login wall before the prospect ever sees a syllabus or price.
      </Text>
      <FindingsTable findings={salesFindings} />
      <Grid columns={2} gap={16}>
        <Card>
          <CardHeader>Quick wins (hours)</CardHeader>
          <CardBody>
            <Stack gap={4}>
              <Text size="small">Swap hero CTA priority (Courses primary, Articles secondary)</Text>
              <Text size="small">Fix or remove the dead social links; populate JSON-LD sameAs</Text>
              <Text size="small">Show price / "Free" badge on course cards</Text>
              <Text size="small">Pass ?redirect= through AuthGuard → login → back to course</Text>
              <Text size="small">Add conversion events to the existing analytics.ts</Text>
              <Text size="small">Add the Google Search Console token already stubbed in layout.tsx</Text>
            </Stack>
          </CardBody>
        </Card>
        <Card>
          <CardHeader>Bigger investments</CardHeader>
          <CardBody>
            <Stack gap={4}>
              <Text size="small">Public, server-rendered course detail page — fixes conversion, SEO, and price display at once</Text>
              <Text size="small">Social proof program: testimonials, pass rate, instructor credentials</Text>
              <Text size="small">Pricing strategy: free-lead-magnet vs paid, with guarantee + FAQ</Text>
              <Text size="small">Email capture + drip (free practice exam as lead magnet)</Text>
              <Text size="small">Per-track landing pages or waitlists for Video and AI tracks</Text>
            </Stack>
          </CardBody>
        </Card>
      </Grid>
    </Stack>
  );
}

function MaintainabilityTab() {
  return (
    <Stack gap={16}>
      <Text size="small" tone="secondary">
        Monorepo organization, type duplication, doc accuracy, and code readability. The backend/drone/terraform/scripts
        split is sane and pipeline.sh is well-structured; the risks are content tooling, drift, and missing tests.
      </Text>
      <FindingsTable findings={maintFindings} />
    </Stack>
  );
}

export default function AppReview() {
  const [tab, setTab] = useCanvasState<Tab>("active-tab", "Overview");
  return (
    <Stack gap={16} style={{ padding: 20, maxWidth: 1100 }}>
      <H1>Website-Services App Review</H1>
      <Text tone="secondary" size="small">
        Four parallel reviews of the drone-course platform: security, course/exam data model, frontend
        (design + accessibility + usability), and sales readiness. Source: full-codebase reviews of backend/, drone/,
        scripts/, terraform/, and docs/ · July 2, 2026.
      </Text>
      <Row gap={8} wrap>
        {tabs.map((t) => (
          <Pill key={t} active={t === tab} onClick={() => setTab(t)}>{t}</Pill>
        ))}
      </Row>
      {tab === "Overview" && <Overview />}
      {tab === "Security" && <SecurityTab />}
      {tab === "Data Model" && <DataModelTab />}
      {tab === "Frontend" && <FrontendTab />}
      {tab === "Sales" && <SalesTab />}
      {tab === "Maintainability" && <MaintainabilityTab />}
    </Stack>
  );
}
