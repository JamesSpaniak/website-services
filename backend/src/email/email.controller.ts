import { Body, Controller, Post, UseGuards, UsePipes, ValidationPipe } from '@nestjs/common';
import { EmailService } from './email.service';
import { Roles } from '../users/role.decorator';
import { Role } from '../users/types/role.enum';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../users/role.guard';
import { ContactDto } from './types/contact.dto';
import { ConsultationDto } from './types/consultation.dto';
import { BroadcastDto } from './types/broadcast.dto';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';

@ApiTags('Email')
@Controller('email')
@UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
export class EmailController {
  constructor(private readonly emailService: EmailService) {}

  @ApiOperation({ summary: 'Handle public contact form submission' })
  @ApiResponse({ status: 201, description: 'Contact message sent successfully.' })
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

  @ApiOperation({ summary: 'Send a broadcast email to all users (Admin only)' })
  @ApiBearerAuth()
  @ApiResponse({ status: 201, description: 'Broadcast email sent successfully.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Forbidden. Requires admin role.' })
  @Post('broadcast')
  @Roles(Role.Admin)
  @UseGuards(JwtAuthGuard, RolesGuard)
  async handleBroadcast(@Body() broadcastDto: BroadcastDto) {
    return this.emailService.sendBroadcastEmail(broadcastDto);
  }
}