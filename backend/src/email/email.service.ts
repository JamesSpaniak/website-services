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
  private transporter: Transporter | null;
  private readonly logger = new Logger(EmailService.name);
  private readonly emailEnabled: boolean;

  constructor(
    private readonly configService: ConfigService,
  ) {
    this.emailEnabled = this.configService.get<string>('EMAIL_ENABLED') !== 'false';
    if (this.emailEnabled) {
      const host = this.configService.get<string>('EMAIL_HOST');
      const port = this.configService.get<number>('EMAIL_PORT');
      const user = this.configService.get<string>('EMAIL_USER');
      const pass = this.configService.get<string>('EMAIL_PASS');

      const transportOptions: nodemailer.TransportOptions = {
        host,
        port,
        secure: port === 465, // true for 465, false for other ports
      };

      if (user && pass) {
        transportOptions.auth = { user, pass };
      } else {
        this.logger.warn('EMAIL_USER/EMAIL_PASS not set; using unauthenticated SMTP relay.');
      }

      this.transporter = nodemailer.createTransport(transportOptions);
    } else {
      this.transporter = null;
      this.logger.warn('EMAIL_ENABLED=false; email sending is disabled.');
    }
  }

  async sendContactMessage(contactDto: ContactDto): Promise<{ success: boolean; message: string }> {
    if (!this.emailEnabled || !this.transporter) {
      return { success: true, message: 'Email sending disabled in this environment.' };
    }
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
    if (!this.emailEnabled || !this.transporter) {
      this.logger.warn(`Email disabled; skipping password reset email for ${user.email}.`);
      return;
    }
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

  async sendEmailVerification(user: User, verifyLink: string): Promise<void> {
    if (!this.emailEnabled || !this.transporter) {
      this.logger.warn(`Email disabled; verification link: ${verifyLink}`);
      return;
    }
    const mailOptions = {
      from: this.configService.get<string>('EMAIL_FROM'),
      to: user.email,
      subject: 'Verify your email address',
      html: `
        <p>Hello ${user.username},</p>
        <p>Please verify your email address by clicking the link below:</p>
        <p><a href="${verifyLink}">Verify Email</a></p>
        <p>If you did not create this account, please ignore this email.</p>
      `,
    };

    await this.transporter.sendMail(mailOptions);
  }

  async sendBroadcastEmail(broadcastDto: BroadcastDto): Promise<{ success: boolean; count: number }> {
    if (!this.emailEnabled || !this.transporter) {
      this.logger.warn('Email disabled; skipping broadcast email.');
      return { success: true, count: 0 };
    }
    // This service no longer has UsersService, you would inject it if needed for broadcast
    const users: User[] = []; // Placeholder: const users = await this.usersService.getUsers();
    const emails = users.map(user => user.email).filter(email => !!email);

    // In a real app, use a bulk-sending service or a queue to avoid long-running requests.
    for (const email of emails) {
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