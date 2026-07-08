import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  ParseIntPipe,
  Request,
  UseGuards,
  ForbiddenException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { Role } from 'src/users/types/role.enum';
import { OrganizationMember } from 'src/organizations/types/organization-member.entity';
import { OrgRole } from 'src/organizations/types/org-role.enum';
import { ManagerOrAdminGuard } from './guards/manager-or-admin.guard';
import { ExamGeneratorService } from './exam-generator.service';
import { ExamAttemptService } from './exam-attempt.service';
import { InjectRepository } from '@nestjs/typeorm';
import { Exam } from './types/exam.entity';
import { ClassExam } from './types/class-exam.entity';
import { ExamAttempt } from './types/exam-attempt.entity';
import { Question } from './types/question.entity';
import { Repository, In } from 'typeorm';
import { CourseService } from 'src/courses/course.service';
import { ProgressService } from 'src/progress/progress.service';
import {
  GenerateExamDto,
  GenerateClassExamDto,
  SubmitExamAttemptDto,
  ExamAttemptResultDto,
  ExamWithQuestionsDto,
  ClassExamResultsDto,
  ClassExamSummaryDto,
  AssignedClassExamDto,
} from './types/question.dto';

@ApiTags('Exams')
@Controller('exams')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
export class ExamController {
  private readonly logger = new Logger(ExamController.name);

  constructor(
    private readonly examGeneratorService: ExamGeneratorService,
    private readonly examAttemptService: ExamAttemptService,
    private readonly courseService: CourseService,
    private readonly progressService: ProgressService,
    @InjectRepository(Exam) private examRepository: Repository<Exam>,
    @InjectRepository(ClassExam) private classExamRepository: Repository<ClassExam>,
    @InjectRepository(ExamAttempt) private examAttemptRepository: Repository<ExamAttempt>,
    @InjectRepository(Question) private questionRepository: Repository<Question>,
    @InjectRepository(OrganizationMember)
    private memberRepository: Repository<OrganizationMember>,
  ) {}

  // ── Static routes first (must precede :examId to avoid route capture) ────────

  @ApiOperation({
    summary: 'Generate an exam (student)',
    description:
      'Generates a new exam from the question bank for the requested scope. ' +
      'Returns the exam with questions (choices returned without is_correct). ' +
      'The user must have access to the course.',
  })
  @ApiResponse({ status: 201, type: ExamWithQuestionsDto })
  @Post('generate')
  async generate(
    @Request() req,
    @Body() dto: GenerateExamDto,
  ): Promise<ExamWithQuestionsDto> {
    await this.assertCourseAccess(req.user, dto.course_id);
    await this.progressService.ensureProgress(req.user.userId, dto.course_id);
    const exam = await this.examGeneratorService.generate(dto, req.user.userId);
    return this.buildExamWithQuestions(exam);
  }

  @ApiOperation({
    summary: 'Generate and assign a class exam (Manager/Admin)',
    description:
      'Generates an exam and creates a ClassExam record for the organization. ' +
      'Returns both the exam (with questions) and the ClassExam assignment record. ' +
      'For fixed exams (is_randomized=false) an existing exam is reused when the same ' +
      'scope+version combination has already been generated.',
  })
  @ApiResponse({ status: 201 })
  @UseGuards(ManagerOrAdminGuard)
  @Post('class')
  async generateClassExam(
    @Request() req,
    @Body() dto: GenerateClassExamDto,
  ): Promise<{ exam: ExamWithQuestionsDto; class_exam_id: number }> {
    await this.assertManagesOrg(req.user, dto.organization_id);
    await this.assertCourseAccess(req.user, dto.course_id);
    const { exam, classExam } = await this.examGeneratorService.generateClassExam(
      dto,
      req.user.userId,
    );
    return {
      exam: await this.buildExamWithQuestions(exam),
      class_exam_id: classExam.id,
    };
  }

