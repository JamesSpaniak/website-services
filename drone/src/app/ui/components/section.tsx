'use client';

import { useState, useEffect, useCallback, useRef, useId } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { UnitData, ProgressStatus, QuestionCounts } from '@/app/lib/types/course';
import StatusIcon from './status-icon';
import StatusUpdater from './status-updater';
import { ChevronRightIcon, DocumentTextIcon, PhotoIcon, VideoCameraIcon } from '@heroicons/react/24/solid';
import VideoComponent from './video';
import { getUnitMedia } from '@/app/lib/api-client';
import { mergeCourseImages } from '@/app/lib/course-images';
import CourseImageStrip from './course-image-strip';
import ExamPlayer from './exam-player';
import { PROSE_COMPACT } from '@/app/lib/prose-classes';
import { findUnitInTree } from '@/app/lib/course-tree';
import { hasScopedQuestions } from './unit';

interface SectionProps {
  section: UnitData;
  courseId: number;
  onStatusUpdate: (unitId: string, newStatus: ProgressStatus) => Promise<void>;
  level?: number;
  /** Section id to auto-expand and scroll to. */
  focusUnitId?: string | null;
  /** Question-bank counts per ref — hides exam CTAs for empty scopes. */
  questionCounts?: QuestionCounts;
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
  focusUnitId,
  questionCounts,
}: SectionProps) {
  const { id, title, description, text_content, video_url, status, sub_units } = section;
  const sectionImages = mergeCourseImages(section);
  const isFocused = focusUnitId != null && String(id) === String(focusUnitId);
  const containsFocus =
    focusUnitId != null && !isFocused && findUnitInTree(sub_units, focusUnitId) != null;
  const [isExpanded, setIsExpanded] = useState(isFocused || containsFocus);
  const containerRef = useRef<HTMLDivElement>(null);
  const [signedVideoUrl, setSignedVideoUrl] = useState<string | null>(null);
  const [videoLoading, setVideoLoading] = useState(false);
  const bodyId = useId();
  // Keep heading levels meaningful for screen readers: unit h1 → "Sections" h2 → h3, nested deeper → h4…h6.
  const HeadingTag = `h${Math.min(level + 3, 6)}` as 'h3' | 'h4' | 'h5' | 'h6';

  useEffect(() => {
    if (isFocused || containsFocus) setIsExpanded(true);
    if (isFocused) {
      containerRef.current?.focus({ preventScroll: true });
      containerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [isFocused, containsFocus]);

  const needsSigning = isCourseVideo(video_url);
  const subUnitScopeRef = String(id);
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
    <div ref={containerRef} tabIndex={-1} className={`mt-4 scroll-mt-24 outline-none ${level > 0 ? 'pl-4 border-l-2 border-[var(--surface-border)]' : ''}`}>
      <div
        className={`border bg-[var(--surface)] ${isFocused ? 'border-[var(--brand-primary)]' : 'border-[var(--surface-border)]'}`}
        style={{ borderRadius: 'var(--radius-md)' }}
      >
        <div className="flex items-stretch">
          <HeadingTag className="flex-1 min-w-0 m-0 text-lg font-display font-semibold tracking-tight text-[var(--brand-foreground)]">
            <button
              type="button"
              onClick={() => setIsExpanded(!isExpanded)}
              aria-expanded={isExpanded}
              aria-controls={bodyId}
              className="flex w-full min-w-0 items-center gap-3 p-5 text-left cursor-pointer hover:bg-[var(--background)]/40 transition-colors"
              style={{ borderRadius: 'var(--radius-md) 0 0 var(--radius-md)' }}
            >
              <span className="min-w-0 truncate">{title}</span>
              <StatusIcon status={status} />
              <span className="flex items-center gap-2 text-[var(--brand-muted)] font-normal">
                  {text_content && (
                    <>
                      <DocumentTextIcon className="h-4 w-4" aria-hidden />
                      <span className="sr-only">Includes reading</span>
                    </>
                  )}
                  {sectionImages.length > 0 && (
                    <>
                      <PhotoIcon className="h-4 w-4" aria-hidden />
                      <span className="sr-only">Includes images</span>
                    </>
                  )}
                  {video_url && (
                    <>
                      <VideoCameraIcon className="h-4 w-4" aria-hidden />
                      <span className="sr-only">Includes video</span>
                    </>
                  )}
              </span>
              <ChevronRightIcon
                className={`ml-auto h-5 w-5 shrink-0 text-[var(--brand-muted)] font-normal transition-transform ${isExpanded ? 'rotate-90' : ''}`}
                aria-hidden
              />
            </button>
          </HeadingTag>
          <div className="flex items-center shrink-0 pr-4 pl-1">
            <StatusUpdater onStatusSelect={(newStatus) => onStatusUpdate(id, newStatus)} />
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
              <div id={bodyId} className="px-5 pb-5 border-t border-[var(--surface-border)]">
                {description && <div className={`mt-4 ${PROSE_COMPACT}`} dangerouslySetInnerHTML={{ __html: description.replace(/\n/g, '<br />') }} />}
                <div className="my-6 space-y-6">
                    {sectionImages.length > 0 && (
                        <CourseImageStrip images={sectionImages} alt={title} />
                    )}
                    {videoLoading && (
                      <div role="status" className="flex items-center justify-center h-64 bg-[var(--brand-black)]" style={{ borderRadius: 'var(--radius-sm)' }}>
                        <div className="animate-spin h-8 w-8 border-2 border-[var(--brand-primary)] border-t-transparent" style={{ borderRadius: '50%' }} aria-hidden />
                        <span className="sr-only">Loading video…</span>
                      </div>
                    )}
                    {!videoLoading && resolvedVideoUrl && <VideoComponent src={resolvedVideoUrl} title={title} />}
                </div>
                {text_content && <div className={`mt-4 ${PROSE_COMPACT}`} dangerouslySetInnerHTML={{ __html: text_content.replace(/\n/g, '<br />') }} />}

                {sub_units?.map((subUnit) => (
                  <SectionComponent
                    key={subUnit.id}
                    section={subUnit}
                    courseId={courseId}
                    onStatusUpdate={onStatusUpdate}
                    level={level + 1}
                    focusUnitId={focusUnitId}
                    questionCounts={questionCounts}
                  />
                ))}

                {isLeaf && hasScopedQuestions(questionCounts?.sub_unit, subUnitScopeRef) && (
                  <ExamPlayer
                    courseId={courseId}
                    scope="sub_unit"
                    scopeRef={subUnitScopeRef}
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
