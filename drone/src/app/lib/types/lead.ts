// Waitlist / lead capture, unsubscribe preferences, and SES marketing
// broadcast — mirror backend/src/leads/ and backend/src/email/ DTOs.

export const LEAD_INTERESTS = ['building', 'part107', 'schools', 'newsletter'] as const;
export type LeadInterest = (typeof LEAD_INTERESTS)[number];

/** Human labels used on the unsubscribe page and admin Leads tab. */
export const LEAD_INTEREST_LABELS: Record<LeadInterest, string> = {
    building: 'Drone Building early access',
    part107: 'Part 107 course news',
    schools: 'Schools & programs',
    newsletter: 'Field Notes (monthly newsletter)',
};

export function leadInterestLabel(interest: string): string {
    return (LEAD_INTEREST_LABELS as Record<string, string>)[interest] ?? interest;
}

/** First-touch attribution read from the `de_attr` cookie (see lib/attribution.ts). */
export interface LeadAttribution {
    utm_source?: string;
    utm_medium?: string;
    utm_campaign?: string;
    utm_term?: string;
    utm_content?: string;
    gclid?: string;
    fbclid?: string;
    ref?: string;
    landing_path?: string;
}

/** Body of POST /leads. `website` is the honeypot — always sent, normally empty. */
export interface CreateLeadPayload extends LeadAttribution {
    email: string;
    interest: LeadInterest;
    website: string;
    source_path: string;
}

/** POST /leads → 202 for any valid input (no enumeration of existing emails). */
export interface CreateLeadResponse {
    ok: boolean;
}

export interface LeadPreference {
    interest: string;
    subscribed: boolean;
}

/** GET /leads/preferences?t= */
export interface LeadPreferencesResponse {
    email_masked: string;
    interests: LeadPreference[];
}

/** POST /leads/unsubscribe — omit `interests` to unsubscribe from all. */
export interface UnsubscribePayload {
    t: string;
    interests?: string[];
}

export interface UnsubscribeResponse {
    ok: boolean;
    interests: string[];
}

/** GET /leads (admin). */
export interface AdminLeadRow {
    id: number;
    email: string;
    interest: string;
    source_path: string | null;
    utm_source: string | null;
    utm_medium: string | null;
    utm_campaign: string | null;
    created_at: string;
    unsubscribed_at: string | null;
    bounced_at: string | null;
    confirmation_sent_at: string | null;
}

export interface AdminLeadsQuery {
    interest?: string;
    include_unsubscribed?: boolean;
}

export type BroadcastMode = 'dry_run' | 'test' | 'send';

/** POST /email/marketing/broadcast (admin, SES). */
export interface MarketingBroadcastPayload {
    subject: string;
    body_markdown: string;
    interests: string[];
    mode: BroadcastMode;
}

export interface MarketingBroadcastResult {
    recipients: number;
    sent: number;
    failed: number;
    /** false when SES settings, the postal address or the unsubscribe secret is missing on the server. */
    ready: boolean;
    /** `queued` = a real send started in the background (progress in backend logs). */
    status: 'counted' | 'sent' | 'queued';
}
