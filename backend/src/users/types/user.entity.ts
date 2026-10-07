import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinTable,
  ManyToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Role } from './role.enum';
import { ThemePreference } from './user.dto';
import { Course } from '../../courses/types/course.entity';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn()
  id?: number;

  @Index()
  @Column({ type: 'varchar', unique: true })
  username: string;

  @Column({ type: 'varchar' })
  password: string;

  @Index()
  @Column({ type: 'varchar', unique: true })
  email: string;

  @CreateDateColumn({ type: 'timestamptz' })
  submitted_at?: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updated_at?: Date;

  @Column({ type: 'varchar', nullable: true })
  first_name?: string | undefined;

  @Column({ type: 'varchar', nullable: true })
  last_name?: string | undefined;

  @Column({ type: 'varchar', nullable: true })
  picture_url?: string | undefined;

  @Column({
    type: 'enum',
    enum: Role,
    default: Role.User,
  })
  role: Role;

  @Column({ type: 'boolean', default: false })
  is_email_verified: boolean;

  @Column({ type: 'varchar', nullable: true })
  email_verification_token?: string | null;

  @Column({ type: 'timestamptz', nullable: true })
  email_verification_expires_at?: Date | null;

  @Column({ type: 'int', default: 0 })
  token_version: number;

  /** Teacher reset code (hash only; `select: false` keeps it out of every default query). */
  @Column({ type: 'varchar', nullable: true, select: false })
  reset_code_hash?: string | null;

  @Column({ type: 'timestamptz', nullable: true, select: false })
  reset_code_expires_at?: Date | null;

  @Column({ type: 'int', default: 0, select: false })
  reset_code_attempts?: number;

  @Column({ type: 'timestamp', nullable: true })
  pro_membership_expires_at: Date | null;

  /** Stripe Customer id for Checkout / Billing Portal (subscriptions). */
  @Column({ type: 'varchar', nullable: true })
  stripe_customer_id?: string | null;

  /** Active Stripe Subscription id for monthly Pro (null when canceled / expired). */
  @Column({ type: 'varchar', nullable: true })
  stripe_subscription_id?: string | null;

  /** Site color theme ('light' | 'dark' | 'system'); null = never chosen (frontend default applies). */
  @Column({ type: 'varchar', length: 10, nullable: true })
  theme_preference?: ThemePreference | null;

  @ManyToMany(() => Course, (course) => course.purchased_by_users)
  @JoinTable({ name: 'user_courses_purchased' })
  purchased_courses: Course[];
}