  @ApiOperation({
    summary: 'List class exams for an organization (Manager/Admin)',
    description:
      'Returns all class exam assignments for the given organization, joined with ' +
      'their parent Exam metadata (scope, version, question count).',
  })
  @ApiResponse({ status: 200, type: [ClassExamSummaryDto] })
  @UseGuards(ManagerOrAdminGuard)
  @Get('class')
  async listClassExams(
    @Request() req,
    @Query('orgId', ParseIntPipe) orgId: number,
  ): Promise<ClassExamSummaryDto[]> {
    await this.assertManagesOrg(req.user, orgId);
    const classExams = await this.classExamRepository.find({
      where: { organization_id: orgId },
      order: { assigned_at: 'DESC' },
    });

    if (classExams.length === 0) return [];

    const examIds = [...new Set(classExams.map((ce) => ce.exam_id))];
    const exams = await this.examRepository.findBy({ id: In(examIds) });
    const examMap = new Map(exams.map((e) => [e.id, e]));

    return classExams
      .map((ce) => {
        const exam = examMap.get(ce.exam_id);
        if (!exam) return null;
        return {
          class_exam_id: ce.id,
          exam_id: ce.exam_id,
          label: ce.label,
          due_date: ce.due_date,
          assigned_at: ce.assigned_at,
          course_id: exam.course_id,
          scope: exam.scope,
          scope_refs: exam.scope_refs,
          version: exam.version,
          is_randomized: exam.is_randomized,
          question_count: exam.question_ids.length,
        };
      })
      .filter(Boolean) as ClassExamSummaryDto[];
  }

  @ApiOperation({
    summary: 'List class exams assigned to the current user',
    description:
      'Returns exams assigned to organizations the user belongs to, with optional attempt scores.',
  })
  @ApiResponse({ status: 200, type: [AssignedClassExamDto] })
  @Get('class/assigned')
  async listAssignedClassExams(@Request() req): Promise<AssignedClassExamDto[]> {
    const memberships = await this.memberRepository.find({
      where: { userId: req.user.userId },
    });
    if (memberships.length === 0) return [];

    const orgIds = memberships.map((m) => m.organizationId);
    const classExams = await this.classExamRepository.find({
      where: { organization_id: In(orgIds) },
      order: { assigned_at: 'DESC' },
    });
    if (classExams.length === 0) return [];

    const examIds = [...new Set(classExams.map((ce) => ce.exam_id))];
    const exams = await this.examRepository.findBy({ id: In(examIds) });
    const examMap = new Map(exams.map((e) => [e.id, e]));

    const attempts = await this.examAttemptRepository.find({
      where: { user_id: req.user.userId, exam_id: In(examIds) },
    });
    const attemptMap = new Map(attempts.map((a) => [a.exam_id, a]));

    return classExams
      .map((ce) => {
        const exam = examMap.get(ce.exam_id);
        if (!exam) return null;
        const attempt = attemptMap.get(ce.exam_id);
        return {
          class_exam_id: ce.id,
          exam_id: ce.exam_id,
          course_id: exam.course_id,
          label: ce.label,
          due_date: ce.due_date,
          assigned_at: ce.assigned_at,
          question_count: exam.question_ids.length,
          scope: exam.scope,
          attempt: attempt
            ? { score: attempt.score, taken_at: attempt.completed_at }
            : null,
        };
      })
      .filter(Boolean) as AssignedClassExamDto[];
  }

  @ApiOperation({
    summary: 'Get results for a class exam (Manager/Admin)',
    description:
      'Returns scores and section breakdowns for all students in the organization. ' +
      'Students who have not yet taken the exam are included with score=null.',
  })
  @ApiResponse({ status: 200, type: ClassExamResultsDto })
  @UseGuards(ManagerOrAdminGuard)
  @Get('class/:classExamId/results')
  async getClassResults(
    @Request() req,
    @Param('classExamId', ParseIntPipe) classExamId: number,
  ): Promise<ClassExamResultsDto> {
    const classExam = await this.classExamRepository.findOne({
      where: { id: classExamId },
    });
    if (!classExam) throw new NotFoundException(`ClassExam ${classExamId} not found`);
    await this.assertManagesOrg(req.user, classExam.organization_id);
    return this.examAttemptService.getClassResults(classExamId);
  }

  // ── Dynamic routes (:examId) ───────────────────────────────────────────────

