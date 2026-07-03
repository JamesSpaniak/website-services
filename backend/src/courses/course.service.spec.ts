import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException } from '@nestjs/common';
import { CourseService } from './course.service';
import { Course } from './types/course.entity';
import { User } from '../users/types/user.entity';
import { MediaService } from '../media/media.service';
import { OrganizationService } from '../organizations/organization.service';

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

  beforeEach(async () => {
    jest.clearAllMocks();
    const testingModule: TestingModule = await Test.createTestingModule({
      providers: [
        CourseService,
        { provide: getRepositoryToken(Course), useValue: courseRepo },
        { provide: getRepositoryToken(User), useValue: userRepo },
        { provide: MediaService, useValue: { extractKeysFromUrls: jest.fn(() => []), deleteMultipleMedia: jest.fn() } },
        { provide: OrganizationService, useValue: { hasOrgCourseAccess: jest.fn(async () => false) } },
      ],
    }).compile();

    service = testingModule.get<CourseService>(CourseService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('updateCourse', () => {
    it('throws NotFoundException when the course does not exist (R3)', async () => {
      courseRepo.findOne.mockResolvedValue(null);

      await expect(
        service.updateCourse(999, { title: 'X', payload: '{}' } as Course),
      ).rejects.toThrow(NotFoundException);
      expect(courseRepo.update).not.toHaveBeenCalled();
    });

    it('never passes purchased_by_users to repository.update', async () => {
      courseRepo.findOne.mockResolvedValue({
        id: 1,
        submitted_at: new Date('2024-01-01'),
        hidden: false,
        purchased_by_users: [{ id: 7 }],
      });
      courseRepo.update.mockResolvedValue(undefined);

      const input = {
        title: 'Updated',
        payload: '{}',
        purchased_by_users: [{ id: 99 }],
      } as unknown as Course;

      await service.updateCourse(1, input);

      const updateArg = courseRepo.update.mock.calls[0][1];
      expect(updateArg).not.toHaveProperty('purchased_by_users');
      expect(updateArg.hidden).toBe(false);
    });
  });
});
