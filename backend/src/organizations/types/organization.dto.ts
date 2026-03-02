import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsEmail, IsEnum, IsInt, IsNotEmpty, IsOptional, IsString, Min, ArrayMinSize } from 'class-validator';
import { Type } from 'class-transformer';
import { OrgRole } from './org-role.enum';

export class CreateOrganizationDto {
    @ApiProperty()
    @IsString()
    @IsNotEmpty()
    name: string;

    @ApiProperty({ description: 'Number of student seats purchased' })
    @IsInt()
    @Min(1)
    max_students: number;

    @ApiPropertyOptional({ description: 'User ID to assign as the initial manager' })
    @IsOptional()
    @IsInt()
    initial_manager_user_id?: number;

    @ApiPropertyOptional({ description: 'Email of an existing user to assign as the initial manager' })
    @IsOptional()
    @IsEmail()
    initial_manager_email?: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    school_year?: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    semester?: string;
}

export class UpdateOrganizationDto {
    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    @IsNotEmpty()
    name?: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsInt()
    @Min(1)
    max_students?: number;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    school_year?: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    semester?: string;
}

export class GenerateInviteCodeDto {
    @ApiPropertyOptional({ description: 'If provided, the invite email will be sent to this address and the code will be locked to it.' })
    @IsOptional()
    @IsEmail()
    email?: string;

    @ApiPropertyOptional({ enum: OrgRole, default: OrgRole.Member })
    @IsOptional()
    @IsEnum(OrgRole)
    role?: OrgRole;
}

export class BulkGenerateInviteCodesDto {
    @ApiProperty({ description: 'List of email addresses to invite', type: [String] })
    @IsArray()
    @ArrayMinSize(1)
    @IsEmail({}, { each: true })
    emails: string[];

    @ApiPropertyOptional({ enum: OrgRole, default: OrgRole.Member })
    @IsOptional()
    @IsEnum(OrgRole)
    role?: OrgRole;
}

export class AssignCoursesDto {
    @ApiProperty({ description: 'Course IDs to assign to the organization', type: [Number] })
    @IsArray()
    @ArrayMinSize(1)
    @IsInt({ each: true })
    @Type(() => Number)
    course_ids: number[];
}

export class UpdateMemberRoleDto {
    @ApiProperty({ enum: OrgRole })
    @IsEnum(OrgRole)
    role: OrgRole;
}

export class AddMemberDto {
    @ApiProperty({ description: 'Email address of an existing user to add' })
    @IsEmail()
    email: string;

    @ApiPropertyOptional({ enum: OrgRole, default: OrgRole.Member })
    @IsOptional()
    @IsEnum(OrgRole)
    role?: OrgRole;
}

export class OrganizationResponse {
    id: number;
    name: string;
    max_students: number;
    member_count: number;
    manager_count: number;
    school_year: string | null;
    semester: string | null;
    course_count: number;
    created_at: Date;
}

export class OrganizationMemberResponse {
    id: number;
    user_id: number;
    username: string;
    email: string;
    first_name?: string;
    last_name?: string;
    role: OrgRole;
    joined_at: Date;
}

export class InviteCodeResponse {
    id: number;
    code: string;
    role: OrgRole;
    email: string | null;
    used: boolean;
    used_by_username: string | null;
    expires_at: Date;
    created_at: Date;
}

export class OrgCourseResponse {
    id: number;
    title: string;
}

export class MemberCourseProgressSummary {
    user_id: number;
    username: string;
    first_name?: string;
    last_name?: string;
    course_id: number;
    course_title: string;
    status: string;
    units_completed: number;
    units_total: number;
    latest_exam_score: number | null;
}

export class MemberCourseDetailedProgress {
    user_id: number;
    username: string;
    first_name?: string;
    last_name?: string;
    progress: Record<string, unknown> | null;
}
