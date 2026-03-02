import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, In } from 'typeorm';
import { Organization } from './types/organization.entity';
import { OrganizationMember } from './types/organization-member.entity';
import { InviteCode } from './types/invite-code.entity';
import { OrgRole } from './types/org-role.enum';
import { User } from '../users/types/user.entity';
import { Progress } from '../progress/types/progress.entity';
import { Course } from '../courses/types/course.entity';
import { CourseDetails, ProgressStatus, UnitData } from '../courses/types/course.dto';
import { EmailService } from '../email/email.service';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import {
    OrganizationResponse,
    OrganizationMemberResponse,
    InviteCodeResponse,
    OrgCourseResponse,
    MemberCourseProgressSummary,
    MemberCourseDetailedProgress,
    CreateOrganizationDto,
    UpdateOrganizationDto,
    GenerateInviteCodeDto,
    BulkGenerateInviteCodesDto,
    AssignCoursesDto,
} from './types/organization.dto';

@Injectable()
export class OrganizationService {
    private readonly logger = new Logger(OrganizationService.name);

    constructor(
        @InjectRepository(Organization)
        private orgRepository: Repository<Organization>,
        @InjectRepository(OrganizationMember)
        private memberRepository: Repository<OrganizationMember>,
        @InjectRepository(InviteCode)
        private inviteCodeRepository: Repository<InviteCode>,
        @InjectRepository(Progress)
        private progressRepository: Repository<Progress>,
        @InjectRepository(Course)
        private courseRepository: Repository<Course>,
        @InjectRepository(User)
        private userRepository: Repository<User>,
        private dataSource: DataSource,
        private emailService: EmailService,
        private configService: ConfigService,
    ) {}

    // ── Admin CRUD ──

    async createOrganization(dto: CreateOrganizationDto): Promise<OrganizationResponse> {
        const existing = await this.orgRepository.findOne({ where: { name: dto.name } });
        if (existing) {
            throw new BadRequestException('An organization with this name already exists.');
        }

        let initialManager: User | null = null;
        if (dto.initial_manager_user_id) {
            initialManager = await this.userRepository.findOne({ where: { id: dto.initial_manager_user_id } });
            if (!initialManager) {
                throw new BadRequestException(`User with ID ${dto.initial_manager_user_id} not found.`);
            }
        } else if (dto.initial_manager_email) {
            initialManager = await this.userRepository.findOne({ where: { email: dto.initial_manager_email } });
            if (!initialManager) {
                throw new BadRequestException(`User with email ${dto.initial_manager_email} not found.`);
            }
        }

        if (initialManager) {
            const existingMembership = await this.memberRepository.findOne({
                where: { userId: initialManager.id },
            });
            if (existingMembership) {
                throw new BadRequestException(
                    `User "${initialManager.username}" is already a member of another organization.`,
                );
            }
        }

        const org = this.orgRepository.create({
            name: dto.name,
            max_students: dto.max_students,
            school_year: dto.school_year || null,
            semester: dto.semester || null,
        });
        const saved = await this.orgRepository.save(org);

        let managerCount = 0;
        if (initialManager) {
            const membership = this.memberRepository.create({
                organizationId: saved.id,
                userId: initialManager.id,
                role: OrgRole.Manager,
            });
            await this.memberRepository.save(membership);
            managerCount = 1;
        }

        return this.toOrgResponse(saved, 0, managerCount, 0);
    }

    async getAllOrganizations(): Promise<OrganizationResponse[]> {
        const orgs = await this.orgRepository.find({ order: { created_at: 'DESC' } });
        const results: OrganizationResponse[] = [];

        for (const org of orgs) {
            const [memberCount, managerCount, courseCount] = await Promise.all([
                this.memberRepository.count({ where: { organizationId: org.id, role: OrgRole.Member } }),
                this.memberRepository.count({ where: { organizationId: org.id, role: OrgRole.Manager } }),
                this.getOrgCourseCount(org.id),
            ]);
            results.push(this.toOrgResponse(org, memberCount, managerCount, courseCount));
        }

        return results;
    }

    async getOrganization(id: number): Promise<OrganizationResponse> {
        const org = await this.orgRepository.findOne({ where: { id } });
        if (!org) throw new NotFoundException('Organization not found.');

        const [memberCount, managerCount, courseCount] = await Promise.all([
            this.memberRepository.count({ where: { organizationId: id, role: OrgRole.Member } }),
            this.memberRepository.count({ where: { organizationId: id, role: OrgRole.Manager } }),
            this.getOrgCourseCount(id),
        ]);
        return this.toOrgResponse(org, memberCount, managerCount, courseCount);
    }

