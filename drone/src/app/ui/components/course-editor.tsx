'use client';

import { useState } from 'react';
import { CourseData, UnitData } from '@/app/lib/types/course';
import { createCourse, updateCourse } from '@/app/lib/api-client';
import MediaUpload from './media-upload';
import { PlusIcon, TrashIcon } from '@heroicons/react/24/solid';
import { v4 as uuidv4 } from 'uuid';

interface CourseEditorProps {
    course?: CourseData;
    onSave: (course: CourseData) => void;
    onCancel: () => void;
}

export default function CourseEditor({ course, onSave, onCancel }: CourseEditorProps) {
    const [title, setTitle] = useState(course?.title || '');
    const [subTitle, setSubTitle] = useState(course?.sub_title || '');
    const [description, setDescription] = useState(course?.description || '');
    const [textContent, setTextContent] = useState(course?.text_content || '');
    const [imageUrl, setImageUrl] = useState(course?.image_url || '');
    const [videoUrl, setVideoUrl] = useState(course?.video_url || '');
    const [price, setPrice] = useState(course?.price ?? 0);
    const [units, setUnits] = useState<UnitData[]>(course?.units || []);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [editMode, setEditMode] = useState<'visual' | 'json'>('visual');
    const [jsonPayload, setJsonPayload] = useState('');

    const buildCourseData = (): CourseData => ({
        id: course?.id || 0,
        title,
        sub_title: subTitle,
        description,
        text_content: textContent || undefined,
        image_url: imageUrl || undefined,
        video_url: videoUrl || undefined,
        price,
        has_access: course?.has_access ?? true,
        units,
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
        setJsonPayload(JSON.stringify(buildCourseData(), null, 2));
        setEditMode('json');
    };

    const switchToVisual = () => {
        try {
            const parsed = JSON.parse(jsonPayload);
            setTitle(parsed.title || '');
            setSubTitle(parsed.sub_title || '');
            setDescription(parsed.description || '');
            setTextContent(parsed.text_content || '');
            setImageUrl(parsed.image_url || '');
            setVideoUrl(parsed.video_url || '');
            setPrice(parsed.price ?? 0);
            setUnits(parsed.units || []);
            setEditMode('visual');
        } catch {
            setError('Invalid JSON. Fix the JSON before switching to visual mode.');
        }
    };

    const addUnit = () => {
        setUnits([...units, { id: uuidv4(), title: '', status: undefined }]);
    };

    const updateUnit = (index: number, updates: Partial<UnitData>) => {
        const newUnits = [...units];
        newUnits[index] = { ...newUnits[index], ...updates };
        setUnits(newUnits);
    };

    const removeUnit = (index: number) => {
        setUnits(units.filter((_, i) => i !== index));
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-6 max-w-4xl">
            <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-gray-900">
                    {course?.id ? 'Edit Course' : 'New Course'}
                </h2>
                <div className="flex gap-2">
                    <button type="button" onClick={editMode === 'visual' ? switchToJson : switchToVisual}
                        className="px-3 py-1.5 text-sm rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200">
                        Switch to {editMode === 'visual' ? 'JSON' : 'Visual'} Editor
                    </button>
                </div>
            </div>

            {error && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{error}</div>
            )}

            {editMode === 'json' ? (
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Course JSON Payload</label>
                    <textarea value={jsonPayload} onChange={(e) => setJsonPayload(e.target.value)} rows={30}
                        className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 font-mono text-sm" />
                    <p className="mt-2 text-xs text-gray-500">
                        You can upload media files and paste the returned URLs into this JSON.
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
                            <label className="block text-sm font-medium text-gray-700">Title</label>
                            <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} required
                                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Subtitle</label>
                            <input type="text" value={subTitle} onChange={(e) => setSubTitle(e.target.value)}
                                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500" />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700">Description</label>
                        <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3}
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500" />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700">Text Content (HTML)</label>
                        <textarea value={textContent} onChange={(e) => setTextContent(e.target.value)} rows={4}
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 font-mono text-sm" />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Hero Image</label>
                            <div className="mt-1 flex items-center gap-2">
                                <input type="text" value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} placeholder="Image URL"
                                    className="flex-1 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500" />
                                <MediaUpload folder="courses" subfolder={course?.id ? String(course.id) : undefined}
                                    accept="image/*" label="Upload" onUploadComplete={(url) => setImageUrl(url)} />
                            </div>
                            {imageUrl && <img src={imageUrl} alt="Preview" className="mt-2 max-h-32 rounded object-contain" />}
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Video URL</label>
                            <div className="mt-1 flex items-center gap-2">
                                <input type="text" value={videoUrl} onChange={(e) => setVideoUrl(e.target.value)} placeholder="Video URL"
                                    className="flex-1 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500" />
                                <MediaUpload folder="courses" subfolder={course?.id ? String(course.id) : undefined}
                                    accept="video/*" label="Upload" onUploadComplete={(url) => setVideoUrl(url)} />
                            </div>
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700">Price</label>
                        <input type="number" value={price} onChange={(e) => setPrice(Number(e.target.value))} min={0} step={0.01}
                            className="mt-1 block w-32 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500" />
                    </div>

                    <div className="border-t pt-6">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-semibold text-gray-900">Units</h3>
                            <button type="button" onClick={addUnit}
                                className="flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700">
                                <PlusIcon className="h-4 w-4" /> Add Unit
                            </button>
                        </div>

                        {units.map((unit, index) => (
                            <UnitEditor
                                key={unit.id}
                                unit={unit}
                                index={index}
                                courseId={course?.id}
                                onUpdate={(updates) => updateUnit(index, updates)}
                                onRemove={() => removeUnit(index)}
                            />
                        ))}
                    </div>
                </>
            )}

            <div className="flex gap-3 pt-4 border-t">
                <button type="submit" disabled={saving}
                    className="px-6 py-2.5 text-sm font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50">
                    {saving ? 'Saving...' : (course?.id ? 'Update Course' : 'Create Course')}
                </button>
                <button type="button" onClick={onCancel}
                    className="px-6 py-2.5 text-sm font-semibold text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50">
                    Cancel
                </button>
            </div>
        </form>
    );
}

