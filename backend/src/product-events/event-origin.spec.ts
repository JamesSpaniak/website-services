import { ProductEventsService } from './product-events.service';
import { deterministicUuid, withEventOrigin } from './event-origin';

describe('event origin (PA42 — idempotent webhook product events)', () => {
  it('derives a stable RFC 4122 v5-shaped id', () => {
    const a = deterministicUuid('stripe:evt_1:pro_started:');
    expect(a).toBe(deterministicUuid('stripe:evt_1:pro_started:'));
    expect(a).not.toBe(deterministicUuid('stripe:evt_2:pro_started:'));
    expect(a).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-5[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
    );
  });

  const capture = () => {
    const query = jest.fn<Promise<unknown[]>, [string, unknown[]]>(
      async () => [],
    );
    const service = new ProductEventsService({ query } as never);
    // Org/entitlement context is irrelevant here.
    (service as unknown as { resolveContext: () => unknown }).resolveContext =
      async () => ({ organizationId: null, classId: null, hasAccess: true });
    return { service, query };
  };
  const insertedRow = (query: ReturnType<typeof capture>['query']) => {
    const params = query.mock.calls[0][1] as unknown[];
    return params;
  };

  it('a redelivered webhook writes the same event_id and occurred_at', async () => {
    const origin = {
      key: 'stripe:evt_9',
      occurredAt: new Date('2026-10-01T12:00:00Z'),
    };
    const first = capture();
    await withEventOrigin(origin, () =>
      first.service.record({ userId: 4, event: 'pro_cancel_scheduled' }),
    );
    const again = capture();
    await withEventOrigin(origin, () =>
      again.service.record({ userId: 4, event: 'pro_cancel_scheduled' }),
    );
    const a = insertedRow(first.query);
    const b = insertedRow(again.query);
    expect(a).toEqual(b);
    expect(a).toContainEqual(origin.occurredAt);
    expect(a).toContainEqual(
      deterministicUuid('stripe:evt_9:pro_cancel_scheduled:'),
    );
    expect(String(first.query.mock.calls[0][0])).toContain(
      'ON CONFLICT DO NOTHING',
    );
  });

  it('outside a delivery, server events keep a null event_id', async () => {
    const { service, query } = capture();
    await service.record({ userId: 4, event: 'login' });
    const params = insertedRow(query);
    expect(
      params.filter((p) => typeof p === 'string' && /^[0-9a-f]{8}-/.test(p)),
    ).toEqual([]);
  });
});
