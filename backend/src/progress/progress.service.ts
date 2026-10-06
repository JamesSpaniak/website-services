import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import { Progress } from './types/progress.entity';
import { Course } from '../courses/types/course.entity';
import { CourseUnit } from '../courses/types/course-unit.entity';
import {
  CourseDetails,
  UnitData,
  ProgressStatus,
} from '../courses/types/course.dto';
import { redactUnitsForFreemium } from '../courses/course-access.util';
import { ExamScoreSnapshot } from '../questions/types/question.dto';
import type { ExamPool } from '../questions/types/exam.entity';
import { AuditService } from '../audit/audit.service';
import { AuditAction } from '../audit/types/audit-action.enum';
import { Trace } from 'src/common/tracing.decorator';
import { ProductEventsService } from '../product-events/product-events.service';

/**
 * Single owner of user course progress (merged from the former
 * CourseProgressService + ProgressService pair).
 *
 * Progress is stored as a compact `unit_statuses` map keyed by unit ref —
 * NOT as a copy of the course payload. The course payload is always read
 * fresh from `courses` and statuses are overlaid at request time, so course
 * restructuring can never orphan or reset a user's progress.
 */
/** PATCH unit response: the unit's status plus anything completed with it (PTD3). */
export type UnitProgressUpdate = UnitData & {
  /** Ancestor refs completed automatically because all their children are. */
  auto_completed: string[];
  /** Present when this write completed the whole course. */
  course_status?: ProgressStatus;
};

@Injectable()
export class ProgressService {
  constructor(
    @InjectRepository(Progress)
    private progressRepository: Repository<Progress>,
    @InjectRepository(Course)
    private courseRepository: Repository<Course>,
    @InjectRepository(CourseUnit)
    private courseUnitRepository: Repository<CourseUnit>,
    private auditService: AuditService,
    private productEvents: ProductEventsService,
  ) {}

  // ── Row lifecycle ────────────────────────────────────────────────────────

  /**
   * Returns the user's progress row, creating it on first touch. Creation is
   * `INSERT … ON CONFLICT DO NOTHING`, so parallel first requests (course page
   * + auto IN_PROGRESS + heartbeat) never 500 and `course_started` is recorded
   * exactly once — by whichever request actually inserted.
   */
  private async getOrCreateProgress(
    userId: number,
    courseId: number,
  ): Promise<Progress> {
    const existing = await this.progressRepository.findOne({
      where: { userId, courseId },
    });
    if (existing) return existing;

    const course = await this.courseRepository.findOne({
      where: { id: courseId },
    });
    if (!course) {
      throw new NotFoundException(`Course with ID ${courseId} not found`);
    }

    const unitsTotal = await this.courseUnitRepository.count({
      where: { course_id: courseId },
    });

    const result = await this.progressRepository
      .createQueryBuilder()
      .insert()
      .into(Progress)
      .values({
        userId,
        courseId,
        unit_statuses: {},
        unit_completed_at: {},
        status: ProgressStatus.NOT_STARTED,
        units_total: unitsTotal,
        units_completed: 0,
        last_activity_at: new Date(),
        completed_at: null,
      })
      .orIgnore()
      .returning(['id'])
      .execute();

    if ((result.raw as unknown[]).length > 0) {
      this.auditService.log(userId, AuditAction.COURSE_STARTED, { courseId });
      void this.productEvents.record({
        userId,
        event: 'course_started',
        courseId,
      });
    }
    return this.progressRepository.findOneOrFail({
      where: { userId, courseId },
    });
  }

  /**
   * Runs `fn` on the progress row under `SELECT … FOR UPDATE`, so concurrent
   * writes for the same user × course apply one after another instead of the
   * last read-modify-write silently erasing the other (R3).
   */
  private async withLockedProgress<T>(
    userId: number,
    courseId: number,
    fn: (progress: Progress, manager: EntityManager) => Promise<T>,
  ): Promise<T> {
    await this.getOrCreateProgress(userId, courseId);
    return this.progressRepository.manager.transaction(async (manager) => {
      const progress = await manager.getRepository(Progress).findOne({
        where: { userId, courseId },
        lock: { mode: 'pessimistic_write' },
      });
      if (!progress) {
        // Reset raced with this write.
        throw new NotFoundException(`No progress for course ${courseId}`);
      }
      return fn(progress, manager);
    });
  }

