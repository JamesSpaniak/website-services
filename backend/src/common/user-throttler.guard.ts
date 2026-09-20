import { Injectable } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';
import { ACCESS_TOKEN_COOKIE } from '../auth/auth.controller';

/**
 * Rate-limit key = authenticated user id when a valid access token is present,
 * else the client IP.
 *
 * The stock ThrottlerGuard keys by IP only, which made a 30-student classroom
 * behind one school NAT share a single 30 req/min bucket (PA32). This guard
 * runs before passport, so it verifies the cookie/Bearer JWT itself (HMAC
 * only — cheap, and a forged token cannot mint its own bucket).
 */
@Injectable()
export class UserThrottlerGuard extends ThrottlerGuard {
  private jwt: JwtService | null = null;

  protected async getTracker(req: Request): Promise<string> {
    const token = this.extractToken(req);
    if (token) {
      const sub = this.userIdFromToken(token);
      if (sub != null) return `user:${sub}`;
    }
    const ip =
      (req.headers['x-forwarded-for'] as string | undefined)
        ?.split(',')[0]
        ?.trim() ||
      req.ip ||
      req.socket?.remoteAddress ||
      'unknown';
    return `ip:${ip}`;
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
      const payload = this.jwt.verify<{ sub?: number | string }>(token);
      const sub = Number(payload?.sub);
      return Number.isFinite(sub) ? sub : null;
    } catch {
      return null;
    }
  }
}
