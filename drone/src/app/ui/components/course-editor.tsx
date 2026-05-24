'use client';

import { useState, useEffect, useRef } from 'react';
import { CourseData, UnitData } from '@/app/lib/types/course';
import { createCourse, updateCourse } from '@/app/lib/api-client';
import MediaUpload from './media-upload';
import { PlusIcon, TrashIcon } from '@heroicons/react/24/solid';
import { v4 as uuidv4 } from 'uuid';
import { mergeCourseImages } from '@/app/lib/course-images';

interface CourseEditorProps {
    course?: CourseData;
    onSave: (course: CourseData) => void;
    onCancel: () => void;
}

function unitIdEq(a: UnitData['id'], b: UnitData['id']): boolean {
    return String(a) === String(b);
}

function updateUnitInTree(units: UnitData[], id: string, updates: Partial<UnitData>): UnitData[] {
    return units.map((u) => {
        if (unitIdEq(u.id, id)) return { ...u, ...updates };
        if (u.sub_units?.length) {
            return { ...u, sub_units: updateUnitInTree(u.sub_units, id, updates) };
        }
        return u;
    });
}

function removeUnitById(units: UnitData[], id: string): UnitData[] {
    return units
        .filter((u) => !unitIdEq(u.id, id))
        .map((u) =>
            u.sub_units?.length ? { ...u, sub_units: removeUnitById(u.sub_units, id) } : u,
        );
}

function trimImageUrls(urls: string[]): string[] | undefined {
    const t = urls.map((s) => s.trim()).filter(Boolean);
    return t.length ? t : undefined;
}

/** Row model for the image list: preserves empty strings while editing; API gets trimmed URLs via sanitizeUnitForSave. */
function getImageRowsForUnit(unit: UnitData): string[] {
    if (Array.isArray(unit.images_url)) {
        return unit.images_url.length > 0 ? unit.images_url : [''];
    }
    const merged = mergeCourseImages(unit);
    return merged.length > 0 ? merged : [''];
}

function sanitizeUnitForSave(u: UnitData): UnitData {
    const images_url = u.images_url?.length ? trimImageUrls(u.images_url) : undefined;
    return {
        ...u,
        images_url,
        sub_units: u.sub_units?.length ? u.sub_units.map(sanitizeUnitForSave) : u.sub_units,
    };
}

/** Full payload baseline for JSON ↔ visual: keeps API-only fields (e.g. status) across mode switches. */
function courseJsonBaseline(course?: CourseData): Record<string, unknown> {
    if (!course) return {};
    return { ...(course as unknown as Record<string, unknown>) };
}

