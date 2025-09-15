import { Controller, Post, UseGuards, Request, Get, Res, Query, HttpStatus, Body, UseInterceptors, ClassSerializerInterceptor, NotFoundException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { Response } from 'express';
import { UsersService } from '../users/user.service';
import { JwtAuthGuard } from './jwt-auth.guard';
import { Throttle } from '@nestjs/throttler';
import { ResetPasswordDto } from './types/reset-password.dto';
import { ForgotPasswordDto } from './types/forgot-password.dto';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { UserFull } from 'src/users/types/user.dto';
import { plainToInstance } from 'class-transformer';

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(
    private authService: AuthService,
    // UsersService is no longer needed here for profile, as it's handled by the guard/strategy
    private usersService: UsersService,
  ) {}

  /**
   * Authenticates a user and sets a JWT cookie.
   * @param username The user's username.
   * @param password The user's password.
   * @param response The Express response object to set the cookie.
   * @returns The user's profile on success, or an error message on failure.
   */
  @ApiOperation({ summary: 'Log in a user', description: 'Authenticates a user with username and password, and sets an httpOnly access_token cookie.' })
  @ApiQuery({ name: 'username', type: String, required: true })
  @ApiQuery({ name: 'password', type: String, required: true })
  @ApiResponse({ status: 201, description: 'Login successful, returns user profile.', type: UserFull })
  @ApiResponse({ status: 401, description: 'Invalid credentials.' })
  @Post('login')
  async login(
    @Query('username') username: string,
    @Query('password') password: string,
    @Res({ passthrough: true }) response: Response,
  ) {
    const user = await this.authService.validateUser(username, password);
    if (!user) {
      response.status(HttpStatus.UNAUTHORIZED);
      return { message: 'Invalid credentials' };
    }
    const { access_token } = await this.authService.login(user);
    response.cookie('access_token', access_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV !== 'development',
      sameSite: 'lax',
      expires: new Date(Date.now() + 1000 * 60 * 60 * 24), // 1 day
    });
    // Return a safe DTO, not the raw user object from validateUser
    return plainToInstance(UserFull, user);
  }

  /**
   * Retrieves the profile of the currently authenticated user.
   * @param req The Express request object, containing user details from the JWT.
   * @returns The full user profile.
   */
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

  /**
   * Logs out the user by clearing the JWT cookie.
   * @param response The Express response object to clear the cookie.
   * @returns A success message.
   */
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Log out the current user', description: 'Clears the httpOnly access_token cookie.' })
  @ApiResponse({ status: 201, description: 'Logout successful.' })
  @Post('logout')
  async logout(@Request() req, @Res({ passthrough: true }) response: Response) {
    await this.authService.logout(req.user.userId);
    response.clearCookie('access_token');
    return { message: 'Logged out successfully' };
  }

  /**
   * Initiates the password reset process for a user.
   * This endpoint is rate-limited to prevent abuse.
   * @param forgotPasswordDto DTO containing the user's email.
   * @returns A message indicating that a reset link has been sent if the email exists.
   */
  @ApiOperation({ summary: 'Request a password reset' })
  @ApiResponse({ status: 201, description: 'A message indicating that if the user exists, an email has been sent.' })
  @Throttle({ default: { limit: 3, ttl: 60000 } }) // Override global limit: 3 requests per minute
  @Post('forgot-password')
  async forgotPassword(@Body() forgotPasswordDto: ForgotPasswordDto) {
    return this.authService.sendPasswordResetLink(forgotPasswordDto.email);
  }

  /**
   * Resets a user's password using a token from the password reset email.
   * This endpoint is rate-limited.
   * @param resetPasswordDto DTO containing the reset token and the new password.
   * @returns A success message.
   */
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
