import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    UpdateDateColumn,
    ManyToOne,
    OneToMany,
    JoinColumn,
    Index,
} from 'typeorm';
import { User } from '../../users/types/user.entity';
import { Article } from '../../articles/types/article.entity';

@Entity('comments')
export class Comment {
    @PrimaryGeneratedColumn()
    id: number;

    @Index()
    @Column({ name: 'article_id' })
    articleId: number;

    @Column({ name: 'user_id' })
    userId: number;

    @Index()
    @Column({ name: 'parent_id', nullable: true })
    parentId: number | null;

    @Column({ type: 'text' })
    body: string;

    @Column({ type: 'int', default: 0 })
    upvote_count: number;

    @CreateDateColumn({ type: 'timestamptz' })
    created_at: Date;

    @UpdateDateColumn({ type: 'timestamptz' })
    updated_at: Date;

    @ManyToOne(() => Article, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'article_id' })
    article: Article;

    @ManyToOne(() => User, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'user_id' })
    user: User;

    @ManyToOne(() => Comment, (c) => c.replies, { onDelete: 'CASCADE', nullable: true })
    @JoinColumn({ name: 'parent_id' })
    parent: Comment | null;

    @OneToMany(() => Comment, (c) => c.parent)
    replies: Comment[];
}