export default function CourseEditor({ course, onSave, onCancel }: CourseEditorProps) {
    const [title, setTitle] = useState(course?.title || '');
    const [subTitle, setSubTitle] = useState(course?.sub_title || '');
    const [description, setDescription] = useState(course?.description || '');
    const [textContent, setTextContent] = useState(course?.text_content || '');
    const [heroImages, setHeroImages] = useState<string[]>(() => mergeCourseImages(course));
    const [videoUrl, setVideoUrl] = useState(course?.video_url || '');
    const [imageFocalPoint, setImageFocalPoint] = useState(course?.image_focal_point || '');
    const [price, setPrice] = useState(course?.price ?? 0);
    const [units, setUnits] = useState<UnitData[]>(course?.units || []);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [editMode, setEditMode] = useState<'visual' | 'json'>('visual');
    const [jsonPayload, setJsonPayload] = useState('');
    /** Last full course-shaped object from props or successful JSON parse; merged with buildCourseData() when opening JSON mode. */
    const jsonMergeBaseRef = useRef<Record<string, unknown>>(courseJsonBaseline(course));

    useEffect(() => {
        jsonMergeBaseRef.current = courseJsonBaseline(course);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [course?.id]);

    const buildCourseData = (): CourseData => ({
        id: course?.id || 0,
        title,
        sub_title: subTitle,
        description,
        text_content: textContent || undefined,
        images_url: trimImageUrls(heroImages),
        video_url: videoUrl || undefined,
        image_focal_point: imageFocalPoint.trim() || undefined,
        price,
        has_access: course?.has_access ?? true,
        units: units.map(sanitizeUnitForSave),
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        setError(null);

        try {
            let courseData: CourseData;
            if (editMode === 'json') {
                courseData = JSON.parse(jsonPayload);
            } else {
                courseData = buildCourseData();
            }

            let saved: CourseData;
            if (course?.id) {
                saved = await updateCourse(course.id, courseData);
            } else {
                saved = await createCourse(courseData);
            }
            onSave(saved);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to save course');
        } finally {
            setSaving(false);
        }
    };

    const switchToJson = () => {
        const built = buildCourseData();
        const merged: Record<string, unknown> = {
            ...(jsonMergeBaseRef.current ?? {}),
            ...(built as unknown as Record<string, unknown>),
            units: built.units,
        };
        jsonMergeBaseRef.current = merged;
        setJsonPayload(JSON.stringify(merged, null, 2));
        setEditMode('json');
    };

    const switchToVisual = () => {
        try {
            const parsed = JSON.parse(jsonPayload) as Record<string, unknown>;
            jsonMergeBaseRef.current = parsed;

            const str = (v: unknown, fallback = '') => (v == null || v === undefined ? fallback : String(v));

            setTitle(str(parsed.title));
            setSubTitle(str(parsed.sub_title));
            setDescription(str(parsed.description));
            setTextContent(str(parsed.text_content));
            setHeroImages(
                mergeCourseImages(parsed as { images_url?: string[]; image_url?: string }),
            );
            setVideoUrl(str(parsed.video_url));
            setImageFocalPoint(str(parsed.image_focal_point));

            const rawPrice = parsed.price;
            const n =
                typeof rawPrice === 'number'
                    ? rawPrice
                    : parseFloat(String(rawPrice ?? '').replace(/,/g, ''));
            setPrice(Number.isFinite(n) ? n : 0);

            setUnits(Array.isArray(parsed.units) ? (parsed.units as UnitData[]) : []);
            setError(null);
            setEditMode('visual');
        } catch {
            setError('Invalid JSON. Fix the JSON before switching to visual mode.');
        }
    };

    const addUnit = () => {
        setUnits([...units, { id: uuidv4(), title: '', status: undefined }]);
    };

    const updateUnitById = (id: string, updates: Partial<UnitData>) => {
        setUnits((prev) => updateUnitInTree(prev, id, updates));
    };

    const removeUnit = (id: string) => {
        setUnits((prev) => removeUnitById(prev, id));
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-6 max-w-4xl">
            <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-[var(--brand-foreground)]">
                    {course?.id ? 'Edit Course' : 'New Course'}
                </h2>
                <div className="flex gap-2">
                    <button type="button" onClick={editMode === 'visual' ? switchToJson : switchToVisual}
                        className="px-3 py-1.5 text-sm rounded-lg bg-[var(--comment-secondary-bg)] text-[var(--brand-foreground)] border border-[var(--surface-border)] hover:bg-[var(--surface-border)]">
                        Switch to {editMode === 'visual' ? 'JSON' : 'Visual'} Editor
                    </button>
                </div>
            </div>

            {error && (
                <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-lg text-red-600 text-sm">{error}</div>
            )}

            {editMode === 'json' ? (
                <div>
                    <label className="block text-sm font-medium text-[var(--brand-foreground)] mb-1">Course JSON Payload</label>
                    <textarea value={jsonPayload} onChange={(e) => setJsonPayload(e.target.value)} rows={30}
                        className="block w-full rounded-md border border-[var(--input-border)] bg-[var(--input-bg)] text-[var(--input-text)] shadow-sm focus:border-[var(--brand-primary)] focus:ring-[var(--brand-primary)] font-mono text-sm" />
                    <p className="mt-2 text-xs text-[var(--brand-muted)]">
                        You can upload media files and paste the returned URLs into this JSON. Use <code className="text-xs">images_url</code> (array of strings) for galleries.
                    </p>
                    <div className="mt-2">
                        <MediaUpload folder="courses" subfolder={course?.id ? String(course.id) : undefined}
                            onUploadComplete={(url) => navigator.clipboard.writeText(url)} label="Upload & Copy URL" />
                    </div>
                </div>
            ) : (
                <>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-[var(--brand-foreground)]">Title</label>
                            <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} required
                                className="mt-1 block w-full rounded-md border border-[var(--input-border)] bg-[var(--input-bg)] text-[var(--input-text)] shadow-sm focus:border-[var(--brand-primary)] focus:ring-[var(--brand-primary)]" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-[var(--brand-foreground)]">Subtitle</label>
                            <input type="text" value={subTitle} onChange={(e) => setSubTitle(e.target.value)}
                                className="mt-1 block w-full rounded-md border border-[var(--input-border)] bg-[var(--input-bg)] text-[var(--input-text)] shadow-sm focus:border-[var(--brand-primary)] focus:ring-[var(--brand-primary)]" />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-[var(--brand-foreground)]">Description</label>
                        <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3}
                            className="mt-1 block w-full rounded-md border border-[var(--input-border)] bg-[var(--input-bg)] text-[var(--input-text)] shadow-sm focus:border-[var(--brand-primary)] focus:ring-[var(--brand-primary)]" />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-[var(--brand-foreground)]">Text Content (HTML)</label>
                        <textarea value={textContent} onChange={(e) => setTextContent(e.target.value)} rows={4}
                            className="mt-1 block w-full rounded-md border border-[var(--input-border)] bg-[var(--input-bg)] text-[var(--input-text)] shadow-sm focus:border-[var(--brand-primary)] focus:ring-[var(--brand-primary)] font-mono text-sm" />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-[var(--brand-foreground)]">Hero images</label>
                            <p className="mt-0.5 text-xs text-[var(--brand-muted)]">Scroll gallery on the course page. Add multiple URLs or upload.</p>
                            <ImagesListField
                                urls={heroImages.length ? heroImages : ['']}
                                onChange={setHeroImages}
                                courseId={course?.id}
                                pathParts={[]}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-[var(--brand-foreground)]">Video URL</label>
                            <div className="mt-1 flex items-center gap-2">
                                <input type="text" value={videoUrl} onChange={(e) => setVideoUrl(e.target.value)} placeholder="Video URL"
                                    className="flex-1 rounded-md border border-[var(--input-border)] bg-[var(--input-bg)] text-[var(--input-text)] shadow-sm focus:border-[var(--brand-primary)] focus:ring-[var(--brand-primary)]" />
                                <MediaUpload folder="courses" subfolder={course?.id ? String(course.id) : undefined}
                                    accept="video/*" label="Upload" onUploadComplete={(url) => setVideoUrl(url)} />
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-[var(--brand-foreground)]">
                                Image Focal Point
                            </label>
                            <div className="mt-1 flex flex-wrap gap-2 items-center">
                                <input
                                    type="text"
                                    value={imageFocalPoint}
                                    onChange={(e) => setImageFocalPoint(e.target.value)}
                                    placeholder="center (default)"
                                    className="flex-1 min-w-[10rem] rounded-md border border-[var(--input-border)] bg-[var(--input-bg)] text-[var(--input-text)] shadow-sm focus:border-[var(--brand-primary)] focus:ring-[var(--brand-primary)] text-sm"
                                />
                                {(['center', 'top', 'bottom', 'center 25%', 'center 75%'] as const).map((preset) => (
                                    <button
                                        key={preset}
                                        type="button"
                                        onClick={() => setImageFocalPoint(preset)}
                                        className={`px-2 py-1 text-xs rounded border transition-colors ${
                                            imageFocalPoint === preset
                                                ? 'border-[var(--brand-primary)] text-[var(--brand-primary)] bg-[var(--brand-primary)]/8'
                                                : 'border-[var(--surface-border)] text-[var(--brand-muted)] hover:text-[var(--brand-foreground)]'
                                        }`}
                                    >
                                        {preset}
                                    </button>
                                ))}
                            </div>
                            <p className="mt-1 text-xs text-[var(--brand-muted)]">
                                Controls which part of the hero image stays in frame when cropped to 16:9. Applies to both the course page and preview cards.
                            </p>
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-[var(--brand-foreground)]">Price</label>
                        <input type="number" value={price} onChange={(e) => setPrice(Number(e.target.value))} min={0} step={0.01}
                            className="mt-1 block w-32 rounded-md border border-[var(--input-border)] bg-[var(--input-bg)] text-[var(--input-text)] shadow-sm focus:border-[var(--brand-primary)] focus:ring-[var(--brand-primary)]" />
                    </div>

                    <div className="border-t border-[var(--surface-border)] pt-6">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-semibold text-[var(--brand-foreground)]">Units</h3>
                            <button type="button" onClick={addUnit}
                                className="flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-[var(--background)] bg-[var(--brand-primary)] rounded-lg hover:opacity-90">
                                <PlusIcon className="h-4 w-4" /> Add Unit
                            </button>
                        </div>

                        {units.map((unit, index) => (
                            <UnitEditor
                                key={unit.id}
                                unit={unit}
                                index={index}
                                courseId={course?.id}
                                depth={0}
                                onUpdateById={updateUnitById}
                                onRemove={() => removeUnit(unit.id)}
                            />
                        ))}
                    </div>
                </>
            )}

            <div className="flex gap-3 pt-4 border-t border-[var(--surface-border)]">
                <button type="submit" disabled={saving}
                    className="px-6 py-2.5 text-sm font-semibold text-[var(--background)] bg-[var(--brand-primary)] rounded-lg hover:opacity-90 disabled:opacity-50">
                    {saving ? 'Saving...' : (course?.id ? 'Update Course' : 'Create Course')}
                </button>
                <button type="button" onClick={onCancel}
                    className="px-6 py-2.5 text-sm font-semibold text-[var(--brand-foreground)] bg-[var(--surface)] border border-[var(--surface-border)] rounded-lg hover:bg-[var(--comment-secondary-bg)]">
                    Cancel
                </button>
            </div>
        </form>
    );
}

