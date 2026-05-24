'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { UnitData, ProgressStatus } from '@/app/lib/types/course';
import StatusIcon from './status-icon';
import StatusUpdater from './status-updater';
import { ChevronRightIcon, DocumentTextIcon, PhotoIcon, VideoCameraIcon } from '@heroicons/react/24/solid';
import VideoComponent from './video';
import { getUnitMedia } from '@/app/lib/api-client';
import { mergeCourseImages } from '@/app/lib/course-images';
import CourseImageStrip from './course-image-strip';
import ExamPlayer from './exam-player';

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

export default function SectionComponent({
  section,
  courseId,
  onStatusUpdate,
  level = 0,
}: SectionProps) {
  const { id, title, description, text_content, video_url, status, sub_units } = section;
  const sectionImages = mergeCourseImages(section);
  const [isExpanded, setIsExpanded] = useState(false);
  const [signedVideoUrl, setSignedVideoUrl] = useState<string | null>(null);
  const [videoLoading, setVideoLoading] = useState(false);

  const needsSigning = isCourseVideo(video_url);
  const subUnitScopeId = typeof id === 'string' ? parseInt(id, 10) : id;
  const isLeaf = !sub_units || sub_units.length === 0;

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
    <div className={`mt-4 ${level > 0 ? 'pl-4 border-l-2 border-[var(--surface-border)]' : ''}`}>
      <div className="border border-[var(--surface-border)] bg-[var(--surface)]" style={{ borderRadius: 'var(--radius-md)' }}>
        <div
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-full flex items-center justify-between p-5 text-left cursor-pointer"
        >
          <div className="flex items-center gap-3">
            <h3 className="text-lg font-display font-semibold tracking-tight text-[var(--brand-foreground)]">{title}</h3>
            <StatusIcon status={status} />
            <div className="flex items-center gap-2 text-[var(--brand-muted)]">
                {text_content && <DocumentTextIcon className="h-4 w-4" title="Text Content Available" />}
                {sectionImages.length > 0 && <PhotoIcon className="h-4 w-4" title="Images Available" />}
                {video_url && <VideoCameraIcon className="h-4 w-4" title="Video Available" />}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div onClick={(e) => e.stopPropagation()}><StatusUpdater onStatusSelect={(newStatus) => onStatusUpdate(id, newStatus)} /></div>
            <ChevronRightIcon className={`h-5 w-5 text-[var(--brand-muted)] transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
          </div>
        </div>

        <AnimatePresence initial={false}>
          {isExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
              className="overflow-hidden"
            >
              <div className="px-5 pb-5 border-t border-[var(--surface-border)]">
                {description && <div className="mt-4 prose prose-invert prose-sm max-w-none text-[var(--brand-muted)]" dangerouslySetInnerHTML={{ __html: description.replace(/\n/g, '<br />') }} />}
                <div className="my-6 space-y-6">
                    {sectionImages.length > 0 && (
                        <CourseImageStrip images={sectionImages} alt={title} />
                    )}
                    {videoLoading && (
                      <div className="flex items-center justify-center h-64 bg-[var(--brand-black)]" style={{ borderRadius: 'var(--radius-sm)' }}>
                        <div className="animate-spin h-8 w-8 border-2 border-[var(--brand-primary)] border-t-transparent" style={{ borderRadius: '50%' }} />
                      </div>
                    )}
                    {!videoLoading && resolvedVideoUrl && <VideoComponent src={resolvedVideoUrl} />}
                </div>
                {text_content && <div className="mt-4 prose prose-invert prose-sm max-w-none text-[var(--brand-muted)]" dangerouslySetInnerHTML={{ __html: text_content.replace(/\n/g, '<br />') }} />}

                {sub_units?.map((subUnit) => (
                  <SectionComponent
                    key={subUnit.id}
                    section={subUnit}
                    courseId={courseId}
                    onStatusUpdate={onStatusUpdate}
                    level={level + 1}
                  />
                ))}

                {isLeaf && !Number.isNaN(subUnitScopeId) && (
                  <ExamPlayer
                    courseId={courseId}
                    scope="sub_unit"
                    scopeId={subUnitScopeId}
                    label={title}
                    questionCount={15}
                  />
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
