import { Controller, Post, UseGuards, Request, Get, Body, UseInterceptors, ClassSerializerInterceptor, NotFoundException, UnauthorizedException, HttpCode, HttpStatus } from '@nestjs/common';
import { AuthService } from './auth.service';
import { UsersService } from '../users/user.service';
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

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(
    private authService: AuthService,
    private usersService: UsersService,
  ) {}

  @ApiOperation({ summary: 'Log in a user', description: 'Authenticates a user and returns tokens and user profile.' })
  @ApiResponse({ status: 200, description: 'Login successful.' })
  @ApiResponse({ status: 401, description: 'Invalid credentials.' })
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() loginCredentialsDto: LoginCredentialsDto) {
    const user = await this.authService.validateUser(loginCredentialsDto.username, loginCredentialsDto.password);
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }
    const tokens = await this.authService.login(user);
    return {
      ...tokens,
      user: plainToInstance(UserFull, user),
    };
  }

  @ApiOperation({ summary: 'Register a new user', description: 'Creates a new account and sends a verification email.' })
  @ApiResponse({ status: 201, description: 'Registration successful. Verification email sent.' })
  @Post('register')
  async register(@Body() registerDto: RegisterDto) {
    return this.authService.registerUser(registerDto);
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
  async refresh(@Body() refreshTokenDto: RefreshTokenDto) {
    return this.authService.refreshAccessToken(refreshTokenDto.refresh_token);
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
    return plainToInstance(UserFull, user);
  }

  @ApiOperation({ summary: 'Log out the current user', description: 'Invalidates the provided refresh token.' })
  @ApiResponse({ status: 200, description: 'Logout successful.' })
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  async logout(@Body() refreshTokenDto: RefreshTokenDto) {
    await this.authService.logout(refreshTokenDto.refresh_token);
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
