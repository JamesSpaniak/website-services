import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

export type ExamScope = 'sub_unit' | 'unit' | 'full_course';
export type ExamPool = 'scoped' | 'final_only' | 'all';
export type ExamGeneratedBy = 'student' | 'teacher' | 'system';

/**
 * A generated exam — a specific ordered set of question IDs drawn from the
 * question bank for a given scope. Creating an Exam does not score anything;
 * scoring happens in ExamAttempt when the student submits answers.
 *
 * Fixed exams (is_randomized=false) always present the same questions in the
 * same order — suitable for class-wide consistency or anti-cheating scenarios.
 * Randomized exams draw from the bank according to priority weights each time.
 */
@Entity('exams')
@Index(['course_id', 'scope'])
export class Exam {
  @PrimaryGeneratedColumn()
  id: number;

  @Index()
  @Column({ type: 'int' })
  course_id: number;

  /** Granularity of this exam */
  @Column({ type: 'varchar', length: 16 })
  scope: ExamScope;

  /** Pool filter used at generation time (scoped, final_only, all). */
  @Column({ type: 'varchar', length: 16, default: 'scoped' })
  exam_pool: ExamPool;

  /**
   * The unit_id or sub_unit_id values this exam covers.
   * For full_course exams this is empty ([]).
   */
  @Column({ type: 'int', array: true })
  scope_ids: number[];

  /**
   * The exact question IDs selected for this exam, in presentation order.
   * For fixed exams this is stable; for randomized exams it is captured at
   * generation time so every student who takes *this* exam sees the same set.
   */
  @Column({ type: 'int', array: true })
  question_ids: number[];

  /**
   * Whether this exam was generated with randomized question selection.
   * Recorded for audit/reporting — the actual questions are already frozen in
   * question_ids regardless.
   */
  @Column({ type: 'boolean', default: true })
  is_randomized: boolean;

  /**
   * Version label for teacher-generated multi-version exams (e.g. "A", "B", "v1").
   * Students see different versions to reduce answer sharing.
   */
  @Column({ type: 'varchar', length: 8, default: 'v1' })
  version: string;

  @Column({ type: 'varchar', length: 16 })
  generated_by: ExamGeneratedBy;

  /** Null for system/student-generated exams */
  @Column({ type: 'int', nullable: true })
  created_by_user_id: number | null;

  /**
   * Optional dedup key for fixed exams.
   *
   * When set, `ExamGeneratorService.generateClassExam` first looks for an
   * existing exam with the same key before creating a new one. This prevents
   * duplicate identical exams from being created when a teacher re-assigns
   * the same fixed exam to multiple class groups. Format recommendation:
   *   `{course_id}:{scope}:{scope_ids_sorted}:{version}:fixed`
   *
   * Null for all randomized / student-initiated exams.
   */
  @Index({ unique: true, where: '"dedup_key" IS NOT NULL' })
  @Column({ type: 'varchar', length: 200, nullable: true })
  dedup_key: string | null;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;
}
