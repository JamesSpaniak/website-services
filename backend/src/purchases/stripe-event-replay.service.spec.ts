import {
  MAX_REPLAY_ATTEMPTS,
  StripeEventReplayService,
} from './stripe-event-replay.service';

describe('StripeEventReplayService', () => {
  const event = (id: string) => ({ id, type: 'invoice.paid' });
  // Rows in stripe_event_replays, keyed by event id.
  let rows: Record<string, { status: string; attempts: number }>;
  let reconciliation: number[];

  const dataSource = {
    createQueryRunner: () => ({
      query: jest.fn(async () => [{ locked: true }]),
      release: jest.fn(),
    }),
    query: jest.fn(async (sql: string, params: unknown[] = []) => {
      if (sql.includes('SELECT status, attempts')) {
        const row = rows[params[0] as string];
        return row ? [row] : [];
      }
      if (sql.includes('INSERT INTO stripe_event_replays')) {
        const [id, , status] = params as string[];
        const prev = rows[id];
        rows[id] = { status, attempts: (prev?.attempts ?? 0) + 1 };
        return [];
      }
      if (sql.includes("WHERE status = 'dead'")) {
        return Object.entries(rows)
          .filter(([, r]) => r.status === 'dead')
          .map(([event_id]) => ({ event_id }));
      }
      if (sql.includes('SELECT mismatches FROM analytics_reconciliation')) {
        return reconciliation.length
          ? [{ mismatches: reconciliation[reconciliation.length - 1] }]
          : [];
      }
      if (sql.includes('INSERT INTO analytics_reconciliation')) {
        reconciliation.push(params[0] as number);
      }
      return [];
    }),
  };
  const purchases = { processEvent: jest.fn() };
  const stripe = { events: { list: jest.fn() } };
  const config = { get: jest.fn() };
  let service: StripeEventReplayService;

  const undelivered = (...events: { id: string }[]) =>
    stripe.events.list.mockReturnValue(
      (async function* () {
        yield* events;
      })(),
    );

  beforeEach(() => {
    jest.clearAllMocks();
    rows = {};
    reconciliation = [];
    service = new StripeEventReplayService(
      stripe as never,
      purchases as never,
      dataSource as never,
      config as never,
    );
  });

  it('asks Stripe only for undelivered events of the handled types', async () => {
    undelivered();
    await service.run();
    expect(stripe.events.list).toHaveBeenCalledWith(
      expect.objectContaining({
        delivery_success: false,
        types: expect.arrayContaining([
          'invoice.paid',
          'checkout.session.completed',
        ]),
      }),
    );
  });

  it('processes an undelivered event once, then skips it on later runs', async () => {
    undelivered(event('evt_1'));
    const first = await service.run();
    expect(first).toMatchObject({ seen: 1, processed: 1 });
    expect(purchases.processEvent).toHaveBeenCalledTimes(1);

    // Endpoint still down → Stripe still lists it; must not run again.
    undelivered(event('evt_1'));
    const second = await service.run();
    expect(second).toMatchObject({ seen: 1, skipped: 1 });
    expect(purchases.processEvent).toHaveBeenCalledTimes(1);
  });

  it(`retries a failing event up to ${MAX_REPLAY_ATTEMPTS} times, then marks it dead`, async () => {
    purchases.processEvent.mockRejectedValue(new Error('db down'));
    for (let i = 1; i < MAX_REPLAY_ATTEMPTS; i++) {
      undelivered(event('evt_bad'));
      expect(await service.run()).toMatchObject({
        failed: 1,
        deadUnresolved: 0,
      });
    }
    undelivered(event('evt_bad'));
    expect(await service.run()).toMatchObject({ dead: 1, deadUnresolved: 1 });
    expect(rows.evt_bad).toEqual({
      status: 'dead',
      attempts: MAX_REPLAY_ATTEMPTS,
    });

    // Dead events are not retried again, and stay reported.
    undelivered(event('evt_bad'));
    expect(await service.run()).toMatchObject({
      skipped: 1,
      deadUnresolved: 1,
    });
    expect(purchases.processEvent).toHaveBeenCalledTimes(MAX_REPLAY_ATTEMPTS);
    expect(reconciliation).toEqual([0, 1]); // written only when the count changes
  });

  it('the cron does nothing unless STRIPE_EVENT_REPLAY_ENABLED=true', async () => {
    config.get.mockReturnValue(undefined);
    await service.hourly();
    expect(stripe.events.list).not.toHaveBeenCalled();

    config.get.mockReturnValue('true');
    undelivered();
    await service.hourly();
    expect(stripe.events.list).toHaveBeenCalled();
  });
});
