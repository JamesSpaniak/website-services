import {
  Controller,
  Patch,
  Post,
  Param,
  Body,
  UseGuards,
  Request,
  ParseIntPipe,
  Get,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ProgressService } from './progress.service';
import { UpdateProgressDto, SubmitExamDto, ProgressStatus, CourseDetails, UnitData, ExamResult } from '../courses/types/course.dto';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';

@ApiTags('User Progress')
@ApiBearerAuth()
@Controller('progress')
@UseGuards(JwtAuthGuard)
export class ProgressController {
  constructor(private readonly progressService: ProgressService) {}

  /**
   * Retrieves all courses along with the authenticated user's progress for each.
   * @param req The Express request object containing the authenticated user's details.
   * @returns A list of courses with embedded progress information.
   * @requires Authentication.
   */
  @ApiOperation({ summary: "Get all courses with the current user's progress" })
  @ApiResponse({ status: 200, description: 'A list of courses with progress data.', type: [CourseDetails] })
  @Get('courses')
  async getAllCoursesWithProgress(@Request() req) {
    return this.progressService.getAllCoursesWithProgress(req.user.userId);
  }

  /**
   * Resets the progress for a specific course for the authenticated user.
   * @param req The Express request object.
   * @param courseId The ID of the course to reset.
   * @returns An object indicating the new status is NOT_STARTED.
   * @requires Authentication.
   */
  @ApiOperation({ summary: "Reset a user's progress for a specific course" })
  @ApiResponse({ status: 201, description: 'Course progress has been reset.', type: UpdateProgressDto })
  @Post('courses/:courseId/reset')
  async resetCourseProgress(
    @Request() req,
    @Param('courseId', ParseIntPipe) courseId: number,
  ): Promise<UpdateProgressDto> {
    await this.progressService.resetCourseProgress(req.user.userId, courseId);
    return { status: ProgressStatus.NOT_STARTED };
  }

  /**
   * Updates the overall progress status for a specific course.
   * @param req The Express request object.
   * @param courseId The ID of the course to update.
   * @param updateProgressDto DTO containing the new overall status.
   * @returns The submitted DTO.
   * @requires Authentication.
   */
  @ApiOperation({ summary: "Update the user's overall progress for a course" })
  @ApiResponse({ status: 200, description: 'Course progress updated.', type: UpdateProgressDto })
  @Patch('courses/:courseId')
  async updateCourseProgress(
    @Request() req,
    @Param('courseId', ParseIntPipe) courseId: number,
    @Body() updateProgressDto: UpdateProgressDto,
  ) {
    await this.progressService.updateCourseProgress(
      req.user.userId,
      courseId,
      updateProgressDto.status,
    );
    return {...updateProgressDto}
  }

  /**
   * Updates the progress status for a specific unit within a course.
   * @param req The Express request object.
   * @param courseId The ID of the course containing the unit.
   * @param unitId The ID of the unit to update.
   * @param updateProgressDto DTO containing the new status for the unit.
   * @returns The updated unit data with its new status.
   * @requires Authentication.
   */
  @ApiOperation({ summary: "Update the user's progress for a specific unit" })
  @ApiResponse({ status: 200, description: 'Unit progress updated.', type: UnitData })
  @Patch('courses/:courseId/units/:unitId')
  async updateUnitProgress(
    @Request() req,
    @Param('courseId', ParseIntPipe) courseId: number,
    @Param('unitId') unitId: string,
    @Body() updateProgressDto: UpdateProgressDto,
  ) {
    return this.progressService.updateUnitProgress(
      req.user.userId,
      courseId,
      unitId,
      updateProgressDto.status,
    );
  }

  /**
   * Submits a user's answers for an exam within a unit.
   * @param req The Express request object.
   * @param courseId The ID of the course containing the exam.
   * @param unitId The ID of the unit containing the exam.
   * @param submitExamDto DTO containing the user's answers.
   * @returns The result of the exam, including the score.
   * @requires Authentication.
   */
  @ApiOperation({ summary: 'Submit an exam for a unit' })
  @ApiResponse({ status: 201, description: 'Exam submitted and graded.', type: ExamResult })
  @Post('courses/:courseId/units/:unitId/exam/submit')
  async submitExam(
    @Request() req,
    @Param('courseId', ParseIntPipe) courseId: number,
    @Param('unitId') unitId: string,
    @Body() submitExamDto: SubmitExamDto,
  ) {
    return this.progressService.submitExam(req.user.userId, courseId, unitId, submitExamDto.answers);
  }
}