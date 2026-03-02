import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    ManyToOne,
    JoinColumn,
    Unique,
    Index,
} from 'typeorm';
import { User } from '../../users/types/user.entity';
import { Comment } from './comment.entity';

@Entity('comment_votes')
@Unique(['commentId', 'userId'])
export class CommentVote {
    @PrimaryGeneratedColumn()
    id: number;

    @Index()
    @Column({ name: 'comment_id' })
    commentId: number;

    @Column({ name: 'user_id' })
    userId: number;

    @CreateDateColumn({ type: 'timestamptz' })
    created_at: Date;

    @ManyToOne(() => Comment, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'comment_id' })
    comment: Comment;

    @ManyToOne(() => User, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'user_id' })
    user: User;
}
