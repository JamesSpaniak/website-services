import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn, Unique } from 'typeorm';
import { Organization } from './organization.entity';
import { User } from '../../users/types/user.entity';
import { OrgRole } from './org-role.enum';

@Entity('organization_members')
@Unique(['organization', 'user'])
export class OrganizationMember {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ name: 'organization_id' })
    organizationId: number;

    @Column({ name: 'user_id' })
    userId: number;

    @Column({ type: 'enum', enum: OrgRole, default: OrgRole.Member })
    role: OrgRole;

    @CreateDateColumn({ type: 'timestamptz', name: 'joined_at' })
    joinedAt: Date;

    @ManyToOne(() => Organization, (org) => org.members, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'organization_id' })
    organization: Organization;

    @ManyToOne(() => User, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'user_id' })
    user: User;
}
