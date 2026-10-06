import { Module } from '@nestjs/common';
import { EmailModule } from '../email/email.module';
import { LeadsModule } from '../leads/leads.module';
import {
  NewsletterAdminController,
  NewsletterPublicController,
} from './newsletter.controller';
import { NewsletterService } from './newsletter.service';

/**
 * Field Notes issues: upload, preview, approve, send with a per-address log,
 * public archive. Recipients and unsubscribe links come from LeadsService.
 */
@Module({
  imports: [EmailModule, LeadsModule],
  controllers: [NewsletterAdminController, NewsletterPublicController],
  providers: [NewsletterService],
})
export class NewsletterModule {}
