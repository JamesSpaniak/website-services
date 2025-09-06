'use client';

import { CourseData } from '@/app/lib/types/course';
import Link from 'next/link';
import StatusIcon from './status-icon';

interface CourseProgressPreviewProps {
  course: CourseData;
}

export default function CourseProgressPreview({ course }: CourseProgressPreviewProps) {
  return (
    <Link href={`/courses/${course.id}`} className="group block">
      <div className="p-4 bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow h-full">
        <div className="flex items-center justify-between">
          <h4 className="text-lg font-bold text-gray-800 group-hover:text-blue-600">{course.title}</h4>
          <StatusIcon status={course.status} />
        </div>
        <p className="text-sm text-gray-500 mt-1">{course.sub_title}</p>
        <div className="mt-4 border-t pt-2">
          <span className="text-xs font-semibold text-gray-500">UNITS</span>
          <div className="mt-2 space-y-1">
            {course.units?.slice(0, 3).map(unit => (
              <div key={unit.id} className="flex items-center justify-between text-sm"><span className="text-gray-700">{unit.title}</span><StatusIcon status={unit.status} /></div>
            ))}
            {course.units && course.units.length > 3 && (<p className="text-xs text-gray-400">...and {course.units.length - 3} more.</p>)}
          </div>
        </div>
      </div>
    </Link>
  );
}