  /** Ensures a progress row exists before exam generate/submit (used by the exam API). */
  async ensureProgress(userId: number, courseId: number): Promise<Progress> {
    return this.getOrCreateProgress(userId, courseId);
  }

  // ── Reads ────────────────────────────────────────────────────────────────

  /**
   * Returns the full course payload with the user's progress overlaid.
   * When the user has no access, content fields are redacted at every depth
   * so the outline is browsable but the material is not.
   */
  @Trace()
  async getCourseWithProgress(
    userId: number,
    courseId: number,
    hasAccess: boolean,
  ): Promise<CourseDetails> {
    const course = await this.courseRepository.findOneBy({ id: courseId });
    if (!course) {
      throw new NotFoundException(`Course with ID ${courseId} not found`);
    }

    const payload: CourseDetails = JSON.parse(course.payload);
    payload.id = course.id;
    payload.price = course.price;
    payload.has_access = hasAccess;

    if (hasAccess) {
      const progress = await this.getOrCreateProgress(userId, courseId);
      this.applyStatuses(payload, progress);
      payload.exam_summary = this.buildExamSummary(progress.exam_scores);
    } else {
      this.applyStatuses(payload, null);
      redactUnitsForFreemium(payload.units);
    }

    return payload;
  }

  /**
   * All courses the user has progress on, as payloads with statuses overlaid.
   * Content fields are stripped — this feeds list views (profile page).
   */
  async getAllCoursesWithProgress(userId: number): Promise<CourseDetails[]> {
    const allProgress = await this.progressRepository.find({
      where: { userId },
    });
    if (allProgress.length === 0) return [];

    const results: CourseDetails[] = [];
    for (const progress of allProgress) {
      const course = await this.courseRepository.findOneBy({
        id: progress.courseId,
      });
      if (!course) continue;

      const payload: CourseDetails = JSON.parse(course.payload);
      payload.id = course.id;
      this.applyStatuses(payload, progress);
      this.redactContent(payload.units);
      results.push(payload);
    }
    return results;
  }

  // ── Writes ───────────────────────────────────────────────────────────────

  async updateCourseProgress(
    userId: number,
    courseId: number,
    status: ProgressStatus,
  ): Promise<{ status: ProgressStatus }> {
    const { wasCompleted, unitsTotal } = await this.withLockedProgress(
      userId,
      courseId,
      async (progress, manager) => {
        const wasCompleted = progress.status === ProgressStatus.COMPLETED;
        progress.status = status;
        await this.saveWithSummary(progress, manager);
        return { wasCompleted, unitsTotal: progress.units_total };
      },
    );

    if (status === ProgressStatus.COMPLETED && !wasCompleted) {
      this.auditService.log(userId, AuditAction.COURSE_COMPLETED, { courseId });
      void this.productEvents.record({
        userId,
        event: 'course_completed',
        courseId,
        properties: { units_total: unitsTotal },
      });
    }
    return { status };
  }

