export enum ProgressStatus {
    NOT_STARTED = 'NOT_STARTED',
    IN_PROGRESS = 'IN_PROGRESS',
    COMPLETED = 'COMPLETED',
}

interface CourseData {
    id: number;
    title: string;
    sub_title: string;
    description: string;
    text_content?: string;
    image_url?: string;
    video_url?: string;
    units?: UnitData[];
    status?: ProgressStatus;

}
interface ExamData {
    questions: QuestionData[]
    attempts_allowed: number // Set based on retries?
    previous_results: string // TODO
}

interface UnitData {
    id: string;
    title: string;
    description?: string;
    text_content?: string;
    video_url?: string;
    image_url?: string;
    sub_units?: UnitData[]; // Can have optional nested subunits defined
    exam?: ExamData;
    status?: ProgressStatus;

}

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

interface UserAnswer {
    questionId: number;
    selectedAnswerId: number;
}

interface ExamResult {
    score: number;
    answers: UserAnswer[];
    submittedAt: Date;
}

export type {
    AnswerData,
    CourseData,
    ExamData,
    QuestionData,
    UnitData,
    UserAnswer,
    ExamResult,
}