'use client';

import { useCallback, useEffect, useState } from 'react';
import { useManagerOrg } from '../shell';
import {
    getOrgProgress,
    getOrgCourseProgress,
    getOrgMemberTimeline,
    getStudentActivity,
    resetMemberPicture,
    getOrgClasses,
    orgProgressCsvUrl,
} from '@/app/lib/api-client';
import type { MemberCourseProgressSummary, MemberCourseDetailedProgress, OrgClass } from '@/app/lib/types/organization';
import type { MemberTimelineEvent } from '@/app/lib/types/analytics';
import type { AuditLogEntry } from '@/app/lib/types/audit';
import { AUDIT_ACTION_TONE, PROGRESS_STATUS_TONE, progressBarTone } from '@/app/lib/status-tones';
import LoadingComponent from '@/app/ui/components/loading';
import ErrorComponent from '@/app/ui/components/error';
import { track } from '@/app/lib/analytics';
import { recencyTone, relativeTime } from '@/app/lib/format-time';
import StudentQuizzes, { EffortBadge } from './student-quizzes';
import { ArrowDownTrayIcon, ChevronDownIcon, ChevronRightIcon, TrashIcon, XMarkIcon } from '@heroicons/react/24/solid';

interface UnitNode {
    id: string | number;
    title: string;
    video_url?: string;
    status?: string;
    sub_units?: UnitNode[];
}

interface FlatUnit {
    ref: string;
    title: string;
    depth: number;
    hasVideo: boolean;
}

function flattenUnits(units: UnitNode[] | undefined, depth = 0, out: FlatUnit[] = []): FlatUnit[] {
    for (const u of units ?? []) {
        out.push({ ref: String(u.id), title: u.title, depth, hasVideo: !!u.video_url });
        flattenUnits(u.sub_units, depth + 1, out);
    }
    return out;
}

