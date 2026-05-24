import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Question, QuestionStatus } from './types/question.entity';
import {
  CreateQuestionDto,
  UpdateQuestionDto,
  BulkImportDto,
  BulkImportResultDto,
  ImportQuestionDto,
} from './types/question.dto';

@Injectable()
export class QuestionService {
  private readonly logger = new Logger(QuestionService.name);

  constructor(
    @InjectRepository(Question)
    private questionRepository: Repository<Question>,
  ) {}

  // ── Query ──────────────────────────────────────────────────────────────────

  async findByCourse(
    courseId: number,
    status: QuestionStatus = 'active',
  ): Promise<Question[]> {
    return this.questionRepository.find({
      where: { course_id: courseId, status },
      order: { unit_id: 'ASC', sub_unit_id: 'ASC', priority: 'ASC', id: 'ASC' },
    });
  }

  async findByScope(
    courseId: number,
    unitId?: number | null,
    subUnitId?: number | null,
    status: QuestionStatus = 'active',
  ): Promise<Question[]> {
    const where: Partial<Question> = { course_id: courseId, status };

    if (subUnitId != null) {
      where.sub_unit_id = subUnitId;
    } else if (unitId != null) {
      where.unit_id = unitId;
      // When scoping to a unit and no sub_unit specified, include questions
      // that belong to the unit itself (sub_unit_id IS NULL) as well as any
      // sub-units. The caller (ExamGeneratorService) can filter further.
    }

    return this.questionRepository.find({
      where,
      order: { priority: 'ASC', id: 'ASC' },
    });
  }

  async findById(id: number): Promise<Question> {
    const q = await this.questionRepository.findOne({ where: { id } });
    if (!q) throw new NotFoundException(`Question ${id} not found`);
    return q;
  }

  // ── Mutations ──────────────────────────────────────────────────────────────

  async create(dto: CreateQuestionDto): Promise<Question> {
    this.validateChoices(dto.choices);
    const question = this.questionRepository.create({
      ...dto,
      unit_id: dto.unit_id ?? null,
      sub_unit_id: dto.sub_unit_id ?? null,
      priority: dto.priority ?? 2,
      difficulty: dto.difficulty ?? 'medium',
      status: dto.status ?? 'active',
    });
    return this.questionRepository.save(question);
  }

  async update(id: number, dto: UpdateQuestionDto): Promise<Question> {
    const existing = await this.findById(id);
    if (dto.choices) this.validateChoices(dto.choices);
    Object.assign(existing, dto);
    return this.questionRepository.save(existing);
  }

  /**
   * Soft-archives rather than hard-deletes to preserve exam integrity.
   * Existing Exam records reference question_ids — if the question row
   * were deleted those IDs would dangle. Archive status hides from generation
   * while keeping the row for historical scoring.
   */
  async archive(id: number): Promise<void> {
    const existing = await this.findById(id);
    existing.status = 'archived';
    await this.questionRepository.save(existing);
    this.logger.log(`Archived question ${id}`);
  }

  // ── Bulk import / export ───────────────────────────────────────────────────

  /**
   * Bulk upsert questions for a course.
   *
   * Matching strategy:
   *  1. If dto.id is provided and a question with that id exists, UPDATE it.
   *  2. Otherwise CREATE a new question.
   *
   * Returns counts of created / updated / skipped records.
   */
  async bulkImport(dto: BulkImportDto): Promise<BulkImportResultDto> {
    let created = 0;
    let updated = 0;
    let skipped = 0;
    let archived = 0;

    if (dto.replace_existing) {
      const result = await this.questionRepository
        .createQueryBuilder()
        .update(Question)
        .set({ status: 'archived' as const })
        .where('course_id = :courseId', { courseId: dto.course_id })
        .andWhere('status != :archived', { archived: 'archived' })
        .execute();
      archived = result.affected ?? 0;
      this.logger.log(
        `replace_existing: archived ${archived} questions for course ${dto.course_id}`,
      );
    }

    for (const item of dto.questions) {
      try {
        if (item.id && !dto.replace_existing) {
          const existing = await this.questionRepository.findOne({
            where: { id: item.id, course_id: dto.course_id },
          });
          if (existing) {
            this.validateChoices(item.choices);
            Object.assign(existing, this.importDtoToFields(item, dto.course_id));
            await this.questionRepository.save(existing);
            updated++;
            continue;
          }
        }
        // Create new
        this.validateChoices(item.choices);
        const question = this.questionRepository.create(
          this.importDtoToFields(item, dto.course_id),
        );
        await this.questionRepository.save(question);
        created++;
      } catch (err) {
        this.logger.warn(`Skipped question (id=${item.id}): ${(err as Error).message}`);
        skipped++;
      }
    }

    this.logger.log(
      `Bulk import for course ${dto.course_id}: created=${created}, updated=${updated}, skipped=${skipped}, archived=${archived}`,
    );
    return { created, updated, skipped, ...(dto.replace_existing ? { archived } : {}) };
  }

  /**
   * Export all active questions for a course as ImportQuestionDto[].
   * The exported format can be re-imported directly via bulkImport.
   */
  async exportByCourse(courseId: number): Promise<ImportQuestionDto[]> {
    const questions = await this.questionRepository.find({
      where: { course_id: courseId },
      order: { unit_id: 'ASC', sub_unit_id: 'ASC', priority: 'ASC', id: 'ASC' },
    });

    return questions.map((q) => ({
      id: q.id,
      course_id: q.course_id,
      unit_id: q.unit_id,
      sub_unit_id: q.sub_unit_id,
      question_text: q.question_text,
      choices: q.choices,
      explanation: q.explanation,
      standard: q.standard,
      priority: q.priority,
      difficulty: q.difficulty,
      status: q.status,
    }));
  }

  // ── Internal helpers ───────────────────────────────────────────────────────

  private importDtoToFields(
    dto: ImportQuestionDto,
    courseId: number,
  ): Partial<Question> {
    return {
      course_id: courseId,
      unit_id: dto.unit_id ?? null,
      sub_unit_id: dto.sub_unit_id ?? null,
      question_text: dto.question_text,
      choices: dto.choices,
      explanation: dto.explanation ?? null,
      standard: dto.standard ?? null,
      priority: dto.priority ?? 2,
      difficulty: dto.difficulty ?? 'medium',
      status: dto.status ?? 'active',
    };
  }

  private validateChoices(choices: { is_correct: boolean }[]): void {
    if (!choices || choices.length < 2) {
      throw new BadRequestException('A question must have at least 2 choices.');
    }
    const correctCount = choices.filter((c) => c.is_correct).length;
    if (correctCount !== 1) {
      throw new BadRequestException('Exactly one choice must be marked is_correct.');
    }
  }
}
