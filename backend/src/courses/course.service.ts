import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Course } from './types/course.entity';
import { Repository } from 'typeorm';

@Injectable()
export class CourseService {
    constructor(
        @InjectRepository(Course)
        private courseRepository: Repository<Course>
  ) {}

  async getCourseByTitle(title: string): Promise<Course | undefined> {
    const res = this.courseRepository.findOne({
        where: { title: title }
    });
    return res;
  }

  async getCourseById(id: number): Promise<Course | undefined> {
    return this.courseRepository.findOne({
        where: { id: id }
    });
  }

  async getCourses(): Promise<Course[]> {
    return this.courseRepository.find();
  }

  async saveCourse(course: Course): Promise<Course> {
    return this.courseRepository.save(course);
  }

  async deleteCourse(id: string): Promise<void> {
    await this.courseRepository.delete(id);
  }

  async updateCourse(id: string, course: Course): Promise<Course> {
    await this.courseRepository.update(id, course);
    return course;
  }
}
