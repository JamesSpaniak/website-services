import { Body, ClassSerializerInterceptor, Controller, Headers, Post, Request, UseGuards, UseInterceptors } from '@nestjs/common';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { PurchaseCourseDto, UpgradeToProDto } from './types/purchase.dto';
import { PurchaseService } from './purchase.service';
import { ApiBearerAuth, ApiExcludeEndpoint, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
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
   * Grants a user access to a specific course.
   * In a real application, this would be called after a successful payment transaction.
   * @param req The Express request object, containing user details from the JWT.
   * @param purchaseDto DTO containing the courseId to purchase.
   * @returns The updated user object without the password.
   */
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Purchase a course for the current user' })
  @ApiResponse({ status: 201, description: 'Course purchased successfully.', type: UserFull })
  @ApiResponse({ status: 400, description: 'Bad request (e.g., course already owned).' })
  @Post('course')
  async purchaseCourse(@Request() req, @Body() purchaseDto: PurchaseCourseDto) {
    const updatedUser = await this.purchasesService.purchaseCourse(req.user.userId, purchaseDto.courseId);
    return plainToInstance(UserFull, updatedUser);
  }

  /**
   * Creates a Stripe Payment Intent for purchasing a course.
   * This is the first step in the payment flow.
   * @param req The Express request object.
   * @param purchaseDto DTO containing the courseId.
   * @returns An object containing the clientSecret for the Payment Intent.
   */
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a Stripe Payment Intent for a course purchase' })
  @ApiResponse({ status: 201, description: 'Payment Intent created successfully.' })
  @Post('create-payment-intent')
  async createPaymentIntent(@Request() req, @Body() purchaseDto: PurchaseCourseDto) {
    return this.purchasesService.createPaymentIntent(req.user.userId, purchaseDto.courseId);
  }

  /**
   * Handles incoming webhook events from Stripe.
   * This endpoint is public but secured by Stripe's signature verification.
   * @param signature The 'stripe-signature' header.
   * @param req The raw Express request object containing the raw body buffer.
   */
  @ApiExcludeEndpoint() // Exclude from Swagger UI as it's not for public consumption
  @Post('webhook')
  async handleStripeWebhook(@Headers('stripe-signature') signature: string, @Request() req) {
    // The raw body is needed for signature verification
    return this.purchasesService.handleWebhookEvent(req.body, signature);
  }

  /**
   * Upgrades a user's role to 'Pro' and sets their membership expiry date.
   * In a real application, this would be called after a successful subscription payment.
   * @param req The Express request object, containing user details from the JWT.
   * @param upgradeDto DTO containing the membership duration (e.g., 'monthly', 'yearly').
   * @returns The updated user object without the password.
   */
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Upgrade the current user to a Pro membership' })
  @ApiResponse({ status: 201, description: 'User upgraded to Pro successfully.', type: UserFull })
  @ApiResponse({ status: 400, description: 'Bad request (e.g., user is already an admin).' })
  @Post('pro-membership')
  async upgradeToPro(@Request() req, @Body() upgradeDto: UpgradeToProDto) {
    const updatedUser = await this.purchasesService.upgradeToPro(req.user.userId, upgradeDto.duration);
    return plainToInstance(UserFull, updatedUser);
  }
}