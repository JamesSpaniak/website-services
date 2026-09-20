import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsIn,
  IsInt,
  IsISO8601,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';

/** Text enums — app-level, never PG enums (plan § 3). */
export type EntitlementSource =
  | 'purchase'
  | 'bundle'
  | 'pro'
  | 'admin_grant'
  | 'signup_link'
  | 'trial';

export type ProductType =
  | 'course'
  | 'bundle'
  | 'pro_monthly'
  | 'pro_yearly'
  | 'seats'
  | 'hardware'
  | 'kit';

export type PaymentMethod = 'card' | 'po' | 'comp' | 'check' | 'wire';

export const PAYMENT_METHODS: PaymentMethod[] = [
  'card',
  'po',
  'comp',
  'check',
  'wire',
];

export class ManualOrderItemDto {
  @IsString() @MaxLength(64) sku: string;
  @IsOptional() @IsInt() @Min(1) quantity?: number;
  /** Override the catalog price (cents). Required for seats / PO pricing. */
  @IsOptional() @IsInt() @Min(0) unitPriceCents?: number;
  @IsOptional() @IsInt() @Min(0) unitCostCents?: number;
  @IsOptional() @IsInt() @Min(0) discountCents?: number;
}

/**
 * POST /orders/manual — PO / comp / check orders that never touch Stripe.
 * Exactly one of userId / organizationId is expected (seats → organization,
 * courses / Pro → user).
 */
export class CreateManualOrderDto {
  @IsOptional() @IsInt() @Min(1) userId?: number;
  @IsOptional() @IsInt() @Min(1) organizationId?: number;

  @IsIn(PAYMENT_METHODS) paymentMethod: PaymentMethod;

  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(20)
  @ValidateNested({ each: true })
  @Type(() => ManualOrderItemDto)
  items: ManualOrderItemDto[];

  @IsOptional() @IsInt() @Min(0) shippingCents?: number;
  @IsOptional() @IsInt() @Min(0) taxCents?: number;
  @IsOptional() @IsISO8601() placedAt?: string;
  @IsOptional() @IsString() @MaxLength(2000) notes?: string;
}

export class ListOrdersQueryDto {
  @IsOptional() @IsInt() @Min(1) userId?: number;
  @IsOptional() @IsInt() @Min(1) organizationId?: number;
  @IsOptional() @IsInt() @Min(1) limit?: number;
  @IsOptional() @IsInt() @Min(0) offset?: number;
}

export interface OrderItemRow {
  id: number;
  sku: string;
  product_type: ProductType;
  course_id: number | null;
  quantity: number;
  unit_price_cents: number;
  unit_cost_cents: number;
  discount_cents: number;
  refunded_amount_cents: number;
  fulfillment_source: string;
}

export interface OrderRow {
  id: number;
  user_id: number | null;
  username: string | null;
  organization_id: number | null;
  organization_name: string | null;
  payment_method: PaymentMethod;
  payment_status: string;
  total_cents: number;
  refunded_cents: number;
  currency: string;
  placed_at: Date;
  notes: string | null;
  stripe_payment_intent_id: string | null;
  stripe_invoice_id: string | null;
  items: OrderItemRow[];
}

export interface EntitlementRow {
  id: number;
  course_id: number | null;
  course_title: string | null;
  source: EntitlementSource;
  product_sku: string | null;
  allocated_price_cents: number;
  starts_at: Date;
  ends_at: Date | null;
  revoked_at: Date | null;
  active: boolean;
}

export interface ProductRow {
  sku: string;
  name: string;
  product_type: ProductType;
  grants: { course_ids?: number[]; all_courses?: boolean; seats?: boolean };
  stripe_price_id: string | null;
  list_price_cents: number;
  related_course_id: number | null;
  requires_shipping: boolean;
  active: boolean;
}

export interface StripeOrderInput {
  userId: number | null;
  organizationId?: number | null;
  stripeEventId: string;
  paymentIntentId?: string | null;
  invoiceId?: string | null;
  checkoutSessionId?: string | null;
  customerId?: string | null;
  totalCents: number;
  currency?: string;
  placedAt?: Date;
  items: {
    sku: string;
    productType: ProductType;
    courseId?: number | null;
    quantity?: number;
    unitPriceCents: number;
  }[];
}
