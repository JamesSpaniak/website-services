import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Question, QuestionStatus } from './types/question.entity';
import { CourseUnit } from '../courses/types/course-unit.entity';
import {
  CreateQuestionDto,
  UpdateQuestionDto,
  BulkImportDto,
  BulkImportResultDto,
  ImportQuestionDto,
} from './types/question.dto';

/**
 * Snapshot of a course's unit tree used to resolve and validate question
 * links during create/update/import.
 */
interface CourseUnitIndex {
  /** All valid refs for the course. */
  refs: Set<string>;
  /** ref → top-level unit ref (root of the materialized path). */
  rootByRef: Map<string, string>;
  /** legacy numeric payload id → ref (for importing pre-migration JSON). */
  refByLegacyId: Map<number, string>;
}

@Injectable()
export class QuestionService {
  private readonly logger = new Logger(QuestionService.name);

  constructor(
    @InjectRepository(Question)
    private questionRepository: Repository<Question>,
    @InjectRepository(CourseUnit)
    private courseUnitRepository: Repository<CourseUnit>,
  ) {}

  // ── Query ──────────────────────────────────────────────────────────────────

  async findByCourse(
    courseId: number,
    status: QuestionStatus = 'active',
  ): Promise<Question[]> {
    return this.questionRepository.find({
      where: { course_id: courseId, status },
      order: {
        unit_ref: 'ASC',
        sub_unit_ref: 'ASC',
        priority: 'ASC',
        id: 'ASC',
      },
    });
  }

