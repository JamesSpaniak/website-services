import { HttpException } from '@nestjs/common';
import { AttemptLimiter, normalizeIdentifier } from './attempt-limiter.service';

describe('AttemptLimiter', () => {
  it('counts hits inside a window and resets after it', () => {
    const limiter = new AttemptLimiter();
    limiter.hit('k', 1_000, 0);
    limiter.hit('k', 1_000, 500);
    expect(limiter.count('k', 900)).toBe(2);
    expect(limiter.count('k', 1_000)).toBe(0);
    expect(limiter.hit('k', 1_000, 1_000)).toBe(1);
  });

  it('consume() throws 429 with retry_after_seconds once the limit is reached', () => {
    const limiter = new AttemptLimiter();
    limiter.consume('k', 2, 60_000, 'slow down', 0);
    limiter.consume('k', 2, 60_000, 'slow down', 0);
    try {
      limiter.consume('k', 2, 60_000, 'slow down', 30_000);
      fail('expected a 429');
    } catch (e) {
      const err = e as HttpException;
      expect(err.getStatus()).toBe(429);
      expect(err.getResponse()).toMatchObject({
        message: 'slow down',
        retry_after_seconds: 30,
      });
    }
  });

  it('assertBelow() does not record a hit', () => {
    const limiter = new AttemptLimiter();
    limiter.assertBelow('k', 1, 'x');
    expect(limiter.count('k')).toBe(0);
  });

  it('normalizes identifiers', () => {
    expect(normalizeIdentifier('  Mike@School.ORG ')).toBe('mike@school.org');
  });
});
