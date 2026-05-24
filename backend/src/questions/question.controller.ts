import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  ParseIntPipe,
  Query,
  UseGuards,
  Logger,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { RolesGuard } from 'src/users/role.guard';
import { Roles } from 'src/users/role.decorator';
import { Role } from 'src/users/types/role.enum';
import { QuestionService } from './question.service';
import {
  CreateQuestionDto,
  UpdateQuestionDto,
  BulkImportDto,
  BulkImportResultDto,
  ImportQuestionDto,
} from './types/question.dto';
import { Question, QuestionStatus } from './types/question.entity';

@ApiTags('Questions')
@Controller('questions')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.Admin)
export class QuestionController {
  private readonly logger = new Logger(QuestionController.name);

  constructor(private readonly questionService: QuestionService) {}

  @ApiOperation({ summary: 'List questions for a course (Admin)' })
  @ApiQuery({ name: 'courseId', required: true, type: Number })
  @ApiQuery({ name: 'status', required: false, enum: ['active', 'draft', 'archived'] })
  @Get()
  async findByCourse(
    @Query('courseId', ParseIntPipe) courseId: number,
    @Query('status') status?: QuestionStatus,
  ): Promise<Question[]> {
    return this.questionService.findByCourse(courseId, status ?? 'active');
  }

  // Static routes must be declared before parameterized ones so NestJS
  // does not capture the literal "export" as an :id value.

  @ApiOperation({
    summary: 'Export all questions for a course as JSON (Admin)',
    description: 'Returns the full question bank for a course in the same format accepted by /import.',
  })
  @ApiQuery({ name: 'courseId', required: true, type: Number })
  @Get('export')
  async exportByCourse(
    @Query('courseId', ParseIntPipe) courseId: number,
  ): Promise<ImportQuestionDto[]> {
    return this.questionService.exportByCourse(courseId);
  }

  @ApiOperation({
    summary: 'Bulk import questions for a course (Admin)',
    description:
      'Accepts an array of questions. Questions with a matching id are updated; the rest are created. ' +
      'Set replace_existing=true to archive all existing questions for the course first (clean re-import).',
  })
  @ApiResponse({ status: 201, type: BulkImportResultDto })
  @Post('import')
  async bulkImport(@Body() dto: BulkImportDto): Promise<BulkImportResultDto> {
    return this.questionService.bulkImport(dto);
  }

  @ApiOperation({ summary: 'Get a single question by ID (Admin)' })
  @ApiResponse({ status: 404, description: 'Question not found.' })
  @Get(':id')
  async findOne(@Param('id', ParseIntPipe) id: number): Promise<Question> {
    return this.questionService.findById(id);
  }

  @ApiOperation({ summary: 'Create a new question (Admin)' })
  @ApiResponse({ status: 201, description: 'Question created.' })
  @Post()
  async create(@Body() dto: CreateQuestionDto): Promise<Question> {
    return this.questionService.create(dto);
  }

  @ApiOperation({ summary: 'Update a question (Admin)' })
  @ApiResponse({ status: 200, description: 'Question updated.' })
  @ApiResponse({ status: 404, description: 'Question not found.' })
  @Put(':id')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateQuestionDto,
  ): Promise<Question> {
    return this.questionService.update(id, dto);
  }

  @ApiOperation({
    summary: 'Archive a question (Admin)',
    description:
      'Soft-deletes by setting status=archived. The question row is preserved so existing exam records remain valid.',
  })
  @ApiResponse({ status: 200, description: 'Question archived.' })
  @Delete(':id')
  async archive(@Param('id', ParseIntPipe) id: number): Promise<{ ok: boolean }> {
    await this.questionService.archive(id);
    return { ok: true };
  }
}
