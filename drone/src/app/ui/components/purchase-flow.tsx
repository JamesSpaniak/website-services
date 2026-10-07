'use client';

import { useMemo, useState } from 'react';
import { CourseData } from '@/app/lib/types/course';
import { createCourseCheckout, createProCheckout } from '@/app/lib/api-client';
import ImageComponent from './image';
import { mergeCourseImages } from '@/app/lib/course-images';
import Link from 'next/link';
import { useAuth } from '@/app/lib/auth-context';
import { logger } from '@/app/lib/logger';
import { courseCheckoutPath, registerHref } from '@/app/lib/auth-redirect';
import { PriceText, PromoNote } from '@/app/ui/components/price-tag';
import { PRO_SKU, FALLBACK_PRO_CENTS, courseSku } from '@/app/lib/pricing';

// Both options redirect to Stripe-hosted Checkout. Access is granted by the
// webhook; the course page handles the return (?purchase=success / ?pro=success).
interface PurchaseFlowProps {
    course: CourseData;
    redirectPath?: string;
}

export default function PurchaseFlow({ course, redirectPath }: PurchaseFlowProps) {
    const { user } = useAuth();
    const loginHref = useMemo(() => {
        const base = redirectPath ?? (typeof window !== 'undefined' ? window.location.pathname + window.location.search : '/courses');
        return `/login?redirect=${encodeURIComponent(base)}`;
    }, [redirectPath]);
    const registerHrefForCourse = useMemo(() => {
        const base = redirectPath ?? courseCheckoutPath(course.id);
        return registerHref(base);
    }, [redirectPath, course.id]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handlePurchase = async () => {
        setIsLoading(true);
        setError(null);
        try {
            const { url } = await createCourseCheckout(course.id);
            window.location.href = url;
        } catch (err) {
            const message = err instanceof Error ? err.message : 'An unknown error occurred.';
            logger.error(err as Error, { context: 'Stripe Course Checkout' });
            setError(`Could not start checkout: ${message}`);
            setIsLoading(false);
        }
    };

    if (!user) {
        return (
            <div className="text-center p-8 max-w-4xl mx-auto">
                <div className="bg-[var(--surface)] border border-[var(--surface-border)] rounded-2xl shadow-lg p-8">
                    <h2 className="text-2xl font-bold text-[var(--brand-foreground)]">Account required</h2>
                    <p className="mt-2 text-[var(--brand-muted)]">
                        Checkout is tied to your account so access survives sign-out and device changes.
                        Create an account first, then return here to pay.
                    </p>
                    <div className="mt-6 flex flex-col sm:flex-row justify-center gap-3">
                        <Link href={registerHrefForCourse} className="inline-block px-6 py-2.5 font-semibold text-[var(--brand-on-primary)] bg-[var(--brand-primary)] rounded-lg hover:opacity-90">
                            Create account &amp; checkout
                        </Link>
                        <Link href={loginHref} className="inline-block px-6 py-2.5 font-medium border border-[var(--surface-border)] text-[var(--brand-foreground)] rounded-lg hover:bg-[var(--background)]">
                            Sign in
                        </Link>
                    </div>
                    <p className="mt-4 text-xs text-[var(--brand-muted)]">
                        Already paid? Sign in with the same account you used at checkout — access is granted automatically.
                    </p>
                </div>
            </div>
        )
    }

    return (
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
            <div className="bg-[var(--surface)] border border-[var(--surface-border)] rounded-2xl shadow-lg p-8">
                <h1 className="text-3xl font-bold text-[var(--brand-foreground)]">Purchase Course</h1>
                <p className="text-lg text-[var(--brand-muted)] mt-2">You&apos;re about to unlock full access to:</p>
                
                <div className="mt-6 flex flex-col md:flex-row gap-8 items-center bg-[var(--comment-secondary-bg)] border border-[var(--surface-border)] p-6 rounded-lg">
                    <ImageComponent 
                        src={mergeCourseImages(course)[0] || '/globe.svg'} 
                        alt={course.title} 
                        width={200} 
                        height={112} 
                        className="rounded-lg object-cover aspect-video"
                    />
                    <div className="flex-grow">
                        <h2 className="text-2xl font-semibold text-[var(--brand-foreground)]">{course.title}</h2>
                        <p className="text-[var(--brand-muted)] mt-1">{course.sub_title}</p>
                    </div>
                    <div className="text-3xl font-bold text-[var(--brand-foreground)]">
                        <PriceText sku={courseSku(course.id)} fallbackCents={Math.round(Number(course.price) * 100)} />
                    </div>
                </div>

                <div className="mt-8">
                    <h2 className="text-xl font-semibold text-[var(--brand-foreground)]">Choose access</h2>
                    <p className="mt-1 text-sm text-[var(--brand-muted)]">
                        Buy this course once for lifetime access, or subscribe to Pro for all courses month-to-month.
                    </p>
                    <div className="mt-4 grid gap-3 sm:grid-cols-2">
                        <div className="p-4 border border-[var(--brand-primary)] bg-[var(--brand-primary)]/5 rounded-lg">
                            <p className="text-sm font-semibold text-[var(--brand-foreground)]">This course — one-time</p>
                            <p className="mt-1 text-2xl font-bold text-[var(--brand-foreground)]">
                                <PriceText sku={courseSku(course.id)} fallbackCents={Math.round(Number(course.price) * 100)} />
                            </p>
                            <PromoNote sku={courseSku(course.id)} />
                            <p className="mt-1 text-xs text-[var(--brand-muted)]">Lifetime access to {course.title} only.</p>
                        </div>
                        <button
                            type="button"
                            onClick={async () => {
                                setIsLoading(true);
                                setError(null);
                                try {
                                    const { url } = await createProCheckout({
                                        duration: 'monthly',
                                        successPath: `/courses/${course.id}?pro=success`,
                                        cancelPath: `/courses/${course.id}?purchase=1`,
                                    });
                                    window.location.href = url;
                                } catch (err) {
                                    const message = err instanceof Error ? err.message : 'Could not start Pro checkout.';
                                    if (message.includes('not configured')) {
                                        setError('Pro membership is not available yet. Purchase this course below, or try again later.');
                                    } else {
                                        setError(message);
                                    }
                                    setIsLoading(false);
                                }
                            }}
                            disabled={isLoading}
                            className="p-4 border border-[var(--surface-border)] bg-[var(--comment-secondary-bg)] rounded-lg text-left hover:border-[var(--brand-primary)]/50 transition-colors disabled:opacity-50"
                        >
                            <p className="text-sm font-semibold text-[var(--brand-foreground)]">Pro — monthly</p>
                            <p className="mt-1 text-2xl font-bold text-[var(--brand-foreground)]">
                                <PriceText sku={PRO_SKU} fallbackCents={FALLBACK_PRO_CENTS} />
                                <span className="text-sm font-normal text-[var(--brand-muted)]">/mo</span>
                            </p>
                            <PromoNote sku={PRO_SKU} />
                            <p className="mt-1 text-sm text-[var(--brand-muted)]">All courses while subscribed. Manage or cancel anytime from your profile.</p>
                            <span className="mt-2 inline-block text-xs font-medium text-[var(--brand-primary)]">Continue to Stripe Checkout →</span>
                        </button>
                    </div>
                </div>

                <div className="mt-8 text-center">
                    <p className="text-sm text-[var(--brand-muted)]">One-time payment unlocks lifetime access to this course only. You&apos;ll pay on Stripe&apos;s secure checkout page and come straight back here.</p>
                    <div className="mt-4 flex justify-center gap-4">
                        <button onClick={handlePurchase} disabled={isLoading} className="px-8 py-3 font-semibold text-[var(--background)] bg-[var(--brand-primary)] rounded-lg hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-[var(--background)] focus:ring-[var(--brand-primary)] transition-colors disabled:opacity-40">
                            {isLoading ? 'Opening checkout…' : (
                                <>
                                    Buy this course — <PriceText sku={courseSku(course.id)} fallbackCents={Math.round(Number(course.price) * 100)} />
                                </>
                            )}
                        </button>
                    </div>
                </div>

                {error && (
                    <div className="mt-6 p-3 bg-red-100 text-red-700 rounded-lg text-center space-y-3">
                        <p>{error}</p>
                    </div>
                )}
            </div>
        </div>
    );
}