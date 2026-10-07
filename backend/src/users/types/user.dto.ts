import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Expose, Transform } from 'class-transformer';
import {
  IsEmail,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsDate,
  IsArray,
  IsNumber,
  IsUrl,
} from 'class-validator';
import { Role } from './role.enum';

export const THEME_PREFERENCES = ['light', 'dark', 'system'] as const;
export type ThemePreference = (typeof THEME_PREFERENCES)[number];

export class UserSlim {
  @ApiProperty()
  @Expose()
  @IsString()
  username: string;

  @ApiPropertyOptional()
  @Expose()
  @IsOptional()
  @IsString()
  first_name?: string;

  @ApiPropertyOptional()
  @Expose()
  @IsOptional()
  @IsString()
  last_name?: string;

  @ApiPropertyOptional()
  @Expose()
  @IsOptional()
  @IsString()
  picture_url?: string;
}

export class UserFull extends UserSlim {
  @ApiProperty()
  @Expose()
  @IsNumber()
  id: number;

  @ApiProperty()
  @Expose()
  @IsEmail()
  email: string;

  @ApiProperty({ enum: Role })
  @Expose()
  role: Role;

  @ApiProperty()
  @Expose()
  @Transform(({ obj }) => obj.is_email_verified ?? false)
  email_verified: boolean;

  @ApiPropertyOptional()
  @Expose()
  @IsOptional()
  pro_membership_expires_at?: Date;

  @ApiPropertyOptional({ type: [String] })
  @Expose()
  @IsArray()
  courses?: string[];

  @ApiProperty()
  @Expose()
  submitted_at?: Date;

  @ApiProperty()
  @Expose()
  updated_at?: Date;

  @ApiPropertyOptional({
    description: 'Organization membership info, if the user belongs to one.',
  })
  @Expose()
  @IsOptional()
  organization?: { id: number; name: string; role: string };

  @ApiPropertyOptional({
    enum: THEME_PREFERENCES,
    nullable: true,
    description: 'Saved site color theme; null when the user never chose one.',
  })
  @Expose()
  theme_preference?: ThemePreference | null;
}

export class UserDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  username: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  password: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  first_name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  last_name?: string;

  @ApiProperty()
  @IsEmail()
  email: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  picture_url?: string;
}

export class UpdateUserDto {
  @ApiPropertyOptional({ description: "User's email address." })
  @IsOptional()
  @IsString()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({ description: "User's first name." })
  @IsOptional()
  @IsString()
  first_name?: string;

  @ApiPropertyOptional({ description: "User's last name." })
  @IsOptional()
  @IsString()
  last_name?: string;

  @ApiPropertyOptional({ description: "URL of the user's profile picture." })
  @IsOptional()
  @IsUrl()
  picture_url?: string;
}

/** Display preferences — saved without bumping token_version (no sign-out). */
export class UpdatePreferencesDto {
  @ApiProperty({ enum: THEME_PREFERENCES, description: 'Site color theme.' })
  @IsIn(THEME_PREFERENCES)
  theme_preference: ThemePreference;
}

export class ResetPictureDto {
  picture_url: null;
}
