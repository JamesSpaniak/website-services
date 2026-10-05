import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { VideoPlaybackState } from './types/analytics';

/**
 * Engaged-time heartbeat (docs/tech/progress-tracking-accuracy.md Phase 2).
 * `track` is captured; the video registry is the real one.
 */
const tracked: { event: string; payload: Record<string, unknown> }[] = [];
const flushes: boolean[] = [];
vi.mock('./analytics', async (importOriginal) => {
    const actual = await importOriginal<typeof import('./analytics')>();
    return {
        ...actual,
        track: (event: string, payload: Record<string, unknown>) => tracked.push({ event, payload }),
        flushAnalytics: (useBeacon = false) => flushes.push(useBeacon),
    };
});

const { useLessonHeartbeat } = await import('./use-lesson-heartbeat');
const { publishVideoState } = await import('./analytics');

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

function Lesson({ unitRef }: { unitRef: string }) {
    useLessonHeartbeat(7, unitRef);
    return null;
}

let root: Root;
let visibility: DocumentVisibilityState;

const mount = (unitRef = 'u1') => {
    root = createRoot(document.createElement('div'));
    act(() => root.render(<Lesson unitRef={unitRef} />));
};
const events = (name: string) => tracked.filter((t) => t.event === name);

/** A registered player; `ranges` are handed out once, like the real one. */
const fakeVideo = (playing: boolean, ranges: number[][] = []): VideoPlaybackState => ({
    position: 42,
    duration: 300,
    playing,
    takeRanges: () => ranges.splice(0),
});

beforeEach(() => {
    vi.useFakeTimers();
    tracked.length = 0;
    flushes.length = 0;
    visibility = 'visible';
    vi.spyOn(document, 'visibilityState', 'get').mockImplementation(() => visibility);
});

afterEach(() => {
    act(() => root?.unmount());
    publishVideoState('u1', null);
    publishVideoState('u12', null);
    vi.useRealTimers();
});

describe('useLessonHeartbeat', () => {
    it('sends lesson_viewed once and a heartbeat every 30 s while the learner is active', () => {
        mount();
        expect(events('lesson_viewed')).toHaveLength(1);
        act(() => vi.advanceTimersByTime(90_000));
        expect(events('lesson_heartbeat')).toHaveLength(3);
    });

    it('sends nothing while the tab is hidden', () => {
        mount();
        visibility = 'hidden';
        act(() => vi.advanceTimersByTime(120_000));
        expect(events('lesson_heartbeat')).toHaveLength(0);
    });

    it('stops after 5 idle minutes, unless a video is playing', () => {
        mount();
        act(() => vi.advanceTimersByTime(10 * 60_000));
        // Ticks at 30 s … 300 s count (input at mount), later ones do not.
        expect(events('lesson_heartbeat')).toHaveLength(10);

        publishVideoState('u1', fakeVideo(true));
        act(() => vi.advanceTimersByTime(60_000));
        expect(events('lesson_heartbeat')).toHaveLength(12);
    });

    it('carries the lesson video position and watched ranges on the tick', () => {
        publishVideoState('u1', fakeVideo(true, [[0, 30]]));
        mount();
        act(() => vi.advanceTimersByTime(30_000));
        expect(events('lesson_heartbeat')[0].payload).toMatchObject({
            unitRef: 'u1',
            position: 42,
            duration: 300,
            playing: true,
            ranges: [[0, 30]],
        });
    });

    it('R9: reports a playing section video under its own ref on the same tick', () => {
        mount();
        publishVideoState('u12', fakeVideo(true, [[10, 40]]));
        act(() => vi.advanceTimersByTime(30_000));
        expect(events('video_position')).toEqual([
            {
                event: 'video_position',
                payload: expect.objectContaining({ courseId: 7, unitRef: 'u12', ranges: [[10, 40]] }),
            },
        ]);
    });

    it('on leaving sends the final video position and beacons the queue', () => {
        publishVideoState('u1', fakeVideo(false, [[30, 42]]));
        mount();
        act(() => root.unmount());
        expect(events('video_position')[0].payload).toMatchObject({ unitRef: 'u1', position: 42, ranges: [[30, 42]] });
        expect(flushes).toContain(true);
    });
});
