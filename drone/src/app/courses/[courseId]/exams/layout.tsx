import { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'Course exams',
    robots: { index: false, follow: false },
};

export default function CourseExamsLayout({ children }: { children: React.ReactNode }) {
    return children;
}
