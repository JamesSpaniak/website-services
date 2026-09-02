'use client';

import { useCallback, useEffect, useState } from 'react';
import { useManagerOrg } from '../shell';
import {
    getOrgProgress,
    getOrgCourseProgress,
    getStudentActivity,
    resetMemberPicture,
    getOrgClasses,
} from '@/app/lib/api-client';
import type { MemberCourseProgressSummary, MemberCourseDetailedProgress, OrgClass } from '@/app/lib/types/organization';
import type { AuditLogEntry } from '@/app/lib/types/audit';
import { AUDIT_ACTION_TONE, PROGRESS_STATUS_TONE, progressBarTone } from '@/app/lib/status-tones';
import LoadingComponent from '@/app/ui/components/loading';
import ErrorComponent from '@/app/ui/components/error';
import { ChevronDownIcon, ChevronRightIcon, TrashIcon, XMarkIcon } from '@heroicons/react/24/solid';

export default function ManagerProgressPage() {
    const { org } = useManagerOrg();
    const orgId = org.id;

    const [progressData, setProgressData] = useState<MemberCourseProgressSummary[]>([]);
    const [classes, setClasses] = useState<OrgClass[]>([]);
    const [filterClassId, setFilterClassId] = useState<'all' | 'none' | number>('all');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [expandedCourse, setExpandedCourse] = useState<number | null>(null);
    const [detailedProgress, setDetailedProgress] = useState<Record<number, MemberCourseDetailedProgress[]>>({});
    const [detailLoading, setDetailLoading] = useState<number | null>(null);

    const load = useCallback(async () => {
        try {
            setLoading(true);
            const [data, classData] = await Promise.all([
                getOrgProgress(orgId),
                getOrgClasses(orgId),
            ]);
            setProgressData(data);
            setClasses(classData);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load progress');
        } finally {
            setLoading(false);
        }
    }, [orgId]);

    useEffect(() => { load(); }, [load]);

    const visibleRows = progressData.filter((row) => {
        if (filterClassId === 'all') return true;
        if (filterClassId === 'none') return row.class_id === null;
        return row.class_id === filterClassId;
    });

    // Group progress by course
    const courseMap = new Map<number, { title: string; members: MemberCourseProgressSummary[] }>();
    for (const row of visibleRows) {
        if (!courseMap.has(row.course_id)) {
            courseMap.set(row.course_id, { title: row.course_title, members: [] });
        }
        courseMap.get(row.course_id)!.members.push(row);
    }

    const toggleCourse = async (courseId: number) => {
        if (expandedCourse === courseId) {
            setExpandedCourse(null);
            return;
        }
        setExpandedCourse(courseId);

        if (!detailedProgress[courseId]) {
            setDetailLoading(courseId);
            try {
                const data = await getOrgCourseProgress(orgId, courseId);
                setDetailedProgress((prev) => ({ ...prev, [courseId]: data }));
            } catch (err) {
                setError(err instanceof Error ? err.message : 'Failed to load detailed progress');
            } finally {
                setDetailLoading(null);
            }
        }
    };

    if (loading) return <LoadingComponent />;

    const classFilter = classes.length > 0 && (
        <div className="flex items-center gap-2">
            <label className="text-sm text-[var(--brand-muted)]">Class:</label>
            <select
                value={filterClassId === 'all' || filterClassId === 'none' ? filterClassId : String(filterClassId)}
                onChange={(e) => {
                    const v = e.target.value;
                    setFilterClassId(v === 'all' || v === 'none' ? v : Number(v));
                }}
                className="px-3 py-1.5 border border-[var(--input-border)] rounded-lg text-sm focus:ring-2 focus:ring-[var(--brand-primary)]"
            >
                <option value="all">All classes</option>
                <option value="none">Unassigned</option>
                {classes.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                ))}
            </select>
        </div>
    );

    if (courseMap.size === 0) {
        return (
            <div>
                {classFilter && <div className="mb-4">{classFilter}</div>}
                <div className="text-center py-12 text-[var(--brand-muted)]">No course progress data available yet.</div>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {error && <ErrorComponent message={error} />}
            {classFilter}
            {Array.from(courseMap.entries()).map(([courseId, { title, members }]) => {
                const isExpanded = expandedCourse === courseId;
                const membersWithProgress = members.filter((m) => m.status !== 'NOT_STARTED');
                const avgCompletion = members.length > 0
                    ? Math.round(members.reduce((sum, m) => sum + (m.units_total > 0 ? (m.units_completed / m.units_total) * 100 : 0), 0) / members.length)
                    : 0;

                return (
                    <div key={courseId} className="bg-[var(--surface)] rounded-xl shadow-sm overflow-hidden">
                        <button
                            onClick={() => toggleCourse(courseId)}
                            className="w-full px-6 py-4 flex items-center justify-between hover:bg-[var(--comment-secondary-bg)] transition-colors"
                        >
                            <div className="text-left">
                                <h3 className="text-sm font-semibold text-[var(--brand-foreground)]">{title}</h3>
                                <p className="text-xs text-[var(--brand-muted)] mt-0.5">
                                    {membersWithProgress.length} of {members.length} students started · {avgCompletion}% avg completion
                                </p>
                            </div>
                            {isExpanded ? (
                                <ChevronDownIcon className="h-5 w-5 text-[var(--brand-muted)]" />
                            ) : (
                                <ChevronRightIcon className="h-5 w-5 text-[var(--brand-muted)]" />
                            )}
                        </button>

                        {isExpanded && (
                            <div className="border-t border-[var(--surface-border)]">
                                {detailLoading === courseId ? (
                                    <div className="p-6"><LoadingComponent /></div>
                                ) : (
                                    <ProgressSummaryTable members={members} orgId={orgId} />
                                )}
                            </div>
                        )}
                    </div>
                );
            })}
        </div>
    );
}

