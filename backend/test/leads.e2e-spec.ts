import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import * as cookieParser from 'cookie-parser';
import { DataSource } from 'typeorm';
import { webcrypto } from 'crypto';
import { AppModule } from './../src/app.module';
import {
  MarketingMailerService,
  MarketingMessage,
} from '../src/email/marketing-mailer.service';
import { UsersService } from '../src/users/user.service';
import { Role } from '../src/users/types/role.enum';

/**
 * Waitlist / unsubscribe / admin leads / SES events through the real HTTP
 * stack (launch plan W3, Z2–Z4). SES is replaced by a recorder.
 */
describe('Leads (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  const sent: MarketingMessage[] = [];
  const mailer = {
    siteUrl: 'https://thedroneedge.com',
    maxSendRate: 1000,
    isReady: () => true,
    send: async (msg: MarketingMessage) => {
      sent.push(msg);
      return { sent: true, messageId: `m-${sent.length}` };
    },
  };

  const tokenFrom = (msg: MarketingMessage) =>
    decodeURIComponent(new URL(msg.oneClickUrl).searchParams.get('t') ?? '');

  beforeAll(async () => {
    if (!globalThis.crypto) globalThis.crypto = webcrypto as Crypto;
    process.env.STRIPE_SECRET_KEY =
      process.env.STRIPE_SECRET_KEY || 'sk_test_123';
    process.env.JWT_SECRET = process.env.JWT_SECRET || 'test_jwt_secret';
    process.env.JWT_RESET_SECRET =
      process.env.JWT_RESET_SECRET || 'test_jwt_reset_secret';
    process.env.JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '1h';
    process.env.JWT_RESET_EXPIRES_IN = process.env.JWT_RESET_EXPIRES_IN || '1h';
    process.env.LEADS_UNSUBSCRIBE_SECRET = 'e2e-unsubscribe-secret';

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(MarketingMailerService)
      .useValue(mailer)
      .compile();

    app = moduleFixture.createNestApplication();
    app.use(cookieParser());
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, transform: true }),
    );
    await app.init();
    dataSource = app.get(DataSource);
    await dataSource.query('TRUNCATE TABLE "leads" RESTART IDENTITY');
    await dataSource.query(
      `DELETE FROM "users" WHERE username = 'leads_e2e_admin'`,
    );
  });

  afterAll(async () => {
    await dataSource?.query(
      `DELETE FROM "users" WHERE username = 'leads_e2e_admin'`,
    );
    await app?.close();
  });

  it('captures a lead once, lowercases the email, keeps attribution, sends one confirmation', async () => {
    const body = {
      email: '  Pilot@Example.COM ',
      interest: 'building',
      website: '',
      source_path: '/courses/tracks/building',
      utm_source: 'actionspace',
      utm_campaign: 'oct8-announce',
      ts: '2026-10-03T00:00:00Z', // cookie field the DTO does not declare — stripped
    };
    await request(app.getHttpServer())
      .post('/leads')
      .send(body)
      .expect(202, { ok: true });
    await request(app.getHttpServer())
      .post('/leads')
      .send(body)
      .expect(202, { ok: true });

    const rows = await dataSource.query(`SELECT * FROM leads`);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      email: 'pilot@example.com',
      interest: 'building',
      utm_source: 'actionspace',
      utm_campaign: 'oct8-announce',
    });
    expect(rows[0].confirmation_sent_at).not.toBeNull();
    expect(sent).toHaveLength(1);
    expect(sent[0].subject).toContain('Drone Building early access');
    expect(sent[0].unsubscribePageUrl).toMatch(
      /^https:\/\/thedroneedge\.com\/unsubscribe\?t=/,
    );
  });

  it('drops honeypot submissions silently and rejects bad input', async () => {
    await request(app.getHttpServer())
      .post('/leads')
      .send({
        email: 'bot@example.com',
        interest: 'newsletter',
        website: 'http://spam',
      })
      .expect(202);
    const [{ count }] = await dataSource.query(
      `SELECT count(*)::int AS count FROM leads WHERE email = 'bot@example.com'`,
    );
    expect(count).toBe(0);

    await request(app.getHttpServer())
      .post('/leads')
      .send({ email: 'x@example.com', interest: 'video' })
      .expect(400);
  });

  it('shows preferences and unsubscribes via RFC 8058 one-click', async () => {
    const t = tokenFrom(sent[0]);
    const prefs = await request(app.getHttpServer())
      .get('/leads/preferences')
      .query({ t })
      .expect(200);
    expect(prefs.body).toEqual({
      email_masked: 'p***@example.com',
      interests: [{ interest: 'building', subscribed: true }],
    });

    await request(app.getHttpServer())
      .post(`/leads/unsubscribe?t=${encodeURIComponent(t)}`)
      .type('form')
      .send('List-Unsubscribe=One-Click')
      .expect(200);
    const [row] = await dataSource.query(`SELECT unsubscribed_at FROM leads`);
    expect(row.unsubscribed_at).not.toBeNull();

    await request(app.getHttpServer())
      .get('/leads/preferences')
      .query({ t: 'v1.1.forged' })
      .expect(400);
  });

  it('re-consents an unsubscribed address and sends a fresh confirmation', async () => {
    await request(app.getHttpServer())
      .post('/leads')
      .send({ email: 'pilot@example.com', interest: 'building' })
      .expect(202);
    const [row] = await dataSource.query(
      `SELECT unsubscribed_at, utm_source FROM leads`,
    );
    expect(row.unsubscribed_at).toBeNull();
    expect(row.utm_source).toBe('actionspace'); // first touch kept
    expect(sent).toHaveLength(2);
  });

  it('keeps admin routes admin-only; dry-run counts one per address', async () => {
    await request(app.getHttpServer()).get('/leads').expect(401);

    await dataSource.query(
      `INSERT INTO users (username, email, password, role, is_email_verified, token_version)
       VALUES ('leads_e2e_admin', 'admin-e2e@example.com', $1, $2, true, 0)`,
      [await UsersService.hashPassword('TestPassword123!'), Role.Admin],
    );
    const login = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ username: 'leads_e2e_admin', password: 'TestPassword123!' })
      .expect(200);
    const auth = { Authorization: `Bearer ${login.body.access_token}` };

    // Same address on a second list → still one broadcast recipient.
    // (Inserted directly: the 5/min signup throttle is already spent.)
    await dataSource.query(
      `INSERT INTO leads (email, interest) VALUES ('pilot@example.com', 'newsletter')`,
    );

    const list = await request(app.getHttpServer())
      .get('/leads')
      .set(auth)
      .expect(200);
    expect(list.body).toHaveLength(2);

    const csv = await request(app.getHttpServer())
      .get('/leads/export.csv')
      .set(auth)
      .expect(200);
    expect(csv.headers['content-type']).toContain('text/csv');
    expect(csv.text.split('\n')[0]).toContain('email,interest');

    const dry = await request(app.getHttpServer())
      .post('/email/marketing/broadcast')
      .set(auth)
      .send({
        subject: 'Hello pilots',
        body_markdown: 'We are live — [try Unit 1]({{site_url}}/courses).',
        interests: ['building', 'newsletter'],
        mode: 'dry_run',
      })
      .expect(201);
    expect(dry.body).toMatchObject({
      recipients: 1,
      sent: 0,
      status: 'counted',
    });

    const before = sent.length;
    await request(app.getHttpServer())
      .post('/email/marketing/broadcast')
      .set(auth)
      .send({
        subject: 'Hello pilots',
        body_markdown: 'We are live — [try Unit 1]({{site_url}}/courses).',
        interests: ['building'],
        mode: 'test',
      })
      .expect(201);
    expect(sent[before]).toMatchObject({
      to: 'admin-e2e@example.com',
      subject: '[TEST] Hello pilots',
    });
    expect(sent[before].bodyMarkdown).toContain(
      'https://thedroneedge.com/courses',
    );
  });

  it('rejects SES events that are not signed SNS messages for our topic', async () => {
    await request(app.getHttpServer())
      .post('/email/ses-events')
      .set('Content-Type', 'text/plain')
      .send('{"Type":"Notification"}')
      .expect(403);
  });

  it('throttles waitlist signups per IP', async () => {
    const statuses: number[] = [];
    for (let i = 0; i < 7; i++) {
      const res = await request(app.getHttpServer())
        .post('/leads')
        .send({ email: `t${i}@example.com`, interest: 'part107' });
      statuses.push(res.status);
    }
    expect(statuses).toContain(429);
  });
});
