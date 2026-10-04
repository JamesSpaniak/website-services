import { ForbiddenException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  isSnsUrl,
  parseSnsMessage,
  verifySnsSignature,
} from '../email/sns-message';
import { LeadsService } from './leads.service';

interface SesEvent {
  /** Configuration-set event publishing uses eventType; identity notifications use notificationType. */
  eventType?: string;
  notificationType?: string;
  bounce?: {
    bounceType?: string;
    bouncedRecipients?: { emailAddress?: string }[];
  };
  complaint?: { complainedRecipients?: { emailAddress?: string }[] };
}

/**
 * SES → SNS → `POST /email/ses-events` (launch plan Z2). SES already
 * suppresses bounced/complaining addresses account-wide; this mirrors that
 * into `leads` so admin counts and broadcast recipient lists are true.
 *
 * Trust: the SNS signature is verified against a cert fetched only from
 * sns.<region>.amazonaws.com, and the TopicArn must equal SES_EVENTS_TOPIC_ARN.
 * The message type is read from the body (CloudFront does not forward the
 * x-amz-sns-message-type header).
 */
@Injectable()
export class SesEventsService {
  private readonly logger = new Logger(SesEventsService.name);
  private readonly topicArn: string;
  private readonly certCache = new Map<string, string>();

  constructor(
    private readonly leads: LeadsService,
    config: ConfigService,
  ) {
    this.topicArn = config.get<string>('SES_EVENTS_TOPIC_ARN') ?? '';
  }

  async handle(body: unknown): Promise<{ ok: true }> {
    const msg = parseSnsMessage(body);
    if (!msg) throw new ForbiddenException('Not an SNS message.');
    if (!this.topicArn || msg.TopicArn !== this.topicArn) {
      this.logger.warn(`SNS message for unexpected topic ${msg.TopicArn}`);
      throw new ForbiddenException('Unknown topic.');
    }
    if (!isSnsUrl(msg.SigningCertURL, true)) {
      throw new ForbiddenException('Bad signing cert URL.');
    }
    const cert = await this.fetchCert(msg.SigningCertURL);
    if (!verifySnsSignature(msg, cert)) {
      this.logger.warn(
        `SNS signature check failed (MessageId=${msg.MessageId})`,
      );
      throw new ForbiddenException('Bad signature.');
    }

    if (msg.Type === 'SubscriptionConfirmation') {
      if (!isSnsUrl(msg.SubscribeURL)) {
        throw new ForbiddenException('Bad SubscribeURL.');
      }
      const res = await fetch(msg.SubscribeURL!);
      this.logger.log(
        `SNS subscription confirmation for ${msg.TopicArn}: HTTP ${res.status}`,
      );
      return { ok: true };
    }
    if (msg.Type !== 'Notification') return { ok: true };

    let event: SesEvent;
    try {
      event = JSON.parse(msg.Message);
    } catch {
      this.logger.warn(
        `SES event with non-JSON Message (MessageId=${msg.MessageId})`,
      );
      return { ok: true };
    }
    await this.apply(event);
    return { ok: true };
  }

  async apply(event: SesEvent): Promise<void> {
    const type = event.eventType ?? event.notificationType;
    if (type === 'Bounce') {
      // Transient bounces (mailbox full, throttling) are retried by SES and
      // not suppressed; only permanent ones stop future mail.
      if (event.bounce?.bounceType !== 'Permanent') return;
      const emails = (event.bounce.bouncedRecipients ?? [])
        .map((r) => r.emailAddress ?? '')
        .filter(Boolean);
      const n = await this.leads.markBounced(emails);
      this.logger.log(
        `SES permanent bounce: ${emails.length} recipient(s), ${n} lead row(s) marked`,
      );
    } else if (type === 'Complaint') {
      const emails = (event.complaint?.complainedRecipients ?? [])
        .map((r) => r.emailAddress ?? '')
        .filter(Boolean);
      const n = await this.leads.markComplained(emails);
      this.logger.warn(
        `SES complaint: ${emails.length} recipient(s), ${n} lead row(s) unsubscribed`,
      );
    }
    // Delivery / Open / Click / Reject: no lead state to change.
  }

  private async fetchCert(url: string): Promise<string> {
    const cached = this.certCache.get(url);
    if (cached) return cached;
    const res = await fetch(url);
    if (!res.ok) throw new ForbiddenException('Could not fetch signing cert.');
    const pem = await res.text();
    this.certCache.set(url, pem);
    return pem;
  }
}
