import { UnauthorizedException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { AuthService, LOGIN_BAD_PASSWORD, LOGIN_USER_NOT_FOUND } from './auth.service';
import { UsersService } from '../users/user.service';
import { SignupLinkService } from '../users/signup-link.service';
import { EmailService } from '../email/email.service';
import { OrganizationService } from '../organizations/organization.service';
import { AuditService } from '../audit/audit.service';
import { AnalyticsService } from '../analytics/analytics.service';
import { Session } from './types/session.entity';
import { User } from '../users/types/user.entity';
import { Role } from '../users/types/role.enum';

describe('AuthService.validateUser', () => {
  let service: AuthService;
  const usersService = {
    findForLogin: jest.fn(),
  };

  const sampleUser = {
    id: 59,
    username: 'Michael.Atkinson',
    email: 'michael.atkinson@chichestersd.org',
    password: 'hashed',
    is_email_verified: true,
    role: Role.User,
  } as User;

  beforeEach(async () => {
    jest.clearAllMocks();
    jest.spyOn(UsersService, 'comparePassword').mockResolvedValue(true);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UsersService, useValue: usersService },
        { provide: getRepositoryToken(Session), useValue: {} },
        { provide: SignupLinkService, useValue: {} },
        { provide: JwtService, useValue: {} },
        { provide: ConfigService, useValue: {} },
        { provide: EmailService, useValue: {} },
        { provide: OrganizationService, useValue: {} },
        { provide: AuditService, useValue: { log: jest.fn() } },
        { provide: AnalyticsService, useValue: {} },
      ],
    }).compile();

    service = module.get(AuthService);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('accepts a username or email match from findForLogin', async () => {
    usersService.findForLogin.mockResolvedValue(sampleUser);
    const user = await service.validateUser(
      'michael.atkinson@chichestersd.org',
      'secret',
    );
    expect(user.username).toBe('Michael.Atkinson');
    expect(usersService.findForLogin).toHaveBeenCalledWith(
      'michael.atkinson@chichestersd.org',
    );
  });

  it('says when the identifier is unknown', async () => {
    usersService.findForLogin.mockResolvedValue(undefined);
    await expect(
      service.validateUser('nobody@school.edu', 'secret'),
    ).rejects.toThrow(new UnauthorizedException(LOGIN_USER_NOT_FOUND));
  });

  it('says when the password is wrong', async () => {
    usersService.findForLogin.mockResolvedValue(sampleUser);
    jest.spyOn(UsersService, 'comparePassword').mockResolvedValue(false);
    await expect(
      service.validateUser('Michael.Atkinson', 'nope'),
    ).rejects.toThrow(new UnauthorizedException(LOGIN_BAD_PASSWORD));
  });
});
