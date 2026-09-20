import { Injectable, Logger } from '@nestjs/common';
import { metrics } from '@opentelemetry/api';
import { DataSource, EntityManager } from 'typeorm';
import { EntitlementRow, EntitlementSource } from './types/commerce.dto';
import { ProductEventsService } from '../product-events/product-events.service';

type Runner = Pick<EntityManager, 'query'>;

/**
 * TypeORM's postgres driver returns `[rows, affectedCount]` for UPDATE /
 * DELETE … RETURNING (but plain `rows` for INSERT / SELECT). Normalize.
 */
const returningRows = <T>(res: unknown): T[] =>
  Array.isArray(res) && Array.isArray(res[0]) ? (res[0] as T[]) : (res as T[]);

export interface GrantCourseInput {
  source: EntitlementSource;
  productSku?: string | null;
  orderItemId?: number | null;
  allocatedPriceCents?: number;
  priceEstimated?: boolean;
  signupLinkId?: number | null;
  grantedByUserId?: number | null;
  startsAt?: Date;
  endsAt?: Date | null;
}

export interface SyncProInput {
  productSku: 'PRO_MONTHLY' | 'PRO_YEARLY';
  stripeSubscriptionId?: string | null;
  orderItemId?: number | null;
  endsAt: Date | null;
  grantedByUserId?: number | null;
}

/**
 * Entitlement ledger (plan § 2, § 3.3). Dual-written next to the legacy access
 * tables (`user_courses_purchased`, `users.role/pro_membership_expires_at`)
 * which `hasAccess` still reads; the nightly reconciliation compares the two
 * and PD22 gates the switch. While the legacy tables are authoritative,
 * failures here are logged + counted, never thrown, so a ledger hiccup cannot
 * block a purchase. Once ENTITLEMENTS_AUTHORITATIVE=true the ledger *is* the
 * grant, so grant/sync failures are rethrown and the caller's transaction fails
 * loudly instead of silently leaving the user without access.
 */
@Injectable()
export class EntitlementService {
  private readonly logger = new Logger(EntitlementService.name);
  private readonly writeFailures = metrics
    .getMeter('droneedge')
    .createCounter('entitlements.write_failures', {
      description: 'Entitlement ledger writes that threw',
    });

  /**
   * Grants rethrow when the ledger is authoritative (no row = no access).
   * Revokes never rethrow: a Pro row past `ends_at` is already dead, and a
   * missed course revoke shows up in the nightly `access_diff` gate.
   */
  private fail(
    op: string,
    err: unknown,
    detail: string,
    kind: 'grant' | 'revoke',
  ): void {
    this.writeFailures.add(1, { op });
    this.logger.error(`${op} failed (${detail}): ${(err as Error).message}`);
    if (kind === 'grant' && entitlementsAuthoritative()) throw err;
  }

  constructor(
    private readonly dataSource: DataSource,
    private readonly productEvents: ProductEventsService,
  ) {}

  async grantCourse(
    userId: number,
    courseId: number,
    input: GrantCourseInput,
    runner: Runner = this.dataSource,
  ): Promise<number | null> {
    try {
      const rows: { id: number }[] = await runner.query(
        `INSERT INTO entitlements
           (user_id, course_id, source, product_sku, order_item_id, allocated_price_cents, price_estimated,
            signup_link_id, granted_by_user_id, starts_at, ends_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, COALESCE($10, now()), $11)
         ON CONFLICT (user_id, course_id, source) WHERE revoked_at IS NULL AND course_id IS NOT NULL
         DO NOTHING
         RETURNING id`,
        [
          userId,
          courseId,
          input.source,
          input.productSku ?? `COURSE_${courseId}`,
          input.orderItemId ?? null,
          input.allocatedPriceCents ?? 0,
          input.priceEstimated ?? false,
          input.signupLinkId ?? null,
          input.grantedByUserId ?? null,
          input.startsAt ?? null,
          input.endsAt ?? null,
        ],
      );
      this.productEvents.invalidateUser(userId);
      return rows[0]?.id ?? null;
    } catch (err) {
      this.fail(
        'grantCourse',
        err,
        `user ${userId}, course ${courseId}`,
        'grant',
      );
      return null;
    }
  }

  /** Revokes every live direct entitlement for the user × course. */
  async revokeCourse(
    userId: number,
    courseId: number,
    reason: 'admin' | 'refund' | 'expired' | 'chargeback',
    runner: Runner = this.dataSource,
  ): Promise<void> {
    try {
      await runner.query(
        `UPDATE entitlements SET revoked_at = now(), revoke_reason = $3
         WHERE user_id = $1 AND course_id = $2 AND revoked_at IS NULL`,
        [userId, courseId, reason],
      );
      this.productEvents.invalidateUser(userId);
    } catch (err) {
      this.fail(
        'revokeCourse',
        err,
        `user ${userId}, course ${courseId}`,
        'revoke',
      );
    }
  }

