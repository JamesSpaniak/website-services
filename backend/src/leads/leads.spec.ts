import { generateKeyPairSync, createSign } from 'crypto';
import {
  createUnsubscribeToken,
  verifyUnsubscribeToken,
} from './unsubscribe-token';
import {
  isSnsUrl,
  parseSnsMessage,
  SnsMessage,
  stringToSign,
  verifySnsSignature,
} from '../email/sns-message';
import {
  fillPlaceholders,
  loadTemplate,
  parseTemplate,
  renderEmail,
} from '../email/templates/render';
import { LeadsService } from './leads.service';
import { SesEventsService } from './ses-events.service';
import { maskEmail } from '../common/pii';
import { MarketingMessage } from '../email/marketing-mailer.service';

describe('unsubscribe token', () => {
  it('round-trips and rejects tampering', () => {
    const t = createUnsubscribeToken(42, 'secret');
    expect(verifyUnsubscribeToken(t, 'secret')).toBe(42);
    expect(verifyUnsubscribeToken(t, 'other-secret')).toBeNull();
    expect(
      verifyUnsubscribeToken(t.replace('.42.', '.43.'), 'secret'),
    ).toBeNull();
    expect(verifyUnsubscribeToken('v1.42.', 'secret')).toBeNull();
    expect(verifyUnsubscribeToken('garbage', 'secret')).toBeNull();
    expect(verifyUnsubscribeToken(undefined, 'secret')).toBeNull();
  });

  it('does not contain the email address', () => {
    expect(createUnsubscribeToken(7, 's')).toMatch(/^v1\.7\.[A-Za-z0-9_-]+$/);
  });
});

describe('maskEmail', () => {
  it('masks the local part, passes usernames through', () => {
    expect(maskEmail('james@example.com')).toBe('j***@example.com');
    expect(maskEmail('pilot42')).toBe('pilot42');
    expect(maskEmail(undefined)).toBe('');
  });
});

describe('SNS message verification', () => {
  const { privateKey, publicKey } = generateKeyPairSync('rsa', {
    modulusLength: 2048,
  });
  const pem = publicKey.export({ type: 'spki', format: 'pem' }).toString();

  const signed = (m: Omit<SnsMessage, 'Signature'>): SnsMessage => {
    const base = { ...m, Signature: '' } as SnsMessage;
    const signer = createSign(
      m.SignatureVersion === '2' ? 'RSA-SHA256' : 'RSA-SHA1',
    );
    signer.update(stringToSign(base));
    return { ...base, Signature: signer.sign(privateKey, 'base64') };
  };

  const notification = signed({
    Type: 'Notification',
    MessageId: 'm-1',
    TopicArn: 'arn:aws:sns:us-east-1:123:droneedge-dev-ses-events',
    Message: JSON.stringify({ eventType: 'Bounce' }),
    Timestamp: '2026-10-03T12:00:00.000Z',
    SignatureVersion: '2',
    SigningCertURL:
      'https://sns.us-east-1.amazonaws.com/SimpleNotificationService-abc.pem',
  });

  it('verifies a correctly signed message (v1 and v2)', () => {
    expect(verifySnsSignature(notification, pem)).toBe(true);
    const v1 = signed({ ...notification, SignatureVersion: '1' });
    expect(verifySnsSignature(v1, pem)).toBe(true);
  });

  it('rejects a modified message', () => {
    expect(
      verifySnsSignature(
        { ...notification, Message: '{"eventType":"Complaint"}' },
        pem,
      ),
    ).toBe(false);
  });

  it('only trusts SNS-hosted certs and subscribe URLs', () => {
    expect(isSnsUrl(notification.SigningCertURL, true)).toBe(true);
    expect(
      isSnsUrl('https://sns.us-east-1.amazonaws.com.evil.com/x.pem', true),
    ).toBe(false);
    expect(isSnsUrl('http://sns.us-east-1.amazonaws.com/x.pem', true)).toBe(
      false,
    );
    expect(
      isSnsUrl(
        'https://sns.us-east-1.amazonaws.com/?Action=ConfirmSubscription',
      ),
    ).toBe(true);
  });

  it('parses string bodies (text/plain from SNS) and rejects junk', () => {
    expect(parseSnsMessage(JSON.stringify(notification))?.MessageId).toBe(
      'm-1',
    );
    expect(parseSnsMessage('not json')).toBeNull();
    expect(parseSnsMessage({ hello: 'world' })).toBeNull();
  });
});

