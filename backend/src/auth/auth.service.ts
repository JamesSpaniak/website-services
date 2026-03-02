import { BadRequestException, Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { UsersService } from '../users/user.service';
import { JwtService } from '@nestjs/jwt';
import { User } from '../users/types/user.entity';
import { ConfigService } from '@nestjs/config';
import { EmailService } from '../email/email.service';
import { OrganizationService } from '../organizations/organization.service';
import { InjectRepository } from '@nestjs/typeorm';
import { Session } from './types/session.entity';
import { Repository } from 'typeorm';
import { AuditService } from '../audit/audit.service';
import { AuditAction } from '../audit/types/audit-action.enum';
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
    private organizationService: OrganizationService,
    private auditService: AuditService,
  ) {}

  async validateUser(username: string, pass: string): Promise<any> {
    this.logger.debug(`validateUser called for username="${username}"`);

    const user = await this.usersService.getUserByUsername(username);
    if (!user) {
      this.logger.warn(`Login failed: no user found with username="${username}"`);
      return null;
    }

    this.logger.debug(`User found: id=${user.id}, email=${user.email}, verified=${user.is_email_verified}, role=${user.role}`);

    if (!user.is_email_verified) {
      this.logger.warn(`Login rejected: email not verified for user="${username}" (id=${user.id})`);
      return null;
    }

    const passwordMatch = await UsersService.comparePassword(pass, user.password);
    if (!passwordMatch) {
      this.logger.warn(`Login failed: incorrect password for user="${username}" (id=${user.id})`);
      return null;
    }

    this.logger.log(`Login validated successfully for user="${username}" (id=${user.id})`);
    this.auditService.log(user.id, AuditAction.LOGIN);
    return user;
  }

  async registerUser(payload: {
    username: string;
    password: string;
    email: string;
    first_name?: string;
    last_name?: string;
    picture_url?: string;
    invite_code?: string;
  }): Promise<{ message: string }> {
    this.logger.debug(`registerUser called: username="${payload.username}", email="${payload.email}", hasInviteCode=${!!payload.invite_code}`);

    const existingUsername = await this.usersService.getUserByUsername(payload.username);
    if (existingUsername) {
      this.logger.warn(`Registration rejected: username="${payload.username}" already taken`);
      throw new BadRequestException('Username is already taken.');
    }
    const existingEmail = await this.usersService.getUserByEmail(payload.email);
    if (existingEmail) {
      this.logger.warn(`Registration rejected: email="${payload.email}" already registered`);
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

    if (payload.invite_code) {
      try {
        await this.organizationService.validateAndConsumeInviteCode(
          payload.invite_code,
          user.id,
          payload.email,
        );
        this.logger.log(`User ${user.username} joined organization via invite code.`);
      } catch (err) {
        this.logger.error(`Failed to consume invite code for user ${user.username}: ${(err as Error).message}`);
        throw err;
      }
    }

    const verifyLink = `${this.configService.get<string>('FRONTEND_URL')}/verify-email?token=${verificationToken}`;
    await this.emailService.sendEmailVerification(user, verifyLink);

    this.auditService.log(user.id, AuditAction.REGISTER, { username: payload.username, email: payload.email });
    return { message: 'Registration successful. Please verify your email.' };
  }

  async verifyEmail(token: string): Promise<{ message: string }> {
    this.logger.debug(`verifyEmail called with token="${token.substring(0, 8)}..."`);

    const user = await this.usersService.getUserByVerificationToken(token);
    if (!user || !user.email_verification_token) {
      this.logger.warn(`Email verification failed: no matching token found (token prefix="${token.substring(0, 8)}")`);
      throw new BadRequestException('Invalid verification token.');
    }
    if (user.email_verification_expires_at && user.email_verification_expires_at < new Date()) {
      this.logger.warn(`Email verification failed: token expired for user="${user.username}" (id=${user.id}), expired at ${user.email_verification_expires_at.toISOString()}`);
      throw new BadRequestException('Verification token expired.');
    }

    user.is_email_verified = true;
    user.email_verification_token = null;
    user.email_verification_expires_at = null;
    await this.usersService['userRepository'].save(user);

    this.logger.log(`Email verified successfully for user="${user.username}" (id=${user.id})`);
    this.auditService.log(user.id, AuditAction.VERIFY_EMAIL);
    return { message: 'Email verified successfully.' };
  }

  async login(user: User): Promise<{ access_token: string; refresh_token: string }> {
    this.logger.debug(`Creating session for user="${user.username}" (id=${user.id}, role=${user.role})`);

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
    expires_at.setDate(expires_at.getDate() + 1);

    const session = this.sessionRepository.create({
      user,
      selector,
      hashed_verifier,
      expires_at,
    });

    await this.sessionRepository.save(session);
    this.logger.log(`Session created for user="${user.username}" (id=${user.id}), expires=${expires_at.toISOString()}`);

    const refresh_token = `${selector}:${verifier}`;

    return {
      access_token,
      refresh_token,
    };
  }

  async refreshAccessToken(token: string): Promise<{ access_token: string; refresh_token: string }> {
    const [selector, verifier] = token.split(':');
    if (!selector || !verifier) {
      this.logger.warn('Refresh token rejected: invalid format');
      throw new UnauthorizedException('Invalid refresh token format.');
    }

    this.logger.debug(`Refresh attempt for selector="${selector.substring(0, 8)}..."`);

    const session = await this.sessionRepository.findOne({ where: { selector }, relations: ['user'] });

    if (!session) {
      this.logger.warn(`Refresh failed: no session found for selector="${selector.substring(0, 8)}..."`);
      throw new UnauthorizedException('Invalid refresh token.');
    }

    if (session.expires_at < new Date()) {
      this.logger.warn(`Refresh failed: session expired for user="${session.user?.username}" (expired=${session.expires_at.toISOString()})`);
      await this.sessionRepository.remove(session);
      throw new UnauthorizedException('Refresh token expired.');
    }

    const are_equal = await UsersService.comparePassword(verifier, session.hashed_verifier);

    if (!are_equal) {
      this.logger.warn(`Refresh failed: verifier mismatch for user="${session.user?.username}"`);
      throw new UnauthorizedException('Invalid refresh token.');
    }

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

    this.logger.debug(`Token refreshed for user="${user.username}" (id=${user.id})`);

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
