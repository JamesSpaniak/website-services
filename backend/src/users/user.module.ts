import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { User } from './types/user.entity';
import { SignupLink } from './types/signup-link.entity';
import { Course } from '../courses/types/course.entity';
import { OrganizationMember } from '../organizations/types/organization-member.entity';
import { UsersController } from './user.controller';
import { UsersService } from './user.service';
import { SignupLinkService } from './signup-link.service';
import { EmailModule } from '../email/email.module';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, SignupLink, Course, OrganizationMember]),
    ConfigModule,
    EmailModule,
    AuditModule,
  ],
  providers: [UsersService, SignupLinkService],
  controllers: [UsersController],
  exports: [UsersService, SignupLinkService],
})
export class UsersModule {}
