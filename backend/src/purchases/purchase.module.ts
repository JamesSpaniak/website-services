import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { Course } from 'src/courses/types/course.entity';
import { User } from 'src/users/types/user.entity';
import { PurchaseController } from './purchase.controller';
import { PurchaseService } from './purchase.service';
import { StripeEventReplayService } from './stripe-event-replay.service';
import { StripeConfigService } from './stripe-config.service';
import { PricingService } from './pricing.service';
import { PricingController } from './pricing.controller';
import { Stripe } from 'stripe';
import { AuditModule } from 'src/audit/audit.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, Course]),
    ConfigModule,
    AuditModule,
  ],
  controllers: [PurchaseController, PricingController],
  providers: [
    PurchaseService,
    StripeEventReplayService,
    StripeConfigService,
    PricingService,
    {
      provide: 'STRIPE_CLIENT', // Custom provider token
      useFactory: (configService: ConfigService) => {
        return new Stripe(configService.get('STRIPE_SECRET_KEY'), {
          apiVersion: '2025-08-27.basil',
        });
      },
      inject: [ConfigService],
    },
  ],
  // Account deletion (UsersService) removes the Stripe customer.
  exports: ['STRIPE_CLIENT', StripeConfigService],
})
export class PurchaseModule {}
