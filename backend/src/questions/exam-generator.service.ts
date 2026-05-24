import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, SelectQueryBuilder } from 'typeorm';
import { Exam } from './types/exam.entity';
import { ClassExam } from './types/class-exam.entity';
import { Question } from './types/question.entity';
import { ExamPool, GenerateExamDto, GenerateClassExamDto } from './types/question.dto';

/** Tag on questions imported for end-of-course figure / cross-section items */
export const FINAL_EXAM_STANDARD = 'FINAL_EXAM';

@Injectable()
export class ExamGeneratorService {
  private readonly logger = new Logger(ExamGeneratorService.name);

  constructor(
    @InjectRepository(Exam)
    private examRepository: Repository<Exam>,
    @InjectRepository(ClassExam)
    private classExamRepository: Repository<ClassExam>,
    @InjectRepository(Question)
    private questionRepository: Repository<Question>,
  ) {}

  // ── Public API ─────────────────────────────────────────────────────────────

  /**
   * Generate a student-initiated exam.
   * The generated Exam row is saved once and reused — if the same student
   * generates the same scope again they get a fresh Exam (new row) each time
   * for randomized exams, ensuring fresh question order. For fixed exams the
   * caller should reuse an existing exam_id rather than regenerating.
   */
  async generate(dto: GenerateExamDto, userId: number): Promise<Exam> {
    // Reuse the most recent unattempted exam for this user+scope+pool
    // to avoid creating orphan rows when the student spams "Start"
    if (dto.is_randomized !== false) {
      const recent = await this.examRepository
        .createQueryBuilder('e')
        .leftJoin('exam_attempts', 'ea', 'ea.exam_id = e.id AND ea.user_id = :uid', { uid: userId })
        .where('e.created_by_user_id = :uid', { uid: userId })
        .andWhere('e.course_id = :cid', { cid: dto.course_id })
        .andWhere('e.scope = :scope', { scope: dto.scope })
        .andWhere('e.exam_pool = :pool', { pool: this.resolveExamPool(dto) })
        .andWhere('e.generated_by = :gb', { gb: 'student' })
        .andWhere('ea.id IS NULL')
        .orderBy('e.created_at', 'DESC')
        .getOne();
      if (recent) {
        this.logger.log(`Reusing unattempted exam ${recent.id} for user ${userId}`);
        return recent;
      }
    }

    const questions = await this.selectQuestions(dto);
    return this.saveExam(dto, questions, 'student', userId, null);
  }

  /**
   * Generate a teacher-assigned class exam and create a ClassExam record
   * linking it to the organization.
   *
   * For fixed exams (is_randomized=false) a dedup_key is derived and an
   * existing exam is reused when the key already exists. This prevents
   * identical question sets being duplicated when a teacher assigns the same
   * fixed exam to multiple groups.
   */
  async generateClassExam(
    dto: GenerateClassExamDto,
    teacherId: number,
  ): Promise<{ exam: Exam; classExam: ClassExam }> {
    const isFixed = dto.is_randomized === false;
    let exam: Exam;

    if (isFixed) {
      const dedupKey = this.buildDedupKey(dto);
      const existing = await this.examRepository.findOne({ where: { dedup_key: dedupKey } });
      if (existing) {
        exam = existing;
        this.logger.log(`Reusing existing fixed exam ${exam.id} via dedup_key`);
      } else {
        const questions = await this.selectQuestions(dto);
        exam = await this.saveExam(dto, questions, 'teacher', teacherId, dedupKey);
      }
    } else {
      const questions = await this.selectQuestions(dto);
      exam = await this.saveExam(dto, questions, 'teacher', teacherId, null);
    }

    const classExam = this.classExamRepository.create({
      exam_id: exam.id,
      assigned_by_user_id: teacherId,
      organization_id: dto.organization_id,
      label: dto.label ?? null,
      due_date: dto.due_date ?? null,
    });
    await this.classExamRepository.save(classExam);

    this.logger.log(
      `Teacher ${teacherId} generated class exam ${exam.id} for org ${dto.organization_id}`,
    );
    return { exam, classExam };
  }

  // ── Internal helpers ───────────────────────────────────────────────────────

