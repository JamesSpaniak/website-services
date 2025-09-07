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

    const handleReset = async () => {
      if (window.confirm(`Are you sure you want to reset your progress for "${course.title}"? This cannot be undone.`)) {
          try {
              await resetCourseProgress(course.id);
              onReset(course.id);
          } catch (error) {
              console.error("Failed to reset course progress", error);
              // Optionally, show an error message to the user
          }
      }
    };



  return (
    <div className="p-4 bg-white rounded-lg shadow-md h-full flex flex-col">
      <div className="flex-grow">
        <div className="flex items-center justify-between">
          <Link href={`/courses/${course.id}`} className="group">
            <h4 className="text-lg font-bold text-gray-800 group-hover:text-blue-600">{course.title}</h4>
          </Link>
          <div className="relative">
            <button onClick={() => setIsMenuOpen(!isMenuOpen)} onBlur={() => setTimeout(() => setIsMenuOpen(false), 150)} className="p-1 rounded-full hover:bg-gray-200">
              <EllipsisVerticalIcon className="h-5 w-5 text-gray-500" />
            </button>
            {isMenuOpen && (
              <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-10 ring-1 ring-black ring-opacity-5">
                <button onClick={handleReset} className="w-full text-left block px-4 py-2 text-sm text-red-600 hover:bg-red-50">
                  Reset Progress
                </button>
              </div>
            )}
          </div>
        </div>
        <p className="text-sm text-gray-500 mt-1">{course.sub_title}</p>
      </div>
      <div className="mt-4 border-t pt-2">
        <div className="flex items-center justify-between text-xs font-semibold text-gray-500 mb-2">
          <span>PROGRESS</span>
          <StatusIcon status={course.status} />
        </div>
        <div className="space-y-1">
          {course.units?.slice(0, 3).map(unit => (
            <div key={unit.id} className="flex items-center justify-between text-sm"><span className="text-gray-700">{unit.title}</span><StatusIcon status={unit.status} /></div>
          ))}
          {course.units && course.units.length > 3 && (<p className="text-xs text-gray-400">...and {course.units.length - 3} more.</p>)}
        </div>
      </div>
    </div>
  );
}

