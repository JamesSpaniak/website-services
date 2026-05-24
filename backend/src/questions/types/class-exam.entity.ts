import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

/**
 * Represents a teacher-assigned exam for an organization.
 * Links an Exam (the question set) to an organization so teachers can
 * distribute it to students and track who has taken it via ExamAttempts.
 *
 * One teacher may create multiple ClassExams pointing at different Exam
 * versions (e.g. version A and version B) to distribute to different
 * class periods.
 */
@Entity('class_exams')
@Index(['organization_id'])
@Index(['exam_id'])
export class ClassExam {
  @PrimaryGeneratedColumn()
  id: number;

  /** The exam (question set) being assigned */
  @Column({ type: 'int' })
  exam_id: number;

  /** Manager/teacher who created this assignment */
  @Column({ type: 'int' })
  assigned_by_user_id: number;

  /** The organization (class/school) this is assigned to */
  @Column({ type: 'int' })
  organization_id: number;

  /**
   * Human-readable label for the exam assignment, e.g.
   * "Unit 3 Quiz — Period 2" or "Final Exam — Spring 2025"
   */
  @Column({ type: 'varchar', length: 128, nullable: true })
  label: string | null;

  /** Optional due date shown to students */
  @Column({ type: 'timestamptz', nullable: true })
  due_date: Date | null;

  @CreateDateColumn({ type: 'timestamptz' })
  assigned_at: Date;
}
