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
    /** Gallery URLs for the course hero (horizontal scroll). Persist as JSON array of strings; backend accepts legacy `image_url` and merges into this. */
    images_url?: string[];
    /** @deprecated Merged into `images_url` by API; may still appear in older payloads. */
    image_url?: string;
    video_url?: string;
    /**
     * CSS `object-position` for hero images, e.g. `"center"`, `"top"`, `"center 30%"`.
     * Controls which part of the image stays visible in the 16:9 crop.
     * If omitted, images default to `"center"`.
     */
    image_focal_point?: string;
    units?: UnitData[];
    status?: ProgressStatus;
    price: number;
    has_access: boolean;
    exam_summary?: {
        practice?: { score: number; taken_at: string } | null;
        final?: { score: number; taken_at: string } | null;
    };
}
interface ExamData {
    questions: QuestionData[];
    /** Max graded attempts (matches backend `retries_allowed`). */
    retries_allowed?: number;
    /** @deprecated Prefer `retries_allowed`; kept for older payloads. */
    attempts_allowed?: number;
    retries_taken?: number;
    result?: ExamResult;
    previous_results?: ExamResult[] | string;
    status?: ProgressStatus;
}

interface UnitData {
    id: string;
    title: string;
    description?: string;
    text_content?: string;
    video_url?: string;
    /** Same as course-level: ordered list of image URLs for galleries. */
    images_url?: string[];
    /** @deprecated Merged into `images_url` by API. */
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
    submittedAt: string | Date;
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