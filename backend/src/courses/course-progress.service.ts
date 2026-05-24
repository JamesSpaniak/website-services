import {
    Injectable,
    NotFoundException,
  } from '@nestjs/common';
  import { InjectRepository } from '@nestjs/typeorm';
  import { Repository } from 'typeorm';
  import { Progress } from '../progress/types/progress.entity';
  import { Course } from '../courses/types/course.entity';
  import {
    CourseDetails,
    ProgressStatus,
    UnitData,
  } from '../courses/types/course.dto';
import { CourseService } from './course.service';
import { Role } from 'src/users/types/role.enum';
import { Trace } from 'src/common/tracing.decorator';
import { migrateCoursePayloadImages } from './course-payload.util';
import { ExamScoreSnapshot } from '../questions/types/question.dto';
import type { ExamPool } from '../questions/types/exam.entity';
  
  @Injectable()
  export class CourseProgressService {
    constructor(
      @InjectRepository(Progress)
      private progressRepository: Repository<Progress>,
      @InjectRepository(Course)
      private courseRepository: Repository<Course>,
      private courseService: CourseService,
    ) {}
  
    /**
     * Retrieves a user's progress for a course, creating a new progress record if one doesn't exist.
     */
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

        progress = this.progressRepository.create({
          userId,
          courseId,
          payload: coursePayload,
        });
        await this.progressRepository.save(progress);
      }
      return progress;
    }

    /** Ensures a progress row exists before exam generate/submit (public for exam API). */
    async ensureProgress(userId: number, courseId: number): Promise<Progress> {
      return this.getOrCreateProgress(userId, courseId);
    }
  
    /**
     * Recursively finds a unit or sub-unit by its ID within a list of units.
     */
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
  
    /**
     * Sets the initial status for all trackable items in a course payload.
     */
    private initializeProgressPayload(payload: CourseDetails): void {
      const initialize = (units: UnitData[]) => {
        if (!units) return;
        units.forEach((unit) => {
          unit.status = ProgressStatus.NOT_STARTED;
          if (unit.exam) {
            unit.exam.status = ProgressStatus.NOT_STARTED;
            unit.exam.retries_taken = 0;
            unit.exam.result = undefined;
            unit.exam.previous_results = [];
          }
          if (unit.sub_units) {
            initialize(unit.sub_units);
          }
        });
      };
      initialize(payload.units);
      payload.status = ProgressStatus.NOT_STARTED;
    }
  
    @Trace()
    async getCourseWithProgress(
      userFromJwt: { userId: number; role: Role; username: string },
      courseId: number,
    ): Promise<CourseDetails> {
  
      const course: Course = await this.courseRepository.findOneBy({ id: courseId });
      if (!course) {
        throw new NotFoundException(`Course with ID ${courseId} not found`);
      }

      const hasAccess = await this.courseService.hasAccess(courseId, userFromJwt);
      const coursePayload: CourseDetails = JSON.parse(course.payload);
      migrateCoursePayloadImages(coursePayload);
      coursePayload.id = course.id;
      // Assuming price is stored in the payload JSON. If it's a column on Course, use course.price
      coursePayload.price = course.price || 49.95; // Fallback price
      coursePayload.has_access = hasAccess;

      if (hasAccess) {
        // If user has access, get or create their progress and merge it.
        const progress = await this.getOrCreateProgress(userFromJwt.userId, courseId);
        this.mergeProgressAndCourse(progress.payload as CourseDetails, coursePayload);
        coursePayload.exam_summary = this.buildExamSummary(progress.exam_scores);
      } else {
        // If no access, initialize a clean payload but redact sensitive content.
        // This ensures the frontend can show course info without giving away the content.
        this.initializeProgressPayload(coursePayload);
        coursePayload.units.forEach(unit => {
            unit.text_content = undefined;
            unit.video_url = undefined;
            unit.exam = undefined;
            if (unit.sub_units) {
                unit.sub_units.forEach(sub => {
                    sub.text_content = undefined;
                    sub.video_url = undefined;
                    sub.exam = undefined;
                });
            }
        });
      }
      
      return coursePayload;
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

    mergeProgressAndCourse(progress: CourseDetails, course: CourseDetails): void {
        course.status = progress.status;

        // Build a flat map of unitId → progress unit for O(1) lookup by ID.
        const progressMap = new Map<string, UnitData>();
        const indexUnits = (units: UnitData[]) => {
            if (!units?.length) return;
            for (const u of units) {
                progressMap.set(String(u.id), u);
                if (u.sub_units?.length) indexUnits(u.sub_units);
            }
        };
        indexUnits(progress.units ?? []);

        const merge = (courseUnits: UnitData[]) => {
            if (!courseUnits?.length) return;
            for (const cu of courseUnits) {
                const pu = progressMap.get(String(cu.id));
                cu.status = pu?.status ?? ProgressStatus.NOT_STARTED;
                if (cu.exam) {
                    if (!pu?.exam) {
                        cu.exam.status = ProgressStatus.NOT_STARTED;
                    } else {
                        cu.exam.status = pu.exam.status;
                        cu.exam.result = pu.exam.result;
                        cu.exam.previous_results = pu.exam.previous_results;
                    }
                }
                if (cu.sub_units?.length) merge(cu.sub_units);
            }
        };
        merge(course.units ?? []);
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
        // Reset stored progress so getOrCreateProgress rebuilds it from the
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
      await this.progressRepository.save(progress);
      return unitToUpdate;
    }
  
  }
  
  