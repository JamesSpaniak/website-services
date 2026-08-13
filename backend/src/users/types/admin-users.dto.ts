import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayNotEmpty,
  IsArray,
  IsEmail,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { SignupLinkKind } from './signup-link.entity';

// ── Inputs ──────────────────────────────────────────────────────────────────

export class CreateSignupLinkDto {
  @ApiProperty({
    type: [Number],
    description: 'Course IDs granted when the link is redeemed.',
  })
  @IsArray()
  @ArrayNotEmpty()
  @IsInt({ each: true })
  course_ids: number[];

  @ApiPropertyOptional({
    description: 'Lock the link to this email and send it the signup link.',
  })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({
    description: 'Admin label, e.g. "Instagram June promo".',
  })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  note?: string;

  @ApiPropertyOptional({
    description: 'Days until the link expires (default 30).',
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(365)
  expires_in_days?: number;
}

export class GrantCourseDto {
  @ApiProperty()
  @IsInt()
  course_id: number;
}

// ── Responses ───────────────────────────────────────────────────────────────

export type CourseAccessSource = 'purchase' | 'admin_grant' | 'signup_link';

export interface AdminUserCourse {
  id: number;
  title: string;
  source: CourseAccessSource;
  granted_at: string | null;
  granted_by_username: string | null;
  signup_link_id: number | null;
}

export interface AdminUserRow {
  id: number;
  username: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  role: string;
  is_email_verified: boolean;
  submitted_at: string;
  organization: { id: number; name: string; role: string } | null;
  courses: AdminUserCourse[];
}

export interface SignupLinkRow {
  id: number;
  code: string;
  kind: SignupLinkKind;
  email: string | null;
  note: string | null;
  courses: { id: number; title: string }[];
  max_uses: number | null;
  use_count: number;
  created_by_username: string | null;
  used_by_username: string | null;
  used_at: string | null;
  expires_at: string;
  created_at: string;
  status: 'active' | 'used' | 'expired';
}

/** Public shape returned to the register page for a `?signup=` code. */
export interface SignupLinkInfo {
  valid: boolean;
  /** Set when valid=false: 'not_found' | 'expired' | 'used' */
  reason?: string;
  kind?: SignupLinkKind;
  courses?: { id: number; title: string }[];
  /** True when the link is locked to a specific email. */
  email_locked?: boolean;
  expires_at?: string;
}
