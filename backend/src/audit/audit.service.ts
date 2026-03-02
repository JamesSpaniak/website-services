import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditLog } from './types/audit-log.entity';
import { AuditAction } from './types/audit-action.enum';
import { AuditLogResponse } from './types/audit.dto';

@Injectable()
export class AuditService {
    private readonly logger = new Logger(AuditService.name);

    constructor(
        @InjectRepository(AuditLog)
        private auditRepository: Repository<AuditLog>,
    ) {}

    /**
     * Fire-and-forget audit log entry. Failures are logged but never
     * bubble up to callers so they don't break business logic.
     */
    async log(userId: number, action: AuditAction, metadata?: Record<string, unknown>): Promise<void> {
        try {
            const entry = this.auditRepository.create({
                userId,
                action,
                metadata: metadata || null,
            });
            await this.auditRepository.save(entry);
        } catch (err) {
            this.logger.error(`Failed to write audit log: ${(err as Error).message}`, (err as Error).stack);
        }
    }

    async getUserActivity(userId: number, limit = 50, offset = 0): Promise<AuditLogResponse[]> {
        const logs = await this.auditRepository.find({
            where: { userId },
            order: { created_at: 'DESC' },
            take: limit,
            skip: offset,
        });

        return logs.map((l) => ({
            id: l.id,
            action: l.action,
            metadata: l.metadata,
            created_at: l.created_at,
        }));
    }

    /**
     * Counts consecutive days (ending today or yesterday) where the user
     * has at least one LOGIN entry. Returns 0 if no recent logins.
     */
    async getLoginStreak(userId: number): Promise<number> {
        const result = await this.auditRepository.query(
            `
            WITH login_dates AS (
                SELECT DISTINCT DATE(created_at AT TIME ZONE 'UTC') AS d
                FROM audit_logs
                WHERE user_id = $1
            ),
            ranked AS (
                SELECT d, d - (ROW_NUMBER() OVER (ORDER BY d))::int AS grp
                FROM login_dates
            ),
            streaks AS (
                SELECT grp, MIN(d) AS streak_start, MAX(d) AS streak_end, COUNT(*)::int AS streak_len
                FROM ranked
                GROUP BY grp
            )
            SELECT streak_len FROM streaks
            WHERE streak_end >= CURRENT_DATE - INTERVAL '1 day'
            ORDER BY streak_end DESC
            LIMIT 1
            `,
            [userId],
        );

        return result.length > 0 ? result[0].streak_len : 0;
    }

    /**
     * Returns daily aggregate counts for each action over the last N days.
     */
    async getDailyMetrics(days = 30): Promise<DailyMetric[]> {
        return this.auditRepository.query(
            `
            SELECT
                DATE(created_at AT TIME ZONE 'UTC') AS date,
                action,
                COUNT(*)::int AS count
            FROM audit_logs
            WHERE created_at >= (CURRENT_DATE - $1::int)
            GROUP BY date, action
            ORDER BY date
            `,
            [days],
        );
    }

    /**
     * Returns headline stats for the admin dashboard.
     */
    async getOverviewStats(): Promise<OverviewStats> {
        const rows = await this.auditRepository.query(`
            SELECT
                COUNT(*) FILTER (WHERE action = 'REGISTER')::int AS total_signups,
                COUNT(*) FILTER (WHERE action = 'REGISTER' AND created_at >= CURRENT_DATE - 7)::int AS signups_7d,
                COUNT(*) FILTER (WHERE action = 'REGISTER' AND created_at >= CURRENT_DATE - 30)::int AS signups_30d,
                COUNT(DISTINCT user_id) FILTER (WHERE action = 'LOGIN' AND created_at >= CURRENT_DATE - 1)::int AS dau,
                COUNT(DISTINCT user_id) FILTER (WHERE action = 'LOGIN' AND created_at >= CURRENT_DATE - 7)::int AS wau,
                COUNT(DISTINCT user_id) FILTER (WHERE action = 'LOGIN' AND created_at >= CURRENT_DATE - 30)::int AS mau,
                COUNT(*) FILTER (WHERE action = 'COURSE_STARTED')::int AS total_course_starts,
                COUNT(*) FILTER (WHERE action = 'COURSE_COMPLETED')::int AS total_course_completions,
                COUNT(*) FILTER (WHERE action = 'EXAM_SUBMITTED')::int AS total_exams_submitted,
                COUNT(*) FILTER (WHERE action = 'COURSE_PURCHASED')::int AS total_purchases
            FROM audit_logs
        `);
        return rows[0];
    }
}

export interface DailyMetric {
    date: string;
    action: string;
    count: number;
}

export interface OverviewStats {
    total_signups: number;
    signups_7d: number;
    signups_30d: number;
    dau: number;
    wau: number;
    mau: number;
    total_course_starts: number;
    total_course_completions: number;
    total_exams_submitted: number;
    total_purchases: number;
}
