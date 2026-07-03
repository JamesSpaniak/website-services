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
import { CourseDetails } from '../src/courses/types/course.dto';
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
        exam: {
          retries_allowed: 1,
          questions: [
            {
              id: 1,
              question: 'Question 1',
              answers: [
                { id: 1, text: 'A', correct: true },
                { id: 2, text: 'B', correct: false },
              ],
            },
          ],
        },
      },
    ],
    status: undefined,
    price: 49.95,
    has_access: false,
  });

  const truncateAll = async () => {
    await dataSource.query(
      'TRUNCATE TABLE "sessions", "progress", "user_courses_purchased", "courses", "users", "articles", ' +
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
    it('accepts numeric unit ids and image_focal_point, strips unknown keys', async () => {
      const course = await createCourse('Whitelist Course');
      await createUser(Role.Admin, 'courseadmin', 'courseadmin@example.com');
      const token = await loginAndGetToken('courseadmin');

      const body = {
        ...seedCoursePayload('Whitelist Course'),
        image_focal_point: 'center 30%',
        totally_unknown_key: 'should be stripped',
        units: [
          {
            id: 11, // numeric id, as stored in real payloads
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
      expect(savedPayload.units[0].id).toBe(11);
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
        unit_id: 1,
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
        scope_ids: [1],
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
          scope_ids: [1],
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
        unit_id: 1,
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
        scope_ids: [1],
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
