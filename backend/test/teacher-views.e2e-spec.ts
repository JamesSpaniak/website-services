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
import { Organization } from '../src/organizations/types/organization.entity';
import { OrganizationMember } from '../src/organizations/types/organization-member.entity';
import { OrgRole } from '../src/organizations/types/org-role.enum';
import { Question } from '../src/questions/types/question.entity';
import { Exam } from '../src/questions/types/exam.entity';
import { AnalyticsMaintenanceService } from '../src/product-events/analytics-maintenance.service';

/**
 * Phase 1b of docs/tech/progress-tracking-accuracy.md — a golden class with
 * known activity, and the exact numbers every teacher endpoint must return.
 *
 * The org is in America/Los_Angeles (PTD4): "today", "yesterday" and the
 * daily series are LA days, so an event at 11 pm LA yesterday (already
 * "today" in UTC) belongs to yesterday. Only students (role `member`) on the
 * org's assigned course count (PTD5): the manager's own activity and a
 * student's activity on an unassigned course are seeded and must not appear.
 *
 * Seeded per student, course A = assigned, course B = not assigned:
 *   s1  A: completes u11 + u13 (so u1 auto-completes), video u2 watched, quizzes 60 → 80 on u1,
 *          heartbeats: 3 today, 2 at 23:00 yesterday, 4 three days ago,
 *          2 nine days ago (outside the week); 1 lesson viewed 3 days ago
 *       B: progress, heartbeats today, a quiz, a lesson view — all hidden
 *   s2  nothing
 *   s3  A: completes u2
 *   mgr A: progress + heartbeats today — hidden
 */
