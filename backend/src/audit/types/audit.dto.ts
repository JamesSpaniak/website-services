export class AuditLogResponse {
    id: number;
    action: string;
    metadata: Record<string, unknown> | null;
    created_at: Date;
}

export class UserActivityResponse {
    activity: AuditLogResponse[];
    login_streak: number;
}
