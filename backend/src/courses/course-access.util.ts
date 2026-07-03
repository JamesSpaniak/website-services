import { NotFoundException } from '@nestjs/common';
import { CourseDetails, UnitData } from './types/course.dto';

/** True when the unit or any ancestor is marked free_preview. */
export function isUnitPreviewAccessible(
  units: UnitData[] | undefined,
  unitId: string,
): boolean {
    const want = String(unitId);

    const walk = (nodes: UnitData[], inPreviewBranch: boolean): boolean => {
      for (const node of nodes) {
        const preview = inPreviewBranch || node.free_preview === true;
        if (String(node.id) === want) return preview;
        if (node.sub_units?.length && walk(node.sub_units, preview)) {
          return true;
        }
      }
      return false;
    };

  return walk(units ?? [], false);
}

/** Marketing-safe payload: titles and structure only. */
export function stripCourseForPublic(payload: CourseDetails): CourseDetails {
    payload.text_content = undefined;
    payload.has_access = false;

    const walk = (units: UnitData[] | undefined): void => {
      if (!units?.length) return;
      for (const unit of units) {
        unit.text_content = undefined;
        unit.video_url = undefined;
        unit.status = undefined;
        unit.images_url = undefined;
        walk(unit.sub_units);
      }
    };
  walk(payload.units);
  return payload;
}

/** Partial redaction: keep material only on free_preview branches. */
export function redactUnitsForFreemium(units: UnitData[] | undefined): void {
    if (!units?.length) return;

    const walk = (nodes: UnitData[], inPreviewBranch: boolean): void => {
      for (const node of nodes) {
        const preview = inPreviewBranch || node.free_preview === true;
        if (!preview) {
          node.text_content = undefined;
          node.video_url = undefined;
          node.images_url = undefined;
        }
        if (node.sub_units?.length) {
          walk(node.sub_units, preview);
        }
      }
    };

  walk(units, false);
}

export function assertCourseExists<T>(
  course: T | null | undefined,
  courseId: number,
): asserts course is T {
  if (!course) {
    throw new NotFoundException(`Course with ID ${courseId} not found`);
  }
}
