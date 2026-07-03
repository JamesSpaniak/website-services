import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Expose, Type } from 'class-transformer';
import {
    Allow,
    IsString,
    IsNumber,
    IsOptional,
    IsEnum,
    ValidateNested,
    IsArray,
    IsBoolean,
    registerDecorator,
    ValidationOptions,
} from 'class-validator';

/**
 * Accepts string OR number values. Unit IDs are numbers in stored course
 * payloads but typed as strings in the DTO layer; until the ID migration
 * standardizes on strings, validation must tolerate both.
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

export class AnswerData {
    @ApiProperty()
    @Expose({ groups: ['COURSE_DETAILS'] })
    @IsNumber()
    id: number;

    @ApiProperty()
    @Expose({ groups: ['COURSE_DETAILS'] })
    @IsString()
    text: string;

    @ApiPropertyOptional({ description: 'Only available in course definition, not in progress.' })
    @Expose({ groups: ['COURSE_DETAILS'] })
    @IsOptional()
    @IsBoolean()
    correct?: boolean;
}

export class QuestionData {
    @ApiProperty()
    @Expose({ groups: ['COURSE_DETAILS'] })
    @IsNumber()
    id: number;

    @ApiProperty()
    @Expose({ groups: ['COURSE_DETAILS'] })
    @IsString()
    question: string;

    @ApiProperty({ type: () => [AnswerData] })
    @Expose({ groups: ['COURSE_DETAILS'] })
    @ValidateNested({ each: true })
    @Type(() => AnswerData)
    @IsArray()
    answers: AnswerData[];
}

export class UserAnswer {
    @ApiProperty()
    @IsNumber()
    questionId: number;

    @ApiProperty()
    @IsNumber()
    selectedAnswerId: number;
}

export class ExamResult {
    @ApiProperty()
    @Expose({ groups: ['COURSE_DETAILS'] })
    @IsNumber()
    score: number;

    @ApiProperty({ type: [UserAnswer] })
    @Expose({ groups: ['COURSE_DETAILS'] })
    @ValidateNested({ each: true })
    @Type(() => UserAnswer)
    answers: UserAnswer[];

    @ApiProperty()
    @Expose({ groups: ['COURSE_DETAILS'] })
    submittedAt: Date;
}

export class ExamData {
    @ApiProperty({ type: () => [QuestionData] })
    @Expose({ groups: ['COURSE_DETAILS'] })
    @ValidateNested({ each: true })
    @Type(() => QuestionData)
    questions: QuestionData[];

    @ApiProperty()
    @Expose({ groups: ['COURSE_DETAILS'] })
    @IsNumber()
    retries_allowed: number;

    @ApiPropertyOptional()
    @Expose({ groups: ['COURSE_DETAILS'] })
    @IsOptional()
    @IsNumber()
    retries_taken?: number;

    @ApiPropertyOptional({ enum: ProgressStatus })
    @Expose({ groups: ['COURSE_DETAILS'] })
    @IsOptional()
    @IsEnum(ProgressStatus)
    status?: ProgressStatus;

    @ApiPropertyOptional({ type: () => ExamResult })
    @Expose({ groups: ['COURSE_DETAILS'] })
    @IsOptional()
    @ValidateNested()
    @Type(() => ExamResult)
    result?: ExamResult;

    @ApiPropertyOptional({ type: () => [ExamResult] })
    @Expose({ groups: ['COURSE_DETAILS'] })
    @IsOptional()
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => ExamResult)
    previous_results?: ExamResult[];
}

export class UnitData {
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

    @ApiPropertyOptional({ type: [String], description: 'Gallery images for this unit (horizontal scroll in the app).' })
    @Expose({ groups: ['COURSE_LIST', 'COURSE_DETAILS'] })
    @IsOptional()
    @IsArray()
    @IsString({ each: true })
    images_url?: string[];

    /** @deprecated Merged into `images_url` on read/write. */
    @ApiPropertyOptional({ deprecated: true })
    @Expose({ groups: ['COURSE_LIST', 'COURSE_DETAILS'] })
    @IsOptional()
    @IsString()
    image_url?: string;

    @ApiPropertyOptional({ type: () => [UnitData] })
    @Expose({ groups: ['COURSE_DETAILS'] })
    @IsOptional()
    @ValidateNested({ each: true })
    @Type(() => UnitData)
    sub_units?: UnitData[];

    @ApiPropertyOptional({ type: () => ExamData })
    @Expose({ groups: ['COURSE_DETAILS'] })
    @IsOptional()
    @ValidateNested()
    @Type(() => ExamData)
    exam?: ExamData;

    @ApiPropertyOptional({ enum: ProgressStatus })
    @Expose({ groups: ['COURSE_LIST', 'COURSE_DETAILS'] })
    @IsOptional()
    @IsEnum(ProgressStatus)
    status?: ProgressStatus;
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

    /** @deprecated Merged into `images_url` on read/write. */
    @ApiPropertyOptional({ deprecated: true })
    @IsOptional()
    @IsString()
    image_url?: string;

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
}

// --- DTOs for specific endpoint actions ---

export class UpdateProgressDto {
    @ApiProperty({ enum: ProgressStatus, description: 'The new progress status.' })
    @IsEnum(ProgressStatus)
    status: ProgressStatus;
}

export class SubmitExamDto {
    @ApiProperty({ type: [UserAnswer], description: 'The user\'s answers to the exam questions.' })
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => UserAnswer)
    answers: UserAnswer[];
}