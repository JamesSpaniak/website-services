import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ProductEventsService } from '../product-events/product-events.service';
import { UsersService } from '../users/user.service';
import { SignupLinkService } from '../users/signup-link.service';
import { JwtService } from '@nestjs/jwt';
import { User } from '../users/types/user.entity';
import { ConfigService } from '@nestjs/config';
import { EmailService } from '../email/email.service';
import { OrganizationService } from '../organizations/organization.service';
import { InjectRepository } from '@nestjs/typeorm';
import { Session } from './types/session.entity';
import { Repository } from 'typeorm';
import { AuditService } from '../audit/audit.service';
import { maskEmail } from '../common/pii';
import { AuditAction } from '../audit/types/audit-action.enum';
import { AnalyticsService } from '../analytics/analytics.service';
import * as crypto from 'crypto';
import { AttemptLimiter } from '../common/attempt-limiter.service';
import {
  generateResetCode,
  hashResetCode,
  resetCodeMatches,
} from '../common/reset-code';
import { OrgRole } from '../organizations/types/org-role.enum';
import { Role } from '../users/types/role.enum';

export const LOGIN_USER_NOT_FOUND =
  'No account found with that username or email.';
export const LOGIN_BAD_PASSWORD = 'Incorrect password.';
export const RESET_LINK_INVALID = 'Invalid or expired password reset token.';

/** Reset-link lifetime — school mail gateways can hold a message for a while. */
const RESET_LINK_TTL = '60m';

/** Wrong passwords allowed per account per window, from any number of IPs. */
export const LOGIN_FAILURE_LIMIT = 8;
export const LOGIN_FAILURE_WINDOW_MS = 10 * 60 * 1000;
export const loginFailureKey = (userId: number) => `login-fail:${userId}`;

export const RESET_CODE_INVALID =
  'That reset code is not valid or has expired. Ask your teacher for a new one.';
