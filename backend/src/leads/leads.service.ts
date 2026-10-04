import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DataSource } from 'typeorm';
import { maskEmail } from '../common/pii';
import { MarketingMailerService } from '../email/marketing-mailer.service';
import { fillPlaceholders, loadTemplate } from '../email/templates/render';
import { ProductEventsService } from '../product-events/product-events.service';
import {
  CreateLeadDto,
  LEAD_INTERESTS,
  LeadInterest,
  LeadPreferences,
  LeadRow,
  ListLeadsQueryDto,
  MarketingBroadcastDto,
} from './types/lead.dto';
import {
  createUnsubscribeToken,
  verifyUnsubscribeToken,
} from './unsubscribe-token';

/** Copy for the waitlist confirmation, per interest. Facts only — see docs/sales/features.md. */
const INTEREST_COPY: Record<
  LeadInterest,
  { title: string; body: (siteUrl: string) => string }
> = {
  building: {
    title: 'Drone Building early access',
    body: () =>
      "Drone Building opens for early access in **January 2027** — you'll build, set up and fly your own FPV drone. We'll email you when enrollment opens.",
  },
  part107: {
    title: 'the FAA Part 107 course',
    body: () =>
      "We'll let you know about course updates, new practice material and launch offers.",
  },
  schools: {
    title: 'Drone Edge for schools',
    body: (siteUrl) =>
      `We'll send you updates on school programs, pacing and pricing. Want to talk sooner? [Book a call](${siteUrl}/consultation).`,
  },
  newsletter: {
    title: 'the Drone Edge newsletter',
    body: () =>
      'Expect occasional articles and course news — never a daily blast.',
  },
};

const ATTRIBUTION_FIELDS = [
  'source_path',
  'landing_path',
  'utm_source',
  'utm_medium',
  'utm_campaign',
  'utm_term',
  'utm_content',
  'gclid',
  'fbclid',
  'ref',
] as const;

export interface BroadcastResult {
  recipients: number;
  sent: number;
  failed: number;
  /** false when SES config / postal address is missing — nothing would be delivered. */
  ready: boolean;
  status: 'counted' | 'sent' | 'queued';
}

/**
 * Waitlist / email capture (launch plan W3) plus the unsubscribe (Z3),
 * bounce/complaint mirror (Z2) and marketing broadcast (Z4) that operate on
 * the `leads` table. Sending goes through MarketingMailerService (SES), never
 * the Workspace relay.
 */
@Injectable()
export class LeadsService {
  private readonly logger = new Logger(LeadsService.name);
  private readonly unsubscribeSecret: string;
  private broadcastRunning = false;

  constructor(
    private readonly dataSource: DataSource,
    private readonly mailer: MarketingMailerService,
    private readonly productEvents: ProductEventsService,
    config: ConfigService,
  ) {
    const secret = config.get<string>('LEADS_UNSUBSCRIBE_SECRET') ?? '';
    if (!secret && process.env.NODE_ENV === 'production') {
      this.logger.error(
        'LEADS_UNSUBSCRIBE_SECRET is not set — unsubscribe links cannot be issued; marketing sends are blocked.',
      );
    }
    // Local dev only: a fixed secret so the flow works without Terraform.
    this.unsubscribeSecret =
      secret ||
      (process.env.NODE_ENV === 'production' ? '' : 'local-dev-unsubscribe');
  }

  // ── Capture ─────────────────────────────────────────────────────────────

