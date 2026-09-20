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

export interface OrgClass {
    id: number;
    name: string;
    max_students: number | null;
    member_count: number;
    created_at: string;
}

export interface OrganizationMember {
    id: number;
    user_id: number;
    username: string;
    email: string;
    first_name?: string;
    last_name?: string;
    role: 'manager' | 'member';
    class_id: number | null;
    class_name: string | null;
    joined_at: string;
}

export interface InviteCode {
    id: number;
    code: string;
    role: 'manager' | 'member';
    email: string | null;
    class_id: number | null;
    class_name: string | null;
    used: boolean;
    used_by_username: string | null;
    expires_at: string;
    created_at: string;
}

export interface InviteCodeInfo {
    organization_name: string;
    role: 'manager' | 'member';
    class_name: string | null;
}

export interface MemberCourseProgressSummary {
    user_id: number;
    username: string;
    first_name?: string;
    last_name?: string;
    class_id: number | null;
    course_id: number;
    course_title: string;
    status: string;
    units_completed: number;
    units_total: number;
    latest_exam_score: number | null;
    // ── engagement (from product_events / video_progress) ──
    started_at: string | null;
    completed_at: string | null;
    last_activity_at: string | null;
    /** Minutes of lesson time in the last 7 days. */
    minutes_7d: number;
    videos_completed: number;
    videos_total: number;
    exams_taken: number;
    best_exam_score?: number | null;
    first_exam_score?: number | null;
    quizzes_passed?: number;
    quizzes_attempted?: number;
    effort?: string;
}

export interface MemberVideoState {
    percent_watched: number;
    completed: boolean;
    position_seconds: number;
}

export interface MemberQuizState {
    attempts: number;
    best: number;
    latest: number;
    passed: boolean;
    last_submitted_at: string | null;
}

export interface MemberCourseDetailedProgress {
    user_id: number;
    username: string;
    first_name?: string;
    last_name?: string;
    /** Course skeleton (units tree) with this member's statuses overlaid. */
    progress: Record<string, unknown> | null;
    /** ISO timestamps keyed by unit ref. */
    unit_completed_at?: Record<string, string>;
    /** Video state keyed by unit ref. */
    videos?: Record<string, MemberVideoState>;
    quizzes?: Record<string, MemberQuizState>;
    last_activity_at?: string | null;
}

export interface UserOrganization {
    id: number;
    name: string;
    role: 'manager' | 'member';
    class_id: number | null;
    class_name: string | null;
}

export interface MemberQuizAttempt {
    id: number;
    exam_id: number;
    course_id: number;
    course_title: string | null;
    scope: string;
    exam_pool: string | null;
    scope_refs: string[];
    title: string;
    attempt_no: number;
    score: number;
    passed: boolean;
    submitted_at: string;
    section_breakdown: {
        unit_ref: string | null;
        sub_unit_ref: string | null;
        unit_title?: string | null;
        sub_unit_title?: string | null;
        correct: number;
        total: number;
        score_percent: number;
        failed_standards?: string[];
    }[] | null;
}

export interface MemberQuizSummary {
    course_id: number;
    course_title: string | null;
    scope: string;
    exam_pool: string | null;
    scope_ref: string;
    title: string;
    attempts: number;
    best: number;
    latest: number;
    first: number;
    passed: boolean;
    last_submitted_at: string;
}

export interface MemberQuizHistory {
    effort: string;
    minutes_7d: number;
    exam_starts_30d: number;
    exam_submits_30d: number;
    quizzes: MemberQuizSummary[];
    attempts: MemberQuizAttempt[];
}
