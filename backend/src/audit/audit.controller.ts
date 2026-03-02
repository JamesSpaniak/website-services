import {
    Controller,
    Get,
    Param,
    ParseIntPipe,
    Query,
    Request,
    UseGuards,
    ForbiddenException,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../users/role.guard';
import { Roles } from '../users/role.decorator';
import { AuditService, DailyMetric, OverviewStats } from './audit.service';
import { AuditLogResponse, UserActivityResponse } from './types/audit.dto';
import { OrganizationService } from '../organizations/organization.service';
import { OrgRole } from '../organizations/types/org-role.enum';
import { Role } from '../users/types/role.enum';

@ApiTags('Audit')
@ApiBearerAuth()
@Controller('audit')
@UseGuards(JwtAuthGuard)
export class AuditController {
    constructor(
        private readonly auditService: AuditService,
        private readonly orgService: OrganizationService,
    ) {}

    @ApiOperation({ summary: "Get the current user's activity history and login streak" })
    @Get('my')
    async getMyActivity(
        @Request() req,
        @Query('limit') limit?: string,
        @Query('offset') offset?: string,
    ): Promise<UserActivityResponse> {
        const userId = req.user.userId;
        const [activity, login_streak] = await Promise.all([
            this.auditService.getUserActivity(userId, parseInt(limit) || 50, parseInt(offset) || 0),
            this.auditService.getLoginStreak(userId),
        ]);
        return { activity, login_streak };
    }

    @ApiOperation({ summary: "Get a student's activity log (manager or admin only)" })
    @Get('users/:userId')
    async getStudentActivity(
        @Request() req,
        @Param('userId', ParseIntPipe) targetUserId: number,
        @Query('limit') limit?: string,
        @Query('offset') offset?: string,
    ): Promise<AuditLogResponse[]> {
        const caller = req.user;

        if (caller.role !== Role.Admin) {
            const callerOrg = await this.orgService.getMyOrganization(caller.userId);
            if (!callerOrg || callerOrg.role !== OrgRole.Manager) {
                throw new ForbiddenException('Only managers can view student activity.');
            }
            const targetOrg = await this.orgService.getMyOrganization(targetUserId);
            if (!targetOrg || targetOrg.id !== callerOrg.id) {
                throw new ForbiddenException('Student is not in your organization.');
            }
        }

        return this.auditService.getUserActivity(targetUserId, parseInt(limit) || 50, parseInt(offset) || 0);
    }

    // ── Admin Analytics ──

    @ApiOperation({ summary: 'Get overview stats for the admin dashboard' })
    @Get('analytics/overview')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(Role.Admin)
    async getOverviewStats(): Promise<OverviewStats> {
        return this.auditService.getOverviewStats();
    }

    @ApiOperation({ summary: 'Get daily metric counts for the last N days' })
    @Get('analytics/daily')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(Role.Admin)
    async getDailyMetrics(@Query('days') days?: string): Promise<DailyMetric[]> {
        return this.auditService.getDailyMetrics(parseInt(days) || 30);
    }
}
