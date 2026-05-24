'use client';

import { useState, useEffect, useCallback } from 'react';
import { PlusIcon, PencilSquareIcon, TrashIcon, ArrowDownTrayIcon, ArrowUpTrayIcon, CheckCircleIcon, XCircleIcon } from '@heroicons/react/24/solid';
import { CourseData } from '@/app/lib/types/course';
import { Question, QuestionChoice, CreateQuestionPayload } from '@/app/lib/types/question';
import { getQuestions, createQuestion, updateQuestion, archiveQuestion, bulkImportQuestions, exportQuestions } from '@/app/lib/api-client';

interface Props {
    courses: CourseData[];
}

const EMPTY_CHOICES: QuestionChoice[] = [
    { id: 1, text: '', is_correct: true },
    { id: 2, text: '', is_correct: false },
    { id: 3, text: '', is_correct: false },
    { id: 4, text: '', is_correct: false },
];

const DIFFICULTY_LABELS = { easy: 'Easy', medium: 'Medium', hard: 'Hard' };
const PRIORITY_LABELS = { 1: 'Core (always included)', 2: 'Standard', 3: 'Supplemental' };
const STATUS_LABELS = { active: 'Active', draft: 'Draft', archived: 'Archived' };

function blankForm(courseId: number): CreateQuestionPayload {
    return {
        course_id: courseId,
        unit_id: null,
        sub_unit_id: null,
        question_text: '',
        choices: EMPTY_CHOICES.map((c) => ({ ...c })),
        explanation: '',
        standard: '',
        priority: 2,
        difficulty: 'medium',
        status: 'active',
    };
}

