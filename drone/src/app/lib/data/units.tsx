import { QuestionData } from '@/app/lib/data/questions';

interface CourseData {
    id: number;
    title: string;
    sub_title: string;
    description: string;
    image_url?: string;
    video_url?: string;
    units?: UnitData[]
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
    video_url?: string;
    image_url?: string;
    sub_units?: UnitData[]; // Can have optional nested subunits defined
    exam?: ExamData
}

export type {
    CourseData,
    ExamData,
    UnitData
}