    async updateOrganization(id: number, dto: UpdateOrganizationDto): Promise<OrganizationResponse> {
        const org = await this.orgRepository.findOne({ where: { id } });
        if (!org) throw new NotFoundException('Organization not found.');

        if (dto.max_students !== undefined) {
            const currentMemberCount = await this.memberRepository.count({
                where: { organizationId: id, role: OrgRole.Member },
            });
            if (dto.max_students < currentMemberCount) {
                throw new BadRequestException(
                    `Cannot set max_students to ${dto.max_students}. There are currently ${currentMemberCount} active student members.`,
                );
            }
        }

        if (dto.name !== undefined) org.name = dto.name;
        if (dto.max_students !== undefined) org.max_students = dto.max_students;
        if (dto.school_year !== undefined) org.school_year = dto.school_year;
        if (dto.semester !== undefined) org.semester = dto.semester;

        const saved = await this.orgRepository.save(org);
        const [memberCount, managerCount, courseCount] = await Promise.all([
            this.memberRepository.count({ where: { organizationId: id, role: OrgRole.Member } }),
            this.memberRepository.count({ where: { organizationId: id, role: OrgRole.Manager } }),
            this.getOrgCourseCount(id),
        ]);
        return this.toOrgResponse(saved, memberCount, managerCount, courseCount);
    }

    async deleteOrganization(id: number): Promise<void> {
        const org = await this.orgRepository.findOne({ where: { id } });
        if (!org) throw new NotFoundException('Organization not found.');
        await this.orgRepository.remove(org);
    }

    // ── Members ──

    async getMembers(orgId: number): Promise<OrganizationMemberResponse[]> {
        const members = await this.memberRepository.find({
            where: { organizationId: orgId },
            relations: ['user'],
            order: { joinedAt: 'ASC' },
        });

        return members.map((m) => ({
            id: m.id,
            user_id: m.userId,
            username: m.user.username,
            email: m.user.email,
            first_name: m.user.first_name,
            last_name: m.user.last_name,
            role: m.role,
            joined_at: m.joinedAt,
        }));
    }

    async addMember(orgId: number, email: string, role: OrgRole): Promise<OrganizationMemberResponse> {
        const org = await this.orgRepository.findOne({ where: { id: orgId } });
        if (!org) throw new NotFoundException('Organization not found.');

        const user = await this.userRepository.findOne({ where: { email } });
        if (!user) {
            throw new BadRequestException(`No user found with email "${email}".`);
        }

        const existingMembership = await this.memberRepository.findOne({ where: { userId: user.id } });
        if (existingMembership) {
            if (existingMembership.organizationId === orgId) {
                throw new BadRequestException(`${user.username} is already a member of this organization.`);
            }
            throw new BadRequestException(`${user.username} is already a member of another organization.`);
        }

        if (role === OrgRole.Member) {
            await this.assertSeatAvailable(org);
        }

        const membership = this.memberRepository.create({
            organizationId: orgId,
            userId: user.id,
            role,
        });
        const saved = await this.memberRepository.save(membership);

        return {
            id: saved.id,
            user_id: user.id,
            username: user.username,
            email: user.email,
            first_name: user.first_name,
            last_name: user.last_name,
            role: saved.role,
            joined_at: saved.joinedAt,
        };
    }

    async removeMember(orgId: number, userId: number): Promise<void> {
        const member = await this.memberRepository.findOne({
            where: { organizationId: orgId, userId },
        });
        if (!member) throw new NotFoundException('Member not found in this organization.');

        if (member.role === OrgRole.Manager) {
            const managerCount = await this.memberRepository.count({
                where: { organizationId: orgId, role: OrgRole.Manager },
            });
            if (managerCount <= 1) {
                throw new BadRequestException('Cannot remove the last manager. Promote another member first.');
            }
        }

        await this.memberRepository.remove(member);
    }

    async updateMemberRole(orgId: number, userId: number, newRole: OrgRole): Promise<void> {
        const member = await this.memberRepository.findOne({
            where: { organizationId: orgId, userId },
        });
        if (!member) throw new NotFoundException('Member not found in this organization.');

        if (member.role === OrgRole.Manager && newRole === OrgRole.Member) {
            const managerCount = await this.memberRepository.count({
                where: { organizationId: orgId, role: OrgRole.Manager },
            });
            if (managerCount <= 1) {
                throw new BadRequestException('Cannot demote the last manager. Promote another member first.');
            }
        }

        member.role = newRole;
        await this.memberRepository.save(member);
    }

