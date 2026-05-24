import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { ExamAttempt, AttemptAnswer, SectionBreakdown } from './types/exam-attempt.entity';
import { Exam } from './types/exam.entity';
import { ClassExam } from './types/class-exam.entity';
import { Question } from './types/question.entity';
import { Progress } from '../progress/types/progress.entity';
import { User } from '../users/types/user.entity';
import { OrganizationMember } from '../organizations/types/organization-member.entity';
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
    const breakdown = this.buildBreakdown(scoredAnswers, questions);

    // Upsert: delete existing then insert fresh so updated_at reflects now
    await this.attemptRepository.delete({ user_id: userId, exam_id: examId });
    const attempt = this.attemptRepository.create({
      user_id: userId,
      exam_id: examId,
      answers: scoredAnswers,
      score,
      section_breakdown: breakdown,
    });
    const saved = await this.attemptRepository.save(attempt);

    // Denormalize latest score into progress.exam_scores
    await this.updateProgressExamScores(userId, exam, score, breakdown);

    this.logger.log(`User ${userId} scored ${score}% on exam ${examId}`);

    return {
      score,
      total_questions: questions.length,
      correct_count: correctCount,
      answers: scoredAnswers,
      section_breakdown: breakdown,
      completed_at: saved.completed_at,
    };
  }

  // ── Retrieval ──────────────────────────────────────────────────────────────

  async getLatestAttempt(userId: number, examId: number): Promise<ExamAttempt | null> {
    return this.attemptRepository.findOne({
      where: { user_id: userId, exam_id: examId },
    });
  }

  /**
   * Returns all student attempts for a class exam.
   * Includes students who have NOT yet taken the exam (score = null).
   * This requires the organization members list from the User table.
   */
  async getClassResults(classExamId: number, requestingUserId: number): Promise<ClassExamResultsDto> {
    const classExam = await this.classExamRepository.findOne({
      where: { id: classExamId },
    });
    if (!classExam) throw new NotFoundException(`ClassExam ${classExamId} not found`);

    // Fetch all attempts for this exam
    const attempts = await this.attemptRepository.find({
      where: { exam_id: classExam.exam_id },
    });

    // Fetch all members of the organization using the OrganizationMember
    // repository directly — avoids a broken join on the User entity's
    // 'organizations' relation which may not be defined.
    const orgMembers = await this.memberRepository.find({
      where: { organizationId: classExam.organization_id },
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

  private buildBreakdown(
    scoredAnswers: AttemptAnswer[],
    questions: Question[],
  ): SectionBreakdown[] {
    // Group questions by unit_id / sub_unit_id
    const sectionMap = new Map<string, {
      unit_id: number;
      sub_unit_id: number | null;
      correct: number;
      total: number;
      failed_standards: Set<string>;
    }>();

    const questionById = new Map(questions.map((q) => [q.id, q]));

    for (const answer of scoredAnswers) {
      const q = questionById.get(answer.question_id);
      if (!q) continue;

      const key = `${q.unit_id ?? 0}:${q.sub_unit_id ?? 0}`;
      if (!sectionMap.has(key)) {
        sectionMap.set(key, {
          unit_id: q.unit_id ?? 0,
          sub_unit_id: q.sub_unit_id,
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

    return Array.from(sectionMap.values()).map((s) => ({
      unit_id: s.unit_id,
      sub_unit_id: s.sub_unit_id,
      correct: s.correct,
      total: s.total,
      score_percent: s.total > 0 ? Math.round((s.correct / s.total) * 100) : 0,
      failed_standards: Array.from(s.failed_standards),
    }));
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
      const progress = await this.progressRepository.findOne({
        where: { userId, courseId: exam.course_id },
      });
      if (!progress) return;

      const snapshot: ExamScoreSnapshot = {
        exam_id: exam.id,
        scope: exam.scope,
        scope_ids: exam.scope_ids,
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
            !(
              s.scope === 'full_course' &&
              s.exam_pool === exam.exam_pool
            ),
        );
      }
      const updated = [...filtered, snapshot];

      // Cap unit/sub_unit entries to prevent unbounded JSONB growth.
      // Group by (scope, exam_pool, scope_ids key), keep only the 10 most recent per group.
      const groups = new Map<string, ExamScoreSnapshot[]>();
      for (const s of updated) {
        const key = `${s.scope}:${s.exam_pool ?? 'scoped'}:${(s.scope_ids ?? []).join(',')}`;
        const arr = groups.get(key) ?? [];
        arr.push(s);
        groups.set(key, arr);
      }
      const capped: ExamScoreSnapshot[] = [];
      for (const arr of groups.values()) {
        arr.sort((a, b) => new Date(b.taken_at).getTime() - new Date(a.taken_at).getTime());
        capped.push(...arr.slice(0, 10));
      }
      progress.exam_scores = capped;

      if (exam.scope === 'full_course' && exam.exam_pool === 'final_only') {
        progress.latest_exam_score = score;
      }

      await this.progressRepository.save(progress);
    } catch (err) {
      // Non-fatal — the attempt is already saved; progress denormalization
      // failing should not roll back the score submission.
      this.logger.error(
        `Failed to update progress exam_scores for user ${userId}: ${(err as Error).message}`,
      );
    }
  }
}
