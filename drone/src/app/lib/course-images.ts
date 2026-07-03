/**
 * Returns the deduped, trimmed image gallery for a course or unit node.
 */
export function mergeCourseImages(node?: {
    images_url?: string[] | null;
}): string[] {
    const urls: string[] = [];
    if (node?.images_url?.length) {
        for (const u of node.images_url) {
            if (typeof u === 'string' && u.trim()) urls.push(u.trim());
        }
    }
    return [...new Set(urls)];
}
