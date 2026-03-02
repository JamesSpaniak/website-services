'use client';

import { useEffect, useState, useRef } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { updateUser, getCoursesWithProgress, getMyActivity, uploadProfilePicture } from '@/app/lib/api-client';
import { useAuth } from '@/app/lib/auth-context';
import { CourseData } from '@/app/lib/types/course';
import type { AuditLogEntry } from '@/app/lib/types/audit';
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
    const [activity, setActivity] = useState<AuditLogEntry[]>([]);
    const [loginStreak, setLoginStreak] = useState(0);
    const [activityLoading, setActivityLoading] = useState(true);
    const [uploading, setUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    const MAX_SIZE = 2 * 1024 * 1024; // 2 MB

    const handleAvatarClick = () => fileInputRef.current?.click();

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (!ALLOWED_TYPES.includes(file.type)) {
            setMessage({ text: 'Please select a JPEG, PNG, WebP, or GIF image.', type: 'error' });
            return;
        }
        if (file.size > MAX_SIZE) {
            setMessage({ text: 'Image must be under 2 MB.', type: 'error' });
            return;
        }

        setUploading(true);
        setMessage(null);
        try {
            const publicUrl = await uploadProfilePicture(file);
            setUser({ ...user!, picture_url: publicUrl });
            setMessage({ text: 'Profile picture updated!', type: 'success' });
        } catch (err) {
            setMessage({ text: err instanceof Error ? err.message : 'Failed to upload picture.', type: 'error' });
        } finally {
            setUploading(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    useEffect(() => {
        if (!user) {
            setCourses([]);
            setCoursesLoading(false);
            setActivityLoading(false);
            return;
        }

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

        async function fetchActivity() {
            try {
                const data = await getMyActivity(30);
                setActivity(data.activity);
                setLoginStreak(data.login_streak);
            } catch (e) {
                console.error("Failed to fetch activity", e);
            } finally {
                setActivityLoading(false);
            }
        }

        fetchCourses();
        fetchActivity();
    }, [user]);

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
                <div className="flex-shrink-0 relative group">
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/jpeg,image/png,image/webp,image/gif"
                        className="hidden"
                        onChange={handleFileChange}
                    />
                    <button
                        type="button"
                        onClick={handleAvatarClick}
                        disabled={uploading}
                        className="relative rounded-full overflow-hidden border-4 border-gray-200 hover:border-blue-400 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 cursor-pointer"
                    >
                        {picture_url ? (
                            <Image
                                src={picture_url}
                                alt={`Profile picture of ${displayName}`}
                                width={150}
                                height={150}
                                className="rounded-full object-cover"
                            />
                        ) : (
                            <div className="w-[150px] h-[150px] bg-gray-200 rounded-full flex items-center justify-center">
                                <span className="text-gray-500 text-lg">No Image</span>
                            </div>
                        )}
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors rounded-full flex items-center justify-center">
                            <span className="text-white text-sm font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                                {uploading ? 'Uploading...' : 'Change'}
                            </span>
                        </div>
                    </button>
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
                        <p className="text-gray-600">
                            You have not started any courses yet.{' '}
                            <Link href="/courses" className="text-blue-600 hover:underline">Browse courses</Link> to get started.
                        </p>
                    </div>
                )}
            </div>

            <div className="mt-10">
                <h3 className="text-2xl font-semibold border-b pb-2 mb-4 text-gray-800">Recent Activity</h3>
                {activityLoading ? (
                    <div className="p-4 bg-gray-50 rounded-lg">
                        <p className="text-gray-600">Loading activity...</p>
                    </div>
                ) : (
                    <div>
                        {loginStreak >= 2 && (
                            <div className="mb-4 flex items-center gap-3 bg-gradient-to-r from-orange-50 to-amber-50 border border-orange-200 rounded-xl px-5 py-4">
                                <span className="text-3xl">&#128293;</span>
                                <div>
                                    <p className="text-lg font-bold text-orange-700">{loginStreak}-day streak!</p>
                                    <p className="text-sm text-orange-600">
                                        You&apos;ve logged in {loginStreak} days in a row. Keep it up!
                                    </p>
                                </div>
                            </div>
                        )}

                        {activity.length === 0 ? (
                            <div className="p-4 bg-gray-50 rounded-lg">
                                <p className="text-gray-600">No recent activity.</p>
                            </div>
                        ) : (
                            <div className="space-y-2">
                                {activity.map((entry) => {
                                    const cfg = PROFILE_ACTION_LABELS[entry.action] || { label: entry.action, icon: '&#9679;', color: 'text-gray-500' };
                                    const meta = formatProfileMeta(entry.metadata);
                                    return (
                                        <div key={entry.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                                            <span className="text-lg" dangerouslySetInnerHTML={{ __html: cfg.icon }} />
                                            <div className="flex-1 min-w-0">
                                                <p className={`text-sm font-medium ${cfg.color}`}>{cfg.label}</p>
                                                {meta && <p className="text-xs text-gray-500 truncate">{meta}</p>}
                                            </div>
                                            <span className="text-xs text-gray-400 shrink-0">
                                                {new Date(entry.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                                            </span>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
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

const PROFILE_ACTION_LABELS: Record<string, { label: string; icon: string; color: string }> = {
    LOGIN: { label: 'Logged in', icon: '&#128275;', color: 'text-gray-700' },
    REGISTER: { label: 'Joined the platform', icon: '&#127881;', color: 'text-green-700' },
    VERIFY_EMAIL: { label: 'Verified email', icon: '&#9989;', color: 'text-green-700' },
    COURSE_STARTED: { label: 'Started a new course', icon: '&#128218;', color: 'text-blue-700' },
    UNIT_COMPLETED: { label: 'Completed a unit', icon: '&#127942;', color: 'text-indigo-700' },
    EXAM_SUBMITTED: { label: 'Took an exam', icon: '&#128221;', color: 'text-purple-700' },
    COURSE_COMPLETED: { label: 'Completed a course', icon: '&#127941;', color: 'text-emerald-700' },
    PROGRESS_RESET: { label: 'Reset course progress', icon: '&#128260;', color: 'text-red-600' },
    COURSE_PURCHASED: { label: 'Purchased a course', icon: '&#128176;', color: 'text-yellow-700' },
    PRO_UPGRADE: { label: 'Upgraded to Pro', icon: '&#11088;', color: 'text-amber-700' },
};

function formatProfileMeta(metadata: Record<string, unknown> | null): string {
    if (!metadata) return '';
    const parts: string[] = [];
    if (metadata.courseTitle) parts.push(String(metadata.courseTitle));
    if (metadata.score !== undefined) parts.push(`Score: ${metadata.score}%`);
    return parts.join(' · ');
}
