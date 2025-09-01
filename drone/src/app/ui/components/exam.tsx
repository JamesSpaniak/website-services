'use client'

import { useState } from 'react';
import { QuestionData }  from '@/app/lib/data/questions';
import { ExamData } from '@/app/lib/data/units';
import QuestionComponent from '@/app/ui/components/question';

interface AnswerRecord {
    answerId: number;
    isCorrect: boolean;
}

export default function ExamComponent({ questions }: ExamData) {
    // State to hold the user's answers. Key: questionId, Value: { answerId, isCorrect }
    const [userAnswers, setUserAnswers] = useState<Record<number, AnswerRecord>>({});
    const [isSubmitted, setIsSubmitted] = useState(false);
    const [score, setScore] = useState(0);

    const handleAnswerSelect = (questionId: number, answerId: number, isCorrect: boolean) => {
        // Prevent changing the answer once submitted
        if (!isSubmitted) {
            setUserAnswers(prev => ({
                ...prev,
                [questionId]: { answerId, isCorrect },
            }));
        }
    };

    const handleSubmit = () => {
        const correctCount = Object.values(userAnswers).filter(answer => answer.isCorrect).length;
        setScore(correctCount);
        setIsSubmitted(true);
    };

    return (
        <div className="flex flex-col justify-center">
            <h2 className="text-center px-5 text-bold text-4xl">Practice Exam</h2>
            <div>
                {questions.map((item: QuestionData, index: number) => (
                    <QuestionComponent 
                        key={item.id} 
                        {...item}
                        onAnswerSelect={handleAnswerSelect}
                        selectedAnswerId={userAnswers[item.id]?.answerId || null}
                        isSubmitted={isSubmitted}
                    />
                ))}
            </div>
            {!isSubmitted && <SubmitButton onSubmit={handleSubmit} />}
            {isSubmitted && <ResultsComponent correctAnswers={score} totalQuestions={questions.length} />}
        </div>
    )
}

function SubmitButton({ onSubmit }: { onSubmit: () => void }) {
    return (
        <div className="mx-auto justify-center items-center flex rounded-xl bg-white outline outline-black/5">
            <div className="p-4 text-xl font-medium text-center rounded-xl outline-black">
                <button onClick={onSubmit}
                        className={`p-4 rounded-lg justify-center bg-black hover:bg-opacity-75 hover:bg-blue-100 transition duration-300 text-white`}>
                    Submit Exam
                </button>
            </div>
        </div>
    )
}

function ResultsComponent({ correctAnswers, totalQuestions }: ResultsData) {
    return (
        <div className="mt-6 p-4 bg-blue-100 rounded-lg text-center">
            <h3 className="text-2xl font-bold">Results</h3>
            <p className="text-xl mt-2">{`You scored ${correctAnswers} out of ${totalQuestions}`}</p>
        </div>
    )
}

interface ResultsData {
    correctAnswers: number;
    totalQuestions: number;
}

