'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { ProgressStatus } from '@/app/lib/types/course';
import { EllipsisVerticalIcon } from '@heroicons/react/24/solid';

interface StatusUpdaterProps {
  onStatusSelect: (status: ProgressStatus) => Promise<void>;
}

const MENU_ITEMS: { status: ProgressStatus; label: string }[] = [
  { status: ProgressStatus.IN_PROGRESS, label: 'Mark as In Progress' },
  { status: ProgressStatus.COMPLETED, label: 'Mark as Complete' },
  { status: ProgressStatus.NOT_STARTED, label: 'Mark as Not Started' },
];

export default function StatusUpdater({ onStatusSelect }: StatusUpdaterProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const menuId = useId();
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    const onPointerDown = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', onPointerDown);
    return () => document.removeEventListener('mousedown', onPointerDown);
  }, [isOpen]);

  const handleSelect = async (status: ProgressStatus) => {
    setIsLoading(true);
    setIsOpen(false);
    try {
      await onStatusSelect(status);
    } catch (error) {
      console.error('Failed to update status', error);
    } finally {
      setIsLoading(false);
    }
  };

  const onMenuKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setIsOpen(false);
    }
  };

  return (
    <div ref={rootRef} className="relative inline-block text-left">
      <button
        type="button"
        onClick={() => setIsOpen((open) => !open)}
        aria-haspopup="menu"
        aria-expanded={isOpen}
        aria-controls={menuId}
        disabled={isLoading}
        className="p-1 rounded-full hover:bg-[var(--comment-secondary-bg)] transition-colors"
        aria-label="Update progress status"
      >
        <EllipsisVerticalIcon className="h-5 w-5 text-[var(--brand-muted)]" />
      </button>
      {isOpen && (
        <div
          id={menuId}
          className="origin-top-right absolute right-0 mt-2 w-48 rounded-md shadow-lg bg-[var(--surface)] border border-[var(--surface-border)] z-10"
          role="menu"
          aria-orientation="vertical"
          onKeyDown={onMenuKeyDown}
        >
          <div className="py-1">
            {MENU_ITEMS.map(({ status, label }) => (
              <button
                key={status}
                type="button"
                role="menuitem"
                onClick={() => handleSelect(status)}
                disabled={isLoading}
                className="w-full text-left block px-4 py-2 text-sm text-[var(--brand-foreground)] hover:bg-[var(--comment-secondary-bg)]"
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
