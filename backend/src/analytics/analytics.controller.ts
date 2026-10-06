import {
  Body,
  Controller,
  Headers,
  HttpCode,
  HttpStatus,
  Logger,
  Post,
  Request,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { AnalyticsService } from './analytics.service';
import { OptionalJwtAuthGuard } from '../auth/optional-jwt-auth.guard';
import { REFRESH_TOKEN_COOKIE } from '../auth/auth.controller';
import { ProductEventsService } from '../product-events/product-events.service';
import {
  AnalyticsEventDto,
  AnalyticsPayloadDto,
  isMarketingEvent,
  validateAnalyticsEvents,
} from '../product-events/types/product-event.dto';

/**
 * POST /analytics/event — one ingest endpoint for both consumers:
 *   • marketing events (page/article/course views) → OpenTelemetry counters
 *   • every event, when a user is known → product_events (behavioral stream)
 *
 * Accepts a single event body (legacy) or `{ events: [...] }` (≤ 50). Auth is
 * optional: anonymous marketing views still count; anonymous learning events
 * are dropped by ProductEventsService.
 *
 * Expired session ≠ guest: the access cookie expires with its JWT (1 h), so a
 * signed-in learner's batches would otherwise arrive tokenless and their
 * heartbeats be dropped as anonymous (R1, docs/tech/progress-tracking-accuracy.md).
 * When the refresh cookie is still present, answer 401 so the client refreshes
 * and resends the same batch — event ids make the resend idempotent. If the
 * refresh itself fails (revoked session), the client resends with
 * `x-analytics-guest: 1` and the batch is handled as a guest's.
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
    @Headers('x-analytics-guest') asGuest?: string,
  ): Promise<void> {
    const userId: number | null = req.user?.userId ?? null;
    if (userId == null && req.cookies?.[REFRESH_TOKEN_COOKIE] && !asGuest) {
      throw new UnauthorizedException('Session expired — refresh and resend');
    }
    let events: AnalyticsEventDto[] = dto.event ? [dto] : [];
    if (dto.events?.length) {
      const { valid, invalid } = validateAnalyticsEvents(dto.events);
      this.productEvents.countDropped('invalid', invalid);
      events = valid;
    }
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
