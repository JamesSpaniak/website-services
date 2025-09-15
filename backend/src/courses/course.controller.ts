import { Body, ClassSerializerInterceptor, Controller, Delete, Get, Logger, Param, ParseIntPipe, Patch, Post, Put, Request, SerializeOptions, UnauthorizedException, UseGuards, UseInterceptors } from "@nestjs/common";
import { CourseService } from "./course.service";
import { CourseDetails, SubmitExamDto, UpdateProgressDto } from "./types/course.dto";
import { Course } from "./types/course.entity";
import { JwtAuthGuard } from "src/auth/jwt-auth.guard";
import { RolesGuard } from "src/users/role.guard";
import { Roles } from "src/users/role.decorator";
import { Role } from "src/users/types/role.enum";
import { CourseProgressService } from "./course-progress.service";
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger";
import { plainToInstance } from "class-transformer";
import { OptionalJwtAuthGuard } from "src/auth/optional-jwt-auth.guard";

@ApiTags('Courses')
@Controller('courses')
@UseInterceptors(ClassSerializerInterceptor)
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
    @ApiOperation({ summary: 'Get a list of all public courses' })
    @ApiResponse({ status: 200, description: 'A list of simplified course details.', type: [CourseDetails] })
    @SerializeOptions({ groups: ['COURSE_LIST'] })
    @UseGuards(OptionalJwtAuthGuard)
    @Get()
    async getCourses(@Request() req): Promise<CourseDetails[]> {
      const courses: Course[] = await this.courseService.getCourses();
      
      const courseDetailsPromises = courses.map(async (course) => {
        const payload: CourseDetails = JSON.parse(course.payload);
        payload.units.forEach((unit) => {
            unit.sub_units = []
            unit.exam = undefined
            unit.text_content = undefined
        })

        // Determine access rights for the user, if they are logged in.
        const hasAccess = req.user
          ? await this.courseService.hasAccess(course.id, req.user)
          : false;

        return {
          ...payload,
          id: course.id,
          price: course.price,
          has_access: hasAccess,
        };
      });

      return Promise.all(courseDetailsPromises);
    }

    /**
     * Retrieves full details for a specific course, including user-specific progress.
     * The service layer determines if the user has access and returns the appropriate data.
     * @param id The ID of the course to retrieve.
     * @param req The Express request object, containing user details from the JWT.
     * @returns Full course details, including an `has_access` flag and progress data if applicable.
     */
    @ApiOperation({ summary: 'Get full details for a specific course' })
    @ApiResponse({ status: 200, description: 'Full course details with user progress.', type: CourseDetails })
    @ApiResponse({ status: 401, description: 'Unauthorized.' })
    @ApiResponse({ status: 404, description: 'Course not found.' })
    @SerializeOptions({ groups: ['COURSE_DETAILS'] })
    @ApiBearerAuth()
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
    @ApiOperation({ summary: 'Create a new course (Admin only)' })
    @ApiResponse({ status: 201, description: 'The course has been successfully created.', type: Course })
    @ApiBearerAuth()
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
            purchased_by_users: [],
            price: course.price
        }
      return this.courseService.saveCourse(courseEntity)
    }
  
    /**
     * Deletes a course by its ID.
     * @param id The ID of the course to delete.
     * @requires Admin role.
     */
    @ApiOperation({ summary: 'Delete a course (Admin only)' })
    @ApiResponse({ status: 200, description: 'The course has been successfully deleted.' })
    @ApiBearerAuth()
    @Delete(':id')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(Role.Admin)
    async deleteCourse(@Param('id', ParseIntPipe) id: number) {
      await this.courseService.deleteCourse(id);
    }

    /**
     * Updates an existing course.
     * @param id The ID of the course to update.
     * @param course The new course data.
     * @returns The updated course entity.
     * @requires Admin role.
     */
    @ApiOperation({ summary: 'Update an existing course (Admin only)' })
    @ApiResponse({ status: 200, description: 'The course has been successfully updated.', type: Course })
    @ApiBearerAuth()
    @Put(':id')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(Role.Admin)
    async updateCourse(
      @Param('id', ParseIntPipe) id: number,
      @Body() course: CourseDetails
    ): Promise<Course> {
        const updatedCourseData: Course = {
            title: course.title,
            payload: JSON.stringify(course),
            updated_at: new Date(),
            hidden: undefined,
            purchased_by_users: undefined,
            price: course.price
        }
        return this.courseService.updateCourse(id, updatedCourseData);
    }

    /**
     * Updates the progress status of a specific unit for the authenticated user.
     * @param req The Express request object.
     * @param courseId The ID of the course containing the unit.
     * @param unitId The ID of the unit to update.
     * @param updateProgressDto DTO containing the new status.
     * @returns The updated unit data.
     */
    @ApiOperation({ summary: "Update a user's progress for a specific unit" })
    @ApiResponse({ status: 200, description: 'The unit progress has been updated.'})
    @Patch(':courseId/units/:unitId')
    @ApiBearerAuth()
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
    @ApiOperation({ summary: 'Submit answers for a unit exam' })
    @ApiResponse({ status: 201, description: 'Exam results.' })
    @Post(':courseId/units/:unitId/exam/submit')
    @ApiBearerAuth()
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