    // ── Invite Codes ──

    async generateInviteCode(
        orgId: number,
        createdByUserId: number,
        dto: GenerateInviteCodeDto,
    ): Promise<InviteCodeResponse> {
        const org = await this.orgRepository.findOne({ where: { id: orgId } });
        if (!org) throw new NotFoundException('Organization not found.');

        const role = dto.role || OrgRole.Member;

        if (role === OrgRole.Member) {
            await this.assertSeatAvailable(org);
        }

        const code = this.generateRandomCode();
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 30);

        const inviteCode = this.inviteCodeRepository.create({
            organizationId: orgId,
            code,
            role,
            email: dto.email || null,
            createdByUserId,
            expiresAt,
        });
        const saved = await this.inviteCodeRepository.save(inviteCode);

        if (dto.email) {
            const frontendUrl = this.configService.get<string>('FRONTEND_URL');
            const signUpLink = `${frontendUrl}/register?code=${code}`;
            await this.emailService.sendOrganizationInvite(dto.email, org.name, signUpLink, role);
        }

        return this.toInviteCodeResponse(saved);
    }

    async getInviteCodes(orgId: number): Promise<InviteCodeResponse[]> {
        const codes = await this.inviteCodeRepository.find({
            where: { organizationId: orgId },
            relations: ['usedBy'],
            order: { createdAt: 'DESC' },
        });
        return codes.map((c) => this.toInviteCodeResponse(c));
    }

    async validateAndConsumeInviteCode(
        code: string,
        userId: number,
        userEmail: string,
    ): Promise<{ organizationId: number; role: OrgRole }> {
        return this.dataSource.transaction(async (manager) => {
            const inviteCode = await manager.findOne(InviteCode, {
                where: { code },
                relations: ['organization'],
            });

            if (!inviteCode) {
                throw new BadRequestException('Invalid invite code.');
            }
            if (inviteCode.usedByUserId) {
                throw new BadRequestException('This invite code has already been used.');
            }
            if (inviteCode.expiresAt < new Date()) {
                throw new BadRequestException('This invite code has expired.');
            }
            if (inviteCode.email && inviteCode.email.toLowerCase() !== userEmail.toLowerCase()) {
                throw new BadRequestException('This invite code was issued for a different email address.');
            }

            const org = inviteCode.organization;

            if (inviteCode.role === OrgRole.Member) {
                const currentStudentCount = await manager.count(OrganizationMember, {
                    where: { organizationId: org.id, role: OrgRole.Member },
                });
                if (currentStudentCount >= org.max_students) {
                    throw new BadRequestException('This organization has reached its student seat limit.');
                }
            }

            const existingMembership = await manager.findOne(OrganizationMember, {
                where: { userId },
            });
            if (existingMembership) {
                throw new BadRequestException('You are already a member of an organization.');
            }

            inviteCode.usedByUserId = userId;
            inviteCode.usedAt = new Date();
            await manager.save(InviteCode, inviteCode);

            const membership = manager.create(OrganizationMember, {
                organizationId: org.id,
                userId,
                role: inviteCode.role,
            });
            await manager.save(OrganizationMember, membership);

            return { organizationId: org.id, role: inviteCode.role };
        });
    }

    // ── My Organization ──

    async getMyOrganization(userId: number): Promise<{ id: number; name: string; role: OrgRole } | null> {
        const membership = await this.memberRepository.findOne({
            where: { userId },
            relations: ['organization'],
        });
        if (!membership) return null;
        return {
            id: membership.organization.id,
            name: membership.organization.name,
            role: membership.role,
        };
    }

    async isOrgMember(userId: number): Promise<boolean> {
        const count = await this.memberRepository.count({ where: { userId } });
        return count > 0;
    }

    // ── Invite Code Lookup (for registration page) ──

    async getInviteCodeInfo(code: string): Promise<{ organization_name: string; role: OrgRole } | null> {
        const inviteCode = await this.inviteCodeRepository.findOne({
            where: { code },
            relations: ['organization'],
        });
        if (!inviteCode || inviteCode.usedByUserId || inviteCode.expiresAt < new Date()) {
            return null;
        }
        return {
            organization_name: inviteCode.organization.name,
            role: inviteCode.role,
        };
    }

    // ── Progress Viewing ──

    async getOrgProgressSummary(orgId: number): Promise<MemberCourseProgressSummary[]> {
        const members = await this.memberRepository.find({
            where: { organizationId: orgId },
            relations: ['user'],
        });
        const memberUserIds = members.map((m) => m.userId);
        if (memberUserIds.length === 0) return [];

        const courses = await this.courseRepository.find();

        // Only select summary columns -- never load the JSONB payload.
        // p.id is required for getMany() to properly hydrate distinct entities.
        const allProgress = await this.progressRepository
            .createQueryBuilder('p')
            .select(['p.id', 'p.userId', 'p.courseId', 'p.status', 'p.units_completed', 'p.units_total', 'p.latest_exam_score'])
            .where('p.userId IN (:...userIds)', { userIds: memberUserIds })
            .getMany();

        const progressMap = new Map<string, Progress>();
        for (const p of allProgress) {
            progressMap.set(`${p.userId}-${p.courseId}`, p);
        }

        // Pre-compute units_total per course for members who have no progress row yet
        const courseUnitCounts = new Map<number, number>();
        for (const course of courses) {
            if (course.hidden) continue;
            try {
                const parsed: CourseDetails = JSON.parse(course.payload);
                let total = 0;
                if (parsed.units) {
                    this.countUnits(parsed.units, () => { total++; });
                }
                courseUnitCounts.set(course.id, total);
            } catch {
                courseUnitCounts.set(course.id, 0);
            }
        }

        const results: MemberCourseProgressSummary[] = [];

        for (const member of members) {
            for (const course of courses) {
                if (course.hidden) continue;
                const progress = progressMap.get(`${member.userId}-${course.id}`);

                results.push({
                    user_id: member.userId,
                    username: member.user.username,
                    first_name: member.user.first_name,
                    last_name: member.user.last_name,
                    course_id: course.id,
                    course_title: course.title,
                    status: progress?.status || ProgressStatus.NOT_STARTED,
                    units_completed: progress?.units_completed ?? 0,
                    units_total: progress?.units_total ?? (courseUnitCounts.get(course.id) || 0),
                    latest_exam_score: progress?.latest_exam_score ?? null,
                });
            }
        }

        return results;
    }

    async getOrgCourseDetailedProgress(orgId: number, courseId: number): Promise<MemberCourseDetailedProgress[]> {
        const members = await this.memberRepository.find({
            where: { organizationId: orgId },
            relations: ['user'],
        });
        const memberUserIds = members.map((m) => m.userId);
        if (memberUserIds.length === 0) return [];

        const course = await this.courseRepository.findOne({ where: { id: courseId } });
        if (!course) throw new NotFoundException('Course not found.');

        const coursePayload: CourseDetails = JSON.parse(course.payload);

        const allProgress = await this.progressRepository
            .createQueryBuilder('p')
            .where('p.userId IN (:...userIds)', { userIds: memberUserIds })
            .andWhere('p.courseId = :courseId', { courseId })
            .getMany();

        const progressMap = new Map<number, Progress>();
        for (const p of allProgress) {
            progressMap.set(p.userId, p);
        }

        return members.map((member) => {
            const progress = progressMap.get(member.userId);
            let mergedPayload: CourseDetails | null = null;

            if (progress) {
                mergedPayload = progress.payload as CourseDetails;
                mergedPayload.id = courseId;
            }

            return {
                user_id: member.userId,
                username: member.user.username,
                first_name: member.user.first_name,
                last_name: member.user.last_name,
                progress: mergedPayload as unknown as Record<string, unknown>,
            };
        });
    }

    // ── Bulk Invites ──

    async bulkGenerateInviteCodes(
        orgId: number,
        createdByUserId: number,
        dto: BulkGenerateInviteCodesDto,
    ): Promise<InviteCodeResponse[]> {
        const org = await this.orgRepository.findOne({ where: { id: orgId } });
        if (!org) throw new NotFoundException('Organization not found.');

        const role = dto.role || OrgRole.Member;

        if (role === OrgRole.Member) {
            const currentStudentCount = await this.memberRepository.count({
                where: { organizationId: org.id, role: OrgRole.Member },
            });
            const availableSeats = org.max_students - currentStudentCount;
            if (dto.emails.length > availableSeats) {
                throw new BadRequestException(
                    `Not enough seats. Available: ${availableSeats}, requested: ${dto.emails.length}.`,
                );
            }
        }

        const results: InviteCodeResponse[] = [];
        const frontendUrl = this.configService.get<string>('FRONTEND_URL');

        for (const email of dto.emails) {
            const code = this.generateRandomCode();
            const expiresAt = new Date();
            expiresAt.setDate(expiresAt.getDate() + 30);

            const inviteCode = this.inviteCodeRepository.create({
                organizationId: orgId,
                code,
                role,
                email,
                createdByUserId,
                expiresAt,
            });
            const saved = await this.inviteCodeRepository.save(inviteCode);

            const signUpLink = `${frontendUrl}/register?code=${code}`;
            await this.emailService.sendOrganizationInvite(email, org.name, signUpLink, role);

            results.push(this.toInviteCodeResponse(saved));
        }

        return results;
    }

    // ── Organization Courses ──

    async assignCourses(orgId: number, dto: AssignCoursesDto): Promise<OrgCourseResponse[]> {
        const org = await this.orgRepository.findOne({
            where: { id: orgId },
            relations: ['courses'],
        });
        if (!org) throw new NotFoundException('Organization not found.');

        const courses = await this.courseRepository.find({
            where: { id: In(dto.course_ids) },
        });

        if (courses.length !== dto.course_ids.length) {
            const foundIds = courses.map((c) => c.id);
            const missing = dto.course_ids.filter((id) => !foundIds.includes(id));
            throw new BadRequestException(`Courses not found: ${missing.join(', ')}`);
        }

        const existingIds = new Set(org.courses.map((c) => c.id));
        for (const course of courses) {
            if (!existingIds.has(course.id)) {
                org.courses.push(course);
            }
        }

        await this.orgRepository.save(org);
        return org.courses.map((c) => ({ id: c.id, title: c.title }));
    }

    async removeCourse(orgId: number, courseId: number): Promise<void> {
        const org = await this.orgRepository.findOne({
            where: { id: orgId },
            relations: ['courses'],
        });
        if (!org) throw new NotFoundException('Organization not found.');

        org.courses = org.courses.filter((c) => c.id !== courseId);
        await this.orgRepository.save(org);
    }

    async getOrgCourses(orgId: number): Promise<OrgCourseResponse[]> {
        const org = await this.orgRepository.findOne({
            where: { id: orgId },
            relations: ['courses'],
        });
        if (!org) throw new NotFoundException('Organization not found.');

        return org.courses.map((c) => ({ id: c.id, title: c.title }));
    }

    async hasOrgCourseAccess(userId: number, courseId: number): Promise<boolean> {
        const membership = await this.memberRepository.findOne({
            where: { userId },
        });
        if (!membership) return false;

        const org = await this.orgRepository.findOne({
            where: { id: membership.organizationId },
            relations: ['courses'],
        });
        if (!org) return false;

        return org.courses.some((c) => c.id === courseId);
    }

    // ── Helpers ──

    private async assertSeatAvailable(org: Organization): Promise<void> {
        const currentStudentCount = await this.memberRepository.count({
            where: { organizationId: org.id, role: OrgRole.Member },
        });
        if (currentStudentCount >= org.max_students) {
            throw new BadRequestException(
                `Organization has reached its student seat limit (${org.max_students}).`,
            );
        }
    }

    private generateRandomCode(): string {
        return crypto.randomBytes(6).toString('base64url').slice(0, 8).toUpperCase();
    }

    private async getOrgCourseCount(orgId: number): Promise<number> {
        const org = await this.orgRepository.findOne({
            where: { id: orgId },
            relations: ['courses'],
        });
        return org?.courses?.length ?? 0;
    }

    private toOrgResponse(org: Organization, memberCount: number, managerCount: number, courseCount: number): OrganizationResponse {
        return {
            id: org.id,
            name: org.name,
            max_students: org.max_students,
            member_count: memberCount,
            manager_count: managerCount,
            school_year: org.school_year,
            semester: org.semester,
            course_count: courseCount,
            created_at: org.created_at,
        };
    }

    private toInviteCodeResponse(code: InviteCode): InviteCodeResponse {
        return {
            id: code.id,
            code: code.code,
            role: code.role,
            email: code.email,
            used: !!code.usedByUserId,
            used_by_username: code.usedBy?.username || null,
            expires_at: code.expiresAt,
            created_at: code.createdAt,
        };
    }

    async resetMemberPicture(orgId: number, userId: number): Promise<void> {
        const membership = await this.memberRepository.findOne({
            where: { organizationId: orgId, userId },
        });
        if (!membership) {
            throw new NotFoundException('Member not found in this organization.');
        }
        await this.userRepository.update(userId, { picture_url: null });
    }

    private countUnits(units: UnitData[], callback: (unit: UnitData, depth: number) => void, depth = 0): void {
        for (const unit of units) {
            callback(unit, depth);
            if (unit.sub_units) {
                this.countUnits(unit.sub_units, callback, depth + 1);
            }
        }
    }
}