  /**
   * Always resolves the same way for valid input (the controller answers 202)
   * so the endpoint cannot be used to test whether an address is on a list.
   * Sends the confirmation only for a new or re-consenting signup, never for
   * a repeat submit — otherwise the form could be used to mail-bomb someone.
   */
  async capture(dto: CreateLeadDto): Promise<void> {
    if (dto.website) {
      this.logger.warn(`Waitlist honeypot tripped (interest=${dto.interest})`);
      return;
    }
    const email = dto.email.trim().toLowerCase();
    const attribution = ATTRIBUTION_FIELDS.map((f) => dto[f]?.trim() || null);

    // ON CONFLICT … WHERE: an active duplicate updates nothing and returns no
    // row; an unsubscribed one is re-consented (attribution keeps first touch).
    const rows: { id: number; inserted: boolean; bounced_at: Date | null }[] =
      await this.dataSource.query(
        `INSERT INTO leads (email, interest, ${ATTRIBUTION_FIELDS.join(', ')})
         VALUES ($1, $2, ${ATTRIBUTION_FIELDS.map((_, i) => `$${i + 3}`).join(', ')})
         ON CONFLICT (email, interest) DO UPDATE
           SET unsubscribed_at = NULL, consent_at = now(), updated_at = now()
           WHERE leads.unsubscribed_at IS NOT NULL
         RETURNING id, (xmax = 0) AS inserted, bounced_at`,
        [email, dto.interest, ...attribution],
      );
    const row = rows[0];
    if (!row) return; // already on this list

    void this.productEvents.record({
      userId: null,
      event: 'lead_captured',
      properties: {
        interest: dto.interest,
        resubscribed: !row.inserted,
        source_path: dto.source_path ?? null,
        utm_source: dto.utm_source ?? null,
        utm_medium: dto.utm_medium ?? null,
        utm_campaign: dto.utm_campaign ?? null,
      },
    });

    if (row.bounced_at) return; // SES would suppress it anyway
    await this.sendConfirmation(row.id, email, dto.interest);
  }

  private async sendConfirmation(
    leadId: number,
    email: string,
    interest: LeadInterest,
  ): Promise<void> {
    if (!this.unsubscribeSecret) return;
    const tpl = loadTemplate('waitlist-confirmation');
    const copy = INTEREST_COPY[interest];
    const vars = {
      interest_title: copy.title,
      interest_body: copy.body(this.mailer.siteUrl),
      site_url: this.mailer.siteUrl,
    };
    const result = await this.mailer.send({
      to: email,
      subject: fillPlaceholders(tpl.subject, vars),
      preheader: fillPlaceholders(tpl.preheader, vars),
      bodyMarkdown: fillPlaceholders(tpl.body, vars),
      ...this.unsubscribeUrls(leadId),
      tags: { kind: 'waitlist_confirmation', interest },
    });
    if (result.sent) {
      await this.dataSource.query(
        `UPDATE leads SET confirmation_sent_at = now(), updated_at = now() WHERE id = $1`,
        [leadId],
      );
    } else {
      this.logger.warn(
        `Waitlist confirmation not sent to ${maskEmail(email)} (${result.reason})`,
      );
    }
  }

  private unsubscribeUrls(leadId: number): {
    unsubscribePageUrl: string;
    oneClickUrl: string;
  } {
    const t = encodeURIComponent(
      createUnsubscribeToken(leadId, this.unsubscribeSecret),
    );
    return {
      unsubscribePageUrl: `${this.mailer.siteUrl}/unsubscribe?t=${t}`,
      oneClickUrl: `${this.mailer.siteUrl}/api/leads/unsubscribe?t=${t}`,
    };
  }

  // ── Unsubscribe / preferences ───────────────────────────────────────────

  private async emailForToken(token: string | undefined): Promise<string> {
    if (!this.unsubscribeSecret) {
      throw new ServiceUnavailableException('Unsubscribe is not configured.');
    }
    const leadId = verifyUnsubscribeToken(token, this.unsubscribeSecret);
    if (leadId == null) throw new BadRequestException('Invalid link.');
    const rows: { email: string }[] = await this.dataSource.query(
      `SELECT email FROM leads WHERE id = $1`,
      [leadId],
    );
    if (!rows[0]) throw new NotFoundException('Link no longer valid.');
    return rows[0].email;
  }

