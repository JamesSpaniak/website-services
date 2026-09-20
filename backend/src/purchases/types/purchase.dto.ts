import {
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
} from 'class-validator';

export class PurchaseCourseDto {
  @IsNumber()
  @IsNotEmpty()
  courseId: number;
}

export class ConfirmPurchaseDto {
  @IsString()
  @IsNotEmpty()
  paymentIntentId: string;
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
