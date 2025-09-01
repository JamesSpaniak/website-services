import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";

@Entity('users')
export class User {
    @PrimaryGeneratedColumn()
    id?: number;

    @Index()
    @Column({ type: 'varchar', unique: true })
    username: string;

    @Column({ type: 'varchar' })
    password: string;

    @CreateDateColumn({ type: 'timestamptz' })
    submitted_at?: Date;

    @UpdateDateColumn({ type: 'timestamptz' })
    updated_at?: Date;

    @Column({ type: 'boolean', default: false })
    write_access: boolean;

    @Column({ type: 'varchar', nullable: true })
    first_name?: string | undefined;

    @Column({ type: 'varchar', nullable: true })
    last_name?: string | undefined;

    @Column({ type: 'varchar', nullable: true })
    email?: string | undefined;

    @Column({ type: 'varchar', nullable: true })
    picture_url?: string | undefined;
}