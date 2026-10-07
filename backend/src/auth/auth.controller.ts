import {
  Controller,
  Post,
  UseGuards,
  Request,
  Res,
  Get,
  Body,
  Param,
  ParseIntPipe,
  UseInterceptors,
  ClassSerializerInterceptor,
  NotFoundException,
  UnauthorizedException,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { Response } from 'express';
import { AuthService } from './auth.service';
import { UsersService } from '../users/user.service';
import { OrganizationService } from '../organizations/organization.service';
import { RolesGuard } from '../users/role.guard';
import { Roles } from '../users/role.decorator';
import { Role } from '../users/types/role.enum';
import { JwtAuthGuard } from './jwt-auth.guard';
import { Throttle } from '@nestjs/throttler';
import { ResetPasswordDto } from './types/reset-password.dto';
import { ForgotPasswordDto } from './types/forgot-password.dto';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { UserFull } from 'src/users/types/user.dto';
import { plainToInstance } from 'class-transformer';
import { LoginCredentialsDto } from './types/login-credentials.dto';
import { RefreshTokenDto } from './types/refresh-token.dto';
import { RegisterDto } from './types/register.dto';
import { VerifyEmailDto } from './types/verify-email.dto';
import { DeleteAccountDto } from './types/delete-account.dto';
import { ResetWithCodeDto } from './types/reset-with-code.dto';
import { OrgManagerGuard } from '../organizations/org-manager.guard';
import { AnalyticsService } from '../analytics/analytics.service';
import {
  AttemptLimiter,
  normalizeIdentifier,
} from '../common/attempt-limiter.service';
import { clientIp } from '../common/client-ip';

/** Auth cookies are HttpOnly so tokens are unreachable from page JavaScript (XSS). */
export const ACCESS_TOKEN_COOKIE = 'access_token';
export const REFRESH_TOKEN_COOKIE = 'refresh_token';

const ACCESS_TOKEN_MAX_AGE_MS = 60 * 60 * 1000; // 1h — matches JWT_EXPIRES_IN
const REFRESH_TOKEN_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000; // 30d

const MINUTE_MS = 60_000;
const HOUR_MS = 60 * MINUTE_MS;

/**
 * Anonymous auth routes are keyed by IP, and a school is one IP. These limits
 * are sized for 60 students on one network (two classes) and still stop one
 * machine looping requests. The real abuse limits are per account / per email
 * (AttemptLimiter). Rationale: docs/TODO.md "Shared-IP + bot hardening".
 */
const LOGIN_PER_IP = { default: { limit: 120, ttl: MINUTE_MS } };
const REGISTER_PER_IP = { default: { limit: 120, ttl: 10 * MINUTE_MS } };
/** Each registration sends a verification email through the Google relay (~10k/day cap). */
const REGISTER_PER_IP_PER_DAY = 500;
const FORGOT_PER_IP = { default: { limit: 30, ttl: MINUTE_MS } };
const RESET_PER_IP = { default: { limit: 20, ttl: MINUTE_MS } };
const REFRESH_PER_IP = { default: { limit: 120, ttl: MINUTE_MS } };
const VERIFY_EMAIL_PER_IP = { default: { limit: 60, ttl: MINUTE_MS } };

// Path is '/' (not '/auth') because the browser reaches the API through the
// Next proxy under /api/*, so a backend-relative path would never match.
const baseCookieOptions = () => ({
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  path: '/',
});

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(
    private authService: AuthService,
    private usersService: UsersService,
    private organizationService: OrganizationService,
    private analyticsService: AnalyticsService,
    private attemptLimiter: AttemptLimiter,
  ) {}

  private setAuthCookies(
    res: Response,
    tokens: { access_token: string; refresh_token?: string },
  ) {
    res.cookie(ACCESS_TOKEN_COOKIE, tokens.access_token, {
      ...baseCookieOptions(),
      maxAge: ACCESS_TOKEN_MAX_AGE_MS,
    });
    // Absent when a parallel refresh already rotated the session: keep the
    // browser's existing refresh cookie.
    if (!tokens.refresh_token) return;
    res.cookie(REFRESH_TOKEN_COOKIE, tokens.refresh_token, {
      ...baseCookieOptions(),
      maxAge: REFRESH_TOKEN_MAX_AGE_MS,
    });
  }

  private clearAuthCookies(res: Response) {
    res.clearCookie(ACCESS_TOKEN_COOKIE, baseCookieOptions());
    res.clearCookie(REFRESH_TOKEN_COOKIE, baseCookieOptions());
  }

  @ApiOperation({
    summary: 'Log in a user',
    description:
      'Authenticates by username or email and returns tokens and user profile. 401 messages distinguish unknown identifier vs wrong password.',
  })
  @ApiResponse({ status: 200, description: 'Login successful.' })
  @ApiResponse({
    status: 401,
    description:
      'No account found with that username or email, or incorrect password.',
  })
  @Throttle(LOGIN_PER_IP)
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(
    @Body() loginCredentialsDto: LoginCredentialsDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    let user;
    try {
      user = await this.authService.validateUser(
        loginCredentialsDto.username,
        loginCredentialsDto.password,
      );
    } catch (err) {
      if (err instanceof UnauthorizedException) {
        this.analyticsService.recordLoginFailed();
      }
      throw err;
    }
    const tokens = await this.authService.login(user);
    this.setAuthCookies(res, tokens);
    this.analyticsService.recordLogin();
    const userFull = plainToInstance(UserFull, user, {
      excludeExtraneousValues: true,
    });
    const orgMembership = await this.organizationService.getMyOrganization(
      user.id,
    );
    if (orgMembership) {
      userFull.organization = orgMembership;
    }
    // Tokens remain in the body for one release for older clients (mobile,
    // Swagger); the web frontend relies solely on the cookies.
    return {
      ...tokens,
      user: userFull,
    };
  }

  @ApiOperation({
    summary: 'Register a new user',
    description: 'Creates a new account and sends a verification email.',
  })
  @ApiResponse({
    status: 201,
    description: 'Registration successful. Verification email sent.',
  })
  @Throttle(REGISTER_PER_IP)
  @Post('register')
  async register(@Request() req, @Body() registerDto: RegisterDto) {
    this.attemptLimiter.consume(
      `register-day:${clientIp(req)}`,
      REGISTER_PER_IP_PER_DAY,
      24 * HOUR_MS,
      'Too many new accounts from this network today. Try again tomorrow, or contact support@thedroneedge.com.',
    );
    const result = await this.authService.registerUser(registerDto);
    this.analyticsService.recordRegistration();
    return result;
  }

  @ApiOperation({
    summary: 'Verify email address',
    description: 'Validates email verification token.',
  })
  @ApiResponse({ status: 200, description: 'Email verified successfully.' })
  @Throttle(VERIFY_EMAIL_PER_IP)
  @Post('verify-email')
  @HttpCode(HttpStatus.OK)
  async verifyEmail(@Body() verifyEmailDto: VerifyEmailDto) {
    return this.authService.verifyEmail(verifyEmailDto.token);
  }

  @ApiOperation({ summary: 'Resend email verification link' })
  @ApiResponse({ status: 200, description: 'Verification email sent.' })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Throttle({ default: { limit: 3, ttl: 3_600_000 } })
  @Post('resend-verification')
  @HttpCode(HttpStatus.OK)
  async resendVerification(@Request() req) {
    return this.authService.resendVerificationEmail(req.user.userId);
  }

  @ApiOperation({
    summary: 'Refresh access token',
    description: 'Provides a new access and refresh token.',
  })
  @ApiResponse({ status: 200, description: 'Token refreshed successfully.' })
  @ApiResponse({ status: 401, description: 'Invalid refresh token.' })
  @Throttle(REFRESH_PER_IP)
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(
    @Request() req,
    @Body() refreshTokenDto: RefreshTokenDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const token: string | undefined =
      req.cookies?.[REFRESH_TOKEN_COOKIE] || refreshTokenDto.refresh_token;
    if (!token) {
      throw new UnauthorizedException('No refresh token provided.');
    }
    const tokens = await this.authService.refreshAccessToken(token);
    this.setAuthCookies(res, tokens);
    return tokens;
  }

  @ApiOperation({ summary: 'Get current user profile' })
  @ApiBearerAuth()
  @ApiResponse({
    status: 200,
    description: 'The profile of the currently authenticated user.',
    type: UserFull,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @UseInterceptors(ClassSerializerInterceptor)
  @Get('profile')
  @UseGuards(JwtAuthGuard)
  async getProfile(@Request() req): Promise<UserFull> {
    const user = await this.usersService.getUserByUsername(req.user.username);
    if (!user) {
      throw new NotFoundException('User from token not found.');
    }
    const userFull = plainToInstance(UserFull, user, {
      excludeExtraneousValues: true,
    });
    const orgMembership = await this.organizationService.getMyOrganization(
      user.id,
    );
    if (orgMembership) {
      userFull.organization = orgMembership;
    }
    return userFull;
  }

  @ApiOperation({
    summary: 'Log out the current user',
    description: 'Invalidates the provided refresh token.',
  })
  @ApiResponse({ status: 200, description: 'Logout successful.' })
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  async logout(
    @Request() req,
    @Body() refreshTokenDto: RefreshTokenDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const token: string | undefined =
      req.cookies?.[REFRESH_TOKEN_COOKIE] || refreshTokenDto.refresh_token;
    if (token) {
      await this.authService.logout(token);
    }
    this.clearAuthCookies(res);
    return { message: 'Logged out successfully' };
  }

  @ApiOperation({
    summary: 'Delete the signed-in account',
    description:
      'Self-service deletion (App Store 5.1.1(v)). Requires the current password. Removes progress, exam history, comments, course access, waitlist signups and the Stripe customer (cancelling Pro). Order records are kept without the user link. Refused for admins and for students in a school account.',
  })
  @ApiResponse({
    status: 200,
    description: 'Account deleted; cookies cleared.',
  })
  @ApiResponse({ status: 400, description: 'Incorrect password.' })
  @ApiResponse({
    status: 403,
    description: 'Admin account, or a school-managed student account.',
  })
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @Post('delete-account')
  @HttpCode(HttpStatus.OK)
  async deleteAccount(
    @Request() req,
    @Body() dto: DeleteAccountDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    await this.usersService.deleteOwnAccount(req.user.userId, dto.password);
    // Sessions cascade with the user; the JWT strategy rejects the old
    // access token because the user no longer exists.
    this.clearAuthCookies(res);
    return { message: 'Your account has been deleted.' };
  }

  @ApiOperation({ summary: 'Request a password reset' })
  @ApiResponse({
    status: 201,
    description:
      'A message indicating that if the user exists, an email has been sent.',
  })
  @ApiResponse({
    status: 429,
    description:
      'Per email: one link per 60 s and five per hour (counted whether or not the account exists). Body has `retry_after_seconds`.',
  })
  @Throttle(FORGOT_PER_IP)
  @Post('forgot-password')
  async forgotPassword(@Body() forgotPasswordDto: ForgotPasswordDto) {
    // Per address, not per IP: stops flooding one inbox without blocking a
    // classroom where several students reset at once.
    const email = normalizeIdentifier(forgotPasswordDto.email);
    const cooldownKey = `reset-email-cooldown:${email}`;
    const hourKey = `reset-email-hour:${email}`;
    this.attemptLimiter.assertBelow(
      cooldownKey,
      1,
      'We just sent a reset link to that address. Check your inbox and spam folder, or try again in a minute.',
    );
    this.attemptLimiter.assertBelow(
      hourKey,
      5,
      'Several reset links have already gone to that address this hour. Check spam or quarantine, or ask your teacher for a reset code.',
    );
    this.attemptLimiter.hit(cooldownKey, MINUTE_MS);
    this.attemptLimiter.hit(hourKey, HOUR_MS);
    return this.authService.sendPasswordResetLink(forgotPasswordDto.email);
  }

  @ApiOperation({
    summary: 'Send a password reset link to a specific user (Admin only)',
  })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.Admin)
  @Post('admin/users/:id/send-password-reset')
  @HttpCode(HttpStatus.OK)
  async adminSendPasswordReset(@Param('id', ParseIntPipe) id: number) {
    return this.authService.adminSendPasswordReset(id);
  }

  @ApiOperation({
    summary: "Resend a specific user's verification email (Admin only)",
  })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.Admin)
  @Post('admin/users/:id/resend-verification')
  @HttpCode(HttpStatus.OK)
  async adminResendVerification(@Param('id', ParseIntPipe) id: number) {
    return this.authService.adminResendVerification(id);
  }

  @ApiOperation({ summary: 'Reset password with a token' })
  @ApiResponse({
    status: 201,
    description: 'Password has been successfully reset.',
  })
  @Throttle(RESET_PER_IP)
  @Post('reset-password')
  async resetPassword(@Body() resetPasswordDto: ResetPasswordDto) {
    return this.authService.resetPassword(
      resetPasswordDto.token,
      resetPasswordDto.password,
    );
  }

  @ApiOperation({
    summary: 'Reset password with a teacher reset code',
    description:
      'For students whose reset email never arrives. Codes come from POST /auth/organizations/:id/members/:userId/reset-code, last 1 h and allow 5 wrong tries.',
  })
  @ApiResponse({ status: 201, description: 'Password reset.' })
  @ApiResponse({ status: 401, description: 'Code wrong, expired or used up.' })
  @Throttle(RESET_PER_IP)
  @Post('reset-with-code')
  async resetWithCode(@Body() dto: ResetWithCodeDto) {
    return this.authService.resetPasswordWithCode(
      dto.username,
      dto.code,
      dto.password,
    );
  }

  @ApiOperation({
    summary: 'Issue a one-time reset code for a student (org manager)',
    description:
      'Returns the code once; only a hash is stored. Students (org `member` role) only. Replaces any earlier code for that student.',
  })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, OrgManagerGuard)
  @Throttle({ default: { limit: 60, ttl: HOUR_MS } })
  @Post('organizations/:id/members/:userId/reset-code')
  async createMemberResetCode(
    @Request() req,
    @Param('id', ParseIntPipe) orgId: number,
    @Param('userId', ParseIntPipe) userId: number,
  ) {
    return this.authService.createMemberResetCode(
      orgId,
      userId,
      req.user.userId,
    );
  }
}
