import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { PurchaseService } from './purchase.service';
import { Role } from '../users/types/role.enum';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SessionParams = Record<string, any>;

describe('PurchaseService — hosted Checkout', () => {
  const userRepo = {
    findOne: jest.fn(),
    findOneBy: jest.fn(),
    save: jest.fn(async (u) => u),
  };
  const courseRepo = { findOneBy: jest.fn() };
  const stripe = {
    checkout: {
      sessions: {
        create: jest.fn<Promise<{ id: string; url: string }>, [SessionParams]>(
          async () => ({
            id: 'cs_test_1',
            url: 'https://checkout.stripe.com/c/pay/cs_test_1',
          }),
        ),
        retrieve: jest.fn(),
      },
    },
    customers: {
      create: jest.fn(async () => ({ id: 'cus_new' })),
      retrieve: jest.fn(
        async (id: string): Promise<{ id: string; deleted?: boolean }> => ({
          id,
        }),
      ),
    },
    promotionCodes: {
      list: jest.fn(async () => ({ data: [] as { id: string }[] })),
    },
  };
  const config: Record<string, string> = {
    FRONTEND_URL: 'https://thedroneedge.com/',
    STRIPE_PRO_PRICE_ID_MONTHLY: 'price_pro_monthly',
  };
  const configService = { get: jest.fn((k: string) => config[k]) };

  let service: PurchaseService;
  const sessionParams = (): SessionParams =>
    stripe.checkout.sessions.create.mock.calls[0][0];

  const buyer = (over: Record<string, unknown> = {}) => ({
    id: 7,
    email: 'buyer@example.com',
    username: 'buyer',
    role: Role.User,
    pro_membership_expires_at: null,
    stripe_customer_id: 'cus_existing',
    purchased_courses: [],
    ...over,
  });

  beforeEach(() => {
    jest.clearAllMocks();
    service = new PurchaseService(
      userRepo as never,
      courseRepo as never,
      stripe as never,
      configService as never,
      { log: jest.fn() } as never,
      {} as never,
      {} as never,
      { record: jest.fn(), invalidateUser: jest.fn() } as never,
      {} as never,
    );
    courseRepo.findOneBy.mockResolvedValue({
      id: 3,
      title: 'Part 107',
      price: '129.00',
    });
    userRepo.findOne.mockResolvedValue(buyer());
  });

  describe('createCourseCheckoutSession', () => {
    it('creates a payment-mode session priced from the DB with metadata on the PaymentIntent', async () => {
      const res = await service.createCourseCheckoutSession(7, 3);

      expect(res.url).toContain('checkout.stripe.com');
      const params = sessionParams();
      expect(params).toMatchObject({
        mode: 'payment',
        customer: 'cus_existing',
        client_reference_id: '7',
        billing_address_collection: 'auto',
        allow_promotion_codes: true,
        success_url:
          'https://thedroneedge.com/courses/3?purchase=success&session_id={CHECKOUT_SESSION_ID}',
        cancel_url: 'https://thedroneedge.com/courses/3?purchase=1',
      });
      expect(params.line_items[0].price_data).toMatchObject({
        currency: 'usd',
        unit_amount: 12900,
        product_data: { name: 'Part 107', tax_code: 'txcd_10000000' },
      });
      expect(params.managed_payments).toBeUndefined();
      const meta = { userId: '7', courseId: '3', productType: 'course' };
      expect(params.metadata).toEqual(meta);
      // payment_intent.succeeded fulfils from this — must match the legacy PI metadata.
      expect(params.payment_intent_data.metadata).toEqual(meta);
      expect(stripe.customers.create).not.toHaveBeenCalled();
    });

    it('pre-applies an active promo code from a ?promo= link', async () => {
      stripe.promotionCodes.list.mockResolvedValueOnce({
        data: [{ id: 'promo_launch' }],
      });
      await service.createCourseCheckoutSession(7, 3, 'EDGE25');
      expect(stripe.promotionCodes.list).toHaveBeenCalledWith({
        code: 'EDGE25',
        active: true,
        limit: 1,
      });
      const params = sessionParams();
      expect(params.discounts).toEqual([{ promotion_code: 'promo_launch' }]);
      // Stripe rejects discounts + allow_promotion_codes together.
      expect(params.allow_promotion_codes).toBeUndefined();
    });

    it('falls back to the manual code field for an unknown promo code', async () => {
      await service.createCourseCheckoutSession(7, 3, 'NOPE');
      const params = sessionParams();
      expect(params.discounts).toBeUndefined();
      expect(params.allow_promotion_codes).toBe(true);
    });

    it('sells without the code when Stripe rejects it for this product', async () => {
      stripe.promotionCodes.list.mockResolvedValueOnce({
        data: [{ id: 'promo_pro_only' }],
      });
      stripe.checkout.sessions.create.mockRejectedValueOnce(
        Object.assign(new Error('coupon not applicable'), {
          type: 'StripeInvalidRequestError',
        }),
      );
      const res = await service.createCourseCheckoutSession(7, 3, 'PROONLY');
      expect(res.url).toContain('checkout.stripe.com');
      const retry = stripe.checkout.sessions.create.mock.calls[1][0];
      expect(retry.discounts).toBeUndefined();
      expect(retry.allow_promotion_codes).toBe(true);
    });

    it('creates a Stripe customer when the user has none', async () => {
      userRepo.findOne.mockResolvedValue(buyer({ stripe_customer_id: null }));
      await service.createCourseCheckoutSession(7, 3);
      expect(stripe.customers.create).toHaveBeenCalled();
      expect(sessionParams().customer).toBe('cus_new');
    });

    it('replaces a stored customer that does not exist under this key (sandbox → live)', async () => {
      stripe.customers.retrieve.mockRejectedValueOnce(
        Object.assign(new Error('No such customer'), {
          code: 'resource_missing',
        }),
      );
      await service.createCourseCheckoutSession(7, 3);
      expect(stripe.customers.retrieve).toHaveBeenCalledWith('cus_existing');
      expect(stripe.customers.create).toHaveBeenCalled();
      expect(sessionParams().customer).toBe('cus_new');
      expect(userRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ stripe_customer_id: 'cus_new' }),
      );
    });

    it('replaces a stored customer deleted in the Dashboard', async () => {
      stripe.customers.retrieve.mockResolvedValueOnce({
        id: 'cus_existing',
        deleted: true,
      });
      await service.createCourseCheckoutSession(7, 3);
      expect(sessionParams().customer).toBe('cus_new');
    });

    it('does not swallow other Stripe errors on the customer lookup', async () => {
      stripe.customers.retrieve.mockRejectedValueOnce(
        Object.assign(new Error('rate limited'), { code: 'rate_limit' }),
      );
      await expect(service.createCourseCheckoutSession(7, 3)).rejects.toThrow(
        'rate limited',
      );
      expect(stripe.customers.create).not.toHaveBeenCalled();
    });

    it('rejects a course the user already owns', async () => {
      userRepo.findOne.mockResolvedValue(
        buyer({ purchased_courses: [{ id: 3 }] }),
      );
      await expect(service.createCourseCheckoutSession(7, 3)).rejects.toThrow(
        BadRequestException,
      );
      expect(stripe.checkout.sessions.create).not.toHaveBeenCalled();
    });

    it('rejects when an active Pro membership already covers the course', async () => {
      userRepo.findOne.mockResolvedValue(
        buyer({
          role: Role.Pro,
          pro_membership_expires_at: new Date(Date.now() + 86_400_000),
        }),
      );
      await expect(service.createCourseCheckoutSession(7, 3)).rejects.toThrow(
        /Pro membership already includes/,
      );
    });

    it('rejects a free or missing course', async () => {
      courseRepo.findOneBy.mockResolvedValue({ id: 3, price: 0 });
      await expect(service.createCourseCheckoutSession(7, 3)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('confirmCheckoutSession', () => {
    const paidSession = {
      id: 'cs_test_1',
      mode: 'payment',
      payment_status: 'paid',
      payment_intent: 'pi_123',
      metadata: { userId: '7', courseId: '3', productType: 'course' },
    };

    it('delegates to the PaymentIntent confirm path', async () => {
      stripe.checkout.sessions.retrieve.mockResolvedValue(paidSession);
      const confirm = jest
        .spyOn(service, 'confirmPaymentFromIntent')
        .mockResolvedValue({ granted: true, alreadyOwned: false });

      await expect(
        service.confirmCheckoutSession(7, 'cs_test_1'),
      ).resolves.toEqual({ granted: true, alreadyOwned: false });
      expect(confirm).toHaveBeenCalledWith(7, 'pi_123');
    });

    it("refuses another account's session", async () => {
      stripe.checkout.sessions.retrieve.mockResolvedValue(paidSession);
      await expect(
        service.confirmCheckoutSession(8, 'cs_test_1'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('refuses an unpaid session', async () => {
      stripe.checkout.sessions.retrieve.mockResolvedValue({
        ...paidSession,
        payment_status: 'unpaid',
      });
      await expect(
        service.confirmCheckoutSession(7, 'cs_test_1'),
      ).rejects.toThrow(/not completed/);
    });

    it('refuses a subscription session', async () => {
      stripe.checkout.sessions.retrieve.mockResolvedValue({
        ...paidSession,
        mode: 'subscription',
      });
      await expect(
        service.confirmCheckoutSession(7, 'cs_test_1'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('createProCheckoutSession', () => {
    it('keeps fulfilment metadata and adds the Checkout Studio settings', async () => {
      userRepo.findOneBy.mockResolvedValue(buyer());
      await service.createProCheckoutSession(7);
      const params = sessionParams();
      expect(params).toMatchObject({
        mode: 'subscription',
        customer: 'cus_existing',
        line_items: [{ price: 'price_pro_monthly', quantity: 1 }],
        billing_address_collection: 'auto',
        allow_promotion_codes: true,
        metadata: { userId: '7' },
        subscription_data: { metadata: { userId: '7' } },
      });
    });
  });

  describe('STRIPE_MANAGED_PAYMENTS', () => {
    beforeEach(() => {
      config.STRIPE_MANAGED_PAYMENTS = 'true';
    });
    afterEach(() => {
      delete config.STRIPE_MANAGED_PAYMENTS;
    });

    it('enables Managed Payments on course and Pro sessions', async () => {
      await service.createCourseCheckoutSession(7, 3);
      userRepo.findOneBy.mockResolvedValue(buyer());
      await service.createProCheckoutSession(7);
      const [course, pro] = stripe.checkout.sessions.create.mock.calls.map(
        (c) => c[0],
      );
      expect(course.managed_payments).toEqual({ enabled: true });
      expect(pro.managed_payments).toEqual({ enabled: true });
    });

    it('keeps it on the retry without a rejected promo code', async () => {
      stripe.promotionCodes.list.mockResolvedValueOnce({
        data: [{ id: 'promo_pro_only' }],
      });
      stripe.checkout.sessions.create.mockRejectedValueOnce(
        Object.assign(new Error('coupon not applicable'), {
          type: 'StripeInvalidRequestError',
        }),
      );
      await service.createCourseCheckoutSession(7, 3, 'PROONLY');
      const retry = stripe.checkout.sessions.create.mock.calls[1][0];
      expect(retry.managed_payments).toEqual({ enabled: true });
    });
  });
});
