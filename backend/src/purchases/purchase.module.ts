import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { Course } from 'src/courses/types/course.entity';
import { User } from 'src/users/types/user.entity';
import { PurchaseController } from './purchase.controller';
import { PurchaseService } from './purchase.service';
import { Stripe } from 'stripe';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, Course]),
    ConfigModule, // Import ConfigModule to use ConfigService
  ],
  controllers: [PurchaseController],
  providers: [
    PurchaseService,
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
})
export class PurchaseModule {}