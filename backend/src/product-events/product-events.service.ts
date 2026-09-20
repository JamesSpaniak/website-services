import { Injectable, Logger } from '@nestjs/common';
import { metrics } from '@opentelemetry/api';
import { DataSource } from 'typeorm';
import {
  AnalyticsEventDto,
  isAnonymousStoredEvent,
  isCourseScopedEvent,
  isVideoEvent,
  ProductEventName,
  ServerEventInput,
  VideoResume,
} from './types/product-event.dto';

/** Below this share of the video, "resume" is not offered; above 95 % we restart. */
export const VIDEO_COMPLETE_PCT = 90;
const RANGE_CAP = 200;
const CONTEXT_TTL_MS = 5 * 60_000;
const CONTEXT_CACHE_MAX = 20_000;
const CLOCK_SKEW_MS = 5 * 60_000;
const HEARTBEAT_MINUTES = 0.5;

interface EventContext {
  organizationId: number | null;
  classId: number | null;
  entitlementSource: string | null;
  hasAccess: boolean;
}

interface PreparedRow {
  user_id: number | null;
  anonymous_id: string | null;
  session_id: string | null;
  organization_id: number | null;
  class_id: number | null;
  event_name: string;
  occurred_at: Date;
  course_id: number | null;
  unit_ref: string | null;
  entitlement_source: string | null;
  properties: Record<string, unknown>;
  source: 'web' | 'server';
  event_id: string | null;
}

/**
 * Single write path for behavioral events (docs/tech/analytics-implementation-plan.md § 4.3).
 *
 *   client batch → recordBatch() → one multi-row INSERT into product_events
 *                                 → video_progress upsert for video events
 *                                 → progress.last_activity_at bump (throttled)
 *
 * Context (org, class, entitlement source, access) is resolved with one query
 * per (user, course) and cached in-process for 5 minutes, so a 30-second
 * heartbeat batch costs ~1 query rather than 5 per event.
 *
 * Observability (bounded labels only — no ids, paths or user dimensions):
 *   product_events.accepted{source}          rows written
 *   product_events.dropped{reason}           rows intentionally not written
 *   product_events.failures{stage}           writes that threw (insert, video_progress, progress_touch, server)
 * Alert on `accepted` flat-lining during school hours and on any `failures`.
 */
@Injectable()
export class ProductEventsService {
  private readonly logger = new Logger(ProductEventsService.name);
  private readonly contextCache = new Map<
    string,
    { ctx: EventContext; expires: number }
  >();

  private readonly meter = metrics.getMeter('droneedge');
  private readonly accepted = this.meter.createCounter(
    'product_events.accepted',
    { description: 'Product events written to product_events' },
  );
  private readonly dropped = this.meter.createCounter(
    'product_events.dropped',
    { description: 'Product events dropped by ingest policy' },
  );
  private readonly failures = this.meter.createCounter(
    'product_events.failures',
    { description: 'Product event writes that threw' },
  );

  constructor(private readonly dataSource: DataSource) {}

  /** Lets the controller count a whole-batch failure without owning a meter. */
  countFailure(
    stage: 'batch' | 'insert' | 'video_progress' | 'progress_touch' | 'server',
  ): void {
    this.failures.add(1, { stage });
  }

  // ── Client path ─────────────────────────────────────────────────────────

