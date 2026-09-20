import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { DataSource, EntityManager } from 'typeorm';
import {
  CreateManualOrderDto,
  OrderItemRow,
  OrderRow,
  ProductRow,
  StripeOrderInput,
} from './types/commerce.dto';
import { EntitlementService } from './entitlement.service';
import { ProductEventsService } from '../product-events/product-events.service';
import { AuditService } from '../audit/audit.service';
import { AuditAction } from '../audit/types/audit-action.enum';

export interface RecordedOrder {
  orderId: number;
  /** order_item id per input item, in input order. Empty when the order already existed. */
  itemIds: number[];
  created: boolean;
}

/**
 * Money ledger (plan § 3.2, § 4.1–4.2). Every paid or comped thing becomes an
 * `orders` row + `order_items`, and each line that grants access creates an
 * entitlement pointing back at it — that link is what lets utilization and
 * revenue be joined per user.
 */
@Injectable()
export class OrderService {
  private readonly logger = new Logger(OrderService.name);

  constructor(
    private readonly dataSource: DataSource,
    private readonly entitlements: EntitlementService,
    private readonly productEvents: ProductEventsService,
    private readonly auditService: AuditService,
  ) {}

  // ── Catalog ─────────────────────────────────────────────────────────────

  async listProducts(includeInactive = false): Promise<ProductRow[]> {
    return this.dataSource.query(
      `SELECT sku, name, product_type, grants, stripe_price_id, list_price_cents,
              related_course_id, requires_shipping, active
       FROM products ${includeInactive ? '' : 'WHERE active'} ORDER BY product_type, sku`,
    );
  }

  async getProduct(sku: string): Promise<ProductRow | null> {
    const rows: ProductRow[] = await this.dataSource.query(
      `SELECT sku, name, product_type, grants, stripe_price_id, list_price_cents,
              related_course_id, requires_shipping, active FROM products WHERE sku = $1`,
      [sku],
    );
    if (rows[0]) return rows[0];
    // Courses created after the catalog seed get their COURSE_{id} row lazily.
    const m = /^COURSE_(\d+)$/.exec(sku);
    if (m) return this.ensureCourseProduct(Number(m[1]));
    return null;
  }

  /** Upserts the COURSE_{id} catalog row from the courses table. */
  async ensureCourseProduct(courseId: number): Promise<ProductRow | null> {
    const rows: ProductRow[] = await this.dataSource.query(
      `INSERT INTO products (sku, name, product_type, grants, list_price_cents, related_course_id, active)
       SELECT 'COURSE_' || c.id, c.title, 'course', jsonb_build_object('course_ids', jsonb_build_array(c.id)),
              COALESCE(ROUND(c.price * 100), 0)::int, c.id, NOT c.hidden
       FROM courses c WHERE c.id = $1
       ON CONFLICT (sku) DO UPDATE SET name = EXCLUDED.name, list_price_cents = EXCLUDED.list_price_cents
       RETURNING sku, name, product_type, grants, stripe_price_id, list_price_cents,
                 related_course_id, requires_shipping, active`,
      [courseId],
    );
    return rows[0] ?? null;
  }

  async getProductByStripePrice(priceId: string): Promise<ProductRow | null> {
    const rows: ProductRow[] = await this.dataSource.query(
      `SELECT sku, name, product_type, grants, stripe_price_id, list_price_cents,
              related_course_id, requires_shipping, active FROM products WHERE stripe_price_id = $1`,
      [priceId],
    );
    return rows[0] ?? null;
  }

  // ── Stripe write path ───────────────────────────────────────────────────

