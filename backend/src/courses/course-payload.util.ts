import { CourseDetails, UnitData } from './types/course.dto';

type ImageFields = {
    image_url?: string;
    images_url?: string[];
};

/**
 * Merges legacy `image_url` into `images_url`, dedupes, and removes `image_url`.
 * Call after parsing course JSON from DB or request body so the API surface is consistent.
 */
export function migrateCoursePayloadImages(detail: CourseDetails): void {
    mergeNodeImages(detail as CourseDetails & ImageFields);
    if (detail.units?.length) {
        for (const u of detail.units) {
            walkUnit(u);
        }
    }
}

function walkUnit(unit: UnitData): void {
    mergeNodeImages(unit as UnitData & ImageFields);
    if (unit.sub_units?.length) {
        for (const s of unit.sub_units) {
            walkUnit(s);
        }
    }
}

function mergeNodeImages(node: ImageFields): void {
    const urls: string[] = [];
    if (Array.isArray(node.images_url)) {
        for (const u of node.images_url) {
            if (typeof u === 'string' && u.trim()) urls.push(u.trim());
        }
    }
    if (node.image_url && typeof node.image_url === 'string' && node.image_url.trim()) {
        urls.push(node.image_url.trim());
    }
    delete node.image_url;
    if (urls.length > 0) {
        node.images_url = [...new Set(urls)];
    } else {
        delete node.images_url;
    }
}
