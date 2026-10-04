import { createHmac, timingSafeEqual } from 'crypto';

/**
 * Unsubscribe token for a lead row: `v1.<leadId>.<hmac>`. Carries the row id,
 * never the email address, so a leaked link (forwarded mail, referrer, proxy
 * log) does not expose who it belongs to. No expiry — CAN-SPAM requires the
 * link to keep working, and it only grants "stop emailing this address".
 * Rotating LEADS_UNSUBSCRIBE_SECRET invalidates every link already sent.
 */
const PREFIX = 'v1';

function sign(leadId: number, secret: string): string {
  return createHmac('sha256', secret)
    .update(`lead-unsubscribe:${leadId}`)
    .digest('base64url');
}

export function createUnsubscribeToken(leadId: number, secret: string): string {
  return `${PREFIX}.${leadId}.${sign(leadId, secret)}`;
}

/** Lead id for a valid token, else null. Constant-time signature compare. */
export function verifyUnsubscribeToken(
  token: string | undefined | null,
  secret: string,
): number | null {
  if (!token || token.length > 128) return null;
  const parts = token.split('.');
  if (parts.length !== 3 || parts[0] !== PREFIX) return null;
  if (!/^\d{1,10}$/.test(parts[1])) return null;
  const leadId = Number(parts[1]);
  const expected = Buffer.from(sign(leadId, secret));
  const given = Buffer.from(parts[2]);
  if (expected.length !== given.length) return null;
  return timingSafeEqual(new Uint8Array(expected), new Uint8Array(given))
    ? leadId
    : null;
}
