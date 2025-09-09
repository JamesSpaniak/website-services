import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import { Transporter } from 'nodemailer';
import * as sanitizeHtml from 'sanitize-html';
import { User } from 'src/users/types/user.entity';
import { ContactDto } from './types/contact.dto';
import { BroadcastDto } from './types/broadcast.dto';

@Injectable()
export class EmailService {
  private transporter: Transporter;
  private readonly logger = new Logger(EmailService.name);

  constructor(
    private readonly configService: ConfigService,
  ) {
    this.transporter = nodemailer.createTransport({ // TODO dns lookup fails
      host: this.configService.get<string>('EMAIL_HOST'),
      port: this.configService.get<number>('EMAIL_PORT'),
      secure: this.configService.get<number>('EMAIL_PORT') === 465, // true for 465, false for other ports
      auth: {
        user: this.configService.get<string>('EMAIL_USER'),
        pass: this.configService.get<string>('EMAIL_PASS'),
      },
    });
  }

  async sendContactMessage(contactDto: ContactDto): Promise<{ success: boolean; message: string }> {
    // Sanitize all user input to prevent XSS attacks.
    // We configure it to allow no HTML tags or attributes.
    const sanitizeOptions = {
      allowedTags: [],
      allowedAttributes: {},
    };
    const sanitizedName = sanitizeHtml(contactDto.name, sanitizeOptions);
    const sanitizedContact = sanitizeHtml(contactDto.contact, sanitizeOptions);
    const sanitizedMessage = sanitizeHtml(contactDto.message, sanitizeOptions);

    const adminEmail = this.configService.get<string>('ADMIN_EMAIL');
    const mailOptions = {
      from: this.configService.get<string>('EMAIL_FROM'),
      to: adminEmail,
      subject: `New Contact Message from ${sanitizedName}`,
      html: `
        <p><strong>Name:</strong> ${sanitizedName}</p>
        <p><strong>Contact:</strong> ${sanitizedContact}</p>
        <hr>
        <p><strong>Message:</strong></p>
        <p>${sanitizedMessage.replace(/\n/g, '<br>')}</p>
      `,
    };

    await this.transporter.sendMail(mailOptions);
    return { success: true, message: 'Your message has been sent successfully!' };
  }

  async sendPasswordResetEmail(user: User, resetLink: string): Promise<void> {
    const mailOptions = {
      from: this.configService.get<string>('EMAIL_FROM'),
      to: user.email,
      subject: 'Your Password Reset Request',
      html: `
        <p>Hello ${user.username},</p>
        <p>You requested a password reset. Please click the link below to reset your password. This link is valid for 15 minutes.</p>
        <p><a href="${resetLink}">Reset Password</a></p>
        <p>If you did not request this, please ignore this email.</p>
      `,
    };

    await this.transporter.sendMail(mailOptions);
  }

  async sendBroadcastEmail(broadcastDto: BroadcastDto): Promise<{ success: boolean; count: number }> {
    // This service no longer has UsersService, you would inject it if needed for broadcast
    const users: User[] = []; // Placeholder: const users = await this.usersService.getUsers();
    const emails = users.map(user => user.email).filter(email => !!email);

    // In a real app, use a bulk-sending service or a queue to avoid long-running requests.
    for (const email of emails) {
        console.log(email);
      await this.transporter.sendMail({
        from: this.configService.get<string>('EMAIL_FROM'),
        to: email,
        subject: broadcastDto.subject,
        html: broadcastDto.message,
      });
    }

    return { success: true, count: emails.length };
  }
}