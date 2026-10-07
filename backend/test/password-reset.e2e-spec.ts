import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import * as cookieParser from 'cookie-parser';
import { webcrypto } from 'crypto';
import { DataSource, Repository } from 'typeorm';
import { getRepositoryToken } from '@nestjs/typeorm';
import { AppModule } from './../src/app.module';
import { UsersService } from '../src/users/user.service';
import { User } from '../src/users/types/user.entity';
import { Role } from '../src/users/types/role.enum';
import { EmailService } from '../src/email/email.service';
import { Organization } from '../src/organizations/types/organization.entity';
import { OrganizationMember } from '../src/organizations/types/organization-member.entity';
import { OrgRole } from '../src/organizations/types/org-role.enum';

/**
 * Password reset paths and classroom-safe limits through the real HTTP stack
 * (TODO "Shared-IP + bot hardening" A + E). Email is captured, not sent.
 */
describe('Password reset and lockout (e2e)', () => {
  const password = 'TestPassword123!';
  let app: INestApplication;
  let dataSource: DataSource;
  let userRepository: Repository<User>;
  let seq = 0;
  const resetLinks: { email: string; link: string }[] = [];

  const http = () => request(app.getHttpServer());
  // Each test gets its own fake IP so per-IP route limits never collide.
  const ip = () => `10.77.0.${++seq}`;

  const createUser = async (role: Role = Role.User) => {
    seq += 1;
    const name = `pr${seq}_${Date.now() % 100000}`;
    return userRepository.save({
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
  };

  const loginToken = async (username: string, pw = password) =>
    (
      await http()
        .post('/auth/login')
        .set('X-Forwarded-For', ip())
        .send({ username, password: pw })
        .expect(200)
    ).body.access_token as string;

  const tokenFromLink = (link: string) =>
    new URL(link).searchParams.get('token') as string;

  beforeAll(async () => {
    if (!globalThis.crypto) globalThis.crypto = webcrypto as Crypto;
    process.env.STRIPE_SECRET_KEY =
      process.env.STRIPE_SECRET_KEY || 'sk_test_123';
    process.env.JWT_SECRET = process.env.JWT_SECRET || 'test_jwt_secret';
    process.env.JWT_RESET_SECRET =
      process.env.JWT_RESET_SECRET || 'test_jwt_reset_secret';
    process.env.JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '1h';
    process.env.FRONTEND_URL = 'https://thedroneedge.com';

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.use(cookieParser());
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, transform: true }),
    );
    await app.init();
    dataSource = app.get(DataSource);
    userRepository = app.get(getRepositoryToken(User));
    jest
      .spyOn(app.get(EmailService), 'sendPasswordResetEmail')
      .mockImplementation(async (user: User, link: string) => {
        resetLinks.push({ email: user.email, link });
      });
  });

  afterAll(async () => {
    await dataSource?.query(
      `DELETE FROM "users" WHERE username LIKE 'pr%\\_%'`,
    );
    await app?.close();
  });

  it('forgot-password accepts an email-only body and sends a working, single-use link', async () => {
    const user = await createUser();
    await http()
      .post('/auth/forgot-password')
      .set('X-Forwarded-For', ip())
      .send({ email: user.email.toUpperCase() })
      .expect(201);
    const sent = resetLinks.filter((r) => r.email === user.email);
    expect(sent).toHaveLength(1);
    const token = tokenFromLink(sent[0].link);

    await http()
      .post('/auth/reset-password')
      .set('X-Forwarded-For', ip())
      .send({ token, password: 'BrandNewPass1' })
      .expect(201);
    await loginToken(user.username, 'BrandNewPass1');

    // Same link again: token_version moved on.
    await http()
      .post('/auth/reset-password')
      .set('X-Forwarded-For', ip())
      .send({ token, password: 'AnotherPass22' })
      .expect(401);
  });

  it('allows one reset email per address per minute, whatever the IP or case', async () => {
    const user = await createUser();
    await http()
      .post('/auth/forgot-password')
      .set('X-Forwarded-For', ip())
      .send({ email: user.email })
      .expect(201);
    const limited = await http()
      .post('/auth/forgot-password')
      .set('X-Forwarded-For', ip())
      .send({ email: user.email.toUpperCase() })
      .expect(429);
    expect(limited.body.retry_after_seconds).toBeGreaterThan(0);
    expect(resetLinks.filter((r) => r.email === user.email)).toHaveLength(1);
  });

  it('a classroom on one IP can all request resets in the same minute', async () => {
    const schoolIp = ip();
    const students = await Promise.all(
      Array.from({ length: 12 }, () => createUser()),
    );
    for (const s of students) {
      await http()
        .post('/auth/forgot-password')
        .set('X-Forwarded-For', schoolIp)
        .send({ email: s.email })
        .expect(201);
    }
  });

  it('locks an account after 8 wrong passwords, from any IP', async () => {
    const user = await createUser();
    for (let i = 0; i < 8; i++) {
      await http()
        .post('/auth/login')
        .set('X-Forwarded-For', ip())
        .send({ username: user.username, password: 'wrong-password' })
        .expect(401);
    }
    const locked = await http()
      .post('/auth/login')
      .set('X-Forwarded-For', ip())
      .send({ username: user.username, password })
      .expect(429);
    expect(locked.body.message).toMatch(/Too many incorrect passwords/);
  });

  it('rejects registration passwords under 8 characters', async () => {
    await http()
      .post('/auth/register')
      .set('X-Forwarded-For', ip())
      .send({
        username: 'pr_short',
        email: 'pr_short@example.com',
        password: 'abc',
      })
      .expect(400);
  });

  describe('teacher reset code', () => {
    let orgId: number;
    let managerToken: string;
    let manager: User;
    let student: User;
    let otherManager: User;

    beforeAll(async () => {
      const orgs: Repository<Organization> = app.get(
        getRepositoryToken(Organization),
      );
      const members: Repository<OrganizationMember> = app.get(
        getRepositoryToken(OrganizationMember),
      );
      const org = await orgs.save(
        orgs.create({
          name: `Reset Code School ${Date.now()}`,
          max_students: 40,
        }),
      );
      orgId = org.id;
      manager = await createUser();
      otherManager = await createUser();
      student = await createUser();
      await members.save([
        { organizationId: orgId, userId: manager.id, role: OrgRole.Manager },
        {
          organizationId: orgId,
          userId: otherManager.id,
          role: OrgRole.Manager,
        },
        { organizationId: orgId, userId: student.id, role: OrgRole.Member },
      ]);
      managerToken = await loginToken(manager.username);
    });

    const issue = (userId: number) =>
      http()
        .post(`/auth/organizations/${orgId}/members/${userId}/reset-code`)
        .set('Authorization', `Bearer ${managerToken}`)
        .send({});

    it('lets a manager reset a student, once, and the student signs in', async () => {
      const { body } = await issue(student.id).expect(201);
      expect(body.code).toMatch(/^[A-Z2-9]{4}-[A-Z2-9]{4}$/);

      await http()
        .post('/auth/reset-with-code')
        .set('X-Forwarded-For', ip())
        .send({
          username: student.username,
          code: 'AAAA-AAAA',
          password: 'StudentPass9',
        })
        .expect(401);
      await http()
        .post('/auth/reset-with-code')
        .set('X-Forwarded-For', ip())
        .send({
          username: student.username.toUpperCase(),
          code: body.code.toLowerCase().replace('-', ' '),
          password: 'StudentPass9',
        })
        .expect(201);
      await loginToken(student.username, 'StudentPass9');

      // Used: the same code no longer works.
      await http()
        .post('/auth/reset-with-code')
        .set('X-Forwarded-For', ip())
        .send({
          username: student.username,
          code: body.code,
          password: 'OtherPass99',
        })
        .expect(401);
    });

    it('kills the code after 5 wrong tries', async () => {
      const { body } = await issue(student.id).expect(201);
      for (let i = 0; i < 5; i++) {
        await http()
          .post('/auth/reset-with-code')
          .set('X-Forwarded-For', ip())
          .send({
            username: student.username,
            code: 'ZZZZ-ZZZZ',
            password: 'StudentPass9',
          })
          .expect(401);
      }
      await http()
        .post('/auth/reset-with-code')
        .set('X-Forwarded-For', ip())
        .send({
          username: student.username,
          code: body.code,
          password: 'StudentPass9',
        })
        .expect(401);
    });

    it('refuses codes for another manager and for non-managers', async () => {
      await issue(otherManager.id).expect(403);
      const studentToken = await loginToken(student.username, 'StudentPass9');
      await http()
        .post(`/auth/organizations/${orgId}/members/${manager.id}/reset-code`)
        .set('Authorization', `Bearer ${studentToken}`)
        .send({})
        .expect(403);
    });
  });
});
