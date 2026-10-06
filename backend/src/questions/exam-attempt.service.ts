import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In, DataSource, EntityManager } from 'typeorm';
import { ProductEventsService } from '../product-events/product-events.service';
import { ProgressService } from '../progress/progress.service';
import { ProgressStatus } from '../courses/types/course.dto';
import {
  ExamAttempt,
  AttemptAnswer,
  SectionBreakdown,
} from './types/exam-attempt.entity';
import { Exam } from './types/exam.entity';
import { ClassExam } from './types/class-exam.entity';
import { Question } from './types/question.entity';
import { Progress } from '../progress/types/progress.entity';
import { User } from '../users/types/user.entity';
import { OrganizationMember } from '../organizations/types/organization-member.entity';
import { CourseUnit } from '../courses/types/course-unit.entity';
import { AuditService } from '../audit/audit.service';
import { AuditAction } from '../audit/types/audit-action.enum';
import {
  SubmitExamAttemptDto,
  ExamAttemptResultDto,
  ClassExamResultsDto,
  StudentExamResultDto,
  ExamScoreSnapshot,
} from './types/question.dto';

@Injectable()
export class ExamAttemptService {
  private readonly logger = new Logger(ExamAttemptService.name);

  constructor(
    @InjectRepository(ExamAttempt)
    private attemptRepository: Repository<ExamAttempt>,
    @InjectRepository(Exam)
    private examRepository: Repository<Exam>,
    @InjectRepository(ClassExam)
    private classExamRepository: Repository<ClassExam>,
    @InjectRepository(Question)
    private questionRepository: Repository<Question>,
    @InjectRepository(Progress)
    private progressRepository: Repository<Progress>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(OrganizationMember)
    private memberRepository: Repository<OrganizationMember>,
    @InjectRepository(CourseUnit)
    private courseUnitRepository: Repository<CourseUnit>,
    private dataSource: DataSource,
    private productEvents: ProductEventsService,
    private progressService: ProgressService,
    private auditService: AuditService,
  ) {}

  // ── Submission ─────────────────────────────────────────────────────────────

  /**
   * Score and upsert an exam attempt.
   *
   * The UNIQUE constraint on (user_id, exam_id) in exam_attempts means only
   * one attempt row exists per user+exam pair. We use a DELETE + INSERT pattern
   * (rather than UPDATE) to ensure completed_at is refreshed by the
   * @UpdateDateColumn decorator, and to keep the logic simple.
   *
   * After scoring, the progress.exam_scores JSONB is updated as a denormalized
   * snapshot so the course progress view doesn't need to join exam_attempts.
   */
  async submit(
    userId: number,
    examId: number,
    dto: SubmitExamAttemptDto,
  ): Promise<ExamAttemptResultDto> {
    const exam = await this.examRepository.findOne({ where: { id: examId } });
    if (!exam) throw new NotFoundException(`Exam ${examId} not found`);

    if (dto.answers.length === 0) {
      throw new BadRequestException('Answers array must not be empty.');
    }

    // Fetch the questions in this exam
    const questions = await this.questionRepository.findBy({
      id: In(exam.question_ids),
    });

    if (questions.length === 0) {
      throw new BadRequestException(
        'The exam references questions that no longer exist in the question bank.',
      );
    }

    // Build lookups: question_id → correct choice_id, question_id → explanation
    const correctMap = new Map<number, number>();
    const explanationMap = new Map<number, string | null>();
    for (const q of questions) {
      const correct = q.choices.find((c) => c.is_correct);
      if (correct) correctMap.set(q.id, correct.id);
      explanationMap.set(q.id, q.explanation ?? null);
    }

    // Score each answer and attach correct_choice_id + explanation for review
    let correctCount = 0;
    const scoredAnswers: AttemptAnswer[] = dto.answers.map((a) => {
      const correct_choice_id = correctMap.get(a.question_id);
      const is_correct = correct_choice_id === a.selected_choice_id;
      if (is_correct) correctCount++;
      return {
        ...a,
        is_correct,
        correct_choice_id,
        explanation: explanationMap.get(a.question_id) ?? null,
      };
    });

    const score = Math.round((correctCount / questions.length) * 100);

    // Build per-section breakdown
    const breakdown = await this.buildBreakdown(
      scoredAnswers,
      questions,
      exam.course_id,
    );

    // One submit per user × exam at a time (R17): two tabs submitting
    // together would otherwise collide on the unique (user, exam) row and
    // compute the same attempt_no. Delete + insert so completed_at is fresh.
    const { saved, attemptNo } = await this.dataSource.transaction(
      async (manager) => {
        await manager.query(`SELECT pg_advisory_xact_lock($1, hashtext($2))`, [
          userId,
          `exam:${examId}`,
        ]);
        const repo = manager.getRepository(this.attemptRepository.target);
        await repo.delete({ user_id: userId, exam_id: examId });
        const saved = await repo.save(
          repo.create({
            user_id: userId,
            exam_id: examId,
            answers: scoredAnswers,
            score,
            section_breakdown: breakdown,
          }),
        );
        // Append-only history (PA9) — exam_attempts stays latest-only.
        const attemptNo = await this.insertHistory(
          manager,
          userId,
          exam,
          score,
          breakdown,
        );
        return { saved, attemptNo };
      },
    );

    // Denormalize latest score into progress.exam_scores
    await this.updateProgressExamScores(userId, exam, score, breakdown);
    this.recordSubmitEvents(userId, exam, score, breakdown, attemptNo);

    // Passing a lesson quiz is the strongest "I finished this" signal we have.
    // Full-course practice/finals stay independent of unit completion (MPD1).
    if (score >= 70 && exam.scope !== 'full_course') {
      await this.markScopedUnitsComplete(userId, exam);
    }

    this.logger.log(`User ${userId} scored ${score}% on exam ${examId}`);

    return {
      score,
      total_questions: questions.length,
      correct_count: correctCount,
      answers: ExamAttemptService.sanitizeAnswers(scoredAnswers),
      section_breakdown: breakdown,
      completed_at: saved.completed_at,
    };
  }

