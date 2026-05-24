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
      <button onClick={() => setIsOpen(!isOpen)} onBlur={() => setTimeout(() => setIsOpen(false), 150)} className="p-1 rounded-full hover:bg-[var(--comment-secondary-bg)] transition-colors">
        <EllipsisVerticalIcon className="h-5 w-5 text-[var(--brand-muted)]" />
      </button>
      {isOpen && (
        <div className="origin-top-right absolute right-0 mt-2 w-48 rounded-md shadow-lg bg-[var(--surface)] border border-[var(--surface-border)] z-10">
          <div className="py-1" role="menu" aria-orientation="vertical">
            <button onClick={() => handleSelect(ProgressStatus.IN_PROGRESS)} disabled={isLoading} className="w-full text-left block px-4 py-2 text-sm text-[var(--brand-foreground)] hover:bg-[var(--comment-secondary-bg)]">Mark as In Progress</button>
            <button onClick={() => handleSelect(ProgressStatus.COMPLETED)} disabled={isLoading} className="w-full text-left block px-4 py-2 text-sm text-[var(--brand-foreground)] hover:bg-[var(--comment-secondary-bg)]">Mark as Complete</button>
            <button onClick={() => handleSelect(ProgressStatus.NOT_STARTED)} disabled={isLoading} className="w-full text-left block px-4 py-2 text-sm text-[var(--brand-foreground)] hover:bg-[var(--comment-secondary-bg)]">Mark as Not Started</button>
          </div>
        </div>
      )}
    </div>
  );
}

