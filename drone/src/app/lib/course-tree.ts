import type { UnitData } from '@/app/lib/types/course';

export interface FlatUnitNode {
    id: string;
    title: string;
    /** Top-level unit ref this node belongs to (for freemium gating). */
    rootUnitId: string;
    depth: number;
    path: string[];
}

/** Depth-first flatten of the unit tree for navigation and outlines. */
export function flattenCourseUnits(units: UnitData[] | undefined): FlatUnitNode[] {
    const out: FlatUnitNode[] = [];

    const walk = (nodes: UnitData[], rootId: string, path: string[], depth: number) => {
        for (const node of nodes) {
            const id = String(node.id);
            const nextPath = [...path, node.title];
            out.push({ id, title: node.title, rootUnitId: rootId, depth, path: nextPath });
            if (node.sub_units?.length) {
                walk(node.sub_units, rootId, nextPath, depth + 1);
            }
        }
    };

    for (const top of units ?? []) {
        const rootId = String(top.id);
        walk([top], rootId, [], 0);
    }
    return out;
}

export function findUnitInTree(units: UnitData[] | undefined, unitId: string): UnitData | undefined {
    const want = String(unitId);
    if (!units?.length) return undefined;
    for (const u of units) {
        if (String(u.id) === want) return u;
        const nested = findUnitInTree(u.sub_units, want);
        if (nested) return nested;
    }
    return undefined;
}

export function unitNavNeighbors(
    units: UnitData[] | undefined,
    currentId: string,
): { prev: FlatUnitNode | null; next: FlatUnitNode | null } {
    const flat = flattenCourseUnits(units);
    const idx = flat.findIndex((n) => n.id === String(currentId));
    if (idx < 0) return { prev: null, next: null };
    return {
        prev: idx > 0 ? flat[idx - 1] : null,
        next: idx < flat.length - 1 ? flat[idx + 1] : null,
    };
}

/** True when this unit or any ancestor is marked free_preview. */
export function isUnitPreviewAccessible(
    units: UnitData[] | undefined,
    unitId: string,
): boolean {
    const want = String(unitId);

    const walk = (nodes: UnitData[], inPreviewBranch: boolean): boolean => {
        for (const node of nodes) {
            const preview = inPreviewBranch || node.free_preview === true;
            if (String(node.id) === want) return preview;
            if (node.sub_units?.length && walk(node.sub_units, preview)) return true;
        }
        return false;
    };

    return walk(units ?? [], false);
}
