import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { User } from './user.entity';

export enum SignupLinkKind {
  /** One account may register through the link; listed courses are granted free. */
  OneTime = 'one_time',
  /** Multi-use marketing/campaign link (e.g. social media promo with a discount). */
  Campaign = 'campaign',
}

/**
 * Admin-generated signup links (`/register?signup=CODE`). Unlike org invite
 * codes these are not tied to an organization: redeeming one at registration
 * grants the listed courses directly (rows in `user_courses_purchased` with
 * `source = 'signup_link'`), so redemptions per link stay queryable.
 *
 * `kind`, `max_uses`, `discount_percent`, and `price_override` exist so
 * campaign links (multi-use, discounted checkout instead of a free grant)
 * can be added without a schema change. Only `one_time` is implemented.
 */
@Entity('signup_links')
export class SignupLink {
  @PrimaryGeneratedColumn()
  id: number;

  @Index({ unique: true })
  @Column({ type: 'varchar', length: 24 })
  code: string;

  @Column({ type: 'varchar', length: 16, default: SignupLinkKind.OneTime })
  kind: SignupLinkKind;

  /** Optional lock: only an account registering with this email may redeem the link. */
  @Column({ type: 'varchar', nullable: true })
  email: string | null;

  @Column({ type: 'int', array: true, default: '{}', name: 'course_ids' })
  courseIds: number[];

  /** Free-form admin label (e.g. "Instagram June promo", "Gift for X"). */
  @Column({ type: 'varchar', nullable: true })
  note: string | null;

  /** Null = unlimited. One-time links are created with max_uses = 1. */
  @Column({ type: 'int', nullable: true, name: 'max_uses' })
  maxUses: number | null;

  @Column({ type: 'int', default: 0, name: 'use_count' })
  useCount: number;

  /** Future campaign pricing: percentage off the course price at checkout. */
  @Column({ type: 'int', nullable: true, name: 'discount_percent' })
  discountPercent: number | null;

  /** Future campaign pricing: absolute price replacing the course price. */
  @Column({
    type: 'numeric',
    precision: 10,
    scale: 2,
    nullable: true,
    name: 'price_override',
  })
  priceOverride: string | null;

  @Column({ name: 'created_by_user_id', nullable: true })
  createdByUserId: number | null;

  /** Last redeemer (for one-time links: the redeemer). Full history lives in user_courses_purchased.signup_link_id. */
  @Column({ name: 'used_by_user_id', nullable: true })
  usedByUserId: number | null;

  @Column({ type: 'timestamptz', nullable: true, name: 'used_at' })
  usedAt: Date | null;

  @Column({ type: 'timestamptz', name: 'expires_at' })
  expiresAt: Date;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt: Date;

  @ManyToOne(() => User, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'created_by_user_id' })
  createdBy: User;

  @ManyToOne(() => User, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'used_by_user_id' })
  usedBy: User;
}
