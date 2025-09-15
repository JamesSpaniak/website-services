import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { Request } from 'express';

import * as dotenv from 'dotenv';
import { UsersService } from 'src/users/user.service';
dotenv.config();

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private usersService: UsersService) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        (request: Request) => {
          return request?.cookies?.access_token;
        },
      ]),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET,
    });
  }

  async validate(payload: any) {
    const user = await this.usersService.getUserById(payload.sub);
    if (!user) {
      throw new UnauthorizedException('User not found.');
    }

    // If the token version from the JWT does not match the one in the database,
    // it means the token has been invalidated (e.g., by a password change or logout).
    if (user.token_version !== payload.token_version) {
      throw new UnauthorizedException('Token has been invalidated.');
    }

    return { userId: user.id, username: user.username, role: user.role };
  }
}