  /**
   * Fetches the question pool for the given scope and applies selection logic.
   *
   * Priority rules:
   *  - Priority 1 (core)         → included first, capped by question_count
   *  - Priority 2 (standard)     → included unless question_count is already met
   *  - Priority 3 (supplemental) → filled in last if count not yet met
   *
   * For randomized exams, each priority group is shuffled before selection.
   * For fixed exams, questions within each priority group are sorted by id
   * (deterministic) so every student gets identical questions in identical order.
   */
  private async selectQuestions(dto: GenerateExamDto): Promise<Question[]> {
    const pool = await this.fetchPool(dto);

    if (pool.length === 0) {
      const examPool = this.resolveExamPool(dto);
      throw new BadRequestException(
        `No active questions found for the requested scope (course=${dto.course_id}, scope=${dto.scope}, exam_pool=${examPool}).`,
      );
    }

    const isRandom = dto.is_randomized !== false; // default true
    const targetCount = dto.question_count ?? pool.length;

    const byPriority = (p: number) => pool.filter((q) => q.priority === p);

    const selectGroup = (group: Question[], remaining: number): Question[] => {
      if (remaining <= 0) return [];
      const ordered = isRandom ? shuffle(group) : group.slice().sort((a, b) => a.id - b.id);
      return ordered.slice(0, remaining);
    };

    const core = byPriority(1);
    const standard = byPriority(2);
    const supplemental = byPriority(3);

    const selected: Question[] = [];

    selected.push(...selectGroup(core, targetCount));
    selected.push(...selectGroup(standard, targetCount - selected.length));
    selected.push(...selectGroup(supplemental, targetCount - selected.length));

    if (selected.length === 0) {
      throw new BadRequestException('No questions available for the requested scope after filtering.');
    }

    return selected.slice(0, targetCount);
  }

  private resolveExamPool(dto: GenerateExamDto): ExamPool {
    return dto.exam_pool ?? 'scoped';
  }

  private applyExamPoolFilter(
    qb: SelectQueryBuilder<Question>,
    examPool: ExamPool,
  ): void {
    if (examPool === 'final_only') {
      qb.andWhere('q.standard = :finalStandard', { finalStandard: FINAL_EXAM_STANDARD });
    } else if (examPool === 'scoped') {
      qb.andWhere('(q.standard IS NULL OR q.standard != :finalStandard)', {
        finalStandard: FINAL_EXAM_STANDARD,
      });
    }
    // 'all' — no standard filter
  }

  private async fetchPool(dto: GenerateExamDto): Promise<Question[]> {
    const qb = this.questionRepository
      .createQueryBuilder('q')
      .where('q.course_id = :courseId', { courseId: dto.course_id })
      .andWhere('q.status = :status', { status: 'active' });

    if (dto.scope === 'full_course') {
      // No unit/sub_unit filter
    } else if (dto.scope === 'unit' && dto.scope_ids?.length) {
      qb.andWhere('q.unit_id = ANY(:ids)', { ids: dto.scope_ids });
    } else if (dto.scope === 'sub_unit' && dto.scope_ids?.length) {
      qb.andWhere('q.sub_unit_id = ANY(:ids)', { ids: dto.scope_ids });
    } else {
      throw new BadRequestException(
        `scope_ids must be provided for scope="${dto.scope}".`,
      );
    }

    this.applyExamPoolFilter(qb, this.resolveExamPool(dto));

    return qb.orderBy('q.priority', 'ASC').addOrderBy('q.id', 'ASC').getMany();
  }

  private async saveExam(
    dto: GenerateExamDto,
    questions: Question[],
    generatedBy: 'student' | 'teacher' | 'system',
    userId: number,
    dedupKey: string | null,
  ): Promise<Exam> {
    const exam = this.examRepository.create({
      course_id: dto.course_id,
      scope: dto.scope,
      scope_ids: dto.scope_ids ?? [],
      exam_pool: this.resolveExamPool(dto),
      question_ids: questions.map((q) => q.id),
      is_randomized: dto.is_randomized !== false,
      version: dto.version ?? 'v1',
      generated_by: generatedBy,
      created_by_user_id: userId,
      dedup_key: dedupKey,
    });
    return this.examRepository.save(exam);
  }

  private buildDedupKey(dto: GenerateClassExamDto): string {
    const ids = (dto.scope_ids ?? []).slice().sort((a, b) => a - b).join(',');
    const count = dto.question_count ?? 'all';
    const pool = this.resolveExamPool(dto);
    return `${dto.course_id}:${dto.scope}:${ids}:${dto.version ?? 'v1'}:${count}:${pool}:fixed`;
  }
}

// ── Utilities ──────────────────────────────────────────────────────────────────

/** Fisher-Yates shuffle — returns a new array, does not mutate the input */
function shuffle<T>(arr: T[]): T[] {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
