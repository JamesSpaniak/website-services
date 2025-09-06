'use client';

import { ProgressStatus } from '@/app/lib/types/course';
import { CheckCircleIcon, ClockIcon, PlayCircleIcon } from '@heroicons/react/24/solid';

export default function StatusIcon({ status }: { status?: ProgressStatus }) {
  switch (status) {
    case ProgressStatus.COMPLETED:
      return <CheckCircleIcon className="h-6 w-6 text-green-500 flex-shrink-0" title="Completed" />;
    case ProgressStatus.IN_PROGRESS:
      return <PlayCircleIcon className="h-6 w-6 text-blue-500 flex-shrink-0" title="In Progress" />;
    case ProgressStatus.NOT_STARTED:
    default:
      return <ClockIcon className="h-6 w-6 text-gray-400 flex-shrink-0" title="Not Started" />;
  }
};