describe('email templates', () => {
  it('parses front matter and fills placeholders', () => {
    const tpl = parseTemplate(
      '---\nsubject: Hi {{name}}\npreheader: p\n---\n\nBody {{name}}',
    );
    expect(fillPlaceholders(tpl.subject, { name: 'A' })).toBe('Hi A');
    expect(tpl.body).toBe('Body {{name}}');
    expect(() => fillPlaceholders('{{missing}}', {})).toThrow(/missing/);
  });

  it('ships both templates with every placeholder satisfiable', () => {
    const vars = {
      interest_title: 't',
      interest_body: 'b',
      site_url: 'https://x',
    };
    for (const name of [
      'waitlist-confirmation',
      'launch-announcement',
    ] as const) {
      const tpl = loadTemplate(name);
      expect(tpl.subject).not.toBe('');
      expect(() => fillPlaceholders(tpl.body, vars)).not.toThrow();
    }
  });

  it('renders footer with unsubscribe + postal address and escapes raw HTML', () => {
    const { html, text } = renderEmail({
      bodyMarkdown: 'Hello <script>alert(1)</script> [link](https://x.test)',
      unsubscribeUrl: 'https://thedroneedge.com/unsubscribe?t=abc',
      postalAddress: 'PO Box 1, Boston MA',
      siteUrl: 'https://thedroneedge.com',
    });
    expect(html).not.toContain('<script>');
    expect(html).toContain('https://thedroneedge.com/unsubscribe?t=abc');
    expect(html).toContain('PO Box 1, Boston MA');
    expect(text).toContain(
      'Unsubscribe or change preferences: https://thedroneedge.com/unsubscribe?t=abc',
    );
  });
});

