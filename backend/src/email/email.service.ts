import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import { Transporter } from 'nodemailer';
import * as SMTPTransport from 'nodemailer/lib/smtp-transport';
import * as sanitizeHtml from 'sanitize-html';
import { User } from 'src/users/types/user.entity';
import { ContactDto } from './types/contact.dto';
import { BroadcastDto } from './types/broadcast.dto';

@Injectable()
export class EmailService {
  private transporter: Transporter | null;
  private readonly logger = new Logger(EmailService.name);
  private readonly emailEnabled: boolean;
  private readonly defaultFrom: string;
  private readonly supportFrom: string;

  constructor(
    private readonly configService: ConfigService,
  ) {
    this.emailEnabled = this.configService.get<string>('EMAIL_ENABLED') !== 'false';
    this.defaultFrom = this.configService.get<string>('EMAIL_FROM') || 'DroneEdge <donotreply@thedroneedge.com>';
    this.supportFrom = this.configService.get<string>('SUPPORT_EMAIL_FROM') || 'DroneEdge Support <support@thedroneedge.com>';

    if (this.emailEnabled) {
      const host = this.configService.get<string>('EMAIL_HOST');
      const port = this.configService.get<number>('EMAIL_PORT');
      const user = this.configService.get<string>('EMAIL_USER');
      const pass = this.configService.get<string>('EMAIL_PASS');

      const transportOptions: SMTPTransport.Options = {
        host,
        port,
        secure: port === 465,
        tls: {
          // smtp-relay.gmail.com requires STARTTLS on port 587
          rejectUnauthorized: true,
        },
      };

      // When using IP-whitelisted SMTP relay, auth is not needed.
      // Only set auth if credentials are explicitly provided.
      if (user && pass) {
        transportOptions.auth = { user, pass };
        this.logger.log('SMTP transport configured with authentication.');
      } else {
        this.logger.log('SMTP transport configured without auth (IP-whitelisted relay mode).');
      }

      this.transporter = nodemailer.createTransport(transportOptions);
      this.verifyTransport();
    } else {
      this.transporter = null;
      this.logger.warn('EMAIL_ENABLED=false; email sending is disabled.');
    }
  }

  private async verifyTransport(): Promise<void> {
    try {
      await this.transporter?.verify();
      this.logger.log('SMTP transport verified successfully.');
    } catch (err) {
      this.logger.error('SMTP transport verification failed. Emails will fail at send time.', (err as Error).message);
    }
  }

  async sendContactMessage(contactDto: ContactDto): Promise<{ success: boolean; message: string }> {
    if (!this.emailEnabled || !this.transporter) {
      return { success: true, message: 'Email sending disabled in this environment.' };
    }

    const sanitizeOptions = { allowedTags: [] as string[], allowedAttributes: {} };
    const sanitizedName = sanitizeHtml(contactDto.name, sanitizeOptions);
    const sanitizedContact = sanitizeHtml(contactDto.contact, sanitizeOptions);
    const sanitizedMessage = sanitizeHtml(contactDto.message, sanitizeOptions);

    const adminEmail = this.configService.get<string>('ADMIN_EMAIL');
    await this.transporter.sendMail({
      from: this.defaultFrom,
      to: adminEmail,
      subject: `New Contact Message from ${sanitizedName}`,
      html: `
        <p><strong>Name:</strong> ${sanitizedName}</p>
        <p><strong>Contact:</strong> ${sanitizedContact}</p>
        <hr>
        <p><strong>Message:</strong></p>
        <p>${sanitizedMessage.replace(/\n/g, '<br>')}</p>
      `,
    });

    return { success: true, message: 'Your message has been sent successfully!' };
  }

  async sendPasswordResetEmail(user: User, resetLink: string): Promise<void> {
    if (!this.emailEnabled || !this.transporter) {
      this.logger.warn(`Email disabled; skipping password reset email for ${user.email}.`);
      return;
    }

    await this.transporter.sendMail({
      from: this.supportFrom,
      to: user.email,
      subject: 'Your Password Reset Request',
      html: `
        <p>Hello ${user.username},</p>
        <p>You requested a password reset. Please click the link below to reset your password. This link is valid for 15 minutes.</p>
        <p><a href="${resetLink}">Reset Password</a></p>
        <p>If you did not request this, please ignore this email.</p>
      `,
    });
  }

  async sendEmailVerification(user: User, verifyLink: string): Promise<void> {
    if (!this.emailEnabled || !this.transporter) {
      this.logger.warn(`Email disabled; verification link: ${verifyLink}`);
      return;
    }

    await this.transporter.sendMail({
      from: this.supportFrom,
      to: user.email,
      subject: 'Verify your email address',
      html: `
        <p>Hello ${user.username},</p>
        <p>Please verify your email address by clicking the link below:</p>
        <p><a href="${verifyLink}">Verify Email</a></p>
        <p>If you did not create this account, please ignore this email.</p>
      `,
    });
  }

  async sendBroadcastEmail(broadcastDto: BroadcastDto): Promise<{ success: boolean; count: number }> {
    if (!this.emailEnabled || !this.transporter) {
      this.logger.warn('Email disabled; skipping broadcast email.');
      return { success: true, count: 0 };
    }

    const users: User[] = [];
    const emails = users.map(user => user.email).filter(email => !!email);

    for (const email of emails) {
      await this.transporter.sendMail({
        from: this.defaultFrom,
        to: email,
        subject: broadcastDto.subject,
        html: broadcastDto.message,
      });
    }

    return { success: true, count: emails.length };
  }
}
