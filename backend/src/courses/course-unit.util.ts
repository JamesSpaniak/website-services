import { BadRequestException } from '@nestjs/common';
import { CourseDetails, UnitData } from './types/course.dto';

/**
 * Flattened representation of one node in the course unit tree.
 * Produced by normalizeAndFlattenUnits and written to course_units.
 */
export interface FlatCourseUnit {
  ref: string;
  parentRef: string | null;
  legacyId: number | null;
  path: string;
  depth: number;
  position: number;
  title: string;
}

const MAX_REF_LENGTH = 64;

/**
 * Converts a payload unit id to its canonical string ref.
 *
 * Legacy payloads store numeric ids (1, 11, 101 …); those map
 * deterministically to `u{n}` so re-uploading the same JSON always produces
 * the same refs and existing question/exam links stay valid. String ids are
 * kept as-is (trimmed).
 */
export function toUnitRef(id: string | number): string {
  if (typeof id === 'number') {
    if (!Number.isInteger(id) || id < 0) {
      throw new BadRequestException(`Invalid numeric unit id: ${id}`);
    }
    return `u${id}`;
  }
  const trimmed = String(id).trim();
  if (!trimmed) {
    throw new BadRequestException('Unit id must not be empty');
  }
  // A purely numeric string is a legacy id in string form — normalize it the
  // same way as a number so "101" and 101 produce the same ref.
  if (/^\d+$/.test(trimmed)) {
    return `u${trimmed}`;
  }
  if (trimmed.length > MAX_REF_LENGTH) {
    throw new BadRequestException(
      `Unit id "${trimmed.slice(0, 32)}…" exceeds ${MAX_REF_LENGTH} characters`,
    );
  }
  return trimmed;
}

/** Extracts the legacy numeric payload id from an id/ref, when derivable. */
export function legacyIdFromRef(id: string | number): number | null {
  if (typeof id === 'number') return Number.isInteger(id) ? id : null;
  const trimmed = String(id).trim();
  const m = /^u?(\d+)$/.exec(trimmed);
  return m ? parseInt(m[1], 10) : null;
}

/**
 * Normalizes every unit id in the payload to its canonical string ref
 * (mutating the payload in place) and returns the flattened tree.
 *
 * Throws 400 when two nodes resolve to the same ref — the collision the old
 * numeric scheme could not detect (e.g. unit 11 vs unit 1 section 1).
 */
export function normalizeAndFlattenUnits(
  payload: Pick<CourseDetails, 'units'>,
): FlatCourseUnit[] {
  const flat: FlatCourseUnit[] = [];
  const seen = new Set<string>();

  const walk = (
    units: UnitData[] | undefined,
    parentRef: string | null,
    parentPath: string,
    depth: number,
  ): void => {
    if (!units?.length) return;
    units.forEach((unit, position) => {
      const legacyId = legacyIdFromRef(unit.id);
      const ref = toUnitRef(unit.id);
      if (seen.has(ref)) {
        throw new BadRequestException(
          `Duplicate unit id "${ref}" in course payload — unit ids must be unique across the whole course tree`,
        );
      }
      seen.add(ref);
      unit.id = ref;

      const path = parentPath ? `${parentPath}/${ref}` : ref;
      flat.push({
        ref,
        parentRef,
        legacyId,
        path,
        depth,
        position,
        title: unit.title ?? '',
      });
      walk(unit.sub_units, ref, path, depth + 1);
    });
  };

  walk(payload.units, null, '', 0);
  return flat;
}
