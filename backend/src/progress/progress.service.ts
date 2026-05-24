import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Progress } from './types/progress.entity';
import { Course } from '../courses/types/course.entity';
import {
  CourseDetails,
  UnitData,
  ProgressStatus,
} from '../courses/types/course.dto';
import { AuditService } from '../audit/audit.service';
import { AuditAction } from '../audit/types/audit-action.enum';
import { migrateCoursePayloadImages } from '../courses/course-payload.util';

@Injectable()
export class ProgressService {
  constructor(
    @InjectRepository(Progress)
    private progressRepository: Repository<Progress>,
    @InjectRepository(Course)
    private courseRepository: Repository<Course>,
    private auditService: AuditService,
  ) {}

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

      const coursePayload: CourseDetails = JSON.parse(course.payload);
      migrateCoursePayloadImages(coursePayload);
      this.initializeProgressPayload(coursePayload);

      const { unitsTotal, unitsCompleted, latestExamScore } = this.computeSummary(coursePayload);

      progress = this.progressRepository.create({
        userId,
        courseId,
        payload: coursePayload,
        status: coursePayload.status || ProgressStatus.NOT_STARTED,
        units_total: unitsTotal,
        units_completed: unitsCompleted,
        latest_exam_score: latestExamScore,
      });
      await this.progressRepository.save(progress);
      this.auditService.log(userId, AuditAction.COURSE_STARTED, { courseId });
    }
    return progress;
  }

  private findUnit(units: UnitData[], unitId: string): UnitData | null {
    for (const unit of units) {
      if (String(unit.id) === String(unitId)) {
        return unit;
      }
      if (unit.sub_units?.length) {
        const found = this.findUnit(unit.sub_units, unitId);
        if (found) return found;
      }
    }
    return null;
  }

  private initializeProgressPayload(payload: CourseDetails): void {
    const initialize = (units: UnitData[]) => {
      if (!units) return;
      units.forEach((unit: UnitData) => {
        unit.status = ProgressStatus.NOT_STARTED;
        if (unit.exam) {
          unit.exam.status = ProgressStatus.NOT_STARTED;
          unit.exam.retries_taken = 0;
          unit.exam.result = undefined;
          unit.exam.previous_results = [];
          this.stripAnswerKeys(unit.exam.questions);
        }
        unit.title = undefined;
        unit.description = undefined;
        unit.video_url = undefined;
        unit.images_url = undefined;
        unit.image_url = undefined;
        unit.text_content = undefined;
        if (unit.sub_units) {
          initialize(unit.sub_units);
        }
      });
    };
    initialize(payload.units);
    payload.status = ProgressStatus.NOT_STARTED;
    payload.title = undefined;
    payload.sub_title = undefined;
    payload.description = undefined;
    payload.video_url = undefined;
    payload.images_url = undefined;
    payload.image_url = undefined;
  }

  /**
   * Removes the `correct` flag from all answers so the answer key
   * is never stored in or served from the progress blob.
   */
  private stripAnswerKeys(questions: { answers: { correct?: boolean }[] }[]): void {
    if (!questions) return;
    for (const q of questions) {
      if (!q.answers) continue;
      for (const a of q.answers) {
        delete a.correct;
      }
    }
  }

  /**
   * Walks the unit tree and computes summary stats from the blob.
   * Called after any mutation so summary columns stay in sync.
   */
  private computeSummary(payload: CourseDetails): {
    unitsTotal: number;
    unitsCompleted: number;
    latestExamScore: number | null;
  } {
    let unitsTotal = 0;
    let unitsCompleted = 0;
    let latestExamScore: number | null = null;

    const walk = (units: UnitData[]) => {
      if (!units) return;
      for (const unit of units) {
        unitsTotal++;
        if (unit.status === ProgressStatus.COMPLETED) unitsCompleted++;
        if (unit.exam?.result?.score !== undefined) {
          latestExamScore = unit.exam.result.score;
        }
        if (unit.sub_units) walk(unit.sub_units);
      }
    };
    walk(payload.units);

    return { unitsTotal, unitsCompleted, latestExamScore };
  }

  /**
   * Syncs the summary columns on a progress entity from its payload,
   * then persists it.
   */
  private async saveWithSummary(progress: Progress): Promise<void> {
    const payload = progress.payload as CourseDetails;
    const { unitsTotal, unitsCompleted, latestExamScore } = this.computeSummary(payload);

    progress.status = payload.status || ProgressStatus.NOT_STARTED;
    progress.units_total = unitsTotal;
    progress.units_completed = unitsCompleted;
    progress.latest_exam_score = latestExamScore;

    await this.progressRepository.save(progress);
  }

  async getCourseWithProgress(
    userId: number,
    courseId: number,
  ): Promise<CourseDetails> {
    const progress = await this.progressRepository.findOne({
      where: { userId, courseId },
    });

    if (progress) {
      const progressPayload = progress.payload as CourseDetails;
      progressPayload.id = courseId;
      return progressPayload;
    }

    const course = await this.courseRepository.findOneBy({ id: courseId });
    if (!course) {
      throw new NotFoundException(`Course with ID ${courseId} not found`);
    }

    const coursePayload: CourseDetails = JSON.parse(course.payload);
    migrateCoursePayloadImages(coursePayload);
    coursePayload.id = courseId;
    this.initializeProgressPayload(coursePayload);
    return coursePayload;
  }

  async getAllCoursesWithProgress(userId: number): Promise<CourseDetails[]> {
    const allProgress = await this.progressRepository.find({
      where: { userId },
    });

    return allProgress.map(p => {
      const payload = p.payload as CourseDetails;
      payload.id = p.courseId;
      return payload;
    });
  }

  async updateCourseProgress(
    userId: number,
    courseId: number,
    status: ProgressStatus,
  ): Promise<CourseDetails> {
    const progress = await this.getOrCreateProgress(userId, courseId);
    const progressPayload = progress.payload as CourseDetails;

    progressPayload.status = status;
    await this.saveWithSummary(progress);

    if (status === ProgressStatus.COMPLETED) {
      this.auditService.log(userId, AuditAction.COURSE_COMPLETED, { courseId });
    }
    return progressPayload;
  }

  async updateUnitProgress(
    userId: number,
    courseId: number,
    unitId: string,
    status: ProgressStatus,
  ): Promise<UnitData> {
    let progress = await this.getOrCreateProgress(userId, courseId);
    let progressPayload = progress.payload as CourseDetails;

    let unitToUpdate = this.findUnit(progressPayload.units, unitId);

    if (!unitToUpdate) {
      // Progress blob is stale (course was restructured after progress was created).
      // Reset the stored progress so getOrCreateProgress rebuilds it from the
      // current course payload, then retry the lookup.
      await this.progressRepository.delete({ userId, courseId });
      progress = await this.getOrCreateProgress(userId, courseId);
      progressPayload = progress.payload as CourseDetails;
      unitToUpdate = this.findUnit(progressPayload.units, unitId);
    }

    if (!unitToUpdate) {
      throw new NotFoundException(`Unit with ID ${unitId} not found in course ${courseId}`);
    }

    unitToUpdate.status = status;
    await this.saveWithSummary(progress);

    if (status === ProgressStatus.COMPLETED) {
      this.auditService.log(userId, AuditAction.UNIT_COMPLETED, { courseId, unitId });
    }
    return unitToUpdate;
  }

  async resetAllProgress(userId: number): Promise<void> {
    await this.progressRepository.delete({ userId });
  }

  async resetCourseProgress(userId: number, courseId: number): Promise<void> {
    await this.progressRepository.delete({ userId, courseId });
    this.auditService.log(userId, AuditAction.PROGRESS_RESET, { courseId });
  }
}