describe('LeadsService', () => {
  const query = jest.fn();
  const dataSource = { query } as never;
  const mailer = {
    send: jest.fn<
      Promise<{ sent: boolean; messageId: string }>,
      [MarketingMessage]
    >(async () => ({ sent: true, messageId: 'x' })),
    isReady: jest.fn(() => true),
    siteUrl: 'https://thedroneedge.com',
    maxSendRate: 1000,
  };
  const productEvents = { record: jest.fn(async () => undefined) };
  const config = { get: jest.fn(() => 'test-secret') } as never;
  let service: LeadsService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new LeadsService(
      dataSource,
      mailer as never,
      productEvents as never,
      config,
    );
  });

  it('ignores honeypot submissions without touching the DB', async () => {
    await service.capture({
      email: 'a@b.co',
      interest: 'building',
      website: 'spam',
    });
    expect(query).not.toHaveBeenCalled();
    expect(mailer.send).not.toHaveBeenCalled();
  });

  it('stores lowercased email, records the event and sends one confirmation', async () => {
    query.mockResolvedValueOnce([{ id: 5, inserted: true, bounced_at: null }]);
    query.mockResolvedValueOnce([]); // confirmation_sent_at update
    await service.capture({
      email: 'New@Example.COM',
      interest: 'building',
      utm_source: 'actionspace',
    });
    expect(query.mock.calls[0][1].slice(0, 2)).toEqual([
      'new@example.com',
      'building',
    ]);
    expect(productEvents.record).toHaveBeenCalledWith(
      expect.objectContaining({ event: 'lead_captured', userId: null }),
    );
    const msg = mailer.send.mock.calls[0][0];
    expect(msg.to).toBe('new@example.com');
    expect(msg.oneClickUrl).toMatch(/\/api\/leads\/unsubscribe\?t=v1\.5\./);
    expect(msg.bodyMarkdown).toContain('January 2027');
  });

  it('silently ignores signups from a signed-in student (org member)', async () => {
    query.mockResolvedValueOnce([{ '?column?': 1 }]); // isSchoolStudent
    await service.capture(
      { email: 'kid@school.org', interest: 'newsletter' },
      12,
    );
    expect(query).toHaveBeenCalledTimes(1);
    expect(String(query.mock.calls[0][0])).toContain('organization_members');
    expect(mailer.send).not.toHaveBeenCalled();
    expect(productEvents.record).not.toHaveBeenCalled();
  });

  it('accepts a signed-in adult who is not an org member', async () => {
    query.mockResolvedValueOnce([]); // isSchoolStudent → no
    query.mockResolvedValueOnce([{ id: 8, inserted: true, bounced_at: null }]);
    query.mockResolvedValueOnce([]); // confirmation_sent_at
    await service.capture(
      { email: 'teacher@school.org', interest: 'newsletter' },
      3,
    );
    const msg = mailer.send.mock.calls[0][0];
    expect(msg.subject).toContain('Field Notes');
    expect(msg.bodyMarkdown).toContain('first Tuesday');
  });

  it('profile toggle: unsubscribe leaves only that list', async () => {
    query
      .mockResolvedValueOnce([]) // isSchoolStudent
      .mockResolvedValueOnce([{ email: 'Me@Example.com' }])
      .mockResolvedValueOnce([]) // UPDATE
      .mockResolvedValueOnce([
        { interest: 'newsletter', unsubscribed_at: new Date() },
        { interest: 'building', unsubscribed_at: null },
      ]);
    const prefs = await service.setMySubscription(4, 'newsletter', false);
    expect(query.mock.calls[2][1]).toEqual(['me@example.com', 'newsletter']);
    expect(prefs.interests).toEqual([
      { interest: 'newsletter', subscribed: false },
      { interest: 'building', subscribed: true },
    ]);
  });

  it('profile toggle: refuses school accounts', async () => {
    query.mockResolvedValueOnce([{ '?column?': 1 }]);
    await expect(service.myPreferences(12)).rejects.toThrow(
      'not available for school accounts',
    );
  });

  it('does not re-send to an address already on the list', async () => {
    query.mockResolvedValueOnce([]); // ON CONFLICT … WHERE matched nothing
    await service.capture({ email: 'a@b.co', interest: 'part107' });
    expect(mailer.send).not.toHaveBeenCalled();
    expect(productEvents.record).not.toHaveBeenCalled();
  });

  it('unsubscribes by token and rejects bad tokens', async () => {
    const t = createUnsubscribeToken(9, 'test-secret');
    query
      .mockResolvedValueOnce([{ email: 'a@b.co' }])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([
        { interest: 'building', unsubscribed_at: new Date() },
      ]);
    const prefs = await service.unsubscribe(t);
    expect(query.mock.calls[1][1]).toEqual(['a@b.co', null]);
    expect(prefs).toEqual({
      email_masked: 'a***@b.co',
      interests: [{ interest: 'building', subscribed: false }],
    });
    await expect(service.unsubscribe('v1.9.bad')).rejects.toThrow(
      'Invalid link.',
    );
  });

  it('dry run counts recipients without sending', async () => {
    query.mockResolvedValueOnce([
      { id: 1, email: 'a@b.co' },
      { id: 2, email: 'c@d.co' },
    ]);
    const res = await service.broadcast(
      {
        subject: 'Hello',
        body_markdown: 'x'.repeat(30),
        interests: ['building'],
        mode: 'dry_run',
      },
      1,
    );
    expect(res).toMatchObject({
      recipients: 2,
      sent: 0,
      status: 'counted',
      ready: true,
    });
    expect(String(query.mock.calls[0][0])).toMatch(
      /NOT EXISTS[\s\S]*organization_members[\s\S]*'member'/,
    );
    expect(mailer.send).not.toHaveBeenCalled();
  });

  it('CSV export neutralises formula injection', async () => {
    query.mockResolvedValueOnce([
      {
        id: 1,
        email: 'a@b.co',
        interest: 'building',
        utm_source: '=HYPERLINK("x")',
      },
    ]);
    const csv = await service.exportCsv({});
    expect(csv).toContain(`"'=HYPERLINK(""x"")"`);
  });
});

