import { Body, Controller, Delete, Get, Param, Post, Put } from "@nestjs/common";
import { CourseService } from "./course.service";
import { CourseDetails } from "./types/course.dto";
import { Course } from "./types/course.entity";


@Controller('courses')
export class CourseController {
  constructor(
      private readonly courseService: CourseService
  ) {}

    @Get()
    async getCourses(): Promise<CourseDetails[]> {
      let courses: Course[] = await this.courseService.getCourses();
      const coursesRes = []; // TODO filter hidden?
      courses.forEach((course) => {
        let coursePayload: CourseDetails = JSON.parse(course.payload);
        coursePayload.units.forEach((unit) => {
            unit.sub_units=[]
            unit.exam=undefined;
        });
        coursePayload.id = course.id;
        coursesRes.push(coursePayload);
      });
      return coursesRes;
    }

    @Get(':id')
    async getCourseById(@Param('id') id: string): Promise<CourseDetails> {
      let course: Course = await this.courseService.getCourseById(parseInt(id));
      let coursePayload: CourseDetails = JSON.parse(course.payload);
      console.log(coursePayload);
      coursePayload.id = course.id;
      return coursePayload;
    }
  
  
    @Post()
    async createCourse(
      @Body() course: CourseDetails
    ): Promise<Course> {
        let courseEntity: Course  = {
            payload: JSON.stringify(course),
            title: course.title,
            hidden: false
        }
      return this.courseService.saveCourse(courseEntity)
    }
  
    @Delete(':id')
    async deleteUser(@Param('id') id: string) {
      await this.courseService.deleteCourse(id);
    }

    @Put(':id')
    async updateUser(
      @Param('id') id: string,
      @Body() course: CourseDetails
    ): Promise<Course> {
        let existingCourse: Course = await this.courseService.getCourseByTitle(course.title);
        let updatedCourse: Course = {
            ...existingCourse,
            payload: JSON.stringify(course),
            updated_at: new Date()
        }
        await this.courseService.updateCourse(id, updatedCourse);
        return updatedCourse;
    }
}