function ImagesListField({
    urls,
    onChange,
    courseId,
    pathParts,
}: {
    urls: string[];
    onChange: (next: string[]) => void;
    courseId?: number;
    pathParts: string[];
}) {
    const subfolder = courseId && pathParts.length ? `${courseId}/${pathParts.join('/')}` : courseId ? String(courseId) : undefined;

    const rows = urls.length ? urls : [''];

    const removeAt = (i: number) => {
        const next = rows.filter((_, j) => j !== i);
        onChange(next);
    };

    return (
        <div className="mt-2 space-y-2">
            {rows.map((url, i) => (
                <div key={i} className="flex gap-2 items-start">
                    <input type="text" value={url} placeholder="Image URL"
                        onChange={(e) => {
                            const next = [...rows];
                            next[i] = e.target.value;
                            onChange(next);
                        }}
                        className="flex-1 rounded-md border border-[var(--input-border)] bg-[var(--input-bg)] text-[var(--input-text)] shadow-sm focus:border-[var(--brand-primary)] focus:ring-[var(--brand-primary)] text-sm" />
                    <MediaUpload
                        folder="courses"
                        subfolder={subfolder}
                        accept="image/*"
                        label="Upload"
                        multiple
                        onUploadComplete={(u) => {
                            const next = [...rows];
                            next[i] = u;
                            onChange(next);
                        }}
                        onUploadBatchComplete={(items) => {
                            const urls = items.map((r) => r.publicUrl);
                            const next = [...rows];
                            if (urls.length > 0) next[i] = urls[0];
                            for (let j = 1; j < urls.length; j++) next.push(urls[j]);
                            onChange(next);
                        }}
                    />
                    <button type="button" onClick={() => removeAt(i)} className="p-1.5 text-red-400 hover:text-red-600 shrink-0" aria-label="Remove image URL">
                        <TrashIcon className="h-4 w-4" />
                    </button>
                </div>
            ))}
            <button type="button" onClick={() => onChange([...rows, ''])}
                className="text-xs font-medium text-[var(--brand-primary)] hover:opacity-90">
                + Add another image
            </button>
        </div>
    );
}

