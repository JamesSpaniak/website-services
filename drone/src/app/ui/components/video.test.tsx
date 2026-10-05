import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * Video tracking in the browser (docs/tech/progress-tracking-accuracy.md
 * Phase 2: § 3 completion rule, R9, R21). jsdom has no media pipeline, so
 * playback is simulated on the real <video> element: currentTime / duration
 * are stubbed and timeupdate / seeking / ended are dispatched by hand.
 */
const tracked: { event: string; payload: Record<string, unknown> }[] = [];
vi.mock('@/app/lib/logger', () => ({ debugLog: () => {} }));
vi.mock('@/app/lib/analytics', async (importOriginal) => {
    const actual = await importOriginal<typeof import('@/app/lib/analytics')>();
    return {
        ...actual,
        track: (event: string, payload: Record<string, unknown>) => tracked.push({ event, payload }),
    };
});

const { default: VideoComponent } = await import('./video');

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let container: HTMLDivElement;
let root: Root;

interface Player {
    el: HTMLVideoElement;
    /** Plays from the current time to `to` in 0.25 s timeupdate steps. */
    playTo: (to: number) => void;
    seek: (to: number) => void;
    end: () => void;
}

const render = (props: { startPosition?: number; outroSeconds?: number; unitRef?: string } = {}) =>
    act(() =>
        root.render(
            <VideoComponent
                src="https://media.example.com/lesson.mp4"
                courseId={3}
                unitRef={props.unitRef ?? 'u2'}
                startPosition={props.startPosition}
                outroSeconds={props.outroSeconds}
            />,
        ),
    );

/** Mounts the player and fakes a loaded video of `duration` seconds. */
const mountPlayer = (duration: number, props: Parameters<typeof render>[0] = {}): Player => {
    // Media props must exist before the effects run, so stub the prototype.
    let time = 0;
    let paused = true;
    const proto = HTMLMediaElement.prototype;
    vi.spyOn(proto, 'duration', 'get').mockReturnValue(duration);
    vi.spyOn(proto, 'readyState', 'get').mockReturnValue(1);
    vi.spyOn(proto, 'paused', 'get').mockImplementation(() => paused);
    vi.spyOn(proto, 'ended', 'get').mockImplementation(() => time >= duration);
    vi.spyOn(proto, 'currentTime', 'get').mockImplementation(() => time);
    vi.spyOn(proto, 'currentTime', 'set').mockImplementation((t: number) => {
        time = t;
    });
    render(props);
    const el = container.querySelector('video')!;
    const fire = (type: string) => act(() => void el.dispatchEvent(new Event(type)));
    return {
        el,
        playTo: (to) => {
            if (paused) {
                paused = false;
                fire('play');
            }
            fire('timeupdate');
            while (time < to) {
                time = Math.min(to, time + 0.25);
                fire('timeupdate');
            }
        },
        seek: (to) => {
            fire('seeking');
            time = to;
            fire('timeupdate');
        },
        end: () => {
            paused = true;
            fire('ended');
        },
    };
};

const events = (name: string) => tracked.filter((t) => t.event === name);

beforeEach(() => {
    tracked.length = 0;
    window.sessionStorage.clear();
    container = document.createElement('div');
    root = createRoot(container);
});

afterEach(() => {
    act(() => root.unmount());
});

describe('video tracking', () => {
    it('R2: scrubbing to the end never sends video_completed, but the ranges still reach the server', () => {
        const p = mountPlayer(300);
        p.playTo(8);
        p.seek(295);
        p.playTo(300);
        p.end();
        expect(events('video_completed')).toHaveLength(0);
        const last = events('video_progress').at(-1)!.payload;
        expect(last.properties).toMatchObject({ ended: true });
        expect(last.ranges).toEqual([
            [0, 8],
            [295, 300],
        ]);
    });

    it('end grace: stopping 8 s before the end of a 1-minute video completes it', () => {
        const p = mountPlayer(60);
        p.playTo(52);
        expect(events('video_completed')).toHaveLength(1);
    });

    it('outro: with 25 s of credits, watching up to the credits completes it', () => {
        const p = mountPlayer(180, { outroSeconds: 25 });
        p.playTo(146);
        expect(events('video_completed')).toHaveLength(1);
    });

    it('without an outro the same viewing (81 %) does not complete it', () => {
        const p = mountPlayer(180);
        p.playTo(146);
        expect(events('video_completed')).toHaveLength(0);
    });

    it('R21: video_started once per video per tab session, across remounts', () => {
        mountPlayer(300).playTo(5);
        act(() => root.unmount());
        root = createRoot(container);
        mountPlayer(300).playTo(5);
        expect(events('video_started')).toHaveLength(1);
    });

    it('R9: unmounting sends the ranges not yet delivered', () => {
        const p = mountPlayer(300, { unitRef: 'u12' });
        p.playTo(40);
        act(() => root.unmount());
        expect(events('video_position').at(-1)!.payload).toMatchObject({ unitRef: 'u12', ranges: [[0, 40]] });
        root = createRoot(container); // for afterEach
    });

    it('a resume point arriving after playback started neither jumps nor resets tracking', () => {
        const p = mountPlayer(60);
        p.playTo(30);
        render({ startPosition: 45 }); // server resume point arrives late
        expect(p.el.currentTime).toBe(30);
        p.playTo(52);
        // 52 s watched in one mount → rule met only if the first 30 s survived.
        expect(events('video_completed')).toHaveLength(1);
        expect(events('video_started')).toHaveLength(1);
    });

    it('seeks to the resume point when it is known before playback', () => {
        const p = mountPlayer(300, { startPosition: 120 });
        expect(p.el.currentTime).toBe(120);
    });
});
