'use client'
import { AnswerData, QuestionData }  from '@/app/lib/data/questions';

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
        <div key={id} className="max-w-md mx-auto bg-white shadow-lg rounded-lg overflow-hidden">
            <div className="p-4">
                <h2 className="text-xl font-bold justify-center">{question}</h2>
                <div className="mx-auto space-y-2 inline">
                    {answers.map((option: AnswerData) => {
                        const buttonStyles = !isSubmitted ? 
                            (selectedAnswerId === option.id ? 'bg-blue-500' : 'bg-gray-500 hover:bg-blue-400') : 
                            (option.correct ? 'bg-green-500' : (selectedAnswerId === option.id ? 'bg-red-500' : 'bg-gray-400'));

                        return (
                            <button
                                key={option.id}
                                onClick={() => handleAnswerClick(option)}
                                disabled={isSubmitted}
                                className={`w-full py-2 px-4 my-1 rounded-lg text-white transition duration-300 ${buttonStyles} ${!isSubmitted && 'hover:bg-opacity-75'}`}
                            >
                                {option.text}
                            </button>
                        );
                    })}
                </div>
                {isSubmitted && isAnswered && (
                    <div className="p-2 text-center font-bold">
                        {wasCorrect ? <p className="text-green-600">Correct</p> : <p className="text-red-600">Incorrect</p>}
                    </div>
                )}
            </div>
        </div>
    )
}