  async findByScope(
    courseId: number,
    unitRef?: string | null,
    subUnitRef?: string | null,
    status: QuestionStatus = 'active',
  ): Promise<Question[]> {
    const where: Partial<Question> = { course_id: courseId, status };

    if (subUnitRef != null) {
      where.sub_unit_ref = subUnitRef;
    } else if (unitRef != null) {
      where.unit_ref = unitRef;
      // When scoping to a unit and no sub_unit specified, include questions
      // that belong to the unit itself (sub_unit_ref IS NULL) as well as any
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
    const index = await this.loadUnitIndex(dto.course_id);
    const { unitRef, subUnitRef } = this.resolveRefs(dto, index);

    const question = this.questionRepository.create({
      ...dto,
      unit_ref: unitRef,
      sub_unit_ref: subUnitRef,
      unit_id: null,
      sub_unit_id: null,
      priority: dto.priority ?? 2,
      difficulty: dto.difficulty ?? 'medium',
      status: dto.status ?? 'active',
    });
    return this.questionRepository.save(question);
  }

  async update(id: number, dto: UpdateQuestionDto): Promise<Question> {
    const existing = await this.findById(id);
    if (dto.choices) this.validateChoices(dto.choices);

    if (dto.unit_ref !== undefined || dto.sub_unit_ref !== undefined) {
      const index = await this.loadUnitIndex(existing.course_id);
      const { unitRef, subUnitRef } = this.resolveRefs(
        {
          unit_ref: dto.unit_ref ?? existing.unit_ref,
          sub_unit_ref: dto.sub_unit_ref ?? existing.sub_unit_ref,
        },
        index,
      );
      existing.unit_ref = unitRef;
      existing.sub_unit_ref = subUnitRef;
    }

    const rest: Partial<UpdateQuestionDto> = { ...dto };
    delete rest.unit_ref;
    delete rest.sub_unit_ref;
    Object.assign(existing, rest);
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
   * Unit links are validated against course_units — an item referencing a
   * ref (or legacy numeric id) that is not in the course tree is skipped and
   * counted, never silently mislinked.
   *
   * Returns counts of created / updated / skipped records.
   */
  async bulkImport(dto: BulkImportDto): Promise<BulkImportResultDto> {
    let created = 0;
    let updated = 0;
    let skipped = 0;
    let archived = 0;

    const index = await this.loadUnitIndex(dto.course_id);

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
            Object.assign(
              existing,
              this.importDtoToFields(item, dto.course_id, index),
            );
            await this.questionRepository.save(existing);
            updated++;
            continue;
          }
        }
        // Create new
        this.validateChoices(item.choices);
        const question = this.questionRepository.create(
          this.importDtoToFields(item, dto.course_id, index),
        );
        await this.questionRepository.save(question);
        created++;
      } catch (err) {
        this.logger.warn(
          `Skipped question (id=${item.id}): ${(err as Error).message}`,
        );
        skipped++;
      }
    }

    this.logger.log(
      `Bulk import for course ${dto.course_id}: created=${created}, updated=${updated}, skipped=${skipped}, archived=${archived}`,
    );
    return {
      created,
      updated,
      skipped,
      ...(dto.replace_existing ? { archived } : {}),
    };
  }

  /**
   * Export non-archived questions for a course as ImportQuestionDto[].
   * The exported format can be re-imported directly via bulkImport.
   */
  async exportByCourse(courseId: number): Promise<ImportQuestionDto[]> {
    const questions = await this.questionRepository
      .createQueryBuilder('q')
      .where('q.course_id = :courseId', { courseId })
      .andWhere("q.status != 'archived'")
      .orderBy('q.unit_ref', 'ASC', 'NULLS LAST')
      .addOrderBy('q.sub_unit_ref', 'ASC', 'NULLS LAST')
      .addOrderBy('q.priority', 'ASC')
      .addOrderBy('q.id', 'ASC')
      .getMany();

    return questions.map((q) => ({
      id: q.id,
      course_id: q.course_id,
      unit_ref: q.unit_ref,
      sub_unit_ref: q.sub_unit_ref,
      question_text: q.question_text,
      choices: q.choices,
      explanation: q.explanation,
      standard: q.standard,
      figure_ref: q.figure_ref,
      priority: q.priority,
      difficulty: q.difficulty,
      status: q.status,
    }));
  }

  // ── Internal helpers ───────────────────────────────────────────────────────

  private async loadUnitIndex(courseId: number): Promise<CourseUnitIndex> {
    const units = await this.courseUnitRepository.find({
      where: { course_id: courseId },
    });
    const refs = new Set(units.map((u) => u.ref));
    const rootByRef = new Map(units.map((u) => [u.ref, u.path.split('/')[0]]));
    const refByLegacyId = new Map<number, string>();
    for (const u of units) {
      if (u.legacy_id !== null && !refByLegacyId.has(u.legacy_id)) {
        refByLegacyId.set(u.legacy_id, u.ref);
      }
    }
    return { refs, rootByRef, refByLegacyId };
  }

  /**
   * Resolves and validates a question's unit links against the course tree.
   * Accepts string refs (preferred) or legacy numeric ids; the owning unit
   * is always re-derived from tree position so unit_ref can never contradict
   * sub_unit_ref.
   */
  private resolveRefs(
    dto: {
      unit_ref?: string | null;
      sub_unit_ref?: string | null;
      unit_id?: number | null;
      sub_unit_id?: number | null;
    },
    index: CourseUnitIndex,
  ): { unitRef: string | null; subUnitRef: string | null } {
    const subUnitRef =
      dto.sub_unit_ref ??
      (dto.sub_unit_id != null
        ? (index.refByLegacyId.get(dto.sub_unit_id) ?? `u${dto.sub_unit_id}`)
        : null);
    let unitRef =
      dto.unit_ref ??
      (dto.unit_id != null
        ? (index.refByLegacyId.get(dto.unit_id) ?? `u${dto.unit_id}`)
        : null);

    if (subUnitRef != null) {
      if (!index.refs.has(subUnitRef)) {
        throw new BadRequestException(
          `sub_unit_ref "${subUnitRef}" does not exist in the course unit tree`,
        );
      }
      // Owning unit comes from the tree, not from the caller.
      unitRef = index.rootByRef.get(subUnitRef) ?? unitRef;
    }
    if (unitRef != null && !index.refs.has(unitRef)) {
      throw new BadRequestException(
        `unit_ref "${unitRef}" does not exist in the course unit tree`,
      );
    }
    return { unitRef, subUnitRef };
  }

  private importDtoToFields(
    dto: ImportQuestionDto,
    courseId: number,
    index: CourseUnitIndex,
  ): Partial<Question> {
    const { unitRef, subUnitRef } = this.resolveRefs(dto, index);
    return {
      course_id: courseId,
      unit_ref: unitRef,
      sub_unit_ref: subUnitRef,
      unit_id: null,
      sub_unit_id: null,
      question_text: dto.question_text,
      choices: dto.choices,
      explanation: dto.explanation ?? null,
      standard: dto.standard ?? null,
      figure_ref: dto.figure_ref ?? null,
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
      throw new BadRequestException(
        'Exactly one choice must be marked is_correct.',
      );
    }
  }
}
