import { Column, CreateDateColumn, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Organization } from './organization.entity';
import { User } from '../../users/types/user.entity';
import { OrgRole } from './org-role.enum';

@Entity('invite_codes')
export class InviteCode {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ name: 'organization_id' })
    organizationId: number;

    @Index({ unique: true })
    @Column({ type: 'varchar', length: 16 })
    code: string;

    @Column({ type: 'enum', enum: OrgRole, default: OrgRole.Member })
    role: OrgRole;

    @Column({ type: 'varchar', nullable: true })
    email: string | null;

    @Column({ name: 'created_by_user_id' })
    createdByUserId: number;

    @Column({ name: 'used_by_user_id', nullable: true })
    usedByUserId: number | null;

    @Column({ type: 'timestamptz', nullable: true, name: 'used_at' })
    usedAt: Date | null;

    @Column({ type: 'timestamptz', name: 'expires_at' })
    expiresAt: Date;

    @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
    createdAt: Date;

    @ManyToOne(() => Organization, (org) => org.invite_codes, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'organization_id' })
    organization: Organization;

    @ManyToOne(() => User, { onDelete: 'SET NULL', nullable: true })
    @JoinColumn({ name: 'created_by_user_id' })
    createdBy: User;

    @ManyToOne(() => User, { onDelete: 'SET NULL', nullable: true })
    @JoinColumn({ name: 'used_by_user_id' })
    usedBy: User;
}
