import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { UsersService } from 'src/users/user.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  private readonly logger = new Logger(JwtStrategy.name);

  constructor(
    private usersService: UsersService,
    private configService: ConfigService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_SECRET'),
    });
  }

  async validate(payload: any) {
    this.logger.debug(`JWT validate: sub=${payload.sub}, username=${payload.username}, token_version=${payload.token_version}`);

    const user = await this.usersService.getUserById(payload.sub);
    if (!user) {
      this.logger.warn(`JWT rejected: user not found for sub=${payload.sub}`);
      throw new UnauthorizedException('User not found.');
    }

    if (user.token_version !== payload.token_version) {
      this.logger.warn(`JWT rejected: token_version mismatch for user="${user.username}" (db=${user.token_version}, jwt=${payload.token_version})`);
      throw new UnauthorizedException('Token has been invalidated.');
    }

    return { userId: user.id, username: user.username, role: user.role };
  }
}