  @ApiOperation({
    summary: 'Get an exam with its questions',
    description: 'Returns question text and choices without revealing correct answers.',
  })
  @ApiResponse({ status: 200, type: ExamWithQuestionsDto })
  @ApiResponse({ status: 404, description: 'Exam not found.' })
  @Get(':examId')
  async getExam(
    @Request() req,
    @Param('examId', ParseIntPipe) examId: number,
  ): Promise<ExamWithQuestionsDto> {
    const exam = await this.examRepository.findOne({ where: { id: examId } });
    if (!exam) throw new NotFoundException(`Exam ${examId} not found`);
    await this.assertExamAccess(req.user, exam);
    return this.buildExamWithQuestions(exam);
  }

  @ApiOperation({
    summary: 'Submit answers for an exam',
    description:
      'Scores the attempt, upserts the result (only the latest attempt is kept), ' +
      'and updates the progress exam_scores snapshot.',
  })
  @ApiResponse({ status: 201, type: ExamAttemptResultDto })
  @Post(':examId/submit')
  async submit(
    @Request() req,
    @Param('examId', ParseIntPipe) examId: number,
    @Body() dto: SubmitExamAttemptDto,
  ): Promise<ExamAttemptResultDto> {
    const exam = await this.examRepository.findOne({ where: { id: examId } });
    if (!exam) throw new NotFoundException(`Exam ${examId} not found`);
    await this.assertExamAccess(req.user, exam);
    return this.examAttemptService.submit(req.user.userId, examId, dto);
  }

  @ApiOperation({ summary: "Get the user's latest attempt for an exam" })
  @ApiResponse({ status: 200 })
  @Get(':examId/attempt')
  async getAttempt(
    @Request() req,
    @Param('examId', ParseIntPipe) examId: number,
  ) {
    return this.examAttemptService.getLatestAttempt(req.user.userId, examId);
  }

  // ── Internal helpers ───────────────────────────────────────────────────────

  private async assertCourseAccess(
    user: { userId: number; role: Role },
    courseId: number,
  ): Promise<void> {
    const hasAccess = await this.courseService.hasAccess(courseId, user);
    if (!hasAccess) {
      throw new ForbiddenException('You do not have access to this course.');
    }
  }

  /**
   * Course purchase grants access; org-assigned class exams grant access without purchase.
   */
  private async assertExamAccess(
    user: { userId: number; role: Role },
    exam: Exam,
  ): Promise<void> {
    const hasAccess = await this.courseService.hasAccess(exam.course_id, user);
    if (hasAccess) return;

    const memberships = await this.memberRepository.find({
      where: { userId: user.userId },
    });
    if (memberships.length === 0) {
      throw new ForbiddenException('You do not have access to this course.');
    }

    const orgIds = memberships.map((m) => m.organizationId);
    const assignment = await this.classExamRepository.findOne({
      where: { exam_id: exam.id, organization_id: In(orgIds) },
    });
    if (!assignment) {
      throw new ForbiddenException('You do not have access to this course.');
    }
  }

  /**
   * Verifies the caller manages the *specific* organization being targeted.
   * ManagerOrAdminGuard only checks the caller is a manager somewhere; without
   * this check any manager could read or assign into other organizations.
   */
  private async assertManagesOrg(
    user: { userId: number; role: Role },
    organizationId: number,
  ): Promise<void> {
    if (user.role === Role.Admin) return;
    const membership = await this.memberRepository.findOne({
      where: {
        userId: user.userId,
        organizationId,
        role: OrgRole.Manager,
      },
    });
    if (!membership) {
      throw new ForbiddenException('You do not manage this organization.');
    }
  }

  private async buildExamWithQuestions(exam: Exam): Promise<ExamWithQuestionsDto> {
    const questions = await this.questionRepository.findBy({
      id: In(exam.question_ids),
    });

    // Preserve question order from exam.question_ids
    const questionMap = new Map(questions.map((q) => [q.id, q]));
    const ordered = exam.question_ids
      .map((id) => questionMap.get(id))
      .filter(Boolean);

    return {
      id: exam.id,
      course_id: exam.course_id,
      scope: exam.scope,
      scope_refs: exam.scope_refs,
      is_randomized: exam.is_randomized,
      version: exam.version,
      created_at: exam.created_at,
      questions: ordered.map((q) => ({
        id: q.id,
        question_text: q.question_text,
        choices: q.choices.map(({ id, text }) => ({ id, text })),
        standard: q.standard,
        difficulty: q.difficulty,
        figure_ref: q.figure_ref ?? null,
      })),
    };
  }
}
