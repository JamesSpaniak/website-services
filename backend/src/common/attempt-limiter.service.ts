import { HttpException, HttpStatus, Injectable } from '@nestjs/common';

type Window = { count: number; resetAt: number };

/** Sweep expired windows once the map grows past this many keys. */
const SWEEP_THRESHOLD = 10_000;

/**
 * Small fixed-window counters for limits the route throttler can't express:
 * per account (login failures, teacher reset codes), per email (reset links)
 * and per IP per day (registrations). In memory per backend task, like the
 * throttler's own storage — exact at one task, looser when autoscaled.
 */
@Injectable()
export class AttemptLimiter {
  private windows = new Map<string, Window>();

  /** Hits recorded for `key` in its current window (0 when none or expired). */
  count(key: string, now = Date.now()): number {
    const w = this.windows.get(key);
    if (!w || w.resetAt <= now) return 0;
    return w.count;
  }

  /** Seconds until `key`'s window resets (0 when no live window). */
  retryAfterSeconds(key: string, now = Date.now()): number {
    const w = this.windows.get(key);
    if (!w || w.resetAt <= now) return 0;
    return Math.ceil((w.resetAt - now) / 1000);
  }

  /** Record one hit; the window starts on the first hit and lasts `ttlMs`. */
  hit(key: string, ttlMs: number, now = Date.now()): number {
    if (this.windows.size > SWEEP_THRESHOLD) this.sweep(now);
    const w = this.windows.get(key);
    if (!w || w.resetAt <= now) {
      this.windows.set(key, { count: 1, resetAt: now + ttlMs });
      return 1;
    }
    w.count += 1;
    return w.count;
  }

  reset(key: string): void {
    this.windows.delete(key);
  }

  /**
   * Throws 429 when `key` already has `limit` hits in its window; otherwise
   * records this hit. For limits that count every request.
   */
  consume(
    key: string,
    limit: number,
    ttlMs: number,
    message: string,
    now = Date.now(),
  ): void {
    if (this.count(key, now) >= limit) {
      throw tooManyRequests(message, this.retryAfterSeconds(key, now));
    }
    this.hit(key, ttlMs, now);
  }

  /** Throws 429 when `key` has reached `limit` without recording a hit. */
  assertBelow(key: string, limit: number, message: string, now = Date.now()) {
    if (this.count(key, now) >= limit) {
      throw tooManyRequests(message, this.retryAfterSeconds(key, now));
    }
  }

  private sweep(now: number) {
    for (const [key, w] of this.windows) {
      if (w.resetAt <= now) this.windows.delete(key);
    }
  }
}

export function tooManyRequests(
  message: string,
  retryAfterSeconds: number,
): HttpException {
  return new HttpException(
    {
      statusCode: HttpStatus.TOO_MANY_REQUESTS,
      message,
      retry_after_seconds: retryAfterSeconds,
    },
    HttpStatus.TOO_MANY_REQUESTS,
  );
}

/** Lower-cased, trimmed identifier so `Mike@X.org ` and `mike@x.org` share a counter. */
export function normalizeIdentifier(value: string | undefined | null): string {
  return (value ?? '').trim().toLowerCase();
}
