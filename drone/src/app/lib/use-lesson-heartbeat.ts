'use client';

import { useEffect, useRef } from 'react';
import { anyVideoPlaying, flushAnalytics, readVideoState, track } from './analytics';

const HEARTBEAT_MS = 30_000;
const IDLE_CUTOFF_MS = 5 * 60_000;

/**
 * Emits `lesson_viewed` on mount and `lesson_heartbeat` every 30 s while the
 * lesson is actually being consumed: tab visible AND (user input in the last
 * 5 min OR a video is playing). Each tick = 0.5 min of engaged time in the
 * rollups. Video position / ranges ride the heartbeat when a player for this
 * unit is registered (see publishVideoState).
 *
 * Pass `enabled=false` for guests / redacted units — nothing is sent.
 */
export function useLessonHeartbeat(courseId: number, unitRef: string, enabled = true): void {
    const lastInput = useRef<number>(Date.now());

    useEffect(() => {
        if (!enabled || !courseId || !unitRef || typeof window === 'undefined') return;

        const markInput = () => {
            lastInput.current = Date.now();
        };
        const inputEvents: (keyof WindowEventMap)[] = ['pointerdown', 'keydown', 'scroll', 'touchstart'];
        for (const ev of inputEvents) window.addEventListener(ev, markInput, { passive: true });

        track('lesson_viewed', { courseId, unitRef, path: window.location.pathname });

        const tick = () => {
            if (document.visibilityState !== 'visible') return;
            const video = readVideoState(unitRef);
            const idle = Date.now() - lastInput.current > IDLE_CUTOFF_MS;
            if (idle && !(video?.playing || anyVideoPlaying())) return;
            track('lesson_heartbeat', {
                courseId,
                unitRef,
                ...(video && {
                    position: Math.round(video.position),
                    duration: Math.round(video.duration) || undefined,
                    playing: video.playing,
                    ranges: video.takeRanges(),
                }),
            });
        };
        const timer = setInterval(tick, HEARTBEAT_MS);

        return () => {
            clearInterval(timer);
            for (const ev of inputEvents) window.removeEventListener(ev, markInput);
            // Final position write when leaving the lesson.
            const video = readVideoState(unitRef);
            if (video && video.position > 0) {
                track('video_position', {
                    courseId,
                    unitRef,
                    position: Math.round(video.position),
                    duration: Math.round(video.duration) || undefined,
                    ranges: video.takeRanges(),
                });
            }
            flushAnalytics(true);
        };
    }, [courseId, unitRef, enabled]);
}
