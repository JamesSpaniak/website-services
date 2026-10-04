import { Transform } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayUnique,
  IsArray,
  IsEmail,
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export const LEAD_INTERESTS = [
  'building',
  'part107',
  'schools',
  'newsletter',
] as const;
export type LeadInterest = (typeof LEAD_INTERESTS)[number];

const trim = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

/**
 * Public waitlist signup. Attribution fields come from the first-touch
 * `de_attr` cookie (drone middleware, W5); the frontend truncates to 200.
 * Unknown keys (e.g. the cookie's `ts`) are stripped by the global whitelist.
 */
export class CreateLeadDto {
  @Transform(trim)
  @IsEmail()
  @MaxLength(254)
  email: string;

  @IsIn(LEAD_INTERESTS)
  interest: LeadInterest;

  /** Honeypot — real users never see this field; bots fill it. */
  @IsOptional()
  @IsString()
  @MaxLength(200)
  website?: string;

  @IsOptional() @IsString() @MaxLength(200) source_path?: string;
  @IsOptional() @IsString() @MaxLength(200) landing_path?: string;
  @IsOptional() @IsString() @MaxLength(200) utm_source?: string;
  @IsOptional() @IsString() @MaxLength(200) utm_medium?: string;
  @IsOptional() @IsString() @MaxLength(200) utm_campaign?: string;
  @IsOptional() @IsString() @MaxLength(200) utm_term?: string;
  @IsOptional() @IsString() @MaxLength(200) utm_content?: string;
  @IsOptional() @IsString() @MaxLength(200) gclid?: string;
  @IsOptional() @IsString() @MaxLength(200) fbclid?: string;
  @IsOptional() @IsString() @MaxLength(200) ref?: string;
}

/**
 * Unsubscribe. The token may arrive in the query string (RFC 8058 one-click
 * POST from the mail client, body `List-Unsubscribe=One-Click`) or in the JSON
 * body (preference page). `interests` = which to drop; omitted = all.
 */
export class UnsubscribeDto {
  @IsOptional()
  @IsString()
  @MaxLength(128)
  t?: string;

  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @ArrayMaxSize(LEAD_INTERESTS.length)
  @IsIn(LEAD_INTERESTS, { each: true })
  interests?: LeadInterest[];
}

export class ListLeadsQueryDto {
  @IsOptional()
  @IsIn(LEAD_INTERESTS)
  interest?: LeadInterest;

  @IsOptional()
  @IsIn(['true', 'false'])
  include_unsubscribed?: string;
}

export class MarketingBroadcastDto {
  @Transform(trim)
  @IsString()
  @MinLength(3)
  @MaxLength(150)
  subject: string;

  /** Markdown (raw HTML is not rendered). Layout, unsubscribe link and postal address are added by the template. */
  @IsString()
  @MinLength(20)
  @MaxLength(50_000)
  body_markdown: string;

  @IsArray()
  @ArrayUnique()
  @ArrayMaxSize(LEAD_INTERESTS.length)
  @IsIn(LEAD_INTERESTS, { each: true })
  interests: LeadInterest[];

  @IsIn(['dry_run', 'test', 'send'])
  mode: 'dry_run' | 'test' | 'send';
}

export interface LeadRow {
  id: number;
  email: string;
  interest: LeadInterest;
  source_path: string | null;
  landing_path: string | null;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  utm_term: string | null;
  utm_content: string | null;
  gclid: string | null;
  fbclid: string | null;
  ref: string | null;
  consent_at: Date;
  confirmation_sent_at: Date | null;
  unsubscribed_at: Date | null;
  bounced_at: Date | null;
  created_at: Date;
}

export interface LeadPreferences {
  email_masked: string;
  interests: { interest: LeadInterest; subscribed: boolean }[];
}
