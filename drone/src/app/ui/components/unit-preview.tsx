'use client';

import Link from 'next/link';
import { UnitData, ProgressStatus } from '@/app/lib/types/course';
import StatusIcon from './status-icon';
import StatusUpdater from './status-updater';
import { DocumentTextIcon, PhotoIcon, VideoCameraIcon } from '@heroicons/react/24/solid';
import { mergeCourseImages } from '@/app/lib/course-images';

interface UnitPreviewProps {
  unit: UnitData;
  courseId: number;
  onStatusUpdate: (unitId: string, newStatus: ProgressStatus) => Promise<void>;
}

export default function UnitPreviewComponent({ unit, courseId, onStatusUpdate }: UnitPreviewProps) {
  const unitHref = `/courses/${courseId}/units/${encodeURIComponent(String(unit.id))}`;

  return (
    <div className="border border-[var(--surface-border)] bg-[var(--surface)]" style={{ borderRadius: 'var(--radius-md)' }}>
      <div className="flex items-stretch justify-between gap-3 p-5">
        <Link
          href={unitHref}
          className="flex flex-1 min-w-0 items-center gap-3 text-left rounded-md outline-none ring-offset-2 ring-offset-[var(--background)] focus-visible:ring-2 focus-visible:ring-[var(--brand-primary)] hover:opacity-95"
        >
          <StatusIcon status={unit.status} />
          <div className="min-w-0 flex-1">
            <h3 className="text-lg font-display font-semibold tracking-tight text-[var(--brand-foreground)]">
              {unit.title}
            </h3>
            <div className="mt-1 flex flex-wrap items-center gap-2 text-[var(--brand-muted)]">
              {unit.text_content && (
                <DocumentTextIcon className="h-4 w-4 shrink-0" title="Text" />
              )}
              {mergeCourseImages(unit).length > 0 && (
                <PhotoIcon className="h-4 w-4 shrink-0" title="Images" />
              )}
              {unit.video_url && <VideoCameraIcon className="h-4 w-4 shrink-0" title="Video" />}
            </div>
          </div>
        </Link>
        <div className="shrink-0 flex items-center self-center">
          <StatusUpdater onStatusSelect={(newStatus) => onStatusUpdate(unit.id, newStatus)} />
        </div>
      </div>
    </div>
  );
}