function UnitEditor({ unit, index, courseId, onUpdate, onRemove }: {
    unit: UnitData;
    index: number;
    courseId?: number;
    onUpdate: (updates: Partial<UnitData>) => void;
    onRemove: () => void;
}) {
    const [expanded, setExpanded] = useState(false);

    return (
        <div className="mb-4 border border-gray-200 rounded-lg bg-gray-50">
            <div className="flex items-center justify-between p-4 cursor-pointer" onClick={() => setExpanded(!expanded)}>
                <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-500">#{index + 1}</span>
                    <span className="font-medium text-gray-900">{unit.title || 'Untitled Unit'}</span>
                </div>
                <div className="flex items-center gap-2">
                    <button type="button" onClick={(e) => { e.stopPropagation(); onRemove(); }}
                        className="p-1 text-red-400 hover:text-red-600">
                        <TrashIcon className="h-4 w-4" />
                    </button>
                </div>
            </div>

            {expanded && (
                <div className="px-4 pb-4 space-y-3 border-t">
                    <div className="pt-3">
                        <label className="block text-xs font-medium text-gray-500">Title</label>
                        <input type="text" value={unit.title} onChange={(e) => onUpdate({ title: e.target.value })}
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm" />
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-gray-500">Description</label>
                        <textarea value={unit.description || ''} onChange={(e) => onUpdate({ description: e.target.value })} rows={2}
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm" />
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-gray-500">Text Content (HTML)</label>
                        <textarea value={unit.text_content || ''} onChange={(e) => onUpdate({ text_content: e.target.value })} rows={3}
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm font-mono" />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-xs font-medium text-gray-500">Image URL</label>
                            <div className="mt-1 flex gap-2">
                                <input type="text" value={unit.image_url || ''} onChange={(e) => onUpdate({ image_url: e.target.value })}
                                    className="flex-1 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm" />
                                <MediaUpload folder="courses" subfolder={courseId ? `${courseId}/${unit.id}` : undefined}
                                    accept="image/*" label="Upload" onUploadComplete={(url) => onUpdate({ image_url: url })} />
                            </div>
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-gray-500">Video URL</label>
                            <div className="mt-1 flex gap-2">
                                <input type="text" value={unit.video_url || ''} onChange={(e) => onUpdate({ video_url: e.target.value })}
                                    className="flex-1 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm" />
                                <MediaUpload folder="courses" subfolder={courseId ? `${courseId}/${unit.id}` : undefined}
                                    accept="video/*" label="Upload" onUploadComplete={(url) => onUpdate({ video_url: url })} />
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
