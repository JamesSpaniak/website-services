import { Body, Controller, Post, UsePipes, ValidationPipe } from '@nestjs/common';
import { EmailService } from './email.service';
import { ContactDto } from './types/contact.dto';

@Controller('email')
export class EmailController {
  constructor(private readonly emailService: EmailService) {}

  @Post('contact')
  @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
  async handleContactForm(@Body() contactDto: ContactDto) {
    return this.emailService.sendContactMessage(contactDto);
  }
}