  private async preferencesFor(email: string): Promise<LeadPreferences> {
    const rows: { interest: LeadInterest; unsubscribed_at: Date | null }[] =
      await this.dataSource.query(
        `SELECT interest, unsubscribed_at FROM leads WHERE email = $1 ORDER BY id`,
        [email],
      );
    return {
      email_masked: maskEmail(email),
      interests: rows.map((r) => ({
        interest: r.interest,
        subscribed: r.unsubscribed_at == null,
      })),
    };
  }

  async preferences(token: string | undefined): Promise<LeadPreferences> {
    return this.preferencesFor(await this.emailForToken(token));
  }

  /** `interests` omitted = every list for that address (also the one-click path). */
  async unsubscribe(
    token: string | undefined,
    interests?: LeadInterest[],
  ): Promise<LeadPreferences> {
    const email = await this.emailForToken(token);
    await this.dataSource.query(
      `UPDATE leads SET unsubscribed_at = now(), updated_at = now()
       WHERE email = $1 AND unsubscribed_at IS NULL
         AND ($2::text[] IS NULL OR interest = ANY($2::text[]))`,
      [email, interests?.length ? interests : null],
    );
    this.logger.log(
      `Unsubscribed ${maskEmail(email)} from ${interests?.join(',') || 'all'}`,
    );
    return this.preferencesFor(email);
  }

  // ── SES feedback (Z2) ───────────────────────────────────────────────────

  async markBounced(emails: string[]): Promise<number> {
    return this.markAll(emails, 'bounced_at');
  }

  /** A spam complaint is treated as an unsubscribe from everything. */
  async markComplained(emails: string[]): Promise<number> {
    return this.markAll(emails, 'unsubscribed_at');
  }

  private async markAll(
    emails: string[],
    column: 'bounced_at' | 'unsubscribed_at',
  ): Promise<number> {
    const normalized = [
      ...new Set(emails.map((e) => e.trim().toLowerCase()).filter(Boolean)),
    ];
    if (!normalized.length) return 0;
    const res = await this.dataSource.query(
      `UPDATE leads SET ${column} = now(), updated_at = now()
       WHERE email = ANY($1::text[]) AND ${column} IS NULL`,
      [normalized],
    );
    // pg driver via TypeORM returns [rows, affectedCount] for UPDATE.
    return Array.isArray(res) && typeof res[1] === 'number' ? res[1] : 0;
  }

  // ── Admin ───────────────────────────────────────────────────────────────

  async list(query: ListLeadsQueryDto): Promise<LeadRow[]> {
    const includeUnsub = query.include_unsubscribed === 'true';
    return this.dataSource.query(
      `SELECT id, email, interest, source_path, landing_path, utm_source, utm_medium,
              utm_campaign, utm_term, utm_content, gclid, fbclid, ref, consent_at,
              confirmation_sent_at, unsubscribed_at, bounced_at, created_at
       FROM leads
       WHERE ($1::text IS NULL OR interest = $1)
         AND ($2::boolean OR (unsubscribed_at IS NULL AND bounced_at IS NULL))
       ORDER BY created_at DESC
       LIMIT 10000`,
      [query.interest ?? null, includeUnsub],
    );
  }

  async exportCsv(query: ListLeadsQueryDto): Promise<string> {
    const rows = await this.list(query);
    const columns: (keyof LeadRow)[] = [
      'id',
      'email',
      'interest',
      'created_at',
      'consent_at',
      'confirmation_sent_at',
      'unsubscribed_at',
      'bounced_at',
      'source_path',
      'landing_path',
      'utm_source',
      'utm_medium',
      'utm_campaign',
      'utm_term',
      'utm_content',
      'gclid',
      'fbclid',
      'ref',
    ];
    const lines = [columns.join(',')];
    for (const row of rows) {
      lines.push(columns.map((c) => csvCell(row[c])).join(','));
    }
    return lines.join('\n') + '\n';
  }

  // ── Broadcast (Z4) ──────────────────────────────────────────────────────

