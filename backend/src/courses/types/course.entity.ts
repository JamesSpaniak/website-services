import { User } from "../../users/types/user.entity";
import { Organization } from "../../organizations/types/organization.entity";
import { Column, CreateDateColumn, Entity, Index, ManyToMany, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";

@Entity('courses')
export class Course {
    @PrimaryGeneratedColumn()
    id?: number;

    @Index()
    @Column({ type: 'varchar', unique: true })
    title: string;

    @Column({ type: 'varchar' })
    payload: string;

    @Column({ type: 'decimal', nullable: true })
    price: number;

    @CreateDateColumn({ type: 'timestamptz' })
    submitted_at?: Date;

    @UpdateDateColumn({ type: 'timestamptz' })
    updated_at?: Date;

    @Column({ type: 'boolean' })
    hidden: boolean;

    @ManyToMany(() => User, (user) => user.purchased_courses)
    purchased_by_users: User[];

    @ManyToMany(() => Organization, (org) => org.courses)
    organizations?: Organization[];
}