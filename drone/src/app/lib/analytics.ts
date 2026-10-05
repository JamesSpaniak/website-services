'use client';

import type { AnalyticsEventPayload, ProductEventName, VideoPlaybackState } from './types/analytics';
import { pageViewAttributionFields } from './attribution';
import { refreshSession } from './api-client';

const getApiBase = () => {
    if (typeof window !== 'undefined') return '/api';
    return process.env.API_INTERNAL_BASE_URL || 'http://localhost:3000';
};

// ── Batching queue ───────────────────────────────────────────────────────────
// Events are queued and flushed as `{ events: [...] }` every FLUSH_MS, when the
// queue reaches MAX_BATCH, or on pagehide / tab-hidden via sendBeacon. One
// request per flush instead of one per event keeps a 30-student classroom well
// inside the per-user rate limit (docs/tech/analytics-implementation-plan.md § 4.3).
//
// Delivery (docs/tech/progress-tracking-accuracy.md R1, R11, R12):
//  • The queue — including a batch whose fetch has not answered yet — is
//    mirrored to sessionStorage, so a reload or a page killed mid-request
//    resends it on the next load. Event ids make every resend idempotent.
//  • Network errors (offline, flaky Wi-Fi) never drop events: the batch goes
//    back to the head of the queue and waits for `online` or the backoff.
//    Only a server that keeps failing (429 / 5xx, MAX_ATTEMPTS times) drops one.
//  • 400/413 mean the payload itself is bad and are dropped (the backend
//    validates per event, so one bad event no longer costs the batch).
//  • 401 = signed-in learner whose access cookie expired (backend answers 401
//    only when the refresh cookie is still present): refresh the session and
//    resend. If the refresh fails, resend flagged `x-analytics-guest` so it is
//    handled like a guest's batch instead of looping.
//  • Page going away: everything still queued (and any batch in flight) is
//    handed to sendBeacon in MAX_BATCH chunks. Beacon outcomes are unknowable
//    and treated as delivered.
// Nothing here ever throws into the caller.

const FLUSH_MS = 5000;
const MAX_BATCH = 20;
/** ~8 h of heartbeats — an offline afternoon survives; sessionStorage stays small. */
const MAX_QUEUE = 1000;
const MAX_ATTEMPTS = 5;
const MAX_BACKOFF_MS = 60_000;
const MAX_AUTH_RETRIES = 2;
const SESSION_KEY = 'de:session';
const QUEUE_KEY = 'de:analytics:queue';
const ANON_KEY = 'de:anon';
const ANON_LINKED_KEY = 'de:anon:linked';

let queue: AnalyticsEventPayload[] = [];
/** Batch handed to fetch and not yet answered; persisted with the queue. */
let inFlightBatch: AnalyticsEventPayload[] | null = null;
let flushTimer: ReturnType<typeof setTimeout> | null = null;
let listenersBound = false;
let attempts = 0;
let authRetries = 0;
/** Session refresh failed on this page — stop asking the backend to wait for one. */
let sendAsGuest = false;
let queueRestored = false;
/** Run before a page-leaving flush so components can queue their last state. */
const beforeLeaveHooks = new Set<() => void>();

/**
 * Registers a callback that runs right before the page-leaving beacon (tab
 * hidden / pagehide), so state such as unsent video ranges rides along.
 * Returns the unregister function.
 */
export function onBeforeLeave(fn: () => void): () => void {
    beforeLeaveHooks.add(fn);
    return () => {
        beforeLeaveHooks.delete(fn);
    };
}

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
        const pending = inFlightBatch ? [...inFlightBatch, ...queue] : queue;
        if (pending.length === 0) window.sessionStorage.removeItem(QUEUE_KEY);
        else window.sessionStorage.setItem(QUEUE_KEY, JSON.stringify(pending));
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
            queue = [...saved, ...queue].slice(-MAX_QUEUE);
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

function isOffline(): boolean {
    return typeof navigator !== 'undefined' && navigator.onLine === false;
}

/**
 * Puts a failed batch back at the head of the queue. `transient` (network
 * error) never drops — offline waits for the `online` event, otherwise it
 * retries with backoff. Server failures drop after MAX_ATTEMPTS.
 */
