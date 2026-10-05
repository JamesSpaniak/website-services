'use client';

import { useState } from 'react';
import { deleteAccount } from '@/app/lib/api-client';
import { useAuth } from '@/app/lib/auth-context';

const CONFIRM_WORD = 'DELETE';

/**
 * Self-service account deletion (App Store 5.1.1(v), privacy § 9). Hidden for
 * admins; students in a school account see who to ask instead — the school
 * manages those accounts and the backend refuses them too.
 */
export default function DeleteAccountSection() {
    const { user } = useAuth();
    const [open, setOpen] = useState(false);
    const [confirmText, setConfirmText] = useState('');
    const [password, setPassword] = useState('');
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);

    if (!user || user.role === 'admin') return null;

    if (user.organization?.role === 'member') {
        return (
            <div className="mt-10">
                <h3 className="text-lg font-semibold text-[var(--brand-foreground)]">Delete account</h3>
                <p className="mt-2 text-sm text-[var(--brand-muted)]">
                    {user.organization.name} manages this account. To delete it, ask your teacher, or email{' '}
                    <a href="mailto:james@thedroneedge.com" className="text-[var(--brand-primary)] hover:underline">
                        james@thedroneedge.com
                    </a>
                    .
                </p>
            </div>
        );
    }

    const canSubmit = confirmText === CONFIRM_WORD && password.length > 0 && !busy;

    const reset = () => {
        setOpen(false);
        setConfirmText('');
        setPassword('');
        setError(null);
    };

    const handleDelete = async () => {
        if (!canSubmit) return;
        setBusy(true);
        setError(null);
        try {
            await deleteAccount(password);
            // Full load, not router.replace: clearing the user while /profile is
            // mounted would let the auth guard bounce to /login first. The
            // reload re-checks the (now cleared) session cookies.
            window.location.replace('/account-deleted');
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Could not delete the account. Please try again.');
            setBusy(false);
        }
    };

    return (
        <div className="mt-10">
            <h3 className="text-lg font-semibold text-[var(--brand-foreground)]">Delete account</h3>
            {!open ? (
                <div className="mt-2 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <p className="text-sm text-[var(--brand-muted)]">
                        Permanently delete your account and everything in it. This cannot be undone.
                    </p>
                    <button
                        type="button"
                        onClick={() => setOpen(true)}
                        className="px-4 py-2 rounded-md text-sm font-medium border border-red-500/60 text-red-500 hover:bg-red-500/10 whitespace-nowrap"
                    >
                        Delete account
                    </button>
                </div>
            ) : (
                <div className="mt-3 p-4 rounded-lg border border-red-500/50 bg-red-500/5 space-y-4" role="region" aria-label="Confirm account deletion">
                    <div className="text-sm text-[var(--brand-foreground)] space-y-2">
                        <p className="font-medium">This permanently removes:</p>
                        <ul className="list-disc pl-5 text-[var(--brand-muted)] space-y-1">
                            <li>Your profile, course progress and exam history</li>
                            <li>Your comments</li>
                            <li>Access to every course you bought — this is not a refund</li>
                            <li>Your Pro membership, cancelled now with no partial-month refund</li>
                            <li>Any waitlist or newsletter signups for {user.email}</li>
                        </ul>
                        <p className="text-[var(--brand-muted)]">
                            We keep payment records only as long as tax and dispute rules require.
                        </p>
                    </div>

                    <div>
                        <label htmlFor="delete-confirm" className="block text-sm font-medium text-[var(--brand-foreground)]">
                            Type <span className="font-mono">{CONFIRM_WORD}</span> to confirm
                        </label>
                        <input
                            id="delete-confirm"
                            type="text"
                            autoComplete="off"
                            value={confirmText}
                            onChange={(e) => setConfirmText(e.target.value)}
                            className="mt-1 block w-full sm:max-w-xs px-3 py-2 rounded-md sm:text-sm border border-[var(--input-border)] bg-[var(--input-bg)] text-[var(--input-text)] focus:ring-2 focus:ring-[var(--brand-primary)]"
                        />
                    </div>
                    <div>
                        <label htmlFor="delete-password" className="block text-sm font-medium text-[var(--brand-foreground)]">
                            Password
                        </label>
                        <input
                            id="delete-password"
                            type="password"
                            autoComplete="current-password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            onKeyDown={(e) => { if (e.key === 'Enter') handleDelete(); }}
                            className="mt-1 block w-full sm:max-w-xs px-3 py-2 rounded-md sm:text-sm border border-[var(--input-border)] bg-[var(--input-bg)] text-[var(--input-text)] focus:ring-2 focus:ring-[var(--brand-primary)]"
                        />
                    </div>

                    {error && <p className="text-sm text-red-500" role="alert">{error}</p>}

                    <div className="flex flex-wrap gap-2">
                        <button
                            type="button"
                            onClick={handleDelete}
                            disabled={!canSubmit}
                            className="px-4 py-2 rounded-md text-sm font-semibold text-white bg-red-600 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {busy ? 'Deleting…' : 'Permanently delete my account'}
                        </button>
                        <button
                            type="button"
                            onClick={reset}
                            disabled={busy}
                            className="px-4 py-2 rounded-md text-sm font-medium border border-[var(--surface-border)] text-[var(--brand-foreground)] bg-[var(--surface)] hover:opacity-90"
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
