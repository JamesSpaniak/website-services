import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    ManyToOne,
    JoinColumn,
    Index,
} from 'typeorm';
import { User } from '../../users/types/user.entity';
import { AuditAction } from './audit-action.enum';

@Entity('audit_logs')
export class AuditLog {
    @PrimaryGeneratedColumn()
    id: number;

    @Index()
    @Column({ name: 'user_id' })
    userId: number;

    @Index()
    @Column({ type: 'varchar' })
    action: AuditAction;

    @Column({ type: 'jsonb', nullable: true })
    metadata: Record<string, unknown> | null;

    @CreateDateColumn({ type: 'timestamptz' })
    created_at: Date;

    @ManyToOne(() => User, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'user_id' })
    user: User;
}
