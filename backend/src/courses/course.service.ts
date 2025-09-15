import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Course } from './types/course.entity';
import { Repository } from 'typeorm';
import { User } from 'src/users/types/user.entity';
import { Role } from 'src/users/types/role.enum';

@Injectable()
export class CourseService {
    constructor(
        @InjectRepository(Course)
        private courseRepository: Repository<Course>,
        @InjectRepository(User)
        private userRepository: Repository<User>
  ) {}

  async getCourseByTitle(title: string): Promise<Course | undefined> {
    const res = this.courseRepository.findOne({
        where: { title: title }
    });
    return res;
  }

  async hasAccess(courseId: number, userFromJwt: { userId: number, role: Role }): Promise<boolean> {
    // 1. Admins can see everything.
    if (userFromJwt.role === Role.Admin) {
        return true;
    }

    // 2. Fetch the full user from DB to check pro status and purchases.
    const user = await this.userRepository.findOne({
        where: { id: userFromJwt.userId },
        relations: ['purchased_courses'],
    });

    if (!user) return false; // Should not happen if JWT is valid.

    // 3. Pro members can see any course if their membership is active.
    if(user.role === Role.Admin)
        return true;
    if (user.role === Role.Pro && user.pro_membership_expires_at && user.pro_membership_expires_at > new Date()) {
        return true;
    }

    // 4. Regular users can only see courses they have purchased.
    return user.purchased_courses.some(course => course.id === courseId);
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
    await this.courseRepository.delete(id);
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
}