describe('Teacher views (e2e)', () => {
  const TZ = 'America/Los_Angeles';
  const password = 'TestPassword123!';
  let app: INestApplication;
  let dataSource: DataSource;
  let userRepository: Repository<User>;
  let organizationRepository: Repository<Organization>;
  let memberRepository: Repository<OrganizationMember>;
  let questionRepository: Repository<Question>;
  let examRepository: Repository<Exam>;
  let maintenance: AnalyticsMaintenanceService;
  let seq = 0;

  const http = () => request(app.getHttpServer());

  const createUser = async (role: Role = Role.User) => {
    seq += 1;
    const name = `tv${seq}_${Date.now() % 100000}`;
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
      .set('X-Forwarded-For', `10.8.0.${seq}`)
      .send({ username: name, password })
      .expect(200);
    return { user, token: res.body.access_token as string };
  };

  const createCourse = async (adminToken: string, title: string) => {
    const res = await http()
      .post('/courses')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        title,
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
            title: 'Video lesson 2',
            video_url: 'https://media.example.com/u3.m3u8',
            sub_units: [],
          },
        ],
      })
      .expect(201);
    return res.body.id as number;
  };

  const complete = (token: string, courseId: number, ref: string) =>
    http()
      .patch(`/progress/courses/${courseId}/units/${ref}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ status: ProgressStatus.COMPLETED })
      .expect(200);

  /** Local (LA) wall-clock time `days` days ago at `hh:mm:ss`, as a Date. */
  const laTime = async (days: number, hhmmss: string): Promise<Date> =>
    (
      await dataSource.query(
        `SELECT (((now() AT TIME ZONE $1)::date - $2::int) + $3::time) AT TIME ZONE $1 AS t`,
        [TZ, days, hhmmss],
      )
    )[0].t;

  const laDate = async (days: number): Promise<string> =>
    (
      await dataSource.query(
        `SELECT to_char((now() AT TIME ZONE $1)::date - $2::int, 'YYYY-MM-DD') AS d`,
        [TZ, days],
      )
    )[0].d;

  const insertEvents = async (
    userId: number,
    orgId: number | null,
    courseId: number,
    name: string,
    times: Date[],
    unitRef = 'u11',
  ) => {
    for (const at of times) {
      await dataSource.query(
        `INSERT INTO product_events (user_id, organization_id, event_name, occurred_at, course_id, unit_ref, properties, source, event_id)
         VALUES ($1, $2, $3, $4, $5, $6, '{}'::jsonb, 'web', $7)`,
        [userId, orgId, name, at, courseId, unitRef, randomUUID()],
      );
    }
  };

  const ticks = (start: Date, n: number) =>
    Array.from({ length: n }, (_, i) => new Date(start.getTime() + i * 30_000));

  /** One-question quiz scoped to `ref`. */
  const seedExam = async (courseId: number, ref: string) => {
    const question = await questionRepository.save({
      course_id: courseId,
      unit_ref: ref,
      sub_unit_ref: null,
      unit_id: null,
      sub_unit_id: null,
      question_text: 'Pick the correct answer.',
      choices: [
        { id: 1, text: 'Wrong', is_correct: false },
        { id: 2, text: 'Right', is_correct: true },
      ],
      explanation: null,
      standard: null,
      figure_ref: null,
      priority: 1,
      difficulty: 'medium' as const,
      status: 'active' as const,
    });
    const exam = await examRepository.save({
      course_id: courseId,
      scope: 'unit' as const,
      exam_pool: 'scoped' as const,
      scope_refs: [ref],
      scope_ids: [],
      question_ids: [question.id],
      is_randomized: true,
      version: 'v1',
      generated_by: 'student' as const,
      created_by_user_id: null,
      dedup_key: null,
    });
    return { question, exam };
  };

  const quiz = (
    userId: number,
    examId: number,
    courseId: number,
    score: number,
    at: Date,
    attemptNo: number,
  ) =>
    dataSource.query(
      `INSERT INTO exam_attempt_history
         (user_id, exam_id, course_id, scope, scope_refs, exam_pool, attempt_no, score, section_breakdown, submitted_at)
       VALUES ($1, $2, $3, 'unit', ARRAY['u1']::varchar[], 'scoped', $4, $5, '[]'::jsonb, $6)`,
      [userId, examId, courseId, attemptNo, score, at],
    );

  let orgId: number;
  let courseA: number;
  let courseB: number;
  let managerToken: string;
  let s1: User;
  let s1Token: string;
  let s2: User;
  let s3: User;
  let todayStart: Date;
  /** False in the first minutes after LA midnight, when "today" cannot hold the fixture yet. */
  let todayFits = true;

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
    organizationRepository = app.get(getRepositoryToken(Organization));
    memberRepository = app.get(getRepositoryToken(OrganizationMember));
    questionRepository = app.get(getRepositoryToken(Question));
    examRepository = app.get(getRepositoryToken(Exam));
    maintenance = app.get(AnalyticsMaintenanceService);

    await dataSource.query(
      'TRUNCATE TABLE "product_events", "product_events_daily", "video_progress", "progress", "exam_attempt_history", ' +
        '"exam_attempts", "exams", "questions", "organization_members", "organizations", "course_units", "courses", ' +
        '"sessions", "users" CASCADE;',
    );

    // ── Fixture ──
    const admin = await createUser(Role.Admin);
    courseA = await createCourse(admin.token, 'Assigned course');
    courseB = await createCourse(admin.token, 'Unassigned course');
    const org = await organizationRepository.save({
      name: 'Golden School',
      max_students: 30,
      timezone: TZ,
    });
    orgId = org.id;
    await dataSource.query(
      `INSERT INTO organization_courses ("organizationsId", "coursesId") VALUES ($1, $2)`,
      [orgId, courseA],
    );

    const mgr = await createUser();
    managerToken = mgr.token;
    const st1 = await createUser();
    const st2 = await createUser();
    const st3 = await createUser();
    [s1, s1Token, s2, s3] = [st1.user, st1.token, st2.user, st3.user];
    await memberRepository.save({
      organizationId: orgId,
      userId: mgr.user.id,
      role: OrgRole.Manager,
    });
    for (const s of [s1, s2, s3]) {
      await memberRepository.save({
        organizationId: orgId,
        userId: s.id,
        role: OrgRole.Member,
      });
    }

    // Status writes through the API, as the app does them.
    await complete(s1Token, courseA, 'u11');
    await complete(s1Token, courseA, 'u13');
    await complete(s1Token, courseB, 'u11');
    await complete(st3.token, courseA, 'u2');
    await complete(mgr.token, courseA, 'u11');

    await dataSource.query(
      `INSERT INTO video_progress (user_id, course_id, unit_ref, position_seconds, max_position_seconds,
         watched_ranges, duration_seconds, percent_watched, completed, play_count)
       VALUES ($1, $2, 'u2', 290, 290, '[[0,290]]'::jsonb, 300, 97, true, 1)`,
      [s1.id, courseA],
    );

    // Heartbeats. "Today" starts at max(LA midnight, now − 15 min), aligned to 30 s.
    const [{ midnight, now }] = await dataSource.query(
      `SELECT ((now() AT TIME ZONE $1)::date::timestamp AT TIME ZONE $1) AS midnight, now() AS now`,
      [TZ],
    );
    const start = Math.max(
      new Date(midnight).getTime() + 30_000,
      new Date(now).getTime() - 15 * 60_000,
    );
    todayStart = new Date(Math.ceil(start / 30_000) * 30_000);
    todayFits = todayStart.getTime() + 60_000 <= new Date(now).getTime();

    await insertEvents(
      s1.id,
      orgId,
      courseA,
      'lesson_heartbeat',
      ticks(todayStart, 3),
    );
    await insertEvents(
      s1.id,
      orgId,
      courseA,
      'lesson_heartbeat',
      ticks(await laTime(1, '23:00:00'), 2),
    );
    await insertEvents(
      s1.id,
      orgId,
      courseA,
      'lesson_heartbeat',
      ticks(await laTime(3, '12:00:00'), 4),
    );
    await insertEvents(s1.id, orgId, courseA, 'lesson_viewed', [
      await laTime(3, '11:59:00'),
    ]);
    await insertEvents(
      s1.id,
      orgId,
      courseA,
      'lesson_heartbeat',
      ticks(await laTime(9, '12:00:00'), 2),
    );
    await insertEvents(
      s1.id,
      orgId,
      courseB,
      'lesson_heartbeat',
      ticks(todayStart, 3),
    );
    await insertEvents(s1.id, orgId, courseB, 'lesson_viewed', [todayStart]);
    await insertEvents(
      mgr.user.id,
      orgId,
      courseA,
      'lesson_heartbeat',
      ticks(todayStart, 3),
    );

    const examA = (await seedExam(courseA, 'u1')).exam;
    const examB = (await seedExam(courseB, 'u1')).exam;
    await quiz(s1.id, examA.id, courseA, 60, await laTime(3, '12:10:00'), 1);
    await quiz(s1.id, examA.id, courseA, 80, await laTime(3, '12:20:00'), 2);
    await quiz(s1.id, examB.id, courseB, 95, await laTime(3, '12:30:00'), 1);

    // Older days come from the rollup; today/yesterday are read raw. Rolling
    // up everything proves the two halves never double count.
    await maintenance.rollupDaily(12);
  });

  afterAll(async () => {
    await app.close();
  });

  const asManager = (path: string) =>
    http().get(path).set('Authorization', `Bearer ${managerToken}`);

  it('summary: students × assigned course only, with exact numbers', async () => {
    const res = await asManager(`/organizations/${orgId}/progress`).expect(200);
    const rows = res.body as Record<string, unknown>[];
    expect(rows).toHaveLength(3);
    expect(new Set(rows.map((r) => r.course_id))).toEqual(new Set([courseA]));
    expect(rows.map((r) => r.user_id).sort()).toEqual(
      [s1.id, s2.id, s3.id].sort(),
    );

    const r1 = rows.find((r) => r.user_id === s1.id)!;
    expect(r1).toMatchObject({
      status: ProgressStatus.IN_PROGRESS,
      units_completed: 3, // u11 + u13, and u1 because both its lessons are done (PTD3)
      units_total: 7,
      videos_completed: 1,
      videos_total: 2,
      exams_taken: 2,
      best_exam_score: 80,
      first_exam_score: 60,
      quizzes_attempted: 1,
      quizzes_passed: 1,
    });
    if (todayFits) expect(r1.minutes_7d).toBe(4.5); // 1.5 today + 1 yesterday + 2 three days ago

    const r2 = rows.find((r) => r.user_id === s2.id)!;
    expect(r2).toMatchObject({
      status: ProgressStatus.NOT_STARTED,
      units_completed: 0,
      units_total: 7,
      minutes_7d: 0,
      exams_taken: 0,
    });
    expect(rows.find((r) => r.user_id === s3.id)).toMatchObject({
      units_completed: 1,
    });
  });

  it('CSV export has the same rows', async () => {
    const res = await asManager(
      `/organizations/${orgId}/progress/export.csv`,
    ).expect(200);
    const lines = res.text.trim().split('\n');
    expect(lines).toHaveLength(4);
  });

  it('lesson grid: assigned course only; statuses overlaid per student', async () => {
    await asManager(`/organizations/${orgId}/progress/${courseB}`).expect(404);
    const res = await asManager(
      `/organizations/${orgId}/progress/${courseA}`,
    ).expect(200);
    const members = res.body as {
      user_id: number;
      progress: {
        units: { id: string; sub_units: { id: string; status: string }[] }[];
      } | null;
      videos: Record<string, { completed: boolean }>;
    }[];
    expect(members.map((m) => m.user_id).sort()).toEqual(
      [s1.id, s2.id, s3.id].sort(),
    );
    const m1 = members.find((m) => m.user_id === s1.id)!;
    const u1 = m1.progress!.units.find((u) => u.id === 'u1')!;
    expect(u1.sub_units.map((s) => s.status)).toEqual([
      ProgressStatus.COMPLETED,
      ProgressStatus.COMPLETED,
    ]);
    expect(m1.videos.u2.completed).toBe(true);
    expect(members.find((m) => m.user_id === s2.id)!.progress).toBeNull();
  });

  it('engagement (7 days, LA days): exact minutes, days and series; manager and course B excluded', async () => {
    if (!todayFits) return;
    const res = await asManager(
      `/organizations/${orgId}/engagement?days=7`,
    ).expect(200);
    const members = res.body.members as Record<string, unknown>[];
    expect(members.map((m) => m.user_id).sort()).toEqual(
      [s1.id, s2.id, s3.id].sort(),
    );
    expect(members.find((m) => m.user_id === s1.id)).toMatchObject({
      minutes: 4.5,
      active_days: 3,
      lessons_viewed: 1,
    });
    expect(members.find((m) => m.user_id === s2.id)).toMatchObject({
      minutes: 0,
      active_days: 0,
    });

    // 11 pm LA yesterday is "today" in UTC — it must land on LA yesterday.
    expect(res.body.series).toEqual([
      { day: await laDate(3), minutes: 2, active_members: 1 },
      { day: await laDate(1), minutes: 1, active_members: 1 },
      { day: await laDate(0), minutes: 1.5, active_members: 1 },
    ]);
  });

  it('engagement (1 day): only LA today', async () => {
    if (!todayFits) return;
    const res = await asManager(
      `/organizations/${orgId}/engagement?days=1`,
    ).expect(200);
    expect(
      res.body.members.find((m: { user_id: number }) => m.user_id === s1.id),
    ).toMatchObject({
      minutes: 1.5,
      active_days: 1,
    });
  });

  it('utilization: counts students only, against assigned courses', async () => {
    const res = await asManager(`/organizations/${orgId}/utilization`).expect(
      200,
    );
    expect(res.body).toMatchObject({
      members: 3,
      members_activated: 2,
      members_engaged_7d: 2,
      courses_assigned: 1,
    });
    expect(res.body.stalled_member_ids).toEqual([s2.id]);
  });

  it('timeline: only events on assigned courses', async () => {
    const res = await asManager(
      `/organizations/${orgId}/members/${s1.id}/timeline`,
    ).expect(200);
    const events = res.body as { course_id: number; event_name: string }[];
    expect(events.length).toBeGreaterThan(0);
    expect(events.every((e) => e.course_id === courseA)).toBe(true);
  });

  it('quiz history: only assigned courses', async () => {
    const res = await asManager(
      `/organizations/${orgId}/members/${s1.id}/exams`,
    ).expect(200);
    expect(
      res.body.attempts.map((a: { score: number }) => Number(a.score)),
    ).toEqual([80, 60]);
    expect(res.body.quizzes).toHaveLength(1);
    expect(res.body.quizzes[0]).toMatchObject({
      attempts: 2,
      best: 80,
      first: 60,
      latest: 80,
    });
    if (todayFits) expect(res.body.minutes_7d).toBe(4.5);
  });

  it('R17: two simultaneous submits of one quiz keep one latest attempt and distinct attempt numbers', async () => {
    const { question, exam } = await seedExam(courseA, 'u10');
    const submit = (choice: number) =>
      http()
        .post(`/exams/${exam.id}/submit`)
        .set('Authorization', `Bearer ${s1Token}`)
        .send({
          answers: [{ question_id: question.id, selected_choice_id: choice }],
        });

    const results = await Promise.all([submit(1), submit(2)]);
    expect(results.map((r) => r.status)).toEqual([201, 201]);

    const attempts = await dataSource.query(
      `SELECT COUNT(*)::int AS n FROM exam_attempts WHERE user_id = $1 AND exam_id = $2`,
      [s1.id, exam.id],
    );
    expect(attempts[0].n).toBe(1);
    const history: { attempt_no: number }[] = await dataSource.query(
      `SELECT attempt_no FROM exam_attempt_history WHERE user_id = $1 AND exam_id = $2 ORDER BY attempt_no`,
      [s1.id, exam.id],
    );
    expect(history.map((h) => h.attempt_no)).toEqual([1, 2]);
  });
});
