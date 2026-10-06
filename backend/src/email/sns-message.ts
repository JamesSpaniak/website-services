import { createVerify } from 'crypto';

/**
 * Amazon SNS HTTPS message verification (launch plan Z2), per
 * https://docs.aws.amazon.com/sns/latest/dg/sns-verify-signature-of-message.html
 *
 * - SigningCertURL must be https on sns.<region>.amazonaws.com and end in .pem
 *   (otherwise anyone could sign with their own cert).
 * - SignatureVersion 1 = SHA1withRSA, 2 = SHA256withRSA.
 * - The string to sign is "Key\nValue\n" for a fixed, type-specific key list.
 */

export interface SnsMessage {
  Type: 'Notification' | 'SubscriptionConfirmation' | 'UnsubscribeConfirmation';
  MessageId: string;
  TopicArn: string;
  Message: string;
  Timestamp: string;
  SignatureVersion: '1' | '2';
  Signature: string;
  SigningCertURL: string;
  Subject?: string;
  Token?: string;
  SubscribeURL?: string;
}

const SNS_HOST = /^sns\.[a-z0-9-]+\.amazonaws\.com(\.cn)?$/;

/** True for an https URL on an SNS endpoint host — used for cert and SubscribeURL. */
export function isSnsUrl(raw: string | undefined, pemOnly = false): boolean {
  if (!raw) return false;
  try {
    const url = new URL(raw);
    if (url.protocol !== 'https:' || !SNS_HOST.test(url.hostname)) return false;
    return pemOnly ? url.pathname.endsWith('.pem') : true;
  } catch {
    return false;
  }
}

export function parseSnsMessage(body: unknown): SnsMessage | null {
  let obj: unknown = body;
  if (typeof body === 'string') {
    try {
      obj = JSON.parse(body);
    } catch {
      return null;
    }
  } else if (Buffer.isBuffer(body)) {
    try {
      obj = JSON.parse(body.toString('utf8'));
    } catch {
      return null;
    }
  }
  if (!obj || typeof obj !== 'object') return null;
  const m = obj as Partial<SnsMessage>;
  if (
    !m.Type ||
    !m.TopicArn ||
    !m.Signature ||
    !m.SigningCertURL ||
    typeof m.Message !== 'string'
  ) {
    return null;
  }
  return m as SnsMessage;
}

export function stringToSign(m: SnsMessage): string {
  const keys =
    m.Type === 'Notification'
      ? ['Message', 'MessageId', 'Subject', 'Timestamp', 'TopicArn', 'Type']
      : [
          'Message',
          'MessageId',
          'SubscribeURL',
          'Timestamp',
          'Token',
          'TopicArn',
          'Type',
        ];
  let out = '';
  for (const key of keys) {
    const value = (m as unknown as Record<string, string | undefined>)[key];
    // Subject is only included when present.
    if (value === undefined) continue;
    out += `${key}\n${value}\n`;
  }
  return out;
}

export function verifySnsSignature(m: SnsMessage, certPem: string): boolean {
  const algorithm =
    m.SignatureVersion === '2'
      ? 'RSA-SHA256'
      : m.SignatureVersion === '1'
        ? 'RSA-SHA1'
        : null;
  if (!algorithm) return false;
  try {
    const verifier = createVerify(algorithm);
    verifier.update(stringToSign(m), 'utf8');
    return verifier.verify(certPem, m.Signature, 'base64');
  } catch {
    return false;
  }
}
