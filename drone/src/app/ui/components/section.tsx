'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { UnitData, ProgressStatus } from '@/app/lib/types/course';
import StatusIcon from './status-icon';
import StatusUpdater from './status-updater';
import ExamComponent from './exam';
import { ChevronRightIcon, DocumentTextIcon, PhotoIcon, VideoCameraIcon } from '@heroicons/react/24/solid';
import ImageComponent from './image';
import VideoComponent from './video';
import { getUnitMedia } from '@/app/lib/api-client';

interface SectionProps {
  section: UnitData;
  courseId: number;
  onStatusUpdate: (unitId: string, newStatus: ProgressStatus) => Promise<void>;
  level?: number;
}

function isCourseVideo(url?: string): boolean {
  if (!url) return false;
  return url.includes('courses/videos/') || url.endsWith('.m3u8');
}

export default function SectionComponent({ section, courseId, onStatusUpdate, level = 0 }: SectionProps) {
  const { id, title, description, text_content, image_url, video_url, status, exam, sub_units } = section;
  const [isExpanded, setIsExpanded] = useState(false);
  const [signedVideoUrl, setSignedVideoUrl] = useState<string | null>(null);
  const [videoLoading, setVideoLoading] = useState(false);

  const needsSigning = isCourseVideo(video_url);

  const fetchSignedUrl = useCallback(async () => {
    if (!needsSigning || signedVideoUrl) return;
    setVideoLoading(true);
    try {
      const { video_url: signed } = await getUnitMedia(courseId, String(id));
      setSignedVideoUrl(signed || null);
    } catch {
      setSignedVideoUrl(null);
    } finally {
      setVideoLoading(false);
    }
  }, [courseId, id, needsSigning, signedVideoUrl]);

  useEffect(() => {
    if (isExpanded && needsSigning) {
      fetchSignedUrl();
    }
  }, [isExpanded, needsSigning, fetchSignedUrl]);

  const resolvedVideoUrl = needsSigning ? signedVideoUrl : video_url;

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
                <div className="my-6 space-y-6">
                    {image_url && <ImageComponent src={image_url} alt={title} width={800} height={450} className="w-full rounded-xl" />}
                    {videoLoading && (
                      <div className="flex items-center justify-center h-64 bg-gray-100 rounded-xl">
                        <div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full" />
                      </div>
                    )}
                    {!videoLoading && resolvedVideoUrl && <VideoComponent src={resolvedVideoUrl} />}
                </div>
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