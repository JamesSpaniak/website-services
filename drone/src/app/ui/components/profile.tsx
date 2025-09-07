'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { updateUser, getCoursesWithProgress } from '@/app/lib/api-client';
import { useAuth } from '@/app/lib/auth-context';
import { CourseData } from '@/app/lib/types/course';
import { z } from 'zod';
import CourseProgressPreview from './course-progress-preview';

const emailSchema = z.string().email({ message: "Please enter a valid email." });

export default function ProfileComponent() {
    const { user, setUser } = useAuth();
    const [newEmail, setNewEmail] = useState(user?.email || '');
    const [message, setMessage] = useState<{ text: string, type: 'success' | 'error' } | null>(null);
    const [emailError, setEmailError] = useState<string | null>(null);
    const [courses, setCourses] = useState<CourseData[]>([]);
    const [coursesLoading, setCoursesLoading] = useState(true);

    useEffect(() => {
        async function fetchCourses() {
            try {
                const data = await getCoursesWithProgress();
                setCourses(data);
            } catch (e) {
                console.error("Failed to fetch course progress", e);
            } finally {
                setCoursesLoading(false);
            }
        }
        fetchCourses();
    }, []);

    const handleCourseReset = (courseId: number) => {
        setCourses(prevCourses => prevCourses.filter(c => c.id !== courseId));
    };

    if (!user) return null;

    const { first_name, last_name, picture_url, email, username } = user;
    const displayName = (first_name && last_name) ? `${first_name} ${last_name}` : username;

    return (
        <div className="p-4 md:p-8 bg-white rounded-lg shadow-md">
            <h1 className="text-3xl font-bold mb-6 text-gray-800 border-b pb-4">User Profile</h1>
            <div className="flex flex-col md:flex-row items-center md:items-start space-y-6 md:space-y-0 md:space-x-8">
                <div className="flex-shrink-0">
                    {picture_url ? (
                        <Image
                            src={picture_url}
                            alt={`Profile picture of ${displayName}`}
                            width={150}
                            height={150}
                            className="rounded-full object-cover border-4 border-gray-200"
                        />
                    ) : (
                        <div className="w-[150px] h-[150px] bg-gray-200 rounded-full flex items-center justify-center border-4 border-gray-200">
                            <span className="text-gray-500 text-lg">No Image</span>
                        </div>
                    )}
                </div>
                <div className="flex flex-col pt-4 text-center md:text-left">
                    <h2 className="text-4xl font-bold text-gray-900">{displayName}</h2>
                    {email && <p className="text-gray-600 mt-2 text-lg">{email}</p>}
                    <p className="text-gray-500 mt-1 text-md">@{username}</p>
                </div>
            </div>
            
            <div className="mt-10">
                <h3 className="text-2xl font-semibold border-b pb-2 mb-4 text-gray-800">My Courses</h3>
                {coursesLoading ? (
                    <div className="p-4 bg-gray-50 rounded-lg">
                        <p className="text-gray-600">Loading courses...</p>
                    </div>
                ) : courses.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {courses.map(course => (
                            <CourseProgressPreview key={course.id} course={course} onReset={handleCourseReset} />
                        ))}
                    </div>
                ) : (
                    <div className="p-4 bg-gray-50 rounded-lg">
                        <p className="text-gray-600">You have not started any courses yet. <a href="/courses" className="text-blue-600 hover:underline">Browse courses</a> to get started.</p>
                    </div>
                )}
            </div>

            <div className="mt-10">
                <h3 className="text-2xl font-semibold border-b pb-2 mb-4 text-gray-800">Settings</h3>
                
                {message && (
                    <div className={`p-3 mb-4 rounded-md text-white ${message.type === 'success' ? 'bg-green-500' : 'bg-red-500'}`}>
                        {message.text}
                    </div>
                )}

                <div className="p-4 bg-gray-50 rounded-lg space-y-6">
                    {/* Update Email */}
                    <div>
                        <label htmlFor="email" className="block text-sm font-medium text-gray-700">Update Email</label>
                        <div className="mt-1 flex rounded-md shadow-sm">
                            <input
                                type="email"
                                id="email"
                                value={newEmail}
                                onChange={(e) => setNewEmail(e.target.value)}
                                className="flex-1 min-w-0 block w-full px-3 py-2 rounded-none rounded-l-md focus:ring-blue-500 focus:border-blue-500 sm:text-sm border-gray-300"
                            />
                            <button
                                onClick={async () => {
                                    const validationResult = emailSchema.safeParse(newEmail);
                                    if (!validationResult.success) {
                                        setEmailError(validationResult.error.format()._errors[0]);
                                        return;
                                    }
                                    setEmailError(null);
                                    setMessage(null);

                                    try {
                                        const updatedUser = await updateUser({ email: newEmail });
                                        setMessage({ text: 'Email updated successfully!', type: 'success' });
                                        setUser(updatedUser); // Update the user in the auth context
                                    } catch (e) {
                                        setMessage({ text: e instanceof Error ? e.message : 'Failed to update email.', type: 'error' });
                                    }
                                }}
                                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-r-md text-white bg-blue-600 hover:bg-blue-700"
                            >
                                Save
                            </button>
                        </div>
                        {emailError && <p className="text-xs text-red-500 mt-1">{emailError}</p>}
                    </div>

                    {/* Membership Type */}
                    <div>
                        <h4 className="text-sm font-medium text-gray-700">Membership</h4>
                        <div className="mt-2 space-x-4">
                            <button className="px-4 py-2 border rounded-md bg-gray-200 text-gray-600 cursor-not-allowed">Basic (Current)</button>
                            <button className="px-4 py-2 border rounded-md text-gray-700 bg-yellow-100 hover:bg-yellow-200">Upgrade to Pro</button>
                            <button className="px-4 py-2 border rounded-md text-gray-700 bg-purple-100 hover:bg-purple-200">Upgrade to Enterprise</button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
