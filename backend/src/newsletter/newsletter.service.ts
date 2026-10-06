import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { DataSource } from 'typeorm';
import { MarketingMailerService } from '../email/marketing-mailer.service';
import { renderMarkdown } from '../email/templates/render';
import { LeadsService } from '../leads/leads.service';
import { LeadInterest } from '../leads/types/lead.dto';
import {
  emailBody,
  issueWarnings,
  parseIssueFile,
  ParsedIssue,
  webBody,
} from './issue-file';

export type IssueStatus = 'draft' | 'approved' | 'sending' | 'sent';

export interface IssueRow {
  id: number;
  slug: string;
  subject: string;
  preheader: string | null;
  lists: LeadInterest[];
  body_md: string;
  web_body_md: string | null;
  corrections: { at: string; note: string }[];
  status: IssueStatus;
  approved_by: number | null;
  approved_at: Date | null;
  sent_at: Date | null;
  recipients: number | null;
  sent_count: number;
  failed_count: number;
  created_at: Date;
  updated_at: Date;
}

export interface IssueMetrics {
  sent: number;
  failed: number;
  delivered: number;
  bounced: number;
  complaints: number;
  /** Unique messages with an open event — inflated by Apple Mail Privacy Protection. */
  opens: number;
  /** Unique people with a click that wasn't a mail scanner. */
  clickers: number;
  human_clicks: number;
  scanner_clicks: number;
  /** Unsubscribes from the issue's lists within 7 days of the send. */
  unsubscribes: number;
  click_rate: number | null;
  by_section: { section: string; clicks: number; people: number }[];
  /** Admin-only follow-up list (decided Oct 4 2026): who clicked what, scanners excluded. */
  people: {
    email: string;
    first_click: Date;
    clicks: number;
    sections: string[];
  }[];
}

export interface IssuePreview {
  slug: string;
  subject: string;
  preheader: string | null;
  lists: LeadInterest[];
  email_html: string;
  email_text: string;
  web_html: string;
  warnings: string[];
}

/** Web archive is listed (and indexable) this long after send, so subscribers see it first (NL-D6). */
const ARCHIVE_DELAY_DAYS = 7;

/**
 * Field Notes publishing (newsletter plan § 8 "Publishing and updates").
 * Drafts live in the repo; Admin → Newsletter uploads the file. Statuses:
 * draft → approved → sending → sent. Re-uploading a draft or approved issue
 * replaces it and resets approval; re-uploading a sent issue changes only the
 * web copy and requires a `correction:` line. Sends go through LeadsService's
 * recipient rules (opted-in lists, deduped, never an org member) and record
 * one newsletter_sends row per address, so a stopped send resumes cleanly.
 */
@Injectable()
export class NewsletterService {
  private readonly logger = new Logger(NewsletterService.name);
  private sending = new Set<number>();

  constructor(
    private readonly dataSource: DataSource,
    private readonly mailer: MarketingMailerService,
    private readonly leads: LeadsService,
  ) {}

  // ── Admin ───────────────────────────────────────────────────────────────

  async list(): Promise<Omit<IssueRow, 'body_md' | 'web_body_md'>[]> {
    return this.dataSource.query(
      `SELECT id, slug, subject, preheader, lists, corrections, status, approved_by,
              approved_at, sent_at, recipients, sent_count, failed_count, created_at, updated_at
       FROM newsletter_issues ORDER BY created_at DESC LIMIT 200`,
    );
  }

  async get(slug: string): Promise<IssueRow> {
    const rows: IssueRow[] = await this.dataSource.query(
      `SELECT * FROM newsletter_issues WHERE slug = $1`,
      [slug],
    );
    if (!rows[0]) throw new NotFoundException(`No issue "${slug}".`);
    return rows[0];
  }

  /** Render a file without saving it (the "check before upload" path). */
  previewFile(source: string): IssuePreview {
    return this.render(parseIssueFile(source));
  }

