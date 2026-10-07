import { ExecutionContext, Injectable, Logger } from '@nestjs/common';
import { ThrottlerGuard, ThrottlerLimitDetail } from '@nestjs/throttler';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';
import { ACCESS_TOKEN_COOKIE } from '../auth/auth.controller';
import { clientIp } from './client-ip';

/**
 * Expired access tokens still key the user's bucket for this long. The access
 * JWT lives 1 h; after that every request 401s → refresh → retry, and without
 * this a whole classroom falls back to the school's one shared IP at the same
 * moment (the hour-mark stampede). Matches the 30-day refresh cookie loosely;
 * a week is plenty and keeps very old tokens out.
 */
const EXPIRED_TOKEN_GRACE_SECONDS = 7 * 24 * 60 * 60;

/**
 * Rate-limit key = user id when the request carries a signed access token
 * (cookie or Bearer, expired up to a week ago), else the client IP.
 *
 * The stock ThrottlerGuard keys by IP only, which made a 30-student classroom
 * behind one school NAT share a single 30 req/min bucket (PA32). This guard
 * runs before passport, so it verifies the cookie/Bearer JWT itself (HMAC
 * only — cheap, and a forged token cannot mint its own bucket). An expired
 * token only picks the bucket; it never authenticates anything.
 */
@Injectable()
export class UserThrottlerGuard extends ThrottlerGuard {
  private readonly logger = new Logger(UserThrottlerGuard.name);
  private jwt: JwtService | null = null;

  protected async getTracker(req: Request): Promise<string> {
    const token = this.extractToken(req);
    if (token) {
      const sub = this.userIdFromToken(token);
      if (sub != null) return `user:${sub}`;
    }
    return `ip:${clientIp(req)}`;
  }

  protected async throwThrottlingException(
    context: ExecutionContext,
    detail: ThrottlerLimitDetail,
  ): Promise<void> {
    const req = context.switchToHttp().getRequest<Request>();
    // Which bucket filled tells a school NAT (ip:) from one busy account (user:).
    this.logger.warn(
      `429 ${req.method} ${req.path} bucket=${maskTracker(detail.tracker)} limit=${detail.limit}/${Math.round(detail.ttl / 1000)}s`,
    );
    return super.throwThrottlingException(context, detail);
  }

  private extractToken(req: Request): string | null {
    const fromCookie = (req as Request & { cookies?: Record<string, string> })
      .cookies?.[ACCESS_TOKEN_COOKIE];
    if (fromCookie) return fromCookie;
    const auth = req.headers.authorization;
    if (auth?.startsWith('Bearer ')) return auth.slice(7);
    return null;
  }

  private userIdFromToken(token: string): number | null {
    try {
      if (!this.jwt) {
        this.jwt = new JwtService({ secret: process.env.JWT_SECRET });
      }
      const payload = this.jwt.verify<{ sub?: number | string; exp?: number }>(
        token,
        { ignoreExpiration: true },
      );
      if (
        typeof payload?.exp === 'number' &&
        payload.exp + EXPIRED_TOKEN_GRACE_SECONDS < Date.now() / 1000
      ) {
        return null;
      }
      const sub = Number(payload?.sub);
      return Number.isFinite(sub) ? sub : null;
    } catch {
      return null;
    }
  }
}

/** `ip:50.227.29.34` → `ip:50.227.29.x`; user ids pass through. */
export function maskTracker(tracker: string): string {
  if (!tracker.startsWith('ip:')) return tracker;
  const ip = tracker.slice(3);
  const v4 = ip.match(/^(\d+\.\d+\.\d+)\.\d+$/);
  if (v4) return `ip:${v4[1]}.x`;
  const v6 = ip.split(':');
  return v6.length > 3 ? `ip:${v6.slice(0, 3).join(':')}::x` : 'ip:x';
}
