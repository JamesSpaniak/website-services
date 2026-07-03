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
    /** Gallery URLs for the course hero (horizontal scroll). Persist as JSON array of strings. */
    images_url?: string[];
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

interface UnitData {
    /**
     * Stable string ref, unique across the course tree (e.g. "u101" or a
     * UUID from the editor). Used for progress updates and exam scoping.
     */
    id: string;
    title: string;
    description?: string;
    text_content?: string;
    video_url?: string;
    /** Same as course-level: ordered list of image URLs for galleries. */
    images_url?: string[];
    sub_units?: UnitData[]; // Can have optional nested subunits defined
    status?: ProgressStatus;
    /** When true, learners can access this unit without purchasing the course. */
    free_preview?: boolean;
}

export type {
    CourseData,
    UnitData,
}