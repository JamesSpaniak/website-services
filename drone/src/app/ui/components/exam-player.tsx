'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { CheckCircleIcon, XCircleIcon, AcademicCapIcon, ArrowPathIcon } from '@heroicons/react/24/outline';
import { generateExam, submitExamAttempt } from '@/app/lib/api-client';
import { sendExamEvent } from '@/app/lib/analytics';
import type { ExamPool, ExamScope, ExamWithQuestions, ExamAttemptResult, SectionBreakdown } from '@/app/lib/types/question';

interface ExamPlayerProps {
    courseId: number;
    scope: ExamScope;
    scopeId?: number;
    label?: string;
    examPool?: ExamPool;
    questionCount?: number;
    generateButtonLabel?: string;
    description?: string;
    showTopBorder?: boolean;
    variant?: 'inline' | 'page';
    onSubmitted?: () => void;
}

type Phase = 'idle' | 'generating' | 'taking' | 'submitting' | 'results';

// ── Draft persistence (R2/R8) ─────────────────────────────────────────────────

const DRAFT_PREFIX = 'exam_draft_';

function saveDraft(examId: number, answers: Record<number, number>) {
    try {
        sessionStorage.setItem(`${DRAFT_PREFIX}${examId}`, JSON.stringify(answers));
    } catch { /* quota exceeded — non-fatal */ }
}

function loadDraft(examId: number): Record<number, number> | null {
    try {
        const raw = sessionStorage.getItem(`${DRAFT_PREFIX}${examId}`);
        return raw ? JSON.parse(raw) : null;
    } catch {
        return null;
    }
}

function clearDraft(examId: number) {
    try {
        sessionStorage.removeItem(`${DRAFT_PREFIX}${examId}`);
    } catch { /* non-fatal */ }
}

// ── Sub-components ────────────────────────────────────────────────────────────

function ExamProgressBar({ answered, total }: { answered: number; total: number }) {
    const pct = total > 0 ? Math.round((answered / total) * 100) : 0;
    return (
        <div className="flex-1 min-w-0">
            <div className="flex justify-between text-xs text-[var(--brand-muted)] mb-1.5">
                <span>{answered} of {total} answered</span>
                <span className="font-mono">{pct}%</span>
            </div>
            <div
                className="h-1.5 rounded-full bg-[var(--surface-border)] overflow-hidden"
                role="progressbar"
                aria-valuenow={answered}
                aria-valuemin={0}
                aria-valuemax={total}
                aria-label={`${answered} of ${total} questions answered`}
            >
                <div
                    className="h-full rounded-full bg-[var(--brand-primary)] transition-all duration-300"
                    style={{ width: `${pct}%` }}
                />
            </div>
        </div>
    );
}