describe('SesEventsService.apply', () => {
  const leads = {
    markBounced: jest.fn(async () => 1),
    markComplained: jest.fn(async () => 1),
  };
  const dsQuery = jest.fn<Promise<unknown[]>, [string, unknown[]]>(
    async () => [],
  );
  const svc = new SesEventsService(
    leads as never,
    { query: dsQuery } as never,
    { get: () => 'arn' } as never,
  );

  beforeEach(() => jest.clearAllMocks());

  const mail = (kind = 'newsletter') => ({
    timestamp: '2026-11-03T15:00:00.000Z',
    messageId: 'msg-1',
    destination: ['Teacher@School.org'],
    tags: { kind: [kind], issue: ['2026-11'] },
  });

  it('records a human newsletter click with recipient + link', async () => {
    await svc.apply({
      eventType: 'Click',
      mail: mail(),
      click: {
        timestamp: '2026-11-03T16:00:00.000Z',
        link: 'https://thedroneedge.com/consultation?utm_content=segment',
      },
    });
    const [sql, params] = dsQuery.mock.calls[0];
    expect(sql).toContain('INSERT INTO newsletter_events');
    expect(params.slice(0, 6)).toEqual([
      '2026-11',
      'msg-1',
      'click',
      'teacher@school.org',
      'https://thedroneedge.com/consultation?utm_content=segment',
      false,
    ]);
  });

  it('keys rows on the SNS MessageId so retries are skipped', async () => {
    await svc.apply({ eventType: 'Delivery', mail: mail() }, 'sns-1');
    const [sql, params] = dsQuery.mock.calls[0];
    expect(sql).toContain('ON CONFLICT DO NOTHING');
    expect(params[7]).toBe('sns-1');
  });

  it('flags scanner clicks within 30 s of sending', async () => {
    await svc.apply({
      eventType: 'Click',
      mail: mail(),
      click: { timestamp: '2026-11-03T15:00:05.000Z', link: 'https://x.co' },
    });
    expect(dsQuery.mock.calls[0][1][5]).toBe(true);
  });

  it('stores opens without the recipient', async () => {
    await svc.apply({
      eventType: 'Open',
      mail: mail(),
      open: { timestamp: '2026-11-03T15:10:00.000Z' },
    });
    expect(dsQuery.mock.calls[0][1][2]).toBe('open');
    expect(dsQuery.mock.calls[0][1][3]).toBeNull();
  });

  it('ignores test sends and non-newsletter mail', async () => {
    await svc.apply({ eventType: 'Click', mail: mail('newsletter_test') });
    await svc.apply({ eventType: 'Delivery', mail: mail('broadcast') });
    expect(dsQuery).not.toHaveBeenCalled();
  });

  it('marks permanent bounces only', async () => {
    await svc.apply({
      eventType: 'Bounce',
      bounce: {
        bounceType: 'Transient',
        bouncedRecipients: [{ emailAddress: 'a@b.co' }],
      },
    });
    expect(leads.markBounced).not.toHaveBeenCalled();
    await svc.apply({
      eventType: 'Bounce',
      bounce: {
        bounceType: 'Permanent',
        bouncedRecipients: [{ emailAddress: 'a@b.co' }],
      },
    });
    expect(leads.markBounced).toHaveBeenCalledWith(['a@b.co']);
  });

  it('treats complaints as unsubscribe (identity-notification shape too)', async () => {
    await svc.apply({
      notificationType: 'Complaint',
      complaint: { complainedRecipients: [{ emailAddress: 'x@y.co' }] },
    });
    expect(leads.markComplained).toHaveBeenCalledWith(['x@y.co']);
  });
});
