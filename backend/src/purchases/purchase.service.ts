import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Course } from 'src/courses/types/course.entity';
import { Role } from 'src/users/types/role.enum';
import { User } from 'src/users/types/user.entity';
import { DataSource, Repository } from 'typeorm';
import { metrics } from '@opentelemetry/api';
import { ProMembershipDuration } from './types/purchase.dto';
import { Stripe } from 'stripe';
import { ConfigService } from '@nestjs/config';
import { AuditService } from 'src/audit/audit.service';
import { AuditAction } from 'src/audit/types/audit-action.enum';
import { EntitlementService } from 'src/commerce/entitlement.service';
import { OrderService } from 'src/commerce/order.service';
import { ProductEventsService } from 'src/product-events/product-events.service';

const PRODUCT_COURSE = 'course';
const PRODUCT_PRO = 'pro_membership';

/** Provenance passed from the payment path into purchaseCourse (plan § 4.1). */
interface PurchaseContext {
  orderItemId?: number | null;
  paidCents?: number;
  source?: 'purchase' | 'bundle';
}

@Injectable()
export class PurchaseService {
  private readonly logger = new Logger(PurchaseService.name);
  /** Webhook fulfilled but the orders row failed — alert on any non-zero. */
  private readonly orderRecordFailures = metrics
    .getMeter('droneedge')
    .createCounter('orders.record_failures', {
      description: 'Stripe course payments granted without an orders row',
    });

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Course)
    private readonly courseRepository: Repository<Course>,
    @Inject('STRIPE_CLIENT')
    private readonly stripe: Stripe,
    private readonly configService: ConfigService,
    private readonly auditService: AuditService,
    private readonly entitlements: EntitlementService,
    private readonly orders: OrderService,
    private readonly productEvents: ProductEventsService,
    private readonly dataSource: DataSource,
  ) {}

  /**
   * Kept for optional callers / future gated features. Course and Pro checkout
   * intentionally do **not** require verification — account + JWT is enough.
   */
  async assertEmailVerifiedForPurchase(userId: number): Promise<void> {
    const user = await this.userRepository.findOneBy({ id: userId });
    if (!user) {
      throw new NotFoundException('User not found.');
    }
    if (!user.is_email_verified) {
      throw new ForbiddenException('EMAIL_NOT_VERIFIED');
    }
  }

  async purchaseCourse(
    userId: number,
    courseId: number,
    ctx: PurchaseContext = {},
  ): Promise<User> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      relations: ['purchased_courses'],
    });
    const course = await this.courseRepository.findOneBy({ id: courseId });

    if (!user || !course) {
      throw new NotFoundException('User or Course not found.');
    }

    const alreadyOwns = user.purchased_courses.some((c) => c.id === course.id);
    let saved = user;
    if (alreadyOwns) {
      if (await this.entitlements.hasLiveAccess(userId, courseId)) {
        throw new BadRequestException(
          'You have already purchased this course.',
        );
      }
      // Legacy row exists but the ledger row is missing (an earlier ledger
      // write failed, or a Stripe retry after one). Fall through and repair
      // instead of refusing — otherwise the user is stuck without access once
      // ENTITLEMENTS_AUTHORITATIVE is on.
      this.logger.warn(
        `purchaseCourse: user ${userId} owns course ${courseId} in legacy table only — repairing ledger`,
      );
    } else {
      user.purchased_courses.push(course);
      user.token_version = (user.token_version || 0) + 1;
      saved = await this.userRepository.save(user);
      this.auditService.log(userId, AuditAction.COURSE_PURCHASED, {
        courseId,
        courseTitle: course.title,
        orderItemId: ctx.orderItemId ?? null,
      });
    }

    // Dual-write the entitlement ledger (plan § 2.6). Price falls back to the
    // catalog price, flagged as estimated, when the payment path gave none.
    const listCents = Math.round(Number(course.price ?? 0) * 100);
    await this.entitlements.grantCourse(userId, courseId, {
      source: ctx.source ?? 'purchase',
      orderItemId: ctx.orderItemId ?? null,
      allocatedPriceCents: ctx.paidCents ?? listCents,
      priceEstimated: ctx.paidCents == null,
    });
    if (!alreadyOwns) {
      void this.productEvents.record({
        userId,
        event: 'purchase_completed',
        courseId,
        entitlementSource: ctx.source ?? 'purchase',
        properties: {
          amount_cents: ctx.paidCents ?? listCents,
          order_item_id: ctx.orderItemId ?? null,
        },
      });
    }
    return saved;
  }

  /**
   * Writes the order for a succeeded course PaymentIntent (idempotent on the
   * PI id) and returns the order_item id to attach to the entitlement.
   */
  private async recordCourseOrder(
    paymentIntent: Stripe.PaymentIntent,
    userId: number,
    courseId: number,
    stripeEventId: string,
  ): Promise<number | null> {
    try {
      await this.orders.ensureCourseProduct(courseId);
      const recorded = await this.orders.recordStripeOrder({
        userId,
        stripeEventId,
        paymentIntentId: paymentIntent.id,
        customerId:
          typeof paymentIntent.customer === 'string'
            ? paymentIntent.customer
            : (paymentIntent.customer?.id ?? null),
        totalCents: paymentIntent.amount_received || paymentIntent.amount,
        currency: paymentIntent.currency,
        placedAt: new Date(paymentIntent.created * 1000),
        items: [
          {
            sku: `COURSE_${courseId}`,
            productType: 'course',
            courseId,
            unitPriceCents:
              paymentIntent.amount_received || paymentIntent.amount,
          },
        ],
      });
      if (recorded.created) return recorded.itemIds[0] ?? null;
      const existing = await this.orders.getOrder(recorded.orderId);
      return existing?.items?.[0]?.id ?? null;
    } catch (err) {
      // Fulfilment must not depend on the ledger: log, count, and let the
      // grant proceed. The nightly `paid_grant_without_order` check catches it
      // and backfillOrders() repairs it from Stripe.
      this.orderRecordFailures.add(1);
      this.logger.error(
        `Failed to record order for PI ${paymentIntent.id}: ${(err as Error).message}`,
      );
      return null;
    }
  }

  /**
   * Repairs course entitlements that have no order row — either because the
   * webhook's order insert failed (`paid_grant_without_order`) or because the
   * purchase predates the ledger (`legacy_purchase_without_order`, PD1).
   *
   * For each target the succeeded PaymentIntent is found in Stripe (by id, or
   * by the userId/courseId metadata every course PI carries), an order is
   * recorded idempotently, and the entitlement is linked to the order item
   * with the real amount. Entitlements with no Stripe payment (comps recorded
   * as 'purchase' before admin_grant existed) are reported, not changed.
   */
  async backfillOrders(input: {
    paymentIntentId?: string;
    userId?: number;
    courseId?: number;
  }): Promise<{
    repaired: {
      userId: number;
      courseId: number;
      paymentIntent: string;
      amountCents: number;
    }[];
    unmatched: { userId: number; courseId: number; reason: string }[];
  }> {
    const repaired: {
      userId: number;
      courseId: number;
      paymentIntent: string;
      amountCents: number;
    }[] = [];
    const unmatched: { userId: number; courseId: number; reason: string }[] =
      [];

    let targets: { user_id: number; course_id: number }[];
    if (input.paymentIntentId) {
      const pi = await this.stripe.paymentIntents.retrieve(
        input.paymentIntentId,
      );
      const userId = Number(pi.metadata?.userId);
      const courseId = Number(pi.metadata?.courseId);
      if (!userId || !courseId) {
        throw new BadRequestException(
          'PaymentIntent has no userId/courseId metadata.',
        );
      }
      targets = [{ user_id: userId, course_id: courseId }];
    } else if (input.userId && input.courseId) {
      targets = [{ user_id: input.userId, course_id: input.courseId }];
    } else {
      targets = await this.dataSource.query(
        `SELECT DISTINCT e.user_id, e.course_id FROM entitlements e
         WHERE e.source IN ('purchase', 'bundle') AND e.revoked_at IS NULL AND e.order_item_id IS NULL
         ORDER BY e.user_id, e.course_id`,
      );
    }

    for (const t of targets) {
      const userId = Number(t.user_id);
      const courseId = Number(t.course_id);
      try {
        const pi = input.paymentIntentId
          ? await this.stripe.paymentIntents.retrieve(input.paymentIntentId)
          : await this.findSucceededCoursePI(userId, courseId);
        if (!pi || pi.status !== 'succeeded') {
          unmatched.push({
            userId,
            courseId,
            reason: pi
              ? `PI ${pi.id} status ${pi.status}`
              : 'no succeeded PaymentIntent in Stripe',
          });
          continue;
        }
        const orderItemId = await this.recordCourseOrder(
          pi,
          userId,
          courseId,
          `backfill_${pi.id}`,
        );
        if (!orderItemId) {
          unmatched.push({
            userId,
            courseId,
            reason: 'order insert failed (see logs)',
          });
          continue;
        }
        const amount = pi.amount_received || pi.amount;
        await this.dataSource.query(
          `UPDATE entitlements
           SET order_item_id = $1, allocated_price_cents = $2, price_estimated = false
           WHERE user_id = $3 AND course_id = $4 AND revoked_at IS NULL
             AND source IN ('purchase', 'bundle') AND order_item_id IS NULL`,
          [orderItemId, amount, userId, courseId],
        );
        this.productEvents.invalidateUser(userId);
        repaired.push({
          userId,
          courseId,
          paymentIntent: pi.id,
          amountCents: amount,
        });
      } catch (err) {
        unmatched.push({ userId, courseId, reason: (err as Error).message });
      }
    }
    this.logger.log(
      `order backfill: ${repaired.length} repaired, ${unmatched.length} unmatched`,
    );
    return { repaired, unmatched };
  }

  /** Newest succeeded course PaymentIntent for a user × course, by the metadata set in createPaymentIntent. */
  private async findSucceededCoursePI(
    userId: number,
    courseId: number,
  ): Promise<Stripe.PaymentIntent | null> {
    const res = await this.stripe.paymentIntents.search({
      query: `metadata['userId']:'${userId}' AND metadata['courseId']:'${courseId}' AND status:'succeeded'`,
      limit: 5,
    });
    const succeeded = res.data
      .filter((p) => p.status === 'succeeded')
      .sort((a, b) => b.created - a.created);
    return succeeded[0] ?? null;
  }

  async upgradeToPro(
    userId: number,
    duration: ProMembershipDuration,
  ): Promise<User> {
    const user = await this.userRepository.findOneBy({ id: userId });
    if (!user) throw new NotFoundException('User not found.');
    if (user.role === Role.Admin)
      throw new BadRequestException('Admins cannot be downgraded to Pro.');

    const now = new Date();
    const expiryDate =
      duration === ProMembershipDuration.Monthly
        ? new Date(now.setMonth(now.getMonth() + 1))
        : new Date(now.setFullYear(now.getFullYear() + 1));

    user.role = Role.Pro;
    user.pro_membership_expires_at = expiryDate;
    user.token_version = (user.token_version || 0) + 1;
    const saved = await this.userRepository.save(user);
    this.auditService.log(userId, AuditAction.PRO_UPGRADE, {
      duration,
      expiryDate: expiryDate.toISOString(),
      source: 'admin_comp',
    });
    await this.entitlements.syncPro(userId, {
      productSku:
        duration === ProMembershipDuration.Yearly
          ? 'PRO_YEARLY'
          : 'PRO_MONTHLY',
      endsAt: expiryDate,
    });
    void this.productEvents.record({
      userId,
      event: 'pro_started',
      properties: { duration, source: 'admin_comp' },
    });
    return saved;
  }

  /**
   * One-time course purchase (PaymentIntent + Card Element).
   * Grants lifetime access to that course only.
   */
  async createPaymentIntent(
    userId: number,
    courseId: number,
  ): Promise<{ clientSecret: string }> {
    const course = await this.courseRepository.findOneBy({ id: courseId });
    if (!course || course.price == null || Number(course.price) <= 0) {
      throw new NotFoundException('Course not found or has no price.');
    }

    const user = await this.userRepository.findOne({
      where: { id: userId },
      relations: ['purchased_courses'],
    });
    if (!user) throw new NotFoundException('User not found.');
    if (user.purchased_courses.some((c) => c.id === courseId)) {
      throw new BadRequestException('You have already purchased this course.');
    }
    if (this.isActivePro(user)) {
      throw new BadRequestException(
        'Active Pro membership already includes this course. Manage billing from your profile instead.',
      );
    }

    const amount = Math.round(Number(course.price) * 100);
    const paymentIntent = await this.stripe.paymentIntents.create({
      amount,
      currency: 'usd',
      metadata: {
        userId: String(userId),
        courseId: String(courseId),
        productType: PRODUCT_COURSE,
      },
    });

    return { clientSecret: paymentIntent.client_secret };
  }

  /**
   * Monthly (or yearly) Pro subscription via Stripe Checkout.
   * Active Pro grants access to all courses until the subscription ends.
   */
  async createProCheckoutSession(
    userId: number,
    duration: ProMembershipDuration = ProMembershipDuration.Monthly,
    successPath = '/profile?pro=success',
    cancelPath = '/profile?pro=canceled',
  ): Promise<{ url: string }> {
    const priceId = this.proPriceIdFor(duration);
    if (!priceId) {
      throw new ServiceUnavailableException(
        'Pro subscription is not configured (missing STRIPE_PRO_PRICE_ID_*).',
      );
    }

    const user = await this.userRepository.findOneBy({ id: userId });
    if (!user) throw new NotFoundException('User not found.');
    if (user.role === Role.Admin) {
      throw new BadRequestException('Admins cannot purchase Pro.');
    }
    if (this.isActivePro(user) && user.stripe_subscription_id) {
      throw new BadRequestException(
        'You already have an active Pro subscription. Use Manage billing to change it.',
      );
    }

    const customerId = await this.ensureStripeCustomer(user);
    const frontend = this.frontendBaseUrl();
    const session = await this.stripe.checkout.sessions.create({
      mode: 'subscription',
      customer: customerId,
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${frontend}${this.sanitizePath(successPath)}`,
      cancel_url: `${frontend}${this.sanitizePath(cancelPath)}`,
      client_reference_id: String(userId),
      metadata: {
        userId: String(userId),
        productType: PRODUCT_PRO,
        duration,
      },
      subscription_data: {
        metadata: {
          userId: String(userId),
          productType: PRODUCT_PRO,
          duration,
        },
      },
    });

    if (!session.url) {
      throw new BadRequestException('Stripe did not return a Checkout URL.');
    }
    return { url: session.url };
  }

  /** Stripe Customer Portal — cancel / update payment method for Pro. */
  async createBillingPortalSession(
    userId: number,
    returnPath = '/profile',
  ): Promise<{ url: string }> {
    const user = await this.userRepository.findOneBy({ id: userId });
    if (!user) throw new NotFoundException('User not found.');
    if (!user.stripe_customer_id) {
      throw new BadRequestException(
        'No Stripe billing profile yet. Subscribe to Pro first.',
      );
    }
    const session = await this.stripe.billingPortal.sessions.create({
      customer: user.stripe_customer_id,
      return_url: `${this.frontendBaseUrl()}${this.sanitizePath(returnPath)}`,
    });
    return { url: session.url };
  }

  async confirmPaymentFromIntent(
    userId: number,
    paymentIntentId: string,
  ): Promise<{ granted: boolean; alreadyOwned: boolean }> {
    const paymentIntent =
      await this.stripe.paymentIntents.retrieve(paymentIntentId);

    if (paymentIntent.status !== 'succeeded') {
      throw new BadRequestException('Payment has not completed yet.');
    }

    const metaUserId = paymentIntent.metadata?.userId;
    const courseId = paymentIntent.metadata?.courseId;
    if (!metaUserId || !courseId) {
      throw new BadRequestException('Payment is missing course metadata.');
    }
    if (String(metaUserId) !== String(userId)) {
      throw new ForbiddenException(
        'This payment belongs to a different account.',
      );
    }

    const orderItemId = await this.recordCourseOrder(
      paymentIntent,
      userId,
      parseInt(courseId, 10),
      `pi_confirm_${paymentIntent.id}`,
    );
    try {
      await this.purchaseCourse(userId, parseInt(courseId, 10), {
        orderItemId,
        paidCents: paymentIntent.amount_received || paymentIntent.amount,
      });
      return { granted: true, alreadyOwned: false };
    } catch (e) {
      if (this.isAlreadyPurchasedBadRequest(e)) {
        return { granted: true, alreadyOwned: true };
      }
      throw e;
    }
  }

  async handleWebhookEvent(rawBody: Buffer, signature: string) {
    const webhookSecret = this.configService.get('STRIPE_WEBHOOK_SECRET');
    let event: Stripe.Event;

    try {
      event = this.stripe.webhooks.constructEvent(
        rawBody,
        signature,
        webhookSecret,
      );
    } catch (err) {
      this.logger.error(
        `Webhook signature verification failed: ${err.message}`,
      );
      throw new BadRequestException(`Webhook Error: ${err.message}`);
    }

    this.logger.log(`Received Stripe event: ${event.type}`);

    switch (event.type) {
      case 'payment_intent.succeeded': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        const productType = paymentIntent.metadata?.productType;
        // Subscription invoices also create PIs — only fulfill one-time course buys here.
        if (productType && productType !== PRODUCT_COURSE) {
          break;
        }
        const { userId, courseId } = paymentIntent.metadata ?? {};
        if (!userId || !courseId) {
          this.logger.error(
            `payment_intent.succeeded missing metadata (pi=${paymentIntent.id})`,
          );
          break;
        }
        const orderItemId = await this.recordCourseOrder(
          paymentIntent,
          parseInt(userId, 10),
          parseInt(courseId, 10),
          event.id,
        );
        try {
          await this.purchaseCourse(
            parseInt(userId, 10),
            parseInt(courseId, 10),
            {
              orderItemId,
              paidCents: paymentIntent.amount_received || paymentIntent.amount,
            },
          );
        } catch (e) {
          if (this.isAlreadyPurchasedBadRequest(e)) {
            this.logger.log(
              `Idempotent webhook: user ${userId} already owns course ${courseId}`,
            );
            break;
          }
          throw e;
        }
        break;
      }
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        if (session.mode !== 'subscription') break;
        await this.fulfillProCheckoutSession(session);
        break;
      }
      case 'customer.subscription.updated':
      case 'customer.subscription.created': {
        const sub = event.data.object as Stripe.Subscription;
        await this.syncProFromSubscription(sub);
        break;
      }
      case 'customer.subscription.deleted': {
        const sub = event.data.object as Stripe.Subscription;
        await this.revokeProFromSubscription(sub);
        break;
      }
      case 'invoice.paid': {
        await this.recordProInvoice(
          event.data.object as Stripe.Invoice,
          event.id,
        );
        break;
      }
      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice;
        const userId = await this.userIdFromInvoice(invoice);
        if (userId != null) {
          void this.productEvents.record({
            userId,
            event: 'pro_payment_failed',
            properties: {
              invoice_id: invoice.id,
              amount_due_cents: invoice.amount_due,
              attempt_count: invoice.attempt_count,
            },
          });
        }
        break;
      }
      case 'charge.refunded': {
        await this.handleRefund(event.data.object as Stripe.Charge);
        break;
      }
      default:
        this.logger.log(`Unhandled event type ${event.type}`);
    }

    return { received: true };
  }

  private async fulfillProCheckoutSession(
    session: Stripe.Checkout.Session,
  ): Promise<void> {
    const userIdRaw =
      session.metadata?.userId || session.client_reference_id || null;
    if (!userIdRaw) {
      this.logger.error(
        `checkout.session.completed missing userId (session=${session.id})`,
      );
      return;
    }
    const userId = parseInt(userIdRaw, 10);
    if (Number.isNaN(userId)) return;

    const customerId =
      typeof session.customer === 'string'
        ? session.customer
        : session.customer?.id;
    const subscriptionId =
      typeof session.subscription === 'string'
        ? session.subscription
        : session.subscription?.id;

    if (customerId) {
      await this.userRepository.update(userId, {
        stripe_customer_id: customerId,
      });
    }

    if (subscriptionId) {
      const sub = await this.stripe.subscriptions.retrieve(subscriptionId);
      await this.syncProFromSubscription(sub, userId);
    }
  }

  private async syncProFromSubscription(
    sub: Stripe.Subscription,
    fallbackUserId?: number,
  ): Promise<void> {
    const userIdRaw = sub.metadata?.userId;
    let userId = userIdRaw ? parseInt(userIdRaw, 10) : fallbackUserId;
    if (userId == null || Number.isNaN(userId)) {
      const customerId =
        typeof sub.customer === 'string' ? sub.customer : sub.customer?.id;
      if (customerId) {
        const byCustomer = await this.userRepository.findOneBy({
          stripe_customer_id: customerId,
        });
        userId = byCustomer?.id;
      }
    }
    if (userId == null || Number.isNaN(userId)) {
      this.logger.error(`subscription sync missing userId (sub=${sub.id})`);
      return;
    }

    const user = await this.userRepository.findOneBy({ id: userId });
    if (!user) return;
    if (user.role === Role.Admin) return;

    const status = sub.status;
    const active =
      status === 'active' || status === 'trialing' || status === 'past_due';
    // Stripe API versions differ on where period end lives — prefer item, then subscription root.
    const itemPeriod = sub.items?.data?.[0] as
      | (Stripe.SubscriptionItem & { current_period_end?: number })
      | undefined;
    const rootPeriod = sub as Stripe.Subscription & {
      current_period_end?: number;
    };
    const periodEndSec =
      itemPeriod?.current_period_end ?? rootPeriod.current_period_end;
    const periodEnd = periodEndSec
      ? new Date(periodEndSec * 1000)
      : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    if (active) {
      user.role = Role.Pro;
      user.pro_membership_expires_at = periodEnd;
      user.stripe_subscription_id = sub.id;
      const customerId =
        typeof sub.customer === 'string' ? sub.customer : sub.customer?.id;
      if (customerId) user.stripe_customer_id = customerId;
      user.token_version = (user.token_version || 0) + 1;
      await this.userRepository.save(user);
      this.auditService.log(userId, AuditAction.PRO_UPGRADE, {
        duration: sub.metadata?.duration ?? 'monthly',
        expiryDate: periodEnd.toISOString(),
        source: 'stripe_subscription',
        subscriptionId: sub.id,
        status,
      });
      await this.entitlements.syncPro(userId, {
        productSku:
          sub.metadata?.duration === ProMembershipDuration.Yearly
            ? 'PRO_YEARLY'
            : 'PRO_MONTHLY',
        stripeSubscriptionId: sub.id,
        endsAt: periodEnd,
      });
      if (sub.cancel_at_period_end) {
        void this.productEvents.record({
          userId,
          event: 'pro_cancel_scheduled',
          properties: {
            subscription_id: sub.id,
            period_end: periodEnd.toISOString(),
          },
        });
      }
      return;
    }

    // incomplete / unpaid / canceled — treat as inactive
    await this.clearProMembership(user, sub.id);
  }

  /**
   * invoice.paid → one order per Pro invoice (the only place Pro revenue is
   * recorded) + pro_started / pro_renewed event. Idempotent on invoice id.
   */
  private async recordProInvoice(
    invoice: Stripe.Invoice,
    stripeEventId: string,
  ): Promise<void> {
    const userId = await this.userIdFromInvoice(invoice);
    if (userId == null) {
      this.logger.warn(
        `invoice.paid without resolvable user (inv=${invoice.id})`,
      );
      return;
    }
    const line = invoice.lines?.data?.[0] as
      | (Stripe.InvoiceLineItem & {
          price?: { id?: string } | null;
          pricing?: { price_details?: { price?: string } };
        })
      | undefined;
    const priceId =
      line?.pricing?.price_details?.price ??
      (typeof line?.price === 'object' ? line?.price?.id : undefined) ??
      null;
    let sku: 'PRO_MONTHLY' | 'PRO_YEARLY' = 'PRO_MONTHLY';
    if (priceId) {
      const product = await this.orders.getProductByStripePrice(priceId);
      if (product?.sku === 'PRO_YEARLY') sku = 'PRO_YEARLY';
      else if (
        !product &&
        priceId === this.configService.get<string>('STRIPE_PRO_PRICE_ID_YEARLY')
      )
        sku = 'PRO_YEARLY';
    }
    const amount = invoice.amount_paid ?? invoice.total ?? 0;
    const customerId =
      typeof invoice.customer === 'string'
        ? invoice.customer
        : (invoice.customer?.id ?? null);

    let created = false;
    try {
      const recorded = await this.orders.recordStripeOrder({
        userId,
        stripeEventId,
        invoiceId: invoice.id,
        customerId,
        totalCents: amount,
        currency: invoice.currency,
        placedAt: new Date(
          (invoice.status_transitions?.paid_at ?? invoice.created) * 1000,
        ),
        items: [
          {
            sku,
            productType: sku === 'PRO_YEARLY' ? 'pro_yearly' : 'pro_monthly',
            unitPriceCents: amount,
          },
        ],
      });
      created = recorded.created;
    } catch (err) {
      this.logger.error(
        `Failed to record Pro order for invoice ${invoice.id}: ${(err as Error).message}`,
      );
    }
    if (!created) return;

    const renewal = invoice.billing_reason === 'subscription_cycle';
    void this.productEvents.record({
      userId,
      event: renewal ? 'pro_renewed' : 'pro_started',
      properties: {
        invoice_id: invoice.id,
        amount_cents: amount,
        sku,
        billing_reason: invoice.billing_reason ?? null,
      },
    });
  }

  private async userIdFromInvoice(
    invoice: Stripe.Invoice,
  ): Promise<number | null> {
    // Subscription metadata location differs across Stripe API versions.
    const inv = invoice as Stripe.Invoice & {
      subscription_details?: {
        metadata?: Record<string, string> | null;
      } | null;
      parent?: {
        subscription_details?: {
          metadata?: Record<string, string> | null;
        } | null;
      } | null;
    };
    const meta =
      inv.parent?.subscription_details?.metadata ??
      inv.subscription_details?.metadata ??
      invoice.metadata ??
      {};
    const raw = (meta as Record<string, string>)?.userId;
    if (raw && !Number.isNaN(parseInt(raw, 10))) return parseInt(raw, 10);
    const customerId =
      typeof invoice.customer === 'string'
        ? invoice.customer
        : invoice.customer?.id;
    if (!customerId) return null;
    const user = await this.userRepository.findOneBy({
      stripe_customer_id: customerId,
    });
    return user?.id ?? null;
  }

  /** charge.refunded → mark the order; a full refund revokes what it granted. */
  private async handleRefund(charge: Stripe.Charge): Promise<void> {
    const paymentIntentId =
      typeof charge.payment_intent === 'string'
        ? charge.payment_intent
        : (charge.payment_intent?.id ?? null);
    const invoiceId =
      typeof (
        charge as Stripe.Charge & { invoice?: string | { id: string } | null }
      ).invoice === 'string'
        ? ((charge as Stripe.Charge & { invoice?: string }).invoice as string)
        : ((charge as Stripe.Charge & { invoice?: { id: string } | null })
            .invoice?.id ?? null);
    const result = await this.orders.applyRefund(
      paymentIntentId,
      invoiceId,
      charge.amount_refunded,
      charge.refunded === true,
    );
    if (!result) {
      this.logger.warn(
        `charge.refunded for unknown order (pi=${paymentIntentId}, inv=${invoiceId})`,
      );
      return;
    }
    if (result.userId != null) {
      this.auditService.log(result.userId, AuditAction.REFUND_ISSUED, {
        orderId: result.orderId,
        amountCents: charge.amount_refunded,
        full: charge.refunded === true,
      });
      void this.productEvents.record({
        userId: result.userId,
        event: 'refund_issued',
        properties: {
          order_id: result.orderId,
          amount_cents: charge.amount_refunded,
          full: charge.refunded === true,
        },
      });
    }
  }

  private async revokeProFromSubscription(
    sub: Stripe.Subscription,
  ): Promise<void> {
    const userIdRaw = sub.metadata?.userId;
    let user: User | null = null;
    if (userIdRaw) {
      user = await this.userRepository.findOneBy({
        id: parseInt(userIdRaw, 10),
      });
    }
    if (!user) {
      const customerId =
        typeof sub.customer === 'string' ? sub.customer : sub.customer?.id;
      if (customerId) {
        user = await this.userRepository.findOneBy({
          stripe_customer_id: customerId,
        });
      }
    }
    if (!user || user.role === Role.Admin) return;
    await this.clearProMembership(user, sub.id);
  }

  private async clearProMembership(user: User, subscriptionId: string) {
    if (user.role === Role.Pro) {
      user.role = Role.User;
    }
    user.pro_membership_expires_at = null;
    if (user.stripe_subscription_id === subscriptionId) {
      user.stripe_subscription_id = null;
    }
    user.token_version = (user.token_version || 0) + 1;
    await this.userRepository.save(user);
    this.logger.log(
      `Pro revoked for user ${user.id} (subscription ${subscriptionId})`,
    );
    await this.entitlements.revokePro(user.id, 'cancelled');
    this.auditService.log(user.id, AuditAction.PRO_CANCELLED, {
      subscriptionId,
    });
    void this.productEvents.record({
      userId: user.id,
      event: 'pro_cancelled',
      properties: { subscription_id: subscriptionId },
    });
  }

  private async ensureStripeCustomer(user: User): Promise<string> {
    if (user.stripe_customer_id) return user.stripe_customer_id;
    const customer = await this.stripe.customers.create({
      email: user.email,
      name:
        [user.first_name, user.last_name].filter(Boolean).join(' ') ||
        user.username,
      metadata: { userId: String(user.id) },
    });
    user.stripe_customer_id = customer.id;
    await this.userRepository.save(user);
    return customer.id;
  }

  private isActivePro(user: User): boolean {
    return (
      user.role === Role.Pro &&
      !!user.pro_membership_expires_at &&
      user.pro_membership_expires_at > new Date()
    );
  }

  private proPriceIdFor(duration: ProMembershipDuration): string | undefined {
    if (duration === ProMembershipDuration.Yearly) {
      return (
        this.configService.get<string>('STRIPE_PRO_PRICE_ID_YEARLY') ||
        undefined
      );
    }
    return (
      this.configService.get<string>('STRIPE_PRO_PRICE_ID_MONTHLY') || undefined
    );
  }

  private frontendBaseUrl(): string {
    return (
      this.configService.get<string>('FRONTEND_URL') || 'http://localhost:8080'
    ).replace(/\/$/, '');
  }

  /** Allow only same-site relative paths (open-redirect safe). */
  private sanitizePath(path: string): string {
    if (!path.startsWith('/') || path.startsWith('//')) {
      return '/profile';
    }
    return path;
  }

  private isAlreadyPurchasedBadRequest(e: unknown): boolean {
    if (!(e instanceof BadRequestException)) return false;
    const r = e.getResponse();
    const msg =
      typeof r === 'string'
        ? r
        : (r as { message?: string | string[] }).message;
    const s = Array.isArray(msg) ? msg.join(' ') : String(msg ?? '');
    return s.includes('already purchased');
  }
}
