import { Test, TestingModule } from '@nestjs/testing';
import { CoursesService } from './course.service';

describe('CoursesService', () => {
  let service: CoursesService;

  beforeEach(async () => {
    const testingModule: TestingModule = await Test.createTestingModule({
      providers: [CoursesService],
    }).compile();

    service = testingModule.get<CoursesService>(CoursesService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
