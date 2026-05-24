import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNumber,
  IsOptional,
  IsEnum,
  IsArray,
  IsBoolean,
  IsInt,
  ValidateNested,
  Min,
  Max,
  MaxLength,
} from 'class-validator';
import { Type } from 'class-transformer';
import { QuestionDifficulty, QuestionStatus } from './question.entity';
import { ExamScope } from './exam.entity';
import { AttemptAnswer, SectionBreakdown } from './exam-attempt.entity';

// ── Question DTOs ─────────────────────────────────────────────────────────────

export class QuestionChoiceDto {
  @ApiProperty()
  @IsInt()
  id: number;

  @ApiProperty()
  @IsString()
  text: string;

  @ApiProperty()
  @IsBoolean()
  is_correct: boolean;
}

export class CreateQuestionDto {
  @ApiProperty()
  @IsInt()
  course_id: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  unit_id?: number | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  sub_unit_id?: number | null;

  @ApiProperty()
  @IsString()
  question_text: string;

  @ApiProperty({ type: [QuestionChoiceDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => QuestionChoiceDto)
  choices: QuestionChoiceDto[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  explanation?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(64)
  standard?: string | null;

  @ApiPropertyOptional({ description: 'FAA-CT-8080-2H figure reference (e.g. "15")' })
  @IsOptional()
  @IsString()
  @MaxLength(32)
  figure_ref?: string | null;

  @ApiPropertyOptional({ default: 2, description: '1=core, 2=standard, 3=supplemental' })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(3)
  priority?: number;

  @ApiPropertyOptional({ enum: ['easy', 'medium', 'hard'], default: 'medium' })
  @IsOptional()
  @IsEnum(['easy', 'medium', 'hard'])
  difficulty?: QuestionDifficulty;

  @ApiPropertyOptional({ enum: ['active', 'draft', 'archived'], default: 'active' })
  @IsOptional()
  @IsEnum(['active', 'draft', 'archived'])
  status?: QuestionStatus;
}

export class UpdateQuestionDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  question_text?: string;

  @ApiPropertyOptional({ type: [QuestionChoiceDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => QuestionChoiceDto)
  choices?: QuestionChoiceDto[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  explanation?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(64)
  standard?: string | null;

  @ApiPropertyOptional({ description: 'FAA-CT-8080-2H figure reference (e.g. "15")' })
  @IsOptional()
  @IsString()
  @MaxLength(32)
  figure_ref?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(3)
  priority?: number;

  @ApiPropertyOptional({ enum: ['easy', 'medium', 'hard'] })
  @IsOptional()
  @IsEnum(['easy', 'medium', 'hard'])
  difficulty?: QuestionDifficulty;

  @ApiPropertyOptional({ enum: ['active', 'draft', 'archived'] })
  @IsOptional()
  @IsEnum(['active', 'draft', 'archived'])
  status?: QuestionStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  unit_id?: number | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  sub_unit_id?: number | null;
}

/**
 * Used for bulk JSON import. The id field is optional — if provided and a
 * matching question exists for the same course+unit+sub_unit, it will be
 * updated; otherwise a new question is created.
 */
export class ImportQuestionDto extends CreateQuestionDto {
  @ApiPropertyOptional({ description: 'Existing question ID — triggers an update if found' })
  @IsOptional()
  @IsInt()
  id?: number;
}

export class BulkImportDto {
  @ApiProperty()
  @IsInt()
  course_id: number;

  @ApiProperty({ type: [ImportQuestionDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ImportQuestionDto)
  questions: ImportQuestionDto[];

  @ApiPropertyOptional({
    default: false,
    description:
      'When true, archives all existing active questions for the course before importing. ' +
      'Use this to replace the full question bank from a fresh build without creating duplicates.',
  })
  @IsOptional()
  @IsBoolean()
  replace_existing?: boolean;
}

export class BulkImportResultDto {
  @ApiProperty()
  created: number;

  @ApiProperty()
  updated: number;

  @ApiProperty()
  skipped: number;

  @ApiPropertyOptional({ description: 'Number of existing questions archived (only when replace_existing=true)' })
  archived?: number;
}

// ── Exam generation DTOs ───────────────────────────────────────────────────────

export type ExamPool = 'scoped' | 'final_only' | 'all';

export class GenerateExamDto {
  @ApiProperty()
  @IsInt()
  course_id: number;

  @ApiProperty({ enum: ['sub_unit', 'unit', 'full_course'] })
  @IsEnum(['sub_unit', 'unit', 'full_course'])
  scope: ExamScope;

  @ApiPropertyOptional({
    type: [Number],
    description: 'unit_id or sub_unit_id values to include. Empty for full_course.',
  })
  @IsOptional()
  @IsArray()
  @IsInt({ each: true })
  scope_ids?: number[];

  @ApiPropertyOptional({ default: true, description: 'Randomize question selection and order' })
  @IsOptional()
  @IsBoolean()
  is_randomized?: boolean;

  @ApiPropertyOptional({ default: 'v1', description: 'Version label (A/B/v1/v2) for multi-version class exams' })
  @IsOptional()
  @IsString()
  @MaxLength(8)
  version?: string;

  @ApiPropertyOptional({ description: 'Target number of questions. Defaults to all available active questions.' })
  @IsOptional()
  @IsInt()
  @Min(1)
  question_count?: number;

  @ApiPropertyOptional({
    enum: ['scoped', 'final_only', 'all'],
    description:
      'Question pool filter. scoped (default): exclude FINAL_EXAM-tagged questions. final_only: chart/cross-section finals. all: every active question.',
  })
  @IsOptional()
  @IsEnum(['scoped', 'final_only', 'all'])
  exam_pool?: ExamPool;
}

export class GenerateClassExamDto extends GenerateExamDto {
  @ApiProperty()
  @IsInt()
  organization_id: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(128)
  label?: string;

  @ApiPropertyOptional()
  @IsOptional()
  due_date?: Date;
}

// ── Exam attempt DTOs ─────────────────────────────────────────────────────────

export class SubmitAttemptAnswerDto {
  @ApiProperty()
  @IsInt()
  question_id: number;

  @ApiProperty()
  @IsInt()
  selected_choice_id: number;
}

export class SubmitExamAttemptDto {
  @ApiProperty({ type: [SubmitAttemptAnswerDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SubmitAttemptAnswerDto)
  answers: SubmitAttemptAnswerDto[];
}

export class ExamAttemptResultDto {
  @ApiProperty()
  score: number;

  @ApiProperty()
  total_questions: number;

  @ApiProperty()
  correct_count: number;

  @ApiProperty()
  answers: AttemptAnswer[];

  @ApiPropertyOptional({ type: Object })
  section_breakdown: SectionBreakdown[] | null;

  @ApiProperty()
  completed_at: Date;
}

// ── Class exam result DTOs (manager dashboard) ────────────────────────────────

export class StudentExamResultDto {
  @ApiProperty()
  user_id: number;

  @ApiProperty()
  username: string;

  @ApiPropertyOptional()
  score: number | null;

  @ApiPropertyOptional()
  completed_at: Date | null;

  @ApiPropertyOptional({ type: Object })
  section_breakdown: SectionBreakdown[] | null;
}

export class ClassExamResultsDto {
  @ApiProperty()
  class_exam_id: number;

  @ApiPropertyOptional()
  label: string | null;

  @ApiProperty()
  exam_id: number;

  @ApiProperty()
  total_assigned: number;

  @ApiProperty()
  total_completed: number;

  @ApiProperty({ type: [StudentExamResultDto] })
  students: StudentExamResultDto[];
}

// ── Exam + questions response ─────────────────────────────────────────────────

export class ExamQuestionChoiceDto {
  @ApiProperty()
  id: number;

  @ApiProperty()
  text: string;
  // is_correct is intentionally omitted from the response — only returned after submission
}

export class ExamQuestionDto {
  @ApiProperty()
  id: number;

  @ApiProperty()
  question_text: string;

  @ApiProperty({ type: [ExamQuestionChoiceDto] })
  choices: ExamQuestionChoiceDto[];

  @ApiPropertyOptional()
  standard: string | null;

  @ApiPropertyOptional()
  difficulty: string;

  @ApiPropertyOptional({ description: 'FAA-CT-8080-2H figure reference (e.g. "15")' })
  figure_ref: string | null;
}

export class ExamWithQuestionsDto {
  @ApiProperty()
  id: number;

  @ApiProperty()
  course_id: number;

  @ApiProperty()
  scope: ExamScope;

  @ApiProperty({ type: [Number] })
  scope_ids: number[];

  @ApiProperty()
  is_randomized: boolean;

  @ApiProperty()
  version: string;

  @ApiProperty({ type: [ExamQuestionDto] })
  questions: ExamQuestionDto[];

  @ApiProperty()
  created_at: Date;
}

// ── Class exam list (manager dashboard) ──────────────────────────────────────

/**
 * Summary of a single class exam assignment returned by GET /exams/class.
 * Joins ClassExam with its parent Exam to expose scope and question metadata.
 */
export class ClassExamSummaryDto {
  @ApiProperty()
  class_exam_id: number;

  @ApiProperty()
  exam_id: number;

  @ApiPropertyOptional()
  label: string | null;

  @ApiPropertyOptional()
  due_date: Date | null;

  @ApiProperty()
  assigned_at: Date;

  @ApiProperty()
  course_id: number;

  @ApiProperty({ enum: ['sub_unit', 'unit', 'full_course'] })
  scope: ExamScope;

  @ApiProperty({ type: [Number] })
  scope_ids: number[];

  @ApiProperty()
  version: string;

  @ApiProperty()
  is_randomized: boolean;

  @ApiProperty()
  question_count: number;
}

// ── Progress exam score snapshot (stored in progress.exam_scores) ─────────────

export interface ExamScoreSnapshot {
  exam_id: number;
  scope: ExamScope;
  scope_ids: number[];
  /** Set for exams generated after exam_pool column exists */
  exam_pool?: ExamPool;
  score: number;
  section_breakdown: SectionBreakdown[] | null;
  taken_at: string; // ISO string
}

export class CourseExamScoreDto {
  @ApiProperty()
  score: number;

  @ApiProperty()
  taken_at: string;
}

export class CourseExamSummaryDto {
  @ApiPropertyOptional({ type: CourseExamScoreDto })
  practice?: CourseExamScoreDto | null;

  @ApiPropertyOptional({ type: CourseExamScoreDto })
  final?: CourseExamScoreDto | null;
}
