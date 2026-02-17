import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from './../src/app.module';
import { DataSource, Repository } from 'typeorm';
import { getRepositoryToken } from '@nestjs/typeorm';
import { UsersService } from '../src/users/user.service';
import { User } from '../src/users/types/user.entity';
import { Role } from '../src/users/types/role.enum';
import { Course } from '../src/courses/types/course.entity';
import { CourseDetails } from '../src/courses/types/course.dto';
import { webcrypto } from 'crypto';

describe('API (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let userRepository: Repository<User>;
  let courseRepository: Repository<Course>;

  const password = 'TestPassword123!';

  const seedCoursePayload = (title = 'Test Course'): CourseDetails => ({
    id: 0,
    title,
    sub_title: 'Basics',
    description: 'Course description',
    text_content: 'Full course text',
    image_url: 'https://example.com/image.png',
    video_url: 'https://example.com/video.mp4',
    units: [
      {
        id: 'unit-1',
        title: 'Unit 1',
        description: 'Unit description',
        text_content: 'Unit content',
        video_url: 'https://example.com/unit.mp4',
        image_url: 'https://example.com/unit.png',
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
      'TRUNCATE TABLE "sessions", "progress", "user_courses_purchased", "courses", "users", "articles" RESTART IDENTITY CASCADE;',
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
    await app.init();

    dataSource = app.get(DataSource);
    userRepository = app.get<Repository<User>>(getRepositoryToken(User));
    courseRepository = app.get<Repository<Course>>(getRepositoryToken(Course));
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
  });
});
