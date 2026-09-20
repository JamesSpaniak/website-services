import {
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../users/role.guard';
import { Roles } from '../users/role.decorator';
import { Role } from '../users/types/role.enum';
import { ReportingService } from './reporting.service';
import { AnalyticsMaintenanceService } from '../product-events/analytics-maintenance.service';

const clampInt = (raw: string | undefined, fallback: number, max: number) => {
  const n = raw ? parseInt(raw, 10) : NaN;
  return Number.isFinite(n) && n > 0 ? Math.min(n, max) : fallback;
};

/** Company reporting — admin only (plan § 5.2). */
@ApiTags('Reporting')
@ApiBearerAuth()
@Controller('reporting')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.Admin)
export class ReportingController {
  constructor(
    private readonly reporting: ReportingService,
    private readonly maintenance: AnalyticsMaintenanceService,
  ) {}

  @ApiOperation({
    summary: 'Headline numbers + breakdown by entitlement source',
  })
  @Get('overview')
  overview() {
    return this.reporting.overview();
  }

  @ApiOperation({ summary: 'Weekly activation by source' })
  @Get('activation')
  activation(@Query('days') days?: string) {
    return this.reporting.activation(clampInt(days, 90, 730));
  }

  @ApiOperation({ summary: 'Utilization distribution and per-course usage' })
  @Get('utilization')
  utilization() {
    return this.reporting.utilization();
  }

  @ApiOperation({ summary: 'Revenue by month / SKU / payment method' })
  @Get('revenue')
  revenue(@Query('months') months?: string) {
    return this.reporting.revenue(clampInt(months, 12, 60));
  }

  @ApiOperation({ summary: 'Pro subscription health' })
  @Get('pro')
  pro(@Query('months') months?: string) {
    return this.reporting.pro(clampInt(months, 12, 60));
  }

  @ApiOperation({ summary: 'Seat utilization for every organization' })
  @Get('organizations')
  organizations() {
    return this.reporting.organizations();
  }

  @ApiOperation({
    summary: 'One organization: utilization, series, courses, orders',
  })
  @Get('organizations/:id')
  organization(@Param('id', ParseIntPipe) id: number) {
    return this.reporting.organization(id);
  }

  @ApiOperation({ summary: 'Per-unit funnel for a course' })
  @Get('courses/:id/funnel')
  courseFunnel(@Param('id', ParseIntPipe) id: number) {
    return this.reporting.courseFunnel(id);
  }

  @ApiOperation({
    summary: 'Who took a course exam and what they scored (attempt history)',
  })
  @Get('courses/:id/exams/:examId/attempts')
  courseExamAttempts(
    @Param('id', ParseIntPipe) id: number,
    @Param('examId', ParseIntPipe) examId: number,
  ) {
    return this.reporting.courseExamAttempts(id, examId);
  }

  @ApiOperation({ summary: 'Monthly cohorts by source' })
  @Get('cohorts')
  cohorts() {
    return this.reporting.cohorts();
  }

  @ApiOperation({
    summary: 'User 360: entitlements, usage, revenue, orders, events',
  })
  @Get('users/:id')
  user(@Param('id', ParseIntPipe) id: number) {
    return this.reporting.user360(id);
  }

  @ApiOperation({ summary: 'Signal queues that feed offers and outreach' })
  @Get('signals')
  signals() {
    return this.reporting.signals();
  }

  @ApiOperation({
    summary: 'Pipeline health: refresh times, volumes, reconciliation',
  })
  @Get('health')
  health() {
    return this.reporting.health();
  }

  @ApiOperation({
    summary: 'Run the nightly maintenance now (rollup, views, reconcile)',
  })
  @Post('refresh')
  refresh() {
    return this.maintenance.runAll();
  }

  @ApiOperation({
    summary:
      'CSV export: utilization | organizations | cohorts | revenue | usage | orders | funnel?courseId=',
  })
  @Get('export/:report.csv')
  async exportCsv(
    @Param('report') report: string,
    @Res() res: Response,
    @Query('courseId') courseId?: string,
  ): Promise<void> {
    const csv = await this.reporting.exportCsv(
      report,
      courseId ? parseInt(courseId, 10) : undefined,
    );
    const stamp = new Date().toISOString().slice(0, 10);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${report}-${stamp}.csv"`,
    );
    res.send(csv);
  }
}
