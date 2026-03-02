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

    @Column({ type: 'decimal', nullable: true })
    latest_exam_score: number | null;

    @UpdateDateColumn({ type: 'timestamptz' })
    updated_at: Date;
}