  async previewIssue(slug: string): Promise<IssuePreview> {
    const row = await this.get(slug);
    return this.render(
      {
        slug: row.slug,
        subject: row.subject,
        preheader: row.preheader,
        lists: row.lists,
        correction: null,
        body: row.body_md,
      },
      row.web_body_md,
    );
  }

  async import(source: string): Promise<{
    issue: IssueRow;
    action: 'created' | 'replaced' | 'web_corrected';
    preview: IssuePreview;
  }> {
    const parsed = parseIssueFile(source);
    const existing: IssueRow[] = await this.dataSource.query(
      `SELECT * FROM newsletter_issues WHERE slug = $1`,
      [parsed.slug],
    );
    const current = existing[0];
    let action: 'created' | 'replaced' | 'web_corrected';

    if (!current) {
      await this.dataSource.query(
        `INSERT INTO newsletter_issues (slug, subject, preheader, lists, body_md)
         VALUES ($1, $2, $3, $4, $5)`,
        [
          parsed.slug,
          parsed.subject,
          parsed.preheader,
          parsed.lists,
          parsed.body,
        ],
      );
      action = 'created';
    } else if (current.status === 'draft' || current.status === 'approved') {
      // Any change after approval needs a fresh approval.
      await this.dataSource.query(
        `UPDATE newsletter_issues
         SET subject = $2, preheader = $3, lists = $4, body_md = $5,
             status = 'draft', approved_by = NULL, approved_at = NULL, updated_at = now()
         WHERE id = $1`,
        [
          current.id,
          parsed.subject,
          parsed.preheader,
          parsed.lists,
          parsed.body,
        ],
      );
      action = 'replaced';
    } else if (current.status === 'sending') {
      throw new ConflictException(
        'This issue is sending. Wait for it to finish, then upload a correction.',
      );
    } else {
      // Sent: the email can't change. Only the web copy, with a visible note.
      if (!parsed.correction) {
        throw new BadRequestException(
          'This issue was already sent. To change the web version, add a "correction:" line to the front matter saying what changed.',
        );
      }
      await this.dataSource.query(
        `UPDATE newsletter_issues
         SET web_body_md = $2,
             corrections = corrections || jsonb_build_array(jsonb_build_object('at', now(), 'note', $3::text)),
             updated_at = now()
         WHERE id = $1`,
        [current.id, parsed.body, parsed.correction],
      );
      action = 'web_corrected';
    }

    const issue = await this.get(parsed.slug);
    this.logger.log(`Newsletter ${parsed.slug}: ${action}`);
    return { issue, action, preview: await this.previewIssue(parsed.slug) };
  }

  async approve(slug: string, adminUserId: number): Promise<IssueRow> {
    const row = await this.get(slug);
    if (row.status !== 'draft') {
      throw new BadRequestException(
        `Only a draft can be approved (this one is ${row.status}).`,
      );
    }
    await this.dataSource.query(
      `UPDATE newsletter_issues SET status = 'approved', approved_by = $2, approved_at = now(), updated_at = now()
       WHERE id = $1 AND status = 'draft'`,
      [row.id, adminUserId],
    );
    return this.get(slug);
  }

  async unapprove(slug: string): Promise<IssueRow> {
    const row = await this.get(slug);
    if (row.status !== 'approved') {
      throw new BadRequestException(
        `Only an approved issue can go back to draft (this one is ${row.status}).`,
      );
    }
    await this.dataSource.query(
      `UPDATE newsletter_issues SET status = 'draft', approved_by = NULL, approved_at = NULL, updated_at = now()
       WHERE id = $1`,
      [row.id],
    );
    return this.get(slug);
  }

  /** Who a send would reach right now, minus addresses this issue already went to. */
  async count(
    slug: string,
  ): Promise<{ recipients: number; already_sent: number; ready: boolean }> {
    const row = await this.get(slug);
    const list = await this.leads.recipients(row.lists);
    const done = await this.sentEmails(row.id);
    return {
      recipients: list.filter((r) => !done.has(r.email)).length,
      already_sent: done.size,
      ready: this.leads.canSend(),
    };
  }

