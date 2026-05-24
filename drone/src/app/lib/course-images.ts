/**
 * Normalizes course/unit image fields: prefers `images_url`, merges legacy `image_url`.
 */
export function mergeCourseImages(node?: {
    images_url?: string[] | null;
    image_url?: string | null;
}): string[] {
    const urls: string[] = [];
    if (node?.images_url?.length) {
        for (const u of node.images_url) {
            if (typeof u === 'string' && u.trim()) urls.push(u.trim());
        }
    }
    if (node?.image_url && typeof node.image_url === 'string' && node.image_url.trim()) {
        urls.push(node.image_url.trim());
    }
    return [...new Set(urls)];
}
