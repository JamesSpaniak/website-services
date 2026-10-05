import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import * as cookieParser from 'cookie-parser';
import { randomUUID, webcrypto } from 'crypto';
import { DataSource, Repository } from 'typeorm';
import { getRepositoryToken } from '@nestjs/typeorm';
import { SchedulerRegistry } from '@nestjs/schedule';
import { AppModule } from './../src/app.module';
import { UsersService } from '../src/users/user.service';
import { User } from '../src/users/types/user.entity';
import { Role } from '../src/users/types/role.enum';
import { ProgressStatus } from '../src/courses/types/course.dto';
import { Progress } from '../src/progress/types/progress.entity';
import { Organization } from '../src/organizations/types/organization.entity';
import { OrganizationMember } from '../src/organizations/types/organization-member.entity';
import { OrgRole } from '../src/organizations/types/org-role.enum';
import { AnalyticsMaintenanceService } from '../src/product-events/analytics-maintenance.service';
import { OrgInsightsService } from '../src/organizations/org-insights.service';

/**
 * Phase 1 of docs/tech/progress-tracking-accuracy.md — backend correctness of
 * everything a teacher is shown about a student. Each test names the risk
 * (R#) from the plan's register that it guards.
 *
 * Rate limits are real here (30 req/min per user, 120/min on analytics), so
 * every test uses fresh users (identities are not restarted between tests)
 * and unauthenticated calls carry a unique X-Forwarded-For.
 */
