import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../users/role.decorator';
import { RolesGuard } from '../users/role.guard';
import { Role } from '../users/types/role.enum';
import { NewsletterService } from './newsletter.service';
import { IssueFileDto } from './types/newsletter.dto';

/** Admin → Newsletter (newsletter plan § 8 "Publishing and updates"). */
@ApiTags('Newsletter')
@ApiBearerAuth()
@Controller('newsletter/issues')
@Roles(Role.Admin)
@UseGuards(JwtAuthGuard, RolesGuard)
export class NewsletterAdminController {
  constructor(private readonly newsletter: NewsletterService) {}

  @ApiOperation({ summary: 'List issues (Admin)' })
  @Get()
  list() {
    return this.newsletter.list();
  }

  @ApiOperation({ summary: 'Render an issue file without saving it (Admin)' })
  @Post('preview')
  @HttpCode(200)
  previewFile(@Body() dto: IssueFileDto) {
    return this.newsletter.previewFile(dto.source);
  }

  @ApiOperation({
    summary:
      'Upload an issue file: creates or replaces the draft; after send, a correction to the web copy (Admin)',
  })
  @Post('import')
  @HttpCode(200)
  import(@Body() dto: IssueFileDto) {
    return this.newsletter.import(dto.source);
  }

  @ApiOperation({
    summary: 'One issue + rendered email and web preview (Admin)',
  })
  @Get(':slug')
  async get(@Param('slug') slug: string) {
    const [issue, preview] = await Promise.all([
      this.newsletter.get(slug),
      this.newsletter.previewIssue(slug),
    ]);
    return { issue, preview };
  }

  @ApiOperation({ summary: 'Recipient count right now (Admin)' })
  @Get(':slug/count')
  count(@Param('slug') slug: string) {
    return this.newsletter.count(slug);
  }

  @ApiOperation({
    summary:
      'Per-issue metrics: delivery, clicks by section, who clicked (Admin)',
  })
  @Get(':slug/metrics')
  metrics(@Param('slug') slug: string) {
    return this.newsletter.metrics(slug);
  }

  @ApiOperation({ summary: 'Send a [TEST] copy to me (Admin)' })
  @Post(':slug/test')
  @HttpCode(200)
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  test(@Param('slug') slug: string, @Request() req) {
    return this.newsletter.sendTest(slug, req.user.userId);
  }

  @ApiOperation({ summary: 'Approve a draft for sending (Admin)' })
  @Post(':slug/approve')
  @HttpCode(200)
  approve(@Param('slug') slug: string, @Request() req) {
    return this.newsletter.approve(slug, req.user.userId);
  }

  @ApiOperation({ summary: 'Move an approved issue back to draft (Admin)' })
  @Post(':slug/unapprove')
  @HttpCode(200)
  unapprove(@Param('slug') slug: string) {
    return this.newsletter.unapprove(slug);
  }

  @ApiOperation({
    summary: 'Send (or resume) an approved issue to its lists (Admin)',
  })
  @Post(':slug/send')
  @HttpCode(202)
  send(@Param('slug') slug: string) {
    return this.newsletter.send(slug);
  }
}

/** Public web archive: /newsletter and /newsletter/<slug>. */
@ApiTags('Newsletter')
@Controller('newsletter/public')
export class NewsletterPublicController {
  constructor(private readonly newsletter: NewsletterService) {}

  @ApiOperation({ summary: 'Archived issues (public)' })
  @Get()
  list() {
    return this.newsletter.publicList();
  }

  @ApiOperation({ summary: 'One sent issue, web version (public)' })
  @Get(':slug')
  get(@Param('slug') slug: string) {
    return this.newsletter.publicIssue(slug);
  }
}
