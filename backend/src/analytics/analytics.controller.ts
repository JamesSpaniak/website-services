import {
  Body,
  Controller,
  Headers,
  HttpCode,
  HttpStatus,
  Logger,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { AnalyticsService } from './analytics.service';
import { OptionalJwtAuthGuard } from '../auth/optional-jwt-auth.guard';
import { ProductEventsService } from '../product-events/product-events.service';
import {
  AnalyticsEventDto,
  AnalyticsPayloadDto,
  isMarketingEvent,
} from '../product-events/types/product-event.dto';

/**
 * POST /analytics/event — one ingest endpoint for both consumers:
 *   • marketing events (page/article/course views) → OpenTelemetry counters
 *   • every event, when a user is known → product_events (behavioral stream)
 *
 * Accepts a single event body (legacy) or `{ events: [...] }` (≤ 50). Auth is
 * optional: anonymous marketing views still count; anonymous learning events
 * are dropped by ProductEventsService.
 */
@ApiTags('Analytics')
@Controller('analytics')
export class AnalyticsController {
  private readonly logger = new Logger(AnalyticsController.name);

  constructor(
    private readonly analyticsService: AnalyticsService,
    private readonly productEvents: ProductEventsService,
  ) {}

  @ApiOperation({
    summary: 'Record frontend analytics events (single or batch)',
  })
  @Post('event')
  @UseGuards(OptionalJwtAuthGuard)
  // Heartbeat batches every 30 s plus page views: allow more than the global default.
  @Throttle({ default: { limit: 120, ttl: 60000 } })
  @HttpCode(HttpStatus.NO_CONTENT)
  async recordEvent(
    @Request() req,
    @Body() dto: AnalyticsPayloadDto,
    @Headers('x-anonymous-id') anonymousId?: string,
  ): Promise<void> {
    const userId: number | null = req.user?.userId ?? null;
    const events: AnalyticsEventDto[] = dto.events?.length
      ? dto.events
      : dto.event
        ? [dto]
        : [];
    if (events.length === 0) return;

    for (const ev of events) {
      if (!ev.event || !isMarketingEvent(ev.event)) continue;
      switch (ev.event) {
        case 'article_view':
          if (ev.contentId)
            this.analyticsService.recordArticleView(ev.contentId);
          break;
        case 'course_view':
          if (ev.contentId)
            this.analyticsService.recordCourseView(ev.contentId);
          break;
        default:
          this.analyticsService.recordPageView(ev.path || '/', ev.referrer);
      }
    }

    try {
      await this.productEvents.recordBatch(
        userId,
        events,
        (anonymousId ?? dto.anonymousId)?.slice(0, 64) ?? null,
      );
    } catch (err) {
      // Never surface ingest failures to the browser; count them so Grafana can.
      this.productEvents.countFailure('batch');
      this.logger.error(
        `product_events ingest failed: ${(err as Error).message}`,
      );
    }
  }
}
