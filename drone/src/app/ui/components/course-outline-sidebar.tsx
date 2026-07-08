'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { ChevronDownIcon, ChevronRightIcon, LockClosedIcon } from '@heroicons/react/24/outline';
import type { UnitData } from '@/app/lib/types/course';
import StatusIcon from './status-icon';
import { isUnitPreviewAccessible } from '@/app/lib/course-tree';
import { unitPath } from '@/app/lib/auth-redirect';

const STORAGE_PREFIX = 'course_outline_expanded_';

interface CourseOutlineSidebarProps {
    courseId: number;
    units: UnitData[] | undefined;
    hasAccess: boolean;
    activeUnitId?: string;
}

function OutlineNode({
    node,
    courseId,
    depth,
    parentId,
    hasAccess,
    allUnits,
    activeUnitId,
    expanded,
    onToggle,
}: {
    node: UnitData;
    courseId: number;
    depth: number;
    parentId: string | null;
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
    // Deep leaves render as sections inside their parent's page.
    const href =
        !hasChildren && depth > 0 && parentId
            ? unitPath(courseId, parentId, id)
            : unitPath(courseId, id);
    const isActive = activeUnitId === id;
    const locked = !hasAccess && !isUnitPreviewAccessible(allUnits, id);

    return (
        <li role="treeitem" aria-expanded={hasChildren ? isOpen : undefined}>
            <div
                className={`flex items-center gap-1 rounded-md ${isActive ? 'bg-[var(--brand-primary)]/10' : ''}`}
                style={{ paddingLeft: `${depth * 0.75}rem` }}
            >
                {hasChildren ? (
                    <button
                        type="button"
                        onClick={() => onToggle(id)}
                        className="p-1 text-[var(--brand-muted)] hover:text-[var(--brand-foreground)] shrink-0"
                        aria-label={isOpen ? `Collapse ${node.title}` : `Expand ${node.title}`}
                    >
                        {isOpen ? (
                            <ChevronDownIcon className="h-3.5 w-3.5" />
                        ) : (
                            <ChevronRightIcon className="h-3.5 w-3.5" />
                        )}
                    </button>
                ) : (
                    <span className="w-5 shrink-0" aria-hidden />
                )}
                <Link
                    href={href}
                    className="flex flex-1 min-w-0 items-center gap-2 py-1.5 pr-2 text-sm text-[var(--brand-foreground)] hover:opacity-90"
                >
                    <StatusIcon status={node.status} />
                    <span className="truncate">{node.title}</span>
                    {locked && <LockClosedIcon className="h-3.5 w-3.5 shrink-0 text-[var(--brand-muted)]" aria-label="Requires purchase" />}
                </Link>
            </div>
            {hasChildren && isOpen && (
                <ul role="group" className="mt-0.5 space-y-0.5">
                    {children.map((child) => (
                        <OutlineNode
                            key={child.id}
                            node={child}
                            courseId={courseId}
                            depth={depth + 1}
                            parentId={id}
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

    useEffect(() => {
        try {
            const raw = sessionStorage.getItem(storageKey);
            if (raw) setExpanded(JSON.parse(raw) as Record<string, boolean>);
        } catch {
            /* ignore */
        }
    }, [storageKey]);

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
            <ul role="tree" className="space-y-0.5">
                {units.map((unit) => (
                    <OutlineNode
                        key={unit.id}
                        node={unit}
                        courseId={courseId}
                        depth={0}
                        parentId={null}
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
