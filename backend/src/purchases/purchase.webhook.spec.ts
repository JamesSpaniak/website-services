import { readFileSync } from 'fs';
import { join } from 'path';
import { PurchaseService } from './purchase.service';
import { Role } from '../users/types/role.enum';

/**
 * Replays real sandbox events (API 2026-01-28.clover) captured by
 * scripts/capture_stripe_fixtures.py through handleWebhookEvent. Guards the
 * field paths that moved between Stripe API versions.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const fixture = (name: string): any =>
  JSON.parse(
    readFileSync(
      join(__dirname, '../../test/fixtures/stripe', `${name}.json`),
      'utf8',
    ),
  );

describe('PurchaseService webhook — sandbox fixtures', () => {
  const user = () => ({
    id: 4,
    role: Role.User,
    token_version: 0,
    stripe_customer_id: null,
    stripe_subscription_id: null,
    pro_membership_expires_at: null,
  });
  const userRepo = {
    findOne: jest.fn(),
    findOneBy: jest.fn(),
    save: jest.fn(async (u) => u),
    update: jest.fn(),
  };
  const stripe = {
    webhooks: { constructEvent: jest.fn() },
    invoicePayments: { list: jest.fn() },
    subscriptions: { retrieve: jest.fn() },
    checkout: { sessions: { retrieve: jest.fn() } },
  };
  const orders = {
    recordStripeOrder: jest.fn(async () => ({
      orderId: 1,
      itemIds: [1],
      created: true,
    })),
    getProductByStripePrice: jest.fn(async () => null),
    applyRefund: jest.fn(async () => ({ orderId: 1, userId: 4 })),
    ensureCourseProduct: jest.fn(),
  };
  const entitlements = { syncPro: jest.fn(), revokePro: jest.fn() };
  const productEvents = { record: jest.fn(), invalidateUser: jest.fn() };
  let service: PurchaseService;

  const deliver = (name: string) => {
    stripe.webhooks.constructEvent.mockReturnValue(fixture(name));
    return service.handleWebhookEvent(Buffer.from('{}'), 'sig');
  };

  beforeEach(() => {
    jest.clearAllMocks();
    userRepo.findOneBy.mockResolvedValue(user());
    service = new PurchaseService(
      userRepo as never,
      { findOneBy: jest.fn() } as never,
      stripe as never,
      { get: jest.fn(() => 'whsec_test') } as never,
      { log: jest.fn() } as never,
      entitlements as never,
      orders as never,
      productEvents as never,
      {} as never,
    );
  });

  it('invoice.paid renewal → PRO_MONTHLY order for $35 + pro_renewed', async () => {
    await deliver('invoice.paid.renewal');
    expect(orders.recordStripeOrder).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 4, // parent.subscription_details.metadata.userId
        totalCents: 3500,
        currency: 'usd',
        items: [expect.objectContaining({ sku: 'PRO_MONTHLY' })],
      }),
    );
    // line.pricing.price_details.price is where clover puts the price id
    expect(orders.getProductByStripePrice).toHaveBeenCalledWith(
      'price_1ULulr2Rw6cpyMyJcc0cCqmA',
    );
    expect(productEvents.record).toHaveBeenCalledWith(
      expect.objectContaining({ event: 'pro_renewed' }),
    );
  });

  it('invoice.paid first invoice → pro_started', async () => {
    await deliver('invoice.paid.first');
    expect(productEvents.record).toHaveBeenCalledWith(
      expect.objectContaining({ event: 'pro_started' }),
    );
  });

  it('customer.subscription.created → Pro until the item period end', async () => {
    const ev = fixture('customer.subscription.created');
    await deliver('customer.subscription.created');
    const itemEnd = ev.data.object.items.data[0].current_period_end;
    expect(userRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({
        role: Role.Pro,
        pro_membership_expires_at: new Date(itemEnd * 1000),
        stripe_subscription_id: ev.data.object.id,
      }),
    );
    expect(entitlements.syncPro).toHaveBeenCalled();
  });

  it('customer.subscription.updated past_due keeps Pro active', async () => {
    await deliver('customer.subscription.updated.past-due');
    expect(userRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({ role: Role.Pro }),
    );
    expect(entitlements.revokePro).not.toHaveBeenCalled();
  });

  it('customer.subscription.updated cancel scheduled → pro_cancel_scheduled, access kept', async () => {
    await deliver('customer.subscription.updated.cancel-scheduled');
    expect(productEvents.record).toHaveBeenCalledWith(
      expect.objectContaining({ event: 'pro_cancel_scheduled' }),
    );
    expect(entitlements.revokePro).not.toHaveBeenCalled();
  });

  it('customer.subscription.deleted → Pro revoked', async () => {
    userRepo.findOneBy.mockResolvedValue({ ...user(), role: Role.Pro });
    await deliver('customer.subscription.deleted');
    expect(entitlements.revokePro).toHaveBeenCalledWith(4, 'cancelled');
    expect(userRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({ role: Role.User }),
    );
  });

  it('charge.refunded for a Pro invoice resolves the invoice from the PaymentIntent', async () => {
    stripe.invoicePayments.list.mockResolvedValue({
      data: [{ invoice: 'in_pro' }],
    });
    const ev = fixture('charge.refunded.pro-invoice');
    await deliver('charge.refunded.pro-invoice');
    expect(stripe.invoicePayments.list).toHaveBeenCalledWith(
      expect.objectContaining({
        payment: {
          type: 'payment_intent',
          payment_intent: ev.data.object.payment_intent,
        },
      }),
    );
    expect(orders.applyRefund).toHaveBeenCalledWith(
      ev.data.object.payment_intent,
      'in_pro',
      3500,
      true,
    );
  });

  it('payment_intent.succeeded from a subscription invoice is skipped quietly', async () => {
    await deliver('payment_intent.succeeded.subscription-invoice');
    expect(orders.recordStripeOrder).not.toHaveBeenCalled();
  });

  it('ignores events whose customer no user here owns (other environment)', async () => {
    // Local dev and the site share the sandbox: an event for a customer from
    // the other side must not grant access to the same-numbered user here.
    userRepo.findOneBy.mockResolvedValue(null);
    const result = await deliver('customer.subscription.created');
    expect(result).toEqual({ received: true, ignored: 'foreign_customer' });
    expect(userRepo.save).not.toHaveBeenCalled();
    expect(entitlements.syncPro).not.toHaveBeenCalled();
  });

  describe('confirmProCheckoutSession', () => {
    const session = () =>
      fixture('checkout.session.completed.subscription').data.object;

    it('activates Pro from a completed session owned by the caller', async () => {
      const s = session();
      stripe.checkout.sessions.retrieve.mockResolvedValue(s);
      stripe.subscriptions.retrieve.mockResolvedValue(
        fixture('customer.subscription.created').data.object,
      );
      const userId = Number(s.metadata.userId);

      await service.confirmProCheckoutSession(userId, s.id);

      expect(stripe.subscriptions.retrieve).toHaveBeenCalledWith(
        s.subscription,
      );
      expect(userRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ role: Role.Pro }),
      );
    });

    it('does nothing when the webhook already activated that subscription', async () => {
      const s = session();
      stripe.checkout.sessions.retrieve.mockResolvedValue(s);
      userRepo.findOneBy.mockResolvedValue({
        ...user(),
        role: Role.Pro,
        pro_membership_expires_at: new Date(Date.now() + 86_400_000),
        stripe_subscription_id: s.subscription,
      });

      const result = await service.confirmProCheckoutSession(
        Number(s.metadata.userId),
        s.id,
      );

      expect(result).toEqual({ active: true });
      expect(stripe.subscriptions.retrieve).not.toHaveBeenCalled();
      expect(userRepo.save).not.toHaveBeenCalled(); // no token_version bump
    });

    it("refuses another account's session", async () => {
      stripe.checkout.sessions.retrieve.mockResolvedValue(session());
      await expect(
        service.confirmProCheckoutSession(999, 'cs_x'),
      ).rejects.toThrow('different account');
    });

    it('refuses an unfinished session', async () => {
      const s = { ...session(), status: 'open' };
      stripe.checkout.sessions.retrieve.mockResolvedValue(s);
      await expect(
        service.confirmProCheckoutSession(Number(s.metadata.userId), s.id),
      ).rejects.toThrow('not completed');
    });
  });
});
