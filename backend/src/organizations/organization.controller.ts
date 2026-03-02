import {
    Body,
    Controller,
    Delete,
    Get,
    Param,
    ParseIntPipe,
    Patch,
    Post,
    Query,
    Request,
    UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../users/role.guard';
import { Roles } from '../users/role.decorator';
import { Role } from '../users/types/role.enum';
import { OrgManagerGuard } from './org-manager.guard';
import { OrgRole } from './types/org-role.enum';
import { OrganizationService } from './organization.service';
import {
    CreateOrganizationDto,
    UpdateOrganizationDto,
    GenerateInviteCodeDto,
    BulkGenerateInviteCodesDto,
    AssignCoursesDto,
    UpdateMemberRoleDto,
    AddMemberDto,
    OrganizationResponse,
    OrganizationMemberResponse,
    InviteCodeResponse,
    OrgCourseResponse,
    MemberCourseProgressSummary,
    MemberCourseDetailedProgress,
} from './types/organization.dto';

@ApiTags('Organizations')
@ApiBearerAuth()
@Controller('organizations')
export class OrganizationController {
    constructor(private readonly orgService: OrganizationService) {}

    // ── Authenticated user endpoints (must be above :id routes) ──

    @ApiOperation({ summary: "Get the current user's organization membership" })
    @Get('my')
    @UseGuards(JwtAuthGuard)
    async getMyOrganization(@Request() req) {
        return this.orgService.getMyOrganization(req.user.userId);
    }

    @ApiOperation({ summary: 'Look up an invite code (public info for registration page)' })
    @Get('invite-info')
    async getInviteInfo(@Query('code') code: string) {
        if (!code) return null;
        return this.orgService.getInviteCodeInfo(code);
    }

    // ── Admin endpoints ──

    @ApiOperation({ summary: 'Create a new organization (Admin only)' })
    @Post()
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(Role.Admin)
    async createOrganization(@Body() dto: CreateOrganizationDto): Promise<OrganizationResponse> {
        return this.orgService.createOrganization(dto);
    }

    @ApiOperation({ summary: 'List all organizations (Admin only)' })
    @Get()
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(Role.Admin)
    async getAllOrganizations(): Promise<OrganizationResponse[]> {
        return this.orgService.getAllOrganizations();
    }

    @ApiOperation({ summary: 'Update an organization (Admin only)' })
    @Patch(':id')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(Role.Admin)
    async updateOrganization(
        @Param('id', ParseIntPipe) id: number,
        @Body() dto: UpdateOrganizationDto,
    ): Promise<OrganizationResponse> {
        return this.orgService.updateOrganization(id, dto);
    }

    @ApiOperation({ summary: 'Delete an organization (Admin only)' })
    @Delete(':id')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(Role.Admin)
    async deleteOrganization(@Param('id', ParseIntPipe) id: number): Promise<void> {
        return this.orgService.deleteOrganization(id);
    }

    // ── Manager endpoints ──

    @ApiOperation({ summary: 'Get organization details' })
    @Get(':id')
    @UseGuards(JwtAuthGuard, OrgManagerGuard)
    async getOrganization(@Param('id', ParseIntPipe) id: number): Promise<OrganizationResponse> {
        return this.orgService.getOrganization(id);
    }

    @ApiOperation({ summary: 'List organization members' })
    @Get(':id/members')
    @UseGuards(JwtAuthGuard, OrgManagerGuard)
    async getMembers(@Param('id', ParseIntPipe) id: number): Promise<OrganizationMemberResponse[]> {
        return this.orgService.getMembers(id);
    }

    @ApiOperation({ summary: 'Add an existing user to the organization by email' })
    @Post(':id/members')
    @UseGuards(JwtAuthGuard, OrgManagerGuard)
    async addMember(
        @Param('id', ParseIntPipe) orgId: number,
        @Body() dto: AddMemberDto,
    ): Promise<OrganizationMemberResponse> {
        return this.orgService.addMember(orgId, dto.email, dto.role || OrgRole.Member);
    }

    @ApiOperation({ summary: 'Remove a member from the organization' })
    @Delete(':id/members/:userId')
    @UseGuards(JwtAuthGuard, OrgManagerGuard)
    async removeMember(
        @Param('id', ParseIntPipe) orgId: number,
        @Param('userId', ParseIntPipe) userId: number,
    ): Promise<void> {
        return this.orgService.removeMember(orgId, userId);
    }

    @ApiOperation({ summary: "Reset a member's profile picture (Manager only)" })
    @Delete(':id/members/:userId/picture')
    @UseGuards(JwtAuthGuard, OrgManagerGuard)
    async resetMemberPicture(
        @Param('id', ParseIntPipe) orgId: number,
        @Param('userId', ParseIntPipe) userId: number,
    ): Promise<void> {
        return this.orgService.resetMemberPicture(orgId, userId);
    }

    @ApiOperation({ summary: "Update a member's role" })
    @Patch(':id/members/:userId/role')
    @UseGuards(JwtAuthGuard, OrgManagerGuard)
    async updateMemberRole(
        @Param('id', ParseIntPipe) orgId: number,
        @Param('userId', ParseIntPipe) userId: number,
        @Body() dto: UpdateMemberRoleDto,
    ): Promise<void> {
        return this.orgService.updateMemberRole(orgId, userId, dto.role);
    }

    @ApiOperation({ summary: 'Generate a new invite code' })
    @Post(':id/invite-codes')
    @UseGuards(JwtAuthGuard, OrgManagerGuard)
    async generateInviteCode(
        @Param('id', ParseIntPipe) orgId: number,
        @Request() req,
        @Body() dto: GenerateInviteCodeDto,
    ): Promise<InviteCodeResponse> {
        return this.orgService.generateInviteCode(orgId, req.user.userId, dto);
    }

    @ApiOperation({ summary: 'List invite codes for the organization' })
    @Get(':id/invite-codes')
    @UseGuards(JwtAuthGuard, OrgManagerGuard)
    async getInviteCodes(@Param('id', ParseIntPipe) orgId: number): Promise<InviteCodeResponse[]> {
        return this.orgService.getInviteCodes(orgId);
    }

    @ApiOperation({ summary: 'Bulk generate invite codes and send emails' })
    @Post(':id/invite-codes/bulk')
    @UseGuards(JwtAuthGuard, OrgManagerGuard)
    async bulkGenerateInviteCodes(
        @Param('id', ParseIntPipe) orgId: number,
        @Request() req,
        @Body() dto: BulkGenerateInviteCodesDto,
    ): Promise<InviteCodeResponse[]> {
        return this.orgService.bulkGenerateInviteCodes(orgId, req.user.userId, dto);
    }

    // ── Course assignment endpoints ──

    @ApiOperation({ summary: 'List courses assigned to the organization' })
    @Get(':id/courses')
    @UseGuards(JwtAuthGuard, OrgManagerGuard)
    async getOrgCourses(@Param('id', ParseIntPipe) orgId: number): Promise<OrgCourseResponse[]> {
        return this.orgService.getOrgCourses(orgId);
    }

    @ApiOperation({ summary: 'Assign courses to the organization' })
    @Post(':id/courses')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(Role.Admin)
    async assignCourses(
        @Param('id', ParseIntPipe) orgId: number,
        @Body() dto: AssignCoursesDto,
    ): Promise<OrgCourseResponse[]> {
        return this.orgService.assignCourses(orgId, dto);
    }

    @ApiOperation({ summary: 'Remove a course from the organization' })
    @Delete(':id/courses/:courseId')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(Role.Admin)
    async removeCourse(
        @Param('id', ParseIntPipe) orgId: number,
        @Param('courseId', ParseIntPipe) courseId: number,
    ): Promise<void> {
        return this.orgService.removeCourse(orgId, courseId);
    }

    // ── Progress endpoints ──

    @ApiOperation({ summary: 'Get progress summary for all org members across all courses' })
    @Get(':id/progress')
    @UseGuards(JwtAuthGuard, OrgManagerGuard)
    async getOrgProgress(@Param('id', ParseIntPipe) orgId: number): Promise<MemberCourseProgressSummary[]> {
        return this.orgService.getOrgProgressSummary(orgId);
    }

    @ApiOperation({ summary: 'Get detailed progress for all org members on a specific course' })
    @Get(':id/progress/:courseId')
    @UseGuards(JwtAuthGuard, OrgManagerGuard)
    async getOrgCourseProgress(
        @Param('id', ParseIntPipe) orgId: number,
        @Param('courseId', ParseIntPipe) courseId: number,
    ): Promise<MemberCourseDetailedProgress[]> {
        return this.orgService.getOrgCourseDetailedProgress(orgId, courseId);
    }
}
