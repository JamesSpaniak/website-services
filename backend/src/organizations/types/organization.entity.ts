import { Column, CreateDateColumn, Entity, Index, JoinTable, ManyToMany, OneToMany, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { OrganizationMember } from './organization-member.entity';
import { InviteCode } from './invite-code.entity';
import { Course } from '../../courses/types/course.entity';

@Entity('organizations')
export class Organization {
    @PrimaryGeneratedColumn()
    id: number;

    @Index()
    @Column({ type: 'varchar', unique: true })
    name: string;

    @Column({ type: 'int' })
    max_students: number;

    @Column({ type: 'varchar', nullable: true })
    school_year: string | null;

    @Column({ type: 'varchar', nullable: true })
    semester: string | null;

    @CreateDateColumn({ type: 'timestamptz' })
    created_at: Date;

    @UpdateDateColumn({ type: 'timestamptz' })
    updated_at: Date;

    @OneToMany(() => OrganizationMember, (member) => member.organization)
    members: OrganizationMember[];

    @OneToMany(() => InviteCode, (code) => code.organization)
    invite_codes: InviteCode[];

    @ManyToMany(() => Course)
    @JoinTable({ name: 'organization_courses' })
    courses: Course[];
}
