'use client';

import { useState } from 'react';
import VideoComponent from './video';

/**
 * Collapsed-by-default video preview for admin editors. The player (HLS /
 * direct file / YouTube-Vimeo embed via VideoComponent) only mounts when
 * opened, so editors with many video fields don't load them all eagerly.
 */
export default function VideoPreview({ src }: { src: string | undefined | null }) {
    const [show, setShow] = useState(false);
    const url = typeof src === 'string' ? src.trim() : '';
    if (!url) return null;

    return (
        <div className="mt-2">
            <button
                type="button"
                onClick={() => setShow(!show)}
                className="text-xs font-medium text-[var(--brand-primary)] hover:opacity-90"
            >
                {show ? 'Hide video preview' : 'Preview video'}
            </button>
            {show && (
                <div className="mt-2 max-w-md">
                    <VideoComponent src={url} />
                </div>
            )}
        </div>
    );
}
