import { Controller, Post, UseGuards, Request, Res, Get, Body, UseInterceptors, ClassSerializerInterceptor, NotFoundException, UnauthorizedException, HttpCode, HttpStatus } from '@nestjs/common';
import { Response } from 'express';
import { AuthService } from './auth.service';
import { UsersService } from '../users/user.service';
import { OrganizationService } from '../organizations/organization.service';
import { JwtAuthGuard } from './jwt-auth.guard';
import { Throttle } from '@nestjs/throttler';
import { ResetPasswordDto } from './types/reset-password.dto';
import { ForgotPasswordDto } from './types/forgot-password.dto';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { UserFull } from 'src/users/types/user.dto';
import { plainToInstance } from 'class-transformer';
import { LoginCredentialsDto } from './types/login-credentials.dto';
import { RefreshTokenDto } from './types/refresh-token.dto';
import { RegisterDto } from './types/register.dto';
import { VerifyEmailDto } from './types/verify-email.dto';
import { AnalyticsService } from '../analytics/analytics.service';

/** Auth cookies are HttpOnly so tokens are unreachable from page JavaScript (XSS). */
export const ACCESS_TOKEN_COOKIE = 'access_token';
export const REFRESH_TOKEN_COOKIE = 'refresh_token';

const ACCESS_TOKEN_MAX_AGE_MS = 60 * 60 * 1000; // 1h — matches JWT_EXPIRES_IN
const REFRESH_TOKEN_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000; // 30d

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
  ) {}

  private setAuthCookies(res: Response, tokens: { access_token: string; refresh_token: string }) {
    res.cookie(ACCESS_TOKEN_COOKIE, tokens.access_token, {
      ...baseCookieOptions(),
      maxAge: ACCESS_TOKEN_MAX_AGE_MS,
    });
    res.cookie(REFRESH_TOKEN_COOKIE, tokens.refresh_token, {
      ...baseCookieOptions(),
      maxAge: REFRESH_TOKEN_MAX_AGE_MS,
    });
  }

  private clearAuthCookies(res: Response) {
    res.clearCookie(ACCESS_TOKEN_COOKIE, baseCookieOptions());
    res.clearCookie(REFRESH_TOKEN_COOKIE, baseCookieOptions());
  }

  @ApiOperation({ summary: 'Log in a user', description: 'Authenticates a user and returns tokens and user profile.' })
  @ApiResponse({ status: 200, description: 'Login successful.' })
  @ApiResponse({ status: 401, description: 'Invalid credentials.' })
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(
    @Body() loginCredentialsDto: LoginCredentialsDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const user = await this.authService.validateUser(loginCredentialsDto.username, loginCredentialsDto.password);
    if (!user) {
      this.analyticsService.recordLoginFailed(loginCredentialsDto.username);
      throw new UnauthorizedException('Invalid credentials');
    }
    const tokens = await this.authService.login(user);
    this.setAuthCookies(res, tokens);
    this.analyticsService.recordLogin(user.id, user.username);
    const userFull = plainToInstance(UserFull, user, { excludeExtraneousValues: true });
    const orgMembership = await this.organizationService.getMyOrganization(user.id);
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

  @ApiOperation({ summary: 'Register a new user', description: 'Creates a new account and sends a verification email.' })
  @ApiResponse({ status: 201, description: 'Registration successful. Verification email sent.' })
  @Post('register')
  async register(@Body() registerDto: RegisterDto) {
    const result = await this.authService.registerUser(registerDto);
    this.analyticsService.recordRegistration(registerDto.username);
    return result;
  }

  @ApiOperation({ summary: 'Verify email address', description: 'Validates email verification token.' })
  @ApiResponse({ status: 200, description: 'Email verified successfully.' })
  @Post('verify-email')
  @HttpCode(HttpStatus.OK)
  async verifyEmail(@Body() verifyEmailDto: VerifyEmailDto) {
    return this.authService.verifyEmail(verifyEmailDto.token);
  }

  @ApiOperation({ summary: 'Refresh access token', description: 'Provides a new access and refresh token.' })
  @ApiResponse({ status: 200, description: 'Token refreshed successfully.' })
  @ApiResponse({ status: 401, description: 'Invalid refresh token.' })
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
  @ApiResponse({ status: 200, description: 'The profile of the currently authenticated user.', type: UserFull })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @UseInterceptors(ClassSerializerInterceptor)
  @Get('profile')
  @UseGuards(JwtAuthGuard)
  async getProfile(@Request() req): Promise<UserFull> {
    const user = await this.usersService.getUserByUsername(req.user.username);
    if (!user) {
      throw new NotFoundException('User from token not found.');
    }
    const userFull = plainToInstance(UserFull, user, { excludeExtraneousValues: true });
    const orgMembership = await this.organizationService.getMyOrganization(user.id);
    if (orgMembership) {
      userFull.organization = orgMembership;
    }
    return userFull;
  }

  @ApiOperation({ summary: 'Log out the current user', description: 'Invalidates the provided refresh token.' })
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

  @ApiOperation({ summary: 'Request a password reset' })
  @ApiResponse({ status: 201, description: 'A message indicating that if the user exists, an email has been sent.' })
  @Throttle({ default: { limit: 3, ttl: 60000 } })
  @Post('forgot-password')
  async forgotPassword(@Body() forgotPasswordDto: ForgotPasswordDto) {
    return this.authService.sendPasswordResetLink(forgotPasswordDto.email);
  }

  @ApiOperation({ summary: 'Reset password with a token' })
  @ApiResponse({ status: 201, description: 'Password has been successfully reset.' })
  @Throttle({ default: { limit: 3, ttl: 60000 } })
  @Post('reset-password')
  async resetPassword(@Body() resetPasswordDto: ResetPasswordDto) {
    return this.authService.resetPassword(
      resetPasswordDto.token,
      resetPasswordDto.password,
    );
  }
}
