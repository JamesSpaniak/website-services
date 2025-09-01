class CourseDetails {
    id: number;
    title: string;
    sub_title: string;
    description: string;
    image_url?: string;
    video_url?: string;
    units?: Unit[]
} // TODO add progress and previous results
// TODO add retries per exam and question

class Unit {
    id: string;
    title: string;
    description: string;
    image_url?: string;
    video_url?: string;
    exam?: Exam
    sub_units?: Unit[];
}

class Exam {
    questions: Question[]
    score: number
}

class Answer {
    id: number;
    text: string;
    correct?: boolean
}

class Question {
    id: number
    question: string;
    answers: Answer[]
}

export {
    CourseDetails,
    Unit,
    Exam,
    Answer,
    Question
}