  /**
   * Sets one unit's status. `auto` writes (opening a lesson) only apply when
   * the unit has no status yet — a stale tab must never turn COMPLETED back
   * into IN_PROGRESS. Explicit writes (kebab menu) may still go backwards.
   */
  async updateUnitProgress(
    userId: number,
    courseId: number,
    unitRef: string,
    status: ProgressStatus,
    { auto = false }: { auto?: boolean } = {},
  ): Promise<UnitProgressUpdate> {
    const unit = await this.courseUnitRepository.findOne({
      where: { course_id: courseId, ref: unitRef },
    });
    if (!unit) {
      throw new NotFoundException(
        `Unit with ref "${unitRef}" not found in course ${courseId}`,
      );
    }

    const outcome = await this.withLockedProgress(
      userId,
      courseId,
      async (progress, manager) => {
        const statuses = { ...(progress.unit_statuses ?? {}) };
        const completedAt = { ...(progress.unit_completed_at ?? {}) };
        const previous = statuses[unitRef];
        if (auto && previous) {
          return {
            previous,
            status: previous,
            summary: null,
            autoCompleted: [] as CourseUnit[],
            courseCompleted: false,
          };
        }
        if (status === ProgressStatus.NOT_STARTED) {
          delete statuses[unitRef];
          delete completedAt[unitRef];
        } else {
          statuses[unitRef] = status;
          if (status === ProgressStatus.COMPLETED) {
            completedAt[unitRef] ??= new Date().toISOString();
          } else {
            delete completedAt[unitRef];
          }
        }
        const tree = await manager.getRepository(CourseUnit).find({
          where: { course_id: courseId },
          select: ['ref', 'parent_ref', 'depth', 'title'],
        });
        const autoCompleted =
          status === ProgressStatus.COMPLETED
            ? this.completeFinishedAncestors(
                unitRef,
                tree,
                statuses,
                completedAt,
              )
            : [];
        progress.unit_statuses = statuses;
        progress.unit_completed_at = completedAt;
        if (progress.status === ProgressStatus.NOT_STARTED) {
          progress.status = ProgressStatus.IN_PROGRESS;
        }
        // PTD3: every top-level unit complete → the course is complete.
        const topLevel = tree.filter((u) => !u.parent_ref);
        const courseCompleted =
          status === ProgressStatus.COMPLETED &&
          progress.status !== ProgressStatus.COMPLETED &&
          topLevel.length > 0 &&
          topLevel.every((u) => statuses[u.ref] === ProgressStatus.COMPLETED);
        if (courseCompleted) progress.status = ProgressStatus.COMPLETED;
        await this.saveWithSummary(progress, manager);
        return {
          previous,
          status,
          summary: {
            units_completed: progress.units_completed,
            units_total: progress.units_total,
          },
          autoCompleted,
          courseCompleted,
        };
      },
    );

    const summary = outcome.summary;
    const recordCompleted = (u: Pick<CourseUnit, 'ref' | 'depth'>) => {
      this.auditService.log(userId, AuditAction.UNIT_COMPLETED, {
        courseId,
        unitId: u.ref,
      });
      void this.productEvents.record({
        userId,
        event: u.depth === 0 ? 'unit_completed' : 'lesson_completed',
        courseId,
        unitRef: u.ref,
        properties: { depth: u.depth, ...summary },
      });
    };
    if (
      summary &&
      outcome.status === ProgressStatus.COMPLETED &&
      outcome.previous !== ProgressStatus.COMPLETED
    ) {
      recordCompleted(unit);
    }
    outcome.autoCompleted.forEach(recordCompleted);
    if (outcome.courseCompleted) {
      this.auditService.log(userId, AuditAction.COURSE_COMPLETED, { courseId });
      void this.productEvents.record({
        userId,
        event: 'course_completed',
        courseId,
        properties: { units_total: summary?.units_total, auto: true },
      });
    }
    return {
      id: unitRef,
      title: unit.title,
      status: outcome.status,
      auto_completed: outcome.autoCompleted.map((u) => u.ref),
      ...(outcome.courseCompleted && {
        course_status: ProgressStatus.COMPLETED,
      }),
    } as UnitProgressUpdate;
  }

  /**
   * PTD3: after `ref` is completed, walk up the tree and complete every
   * ancestor whose children are now all COMPLETED. Only ever adds ✓s — the
   * learner can still change any unit by hand. Mutates the maps; returns
   * the ancestors it completed (nearest first).
   */
  private completeFinishedAncestors(
    ref: string,
    tree: Pick<CourseUnit, 'ref' | 'parent_ref' | 'depth'>[],
    statuses: Record<string, ProgressStatus>,
    completedAt: Record<string, string>,
  ): Pick<CourseUnit, 'ref' | 'parent_ref' | 'depth'>[] {
    const byRef = new Map(tree.map((u) => [u.ref, u]));
    const done: Pick<CourseUnit, 'ref' | 'parent_ref' | 'depth'>[] = [];
    let parentRef = byRef.get(ref)?.parent_ref ?? null;
    while (parentRef) {
      const children = tree.filter((u) => u.parent_ref === parentRef);
      if (
        !children.every((c) => statuses[c.ref] === ProgressStatus.COMPLETED)
      ) {
        break;
      }
      const parent = byRef.get(parentRef);
      if (!parent) break;
      if (statuses[parentRef] !== ProgressStatus.COMPLETED) {
        statuses[parentRef] = ProgressStatus.COMPLETED;
        completedAt[parentRef] ??= new Date().toISOString();
        done.push(parent);
      }
      parentRef = parent.parent_ref;
    }
    return done;
  }

