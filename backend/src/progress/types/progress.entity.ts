import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    ManyToOne,
    JoinColumn,
    Unique,
    UpdateDateColumn,
} from 'typeorm';
import { User } from '../../users/types/user.entity';
import { Course } from '../../courses/types/course.entity';
import { CourseDetails } from '../../courses/types/course.dto';
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

    @Column({ type: 'jsonb' })
    payload: CourseDetails;

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

    @UpdateDateColumn({ type: 'timestamptz' })
    updated_at: Date;
}
