import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Course } from './types/course.entity';
import { Repository } from 'typeorm';
import { User } from 'src/users/types/user.entity';
import { Role } from 'src/users/types/role.enum';
import { MediaService } from 'src/media/media.service';
import { OrganizationService } from 'src/organizations/organization.service';
import { CourseDetails, UnitData } from './types/course.dto';
import { migrateCoursePayloadImages } from './course-payload.util';

@Injectable()
export class CourseService {
    private readonly logger = new Logger(CourseService.name);

    constructor(
        @InjectRepository(Course)
        private courseRepository: Repository<Course>,
        @InjectRepository(User)
        private userRepository: Repository<User>,
        private readonly mediaService: MediaService,
        private readonly organizationService: OrganizationService,
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

  async getCourses(): Promise<Course[]> {
    return (await this.courseRepository.find()).filter(course => !course.hidden)
  }

  async saveCourse(course: Course): Promise<Course> {
    return this.courseRepository.save(course);
  }

  async deleteCourse(id: number): Promise<void> {
    const course = await this.courseRepository.findOne({ where: { id } });
    if (!course) return;
    await this.courseRepository.delete(id);
    void this.deleteCourseMedia(course).catch((err) =>
      this.logger.error(`Post-delete media cleanup failed for course ${id}: ${(err as Error).message}`),
    );
  }

  async updateCourse(id: number, course: Course): Promise<Course> {
    const existing = await this.courseRepository.findOne({ where: { id: id } });
    course.submitted_at = existing.submitted_at;
    course.hidden = existing.hidden;
    course.purchased_by_users = existing.purchased_by_users;
    course.updated_at = new Date();

    await this.courseRepository.update(id, course);
    return course;
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

    migrateCoursePayloadImages(payload);

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