describe('Progress tracking accuracy (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let userRepository: Repository<User>;
  let progressRepository: Repository<Progress>;
  let organizationRepository: Repository<Organization>;
  let memberRepository: Repository<OrganizationMember>;
  let maintenance: AnalyticsMaintenanceService;
  let insights: OrgInsightsService;

  const password = 'TestPassword123!';
  let seq = 0;

  const truncateAll = async () => {
    for (let attempt = 1; ; attempt++) {
      try {
        await dataSource.query(
          'TRUNCATE TABLE "product_events", "product_events_daily", "video_progress", "progress", ' +
            '"organization_members", "organizations", "course_units", "courses", "sessions", "users" CASCADE;',
        );
        return;
      } catch (error) {
        const deadlock = (error as { code?: string }).code === '40P01';
        if (!deadlock || attempt >= 5) throw error;
        await new Promise((resolve) => setTimeout(resolve, 100 * attempt));
      }
    }
  };

  const http = () => request(app.getHttpServer());
  const fakeIp = () => `10.9.${Math.floor(seq / 250)}.${seq % 250}`;

  /** Creates a verified user and returns it with a bearer token. */
  const learner = async (role: Role = Role.Admin) => {
    seq += 1;
    const name = `pt${seq}_${Date.now() % 100000}`;
    const user = await userRepository.save({
      username: name,
      email: `${name}@example.com`,
      password: await UsersService.hashPassword(password),
      role,
      is_email_verified: true,
      email_verification_token: null,
      email_verification_expires_at: null,
      token_version: 0,
      pro_membership_expires_at: null,
      purchased_courses: [],
    });
    const res = await http()
      .post('/auth/login')
      .set('X-Forwarded-For', fakeIp())
      .send({ username: name, password })
      .expect(200);
    return { user, token: res.body.access_token as string };
  };

  /**
   * Course with refs u1 > (u11, u13), u10 > u101, plus u2 (video, no outro)
   * and u3 (video, 25 s outro). Created through the API so course_units is
   * derived exactly as in production.
   */
  const createCourse = async (token: string, suffix = '') => {
    const res = await http()
      .post('/courses')
      .set('Authorization', `Bearer ${token}`)
      .send({
        title: `Tracking ${seq}${suffix}`,
        sub_title: 'Basics',
        description: 'Course description',
        text_content: 'Full course text',
        images_url: [],
        price: 49.95,
        units: [
          {
            id: 'u1',
            title: 'Regulations',
            sub_units: [
              { id: 'u11', title: 'Applicability', sub_units: [] },
              { id: 'u13', title: 'Operational Rules', sub_units: [] },
            ],
          },
          {
            id: 'u10',
            title: 'Radio',
            sub_units: [
              { id: 'u101', title: 'Radio in the NAS', sub_units: [] },
            ],
          },
          {
            id: 'u2',
            title: 'Video lesson',
            video_url: 'https://media.example.com/u2.m3u8',
            sub_units: [],
          },
          {
            id: 'u3',
            title: 'Video with credits',
            video_url: 'https://media.example.com/u3.m3u8',
            video_outro_seconds: 25,
            sub_units: [],
          },
        ],
      })
      .expect(201);
    return res.body.id as number;
  };

  const ev = (
    event: string,
    extra: Record<string, unknown> = {},
  ): Record<string, unknown> => ({
    event,
    eventId: randomUUID(),
    occurredAt: new Date().toISOString(),
    sessionId: 'test-session',
    ...extra,
  });

  const send = (token: string, events: Record<string, unknown>[]) =>
    http()
      .post('/analytics/event')
      .set('Authorization', `Bearer ${token}`)
      .send({ events });

  const patchUnit = (
    token: string,
    courseId: number,
    ref: string,
    status: ProgressStatus,
    auto = false,
  ) =>
    http()
      .patch(`/progress/courses/${courseId}/units/${ref}`)
      .set('Authorization', `Bearer ${token}`)
      .send(auto ? { status, auto: true } : { status });

  const videoRow = async (userId: number, courseId: number, ref: string) =>
    (
      await dataSource.query(
        `SELECT completed, percent_watched, watched_ranges FROM video_progress
         WHERE user_id = $1 AND course_id = $2 AND unit_ref = $3`,
        [userId, courseId, ref],
      )
    )[0] as
      | {
          completed: boolean;
          percent_watched: number;
          watched_ranges: number[][];
        }
      | undefined;

  const countEvents = async (userId: number, name: string): Promise<number> =>
    Number(
      (
        await dataSource.query(
          `SELECT COUNT(*)::int AS n FROM product_events WHERE user_id = $1 AND event_name = $2`,
          [userId, name],
        )
      )[0].n,
    );

  /** Server-side events are fire-and-forget; give them a moment to land. */
  const settle = () => new Promise((resolve) => setTimeout(resolve, 300));

  beforeAll(async () => {
    if (!globalThis.crypto) {
      globalThis.crypto = webcrypto as Crypto;
    }
    process.env.STRIPE_SECRET_KEY =
      process.env.STRIPE_SECRET_KEY || 'sk_test_123';
    process.env.JWT_SECRET = process.env.JWT_SECRET || 'test_jwt_secret';
    process.env.JWT_RESET_SECRET =
      process.env.JWT_RESET_SECRET || 'test_jwt_reset_secret';
    process.env.JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '1h';
    process.env.JWT_RESET_EXPIRES_IN = process.env.JWT_RESET_EXPIRES_IN || '1h';
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.use(cookieParser());
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
        transformOptions: { groups: ['COURSE_DETAILS'] },
      }),
    );
    await app.init();
    // The hourly/nightly rollup crons would race the fixtures' TRUNCATEs.
    app
      .get(SchedulerRegistry)
      .getCronJobs()
      .forEach((job) => job.stop());

    dataSource = app.get(DataSource);
    userRepository = app.get(getRepositoryToken(User));
    progressRepository = app.get(getRepositoryToken(Progress));
    organizationRepository = app.get(getRepositoryToken(Organization));
    memberRepository = app.get(getRepositoryToken(OrganizationMember));
    maintenance = app.get(AnalyticsMaintenanceService);
    insights = app.get(OrgInsightsService);
  });

  beforeEach(async () => {
    await truncateAll();
  });

  afterAll(async () => {
    await app.close();
  });

  // ── Ingest ──────────────────────────────────────────────────────────────

  describe('ingest', () => {
    it('R5: dedupes resent batches, including retries older than 5 minutes', async () => {
      const { user, token } = await learner();
      const courseId = await createCourse(token);

      const fresh = [
        ev('lesson_viewed', { courseId, unitRef: 'u11' }),
        ev('lesson_heartbeat', { courseId, unitRef: 'u11' }),
      ];
      await send(token, fresh).expect(204);
      await send(token, fresh).expect(204);

      const tenMinAgo = new Date(Date.now() - 10 * 60_000).toISOString();
      const late = [
        ev('lesson_viewed', {
          courseId,
          unitRef: 'u13',
          occurredAt: tenMinAgo,
        }),
      ];
      await send(token, late).expect(204);
      await new Promise((resolve) => setTimeout(resolve, 20));
      await send(token, late).expect(204);

      expect(await countEvents(user.id, 'lesson_viewed')).toBe(2);
      expect(await countEvents(user.id, 'lesson_heartbeat')).toBe(1);
    });

    it('R5: drops events older than 24 h as stale instead of re-dating them', async () => {
      const { user, token } = await learner();
      const courseId = await createCourse(token);
      const twoDaysAgo = new Date(Date.now() - 48 * 3600_000).toISOString();
      await send(token, [
        ev('lesson_viewed', {
          courseId,
          unitRef: 'u11',
          occurredAt: twoDaysAgo,
        }),
      ]).expect(204);
      expect(await countEvents(user.id, 'lesson_viewed')).toBe(0);
    });

    it('R10: one malformed event costs only itself, not the batch', async () => {
      const { user, token } = await learner();
      const courseId = await createCourse(token);
      await send(token, [
        ev('lesson_viewed', { courseId, unitRef: 'u11' }),
        ev('not_a_real_event', { courseId, unitRef: 'u11' }),
        ev('lesson_heartbeat', { courseId, unitRef: 'u11', position: -5 }),
        'garbage' as unknown as Record<string, unknown>,
        ev('lesson_heartbeat', { courseId, unitRef: 'u13' }),
      ]).expect(204);
      expect(await countEvents(user.id, 'lesson_viewed')).toBe(1);
      expect(await countEvents(user.id, 'lesson_heartbeat')).toBe(1);
    });

    it('R1: an expired session (refresh cookie, no access token) gets 401, not a silent drop', async () => {
      const body = {
        events: [ev('lesson_heartbeat', { courseId: 1, unitRef: 'u11' })],
      };
      await http()
        .post('/analytics/event')
        .set('X-Forwarded-For', fakeIp())
        .set('Cookie', 'refresh_token=still-here')
        .send(body)
        .expect(401);
      // Refresh failed client-side → resend as guest → accepted (and dropped as anonymous).
      await http()
        .post('/analytics/event')
        .set('X-Forwarded-For', fakeIp())
        .set('Cookie', 'refresh_token=still-here')
        .set('x-analytics-guest', '1')
        .send(body)
        .expect(204);
      // True guest (no cookies) is unchanged.
      await http()
        .post('/analytics/event')
        .set('X-Forwarded-For', fakeIp())
        .send(body)
        .expect(204);
    });
  });

  // ── Video completion ────────────────────────────────────────────────────

  describe('video completion (§ 3 rule)', () => {
    it('R2: scrubbing to the end is not a watch, even with video_completed / ended', async () => {
      const { user, token } = await learner();
      const courseId = await createCourse(token);
      await send(token, [
        ev('video_started', {
          courseId,
          unitRef: 'u2',
          position: 0,
          duration: 300,
        }),
        ev('video_progress', {
          courseId,
          unitRef: 'u2',
          position: 8,
          duration: 300,
          ranges: [[0, 8]],
        }),
        ev('video_completed', {
          courseId,
          unitRef: 'u2',
          position: 300,
          duration: 300,
          ranges: [[295, 300]],
          properties: { ended: true },
        }),
      ]).expect(204);
      const row = await videoRow(user.id, courseId, 'u2');
      expect(row?.completed).toBe(false);
      expect(row?.percent_watched).toBeLessThan(10);
    });

    it('end grace: stopping 8 s before the end of a 1-minute video still completes', async () => {
      const { user, token } = await learner();
      const courseId = await createCourse(token);
      await send(token, [
        ev('video_position', {
          courseId,
          unitRef: 'u2',
          position: 52,
          duration: 60,
          ranges: [[0, 52]],
        }),
      ]).expect(204);
      expect((await videoRow(user.id, courseId, 'u2'))?.completed).toBe(true);
    });

    it('outro: credits never need to be watched (video_outro_seconds = 25)', async () => {
      const { user, token } = await learner();
      const courseId = await createCourse(token);
      const watchedTo146 = { position: 146, duration: 180, ranges: [[0, 146]] };
      await send(token, [
        ev('video_position', { courseId, unitRef: 'u3', ...watchedTo146 }),
        ev('video_position', { courseId, unitRef: 'u2', ...watchedTo146 }),
      ]).expect(204);
      expect((await videoRow(user.id, courseId, 'u3'))?.completed).toBe(true);
      // Same viewing on a video without an outro is 81 % — not enough.
      expect((await videoRow(user.id, courseId, 'u2'))?.completed).toBe(false);
    });

    it('R8: parallel batches for one video keep every watched range', async () => {
      const { user, token } = await learner();
      const courseId = await createCourse(token);
      await Promise.all(
        Array.from({ length: 10 }, (_, i) =>
          send(token, [
            ev('lesson_heartbeat', {
              courseId,
              unitRef: 'u2',
              position: i * 20 + 10,
              duration: 300,
              ranges: [[i * 20, i * 20 + 10]],
            }),
          ]).expect(204),
        ),
      );
      const row = await videoRow(user.id, courseId, 'u2');
      expect(row?.watched_ranges).toHaveLength(10);
      expect(row?.percent_watched).toBe(33);
    });
  });

  // ── Status writes ───────────────────────────────────────────────────────

  describe('unit status writes', () => {
    it('R3: parallel completions of different units are all kept', async () => {
      const { user, token } = await learner();
      const courseId = await createCourse(token);
      await patchUnit(token, courseId, 'u2', ProgressStatus.IN_PROGRESS).expect(
        200,
      );

      const refs = ['u11', 'u13', 'u101', 'u2', 'u3'];
      await Promise.all(
        refs.map((ref) =>
          patchUnit(token, courseId, ref, ProgressStatus.COMPLETED).expect(200),
        ),
      );
      const progress = await progressRepository.findOneByOrFail({
        userId: user.id,
        courseId,
      });
      for (const ref of refs) {
        expect(progress.unit_statuses[ref]).toBe(ProgressStatus.COMPLETED);
      }
      // + u1 and u10, completed because all their lessons are (PTD3).
      expect(progress.units_completed).toBe(7);
    });

    it('R3: an automatic IN_PROGRESS racing "Mark complete" never wins', async () => {
      const { user, token } = await learner();
      const courseId = await createCourse(token);
      for (let i = 0; i < 6; i++) {
        await patchUnit(
          token,
          courseId,
          'u11',
          ProgressStatus.NOT_STARTED,
        ).expect(200);
        await Promise.all([
          patchUnit(
            token,
            courseId,
            'u11',
            ProgressStatus.IN_PROGRESS,
            true,
          ).expect(200),
          patchUnit(token, courseId, 'u11', ProgressStatus.COMPLETED).expect(
            200,
          ),
        ]);
        const progress = await progressRepository.findOneByOrFail({
          userId: user.id,
          courseId,
        });
        expect(progress.unit_statuses.u11).toBe(ProgressStatus.COMPLETED);
      }
    });

    it('R3: a stale tab cannot downgrade COMPLETED; the learner still can', async () => {
      const { user, token } = await learner();
      const courseId = await createCourse(token);
      await patchUnit(token, courseId, 'u11', ProgressStatus.COMPLETED).expect(
        200,
      );

      const stale = await patchUnit(
        token,
        courseId,
        'u11',
        ProgressStatus.IN_PROGRESS,
        true,
      ).expect(200);
      expect(stale.body.status).toBe(ProgressStatus.COMPLETED);

      await patchUnit(
        token,
        courseId,
        'u11',
        ProgressStatus.IN_PROGRESS,
      ).expect(200);
      const progress = await progressRepository.findOneByOrFail({
        userId: user.id,
        courseId,
      });
      expect(progress.unit_statuses.u11).toBe(ProgressStatus.IN_PROGRESS);
      expect(progress.units_completed).toBe(0);
    });

    it('R4: parallel first visits create one progress row and one course_started', async () => {
      const { user, token } = await learner();
      const courseId = await createCourse(token);
      const responses = await Promise.all(
        ['u11', 'u13', 'u101', 'u2', 'u3', 'u1', 'u10'].map((ref) =>
          patchUnit(token, courseId, ref, ProgressStatus.IN_PROGRESS, true),
        ),
      );
      expect(responses.map((r) => r.status)).toEqual(Array(7).fill(200));
      await settle();
      expect(
        await progressRepository.countBy({ userId: user.id, courseId }),
      ).toBe(1);
      expect(await countEvents(user.id, 'course_started')).toBe(1);
    });
  });

  // ── Derived completion (PTD3) and reset (PTD6) ─────────────────────────

  describe('derived completion and reset', () => {
    it('PTD3: finishing the last lesson completes its unit; finishing every unit completes the course', async () => {
      const { user, token } = await learner();
      const courseId = await createCourse(token);

      const first = await patchUnit(
        token,
        courseId,
        'u11',
        ProgressStatus.COMPLETED,
      ).expect(200);
      expect(first.body.auto_completed).toEqual([]);
      const second = await patchUnit(
        token,
        courseId,
        'u13',
        ProgressStatus.COMPLETED,
      ).expect(200);
      expect(second.body.auto_completed).toEqual(['u1']);

      await patchUnit(token, courseId, 'u101', ProgressStatus.COMPLETED).expect(
        200,
      );
      await patchUnit(token, courseId, 'u2', ProgressStatus.COMPLETED).expect(
        200,
      );
      const last = await patchUnit(
        token,
        courseId,
        'u3',
        ProgressStatus.COMPLETED,
      ).expect(200);
      expect(last.body.course_status).toBe(ProgressStatus.COMPLETED);

      const progress = await progressRepository.findOneByOrFail({
        userId: user.id,
        courseId,
      });
      expect(progress.status).toBe(ProgressStatus.COMPLETED);
      expect(progress.completed_at).not.toBeNull();
      expect(progress.units_completed).toBe(progress.units_total);
      expect(progress.unit_completed_at.u1).toBeDefined();
      await settle();
      expect(await countEvents(user.id, 'course_completed')).toBe(1);
      // Top-level units: u1 and u10 (auto), u2, u3 — each once.
      expect(await countEvents(user.id, 'unit_completed')).toBe(4);
    });

    it('PTD3: un-completing a lesson leaves the parent as the learner last saw it', async () => {
      const { user, token } = await learner();
      const courseId = await createCourse(token);
      await patchUnit(token, courseId, 'u11', ProgressStatus.COMPLETED).expect(
        200,
      );
      await patchUnit(token, courseId, 'u13', ProgressStatus.COMPLETED).expect(
        200,
      );
      await patchUnit(
        token,
        courseId,
        'u13',
        ProgressStatus.IN_PROGRESS,
      ).expect(200);
      const progress = await progressRepository.findOneByOrFail({
        userId: user.id,
        courseId,
      });
      expect(progress.unit_statuses.u1).toBe(ProgressStatus.COMPLETED);
      expect(progress.unit_statuses.u13).toBe(ProgressStatus.IN_PROGRESS);
    });

    it('PTD6: resetting a course clears its video progress, and only that course', async () => {
      const { user, token } = await learner();
      const courseId = await createCourse(token);
      const otherCourse = await createCourse(token, ' (other)');
      const watched = { position: 52, duration: 60, ranges: [[0, 52]] };
      await send(token, [
        ev('video_position', { courseId, unitRef: 'u2', ...watched }),
        ev('video_position', {
          courseId: otherCourse,
          unitRef: 'u2',
          ...watched,
        }),
      ]).expect(204);

      await http()
        .post(`/progress/courses/${courseId}/reset`)
        .set('Authorization', `Bearer ${token}`)
        .expect((res) => expect(res.status).toBeLessThan(300));

      expect(await videoRow(user.id, courseId, 'u2')).toBeUndefined();
      expect((await videoRow(user.id, otherCourse, 'u2'))?.completed).toBe(
        true,
      );
      expect(
        await progressRepository.countBy({ userId: user.id, courseId }),
      ).toBe(0);
    });
  });

  // ── Rollup & teacher reads ──────────────────────────────────────────────

  describe('rollup', () => {
    /** Raw events inserted directly — the rollup's input, independent of ingest. */
    const insertEvents = async (
      userId: number,
      courseId: number,
      rows: { name: string; ref: string; at: Date }[],
      orgId: number | null = null,
    ) => {
      for (const r of rows) {
        await dataSource.query(
          `INSERT INTO product_events (user_id, organization_id, event_name, occurred_at, course_id, unit_ref, properties, source, event_id)
           VALUES ($1, $2, $3, $4, $5, $6, '{}'::jsonb, 'web', $7)`,
          [userId, orgId, r.name, r.at, courseId, r.ref, randomUUID()],
        );
      }
    };

    /**
     * A realistic messy session starting at `start` (aligned to 30 s):
     * 3 reloads of one lesson, a complete → uncomplete → complete toggle,
     * and two windows both sending heartbeats for 2 minutes.
     */
    const messySession = (start: Date) => {
      const at = (s: number) => new Date(start.getTime() + s * 1000);
      return [
        { name: 'lesson_viewed', ref: 'u11', at: at(1) },
        { name: 'lesson_viewed', ref: 'u11', at: at(40) },
        { name: 'lesson_viewed', ref: 'u11', at: at(80) },
        { name: 'lesson_completed', ref: 'u11', at: at(90) },
        { name: 'lesson_completed', ref: 'u11', at: at(100) },
        // window A ticks at 0/30/60/90 s, window B at 15/45/75/105 s
        ...[0, 30, 60, 90, 15, 45, 75, 105].map((s) => ({
          name: 'lesson_heartbeat',
          ref: 'u11',
          at: at(s),
        })),
      ];
    };

    const dailyRow = async (userId: number, day: string) =>
      (
        await dataSource.query(
          `SELECT minutes_engaged::float AS minutes, lessons_viewed, units_completed
           FROM product_events_daily WHERE user_id = $1 AND day = $2::date`,
          [userId, day],
        )
      )[0] as
        | { minutes: number; lessons_viewed: number; units_completed: number }
        | undefined;

    it('R6: counts distinct lessons/units and does not double minutes for two windows; reruns are identical', async () => {
      const { user, token } = await learner();
      const courseId = await createCourse(token);
      const yesterday = new Date();
      yesterday.setUTCDate(yesterday.getUTCDate() - 1);
      yesterday.setUTCHours(10, 0, 0, 0);
      await insertEvents(user.id, courseId, messySession(yesterday));
      const day = yesterday.toISOString().slice(0, 10);

      await maintenance.rollupDaily(2);
      const first = await dailyRow(user.id, day);
      expect(first).toEqual({
        minutes: 2,
        lessons_viewed: 1,
        units_completed: 1,
      });

      await maintenance.rollupDaily(2);
      expect(await dailyRow(user.id, day)).toEqual(first);
    });

    it('R7: backfills every day since the last successful rollup', async () => {
      const { user, token } = await learner();
      const courseId = await createCourse(token);
      const fiveDaysAgo = new Date();
      fiveDaysAgo.setUTCDate(fiveDaysAgo.getUTCDate() - 5);
      fiveDaysAgo.setUTCHours(12, 0, 0, 0);
      await insertEvents(user.id, courseId, [
        { name: 'lesson_heartbeat', ref: 'u11', at: fiveDaysAgo },
      ]);
      // Last successful rollup was 6 days ago (job missed since).
      await dataSource.query(
        `INSERT INTO product_events_daily (user_id, course_id, day, minutes_engaged, lessons_viewed,
           videos_completed, units_completed, exams_submitted, events, computed_at)
         VALUES ($1, $2, CURRENT_DATE - 6, 0, 0, 0, 0, 0, 0, now() - interval '6 days')`,
        [user.id, courseId],
      );

      await maintenance.rollupDaily();
      const row = await dailyRow(
        user.id,
        fiveDaysAgo.toISOString().slice(0, 10),
      );
      expect(row?.minutes).toBe(0.5);
    });

    it('R6/R20: the live "today" engagement equals what the rollup computes for the same events', async () => {
      // Days are the org's local days (default America/New_York, PTD4).
      const [{ seconds_into_day }] = await dataSource.query(
        `SELECT EXTRACT(EPOCH FROM (now() AT TIME ZONE 'America/New_York')::time)::int AS seconds_into_day`,
      );
      if (seconds_into_day < 5 * 60) return; // session would straddle local midnight
      const now = new Date();

      const { user, token } = await learner();
      const courseId = await createCourse(token);
      const org = await organizationRepository.save({
        name: `Org ${seq}`,
        max_students: 30,
      });
      await memberRepository.save({
        organizationId: org.id,
        userId: user.id,
        role: OrgRole.Member,
      });
      await dataSource.query(
        `INSERT INTO organization_courses ("organizationsId", "coursesId") VALUES ($1, $2)`,
        [org.id, courseId],
      );

      const start = new Date(
        Math.floor((now.getTime() - 3 * 60_000) / 30_000) * 30_000,
      );
      await insertEvents(
        user.id,
        courseId,
        [
          ...messySession(start),
          {
            name: 'exam_submitted',
            ref: 'u1',
            at: new Date(start.getTime() + 110_000),
          },
          {
            name: 'exam_submit',
            ref: 'u1',
            at: new Date(start.getTime() + 111_000),
          },
        ],
        org.id,
      );

      const live = (await insights.getEngagement(org.id, 1)).members.find(
        (m) => m.user_id === user.id,
      );
      await maintenance.rollupDaily(1);
      const rolled = (
        await dataSource.query(
          `SELECT minutes_engaged::float AS minutes, lessons_viewed, videos_completed,
                  units_completed, exams_submitted
           FROM product_events_daily
           WHERE user_id = $1 AND day = (now() AT TIME ZONE 'America/New_York')::date`,
          [user.id],
        )
      )[0];

      expect(live).toMatchObject({
        minutes: rolled.minutes,
        lessons_viewed: rolled.lessons_viewed,
        videos_completed: rolled.videos_completed,
        units_completed: rolled.units_completed,
        exams_submitted: rolled.exams_submitted,
      });
      expect(rolled).toEqual({
        minutes: 2,
        lessons_viewed: 1,
        videos_completed: 0,
        units_completed: 1,
        exams_submitted: 2,
      });
    });
  });
});
