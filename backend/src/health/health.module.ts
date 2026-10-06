import { Module } from '@nestjs/common';
import { HealthController } from './health.controller';
import { PurchaseModule } from '../purchases/purchase.module';

@Module({
  imports: [PurchaseModule],
  controllers: [HealthController],
})
export class HealthModule {}