  /**
   * Records a batch from the browser. Anonymous course-scoped events and
   * events for courses the user cannot access are dropped silently.
   * Returns the number of rows written.
   */
  async recordBatch(
    userId: number | null,
    events: AnalyticsEventDto[],
    anonymousId: string | null = null,
  ): Promise<number> {
    const now = Date.now();
    const rows: PreparedRow[] = [];
    const videoUpdates: AnalyticsEventDto[] = [];
    const touchedCourses = new Set<number>();

    for (const ev of events) {
      if (!ev.event) {
        this.dropped.add(1, { reason: 'invalid' });
        continue;
      }
      // Anonymous traffic is counted in OTel only unless the client sent a
      // first-party anonymous id, and even then only intent events are kept
      // (keeps product_events bounded — no crawler page views).
      if (userId == null) {
        if (!anonymousId || !isAnonymousStoredEvent(ev.event)) {
          this.dropped.add(1, { reason: 'anonymous' });
          continue;
        }
      }
      const courseScoped = isCourseScopedEvent(ev.event);
      if (courseScoped && (userId == null || !ev.courseId)) {
        this.dropped.add(1, { reason: 'course_scoped_anonymous' });
        continue;
      }

      let ctx: EventContext | null = null;
      if (userId != null && ev.courseId) {
        ctx = await this.resolveContext(userId, ev.courseId);
        if (courseScoped && !ctx.hasAccess) {
          this.dropped.add(1, { reason: 'no_access' });
          continue;
        }
      } else if (userId != null) {
        ctx = await this.resolveContext(userId, null);
      }

      // Identity stitch: the one authenticated row that also carries the
      // anonymous id, so pre-login rows can be joined to the user (cookbook
      // Q3.7). Skipped for org members — student browsing stays unlinked (PD23).
      const isIdentify = ev.event === 'identified';
      const stitchId = isIdentify
        ? String(ev.properties?.anonymous_id ?? anonymousId ?? '').slice(
            0,
            64,
          ) || null
        : null;
      if (isIdentify && (userId == null || !stitchId || ctx?.organizationId)) {
        this.dropped.add(1, { reason: 'identify_skipped' });
        continue;
      }

      rows.push({
        user_id: userId,
        anonymous_id: userId == null ? anonymousId : stitchId,
        session_id: ev.sessionId ?? null,
        organization_id: ctx?.organizationId ?? null,
        class_id: ctx?.classId ?? null,
        event_name: ev.event,
        occurred_at: this.clampTime(ev.occurredAt, now),
        course_id: ev.courseId ?? null,
        unit_ref: ev.unitRef ?? null,
        entitlement_source: ev.courseId
          ? (ctx?.entitlementSource ?? null)
          : null,
        properties: this.pickProperties(ev),
        source: 'web',
        event_id: ev.eventId ?? null,
      });

      if (userId != null && ev.courseId) {
        if (
          isVideoEvent(ev.event) ||
          (ev.event === 'lesson_heartbeat' && ev.position != null)
        ) {
          videoUpdates.push(ev);
        }
        touchedCourses.add(ev.courseId);
      }
    }

    if (rows.length === 0) return 0;

    try {
      await this.insertRows(rows);
    } catch (err) {
      this.failures.add(1, { stage: 'insert' });
      throw err;
    }
    this.accepted.add(rows.length, { source: 'web' });

    if (userId != null) {
      for (const ev of videoUpdates) {
        await this.applyVideoUpdate(userId, ev).catch((err) => {
          this.failures.add(1, { stage: 'video_progress' });
          this.logger.warn(
            `video_progress upsert failed: ${(err as Error).message}`,
          );
        });
      }
      for (const courseId of touchedCourses) {
        await this.touchProgress(userId, courseId).catch((err) => {
          this.failures.add(1, { stage: 'progress_touch' });
          this.logger.warn(`progress touch failed: ${(err as Error).message}`);
        });
      }
    }
    return rows.length;
  }

  // ── Server path ─────────────────────────────────────────────────────────

  /** Fire-and-forget server-side event; never throws into business logic. */
  async record(input: ServerEventInput): Promise<void> {
    try {
      let ctx: EventContext | null = null;
      if (
        input.userId != null &&
        (input.organizationId === undefined ||
          input.entitlementSource === undefined)
      ) {
        ctx = await this.resolveContext(input.userId, input.courseId ?? null);
      }
      await this.insertRows([
        {
          user_id: input.userId,
          anonymous_id: null,
          session_id: null,
          organization_id: input.organizationId ?? ctx?.organizationId ?? null,
          class_id: input.classId ?? ctx?.classId ?? null,
          event_name: input.event,
          occurred_at: input.occurredAt ?? new Date(),
          course_id: input.courseId ?? null,
          unit_ref: input.unitRef ?? null,
          entitlement_source:
            input.entitlementSource ??
            (input.courseId ? (ctx?.entitlementSource ?? null) : null),
          properties: input.properties ?? {},
          source: 'server',
          event_id: null,
        },
      ]);
      this.accepted.add(1, { source: 'server' });
    } catch (err) {
      this.failures.add(1, { stage: 'server' });
      this.logger.error(
        `Failed to record server event ${input.event}: ${(err as Error).message}`,
      );
    }
  }

