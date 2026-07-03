import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

export interface QuestionChoice {
  id: number;
  text: string;
  is_correct: boolean;
}

export type QuestionDifficulty = 'easy' | 'medium' | 'hard';
export type QuestionStatus = 'active' | 'draft' | 'archived';

/**
 * A single question in the question bank.
 * Questions are linked to a course and optionally scoped to a specific
 * unit or sub-unit. They are stored independently of the course payload JSON
 * so they can be managed, versioned, and queried without parsing course blobs.
 */
@Entity('questions')
@Index(['course_id', 'unit_ref'])
@Index(['course_id', 'sub_unit_ref'])
export class Question {
  @PrimaryGeneratedColumn()
  id: number;

  /** FK to courses.id — not a TypeORM relation to avoid tight coupling */
  @Index()
  @Column({ type: 'int' })
  course_id: number;

  /**
   * Ref of the top-level unit this question belongs to (course_units.ref,
   * e.g. "u10"). Null means the question applies to the full course only
   * (e.g. FINAL_EXAM-tagged chart questions).
   */
  @Column({ type: 'varchar', length: 64, nullable: true })
  unit_ref: string | null;

  /**
   * Ref of the specific lesson/sub-unit (course_units.ref, e.g. "u101").
   * Null means the question is scoped only to the parent unit.
   */
  @Column({ type: 'varchar', length: 64, nullable: true })
  sub_unit_ref: string | null;

  /**
   * @deprecated Legacy numeric payload id, kept one release for rollback.
   * Application code reads/writes unit_ref instead.
   */
  @Column({ type: 'int', nullable: true })
  unit_id: number | null;

  /**
   * @deprecated Legacy numeric payload id, kept one release for rollback.
   * Application code reads/writes sub_unit_ref instead.
   */
  @Column({ type: 'int', nullable: true })
  sub_unit_id: number | null;

  @Column({ type: 'text' })
  question_text: string;

  /** [{id, text, is_correct}] — exactly one should have is_correct=true */
  @Column({ type: 'jsonb' })
  choices: QuestionChoice[];

  /** Explanation shown after the student answers (optional) */
  @Column({ type: 'text', nullable: true })
  explanation: string | null;

  /**
   * FAA ACS standard reference (e.g. "PA.I.A.K1") or any course-specific tag.
   * Used for reporting which standards a student failed.
   */
  @Column({ type: 'varchar', length: 64, nullable: true })
  standard: string | null;

  /**
   * Reference to a figure in the FAA-CT-8080-2H supplement (e.g. "15", "21").
   * When set, the exam player shows a link to the relevant figure.
   */
  @Column({ type: 'varchar', length: 32, nullable: true })
  figure_ref: string | null;

  /**
   * Controls selection priority when generating exams.
   *  1 = core — always included in every fixed/randomized exam
   *  2 = standard — included in most generated exams
   *  3 = supplemental — rotated in for larger or supplemental exams
   */
  @Column({ type: 'smallint', default: 2 })
  priority: number;

  @Column({ type: 'varchar', length: 16, default: 'medium' })
  difficulty: QuestionDifficulty;

  @Column({ type: 'varchar', length: 16, default: 'active' })
  status: QuestionStatus;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updated_at: Date;
}
