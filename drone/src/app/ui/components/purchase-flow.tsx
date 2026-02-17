'use client';

import { useState } from 'react';
import { CourseData } from '@/app/lib/types/course';
import { createPaymentIntent, getCourseById } from '@/app/lib/api-client';
import ImageComponent from './image';
import Link from 'next/link';
import { useAuth } from '@/app/lib/auth-context';
import { CardElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { logger } from '@/app/lib/logger';

// NOTE: The parent component rendering this flow must be wrapped in Stripe's <Elements> provider.
// Example in a layout or page:
// import { loadStripe } from '@stripe/stripe-js';
// import { Elements } from '@stripe/react-stripe-js';
// const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);
// <Elements stripe={stripePromise}><PurchaseFlow ... /></Elements>
interface PurchaseFlowProps {
    course: CourseData;
    onPurchaseSuccess: () => void;
}

export default function PurchaseFlow({ course, onPurchaseSuccess }: PurchaseFlowProps) {
    const { user } = useAuth();
    const stripe = useStripe();
    const elements = useElements();
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

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
            onPurchaseSuccess();
        } catch (err) {
            const message = err instanceof Error ? err.message : 'An unknown error occurred.';
            logger.error(err as Error, { context: 'Stripe Purchase Flow' });
            setError(`Purchase failed: ${message}`);
        } finally {
            setIsLoading(false);
        }
    };

    if (!user) {
        return (
            <div className="text-center p-8 max-w-4xl mx-auto">
                <div className="bg-white rounded-2xl shadow-lg p-8">
                    <h2 className="text-2xl font-bold">Please Log In</h2>
                    <p className="mt-2 text-gray-600">You need to be logged in to purchase this course.</p>
                    <Link href="/login" className="mt-4 inline-block px-6 py-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700">
                        Login or Sign Up
                    </Link>
                </div>
            </div>
        )
    }

    return (
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
            <div className="bg-white rounded-2xl shadow-lg p-8">
                <h1 className="text-3xl font-bold text-gray-900">Purchase Course</h1>
                <p className="text-lg text-gray-600 mt-2">You&apos;re about to unlock full access to:</p>
                
                <div className="mt-6 flex flex-col md:flex-row gap-8 items-center bg-gray-50 p-6 rounded-lg">
                    <ImageComponent 
                        src={course.image_url} 
                        alt={course.title} 
                        width={200} 
                        height={112} 
                        className="rounded-lg object-cover aspect-video"
                    />
                    <div className="flex-grow">
                        <h2 className="text-2xl font-semibold">{course.title}</h2>
                        <p className="text-gray-500 mt-1">{course.sub_title}</p>
                    </div>
                    <div className="text-3xl font-bold text-gray-800">
                        ${course.price}
                    </div>
                </div>

                <div className="mt-8">
                    <h2 className="text-xl font-semibold text-gray-800">Payment Information</h2>
                    <div className="mt-4 p-4 border rounded-lg bg-gray-50">
                        {/* This is the Stripe Card Element for securely collecting card details */}
                        <CardElement options={{
                            style: {
                                base: { fontSize: '16px', color: '#424770', '::placeholder': { color: '#aab7c4' } },
                                invalid: { color: '#9e2146' },
                            }
                        }} />
                    </div>
                </div>

                <div className="mt-8 text-center">
                    <p className="text-sm text-gray-500">This is a one-time payment for lifetime access.</p>
                    <div className="mt-4 flex justify-center gap-4">
                        <button onClick={handlePurchase} disabled={isLoading || !stripe} className="px-8 py-3 font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors disabled:bg-gray-400">
                            {isLoading ? 'Processing...' : 'Purchase with Stripe'}
                        </button>
                    </div>
                </div>

                {error && <div className="mt-6 p-3 bg-red-100 text-red-700 rounded-lg text-center">{error}</div>}
            </div>
        </div>
    );
}