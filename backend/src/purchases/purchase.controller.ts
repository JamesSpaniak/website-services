import {
  Body,
  ClassSerializerInterceptor,
  Controller,
  Headers,
  Post,
  Request,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import {
  BackfillOrderDto,
  ConfirmPurchaseDto,
  CreateProCheckoutDto,
  ProMembershipDuration,
  PurchaseCourseDto,
  StripeReturnUrlsDto,
  UpgradeToProDto,
} from './types/purchase.dto';
import { PurchaseService } from './purchase.service';
import {
  ApiBearerAuth,
  ApiExcludeEndpoint,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { UserFull } from 'src/users/types/user.dto';
import { plainToInstance } from 'class-transformer';
import { RolesGuard } from 'src/users/role.guard';
import { Roles } from 'src/users/role.decorator';
import { Role } from 'src/users/types/role.enum';

@ApiTags('Purchases')
@Controller('purchases')
@UseInterceptors(ClassSerializerInterceptor)
export class PurchaseController {
  constructor(private readonly purchasesService: PurchaseService) {}

  /**
   * Grants the current user access to a course without going through Stripe.
   * Admin-only: used for support / manual comping. Normal purchases use create-payment-intent + webhook.
   */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.Admin)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Grant the current user a course (Admin only)' })
  @ApiResponse({
    status: 201,
    description: 'Course granted successfully.',
    type: UserFull,
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request (e.g., course already owned).',
  })
  @ApiResponse({ status: 403, description: 'Forbidden — not an admin.' })
  @Post('course')
  async purchaseCourse(@Request() req, @Body() purchaseDto: PurchaseCourseDto) {
    const updatedUser = await this.purchasesService.purchaseCourse(
      req.user.userId,
      purchaseDto.courseId,
    );
    return plainToInstance(UserFull, updatedUser);
  }

  /**
   * Creates a Stripe Payment Intent for purchasing a course (one-time, lifetime).
   */
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Create a Stripe Payment Intent for a one-time course purchase',
  })
  @ApiResponse({
    status: 201,
    description: 'Payment Intent created successfully.',
  })
  @Post('create-payment-intent')
  async createPaymentIntent(
    @Request() req,
    @Body() purchaseDto: PurchaseCourseDto,
  ) {
    return this.purchasesService.createPaymentIntent(
      req.user.userId,
      purchaseDto.courseId,
    );
  }

  /**
   * Stripe Checkout (subscription mode) for monthly/yearly Pro — all courses while active.
   */
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Create Stripe Checkout session for Pro membership (subscription)',
  })
  @Post('create-pro-checkout')
  async createProCheckout(@Request() req, @Body() dto: CreateProCheckoutDto) {
    return this.purchasesService.createProCheckoutSession(
      req.user.userId,
      dto.duration ?? ProMembershipDuration.Monthly,
      dto.successPath,
      dto.cancelPath,
    );
  }

  /**
   * Stripe Customer Portal — manage/cancel Pro subscription.
   */
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create Stripe Billing Portal session' })
  @Post('billing-portal')
  async billingPortal(@Request() req, @Body() dto: StripeReturnUrlsDto) {
    return this.purchasesService.createBillingPortalSession(
      req.user.userId,
      dto.successPath ?? '/profile',
    );
  }

  /**
   * Reconcile access when Stripe succeeded but the client did not observe the webhook in time.
   */
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Confirm course access from a succeeded Payment Intent',
  })
  @Post('confirm-payment')
  async confirmPayment(@Request() req, @Body() dto: ConfirmPurchaseDto) {
    return this.purchasesService.confirmPaymentFromIntent(
      req.user.userId,
      dto.paymentIntentId,
    );
  }

  /**
   * Handles incoming webhook events from Stripe.
   * Public but secured by Stripe signature verification.
   */
  @ApiExcludeEndpoint()
  @Post('webhook')
  async handleStripeWebhook(
    @Headers('stripe-signature') signature: string,
    @Request() req,
  ) {
    return this.purchasesService.handleWebhookEvent(req.body, signature);
  }

  /**
   * Upgrades the current user to Pro without Stripe (admin comp / testing).
   */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.Admin)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Upgrade the current user to Pro (Admin only, no payment)',
  })
  @ApiResponse({
    status: 201,
    description: 'User upgraded to Pro successfully.',
    type: UserFull,
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request (e.g., user is already an admin).',
  })
  @ApiResponse({ status: 403, description: 'Forbidden — not an admin.' })
  @Post('pro-membership')
  async upgradeToPro(@Request() req, @Body() upgradeDto: UpgradeToProDto) {
    const updatedUser = await this.purchasesService.upgradeToPro(
      req.user.userId,
      upgradeDto.duration,
    );
    return plainToInstance(UserFull, updatedUser);
  }

  /**
   * Repairs course entitlements that have no order row by looking the payment
   * up in Stripe (reconciliation checks `paid_grant_without_order` and
   * `legacy_purchase_without_order`). Empty body = repair everything flagged.
   */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.Admin)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Backfill orders for entitlements missing one, from Stripe (Admin only)',
  })
  @Post('admin/backfill-order')
  backfillOrder(@Body() dto: BackfillOrderDto) {
    return this.purchasesService.backfillOrders(dto ?? {});
  }
}
