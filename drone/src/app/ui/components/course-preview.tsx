'use client';

import Link from 'next/link';
import { useState } from 'react';
import ImageComponent from './image';
import { mergeCourseImages } from '@/app/lib/course-images';
import { ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/solid';

interface CoursePreviewProps {
    id: number;
    title: string;
    sub_title?: string;
    images_url?: string[];
    image_url?: string;
    unitCount: number;
}

export default function CoursePreviewComponent({
    id,
    title,
    sub_title,
    images_url,
    image_url,
    unitCount,
}: CoursePreviewProps) {
    const images = mergeCourseImages({ images_url, image_url });
    const [imgIdx, setImgIdx] = useState(0);
    const n = images.length;

    const goImg = (delta: number) => {
        if (n <= 1) return;
        setImgIdx((i) => (i + delta + n) % n);
    };

    const courseHref = `/courses/${id}`;

    return (
        <article
            className="border border-[var(--surface-border)] bg-[var(--surface)] hover:border-[var(--brand-primary)]/50 transition-colors ring-focus overflow-hidden flex flex-col h-full"
            style={{ borderRadius: 'var(--radius-md)' }}
        >
            {n > 0 && (
                <div
                    className="relative w-full aspect-video shrink-0 overflow-hidden mb-4 mx-5 mt-5"
                    style={{ borderRadius: 'var(--radius-sm)' }}
                >
                    <Link href={courseHref} className="absolute inset-0 z-0" tabIndex={-1} aria-hidden>
                        <span className="sr-only">View course {title}</span>
                    </Link>
                    <ImageComponent
                        src={images[imgIdx]}
                        alt={`${title} — preview ${imgIdx + 1} of ${n}`}
                        fill
                        className="relative z-[1] object-cover object-center pointer-events-none"
                        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                    />
                    {n > 1 && (
                        <>
                            <button
                                type="button"
                                onClick={(e) => {
                                    e.preventDefault();
                                    goImg(-1);
                                }}
                                className="absolute left-2 top-1/2 z-[2] -translate-y-1/2 rounded-full bg-[var(--background)]/90 p-1.5 text-[var(--brand-foreground)] shadow-md border border-[var(--surface-border)] hover:bg-[var(--surface)]"
                                aria-label="Previous image"
                            >
                                <ChevronLeftIcon className="h-5 w-5" />
                            </button>
                            <button
                                type="button"
                                onClick={(e) => {
                                    e.preventDefault();
                                    goImg(1);
                                }}
                                className="absolute right-2 top-1/2 z-[2] -translate-y-1/2 rounded-full bg-[var(--background)]/90 p-1.5 text-[var(--brand-foreground)] shadow-md border border-[var(--surface-border)] hover:bg-[var(--surface)]"
                                aria-label="Next image"
                            >
                                <ChevronRightIcon className="h-5 w-5" />
                            </button>
                            <span
                                className="absolute bottom-2 left-1/2 z-[2] -translate-x-1/2 rounded px-2 py-0.5 text-[10px] font-mono tabular-nums text-[var(--brand-foreground)] bg-[var(--background)]/90 border border-[var(--surface-border)]"
                                aria-live="polite"
                            >
                                {imgIdx + 1} / {n}
                            </span>
                        </>
                    )}
                </div>
            )}

            <Link
                href={courseHref}
                className="block px-5 pb-5 flex-grow flex flex-col min-h-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--background)]"
                style={{ borderRadius: '0 0 var(--radius-md) var(--radius-md)' }}
            >
                <h3 className="text-lg font-display font-semibold tracking-tight text-[var(--brand-foreground)]">{title}</h3>
                {sub_title && <p className="text-sm text-[var(--brand-muted)] mt-1 flex-grow">{sub_title}</p>}
                <span className="mt-4 inline-block w-fit font-mono text-xs tracking-wide text-[var(--brand-muted)] border border-[var(--surface-border)] px-2 py-1" style={{ borderRadius: 'var(--radius-sm)' }}>
                    {unitCount} {unitCount === 1 ? 'unit' : 'units'}
                </span>
            </Link>
        </article>
    );
}
