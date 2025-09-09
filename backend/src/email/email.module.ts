import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { EmailController } from './email.controller';
import { EmailService } from './email.service';
import { UsersModule } from '../users/user.module';

@Module({
  imports: [
    UsersModule, // To access UsersService
    ConfigModule, // To access .env variables
    JwtModule.registerAsync({
      imports: [
        ConfigModule,
      ],
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_RESET_SECRET'),
        signOptions: { expiresIn: configService.get<string>('JWT_RESET_EXPIRES_IN') },
      }),
    }),
  ],
  controllers: [EmailController],
  providers: [EmailService],
  exports: [EmailService]
})
export class EmailModule {}