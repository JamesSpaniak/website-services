'use client';

import { useCallback, useState } from 'react';
import ImageComponent from './image';
import { ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/solid';

interface CourseImageStripProps {
    images: string[];
    alt: string;
    /**
     * CSS `object-position` value controlling which part of the image stays in
     * frame when the 16:9 crop is applied. Defaults to `"center"`.
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
export default function CourseImageStrip({ images, alt, objectPosition = 'center' }: CourseImageStripProps) {
    const [index, setIndex] = useState(0);
    const n = images?.length ?? 0;

    const go = useCallback(
        (delta: number) => {
            setIndex((i) => (i + delta + n) % n);
        },
        [n],
    );

    if (!n) return null;

    if (n === 1) {
        return (
            <div className="overflow-hidden" style={{ borderRadius: 'var(--radius-md)' }}>
                <ImageComponent
                    src={images[0]}
                    alt={`${alt} — 1`}
                    width={1200}
                    height={675}
                    className="aspect-video w-full object-cover"
                    style={{ objectPosition }}
                />
            </div>
        );
    }

    return (
        <div className="relative" role="region" aria-label={`${alt} images`}>
            <div className="overflow-hidden" style={{ borderRadius: 'var(--radius-md)' }}>
                <ImageComponent
                    key={images[index]}
                    src={images[index]}
                    alt={`${alt} — ${index + 1} of ${n}`}
                    width={1200}
                    height={675}
                    className="aspect-video w-full object-cover"
                    style={{ objectPosition }}
                />
            </div>

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