function requeue(batch: AnalyticsEventPayload[], transient: boolean): void {
    attempts += 1;
    if (!transient && attempts > MAX_ATTEMPTS) {
        console.error(`[analytics] dropping ${batch.length} events after ${MAX_ATTEMPTS} failed flushes`);
        attempts = 0;
        persistQueue();
        if (queue.length) scheduleFlush(FLUSH_MS);
        return;
    }
    queue = [...batch, ...queue].slice(-MAX_QUEUE);
    persistQueue();
    if (transient && isOffline()) return; // the `online` listener resumes
    scheduleFlush(Math.min(MAX_BACKOFF_MS, FLUSH_MS * 2 ** Math.min(attempts, 4)));
}

/** Page is going away: hand everything pending to the browser in MAX_BATCH chunks. */
function beaconAll(url: string): boolean {
    if (typeof navigator === 'undefined' || !navigator.sendBeacon) return false;
    const pending = inFlightBatch ? [...inFlightBatch, ...queue] : [...queue];
    let sent = 0;
    while (sent < pending.length) {
        const chunk = pending.slice(sent, sent + MAX_BATCH);
        if (!navigator.sendBeacon(url, new Blob([envelope(chunk)], { type: 'application/json' }))) break;
        sent += chunk.length;
    }
    if (sent === 0) return false;
    // The in-flight batch stays owned by its fetch (a duplicate is deduped by
    // event id); everything else that was beaconed leaves the queue.
    const inFlightSet = new Set(inFlightBatch ?? []);
    queue = pending.slice(sent).filter((e) => !inFlightSet.has(e));
    persistQueue();
    return true;
}

export function flushAnalytics(useBeacon = false): void {
    if (typeof window === 'undefined') return;
    if (flushTimer) {
        clearTimeout(flushTimer);
        flushTimer = null;
    }
    const url = `${getApiBase()}/analytics/event`;
    if (useBeacon) {
        for (const hook of beforeLeaveHooks) {
            try {
                hook();
            } catch {
                /* a component hook must never block delivery */
            }
        }
        if (beaconAll(url) && queue.length === 0) return;
    }
    if (queue.length === 0 || inFlightBatch) return;

    const batch = queue.slice(0, MAX_BATCH);
    queue = queue.slice(MAX_BATCH);
    inFlightBatch = batch;
    persistQueue();

    const settle = () => {
        inFlightBatch = null;
    };
    try {
        const anon = anonymousId();
        const headers: Record<string, string> = { 'Content-Type': 'application/json' };
        if (anon) headers['x-anonymous-id'] = anon;
        if (sendAsGuest) headers['x-analytics-guest'] = '1';
        fetch(url, {
            method: 'POST',
            headers,
            body: envelope(batch),
            keepalive: true,
            credentials: 'same-origin',
        })
            .then(async (res) => {
                if (res.status === 401 && authRetries < MAX_AUTH_RETRIES) {
                    // Stay in flight through the refresh so no other flush races it.
                    authRetries += 1;
                    if (!(await refreshSession())) sendAsGuest = true;
                    settle();
                    queue = [...batch, ...queue].slice(-MAX_QUEUE);
                    persistQueue();
                    scheduleFlush(0);
                    return;
                }
                settle();
                if (res.ok) {
                    attempts = 0;
                    authRetries = 0;
                    persistQueue();
                    if (queue.length) scheduleFlush(0);
                } else if (res.status === 429 || res.status >= 500) {
                    requeue(batch, false);
                } else {
                    // 400/401/413: the payload is the problem — retrying cannot help.
                    console.error(`[analytics] batch rejected (${res.status}); dropped ${batch.length} events`);
                    attempts = 0;
                    persistQueue();
                    if (queue.length) scheduleFlush(FLUSH_MS);
                }
            })
            .catch((err) => {
                settle();
                console.error('[analytics] flush failed', err);
                requeue(batch, true);
            });
    } catch (err) {
        settle();
        console.error('[analytics] post failed', err);
        requeue(batch, true);
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
    window.addEventListener('online', () => {
        attempts = 0;
        flushAnalytics();
    });
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
    // First-touch attribution (de_attr cookie, set by middleware) — utm_source /
    // utm_medium / utm_campaign / ref only, each ≤ 200 chars.
    const attribution = pageViewAttributionFields();
    track('page_view', {
        path: safePath,
        referrer: typeof document !== 'undefined' ? document.referrer || undefined : undefined,
        ...(Object.keys(attribution).length ? { properties: attribution } : {}),
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

/** Every registered player (the lesson's own video and its sections' videos). */
export function listVideoStates(): [string, VideoPlaybackState][] {
    return Array.from(videoStates.entries());
}

/** Any registered video currently playing (used to keep heartbeats alive during passive watching). */
export function anyVideoPlaying(): boolean {
    for (const s of videoStates.values()) if (s.playing) return true;
    return false;
}
