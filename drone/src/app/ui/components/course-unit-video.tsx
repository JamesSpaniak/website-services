'use client';

import { useEffect, useState } from 'react';
import { getUnitMedia } from '@/app/lib/api-client';
import VideoComponent from './video';

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

export default function CourseUnitVideo({
    courseId,
    unitId,
    videoUrl,
    title,
}: CourseUnitVideoProps) {
    const needsSigning = needsSignedMediaUrl(videoUrl);
    const [signedVideoUrl, setSignedVideoUrl] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        let cancelled = false;
        if (!needsSigning) {
            setSignedVideoUrl(null);
            setLoading(false);
            return;
        }

        setSignedVideoUrl(null);
        setLoading(true);
        getUnitMedia(courseId, unitId)
            .then(({ video_url: signed }) => {
                if (!cancelled) setSignedVideoUrl(signed || null);
            })
            .catch(() => {
                if (!cancelled) setSignedVideoUrl(null);
            })
            .finally(() => {
                if (!cancelled) setLoading(false);
            });

        return () => {
            cancelled = true;
        };
    }, [courseId, needsSigning, unitId, videoUrl]);

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

    return resolvedVideoUrl ? <VideoComponent src={resolvedVideoUrl} title={title} /> : null;
}
