enum ProgressStatus {
    NOT_STARTED = 'NOT_STARTED',
    IN_PROGRESS = 'IN_PROGRESS',
    COMPLETED = 'COMPLETED',
}

class CourseDetails {
    id: number;
    title: string;
    sub_title: string;
    description: string;
    image_url?: string;
    video_url?: string;
    units?: Unit[]
    status?: ProgressStatus;
    price: number;
    has_access: boolean;
}

class Unit {
    id: string;
    title: string;
    description: string;
    text_content?: string;
    image_url?: string;
    video_url?: string;
    exam?: Exam
    sub_units?: Unit[];
    status?: ProgressStatus;
}

// Represents a user's answer to a question for result tracking
class UserAnswer {
    questionId: number;
    selectedAnswerId: number;
}

// Represents the result of a single exam attempt
class ExamResult {
    score: number;
    answers: UserAnswer[];
    submittedAt: Date;
}

class Exam {
    questions: Question[];
    // score has been moved to ExamResult
    status?: ProgressStatus;
    result?: ExamResult; // Current or latest result
    previous_results?: ExamResult[];
    retries_allowed: number;
    retries_taken: number;
}

class Answer {
    id: number;
    text: string;
    correct?: boolean;
}

class Question {
    id: number
    question: string;
    answers: Answer[]
}

// DTO for updating unit/sub-unit progress
class UpdateProgressDto {
    status: ProgressStatus;
}

// DTO for submitting exam answers
class SubmitExamDto {
    answers: UserAnswer[];
}

export {
    CourseDetails,
    Unit,
    Exam,
    Answer,
    Question,
    ExamResult,
    ProgressStatus,
    UserAnswer,
    UpdateProgressDto,
    SubmitExamDto
}