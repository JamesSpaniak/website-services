import { QuestionData } from '@/app/lib/data/questions';

const units: UnitData[] = [{
    id: 1,
    title: 'Unit 1',
    sub_units: [
        {
            id: 1,
            title: 'Subunit example 1',
            description: 'Example content goes hereasdfs.d,fm as.fas.fas,d.fas  eakllas;df;as dflasdjflkas jfl;asj dfl;asj fals;kd',
            video_url: '', 
            image_url: ''
        },
        {
            id: 2,
            title: 'Subunit example 2',
            description: 'Example asdf goes hereasdfs.dklasjs sdafhuka sdhfasdhf aksjhgfass jfl;asj dfl;asj fadls;kd',
            video_url: '', 
            image_url: ''
        }
    ]
}]

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