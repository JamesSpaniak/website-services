import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  Unique,
  UpdateDateColumn,
  CreateDateColumn,
} from 'typeorm';
import { User } from '../../users/types/user.entity';
import { Course } from '../../courses/types/course.entity';
import { ProgressStatus } from '../../courses/types/course.dto';
import { ExamScoreSnapshot } from '../../questions/types/question.dto';

@Entity('progress')
@Unique(['userId', 'courseId'])
export class Progress {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  userId: number;

  @Column()
  courseId: number;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @ManyToOne(() => Course, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'courseId' })
  course: Course;

  /**
   * Per-unit progress status keyed by unit ref (e.g. { "u11": "COMPLETED" }).
   * Only non-NOT_STARTED entries are stored; refs not present default to
   * NOT_STARTED. Refs that no longer exist in the course tree are ignored
   * on read — course restructuring never corrupts or resets progress.
   */
  @Column({ type: 'jsonb', default: () => "'{}'" })
  unit_statuses: Record<string, ProgressStatus>;

  @Column({ type: 'varchar', default: 'NOT_STARTED' })
  status: string;

  @Column({ type: 'int', default: 0 })
  units_completed: number;

  @Column({ type: 'int', default: 0 })
  units_total: number;

  /**
   * @deprecated Use exam_scores instead. Kept for backward compatibility with
   * existing progress records. Will be removed once exam_scores is fully adopted.
   */
  @Column({ type: 'decimal', nullable: true })
  latest_exam_score: number | null;

  /**
   * Latest exam score per scope, keyed by exam_id.
   * Only the most recent attempt per (user, exam) is reflected here — matching
   * the ExamAttempt upsert semantics. Updated by ExamAttemptService on submission.
   *
   * Stored here (denormalized) so that course progress views can show exam
   * status without joining to exam_attempts for every request.
   */
  @Column({ type: 'jsonb', nullable: true })
  exam_scores: ExamScoreSnapshot[] | null;

  /** Per-unit completion timestamps keyed by unit ref (ISO strings). */
  @Column({ type: 'jsonb', default: () => "'{}'" })
  unit_completed_at: Record<string, string>;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;

  /** Set when course status first becomes COMPLETED; cleared if reverted. */
  @Column({ type: 'timestamptz', nullable: true })
  completed_at: Date | null;

  /**
   * Bumped by every progress write and (throttled) by learning events —
   * heartbeats, video pings — so a learner who reads without clicking still
   * reads as active. Feeds "last active" in the manager dashboard.
   */
  @Column({ type: 'timestamptz', nullable: true })
  last_activity_at: Date | null;

  @UpdateDateColumn({ type: 'timestamptz' })
  updated_at: Date;
}
