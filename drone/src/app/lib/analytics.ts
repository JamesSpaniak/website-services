'use client';

import type { AnalyticsEventPayload, ProductEventName, VideoPlaybackState } from './types/analytics';

const getApiBase = () => {
    if (typeof window !== 'undefined') return '/api';
    return process.env.API_INTERNAL_BASE_URL || 'http://localhost:3000';
};

// ── Batching queue ───────────────────────────────────────────────────────────
// Events are queued and flushed as `{ events: [...] }` every FLUSH_MS, when the
// queue reaches MAX_BATCH, or on pagehide via sendBeacon. One request per
// flush instead of one per event keeps a 30-student classroom well inside the
// per-user rate limit (backend: docs/tech/analytics-implementation-plan.md § 4.3).
//
// Delivery: a failed flush (network error, 429, 5xx) puts the batch back at the
// head of the queue and retries with backoff; 4xx other than 429 means the
// payload itself is bad and is dropped. The queue is mirrored to
// sessionStorage so a reload mid-lesson does not lose the last few seconds of
// heartbeats. Nothing here ever throws into the caller.

const FLUSH_MS = 5000;
const MAX_BATCH = 20;
const MAX_QUEUE = 200;
const MAX_ATTEMPTS = 5;
const SESSION_KEY = 'de:session';
const QUEUE_KEY = 'de:analytics:queue';
const ANON_KEY = 'de:anon';
const ANON_LINKED_KEY = 'de:anon:linked';

let queue: AnalyticsEventPayload[] = [];
let flushTimer: ReturnType<typeof setTimeout> | null = null;
let listenersBound = false;
let inFlight = false;
let attempts = 0;
let queueRestored = false;

function sessionId(): string | undefined {
    if (typeof window === 'undefined') return undefined;
    try {
        let id = window.sessionStorage.getItem(SESSION_KEY);
        if (!id) {
            id = newId();
            window.sessionStorage.setItem(SESSION_KEY, id);
        }
        return id;
    } catch {
        return undefined;
    }
}

/**
 * First-party anonymous id — a random UUID in localStorage, never a cookie,
 * never sent to a third party. Lets pre-login intent (course/pricing views,
 * checkout started) be joined to the account once the user signs up
 * (docs/tech/analytics-and-attribution.md § consent: legitimate interest,
 * non-identifying pre-login). The backend only stores intent events for it.
 */
export function anonymousId(): string | undefined {
    if (typeof window === 'undefined') return undefined;
    try {
        let id = window.localStorage.getItem(ANON_KEY);
        if (!id) {
            id = newId();
            window.localStorage.setItem(ANON_KEY, id);
        }
        return id;
    } catch {
        return undefined;
    }
}

/**
 * Sends the one `identified` event that stitches this browser's anonymous id
 * to the logged-in user. Idempotent per user per browser. The backend drops it
 * for org members so student browsing stays unlinked.
 */
export function identifyUser(userId: number | string): void {
    if (typeof window === 'undefined') return;
    try {
        const anon = anonymousId();
        if (!anon) return;
        const key = `${userId}:${anon}`;
        if (window.localStorage.getItem(ANON_LINKED_KEY) === key) return;
        window.localStorage.setItem(ANON_LINKED_KEY, key);
        track('identified', { properties: { anonymous_id: anon } });
    } catch {
        /* storage unavailable — skip stitching */
    }
}

function newId(): string {
    if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
    return `${Date.now().toString(16)}-${Math.random().toString(16).slice(2, 10)}-4000-8000-${Math.random()
        .toString(16)
        .slice(2, 14)}`;
}

function persistQueue(): void {
    try {
        if (queue.length === 0) window.sessionStorage.removeItem(QUEUE_KEY);
        else window.sessionStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
    } catch {
        /* quota / private mode — in-memory queue still works */
    }
}

function restoreQueue(): void {
    if (queueRestored) return;
    queueRestored = true;
    try {
        const raw = window.sessionStorage.getItem(QUEUE_KEY);
        if (!raw) return;
        const saved = JSON.parse(raw);
        if (Array.isArray(saved) && saved.length) {
            queue = [...saved.slice(-MAX_QUEUE), ...queue];
        }
    } catch {
        /* corrupt entry — ignore */
    }
}

function envelope(batch: AnalyticsEventPayload[]): string {
    return JSON.stringify({ events: batch, anonymousId: anonymousId() });
}

function scheduleFlush(delayMs: number): void {
    if (flushTimer) return;
    flushTimer = setTimeout(() => {
        flushTimer = null;
        flushAnalytics();
    }, delayMs);
}

function requeue(batch: AnalyticsEventPayload[]): void {
    attempts += 1;
    if (attempts > MAX_ATTEMPTS) {
        console.error(`[analytics] dropping ${batch.length} events after ${MAX_ATTEMPTS} failed flushes`);
        attempts = 0;
        persistQueue();
        if (queue.length) scheduleFlush(FLUSH_MS);
        return;
    }
    queue = [...batch, ...queue].slice(-MAX_QUEUE);
    persistQueue();
    scheduleFlush(Math.min(60_000, FLUSH_MS * 2 ** attempts));
}

