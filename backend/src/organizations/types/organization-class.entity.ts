import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import { Organization } from './organization.entity';

/**
 * A class/period/section inside an organization, e.g. "Period 2".
 * Used to group members, invites, and class exams. Seat enforcement
 * stays at the organization level (max_students); a class max is a
 * display-only soft cap.
 */
@Entity('organization_classes')
@Unique(['organizationId', 'name'])
export class OrganizationClass {
  @PrimaryGeneratedColumn()
  id: number;

  @Index()
  @Column({ name: 'organization_id' })
  organizationId: number;

  @Column({ type: 'varchar', length: 128 })
  name: string;

  @Column({ type: 'int', nullable: true, name: 'max_students' })
  maxStudents: number | null;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt: Date;

  @ManyToOne(() => Organization, (org) => org.classes, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'organization_id' })
  organization: Organization;
}
