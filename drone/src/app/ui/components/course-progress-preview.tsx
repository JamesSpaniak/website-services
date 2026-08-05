'use client';

import { CourseData } from '@/app/lib/types/course';
import Link from 'next/link';
import StatusIcon from './status-icon';
import { resetCourseProgress } from '@/app/lib/api-client';
import { useState } from 'react';
import { EllipsisVerticalIcon } from '@heroicons/react/24/solid';

interface CourseProgressPreviewProps {
  course: CourseData;
  onReset: (courseId: number) => void;
}

export default function CourseProgressPreview({ course, onReset }: CourseProgressPreviewProps) {
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const courseHref = `/courses/${course.id}`;

    const handleReset = async () => {
      if (window.confirm(`Are you sure you want to reset your progress for "${course.title}"? This cannot be undone.`)) {
          try {
              await resetCourseProgress(course.id);
              onReset(course.id);
          } catch (error) {
              console.error("Failed to reset course progress", error);
          }
      }
    };

  return (
    <div className="relative p-4 bg-[var(--surface)] border border-[var(--surface-border)] rounded-lg shadow-md h-full flex flex-col hover:border-[var(--brand-primary)]/40 transition-colors">
      <Link
        href={courseHref}
        className="absolute inset-0 z-0 rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--background)]"
        aria-label={`Open course: ${course.title}`}
      />
      <div className="relative z-10 flex-grow pointer-events-none">
        <div className="flex items-center justify-between gap-2">
          <h4 className="text-lg font-bold text-[var(--brand-foreground)]">{course.title}</h4>
          <div className="relative pointer-events-auto shrink-0">
            <button
              type="button"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              onBlur={() => setTimeout(() => setIsMenuOpen(false), 150)}
              className="p-1 rounded-full hover:bg-[var(--comment-secondary-bg)]"
              aria-label={`Course options for ${course.title}`}
              aria-expanded={isMenuOpen}
              aria-haspopup="menu"
            >
              <EllipsisVerticalIcon className="h-5 w-5 text-[var(--brand-muted)]" aria-hidden />
            </button>
            {isMenuOpen && (
              <div className="absolute right-0 mt-2 w-48 bg-[var(--surface)] border border-[var(--surface-border)] rounded-md shadow-lg py-1 z-10" role="menu">
                <button
                  type="button"
                  onClick={handleReset}
                  className="w-full text-left block px-4 py-2 text-sm text-red-600 hover:bg-red-500/10"
                  role="menuitem"
                >
                  Reset Progress
                </button>
              </div>
            )}
          </div>
        </div>
        <p className="text-sm text-[var(--brand-muted)] mt-1">{course.sub_title}</p>
      </div>
      <div className="relative z-10 mt-4 border-t border-[var(--surface-border)] pt-2 pointer-events-none">
        <div className="flex items-center justify-between text-xs font-semibold text-[var(--brand-muted)] mb-2">
          <span>PROGRESS</span>
          <StatusIcon status={course.status} />
        </div>
        <div className="space-y-1">
          {course.units?.slice(0, 3).map(unit => (
            <div key={unit.id} className="flex items-center justify-between text-sm"><span className="text-[var(--brand-foreground)]">{unit.title}</span><StatusIcon status={unit.status} /></div>
          ))}
          {course.units && course.units.length > 3 && (<p className="text-xs text-[var(--brand-muted)]">...and {course.units.length - 3} more.</p>)}
        </div>
      </div>
    </div>
  );
}
