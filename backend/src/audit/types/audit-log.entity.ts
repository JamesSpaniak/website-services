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

  /** Null only for USER_SELF_DELETED — the actor no longer exists. */
  @Index()
  @Column({ name: 'user_id', type: 'int', nullable: true })
  userId: number | null;

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
