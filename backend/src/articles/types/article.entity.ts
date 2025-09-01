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

    @Column({ type: 'varchar' })
    body: string;

    @CreateDateColumn({ type: 'timestamptz' })
    submitted_at?: Date;

    @UpdateDateColumn({ type: 'timestamptz' })
    updated_at?: Date;

    @Column({ type: 'boolean' })
    hidden: boolean;
}