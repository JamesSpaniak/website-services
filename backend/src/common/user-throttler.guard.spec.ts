import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';
import { UserThrottlerGuard, maskTracker } from './user-throttler.guard';

describe('UserThrottlerGuard', () => {
  const secret = 'test-secret';
  const jwt = new JwtService({ secret });
  let guard: UserThrottlerGuard;
  const saved = process.env.JWT_SECRET;

  beforeAll(() => {
    process.env.JWT_SECRET = secret;
    guard = new UserThrottlerGuard([], {} as never, {} as never);
  });
  afterAll(() => {
    process.env.JWT_SECRET = saved;
  });

  const tracker = (token?: string) =>
    (
      guard as unknown as { getTracker(r: Request): Promise<string> }
    ).getTracker({
      headers: token ? { authorization: `Bearer ${token}` } : {},
      socket: { remoteAddress: '50.227.29.34' },
    } as unknown as Request);

  const now = () => Math.floor(Date.now() / 1000);

  it('keys by user for a valid token', async () => {
    expect(await tracker(jwt.sign({ sub: 5 }))).toBe('user:5');
  });

  it('keeps the user bucket for a token that expired an hour ago', async () => {
    const token = jwt.sign({ sub: 5, exp: now() - 3600 });
    expect(await tracker(token)).toBe('user:5');
  });

  it('falls back to IP for tokens expired over a week ago or forged', async () => {
    const old = jwt.sign({ sub: 5, exp: now() - 8 * 24 * 3600 });
    expect(await tracker(old)).toBe('ip:50.227.29.34');
    const forged = new JwtService({ secret: 'other' }).sign({ sub: 5 });
    expect(await tracker(forged)).toBe('ip:50.227.29.34');
  });

  it('masks IPs in log lines', () => {
    expect(maskTracker('ip:50.227.29.34')).toBe('ip:50.227.29.x');
    expect(maskTracker('user:5')).toBe('user:5');
  });
});
