import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import { CourseUnit } from './types/course-unit.entity';
import { FlatCourseUnit } from './course-unit.util';

/**
 * Manages the derived course_units index table.
 * Rows are fully rebuilt from the course payload on every save — the payload
 * is the authoring source of truth; this table exists so questions, exams,
 * and progress can reference stable string refs relationally.
 */
@Injectable()
export class CourseUnitService {
  constructor(
    @InjectRepository(CourseUnit)
    private courseUnitRepository: Repository<CourseUnit>,
  ) {}

  /**
   * Replaces all course_units rows for a course with the given flattened tree.
   * Runs inside the provided transaction manager when supplied.
   */
  async rebuild(
    courseId: number,
    flat: FlatCourseUnit[],
    manager?: EntityManager,
  ): Promise<void> {
    const repo = manager
      ? manager.getRepository(CourseUnit)
      : this.courseUnitRepository;

    await repo.delete({ course_id: courseId });
    if (flat.length === 0) return;

    const rows = flat.map((f) =>
      repo.create({
        course_id: courseId,
        ref: f.ref,
        parent_ref: f.parentRef,
        legacy_id: f.legacyId,
        path: f.path,
        depth: f.depth,
        position: f.position,
        title: f.title.slice(0, 512),
      }),
    );
    await repo.save(rows);
  }

  async findByCourse(courseId: number): Promise<CourseUnit[]> {
    return this.courseUnitRepository.find({
      where: { course_id: courseId },
      order: { depth: 'ASC', position: 'ASC' },
    });
  }

  /** Set of valid refs for a course — used to validate question/exam links. */
  async refSet(courseId: number): Promise<Set<string>> {
    const units = await this.findByCourse(courseId);
    return new Set(units.map((u) => u.ref));
  }

  /** Map of ref → top-level unit ref (root segment of the materialized path). */
  async rootRefMap(courseId: number): Promise<Map<string, string>> {
    const units = await this.findByCourse(courseId);
    return new Map(units.map((u) => [u.ref, u.path.split('/')[0]]));
  }

  /** Map of ref → title, for enriching exam section breakdowns. */
  async titleMap(courseId: number): Promise<Map<string, string>> {
    const units = await this.findByCourse(courseId);
    return new Map(units.map((u) => [u.ref, u.title]));
  }
}
