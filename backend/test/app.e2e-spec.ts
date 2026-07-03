import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import * as cookieParser from 'cookie-parser';
import { AppModule } from './../src/app.module';
import { DataSource, Repository } from 'typeorm';
import { getRepositoryToken } from '@nestjs/typeorm';
import { UsersService } from '../src/users/user.service';
import { User } from '../src/users/types/user.entity';
import { Role } from '../src/users/types/role.enum';
import { Course } from '../src/courses/types/course.entity';
import { CourseUnit } from '../src/courses/types/course-unit.entity';
import { CourseDetails, ProgressStatus } from '../src/courses/types/course.dto';
import { Progress } from '../src/progress/types/progress.entity';
import { Organization } from '../src/organizations/types/organization.entity';
import { OrganizationMember } from '../src/organizations/types/organization-member.entity';
import { OrgRole } from '../src/organizations/types/org-role.enum';
import { Exam } from '../src/questions/types/exam.entity';
import { ClassExam } from '../src/questions/types/class-exam.entity';
import { Question } from '../src/questions/types/question.entity';
import { webcrypto } from 'crypto';

describe('API (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let userRepository: Repository<User>;
  let courseRepository: Repository<Course>;
  let courseUnitRepository: Repository<CourseUnit>;
  let progressRepository: Repository<Progress>;
  let organizationRepository: Repository<Organization>;
  let memberRepository: Repository<OrganizationMember>;
  let examRepository: Repository<Exam>;
  let classExamRepository: Repository<ClassExam>;
  let questionRepository: Repository<Question>;

  const password = 'TestPassword123!';

  const seedCoursePayload = (title = 'Test Course'): CourseDetails => ({
    id: 0,
    title,
    sub_title: 'Basics',
    description: 'Course description',
    text_content: 'Full course text',
    images_url: ['https://example.com/image.png'],
    video_url: 'https://example.com/video.mp4',
    units: [
      {
        id: 'unit-1',
        title: 'Unit 1',
        description: 'Unit description',
        text_content: 'Unit content',
        video_url: 'https://example.com/unit.mp4',
        images_url: ['https://example.com/unit.png'],
        sub_units: [],
      },
    ],
    status: undefined,
    price: 49.95,
    has_access: false,
  });

  const truncateAll = async () => {
    await dataSource.query(
      'TRUNCATE TABLE "sessions", "progress", "user_courses_purchased", "courses", "course_units", "users", "articles", ' +
      '"organizations", "organization_members", "exams", "exam_attempts", "class_exams", "questions" ' +
      'RESTART IDENTITY CASCADE;',
    );
  };

  const createUser = async (role: Role, username: string, email: string) => {
    const hashedPassword = await UsersService.hashPassword(password);
    return userRepository.save({
      username,
      email,
      password: hashedPassword,
      role,
      is_email_verified: true,
      email_verification_token: null,
      email_verification_expires_at: null,
      token_version: 0,
      pro_membership_expires_at: null,
      purchased_courses: [],
    });
  };

  const loginAndGetToken = async (username: string) => {
    const response = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ username, password })
      .expect(200);
    return response.body.access_token as string;
  };

  const createCourse = async (title = 'Test Course') => {
    const payload = seedCoursePayload(title);
    return courseRepository.save({
      title,
      payload: JSON.stringify(payload),
      hidden: false,
      price: 49.95,
      purchased_by_users: [],
    });
  };

  beforeAll(async () => {
    if (!globalThis.crypto) {
      globalThis.crypto = webcrypto as Crypto;
    }
    process.env.STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY || 'sk_test_123';
    process.env.JWT_SECRET = process.env.JWT_SECRET || 'test_jwt_secret';
    process.env.JWT_RESET_SECRET = process.env.JWT_RESET_SECRET || 'test_jwt_reset_secret';
    process.env.JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '1h';
    process.env.JWT_RESET_EXPIRES_IN = process.env.JWT_RESET_EXPIRES_IN || '1h';
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    // Mirror the production configuration from main.ts
    app.use(cookieParser());
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
        transformOptions: { groups: ['COURSE_DETAILS'] },
      }),
    );
    await app.init();

    dataSource = app.get(DataSource);
    userRepository = app.get<Repository<User>>(getRepositoryToken(User));
    courseRepository = app.get<Repository<Course>>(getRepositoryToken(Course));
    courseUnitRepository = app.get<Repository<CourseUnit>>(getRepositoryToken(CourseUnit));
    progressRepository = app.get<Repository<Progress>>(getRepositoryToken(Progress));
    organizationRepository = app.get<Repository<Organization>>(getRepositoryToken(Organization));
    memberRepository = app.get<Repository<OrganizationMember>>(getRepositoryToken(OrganizationMember));
    examRepository = app.get<Repository<Exam>>(getRepositoryToken(Exam));
    classExamRepository = app.get<Repository<ClassExam>>(getRepositoryToken(ClassExam));
    questionRepository = app.get<Repository<Question>>(getRepositoryToken(Question));
  });

  beforeEach(async () => {
    await truncateAll();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('auth', () => {
    it('rejects profile without token', async () => {
      await request(app.getHttpServer()).get('/auth/profile').expect(401);
    });

    it('returns tokens and profile for valid login', async () => {
      const user = await createUser(Role.User, 'user1', 'user1@example.com');
      const loginResponse = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ username: user.username, password })
        .expect(200);

      expect(loginResponse.body.access_token).toBeDefined();
      expect(loginResponse.body.refresh_token).toBeDefined();
      expect(loginResponse.body.user.username).toBe(user.username);

      const profileResponse = await request(app.getHttpServer())
        .get('/auth/profile')
        .set('Authorization', `Bearer ${loginResponse.body.access_token}`)
        .expect(200);

      expect(profileResponse.body.username).toBe(user.username);
    });
  });

  describe('users access control', () => {
    it('blocks non-admin access to user list', async () => {
      await createUser(Role.User, 'user2', 'user2@example.com');
      const token = await loginAndGetToken('user2');

      await request(app.getHttpServer())
        .get('/users')
        .set('Authorization', `Bearer ${token}`)
        .expect(403);
    });

    it('allows admin access to user list', async () => {
      await createUser(Role.Admin, 'admin1', 'admin1@example.com');
      const token = await loginAndGetToken('admin1');

      const response = await request(app.getHttpServer())
        .get('/users')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
    });

    it('requires auth for user profile by username', async () => {
      await createUser(Role.User, 'user3', 'user3@example.com');
      await request(app.getHttpServer()).get('/users/user3').expect(401);
    });
  });

  describe('courses access control', () => {
    it('lists public courses without auth', async () => {
      await createCourse('Public Course');

      const response = await request(app.getHttpServer())
        .get('/courses')
        .expect(200);

      expect(response.body[0].title).toBe('Public Course');
      expect(response.body[0].has_access).toBe(false);
    });

    it('requires auth for course detail', async () => {
      const course = await createCourse('Restricted Course');
      await request(app.getHttpServer()).get(`/courses/${course.id}`).expect(401);
    });

    it('returns redacted course content for normal users', async () => {
      const course = await createCourse('Redacted Course');
      await createUser(Role.User, 'user4', 'user4@example.com');
      const token = await loginAndGetToken('user4');

      const response = await request(app.getHttpServer())
        .get(`/courses/${course.id}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.has_access).toBe(false);
      expect(response.body.units[0].text_content).toBeUndefined();
    });

    it('returns full course content for admins', async () => {
      const course = await createCourse('Admin Course');
      await createUser(Role.Admin, 'admin2', 'admin2@example.com');
      const token = await loginAndGetToken('admin2');

      const response = await request(app.getHttpServer())
        .get(`/courses/${course.id}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.has_access).toBe(true);
      expect(response.body.units[0].text_content).toBeDefined();
    });
  });

  describe('progress access control', () => {
    it('requires auth for progress endpoints', async () => {
      await request(app.getHttpServer()).get('/progress/courses').expect(401);
      await request(app.getHttpServer()).post('/progress/courses/1/reset').expect(401);
    });
  });

  describe('purchases access control', () => {
    it('requires auth for purchase endpoints', async () => {
      await request(app.getHttpServer()).post('/purchases/course').expect(401);
      await request(app.getHttpServer()).post('/purchases/create-payment-intent').expect(401);
      await request(app.getHttpServer()).post('/purchases/pro-membership').expect(401);
    });

    it('rejects non-admin for direct course grant and pro upgrade', async () => {
      const course = await createCourse('Direct Grant Course');
      await createUser(Role.User, 'nogrant', 'nogrant@example.com');
      const token = await loginAndGetToken('nogrant');

      await request(app.getHttpServer())
        .post('/purchases/course')
        .set('Authorization', `Bearer ${token}`)
        .send({ courseId: course.id })
        .expect(403);

      await request(app.getHttpServer())
        .post('/purchases/pro-membership')
        .set('Authorization', `Bearer ${token}`)
        .send({ duration: 'monthly' })
        .expect(403);
    });

    it('allows admin to grant themselves a course via direct grant', async () => {
      const course = await createCourse('Admin Self Grant');
      await createUser(Role.Admin, 'admingrant3', 'admingrant3@example.com');
      const adminToken = await loginAndGetToken('admingrant3');

      await request(app.getHttpServer())
        .post('/purchases/course')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ courseId: course.id })
        .expect(201);
    });
  });

  describe('mass assignment protection (C1)', () => {
    it('ignores role/password escalation attempts on PATCH /users/me', async () => {
      const user = await createUser(Role.User, 'escalate', 'escalate@example.com');
      const token = await loginAndGetToken('escalate');

      const response = await request(app.getHttpServer())
        .patch('/users/me')
        .set('Authorization', `Bearer ${token}`)
        .send({
          first_name: 'Updated',
          role: 'admin',
          password: 'hacked-password',
          token_version: 999,
        })
        .expect(200);

      expect(response.body.first_name).toBe('Updated');
      expect(response.body.role).toBe(Role.User);

      const reloaded = await userRepository.findOneBy({ id: user.id });
      expect(reloaded.role).toBe(Role.User);
      expect(reloaded.token_version).not.toBe(999);

      // Original password still works (was not overwritten)
      await request(app.getHttpServer())
        .post('/auth/login')
        .send({ username: 'escalate', password })
        .expect(200);
    });
  });

  describe('course update with whitelist validation (C1 prep)', () => {
    it('normalizes numeric unit ids to refs, keeps image_focal_point, strips unknown keys', async () => {
      const course = await createCourse('Whitelist Course');
      await createUser(Role.Admin, 'courseadmin', 'courseadmin@example.com');
      const token = await loginAndGetToken('courseadmin');

      const body = {
        ...seedCoursePayload('Whitelist Course'),
        image_focal_point: 'center 30%',
        totally_unknown_key: 'should be stripped',
        units: [
          {
            id: 11, // legacy numeric id, as stored in real payloads
            title: 'Unit 1.1',
            sub_title: 'Numeric ID unit',
            description: 'desc',
            text_content: 'content',
            sub_units: [],
          },
        ],
      };

      const response = await request(app.getHttpServer())
        .put(`/courses/${course.id}`)
        .set('Authorization', `Bearer ${token}`)
        .send(body)
        .expect(200);

      const savedPayload = JSON.parse(response.body.payload);
      expect(savedPayload.units[0].id).toBe('u11'); // numeric → canonical ref
      expect(savedPayload.units[0].sub_title).toBe('Numeric ID unit');
      expect(savedPayload.image_focal_point).toBe('center 30%');
      expect(savedPayload).not.toHaveProperty('totally_unknown_key');
    });

    it('returns 404 when updating a missing course (R3)', async () => {
      await createUser(Role.Admin, 'courseadmin2', 'courseadmin2@example.com');
      const token = await loginAndGetToken('courseadmin2');

      await request(app.getHttpServer())
        .put('/courses/99999')
        .set('Authorization', `Bearer ${token}`)
        .send(seedCoursePayload('Ghost Course'))
        .expect(404);
    });
  });

  describe('class exam org scoping (C2)', () => {
    const seedOrgExam = async () => {
      const course = await createCourse('Org Course');

      const orgA = await organizationRepository.save({ name: 'Org A', max_students: 30 });
      const orgB = await organizationRepository.save({ name: 'Org B', max_students: 30 });

      const managerA = await createUser(Role.User, 'managera', 'managera@example.com');
      await memberRepository.save({
        organizationId: orgA.id,
        userId: managerA.id,
        role: OrgRole.Manager,
      });

      const question = await questionRepository.save({
        course_id: course.id,
        unit_ref: 'u1',
        sub_unit_ref: null,
        unit_id: null,
        sub_unit_id: null,
        question_text: 'What is 2+2?',
        choices: [
          { id: 1, text: '3', is_correct: false },
          { id: 2, text: '4', is_correct: true },
        ],
        explanation: 'Basic arithmetic.',
        standard: null,
        figure_ref: null,
        priority: 1,
        difficulty: 'medium' as const,
        status: 'active' as const,
      });

      const exam = await examRepository.save({
        course_id: course.id,
        scope: 'unit' as const,
        exam_pool: 'scoped' as const,
        scope_refs: ['u1'],
        scope_ids: [],
        question_ids: [question.id],
        is_randomized: true,
        version: 'v1',
        generated_by: 'teacher' as const,
        created_by_user_id: null,
        dedup_key: null,
      });

      const classExamB = await classExamRepository.save({
        exam_id: exam.id,
        assigned_by_user_id: managerA.id,
        organization_id: orgB.id,
        label: 'Org B exam',
        due_date: null,
      });

      return { course, orgA, orgB, managerA, exam, question, classExamB };
    };

    it("blocks a manager from listing another org's class exams", async () => {
      const { orgA, orgB } = await seedOrgExam();
      const token = await loginAndGetToken('managera');

      await request(app.getHttpServer())
        .get(`/exams/class?orgId=${orgB.id}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(403);

      // Positive control: own org succeeds
      await request(app.getHttpServer())
        .get(`/exams/class?orgId=${orgA.id}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);
    });

    it('blocks a manager from generating a class exam for another org', async () => {
      const { course, orgB } = await seedOrgExam();
      const token = await loginAndGetToken('managera');

      await request(app.getHttpServer())
        .post('/exams/class')
        .set('Authorization', `Bearer ${token}`)
        .send({
          course_id: course.id,
          scope: 'unit',
          scope_refs: ['u1'],
          organization_id: orgB.id,
        })
        .expect(403);
    });

    it("blocks a manager from reading another org's class exam results", async () => {
      const { classExamB } = await seedOrgExam();
      const token = await loginAndGetToken('managera');

      await request(app.getHttpServer())
        .get(`/exams/class/${classExamB.id}/results`)
        .set('Authorization', `Bearer ${token}`)
        .expect(403);
    });

    it('allows a site admin to read any org class exam results', async () => {
      const { classExamB } = await seedOrgExam();
      await createUser(Role.Admin, 'orgadmin', 'orgadmin@example.com');
      const token = await loginAndGetToken('orgadmin');

      const response = await request(app.getHttpServer())
        .get(`/exams/class/${classExamB.id}/results`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.class_exam_id).toBe(classExamB.id);
    });
  });

  describe('exam answer key hiding (M2)', () => {
    const seedExamForUser = async () => {
      const course = await createCourse('Exam Course');
      await createUser(Role.Admin, 'examtaker', 'examtaker@example.com');
      const token = await loginAndGetToken('examtaker');

      const question = await questionRepository.save({
        course_id: course.id,
        unit_ref: 'u1',
        sub_unit_ref: null,
        unit_id: null,
        sub_unit_id: null,
        question_text: 'Pick the correct answer.',
        choices: [
          { id: 1, text: 'Wrong', is_correct: false },
          { id: 2, text: 'Right', is_correct: true },
        ],
        explanation: 'The second choice is correct because reasons.',
        standard: null,
        figure_ref: null,
        priority: 1,
        difficulty: 'medium' as const,
        status: 'active' as const,
      });

      const exam = await examRepository.save({
        course_id: course.id,
        scope: 'unit' as const,
        exam_pool: 'scoped' as const,
        scope_refs: ['u1'],
        scope_ids: [],
        question_ids: [question.id],
        is_randomized: true,
        version: 'v1',
        generated_by: 'student' as const,
        created_by_user_id: null,
        dedup_key: null,
      });

      return { token, exam, question };
    };

    it('never returns correct_choice_id or explanation from submit', async () => {
      const { token, exam, question } = await seedExamForUser();

      const response = await request(app.getHttpServer())
        .post(`/exams/${exam.id}/submit`)
        .set('Authorization', `Bearer ${token}`)
        .send({ answers: [{ question_id: question.id, selected_choice_id: 1 }] })
        .expect(201);

      expect(response.body.score).toBe(0);
      expect(response.body.answers).toHaveLength(1);
      expect(response.body.answers[0].is_correct).toBe(false);
      expect(response.body.answers[0]).not.toHaveProperty('correct_choice_id');
      expect(response.body.answers[0]).not.toHaveProperty('explanation');
    });

    it('never returns correct_choice_id or explanation from the attempt endpoint', async () => {
      const { token, exam, question } = await seedExamForUser();

      await request(app.getHttpServer())
        .post(`/exams/${exam.id}/submit`)
        .set('Authorization', `Bearer ${token}`)
        .send({ answers: [{ question_id: question.id, selected_choice_id: 2 }] })
        .expect(201);

      const response = await request(app.getHttpServer())
        .get(`/exams/${exam.id}/attempt`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.answers[0].is_correct).toBe(true);
      expect(response.body.answers[0]).not.toHaveProperty('correct_choice_id');
      expect(response.body.answers[0]).not.toHaveProperty('explanation');
    });
  });

  describe('unit refs data model (PR 3)', () => {
    /** Creates a course through the API so course_units is built. */
    const createCourseViaApi = async (token: string, title: string) => {
      const body = {
        ...seedCoursePayload(title),
        units: [
          {
            id: 1, // legacy numeric — normalized to u1
            title: 'Regulations',
            text_content: 'unit content',
            sub_units: [
              { id: 11, title: 'Applicability', text_content: 'lesson content', sub_units: [] },
              { id: 13, title: 'Operational Rules', text_content: 'lesson content', sub_units: [] },
            ],
          },
          {
            id: 10, // the unit that collided with prefix math
            title: 'Radio Communications',
            text_content: 'unit content',
            sub_units: [
              { id: 101, title: 'Radio in the NAS', text_content: 'lesson content', sub_units: [] },
            ],
          },
        ],
      };
      const response = await request(app.getHttpServer())
        .post('/courses')
        .set('Authorization', `Bearer ${token}`)
        .send(body)
        .expect(201);
      return response.body as Course;
    };

    const seedQuestion = (courseId: number, unitRef: string, subUnitRef: string | null, text: string) =>
      questionRepository.save({
        course_id: courseId,
        unit_ref: unitRef,
        sub_unit_ref: subUnitRef,
        unit_id: null,
        sub_unit_id: null,
        question_text: text,
        choices: [
          { id: 1, text: 'A', is_correct: true },
          { id: 2, text: 'B', is_correct: false },
        ],
        explanation: null,
        standard: null,
        figure_ref: null,
        priority: 1,
        difficulty: 'medium' as const,
        status: 'active' as const,
      });

    it('rebuilds course_units with normalized refs, parent refs, and legacy ids on save', async () => {
      await createUser(Role.Admin, 'refsadmin', 'refsadmin@example.com');
      const token = await loginAndGetToken('refsadmin');
      const course = await createCourseViaApi(token, 'Refs Course');

      const rows = await courseUnitRepository.find({
        where: { course_id: course.id },
        order: { depth: 'ASC', position: 'ASC' },
      });
      expect(rows.map((r) => r.ref).sort()).toEqual(['u1', 'u10', 'u101', 'u11', 'u13']);

      const u101 = rows.find((r) => r.ref === 'u101');
      expect(u101.parent_ref).toBe('u10'); // owned by unit 10, not prefix-math unit 1
      expect(u101.legacy_id).toBe(101);
      expect(u101.depth).toBe(1);

      // Payload ids were rewritten to refs
      const saved = await courseRepository.findOneBy({ id: course.id });
      const payload = JSON.parse(saved.payload);
      expect(payload.units.map((u: { id: string }) => u.id)).toEqual(['u1', 'u10']);

      // Re-uploading the same payload is idempotent (same refs, no dupes)
      await request(app.getHttpServer())
        .put(`/courses/${course.id}`)
        .set('Authorization', `Bearer ${token}`)
        .send(payload)
        .expect(200);
      const rowsAfter = await courseUnitRepository.find({ where: { course_id: course.id } });
      expect(rowsAfter.map((r) => r.ref).sort()).toEqual(['u1', 'u10', 'u101', 'u11', 'u13']);
    });

    it('generates ref-scoped exams without unit 1 / unit 10 collisions', async () => {
      await createUser(Role.Admin, 'refsexam', 'refsexam@example.com');
      const token = await loginAndGetToken('refsexam');
      const course = await createCourseViaApi(token, 'Refs Exam Course');

      const q1 = await seedQuestion(course.id, 'u1', 'u11', 'Unit 1 question');
      const q10 = await seedQuestion(course.id, 'u10', 'u101', 'Unit 10 question');

      const unit1 = await request(app.getHttpServer())
        .post('/exams/generate')
        .set('Authorization', `Bearer ${token}`)
        .send({ course_id: course.id, scope: 'unit', scope_refs: ['u1'] })
        .expect(201);
      expect(unit1.body.scope_refs).toEqual(['u1']);
      expect(unit1.body.questions.map((q: { id: number }) => q.id)).toEqual([q1.id]);

      const unit10 = await request(app.getHttpServer())
        .post('/exams/generate')
        .set('Authorization', `Bearer ${token}`)
        .send({ course_id: course.id, scope: 'unit', scope_refs: ['u10'] })
        .expect(201);
      expect(unit10.body.questions.map((q: { id: number }) => q.id)).toEqual([q10.id]);
    });

    it('maps legacy scope_ids to refs on generate', async () => {
      await createUser(Role.Admin, 'legacyscope', 'legacyscope@example.com');
      const token = await loginAndGetToken('legacyscope');
      const course = await createCourseViaApi(token, 'Legacy Scope Course');
      await seedQuestion(course.id, 'u1', null, 'Legacy scoped question');

      const response = await request(app.getHttpServer())
        .post('/exams/generate')
        .set('Authorization', `Bearer ${token}`)
        .send({ course_id: course.id, scope: 'unit', scope_ids: [1] })
        .expect(201);

      expect(response.body.scope_refs).toEqual(['u1']);
      expect(response.body.questions).toHaveLength(1);
    });

    it('returns titled section breakdown on submit', async () => {
      await createUser(Role.Admin, 'breakdown', 'breakdown@example.com');
      const token = await loginAndGetToken('breakdown');
      const course = await createCourseViaApi(token, 'Breakdown Course');
      const question = await seedQuestion(course.id, 'u1', 'u11', 'Breakdown question');

      const generated = await request(app.getHttpServer())
        .post('/exams/generate')
        .set('Authorization', `Bearer ${token}`)
        .send({ course_id: course.id, scope: 'unit', scope_refs: ['u1'] })
        .expect(201);

      const submit = await request(app.getHttpServer())
        .post(`/exams/${generated.body.id}/submit`)
        .set('Authorization', `Bearer ${token}`)
        .send({ answers: [{ question_id: question.id, selected_choice_id: 1 }] })
        .expect(201);

      const breakdown = submit.body.section_breakdown;
      expect(breakdown).toHaveLength(1);
      expect(breakdown[0].unit_ref).toBe('u1');
      expect(breakdown[0].sub_unit_ref).toBe('u11');
      expect(breakdown[0].unit_title).toBe('Regulations');
      expect(breakdown[0].sub_unit_title).toBe('Applicability');
      expect(breakdown[0].score_percent).toBe(100);
    });

    it('tracks unit progress by ref in unit_statuses and rejects unknown refs', async () => {
      await createUser(Role.Admin, 'refprogress', 'refprogress@example.com');
      const token = await loginAndGetToken('refprogress');
      const course = await createCourseViaApi(token, 'Ref Progress Course');

      const response = await request(app.getHttpServer())
        .patch(`/progress/courses/${course.id}/units/u11`)
        .set('Authorization', `Bearer ${token}`)
        .send({ status: ProgressStatus.COMPLETED })
        .expect(200);
      expect(response.body.status).toBe(ProgressStatus.COMPLETED);

      const user = await userRepository.findOneBy({ username: 'refprogress' });
      const progress = await progressRepository.findOneBy({
        userId: user.id,
        courseId: course.id,
      });
      expect(progress.unit_statuses).toEqual({ u11: ProgressStatus.COMPLETED });
      expect(progress.units_total).toBe(5);
      expect(progress.units_completed).toBe(1);

      await request(app.getHttpServer())
        .patch(`/progress/courses/${course.id}/units/no-such-ref`)
        .set('Authorization', `Bearer ${token}`)
        .send({ status: ProgressStatus.COMPLETED })
        .expect(404);
    });

    it('validates question refs against course_units on import', async () => {
      await createUser(Role.Admin, 'importrefs', 'importrefs@example.com');
      const token = await loginAndGetToken('importrefs');
      const course = await createCourseViaApi(token, 'Import Refs Course');

      const question = (unitRef: string) => ({
        course_id: course.id,
        question_text: `Question for ${unitRef}`,
        choices: [
          { id: 1, text: 'A', is_correct: true },
          { id: 2, text: 'B', is_correct: false },
        ],
        unit_ref: unitRef,
        priority: 2,
      });

      const response = await request(app.getHttpServer())
        .post('/questions/import')
        .set('Authorization', `Bearer ${token}`)
        .send({
          course_id: course.id,
          questions: [question('u1'), question('u999')],
        })
        .expect(201);

      // Valid ref imported; unknown ref skipped (not silently mislinked)
      expect(response.body.created).toBe(1);
      expect(response.body.skipped).toBe(1);
    });
  });

  describe('cookie auth (H1)', () => {
    const getCookies = (response: request.Response): string[] =>
      ([] as string[]).concat(response.headers['set-cookie'] ?? []);

    const cookieValue = (cookies: string[], name: string): string | undefined => {
      const cookie = cookies.find((c) => c.startsWith(`${name}=`));
      return cookie?.split(';')[0].split('=').slice(1).join('=');
    };

    it('sets HttpOnly access and refresh cookies on login', async () => {
      await createUser(Role.User, 'cookieuser', 'cookieuser@example.com');

      const response = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ username: 'cookieuser', password })
        .expect(200);

      const cookies = getCookies(response);
      const accessCookie = cookies.find((c) => c.startsWith('access_token='));
      const refreshCookie = cookies.find((c) => c.startsWith('refresh_token='));

      expect(accessCookie).toBeDefined();
      expect(accessCookie).toMatch(/HttpOnly/i);
      expect(accessCookie).toMatch(/SameSite=Lax/i);
      expect(refreshCookie).toBeDefined();
      expect(refreshCookie).toMatch(/HttpOnly/i);
    });

    it('authenticates via cookie only (no Authorization header)', async () => {
      await createUser(Role.User, 'cookieonly', 'cookieonly@example.com');

      const loginResponse = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ username: 'cookieonly', password })
        .expect(200);

      const cookies = getCookies(loginResponse);
      const accessToken = cookieValue(cookies, 'access_token');

      const profileResponse = await request(app.getHttpServer())
        .get('/auth/profile')
        .set('Cookie', `access_token=${accessToken}`)
        .expect(200);

      expect(profileResponse.body.username).toBe('cookieonly');
    });

    it('refreshes from the cookie with an empty body and rotates cookies', async () => {
      await createUser(Role.User, 'cookierefresh', 'cookierefresh@example.com');

      const loginResponse = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ username: 'cookierefresh', password })
        .expect(200);

      const loginCookies = getCookies(loginResponse);
      const refreshToken = cookieValue(loginCookies, 'refresh_token');

      const refreshResponse = await request(app.getHttpServer())
        .post('/auth/refresh')
        .set('Cookie', `refresh_token=${refreshToken}`)
        .send({})
        .expect(200);

      const refreshedCookies = getCookies(refreshResponse);
      const newAccess = cookieValue(refreshedCookies, 'access_token');
      const newRefresh = cookieValue(refreshedCookies, 'refresh_token');

      expect(newAccess).toBeDefined();
      expect(newRefresh).toBeDefined();
      expect(newRefresh).not.toBe(refreshToken); // verifier rotated

      // New access cookie works
      await request(app.getHttpServer())
        .get('/auth/profile')
        .set('Cookie', `access_token=${newAccess}`)
        .expect(200);
    });

    it('rejects refresh without cookie or body token', async () => {
      await request(app.getHttpServer()).post('/auth/refresh').send({}).expect(401);
    });

    it('clears cookies and invalidates the session on logout', async () => {
      await createUser(Role.User, 'cookielogout', 'cookielogout@example.com');

      const loginResponse = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ username: 'cookielogout', password })
        .expect(200);

      const cookies = getCookies(loginResponse);
      const refreshToken = cookieValue(cookies, 'refresh_token');

      const logoutResponse = await request(app.getHttpServer())
        .post('/auth/logout')
        .set('Cookie', `refresh_token=${refreshToken}`)
        .send({})
        .expect(200);

      const clearedCookies = getCookies(logoutResponse);
      const clearedAccess = clearedCookies.find((c) => c.startsWith('access_token='));
      const clearedRefresh = clearedCookies.find((c) => c.startsWith('refresh_token='));
      expect(clearedAccess).toMatch(/access_token=;|Expires=Thu, 01 Jan 1970/i);
      expect(clearedRefresh).toMatch(/refresh_token=;|Expires=Thu, 01 Jan 1970/i);

      // The invalidated session can no longer refresh
      await request(app.getHttpServer())
        .post('/auth/refresh')
        .set('Cookie', `refresh_token=${refreshToken}`)
        .send({})
        .expect(401);
    });

    it('still accepts Bearer tokens (backward compatibility)', async () => {
      await createUser(Role.User, 'beareruser', 'beareruser@example.com');
      const token = await loginAndGetToken('beareruser');

      const response = await request(app.getHttpServer())
        .get('/auth/profile')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.username).toBe('beareruser');
    });
  });
});
