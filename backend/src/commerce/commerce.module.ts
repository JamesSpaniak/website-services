import { Global, Module } from '@nestjs/common';
import { EntitlementService } from './entitlement.service';
import { OrderService } from './order.service';
import { OrdersController } from './orders.controller';
import { AuditModule } from '../audit/audit.module';

/**
 * products → orders / order_items → entitlements. Global so the purchase,
 * user-admin and signup-link write paths can dual-write without wiring.
 */
@Global()
@Module({
  imports: [AuditModule],
  controllers: [OrdersController],
  providers: [EntitlementService, OrderService],
  exports: [EntitlementService, OrderService],
})
export class CommerceModule {}
