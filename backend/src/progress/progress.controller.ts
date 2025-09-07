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
import { UpdateProgressDto, SubmitExamDto, ProgressStatus } from '../courses/types/course.dto';

@Controller('progress')
@UseGuards(JwtAuthGuard)
export class ProgressController {
  constructor(private readonly progressService: ProgressService) {}

  @Get('courses')
  async getAllCoursesWithProgress(@Request() req) {
    return this.progressService.getAllCoursesWithProgress(req.user.userId);
  }

  @Post('courses/:courseId/reset')
  async resetCourseProgress(
    @Request() req,
    @Param('courseId', ParseIntPipe) courseId: number,
  ): Promise<UpdateProgressDto> {
    await this.progressService.resetCourseProgress(req.user.userId, courseId);
    return { status: ProgressStatus.NOT_STARTED };
  }

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