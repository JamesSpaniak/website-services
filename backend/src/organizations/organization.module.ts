import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { Organization } from './types/organization.entity';
import { OrganizationMember } from './types/organization-member.entity';
import { InviteCode } from './types/invite-code.entity';
import { OrganizationController } from './organization.controller';
import { OrganizationService } from './organization.service';
import { OrgManagerGuard } from './org-manager.guard';
import { Progress } from '../progress/types/progress.entity';
import { Course } from '../courses/types/course.entity';
import { User } from '../users/types/user.entity';
import { EmailModule } from '../email/email.module';

@Module({
    imports: [
        TypeOrmModule.forFeature([Organization, OrganizationMember, InviteCode, Progress, Course, User]),
        EmailModule,
        ConfigModule,
    ],
    controllers: [OrganizationController],
    providers: [OrganizationService, OrgManagerGuard],
    exports: [OrganizationService],
})
export class OrganizationModule {}
