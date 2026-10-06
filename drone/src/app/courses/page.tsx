import { Metadata } from 'next';
import CoursesPageClient from './courses-page-client';

export const metadata: Metadata = {
  alternates: { canonical: '/courses' },
};

export default function CoursesPage() {
  return <CoursesPageClient />;
}
