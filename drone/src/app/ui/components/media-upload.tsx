'use client';

import { useRef, useState } from 'react';
import { uploadMedia } from '@/app/lib/api-client';
import { ArrowUpTrayIcon, XMarkIcon } from '@heroicons/react/24/solid';

export interface MediaUploadResult {
    publicUrl: string;
    key: string;
}

interface MediaUploadProps {
    folder: 'articles' | 'courses';
    subfolder?: string;
    onUploadComplete: (publicUrl: string, key: string) => void;
    /** When set, user can pick multiple files; all are uploaded sequentially. */
    multiple?: boolean;
    /** Prefer this when `multiple` is true so the parent can add many URLs in one update. */
    onUploadBatchComplete?: (results: MediaUploadResult[]) => void;
    accept?: string;
    label?: string;
}

export default function MediaUpload({
    folder,
    subfolder,
    onUploadComplete,
    onUploadBatchComplete,
    multiple,
    accept,
    label = 'Upload Media',
}: MediaUploadProps) {
    const [uploading, setUploading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [progress, setProgress] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files || []);
        if (files.length === 0) return;

        setUploading(true);
        setError(null);

        try {
            if (files.length === 1) {
                const file = files[0];
                setProgress(`Uploading ${file.name}...`);
                const { publicUrl, key } = await uploadMedia(file, folder, subfolder);
                onUploadComplete(publicUrl, key);
                setProgress(null);
            } else if (onUploadBatchComplete) {
                const results: MediaUploadResult[] = [];
                for (let i = 0; i < files.length; i++) {
                    const file = files[i];
                    setProgress(`Uploading ${i + 1} / ${files.length}: ${file.name}...`);
                    const { publicUrl, key } = await uploadMedia(file, folder, subfolder);
                    results.push({ publicUrl, key });
                }
                onUploadBatchComplete(results);
                setProgress(null);
            } else {
                for (let i = 0; i < files.length; i++) {
                    const file = files[i];
                    setProgress(`Uploading ${i + 1} / ${files.length}: ${file.name}...`);
                    const { publicUrl, key } = await uploadMedia(file, folder, subfolder);
                    onUploadComplete(publicUrl, key);
                }
                setProgress(null);
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Upload failed');
        } finally {
            setUploading(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    return (
        <div className="space-y-2">
            <label className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-[var(--background)] bg-[var(--brand-primary)] rounded-lg cursor-pointer hover:opacity-90 transition-colors w-fit disabled:opacity-50 disabled:cursor-not-allowed">
                <ArrowUpTrayIcon className="h-4 w-4" />
                {uploading ? 'Uploading...' : label}
                <input
                    ref={fileInputRef}
                    type="file"
                    accept={accept || 'image/*,video/*'}
                    multiple={multiple}
                    onChange={handleFileSelect}
                    disabled={uploading}
                    className="hidden"
                />
            </label>
            {progress && <p className="text-sm text-[var(--brand-primary)]">{progress}</p>}
            {error && (
                <div className="flex items-center gap-2 text-sm text-red-600">
                    <span>{error}</span>
                    <button onClick={() => setError(null)}><XMarkIcon className="h-4 w-4" /></button>
                </div>
            )}
        </div>
    );
}
