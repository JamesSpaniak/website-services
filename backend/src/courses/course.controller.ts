import { Body, ClassSerializerInterceptor, Controller, Delete, ForbiddenException, Get, Logger, NotFoundException, Param, ParseIntPipe, Post, Put, Request, Res, SerializeOptions, UnauthorizedException, UseGuards, UseInterceptors } from "@nestjs/common";
import type { Response } from "express";
import { CourseService } from "./course.service";
import { CourseDetails, UnitData } from "./types/course.dto";
import { Course } from "./types/course.entity";
import { JwtAuthGuard } from "src/auth/jwt-auth.guard";
import { RolesGuard } from "src/users/role.guard";
import { Roles } from "src/users/role.decorator";
import { Role } from "src/users/types/role.enum";
import { ProgressService } from "src/progress/progress.service";
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger";
import { OptionalJwtAuthGuard } from "src/auth/optional-jwt-auth.guard";
import { SignedUrlService } from "src/media/signed-url.service";
import { isUnitPreviewAccessible } from "./course-access.util";

@ApiTags('Courses')
@Controller('courses')
@UseInterceptors(ClassSerializerInterceptor)
export class CourseController {
  private readonly logger = new Logger(CourseController.name);

  constructor(
      private readonly courseService: CourseService,
      private readonly progressService: ProgressService,
      private readonly signedUrlService: SignedUrlService,
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
      const isAdmin = req.user?.role === Role.Admin;
      const courses: Course[] = await this.courseService.getCourses(isAdmin);
      
      const courseDetailsPromises = courses.map(async (course) => {
        const payload: CourseDetails = JSON.parse(course.payload);
        payload.units?.forEach((unit) => {
            unit.sub_units = [];
            unit.text_content = undefined;
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
     * Public marketing view for a course (no auth). Content fields are stripped;
     * titles, descriptions, price, and hero media remain for SEO and sales.
     */
    @ApiOperation({ summary: 'Get public marketing details for a course' })
    @ApiResponse({ status: 200, description: 'Public course marketing payload.', type: CourseDetails })
    @ApiResponse({ status: 404, description: 'Course not found.' })
    @SerializeOptions({ groups: ['COURSE_LIST'] })
    @Get(':id/public')
    async getPublicCourseById(@Param('id', ParseIntPipe) id: number): Promise<CourseDetails> {
      return this.courseService.getPublicCourseById(id);
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
      const hasAccess = await this.courseService.hasAccess(id, req.user);
      const [details, questionCounts] = await Promise.all([
        this.progressService.getCourseWithProgress(req.user.userId, id, hasAccess),
        this.courseService.getQuestionCounts(id),
      ]);
      details.question_counts = questionCounts;
      return details;
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
      return this.courseService.createCourseFromPayload(course);
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
      return this.courseService.updateCourseFromPayload(id, course);
    }

    /**
     * Returns a playable video URL for a specific unit in a course.
     * Single-file videos (mp4) get an exact signed URL. HLS playlists are
     * authorized with CloudFront signed cookies instead — a signed playlist
     * URL alone would leave every segment request unsigned (403).
     */
    @ApiOperation({ summary: 'Get signed media URL for a course unit' })
    @ApiResponse({ status: 200, description: 'Playable video URL for the unit (signed cookies set for HLS).' })
    @ApiResponse({ status: 403, description: 'User does not have access to this course.' })
    @Get(':courseId/units/:unitId/media')
    @ApiBearerAuth()
    @UseGuards(JwtAuthGuard)
    async getUnitMedia(
      @Request() req,
      @Param('courseId', ParseIntPipe) courseId: number,
      @Param('unitId') unitId: string,
      @Res({ passthrough: true }) res: Response,
    ): Promise<{ video_url?: string }> {
      const course = await this.courseService.getCourseById(courseId);
      if (!course) {
        throw new NotFoundException(`Course with ID ${courseId} not found`);
      }

      const payload: CourseDetails = JSON.parse(course.payload);
      const hasAccess = await this.courseService.hasAccess(courseId, req.user);
      if (!hasAccess && !isUnitPreviewAccessible(payload.units, unitId)) {
        throw new ForbiddenException('You do not have access to this course.');
      }

      const unit = this.findUnit(payload.units, unitId);
      if (!unit) {
        throw new NotFoundException(`Unit with ID ${unitId} not found`);
      }

      if (this.signedUrlService.isProtectedHlsUrl(unit.video_url)) {
        const cookies = this.signedUrlService.signedVideoCookies();
        if (cookies) {
          const options = this.signedUrlService.videoCookieOptions();
          for (const [name, value] of Object.entries(cookies)) {
            res.cookie(name, value, options);
          }
        }
        return {
          video_url: this.signedUrlService.toAbsoluteMediaUrl(unit.video_url),
        };
      }

      return {
        video_url: this.signedUrlService.signVideoUrl(unit.video_url),
      };
    }

    private findUnit(units: UnitData[], unitId: string): UnitData | null {
      for (const unit of units) {
        if (String(unit.id) === String(unitId)) return unit;
        if (unit.sub_units?.length) {
          const found = this.findUnit(unit.sub_units, unitId);
          if (found) return found;
        }
      }
      return null;
    }

}