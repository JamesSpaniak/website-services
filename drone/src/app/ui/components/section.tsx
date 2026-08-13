'use client';

import { useState, useEffect, useRef, useId } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { UnitData, ProgressStatus, QuestionCounts } from '@/app/lib/types/course';
import StatusIcon from './status-icon';
import StatusUpdater from './status-updater';
import { ChevronRightIcon, DocumentTextIcon, PhotoIcon, VideoCameraIcon } from '@heroicons/react/24/solid';
import { mergeCourseImages } from '@/app/lib/course-images';
import CourseImageStrip from './course-image-strip';
import CourseUnitVideo from './course-unit-video';
import ExamPlayer from './exam-player';
import { PROSE_COMPACT } from '@/app/lib/prose-classes';
import { findUnitInTree } from '@/app/lib/course-tree';
import { hasScopedQuestions } from './unit';
import { unitPath } from '@/app/lib/auth-redirect';

interface SectionProps {
  section: UnitData;
  courseId: number;
  rootUnitId: string;
  onStatusUpdate: (unitId: string, newStatus: ProgressStatus) => Promise<void>;
  level?: number;
  /** Section id to auto-expand and scroll to. */
  focusUnitId?: string | null;
  /** Question-bank counts per ref — hides exam CTAs for empty scopes. */
  questionCounts?: QuestionCounts;
}

export default function SectionComponent({
  section,
  courseId,
  rootUnitId,
  onStatusUpdate,
  level = 0,
  focusUnitId,
  questionCounts,
}: SectionProps) {
  const router = useRouter();
  const { id, title, description, text_content, video_url, status, sub_units } = section;
  const sectionImages = mergeCourseImages(section);
  const isFocused = focusUnitId != null && String(id) === String(focusUnitId);
  const containsFocus =
    focusUnitId != null && !isFocused && findUnitInTree(sub_units, focusUnitId) != null;
  const [isExpanded, setIsExpanded] = useState(isFocused || containsFocus);
  const containerRef = useRef<HTMLDivElement>(null);
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

  const subUnitScopeRef = String(id);
  const isLeaf = !sub_units || sub_units.length === 0;
  const handleToggle = () => {
    const nextExpanded = !isExpanded;
    setIsExpanded(nextExpanded);

    if (nextExpanded) {
      router.push(unitPath(courseId, rootUnitId, String(id)), { scroll: false });
    } else if (isFocused || containsFocus) {
      router.replace(unitPath(courseId, rootUnitId), { scroll: false });
    }
  };

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
              onClick={handleToggle}
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
                    <CourseUnitVideo
                      courseId={courseId}
                      unitId={String(id)}
                      videoUrl={video_url}
                      title={title}
                    />
                </div>
                {text_content && <div className={`mt-4 ${PROSE_COMPACT}`} dangerouslySetInnerHTML={{ __html: text_content.replace(/\n/g, '<br />') }} />}

                {sub_units?.map((subUnit) => (
                  <SectionComponent
                    key={subUnit.id}
                    section={subUnit}
                    courseId={courseId}
                    rootUnitId={rootUnitId}
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
