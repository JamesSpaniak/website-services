import { Injectable } from '@nestjs/common';
import { ContactDto } from './types/contact.dto';

@Injectable()
export class EmailService {
  async sendContactMessage(contactDto: ContactDto): Promise<{ success: boolean; message: string }> {
    // In a real application, you would integrate an email sending service here.
    // For example, using Nodemailer with an SMTP provider like SendGrid or AWS SES.
    console.log('--- New Contact Message ---');
    console.log(`From: ${contactDto.name} <${contactDto.contact}>`);
    console.log(`Message: ${contactDto.message}`);
    console.log('---------------------------');
    return { success: true, message: 'Your message has been sent successfully!' };
  }
}