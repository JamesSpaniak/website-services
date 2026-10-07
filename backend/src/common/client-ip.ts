import { Logger } from '@nestjs/common';
import { Request } from 'express';

const logger = new Logger('ClientIp');

/**
 * Client IP for rate limiting.
 *
 * Every proxy in front of the API appends the address that connected to it to
 * `X-Forwarded-For`: CloudFront adds the viewer, the public ALB adds the
 * CloudFront edge, the internal ALB adds the Next.js task. Anything to the left
 * of those entries was written by the client and can be spoofed.
 *
 * `TRUSTED_PROXY_HOPS` = how many entries on the right our own proxies append
 * (expected 3 in AWS — confirm with `LOG_FORWARDED_CHAIN` first). The client is
 * the entry just left of them. Unset keeps the legacy behaviour (first entry),
 * which is spoofable; only set it once the ALB accepts CloudFront traffic only,
 * or a direct-to-ALB request shortens the chain and the client picks the entry
 * again. See docs/TODO.md "Shared-IP + bot hardening".
 */
export function clientIp(req: Request): string {
  const header = req.headers['x-forwarded-for'];
  const raw = Array.isArray(header) ? header.join(',') : header;
  const chain = (raw ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  const socketIp = req.socket?.remoteAddress || req.ip || 'unknown';

  if (process.env.LOG_FORWARDED_CHAIN === 'true') {
    logger.log(
      `x-forwarded-for chain (${chain.length}): [${chain.join(', ')}] socket=${socketIp}`,
    );
  }

  const hops = parseHops(process.env.TRUSTED_PROXY_HOPS);
  if (hops === null) return chain[0] || socketIp;
  return pickClient(chain, hops) || socketIp;
}

function parseHops(value: string | undefined): number | null {
  if (value === undefined || value.trim() === '') return null;
  const n = Number(value);
  return Number.isInteger(n) && n >= 0 ? n : null;
}

/**
 * The entry `hops` places from the right. A shorter chain than expected means
 * a proxy was skipped; the left-most entry is then the best we have.
 */
export function pickClient(chain: string[], hops: number): string | undefined {
  // No proxies in front (local dev): the socket peer is the client.
  if (hops === 0 || chain.length === 0) return undefined;
  const index = chain.length - hops;
  return chain[Math.max(0, Math.min(index, chain.length - 1))];
}
