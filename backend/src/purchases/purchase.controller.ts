import { Body, Controller, Post, Request, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { PurchaseCourseDto, UpgradeToProDto } from './types/purchase.dto';
import { PurchaseService } from './purchase.service';

@Controller('purchases')
@UseGuards(JwtAuthGuard)
export class PurchaseController {
  constructor(private readonly purchasesService: PurchaseService) {}

  /**
   * Grants a user access to a specific course.
   * In a real application, this would be called after a successful payment transaction.
   * @param req The Express request object, containing user details from the JWT.
   * @param purchaseDto DTO containing the courseId to purchase.
   * @returns The updated user object without the password.
   */
  @Post('course')
  async purchaseCourse(@Request() req, @Body() purchaseDto: PurchaseCourseDto) {
    const updatedUser = await this.purchasesService.purchaseCourse(req.user.userId, purchaseDto.courseId);
    const { password, ...result } = updatedUser;
    return result;
  }

  /**
   * Upgrades a user's role to 'Pro' and sets their membership expiry date.
   * In a real application, this would be called after a successful subscription payment.
   * @param req The Express request object, containing user details from the JWT.
   * @param upgradeDto DTO containing the membership duration (e.g., 'monthly', 'yearly').
   * @returns The updated user object without the password.
   */
  @Post('pro-membership')
  async upgradeToPro(@Request() req, @Body() upgradeDto: UpgradeToProDto) {
    const updatedUser = await this.purchasesService.upgradeToPro(req.user.userId, upgradeDto.duration);
    const { password, ...result } = updatedUser;
    return result;
  }
}