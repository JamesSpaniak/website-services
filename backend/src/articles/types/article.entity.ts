import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";

@Entity('articles')
export class Article {
    @PrimaryGeneratedColumn()
    id?: number;

    @Index()
    @Column({ type: 'varchar', unique: true })
    title: string;

    @Column({ type: 'varchar' })
    sub_heading: string;

    @Column({ type: 'varchar', nullable: true })
    image_url?: string;

    @Column({ type: 'varchar' })
    body: string;

    @Column({ type: 'jsonb', nullable: true })
    content_blocks?: ContentBlock[];

    @CreateDateColumn({ type: 'timestamptz' })
    submitted_at?: Date;

    @UpdateDateColumn({ type: 'timestamptz' })
    updated_at?: Date;

    @Column({ type: 'boolean' })
    hidden: boolean;
}

export interface ContentBlock {
    id: string;
    type: 'text' | 'image' | 'video';
    content: string;
    alt?: string;
    caption?: string;
}
