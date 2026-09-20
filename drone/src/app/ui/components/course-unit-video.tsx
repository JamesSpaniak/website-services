'use client';

import { useEffect, useState } from 'react';
import { getUnitMedia } from '@/app/lib/api-client';
import type { VideoResume } from '@/app/lib/types/analytics';
import VideoComponent, { localVideoKey } from './video';

interface CourseUnitVideoProps {
    courseId: number;
    unitId: string;
    videoUrl?: string;
    title: string;
}

function needsSignedMediaUrl(url?: string): boolean {
    if (!url) return false;
    return url.includes('courses/videos/') || url.endsWith('.m3u8');
}

/** Self-hosted files are trackable/resumable; YouTube/Vimeo embeds are not. */
function isTrackable(url?: string): boolean {
    if (!url) return false;
    return (
        needsSignedMediaUrl(url) ||
        /\.(mp4|webm|mov)(\?.*)?$/i.test(url) ||
        url.includes('cloudfront.net') ||
        url.includes('media.')
    );
}

const MIN_RESUME_SECONDS = 10;
const MAX_RESUME_PCT = 95;

function formatTime(seconds: number): string {
    const s = Math.max(0, Math.round(seconds));
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    return h > 0
        ? `${h}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`
        : `${m}:${String(sec).padStart(2, '0')}`;
}

/** Server resume wins; fall back to the local mirror (offline / pre-fetch). */
function pickResume(server: VideoResume | null, courseId: number, unitRef: string): number {
    if (server) {
        if (server.completed || server.percent_watched >= MAX_RESUME_PCT) return 0;
        return server.position_seconds >= MIN_RESUME_SECONDS ? server.position_seconds : 0;
    }
    try {
        const raw = window.localStorage.getItem(localVideoKey(courseId, unitRef));
        if (!raw) return 0;
        const parsed = JSON.parse(raw) as { position?: number };
        return parsed.position && parsed.position >= MIN_RESUME_SECONDS ? parsed.position : 0;
    } catch {
        return 0;
    }
}

export default function CourseUnitVideo({
    courseId,
    unitId,
    videoUrl,
    title,
}: CourseUnitVideoProps) {
    const needsSigning = needsSignedMediaUrl(videoUrl);
    const trackable = isTrackable(videoUrl);
    const [signedVideoUrl, setSignedVideoUrl] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [resumeAt, setResumeAt] = useState(0);
    /** Bumped by "Start over" to remount the player at 0. */
    const [playerKey, setPlayerKey] = useState(0);
    const [decided, setDecided] = useState(false);

    useEffect(() => {
        let cancelled = false;
        setDecided(false);
        setResumeAt(0);
        if (!trackable) {
            setSignedVideoUrl(null);
            setLoading(false);
            return;
        }

        setSignedVideoUrl(null);
        setLoading(needsSigning);
        // One request returns both the playable URL and the resume point.
        getUnitMedia(courseId, unitId)
            .then(({ video_url: signed, resume }) => {
                if (cancelled) return;
                if (needsSigning) setSignedVideoUrl(signed || null);
                setResumeAt(pickResume(resume ?? null, courseId, unitId));
            })
            .catch(() => {
                // Guest / preview: play the raw URL when it does not need signing.
                if (cancelled) return;
                if (needsSigning) setSignedVideoUrl(null);
                setResumeAt(pickResume(null, courseId, unitId));
            })
            .finally(() => {
                if (!cancelled) setLoading(false);
            });

        return () => {
            cancelled = true;
        };
    }, [courseId, needsSigning, trackable, unitId, videoUrl]);

    if (!videoUrl) return null;

    const resolvedVideoUrl = needsSigning ? signedVideoUrl : videoUrl;

    if (loading) {
        return (
            <div
                role="status"
                className="flex h-64 items-center justify-center bg-[var(--brand-black)]"
                style={{ borderRadius: 'var(--radius-sm)' }}
            >
                <div
                    className="h-8 w-8 animate-spin border-2 border-[var(--brand-primary)] border-t-transparent"
                    style={{ borderRadius: '50%' }}
                    aria-hidden
                />
                <span className="sr-only">Loading video…</span>
            </div>
        );
    }

    if (!resolvedVideoUrl) return null;

    const showResumeChip = trackable && resumeAt > 0 && !decided;

    return (
        <div>
            {showResumeChip && (
                <div
                    className="mb-2 flex items-center gap-3 rounded-md border border-[var(--surface-border)] bg-[var(--surface)] px-3 py-2 text-sm"
                    role="status"
                >
                    <span className="text-[var(--brand-foreground)]">
                        Resume from <strong>{formatTime(resumeAt)}</strong>
                    </span>
                    <span className="text-[var(--brand-muted)]">·</span>
                    <button
                        type="button"
                        className="text-[var(--brand-primary)] underline-offset-2 hover:underline"
                        onClick={() => {
                            setResumeAt(0);
                            setDecided(true);
                            setPlayerKey((k) => k + 1);
                        }}
                    >
                        Start over
                    </button>
                    <button
                        type="button"
                        className="ml-auto text-[var(--brand-muted)] hover:text-[var(--brand-foreground)]"
                        aria-label="Dismiss"
                        onClick={() => setDecided(true)}
                    >
                        ×
                    </button>
                </div>
            )}
            <VideoComponent
                key={playerKey}
                src={resolvedVideoUrl}
                title={title}
                courseId={trackable ? courseId : undefined}
                unitRef={trackable ? unitId : undefined}
                startPosition={resumeAt}
            />
        </div>
    );
}
