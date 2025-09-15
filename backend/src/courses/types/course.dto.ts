import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Expose, Type } from 'class-transformer';
import { IsString, IsNumber, IsOptional, IsEnum, ValidateNested, IsArray, IsBoolean } from 'class-validator';

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
    @IsString()
    id: string;

    @ApiProperty()
    @Expose({ groups: ['COURSE_LIST', 'COURSE_DETAILS'] })
    @IsString()
    title: string;

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

    @ApiPropertyOptional()
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
    id: number;

    title: string;

    sub_title: string;

    description: string;

    text_content?: string;

    image_url?: string;

    video_url?: string;

    units?: UnitData[];

    status?: ProgressStatus;

    price: number;

    has_access: boolean;
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