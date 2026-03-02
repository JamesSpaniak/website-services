export interface Organization {
    id: number;
    name: string;
    max_students: number;
    member_count: number;
    manager_count: number;
    school_year: string | null;
    semester: string | null;
    course_count: number;
    created_at: string;
}

export interface OrgCourse {
    id: number;
    title: string;
}

export interface OrganizationMember {
    id: number;
    user_id: number;
    username: string;
    email: string;
    first_name?: string;
    last_name?: string;
    role: 'manager' | 'member';
    joined_at: string;
}

export interface InviteCode {
    id: number;
    code: string;
    role: 'manager' | 'member';
    email: string | null;
    used: boolean;
    used_by_username: string | null;
    expires_at: string;
    created_at: string;
}

export interface InviteCodeInfo {
    organization_name: string;
    role: 'manager' | 'member';
}

export interface MemberCourseProgressSummary {
    user_id: number;
    username: string;
    first_name?: string;
    last_name?: string;
    course_id: number;
    course_title: string;
    status: string;
    units_completed: number;
    units_total: number;
    latest_exam_score: number | null;
}

export interface MemberCourseDetailedProgress {
    user_id: number;
    username: string;
    first_name?: string;
    last_name?: string;
    progress: Record<string, unknown> | null;
}

export interface UserOrganization {
    id: number;
    name: string;
    role: 'manager' | 'member';
}
