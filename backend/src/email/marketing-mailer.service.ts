import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SESv2Client, SendEmailCommand } from '@aws-sdk/client-sesv2';
import { renderEmail } from './templates/render';

export interface MarketingMessage {
  to: string;
  subject: string;
  bodyMarkdown: string;
  preheader?: string;
  /** Preference page (in the footer): `${FRONTEND_URL}/unsubscribe?t=…`. */
  unsubscribePageUrl: string;
  /** RFC 8058 one-click target (List-Unsubscribe header): `${FRONTEND_URL}/api/leads/unsubscribe?t=…`. */
  oneClickUrl: string;
  /** SES message tags — show up on every event SES publishes for this send. */
  tags?: Record<string, string>;
}

export interface MarketingSendResult {
  sent: boolean;
  messageId?: string;
  reason?: 'disabled' | 'not_configured' | 'error';
  error?: string;
}

/**
 * Marketing mail via Amazon SES on news.thedroneedge.com (launch plan Z4).
 * Deliberately separate from EmailService's Workspace relay so newsletter
 * complaints never touch the reputation of the domain that delivers password
 * resets. Every message carries List-Unsubscribe + one-click headers (Gmail /
 * Yahoo bulk-sender rules) and the postal address (CAN-SPAM) — the mailer
 * refuses to send while MARKETING_POSTAL_ADDRESS is empty.
 *
 * Config (Terraform → ECS env): SES_FROM_ADDRESS, SES_REPLY_TO,
 * SES_CONFIGURATION_SET, MARKETING_POSTAL_ADDRESS, AWS_REGION. Credentials
 * come from the task role (ses:SendEmail scoped to the identity + config set).
 */
@Injectable()
export class MarketingMailerService {
  private readonly logger = new Logger(MarketingMailerService.name);
  private readonly client: SESv2Client;
  private readonly enabled: boolean;
  private readonly from: string;
  private readonly replyTo: string;
  private readonly configurationSet: string;
  private readonly postalAddress: string;
  readonly siteUrl: string;
  /** Sends per second; SES production default is 14/s, sandbox 1/s. */
  readonly maxSendRate: number;

  constructor(private readonly config: ConfigService) {
    this.enabled = this.config.get<string>('EMAIL_ENABLED') !== 'false';
    this.from = this.config.get<string>('SES_FROM_ADDRESS') ?? '';
    this.replyTo = this.config.get<string>('SES_REPLY_TO') ?? '';
    this.configurationSet =
      this.config.get<string>('SES_CONFIGURATION_SET') ?? '';
    this.postalAddress = (
      this.config.get<string>('MARKETING_POSTAL_ADDRESS') ?? ''
    ).trim();
    this.siteUrl = (
      this.config.get<string>('FRONTEND_URL') ?? 'https://thedroneedge.com'
    ).replace(/\/+$/, '');
    this.maxSendRate = Math.max(
      1,
      Number(this.config.get<string>('SES_MAX_SEND_RATE') ?? '10') || 10,
    );
    this.client = new SESv2Client({
      region: this.config.get<string>('AWS_REGION') || 'us-east-1',
    });
    const missing = this.missingConfig();
    if (missing.length) {
      this.logger.warn(
        `Marketing email not configured (missing ${missing.join(', ')}); waitlist confirmations and broadcasts will be skipped.`,
      );
    }
  }

  private missingConfig(): string[] {
    const missing: string[] = [];
    if (!this.from) missing.push('SES_FROM_ADDRESS');
    if (!this.configurationSet) missing.push('SES_CONFIGURATION_SET');
    if (!this.postalAddress) missing.push('MARKETING_POSTAL_ADDRESS');
    return missing;
  }

  /** True when a send would actually go out (used for dry runs / admin UI). */
  isReady(): boolean {
    return this.enabled && this.missingConfig().length === 0;
  }

  async send(msg: MarketingMessage): Promise<MarketingSendResult> {
    if (!this.enabled) return { sent: false, reason: 'disabled' };
    if (this.missingConfig().length) {
      return { sent: false, reason: 'not_configured' };
    }

    const { html, text } = renderEmail({
      bodyMarkdown: msg.bodyMarkdown,
      preheader: msg.preheader,
      unsubscribeUrl: msg.unsubscribePageUrl,
      postalAddress: this.postalAddress,
      siteUrl: this.siteUrl,
    });

    try {
      const out = await this.client.send(
        new SendEmailCommand({
          FromEmailAddress: this.from,
          Destination: { ToAddresses: [msg.to] },
          ReplyToAddresses: this.replyTo ? [this.replyTo] : undefined,
          ConfigurationSetName: this.configurationSet,
          EmailTags: Object.entries(msg.tags ?? {}).map(([Name, Value]) => ({
            Name,
            // SES tag values: [A-Za-z0-9_-] only.
            Value: Value.replace(/[^A-Za-z0-9_-]/g, '_').slice(0, 256),
          })),
          Content: {
            Simple: {
              Subject: { Data: msg.subject, Charset: 'UTF-8' },
              Body: {
                Html: { Data: html, Charset: 'UTF-8' },
                Text: { Data: text, Charset: 'UTF-8' },
              },
              Headers: [
                { Name: 'List-Unsubscribe', Value: `<${msg.oneClickUrl}>` },
                {
                  Name: 'List-Unsubscribe-Post',
                  Value: 'List-Unsubscribe=One-Click',
                },
              ],
            },
          },
        }),
      );
      return { sent: true, messageId: out.MessageId ?? '' };
    } catch (err) {
      const message = (err as Error).message;
      this.logger.error(`SES send failed: ${message}`);
      return { sent: false, reason: 'error', error: message };
    }
  }
}
