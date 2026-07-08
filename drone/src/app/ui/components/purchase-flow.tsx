'use client';

import { useEffect, useMemo, useState } from 'react';
import { CourseData } from '@/app/lib/types/course';
import { confirmCoursePurchase, createPaymentIntent, getCourseById, resendVerificationEmail } from '@/app/lib/api-client';
import ImageComponent from './image';
import { mergeCourseImages } from '@/app/lib/course-images';
import Link from 'next/link';
import { useAuth } from '@/app/lib/auth-context';
import { CardElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { logger } from '@/app/lib/logger';
import { coursePath, registerHref } from '@/app/lib/auth-redirect';

// NOTE: The parent component rendering this flow must be wrapped in Stripe's <Elements> provider.
// Example in a layout or page:
// import { loadStripe } from '@stripe/stripe-js';
// import { Elements } from '@stripe/react-stripe-js';
// const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);
// <Elements stripe={stripePromise}><PurchaseFlow ... /></Elements>
interface PurchaseFlowProps {
    course: CourseData;
    onPurchaseSuccess: () => void;
    redirectPath?: string;
}

const pendingPiKey = (courseId: number) => `pendingPurchasePi:${courseId}`;

function stashPendingPaymentIntent(courseId: number, paymentIntentId: string): void {
    if (typeof window === 'undefined') return;
    sessionStorage.setItem(pendingPiKey(courseId), paymentIntentId);
}

function readPendingPaymentIntent(courseId: number): string | null {
    if (typeof window === 'undefined') return null;
    return sessionStorage.getItem(pendingPiKey(courseId));
}

function clearPendingPaymentIntent(courseId: number): void {
    if (typeof window === 'undefined') return;
    sessionStorage.removeItem(pendingPiKey(courseId));
}

function useStripeElementStyle() {
    const [style, setStyle] = useState({
        base: { fontSize: '16px', color: '#e5e7eb', '::placeholder': { color: '#9ca3af' } },
        invalid: { color: '#f87171' },
    });

    useEffect(() => {
        const root = document.documentElement;
        const fg = getComputedStyle(root).getPropertyValue('--brand-foreground').trim() || '#e5e7eb';
        const muted = getComputedStyle(root).getPropertyValue('--brand-muted').trim() || '#9ca3af';
        const danger = getComputedStyle(root).getPropertyValue('--brand-danger').trim() || '#f87171';
        setStyle({
            base: { fontSize: '16px', color: fg, '::placeholder': { color: muted } },
            invalid: { color: danger },
        });
    }, []);

    return style;
}

export default function PurchaseFlow({ course, onPurchaseSuccess, redirectPath }: PurchaseFlowProps) {
    const { user } = useAuth();
    const stripe = useStripe();
    const elements = useElements();
    const cardStyle = useStripeElementStyle();
    const loginHref = useMemo(() => {
        const base = redirectPath ?? (typeof window !== 'undefined' ? window.location.pathname + window.location.search : '/courses');
        return `/login?redirect=${encodeURIComponent(base)}`;
    }, [redirectPath]);
    const registerHrefForCourse = useMemo(() => {
        const base = redirectPath ?? coursePath(course.id, true);
        return registerHref(base);
    }, [redirectPath, course.id]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [resendStatus, setResendStatus] = useState<'idle' | 'sending' | 'sent'>('idle');
    const [pendingPaymentIntentId, setPendingPaymentIntentId] = useState<string | null>(null);
    const [reconciling, setReconciling] = useState(false);

    useEffect(() => {
        const stored = readPendingPaymentIntent(course.id);
        if (stored) setPendingPaymentIntentId(stored);
    }, [course.id]);

    const handlePurchase = async () => {
        if (!stripe || !elements) {
            // Stripe.js has not yet loaded.
            // Make sure to disable form submission until Stripe.js has loaded.
            setError("Stripe is not ready. Please try again in a moment.");
            return;
        }

        setIsLoading(true);
        setError(null);

        try {
            // 1. Create a Payment Intent on the server
            const { clientSecret } = await createPaymentIntent(course.id);

            // 2. Confirm the payment on the client
            const cardElement = elements.getElement(CardElement);
            if (!cardElement) {
                throw new Error("Card element not found.");
            }

            const paymentResult = await stripe.confirmCardPayment(clientSecret, {
                payment_method: { card: cardElement },
            });

            if (paymentResult.error) {
                throw new Error(paymentResult.error.message);
            }

            const paymentIntentId = paymentResult.paymentIntent?.id;
            if (paymentIntentId) {
                setPendingPaymentIntentId(paymentIntentId);
                stashPendingPaymentIntent(course.id, paymentIntentId);
            }
            
            // 3. Payment succeeded on the client. Now, poll the backend to wait for webhook processing.
            logger.info('Stripe payment confirmed on client. Awaiting server-side fulfillment via webhook.', { courseId: course.id, paymentIntentId: paymentResult.paymentIntent.id });

            const pollForPurchase = (retries = 15, interval = 2000): Promise<void> => {
                return new Promise(async (resolve, reject) => {
                    if (retries === 0) {
                        return reject(new Error("Purchase confirmation timed out. Please check your profile or contact support if the issue persists."));
                    }

                    const updatedCourse = await getCourseById(course.id);
                    if (updatedCourse.has_access) {
                        logger.info('Purchase confirmed on backend via webhook.', { courseId: course.id });
                        return resolve();
                    } else {
                        setTimeout(() => pollForPurchase(retries - 1, interval).then(resolve).catch(reject), interval);
                    }
                });
            };

            await pollForPurchase();
            setPendingPaymentIntentId(null);
            clearPendingPaymentIntent(course.id);
            onPurchaseSuccess();
        } catch (err) {
            const message = err instanceof Error ? err.message : 'An unknown error occurred.';
            if (message.includes('EMAIL_NOT_VERIFIED')) {
                setError('Verify your email before purchasing.');
            } else {
                logger.error(err as Error, { context: 'Stripe Purchase Flow' });
                setError(`Purchase failed: ${message}`);
            }
        } finally {
            setIsLoading(false);
        }
    };

    const handleReconcileAccess = async () => {
        if (!pendingPaymentIntentId) return;
        setReconciling(true);
        setError(null);
        try {
            await confirmCoursePurchase(pendingPaymentIntentId);
            const updatedCourse = await getCourseById(course.id);
            if (updatedCourse.has_access) {
                setPendingPaymentIntentId(null);
                clearPendingPaymentIntent(course.id);
                onPurchaseSuccess();
                return;
            }
            setError('Payment found but access is not active yet. Try again in a moment or contact support with your receipt.');
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Could not confirm purchase.');
        } finally {
            setReconciling(false);
        }
    };

    if (!user) {
        return (
            <div className="text-center p-8 max-w-4xl mx-auto">
                <div className="bg-[var(--surface)] border border-[var(--surface-border)] rounded-2xl shadow-lg p-8">
                    <h2 className="text-2xl font-bold text-[var(--brand-foreground)]">Account required</h2>
                    <p className="mt-2 text-[var(--brand-muted)]">
                        Checkout is tied to your account so access survives sign-out and device changes.
                        Create an account first, verify your email, then return here to pay.
                    </p>
                    <div className="mt-6 flex flex-col sm:flex-row justify-center gap-3">
                        <Link href={registerHrefForCourse} className="inline-block px-6 py-2.5 font-semibold text-[var(--brand-black)] bg-[var(--brand-primary)] rounded-lg hover:opacity-90">
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

    const needsVerification = user.email_verified === false;

    const handleResendVerification = async () => {
        setResendStatus('sending');
        setError(null);
        try {
            await resendVerificationEmail();
            setResendStatus('sent');
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Could not send verification email.');
            setResendStatus('idle');
        }
    };

    if (needsVerification) {
        return (
            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                <div className="bg-[var(--surface)] border border-[var(--surface-border)] rounded-2xl shadow-lg p-8 text-center">
                    <h1 className="text-2xl font-bold text-[var(--brand-foreground)]">Verify your email to continue</h1>
                    <p className="mt-3 text-[var(--brand-muted)]">
                        We sent a verification link to <span className="font-medium text-[var(--brand-foreground)]">{user.email}</span>.
                        Confirm your email before checkout — it keeps your purchase tied to the right account.
                    </p>
                    <button
                        type="button"
                        onClick={handleResendVerification}
                        disabled={resendStatus === 'sending'}
                        className="mt-6 inline-flex items-center justify-center px-6 py-2.5 font-semibold bg-[var(--brand-primary)] text-[var(--brand-black)] rounded-lg hover:opacity-90 disabled:opacity-50"
                    >
                        {resendStatus === 'sending' ? 'Sending…' : resendStatus === 'sent' ? 'Link sent — check your inbox' : 'Resend verification email'}
                    </button>
                    {error && <p className="mt-4 text-sm text-red-400">{error}</p>}
                </div>
            </div>
        );
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
                        ${course.price}
                    </div>
                </div>

                <div className="mt-8">
                    <h2 className="text-xl font-semibold text-[var(--brand-foreground)]">Payment Information</h2>
                    <div className="mt-4 p-4 border border-[var(--surface-border)] rounded-lg bg-[var(--comment-secondary-bg)]">
                        {/* This is the Stripe Card Element for securely collecting card details */}
                        <CardElement options={{ style: cardStyle }} />
                    </div>
                </div>

                <div className="mt-8 text-center">
                    <p className="text-sm text-[var(--brand-muted)]">This is a one-time payment for lifetime access.</p>
                    {pendingPaymentIntentId && (
                        <p className="mt-3 text-sm text-[var(--brand-muted)]">
                            Already charged?{' '}
                            <button
                                type="button"
                                onClick={handleReconcileAccess}
                                disabled={reconciling}
                                className="font-semibold text-[var(--brand-primary)] underline disabled:opacity-50"
                            >
                                {reconciling ? 'Restoring access…' : 'Restore my access'}
                            </button>
                        </p>
                    )}
                    <div className="mt-4 flex justify-center gap-4">
                        <button onClick={handlePurchase} disabled={isLoading || !stripe} className="px-8 py-3 font-semibold text-[var(--background)] bg-[var(--brand-primary)] rounded-lg hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-[var(--background)] focus:ring-[var(--brand-primary)] transition-colors disabled:opacity-40">
                            {isLoading ? 'Processing...' : 'Purchase with Stripe'}
                        </button>
                    </div>
                </div>

                {error && (
                    <div className="mt-6 p-3 bg-red-100 text-red-700 rounded-lg text-center space-y-3">
                        <p>{error}</p>
                        {pendingPaymentIntentId && (
                            <button
                                type="button"
                                onClick={handleReconcileAccess}
                                disabled={reconciling}
                                className="text-sm font-semibold underline disabled:opacity-50"
                            >
                                {reconciling ? 'Confirming…' : 'Payment went through? Restore my access'}
                            </button>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}