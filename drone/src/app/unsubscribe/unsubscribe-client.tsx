'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { CheckCircleIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import { ApiError, getLeadPreferences, unsubscribeLead } from '@/app/lib/api-client';
import { leadInterestLabel, type LeadPreferencesResponse } from '@/app/lib/types/lead';
import LoadingComponent from '@/app/ui/components/loading';

type LoadState = 'loading' | 'ready' | 'invalid' | 'error';

/**
 * Preference page behind the unsubscribe link in marketing email (`?t=` is
 * the signed per-lead token). Checkboxes show what the address is subscribed
 * to; unchecking + Save unsubscribes those interests, "Unsubscribe from all"
 * omits `interests`. There is no resubscribe here — that happens by joining a
 * waitlist again.
 */
export default function UnsubscribeClient() {
  const token = useSearchParams().get('t');
  const [state, setState] = useState<LoadState>('loading');
  const [prefs, setPrefs] = useState<LeadPreferencesResponse | null>(null);
  const [keep, setKeep] = useState<Record<string, boolean>>({});
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!token) {
      setState('invalid');
      return;
    }
    try {
      const data = await getLeadPreferences(token);
      setPrefs(data);
      setKeep(Object.fromEntries(data.interests.map((i) => [i.interest, i.subscribed])));
      setState('ready');
    } catch (err) {
      setState(err instanceof ApiError && (err.status === 400 || err.status === 404) ? 'invalid' : 'error');
    }
  }, [token]);

  useEffect(() => {
    load();
  }, [load]);

  const submit = async (interests?: string[]) => {
    if (!token) return;
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      await unsubscribeLead(interests ? { t: token, interests } : { t: token });
      setNotice(
        interests
          ? 'Your preferences are saved.'
          : 'You’re unsubscribed from all Drone Edge marketing emails.',
      );
      await load();
    } catch (err) {
      if (err instanceof ApiError && (err.status === 400 || err.status === 404)) {
        setState('invalid');
      } else if (err instanceof ApiError && err.status === 429) {
        setError('Too many tries, please wait a minute.');
      } else {
        setError('Something went wrong. Please try again in a moment.');
      }
    } finally {
      setBusy(false);
    }
  };

  if (state === 'loading') return <LoadingComponent />;

  if (state === 'invalid' || state === 'error') {
    return (
      <div
        className="flex items-start gap-3 border border-[var(--surface-border)] bg-[var(--surface)] p-5 text-sm text-[var(--brand-foreground)]"
        style={{ borderRadius: 'var(--radius-md)' }}
        role="alert"
      >
        <ExclamationTriangleIcon className="h-5 w-5 shrink-0 text-amber-500" aria-hidden />
        <div>
          <p className="font-semibold">
            {state === 'invalid' ? 'This link is invalid or has expired.' : 'We couldn’t load your preferences.'}
          </p>
          <p className="mt-1 text-[var(--brand-muted)]">
            {state === 'invalid'
              ? 'Use the unsubscribe link from your most recent Drone Edge email, or '
              : 'Please try again in a moment, or '}
            <Link href="/contact" className="text-[var(--brand-primary)] underline underline-offset-2">
              contact us
            </Link>{' '}
            and we&apos;ll remove you by hand.
          </p>
        </div>
      </div>
    );
  }

  const interests = prefs?.interests ?? [];
  const subscribed = interests.filter((i) => i.subscribed);
  const toUnsubscribe = subscribed.filter((i) => !keep[i.interest]).map((i) => i.interest);

  return (
    <div
      className="border border-[var(--surface-border)] bg-[var(--surface)] p-5 sm:p-6"
      style={{ borderRadius: 'var(--radius-md)' }}
    >
      {prefs?.email_masked && (
        <p className="mb-4 text-sm text-[var(--brand-muted)]">
          Emails to <span className="font-medium text-[var(--brand-foreground)]">{prefs.email_masked}</span>
        </p>
      )}

      {notice && (
        <div
          className="mb-4 flex items-start gap-2 border border-[var(--brand-primary)]/40 bg-[var(--brand-primary)]/10 p-3 text-sm text-[var(--brand-foreground)]"
          style={{ borderRadius: 'var(--radius-sm)' }}
          role="status"
        >
          <CheckCircleIcon className="h-5 w-5 shrink-0 text-[var(--brand-primary)]" aria-hidden />
          {notice}
        </div>
      )}
      {error && (
        <p className="mb-4 text-sm text-red-500 dark:text-red-400" role="alert">
          {error}
        </p>
      )}

      {interests.length === 0 ? (
        <p className="text-sm text-[var(--brand-muted)]">This address isn&apos;t on any of our email lists.</p>
      ) : (
        <fieldset disabled={busy}>
          <legend className="mb-2 text-sm font-semibold text-[var(--brand-foreground)]">Keep sending me:</legend>
          <ul className="space-y-1">
            {interests.map((i) => {
              const id = `pref-${i.interest}`;
              return (
                <li key={i.interest}>
                  <label
                    htmlFor={id}
                    className={`flex min-h-[44px] items-center gap-3 text-sm ${i.subscribed ? 'text-[var(--brand-foreground)] cursor-pointer' : 'text-[var(--brand-muted)]'}`}
                  >
                    <input
                      id={id}
                      type="checkbox"
                      className="h-4 w-4 accent-[var(--brand-primary)]"
                      checked={i.subscribed && !!keep[i.interest]}
                      disabled={!i.subscribed}
                      onChange={(e) => setKeep((k) => ({ ...k, [i.interest]: e.target.checked }))}
                    />
                    {leadInterestLabel(i.interest)}
                    {!i.subscribed && <span className="text-xs">(unsubscribed)</span>}
                  </label>
                </li>
              );
            })}
          </ul>

          <div className="mt-6 flex flex-col sm:flex-row gap-3">
            <button
              type="button"
              onClick={() => submit(toUnsubscribe)}
              disabled={busy || toUnsubscribe.length === 0}
              className="inline-flex min-h-[44px] items-center justify-center px-5 text-sm font-semibold bg-[var(--brand-primary)] text-[var(--brand-black)] hover:opacity-90 disabled:opacity-40 transition-opacity touch-manipulation"
              style={{ borderRadius: 'var(--radius-sm)' }}
            >
              {busy ? 'Saving…' : 'Save preferences'}
            </button>
            <button
              type="button"
              onClick={() => submit()}
              disabled={busy || subscribed.length === 0}
              className="inline-flex min-h-[44px] items-center justify-center px-5 text-sm font-medium border border-[var(--surface-border)] text-[var(--brand-foreground)] hover:bg-[var(--background)] disabled:opacity-40 transition-colors touch-manipulation"
              style={{ borderRadius: 'var(--radius-sm)' }}
            >
              Unsubscribe from all
            </button>
          </div>
        </fieldset>
      )}
    </div>
  );
}
