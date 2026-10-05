'use client';

import { useEffect, useState } from 'react';
import { getMyEmailLists, updateMyEmailList } from '@/app/lib/api-client';
import { useAuth } from '@/app/lib/auth-context';
import { LEAD_INTEREST_LABELS, type LeadInterest, type LeadPreference } from '@/app/lib/types/lead';

/**
 * Profile email preferences (newsletter plan NL16b / NL-A2): opt in and out
 * of Field Notes, and leave any waitlist this email joined. Same `leads` rows
 * and unsubscribe semantics as the email footer link. Not rendered for
 * admins or for students in a school account (no marketing lists for them).
 */
export default function EmailPreferencesSection() {
    const { user } = useAuth();
    const [lists, setLists] = useState<LeadPreference[] | null>(null);
    const [busy, setBusy] = useState<LeadInterest | null>(null);
    const [message, setMessage] = useState<string | null>(null);

    const eligible = !!user && user.role !== 'admin' && user.organization?.role !== 'member';

    useEffect(() => {
        if (!eligible) return;
        getMyEmailLists()
            .then((prefs) => setLists(prefs.interests))
            .catch(() => setLists([]));
    }, [eligible, user?.email]);

    if (!eligible || lists === null) return null;

    const subscribed = (interest: LeadInterest) =>
        lists.some((l) => l.interest === interest && l.subscribed);
    // Field Notes is always offered; other lists only once this email joined them.
    const shown: LeadInterest[] = [
        'newsletter',
        ...lists
            .map((l) => l.interest)
            .filter((i): i is LeadInterest => i !== 'newsletter' && i in LEAD_INTEREST_LABELS),
    ];

    const toggle = async (interest: LeadInterest) => {
        const next = !subscribed(interest);
        setBusy(interest);
        setMessage(null);
        try {
            const prefs = await updateMyEmailList(interest, next);
            setLists(prefs.interests);
            setMessage(
                next
                    ? `Subscribed to ${LEAD_INTEREST_LABELS[interest]}. Check your inbox for a confirmation.`
                    : `Unsubscribed from ${LEAD_INTEREST_LABELS[interest]}.`,
            );
        } catch (e) {
            setMessage(e instanceof Error ? e.message : 'Could not update your email preferences.');
        } finally {
            setBusy(null);
        }
    };

    return (
        <div>
            <h4 className="text-sm font-medium text-[var(--brand-foreground)]">Email preferences</h4>
            <p className="mt-1 text-xs text-[var(--brand-muted)]">
                For {user!.email}. Account emails (sign-in, receipts, password resets) always arrive.
            </p>
            <ul className="mt-3 space-y-2">
                {shown.map((interest) => (
                    <li key={interest}>
                        <label className="flex items-start gap-2 text-sm text-[var(--brand-foreground)]">
                            <input
                                type="checkbox"
                                checked={subscribed(interest)}
                                disabled={busy !== null}
                                onChange={() => toggle(interest)}
                                className="mt-0.5 h-4 w-4 shrink-0 accent-[var(--brand-primary)]"
                            />
                            <span>
                                {LEAD_INTEREST_LABELS[interest]}
                                {interest === 'newsletter' && (
                                    <span className="block text-xs text-[var(--brand-muted)]">
                                        Once a month, first Tuesday. Adults 18+.
                                    </span>
                                )}
                            </span>
                        </label>
                    </li>
                ))}
            </ul>
            {message && (
                <p className="mt-2 text-xs text-[var(--brand-muted)]" role="status">
                    {message}
                </p>
            )}
        </div>
    );
}
