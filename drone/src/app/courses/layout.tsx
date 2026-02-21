import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Courses',
  description: 'Professional drone certification courses including FAA Part 107 exam prep, flight training, and advanced drone operations.',
  openGraph: {
    title: 'Courses — Drone Training Pro',
    description: 'Professional drone certification courses including FAA Part 107 exam prep, flight training, and advanced drone operations.',
  },
  other: {
    'robots': 'max-image-preview:large',
  },
};

export default function CoursesLayout({ children }: { children: React.ReactNode }) {
  return children;
}
