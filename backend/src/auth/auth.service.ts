import { BadRequestException, Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { UsersService } from '../users/user.service';
import { JwtService } from '@nestjs/jwt';
import { User } from '../users/types/user.entity';
import { ConfigService } from '@nestjs/config';
import { EmailService } from '../email/email.service';
import { InjectRepository } from '@nestjs/typeorm';
import { Session } from './types/session.entity';
import { Repository } from 'typeorm';
import * as crypto from 'crypto';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  constructor(
    @InjectRepository(Session)
    private sessionRepository: Repository<Session>,
    private usersService: UsersService,
    private jwtService: JwtService,
    private configService: ConfigService,
    private emailService: EmailService,
  ) {}

  async validateUser(username: string, pass: string): Promise<any> {
    const user = await this.usersService.getUserByUsername(username);
    if (user && !user.is_email_verified) {
      return null;
    }
    if (user && (await UsersService.comparePassword(pass, user.password))) {
      return user;
    }
    return null;
  }

  async registerUser(payload: {
    username: string;
    password: string;
    email: string;
    first_name?: string;
    last_name?: string;
    picture_url?: string;
  }): Promise<{ message: string }> {
    const existingUsername = await this.usersService.getUserByUsername(payload.username);
    if (existingUsername) {
      throw new BadRequestException('Username is already taken.');
    }
    const existingEmail = await this.usersService.getUserByEmail(payload.email);
    if (existingEmail) {
      throw new BadRequestException('Email is already registered.');
    }

    const verificationToken = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24);

    const user = await this.usersService.createUnverifiedUser(
      {
        username: payload.username,
        password: payload.password,
        email: payload.email,
        first_name: payload.first_name,
        last_name: payload.last_name,
        picture_url: payload.picture_url,
      },
      verificationToken,
      expiresAt,
    );

    const verifyLink = `${this.configService.get<string>('FRONTEND_URL')}/verify-email?token=${verificationToken}`;
    await this.emailService.sendEmailVerification(user, verifyLink);

    return { message: 'Registration successful. Please verify your email.' };
  }

  async verifyEmail(token: string): Promise<{ message: string }> {
    const user = await this.usersService.getUserByVerificationToken(token);
    if (!user || !user.email_verification_token) {
      throw new BadRequestException('Invalid verification token.');
    }
    if (user.email_verification_expires_at && user.email_verification_expires_at < new Date()) {
      throw new BadRequestException('Verification token expired.');
    }

    user.is_email_verified = true;
    user.email_verification_token = null;
    user.email_verification_expires_at = null;
    await this.usersService['userRepository'].save(user);

    return { message: 'Email verified successfully.' };
  }

  async login(user: User): Promise<{ access_token: string; refresh_token: string }> {
    const access_token_payload = {
      username: user.username,
      sub: user.id,
      role: user.role,
      token_version: user.token_version,
    };
    const access_token = this.jwtService.sign(access_token_payload);

    const selector = crypto.randomBytes(16).toString('hex');
    const verifier = crypto.randomBytes(32).toString('hex');
    const hashed_verifier = await UsersService.hashPassword(verifier);

    const expires_at = new Date();
    expires_at.setDate(expires_at.getDate() + 1); // Expires in 24 hours

    const session = this.sessionRepository.create({
      user,
      selector,
      hashed_verifier,
      expires_at,
    });

    await this.sessionRepository.save(session);

    const refresh_token = `${selector}:${verifier}`;

    return {
      access_token,
      refresh_token,
    };
  }

  async refreshAccessToken(token: string): Promise<{ access_token: string; refresh_token: string }> {
    const [selector, verifier] = token.split(':');
    if (!selector || !verifier) {
      throw new UnauthorizedException('Invalid refresh token format.');
    }

    const session = await this.sessionRepository.findOne({ where: { selector }, relations: ['user'] });

    if (!session) {
      throw new UnauthorizedException('Invalid refresh token.');
    }

    if (session.expires_at < new Date()) {
      await this.sessionRepository.remove(session);
      throw new UnauthorizedException('Refresh token expired.');
    }

    const are_equal = await UsersService.comparePassword(verifier, session.hashed_verifier);

    if (!are_equal) {
      throw new UnauthorizedException('Invalid refresh token.');
    }

    // Refresh token rotation
    const new_verifier = crypto.randomBytes(32).toString('hex');
    const new_hashed_verifier = await UsersService.hashPassword(new_verifier);
    session.hashed_verifier = new_hashed_verifier;
    await this.sessionRepository.save(session);

    const user = session.user;
    const payload = {
      username: user.username,
      sub: user.id,
      role: user.role,
      token_version: user.token_version,
    };

    const new_refresh_token = `${selector}:${new_verifier}`;

    return {
      access_token: this.jwtService.sign(payload),
      refresh_token: new_refresh_token,
    };
  }

  async sendPasswordResetLink(email: string): Promise<{ message: string }> {
    const user = await this.usersService.getUserByEmail(email);

    if (!user) {
      this.logger.warn(`Password reset attempt for non-existent email: ${email}`);
      return { message: 'If an account with that email exists, a password reset link has been sent.' };
    }

    const payload = { sub: user.id, username: user.username };
    const token = this.jwtService.sign(payload, {
      secret: this.configService.get<string>('JWT_RESET_SECRET'),
      expiresIn: this.configService.get<string>('JWT_RESET_EXPIRES_IN'),
    });
    
    const resetLink = `${this.configService.get<string>('FRONTEND_URL')}/reset-password?token=${token}`;

    await this.emailService.sendPasswordResetEmail(user, resetLink);
    return { message: 'If an account with that email exists, a password reset link has been sent.' };
  }

  async resetPassword(token: string, newPassword: string): Promise<{ message: string }> {
    try {
      const payload = this.jwtService.verify(token, {
        secret: this.configService.get<string>('JWT_RESET_SECRET'),
      });

      const userId = payload.sub;
      if (!userId) {
        throw new UnauthorizedException('Invalid token payload.');
      }

      const hashedPassword = await UsersService.hashPassword(newPassword);
      await this.usersService.updatePassword(userId, hashedPassword);

      return { message: 'Password has been reset successfully.' };
    } catch (error) {
      throw new UnauthorizedException('Invalid or expired password reset token.');
    }
  }

  async logout(token: string): Promise<void> {
    const [selector] = token.split(':');
    if (!selector) {
      return; // No selector, nothing to do
    }
    
    const session = await this.sessionRepository.findOne({ where: { selector } });

    if (session) {
        await this.sessionRepository.remove(session);
    }
  }
}
