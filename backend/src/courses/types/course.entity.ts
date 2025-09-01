import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";

@Entity('courses')
export class Course {
    @PrimaryGeneratedColumn()
    id?: number;

    @Index()
    @Column({ type: 'varchar', unique: true })
    title: string;

    @Column({ type: 'varchar' })
    payload: string; // TODO

    @CreateDateColumn({ type: 'timestamptz' })
    submitted_at?: Date;

    @UpdateDateColumn({ type: 'timestamptz' })
    updated_at?: Date;

    @Column({ type: 'boolean' })
    hidden: boolean;
}