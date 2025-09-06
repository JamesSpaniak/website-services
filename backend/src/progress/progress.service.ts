import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Progress } from './types/progress.entity';
import { Course } from '../courses/types/course.entity';
import {
  CourseDetails,
  Unit,
  Exam,
  ProgressStatus,
  UserAnswer,
  ExamResult,
} from '../courses/types/course.dto';

@Injectable()
export class ProgressService {
  constructor(
    @InjectRepository(Progress)
    private progressRepository: Repository<Progress>,
    @InjectRepository(Course)
    private courseRepository: Repository<Course>,
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
  private findUnit(units: Unit[], unitId: string): Unit | null {
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
    const initialize = (units: Unit[]) => {
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
    coursePayload.id = courseId;
    this.initializeProgressPayload(coursePayload);
    return coursePayload;
  }

  async getAllCoursesWithProgress(userId: number): Promise<CourseDetails[]> {
    const allProgress = await this.progressRepository.find({
      where: { userId },
    });

    // We only return courses the user has made progress on.
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
    await this.progressRepository.save(progress);
    return progressPayload;
  }

  async updateUnitProgress(
    userId: number,
    courseId: number,
    unitId: string,
    status: ProgressStatus,
  ): Promise<Unit> {
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

  async resetAllProgress(userId: number): Promise<void> {
    await this.progressRepository.delete({ userId });
  }
}