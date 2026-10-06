// Field Notes issues — mirror backend/src/newsletter/ (newsletter.service.ts).

import type { LeadInterest } from './lead';

export type IssueStatus = 'draft' | 'approved' | 'sending' | 'sent';

export interface IssueCorrection {
    at: string;
    note: string;
}

export interface NewsletterIssue {
    id: number;
    slug: string;
    subject: string;
    preheader: string | null;
    lists: LeadInterest[];
    corrections: IssueCorrection[];
    status: IssueStatus;
    approved_by: number | null;
    approved_at: string | null;
    sent_at: string | null;
    recipients: number | null;
    sent_count: number;
    failed_count: number;
    created_at: string;
    updated_at: string;
}

export interface IssuePreview {
    slug: string;
    subject: string;
    preheader: string | null;
    lists: LeadInterest[];
    email_html: string;
    email_text: string;
    web_html: string;
    warnings: string[];
}

export interface IssueDetail {
    issue: NewsletterIssue;
    preview: IssuePreview;
}

export interface IssueImportResult {
    issue: NewsletterIssue;
    action: 'created' | 'replaced' | 'web_corrected';
    preview: IssuePreview;
}

export interface IssueCount {
    recipients: number;
    already_sent: number;
    ready: boolean;
}

export interface PublicIssueSummary {
    slug: string;
    subject: string;
    sent_at: string;
}

export interface PublicIssue extends PublicIssueSummary {
    html: string;
    corrections: IssueCorrection[];
    listed: boolean;
}

/** GET /newsletter/issues/:slug/metrics — admin only. */
export interface IssueMetrics {
    sent: number;
    failed: number;
    delivered: number;
    bounced: number;
    complaints: number;
    /** Inflated by Apple Mail Privacy Protection — not a reading signal. */
    opens: number;
    clickers: number;
    human_clicks: number;
    scanner_clicks: number;
    unsubscribes: number;
    click_rate: number | null;
    by_section: { section: string; clicks: number; people: number }[];
    people: { email: string; first_click: string; clicks: number; sections: string[] }[];
}
