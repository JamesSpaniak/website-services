import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuditLog } from './types/audit-log.entity';
import { AuditController } from './audit.controller';
import { AuditService } from './audit.service';
import { OrganizationModule } from '../organizations/organization.module';

@Module({
    imports: [
        TypeOrmModule.forFeature([AuditLog]),
        OrganizationModule,
    ],
    controllers: [AuditController],
    providers: [AuditService],
    exports: [AuditService],
})
export class AuditModule {}
