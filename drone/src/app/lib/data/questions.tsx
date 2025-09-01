export const questions = [
    {
        id: 1,
        question: 'What is the users job?',
        answers: [
            {id: 1, text: 'Fly', correct: true},
            {id: 2, text: 'Die', correct: false},
            {id: 3, text: 'Run', correct: false},
            {id: 4, text: 'SAMPLE teaxt waefasdlfjaskdjlfaskj', correct: false},
        ]
    },
    {
        id: 2,
        question: 'What can you do?',
        answers: [
            {id: 1, text: 'Lose', correct: false},
            {id: 2, text: 'Win', correct: true},
            {id: 3, text: 'Explode YAY how is longer?', correct: false},
        ],
        correct: 'Win'
    },
    {
        id: 3,
        question: 'What is the users job?',
        answers: [
            {id: 1, text: 'Fly', correct: true},
            {id: 2, text: 'Die', correct: false},
            {id: 3, text: 'Run', correct: false},
            {id: 4, text: 'SAMPLE teaxt waefasdlfjaskdjlfaskj', correct: false},
        ]
    },
    {
        id: 4,
        question: 'What is the users job?',
        answers: [
            {id: 1, text: 'Fly', correct: true},
            {id: 2, text: 'Die', correct: false},
            {id: 3, text: 'Run'},
            {id: 4, text: 'SAMPLE teaxt waefasdlfjaskdjlfaskj'},
        ]
    },
    {
        id: 5,
        question: 'What is the users job?',
        answers: [
            {id: 1, text: 'Fly', correct: true},
            {id: 2, text: 'Die'},
            {id: 3, text: 'Run'},
            {id: 4, text: 'SAMPLE teaxt waefasdlfjaskdjlfaskj'},
        ]
    },
]

export interface AnswerData {
    id: number;
    text: string;
    correct?: boolean
}

export interface QuestionData {
    id: number
    question: string;
    answers: AnswerData[]
}