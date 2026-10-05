import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * Delivery guarantees of the event queue (docs/tech/progress-tracking-accuracy.md
 * Phase 2: R1, R11, R12). The module keeps state, so every test imports a
 * fresh copy after resetting modules and storage.
 */

const refreshSession = vi.fn<() => Promise<boolean>>();
vi.mock('./api-client', () => ({ refreshSession: () => refreshSession() }));

type Analytics = typeof import('./analytics');
type SentBatch = { events: { event: string; eventId: string }[] };

const QUEUE_KEY = 'de:analytics:queue';
let fetchMock: ReturnType<typeof vi.fn>;
let beaconMock: ReturnType<typeof vi.fn>;

const load = async (): Promise<Analytics> => {
    vi.resetModules();
    return import('./analytics');
};

const response = (status: number) => Promise.resolve({ ok: status >= 200 && status < 300, status });

const sentBatches = (): SentBatch[] =>
    fetchMock.mock.calls.map(([, init]) => JSON.parse((init as RequestInit).body as string));

/** jsdom's Blob cannot be read back synchronously; capture the parts instead. */
class CapturingBlob {
    constructor(readonly parts: string[]) {}
}
const beaconBatches = (): SentBatch[] =>
    beaconMock.mock.calls.map(([, blob]) => JSON.parse((blob as CapturingBlob).parts.join('')));

const stored = (): { event: string }[] => JSON.parse(window.sessionStorage.getItem(QUEUE_KEY) ?? '[]');

const setOnline = (online: boolean) => vi.spyOn(window.navigator, 'onLine', 'get').mockReturnValue(online);

/** Each fresh module copy binds window/document listeners; unbind them after each test. */
const bound: [EventTarget, string, EventListenerOrEventListenerObject][] = [];
const trackListeners = (target: Window | Document) => {
    const original = target.addEventListener.bind(target);
    vi.spyOn(target, 'addEventListener').mockImplementation(
        (type: string, listener: EventListenerOrEventListenerObject, options?: boolean | AddEventListenerOptions) => {
            bound.push([target, type, listener]);
            original(type, listener, options);
        },
    );
};

beforeEach(() => {
    trackListeners(window);
    trackListeners(document);
    vi.useFakeTimers();
    window.sessionStorage.clear();
    window.localStorage.clear();
    fetchMock = vi.fn(() => response(204));
    vi.stubGlobal('fetch', fetchMock);
    beaconMock = vi.fn(() => true);
    Object.defineProperty(window.navigator, 'sendBeacon', { value: beaconMock, configurable: true });
    vi.stubGlobal('Blob', CapturingBlob);
    refreshSession.mockReset();
    vi.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
    for (const [target, type, listener] of bound.splice(0)) target.removeEventListener(type, listener);
    vi.useRealTimers();
    vi.unstubAllGlobals();
});