  /** Test copy to the signed-in admin; inert unsubscribe link (lead id 0). */
  async sendTest(
    slug: string,
    adminUserId: number,
  ): Promise<{ sent: boolean; to: string; reason?: string }> {
    const row = await this.get(slug);
    const users: { email: string }[] = await this.dataSource.query(
      `SELECT email FROM users WHERE id = $1`,
      [adminUserId],
    );
    const to = users[0]?.email;
    if (!to) throw new NotFoundException('Admin email not found.');
    const result = await this.mailer.send({
      to,
      subject: `[TEST] ${row.subject}`,
      preheader: row.preheader ?? undefined,
      bodyMarkdown: this.fillSiteUrl(emailBody(row.body_md)),
      viewInBrowserUrl: this.webUrl(row.slug),
      ...this.leads.unsubscribeUrls(0),
      tags: { kind: 'newsletter_test', issue: row.slug },
    });
    return { sent: result.sent, to, reason: result.reason };
  }

  /**
   * Starts (or resumes) the send in the background — a large list outlives
   * CloudFront's 30 s origin timeout. Addresses already in newsletter_sends
   * as `sent` are skipped, so pressing Send again after a crash is safe.
   */
  async send(slug: string): Promise<{ status: 'queued'; recipients: number }> {
    const row = await this.get(slug);
    if (row.status !== 'approved' && row.status !== 'sending') {
      throw new BadRequestException(
        row.status === 'sent'
          ? 'This issue was already sent.'
          : 'Approve the issue before sending.',
      );
    }
    if (!this.leads.canSend()) {
      throw new ServiceUnavailableException(
        'Marketing email is not configured here (SES settings, postal address or unsubscribe secret). Nothing was sent.',
      );
    }
    if (this.sending.has(row.id)) {
      throw new ConflictException('This issue is already sending.');
    }
    const done = await this.sentEmails(row.id);
    const list = (await this.leads.recipients(row.lists)).filter(
      (r) => !done.has(r.email),
    );
    await this.dataSource.query(
      `UPDATE newsletter_issues SET status = 'sending', recipients = $2, updated_at = now() WHERE id = $1`,
      [row.id, list.length + done.size],
    );
    this.sending.add(row.id);
    void this.sendAll(row, list).finally(() => this.sending.delete(row.id));
    return { status: 'queued', recipients: list.length };
  }

  private async sendAll(
    row: IssueRow,
    list: { id: number; email: string }[],
  ): Promise<void> {
    const body = this.fillSiteUrl(emailBody(row.body_md));
    const gapMs = Math.ceil(1000 / this.mailer.maxSendRate);
    this.logger.log(`Newsletter ${row.slug} sending to ${list.length}`);
    for (const r of list) {
      const started = Date.now();
      const result = await this.mailer.send({
        to: r.email,
        subject: row.subject,
        preheader: row.preheader ?? undefined,
        bodyMarkdown: body,
        viewInBrowserUrl: this.webUrl(row.slug),
        ...this.leads.unsubscribeUrls(r.id),
        tags: { kind: 'newsletter', issue: row.slug },
      });
      await this.dataSource
        .query(
          `INSERT INTO newsletter_sends (issue_id, email, status, message_id, error)
           VALUES ($1, $2, $3, $4, $5)
           ON CONFLICT (issue_id, email) DO UPDATE
             SET status = EXCLUDED.status, message_id = EXCLUDED.message_id,
                 error = EXCLUDED.error, sent_at = now()`,
          [
            row.id,
            r.email,
            result.sent ? 'sent' : 'failed',
            result.messageId ?? null,
            result.sent
              ? null
              : (result.error ?? result.reason ?? 'unknown').slice(0, 300),
          ],
        )
        .catch((err) =>
          this.logger.error(
            `newsletter_sends write failed: ${(err as Error).message}`,
          ),
        );
      const wait = gapMs - (Date.now() - started);
      if (wait > 0) await new Promise((res) => setTimeout(res, wait));
    }
    await this.dataSource.query(
      `UPDATE newsletter_issues i SET
         status = 'sent', sent_at = coalesce(i.sent_at, now()), updated_at = now(),
         sent_count   = (SELECT count(*) FROM newsletter_sends s WHERE s.issue_id = i.id AND s.status = 'sent'),
         failed_count = (SELECT count(*) FROM newsletter_sends s WHERE s.issue_id = i.id AND s.status = 'failed')
       WHERE i.id = $1`,
      [row.id],
    );
    this.logger.log(`Newsletter ${row.slug} finished`);
  }