  // ── Reads used by other modules ─────────────────────────────────────────

  async getVideoResume(
    userId: number,
    courseId: number,
    unitRef: string,
  ): Promise<VideoResume | null> {
    const rows: {
      position_seconds: number;
      percent_watched: number;
      completed: boolean;
    }[] = await this.dataSource.query(
      `SELECT position_seconds, percent_watched, completed
       FROM video_progress WHERE user_id = $1 AND course_id = $2 AND unit_ref = $3`,
      [userId, courseId, unitRef],
    );
    if (!rows.length) return null;
    return {
      position_seconds: Number(rows[0].position_seconds),
      percent_watched: Number(rows[0].percent_watched),
      completed: !!rows[0].completed,
    };
  }

  async getCourseVideoProgress(
    userId: number,
    courseId: number,
  ): Promise<
    {
      unit_ref: string;
      position_seconds: number;
      percent_watched: number;
      completed: boolean;
      duration_seconds: number | null;
    }[]
  > {
    return this.dataSource.query(
      `SELECT unit_ref, position_seconds, percent_watched, completed, duration_seconds
       FROM video_progress WHERE user_id = $1 AND course_id = $2 ORDER BY unit_ref`,
      [userId, courseId],
    );
  }

  /** Drops the cached context for a user (call after grants / revokes / org changes). */
  invalidateUser(userId: number): void {
    for (const key of this.contextCache.keys()) {
      if (key.startsWith(`${userId}:`)) this.contextCache.delete(key);
    }
  }

  // ── Internals ───────────────────────────────────────────────────────────

  private async insertRows(rows: PreparedRow[]): Promise<void> {
    const cols = [
      'user_id',
      'anonymous_id',
      'session_id',
      'organization_id',
      'class_id',
      'event_name',
      'occurred_at',
      'course_id',
      'unit_ref',
      'entitlement_source',
      'properties',
      'source',
      'event_id',
    ] as const;
    const values: unknown[] = [];
    const tuples = rows.map((r, i) => {
      const base = i * cols.length;
      values.push(
        r.user_id,
        r.anonymous_id,
        r.session_id,
        r.organization_id,
        r.class_id,
        r.event_name,
        r.occurred_at,
        r.course_id,
        r.unit_ref,
        r.entitlement_source,
        JSON.stringify(r.properties ?? {}),
        r.source,
        r.event_id,
      );
      return `(${cols.map((_, j) => `$${base + j + 1}`).join(', ')})`;
    });
    await this.dataSource.query(
      `INSERT INTO product_events (${cols.join(', ')}) VALUES ${tuples.join(', ')}
       ON CONFLICT DO NOTHING`,
      values,
    );
  }

