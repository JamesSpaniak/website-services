'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ChevronDownIcon, ChevronRightIcon, LockClosedIcon } from '@heroicons/react/24/outline';
import type { UnitData } from '@/app/lib/types/course';
import StatusIcon from './status-icon';
import { isUnitPreviewAccessible, unitAncestors } from '@/app/lib/course-tree';
import { unitPath } from '@/app/lib/auth-redirect';

const STORAGE_PREFIX = 'course_outline_expanded_';

interface CourseOutlineSidebarProps {
    courseId: number;
    units: UnitData[] | undefined;
    hasAccess: boolean;
    activeUnitId?: string;
}

/** Ids that must be expanded so `activeUnitId` is visible in the tree. */
function ancestorIdsToReveal(units: UnitData[] | undefined, activeUnitId?: string): string[] {
    if (!activeUnitId || !units?.length) return [];
    return unitAncestors(units, activeUnitId).map((a) => a.id);
}

function OutlineNode({
    node,
    courseId,
    depth,
    rootUnitId,
    hasAccess,
    allUnits,
    activeUnitId,
    expanded,
    onToggle,
}: {
    node: UnitData;
    courseId: number;
    depth: number;
    rootUnitId: string;
    hasAccess: boolean;
    allUnits: UnitData[];
    activeUnitId?: string;
    expanded: Record<string, boolean>;
    onToggle: (id: string) => void;
}) {
    const id = String(node.id);
    const children = node.sub_units ?? [];
    const hasChildren = children.length > 0;
    const isOpen = expanded[id] ?? depth === 0;
    const href =
        depth === 0
            ? unitPath(courseId, rootUnitId)
            : unitPath(courseId, rootUnitId, id);
    const isActive = activeUnitId === id;
    const locked = !hasAccess && !isUnitPreviewAccessible(allUnits, id);

    return (
        <li>
            <div
                className={`flex items-stretch rounded-md ${isActive ? 'bg-[var(--brand-primary)]/10' : 'hover:bg-[var(--background)]/60'}`}
                style={{ paddingLeft: `${depth * 0.75}rem` }}
            >
                {hasChildren ? (
                    <button
                        type="button"
                        onClick={() => onToggle(id)}
                        aria-expanded={isOpen}
                        className="flex items-center justify-center w-8 shrink-0 text-[var(--brand-muted)] hover:text-[var(--brand-foreground)] touch-manipulation"
                        aria-label={isOpen ? `Collapse ${node.title}` : `Expand ${node.title}`}
                    >
                        {isOpen ? (
                            <ChevronDownIcon className="h-3.5 w-3.5" aria-hidden />
                        ) : (
                            <ChevronRightIcon className="h-3.5 w-3.5" aria-hidden />
                        )}
                    </button>
                ) : (
                    <span className="w-8 shrink-0" aria-hidden />
                )}
                <Link
                    href={href}
                    aria-current={isActive ? 'page' : undefined}
                    className="flex flex-1 min-w-0 items-center gap-2 min-h-[40px] py-2 pr-2 text-sm text-[var(--brand-foreground)] touch-manipulation"
                >
                    <StatusIcon status={node.status} />
                    <span className="truncate">{node.title}</span>
                    {locked && (
                        <>
                            <LockClosedIcon className="h-3.5 w-3.5 shrink-0 text-[var(--brand-muted)]" aria-hidden />
                            <span className="sr-only">(locked, requires purchase)</span>
                        </>
                    )}
                </Link>
            </div>
            {hasChildren && isOpen && (
                <ul className="mt-0.5 space-y-0.5">
                    {children.map((child) => (
                        <OutlineNode
                            key={child.id}
                            node={child}
                            courseId={courseId}
                            depth={depth + 1}
                            rootUnitId={rootUnitId}
                            hasAccess={hasAccess}
                            allUnits={allUnits}
                            activeUnitId={activeUnitId}
                            expanded={expanded}
                            onToggle={onToggle}
                        />
                    ))}
                </ul>
            )}
        </li>
    );
}

export default function CourseOutlineSidebar({
    courseId,
    units,
    hasAccess,
    activeUnitId,
}: CourseOutlineSidebarProps) {
    const storageKey = `${STORAGE_PREFIX}${courseId}`;
    const [expanded, setExpanded] = useState<Record<string, boolean>>({});
    const [hydrated, setHydrated] = useState(false);

    const revealIds = useMemo(
        () => ancestorIdsToReveal(units, activeUnitId),
        [units, activeUnitId],
    );

    useEffect(() => {
        let stored: Record<string, boolean> = {};
        try {
            const raw = sessionStorage.getItem(storageKey);
            if (raw) stored = JSON.parse(raw) as Record<string, boolean>;
        } catch {
            /* ignore */
        }
        // Keep the active path open so deep focus links stay findable in the outline.
        const next = { ...stored };
        for (const id of revealIds) next[id] = true;
        setExpanded(next);
        setHydrated(true);
        // Only re-hydrate from storage when the course changes — path reveal runs below.
        // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional: storage once per course
    }, [storageKey]);

    useEffect(() => {
        if (!hydrated || revealIds.length === 0) return;
        setExpanded((prev) => {
            let changed = false;
            const next = { ...prev };
            for (const id of revealIds) {
                if (!next[id]) {
                    next[id] = true;
                    changed = true;
                }
            }
            if (!changed) return prev;
            try {
                sessionStorage.setItem(storageKey, JSON.stringify(next));
            } catch {
                /* ignore */
            }
            return next;
        });
    }, [hydrated, revealIds, storageKey]);

    const persist = useCallback(
        (next: Record<string, boolean>) => {
            setExpanded(next);
            try {
                sessionStorage.setItem(storageKey, JSON.stringify(next));
            } catch {
                /* ignore */
            }
        },
        [storageKey],
    );

    const onToggle = (id: string) => {
        persist({ ...expanded, [id]: !expanded[id] });
    };

    if (!units?.length) return null;

    return (
        <nav aria-label="Course outline" className="p-4 border border-[var(--surface-border)] bg-[var(--surface)]" style={{ borderRadius: 'var(--radius-md)' }}>
            <h2 className="text-sm font-display font-semibold text-[var(--brand-foreground)] mb-3">Outline</h2>
            <ul className="space-y-0.5">
                {units.map((unit) => (
                    <OutlineNode
                        key={unit.id}
                        node={unit}
                        courseId={courseId}
                        depth={0}
                        rootUnitId={String(unit.id)}
                        hasAccess={hasAccess}
                        allUnits={units}
                        activeUnitId={activeUnitId}
                        expanded={expanded}
                        onToggle={onToggle}
                    />
                ))}
            </ul>
        </nav>
    );
}