function unitStatusMap(units: UnitNode[] | undefined, out: Record<string, string> = {}): Record<string, string> {
    for (const u of units ?? []) {
        out[String(u.id)] = u.status ?? 'NOT_STARTED';
        unitStatusMap(u.sub_units, out);
    }
    return out;
}

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
    useEffect(() => {
        track('manager_dashboard_viewed', { path: '/manager/progress', properties: { organization_id: orgId } });
    }, [orgId]);

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

    const exportHref = orgProgressCsvUrl(orgId, typeof filterClassId === 'number' ? filterClassId : undefined);
    const exportButton = (
        <a
            href={exportHref}
            download
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium border border-[var(--surface-border)] rounded-lg hover:bg-[var(--comment-secondary-bg)]"
            title="Download progress as CSV (one row per student × course)"
        >
            <ArrowDownTrayIcon className="h-4 w-4" />
            Export CSV
        </a>
    );

    const classFilter = (
        <div className="flex items-center justify-between gap-3 flex-wrap">
            {classes.length > 0 ? (
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
            ) : <span />}
            {exportButton}
        </div>
    );

    if (courseMap.size === 0) {
        return (
            <div>
                <div className="mb-4">{classFilter}</div>
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
                const active7d = members.filter((m) => m.last_activity_at && Date.now() - new Date(m.last_activity_at).getTime() <= 7 * 86400000).length;
                const totalMinutes7d = members.reduce((s, m) => s + (m.minutes_7d ?? 0), 0);

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
                                    {' · '}{active7d} active this week · {Math.round(totalMinutes7d / 60 * 10) / 10}h class time (7d)
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
                                    <>
                                        <ProgressSummaryTable members={members} orgId={orgId} />
                                        {detailedProgress[courseId] && detailedProgress[courseId].length > 0 && (
                                            <UnitGrid rows={detailedProgress[courseId]} />
                                        )}
                                    </>
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
                        <th className="hidden md:table-cell px-4 sm:px-6 py-3 text-left text-xs font-medium text-[var(--brand-muted)] uppercase" title="Videos completed (≥90 % watched) / videos in course">Videos</th>
                        <th className="hidden md:table-cell px-4 sm:px-6 py-3 text-left text-xs font-medium text-[var(--brand-muted)] uppercase" title="Minutes of lesson time in the last 7 days">Time 7d</th>
                        <th className="hidden sm:table-cell px-4 sm:px-6 py-3 text-left text-xs font-medium text-[var(--brand-muted)] uppercase">Last active</th>
                        <th className="hidden sm:table-cell px-4 sm:px-6 py-3 text-left text-xs font-medium text-[var(--brand-muted)] uppercase" title="Quizzes passed (≥70) / distinct quizzes attempted · best score">Quizzes</th>
                        <th className="hidden sm:table-cell px-4 sm:px-6 py-3 text-left text-xs font-medium text-[var(--brand-muted)] uppercase" title="Are they trying, stuck, or quiet?">Effort</th>
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
                                <td className="hidden md:table-cell px-4 sm:px-6 py-3 text-sm text-[var(--brand-muted)]">
                                    {m.videos_total > 0 ? `${m.videos_completed}/${m.videos_total}` : '—'}
                                </td>
                                <td className="hidden md:table-cell px-4 sm:px-6 py-3 text-sm text-[var(--brand-muted)]">
                                    {m.minutes_7d > 0 ? `${Math.round(m.minutes_7d)} min` : '—'}
                                </td>
                                <td className={`hidden sm:table-cell px-4 sm:px-6 py-3 text-sm ${recencyTone(m.last_activity_at)}`}>
                                    {relativeTime(m.last_activity_at)}
                                </td>
                                <td className="hidden sm:table-cell px-4 sm:px-6 py-3 text-sm text-[var(--brand-muted)]">
                                    {m.quizzes_attempted
                                        ? `${m.quizzes_passed ?? 0}/${m.quizzes_attempted} pass`
                                        : '—'}
                                    {m.best_exam_score != null && (
                                        <span className={`block text-xs ${(m.best_exam_score ?? 0) >= 70 ? 'text-emerald-700' : 'text-red-600'}`}>
                                            best {m.best_exam_score}%
                                            {m.latest_exam_score != null && m.latest_exam_score !== m.best_exam_score
                                                ? ` · last ${m.latest_exam_score}%`
                                                : ''}
                                        </span>
                                    )}
                                </td>
                                <td className="hidden sm:table-cell px-4 sm:px-6 py-3">
                                    <EffortBadge effort={m.effort} />
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

/**
 * Unit × student grid: each cell shows the unit status (■ done / ◪ in progress
 * / □ not started) and, for video units, the % watched. Answers "who is stuck
 * on which lesson" at a glance for a class of up to ~30.
 */
function UnitGrid({ rows }: { rows: MemberCourseDetailedProgress[] }) {
    const skeleton = rows.find((r) => r.progress)?.progress as { units?: UnitNode[] } | undefined;
    const units = flattenUnits(skeleton?.units);
    if (units.length === 0) return null;

    return (
        <div className="border-t border-[var(--surface-border)]">
            <div className="px-4 sm:px-6 pt-4 pb-2 flex items-center justify-between">
                <h4 className="text-xs font-semibold uppercase tracking-wide text-[var(--brand-muted)]">Lesson grid</h4>
                <span className="text-xs text-[var(--brand-muted)]">■ completed · ◪ in progress · □ not started · % = video · Q = quiz best</span>
            </div>
            <div className="overflow-x-auto pb-4">
                <table className="text-xs">
                    <thead>
                        <tr>
                            <th className="sticky left-0 bg-[var(--surface)] px-4 sm:px-6 py-2 text-left font-medium text-[var(--brand-muted)]">Student</th>
                            {units.map((u) => (
                                <th
                                    key={u.ref}
                                    className="px-1 py-2 font-medium text-[var(--brand-muted)] align-bottom"
                                    title={`${u.title}${u.hasVideo ? ' (video)' : ''}`}
                                >
                                    <div className="h-24 w-6 flex items-end justify-center">
                                        <span
                                            className="block whitespace-nowrap overflow-hidden text-ellipsis max-w-[6rem]"
                                            style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}
                                        >
                                            {u.depth > 0 ? '· ' : ''}{u.title}
                                        </span>
                                    </div>
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {rows.map((r) => {
                            const statuses = unitStatusMap((r.progress as { units?: UnitNode[] } | null)?.units);
                            const name = r.first_name || r.last_name ? `${r.first_name || ''} ${r.last_name || ''}`.trim() : r.username;
                            return (
                                <tr key={r.user_id} className="border-t border-[var(--surface-border)]">
                                    <td className="sticky left-0 bg-[var(--surface)] px-4 sm:px-6 py-1.5 whitespace-nowrap font-medium text-[var(--brand-foreground)]">
                                        {name}
                                        <span className={`block text-[10px] ${recencyTone(r.last_activity_at)}`}>{relativeTime(r.last_activity_at)}</span>
                                    </td>
                                    {units.map((u) => {
                                        const st = statuses[u.ref] ?? 'NOT_STARTED';
                                        const video = r.videos?.[u.ref];
                                        const quiz = r.quizzes?.[u.ref];
                                        const completedAt = r.unit_completed_at?.[u.ref];
                                        const glyph = st === 'COMPLETED' ? '■' : st === 'IN_PROGRESS' ? '◪' : '□';
                                        const tone = st === 'COMPLETED'
                                            ? 'text-emerald-600'
                                            : st === 'IN_PROGRESS' ? 'text-amber-600' : 'text-[var(--brand-muted)]';
                                        const tip = [
                                            u.title,
                                            st.replace('_', ' ').toLowerCase(),
                                            completedAt ? `completed ${new Date(completedAt).toLocaleDateString()}` : null,
                                            video ? `video ${video.percent_watched}% watched${video.completed ? ' (done)' : ''}` : null,
                                            quiz ? `quiz best ${quiz.best}% (${quiz.attempts} ${quiz.attempts === 1 ? 'try' : 'tries'}${quiz.passed ? ', passed' : ', not passed'})` : null,
                                        ].filter(Boolean).join(' · ');
                                        return (
                                            <td key={u.ref} className={`px-1 py-1.5 text-center ${tone}`} title={tip}>
                                                <span className="text-base leading-none">{glyph}</span>
                                                {u.hasVideo && (
                                                    <span className="block text-[10px] leading-none mt-0.5">
                                                        {video ? `${video.percent_watched}%` : '–'}
                                                    </span>
                                                )}
                                                {quiz && (
                                                    <span className={`block text-[10px] leading-none mt-0.5 font-semibold ${quiz.passed ? 'text-emerald-700' : 'text-red-600'}`}>
                                                        Q{quiz.best}
                                                    </span>
                                                )}
                                            </td>
                                        );
                                    })}
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

const EVENT_LABELS: Record<string, string> = {
    lesson_viewed: 'Opened lesson',
    video_started: 'Started video',
    video_progress: 'Video milestone',
    video_completed: 'Finished video',
    lesson_completed: 'Completed lesson',
    unit_completed: 'Completed unit',
    course_started: 'Started course',
    course_completed: 'Completed course',
    exam_started: 'Started exam',
    exam_submitted: 'Submitted exam',
    login: 'Logged in',
};

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
    const [timeline, setTimeline] = useState<MemberTimelineEvent[]>([]);
    const [view, setView] = useState<'quizzes' | 'timeline' | 'audit'>('quizzes');
    const [loading, setLoading] = useState(true);
    const [resettingPicture, setResettingPicture] = useState(false);

    useEffect(() => {
        let cancelled = false;
        (async () => {
            const [audit, events] = await Promise.allSettled([
                getStudentActivity(userId),
                getOrgMemberTimeline(orgId, userId, 100),
            ]);
            if (cancelled) return;
            setActivity(audit.status === 'fulfilled' ? audit.value : []);
            setTimeline(events.status === 'fulfilled' ? events.value : []);
            setLoading(false);
        })();
        return () => { cancelled = true; };
    }, [orgId, userId]);

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
                <div className="flex items-center gap-3">
                    <h4 className="text-sm font-semibold text-[var(--brand-foreground)]">Activity — {studentName}</h4>
                    <div className="inline-flex rounded-md border border-[var(--surface-border)] text-xs overflow-hidden">
                        {(['quizzes', 'timeline', 'audit'] as const).map((v) => (
                            <button
                                key={v}
                                onClick={() => setView(v)}
                                className={`px-2 py-1 ${view === v ? 'bg-[var(--brand-primary)] text-white' : 'text-[var(--brand-muted)] hover:bg-[var(--surface-border)]'}`}
                            >
                                {v === 'quizzes' ? 'Quizzes' : v === 'timeline' ? 'Learning (30d)' : 'Account'}
                            </button>
                        ))}
                    </div>
                </div>
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

            {view === 'quizzes' ? (
                <StudentQuizzes orgId={orgId} userId={userId} />
            ) : loading ? (
                <p className="text-sm text-[var(--brand-muted)]">Loading activity...</p>
            ) : view === 'timeline' ? (
                timeline.length === 0 ? (
                    <p className="text-sm text-[var(--brand-muted)]">No learning activity in the last 30 days.</p>
                ) : (
                    <div className="space-y-2 max-h-80 overflow-y-auto">
                        {timeline.map((ev, i) => {
                            const detail = [
                                ev.course_title,
                                ev.unit_title ?? ev.unit_ref,
                                ev.event_name === 'video_progress' && ev.properties?.milestone != null ? `${ev.properties.milestone}%` : null,
                                ev.event_name === 'exam_submitted' && ev.properties?.score != null ? `Score ${ev.properties.score}%` : null,
                            ].filter(Boolean).join(' · ');
                            return (
                                <div key={`${ev.occurred_at}-${i}`} className="flex items-start gap-3 text-sm">
                                    <span className="text-xs text-[var(--brand-muted)] whitespace-nowrap pt-0.5 w-32 shrink-0">
                                        {new Date(ev.occurred_at).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
                                    </span>
                                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-[var(--surface)] border border-[var(--surface-border)] text-[var(--brand-foreground)]">
                                        {EVENT_LABELS[ev.event_name] ?? ev.event_name.replace(/_/g, ' ')}
                                    </span>
                                    {detail && <span className="text-xs text-[var(--brand-muted)] pt-0.5">{detail}</span>}
                                </div>
                            );
                        })}
                    </div>
                )
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
