import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
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

/**
 * Single owner of user course progress (merged from the former
 * CourseProgressService + ProgressService pair).
 *
 * Progress is stored as a compact `unit_statuses` map keyed by unit ref —
 * NOT as a copy of the course payload. The course payload is always read
 * fresh from `courses` and statuses are overlaid at request time, so course
 * restructuring can never orphan or reset a user's progress.
 */
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
  ) {}

  // ── Row lifecycle ────────────────────────────────────────────────────────

  private async getOrCreateProgress(
    userId: number,
    courseId: number,
  ): Promise<Progress> {
    let progress = await this.progressRepository.findOne({
      where: { userId, courseId },
    });

    if (!progress) {
      const course = await this.courseRepository.findOne({
        where: { id: courseId },
      });
      if (!course) {
        throw new NotFoundException(`Course with ID ${courseId} not found`);
      }

      const unitsTotal = await this.courseUnitRepository.count({
        where: { course_id: courseId },
      });

      progress = this.progressRepository.create({
        userId,
        courseId,
        unit_statuses: {},
        status: ProgressStatus.NOT_STARTED,
        units_total: unitsTotal,
        units_completed: 0,
      });
      await this.progressRepository.save(progress);
      this.auditService.log(userId, AuditAction.COURSE_STARTED, { courseId });
    }
    return progress;
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
    const progress = await this.getOrCreateProgress(userId, courseId);
    progress.status = status;
    await this.saveWithSummary(progress);

    if (status === ProgressStatus.COMPLETED) {
      this.auditService.log(userId, AuditAction.COURSE_COMPLETED, { courseId });
    }
    return { status };
  }

  async updateUnitProgress(
    userId: number,
    courseId: number,
    unitRef: string,
    status: ProgressStatus,
  ): Promise<UnitData> {
    const unit = await this.courseUnitRepository.findOne({
      where: { course_id: courseId, ref: unitRef },
    });
    if (!unit) {
      throw new NotFoundException(
        `Unit with ref "${unitRef}" not found in course ${courseId}`,
      );
    }

    const progress = await this.getOrCreateProgress(userId, courseId);
    const statuses = { ...(progress.unit_statuses ?? {}) };
    if (status === ProgressStatus.NOT_STARTED) {
      delete statuses[unitRef];
    } else {
      statuses[unitRef] = status;
    }
    progress.unit_statuses = statuses;
    if (progress.status === ProgressStatus.NOT_STARTED) {
      progress.status = ProgressStatus.IN_PROGRESS;
    }
    await this.saveWithSummary(progress);

    if (status === ProgressStatus.COMPLETED) {
      this.auditService.log(userId, AuditAction.UNIT_COMPLETED, {
        courseId,
        unitId: unitRef,
      });
    }
    return { id: unitRef, title: unit.title, status } as UnitData;
  }

  async resetAllProgress(userId: number): Promise<void> {
    await this.progressRepository.delete({ userId });
  }

  async resetCourseProgress(userId: number, courseId: number): Promise<void> {
    await this.progressRepository.delete({ userId, courseId });
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
  private async saveWithSummary(progress: Progress): Promise<void> {
    const units = await this.courseUnitRepository.find({
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

    await this.progressRepository.save(progress);
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
