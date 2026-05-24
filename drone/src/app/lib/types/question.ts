// ── Question Bank (admin) ─────────────────────────────────────────────────────

export interface QuestionChoice {
  id: number;
  text: string;
  is_correct: boolean;
}

export interface Question {
  id: number;
  course_id: number;
  unit_id: number | null;
  sub_unit_id: number | null;
  question_text: string;
  choices: QuestionChoice[];
  explanation: string | null;
  standard: string | null;
  priority: 1 | 2 | 3;
  difficulty: 'easy' | 'medium' | 'hard';
  status: 'active' | 'draft' | 'archived';
  created_at: string;
  updated_at: string;
}

export interface CreateQuestionPayload {
  course_id: number;
  unit_id?: number | null;
  sub_unit_id?: number | null;
  question_text: string;
  choices: QuestionChoice[];
  explanation?: string | null;
  standard?: string | null;
  priority?: number;
  difficulty?: 'easy' | 'medium' | 'hard';
  status?: 'active' | 'draft' | 'archived';
}

export type UpdateQuestionPayload = Partial<Omit<CreateQuestionPayload, 'course_id'>>;

export interface BulkImportPayload {
  course_id: number;
  questions: (CreateQuestionPayload & { id?: number })[];
  replace_existing?: boolean;
}

export interface BulkImportResult {
  created: number;
  updated: number;
  skipped: number;
  archived?: number;
}

// ── Exams (student) ───────────────────────────────────────────────────────────

export type ExamScope = 'sub_unit' | 'unit' | 'full_course';

/** scoped: exclude FINAL_EXAM (default). final_only: chart finals. all: every active question. */
export type ExamPool = 'scoped' | 'final_only' | 'all';

export interface GenerateExamPayload {
  course_id: number;
  scope: ExamScope;
  scope_ids?: number[];
  is_randomized?: boolean;
  version?: string;
  question_count?: number;
  exam_pool?: ExamPool;
}

export interface ExamChoiceDto {
  id: number;
  text: string;
}

export interface ExamQuestionDto {
  id: number;
  question_text: string;
  choices: ExamChoiceDto[];
  standard: string | null;
  difficulty: string;
  figure_ref: string | null;
}

export interface ExamWithQuestions {
  id: number;
  course_id: number;
  scope: ExamScope;
  scope_ids: number[];
  is_randomized: boolean;
  version: string;
  questions: ExamQuestionDto[];
  created_at: string;
}

export interface SubmitExamAnswer {
  question_id: number;
  selected_choice_id: number;
}

export interface SectionBreakdown {
  unit_id: number;
  sub_unit_id: number | null;
  correct: number;
  total: number;
  score_percent: number;
  failed_standards: string[];
}

export interface ScoredAnswer extends SubmitExamAnswer {
  is_correct: boolean;
  correct_choice_id?: number;
  explanation?: string | null;
}

export interface ExamAttemptResult {
  score: number;
  total_questions: number;
  correct_count: number;
  answers: ScoredAnswer[];
  section_breakdown: SectionBreakdown[] | null;
  completed_at: string;
}

// ── Class exams (manager) ─────────────────────────────────────────────────────

export interface GenerateClassExamPayload extends GenerateExamPayload {
  organization_id: number;
  label?: string;
  due_date?: string | null;
}

export interface ClassExamSummary {
  class_exam_id: number;
  exam_id: number;
  label: string | null;
  due_date: string | null;
  assigned_at: string;
  course_id: number;
  scope: ExamScope;
  scope_ids: number[];
  version: string;
  is_randomized: boolean;
  question_count: number;
}

export interface StudentExamResult {
  user_id: number;
  username: string;
  score: number | null;
  completed_at: string | null;
  section_breakdown: SectionBreakdown[] | null;
}

export interface ClassExamResults {
  class_exam_id: number;
  label: string | null;
  exam_id: number;
  total_assigned: number;
  total_completed: number;
  students: StudentExamResult[];
}
