import { readFileSync } from 'fs';
import { join } from 'path';
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { webcrypto } from 'crypto';
import { AppModule } from './../src/app.module';
import { PurchaseService } from '../src/purchases/purchase.service';
import { OrderService } from '../src/commerce/order.service';
import { UsersService } from '../src/users/user.service';
import { Role } from '../src/users/types/role.enum';

/**
 * Managed Payments course purchase → refund, against the real database.
 * Replays the three events Stripe sent in the Oct 6 2026 sandbox rehearsal
 * (fixtures from scripts/capture_stripe_fixtures.py): the course
 * payment_intent.succeeded, the one-time invoice.paid Managed Payments adds
 * for it, and the full charge.refunded. Regression: the invoice used to be
 * recorded as a Pro order, and the refund then hit that order instead of the
 * course, leaving the course granted.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const fixture = (name: string): any =>
  JSON.parse(
    readFileSync(join(__dirname, 'fixtures/stripe', `${name}.json`), 'utf8'),
  );

describe('Managed Payments course refund (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let purchases: PurchaseService;
  let userId: number;
  let courseId: number;

  const purchaseEvent = fixture('payment_intent.succeeded.course');
  const invoiceEvent = fixture('invoice.paid.manual');
  const refundEvent = fixture('charge.refunded.course');
  const customerId: string = purchaseEvent.data.object.customer;
  const paymentIntentId: string = purchaseEvent.data.object.id;
  const invoiceId: string = invoiceEvent.data.object.id;

  /** The fixture's user/course ids are the rehearsal's; point them at ours. */
  const withIds = <T extends { data: { object: { metadata?: object } } }>(
    ev: T,
  ): T => {
    const copy = JSON.parse(JSON.stringify(ev));
    if (copy.data.object.metadata?.userId) {
      copy.data.object.metadata.userId = String(userId);
    }
    if (copy.data.object.metadata?.courseId) {
      copy.data.object.metadata.courseId = String(courseId);
    }
    return copy;
  };

  const ordersForUser = (): Promise<
    {
      id: number;
      stripe_payment_intent_id: string | null;
      stripe_invoice_id: string | null;
      payment_status: string;
      refunded_cents: number;
    }[]
  > =>
    dataSource.query(
      `SELECT id, stripe_payment_intent_id, stripe_invoice_id, payment_status, refunded_cents
         FROM orders WHERE user_id = $1 ORDER BY id`,
      [userId],
    );

  const ownsCourse = async (): Promise<boolean> => {
    const rows = await dataSource.query(
      `SELECT 1 FROM user_courses_purchased WHERE "usersId" = $1 AND "coursesId" = $2`,
      [userId, courseId],
    );
    return rows.length > 0;
  };

  /** Rows from this suite (and any earlier aborted run). */
  const cleanup = async () => {
    await dataSource.query(
      `DELETE FROM entitlements WHERE user_id IN (SELECT id FROM users WHERE username = 'mp_refund_e2e')`,
    );
    await dataSource.query(
      `DELETE FROM orders WHERE stripe_payment_intent_id = $1 OR stripe_invoice_id = $2
          OR user_id IN (SELECT id FROM users WHERE username = 'mp_refund_e2e')`,
      [paymentIntentId, invoiceId],
    );
    await dataSource.query(
      `DELETE FROM users WHERE username = 'mp_refund_e2e'`,
    );
    await dataSource.query(
      `DELETE FROM courses WHERE title = 'MP Refund Course'`,
    );
  };

  beforeAll(async () => {
    if (!globalThis.crypto) globalThis.crypto = webcrypto as Crypto;
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
    await app.init();
    dataSource = app.get(DataSource);
    purchases = app.get(PurchaseService);

    // The only Stripe API call on this path: charge.refunded resolves the
    // invoice paid by the PaymentIntent (Managed Payments invoices courses).
    const stripe = app.get('STRIPE_CLIENT');
    jest
      .spyOn(stripe.invoicePayments, 'list')
      .mockResolvedValue({ data: [{ invoice: invoiceId }] } as never);

    await cleanup();
    const [user] = await dataSource.query(
      `INSERT INTO users (username, email, password, role, is_email_verified, token_version, stripe_customer_id)
       VALUES ('mp_refund_e2e', 'mp_refund_e2e@example.com', $1, $2, true, 0, $3)
       RETURNING id`,
      [await UsersService.hashPassword('Password123!'), Role.User, customerId],
    );
    userId = user.id;
    const [course] = await dataSource.query(
      `INSERT INTO courses (title, payload, hidden, price)
       VALUES ('MP Refund Course', '{"units":[]}', false, 129)
       RETURNING id`,
    );
    courseId = course.id;
  });

  afterAll(async () => {
    if (dataSource) await cleanup();
    await app?.close();
  });

  it('grants the course from payment_intent.succeeded', async () => {
    await purchases.processEvent(withIds(purchaseEvent));
    expect(await ownsCourse()).toBe(true);
    const orders = await ordersForUser();
    expect(orders).toHaveLength(1);
    expect(orders[0].stripe_payment_intent_id).toBe(paymentIntentId);
  });

  it('records nothing for the one-time invoice.paid', async () => {
    await purchases.processEvent(withIds(invoiceEvent));
    const orders = await ordersForUser();
    expect(orders).toHaveLength(1);
    expect(orders[0].stripe_invoice_id).toBeNull();
    const [user] = await dataSource.query(
      `SELECT role FROM users WHERE id = $1`,
      [userId],
    );
    expect(user.role).toBe(Role.User);
  });

  it('a full refund marks the course order refunded and revokes the course', async () => {
    await purchases.processEvent(withIds(refundEvent));
    const [order] = await ordersForUser();
    expect(order.payment_status).toBe('refunded');
    expect(order.refunded_cents).toBe(9675);
    expect(await ownsCourse()).toBe(false);
    const live = await dataSource.query(
      `SELECT 1 FROM entitlements
        WHERE user_id = $1 AND course_id = $2 AND revoked_at IS NULL`,
      [userId, courseId],
    );
    expect(live).toHaveLength(0);
  });

  it('refund matching prefers the PaymentIntent order over an older invoice-keyed one', async () => {
    // Orders the pre-fix code wrote: a bogus invoice-keyed row ahead of the
    // course row for the same payment. Without the ORDER BY, LIMIT 1 took it.
    const orders = app.get(OrderService);
    const [bogus] = await dataSource.query(
      `INSERT INTO orders (user_id, stripe_invoice_id, stripe_event_id, payment_method,
                           subtotal_cents, total_cents, currency, payment_status)
       VALUES ($1, 'in_mp_refund_e2e', 'evt_mp_refund_e2e_inv', 'card', 9675, 9675, 'usd', 'succeeded')
       RETURNING id`,
      [userId],
    );
    const [course] = await dataSource.query(
      `INSERT INTO orders (user_id, stripe_payment_intent_id, stripe_event_id, payment_method,
                           subtotal_cents, total_cents, currency, payment_status)
       VALUES ($1, 'pi_mp_refund_e2e', 'evt_mp_refund_e2e_pi', 'card', 9675, 9675, 'usd', 'succeeded')
       RETURNING id`,
      [userId],
    );
    const result = await orders.applyRefund(
      'pi_mp_refund_e2e',
      'in_mp_refund_e2e',
      9675,
      true,
    );
    expect(result?.orderId).toBe(course.id);
    const [untouched] = await dataSource.query(
      `SELECT payment_status FROM orders WHERE id = $1`,
      [bogus.id],
    );
    expect(untouched.payment_status).toBe('succeeded');
  });
});
