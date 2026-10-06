import { AsyncLocalStorage } from 'async_hooks';
import { createHash } from 'crypto';

/**
 * Server events emitted while handling one external delivery (a Stripe
 * webhook event, or its replay) share an origin: a stable key and the time
 * the provider says it happened. ProductEventsService.record derives
 * `event_id` and `occurred_at` from it, so a redelivered or replayed webhook
 * writes the same (event_id, occurred_at) again and the unique index +
 * ON CONFLICT DO NOTHING drops the duplicate (PA42).
 */
export interface EventOrigin {
  key: string;
  occurredAt: Date;
}

const storage = new AsyncLocalStorage<EventOrigin>();

export function withEventOrigin<T>(origin: EventOrigin, fn: () => T): T {
  return storage.run(origin, fn);
}

export function currentEventOrigin(): EventOrigin | undefined {
  return storage.getStore();
}

/** Name-based UUID (RFC 4122 v5 layout, SHA-1) — same input, same id. */
export function deterministicUuid(name: string): string {
  const b = createHash('sha1').update(`droneedge:${name}`).digest();
  b[6] = (b[6] & 0x0f) | 0x50;
  b[8] = (b[8] & 0x3f) | 0x80;
  const h = b.subarray(0, 16).toString('hex');
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20, 32)}`;
}
