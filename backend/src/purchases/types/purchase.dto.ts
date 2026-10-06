import {
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
} from 'class-validator';

export class PurchaseCourseDto {
  @IsNumber()
  @IsNotEmpty()
  courseId: number;
}

/** Stripe promotion code from a `?promo=` landing link; unknown codes fall back to manual entry. */
const PROMO_CODE_PATTERN = /^[A-Za-z0-9_-]{1,64}$/;

export class CreateCourseCheckoutDto extends PurchaseCourseDto {
  @IsOptional()
  @Matches(PROMO_CODE_PATTERN)
  promoCode?: string;
}

export class ConfirmPurchaseDto {
  @IsString()
  @IsNotEmpty()
  paymentIntentId: string;
}

export class ConfirmCheckoutDto {
  @IsString()
  @IsNotEmpty()
  sessionId: string;
}

export enum ProMembershipDuration {
  Monthly = 'monthly',
  Yearly = 'yearly',
}

export class UpgradeToProDto {
  @IsEnum(ProMembershipDuration)
  @IsNotEmpty()
  duration: ProMembershipDuration;
}

/** Optional return URLs for Checkout / Billing Portal (must be same-origin relative or absolute site URL). */
export class StripeReturnUrlsDto {
  @IsOptional()
  @IsString()
  successPath?: string;

  @IsOptional()
  @IsString()
  cancelPath?: string;
}

export class CreateProCheckoutDto extends StripeReturnUrlsDto {
  @IsOptional()
  @IsEnum(ProMembershipDuration)
  duration?: ProMembershipDuration;

  @IsOptional()
  @Matches(PROMO_CODE_PATTERN)
  promoCode?: string;
}

/**
 * Admin repair for a course entitlement with no order row: either a specific
 * PaymentIntent, or a user × course pair to look up in Stripe by metadata.
 * Omit everything to repair every entitlement the reconciliation flagged.
 */
export class BackfillOrderDto {
  @IsOptional()
  @IsString()
  paymentIntentId?: string;

  @IsOptional()
  @IsNumber()
  userId?: number;

  @IsOptional()
  @IsNumber()
  courseId?: number;
}
