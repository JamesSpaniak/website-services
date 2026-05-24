'use client'

import { AnswerData, QuestionData } from "@/app/lib/types/course";

interface QuestionComponentProps extends QuestionData {
    onAnswerSelect: (questionId: number, answerId: number, isCorrect: boolean) => void;
    selectedAnswerId: number | null;
    isSubmitted: boolean;
}

function getCorrectAnswerId(answers: AnswerData[]): number {
    const correctAnswer = answers.find(answer => answer.correct);
    return correctAnswer ? correctAnswer.id : -1;
}

export default function QuestionComponent({id, question, answers, onAnswerSelect, selectedAnswerId, isSubmitted}: QuestionComponentProps) {
    const correctAnswerId = getCorrectAnswerId(answers);

    const handleAnswerClick = (answer: AnswerData) => {
        if (!isSubmitted) { // Can change until exam is submitted
            const wasCorrect = answer.id === correctAnswerId;
            onAnswerSelect(id, answer.id, wasCorrect);
        }
    }

    return (
        <div key={id} className="border-t border-[var(--surface-border)] pt-4 first:border-t-0 first:pt-0">
            <h4 className="text-md font-semibold text-[var(--brand-foreground)]">{question}</h4>
            <div className="mt-3 space-y-2">
                {answers.map((option: AnswerData) => {
                    const isSelected = selectedAnswerId === option.id;
                    const isCorrect = option.correct;

                    let buttonStyles =
                        'bg-[var(--surface)] text-[var(--brand-foreground)] border-[var(--input-border)]';
                    if (!isSubmitted) {
                        buttonStyles = isSelected
                            ? 'bg-[var(--brand-primary)] text-[var(--background)] border-[var(--brand-primary)]'
                            : 'bg-[var(--surface)] text-[var(--brand-foreground)] border-[var(--input-border)] hover:bg-[var(--comment-secondary-bg)]';
                    } else {
                        if (isCorrect) {
                            buttonStyles = 'bg-green-100 text-green-800 border-green-300';
                        } else if (isSelected && !isCorrect) {
                            buttonStyles = 'bg-red-100 text-red-800 border-red-300';
                        } else {
                            buttonStyles =
                                'bg-[var(--comment-secondary-bg)] text-[var(--brand-muted)] border-[var(--surface-border)]';
                        }
                    }

                    return (
                        <button
                            key={option.id}
                            onClick={() => handleAnswerClick(option)}
                            disabled={isSubmitted}
                            className={`w-full text-left py-2 px-4 my-1 rounded-lg border text-sm font-medium transition-colors ${buttonStyles}`}
                        >
                            {option.text}
                        </button>
                    );
                })}
            </div>
        </div>
    )
}