  /**
   * Idempotent on stripe_event_id / payment_intent / invoice: a redelivered
   * webhook returns the existing order with `created: false`.
   */
  async recordStripeOrder(input: StripeOrderInput): Promise<RecordedOrder> {
    return this.dataSource.transaction(async (manager) => {
      const existing: { id: number }[] = await manager.query(
        `SELECT id FROM orders
         WHERE stripe_event_id = $1
            OR ($2::text IS NOT NULL AND stripe_payment_intent_id = $2)
            OR ($3::text IS NOT NULL AND stripe_invoice_id = $3)
         LIMIT 1`,
        [
          input.stripeEventId,
          input.paymentIntentId ?? null,
          input.invoiceId ?? null,
        ],
      );
      if (existing.length) {
        return { orderId: existing[0].id, itemIds: [], created: false };
      }

      const subtotal = input.items.reduce(
        (s, i) => s + i.unitPriceCents * (i.quantity ?? 1),
        0,
      );
      const inserted: { id: number }[] = await manager.query(
        `INSERT INTO orders
           (user_id, organization_id, stripe_payment_intent_id, stripe_invoice_id, stripe_checkout_session_id,
            stripe_customer_id, stripe_event_id, payment_method, subtotal_cents, total_cents, currency,
            payment_status, placed_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, 'card', $8, $9, $10, 'succeeded', COALESCE($11, now()))
         RETURNING id`,
        [
          input.userId,
          input.organizationId ?? null,
          input.paymentIntentId ?? null,
          input.invoiceId ?? null,
          input.checkoutSessionId ?? null,
          input.customerId ?? null,
          input.stripeEventId,
          subtotal,
          input.totalCents,
          (input.currency ?? 'usd').toLowerCase(),
          input.placedAt ?? null,
        ],
      );
      const orderId = inserted[0].id;
      const itemIds = await this.insertItems(manager, orderId, input.items);
      return { orderId, itemIds, created: true };
    });
  }

  // ── Manual (PO / comp) path ─────────────────────────────────────────────

  async createManualOrder(
    adminUserId: number,
    dto: CreateManualOrderDto,
  ): Promise<OrderRow> {
    if (!dto.userId && !dto.organizationId) {
      throw new BadRequestException(
        'Provide userId (courses / Pro) or organizationId (seats).',
      );
    }
    const products = new Map<string, ProductRow>();
    for (const item of dto.items) {
      const p = await this.getProduct(item.sku);
      if (!p) throw new NotFoundException(`Unknown SKU ${item.sku}`);
      products.set(item.sku, p);
    }

    const orderId = await this.dataSource.transaction(async (manager) => {
      const lines = dto.items.map((i) => {
        const p = products.get(i.sku)!;
        return {
          sku: p.sku,
          productType: p.product_type,
          courseId: p.related_course_id ?? p.grants.course_ids?.[0] ?? null,
          quantity: i.quantity ?? 1,
          unitPriceCents: i.unitPriceCents ?? p.list_price_cents,
          unitCostCents: i.unitCostCents ?? 0,
          discountCents: i.discountCents ?? 0,
        };
      });
      const subtotal = lines.reduce(
        (s, l) => s + l.unitPriceCents * l.quantity,
        0,
      );
      const discount = lines.reduce((s, l) => s + l.discountCents, 0);
      const shipping = dto.shippingCents ?? 0;
      const tax = dto.taxCents ?? 0;
      const total =
        dto.paymentMethod === 'comp' ? 0 : subtotal - discount + shipping + tax;

      const inserted: { id: number }[] = await manager.query(
        `INSERT INTO orders
           (user_id, organization_id, payment_method, subtotal_cents, discount_cents, shipping_cents, tax_cents,
            total_cents, payment_status, placed_at, notes, created_by_user_id)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, COALESCE($10, now()), $11, $12)
         RETURNING id`,
        [
          dto.userId ?? null,
          dto.organizationId ?? null,
          dto.paymentMethod,
          subtotal,
          discount,
          shipping,
          tax,
          total,
          dto.paymentMethod === 'comp' ? 'comped' : 'succeeded',
          dto.placedAt ? new Date(dto.placedAt) : null,
          dto.notes ?? null,
          adminUserId,
        ],
      );
      const id = inserted[0].id;
      const itemIds = await this.insertItems(manager, id, lines);

      // Grant access for user-scoped lines (courses, bundles, Pro).
      if (dto.userId) {
        for (let i = 0; i < lines.length; i++) {
          const line = lines[i];
          const p = products.get(line.sku)!;
          if (p.product_type === 'course' || p.product_type === 'bundle') {
            await this.grantCoursesForItem(
              manager,
              dto.userId,
              p,
              itemIds[i],
              line.unitPriceCents * line.quantity - line.discountCents,
              adminUserId,
            );
          } else if (
            p.product_type === 'pro_monthly' ||
            p.product_type === 'pro_yearly'
          ) {
            const endsAt = new Date();
            if (p.product_type === 'pro_yearly')
              endsAt.setFullYear(endsAt.getFullYear() + 1);
            else endsAt.setMonth(endsAt.getMonth() + 1);
            await manager.query(
              `UPDATE users SET role = CASE WHEN role = 'admin' THEN role ELSE 'pro' END,
                                pro_membership_expires_at = $2,
                                token_version = COALESCE(token_version, 0) + 1
               WHERE id = $1`,
              [dto.userId, endsAt],
            );
            await this.entitlements.syncPro(dto.userId, {
              productSku: p.sku as 'PRO_MONTHLY' | 'PRO_YEARLY',
              orderItemId: itemIds[i],
              endsAt,
              grantedByUserId: adminUserId,
            });
          }
        }
      }
      return id;
    });

    this.auditService.log(adminUserId, AuditAction.ORDER_RECORDED, {
      orderId,
      targetUserId: dto.userId ?? null,
      organizationId: dto.organizationId ?? null,
      paymentMethod: dto.paymentMethod,
      skus: dto.items.map((i) => i.sku),
    });
    void this.productEvents.record({
      userId: dto.userId ?? null,
      organizationId: dto.organizationId ?? null,
      event: 'order_recorded',
      properties: {
        order_id: orderId,
        payment_method: dto.paymentMethod,
        skus: dto.items.map((i) => i.sku),
      },
    });

    const order = await this.getOrder(orderId);
    if (!order) throw new NotFoundException('Order not found after insert.');
    return order;
  }

