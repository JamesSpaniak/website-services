import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import JsonLd, { courseJsonLd, faqPageJsonLd } from '@/app/ui/components/json-ld';
import CoursePreviewActions from '@/app/ui/components/course-preview-actions';
import { mergeCourseImages } from '@/app/lib/course-images';
import type { CourseData } from '@/app/lib/types/course';
import ImageComponent from '@/app/ui/components/image';

const API_BASE =
  process.env.API_INTERNAL_BASE_URL ??
  process.env.NEXT_PUBLIC_API_BASE_URL ??
  'http://localhost:3000';

const FAA_FAQ = [
  {
    question: 'What is included in the free preview?',
    answer: 'Unit 1 of the FAA Part 107 course is free. You can read the material, track progress, and try section practice questions without purchasing.',
  },
  {
    question: 'How much does full access cost?',
    answer: 'Full lifetime access to the Part 107 course is a one-time $129 purchase. There is no subscription.',
  },
  {
    question: 'Does this replace the FAA knowledge test?',
    answer: 'This course prepares you for the FAA Part 107 remote pilot knowledge test. You must still schedule and pass the official FAA exam at an authorized testing center.',
  },
  {
    question: 'How many practice questions are included?',
    answer: 'The course includes hundreds of ACS-aligned practice questions with unit, section, and full-course exams.',
  },
];

async function fetchPublicCourse(id: number): Promise<CourseData | null> {
  try {
    const res = await fetch(`${API_BASE}/courses/${id}/public`, {
      headers: { 'Content-Type': 'application/json' },
      next: { revalidate: 3600 },
    });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ courseId: string }>;
}): Promise<Metadata> {
  const { courseId } = await params;
  const course = await fetchPublicCourse(parseInt(courseId, 10));
  if (!course) return { title: 'Course not found' };
  return {
    title: `${course.title} — Drone Edge`,
    description: course.description || course.sub_title,
    openGraph: {
      title: `${course.title} — Drone Edge`,
      description: course.description || course.sub_title,
    },
  };
}

export default async function CoursePreviewPage({
  params,
}: {
  params: Promise<{ courseId: string }>;
}) {
  const { courseId } = await params;
  const id = parseInt(courseId, 10);
  const course = await fetchPublicCourse(id);
  if (!course) notFound();

  const price = Number(course.price) || 0;
  const hero = mergeCourseImages(course)[0];
  const unitCount = course.units?.length ?? 0;
  const heroPosition = course.image_focal_point?.trim() || 'center';

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <JsonLd data={courseJsonLd(course)} />
      <JsonLd data={faqPageJsonLd(FAA_FAQ)} />

      {hero && (
        <div className="relative aspect-video w-full overflow-hidden mb-8" style={{ borderRadius: 'var(--radius-md)' }}>
          <ImageComponent
            src={hero}
            alt={course.title}
            fill
            className="object-cover"
            style={{ objectPosition: heroPosition }}
            sizes="(max-width: 896px) 100vw, 896px"
          />
        </div>
      )}

      <p className="font-mono text-xs tracking-widest text-[var(--brand-primary)] uppercase mb-2">Course</p>
      <h1 className="text-3xl sm:text-4xl font-display font-semibold text-[var(--brand-foreground)]">{course.title}</h1>
      {course.sub_title && <p className="mt-2 text-lg text-[var(--brand-muted)]">{course.sub_title}</p>}

      {course.description && (
        <p className="mt-6 text-[var(--brand-muted)] leading-relaxed">{course.description}</p>
      )}

      <div className="mt-8 flex flex-wrap gap-3 text-sm">
        <span className="px-3 py-1 border border-[var(--surface-border)] font-mono text-[var(--brand-muted)]" style={{ borderRadius: 'var(--radius-sm)' }}>
          {unitCount} units
        </span>
        {price > 0 && (
          <span className="px-3 py-1 border border-[var(--brand-primary)]/40 bg-[var(--brand-primary)]/10 font-mono text-[var(--brand-foreground)]" style={{ borderRadius: 'var(--radius-sm)' }}>
            ${price} · Unit 1 free
          </span>
        )}
      </div>

      <section id="purchase" className="mt-10 p-6 border border-[var(--surface-border)] bg-[var(--surface)]" style={{ borderRadius: 'var(--radius-md)' }}>
        <h2 className="text-xl font-display font-semibold text-[var(--brand-foreground)]">Start learning</h2>
        <CoursePreviewActions courseId={id} price={price} />
        <div className="mt-4">
          <Link
            href="/courses"
            className="text-sm text-[var(--brand-muted)] hover:text-[var(--brand-primary)] transition-colors"
          >
            ← All courses
          </Link>
        </div>
      </section>

      {course.units && course.units.length > 0 && (
        <section className="mt-12">
          <h2 className="text-lg font-display font-semibold text-[var(--brand-foreground)] mb-4">Course outline</h2>
          <ol className="space-y-2">
            {course.units.map((unit, idx) => (
              <li
                key={unit.id}
                className="flex items-center gap-3 p-3 border border-[var(--surface-border)] bg-[var(--surface)] text-sm"
                style={{ borderRadius: 'var(--radius-sm)' }}
              >
                <span className="font-mono text-xs text-[var(--brand-muted)] w-6">{idx + 1}</span>
                <span className="text-[var(--brand-foreground)]">{unit.title}</span>
                {unit.free_preview && (
                  <span className="ml-auto text-xs text-[var(--brand-primary)]">Free preview</span>
                )}
              </li>
            ))}
          </ol>
        </section>
      )}

      <section className="mt-12">
        <h2 className="text-lg font-display font-semibold text-[var(--brand-foreground)] mb-4">FAQ</h2>
        <dl className="space-y-4">
          {FAA_FAQ.map(({ question, answer }) => (
            <div key={question} className="border border-[var(--surface-border)] p-4" style={{ borderRadius: 'var(--radius-sm)' }}>
              <dt className="font-medium text-[var(--brand-foreground)]">{question}</dt>
              <dd className="mt-2 text-sm text-[var(--brand-muted)] leading-relaxed">{answer}</dd>
            </div>
          ))}
        </dl>
      </section>
    </div>
  );
}