export function flushAnalytics(useBeacon = false): void {
    if (typeof window === 'undefined') return;
    if (flushTimer) {
        clearTimeout(flushTimer);
        flushTimer = null;
    }
    if (queue.length === 0 || (inFlight && !useBeacon)) return;

    const batch = queue.slice(0, MAX_BATCH);
    queue = queue.slice(MAX_BATCH);
    persistQueue();
    const url = `${getApiBase()}/analytics/event`;
    const body = envelope(batch);

    try {
        // Page is going away: sendBeacon is the only reliable option. Its
        // outcome is unknowable, so the batch is considered delivered.
        if (useBeacon && typeof navigator !== 'undefined' && navigator.sendBeacon) {
            if (navigator.sendBeacon(url, new Blob([body], { type: 'application/json' }))) {
                if (queue.length) scheduleFlush(0);
                return;
            }
        }
        inFlight = true;
        const anon = anonymousId();
        fetch(url, {
            method: 'POST',
            headers: anon
                ? { 'Content-Type': 'application/json', 'x-anonymous-id': anon }
                : { 'Content-Type': 'application/json' },
            body,
            keepalive: true,
            credentials: 'same-origin',
        })
            .then((res) => {
                inFlight = false;
                if (res.ok) {
                    attempts = 0;
                    if (queue.length) scheduleFlush(0);
                } else if (res.status === 429 || res.status >= 500) {
                    requeue(batch);
                } else {
                    // 400/401/413: the payload is the problem — retrying cannot help.
                    console.error(`[analytics] batch rejected (${res.status}); dropped ${batch.length} events`);
                    attempts = 0;
                    if (queue.length) scheduleFlush(FLUSH_MS);
                }
            })
            .catch((err) => {
                inFlight = false;
                console.error('[analytics] flush failed', err);
                requeue(batch);
            });
    } catch (err) {
        inFlight = false;
        console.error('[analytics] post failed', err);
        requeue(batch);
    }
}

function bindLifecycle(): void {
    if (listenersBound || typeof window === 'undefined') return;
    listenersBound = true;
    restoreQueue();
    window.addEventListener('pagehide', () => flushAnalytics(true));
    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'hidden') flushAnalytics(true);
    });
    window.addEventListener('online', () => flushAnalytics());
    if (queue.length) scheduleFlush(FLUSH_MS);
}

/** Queue one product event. Safe to call during render effects; never throws. */
export function track(event: ProductEventName, payload: Omit<AnalyticsEventPayload, 'event'> = {}): void {
    if (typeof window === 'undefined') return;
    try {
        bindLifecycle();
        queue.push({
            event,
            ...payload,
            sessionId: payload.sessionId ?? sessionId(),
            eventId: payload.eventId ?? newId(),
            occurredAt: payload.occurredAt ?? new Date().toISOString(),
        });
        if (queue.length > MAX_QUEUE) queue = queue.slice(-MAX_QUEUE);
        persistQueue();
        if (queue.length >= MAX_BATCH) {
            flushAnalytics();
        } else {
            scheduleFlush(FLUSH_MS);
        }
    } catch (err) {
        console.error('[analytics] track failed', err);
    }
}

// ── Marketing helpers (unchanged call sites) ─────────────────────────────────

export function trackPageView(path: string | null | undefined): void {
    const safePath = (path && String(path).trim()) || '/';
    track('page_view', {
        path: safePath,
        referrer: typeof document !== 'undefined' ? document.referrer || undefined : undefined,
    });
}

export function trackArticleView(articleId: string | number, title: string): void {
    track('article_view', { path: `/articles/${articleId}`, contentId: String(articleId), title });
}

export function trackCourseView(courseId: string | number, title: string): void {
    track('course_view', { path: `/courses/${courseId}`, contentId: String(courseId), title });
}

export function sendExamEvent(
    event: 'exam_start' | 'exam_submit',
    courseId: number,
    examPool: string,
    scope: string,
    extra?: { score?: number; examId?: number; unitRef?: string },
): void {
    const name = event === 'exam_start' ? 'exam_started' : 'exam_submitted';
    track(name, {
        path: `/courses/${courseId}/exams/${examPool}`,
        courseId,
        contentId: String(courseId),
        unitRef: extra?.unitRef,
        properties: {
            exam_pool: examPool,
            scope,
            score: extra?.score ?? null,
            exam_id: extra?.examId ?? null,
        },
    });
}

// ── Video state registry ─────────────────────────────────────────────────────
// VideoComponent publishes its live state here keyed by unit ref; the lesson
// heartbeat reads it so position / playing / watched ranges ride the 30 s tick
// (no separate video ping — plan § 4.5).

const videoStates = new Map<string, VideoPlaybackState>();

export function publishVideoState(unitRef: string, state: VideoPlaybackState | null): void {
    if (state) videoStates.set(unitRef, state);
    else videoStates.delete(unitRef);
}

export function readVideoState(unitRef: string): VideoPlaybackState | undefined {
    return videoStates.get(unitRef);
}

/** Any registered video currently playing (used to keep heartbeats alive during passive watching). */
export function anyVideoPlaying(): boolean {
    for (const s of videoStates.values()) if (s.playing) return true;
    return false;
}
