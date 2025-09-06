'use client';

import { useState } from 'react';
import { ProgressStatus } from '@/app/lib/types/course';
import { EllipsisVerticalIcon } from '@heroicons/react/24/solid';

interface StatusUpdaterProps {
  onStatusSelect: (status: ProgressStatus) => Promise<void>;
}

export default function StatusUpdater({ onStatusSelect }: StatusUpdaterProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleSelect = async (status: ProgressStatus) => {
    setIsLoading(true);
    setIsOpen(false);
    try {
      await onStatusSelect(status);
    } catch (error) {
      console.error("Failed to update status", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative inline-block text-left">
      <button onClick={() => setIsOpen(!isOpen)} onBlur={() => setTimeout(() => setIsOpen(false), 150)} className="p-1 rounded-full hover:bg-gray-200 transition-colors">
        <EllipsisVerticalIcon className="h-5 w-5 text-gray-500" />
      </button>
      {isOpen && (
        <div className="origin-top-right absolute right-0 mt-2 w-48 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 z-10">
          <div className="py-1" role="menu" aria-orientation="vertical">
            <button onClick={() => handleSelect(ProgressStatus.IN_PROGRESS)} disabled={isLoading} className="w-full text-left block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">Mark as In Progress</button>
            <button onClick={() => handleSelect(ProgressStatus.COMPLETED)} disabled={isLoading} className="w-full text-left block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">Mark as Complete</button>
            <button onClick={() => handleSelect(ProgressStatus.NOT_STARTED)} disabled={isLoading} className="w-full text-left block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">Mark as Not Started</button>
          </div>
        </div>
      )}
    </div>
  );
}