export default function QuestionBankEditor({ courses }: Props) {
    const [selectedCourseId, setSelectedCourseId] = useState<number | null>(
        courses[0]?.id ?? null,
    );
    const [questions, setQuestions] = useState<Question[]>([]);
    const [statusFilter, setStatusFilter] = useState<string>('active');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);

    const [showForm, setShowForm] = useState(false);
    const [editingId, setEditingId] = useState<number | null>(null);
    const [form, setForm] = useState<CreateQuestionPayload>(blankForm(selectedCourseId ?? 0));
    const [saving, setSaving] = useState(false);

    const [showImport, setShowImport] = useState(false);
    const [importJson, setImportJson] = useState('');
    const [importing, setImporting] = useState(false);
    const [replaceExisting, setReplaceExisting] = useState(false);

    const notify = (msg: string) => {
        setSuccess(msg);
        setTimeout(() => setSuccess(null), 3500);
    };

    const loadQuestions = useCallback(async () => {
        if (!selectedCourseId) return;
        setLoading(true);
        setError(null);
        try {
            const data = await getQuestions(selectedCourseId, statusFilter);
            setQuestions(data);
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Failed to load questions');
        } finally {
            setLoading(false);
        }
    }, [selectedCourseId, statusFilter]);

    useEffect(() => { loadQuestions(); }, [loadQuestions]);

    // ── Form helpers ──────────────────────────────────────────────────────────

    const openNew = () => {
        setEditingId(null);
        setForm(blankForm(selectedCourseId ?? 0));
        setShowForm(true);
        setShowImport(false);
    };

    const openEdit = (q: Question) => {
        setEditingId(q.id);
        setForm({
            course_id: q.course_id,
            unit_id: q.unit_id,
            sub_unit_id: q.sub_unit_id,
            question_text: q.question_text,
            choices: q.choices.map((c) => ({ ...c })),
            explanation: q.explanation ?? '',
            standard: q.standard ?? '',
            priority: q.priority,
            difficulty: q.difficulty,
            status: q.status,
        });
        setShowForm(true);
        setShowImport(false);
    };

    const setChoice = (idx: number, text: string) => {
        setForm((f) => ({
            ...f,
            choices: f.choices.map((c, i) => (i === idx ? { ...c, text } : c)),
        }));
    };

    const setCorrect = (idx: number) => {
        setForm((f) => ({
            ...f,
            choices: f.choices.map((c, i) => ({ ...c, is_correct: i === idx })),
        }));
    };

    const addChoice = () => {
        setForm((f) => ({
            ...f,
            choices: [
                ...f.choices,
                { id: f.choices.length + 1, text: '', is_correct: false },
            ],
        }));
    };

    const removeChoice = (idx: number) => {
        setForm((f) => {
            const next = f.choices.filter((_, i) => i !== idx);
            const hasCorrect = next.some((c) => c.is_correct);
            if (!hasCorrect && next.length > 0) next[0].is_correct = true;
            return { ...f, choices: next };
        });
    };

    const handleSave = async () => {
        if (!form.question_text.trim()) return setError('Question text is required.');
        if (form.choices.some((c) => !c.text.trim())) return setError('All choice fields must be filled in.');
        if (!form.choices.some((c) => c.is_correct)) return setError('Exactly one choice must be marked correct.');
        setSaving(true);
        setError(null);
        try {
            const payload = {
                ...form,
                explanation: form.explanation?.trim() || null,
                standard: form.standard?.trim() || null,
            };
            if (editingId) {
                const updated = await updateQuestion(editingId, payload);
                setQuestions((qs) => qs.map((q) => (q.id === editingId ? updated : q)));
                notify('Question updated.');
            } else {
                const created = await createQuestion(payload);
                setQuestions((qs) => [created, ...qs]);
                notify('Question created.');
            }
            setShowForm(false);
            setEditingId(null);
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Failed to save question');
        } finally {
            setSaving(false);
        }
    };

    const handleArchive = async (id: number) => {
        if (!confirm('Archive this question? It will no longer appear in new exams.')) return;
        try {
            await archiveQuestion(id);
            setQuestions((qs) => qs.filter((q) => q.id !== id));
            notify('Question archived.');
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Failed to archive question');
        }
    };

    // ── Bulk import / export ──────────────────────────────────────────────────

    const handleExport = async () => {
        if (!selectedCourseId) return;
        try {
            const data = await exportQuestions(selectedCourseId);
            const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `questions-course-${selectedCourseId}.json`;
            a.click();
            URL.revokeObjectURL(url);
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Export failed');
        }
    };

    const handleImport = async () => {
        if (!selectedCourseId || !importJson.trim()) return;
        if (replaceExisting && !confirm(
            'This will archive ALL existing questions for this course before importing. Existing exam records will remain valid but the questions will no longer appear in new exams. Continue?'
        )) return;
        setImporting(true);
        setError(null);
        try {
            const parsed = JSON.parse(importJson);
            const arr = Array.isArray(parsed) ? parsed : parsed.questions ?? [];
            const result = await bulkImportQuestions({
                course_id: selectedCourseId,
                questions: arr,
                ...(replaceExisting ? { replace_existing: true } : {}),
            });
            const parts = [`${result.created} created`, `${result.updated} updated`, `${result.skipped} skipped`];
            if (result.archived != null) parts.push(`${result.archived} archived`);
            notify(`Import complete: ${parts.join(', ')}.`);
            setImportJson('');
            setShowImport(false);
            setReplaceExisting(false);
            loadQuestions();
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Import failed — check JSON format');
        } finally {
            setImporting(false);
        }
    };

    // ── Render ────────────────────────────────────────────────────────────────

    return (
        <div>
            {/* Toolbar */}
            <div className="flex flex-wrap items-center gap-3 mb-6">
                <select
                    value={selectedCourseId ?? ''}
                    onChange={(e) => { setSelectedCourseId(Number(e.target.value)); setShowForm(false); }}
                    className="px-3 py-2 bg-[var(--input-bg)] text-[var(--input-text)] border border-[var(--input-border)] rounded-lg text-sm focus:ring-2 focus:ring-[var(--brand-primary)]"
                >
                    {courses.map((c) => (
                        <option key={c.id} value={c.id}>{c.title}</option>
                    ))}
                </select>

                <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="px-3 py-2 bg-[var(--input-bg)] text-[var(--input-text)] border border-[var(--input-border)] rounded-lg text-sm"
                >
                    <option value="active">Active</option>
                    <option value="draft">Draft</option>
                    <option value="archived">Archived</option>
                </select>

                <div className="flex gap-2 ml-auto">
                    <button
                        onClick={() => { setShowImport(!showImport); setShowForm(false); }}
                        className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium border border-[var(--surface-border)] text-[var(--brand-muted)] hover:text-[var(--brand-foreground)] rounded-lg"
                    >
                        <ArrowUpTrayIcon className="h-4 w-4" /> Import JSON
                    </button>
                    <button
                        onClick={handleExport}
                        className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium border border-[var(--surface-border)] text-[var(--brand-muted)] hover:text-[var(--brand-foreground)] rounded-lg"
                    >
                        <ArrowDownTrayIcon className="h-4 w-4" /> Export JSON
                    </button>
                    <button
                        onClick={openNew}
                        className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium bg-[var(--brand-primary)] text-[var(--brand-black)] rounded-lg hover:opacity-90"
                    >
                        <PlusIcon className="h-4 w-4" /> New Question
                    </button>
                </div>
            </div>

            {/* Notifications */}
            {error && <div className="mb-4 px-4 py-3 bg-red-500/10 border border-red-500/30 text-red-400 text-sm rounded-lg">{error}</div>}
            {success && <div className="mb-4 px-4 py-3 bg-green-500/10 border border-green-500/30 text-green-400 text-sm rounded-lg">{success}</div>}

            {/* Bulk import panel */}
            {showImport && (
                <div className="mb-6 bg-[var(--surface)] border border-[var(--surface-border)] rounded-xl p-5">
                    <p className="text-sm font-semibold text-[var(--brand-foreground)] mb-1">Bulk Import JSON</p>
                    <p className="text-xs text-[var(--brand-muted)] mb-3">
                        Paste a JSON array of question objects. Each must have <code className="font-mono text-xs">question_text</code>, <code className="font-mono text-xs">choices</code>, and at least one choice with <code className="font-mono text-xs">is_correct: true</code>.
                        Include an <code className="font-mono text-xs">id</code> field to update an existing question.
                    </p>
                    <textarea
                        rows={10}
                        value={importJson}
                        onChange={(e) => setImportJson(e.target.value)}
                        placeholder={'[\n  {\n    "question_text": "What is...",\n    "choices": [\n      {"id": 1, "text": "Answer A", "is_correct": true},\n      {"id": 2, "text": "Answer B", "is_correct": false}\n    ],\n    "unit_id": 1,\n    "priority": 1\n  }\n]'}
                        className="w-full px-3 py-2 font-mono text-xs bg-[var(--input-bg)] text-[var(--input-text)] border border-[var(--input-border)] rounded-lg resize-y focus:ring-2 focus:ring-[var(--brand-primary)]"
                    />
                    <div className="flex gap-2 mt-3">
                        <label className="flex items-center gap-2 cursor-pointer select-none">
                            <input
                                type="checkbox"
                                checked={replaceExisting}
                                onChange={(e) => setReplaceExisting(e.target.checked)}
                                className="accent-[var(--brand-primary)] h-4 w-4"
                            />
                            <span className="text-xs text-[var(--brand-muted)]">
                                Replace existing — archive all current questions before import
                            </span>
                        </label>
                    </div>
                    <div className="flex gap-2 mt-3">
                        <button
                            onClick={handleImport}
                            disabled={importing || !importJson.trim()}
                            className="px-4 py-2 text-sm font-medium bg-[var(--brand-primary)] text-[var(--brand-black)] rounded-lg hover:opacity-90 disabled:opacity-50"
                        >
                            {importing ? 'Importing…' : 'Import'}
                        </button>
                        <button onClick={() => setShowImport(false)} className="px-4 py-2 text-sm font-medium text-[var(--brand-muted)] border border-[var(--surface-border)] rounded-lg hover:text-[var(--brand-foreground)]">
                            Cancel
                        </button>
                    </div>
                </div>
            )}

            {/* Question form */}
            {showForm && (
                <div className="mb-6 bg-[var(--surface)] border border-[var(--surface-border)] rounded-xl p-5">
                    <h3 className="text-sm font-semibold text-[var(--brand-foreground)] mb-4">
                        {editingId ? 'Edit Question' : 'New Question'}
                    </h3>

                    <div className="space-y-4">
                        {/* Question text */}
                        <div>
                            <label className="block text-xs font-medium text-[var(--brand-muted)] mb-1">Question Text *</label>
                            <textarea
                                rows={3}
                                value={form.question_text}
                                onChange={(e) => setForm((f) => ({ ...f, question_text: e.target.value }))}
                                className="w-full px-3 py-2 text-sm bg-[var(--input-bg)] text-[var(--input-text)] border border-[var(--input-border)] rounded-lg focus:ring-2 focus:ring-[var(--brand-primary)]"
                                placeholder="What is the maximum groundspeed for a sUAS under Part 107?"
                            />
                        </div>

                        {/* Choices */}
                        <div>
                            <label className="block text-xs font-medium text-[var(--brand-muted)] mb-2">
                                Answer Choices * <span className="text-[var(--brand-muted)] font-normal">(select the correct one)</span>
                            </label>
                            <div className="space-y-2">
                                {form.choices.map((choice, idx) => (
                                    <div key={idx} className="flex items-center gap-2">
                                        <input
                                            type="radio"
                                            name="correct-choice"
                                            checked={choice.is_correct}
                                            onChange={() => setCorrect(idx)}
                                            className="shrink-0 accent-[var(--brand-primary)] h-4 w-4"
                                            title="Mark as correct"
                                        />
                                        <input
                                            type="text"
                                            value={choice.text}
                                            onChange={(e) => setChoice(idx, e.target.value)}
                                            placeholder={`Choice ${String.fromCharCode(65 + idx)}`}
                                            className={`flex-1 px-3 py-1.5 text-sm bg-[var(--input-bg)] text-[var(--input-text)] border rounded-lg focus:ring-2 focus:ring-[var(--brand-primary)] ${choice.is_correct ? 'border-green-500/50' : 'border-[var(--input-border)]'}`}
                                        />
                                        {choice.is_correct && <CheckCircleIcon className="h-4 w-4 text-green-500 shrink-0" title="Correct answer" />}
                                        {form.choices.length > 2 && (
                                            <button onClick={() => removeChoice(idx)} className="text-[var(--brand-muted)] hover:text-red-400 shrink-0" title="Remove choice">
                                                <XCircleIcon className="h-4 w-4" />
                                            </button>
                                        )}
                                    </div>
                                ))}
                            </div>
                            {form.choices.length < 6 && (
                                <button onClick={addChoice} className="mt-2 text-xs text-[var(--brand-primary)] hover:opacity-80">
                                    + Add choice
                                </button>
                            )}
                        </div>

                        {/* Explanation */}
                        <div>
                            <label className="block text-xs font-medium text-[var(--brand-muted)] mb-1">Explanation (shown after submission)</label>
                            <textarea
                                rows={2}
                                value={form.explanation ?? ''}
                                onChange={(e) => setForm((f) => ({ ...f, explanation: e.target.value }))}
                                className="w-full px-3 py-2 text-sm bg-[var(--input-bg)] text-[var(--input-text)] border border-[var(--input-border)] rounded-lg focus:ring-2 focus:ring-[var(--brand-primary)]"
                                placeholder="The correct answer is… because…"
                            />
                        </div>

                        {/* Metadata row */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                            <div>
                                <label className="block text-xs font-medium text-[var(--brand-muted)] mb-1">Unit ID</label>
                                <input
                                    type="number"
                                    value={form.unit_id ?? ''}
                                    onChange={(e) => setForm((f) => ({ ...f, unit_id: e.target.value ? Number(e.target.value) : null }))}
                                    className="w-full px-3 py-1.5 text-sm bg-[var(--input-bg)] text-[var(--input-text)] border border-[var(--input-border)] rounded-lg"
                                    placeholder="e.g. 1"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-[var(--brand-muted)] mb-1">Sub-unit ID</label>
                                <input
                                    type="number"
                                    value={form.sub_unit_id ?? ''}
                                    onChange={(e) => setForm((f) => ({ ...f, sub_unit_id: e.target.value ? Number(e.target.value) : null }))}
                                    className="w-full px-3 py-1.5 text-sm bg-[var(--input-bg)] text-[var(--input-text)] border border-[var(--input-border)] rounded-lg"
                                    placeholder="e.g. 11"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-[var(--brand-muted)] mb-1">ACS Standard</label>
                                <input
                                    type="text"
                                    value={form.standard ?? ''}
                                    onChange={(e) => setForm((f) => ({ ...f, standard: e.target.value }))}
                                    className="w-full px-3 py-1.5 text-sm bg-[var(--input-bg)] text-[var(--input-text)] border border-[var(--input-border)] rounded-lg"
                                    placeholder="PA.I.A.K1"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-[var(--brand-muted)] mb-1">Priority</label>
                                <select
                                    value={form.priority}
                                    onChange={(e) => setForm((f) => ({ ...f, priority: Number(e.target.value) as 1|2|3 }))}
                                    className="w-full px-3 py-1.5 text-sm bg-[var(--input-bg)] text-[var(--input-text)] border border-[var(--input-border)] rounded-lg"
                                >
                                    {Object.entries(PRIORITY_LABELS).map(([v, l]) => (
                                        <option key={v} value={v}>{l}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-[var(--brand-muted)] mb-1">Difficulty</label>
                                <select
                                    value={form.difficulty}
                                    onChange={(e) => setForm((f) => ({ ...f, difficulty: e.target.value as 'easy'|'medium'|'hard' }))}
                                    className="w-full px-3 py-1.5 text-sm bg-[var(--input-bg)] text-[var(--input-text)] border border-[var(--input-border)] rounded-lg"
                                >
                                    {Object.entries(DIFFICULTY_LABELS).map(([v, l]) => (
                                        <option key={v} value={v}>{l}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-[var(--brand-muted)] mb-1">Status</label>
                                <select
                                    value={form.status}
                                    onChange={(e) => setForm((f) => ({ ...f, status: e.target.value as 'active'|'draft'|'archived' }))}
                                    className="w-full px-3 py-1.5 text-sm bg-[var(--input-bg)] text-[var(--input-text)] border border-[var(--input-border)] rounded-lg"
                                >
                                    {Object.entries(STATUS_LABELS).map(([v, l]) => (
                                        <option key={v} value={v}>{l}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <div className="flex gap-2 pt-2">
                            <button
                                onClick={handleSave}
                                disabled={saving}
                                className="px-4 py-2 text-sm font-medium bg-[var(--brand-primary)] text-[var(--brand-black)] rounded-lg hover:opacity-90 disabled:opacity-50"
                            >
                                {saving ? 'Saving…' : editingId ? 'Save Changes' : 'Create Question'}
                            </button>
                            <button
                                onClick={() => { setShowForm(false); setEditingId(null); setError(null); }}
                                className="px-4 py-2 text-sm font-medium text-[var(--brand-muted)] border border-[var(--surface-border)] rounded-lg hover:text-[var(--brand-foreground)]"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Question list */}
            {loading ? (
                <p className="text-sm text-[var(--brand-muted)] py-8 text-center">Loading…</p>
            ) : (
                <div className="bg-[var(--surface)] rounded-xl shadow-sm overflow-x-auto">
                    <table className="min-w-full divide-y divide-[var(--surface-border)]">
                        <thead className="bg-[var(--comment-secondary-bg)]">
                            <tr>
                                <th className="px-4 py-3 text-left text-xs font-medium text-[var(--brand-muted)] uppercase tracking-wider">Question</th>
                                <th className="hidden sm:table-cell px-4 py-3 text-left text-xs font-medium text-[var(--brand-muted)] uppercase tracking-wider">Unit / Sub</th>
                                <th className="hidden md:table-cell px-4 py-3 text-left text-xs font-medium text-[var(--brand-muted)] uppercase tracking-wider">Priority</th>
                                <th className="hidden md:table-cell px-4 py-3 text-left text-xs font-medium text-[var(--brand-muted)] uppercase tracking-wider">Difficulty</th>
                                <th className="hidden lg:table-cell px-4 py-3 text-left text-xs font-medium text-[var(--brand-muted)] uppercase tracking-wider">Standard</th>
                                <th className="px-4 py-3 text-right text-xs font-medium text-[var(--brand-muted)] uppercase tracking-wider">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[var(--surface-border)]">
                            {questions.map((q) => (
                                <tr key={q.id} className="hover:bg-[var(--comment-secondary-bg)]">
                                    <td className="px-4 py-3 text-sm text-[var(--brand-foreground)] max-w-xs">
                                        <p className="line-clamp-2">{q.question_text}</p>
                                        <p className="text-xs text-[var(--brand-muted)] mt-0.5">{q.choices.length} choices</p>
                                    </td>
                                    <td className="hidden sm:table-cell px-4 py-3 text-xs text-[var(--brand-muted)] whitespace-nowrap">
                                        {q.unit_id != null ? `Unit ${q.unit_id}` : '—'}
                                        {q.sub_unit_id != null ? ` / ${q.sub_unit_id}` : ''}
                                    </td>
                                    <td className="hidden md:table-cell px-4 py-3 text-xs text-[var(--brand-muted)]">
                                        {PRIORITY_LABELS[q.priority as 1|2|3] ?? q.priority}
                                    </td>
                                    <td className="hidden md:table-cell px-4 py-3 text-xs">
                                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                                            q.difficulty === 'easy' ? 'bg-green-500/10 text-green-400' :
                                            q.difficulty === 'hard' ? 'bg-red-500/10 text-red-400' :
                                            'bg-yellow-500/10 text-yellow-400'
                                        }`}>
                                            {q.difficulty}
                                        </span>
                                    </td>
                                    <td className="hidden lg:table-cell px-4 py-3 text-xs text-[var(--brand-muted)] font-mono">
                                        {q.standard ?? '—'}
                                    </td>
                                    <td className="px-4 py-3 text-right">
                                        <div className="flex items-center justify-end gap-1">
                                            <button
                                                onClick={() => openEdit(q)}
                                                className="p-1.5 text-[var(--brand-primary)] hover:opacity-80 rounded"
                                                title="Edit"
                                            >
                                                <PencilSquareIcon className="h-4 w-4" />
                                            </button>
                                            <button
                                                onClick={() => handleArchive(q.id)}
                                                className="p-1.5 text-red-500 hover:text-red-400 rounded"
                                                title="Archive"
                                            >
                                                <TrashIcon className="h-4 w-4" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {questions.length === 0 && !loading && (
                                <tr>
                                    <td colSpan={6} className="px-6 py-10 text-center text-sm text-[var(--brand-muted)]">
                                        No questions found. Click <strong>New Question</strong> or <strong>Import JSON</strong> to get started.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                    {questions.length > 0 && (
                        <div className="px-4 py-2 border-t border-[var(--surface-border)] text-xs text-[var(--brand-muted)]">
                            {questions.length} question{questions.length !== 1 ? 's' : ''}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
