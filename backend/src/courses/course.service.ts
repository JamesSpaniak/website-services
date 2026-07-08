import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Course } from './types/course.entity';
import { DataSource, Repository } from 'typeorm';
import { User } from 'src/users/types/user.entity';
import { Question } from 'src/questions/types/question.entity';
import { Role } from 'src/users/types/role.enum';
import { MediaService } from 'src/media/media.service';
import { OrganizationService } from 'src/organizations/organization.service';
import { CourseDetails, UnitData } from './types/course.dto';
import { CourseUnitService } from './course-unit.service';
import { FINAL_EXAM_STANDARD } from 'src/questions/exam-generator.service';
import { normalizeAndFlattenUnits } from './course-unit.util';
import {
  assertCourseExists,
  stripCourseForPublic,
} from './course-access.util';

@Injectable()
export class CourseService {
    private readonly logger = new Logger(CourseService.name);

    constructor(
        @InjectRepository(Course)
        private courseRepository: Repository<Course>,
        @InjectRepository(User)
        private userRepository: Repository<User>,
        @InjectRepository(Question)
        private questionRepository: Repository<Question>,
        private readonly mediaService: MediaService,
        private readonly organizationService: OrganizationService,
        private readonly courseUnitService: CourseUnitService,
        private readonly dataSource: DataSource,
  ) {}

  async getCourseByTitle(title: string): Promise<Course | undefined> {
    const res = this.courseRepository.findOne({
        where: { title: title }
    });
    return res;
  }

  async hasAccess(courseId: number, userFromJwt: { userId: number, role: Role }): Promise<boolean> {
    if (userFromJwt.role === Role.Admin) {
        return true;
    }

    const user = await this.userRepository.findOne({
        where: { id: userFromJwt.userId },
        relations: ['purchased_courses'],
    });

    if (!user) return false;

    if(user.role === Role.Admin)
        return true;
    if (user.role === Role.Pro && user.pro_membership_expires_at && user.pro_membership_expires_at > new Date()) {
        return true;
    }

    if (user.purchased_courses.some(course => course.id === courseId)) {
        return true;
    }

    return this.organizationService.hasOrgCourseAccess(userFromJwt.userId, courseId);
  }

  async getCourseById(id: number): Promise<Course | undefined> {
    return this.courseRepository.findOne({
        where: { id: id }
    });
  }

  /**
   * Active practice-pool question counts per unit ref and sub-unit ref, in two
   * aggregate queries. Mirrors ExamGeneratorService.fetchPool for the default
   * 'scoped' pool so the frontend can hide exam CTAs for empty scopes without
   * a per-node API call.
   */
  async getQuestionCounts(
    courseId: number,
  ): Promise<{ unit: Record<string, number>; sub_unit: Record<string, number> }> {
    const baseQuery = (refColumn: 'unit_ref' | 'sub_unit_ref') =>
      this.questionRepository
        .createQueryBuilder('q')
        .select(`q.${refColumn}`, 'ref')
        .addSelect('COUNT(*)', 'count')
        .where('q.course_id = :courseId', { courseId })
        .andWhere('q.status = :status', { status: 'active' })
        .andWhere('(q.standard IS NULL OR q.standard != :finalStandard)', {
          finalStandard: FINAL_EXAM_STANDARD,
        })
        .andWhere(`q.${refColumn} IS NOT NULL`)
        .groupBy(`q.${refColumn}`)
        .getRawMany<{ ref: string; count: string }>();

    const [unitRows, subUnitRows] = await Promise.all([
      baseQuery('unit_ref'),
      baseQuery('sub_unit_ref'),
    ]);

    const toMap = (rows: { ref: string; count: string }[]) =>
      Object.fromEntries(rows.map((r) => [r.ref, Number(r.count)]));

    return { unit: toMap(unitRows), sub_unit: toMap(subUnitRows) };
  }

