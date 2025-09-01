interface AnswerData {
    id: number;
    text: string;
    correct?: boolean
}

interface QuestionData {
    id: number
    question: string;
    answers: AnswerData[]
}

export type {
    AnswerData,
    QuestionData
}