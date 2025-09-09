'use client';

import { useState } from 'react';
import { CourseData } from '@/app/lib/types/course';
import { purchaseCourse } from '@/app/lib/api-client';
import ImageComponent from './image';
import Link from 'next/link';
import { useAuth } from '@/app/lib/auth-context';

interface PurchaseFlowProps {
    course: CourseData;
    onPurchaseSuccess: () => void;
}

export default function PurchaseFlow({ course, onPurchaseSuccess }: PurchaseFlowProps) {
    const { user } = useAuth();
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handlePurchase = async () => {
        setIsLoading(true);
        setError(null);
        try {
            // In a real app, this is where you would trigger the Stripe/Plaid checkout flow.
            // For this example, we'll simulate a successful payment.
            console.log('Simulating payment for course:', course.title);
            
            // After simulated successful payment, call the backend to record the purchase.
            await purchaseCourse(course.id);

            // Notify the parent component of success.
            onPurchaseSuccess();
        } catch (err) {
            const message = err instanceof Error ? err.message : 'An unknown error occurred.';
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
                <p className="text-lg text-gray-600 mt-2">You're about to unlock full access to:</p>
                
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

                <div className="mt-8 text-center">
                    <p className="text-sm text-gray-500">This is a one-time payment for lifetime access.</p>
                    <div className="mt-4 flex justify-center gap-4">
                        <button onClick={handlePurchase} disabled={isLoading} className="px-8 py-3 font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors disabled:bg-gray-400">
                            {isLoading ? 'Processing...' : 'Purchase with Stripe'}
                        </button>
                    </div>
                </div>

                {error && <div className="mt-6 p-3 bg-red-100 text-red-700 rounded-lg text-center">{error}</div>}
            </div>
        </div>
    );
}