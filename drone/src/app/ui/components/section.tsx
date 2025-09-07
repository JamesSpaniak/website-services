'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { UnitData, ProgressStatus } from '@/app/lib/types/course';
import StatusIcon from './status-icon';
import StatusUpdater from './status-updater';
import ExamComponent from './exam';
import { ChevronRightIcon, DocumentTextIcon, PhotoIcon, VideoCameraIcon } from '@heroicons/react/24/solid';

interface SectionProps {
  section: UnitData;
  courseId: number;
  onStatusUpdate: (unitId: string, newStatus: ProgressStatus) => Promise<void>;
  level?: number;
}

export default function SectionComponent({ section, courseId, onStatusUpdate, level = 0 }: SectionProps) {
  const { id, title, description, text_content, image_url, video_url, status, exam, sub_units } = section;
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className={`mt-6 ${level > 0 ? 'pl-4 border-l-2 border-gray-200' : ''}`}>
      <div className="bg-white rounded-2xl shadow-sm">
        <div
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-full flex items-center justify-between p-6 text-left cursor-pointer"
        >
          <div className="flex items-center gap-3">
            <h3 className={`text-xl font-bold tracking-tight text-gray-900`}>{title}</h3>
            <StatusIcon status={status} />
            <div className="flex items-center gap-2 text-gray-400">
                {text_content && <DocumentTextIcon className="h-5 w-5" title="Text Content Available" />}
                {image_url && <VideoCameraIcon className="h-5 w-5" title="Image Available" />}
                {video_url && <PhotoIcon className="h-5 w-5" title="Video Available" />}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div onClick={(e) => e.stopPropagation()}><StatusUpdater onStatusSelect={(newStatus) => onStatusUpdate(id, newStatus)} /></div>
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
                {description && <div className="mt-4 prose prose-lg max-w-none text-gray-600" dangerouslySetInnerHTML={{ __html: description.replace(/\n/g, '<br />') }} />}
                {text_content && <div className="mt-4 prose prose-lg max-w-none" dangerouslySetInnerHTML={{ __html: text_content.replace(/\n/g, '<br />') }} />}
                
                {exam && exam.questions && (
                  <div className="mt-6">
                    <ExamComponent {...exam} />
                  </div>
                )}

                {sub_units?.map(subUnit => (
                  <SectionComponent key={subUnit.id} section={subUnit} courseId={courseId} onStatusUpdate={onStatusUpdate} level={level + 1} />
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}