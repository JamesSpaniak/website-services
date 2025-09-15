import {
    Injectable,
    NotFoundException,
    BadRequestException,
  } from '@nestjs/common';
  import { InjectRepository } from '@nestjs/typeorm';
  import { Repository } from 'typeorm';
  import { Progress } from '../progress/types/progress.entity';
  import { Course } from '../courses/types/course.entity';
  import {
    CourseDetails,
    ProgressStatus,
    UserAnswer,
    ExamResult,
    UnitData,
  } from '../courses/types/course.dto';
import { CourseService } from './course.service';
import { Role } from 'src/users/types/role.enum';
import { Trace } from 'src/common/tracing.decorator';
  
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
  
    /**
     * Recursively finds a unit or sub-unit by its ID within a list of units.
     */
    private findUnit(units: UnitData[], unitId: string): UnitData | null {
      for (const unit of units) {
        if (unit.id === unitId) {
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
      coursePayload.id = course.id;
      // Assuming price is stored in the payload JSON. If it's a column on Course, use course.price
      coursePayload.price = course.price || 49.95; // Fallback price
      coursePayload.has_access = hasAccess;

      if (hasAccess) {
        // If user has access, get or create their progress and merge it.
        const progress = await this.getOrCreateProgress(userFromJwt.userId, courseId);
        this.mergeProgressAndCourse(progress.payload as CourseDetails, coursePayload);
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

    mergeProgressAndCourse(progress: CourseDetails, course: CourseDetails): void {
        course.status = progress.status;
        const merge = (progressUnits: UnitData[], courseUnits: UnitData[]) => {
            if (!progressUnits || !courseUnits) return;
            for(let i: number = 0; i<courseUnits.length; i++) {
                courseUnits[i].status = i>=progressUnits.length
                    ? ProgressStatus.NOT_STARTED : progressUnits[i].status;
                if(courseUnits[i].exam) {
                    if(i>=progressUnits.length) {
                        courseUnits[i].exam.status = ProgressStatus.NOT_STARTED;
                    } else {
                        courseUnits[i].exam.status = progressUnits[i].exam.status;
                        courseUnits[i].exam.result = progressUnits[i].exam.result;
                        courseUnits[i].exam.previous_results = progressUnits[i].exam.previous_results;
                    }
                }
                if(courseUnits[i].sub_units) {
                    merge(progressUnits[i].sub_units ? progressUnits[i].sub_units : [], courseUnits[i].sub_units)
                }
            }
          };
        merge(progress.units, course.units);
    }
  
    async updateUnitProgress(
      userId: number,
      courseId: number,
      unitId: string,
      status: ProgressStatus,
    ): Promise<UnitData> {
      const progress = await this.getOrCreateProgress(userId, courseId);
      const progressPayload = progress.payload as CourseDetails;
  
      const unitToUpdate = this.findUnit(progressPayload.units, unitId);
      if (!unitToUpdate) {
        throw new NotFoundException(`Unit with ID ${unitId} not found in course ${courseId}`);
      }
  
      unitToUpdate.status = status;
      await this.progressRepository.save(progress);
      return unitToUpdate;
    }
  
    async submitExam(
      userId: number,
      courseId: number,
      unitId: string,
      userAnswers: UserAnswer[],
    ): Promise<ExamResult> {
      const [progress, course] = await Promise.all([
        this.getOrCreateProgress(userId, courseId),
        this.courseRepository.findOneBy({ id: courseId }),
      ]);
  
      if (!course) throw new NotFoundException(`Course with ID ${courseId} not found`);
  
      const progressPayload = progress.payload as CourseDetails;
      const coursePayload: CourseDetails = JSON.parse(course.payload);
  
      const unitInProgress = this.findUnit(progressPayload.units, unitId);
      const unitInCourse = this.findUnit(coursePayload.units, unitId);
  
      if (!unitInProgress?.exam || !unitInCourse?.exam) {
        throw new NotFoundException(`Exam for unit ID ${unitId} not found`);
      }
  
      const { exam: examInProgress } = unitInProgress;
      const { exam: examInCourse } = unitInCourse;
  
      if (examInProgress.retries_taken >= examInCourse.retries_allowed) {
        throw new BadRequestException('Maximum number of retries exceeded.');
      }
  
      let correctCount = 0;
      for (const userAnswer of userAnswers) {
        const question = examInCourse.questions.find(q => q.id === userAnswer.questionId);
        const correctAnswer = question?.answers.find(a => a.correct);
        if (correctAnswer?.id === userAnswer.selectedAnswerId) {
          correctCount++;
        }
      }
  
      const score = Math.round((correctCount / examInCourse.questions.length) * 100);
      const newResult: ExamResult = { score, answers: userAnswers, submittedAt: new Date() };
  
      examInProgress.retries_taken++;
      examInProgress.status = ProgressStatus.COMPLETED;
      if (examInProgress.result) {
        examInProgress.previous_results = [...(examInProgress.previous_results || []), examInProgress.result];
      }
      examInProgress.result = newResult;
      unitInProgress.status = ProgressStatus.COMPLETED;
  
      await this.progressRepository.save(progress);
      return newResult;
    }
  }
  
  