/**
 * One definition of the teacher-facing engagement counts, shared by the
 * nightly rollup (product_events_daily) and the live "today" queries in
 * OrgInsightsService — so yesterday's rolled-up number and today's live
 * number can never disagree on what they count (R6, R20 in
 * docs/tech/progress-tracking-accuracy.md § 4).
 *
 * Every expression aggregates product_events rows aliased `pe`, and is meant
 * to be grouped by (user_id, course_id[, day]):
 *   minutes          distinct 30 s heartbeat buckets × 0.5 — a second open
 *                    window or a re-sent heartbeat adds nothing
 *   lessons_viewed   distinct lessons opened (reloads count once)
 *   videos_completed distinct videos completed
 *   units_completed  distinct units/lessons completed (status toggles count once)
 *   exams_submitted  submissions (each attempt is real work)
 */
export const HEARTBEAT_SECONDS = 30;
export const HEARTBEAT_MINUTES = HEARTBEAT_SECONDS / 60;

const heartbeatBucket = `floor(extract(epoch FROM pe.occurred_at) / ${HEARTBEAT_SECONDS})`;

export const ENGAGEMENT_SQL = {
  minutes: `(COUNT(DISTINCT ${heartbeatBucket}) FILTER (WHERE pe.event_name = 'lesson_heartbeat') * ${HEARTBEAT_MINUTES})::numeric`,
  lessonsViewed: `COUNT(DISTINCT pe.unit_ref) FILTER (WHERE pe.event_name = 'lesson_viewed')`,
  videosCompleted: `COUNT(DISTINCT pe.unit_ref) FILTER (WHERE pe.event_name = 'video_completed')`,
  unitsCompleted: `COUNT(DISTINCT pe.unit_ref) FILTER (WHERE pe.event_name IN ('unit_completed', 'lesson_completed'))`,
  examsSubmitted: `COUNT(*) FILTER (WHERE pe.event_name IN ('exam_submitted', 'exam_submit'))`,
} as const;

// ── Org-local days (PTD4) ──────────────────────────────────────────────────
// `tz` is a SQL expression holding an IANA zone — a bound param such as
// `$3::text` or a column such as `o.timezone`. Rollup rows of org members are
// keyed by the org's local date; everyone else by the UTC date.

/** Today's date in `tz`. */
export const localToday = (tz: string) => `(now() AT TIME ZONE ${tz})::date`;

/** Start (timestamptz) of the local day `daysAgo` days before today in `tz`. */
export const localDayStart = (tz: string, daysAgo: number | string = 0) =>
  `((${localToday(tz)} - (${daysAgo})::int)::timestamp AT TIME ZONE ${tz})`;

/** Local date of a timestamptz expression in `tz`. */
export const localDayOf = (ts: string, tz: string) =>
  `(${ts} AT TIME ZONE ${tz})::date`;

/**
 * Teacher reads take today and yesterday (local) from raw product_events and
 * older days from product_events_daily. The hourly rollup has always closed
 * a local day by the time it is two days old, whereas yesterday may have
 * ended minutes ago — so the split never shows a half-rolled day.
 */
export const RAW_RECENT_DAYS = 2;

/** Members' org-assigned courses — the only courses teacher views count (PTD5). */
export const orgCoursesSql = (orgParam: string) =>
  `(SELECT oc."coursesId" FROM organization_courses oc WHERE oc."organizationsId" = ${orgParam})`;
