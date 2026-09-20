import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsISO8601,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';

/**
 * Event taxonomy — app-level allow-list (not a PG enum) so new events need no
 * migration. Grouped as in docs/tech/product-analytics.md § 5.
 */
export const MARKETING_EVENTS = [
  'page_view',
  'article_view',
  'course_view',
  'pricing_viewed',
] as const;

export const LEARNING_EVENTS = [
  'lesson_viewed',
  'lesson_heartbeat',
  'video_started',
  'video_progress',
  'video_completed',
  'video_position',
  'course_started',
  'lesson_completed',
  'unit_completed',
  'course_completed',
] as const;

export const ASSESSMENT_EVENTS = [
  'exam_start',
  'exam_started',
  'exam_submit',
  'exam_submitted',
  'exam_category_scored',
] as const;

export const COMMERCE_EVENTS = [
  'checkout_started',
  'purchase_completed',
  'pro_checkout_started',
  'pro_started',
  'pro_renewed',
  'pro_payment_failed',
  'pro_cancel_scheduled',
  'pro_cancelled',
  'pro_expired',
  'billing_portal_opened',
  'refund_issued',
  'order_recorded',
] as const;

export const OFFER_EVENTS = [
  'upsell_shown',
  'upsell_accepted',
  'upsell_declined',
  'downsell_shown',
  'downsell_accepted',
  'downsell_declined',
  'kit_lead',
  'parts_list_downloaded',
  'outbound_vendor_click',
  'referral_clicked',
] as const;

export const LIFECYCLE_EVENTS = [
  'signup_started',
  'signup_completed',
  'login',
  'email_verified',
  /** Sent once after login/signup with properties.anonymous_id; stitches pre-login rows to the user. */
  'identified',
] as const;

export const B2B_EVENTS = [
  'invite_sent',
  'invite_redeemed',
  'manager_dashboard_viewed',
  'org_progress_exported',
  'class_created',
] as const;

export const FEATURE_EVENTS = ['feature_used'] as const;

export const ALL_EVENTS = [
  ...MARKETING_EVENTS,
  ...LEARNING_EVENTS,
  ...ASSESSMENT_EVENTS,
  ...COMMERCE_EVENTS,
  ...OFFER_EVENTS,
  ...LIFECYCLE_EVENTS,
  ...B2B_EVENTS,
  ...FEATURE_EVENTS,
] as const;

export type ProductEventName = (typeof ALL_EVENTS)[number];

const MARKETING_SET = new Set<string>(MARKETING_EVENTS);
const LEARNING_SET = new Set<string>([
  ...LEARNING_EVENTS,
  ...ASSESSMENT_EVENTS,
]);

/**
 * Events stored for a visitor who is not logged in but sent a first-party
 * anonymous id. Intent signals only — `page_view` stays OTel-only so crawler
 * traffic never lands in product_events (analytics-and-attribution.md § consent:
 * legitimate interest, non-identifying pre-login).
 */
const ANONYMOUS_STORED_SET = new Set<string>([
  'article_view',
  'course_view',
  'pricing_viewed',
  'signup_started',
  'checkout_started',
  ...OFFER_EVENTS,
]);

export const isMarketingEvent = (name: string): boolean =>
  MARKETING_SET.has(name);
/** Learning + assessment events require a course the user can access. */
export const isCourseScopedEvent = (name: string): boolean =>
  LEARNING_SET.has(name);
export const isVideoEvent = (name: string): boolean =>
  name.startsWith('video_');
export const isAnonymousStoredEvent = (name: string): boolean =>
  ANONYMOUS_STORED_SET.has(name);

export class AnalyticsEventDto {
  /** Optional at the type level only so a batch envelope validates; events without a name are dropped. */
  @IsOptional()
  @IsString()
  @IsIn(ALL_EVENTS as unknown as string[])
  event?: ProductEventName;

  // ── marketing (page_view etc.) ──
  @IsOptional() @IsString() @MaxLength(512) path?: string;
  @IsOptional() @IsString() @MaxLength(1024) referrer?: string;
  @IsOptional() @IsString() @MaxLength(64) contentId?: string;
  @IsOptional() @IsString() @MaxLength(255) title?: string;

  // ── learning ──
  @IsOptional() @IsInt() @Min(1) courseId?: number;
  @IsOptional() @IsString() @MaxLength(64) unitRef?: string;
  /** Video playhead in seconds. */
  @IsOptional() @IsNumber() @Min(0) position?: number;
  @IsOptional() @IsNumber() @Min(0) duration?: number;
  @IsOptional() @IsBoolean() playing?: boolean;
  /** Newly watched [start, end] second ranges since the last event. */
  @IsOptional() @IsArray() @ArrayMaxSize(50) ranges?: number[][];

  // ── commerce / offers ──
  @IsOptional() @IsString() @MaxLength(64) offerId?: string;
  @IsOptional() @IsString() @MaxLength(32) placement?: string;
  @IsOptional() @IsString() @MaxLength(64) feature?: string;

  // ── envelope ──
  @IsOptional() @IsString() @MaxLength(64) sessionId?: string;
  @IsOptional() @IsUUID() eventId?: string;
  @IsOptional() @IsISO8601() occurredAt?: string;
  @IsOptional() @IsObject() properties?: Record<string, unknown>;
}

/**
 * Body of POST /analytics/event. Either a batch (`events: [...]`) or a single
 * event using the AnalyticsEventDto fields directly (legacy helpers).
 */
export class AnalyticsPayloadDto extends AnalyticsEventDto {
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(50)
  @ValidateNested({ each: true })
  @Type(() => AnalyticsEventDto)
  events?: AnalyticsEventDto[];

  /**
   * First-party anonymous id (random UUID in localStorage). Carried in the body
   * because sendBeacon cannot set headers; the `x-anonymous-id` header is
   * still honoured for fetch-based clients.
   */
  @IsOptional() @IsString() @MaxLength(64) anonymousId?: string;
}

/** Server-side record() input — other services call this, not the DTO. */
export interface ServerEventInput {
  userId: number | null;
  event: ProductEventName;
  courseId?: number | null;
  unitRef?: string | null;
  organizationId?: number | null;
  classId?: number | null;
  entitlementSource?: string | null;
  properties?: Record<string, unknown>;
  occurredAt?: Date;
}

export interface VideoResume {
  position_seconds: number;
  percent_watched: number;
  completed: boolean;
}
