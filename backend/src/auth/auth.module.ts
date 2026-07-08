import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { UsersModule } from '../users/user.module';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';
import { AuthController } from './auth.controller';
import { JwtStrategy } from './jwt.strategy';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { EmailModule } from 'src/email/email.module';
import { OrganizationModule } from 'src/organizations/organization.module';
import { AuditModule } from 'src/audit/audit.module';
import { Session } from './types/session.entity';
import { TypeOrmModule } from '@nestjs/typeorm';

@Module({
  imports: [
    TypeOrmModule.forFeature([Session]),
    UsersModule,
    PassportModule,
    ConfigModule,
    EmailModule,
    OrganizationModule,
    AuditModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET'),
        // Must match ACCESS_TOKEN_MAX_AGE_MS in auth.controller.ts. A shorter
        // JWT than the cookie means every request 401s once the JWT lapses,
        // and concurrent 401s race the rotating refresh token into a forced
        // sign-out ("Session expired") while the cookie still looks valid.
        signOptions: {
          expiresIn: configService.get<string>('JWT_EXPIRES_IN') || '1h',
        },
      }),
      inject: [ConfigService],
    }),
    ThrottlerModule.forRoot([
      {
        ttl: 60000, // 1 minute
        limit: 30, // 30 requests per minute for most routes
      },
    ]),
  ],
  providers: [
    AuthService,
    JwtStrategy,
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
  controllers: [AuthController],
})
export class AuthModule {}
