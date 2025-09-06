import { Body, Controller, Post, Request, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { PurchaseCourseDto, UpgradeToProDto } from './types/purchase.dto';
import { PurchaseService } from './purchase.service';

@Controller('purchases')
@UseGuards(JwtAuthGuard)
export class PurchaseController {
  constructor(private readonly purchasesService: PurchaseService) {}

  @Post('course')
  async purchaseCourse(@Request() req, @Body() purchaseDto: PurchaseCourseDto) {
    // In a real app, here you would integrate with a payment gateway like Stripe.
    // For this example, we'll assume payment is successful and grant access.
    const updatedUser = await this.purchasesService.purchaseCourse(req.user.userId, purchaseDto.courseId);
    const { password, ...result } = updatedUser;
    return result;
  }

  @Post('pro-membership')
  async upgradeToPro(@Request() req, @Body() upgradeDto: UpgradeToProDto) {
    const updatedUser = await this.purchasesService.upgradeToPro(req.user.userId, upgradeDto.duration);
    const { password, ...result } = updatedUser;
    return result;
  }
}