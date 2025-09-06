import { Controller, Post, UseGuards, Request, Get, Res, Query, HttpStatus } from '@nestjs/common';
import { AuthService } from './auth.service';
import { Response } from 'express';
import { UsersService } from '../users/user.service';
import { JwtStrategy } from './jwt.strategy';
import { JwtAuthGuard } from './jwt-auth.guard';

@Controller('auth')
export class AuthController {
  constructor(
    private authService: AuthService,
    private usersService: UsersService,
  ) {}

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

  @Get('profile')
  @UseGuards(JwtAuthGuard)
  getProfile(@Request() req) {
    return this.usersService.getUserByUsername(req.user.username);
  }

  @Post('logout')
  logout(@Res({ passthrough: true }) response: Response) {
    response.clearCookie('access_token');
    return { message: 'Logged out successfully' };
  }
}