  // ── Metrics (NL14) ──────────────────────────────────────────────────────

  /**
   * From newsletter_sends (our log) and newsletter_events (SES events via
   * SNS). Sections come from each link's utm_content. Clicks within 30 s of
   * sending are mail scanners and are counted separately.
   */
  async metrics(slug: string): Promise<IssueMetrics> {
    const row = await this.get(slug);
    const [totals]: Record<string, string | number>[] =
      await this.dataSource.query(
        `SELECT
         (SELECT count(*) FROM newsletter_sends WHERE issue_id = $1 AND status = 'sent')   AS sent,
         (SELECT count(*) FROM newsletter_sends WHERE issue_id = $1 AND status = 'failed') AS failed,
         count(DISTINCT message_id) FILTER (WHERE event_type = 'delivery')  AS delivered,
         count(DISTINCT message_id) FILTER (WHERE event_type = 'bounce')    AS bounced,
         count(DISTINCT message_id) FILTER (WHERE event_type = 'complaint') AS complaints,
         count(DISTINCT message_id) FILTER (WHERE event_type = 'open')      AS opens,
         count(DISTINCT email) FILTER (WHERE event_type = 'click' AND NOT likely_bot) AS clickers,
         count(*) FILTER (WHERE event_type = 'click' AND NOT likely_bot)    AS human_clicks,
         count(*) FILTER (WHERE event_type = 'click' AND likely_bot)        AS scanner_clicks
       FROM newsletter_events WHERE issue_id = $1`,
        [row.id],
      );
    const section = `coalesce(substring(link from '[?&]utm_content=([^&#]+)'), '(other)')`;
    const bySection: { section: string; clicks: string; people: string }[] =
      await this.dataSource.query(
        `SELECT ${section} AS section, count(*) AS clicks, count(DISTINCT email) AS people
         FROM newsletter_events
         WHERE issue_id = $1 AND event_type = 'click' AND NOT likely_bot
         GROUP BY 1 ORDER BY 2 DESC`,
        [row.id],
      );
    const people: {
      email: string;
      first_click: Date;
      clicks: string;
      sections: string[];
    }[] = await this.dataSource.query(
      `SELECT email, min(occurred_at) AS first_click, count(*) AS clicks,
                array_agg(DISTINCT ${section}) AS sections
         FROM newsletter_events
         WHERE issue_id = $1 AND event_type = 'click' AND NOT likely_bot AND email IS NOT NULL
         GROUP BY email ORDER BY min(occurred_at) LIMIT 1000`,
      [row.id],
    );
    let unsubscribes = 0;
    if (row.sent_at) {
      const [u]: { n: string }[] = await this.dataSource.query(
        `SELECT count(*) AS n FROM leads
         WHERE interest = ANY($1::text[])
           AND unsubscribed_at BETWEEN $2 AND $2::timestamptz + interval '7 days'`,
        [row.lists, row.sent_at],
      );
      unsubscribes = Number(u?.n ?? 0);
    }
    const n = (k: string) => Number(totals?.[k] ?? 0);
    const delivered = n('delivered') || n('sent');
    return {
      sent: n('sent'),
      failed: n('failed'),
      delivered: n('delivered'),
      bounced: n('bounced'),
      complaints: n('complaints'),
      opens: n('opens'),
      clickers: n('clickers'),
      human_clicks: n('human_clicks'),
      scanner_clicks: n('scanner_clicks'),
      unsubscribes,
      click_rate: delivered
        ? Math.round((n('clickers') / delivered) * 1000) / 10
        : null,
      by_section: bySection.map((s) => ({
        section: decodeURIComponent(s.section),
        clicks: Number(s.clicks),
        people: Number(s.people),
      })),
      people: people.map((p) => ({
        email: p.email,
        first_click: p.first_click,
        clicks: Number(p.clicks),
        sections: (p.sections ?? []).map((x) => decodeURIComponent(x)),
      })),
    };
  }

