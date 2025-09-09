import { Body, Controller, Post, UseGuards, UsePipes, ValidationPipe } from '@nestjs/common';
import { EmailService } from './email.service';
import { Roles } from '../users/role.decorator';
import { Role } from '../users/types/role.enum';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../users/role.guard';
import { ContactDto } from './types/contact.dto';
import { BroadcastDto } from './types/broadcast.dto';

@Controller('email')
@UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
export class EmailController {
  constructor(private readonly emailService: EmailService) {}

  @Post('contact')
  async handleContactForm(@Body() contactDto: ContactDto) {
    return this.emailService.sendContactMessage(contactDto);
  }

  @Post('broadcast')
  @Roles(Role.Admin)
  @UseGuards(JwtAuthGuard, RolesGuard)
  async handleBroadcast(@Body() broadcastDto: BroadcastDto) {
    return this.emailService.sendBroadcastEmail(broadcastDto);
  }
}