  /**
   * Grants every course a SKU covers, allocating the paid amount across them
   * proportionally to standalone list price (plan § 2.5). Also writes the
   * legacy access row so hasAccess sees the grant today.
   */
  async grantCoursesForItem(
    manager: EntityManager,
    userId: number,
    product: ProductRow,
    orderItemId: number,
    paidCents: number,
    grantedByUserId: number | null = null,
  ): Promise<void> {
    const courseIds =
      product.grants.course_ids ??
      (product.related_course_id ? [product.related_course_id] : []);
    if (!courseIds.length) return;
    const prices: { id: number; price: string | null }[] = await manager.query(
      `SELECT id, price FROM courses WHERE id = ANY($1::int[])`,
      [courseIds],
    );
    const list = new Map(
      prices.map((p) => [p.id, Math.round(Number(p.price ?? 0) * 100)]),
    );
    const listTotal = courseIds.reduce((s, id) => s + (list.get(id) ?? 0), 0);
    const source = product.product_type === 'bundle' ? 'bundle' : 'purchase';

    for (const courseId of courseIds) {
      const share =
        listTotal > 0
          ? Math.round((paidCents * (list.get(courseId) ?? 0)) / listTotal)
          : Math.round(paidCents / courseIds.length);
      await manager.query(
        `INSERT INTO user_courses_purchased ("usersId", "coursesId", "source", "granted_by_user_id")
         VALUES ($1, $2, $3, $4) ON CONFLICT ("usersId", "coursesId") DO NOTHING`,
        [userId, courseId, source, grantedByUserId],
      );
      await this.entitlements.grantCourse(
        userId,
        courseId,
        {
          source,
          productSku: product.sku,
          orderItemId,
          allocatedPriceCents: share,
          grantedByUserId,
        },
        manager,
      );
    }
    await manager.query(
      `UPDATE users SET token_version = COALESCE(token_version, 0) + 1 WHERE id = $1`,
      [userId],
    );
  }

  // ── Refunds ─────────────────────────────────────────────────────────────

  /**
   * charge.refunded → mark the order, spread the refund over its items, and
   * on a full refund revoke the entitlements those items granted (PD…
   * decision in plan § 4.1). Returns the affected user for follow-up events.
   */
  async applyRefund(
    paymentIntentId: string | null,
    invoiceId: string | null,
    refundedCents: number,
    fullyRefunded: boolean,
  ): Promise<{ orderId: number; userId: number | null } | null> {
    return this.dataSource.transaction(async (manager) => {
      const orders: {
        id: number;
        user_id: number | null;
        total_cents: number;
      }[] = await manager.query(
        `SELECT id, user_id, total_cents FROM orders
           WHERE ($1::text IS NOT NULL AND stripe_payment_intent_id = $1)
              OR ($2::text IS NOT NULL AND stripe_invoice_id = $2)
           LIMIT 1`,
        [paymentIntentId, invoiceId],
      );
      if (!orders.length) return null;
      const order = orders[0];
      const full = fullyRefunded || refundedCents >= order.total_cents;

      await manager.query(
        `UPDATE orders SET refunded_cents = $2,
                           payment_status = CASE WHEN $3 THEN 'refunded' ELSE 'partially_refunded' END
         WHERE id = $1`,
        [order.id, refundedCents, full],
      );
      const items: OrderItemRow[] = await manager.query(
        `SELECT id, unit_price_cents, quantity, discount_cents FROM order_items WHERE order_id = $1`,
        [order.id],
      );
      const gross = items.reduce(
        (s, i) => s + i.unit_price_cents * i.quantity - i.discount_cents,
        0,
      );
      for (const item of items) {
        const line =
          item.unit_price_cents * item.quantity - item.discount_cents;
        const share =
          gross > 0 ? Math.round((refundedCents * line) / gross) : 0;
        await manager.query(
          `UPDATE order_items SET refunded_amount_cents = $2 WHERE id = $1`,
          [item.id, full ? line : share],
        );
      }
      if (full) {
        const revoked = await this.entitlements.revokeByOrderItems(
          items.map((i) => i.id),
          'refund',
          manager,
        );
        for (const r of revoked) {
          if (r.course_id != null) {
            await manager.query(
              `DELETE FROM user_courses_purchased WHERE "usersId" = $1 AND "coursesId" = $2`,
              [r.user_id, r.course_id],
            );
          }
        }
        if (revoked.length && order.user_id) {
          await manager.query(
            `UPDATE users SET token_version = COALESCE(token_version, 0) + 1 WHERE id = $1`,
            [order.user_id],
          );
        }
      }
      return { orderId: order.id, userId: order.user_id };
    });
  }