describe('analytics queue', () => {
    it('batches events every 5 s with unique event ids', async () => {
        const a = await load();
        a.track('lesson_viewed', { courseId: 1, unitRef: 'u1' });
        a.track('lesson_heartbeat', { courseId: 1, unitRef: 'u1' });
        a.track('lesson_heartbeat', { courseId: 1, unitRef: 'u1' });
        expect(fetchMock).not.toHaveBeenCalled();

        await vi.advanceTimersByTimeAsync(5000);
        expect(fetchMock).toHaveBeenCalledTimes(1);
        const [batch] = sentBatches();
        expect(batch.events.map((e) => e.event)).toEqual(['lesson_viewed', 'lesson_heartbeat', 'lesson_heartbeat']);
        expect(new Set(batch.events.map((e) => e.eventId)).size).toBe(3);
        expect(stored()).toEqual([]);
    });

    it('keeps a batch whose request has not answered in storage (R11: page killed mid-request)', async () => {
        fetchMock.mockImplementation(() => new Promise(() => {}));
        const a = await load();
        a.track('lesson_heartbeat', { courseId: 1, unitRef: 'u1' });
        await vi.advanceTimersByTimeAsync(5000);
        expect(fetchMock).toHaveBeenCalledTimes(1);
        expect(stored().map((e) => e.event)).toEqual(['lesson_heartbeat']);
    });

    it('resends what a previous page left in storage, ahead of new events', async () => {
        window.sessionStorage.setItem(
            QUEUE_KEY,
            JSON.stringify([{ event: 'lesson_heartbeat', eventId: 'left-over', courseId: 1 }]),
        );
        const a = await load();
        a.track('lesson_viewed', { courseId: 1, unitRef: 'u2' });
        await vi.advanceTimersByTimeAsync(5000);
        expect(sentBatches()[0].events.map((e) => e.eventId)[0]).toBe('left-over');
        expect(sentBatches()[0].events).toHaveLength(2);
    });

    it('never drops events on network errors (R12) and delivers them once the network is back', async () => {
        fetchMock.mockImplementation(() => Promise.reject(new TypeError('Failed to fetch')));
        const a = await load();
        a.track('lesson_heartbeat', { courseId: 1, unitRef: 'u1' });
        await vi.advanceTimersByTimeAsync(10 * 60_000); // far past the old 5-attempt limit
        expect(fetchMock.mock.calls.length).toBeGreaterThan(6);
        expect(stored().map((e) => e.event)).toEqual(['lesson_heartbeat']);

        fetchMock.mockImplementation(() => response(204));
        await vi.advanceTimersByTimeAsync(60_000);
        expect(sentBatches().at(-1)!.events.map((e) => e.event)).toEqual(['lesson_heartbeat']);
        expect(stored()).toEqual([]);
    });

    it('while offline waits for the online event instead of polling', async () => {
        setOnline(false);
        fetchMock.mockImplementation(() => Promise.reject(new TypeError('offline')));
        const a = await load();
        a.track('lesson_heartbeat', { courseId: 1, unitRef: 'u1' });
        await vi.advanceTimersByTimeAsync(5000);
        expect(fetchMock).toHaveBeenCalledTimes(1);
        await vi.advanceTimersByTimeAsync(10 * 60_000);
        expect(fetchMock).toHaveBeenCalledTimes(1);

        setOnline(true);
        fetchMock.mockImplementation(() => response(204));
        window.dispatchEvent(new Event('online'));
        await vi.advanceTimersByTimeAsync(0);
        expect(fetchMock).toHaveBeenCalledTimes(2);
        expect(stored()).toEqual([]);
    });

    it('drops a batch only after the server fails 5 times in a row', async () => {
        fetchMock.mockImplementation(() => response(503));
        const a = await load();
        a.track('lesson_heartbeat', { courseId: 1, unitRef: 'u1' });
        await vi.advanceTimersByTimeAsync(10 * 60_000);
        expect(fetchMock).toHaveBeenCalledTimes(6);
        expect(stored()).toEqual([]);
    });

    it('R1: on 401 refreshes the session and resends the same events', async () => {
        fetchMock.mockImplementationOnce(() => response(401));
        refreshSession.mockResolvedValue(true);
        const a = await load();
        a.track('lesson_heartbeat', { courseId: 1, unitRef: 'u1' });
        await vi.advanceTimersByTimeAsync(5000);
        await vi.advanceTimersByTimeAsync(10);
        expect(refreshSession).toHaveBeenCalledTimes(1);
        expect(fetchMock).toHaveBeenCalledTimes(2);
        const [first, second] = sentBatches();
        expect(second.events.map((e) => e.eventId)).toEqual(first.events.map((e) => e.eventId));
        const headers = fetchMock.mock.calls[1][1].headers as Record<string, string>;
        expect(headers['x-analytics-guest']).toBeUndefined();
    });

    it('R1: when the refresh fails, resends once flagged as a guest instead of looping', async () => {
        fetchMock.mockImplementationOnce(() => response(401));
        refreshSession.mockResolvedValue(false);
        const a = await load();
        a.track('page_view', { path: '/courses/1' });
        await vi.advanceTimersByTimeAsync(5000);
        await vi.advanceTimersByTimeAsync(10);
        expect(fetchMock).toHaveBeenCalledTimes(2);
        const headers = fetchMock.mock.calls[1][1].headers as Record<string, string>;
        expect(headers['x-analytics-guest']).toBe('1');
    });

    it('R11: on page hide beacons everything queued in chunks of 20', async () => {
        const a = await load();
        for (let i = 0; i < 19; i++) a.track('lesson_heartbeat', { courseId: 1, unitRef: 'u1' });
        // The 20th event triggers an immediate fetch; keep it unanswered.
        fetchMock.mockImplementation(() => new Promise(() => {}));
        for (let i = 0; i < 26; i++) a.track('lesson_heartbeat', { courseId: 1, unitRef: 'u1' });
        expect(fetchMock).toHaveBeenCalledTimes(1);

        window.dispatchEvent(new Event('pagehide'));
        const sizes = beaconBatches().map((b) => b.events.length);
        // 20 in flight (re-sent; deduped server-side by event id) + 25 queued.
        expect(sizes).toEqual([20, 20, 5]);
        expect(stored()).toHaveLength(20); // only the in-flight batch, still owned by its fetch
    });

    it('runs before-leave hooks so a component can add its last state to the beacon', async () => {
        const a = await load();
        a.track('lesson_viewed', { courseId: 1, unitRef: 'u1' });
        a.onBeforeLeave(() => a.track('video_position', { courseId: 1, unitRef: 'u12', ranges: [[0, 40]] }));
        window.dispatchEvent(new Event('pagehide'));
        const [batch] = beaconBatches();
        expect(batch.events.map((e) => e.event)).toEqual(['lesson_viewed', 'video_position']);
    });
});