  // ── Retrieval ──────────────────────────────────────────────────────────────

  async getLatestAttempt(
    userId: number,
    examId: number,
  ): Promise<ExamAttempt | null> {
    const attempt = await this.attemptRepository.findOne({
      where: { user_id: userId, exam_id: examId },
    });
    if (!attempt) return null;
    return {
      ...attempt,
      answers: ExamAttemptService.sanitizeAnswers(attempt.answers),
    };
  }

  /**
   * Removes the answer key from attempt answers before they leave the API.
   * Retries are unlimited, so students must never see correct_choice_id or
   * explanation text — only which of their answers were right or wrong.
   * The full annotated answers remain stored on the exam_attempts row.
   */
  private static sanitizeAnswers(answers: AttemptAnswer[]): AttemptAnswer[] {
    return (answers ?? []).map((a) => ({
      question_id: a.question_id,
      selected_choice_id: a.selected_choice_id,
      is_correct: a.is_correct,
    }));
  }

  /**
   * Returns all student attempts for a class exam.
   * Includes students who have NOT yet taken the exam (score = null).
   * This requires the organization members list from the User table.
   * Org-level authorization is enforced by the controller before calling.
   */
  async getClassResults(classExamId: number): Promise<ClassExamResultsDto> {
    const classExam = await this.classExamRepository.findOne({
      where: { id: classExamId },
    });
    if (!classExam)
      throw new NotFoundException(`ClassExam ${classExamId} not found`);

    // Fetch all attempts for this exam
    const attempts = await this.attemptRepository.find({
      where: { exam_id: classExam.exam_id },
    });

    // Fetch all members of the organization using the OrganizationMember
    // repository directly — avoids a broken join on the User entity's
    // 'organizations' relation which may not be defined.
    // Class-scoped exams only include the roster of that class.
    const orgMembers = await this.memberRepository.find({
      where:
        classExam.class_id !== null
          ? {
              organizationId: classExam.organization_id,
              classId: classExam.class_id,
            }
          : { organizationId: classExam.organization_id },
      relations: { user: true },
    });
    const members = orgMembers
      .filter((om) => om.user)
      .map((om) => ({ id: om.user.id, username: om.user.username }));

    const attemptByUser = new Map(attempts.map((a) => [a.user_id, a]));

    const students: StudentExamResultDto[] = members.map((member) => {
      const attempt = attemptByUser.get(member.id);
      return {
        user_id: member.id,
        username: member.username,
        score: attempt?.score ?? null,
        completed_at: attempt?.completed_at ?? null,
        section_breakdown: attempt?.section_breakdown ?? null,
      };
    });

    return {
      class_exam_id: classExamId,
      label: classExam.label,
      exam_id: classExam.exam_id,
      total_assigned: members.length,
      total_completed: attempts.length,
      students,
    };
  }

