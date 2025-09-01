import { Module } from '@nestjs/common';
import { UsersModule } from 'src/users/user.module';
import { AuthController } from './auth.controller';
import { AuthMiddleware } from './auth.middleware';
import { AuthService } from './auth.service';
import { ScheduleModule } from '@nestjs/schedule';

@Module({
  imports: [
    UsersModule,
    ScheduleModule.forRoot()
  ],
  providers: [AuthService, AuthMiddleware],
  controllers: [AuthController],
  exports: [AuthService, AuthMiddleware]
})
export class AuthModule {}
