import {
  Body,
  Controller,
  Get,
  Header,
  HttpCode,
  Post,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import { SkipThrottle, Throttle } from '@nestjs/throttler';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../users/role.decorator';
import { RolesGuard } from '../users/role.guard';
import { Role } from '../users/types/role.enum';
import { LeadsService } from './leads.service';
import { SesEventsService } from './ses-events.service';
import {
  CreateLeadDto,
  ListLeadsQueryDto,
  MarketingBroadcastDto,
  UnsubscribeDto,
} from './types/lead.dto';

@ApiTags('Leads')
@Controller('leads')
export class LeadsController {
  constructor(private readonly leads: LeadsService) {}

  @ApiOperation({ summary: 'Join a waitlist / mailing list (public)' })
  @Post()
  @HttpCode(202)
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  async create(@Body() dto: CreateLeadDto) {
    await this.leads.capture(dto);
    return { ok: true };
  }

  @ApiOperation({ summary: 'Lists an unsubscribe token belongs to (public)' })
  @Get('preferences')
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  async preferences(@Query('t') t: string) {
    return this.leads.preferences(t);
  }

  /**
   * Preference page (JSON `{ t, interests? }`) and RFC 8058 one-click
   * (`?t=` + form body `List-Unsubscribe=One-Click`, which the whitelist
   * strips). Not throttled: mailbox providers send one-click POSTs from a few
   * shared IPs, and a 429 there would mean a failed unsubscribe.
   */
  @ApiOperation({ summary: 'Unsubscribe (public, token-authorized)' })
  @Post('unsubscribe')
  @HttpCode(200)
  @SkipThrottle()
  async unsubscribe(
    @Query('t') queryToken: string,
    @Body() dto: UnsubscribeDto,
  ) {
    const prefs = await this.leads.unsubscribe(
      dto?.t || queryToken,
      dto?.interests,
    );
    return { ok: true, ...prefs };
  }

  @ApiOperation({ summary: 'List leads (Admin only)' })
  @ApiBearerAuth()
  @Get()
  @Roles(Role.Admin)
  @UseGuards(JwtAuthGuard, RolesGuard)
  async list(@Query() query: ListLeadsQueryDto) {
    return this.leads.list(query);
  }

  @ApiOperation({ summary: 'Export leads as CSV (Admin only)' })
  @ApiBearerAuth()
  @Get('export.csv')
  @Roles(Role.Admin)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Header('Content-Type', 'text/csv; charset=utf-8')
  @Header('Content-Disposition', 'attachment; filename="leads.csv"')
  @Header('Cache-Control', 'no-store')
  async exportCsv(@Query() query: ListLeadsQueryDto) {
    return this.leads.exportCsv(query);
  }
}

@ApiTags('Email')
@Controller('email')
export class MarketingEmailController {
  constructor(
    private readonly leads: LeadsService,
    private readonly sesEventsService: SesEventsService,
  ) {}

  @ApiOperation({
    summary:
      'Marketing broadcast to leads via SES (Admin only): dry_run | test | send',
  })
  @ApiBearerAuth()
  @Post('marketing/broadcast')
  @Roles(Role.Admin)
  @UseGuards(JwtAuthGuard, RolesGuard)
  async broadcast(@Body() dto: MarketingBroadcastDto, @Request() req) {
    return this.leads.broadcast(dto, req.user.userId);
  }

  /** SNS → HTTPS. Body arrives as text (see main.ts); authenticity = SNS signature. */
  @ApiOperation({
    summary: 'SES bounce/complaint events via SNS (signature-verified)',
  })
  @Post('ses-events')
  @HttpCode(200)
  @SkipThrottle()
  async sesEvents(@Body() body: unknown) {
    return this.sesEventsService.handle(body);
  }
}
