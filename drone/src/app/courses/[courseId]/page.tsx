'use client';

import { useEffect, useState, Suspense } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { confirmCourseCheckout, confirmProCheckout, getCourseById } from '@/app/lib/api-client';
import { trackCourseView } from '@/app/lib/analytics';
import CourseComponent from '@/app/ui/components/course';
import LoadingComponent from '@/app/ui/components/loading';
import ErrorComponent from '@/app/ui/components/error';
import { CourseData } from '@/app/lib/types/course';
import AuthGuard from '@/app/lib/auth-guard';
import { PURCHASE_QUERY } from '@/app/lib/auth-redirect';

const POLL_ATTEMPTS = 15;
const POLL_INTERVAL_MS = 2000;
/** After this many polls without access, ask the backend to reconcile from the Checkout session. */
const CONFIRM_AFTER_ATTEMPT = 3;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function SingleCoursePage() {
    const { courseId } = useParams();
    const searchParams = useSearchParams();
    const openPurchase = searchParams.get(PURCHASE_QUERY) === '1';
    // Return from Stripe Checkout: course purchase (?purchase=success&session_id=…) or Pro (?pro=success).
    // Snapshotted once: the URL is cleaned below, which would otherwise re-run the effect mid-poll.
    const [{ returnedFromCheckout, checkoutSessionId, proCheckout }] = useState(() => ({
        returnedFromCheckout: searchParams.get(PURCHASE_QUERY) === 'success' || searchParams.get('pro') === 'success',
        checkoutSessionId: searchParams.get('session_id'),
        proCheckout: searchParams.get('pro') === 'success',
    }));
    const [course, setCourse] = useState<CourseData | null>(null);
    const [error, setError] = useState<Error | null>(null);
    const [loading, setLoading] = useState(true);
    const [unlocking, setUnlocking] = useState(false);
    const [checkoutNotice, setCheckoutNotice] = useState<string | null>(null);

    useEffect(() => {
        if (!courseId) {
            setLoading(false);
            return;
        }
        const id = parseInt(courseId as string);
        let cancelled = false;

        // Access is granted by the Stripe webhook, which can land a few seconds after the redirect.
        const waitForAccess = async (initial: CourseData) => {
            setUnlocking(true);
            let latest = initial;
            for (let attempt = 1; attempt <= POLL_ATTEMPTS && !latest.has_access && !cancelled; attempt++) {
                if (attempt === CONFIRM_AFTER_ATTEMPT && checkoutSessionId) {
                    try {
                        if (proCheckout) {
                            await confirmProCheckout(checkoutSessionId);
                        } else {
                            await confirmCourseCheckout(checkoutSessionId);
                        }
                    } catch (e) {
                        console.warn('confirm-checkout fallback failed', e);
                    }
                }
                await sleep(POLL_INTERVAL_MS);
                latest = await getCourseById(id);
            }
            if (cancelled) return;
            setCourse(latest);
            setUnlocking(false);
            setCheckoutNotice(
                latest.has_access
                    ? 'Payment received — you have full access. Enjoy the course!'
                    : 'Payment received, but access is still being activated. Refresh in a minute; if it stays locked, contact support with your Stripe receipt.',
            );
        };

        const fetchCourse = async () => {
            setLoading(true);
            try {
                const courseData = await getCourseById(id);
                if (cancelled) return;
                setCourse(courseData);
                trackCourseView(courseId as string, courseData.title);
                if (returnedFromCheckout) {
                    window.history.replaceState({}, '', `/courses/${id}`);
                    if (courseData.has_access) {
                        setCheckoutNotice('Payment received — you have full access. Enjoy the course!');
                    } else {
                        void waitForAccess(courseData);
                    }
                }
            } catch (e) {
                console.error("console.logger", e);
                if (e instanceof Error) {
                    setError(e);
                } else {
                    setError(new Error(`An unknown error occurred while fetching course ${courseId}.`));
                }
            }
            setLoading(false);
        };

        fetchCourse();
        return () => {
            cancelled = true;
        };
    }, [courseId, returnedFromCheckout, checkoutSessionId, proCheckout]);

    if (loading) {
        return <LoadingComponent />;
    }

    if (error) {
        return <ErrorComponent message={error.message} />;
    }

    if (!course) {
        return <ErrorComponent message="Course not found." />;
    }

    if (unlocking) {
        return (
            <div className="max-w-xl mx-auto px-4 py-24 text-center">
                <LoadingComponent />
                <p className="mt-4 text-[var(--brand-foreground)] font-semibold">Payment received — unlocking your course…</p>
                <p className="mt-1 text-sm text-[var(--brand-muted)]">This usually takes a few seconds.</p>
            </div>
        );
    }

    course.id = parseInt(courseId as string);
    return (
        <>
            {checkoutNotice && (
                <div className="relative z-10 mx-4 sm:mx-6 lg:mx-8 mt-6 p-3 text-sm text-center border border-[var(--surface-border)] bg-[var(--surface)] text-[var(--brand-foreground)] rounded-lg">
                    {checkoutNotice}
                </div>
            )}
            {/* key remounts CourseComponent (which copies props into state) once access changes */}
            <CourseComponent key={course.has_access ? 'access' : 'locked'} {...course} initialShowPurchase={openPurchase} />
        </>
    );
}

/**
 * This is the page export, which wraps the page content with our AuthGuard.
 */
export default function ProtectedCoursePage() {
    return (
        <AuthGuard>
            <Suspense fallback={<LoadingComponent />}>
                <SingleCoursePage />
            </Suspense>
        </AuthGuard>
    );
}
