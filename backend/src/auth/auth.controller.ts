import { Controller, Post, Query, UnauthorizedException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AccessToken } from './types/login.dto';

@Controller('auth')
export class AuthController {
  constructor(
      private readonly authService: AuthService
  ) {}

  @Post('login')
  async login(
    @Query('username') username: string,
    @Query('password') password: string
  ): Promise<AccessToken> {
    const accessToken = await this.authService.validateUser(username, password);
    if (!accessToken) {
        throw new UnauthorizedException('Invalid user login.');
    }
    
    return {
        access_token: accessToken
    }
  }
}