  /** Admins see every course (including hidden drafts they are editing). */
  async getCourses(includeHidden = false): Promise<Course[]> {
    const courses = await this.courseRepository.find();
    return includeHidden ? courses : courses.filter(course => !course.hidden);
  }

  /** Unauthenticated marketing payload — outline and hero media only. */
  async getPublicCourseById(id: number): Promise<CourseDetails> {
    const course = await this.getCourseById(id);
    assertCourseExists(course, id);
    if (course.hidden) {
      throw new NotFoundException(`Course with ID ${id} not found`);
    }
    const payload: CourseDetails = JSON.parse(course.payload);
    payload.id = course.id;
    payload.price = Number(course.price);
    return stripCourseForPublic(payload);
  }

  /**
   * Creates a course from an authored payload. Unit ids are normalized to
   * canonical string refs and the course_units index is built in the same
   * transaction so refs are queryable the moment the course exists.
   */
  async createCourseFromPayload(details: CourseDetails): Promise<Course> {
    const flat = normalizeAndFlattenUnits(details);
    return this.dataSource.transaction(async (manager) => {
      const course = await manager.getRepository(Course).save({
        payload: JSON.stringify(details),
        title: details.title,
        hidden: false,
        purchased_by_users: [],
        price: details.price,
      });
      await this.courseUnitService.rebuild(course.id, flat, manager);
      return course;
    });
  }

  /**
   * Overwrites a course from an authored payload (admin JSON upload / editor
   * save). Normalizes unit ids and rebuilds course_units transactionally —
   * legacy numeric ids map deterministically to the same refs on every
   * upload, so existing question/exam links survive re-uploads.
   */
  async updateCourseFromPayload(
    id: number,
    details: CourseDetails,
  ): Promise<Course> {
    const existing = await this.courseRepository.findOne({ where: { id } });
    if (!existing) {
      throw new NotFoundException(`Course with ID ${id} not found`);
    }

    const flat = normalizeAndFlattenUnits(details);
    return this.dataSource.transaction(async (manager) => {
      await manager.getRepository(Course).update(id, {
        title: details.title,
        payload: JSON.stringify(details),
        price: details.price,
        updated_at: new Date(),
      });
      await this.courseUnitService.rebuild(id, flat, manager);
      return manager.getRepository(Course).findOne({ where: { id } });
    });
  }

  async deleteCourse(id: number): Promise<void> {
    const course = await this.courseRepository.findOne({ where: { id } });
    if (!course) return;
    await this.courseRepository.delete(id);
    void this.deleteCourseMedia(course).catch((err) =>
      this.logger.error(`Post-delete media cleanup failed for course ${id}: ${(err as Error).message}`),
    );
  }

  private async deleteCourseMedia(course: Course): Promise<void> {
    const urls = this.collectCourseMediaUrls(course);
    if (urls.length === 0) return;

    const keys = this.mediaService.extractKeysFromUrls(urls);
    if (keys.length === 0) return;

    await this.mediaService.deleteMultipleMedia(keys);
    this.logger.log(`Deleted ${keys.length} media files for course ${course.id}`);
  }

  private collectCourseMediaUrls(course: Course): string[] {
    const urls: string[] = [];
    let payload: CourseDetails;
    try {
      payload = JSON.parse(course.payload);
    } catch {
      return urls;
    }

    if (payload.images_url?.length) urls.push(...payload.images_url);
    if (payload.video_url) urls.push(payload.video_url);

    if (payload.units) {
      this.collectUnitMediaUrls(payload.units, urls);
    }

    return urls;
  }

  private collectUnitMediaUrls(units: UnitData[], urls: string[]): void {
    for (const unit of units) {
      if (unit.images_url?.length) urls.push(...unit.images_url);
      if (unit.video_url) urls.push(unit.video_url);
      if (unit.sub_units) {
        this.collectUnitMediaUrls(unit.sub_units, urls);
      }
    }
  }
}