function ProgressSummaryTable({ members, orgId }: { members: MemberCourseProgressSummary[]; orgId: number }) {
    const [selectedStudent, setSelectedStudent] = useState<{ userId: number; name: string } | null>(null);

    return (
        <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-[var(--surface-border)]">
                <thead className="bg-[var(--comment-secondary-bg)]">
                    <tr>
                        <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-[var(--brand-muted)] uppercase">Student</th>
                        <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-[var(--brand-muted)] uppercase">Status</th>
                        <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-[var(--brand-muted)] uppercase">Units</th>
                        <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-[var(--brand-muted)] uppercase">Progress</th>
                        <th className="hidden sm:table-cell px-4 sm:px-6 py-3 text-left text-xs font-medium text-[var(--brand-muted)] uppercase">Last Exam</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-[var(--surface-border)]">
                    {members.map((m) => {
                        const pct = m.units_total > 0 ? Math.round((m.units_completed / m.units_total) * 100) : 0;
                        const displayName = m.first_name || m.last_name
                            ? `${m.first_name || ''} ${m.last_name || ''}`.trim()
                            : m.username;
                        return (
                            <tr
                                key={m.user_id}
                                className="hover:bg-[var(--comment-secondary-bg)] cursor-pointer transition-colors"
                                onClick={() => setSelectedStudent({ userId: m.user_id, name: displayName })}
                            >
                                <td className="px-4 sm:px-6 py-3 text-sm font-medium text-[var(--brand-foreground)]">
                                    {displayName}
                                    <span className="block text-xs text-[var(--brand-muted)]">@{m.username}</span>
                                </td>
                                <td className="px-4 sm:px-6 py-3 text-sm">
                                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${
                                        PROGRESS_STATUS_TONE[m.status] ?? PROGRESS_STATUS_TONE.NOT_STARTED
                                    }`}>
                                        {m.status.replace('_', ' ')}
                                    </span>
                                </td>
                                <td className="px-4 sm:px-6 py-3 text-sm text-[var(--brand-muted)]">
                                    {m.units_completed}/{m.units_total}
                                </td>
                                <td className="px-4 sm:px-6 py-3 text-sm">
                                    <div className="flex items-center gap-2">
                                        <div className="w-24 bg-[var(--surface-border)] rounded-full h-2">
                                            <div
                                                className={`h-2 rounded-full ${progressBarTone(pct)}`}
                                                style={{ width: `${pct}%` }}
                                            />
                                        </div>
                                        <span className="text-xs text-[var(--brand-muted)]">{pct}%</span>
                                    </div>
                                </td>
                                <td className="hidden sm:table-cell px-4 sm:px-6 py-3 text-sm text-[var(--brand-muted)]">
                                    {m.latest_exam_score !== null ? `${m.latest_exam_score}%` : '—'}
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>

            {selectedStudent && (
                <StudentActivityPanel
                    userId={selectedStudent.userId}
                    studentName={selectedStudent.name}
                    orgId={orgId}
                    onClose={() => setSelectedStudent(null)}
                />
            )}
        </div>
    );
}

const ACTION_LABELS: Record<string, { label: string; color: string }> = {
    LOGIN: { label: 'Logged in', color: AUDIT_ACTION_TONE.LOGIN },
    REGISTER: { label: 'Registered', color: AUDIT_ACTION_TONE.REGISTER },
    VERIFY_EMAIL: { label: 'Verified email', color: AUDIT_ACTION_TONE.VERIFY_EMAIL },
    COURSE_STARTED: { label: 'Started a course', color: AUDIT_ACTION_TONE.COURSE_STARTED },
    UNIT_COMPLETED: { label: 'Completed a unit', color: AUDIT_ACTION_TONE.UNIT_COMPLETED },
    EXAM_SUBMITTED: { label: 'Submitted an exam', color: AUDIT_ACTION_TONE.EXAM_SUBMITTED },
    COURSE_COMPLETED: { label: 'Completed a course', color: AUDIT_ACTION_TONE.COURSE_COMPLETED },
    PROGRESS_RESET: { label: 'Reset progress', color: AUDIT_ACTION_TONE.PROGRESS_RESET },
    COURSE_PURCHASED: { label: 'Purchased a course', color: AUDIT_ACTION_TONE.COURSE_PURCHASED },
    PRO_UPGRADE: { label: 'Upgraded to Pro', color: AUDIT_ACTION_TONE.PRO_UPGRADE },
};

function formatActionMeta(action: string, metadata: Record<string, unknown> | null): string {
    if (!metadata) return '';
    const parts: string[] = [];
    if (metadata.courseTitle) parts.push(String(metadata.courseTitle));
    if (metadata.score !== undefined) parts.push(`Score: ${metadata.score}%`);
    if (metadata.attempt !== undefined) parts.push(`Attempt #${metadata.attempt}`);
    return parts.join(' · ');
}

function StudentActivityPanel({ userId, studentName, orgId, onClose }: { userId: number; studentName: string; orgId: number; onClose: () => void }) {
    const [activity, setActivity] = useState<AuditLogEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [resettingPicture, setResettingPicture] = useState(false);

    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                const data = await getStudentActivity(userId);
                if (!cancelled) setActivity(data);
            } catch {
                if (!cancelled) setActivity([]);
            } finally {
                if (!cancelled) setLoading(false);
            }
        })();
        return () => { cancelled = true; };
    }, [userId]);

    const handleResetPicture = async () => {
        if (!confirm(`Remove ${studentName}'s profile picture?`)) return;
        setResettingPicture(true);
        try {
            await resetMemberPicture(orgId, userId);
        } catch { /* swallow */ }
        finally { setResettingPicture(false); }
    };

    return (
        <div className="border-t border-[var(--surface-border)] bg-[var(--comment-secondary-bg)] p-4 sm:p-6">
            <div className="flex items-center justify-between mb-4">
                <h4 className="text-sm font-semibold text-[var(--brand-foreground)]">Activity Log — {studentName}</h4>
                <div className="flex items-center gap-2">
                    <button
                        onClick={handleResetPicture}
                        disabled={resettingPicture}
                        className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-red-700 bg-red-50 border border-red-200 rounded-md hover:bg-red-100 disabled:opacity-50"
                    >
                        <TrashIcon className="h-3.5 w-3.5" />
                        {resettingPicture ? 'Resetting...' : 'Reset Picture'}
                    </button>
                    <button onClick={onClose} className="p-1 text-[var(--brand-muted)] hover:text-[var(--brand-muted)] rounded hover:bg-[var(--surface-border)]">
                        <XMarkIcon className="h-5 w-5" />
                    </button>
                </div>
            </div>

            {loading ? (
                <p className="text-sm text-[var(--brand-muted)]">Loading activity...</p>
            ) : activity.length === 0 ? (
                <p className="text-sm text-[var(--brand-muted)]">No activity recorded yet.</p>
            ) : (
                <div className="space-y-2 max-h-80 overflow-y-auto">
                    {activity.map((entry) => {
                        const cfg = ACTION_LABELS[entry.action] || { label: entry.action, color: 'bg-[var(--comment-secondary-bg)] text-[var(--brand-muted)]' };
                        const meta = formatActionMeta(entry.action, entry.metadata);
                        return (
                            <div key={entry.id} className="flex items-start gap-3 text-sm">
                                <span className="text-xs text-[var(--brand-muted)] whitespace-nowrap pt-0.5 w-32 shrink-0">
                                    {new Date(entry.created_at).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
                                </span>
                                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${cfg.color}`}>
                                    {cfg.label}
                                </span>
                                {meta && <span className="text-xs text-[var(--brand-muted)] pt-0.5">{meta}</span>}
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
