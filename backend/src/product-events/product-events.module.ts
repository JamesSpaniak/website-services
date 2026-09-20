import { Global, Module } from '@nestjs/common';
import { ProductEventsService } from './product-events.service';
import { AnalyticsMaintenanceService } from './analytics-maintenance.service';

/**
 * Behavioral event stream + nightly analytics maintenance. Global so any
 * service can `record()` server-side events without import wiring.
 */
@Global()
@Module({
  providers: [ProductEventsService, AnalyticsMaintenanceService],
  exports: [ProductEventsService, AnalyticsMaintenanceService],
})
export class ProductEventsModule {}