  /** Keep event history 12 months, like the other activity data (privacy § 7). */
  @Cron(CronExpression.EVERY_DAY_AT_3AM)
  async pruneEvents(): Promise<void> {
    try {
      await this.dataSource.query(
        `DELETE FROM newsletter_events WHERE occurred_at < now() - interval '12 months'`,
      );
    } catch (err) {
      this.logger.error(
        `newsletter_events prune failed: ${(err as Error).message}`,
      );
    }
  }

  // ── Public archive (/newsletter, /newsletter/<slug>) ────────────────────

  /** Sent issues older than the archive delay — the list on /newsletter. */
  async publicList(): Promise<
    { slug: string; subject: string; sent_at: Date }[]
  > {
    return this.dataSource.query(
      `SELECT slug, subject, sent_at FROM newsletter_issues
       WHERE status = 'sent' AND sent_at <= now() - ($1 || ' days')::interval
       ORDER BY sent_at DESC LIMIT 60`,
      [ARCHIVE_DELAY_DAYS],
    );
  }

  /**
   * Any sent issue by slug (the email's "View in browser" link works from day
   * one), but `listed` stays false — page noindex, not on /newsletter — until
   * the archive delay has passed.
   */
  async publicIssue(slug: string): Promise<{
    slug: string;
    subject: string;
    sent_at: Date;
    html: string;
    corrections: { at: string; note: string }[];
    listed: boolean;
  }> {
    const rows: IssueRow[] = await this.dataSource.query(
      `SELECT * FROM newsletter_issues WHERE slug = $1 AND status = 'sent'`,
      [slug],
    );
    const row = rows[0];
    if (!row || !row.sent_at) throw new NotFoundException('Issue not found.');
    const listed =
      Date.now() - new Date(row.sent_at).getTime() >=
      ARCHIVE_DELAY_DAYS * 86_400_000;
    return {
      slug: row.slug,
      subject: row.subject,
      sent_at: row.sent_at,
      html: renderMarkdown(
        this.fillSiteUrl(webBody(row.web_body_md ?? row.body_md)),
      ),
      corrections: row.corrections ?? [],
      listed,
    };
  }

  // ── Helpers ─────────────────────────────────────────────────────────────

  private render(
    issue: ParsedIssue,
    webOverride?: string | null,
  ): IssuePreview {
    const { html, text } = this.mailer.renderPreview({
      bodyMarkdown: this.fillSiteUrl(emailBody(issue.body)),
      preheader: issue.preheader ?? undefined,
      unsubscribePageUrl: `${this.mailer.siteUrl}/unsubscribe?t=preview`,
      viewInBrowserUrl: this.webUrl(issue.slug),
    });
    return {
      slug: issue.slug,
      subject: issue.subject,
      preheader: issue.preheader,
      lists: issue.lists,
      email_html: html,
      email_text: text,
      web_html: renderMarkdown(
        this.fillSiteUrl(webBody(webOverride ?? issue.body)),
      ),
      warnings: issueWarnings(issue, this.mailer.siteUrl),
    };
  }

  private webUrl(slug: string): string {
    return `${this.mailer.siteUrl}/newsletter/${slug}`;
  }

  private fillSiteUrl(markdown: string): string {
    return markdown.replace(/\{\{\s*site_url\s*\}\}/g, this.mailer.siteUrl);
  }

  private async sentEmails(issueId: number): Promise<Set<string>> {
    const rows: { email: string }[] = await this.dataSource.query(
      `SELECT email FROM newsletter_sends WHERE issue_id = $1 AND status = 'sent'`,
      [issueId],
    );
    return new Set(rows.map((r) => r.email));
  }
}
