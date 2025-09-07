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
    const isAnswered = selectedAnswerId !== null;
    const correctAnswerId = getCorrectAnswerId(answers);

    const handleAnswerClick = (answer: AnswerData) => {
        if (!isSubmitted) { // Can change until exam is submitted
            const wasCorrect = answer.id === correctAnswerId;
            onAnswerSelect(id, answer.id, wasCorrect);
        }
    }

    const wasCorrect = isAnswered && selectedAnswerId === correctAnswerId;

    return (
        <div key={id} className="border-t border-gray-200 pt-4 first:border-t-0 first:pt-0">
            <h4 className="text-md font-semibold text-gray-800">{question}</h4>
            <div className="mt-3 space-y-2">
                {answers.map((option: AnswerData) => {
                    const isSelected = selectedAnswerId === option.id;
                    const isCorrect = option.correct;

                    let buttonStyles = 'bg-white text-gray-700 border-gray-300'; // Default
                    if (!isSubmitted) {
                        buttonStyles = isSelected ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50';
                    } else {
                        if (isCorrect) {
                            buttonStyles = 'bg-green-100 text-green-800 border-green-300';
                        } else if (isSelected && !isCorrect) {
                            buttonStyles = 'bg-red-100 text-red-800 border-red-300';
                        } else {
                            buttonStyles = 'bg-gray-100 text-gray-500 border-gray-200';
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
