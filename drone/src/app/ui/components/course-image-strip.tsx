'use client';

import { useCallback, useState } from 'react';
import ImageComponent from './image';
import { ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/solid';

type ImageFit = 'cover' | 'contain';

interface CourseImageStripProps {
    images: string[];
    alt: string;
    /**
     * How the image fills its frame.
     * - `contain` (default): show the whole image; letterbox tall/wide sources (unit figures).
     * - `cover`: crop to 16:9 (course hero / marketing surfaces).
     */
    fit?: ImageFit;
    /**
     * CSS `object-position` when `fit="cover"`. Defaults to `"center"`.
     *
     * Common values:
     *   "center"        – default, centred crop
     *   "top"           – keeps the top edge visible (good for horizon shots)
     *   "bottom"        – keeps the bottom edge (good for ground detail)
     *   "center 30%"    – slightly above centre (good for sky-heavy landscapes)
     *   "80% center"    – keeps right side of a wide panorama
     */
    objectPosition?: string;
}

/** Course or unit figures: ordered gallery with prev/next (same order as stored in `images_url`). */
export default function CourseImageStrip({
    images,
    alt,
    fit = 'contain',
    objectPosition = 'center',
}: CourseImageStripProps) {
    const [index, setIndex] = useState(0);
    const n = images?.length ?? 0;

    const go = useCallback(
        (delta: number) => {
            setIndex((i) => (i + delta + n) % n);
        },
        [n],
    );

    if (!n) return null;

    const frameClass =
        fit === 'cover'
            ? 'overflow-hidden'
            : 'flex items-center justify-center overflow-hidden bg-[var(--surface)]';
    const imageClass =
        fit === 'cover'
            ? 'aspect-video w-full object-cover'
            : 'w-full h-auto max-h-[70vh] object-contain';

    const current = images[n === 1 ? 0 : index];
    const imageAlt = n === 1 ? `${alt} — 1` : `${alt} — ${index + 1} of ${n}`;

    const frame = (
        <div className={frameClass} style={{ borderRadius: 'var(--radius-md)' }}>
            <ImageComponent
                key={current}
                src={current}
                alt={imageAlt}
                width={1200}
                height={675}
                className={imageClass}
                style={fit === 'cover' ? { objectPosition } : undefined}
            />
        </div>
    );

    if (n === 1) return frame;

    return (
        <div className="relative" role="region" aria-label={`${alt} images`}>
            {frame}

            <button
                type="button"
                onClick={() => go(-1)}
                className="absolute left-2 top-1/2 z-10 -translate-y-1/2 rounded-full bg-[var(--background)]/90 p-2 text-[var(--brand-foreground)] shadow-md border border-[var(--surface-border)] hover:bg-[var(--surface)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-primary)]"
                aria-label="Previous image"
            >
                <ChevronLeftIcon className="h-5 w-5" />
            </button>
            <button
                type="button"
                onClick={() => go(1)}
                className="absolute right-2 top-1/2 z-10 -translate-y-1/2 rounded-full bg-[var(--background)]/90 p-2 text-[var(--brand-foreground)] shadow-md border border-[var(--surface-border)] hover:bg-[var(--surface)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-primary)]"
                aria-label="Next image"
            >
                <ChevronRightIcon className="h-5 w-5" />
            </button>

            <div
                className="absolute bottom-3 left-1/2 z-10 flex -translate-x-1/2 gap-1.5 rounded-full bg-[var(--background)]/85 px-2 py-1 border border-[var(--surface-border)]"
                aria-live="polite"
            >
                <span className="sr-only">
                    Image {index + 1} of {n}
                </span>
                <span className="font-mono text-[10px] tabular-nums text-[var(--brand-muted)]" aria-hidden>
                    {index + 1} / {n}
                </span>
            </div>
        </div>
    );
}
