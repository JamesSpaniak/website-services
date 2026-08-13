import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Expose, Type } from 'class-transformer';
import {
  Allow,
  IsString,
  IsOptional,
  IsEnum,
  ValidateNested,
  IsArray,
  registerDecorator,
  ValidationOptions,
} from 'class-validator';

/**
 * Accepts string OR number values. Stored payloads use string refs, but
 * legacy course JSON uploads still carry numeric unit ids; the save path
 * normalizes them to string refs (see course-unit.util.ts).
 */
function IsStringOrNumber(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'isStringOrNumber',
      target: object.constructor,
      propertyName,
      options: validationOptions,
      validator: {
        validate: (value: unknown) =>
          typeof value === 'string' || typeof value === 'number',
        defaultMessage: () => `${propertyName} must be a string or a number`,
      },
    });
  };
}

export enum ProgressStatus {
  NOT_STARTED = 'NOT_STARTED',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
}

// --- DTO Classes for Swagger and class-transformer ---

export class UnitData {
  /**
   * Stable string ref, unique across the whole course tree (e.g. "u101" or
   * a UUID from the editor). Legacy payloads may still send numbers; the
   * save path normalizes them via toUnitRef().
   */
  @ApiProperty()
  @Expose({ groups: ['COURSE_LIST', 'COURSE_DETAILS'] })
  @IsStringOrNumber()
  id: string;

  @ApiProperty()
  @Expose({ groups: ['COURSE_LIST', 'COURSE_DETAILS'] })
  @IsString()
  title: string;

  @ApiPropertyOptional()
  @Expose({ groups: ['COURSE_LIST', 'COURSE_DETAILS'] })
  @IsOptional()
  @IsString()
  sub_title?: string;

  /** Legacy field present on some stored unit payloads; kept so whitelist doesn't strip it. */
  @ApiPropertyOptional()
  @Expose({ groups: ['COURSE_LIST', 'COURSE_DETAILS'] })
  @Allow()
  price?: number | string;

  /** Legacy field present on some stored unit payloads; kept so whitelist doesn't strip it. */
  @ApiPropertyOptional()
  @Expose({ groups: ['COURSE_LIST', 'COURSE_DETAILS'] })
  @Allow()
  has_access?: boolean;

  @ApiPropertyOptional()
  @Expose({ groups: ['COURSE_LIST', 'COURSE_DETAILS'] })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional()
  @Expose({ groups: ['COURSE_DETAILS'] })
  @IsOptional()
  @IsString()
  text_content?: string;

  @ApiPropertyOptional()
  @Expose({ groups: ['COURSE_DETAILS'] })
  @IsOptional()
  @IsString()
  video_url?: string;

  @ApiPropertyOptional({
    type: [String],
    description: 'Gallery images for this unit (horizontal scroll in the app).',
  })
  @Expose({ groups: ['COURSE_LIST', 'COURSE_DETAILS'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  images_url?: string[];

  @ApiPropertyOptional({ type: () => [UnitData] })
  @Expose({ groups: ['COURSE_DETAILS'] })
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => UnitData)
  sub_units?: UnitData[];

  @ApiPropertyOptional({ enum: ProgressStatus })
  @Expose({ groups: ['COURSE_LIST', 'COURSE_DETAILS'] })
  @IsOptional()
  @IsEnum(ProgressStatus)
  status?: ProgressStatus;

  /** When true, this unit (and its descendants) are free without purchase. */
  @ApiPropertyOptional()
  @Expose({ groups: ['COURSE_LIST', 'COURSE_DETAILS'] })
  @Allow()
  free_preview?: boolean;
}

export class CourseDetails {
  @ApiPropertyOptional()
  @Allow()
  id: number;

  @ApiProperty()
  @IsString()
  title: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  sub_title: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  text_content?: string;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  images_url?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  video_url?: string;

  /** CSS object-position for hero images, e.g. "center", "top", "center 30%". */
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  image_focal_point?: string;

  @ApiPropertyOptional({ type: () => [UnitData] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => UnitData)
  units?: UnitData[];

  @ApiPropertyOptional({ enum: ProgressStatus })
  @IsOptional()
  @IsEnum(ProgressStatus)
  status?: ProgressStatus;

  /** Stored as a number, but legacy payloads carry a string (e.g. "0"). */
  @ApiPropertyOptional()
  @Allow()
  price: number;

  @ApiPropertyOptional()
  @Allow()
  has_access: boolean;

  /** Latest full-course practice / final scores from progress (when user has access). */
  @ApiPropertyOptional()
  @Allow()
  exam_summary?: {
    practice?: { score: number; taken_at: string } | null;
    final?: { score: number; taken_at: string } | null;
  };

  /**
   * Active practice-pool question counts keyed by unit ref / sub-unit ref.
   * Refs with zero questions are omitted. Lets the frontend hide exam CTAs
   * for scopes with no question bank content.
   */
  @ApiPropertyOptional()
  @Allow()
  question_counts?: {
    unit: Record<string, number>;
    sub_unit: Record<string, number>;
  };
}

// --- DTOs for specific endpoint actions ---

export class UpdateProgressDto {
  @ApiProperty({
    enum: ProgressStatus,
    description: 'The new progress status.',
  })
  @IsEnum(ProgressStatus)
  status: ProgressStatus;
}
