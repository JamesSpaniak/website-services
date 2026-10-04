import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Courses',
  description: 'FAA Part 107 exam prep with practice exams and progress tracking. Unit 1 is free. Drone Building opens for early access in January 2027.',
  openGraph: {
    title: 'Courses — Drone Edge',
    description: 'FAA Part 107 exam prep with practice exams and progress tracking. Unit 1 is free. Drone Building opens for early access in January 2027.',
  },
  other: {
    'robots': 'max-image-preview:large',
  },
};

export default function CoursesLayout({ children }: { children: React.ReactNode }) {
  return children;
}
