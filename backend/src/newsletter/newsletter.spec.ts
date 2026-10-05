import { readFileSync } from 'fs';
import { join } from 'path';
import { BadRequestException, ConflictException } from '@nestjs/common';
import {
  emailBody,
  issueWarnings,
  parseIssueFile,
  webBody,
} from './issue-file';
import { NewsletterService } from './newsletter.service';

const file = (
  body: string,
  meta = 'slug: 2026-11\nsubject: Field Notes · November 2026',
) => `---\n${meta}\n---\n${body}`;

const BODY = `<!-- editor note: check FAA date -->
**Field Notes · November 2026**

## The one thing

About 480,000 people hold a remote pilot certificate.

<!-- segment -->
**Which one are you?** [Book a call]({{site_url}}/consultation)
<!-- /segment -->

Forward to a teacher.`;

describe('issue file', () => {
  it('parses front matter with defaults', () => {
    const p = parseIssueFile(file(BODY));
    expect(p).toMatchObject({
      slug: '2026-11',
      subject: 'Field Notes · November 2026',
      preheader: null,
      lists: ['newsletter'],
      correction: null,
    });
  });

  it('rejects files without front matter, bad slugs and unknown lists', () => {
    expect(() => parseIssueFile(BODY)).toThrow(BadRequestException);
    expect(() =>
      parseIssueFile(file(BODY, 'slug: Nov 2026\nsubject: Hi there')),
    ).toThrow(/slug/);
    expect(() =>
      parseIssueFile(
        file(BODY, 'slug: 2026-11\nsubject: Hello\nlists: everyone'),
      ),
    ).toThrow(/lists/);
  });

  it('email keeps the segment block; web drops it; notes never ship', () => {
    const e = emailBody(BODY);
    const w = webBody(BODY);
    expect(e).toContain('Which one are you?');
    expect(w).not.toContain('Which one are you?');
    for (const out of [e, w]) {
      expect(out).not.toContain('editor note');
      expect(out).not.toContain('<!--');
      expect(out).toContain('Forward to a teacher.');
    }
  });

  it('the repo template parses and flags its own placeholders', () => {
    const tpl = readFileSync(
      join(__dirname, '../../../assets/newsletter/_template.md'),
      'utf8',
    );
    const p = parseIssueFile(tpl);
    const warnings = issueWarnings(p, 'https://thedroneedge.com');
    expect(warnings.join('\n')).toMatch(/Unfilled template placeholders/);
    expect(warnings.join('\n')).toMatch(/nl-YYYY-MM/);
    expect(emailBody(p.body)).not.toContain('Comments like this one');
    expect(webBody(p.body)).not.toContain('Which one are you?');
  });
});

describe('NewsletterService', () => {
  const query = jest.fn();
  const mailer = {
    siteUrl: 'https://thedroneedge.com',
    maxSendRate: 1000,
    renderPreview: jest.fn(() => ({ html: '<html/>', text: 'text' })),
    send: jest.fn(async () => ({ sent: true, messageId: 'm1' })),
  };
  const leads = {
    recipients: jest.fn(async () => [
      { id: 1, email: 'a@x.co' },
      { id: 2, email: 'b@x.co' },
    ]),
    unsubscribeUrls: jest.fn(() => ({
      unsubscribePageUrl: 'u',
      oneClickUrl: 'o',
    })),
    canSend: jest.fn(() => true),
  };
  let service: NewsletterService;

  const row = (over: Record<string, unknown> = {}) => ({
    id: 3,
    slug: '2026-11',
    subject: 'S',
    preheader: null,
    lists: ['newsletter'],
    body_md: BODY,
    web_body_md: null,
    corrections: [],
    status: 'draft',
    sent_at: null,
    ...over,
  });

  beforeEach(() => {
    jest.clearAllMocks();
    query.mockReset();
    service = new NewsletterService(
      { query } as never,
      mailer as never,
      leads as never,
    );
  });

  const sqlCalls = () => query.mock.calls.map((c) => String(c[0]));

  it('creates a draft on first upload', async () => {
    query
      .mockResolvedValueOnce([]) // existing?
      .mockResolvedValueOnce([]) // INSERT
      .mockResolvedValue([row()]); // get + previewIssue
    const res = await service.import(file(BODY));
    expect(res.action).toBe('created');
    expect(sqlCalls()[1]).toContain('INSERT INTO newsletter_issues');
  });

  it('re-uploading an approved issue replaces it and resets approval', async () => {
    query
      .mockResolvedValueOnce([row({ status: 'approved' })])
      .mockResolvedValueOnce([])
      .mockResolvedValue([row()]);
    const res = await service.import(file(BODY));
    expect(res.action).toBe('replaced');
    expect(sqlCalls()[1]).toMatch(/status = 'draft', approved_by = NULL/);
  });

  it('after send, an upload only corrects the web copy and needs a correction line', async () => {
    query.mockResolvedValueOnce([row({ status: 'sent' })]);
    await expect(service.import(file(BODY))).rejects.toThrow(/correction/);

    query
      .mockResolvedValueOnce([row({ status: 'sent' })])
      .mockResolvedValueOnce([])
      .mockResolvedValue([row({ status: 'sent' })]);
    const res = await service.import(
      file(
        BODY,
        'slug: 2026-11\nsubject: Other\ncorrection: Fixed the Part 108 date',
      ),
    );
    expect(res.action).toBe('web_corrected');
    const update = query.mock.calls[2];
    expect(String(update[0])).toContain('web_body_md');
    expect(String(update[0])).not.toContain('subject =');
    expect(update[1]).toContain('Fixed the Part 108 date');
  });

  it('refuses uploads while sending', async () => {
    query.mockResolvedValueOnce([row({ status: 'sending' })]);
    await expect(service.import(file(BODY))).rejects.toThrow(ConflictException);
  });

  it('will not send an unapproved draft', async () => {
    query.mockResolvedValueOnce([row({ status: 'draft' })]);
    await expect(service.send('2026-11')).rejects.toThrow(/Approve/);
    expect(mailer.send).not.toHaveBeenCalled();
  });

  it('resuming skips addresses that already got the issue', async () => {
    query
      .mockResolvedValueOnce([row({ status: 'sending' })]) // get
      .mockResolvedValueOnce([{ email: 'a@x.co' }]) // already sent
      .mockResolvedValue([]); // status update, send log, finish
    const res = await service.send('2026-11');
    expect(res.recipients).toBe(1);
    await new Promise((r) => setTimeout(r, 20));
    expect(mailer.send).toHaveBeenCalledTimes(1);
    const msg = (
      mailer.send.mock.calls as unknown as [
        { to: string; viewInBrowserUrl: string; bodyMarkdown: string },
      ][]
    )[0][0];
    expect(msg.to).toBe('b@x.co');
    expect(msg.viewInBrowserUrl).toBe(
      'https://thedroneedge.com/newsletter/2026-11',
    );
    expect(msg.bodyMarkdown).toContain('https://thedroneedge.com/consultation');
    expect(msg.bodyMarkdown).not.toContain('editor note');
  });
});
