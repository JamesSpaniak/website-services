/**
 * Frontend mirrors of the analytics / reporting API shapes.
 * Backend source of truth: backend/src/product-events, backend/src/reporting,
 * backend/src/commerce/types/commerce.dto.ts.
 */

export type ProductEventName =
    | 'page_view' | 'article_view' | 'course_view' | 'pricing_viewed'
    | 'lesson_viewed' | 'lesson_heartbeat'
    | 'video_started' | 'video_progress' | 'video_completed' | 'video_position'
    | 'course_started' | 'lesson_completed' | 'unit_completed' | 'course_completed'
    | 'exam_start' | 'exam_started' | 'exam_submit' | 'exam_submitted' | 'exam_category_scored'
    | 'checkout_started' | 'purchase_completed' | 'pro_checkout_started' | 'billing_portal_opened'
    | 'upsell_shown' | 'upsell_accepted' | 'upsell_declined'
    | 'downsell_shown' | 'downsell_accepted' | 'downsell_declined'
    | 'kit_lead' | 'parts_list_downloaded' | 'outbound_vendor_click' | 'referral_clicked'
    | 'signup_started' | 'signup_completed' | 'login' | 'email_verified' | 'identified'
    | 'invite_sent' | 'invite_redeemed' | 'manager_dashboard_viewed' | 'org_progress_exported' | 'class_created'
    | 'feature_used';

export interface AnalyticsEventPayload {
    event: ProductEventName;
    path?: string;
    referrer?: string;
    contentId?: string;
    title?: string;
    courseId?: number;
    unitRef?: string;
    position?: number;
    duration?: number;
    playing?: boolean;
    /** Newly watched [start, end] second ranges since the previous event. */
    ranges?: number[][];
    offerId?: string;
    placement?: string;
    feature?: string;
    sessionId?: string;
    eventId?: string;
    occurredAt?: string;
    properties?: Record<string, unknown>;
}

export interface VideoResume {
    position_seconds: number;
    percent_watched: number;
    completed: boolean;
}

export interface UnitMediaResponse {
    video_url?: string;
    resume: VideoResume | null;
}

/** Live player state published by VideoComponent for the heartbeat. */
export interface VideoPlaybackState {
    position: number;
    duration: number;
    playing: boolean;
    /** Drains and returns ranges watched since last call. */
    takeRanges: () => number[][];
}

// ── Manager (organization) reads ──

export interface MemberEngagementRow {
    user_id: number;
    username: string;
    first_name?: string;
    last_name?: string;
    class_id: number | null;
    minutes: number;
    lessons_viewed: number;
    videos_completed: number;
    units_completed: number;
    exams_submitted: number;
    active_days: number;
    last_activity_at: string | null;
}

export interface OrgEngagementResponse {
    days: number;
    members: MemberEngagementRow[];
    series: { day: string; minutes: number; active_members: number }[];
}

export interface OrgUtilizationResponse {
    organization_id: number;
    seats_purchased: number;
    members: number;
    invites_sent: number;
    invites_redeemed: number;
    members_activated: number;
    members_engaged_7d: number;
    members_engaged_30d: number;
    members_completed: number;
    avg_pct_complete: number;
    hours_engaged_total: number;
    hours_engaged_30d: number;
    utilization_pct_30d: number;
    courses_assigned: number;
    stalled_member_ids: number[];
}

export interface MemberTimelineEvent {
    occurred_at: string;
    event_name: string;
    course_id: number | null;
    course_title: string | null;
    unit_ref: string | null;
    unit_title: string | null;
    properties: Record<string, unknown>;
}

// ── Company reporting (admin) ──

export interface ReportingSourceRow {
    primary_source: string;
    entitlements: number;
    users: number;
    activation_pct: number | null;
    avg_pct_complete: number;
    completed: number;
    stalled: number;
}

export interface ReportingOverview {
    learners_entitled: number;
    paying_learners: number;
    active_7d: number;
    active_30d: number;
    activation_rate_pct: number | null;
    activation_denominator: number;
    median_utilization_pct: number | null;
    pro_active: number;
    mrr_cents: string | number;
    revenue_30d_cents: string | number;
    contribution_total_cents: string | number;
    contribution_per_payer_cents: string | number | null;
    avg_org_utilization_pct: number | null;
    organizations: number;
    events_24h: number;
    views_refreshed_at: string | null;
    by_source: ReportingSourceRow[];
}

export interface ActivationWeekRow {
    week: string;
    primary_source: string;
    entitled: number;
    activated: number;
    activation_pct: number | null;
    avg_days_to_start: string | number | null;
}

export interface ReportingUtilization {
    buckets: { primary_source: string; bucket: number; n: number }[];
    by_course: {
        course_id: number;
        title: string;
        entitled: number;
        started: number;
        completed: number;
        median_pct: number | null;
        avg_minutes: number | null;
        avg_videos_completed: string | number | null;
    }[];
}

