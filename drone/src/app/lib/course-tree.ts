import type { UnitData } from '@/app/lib/types/course';

export interface FlatUnitNode {
    id: string;
    title: string;
    /** Top-level unit ref this node belongs to (for freemium gating). */
    rootUnitId: string;
    parentId: string | null;
    isLeaf: boolean;
    depth: number;
    path: string[];
}

/** Depth-first flatten of the unit tree for navigation and outlines. */
export function flattenCourseUnits(units: UnitData[] | undefined): FlatUnitNode[] {
    const out: FlatUnitNode[] = [];

    const walk = (nodes: UnitData[], rootId: string, parentId: string | null, path: string[], depth: number) => {
        for (const node of nodes) {
            const id = String(node.id);
            const nextPath = [...path, node.title];
            const children = node.sub_units ?? [];
            out.push({
                id,
                title: node.title,
                rootUnitId: rootId,
                parentId,
                isLeaf: children.length === 0,
                depth,
                path: nextPath,
            });
            if (children.length) {
                walk(children, rootId, id, nextPath, depth + 1);
            }
        }
    };

    for (const top of units ?? []) {
        const rootId = String(top.id);
        walk([top], rootId, null, [], 0);
    }
    return out;
}

/** Top-level units own pages; every descendant is focused within its root page. */
export function hasOwnPage(node: FlatUnitNode): boolean {
    return node.depth === 0;
}

/**
 * Resolve the canonical page for a node. Descendants stay inside their
 * top-level unit so the complete lesson context remains visible.
 */
export function unitPageTarget(
    units: UnitData[] | undefined,
    unitId: string,
): { pageUnitId: string; focusUnitId: string | null } {
    const node = flattenCourseUnits(units).find((n) => n.id === String(unitId));
    if (node && !hasOwnPage(node)) {
        return { pageUnitId: node.rootUnitId, focusUnitId: node.id };
    }
    return { pageUnitId: String(unitId), focusUnitId: null };
}

/** Ancestor chain (top-level unit first, immediate parent last) for a unit id. */
export function unitAncestors(units: UnitData[] | undefined, unitId: string): FlatUnitNode[] {
    const flat = flattenCourseUnits(units);
    const byId = new Map(flat.map((n) => [n.id, n]));
    const chain: FlatUnitNode[] = [];
    let current = byId.get(String(unitId));
    while (current?.parentId) {
        const parent = byId.get(current.parentId);
        if (!parent) break;
        chain.unshift(parent);
        current = parent;
    }
    return chain;
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
    const sequence = flattenCourseUnits(units);
    const idx = sequence.findIndex((n) => n.id === String(currentId));
    if (idx < 0) return { prev: null, next: null };
    return {
        prev: idx > 0 ? sequence[idx - 1] : null,
        next: idx < sequence.length - 1 ? sequence[idx + 1] : null,
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
