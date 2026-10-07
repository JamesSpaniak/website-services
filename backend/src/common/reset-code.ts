import { createHash, randomInt, timingSafeEqual } from 'crypto';

/** No 0/O, 1/I/L — students read the code off a teacher's screen. */
const ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
export const RESET_CODE_LENGTH = 8;

/** Random 8-character code, shown as `ABCD-EFGH`. ~39 bits, fine with 5 tries and a 1 h expiry. */
export function generateResetCode(): string {
  let code = '';
  for (let i = 0; i < RESET_CODE_LENGTH; i++) {
    code += ALPHABET[randomInt(ALPHABET.length)];
  }
  return `${code.slice(0, 4)}-${code.slice(4)}`;
}

/** Accepts `abcd efgh`, `ABCD-EFGH`, `abcdefgh`. */
export function normalizeResetCode(input: string): string {
  return input.toUpperCase().replace(/[^A-Z0-9]/g, '');
}

/** Salted with the user id so equal codes for two users hash differently. */
export function hashResetCode(userId: number, code: string): string {
  return createHash('sha256')
    .update(`${userId}:${normalizeResetCode(code)}`)
    .digest('hex');
}

export function resetCodeMatches(
  userId: number,
  code: string,
  storedHash: string,
): boolean {
  const a = Buffer.from(hashResetCode(userId, code), 'hex');
  const b = Buffer.from(storedHash, 'hex');
  return (
    a.length === b.length &&
    timingSafeEqual(new Uint8Array(a), new Uint8Array(b))
  );
}
