import { Body, Controller, Delete, ForbiddenException, Get, NotFoundException, Param, ParseIntPipe, Patch, Post, Put, Request, UseGuards } from "@nestjs/common";
import { CourseService } from "./course.service";
import { CourseDetails, SubmitExamDto, UpdateProgressDto } from "./types/course.dto";
import { Course } from "./types/course.entity";
import { JwtAuthGuard } from "src/auth/jwt-auth.guard";
import { RolesGuard } from "src/users/role.guard";
import { Roles } from "src/users/role.decorator";
import { Role } from "src/users/types/role.enum";
import { CourseProgressService } from "./course-progress.service";


@Controller('courses')
export class CourseController {
  constructor(
      private readonly courseService: CourseService,
      private readonly courseProgressService: CourseProgressService,
  ) {}

    //@UseGuards(JwtAuthGuard) TODO
    @Get()
    async getCourses(): Promise<CourseDetails[]> {
      let courses: Course[] = await this.courseService.getCourses();
      // For the public listing, filter out any courses marked as hidden.
      // An admin-specific endpoint could be created to view hidden courses.
      courses = courses.filter(course => !course.hidden);
      const coursesRes = [];
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
    @UseGuards(JwtAuthGuard)
    async getCourseById(@Param('id', ParseIntPipe) id: number, @Request() req): Promise<CourseDetails> {
    let userId = req.user ? req.user.username : 'james';
    
    const hasAccess = true;//await this.courseService.hasAccess(id, user);
    if (!hasAccess) {
        throw new ForbiddenException('You do not have permission to access this course.');
    }
    return this.courseProgressService.getCourseWithProgress(
        1,//req.user.userId,
        id,
      );
    }
  
    @Post()
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(Role.Admin)
    async createCourse(
      @Body() course: CourseDetails
    ): Promise<Course> {
        let courseEntity: Course  = {
            payload: JSON.stringify(course),
            title: course.title,
            hidden: false,
            purchased_by_users: []
        }
      return this.courseService.saveCourse(courseEntity)
    }
  
    @Delete(':id')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(Role.Admin)
    async deleteCourse(@Param('id') id: string) {
      await this.courseService.deleteCourse(id);
    }

    @Put(':id')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(Role.Admin)
    async updateCourse(
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

    @Patch(':courseId/units/:unitId')
    async updateUnitProgress(
      @Request() req,
      @Param('courseId', ParseIntPipe) courseId: number,
      @Param('unitId') unitId: string,
      @Body() updateProgressDto: UpdateProgressDto,
    ) {
      return this.courseProgressService.updateUnitProgress(
        req.user.userId,
        courseId,
        unitId,
        updateProgressDto.status,
      );
    }
  
    @Post(':courseId/units/:unitId/exam/submit')
    async submitExam(
      @Request() req,
      @Param('courseId', ParseIntPipe) courseId: number,
      @Param('unitId') unitId: string,
      @Body() submitExamDto: SubmitExamDto,
    ) {
      return this.courseProgressService.submitExam(req.user.userId, courseId, unitId, submitExamDto.answers);
    }
}