import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { EmailModule } from '../email/email.module';
import { LeadsController, MarketingEmailController } from './leads.controller';
import { LeadsService } from './leads.service';
import { SesEventsService } from './ses-events.service';

/**
 * Waitlist / email capture + marketing email (launch plan W3, Z2–Z4).
 * Owns the `leads` table; sends through EmailModule's MarketingMailerService.
 */
@Module({
  imports: [ConfigModule, EmailModule],
  controllers: [LeadsController, MarketingEmailController],
  providers: [LeadsService, SesEventsService],
})
export class LeadsModule {}
