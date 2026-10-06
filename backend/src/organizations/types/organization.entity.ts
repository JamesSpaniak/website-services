import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinTable,
  ManyToMany,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { OrganizationMember } from './organization-member.entity';
import { OrganizationClass } from './organization-class.entity';
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

  /**
   * IANA time zone of the school. Defines "today" and the daily buckets in
   * every teacher view and in the product_events_daily rollup for its
   * members (PTD4, docs/tech/progress-tracking-accuracy.md).
   */
  @Column({ type: 'varchar', length: 64, default: 'America/New_York' })
  timezone: string;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updated_at: Date;

  @OneToMany(() => OrganizationMember, (member) => member.organization)
  members: OrganizationMember[];

  @OneToMany(() => InviteCode, (code) => code.organization)
  invite_codes: InviteCode[];

  @OneToMany(() => OrganizationClass, (cls) => cls.organization)
  classes: OrganizationClass[];

  @ManyToMany(() => Course)
  @JoinTable({ name: 'organization_courses' })
  courses: Course[];
}