  // ── Internal helpers ───────────────────────────────────────────────────────

  private async buildBreakdown(
    scoredAnswers: AttemptAnswer[],
    questions: Question[],
    courseId: number,
  ): Promise<SectionBreakdown[]> {
    // Group questions by unit_ref / sub_unit_ref
    const sectionMap = new Map<
      string,
      {
        unit_ref: string | null;
        sub_unit_ref: string | null;
        correct: number;
        total: number;
        failed_standards: Set<string>;
      }
    >();

    const questionById = new Map(questions.map((q) => [q.id, q]));

    for (const answer of scoredAnswers) {
      const q = questionById.get(answer.question_id);
      if (!q) continue;

      const key = `${q.unit_ref ?? ''}:${q.sub_unit_ref ?? ''}`;
      if (!sectionMap.has(key)) {
        sectionMap.set(key, {
          unit_ref: q.unit_ref,
          sub_unit_ref: q.sub_unit_ref,
          correct: 0,
          total: 0,
          failed_standards: new Set(),
        });
      }

      const section = sectionMap.get(key)!;
      section.total++;
      if (answer.is_correct) {
        section.correct++;
      } else if (q.standard) {
        section.failed_standards.add(q.standard);
      }
    }

    // Resolve display titles from the course unit index so clients don't
    // have to cross-reference refs against the course payload.
    const units = await this.courseUnitRepository.find({
      where: { course_id: courseId },
      select: ['ref', 'title'],
    });
    const titleByRef = new Map(units.map((u) => [u.ref, u.title]));

    return Array.from(sectionMap.values()).map((s) => ({
      unit_ref: s.unit_ref,
      sub_unit_ref: s.sub_unit_ref,
      unit_title: s.unit_ref ? (titleByRef.get(s.unit_ref) ?? null) : null,
      sub_unit_title: s.sub_unit_ref
        ? (titleByRef.get(s.sub_unit_ref) ?? null)
        : null,
      correct: s.correct,
      total: s.total,
      score_percent: s.total > 0 ? Math.round((s.correct / s.total) * 100) : 0,
      failed_standards: Array.from(s.failed_standards),
    }));
  }

  /**
   * Inserts an exam_attempt_history row with the next attempt_no inside the
   * submit transaction (under the per user × exam lock, so attempt_no cannot
   * repeat). Non-fatal: returns null and the attempt stays saved.
   */
  private async insertHistory(
    manager: EntityManager,
    userId: number,
    exam: Exam,
    score: number,
    breakdown: SectionBreakdown[],
  ): Promise<number | null> {
    try {
      // Savepoint so a history failure (non-fatal) leaves the attempt saved.
      return await manager.transaction(async (inner) => {
        const rows: { attempt_no: number }[] = await inner.query(
          `INSERT INTO exam_attempt_history
             (user_id, exam_id, course_id, scope, scope_refs, exam_pool, attempt_no, score, section_breakdown)
           VALUES ($1, $2, $3, $4, $5, $6,
                   COALESCE((SELECT MAX(attempt_no) FROM exam_attempt_history WHERE user_id = $1 AND exam_id = $2), 0) + 1,
                   $7, $8::jsonb)
           RETURNING attempt_no`,
          [
            userId,
            exam.id,
            exam.course_id,
            exam.scope,
            exam.scope_refs ?? [],
            exam.exam_pool ?? null,
            score,
            JSON.stringify(breakdown ?? []),
          ],
        );
        return rows[0]?.attempt_no ?? 1;
      });
    } catch (err) {
      this.logger.error(
        `Failed to append exam history for user ${userId}: ${(err as Error).message}`,
      );
      return null;
    }
  }