  private async recipients(
    interests: LeadInterest[],
  ): Promise<{ id: number; email: string }[]> {
    // One message per address even when it is on several targeted lists.
    return this.dataSource.query(
      `SELECT DISTINCT ON (email) id, email FROM leads
       WHERE interest = ANY($1::text[]) AND unsubscribed_at IS NULL AND bounced_at IS NULL
       ORDER BY email, id`,
      [interests],
    );
  }

  async broadcast(
    dto: MarketingBroadcastDto,
    adminUserId: number,
  ): Promise<BroadcastResult> {
    const interests = dto.interests.filter((i) =>
      (LEAD_INTERESTS as readonly string[]).includes(i),
    );
    if (!interests.length) {
      throw new BadRequestException('Pick at least one list.');
    }
    const list = await this.recipients(interests);
    const ready = this.mailer.isReady() && !!this.unsubscribeSecret;
    const base = { recipients: list.length, ready };

    if (dto.mode === 'dry_run') {
      return { ...base, sent: 0, failed: 0, status: 'counted' };
    }

    if (dto.mode === 'test') {
      const rows: { email: string }[] = await this.dataSource.query(
        `SELECT email FROM users WHERE id = $1`,
        [adminUserId],
      );
      if (!rows[0]?.email)
        throw new NotFoundException('Admin email not found.');
      // Lead id 0 never exists, so the test copy's unsubscribe link is inert.
      const result = await this.mailer.send({
        to: rows[0].email,
        subject: `[TEST] ${dto.subject}`,
        bodyMarkdown: this.broadcastBody(dto),
        ...this.unsubscribeUrls(0),
        tags: { kind: 'broadcast_test' },
      });
      return {
        ...base,
        sent: result.sent ? 1 : 0,
        failed: result.sent ? 0 : 1,
        status: 'sent',
      };
    }

    if (!ready) {
      throw new ServiceUnavailableException(
        'Marketing email is not configured (SES settings, postal address or unsubscribe secret missing).',
      );
    }
    if (this.broadcastRunning) {
      throw new ConflictException('A broadcast is already sending.');
    }
    // Sends in the background: a large list outlives CloudFront's 30 s origin
    // timeout. Progress and the final count go to the logs.
    this.broadcastRunning = true;
    void this.sendAll(dto, list).finally(() => {
      this.broadcastRunning = false;
    });
    return { ...base, sent: 0, failed: 0, status: 'queued' };
  }

  /** Admin-authored, so only {{site_url}} is substituted; anything else is left as typed. */
  private broadcastBody(dto: MarketingBroadcastDto): string {
    return dto.body_markdown.replace(
      /\{\{\s*site_url\s*\}\}/g,
      this.mailer.siteUrl,
    );
  }

  private async sendAll(
    dto: MarketingBroadcastDto,
    list: { id: number; email: string }[],
  ): Promise<void> {
    const body = this.broadcastBody(dto);
    const gapMs = Math.ceil(1000 / this.mailer.maxSendRate);
    let sent = 0;
    let failed = 0;
    this.logger.log(
      `Broadcast "${dto.subject}" starting: ${list.length} recipients (${dto.interests.join(',')})`,
    );
    for (const r of list) {
      const started = Date.now();
      const result = await this.mailer.send({
        to: r.email,
        subject: dto.subject,
        bodyMarkdown: body,
        ...this.unsubscribeUrls(r.id),
        tags: { kind: 'broadcast' },
      });
      if (result.sent) sent++;
      else failed++;
      const wait = gapMs - (Date.now() - started);
      if (wait > 0) await new Promise((res) => setTimeout(res, wait));
    }
    this.logger.log(
      `Broadcast "${dto.subject}" finished: sent=${sent} failed=${failed}`,
    );
  }
}

/** RFC 4180 cell; neutralises spreadsheet formula injection (=, +, -, @). */
function csvCell(value: unknown): string {
  if (value == null) return '';
  let s = value instanceof Date ? value.toISOString() : String(value);
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}
