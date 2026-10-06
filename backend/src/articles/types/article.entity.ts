import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('articles')
export class Article {
  @PrimaryGeneratedColumn()
  id?: number;

  @Index()
  @Column({ type: 'varchar', unique: true })
  title: string;

  @Column({ type: 'varchar' })
  sub_heading: string;

  /** URL segment: /articles/<slug>. Unique; set from the title when not given (see ArticleService.slugify). */
  @Column({ type: 'varchar', length: 120, unique: true })
  slug: string;

  /** Display labels, e.g. ["Schools", "Part 107"]. Filtered on /articles?tag=<slugified label>. */
  @Column({ type: 'text', array: true, default: '{}' })
  tags: string[];

  @Column({ type: 'varchar', nullable: true })
  image_url?: string;

  @Column({ type: 'text' })
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