  /** exam_submitted + per-section category scores, after the attempt commits. */
  private recordSubmitEvents(
    userId: number,
    exam: Exam,
    score: number,
    breakdown: SectionBreakdown[],
    attemptNo: number | null,
  ): void {
    if (attemptNo == null) return;
    // T2 / PA5b: the audit ledger row admin SQL and the activity feed expect.
    void this.auditService.log(userId, AuditAction.EXAM_SUBMITTED, {
      examId: exam.id,
      courseId: exam.course_id,
      scope: exam.scope,
      examPool: exam.exam_pool ?? null,
      score,
      attemptNo,
      passed: score >= 70,
    });
    void this.productEvents.record({
      userId,
      event: 'exam_submitted',
      courseId: exam.course_id,
      unitRef: exam.scope_refs?.[0] ?? null,
      properties: {
        exam_id: exam.id,
        scope: exam.scope,
        exam_pool: exam.exam_pool ?? null,
        score,
        attempt_no: attemptNo,
        passed: score >= 70,
      },
    });
    for (const s of breakdown ?? []) {
      void this.productEvents.record({
        userId,
        event: 'exam_category_scored',
        courseId: exam.course_id,
        unitRef: s.sub_unit_ref ?? s.unit_ref ?? null,
        properties: {
          exam_id: exam.id,
          attempt_no: attemptNo,
          unit_ref: s.unit_ref,
          unit_title: s.unit_title ?? null,
          correct: s.correct,
          total: s.total,
          score_percent: s.score_percent,
        },
      });
    }
  }

  /**
   * Mark each scoped unit COMPLETED after a passing quiz. Non-fatal: the
   * attempt already saved. Idempotent via ProgressService (no second audit
   * if the unit was already complete).
   */
  private async markScopedUnitsComplete(
    userId: number,
    exam: Exam,
  ): Promise<void> {
    for (const ref of exam.scope_refs ?? []) {
      if (!ref) continue;
      try {
        await this.progressService.updateUnitProgress(
          userId,
          exam.course_id,
          ref,
          ProgressStatus.COMPLETED,
        );
      } catch (err) {
        this.logger.warn(
          `Could not auto-complete ${ref} after exam ${exam.id}: ${(err as Error).message}`,
        );
      }
    }
  }

  /**
   * Updates the denormalized exam_scores array on the progress record for
   * this user+course combination. If no progress record exists yet (student
   * took an exam before navigating the course) we skip — progress will be
   * created the first time they access the course.
   */
  private async updateProgressExamScores(
    userId: number,
    exam: Exam,
    score: number,
    breakdown: SectionBreakdown[],
  ): Promise<void> {
    try {
      await this.dataSource.transaction(async (manager) => {
        const progress = await manager.getRepository(Progress).findOne({
          where: { userId, courseId: exam.course_id },
          lock: { mode: 'pessimistic_write' },
        });
        if (!progress) return;

        const snapshot: ExamScoreSnapshot = {
          exam_id: exam.id,
          scope: exam.scope,
          scope_refs: exam.scope_refs ?? [],
          exam_pool: exam.exam_pool ?? 'scoped',
          score,
          section_breakdown: breakdown,
          taken_at: new Date().toISOString(),
        };

        const existing = progress.exam_scores ?? [];
        // Replace snapshot for same exam_id; for full_course also drop older same-pool rows
        let filtered = existing.filter((s) => s.exam_id !== exam.id);
        if (exam.scope === 'full_course' && exam.exam_pool) {
          filtered = filtered.filter(
            (s) =>
              !(s.scope === 'full_course' && s.exam_pool === exam.exam_pool),
          );
        }
        const updated = [...filtered, snapshot];

        // Cap unit/sub_unit entries to prevent unbounded JSONB growth.
        // Group by (scope, exam_pool, scope_ids key), keep only the 10 most recent per group.
        const groups = new Map<string, ExamScoreSnapshot[]>();
        for (const s of updated) {
          const key = `${s.scope}:${s.exam_pool ?? 'scoped'}:${(s.scope_refs ?? []).join(',')}`;
          const arr = groups.get(key) ?? [];
          arr.push(s);
          groups.set(key, arr);
        }
        const capped: ExamScoreSnapshot[] = [];
        for (const arr of groups.values()) {
          arr.sort(
            (a, b) =>
              new Date(b.taken_at).getTime() - new Date(a.taken_at).getTime(),
          );
          capped.push(...arr.slice(0, 10));
        }
        // Column-scoped update: a full save() would write back this request's
        // stale copy of unit_statuses over a concurrent unit write (R3/R17).
        await manager
          .getRepository(Progress)
          .update(
            { id: progress.id },
            exam.scope === 'full_course' && exam.exam_pool === 'final_only'
              ? { exam_scores: capped, latest_exam_score: score }
              : { exam_scores: capped },
          );
      });
    } catch (err) {
      // Non-fatal — the attempt is already saved; progress denormalization
      // failing should not roll back the score submission.
      this.logger.error(
        `Failed to update progress exam_scores for user ${userId}: ${(err as Error).message}`,
      );
    }
  }
}
