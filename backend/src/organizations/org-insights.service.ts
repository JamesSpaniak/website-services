import { Injectable, NotFoundException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import {
  MemberCourseProgressSummary,
  MemberEngagementRow,
  MemberQuizAttempt,
  MemberQuizHistory,
  MemberQuizSummary,
  MemberTimelineEvent,
  OrgEngagementResponse,
  OrgUtilizationResponse,
} from './types/organization.dto';

const HEARTBEAT_MINUTES = 0.5;

/**
 * Manager-facing engagement reads (docs/tech/manager-progress-visibility.md § 6).
 *
 * Everything here is a live query over `progress`, `video_progress`,
 * `product_events_daily` (completed days) and today's `product_events`
 * partition — never the nightly materialized views — so a teacher sees what
 * happened in class this morning. All queries are scoped by organization id
 * and the caller has already passed OrgManagerGuard.
 */
@Injectable()
export class OrgInsightsService {
  constructor(private readonly dataSource: DataSource) {}

  /**
   * Adds minutes_7d / videos / exams to the summary rows in two set queries
   * (one per source) rather than one query per member × course.
   */
  async enrichSummary(
    rows: MemberCourseProgressSummary[],
  ): Promise<MemberCourseProgressSummary[]> {
    if (!rows.length) return rows;
    const userIds = Array.from(new Set(rows.map((r) => r.user_id)));
    const courseIds = Array.from(new Set(rows.map((r) => r.course_id)));

    const [minutes, videos, videoTotals, exams] = await Promise.all([
      this.dataSource.query(
        `SELECT user_id, course_id, SUM(minutes)::numeric AS minutes FROM (
           SELECT user_id, course_id, minutes_engaged AS minutes
           FROM product_events_daily
           WHERE user_id = ANY($1::int[]) AND course_id = ANY($2::int[])
             AND day >= CURRENT_DATE - 6 AND day < CURRENT_DATE
           UNION ALL
           SELECT user_id, course_id, COUNT(*) * $3::numeric
           FROM product_events
           WHERE user_id = ANY($1::int[]) AND course_id = ANY($2::int[])
             AND event_name = 'lesson_heartbeat' AND occurred_at >= CURRENT_DATE::timestamptz
           GROUP BY user_id, course_id
         ) m GROUP BY user_id, course_id`,
        [userIds, courseIds, HEARTBEAT_MINUTES],
      ) as Promise<{ user_id: number; course_id: number; minutes: string }[]>,
      this.dataSource.query(
        `SELECT user_id, course_id, COUNT(*) FILTER (WHERE completed)::int AS completed
         FROM video_progress WHERE user_id = ANY($1::int[]) AND course_id = ANY($2::int[])
         GROUP BY user_id, course_id`,
        [userIds, courseIds],
      ) as Promise<{ user_id: number; course_id: number; completed: number }[]>,
      this.dataSource.query(
        `SELECT course_id, COUNT(*)::int AS total FROM course_units
         WHERE has_video AND course_id = ANY($1::int[]) GROUP BY course_id`,
        [courseIds],
      ) as Promise<{ course_id: number; total: number }[]>,
      this.dataSource.query(
        `SELECT user_id, course_id,
                COUNT(*)::int AS taken,
                MAX(score)::int AS best,
                (ARRAY_AGG(score ORDER BY submitted_at DESC))[1]::int AS latest,
                (ARRAY_AGG(score ORDER BY submitted_at ASC))[1]::int AS first,
                COUNT(DISTINCT COALESCE(scope_refs[1], exam_id::text))::int AS quizzes_attempted,
                COUNT(DISTINCT COALESCE(scope_refs[1], exam_id::text))
                  FILTER (WHERE score >= 70)::int AS quizzes_passed
         FROM exam_attempt_history
         WHERE user_id = ANY($1::int[]) AND course_id = ANY($2::int[])
         GROUP BY user_id, course_id`,
        [userIds, courseIds],
      ) as Promise<
        {
          user_id: number;
          course_id: number;
          taken: number;
          best: number;
          latest: number;
          first: number;
          quizzes_attempted: number;
          quizzes_passed: number;
        }[]
      >,
    ]);

    const key = (u: number, c: number) => `${u}-${c}`;
    const minutesMap = new Map(
      minutes.map((m) => [key(m.user_id, m.course_id), Number(m.minutes)]),
    );
    const videosMap = new Map(
      videos.map((v) => [key(v.user_id, v.course_id), v.completed]),
    );
    const totalsMap = new Map(videoTotals.map((t) => [t.course_id, t.total]));
    const examsMap = new Map(
      exams.map((e) => [key(e.user_id, e.course_id), e]),
    );

    for (const r of rows) {
      const k = key(r.user_id, r.course_id);
      r.minutes_7d = Math.round((minutesMap.get(k) ?? 0) * 10) / 10;
      r.videos_completed = videosMap.get(k) ?? 0;
      r.videos_total = totalsMap.get(r.course_id) ?? 0;
      const x = examsMap.get(k);
      r.exams_taken = x?.taken ?? 0;
      r.best_exam_score = x?.best ?? null;
      r.first_exam_score = x?.first ?? null;
      if (r.latest_exam_score == null && x?.latest != null) {
        r.latest_exam_score = x.latest;
      }
      r.quizzes_attempted = x?.quizzes_attempted ?? 0;
      r.quizzes_passed = x?.quizzes_passed ?? 0;
      r.effort = quizEffort(r);
    }
    return rows;
  }

  /** Per-unit video state for the detailed grid — one query per course. */
  async videoStateByUser(
    userIds: number[],
    courseId: number,
  ): Promise<
    Map<
      number,
      Record<
        string,
        {
          percent_watched: number;
          completed: boolean;
          position_seconds: number;
        }
      >
    >
  > {
    const out = new Map<
      number,
      Record<
        string,
        {
          percent_watched: number;
          completed: boolean;
          position_seconds: number;
        }
      >
    >();
    if (!userIds.length) return out;
    const rows: {
      user_id: number;
      unit_ref: string;
      percent_watched: number;
      completed: boolean;
      position_seconds: number;
    }[] = await this.dataSource.query(
      `SELECT user_id, unit_ref, percent_watched, completed, position_seconds
       FROM video_progress WHERE course_id = $1 AND user_id = ANY($2::int[])`,
      [courseId, userIds],
    );
    for (const r of rows) {
      const bucket = out.get(r.user_id) ?? {};
      bucket[r.unit_ref] = {
        percent_watched: Number(r.percent_watched),
        completed: !!r.completed,
        position_seconds: Number(r.position_seconds),
      };
      out.set(r.user_id, bucket);
    }
    return out;
  }

  /** Per-unit quiz best/latest for the lesson grid — one query per course. */
  async quizStateByUser(
    userIds: number[],
    courseId: number,
  ): Promise<
    Map<
      number,
      Record<
        string,
        {
          attempts: number;
          best: number;
          latest: number;
          passed: boolean;
          last_submitted_at: string | null;
        }
      >
    >
  > {
    const out = new Map<
      number,
      Record<
        string,
        {
          attempts: number;
          best: number;
          latest: number;
          passed: boolean;
          last_submitted_at: string | null;
        }
      >
    >();
    if (!userIds.length) return out;
    const rows: {
      user_id: number;
      unit_ref: string;
      attempts: number;
      best: number;
      latest: number;
      passed: boolean;
      last_submitted_at: Date | string | null;
    }[] = await this.dataSource.query(
      `SELECT h.user_id,
              COALESCE(NULLIF(h.scope_refs[1], ''), e.scope_refs[1], h.exam_id::text) AS unit_ref,
              COUNT(*)::int AS attempts,
              MAX(h.score)::int AS best,
              (ARRAY_AGG(h.score ORDER BY h.submitted_at DESC))[1]::int AS latest,
              BOOL_OR(h.score >= 70) AS passed,
              MAX(h.submitted_at) AS last_submitted_at
       FROM exam_attempt_history h
       LEFT JOIN exams e ON e.id = h.exam_id
       WHERE h.course_id = $1 AND h.user_id = ANY($2::int[])
       GROUP BY 1, 2`,
      [courseId, userIds],
    );
    for (const r of rows) {
      if (!r.unit_ref) continue;
      const bucket = out.get(r.user_id) ?? {};
      bucket[r.unit_ref] = {
        attempts: Number(r.attempts),
        best: Number(r.best),
        latest: Number(r.latest),
        passed: !!r.passed,
        last_submitted_at: r.last_submitted_at
          ? new Date(r.last_submitted_at).toISOString()
          : null,
      };
      out.set(r.user_id, bucket);
    }
    return out;
  }

  /** GET /organizations/:id/engagement?days=7|30 */
  async getEngagement(
    orgId: number,
    days: number,
    classId?: number,
  ): Promise<OrgEngagementResponse> {
    const d = Math.min(Math.max(days, 1), 90);
    const members: MemberEngagementRow[] = await this.dataSource.query(
      `WITH mem AS (
         SELECT m.user_id, m.class_id, u.username, u.first_name, u.last_name
         FROM organization_members m JOIN users u ON u.id = m.user_id
         WHERE m.organization_id = $1 AND m.role = 'member'
           AND ($2::int IS NULL OR m.class_id = $2)
       ),
       rolled AS (
         SELECT d.user_id,
                SUM(d.minutes_engaged)     AS minutes,
                SUM(d.lessons_viewed)      AS lessons_viewed,
                SUM(d.videos_completed)    AS videos_completed,
                SUM(d.units_completed)     AS units_completed,
                SUM(d.exams_submitted)     AS exams_submitted,
                COUNT(DISTINCT d.day)      AS active_days
         FROM product_events_daily d
         WHERE d.user_id IN (SELECT user_id FROM mem)
           AND d.day >= CURRENT_DATE - ($3::int - 1) AND d.day < CURRENT_DATE
         GROUP BY d.user_id
       ),
       today AS (
         SELECT pe.user_id,
                COUNT(*) FILTER (WHERE event_name = 'lesson_heartbeat') * $4::numeric AS minutes,
                COUNT(*) FILTER (WHERE event_name = 'lesson_viewed')     AS lessons_viewed,
                COUNT(*) FILTER (WHERE event_name = 'video_completed')   AS videos_completed,
                COUNT(*) FILTER (WHERE event_name IN ('unit_completed', 'lesson_completed')) AS units_completed,
                COUNT(*) FILTER (WHERE event_name = 'exam_submitted')    AS exams_submitted,
                CASE WHEN COUNT(*) > 0 THEN 1 ELSE 0 END                 AS active_days
         FROM product_events pe
         WHERE pe.user_id IN (SELECT user_id FROM mem)
           AND pe.occurred_at >= CURRENT_DATE::timestamptz
         GROUP BY pe.user_id
       )
       SELECT mem.user_id, mem.username, mem.first_name, mem.last_name, mem.class_id,
              ROUND(COALESCE(r.minutes, 0) + COALESCE(t.minutes, 0), 1)::float AS minutes,
              (COALESCE(r.lessons_viewed, 0) + COALESCE(t.lessons_viewed, 0))::int AS lessons_viewed,
              (COALESCE(r.videos_completed, 0) + COALESCE(t.videos_completed, 0))::int AS videos_completed,
              (COALESCE(r.units_completed, 0) + COALESCE(t.units_completed, 0))::int AS units_completed,
              (COALESCE(r.exams_submitted, 0) + COALESCE(t.exams_submitted, 0))::int AS exams_submitted,
              (COALESCE(r.active_days, 0) + COALESCE(t.active_days, 0))::int AS active_days,
              (SELECT MAX(p.last_activity_at) FROM progress p WHERE p."userId" = mem.user_id) AS last_activity_at
       FROM mem
       LEFT JOIN rolled r ON r.user_id = mem.user_id
       LEFT JOIN today  t ON t.user_id = mem.user_id
       ORDER BY minutes DESC, mem.username`,
      [orgId, classId ?? null, d, HEARTBEAT_MINUTES],
    );

    const series: { day: string; minutes: number; active_members: number }[] =
      await this.dataSource.query(
        `SELECT to_char(day, 'YYYY-MM-DD') AS day,
                ROUND(SUM(minutes), 1)::float AS minutes,
                COUNT(DISTINCT user_id)::int AS active_members
         FROM (
           SELECT d.day, d.user_id, d.minutes_engaged AS minutes
           FROM product_events_daily d
           JOIN organization_members m ON m.user_id = d.user_id AND m.organization_id = $1 AND m.role = 'member'
           WHERE d.day >= CURRENT_DATE - ($2::int - 1) AND d.day < CURRENT_DATE
             AND ($3::int IS NULL OR m.class_id = $3)
           UNION ALL
           SELECT CURRENT_DATE, pe.user_id, COUNT(*) * $4::numeric
           FROM product_events pe
           JOIN organization_members m ON m.user_id = pe.user_id AND m.organization_id = $1 AND m.role = 'member'
           WHERE pe.event_name = 'lesson_heartbeat' AND pe.occurred_at >= CURRENT_DATE::timestamptz
             AND ($3::int IS NULL OR m.class_id = $3)
           GROUP BY pe.user_id
         ) s
         GROUP BY day ORDER BY day`,
        [orgId, d, classId ?? null, HEARTBEAT_MINUTES],
      );

    return { days: d, members, series };
  }

  /** GET /organizations/:id/utilization — live, not the nightly view. */
  async getUtilization(orgId: number): Promise<OrgUtilizationResponse> {
    const rows: (OrgUtilizationResponse & { stalled_member_ids: number[] })[] =
      await this.dataSource.query(
        `SELECT o.id AS organization_id,
                o.max_students AS seats_purchased,
                (SELECT COUNT(*)::int FROM organization_members m WHERE m.organization_id = o.id AND m.role = 'member') AS members,
                (SELECT COUNT(*)::int FROM invite_codes ic WHERE ic.organization_id = o.id) AS invites_sent,
                (SELECT COUNT(*)::int FROM invite_codes ic WHERE ic.organization_id = o.id AND ic.used_by_user_id IS NOT NULL) AS invites_redeemed,
                COALESCE(mp.members_activated, 0)   AS members_activated,
                COALESCE(mp.members_engaged_7d, 0)  AS members_engaged_7d,
                COALESCE(mp.members_engaged_30d, 0) AS members_engaged_30d,
                COALESCE(mp.members_completed, 0)   AS members_completed,
                COALESCE(mp.avg_pct_complete, 0)    AS avg_pct_complete,
                COALESCE(mp.stalled_member_ids, '{}'::int[]) AS stalled_member_ids,
                ROUND(COALESCE(hrs.minutes_total, 0) / 60.0, 1)::float AS hours_engaged_total,
                ROUND(COALESCE(hrs.minutes_30d, 0) / 60.0, 1)::float   AS hours_engaged_30d,
                CASE WHEN o.max_students > 0
                     THEN ROUND(100.0 * COALESCE(mp.members_engaged_30d, 0) / o.max_students)::int ELSE 0 END AS utilization_pct_30d,
                (SELECT COUNT(*)::int FROM organization_courses oc WHERE oc."organizationsId" = o.id) AS courses_assigned
         FROM organizations o
         LEFT JOIN LATERAL (
           SELECT COUNT(*) FILTER (WHERE s.has_progress)::int AS members_activated,
                  COUNT(*) FILTER (WHERE s.last_activity_at >= now() - interval '7 days')::int  AS members_engaged_7d,
                  COUNT(*) FILTER (WHERE s.last_activity_at >= now() - interval '30 days')::int AS members_engaged_30d,
                  COUNT(*) FILTER (WHERE s.completed_courses > 0)::int AS members_completed,
                  ROUND(AVG(COALESCE(s.avg_pct, 0)))::int AS avg_pct_complete,
                  ARRAY_REMOVE(ARRAY_AGG(CASE WHEN s.last_activity_at IS NULL OR s.last_activity_at < now() - interval '14 days'
                                              THEN s.user_id END), NULL) AS stalled_member_ids
           FROM (
             SELECT m.user_id,
                    COUNT(p.id) > 0 AS has_progress,
                    MAX(p.last_activity_at) AS last_activity_at,
                    COUNT(*) FILTER (WHERE p.status = 'COMPLETED') AS completed_courses,
                    AVG(CASE WHEN p.units_total > 0 THEN 100.0 * p.units_completed / p.units_total END) AS avg_pct
             FROM organization_members m
             LEFT JOIN progress p ON p."userId" = m.user_id
               AND p."courseId" IN (SELECT oc."coursesId" FROM organization_courses oc WHERE oc."organizationsId" = o.id)
             WHERE m.organization_id = o.id AND m.role = 'member'
             GROUP BY m.user_id
           ) s
         ) mp ON true
         LEFT JOIN LATERAL (
           SELECT SUM(minutes_engaged) AS minutes_total,
                  SUM(minutes_engaged) FILTER (WHERE day >= CURRENT_DATE - 30) AS minutes_30d
           FROM product_events_daily d WHERE d.organization_id = o.id
         ) hrs ON true
         WHERE o.id = $1`,
        [orgId],
      );
    return rows[0];
  }

  /** GET /organizations/:id/members/:userId/timeline — last 30 days of events. */
  async getMemberTimeline(
    orgId: number,
    userId: number,
    limit = 200,
  ): Promise<MemberTimelineEvent[]> {
    return this.dataSource.query(
      `SELECT pe.occurred_at, pe.event_name, pe.course_id, c.title AS course_title,
              pe.unit_ref, cu.title AS unit_title, pe.properties
       FROM product_events pe
       JOIN organization_members m ON m.user_id = pe.user_id AND m.organization_id = $1
       LEFT JOIN courses c ON c.id = pe.course_id
       LEFT JOIN course_units cu ON cu.course_id = pe.course_id AND cu.ref = pe.unit_ref
       WHERE pe.user_id = $2 AND pe.occurred_at >= now() - interval '30 days'
         AND pe.event_name <> 'lesson_heartbeat'
       ORDER BY pe.occurred_at DESC
       LIMIT $3`,
      [orgId, userId, Math.min(limit, 500)],
    );
  }

  /**
   * GET /organizations/:id/members/:userId/exams — gradebook + attempt history.
   * Scoped to org members so a manager cannot read another school's quizzes.
   */
  async getMemberQuizHistory(
    orgId: number,
    userId: number,
  ): Promise<MemberQuizHistory> {
    const [member] = await this.dataSource.query(
      `SELECT user_id FROM organization_members
       WHERE organization_id = $1 AND user_id = $2 LIMIT 1`,
      [orgId, userId],
    );
    if (!member) throw new NotFoundException('Member not found in this organization.');

    const lessonTitleSql = `COALESCE(
      NULLIF((
        SELECT string_agg(COALESCE(cu.title, u.ref), ' · ' ORDER BY u.ord)
        FROM unnest(COALESCE(h.scope_refs, e.scope_refs, '{}'::varchar[]))
             WITH ORDINALITY AS u(ref, ord)
        LEFT JOIN course_units cu ON cu.course_id = h.course_id AND cu.ref = u.ref
      ), ''),
      CASE COALESCE(h.scope, e.scope) WHEN 'full_course' THEN 'Full course'
           ELSE COALESCE(h.scope, e.scope, 'quiz') END
    )`;

    const [attempts, starts, minutes, activity] = await Promise.all([
      this.dataSource.query(
        `SELECT h.id, h.exam_id, h.course_id, c.title AS course_title,
                COALESCE(h.scope, e.scope) AS scope,
                COALESCE(h.exam_pool, e.exam_pool) AS exam_pool,
                COALESCE(h.scope_refs, e.scope_refs, '{}'::varchar[]) AS scope_refs,
                ${lessonTitleSql} AS title,
                h.attempt_no, h.score,
                (h.score >= 70) AS passed, h.submitted_at, h.section_breakdown
         FROM exam_attempt_history h
         LEFT JOIN exams e ON e.id = h.exam_id
         LEFT JOIN courses c ON c.id = h.course_id
         WHERE h.user_id = $1
         ORDER BY h.submitted_at DESC`,
        [userId],
      ) as Promise<MemberQuizAttempt[]>,
      this.dataSource.query(
        `SELECT
           COUNT(*) FILTER (WHERE pe.event_name IN ('exam_start', 'exam_started'))::int AS starts,
           COUNT(*) FILTER (WHERE pe.event_name IN ('exam_submit', 'exam_submitted'))::int AS submits
         FROM product_events pe
         WHERE pe.user_id = $1 AND pe.occurred_at >= now() - interval '30 days'`,
        [userId],
      ) as Promise<{ starts: number; submits: number }[]>,
      this.dataSource.query(
        `SELECT COALESCE(SUM(minutes), 0)::float AS minutes FROM (
           SELECT minutes_engaged AS minutes FROM product_events_daily
           WHERE user_id = $1 AND day >= CURRENT_DATE - 6 AND day < CURRENT_DATE
           UNION ALL
           SELECT COUNT(*) * $2::numeric FROM product_events
           WHERE user_id = $1 AND event_name = 'lesson_heartbeat'
             AND occurred_at >= CURRENT_DATE::timestamptz
         ) s`,
        [userId, HEARTBEAT_MINUTES],
      ) as Promise<{ minutes: number }[]>,
      this.dataSource.query(
        `SELECT MAX(last_activity_at) AS last_activity_at FROM progress WHERE "userId" = $1`,
        [userId],
      ) as Promise<{ last_activity_at: Date | null }[]>,
    ]);

    const byKey = new Map<string, MemberQuizAttempt[]>();
    for (const a of attempts) {
      const ref = a.scope_refs?.[0] || '';
      const k = `${a.course_id}|${a.scope}|${ref}`;
      const list = byKey.get(k) ?? [];
      list.push(a);
      byKey.set(k, list);
    }
    const quizzes: MemberQuizSummary[] = Array.from(byKey.values()).map((list) => {
      const newest = list[0];
      const oldest = list[list.length - 1];
      const scores = list.map((x) => Number(x.score));
      return {
        course_id: newest.course_id,
        course_title: newest.course_title,
        scope: newest.scope,
        exam_pool: newest.exam_pool,
        scope_ref: newest.scope_refs?.[0] || '',
        title: newest.title,
        attempts: list.length,
        best: Math.max(...scores),
        latest: Number(newest.score),
        first: Number(oldest.score),
        passed: list.some((x) => x.passed),
        last_submitted_at: newest.submitted_at,
      };
    });
    quizzes.sort(
      (a, b) =>
        new Date(b.last_submitted_at).getTime() -
        new Date(a.last_submitted_at).getTime(),
    );

    const startsRow = starts[0] ?? { starts: 0, submits: 0 };
    const minutes7d = Math.round((Number(minutes[0]?.minutes) || 0) * 10) / 10;
    const lastAt = activity[0]?.last_activity_at ?? attempts[0]?.submitted_at ?? null;
    const best = quizzes.reduce((m, q) => Math.max(m, Number(q.best) || 0), 0);
    const taken = attempts.length;
    const chronological = [...attempts].sort(
      (a, b) => new Date(a.submitted_at).getTime() - new Date(b.submitted_at).getTime(),
    );

    return {
      effort: quizEffort({
        best_exam_score: taken ? best : null,
        exams_taken: taken,
        first_exam_score: chronological[0] ? Number(chronological[0].score) : null,
        latest_exam_score: chronological.length
          ? Number(chronological[chronological.length - 1].score)
          : null,
        minutes_7d: minutes7d,
        last_activity_at: lastAt,
      }),
      minutes_7d: minutes7d,
      exam_starts_30d: Number(startsRow.starts) || 0,
      exam_submits_30d: Number(startsRow.submits) || 0,
      quizzes,
      attempts,
    };
  }

  /** CSV for the class report: one row per member × course. */
  toCsv(rows: MemberCourseProgressSummary[]): string {
    const header = [
      'user_id',
      'username',
      'first_name',
      'last_name',
      'class_id',
      'course_id',
      'course_title',
      'status',
      'units_completed',
      'units_total',
      'pct_complete',
      'videos_completed',
      'videos_total',
      'minutes_7d',
      'exams_taken',
      'best_exam_score',
      'latest_exam_score',
      'quizzes_passed',
      'quizzes_attempted',
      'effort',
      'started_at',
      'completed_at',
      'last_activity_at',
    ];
    const esc = (v: unknown): string => {
      if (v == null) return '';
      const s = v instanceof Date ? v.toISOString() : String(v);
      return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const lines = rows.map((r) =>
      [
        r.user_id,
        r.username,
        r.first_name ?? '',
        r.last_name ?? '',
        r.class_id ?? '',
        r.course_id,
        r.course_title,
        r.status,
        r.units_completed,
        r.units_total,
        r.units_total > 0
          ? Math.round((100 * r.units_completed) / r.units_total)
          : 0,
        r.videos_completed,
        r.videos_total,
        r.minutes_7d,
        r.exams_taken,
        r.best_exam_score ?? '',
        r.latest_exam_score ?? '',
        r.quizzes_passed,
        r.quizzes_attempted,
        r.effort,
        r.started_at,
        r.completed_at,
        r.last_activity_at,
      ]
        .map(esc)
        .join(','),
    );
    return [header.join(','), ...lines].join('\n') + '\n';
  }
}

function isRecent(iso: Date | string | null | undefined, days: number): boolean {
  if (!iso) return false;
  const t = new Date(iso).getTime();
  if (!Number.isFinite(t)) return false;
  return Date.now() - t <= days * 86400000;
}

/**
 * Teacher-facing effort label — "are they trying, or do they need a nudge?"
 * passing: any quiz ≥70. struggling: 2+ fails, not improving. trying: failing
 * but still active. stopped: failed then went quiet. browsing: in the course,
 * no quiz submitted. not_trying: quiet and no quizzes.
 */
export function quizEffort(r: {
  best_exam_score: number | null;
  exams_taken: number;
  first_exam_score: number | null;
  latest_exam_score: number | null;
  minutes_7d: number;
  last_activity_at: Date | string | null;
}): string {
  const recent = isRecent(r.last_activity_at, 7) || r.minutes_7d > 0;
  if ((r.best_exam_score ?? 0) >= 70) return 'passing';
  if (r.exams_taken === 0) return recent ? 'browsing' : 'not_trying';
  const improving =
    r.first_exam_score != null &&
    r.latest_exam_score != null &&
    r.latest_exam_score > r.first_exam_score;
  if (r.exams_taken >= 2 && !improving) return recent ? 'struggling' : 'stopped';
  if (!recent) return 'stopped';
  return 'trying';
}