  private async resolveContext(
    userId: number,
    courseId: number | null,
  ): Promise<EventContext> {
    const key = `${userId}:${courseId ?? 0}`;
    const cached = this.contextCache.get(key);
    if (cached && cached.expires > Date.now()) return cached.ctx;

    const rows: {
      role: string | null;
      pro_exp: Date | null;
      organization_id: number | null;
      class_id: number | null;
      purchase_source: string | null;
      org_course: boolean;
    }[] = await this.dataSource.query(
      `SELECT u.role, u.pro_membership_expires_at AS pro_exp,
              m.organization_id, m.class_id,
              (SELECT ucp.source FROM user_courses_purchased ucp
                WHERE ucp."usersId" = $1 AND ucp."coursesId" = $2 LIMIT 1) AS purchase_source,
              EXISTS (SELECT 1 FROM organization_courses oc
                       WHERE oc."organizationsId" = m.organization_id AND oc."coursesId" = $2) AS org_course
       FROM users u
       LEFT JOIN LATERAL (
         SELECT organization_id, class_id FROM organization_members om
         WHERE om.user_id = u.id ORDER BY om.joined_at LIMIT 1
       ) m ON true
       WHERE u.id = $1`,
      [userId, courseId ?? -1],
    );

    let ctx: EventContext;
    if (!rows.length) {
      ctx = {
        organizationId: null,
        classId: null,
        entitlementSource: null,
        hasAccess: false,
      };
    } else {
      const r = rows[0];
      const isAdmin = r.role === 'admin';
      const isPro =
        r.role === 'pro' && !!r.pro_exp && new Date(r.pro_exp) > new Date();
      const paidDirect =
        r.purchase_source === 'purchase' || r.purchase_source === 'bundle';
      // Attribution precedence (plan § 2.3): purchase/bundle > pro > org_seat > free grants.
      const entitlementSource = paidDirect
        ? r.purchase_source
        : isPro
          ? 'pro'
          : r.org_course
            ? 'org_seat'
            : (r.purchase_source ?? (isAdmin ? 'admin' : null));
      ctx = {
        organizationId: r.organization_id ?? null,
        classId: r.class_id ?? null,
        entitlementSource: courseId ? entitlementSource : null,
        hasAccess:
          courseId == null ||
          isAdmin ||
          isPro ||
          !!r.purchase_source ||
          !!r.org_course,
      };
    }

    if (this.contextCache.size >= CONTEXT_CACHE_MAX) {
      // Cheap eviction: drop the oldest quarter.
      const keys = Array.from(this.contextCache.keys()).slice(
        0,
        CONTEXT_CACHE_MAX / 4,
      );
      for (const k of keys) this.contextCache.delete(k);
    }
    this.contextCache.set(key, { ctx, expires: Date.now() + CONTEXT_TTL_MS });
    return ctx;
  }

  private clampTime(iso: string | undefined, nowMs: number): Date {
    if (!iso) return new Date(nowMs);
    const t = new Date(iso).getTime();
    if (Number.isNaN(t)) return new Date(nowMs);
    const clamped = Math.min(
      Math.max(t, nowMs - CLOCK_SKEW_MS),
      nowMs + CLOCK_SKEW_MS,
    );
    return new Date(clamped);
  }

  private pickProperties(ev: AnalyticsEventDto): Record<string, unknown> {
    const props: Record<string, unknown> = { ...(ev.properties ?? {}) };
    if (ev.path) props.path = ev.path;
    if (ev.referrer) props.referrer = ev.referrer;
    if (ev.contentId) props.content_id = ev.contentId;
    if (ev.title) props.title = ev.title;
    if (ev.position != null) props.position = ev.position;
    if (ev.duration != null) props.duration = ev.duration;
    if (ev.playing != null) props.playing = ev.playing;
    if (ev.offerId) props.offer_id = ev.offerId;
    if (ev.placement) props.placement = ev.placement;
    if (ev.feature) props.feature = ev.feature;
    return props;
  }

  /**
   * Merges the client's watched-range delta into video_progress and recomputes
   * % watched as the union of ranges over duration — not max position, so a
   * learner who scrubs to the end shows ~0 %.
   */
  private async applyVideoUpdate(
    userId: number,
    ev: AnalyticsEventDto,
  ): Promise<void> {
    if (!ev.courseId || !ev.unitRef) return;
    const existing: {
      watched_ranges: number[][];
      duration_seconds: number | null;
      max_position_seconds: number;
      play_count: number;
    }[] = await this.dataSource.query(
      `SELECT watched_ranges, duration_seconds, max_position_seconds, play_count
       FROM video_progress WHERE user_id = $1 AND course_id = $2 AND unit_ref = $3`,
      [userId, ev.courseId, ev.unitRef],
    );
    const cur = existing[0];
    const duration =
      ev.duration && ev.duration > 0
        ? Math.round(ev.duration)
        : (cur?.duration_seconds ?? null);
    const position = Math.max(0, Math.round(ev.position ?? 0));
    const merged = mergeRanges([
      ...(cur?.watched_ranges ?? []),
      ...sanitizeRanges(ev.ranges, duration),
    ]);
    const watched = merged.reduce((s, [a, b]) => s + (b - a), 0);
    const pct =
      duration && duration > 0
        ? Math.min(100, Math.round((100 * watched) / duration))
        : 0;
    const completed =
      pct >= VIDEO_COMPLETE_PCT || ev.event === 'video_completed';
    const maxPos = Math.max(cur?.max_position_seconds ?? 0, position);
    const started = ev.event === 'video_started';

    await this.dataSource.query(
      `INSERT INTO video_progress
         (user_id, course_id, unit_ref, position_seconds, max_position_seconds, watched_ranges,
          duration_seconds, percent_watched, completed, play_count, first_played_at, last_played_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7, $8, $9, $10, now(), now(), now())
       ON CONFLICT (user_id, course_id, unit_ref) DO UPDATE SET
         position_seconds     = EXCLUDED.position_seconds,
         max_position_seconds = GREATEST(video_progress.max_position_seconds, EXCLUDED.max_position_seconds),
         watched_ranges       = EXCLUDED.watched_ranges,
         duration_seconds     = COALESCE(EXCLUDED.duration_seconds, video_progress.duration_seconds),
         percent_watched      = GREATEST(video_progress.percent_watched, EXCLUDED.percent_watched),
         completed            = video_progress.completed OR EXCLUDED.completed,
         play_count           = video_progress.play_count + $11,
         last_played_at       = now(),
         updated_at           = now()`,
      [
        userId,
        ev.courseId,
        ev.unitRef,
        position,
        maxPos,
        JSON.stringify(merged),
        duration,
        pct,
        completed,
        started ? 1 : 0,
        started ? 1 : 0,
      ],
    );
  }

