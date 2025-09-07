'use client';

import { useState } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { UnitData, ProgressStatus } from '@/app/lib/types/course';
import StatusIcon from './status-icon';
import StatusUpdater from './status-updater';
import { ChevronRightIcon, DocumentTextIcon, PhotoIcon, VideoCameraIcon } from '@heroicons/react/24/solid';

interface UnitPreviewProps {
  unit: UnitData;
  courseId: number;
  onStatusUpdate: (unitId: string, newStatus: ProgressStatus) => Promise<void>;
}

export default function UnitPreviewComponent({ unit, courseId, onStatusUpdate }: UnitPreviewProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="bg-white rounded-2xl shadow-sm">
      <div
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between p-6 text-left cursor-pointer"
      >
        <div className="flex items-center gap-3">
          <StatusIcon status={unit.status} />
          <div className="flex items-center gap-3">
            <h3 className="text-xl font-bold tracking-tight text-gray-900">{unit.title}</h3>
            {unit.text_content && <DocumentTextIcon className="h-5 w-5 text-gray-400" title="Text Content Available" />}
            {unit.image_url && <PhotoIcon className="h-5 w-5 text-gray-400" title="Image Available" />}
            {unit.video_url && <VideoCameraIcon className="h-5 w-5 text-gray-400" title="Video Available" />}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div onClick={(e) => e.stopPropagation()}><StatusUpdater onStatusSelect={(newStatus) => onStatusUpdate(unit.id, newStatus)} /></div>
          <ChevronRightIcon className={`h-6 w-6 text-gray-400 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
        </div>
      </div>

      <AnimatePresence initial={false}>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            <div className="px-6 pb-6 border-t">
              <div className="mt-4 prose max-w-none text-gray-600" dangerouslySetInnerHTML={{ __html: unit.description?.replace(/\n/g, '<br />') || '' }} />
              <div className="mt-4 text-right">
                <Link href={`/courses/${courseId}/units/${unit.id}`} className="text-sm font-semibold text-blue-600 hover:text-blue-500">
                  Go to Unit →
                </Link>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}