export interface RevenueMonthRow {
    month: string;
    product_type: string;
    orders: number;
    gross_cents: string | number;
    refunded_cents: string | number;
    net_cents: string | number;
    cogs_cents: string | number;
}

export interface ReportingRevenue {
    monthly: RevenueMonthRow[];
    totals: {
        gross_cents: string | number;
        refunded_cents: string | number;
        net_cents: string | number;
        contribution_cents: string | number;
        digital_cents: string | number;
        hardware_cents: string | number;
        mrr_cents: string | number;
        payers: number;
        avg_net_per_payer_cents: string | number | null;
        repeat_buyers: number;
    };
    by_sku: { sku: string; name: string | null; product_type: string; units: number; net_cents: string | number; buyers: number }[];
    payment_methods: { payment_method: string; orders: number; net_cents: string | number }[];
}

export interface ReportingPro {
    active: number;
    active_yearly: number;
    mrr_cents: string | number;
    payment_failed_30d: number;
    cancel_scheduled_30d: number;
    avg_pct_complete: number | null;
    avg_courses_touched: string | number | null;
    monthly: { month: string; started: number; renewed: number; cancelled: number; expired: number; payment_failed: number }[];
    cohorts: { cohort_month: string; started: number; still_active: number; cancelled: number; expired: number; avg_months: string | number | null }[];
}

export interface OrgUtilizationRow {
    organization_id: number;
    name: string;
    seats_purchased: number;
    seats_ordered: number;
    invites_sent: number;
    invites_redeemed: number;
    members: number;
    members_activated: number;
    members_engaged_7d: number;
    members_engaged_30d: number;
    avg_pct_complete: number;
    members_completed: number;
    hours_engaged_total: string | number;
    hours_engaged_30d: string | number;
    manager_last_seen_at: string | null;
    utilization_pct_30d: number;
    courses_assigned: number;
}

export interface CourseFunnelUnit {
    course_id: number;
    unit_ref: string;
    title: string;
    depth: number;
    path: string;
    position: number;
    has_video: boolean;
    entitled: number;
    viewed: number;
    completed: number;
    video_completed: number;
    /** Distinct users who passed (≥70) a quiz scoped to this unit. Live, not the nightly view. */
    quiz_passed: number;
    median_minutes: string | number | null;
}

export interface CourseFunnelExam {
    exam_id: number;
    scope: string;
    exam_pool: string | null;
    scope_refs: string[] | null;
    title: string;
    attempts: number;
    users: number;
    avg_score: number;
    pass_pct: number;
    avg_attempt_no: number | null;
    first_try_avg: number | null;
    last_submitted_at: string | null;
}

export interface CourseFunnelExamAttempt {
    id: number;
    user_id: number;
    username: string;
    email: string;
    attempt_no: number;
    score: number;
    submitted_at: string;
    passed: boolean;
    section_breakdown: {
        unit_ref: string | null;
        sub_unit_ref: string | null;
        unit_title?: string | null;
        sub_unit_title?: string | null;
        correct: number;
        total: number;
        score_percent: number;
    }[] | null;
}

export interface CourseFunnelResponse {
    summary: {
        entitled: number;
        started: number;
        activated: number;
        completed: number;
        median_pct: number | null;
        avg_minutes: number | null;
        avg_best_score: number | null;
    };
    units: CourseFunnelUnit[];
    exams: CourseFunnelExam[];
}

export interface ReportingSignals {
    stalled_paid_learners: Record<string, unknown>[];
    completed_not_upsold: Record<string, unknown>[];
    pro_at_risk: Record<string, unknown>[];
    low_utilization_orgs: Record<string, unknown>[];
    engaged_free_users: Record<string, unknown>[];
    hot_streak_learners: Record<string, unknown>[];
}

export interface User360 {
    user: Record<string, unknown> & { id: number; username: string; email: string; role: string };
    entitlements: Record<string, unknown>[];
    usage: Record<string, unknown>[];
    revenue: Record<string, unknown> | null;
    orders: Record<string, unknown>[];
    events: { occurred_at: string; event_name: string; course_title: string | null; unit_ref: string | null; properties: Record<string, unknown> }[];
    logins: { logins_30d: number; last_login: string | null };
}

export interface ReportingHealth {
    views_refreshed_at: string | null;
    rollup_computed_at: string | null;
    events_24h: number;
    events_1h: number;
    product_events_size: string;
    partitions: number;
    reconciliation: { check_name: string; mismatches: number; ran_at: string }[];
    clean_nights_of_last_14: number;
}

export interface CohortRow {
    cohort_month: string;
    primary_source: string;
    entitled: number;
    activated: number;
    completed: number;
    stalled: number;
    second_purchase_users: number;
    refunded_users: number;
    users: number;
    avg_pct_complete: number | null;
}
