import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import {
  ExamGeneratorService,
  FINAL_EXAM_STANDARD,
} from './exam-generator.service';
import { Exam } from './types/exam.entity';
import { ClassExam } from './types/class-exam.entity';
import { Question } from './types/question.entity';
import { GenerateExamDto } from './types/question.dto';

function q(
  partial: Partial<Question> & { id: number; priority: number },
): Question {
  return {
    id: partial.id,
    course_id: 35,
    unit_ref: partial.unit_ref === undefined ? 'u1' : partial.unit_ref,
    sub_unit_ref: partial.sub_unit_ref ?? null,
    unit_id: null,
    sub_unit_id: null,
    question_text: `Q${partial.id}`,
    choices: [],
    explanation: null,
    standard: partial.standard ?? null,
    priority: partial.priority,
    difficulty: 'medium',
    status: 'active',
    created_at: new Date(),
    updated_at: new Date(),
  } as Question;
}

describe('ExamGeneratorService', () => {
  let service: ExamGeneratorService;
  let questions: Question[];

  const examRepo = {
    create: jest.fn((data) => ({ id: 1, ...data })),
    save: jest.fn(async (data) => data),
    findOne: jest.fn(),
    createQueryBuilder: jest.fn(),
  };

  const makeReuseQb = (result: unknown = null) => {
    const qb = {
      leftJoin: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      getOne: jest.fn(async () => result),
    };
    examRepo.createQueryBuilder.mockReturnValue(qb);
    return qb;
  };

  const classExamRepo = {
    create: jest.fn((data) => data),
    save: jest.fn(async (data) => data),
  };

  const questionRepo = {
    createQueryBuilder: jest.fn(),
  };

  beforeEach(async () => {
    questions = [
      q({ id: 1, priority: 1, unit_ref: 'u1' }),
      q({ id: 2, priority: 1, unit_ref: 'u1' }),
      q({ id: 3, priority: 1, unit_ref: 'u1' }),
      q({ id: 4, priority: 2, unit_ref: 'u1' }),
      q({ id: 10, priority: 3, standard: FINAL_EXAM_STANDARD, unit_ref: null }),
    ];

    const qb = {
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      addOrderBy: jest.fn().mockReturnThis(),
      getMany: jest.fn(async () => questions),
    };
    questionRepo.createQueryBuilder.mockReturnValue(qb);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ExamGeneratorService,
        { provide: getRepositoryToken(Exam), useValue: examRepo },
        { provide: getRepositoryToken(ClassExam), useValue: classExamRepo },
        { provide: getRepositoryToken(Question), useValue: questionRepo },
      ],
    }).compile();

    service = module.get(ExamGeneratorService);
    jest.clearAllMocks();
    questionRepo.createQueryBuilder.mockReturnValue(qb);
  });

  it('caps exam at question_count including core priority', async () => {
    const dto: GenerateExamDto = {
      course_id: 35,
      scope: 'unit',
      scope_refs: ['u1'],
      question_count: 2,
      is_randomized: false,
    };

    const exam = await service.generate(dto, 99);
    expect(exam.question_ids).toHaveLength(2);
    expect(exam.question_ids).toEqual([1, 2]);
    expect(exam.scope_refs).toEqual(['u1']);
  });

  it('maps legacy numeric scope_ids to canonical refs', async () => {
    const dto: GenerateExamDto = {
      course_id: 35,
      scope: 'unit',
      scope_ids: [1],
      is_randomized: false,
    };

    const exam = await service.generate(dto, 99);
    expect(exam.scope_refs).toEqual(['u1']);

    const qb = questionRepo.createQueryBuilder.mock.results[0].value;
    expect(qb.andWhere).toHaveBeenCalledWith('q.unit_ref = ANY(:refs)', {
      refs: ['u1'],
    });
  });

  it('applies final_only pool filter', async () => {
    questions = [
      q({ id: 10, priority: 3, standard: FINAL_EXAM_STANDARD, unit_ref: null }),
    ];

    const dto: GenerateExamDto = {
      course_id: 35,
      scope: 'full_course',
      exam_pool: 'final_only',
      is_randomized: false,
    };

    const exam = await service.generate(dto, 1);
    expect(exam.question_ids).toEqual([10]);

    const qb = questionRepo.createQueryBuilder.mock.results[0].value;
    expect(qb.andWhere).toHaveBeenCalledWith('q.standard = :finalStandard', {
      finalStandard: FINAL_EXAM_STANDARD,
    });
  });

  it('constrains randomized exam reuse to identical scope_refs (H3)', async () => {
    const qb = makeReuseQb(null);

    const dto: GenerateExamDto = {
      course_id: 35,
      scope: 'unit',
      scope_refs: ['u6', 'u5'],
      // is_randomized omitted → defaults to true, reuse path active
    };

    await service.generate(dto, 99);

    expect(qb.andWhere).toHaveBeenCalledWith(
      'e.scope_refs <@ :refs::varchar[] AND e.scope_refs @> :refs::varchar[]',
      { refs: ['u5', 'u6'] },
    );
    // No reusable exam → a fresh one is created
    expect(examRepo.save).toHaveBeenCalled();
  });

  it('reuses an unattempted exam when scope matches', async () => {
    const existing = { id: 42, question_ids: [1, 2] };
    makeReuseQb(existing);

    const dto: GenerateExamDto = {
      course_id: 35,
      scope: 'unit',
      scope_refs: ['u5'],
    };

    const exam = await service.generate(dto, 99);
    expect(exam).toBe(existing);
    expect(examRepo.save).not.toHaveBeenCalled();
  });

  it('defaults to scoped pool excluding FINAL_EXAM', async () => {
    const dto: GenerateExamDto = {
      course_id: 35,
      scope: 'full_course',
      is_randomized: false,
    };

    await service.generate(dto, 1);

    const qb = questionRepo.createQueryBuilder.mock.results[0].value;
    expect(qb.andWhere).toHaveBeenCalledWith(
      '(q.standard IS NULL OR q.standard != :finalStandard)',
      { finalStandard: FINAL_EXAM_STANDARD },
    );
  });
});