function UnitEditor({
    unit,
    index,
    courseId,
    depth,
    onUpdateById,
    onRemove,
}: {
    unit: UnitData;
    index: number;
    courseId?: number;
    depth: number;
    onUpdateById: (id: string, updates: Partial<UnitData>) => void;
    onRemove: () => void;
}) {
    const [expanded, setExpanded] = useState(depth === 0);

    const imgs = getImageRowsForUnit(unit);
    const setImages = (next: string[]) => {
        const t = trimImageUrls(next);
        onUpdateById(unit.id, {
            images_url: t !== undefined ? next : undefined,
            image_url: undefined,
        });
    };

    return (
        <div className={`mb-4 border border-[var(--surface-border)] rounded-lg bg-[var(--comment-secondary-bg)] ${depth > 0 ? 'ml-3 border-dashed' : ''}`}>
            <div className="flex items-center justify-between p-4 cursor-pointer" onClick={() => setExpanded(!expanded)}>
                <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-[var(--brand-muted)]">
                        {depth > 0 ? '↳' : `#${index + 1}`}
                    </span>
                    <span className="font-medium text-[var(--brand-foreground)]">{unit.title || 'Untitled Unit'}</span>
                </div>
                <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                    {depth < 8 && (
                        <button
                            type="button"
                            onClick={() => {
                                const newSub: UnitData = { id: uuidv4(), title: '' };
                                onUpdateById(unit.id, {
                                    sub_units: [...(unit.sub_units || []), newSub],
                                });
                                setExpanded(true);
                            }}
                            className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-[var(--brand-primary)] border border-[var(--surface-border)] rounded-md hover:bg-[var(--background)]"
                            title="Add nested section"
                        >
                            <PlusIcon className="h-3.5 w-3.5" /> Sub-unit
                        </button>
                    )}
                    <button type="button" onClick={onRemove}
                        className="p-1 text-red-400 hover:text-red-600">
                        <TrashIcon className="h-4 w-4" />
                    </button>
                </div>
            </div>

            {expanded && (
                <div className="px-4 pb-4 space-y-3 border-t border-[var(--surface-border)]">
                    <div className="pt-3">
                        <label className="block text-xs font-medium text-[var(--brand-muted)]">Title</label>
                        <input type="text" value={unit.title} onChange={(e) => onUpdateById(unit.id, { title: e.target.value })}
                            className="mt-1 block w-full rounded-md border border-[var(--input-border)] bg-[var(--input-bg)] text-[var(--input-text)] shadow-sm focus:border-[var(--brand-primary)] focus:ring-[var(--brand-primary)] text-sm" />
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-[var(--brand-muted)]">Description</label>
                        <textarea value={unit.description || ''} onChange={(e) => onUpdateById(unit.id, { description: e.target.value })} rows={2}
                            className="mt-1 block w-full rounded-md border border-[var(--input-border)] bg-[var(--input-bg)] text-[var(--input-text)] shadow-sm focus:border-[var(--brand-primary)] focus:ring-[var(--brand-primary)] text-sm" />
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-[var(--brand-muted)]">Text Content (HTML)</label>
                        <textarea value={unit.text_content || ''} onChange={(e) => onUpdateById(unit.id, { text_content: e.target.value })} rows={3}
                            className="mt-1 block w-full rounded-md border border-[var(--input-border)] bg-[var(--input-bg)] text-[var(--input-text)] shadow-sm focus:border-[var(--brand-primary)] focus:ring-[var(--brand-primary)] text-sm font-mono" />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                            <label className="block text-xs font-medium text-[var(--brand-muted)]">Images</label>
                            <ImagesListField
                                urls={imgs.length ? imgs : ['']}
                                onChange={setImages}
                                courseId={courseId}
                                pathParts={[unit.id]}
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-[var(--brand-muted)]">Video URL</label>
                            <div className="mt-1 flex gap-2">
                                <input type="text" value={unit.video_url || ''} onChange={(e) => onUpdateById(unit.id, { video_url: e.target.value })}
                                    className="flex-1 rounded-md border border-[var(--input-border)] bg-[var(--input-bg)] text-[var(--input-text)] shadow-sm focus:border-[var(--brand-primary)] focus:ring-[var(--brand-primary)] text-sm" />
                                <MediaUpload folder="courses" subfolder={courseId ? `${courseId}/${unit.id}` : undefined}
                                    accept="video/*" label="Upload" onUploadComplete={(url) => onUpdateById(unit.id, { video_url: url })} />
                            </div>
                        </div>
                    </div>

                    {depth < 8 && (
                        <div className="pt-2 mt-3 space-y-2 border-t border-[var(--surface-border)]">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                                <p className="text-xs font-medium text-[var(--brand-muted)]">Nested sections (sub-units)</p>
                                <button
                                    type="button"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        const newSub: UnitData = { id: uuidv4(), title: '' };
                                        onUpdateById(unit.id, {
                                            sub_units: [...(unit.sub_units || []), newSub],
                                        });
                                    }}
                                    className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-[var(--background)] bg-[var(--brand-primary)] rounded-md hover:opacity-90"
                                >
                                    <PlusIcon className="h-3.5 w-3.5" /> Add sub-unit
                                </button>
                            </div>
                            {(unit.sub_units || []).length === 0 ? (
                                <p className="text-xs text-[var(--brand-muted)] py-1">No sub-units yet. Use Add sub-unit or the Sub-unit control in the row above.</p>
                            ) : (
                                unit.sub_units!.map((sub, si) => (
                                    <UnitEditor
                                        key={sub.id}
                                        unit={sub}
                                        index={si}
                                        courseId={courseId}
                                        depth={depth + 1}
                                        onUpdateById={onUpdateById}
                                        onRemove={() => {
                                            const nextSubs = unit.sub_units!.filter((s) => !unitIdEq(s.id, sub.id));
                                            onUpdateById(unit.id, { sub_units: nextSubs.length ? nextSubs : undefined });
                                        }}
                                    />
                                ))
                            )}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
