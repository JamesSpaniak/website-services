import { Controller, Get } from '@nestjs/common';
import { StripeConfigService } from '../purchases/stripe-config.service';

@Controller('health')
export class HealthController {
  constructor(private readonly stripeConfig: StripeConfigService) {}

  /**
   * ALB health check. Also reports which Stripe mode the API runs in, so the
   * live cutover can be confirmed with `curl https://thedroneedge.com/api/health`.
   */
  @Get()
  health() {
    return { status: 'ok', stripe_mode: this.stripeConfig.status().mode };
  }
}
