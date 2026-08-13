// Types for the admin Users tab — mirror backend/src/users/types/admin-users.dto.ts

export type CourseAccessSource = 'purchase' | 'admin_grant' | 'signup_link';

export interface AdminUserCourse {
    id: number;
    title: string;
    source: CourseAccessSource;
    granted_at: string | null;
    granted_by_username: string | null;
    signup_link_id: number | null;
}

export interface AdminUserRow {
    id: number;
    username: string;
    email: string;
    first_name: string | null;
    last_name: string | null;
    role: string;
    is_email_verified: boolean;
    submitted_at: string;
    organization: { id: number; name: string; role: string } | null;
    courses: AdminUserCourse[];
}

export type SignupLinkKind = 'one_time' | 'campaign';

export interface SignupLinkRow {
    id: number;
    code: string;
    kind: SignupLinkKind;
    email: string | null;
    note: string | null;
    courses: { id: number; title: string }[];
    max_uses: number | null;
    use_count: number;
    created_by_username: string | null;
    used_by_username: string | null;
    used_at: string | null;
    expires_at: string;
    created_at: string;
    status: 'active' | 'used' | 'expired';
}

export interface CreateSignupLinkPayload {
    course_ids: number[];
    email?: string;
    note?: string;
    expires_in_days?: number;
}

/** Public info about a `?signup=` code shown on the register page. */
export interface SignupLinkInfo {
    valid: boolean;
    reason?: string;
    kind?: SignupLinkKind;
    courses?: { id: number; title: string }[];
    email_locked?: boolean;
    expires_at?: string;
}
