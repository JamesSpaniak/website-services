import { Controller, Post, UseGuards, Request, Get, Res, Query, HttpStatus, Body } from '@nestjs/common';
import { AuthService } from './auth.service';
import { Response } from 'express';
import { UsersService } from '../users/user.service';
import { JwtAuthGuard } from './jwt-auth.guard';
import { Throttle } from '@nestjs/throttler';
import { ResetPasswordDto } from './types/reset-password.dto';
import { ForgotPasswordDto } from './types/forgot-password.dto';

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
    return user;
  }

  /**
   * Retrieves the profile of the currently authenticated user.
   * @param req The Express request object, containing user details from the JWT.
   * @returns The full user profile.
   */
  @Get('profile')
  @UseGuards(JwtAuthGuard)
  getProfile(@Request() req) {
    return this.usersService.getUserByUsername(req.user.username);
  }

  /**
   * Logs out the user by clearing the JWT cookie.
   * @param response The Express response object to clear the cookie.
   * @returns A success message.
   */
  @Post('logout')
  logout(@Res({ passthrough: true }) response: Response) {
    response.clearCookie('access_token');
    return { message: 'Logged out successfully' };
  }

  /**
   * Initiates the password reset process for a user.
   * This endpoint is rate-limited to prevent abuse.
   * @param forgotPasswordDto DTO containing the user's email.
   * @returns A message indicating that a reset link has been sent if the email exists.
   */
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
  @Throttle({ default: { limit: 3, ttl: 60000 } })
  @Post('reset-password')
  async resetPassword(@Body() resetPasswordDto: ResetPasswordDto) {
    return this.authService.resetPassword(
      resetPasswordDto.token,
      resetPasswordDto.password,
    );
  }
}
