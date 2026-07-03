import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { CourseService } from './course.service';
import { CourseUnitService } from './course-unit.service';
import { Course } from './types/course.entity';
import { User } from '../users/types/user.entity';
import { MediaService } from '../media/media.service';
import { OrganizationService } from '../organizations/organization.service';
import { CourseDetails } from './types/course.dto';

describe('CourseService', () => {
  let service: CourseService;

  const courseRepo = {
    findOne: jest.fn(),
    find: jest.fn(),
    save: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  };

  const userRepo = {
    findOne: jest.fn(),
  };

  const courseUnitService = {
    rebuild: jest.fn(),
  };

  // Transaction manager whose Course repository records calls
  const txCourseRepo = {
    save: jest.fn(async (data) => ({ id: 1, ...data })),
    update: jest.fn(async (_id: number, _data: Partial<Course>) => undefined),
    findOne: jest.fn(async () => ({ id: 1 })),
  };
  const dataSource = {
    transaction: jest.fn(async (cb: (manager: unknown) => Promise<unknown>) =>
      cb({ getRepository: () => txCourseRepo }),
    ),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const testingModule: TestingModule = await Test.createTestingModule({
      providers: [
        CourseService,
        { provide: getRepositoryToken(Course), useValue: courseRepo },
        { provide: getRepositoryToken(User), useValue: userRepo },
        { provide: MediaService, useValue: { extractKeysFromUrls: jest.fn(() => []), deleteMultipleMedia: jest.fn() } },
        { provide: OrganizationService, useValue: { hasOrgCourseAccess: jest.fn(async () => false) } },
        { provide: CourseUnitService, useValue: courseUnitService },
        { provide: DataSource, useValue: dataSource },
      ],
    }).compile();

    service = testingModule.get<CourseService>(CourseService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('updateCourseFromPayload', () => {
    const payload = (units: unknown[]): CourseDetails =>
      ({ title: 'FAA 107', price: 29, units }) as unknown as CourseDetails;

    it('throws NotFoundException when the course does not exist (R3)', async () => {
      courseRepo.findOne.mockResolvedValue(null);

      await expect(
        service.updateCourseFromPayload(999, payload([])),
      ).rejects.toThrow(NotFoundException);
      expect(dataSource.transaction).not.toHaveBeenCalled();
    });

    it('normalizes numeric unit ids to string refs and rebuilds course_units', async () => {
      courseRepo.findOne.mockResolvedValue({ id: 1 });

      const details = payload([
        { id: 10, title: 'Radio', sub_units: [{ id: 101, title: 'NAS' }] },
      ]);
      await service.updateCourseFromPayload(1, details);

      // Payload mutated to string refs before persisting
      expect(details.units[0].id).toBe('u10');
      expect(details.units[0].sub_units[0].id).toBe('u101');

      const updateArg = txCourseRepo.update.mock.calls[0][1];
      expect(updateArg).not.toHaveProperty('purchased_by_users');
      expect(updateArg).not.toHaveProperty('hidden');
      expect(JSON.parse(updateArg.payload).units[0].id).toBe('u10');

      expect(courseUnitService.rebuild).toHaveBeenCalledWith(
        1,
        expect.arrayContaining([
          expect.objectContaining({ ref: 'u10', legacyId: 10, depth: 0 }),
          expect.objectContaining({
            ref: 'u101',
            parentRef: 'u10',
            legacyId: 101,
            path: 'u10/u101',
            depth: 1,
          }),
        ]),
        expect.anything(),
      );
    });

    it('rejects duplicate unit ids anywhere in the tree (H1 collision guard)', async () => {
      courseRepo.findOne.mockResolvedValue({ id: 1 });

      // "11" as a section of unit 1 collides with a top-level unit 11
      const details = payload([
        { id: 1, title: 'Unit 1', sub_units: [{ id: 11, title: 'Section 1.1' }] },
        { id: 11, title: 'Unit 11' },
      ]);

      await expect(
        service.updateCourseFromPayload(1, details),
      ).rejects.toThrow(BadRequestException);
      expect(courseUnitService.rebuild).not.toHaveBeenCalled();
    });
  });

  describe('createCourseFromPayload', () => {
    it('saves the course and builds course_units in one transaction', async () => {
      const details = {
        title: 'New course',
        price: 0,
        units: [{ id: 'intro', title: 'Intro' }],
      } as unknown as CourseDetails;

      const course = await service.createCourseFromPayload(details);

      expect(course.id).toBe(1);
      expect(txCourseRepo.save).toHaveBeenCalled();
      expect(courseUnitService.rebuild).toHaveBeenCalledWith(
        1,
        [expect.objectContaining({ ref: 'intro', legacyId: null })],
        expect.anything(),
      );
    });
  });
});
