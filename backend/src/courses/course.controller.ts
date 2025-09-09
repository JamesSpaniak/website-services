import { Body, Controller, Delete, Get, Logger, Param, ParseIntPipe, Patch, Post, Put, Request, UnauthorizedException, UseGuards } from "@nestjs/common";
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
  private readonly logger = new Logger(CourseController.name);

  constructor(
      private readonly courseService: CourseService,
      private readonly courseProgressService: CourseProgressService,
  ) {}

    /**
     * Retrieves a list of all public courses.
     * This endpoint is for public consumption and redacts sensitive/detailed content.
     * @returns A list of simplified course details.
     */
    @Get()
    async getCourses(): Promise<CourseDetails[]> {
      // Note: This implementation manually parses and strips data.
      // A more robust solution might use different DTOs or Class-Transformer groups.
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

    /**
     * Retrieves full details for a specific course, including user-specific progress.
     * The service layer determines if the user has access and returns the appropriate data.
     * @param id The ID of the course to retrieve.
     * @param req The Express request object, containing user details from the JWT.
     * @returns Full course details, including an `has_access` flag and progress data if applicable.
     */
    @Get(':id')
    @UseGuards(JwtAuthGuard)
    async getCourseById(@Param('id', ParseIntPipe) id: number, @Request() req): Promise<CourseDetails> {
      if (!req.user) {
        // This case should not be hit if JwtAuthGuard is effective, but acts as a safeguard.
        throw new UnauthorizedException();
      }
      this.logger.log(`User '${req.user.username}' requesting course ID ${id}`);
      // The service layer now handles all access logic and data shaping.
      return this.courseProgressService.getCourseWithProgress(req.user, id);
    }
  
    /**
     * Creates a new course.
     * @param course The course data to create.
     * @returns The newly created course entity.
     * @requires Admin role.
     */
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
  
    /**
     * Deletes a course by its ID.
     * @param id The ID of the course to delete.
     * @requires Admin role.
     */
    @Delete(':id')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(Role.Admin)
    async deleteCourse(@Param('id') id: string) {
      await this.courseService.deleteCourse(id);
    }

    /**
     * Updates an existing course.
     * @param id The ID of the course to update.
     * @param course The new course data.
     * @returns The updated course entity.
     * @requires Admin role.
     */
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

    /**
     * Updates the progress status of a specific unit for the authenticated user.
     * @param req The Express request object.
     * @param courseId The ID of the course containing the unit.
     * @param unitId The ID of the unit to update.
     * @param updateProgressDto DTO containing the new status.
     * @returns The updated unit data.
     */
    @Patch(':courseId/units/:unitId')
    @UseGuards(JwtAuthGuard)
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
  
    /**
     * Submits answers for an exam within a unit for the authenticated user.
     * @param req The Express request object.
     * @param courseId The ID of the course containing the exam.
     * @param unitId The ID of the unit containing the exam.
     * @param submitExamDto DTO containing the user's answers.
     * @returns The result of the exam submission.
     */
    @Post(':courseId/units/:unitId/exam/submit')
    @UseGuards(JwtAuthGuard)
    async submitExam(
      @Request() req,
      @Param('courseId', ParseIntPipe) courseId: number,
      @Param('unitId') unitId: string,
      @Body() submitExamDto: SubmitExamDto,
    ) {
      return this.courseProgressService.submitExam(req.user.userId, courseId, unitId, submitExamDto.answers);
    }
}