  /**
   * Creates the progress row if missing (as opening the unit would) and bumps
   * last_activity_at at most once a minute per row.
   */
  private async touchProgress(userId: number, courseId: number): Promise<void> {
    await this.dataSource.query(
      `INSERT INTO progress ("userId", "courseId", unit_statuses, status, units_total, units_completed,
                             unit_completed_at, last_activity_at, created_at, updated_at)
       SELECT $1, $2, '{}'::jsonb, 'IN_PROGRESS',
              (SELECT COUNT(*) FROM course_units WHERE course_id = $2), 0, '{}'::jsonb, now(), now(), now()
       WHERE NOT EXISTS (SELECT 1 FROM progress WHERE "userId" = $1 AND "courseId" = $2)`,
      [userId, courseId],
    );
    await this.dataSource.query(
      `UPDATE progress SET last_activity_at = now()
       WHERE "userId" = $1 AND "courseId" = $2
         AND (last_activity_at IS NULL OR last_activity_at < now() - interval '1 minute')`,
      [userId, courseId],
    );
  }
}

// ── Range helpers (exported for tests) ────────────────────────────────────

export function sanitizeRanges(
  ranges: number[][] | undefined,
  duration: number | null,
): number[][] {
  if (!Array.isArray(ranges)) return [];
  const out: number[][] = [];
  for (const r of ranges) {
    if (!Array.isArray(r) || r.length !== 2) continue;
    let a = Number(r[0]);
    let b = Number(r[1]);
    if (!Number.isFinite(a) || !Number.isFinite(b)) continue;
    if (a > b) [a, b] = [b, a];
    a = Math.max(0, Math.floor(a));
    b = Math.ceil(b);
    if (duration && duration > 0) b = Math.min(b, duration);
    if (b - a <= 0) continue;
    out.push([a, b]);
  }
  return out;
}

/** Sorts, merges overlapping/adjacent ranges, caps to RANGE_CAP by dropping the smallest. */
export function mergeRanges(ranges: number[][]): number[][] {
  const sorted = ranges
    .filter((r) => Array.isArray(r) && r.length === 2)
    .map(([a, b]) => [Number(a), Number(b)] as [number, number])
    .filter(([a, b]) => Number.isFinite(a) && Number.isFinite(b) && b > a)
    .sort((x, y) => x[0] - y[0]);
  const merged: number[][] = [];
  for (const [a, b] of sorted) {
    const last = merged[merged.length - 1];
    if (last && a <= last[1] + 1) {
      last[1] = Math.max(last[1], b);
    } else {
      merged.push([a, b]);
    }
  }
  if (merged.length > RANGE_CAP) {
    merged.sort((x, y) => y[1] - y[0] - (x[1] - x[0]));
    merged.length = RANGE_CAP;
    merged.sort((x, y) => x[0] - y[0]);
  }
  return merged;
}

export const HEARTBEAT_MINUTES_PER_TICK = HEARTBEAT_MINUTES;
export type { ProductEventName };
