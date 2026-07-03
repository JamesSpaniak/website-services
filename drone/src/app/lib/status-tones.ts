/** Shared status / role badge tones using design tokens (no hardcoded pastel chips). */

export const PROGRESS_STATUS_TONE: Record<string, string> = {
    COMPLETED: 'bg-green-500/10 text-green-400 border border-green-500/20',
    IN_PROGRESS: 'bg-sky-500/10 text-sky-400 border border-sky-500/20',
    NOT_STARTED: 'bg-[var(--comment-secondary-bg)] text-[var(--brand-muted)] border border-[var(--surface-border)]',
};

export const ORG_ROLE_TONE: Record<string, string> = {
    manager: 'bg-violet-500/10 text-violet-400 border border-violet-500/20',
    member: 'bg-[var(--comment-secondary-bg)] text-[var(--brand-foreground)] border border-[var(--surface-border)]',
};

export const AUDIT_ACTION_TONE: Record<string, string> = {
    LOGIN: 'bg-[var(--comment-secondary-bg)] text-[var(--brand-foreground)] border border-[var(--surface-border)]',
    REGISTER: 'bg-green-500/10 text-green-400 border border-green-500/20',
    VERIFY_EMAIL: 'bg-green-500/10 text-green-400 border border-green-500/20',
    COURSE_STARTED: 'bg-sky-500/10 text-sky-400 border border-sky-500/20',
    UNIT_COMPLETED: 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20',
    EXAM_SUBMITTED: 'bg-violet-500/10 text-violet-400 border border-violet-500/20',
    COURSE_COMPLETED: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
    PROGRESS_RESET: 'bg-red-500/10 text-red-400 border border-red-500/20',
    COURSE_PURCHASED: 'bg-amber-500/10 text-amber-400 border border-amber-500/20',
    PRO_UPGRADE: 'bg-amber-500/10 text-amber-400 border border-amber-500/20',
};

export function progressBarTone(pct: number): string {
    return pct === 100 ? 'bg-green-500' : 'bg-[var(--brand-primary)]';
}
