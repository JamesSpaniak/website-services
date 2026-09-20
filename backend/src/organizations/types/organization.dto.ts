import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsEmail,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Min,
  ArrayMinSize,
  ValidateIf,
} from 'class-validator';
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

  @ApiPropertyOptional({
    description: 'User ID to assign as the initial manager',
  })
  @IsOptional()
  @IsInt()
  initial_manager_user_id?: number;

  @ApiPropertyOptional({
    description: 'Email of an existing user to assign as the initial manager',
  })
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
  @ApiPropertyOptional({
    description:
      'If provided, the invite email will be sent to this address and the code will be locked to it.',
  })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({ enum: OrgRole, default: OrgRole.Member })
  @IsOptional()
  @IsEnum(OrgRole)
  role?: OrgRole;

  @ApiPropertyOptional({
    description: 'Class the invitee joins on redemption (must belong to org).',
  })
  @IsOptional()
  @IsInt()
  class_id?: number;
}

export class BulkGenerateInviteCodesDto {
  @ApiProperty({
    description: 'List of email addresses to invite',
    type: [String],
  })
  @IsArray()
  @ArrayMinSize(1)
  @IsEmail({}, { each: true })
  emails: string[];

  @ApiPropertyOptional({ enum: OrgRole, default: OrgRole.Member })
  @IsOptional()
  @IsEnum(OrgRole)
  role?: OrgRole;

  @ApiPropertyOptional({
    description: 'Class the invitees join on redemption (must belong to org).',
  })
  @IsOptional()
  @IsInt()
  class_id?: number;
}

export class AssignCoursesDto {
  @ApiProperty({
    description: 'Course IDs to assign to the organization',
    type: [Number],
  })
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

export class CreateOrgClassDto {
  @ApiProperty({ description: 'Class/period name, e.g. "Period 2"' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional({
    description: 'Optional display-only soft cap for this class',
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  max_students?: number;
}

export class UpdateOrgClassDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  name?: string;

  @ApiPropertyOptional({
    description: 'Soft cap; send null to clear',
    nullable: true,
  })
  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsInt()
  @Min(1)
  max_students?: number | null;
}

export class UpdateMemberClassDto {
  @ApiProperty({
    description: 'Class to assign the member to; null to unassign',
    nullable: true,
  })
  @ValidateIf((_, value) => value !== null)
  @IsInt()
  class_id: number | null;
}

export class OrgClassResponse {
  id: number;
  name: string;
  max_students: number | null;
  member_count: number;
  created_at: Date;
}

export class AddMemberDto {
  @ApiProperty({ description: 'Email address of an existing user to add' })
  @IsEmail()
  email: string;

  @ApiPropertyOptional({ enum: OrgRole, default: OrgRole.Member })
  @IsOptional()
  @IsEnum(OrgRole)
  role?: OrgRole;

  @ApiPropertyOptional({
    description: 'Class to place the member in (must belong to org).',
  })
  @IsOptional()
  @IsInt()
  class_id?: number;
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
  class_id: number | null;
  class_name: string | null;
  joined_at: Date;
}

export class InviteCodeResponse {
  id: number;
  code: string;
  role: OrgRole;
  email: string | null;
  class_id: number | null;
  class_name: string | null;
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
  class_id: number | null;
  course_id: number;
  course_title: string;
  status: string;
  units_completed: number;
  units_total: number;
  latest_exam_score: number | null;
  // ── engagement (MP2 / MP5) ──
  started_at: Date | null;
  completed_at: Date | null;
  last_activity_at: Date | null;
  /** Minutes of lesson time in the last 7 days (rollup + today, live). */
  minutes_7d: number;
  videos_completed: number;
  videos_total: number;
  exams_taken: number;
  /** Best submitted quiz/exam score on this course (0–100). */
  best_exam_score: number | null;
  first_exam_score: number | null;
  /** Distinct lesson quizzes with at least one pass (≥70). */
  quizzes_passed: number;
  quizzes_attempted: number;
  /**
   * Gradebook signal: passing | trying | struggling | stopped | browsing | not_trying.
   * See OrgInsightsService.quizEffort.
   */
  effort: string;
}

export class MemberCourseDetailedProgress {
  user_id: number;
  username: string;
  first_name?: string;
  last_name?: string;
  progress: Record<string, unknown> | null;
  /** Per-unit completion timestamps (ISO) keyed by unit ref. */
  unit_completed_at?: Record<string, string>;
  /** Video state keyed by unit ref. */
  videos?: Record<
    string,
    { percent_watched: number; completed: boolean; position_seconds: number }
  >;
  /** Best/latest quiz for this unit, keyed by unit ref (scope_refs[1]). */
  quizzes?: Record<
    string,
    {
      attempts: number;
      best: number;
      latest: number;
      passed: boolean;
      last_submitted_at: string | null;
    }
  >;
  last_activity_at?: Date | null;
}

export class MemberEngagementRow {
  user_id: number;
  username: string;
  first_name?: string;
  last_name?: string;
  class_id: number | null;
  minutes: number;
  lessons_viewed: number;
  videos_completed: number;
  units_completed: number;
  exams_submitted: number;
  active_days: number;
  last_activity_at: Date | null;
}

export class OrgEngagementResponse {
  days: number;
  members: MemberEngagementRow[];
  /** Org-wide minutes per day for the sparkline. */
  series: { day: string; minutes: number; active_members: number }[];
}

export class OrgUtilizationResponse {
  organization_id: number;
  seats_purchased: number;
  members: number;
  invites_sent: number;
  invites_redeemed: number;
  members_activated: number;
  members_engaged_7d: number;
  members_engaged_30d: number;
  members_completed: number;
  avg_pct_complete: number;
  hours_engaged_total: number;
  hours_engaged_30d: number;
  utilization_pct_30d: number;
  courses_assigned: number;
  /** Members who have not been active in the last 14 days (ids). */
  stalled_member_ids: number[];
}

export class MemberTimelineEvent {
  occurred_at: Date;
  event_name: string;
  course_id: number | null;
  course_title: string | null;
  unit_ref: string | null;
  unit_title: string | null;
  properties: Record<string, unknown>;
}

export class MemberQuizAttempt {
  id: number;
  exam_id: number;
  course_id: number;
  course_title: string | null;
  scope: string;
  exam_pool: string | null;
  scope_refs: string[];
  title: string;
  attempt_no: number;
  score: number;
  passed: boolean;
  submitted_at: Date;
  section_breakdown: Record<string, unknown>[] | null;
}

export class MemberQuizSummary {
  course_id: number;
  course_title: string | null;
  scope: string;
  exam_pool: string | null;
  scope_ref: string;
  title: string;
  attempts: number;
  best: number;
  latest: number;
  first: number;
  passed: boolean;
  last_submitted_at: Date;
}

export class MemberQuizHistory {
  effort: string;
  minutes_7d: number;
  exam_starts_30d: number;
  exam_submits_30d: number;
  quizzes: MemberQuizSummary[];
  attempts: MemberQuizAttempt[];
}
