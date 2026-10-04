import {
  Body,
  Controller,
  Post,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { EmailService } from './email.service';
import { ContactDto } from './types/contact.dto';
import { ConsultationDto } from './types/consultation.dto';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';

@ApiTags('Email')
@Controller('email')
@UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
export class EmailController {
  constructor(private readonly emailService: EmailService) {}

  @ApiOperation({ summary: 'Handle public contact form submission' })
  @ApiResponse({
    status: 201,
    description: 'Contact message sent successfully.',
  })
  @Post('contact')
  async handleContactForm(@Body() contactDto: ContactDto) {
    return this.emailService.sendContactMessage(contactDto);
  }

  @ApiOperation({ summary: 'Handle public free consultation request' })
  @ApiResponse({ status: 201, description: 'Consultation request received.' })
  @Post('consultation')
  async handleConsultationRequest(@Body() consultationDto: ConsultationDto) {
    return this.emailService.sendConsultationRequest(consultationDto);
  }

  // Marketing broadcast moved to POST /email/marketing/broadcast (SES, leads
  // lists) — LeadsModule. Bulk mail must never go through the Workspace relay.
}
