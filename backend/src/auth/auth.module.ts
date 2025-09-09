import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { UsersModule } from '../users/user.module'; // Assuming this exists
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';
import { AuthController } from './auth.controller';
import { JwtStrategy } from './jwt.strategy';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';

import * as dotenv from 'dotenv';
import { ConfigModule } from '@nestjs/config';
import { EmailModule } from 'src/email/email.module';
dotenv.config();

@Module({
  imports: [
    // Your other modules
    UsersModule,
    PassportModule,
    ConfigModule,
    EmailModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET,
      signOptions: { expiresIn: '1d' }, // Token expires in 1 day
    }),
    ThrottlerModule.forRoot([{
      ttl: 60000, // 1 minute
      limit: 30,  // 15 requests per minute for most routes
    }]),
  ],
  providers: [
    AuthService, 
    JwtStrategy,
    // Apply the ThrottlerGuard globally to all routes
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
  controllers: [AuthController],
})
export class AuthModule {}