  // ── Reads ───────────────────────────────────────────────────────────────

  async getOrder(id: number): Promise<OrderRow | null> {
    const rows = await this.listOrders({ id });
    return rows[0] ?? null;
  }

  async listOrders(filter: {
    id?: number;
    userId?: number;
    organizationId?: number;
    limit?: number;
    offset?: number;
  }): Promise<OrderRow[]> {
    const where: string[] = [];
    const params: unknown[] = [];
    if (filter.id) {
      params.push(filter.id);
      where.push(`o.id = $${params.length}`);
    }
    if (filter.userId) {
      params.push(filter.userId);
      where.push(`o.user_id = $${params.length}`);
    }
    if (filter.organizationId) {
      params.push(filter.organizationId);
      where.push(`o.organization_id = $${params.length}`);
    }
    params.push(Math.min(filter.limit ?? 50, 200));
    const limitIdx = params.length;
    params.push(filter.offset ?? 0);
    const offsetIdx = params.length;

    return this.dataSource.query(
      `SELECT o.id, o.user_id, u.username, o.organization_id, org.name AS organization_name,
              o.payment_method, o.payment_status, o.total_cents, o.refunded_cents, o.currency,
              o.placed_at, o.notes, o.stripe_payment_intent_id, o.stripe_invoice_id,
              COALESCE((
                SELECT json_agg(json_build_object(
                  'id', oi.id, 'sku', oi.sku, 'product_type', oi.product_type, 'course_id', oi.course_id,
                  'quantity', oi.quantity, 'unit_price_cents', oi.unit_price_cents,
                  'unit_cost_cents', oi.unit_cost_cents, 'discount_cents', oi.discount_cents,
                  'refunded_amount_cents', oi.refunded_amount_cents, 'fulfillment_source', oi.fulfillment_source
                ) ORDER BY oi.id)
                FROM order_items oi WHERE oi.order_id = o.id
              ), '[]'::json) AS items
       FROM orders o
       LEFT JOIN users u ON u.id = o.user_id
       LEFT JOIN organizations org ON org.id = o.organization_id
       ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
       ORDER BY o.placed_at DESC
       LIMIT $${limitIdx} OFFSET $${offsetIdx}`,
      params,
    );
  }

  // ── Internals ───────────────────────────────────────────────────────────

  private async insertItems(
    manager: EntityManager,
    orderId: number,
    items: {
      sku: string;
      productType: string;
      courseId?: number | null;
      quantity?: number;
      unitPriceCents: number;
      unitCostCents?: number;
      discountCents?: number;
    }[],
  ): Promise<number[]> {
    const ids: number[] = [];
    for (const item of items) {
      const fulfillment =
        item.productType === 'hardware' || item.productType === 'kit'
          ? 'dropship'
          : 'digital';
      const rows: { id: number }[] = await manager.query(
        `INSERT INTO order_items
           (order_id, sku, product_type, course_id, quantity, unit_price_cents, unit_cost_cents, discount_cents, fulfillment_source)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING id`,
        [
          orderId,
          item.sku,
          item.productType,
          item.courseId ?? null,
          item.quantity ?? 1,
          item.unitPriceCents,
          item.unitCostCents ?? 0,
          item.discountCents ?? 0,
          fulfillment,
        ],
      );
      ids.push(rows[0].id);
    }
    return ids;
  }
}
