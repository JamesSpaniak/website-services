'use client';

import { useRef, useState } from 'react';
import { uploadMedia } from '@/app/lib/api-client';
import { ArrowUpTrayIcon, XMarkIcon } from '@heroicons/react/24/solid';

interface MediaUploadProps {
    folder: 'articles' | 'courses';
    subfolder?: string;
    onUploadComplete: (publicUrl: string, key: string) => void;
    accept?: string;
    label?: string;
}

export default function MediaUpload({ folder, subfolder, onUploadComplete, accept, label = 'Upload Media' }: MediaUploadProps) {
    const [uploading, setUploading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [progress, setProgress] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setUploading(true);
        setError(null);
        setProgress(`Uploading ${file.name}...`);

        try {
            const { publicUrl, key } = await uploadMedia(file, folder, subfolder);
            onUploadComplete(publicUrl, key);
            setProgress(null);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Upload failed');
        } finally {
            setUploading(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    return (
        <div className="space-y-2">
            <label className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg cursor-pointer hover:bg-blue-700 transition-colors w-fit disabled:opacity-50 disabled:cursor-not-allowed">
                <ArrowUpTrayIcon className="h-4 w-4" />
                {uploading ? 'Uploading...' : label}
                <input
                    ref={fileInputRef}
                    type="file"
                    accept={accept || 'image/*,video/*'}
                    onChange={handleFileSelect}
                    disabled={uploading}
                    className="hidden"
                />
            </label>
            {progress && <p className="text-sm text-blue-600">{progress}</p>}
            {error && (
                <div className="flex items-center gap-2 text-sm text-red-600">
                    <span>{error}</span>
                    <button onClick={() => setError(null)}><XMarkIcon className="h-4 w-4" /></button>
                </div>
            )}
        </div>
    );
}
