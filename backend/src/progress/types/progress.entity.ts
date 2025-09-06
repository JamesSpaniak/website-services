import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    ManyToOne,
    JoinColumn,
    Unique,
  } from 'typeorm';
  import { User } from '../../users/types/user.entity'; // Assuming path
  import { Course } from '../../courses/types/course.entity'; // Assuming path
  import { CourseDetails } from '../../courses/types/course.dto';
  
  @Entity('progress')
  @Unique(['userId', 'courseId']) // Ensures a user has only one progress entry per course
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
  }
  
  