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
        <div className="p-4 md:p-8 rounded-lg border border-[var(--surface-border)] bg-[var(--surface)] shadow-md">
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
                        className="relative rounded-full overflow-hidden border-4 border-[var(--surface-border)] hover:border-[var(--brand-primary)] transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)] focus:ring-offset-2 focus:ring-offset-[var(--background)] cursor-pointer"
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
                            <div className="w-[150px] h-[150px] bg-[var(--comment-avatar-bg)] rounded-full flex items-center justify-center">
                                <span className="text-[var(--comment-avatar-text)] text-lg">No Image</span>
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
                    <h2 className="text-4xl font-bold text-[var(--brand-foreground)]">{displayName}</h2>
                    {email && <p className="text-[var(--brand-muted)] mt-2 text-lg">{email}</p>}
                    <p className="text-[var(--brand-muted)] mt-1 text-md opacity-90">@{username}</p>
                </div>
            </div>
            
            <div className="mt-10">
                <h3 className="text-2xl font-semibold border-b border-[var(--surface-border)] pb-2 mb-4 text-[var(--brand-foreground)]">My Courses</h3>
                {coursesLoading ? (
                    <div className="p-4 bg-[var(--comment-secondary-bg)] rounded-lg border border-[var(--surface-border)]">
                        <p className="text-[var(--brand-muted)]">Loading courses...</p>
                    </div>
                ) : courses.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {courses.map(course => (
                            <CourseProgressPreview key={course.id} course={course} onReset={handleCourseReset} />
                        ))}
                    </div>
                ) : (
                    <div className="p-4 bg-[var(--comment-secondary-bg)] rounded-lg border border-[var(--surface-border)]">
                        <p className="text-[var(--brand-muted)]">
                            You have not started any courses yet.{' '}
                            <Link href="/courses" className="text-[var(--brand-primary)] hover:underline">Browse courses</Link> to get started.
                        </p>
                    </div>
                )}
            </div>

            <div className="mt-10">
                <h3 className="text-2xl font-semibold border-b border-[var(--surface-border)] pb-2 mb-4 text-[var(--brand-foreground)]">Recent Activity</h3>
                {activityLoading ? (
                    <div className="p-4 bg-[var(--comment-secondary-bg)] rounded-lg border border-[var(--surface-border)]">
                        <p className="text-[var(--brand-muted)]">Loading activity...</p>
                    </div>
                ) : (
                    <div>
                        {loginStreak >= 2 && (
                            <div className="mb-4 flex items-center gap-3 bg-[var(--comment-secondary-bg)] border border-[var(--surface-border)] rounded-xl px-5 py-4">
                                <span className="text-3xl">&#128293;</span>
                                <div>
                                    <p className="text-lg font-bold text-[var(--brand-primary)]">{loginStreak}-day streak!</p>
                                    <p className="text-sm text-[var(--brand-muted)]">
                                        You&apos;ve logged in {loginStreak} days in a row. Keep it up!
                                    </p>
                                </div>
                            </div>
                        )}

                        {activity.length === 0 ? (
                            <div className="p-4 bg-[var(--comment-secondary-bg)] rounded-lg border border-[var(--surface-border)]">
                                <p className="text-[var(--brand-muted)]">No recent activity.</p>
                            </div>
                        ) : (
                            <div className="space-y-2">
                                {activity.map((entry) => {
                                    const cfg = PROFILE_ACTION_LABELS[entry.action] || { label: entry.action, icon: '&#9679;', color: 'text-[var(--brand-muted)]' };
                                    const meta = formatProfileMeta(entry.metadata);
                                    return (
                                        <div key={entry.id} className="flex items-center gap-3 p-3 bg-[var(--comment-secondary-bg)] rounded-lg border border-[var(--surface-border)]">
                                            <span className="text-lg" dangerouslySetInnerHTML={{ __html: cfg.icon }} />
                                            <div className="flex-1 min-w-0">
                                                <p className={`text-sm font-medium ${cfg.color}`}>{cfg.label}</p>
                                                {meta && <p className="text-xs text-[var(--brand-muted)] truncate">{meta}</p>}
                                            </div>
                                            <span className="text-xs text-[var(--brand-muted)] shrink-0 opacity-80">
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
                <h3 className="text-2xl font-semibold border-b border-[var(--surface-border)] pb-2 mb-4 text-[var(--brand-foreground)]">Settings</h3>
                
                {message && (
                    <div className={`p-3 mb-4 rounded-md text-white ${message.type === 'success' ? 'bg-green-500' : 'bg-red-500'}`}>
                        {message.text}
                    </div>
                )}

                <div className="p-4 bg-[var(--comment-secondary-bg)] rounded-lg space-y-6 border border-[var(--surface-border)]">
                    {/* Update Email */}
                    <div>
                        <label htmlFor="email" className="block text-sm font-medium text-[var(--brand-foreground)]">Update Email</label>
                        <div className="mt-1 flex rounded-md shadow-sm">
                            <input
                                type="email"
                                id="email"
                                value={newEmail}
                                onChange={(e) => setNewEmail(e.target.value)}
                                className="flex-1 min-w-0 block w-full px-3 py-2 rounded-none rounded-l-md sm:text-sm border border-[var(--input-border)] bg-[var(--input-bg)] text-[var(--input-text)] ring-focus focus:ring-2 focus:ring-[var(--brand-primary)]"
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
                                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-r-md text-[var(--background)] bg-[var(--brand-primary)] hover:opacity-90"
                            >
                                Save
                            </button>
                        </div>
                        {emailError && <p className="text-xs text-red-500 mt-1">{emailError}</p>}
                    </div>

                    {/* Membership Type */}
                    <div>
                        <h4 className="text-sm font-medium text-[var(--brand-foreground)]">Membership</h4>
                        <div className="mt-2 flex flex-wrap gap-2">
                            <button type="button" className="px-4 py-2 border border-[var(--surface-border)] rounded-md bg-[var(--surface)] text-[var(--brand-muted)] cursor-not-allowed">Basic (Current)</button>
                            <button type="button" className="px-4 py-2 border border-[var(--surface-border)] rounded-md text-[var(--brand-foreground)] bg-[var(--comment-secondary-bg)] hover:opacity-90">Upgrade to Pro</button>
                            <button type="button" className="px-4 py-2 border border-[var(--surface-border)] rounded-md text-[var(--brand-foreground)] bg-[var(--comment-secondary-bg)] hover:opacity-90">Upgrade to Enterprise</button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

const PROFILE_ACTION_LABELS: Record<string, { label: string; icon: string; color: string }> = {
    LOGIN: { label: 'Logged in', icon: '&#128275;', color: 'text-[var(--brand-foreground)]' },
    REGISTER: { label: 'Joined the platform', icon: '&#127881;', color: 'text-[var(--brand-primary)]' },
    VERIFY_EMAIL: { label: 'Verified email', icon: '&#9989;', color: 'text-[var(--brand-primary)]' },
    COURSE_STARTED: { label: 'Started a new course', icon: '&#128218;', color: 'text-[var(--brand-primary)]' },
    UNIT_COMPLETED: { label: 'Completed a unit', icon: '&#127942;', color: 'text-[var(--brand-foreground)]' },
    EXAM_SUBMITTED: { label: 'Took an exam', icon: '&#128221;', color: 'text-[var(--brand-muted)]' },
    COURSE_COMPLETED: { label: 'Completed a course', icon: '&#127941;', color: 'text-[var(--brand-primary)]' },
    PROGRESS_RESET: { label: 'Reset course progress', icon: '&#128260;', color: 'text-red-500' },
    COURSE_PURCHASED: { label: 'Purchased a course', icon: '&#128176;', color: 'text-[var(--brand-muted)]' },
    PRO_UPGRADE: { label: 'Upgraded to Pro', icon: '&#11088;', color: 'text-[var(--brand-primary)]' },
};

function formatProfileMeta(metadata: Record<string, unknown> | null): string {
    if (!metadata) return '';
    const parts: string[] = [];
    if (metadata.courseTitle) parts.push(String(metadata.courseTitle));
    if (metadata.score !== undefined) parts.push(`Score: ${metadata.score}%`);
    return parts.join(' · ');
}
