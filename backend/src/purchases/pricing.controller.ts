import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { RolesGuard } from 'src/users/role.guard';
import { Roles } from 'src/users/role.decorator';
import { Role } from 'src/users/types/role.enum';
import { AuditService } from 'src/audit/audit.service';
import { AuditAction } from 'src/audit/types/audit-action.enum';
import { PricingService } from './pricing.service';
import {
  AdminPricingOverview,
  PricingQueryDto,
  PublicPricing,
  SetLookupKeyDto,
} from './types/pricing.dto';

/** Prices and promotions read from Stripe (docs/tech/pricing-and-promotions.md). */
@ApiTags('Pricing')
@Controller('pricing')
export class PricingController {
  constructor(
    private readonly pricing: PricingService,
    private readonly audit: AuditService,
  ) {}

  @ApiOperation({
    summary: 'Public prices with the active sale or the buyer promo code applied',
  })
  @Get()
  publicPricing(@Query() query: PricingQueryDto): Promise<PublicPricing> {
    return this.pricing.publicPricing(query.promo);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.Admin)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Price sync status, site sale and promotion codes (Admin)' })
  @Get('admin/overview')
  overview(): Promise<AdminPricingOverview> {
    return this.pricing.adminOverview();
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.Admin)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Re-read prices and promotions from Stripe now (Admin)' })
  @Post('admin/sync')
  async sync(): Promise<AdminPricingOverview> {
    await this.pricing.syncAll();
    return this.pricing.adminOverview();
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.Admin)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Link a product to a Stripe Price by lookup key, or unlink with null (Admin)',
  })
  @Patch('admin/products/:sku')
  async setLookupKey(
    @Request() req,
    @Param('sku') sku: string,
    @Body() dto: SetLookupKeyDto,
  ): Promise<AdminPricingOverview> {
    const key = dto.stripe_lookup_key?.trim() || null;
    await this.pricing.setLookupKey(sku, key);
    this.audit.log(req.user.userId, AuditAction.PRICING_PRODUCT_LINKED, {
      sku,
      stripeLookupKey: key,
    });
    return this.pricing.adminOverview();
  }
}