const RESET_CODE_TTL_MS = 60 * 60 * 1000;
const RESET_CODE_MAX_ATTEMPTS = 5;

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  constructor(
    @InjectRepository(Session)
    private sessionRepository: Repository<Session>,
    private usersService: UsersService,
    private signupLinkService: SignupLinkService,
    private jwtService: JwtService,
    private configService: ConfigService,
    private emailService: EmailService,
    private organizationService: OrganizationService,
    private auditService: AuditService,
    private analyticsService: AnalyticsService,
    private productEvents: ProductEventsService,
    private attemptLimiter: AttemptLimiter,
  ) {}

  async validateUser(identifier: string, pass: string): Promise<User> {
    this.logger.debug(`validateUser called for identifier="${identifier}"`);

    const user = await this.usersService.findForLogin(identifier);
    if (!user) {
      this.logger.warn(
        `Login failed: no user found with identifier="${maskEmail(identifier)}"`,
      );
      throw new UnauthorizedException(LOGIN_USER_NOT_FOUND);
    }

    this.logger.debug(
      `User found: id=${user.id}, verified=${user.is_email_verified}, role=${user.role}`,
    );

    // Per account, not per IP: a classroom shares one IP, and an attacker
    // rotating IPs still hits the same account counter.
    const failKey = loginFailureKey(user.id);
    this.attemptLimiter.assertBelow(
      failKey,
      LOGIN_FAILURE_LIMIT,
      'Too many incorrect passwords for this account. Wait a few minutes, reset your password, or ask your teacher for a reset code.',
    );

    const passwordMatch = await UsersService.comparePassword(
      pass,
      user.password,
    );
    if (!passwordMatch) {
      this.attemptLimiter.hit(failKey, LOGIN_FAILURE_WINDOW_MS);
      this.logger.warn(
        `Login failed: incorrect password for user="${user.username}" (id=${user.id})`,
      );
      throw new UnauthorizedException(LOGIN_BAD_PASSWORD);
    }
    this.attemptLimiter.reset(failKey);

    this.logger.log(
      `Login validated successfully for user="${user.username}" (id=${user.id})`,
    );
    this.auditService.log(user.id, AuditAction.LOGIN);
    void this.productEvents.record({ userId: user.id, event: 'login' });
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
    signup_code?: string;
  }): Promise<{ message: string }> {
    this.logger.debug(
      `registerUser called: username="${payload.username}", email="${maskEmail(payload.email)}", hasInviteCode=${!!payload.invite_code}, hasSignupCode=${!!payload.signup_code}`,
    );

    const existingUsername = await this.usersService.getUserByUsername(
      payload.username,
    );
    if (existingUsername) {
      this.logger.warn(
        `Registration rejected: username="${payload.username}" already taken`,
      );
      throw new BadRequestException('Username is already taken.');
    }
    const existingEmail = await this.usersService.getUserByEmail(payload.email);
    if (existingEmail) {
      this.logger.warn(
        `Registration rejected: email="${maskEmail(payload.email)}" already registered`,
      );
      throw new BadRequestException('Email is already registered.');
    }

    // Validate the promo/signup link before creating the account so a bad
    // code fails registration instead of leaving a linkless account behind.
    if (payload.signup_code) {
      await this.signupLinkService.assertRedeemable(
        payload.signup_code,
        payload.email,
      );
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
        this.logger.log(
          `User ${user.username} joined organization via invite code.`,
        );
      } catch (err) {
        this.logger.error(
          `Failed to consume invite code for user ${user.username}: ${(err as Error).message}`,
        );
        throw err;
      }
    }

    if (payload.signup_code) {
      try {
        await this.signupLinkService.consume(
          payload.signup_code,
          user.id,
          payload.email,
        );
        this.logger.log(
          `User ${user.username} redeemed signup link on registration.`,
        );
      } catch (err) {
        this.logger.error(
          `Failed to consume signup link for user ${user.username}: ${(err as Error).message}`,
        );
        throw err;
      }
    }

    const verifyLink = `${this.configService.get<string>('FRONTEND_URL')}/verify-email?token=${verificationToken}`;
    await this.emailService.sendEmailVerification(user, verifyLink);

    this.auditService.log(user.id, AuditAction.REGISTER, {
      username: payload.username,
      email: payload.email,
    });
    void this.productEvents.record({
      userId: user.id,
      event: 'signup_completed',
      properties: {
        via: payload.invite_code
          ? 'org_invite'
          : payload.signup_code
            ? 'signup_link'
            : 'direct',
      },
    });
    return { message: 'Registration successful. Please verify your email.' };
  }

  async verifyEmail(token: string): Promise<{ message: string }> {
    this.logger.debug(
      `verifyEmail called with token="${token.substring(0, 8)}..."`,
    );

    const user = await this.usersService.getUserByVerificationToken(token);
    if (!user || !user.email_verification_token) {
      this.logger.warn(
        `Email verification failed: no matching token found (token prefix="${token.substring(0, 8)}")`,
      );
      throw new BadRequestException('Invalid verification token.');
    }
    if (
      user.email_verification_expires_at &&
      user.email_verification_expires_at < new Date()
    ) {
      this.logger.warn(
        `Email verification failed: token expired for user="${user.username}" (id=${user.id}), expired at ${user.email_verification_expires_at.toISOString()}`,
      );
      throw new BadRequestException('Verification token expired.');
    }

    user.is_email_verified = true;
    user.email_verification_token = null;
    user.email_verification_expires_at = null;
    await this.usersService['userRepository'].save(user);

    this.logger.log(
      `Email verified successfully for user="${user.username}" (id=${user.id})`,
    );
    this.auditService.log(user.id, AuditAction.VERIFY_EMAIL);
    void this.productEvents.record({
      userId: user.id,
      event: 'email_verified',
    });
    return { message: 'Email verified successfully.' };
  }

  async resendVerificationEmail(userId: number): Promise<{ message: string }> {
    const user = await this.usersService.getUserById(userId);
    if (!user) {
      throw new NotFoundException('User not found.');
    }
    if (user.is_email_verified) {
      throw new BadRequestException('Email is already verified.');
    }

    const verificationToken = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24);

    user.email_verification_token = verificationToken;
    user.email_verification_expires_at = expiresAt;
    await this.usersService['userRepository'].save(user);

    const verifyLink = `${this.configService.get<string>('FRONTEND_URL')}/verify-email?token=${verificationToken}`;
    try {
      await this.emailService.sendEmailVerification(user, verifyLink);
    } catch (err) {
      this.logger.error(
        `Failed to send verification email for user="${user.username}" (id=${user.id}): ${(err as Error).message}`,
      );
    }

    this.logger.log(
      `Verification email resent for user="${user.username}" (id=${user.id})`,
    );
    return { message: 'Verification email sent.' };
  }

  async login(
    user: User,
  ): Promise<{ access_token: string; refresh_token: string }> {
    this.logger.debug(
      `Creating session for user="${user.username}" (id=${user.id}, role=${user.role})`,
    );

    const access_token_payload = {
      username: user.username,
      sub: user.id,
      role: user.role,
      token_version: user.token_version,
      email_verified: user.is_email_verified,
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
    this.logger.log(
      `Session created for user="${user.username}" (id=${user.id}), expires=${expires_at.toISOString()}`,
    );

    const refresh_token = `${selector}:${verifier}`;

    return {
      access_token,
      refresh_token,
    };
  }

  async refreshAccessToken(
    token: string,
  ): Promise<{ access_token: string; refresh_token?: string }> {
    const [selector, verifier] = token.split(':');
    if (!selector || !verifier) {
      this.logger.warn('Refresh token rejected: invalid format');
      throw new UnauthorizedException('Invalid refresh token format.');
    }

    this.logger.debug(
      `Refresh attempt for selector="${selector.substring(0, 8)}..."`,
    );

    const session = await this.sessionRepository.findOne({
      where: { selector },
      relations: ['user'],
    });

    if (!session) {
      this.logger.warn(
        `Refresh failed: no session found for selector="${selector.substring(0, 8)}..."`,
      );
      throw new UnauthorizedException('Invalid refresh token.');
    }

    if (session.expires_at < new Date()) {
      this.logger.warn(
        `Refresh failed: session expired for user="${session.user?.username}" (expired=${session.expires_at.toISOString()})`,
      );
      await this.sessionRepository.remove(session);
      throw new UnauthorizedException('Refresh token expired.');
    }

    const are_equal = await UsersService.comparePassword(
      verifier,
      session.hashed_verifier,
    );

    if (!are_equal) {
      this.logger.warn(
        `Refresh failed: verifier mismatch for user="${session.user?.username}"`,
      );
      throw new UnauthorizedException('Invalid refresh token.');
    }

    // Rotate only if no parallel refresh with the same cookie got there first.
    // The losers still get an access token but no new refresh token, so the
    // browser keeps the winner's cookie — the only one matching the DB.
    const new_verifier = crypto.randomBytes(32).toString('hex');
    const new_hashed_verifier = await UsersService.hashPassword(new_verifier);
    const rotation = await this.sessionRepository.update(
      { id: session.id, hashed_verifier: session.hashed_verifier },
      { hashed_verifier: new_hashed_verifier },
    );
    const rotated = rotation.affected === 1;

    const user = session.user;
    const payload = {
      username: user.username,
      sub: user.id,
      role: user.role,
      token_version: user.token_version,
      email_verified: user.is_email_verified,
    };

    this.logger.debug(
      `Token refreshed for user="${user.username}" (id=${user.id})${rotated ? '' : ' — concurrent refresh, verifier kept'}`,
    );
    this.analyticsService.recordTokenRefresh();

    return {
      access_token: this.jwtService.sign(payload),
      refresh_token: rotated ? `${selector}:${new_verifier}` : undefined,
    };
  }

  /** Admin action: email a password reset link to a specific user. */
  async adminSendPasswordReset(
    targetUserId: number,
  ): Promise<{ message: string }> {
    const user = await this.usersService.getUserById(targetUserId);
    if (!user) {
      throw new NotFoundException('User not found.');
    }
    await this.sendPasswordResetLink(user.email);
    this.logger.log(
      `Admin-triggered password reset email for user="${user.username}" (id=${user.id})`,
    );
    return { message: `Password reset link sent to ${user.email}.` };
  }

  /** Admin action: resend the email verification link to a specific user. */
  async adminResendVerification(
    targetUserId: number,
  ): Promise<{ message: string }> {
    const result = await this.resendVerificationEmail(targetUserId);
    this.logger.log(
      `Admin-triggered verification email for user id=${targetUserId}`,
    );
    return result;
  }

  /** Prefer the dedicated reset secret; fall back to the main JWT secret when unset. */
  private resetTokenSecret(): string {
    return (
      this.configService.get<string>('JWT_RESET_SECRET') ||
      this.configService.get<string>('JWT_SECRET')
    );
  }

  async sendPasswordResetLink(email: string): Promise<{ message: string }> {
    // Case-insensitive: students type Mike@School.org and mike@school.org.
    const user = await this.usersService.findForLogin(email);

    if (!user) {
      this.logger.warn(
        `Password reset attempt for non-existent email: ${maskEmail(email)}`,
      );
      return {
        message:
          'If an account with that email exists, a password reset link has been sent.',
      };
    }

    // `ver` makes the link single-use: resetting the password bumps
    // token_version, so the same link (or any older one) stops verifying.
    // Requesting another link does not bump it, so earlier links in a slow
    // inbox keep working until one is used.
    const payload = {
      sub: user.id,
      username: user.username,
      ver: user.token_version ?? 0,
    };
    const token = this.jwtService.sign(payload, {
      // Fall back to the main JWT secret / a sane TTL when the reset-specific
      // env vars are absent (they are not wired into the ECS task definition;
      // an undefined expiresIn makes jsonwebtoken throw and 500s this route).
      secret: this.resetTokenSecret(),
      expiresIn:
        this.configService.get<string>('JWT_RESET_EXPIRES_IN') ||
        RESET_LINK_TTL,
    });

    const resetLink = `${this.configService.get<string>('FRONTEND_URL')}/reset-password?token=${token}`;

    await this.emailService.sendPasswordResetEmail(user, resetLink);
    return {
      message:
        'If an account with that email exists, a password reset link has been sent.',
    };
  }

  async resetPassword(
    token: string,
    newPassword: string,
  ): Promise<{ message: string }> {
    let payload: { sub?: number; ver?: number };
    try {
      payload = this.jwtService.verify(token, {
        secret: this.resetTokenSecret(),
      });
    } catch {
      throw new UnauthorizedException(RESET_LINK_INVALID);
    }

    const user = payload?.sub
      ? await this.usersService.getUserById(payload.sub)
      : undefined;
    // Missing `ver` = a link issued before single-use links (≤ 60 min old at
    // deploy); refusing it only costs the user a fresh request.
    if (!user || payload.ver !== (user.token_version ?? 0)) {
      throw new UnauthorizedException(RESET_LINK_INVALID);
    }

    await this.setNewPassword(user, newPassword);
    return { message: 'Password has been reset successfully.' };
  }

  /**
   * Teacher reset code: a manager of `orgId` issues a one-time code for one of
   * its students, for classrooms where reset emails never arrive (district
   * filters, no inbox in class). Students (org `member`) only — never another
   * manager or a site admin, so a manager can't take over a peer's account.
   */
  async createMemberResetCode(
    orgId: number,
    targetUserId: number,
    actorUserId: number,
  ): Promise<{ code: string; expires_at: string; username: string }> {
    const role = await this.organizationService.getMemberRole(
      orgId,
      targetUserId,
    );
    if (!role) {
      throw new NotFoundException('Member not found in this organization.');
    }
    if (role !== OrgRole.Member) {
      throw new ForbiddenException(
        'Reset codes are for students. Managers can reset their own password from the sign-in page.',
      );
    }
    const user = await this.usersService.getUserById(targetUserId);
    if (!user) throw new NotFoundException('User not found.');
    if (user.role === Role.Admin) {
      throw new ForbiddenException('Reset codes are for students.');
    }

    const code = generateResetCode();
    const expiresAt = new Date(Date.now() + RESET_CODE_TTL_MS);
    await this.usersService.setResetCode(
      user.id,
      hashResetCode(user.id, code),
      expiresAt,
    );
    this.auditService.log(user.id, AuditAction.RESET_CODE_CREATED, {
      orgId,
      byUserId: actorUserId,
    });
    this.logger.log(
      `Reset code issued for user id=${user.id} in org=${orgId} by user id=${actorUserId}`,
    );
    return {
      code,
      expires_at: expiresAt.toISOString(),
      username: user.username,
    };
  }

  /** Redeem a teacher reset code. Wrong guesses count in the DB (5 max). */
  async resetPasswordWithCode(
    identifier: string,
    code: string,
    newPassword: string,
  ): Promise<{ message: string; username: string }> {
    const user = await this.usersService.findForLogin(identifier);
    // One message for every failure so the form can't be used to probe
    // which usernames have a live code.
    const invalid = () => new UnauthorizedException(RESET_CODE_INVALID);
    if (!user) throw invalid();

    const stored = await this.usersService.getResetCode(user.id);
    const live =
      stored.hash &&
      stored.expiresAt &&
      stored.expiresAt.getTime() > Date.now() &&
      stored.attempts < RESET_CODE_MAX_ATTEMPTS;
    if (!live) throw invalid();

    if (!resetCodeMatches(user.id, code, stored.hash)) {
      await this.usersService.incrementResetCodeAttempts(user.id);
      throw invalid();
    }

    await this.setNewPassword(user, newPassword);
    await this.usersService.clearResetCode(user.id);
    this.auditService.log(user.id, AuditAction.PASSWORD_RESET_BY_CODE);
    return {
      message: 'Password has been reset successfully.',
      username: user.username,
    };
  }

  /**
   * Shared tail of every reset path: store the hash (which bumps
   * token_version, signing out other sessions and killing outstanding reset
   * links), and lift any failed-login lockout on the account.
   */
  private async setNewPassword(user: User, newPassword: string) {
    const hashedPassword = await UsersService.hashPassword(newPassword);
    await this.usersService.updatePassword(user.id, hashedPassword);
    this.attemptLimiter.reset(loginFailureKey(user.id));
  }

  async logout(token: string): Promise<void> {
    const [selector] = token.split(':');
    if (!selector) {
      return; // No selector, nothing to do
    }

    const session = await this.sessionRepository.findOne({
      where: { selector },
    });

    if (session) {
      await this.sessionRepository.remove(session);
    }
  }
}
