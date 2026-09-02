'use client';

import { useCallback, useEffect, useState } from 'react';
import { useManagerOrg } from '../shell';
import {
    getOrgCourses,
    generateClassExam,
    getOrgClassExams,
    getClassExamResults,
    getOrgClasses,
} from '@/app/lib/api-client';
import type { OrgCourse, OrgClass } from '@/app/lib/types/organization';
import type { ClassExamSummary, ClassExamResults, StudentExamResult } from '@/app/lib/types/question';
import LoadingComponent from '@/app/ui/components/loading';
import ErrorComponent from '@/app/ui/components/error';
import {
    PlusIcon,
    AcademicCapIcon,
    XMarkIcon,
    DocumentArrowDownIcon,
} from '@heroicons/react/24/solid';

const SCOPE_LABELS: Record<string, string> = {
    full_course: 'Full Course',
    unit: 'Unit',
    sub_unit: 'Sub-unit / Section',
};

export default function ManagerExamsPage() {
    const { org } = useManagerOrg();
    const orgId = org.id;

    const [courses, setCourses] = useState<OrgCourse[]>([]);
    const [classes, setClasses] = useState<OrgClass[]>([]);
    const [exams, setExams] = useState<ClassExamSummary[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [showForm, setShowForm] = useState(false);
    const [generating, setGenerating] = useState(false);
    const [success, setSuccess] = useState<string | null>(null);
    const [resultsFor, setResultsFor] = useState<ClassExamSummary | null>(null);

    // Form state
    const [courseId, setCourseId] = useState<number | ''>('');
    const [scope, setScope] = useState<'full_course' | 'unit' | 'sub_unit'>('full_course');
    const [scopeRefs, setScopeRefs] = useState('');
    const [version, setVersion] = useState('v1');
    const [isRandomized, setIsRandomized] = useState(true);
    const [questionCount, setQuestionCount] = useState('');
    const [label, setLabel] = useState('');
    const [dueDate, setDueDate] = useState('');
    const [examClassId, setExamClassId] = useState<number | null>(null);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const [c, e, cls] = await Promise.all([
                getOrgCourses(orgId),
                getOrgClassExams(orgId),
                getOrgClasses(orgId),
            ]);
            setCourses(c);
            setExams(e);
            setClasses(cls);
            setCourseId((prev) => (prev === '' && c.length > 0 ? c[0].id : prev));
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load exam data');
        } finally {
            setLoading(false);
        }
    }, [orgId]);

    useEffect(() => { load(); }, [load]);

    const notify = (msg: string) => {
        setSuccess(msg);
        setTimeout(() => setSuccess(null), 4000);
    };

    const handleGenerate = async () => {
        if (!courseId) return setError('Select a course first.');
        if ((scope === 'unit' || scope === 'sub_unit') && !scopeRefs.trim()) {
            return setError('Enter at least one scope ref (unit or sub-unit ref, e.g. u1).');
        }
        const parsedRefs = scopeRefs
            .split(',')
            .map((s) => s.trim())
            // Bare numbers are accepted as legacy ids and normalized to refs
            .map((s) => (/^\d+$/.test(s) ? `u${s}` : s))
            .filter(Boolean);

        setGenerating(true);
        try {
            const result = await generateClassExam({
                course_id: Number(courseId),
                scope,
                scope_refs: scope === 'full_course' ? [] : parsedRefs,
                is_randomized: isRandomized,
                version: version.trim() || 'v1',
                question_count: questionCount ? parseInt(questionCount) : undefined,
                organization_id: orgId,
                class_id: examClassId ?? undefined,
                label: label.trim() || undefined,
                due_date: dueDate || undefined,
            });
            notify(`Class exam assigned (${result.exam.questions.length} questions, version ${result.exam.version}).`);
            setShowForm(false);
            // Reset form
            setScope('full_course');
            setScopeRefs('');
            setVersion('v1');
            setIsRandomized(true);
            setQuestionCount('');
            setLabel('');
            setDueDate('');
            setExamClassId(null);
            // Reload list
            const updated = await getOrgClassExams(orgId);
            setExams(updated);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to generate class exam');
        } finally {
            setGenerating(false);
        }
    };

    if (loading) return <LoadingComponent />;

    return (
        <div>
            {error && <ErrorComponent message={error} />}

            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h2 className="text-xl font-semibold text-[var(--brand-foreground)]">Class Exams</h2>
                    <p className="text-sm text-[var(--brand-muted)] mt-0.5">
                        Assign practice exams to your class. Track who has taken them and view scores.
                    </p>
                </div>
                <button
                    onClick={() => { setShowForm(!showForm); setResultsFor(null); }}
                    className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-[var(--brand-primary)] text-[var(--brand-black)] rounded-lg hover:opacity-90"
                >
                    <PlusIcon className="h-4 w-4" /> Assign Exam
                </button>
            </div>

            {success && (
                <div className="mb-4 px-4 py-3 bg-green-500/10 border border-green-500/30 text-green-400 text-sm rounded-lg">{success}</div>
            )}

            {/* Generate form */}
            {showForm && (
                <div className="mb-6 bg-[var(--surface)] border border-[var(--surface-border)] rounded-xl p-6">
                    <h3 className="text-sm font-semibold text-[var(--brand-foreground)] mb-4">New Class Exam Assignment</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {/* Course */}
                        <div className="sm:col-span-2 lg:col-span-1">
                            <label className="block text-xs font-medium text-[var(--brand-muted)] mb-1">Course *</label>
                            <select
                                value={courseId}
                                onChange={(e) => setCourseId(Number(e.target.value))}
                                className="w-full px-3 py-2 text-sm bg-[var(--input-bg)] text-[var(--input-text)] border border-[var(--input-border)] rounded-lg focus:ring-2 focus:ring-[var(--brand-primary)]"
                            >
                                {courses.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}
                                {courses.length === 0 && <option disabled>No courses assigned to this org</option>}
                            </select>
                        </div>

                        {/* Class */}
                        {classes.length > 0 && (
                            <div>
                                <label className="block text-xs font-medium text-[var(--brand-muted)] mb-1">Class</label>
                                <select
                                    value={examClassId ?? ''}
                                    onChange={(e) => setExamClassId(e.target.value ? Number(e.target.value) : null)}
                                    className="w-full px-3 py-2 text-sm bg-[var(--input-bg)] text-[var(--input-text)] border border-[var(--input-border)] rounded-lg focus:ring-2 focus:ring-[var(--brand-primary)]"
                                >
                                    <option value="">Whole organization</option>
                                    {classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                                </select>
                            </div>
                        )}

                        {/* Scope */}
                        <div>
                            <label className="block text-xs font-medium text-[var(--brand-muted)] mb-1">Scope</label>
                            <select
                                value={scope}
                                onChange={(e) => setScope(e.target.value as typeof scope)}
                                className="w-full px-3 py-2 text-sm bg-[var(--input-bg)] text-[var(--input-text)] border border-[var(--input-border)] rounded-lg focus:ring-2 focus:ring-[var(--brand-primary)]"
                            >
                                <option value="full_course">Full Course</option>
                                <option value="unit">Unit</option>
                                <option value="sub_unit">Sub-unit / Section</option>
                            </select>
                        </div>

                        {/* Scope refs */}
                        {scope !== 'full_course' && (
                            <div>
                                <label className="block text-xs font-medium text-[var(--brand-muted)] mb-1">
                                    {scope === 'unit' ? 'Unit ref(s)' : 'Sub-unit ref(s)'} *
                                    <span className="font-normal ml-1 text-[var(--brand-muted)]">(comma-separated)</span>
                                </label>
                                <input
                                    type="text"
                                    value={scopeRefs}
                                    onChange={(e) => setScopeRefs(e.target.value)}
                                    placeholder="e.g. u1, u2, u31"
                                    className="w-full px-3 py-2 text-sm bg-[var(--input-bg)] text-[var(--input-text)] border border-[var(--input-border)] rounded-lg focus:ring-2 focus:ring-[var(--brand-primary)]"
                                />
                            </div>
                        )}

                        {/* Version */}
                        <div>
                            <label className="block text-xs font-medium text-[var(--brand-muted)] mb-1">
                                Version
                                <span className="font-normal ml-1 text-[var(--brand-muted)]">(A, B, v1, v2…)</span>
                            </label>
                            <input
                                type="text"
                                value={version}
                                maxLength={8}
                                onChange={(e) => setVersion(e.target.value)}
                                className="w-full px-3 py-2 text-sm bg-[var(--input-bg)] text-[var(--input-text)] border border-[var(--input-border)] rounded-lg focus:ring-2 focus:ring-[var(--brand-primary)]"
                            />
                        </div>

                        {/* Question count */}
                        <div>
                            <label className="block text-xs font-medium text-[var(--brand-muted)] mb-1">
                                Question Count
                                <span className="font-normal ml-1 text-[var(--brand-muted)]">(blank = all available)</span>
                            </label>
                            <input
                                type="number"
                                min={1}
                                value={questionCount}
                                onChange={(e) => setQuestionCount(e.target.value)}
                                placeholder="e.g. 30"
                                className="w-full px-3 py-2 text-sm bg-[var(--input-bg)] text-[var(--input-text)] border border-[var(--input-border)] rounded-lg focus:ring-2 focus:ring-[var(--brand-primary)]"
                            />
                        </div>

                        {/* Label */}
                        <div>
                            <label className="block text-xs font-medium text-[var(--brand-muted)] mb-1">Label (optional)</label>
                            <input
                                type="text"
                                value={label}
                                onChange={(e) => setLabel(e.target.value)}
                                placeholder="e.g. Midterm Unit 1-3"
                                className="w-full px-3 py-2 text-sm bg-[var(--input-bg)] text-[var(--input-text)] border border-[var(--input-border)] rounded-lg focus:ring-2 focus:ring-[var(--brand-primary)]"
                            />
                        </div>

                        {/* Due date */}
                        <div>
                            <label className="block text-xs font-medium text-[var(--brand-muted)] mb-1">Due Date (optional)</label>
                            <input
                                type="date"
                                value={dueDate}
                                onChange={(e) => setDueDate(e.target.value)}
                                className="w-full px-3 py-2 text-sm bg-[var(--input-bg)] text-[var(--input-text)] border border-[var(--input-border)] rounded-lg focus:ring-2 focus:ring-[var(--brand-primary)]"
                            />
                        </div>

                        {/* Randomized toggle */}
                        <div className="flex items-center gap-3 sm:col-span-2 lg:col-span-3">
                            <label className="relative inline-flex items-center cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={isRandomized}
                                    onChange={(e) => setIsRandomized(e.target.checked)}
                                    className="sr-only peer"
                                />
                                <div className="w-9 h-5 bg-[var(--surface-border)] peer-focus:ring-2 peer-focus:ring-[var(--brand-primary)] rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[var(--brand-primary)]" />
                            </label>
                            <div>
                                <p className="text-sm font-medium text-[var(--brand-foreground)]">
                                    {isRandomized ? 'Randomized' : 'Fixed'}
                                </p>
                                <p className="text-xs text-[var(--brand-muted)]">
                                    {isRandomized
                                        ? 'Each student gets a different random set of questions — reduces answer sharing.'
                                        : 'All students get identical questions in the same order. Reuses existing exam if this scope+version was already generated.'}
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="flex gap-2 mt-5">
                        <button
                            onClick={handleGenerate}
                            disabled={generating || !courseId}
                            className="px-5 py-2 text-sm font-semibold bg-[var(--brand-primary)] text-[var(--brand-black)] rounded-lg hover:opacity-90 disabled:opacity-50"
                        >
                            {generating ? 'Generating…' : 'Generate & Assign'}
                        </button>
                        <button
                            onClick={() => setShowForm(false)}
                            className="px-4 py-2 text-sm font-medium text-[var(--brand-muted)] border border-[var(--surface-border)] rounded-lg hover:text-[var(--brand-foreground)]"
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            )}

            {/* Results panel */}
            {resultsFor && (
                <ClassExamResultsPanel
                    summary={resultsFor}
                    courses={courses}
                    onClose={() => setResultsFor(null)}
                    onError={setError}
                />
            )}

            {/* Exam list */}
            <div className="bg-[var(--surface)] rounded-xl shadow-sm overflow-x-auto">
                <table className="min-w-full divide-y divide-[var(--surface-border)]">
                    <thead className="bg-[var(--comment-secondary-bg)]">
                        <tr>
                            <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-[var(--brand-muted)] uppercase">Label / Scope</th>
                            {classes.length > 0 && (
                                <th className="hidden sm:table-cell px-4 sm:px-6 py-3 text-left text-xs font-medium text-[var(--brand-muted)] uppercase">Class</th>
                            )}
                            <th className="hidden sm:table-cell px-4 sm:px-6 py-3 text-left text-xs font-medium text-[var(--brand-muted)] uppercase">Course</th>
                            <th className="hidden md:table-cell px-4 sm:px-6 py-3 text-left text-xs font-medium text-[var(--brand-muted)] uppercase">Version</th>
                            <th className="hidden md:table-cell px-4 sm:px-6 py-3 text-left text-xs font-medium text-[var(--brand-muted)] uppercase">Questions</th>
                            <th className="hidden lg:table-cell px-4 sm:px-6 py-3 text-left text-xs font-medium text-[var(--brand-muted)] uppercase">Due</th>
                            <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-[var(--brand-muted)] uppercase">Assigned</th>
                            <th className="px-4 sm:px-6 py-3 text-right text-xs font-medium text-[var(--brand-muted)] uppercase">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--surface-border)]">
                        {exams.map((e) => {
                            const courseName = courses.find((c) => c.id === e.course_id)?.title ?? `Course ${e.course_id}`;
                            const scopeLabel = e.scope === 'full_course'
                                ? 'Full Course'
                                : `${SCOPE_LABELS[e.scope]} ${e.scope_refs.join(', ')}`;
                            return (
                                <tr key={e.class_exam_id} className="hover:bg-[var(--comment-secondary-bg)]">
                                    <td className="px-4 sm:px-6 py-4">
                                        <p className="text-sm font-medium text-[var(--brand-foreground)]">
                                            {e.label || scopeLabel}
                                        </p>
                                        {e.label && (
                                            <p className="text-xs text-[var(--brand-muted)]">{scopeLabel}</p>
                                        )}
                                    </td>
                                    {classes.length > 0 && (
                                        <td className="hidden sm:table-cell px-4 sm:px-6 py-4 text-sm text-[var(--brand-muted)]">{e.class_name || 'Whole org'}</td>
                                    )}
                                    <td className="hidden sm:table-cell px-4 sm:px-6 py-4 text-sm text-[var(--brand-muted)] max-w-[150px] truncate">{courseName}</td>
                                    <td className="hidden md:table-cell px-4 sm:px-6 py-4">
                                        <span className="text-xs font-mono px-2 py-0.5 bg-[var(--comment-secondary-bg)] text-[var(--brand-foreground)] rounded">
                                            {e.version}
                                        </span>
                                        {!e.is_randomized && (
                                            <span className="ml-1.5 text-xs text-[var(--brand-muted)]">fixed</span>
                                        )}
                                    </td>
                                    <td className="hidden md:table-cell px-4 sm:px-6 py-4 text-sm text-[var(--brand-muted)]">{e.question_count}</td>
                                    <td className="hidden lg:table-cell px-4 sm:px-6 py-4 text-sm text-[var(--brand-muted)]">
                                        {e.due_date ? new Date(e.due_date).toLocaleDateString() : '—'}
                                    </td>
                                    <td className="px-4 sm:px-6 py-4 text-sm text-[var(--brand-muted)] whitespace-nowrap">
                                        {new Date(e.assigned_at).toLocaleDateString()}
                                    </td>
                                    <td className="px-4 sm:px-6 py-4 text-right">
                                        <button
                                            onClick={() => setResultsFor(resultsFor?.class_exam_id === e.class_exam_id ? null : e)}
                                            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[var(--brand-primary)] border border-[var(--brand-primary)]/30 rounded-lg hover:bg-[var(--brand-primary)]/8 transition-colors"
                                        >
                                            <AcademicCapIcon className="h-3.5 w-3.5" />
                                            Results
                                        </button>
                                    </td>
                                </tr>
                            );
                        })}
                        {exams.length === 0 && (
                            <tr>
                                <td colSpan={classes.length > 0 ? 8 : 7} className="px-6 py-10 text-center text-sm text-[var(--brand-muted)]">
                                    No class exams assigned yet. Click <strong>Assign Exam</strong> to create one.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

function ClassExamResultsPanel({
    summary,
    courses,
    onClose,
    onError,
}: {
    summary: ClassExamSummary;
    courses: OrgCourse[];
    onClose: () => void;
    onError: (msg: string) => void;
}) {
    const [results, setResults] = useState<ClassExamResults | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                const data = await getClassExamResults(summary.class_exam_id);
                if (!cancelled) setResults(data);
            } catch (err) {
                if (!cancelled) onError(err instanceof Error ? err.message : 'Failed to load results');
            } finally {
                if (!cancelled) setLoading(false);
            }
        })();
        return () => { cancelled = true; };
    }, [summary.class_exam_id, onError]);

    const handleExportCsv = () => {
        if (!results) return;
        const courseName = courses.find((c) => c.id === summary.course_id)?.title ?? `course-${summary.course_id}`;

        // Collect every unique section key that appears in any student's breakdown,
        // sorted by ref so columns are in a consistent order.
        type SectionKey = { unit_ref: string | null; sub_unit_ref: string | null; unit_title?: string | null; sub_unit_title?: string | null };
        const sectionKey = (sb: SectionKey) => `${sb.unit_ref ?? ''}:${sb.sub_unit_ref ?? ''}`;
        const sectionKeySet = new Map<string, SectionKey>();
        for (const s of results.students) {
            for (const sb of s.section_breakdown ?? []) {
                const key = sectionKey(sb);
                if (!sectionKeySet.has(key)) sectionKeySet.set(key, sb);
            }
        }
        const sections = Array.from(sectionKeySet.values()).sort((a, b) =>
            sectionKey(a).localeCompare(sectionKey(b), undefined, { numeric: true }),
        );
        const hasBreakdown = sections.length > 0;

        const sectionHeader = (s: SectionKey) => {
            if (!s.unit_ref) return 'Cross-section / Final (%)';
            const unit = s.unit_title || s.unit_ref;
            const sub = s.sub_unit_ref ? (s.sub_unit_title || s.sub_unit_ref) : null;
            return sub ? `${unit} / ${sub} (%)` : `${unit} (%)`;
        };

        const header = [
            'Username',
            'Score (%)',
            'Status',
            'Completed At',
            ...(hasBreakdown ? sections.map(sectionHeader) : []),
            ...(hasBreakdown ? ['Failed Standards'] : []),
        ];

        const dataRows = results.students.map((s) => {
            const breakdownMap = new Map(
                (s.section_breakdown ?? []).map((sb) => [sectionKey(sb), sb]),
            );
            const sectionScores = hasBreakdown
                ? sections.map((sec) => {
                      const sb = breakdownMap.get(sectionKey(sec));
                      return sb != null ? String(sb.score_percent) : '—';
                  })
                : [];
            const failedStandards = hasBreakdown
                ? (s.section_breakdown ?? []).flatMap((sb) => sb.failed_standards).join('; ')
                : undefined;

            return [
                s.username,
                s.score != null ? String(s.score) : 'Not taken',
                s.score != null ? (s.score >= 70 ? 'Pass' : 'Fail') : '—',
                s.completed_at ? new Date(s.completed_at).toLocaleString() : '—',
                ...sectionScores,
                ...(hasBreakdown ? [failedStandards ?? ''] : []),
            ];
        });

        const csv = [header, ...dataRows].map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `exam-results-${courseName}-${summary.version}.csv`.replace(/\s+/g, '-');
        a.click();
        URL.revokeObjectURL(url);
    };

    const scopeLabel = summary.scope === 'full_course'
        ? 'Full Course'
        : `${SCOPE_LABELS[summary.scope]} ${summary.scope_refs.join(', ')}`;

    return (
        <div className="mb-6 bg-[var(--surface)] border border-[var(--surface-border)] rounded-xl overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--surface-border)]">
                <div>
                    <p className="text-sm font-semibold text-[var(--brand-foreground)]">
                        {summary.label || scopeLabel}
                        <span className="ml-2 text-xs font-mono text-[var(--brand-muted)]">v{summary.version}</span>
                    </p>
                    <p className="text-xs text-[var(--brand-muted)] mt-0.5">
                        {summary.question_count} questions · {scopeLabel}
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={handleExportCsv}
                        disabled={!results || loading}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border border-[var(--surface-border)] text-[var(--brand-muted)] hover:text-[var(--brand-foreground)] rounded-lg disabled:opacity-40"
                    >
                        <DocumentArrowDownIcon className="h-3.5 w-3.5" /> Export CSV
                    </button>
                    <button onClick={onClose} className="p-1 text-[var(--brand-muted)] hover:text-[var(--brand-foreground)] rounded">
                        <XMarkIcon className="h-5 w-5" />
                    </button>
                </div>
            </div>

            {loading ? (
                <div className="p-6"><LoadingComponent /></div>
            ) : results ? (
                <>
                    {/* Summary stats */}
                    <div className="grid grid-cols-3 divide-x divide-[var(--surface-border)] border-b border-[var(--surface-border)]">
                        {[
                            { label: 'Assigned', value: results.total_assigned },
                            { label: 'Completed', value: results.total_completed },
                            {
                                label: 'Avg Score',
                                value: results.total_completed > 0
                                    ? `${Math.round(results.students.filter((s) => s.score != null).reduce((sum, s) => sum + (s.score ?? 0), 0) / results.total_completed)}%`
                                    : '—',
                            },
                        ].map((stat) => (
                            <div key={stat.label} className="p-4 text-center">
                                <p className="text-2xl font-bold text-[var(--brand-foreground)]">{stat.value}</p>
                                <p className="text-xs text-[var(--brand-muted)] mt-0.5">{stat.label}</p>
                            </div>
                        ))}
                    </div>

                    {/* Student table */}
                    <table className="min-w-full divide-y divide-[var(--surface-border)]">
                        <thead className="bg-[var(--comment-secondary-bg)]">
                            <tr>
                                <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-[var(--brand-muted)] uppercase">Student</th>
                                <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-[var(--brand-muted)] uppercase">Score</th>
                                <th className="hidden sm:table-cell px-4 sm:px-6 py-3 text-left text-xs font-medium text-[var(--brand-muted)] uppercase">Status</th>
                                <th className="hidden md:table-cell px-4 sm:px-6 py-3 text-left text-xs font-medium text-[var(--brand-muted)] uppercase">Completed</th>
                                <th className="hidden lg:table-cell px-4 sm:px-6 py-3 text-left text-xs font-medium text-[var(--brand-muted)] uppercase">Weaknesses</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[var(--surface-border)]">
                            {results.students
                                .slice()
                                .sort((a, b) => {
                                    if (a.score == null && b.score == null) return 0;
                                    if (a.score == null) return 1;
                                    if (b.score == null) return -1;
                                    return b.score - a.score;
                                })
                                .map((s: StudentExamResult) => {
                                    const failedStandards = s.section_breakdown
                                        ?.flatMap((sb) => sb.failed_standards)
                                        .filter(Boolean) ?? [];
                                    return (
                                        <tr key={s.user_id} className="hover:bg-[var(--comment-secondary-bg)]">
                                            <td className="px-4 sm:px-6 py-3 text-sm font-medium text-[var(--brand-foreground)]">
                                                @{s.username}
                                            </td>
                                            <td className="px-4 sm:px-6 py-3 text-sm">
                                                {s.score != null ? (
                                                    <span className={`font-semibold ${s.score >= 70 ? 'text-green-400' : 'text-red-400'}`}>
                                                        {s.score}%
                                                    </span>
                                                ) : (
                                                    <span className="text-[var(--brand-muted)]">Not taken</span>
                                                )}
                                            </td>
                                            <td className="hidden sm:table-cell px-4 sm:px-6 py-3 text-sm">
                                                {s.score != null ? (
                                                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                                                        s.score >= 70 ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'
                                                    }`}>
                                                        {s.score >= 70 ? 'Pass' : 'Fail'}
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-[var(--comment-secondary-bg)] text-[var(--brand-muted)]">
                                                        Pending
                                                    </span>
                                                )}
                                            </td>
                                            <td className="hidden md:table-cell px-4 sm:px-6 py-3 text-sm text-[var(--brand-muted)]">
                                                {s.completed_at ? new Date(s.completed_at).toLocaleDateString() : '—'}
                                            </td>
                                            <td className="hidden lg:table-cell px-4 sm:px-6 py-3 text-xs font-mono text-red-400">
                                                {failedStandards.length > 0 ? failedStandards.slice(0, 4).join(', ') + (failedStandards.length > 4 ? '…' : '') : '—'}
                                            </td>
                                        </tr>
                                    );
                                })}
                        </tbody>
                    </table>
                </>
            ) : null}
        </div>
    );
}
