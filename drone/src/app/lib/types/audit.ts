export interface AuditLogEntry {
    id: number;
    action: string;
    metadata: Record<string, unknown> | null;
    created_at: string;
}

export interface UserActivityResponse {
    activity: AuditLogEntry[];
    login_streak: number;
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

export interface DailyMetric {
    date: string;
    action: string;
    count: number;
}