  /** Also clears the user's video state (PTD6) — a reset is a fresh start. */
  async resetAllProgress(userId: number): Promise<void> {
    await this.progressRepository.delete({ userId });
    await this.progressRepository.manager.query(
      `DELETE FROM video_progress WHERE user_id = $1`,
      [userId],
    );
  }

  /**
   * Fresh start on one course (PTD6): progress row and video state go; the
   * event history and exam attempts stay (they record what happened).
   */
  async resetCourseProgress(userId: number, courseId: number): Promise<void> {
    await this.progressRepository.delete({ userId, courseId });
    await this.progressRepository.manager.query(
      `DELETE FROM video_progress WHERE user_id = $1 AND course_id = $2`,
      [userId, courseId],
    );
    this.auditService.log(userId, AuditAction.PROGRESS_RESET, { courseId });
  }

  // ── Internal helpers ─────────────────────────────────────────────────────

  /**
   * Overlays statuses from the progress row onto the payload tree.
   * Pass null progress to initialize everything to NOT_STARTED.
   */
  private applyStatuses(
    payload: CourseDetails,
    progress: Progress | null,
  ): void {
    const statuses = progress?.unit_statuses ?? {};
    const walk = (units: UnitData[] | undefined): void => {
      if (!units?.length) return;
      for (const unit of units) {
        unit.status =
          (statuses[String(unit.id)] as ProgressStatus) ??
          ProgressStatus.NOT_STARTED;
        walk(unit.sub_units);
      }
    };
    walk(payload.units);
    payload.status =
      (progress?.status as ProgressStatus) ?? ProgressStatus.NOT_STARTED;
  }

  /** Strips course material at every depth (titles/descriptions stay). */
  private redactContent(units: UnitData[] | undefined): void {
    if (!units?.length) return;
    for (const unit of units) {
      unit.text_content = undefined;
      unit.video_url = undefined;
      this.redactContent(unit.sub_units);
    }
  }

  /**
   * Recomputes the summary columns from unit_statuses against the current
   * course tree, then persists. Stale refs (units removed from the course)
   * are excluded from the completed count.
   *
   * Note: latest_exam_score is deliberately NOT written here — the exam
   * submission path (ExamAttemptService) owns that column.
   */
  private async saveWithSummary(
    progress: Progress,
    manager?: EntityManager,
  ): Promise<void> {
    const unitRepo =
      manager?.getRepository(CourseUnit) ?? this.courseUnitRepository;
    const units = await unitRepo.find({
      where: { course_id: progress.courseId },
      select: ['ref'],
    });
    const validRefs = new Set(units.map((u) => u.ref));
    const statuses = progress.unit_statuses ?? {};

    progress.units_total = validRefs.size;
    progress.units_completed = Object.entries(statuses).filter(
      ([ref, status]) =>
        validRefs.has(ref) && status === ProgressStatus.COMPLETED,
    ).length;

    progress.last_activity_at = new Date();
    if (progress.status === ProgressStatus.COMPLETED) {
      progress.completed_at ??= new Date();
    } else {
      progress.completed_at = null;
    }

    await (manager?.getRepository(Progress) ?? this.progressRepository).save(
      progress,
    );
  }

  private buildExamSummary(
    examScores: ExamScoreSnapshot[] | null | undefined,
  ): CourseDetails['exam_summary'] {
    const scores = examScores ?? [];
    const latestForPool = (pool: ExamPool) => {
      const matching = scores.filter(
        (s) => s.scope === 'full_course' && s.exam_pool === pool,
      );
      if (matching.length === 0) return null;
      const best = matching.reduce((a, b) =>
        new Date(a.taken_at) > new Date(b.taken_at) ? a : b,
      );
      return { score: best.score, taken_at: best.taken_at };
    };
    return {
      practice: latestForPool('scoped'),
      final: latestForPool('final_only'),
    };
  }
}
