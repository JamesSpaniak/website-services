import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  UpdateDateColumn,
  Unique,
  Index,
} from 'typeorm';

export interface AttemptAnswer {
  question_id: number;
  selected_choice_id: number;
  /** Populated by the server on scoring — not trusted from the client */
  is_correct?: boolean;
  /** The correct choice for this question — only included in the response after submission */
  correct_choice_id?: number;
  /** Explanation text from the question bank — only included after submission */
  explanation?: string | null;
}

export interface SectionBreakdown {
  /** unit_id from the course payload */
  unit_id: number;
  /** sub_unit_id from the course payload — null if scoped only to a unit */
  sub_unit_id: number | null;
  correct: number;
  total: number;
  score_percent: number;
  /** FAA ACS standards that appeared in failed questions */
  failed_standards: string[];
}

/**
 * Records a user's latest attempt on a specific exam.
 *
 * The UNIQUE constraint on (user_id, exam_id) enforces the "only latest attempt"
 * rule at the database level. On submission the service upserts by this key,
 * replacing the previous attempt rather than accumulating history.
 *
 * This keeps the table compact and makes "what is the student's current score
 * on this exam?" a single O(1) lookup.
 */
@Entity('exam_attempts')
@Unique(['user_id', 'exam_id'])
@Index(['exam_id'])
export class ExamAttempt {
  @PrimaryGeneratedColumn()
  id: number;

  @Index()
  @Column({ type: 'int' })
  user_id: number;

  @Column({ type: 'int' })
  exam_id: number;

  /**
   * The student's submitted answers, annotated with is_correct by the server
   * at scoring time. Never trusted from the client.
   */
  @Column({ type: 'jsonb' })
  answers: AttemptAnswer[];

  /** Integer 0–100 */
  @Column({ type: 'int' })
  score: number;

  /** Per-unit and per-sub-unit breakdown for targeted feedback */
  @Column({ type: 'jsonb', nullable: true })
  section_breakdown: SectionBreakdown[] | null;

  /** Updated (not created) — reflects the time of the latest attempt */
  @UpdateDateColumn({ type: 'timestamptz' })
  completed_at: Date;
}
