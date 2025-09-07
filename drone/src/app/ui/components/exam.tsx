'use client'

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import QuestionComponent from '@/app/ui/components/question';
import { ExamData, QuestionData } from '@/app/lib/types/course';

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

    const handleReset = () => {
        setUserAnswers({});
        setIsSubmitted(false);
        setScore(0);
    };

    const answeredQuestions = Object.keys(userAnswers).length;
    const totalQuestions = questions.length;
    const progressPercentage = totalQuestions > 0 ? (answeredQuestions / totalQuestions) * 100 : 0;
    const allQuestionsAnswered = answeredQuestions === totalQuestions;

    return (
        <div className="p-6 bg-white rounded-2xl shadow-sm">
            <h3 className="text-lg font-semibold text-gray-900 border-b pb-3">Practice Exam</h3>
            
            <div className="mt-4 space-y-6">
                {questions.map((item: QuestionData, index: number) => (
                    <QuestionComponent 
                        key={item.id} 
                        {...item}
                        onAnswerSelect={handleAnswerSelect}
                        selectedAnswerId={userAnswers[item.id]?.answerId}
                        isSubmitted={isSubmitted}
                    />
                ))}
            </div>

            {!isSubmitted && (
                <div className="mt-6">
                    <div className="flex justify-between mb-1">
                        <span className="text-sm font-medium text-gray-700">Progress</span>
                        <span className="text-sm font-medium text-gray-700">{answeredQuestions} / {totalQuestions}</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2.5">
                        <div className="bg-blue-600 h-2.5 rounded-full transition-all duration-300" style={{ width: `${progressPercentage}%` }}></div>
                    </div>
                </div>
            )}

            <div className="mt-6">
                <AnimatePresence mode="wait">
                    {!isSubmitted ? (
                        <motion.div
                            key="submit"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.2 }}
                        >
                            <SubmitButton onSubmit={handleSubmit} disabled={!allQuestionsAnswered} />
                        </motion.div>
                    ) : (
                        <motion.div key="results" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, ease: 'easeOut' }} className="space-y-4">
                            <ResultsComponent correctAnswers={score} totalQuestions={questions.length} />
                            <ResetButton onReset={handleReset} />
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    )
}

function SubmitButton({ onSubmit, disabled }: { onSubmit: () => void; disabled: boolean }) {
    return (
        <button 
            onClick={onSubmit}
            disabled={disabled}
            className="w-full px-4 py-2 font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
        >
            Submit Exam
        </button>
    )
}

function ResetButton({ onReset }: { onReset: () => void }) {
    return (
        <button 
            onClick={onReset}
            className="w-full px-4 py-2 font-semibold text-blue-600 bg-white border border-blue-600 rounded-lg hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
        >
            Try Again
        </button>
    );
}

function ResultsComponent({ correctAnswers, totalQuestions }: ResultsData) {
    return (
        <div className="p-4 bg-gray-100 rounded-lg text-center">
            <h4 className="text-md font-semibold text-gray-800">Your Score</h4>
            <p className="text-2xl font-bold text-gray-900 mt-1">{`${Math.round((correctAnswers / totalQuestions) * 100)}%`}</p>
            <p className="text-sm text-gray-500">{`(${correctAnswers} out of ${totalQuestions} correct)`}</p>
        </div>
    )
}

interface ResultsData {
    correctAnswers: number;
    totalQuestions: number;
}