  /** Revokes the entitlements attached to specific order items (refunds). */
  async revokeByOrderItems(
    orderItemIds: number[],
    reason: 'refund' | 'chargeback',
    runner: Runner = this.dataSource,
  ): Promise<{ user_id: number; course_id: number | null }[]> {
    if (!orderItemIds.length) return [];
    try {
      const rows = returningRows<{ user_id: number; course_id: number | null }>(
        await runner.query(
          `UPDATE entitlements SET revoked_at = now(), revoke_reason = $2
           WHERE order_item_id = ANY($1::bigint[]) AND revoked_at IS NULL
           RETURNING user_id, course_id`,
          [orderItemIds, reason],
        ),
      );
      for (const r of rows) this.productEvents.invalidateUser(r.user_id);
      return rows;
    } catch (err) {
      this.fail('revokeByOrderItems', err, 'refund', 'revoke');
      return [];
    }
  }

  /**
   * One live all-courses row per user. Extends/re-points the existing row on
   * renewal; inserts on first subscription or admin comp.
   */
  async syncPro(userId: number, input: SyncProInput): Promise<void> {
    try {
      const updated = returningRows<{ id: number }>(
        await this.dataSource.query(
          `UPDATE entitlements
           SET ends_at = $2, product_sku = $3,
               stripe_subscription_id = COALESCE($4, stripe_subscription_id),
               order_item_id = COALESCE($5, order_item_id)
           WHERE user_id = $1 AND course_id IS NULL AND revoked_at IS NULL
           RETURNING id`,
          [
            userId,
            input.endsAt,
            input.productSku,
            input.stripeSubscriptionId ?? null,
            input.orderItemId ?? null,
          ],
        ),
      );
      if (!updated.length) {
        await this.dataSource.query(
          `INSERT INTO entitlements
             (user_id, course_id, source, product_sku, order_item_id, stripe_subscription_id, granted_by_user_id, ends_at)
           VALUES ($1, NULL, 'pro', $2, $3, $4, $5, $6)
           ON CONFLICT (user_id) WHERE revoked_at IS NULL AND course_id IS NULL DO NOTHING`,
          [
            userId,
            input.productSku,
            input.orderItemId ?? null,
            input.stripeSubscriptionId ?? null,
            input.grantedByUserId ?? null,
            input.endsAt,
          ],
        );
      }
      this.productEvents.invalidateUser(userId);
    } catch (err) {
      this.fail('syncPro', err, `user ${userId}`, 'grant');
    }
  }

  async revokePro(
    userId: number,
    reason: 'expired' | 'cancelled' | 'admin' | 'refund',
  ): Promise<void> {
    try {
      await this.dataSource.query(
        `UPDATE entitlements SET revoked_at = now(), revoke_reason = $2
         WHERE user_id = $1 AND course_id IS NULL AND revoked_at IS NULL`,
        [userId, reason],
      );
      this.productEvents.invalidateUser(userId);
    } catch (err) {
      this.fail('revokePro', err, `user ${userId}`, 'revoke');
    }
  }

  /** GET /users/me/entitlements — what the learner holds and where it came from. */
  async listForUser(userId: number): Promise<EntitlementRow[]> {
    return this.dataSource.query(
      `SELECT e.id, e.course_id, c.title AS course_title, e.source, e.product_sku,
              e.allocated_price_cents, e.starts_at, e.ends_at, e.revoked_at,
              (e.revoked_at IS NULL AND (e.ends_at IS NULL OR e.ends_at > now())) AS active
       FROM entitlements e
       LEFT JOIN courses c ON c.id = e.course_id
       WHERE e.user_id = $1
       ORDER BY active DESC, e.starts_at DESC`,
      [userId],
    );
  }

  /**
   * True when the user holds a live entitlement for the course — a direct one
   * or the all-courses Pro row (course_id IS NULL). Org seats are not in the
   * ledger; CourseService.hasAccess still consults OrganizationService for
   * those. This is the read path behind ENTITLEMENTS_AUTHORITATIVE (PD22).
   */
  async hasLiveAccess(userId: number, courseId: number): Promise<boolean> {
    const rows: { ok: boolean }[] = await this.dataSource.query(
      `SELECT EXISTS (
         SELECT 1 FROM entitlements e
         WHERE e.user_id = $1
           AND (e.course_id = $2 OR e.course_id IS NULL)
           AND e.revoked_at IS NULL
           AND e.starts_at <= now()
           AND (e.ends_at IS NULL OR e.ends_at > now())
       ) AS ok`,
      [userId, courseId],
    );
    return !!rows[0]?.ok;
  }
}

/** Set ENTITLEMENTS_AUTHORITATIVE=true to make hasAccess read the ledger instead of the legacy tables. */
export const entitlementsAuthoritative = (): boolean =>
  process.env.ENTITLEMENTS_AUTHORITATIVE === 'true';