function ExamSubmitControls({
    phase,
    allAnswered,
    remaining,
    onSubmit,
    compact,
}: {
    phase: 'taking' | 'submitting';
    allAnswered: boolean;
    remaining: number;
    onSubmit: () => void;
    compact?: boolean;
}) {
    return (
        <div className={compact ? 'flex items-center gap-3 shrink-0' : 'flex flex-col sm:flex-row items-stretch sm:items-center gap-3'}>
            <button
                type="button"
                onClick={onSubmit}
                disabled={phase === 'submitting' || !allAnswered}
                aria-disabled={phase === 'submitting' || !allAnswered}
                className={`${compact ? 'px-5' : 'w-full sm:w-auto px-6'} py-2.5 text-sm font-semibold bg-[var(--brand-primary)] text-[var(--brand-black)] rounded-lg hover:opacity-90 disabled:opacity-40 transition-opacity whitespace-nowrap`}
            >
                {phase === 'submitting' ? 'Submitting…' : 'Submit exam'}
            </button>
            {!allAnswered && remaining > 0 && (
                <p className={`text-xs text-[var(--brand-muted)] ${compact ? 'whitespace-nowrap' : 'text-center sm:text-left'}`} aria-live="polite">
                    {remaining} question{remaining !== 1 ? 's' : ''} remaining
                </p>
            )}
        </div>
    );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function ExamPlayer({
    courseId,
    scope,
    scopeId,
    label,
    examPool = 'scoped',
    questionCount,
    generateButtonLabel,
    description,
    showTopBorder = true,
    variant = 'inline',
    onSubmitted,
}: ExamPlayerProps) {
    const [phase, setPhase] = useState<Phase>('idle');
    const [exam, setExam] = useState<ExamWithQuestions | null>(null);
    const [answers, setAnswers] = useState<Record<number, number>>({});
    const [result, setResult] = useState<ExamAttemptResult | null>(null);
    const [error, setError] = useState<string | null>(null);
    const phaseRef = useRef<Phase>('idle');

    const scopeLabel = label ?? (scope === 'full_course' ? 'Full Course' : `Scope ${scopeId}`);
    const examKindLabel = examPool === 'final_only' ? 'Final Exam' : 'Practice Exam';
    const helperText =
        description ??
        (scope === 'full_course'
            ? examPool === 'final_only'
                ? 'Randomized exam from chart and cross-section questions (FAA-CT-8080-2H supplement required).'
                : 'Randomized practice exam across all course topics (excludes chart-only final items).'
            : `Generate a randomized practice exam drawn from the question bank for this ${scope === 'unit' ? 'unit' : 'section'}.`);

    const isPage = variant === 'page';
    const examsHubHref = scope === 'full_course' ? `/courses/${courseId}/exams` : null;
    const sectionClass = isPage
        ? ''
        : showTopBorder
          ? 'mt-8 pt-6 border-t border-[var(--surface-border)]'
          : 'mt-6';

    // Keep phaseRef in sync for the beforeunload handler
    useEffect(() => { phaseRef.current = phase; }, [phase]);

    // R2/R8: beforeunload warning during taking phase
    useEffect(() => {
        const handler = (e: BeforeUnloadEvent) => {
            if (phaseRef.current === 'taking') {
                e.preventDefault();
            }
        };
        window.addEventListener('beforeunload', handler);
        return () => window.removeEventListener('beforeunload', handler);
    }, []);

    // R2/R8: persist answers to sessionStorage on every change
    const updateAnswers = useCallback((updater: (prev: Record<number, number>) => Record<number, number>) => {
        setAnswers((prev) => {
            const next = updater(prev);
            if (exam) saveDraft(exam.id, next);
            return next;
        });
    }, [exam]);

    const handleGenerate = async () => {
        setPhase('generating');
        setError(null);
        setAnswers({});
        setResult(null);
        try {
            const generated = await generateExam({
                course_id: courseId,
                scope,
                scope_ids: scopeId != null ? [scopeId] : [],
                is_randomized: true,
                exam_pool: examPool,
                question_count: questionCount,
            });
            if (generated.questions.length === 0) {
                setError('No questions are available for this exam yet. Check back after the question bank is populated.');
                setPhase('idle');
                return;
            }
            // R2/R8: restore draft if one exists for this (possibly reused) exam
            const draft = loadDraft(generated.id);
            if (draft && Object.keys(draft).length > 0) {
                setAnswers(draft);
            }
            setExam(generated);
            setPhase('taking');
            sendExamEvent('exam_start', courseId, examPool, scope);
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Failed to generate exam');
            setPhase('idle');
        }
    };

    const handleRetake = () => {
        if (exam) clearDraft(exam.id);
        setExam(null);
        setAnswers({});
        setResult(null);
        setPhase('idle');
    };

    const handleSubmit = async () => {
        if (!exam) return;
        const unanswered = exam.questions.filter((q) => answers[q.id] == null);
        if (unanswered.length > 0) {
            setError(`Please answer all questions before submitting. (${unanswered.length} remaining)`);
            return;
        }
        setPhase('submitting');
        setError(null);
        try {
            const submittedAnswers = exam.questions.map((q) => ({
                question_id: q.id,
                selected_choice_id: answers[q.id],
            }));
            const res = await submitExamAttempt(exam.id, submittedAnswers);
            clearDraft(exam.id);
            setResult(res);
            setPhase('results');
            sendExamEvent('exam_submit', courseId, examPool, scope, res.score);
            onSubmitted?.();
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Failed to submit exam');
            setPhase('taking');
        }
    };

    const allAnswered = exam ? exam.questions.every((q) => answers[q.id] != null) : false;
    const answeredCount = exam ? exam.questions.filter((q) => answers[q.id] != null).length : 0;
    const remainingCount = exam ? exam.questions.length - answeredCount : 0;

    // ── Idle / Generating ─────────────────────────────────────────────────────

    if (phase === 'idle' || phase === 'generating') {
        if (isPage) {
            return (
                <div className={sectionClass}>
                    <div className="flex justify-center py-4 sm:py-8">
                        <div
                            className="w-full max-w-lg p-8 sm:p-10 border border-[var(--surface-border)] bg-[var(--surface)] text-center"
                            style={{ borderRadius: 'var(--radius-md)' }}
                        >
                            <div className="inline-flex p-3 bg-[var(--brand-primary)]/10 rounded-xl mb-5">
                                <AcademicCapIcon className="h-8 w-8 text-[var(--brand-primary)]" />
                            </div>
                            <h2 className="text-xl font-display font-semibold text-[var(--brand-foreground)]">
                                {examKindLabel}
                            </h2>
                            <p className="mt-1 text-sm text-[var(--brand-muted)]">{scopeLabel}</p>
                            {questionCount != null && (
                                <p className="mt-3 inline-block px-3 py-1 text-xs font-mono rounded-full bg-[var(--background)] border border-[var(--surface-border)] text-[var(--brand-muted)]">
                                    {questionCount} questions · randomized
                                </p>
                            )}
                            <p className="mt-4 text-sm text-[var(--brand-muted)] leading-relaxed">{helperText}</p>
                            {error && <p className="text-sm text-red-400 mt-4" role="alert">{error}</p>}
                            <button
                                type="button"
                                onClick={handleGenerate}
                                disabled={phase === 'generating'}
                                aria-disabled={phase === 'generating'}
                                className="mt-8 w-full inline-flex items-center justify-center gap-2 px-6 py-3 text-sm font-semibold bg-[var(--brand-primary)] text-[var(--brand-black)] rounded-lg hover:opacity-90 disabled:opacity-50 transition-opacity"
                            >
                                {phase === 'generating' ? (
                                    <><ArrowPathIcon className="h-5 w-5 animate-spin" /> Generating exam…</>
                                ) : (
                                    <><AcademicCapIcon className="h-5 w-5" /> {generateButtonLabel ?? 'Start exam'}</>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            );
        }

        return (
            <div className={sectionClass}>
                <div className="flex items-start gap-3">
                    <div className="p-2 bg-[var(--brand-primary)]/10 rounded-lg shrink-0">
                        <AcademicCapIcon className="h-5 w-5 text-[var(--brand-primary)]" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-[var(--brand-foreground)]">
                            {examKindLabel} — {scopeLabel}
                        </p>
                        <p className="text-xs text-[var(--brand-muted)] mt-0.5">{helperText}</p>
                        {error && <p className="text-xs text-red-400 mt-2" role="alert">{error}</p>}
                    </div>
                    <button
                        type="button"
                        onClick={handleGenerate}
                        disabled={phase === 'generating'}
                        aria-disabled={phase === 'generating'}
                        className="shrink-0 inline-flex items-center gap-2 px-4 py-2 text-sm font-medium bg-[var(--brand-primary)] text-[var(--brand-black)] rounded-lg hover:opacity-90 disabled:opacity-50 transition-opacity"
                    >
                        {phase === 'generating' ? (
                            <><ArrowPathIcon className="h-4 w-4 animate-spin" /> Generating…</>
                        ) : (
                            <><AcademicCapIcon className="h-4 w-4" /> {generateButtonLabel ?? 'Generate Exam'}</>
                        )}
                    </button>
                </div>
            </div>
        );
    }

    // ── Taking / Submitting ───────────────────────────────────────────────────

    if ((phase === 'taking' || phase === 'submitting') && exam) {
        const questionList = (
            <div className="space-y-6" role="list" aria-label="Exam questions">
                {exam.questions.map((q, idx) => (
                    <div
                        key={q.id}
                        role="listitem"
                        className={`p-5 border border-[var(--surface-border)] bg-[var(--background)] rounded-lg ${isPage ? 'scroll-mt-28' : ''}`}
                        id={isPage ? `exam-q-${idx + 1}` : undefined}
                    >
                        <p className="text-xs font-mono text-[var(--brand-muted)] mb-2">
                            Question {idx + 1} of {exam.questions.length}
                            {q.difficulty && (
                                <span
                                    className={`ml-2 px-1.5 py-0.5 rounded text-xs ${
                                        q.difficulty === 'easy'
                                            ? 'bg-green-500/10 text-green-400'
                                            : q.difficulty === 'hard'
                                              ? 'bg-red-500/10 text-red-400'
                                              : 'bg-yellow-500/10 text-yellow-400'
                                    }`}
                                >
                                    {q.difficulty}
                                </span>
                            )}
                        </p>
                        <p className={`${isPage ? 'text-base' : 'text-sm'} font-medium text-[var(--brand-foreground)] mb-4 leading-relaxed`}>
                            {q.question_text}
                        </p>
                        {q.figure_ref && (
                            <p className="text-xs text-[var(--brand-muted)] mb-3">
                                Refer to{' '}
                                <a
                                    href="https://www.faa.gov/sites/faa.gov/files/training_testing/testing/supplements/ct-8080-2h.pdf"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="underline text-[var(--brand-primary)] hover:opacity-80"
                                >
                                    FAA Figure {q.figure_ref}
                                </a>
                            </p>
                        )}
                        <fieldset>
                            <legend className="sr-only">Choices for question {idx + 1}</legend>
                            <div className="space-y-2">
                                {q.choices.map((choice) => (
                                    <label
                                        key={choice.id}
                                        className={`flex items-center gap-3 p-3 border rounded-lg cursor-pointer transition-colors ${
                                            answers[q.id] === choice.id
                                                ? 'border-[var(--brand-primary)] bg-[var(--brand-primary)]/8'
                                                : 'border-[var(--surface-border)] hover:border-[var(--brand-primary)]/40'
                                        }`}
                                    >
                                        <input
                                            type="radio"
                                            name={`q-${q.id}`}
                                            value={choice.id}
                                            checked={answers[q.id] === choice.id}
                                            onChange={() => updateAnswers((a) => ({ ...a, [q.id]: choice.id }))}
                                            className="accent-[var(--brand-primary)] h-4 w-4 shrink-0"
                                        />
                                        <span className="text-sm text-[var(--brand-foreground)]">{choice.text}</span>
                                    </label>
                                ))}
                            </div>
                        </fieldset>
                    </div>
                ))}
            </div>
        );

        if (isPage) {
            return (
                <div className={sectionClass}>
                    <div className="flex items-center justify-between mb-6">
                        <div>
                            <p className="text-lg font-display font-semibold text-[var(--brand-foreground)]">
                                {examKindLabel} — {scopeLabel}
                            </p>
                            <p className="text-sm text-[var(--brand-muted)] mt-0.5">
                                {exam.questions.length} questions
                            </p>
                        </div>
                        <button
                            type="button"
                            onClick={handleRetake}
                            className="text-sm text-[var(--brand-muted)] hover:text-[var(--brand-foreground)] transition-colors"
                        >
                            Cancel
                        </button>
                    </div>

                    <div className="pb-32">{questionList}</div>

                    {error && (
                        <p className="fixed bottom-[4.5rem] left-0 right-0 z-40 text-center text-sm text-red-400 px-4 pointer-events-none" role="alert">
                            {error}
                        </p>
                    )}

                    <div className="fixed bottom-0 inset-x-0 z-30 border-t border-[var(--surface-border)] bg-[var(--background)]/95 backdrop-blur-sm">
                        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-6">
                            <ExamProgressBar answered={answeredCount} total={exam.questions.length} />
                            <ExamSubmitControls phase={phase} allAnswered={allAnswered} remaining={remainingCount} onSubmit={handleSubmit} compact />
                        </div>
                    </div>
                </div>
            );
        }

        return (
            <div className={sectionClass}>
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <p className="text-base font-display font-semibold text-[var(--brand-foreground)]">
                            {examKindLabel} — {scopeLabel}
                        </p>
                        <p className="text-xs text-[var(--brand-muted)] mt-0.5">
                            {exam.questions.length} questions · {answeredCount} answered
                        </p>
                    </div>
                    <button type="button" onClick={handleRetake} className="text-xs text-[var(--brand-muted)] hover:text-[var(--brand-foreground)] transition-colors">
                        Cancel
                    </button>
                </div>
                {questionList}
                {error && <p className="text-xs text-red-400 mt-4" role="alert">{error}</p>}
                <div className="mt-6">
                    <ExamSubmitControls phase={phase} allAnswered={allAnswered} remaining={remainingCount} onSubmit={handleSubmit} />
                </div>
            </div>
        );
    }

    // ── Results ───────────────────────────────────────────────────────────────

    if (phase === 'results' && result && exam) {
        const passed = result.score >= 70;
        const answerMap = new Map(result.answers.map((a) => [a.question_id, a]));

        return (
            <div className={sectionClass}>
                <div className={`p-6 rounded-xl mb-6 ${passed ? 'bg-green-500/10 border border-green-500/20' : 'bg-red-500/10 border border-red-500/20'}`}>
                    <div className="flex items-center justify-between flex-wrap gap-4">
                        <div>
                            <p className="text-xs font-mono text-[var(--brand-muted)] uppercase tracking-wide mb-1">
                                {scopeLabel} — {examKindLabel}
                            </p>
                            <p className={`${isPage ? 'text-5xl' : 'text-4xl'} font-display font-bold ${passed ? 'text-green-400' : 'text-red-400'}`}>
                                {result.score}%
                            </p>
                            <p className="text-sm text-[var(--brand-muted)] mt-1">
                                {result.correct_count} of {result.total_questions} correct
                                {passed ? ' · Passed' : ' · Needs review'}
                            </p>
                        </div>
                        <div className="flex flex-col sm:flex-row gap-2">
                            {isPage && examsHubHref && (
                                <Link href={examsHubHref} className="inline-flex items-center justify-center px-4 py-2 text-sm font-medium border border-[var(--surface-border)] text-[var(--brand-foreground)] rounded-lg hover:border-[var(--brand-primary)] transition-colors">
                                    Back to exams
                                </Link>
                            )}
                            <button type="button" onClick={handleRetake} className="inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium border border-[var(--surface-border)] text-[var(--brand-foreground)] rounded-lg hover:border-[var(--brand-primary)] transition-colors">
                                <ArrowPathIcon className="h-4 w-4" /> Retake exam
                            </button>
                        </div>
                    </div>
                </div>

                {result.section_breakdown && result.section_breakdown.length > 1 && (
                    <div className="mb-6">
                        <p className="text-xs font-semibold text-[var(--brand-muted)] uppercase tracking-wide mb-3">Section Breakdown</p>
                        <div className="space-y-2">
                            {result.section_breakdown.map((s: SectionBreakdown, i: number) => (
                                <div key={i} className="flex items-center gap-3 p-3 border border-[var(--surface-border)] rounded-lg bg-[var(--background)]">
                                    <div className="flex-1">
                                        <p className="text-xs text-[var(--brand-muted)]">
                                            {s.unit_id === 0 ? 'Cross-section / Final' : `Unit ${s.unit_id}${s.sub_unit_id ? ` · Section ${s.sub_unit_id}` : ''}`}
                                        </p>
                                        {s.failed_standards.length > 0 && (
                                            <p className="text-xs text-red-400 font-mono mt-0.5">Failed: {s.failed_standards.join(', ')}</p>
                                        )}
                                    </div>
                                    <div className="text-right shrink-0">
                                        <p className={`text-sm font-semibold ${s.score_percent >= 70 ? 'text-green-400' : 'text-red-400'}`}>{s.score_percent}%</p>
                                        <p className="text-xs text-[var(--brand-muted)]">{s.correct}/{s.total}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                <div>
                    <p className="text-xs font-semibold text-[var(--brand-muted)] uppercase tracking-wide mb-3">Question Review</p>
                    <div className="space-y-4">
                        {exam.questions.map((q, idx) => {
                            const a = answerMap.get(q.id);
                            const isCorrect = a?.is_correct ?? false;
                            const correctChoiceId = a?.correct_choice_id;
                            return (
                                <div key={q.id} className={`p-4 border rounded-lg ${isCorrect ? 'border-green-500/20 bg-green-500/5' : 'border-red-500/20 bg-red-500/5'}`}>
                                    <div className="flex items-start gap-2 mb-3">
                                        {isCorrect ? (
                                            <CheckCircleIcon className="h-4 w-4 text-green-400 shrink-0 mt-0.5" />
                                        ) : (
                                            <XCircleIcon className="h-4 w-4 text-red-400 shrink-0 mt-0.5" />
                                        )}
                                        <p className="text-sm font-medium text-[var(--brand-foreground)]">
                                            {idx + 1}. {q.question_text}
                                        </p>
                                    </div>
                                    <div className="space-y-1.5 pl-6">
                                        {q.choices.map((choice) => {
                                            const wasSelected = a?.selected_choice_id === choice.id;
                                            const isTheCorrectChoice = correctChoiceId === choice.id;

                                            return (
                                                <div
                                                    key={choice.id}
                                                    className={`flex items-center gap-2 px-3 py-1.5 rounded text-sm ${
                                                        wasSelected && isCorrect
                                                            ? 'bg-green-500/15 text-green-300'
                                                            : wasSelected && !isCorrect
                                                              ? 'bg-red-500/15 text-red-300'
                                                              : isTheCorrectChoice
                                                                ? 'bg-green-500/8 text-green-400'
                                                                : 'text-[var(--brand-muted)]'
                                                    }`}
                                                >
                                                    {wasSelected && isCorrect && <CheckCircleIcon className="h-3.5 w-3.5 shrink-0" />}
                                                    {wasSelected && !isCorrect && <XCircleIcon className="h-3.5 w-3.5 shrink-0" />}
                                                    {!wasSelected && isTheCorrectChoice && <CheckCircleIcon className="h-3.5 w-3.5 shrink-0" />}
                                                    <span>{choice.text}</span>
                                                    {wasSelected && (
                                                        <span className="ml-auto text-xs opacity-70">
                                                            {isCorrect ? 'Your answer ✓' : 'Your answer'}
                                                        </span>
                                                    )}
                                                    {!wasSelected && isTheCorrectChoice && (
                                                        <span className="ml-auto text-xs opacity-70">Correct answer</span>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                    {!isCorrect && a?.explanation && (
                                        <div className="mt-3 ml-6 p-3 rounded-lg bg-[var(--background)] border border-[var(--surface-border)]">
                                            <p className="text-xs font-semibold text-[var(--brand-muted)] mb-1">Explanation</p>
                                            <p className="text-sm text-[var(--brand-foreground)] leading-relaxed">{a.explanation}</p>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        );
    }

    return null;
}
