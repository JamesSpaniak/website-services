import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Articles',
  description: 'Latest insights on drone technology, FAA regulations, autonomous flight, and best practices for remote pilots.',
  openGraph: {
    title: 'Articles — Drone Edge',
    description: 'Latest insights on drone technology, FAA regulations, autonomous flight, and best practices for remote pilots.',
  },
};

export default function ArticlesLayout({ children }: { children: React.ReactNode }) {
  return children;
}
