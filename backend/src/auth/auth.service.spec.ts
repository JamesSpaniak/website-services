import {
  ForbiddenException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import {
  AuthService,
  LOGIN_BAD_PASSWORD,
  LOGIN_FAILURE_LIMIT,
  LOGIN_USER_NOT_FOUND,
  RESET_CODE_INVALID,
  RESET_LINK_INVALID,
  loginFailureKey,
} from './auth.service';
import { hashResetCode } from '../common/reset-code';
import { OrgRole } from '../organizations/types/org-role.enum';
import { AuditAction } from '../audit/types/audit-action.enum';
import { UsersService } from '../users/user.service';
import { SignupLinkService } from '../users/signup-link.service';
import { EmailService } from '../email/email.service';
import { OrganizationService } from '../organizations/organization.service';
import { AuditService } from '../audit/audit.service';
import { AnalyticsService } from '../analytics/analytics.service';
import { Session } from './types/session.entity';
import { User } from '../users/types/user.entity';
import { Role } from '../users/types/role.enum';
import { ProductEventsService } from '../product-events/product-events.service';
import { AttemptLimiter } from '../common/attempt-limiter.service';

const productEvents = { record: jest.fn(async () => undefined) };

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

    productEvents.record.mockClear();
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
        { provide: ProductEventsService, useValue: productEvents },
        AttemptLimiter,
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
    expect(productEvents.record).toHaveBeenCalledWith({
      userId: sampleUser.id,
      event: 'login',
    });
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

describe('AuthService password resets and lockout', () => {
  let service: AuthService;
  let limiter: AttemptLimiter;
  const student = {
    id: 7,
    username: 'pilot7',
    email: 'pilot7@school.org',
    password: 'hashed',
    role: Role.User,
    token_version: 3,
  } as User;
  const usersService = {
    findForLogin: jest.fn(),
    getUserById: jest.fn(),
    updatePassword: jest.fn(async () => undefined),
    setResetCode: jest.fn(async () => undefined),
    getResetCode: jest.fn(),
    incrementResetCodeAttempts: jest.fn(async () => undefined),
    clearResetCode: jest.fn(async () => undefined),
  };
  const jwtService = { sign: jest.fn(() => 'signed'), verify: jest.fn() };
  const emailService = {
    sendPasswordResetEmail: jest.fn(async () => undefined),
  };
  const organizationService = { getMemberRole: jest.fn() };
  const auditService = { log: jest.fn() };

  beforeEach(async () => {
    jest.clearAllMocks();
    jest.spyOn(UsersService, 'hashPassword').mockResolvedValue('new-hash');
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        AttemptLimiter,
        { provide: UsersService, useValue: usersService },
        { provide: getRepositoryToken(Session), useValue: {} },
        { provide: SignupLinkService, useValue: {} },
        { provide: JwtService, useValue: jwtService },
        { provide: ConfigService, useValue: { get: () => undefined } },
        { provide: EmailService, useValue: emailService },
        { provide: OrganizationService, useValue: organizationService },
        { provide: AuditService, useValue: auditService },
        { provide: AnalyticsService, useValue: {} },
        { provide: ProductEventsService, useValue: productEvents },
      ],
    }).compile();
    service = module.get(AuthService);
    limiter = module.get(AttemptLimiter);
  });

  afterEach(() => jest.restoreAllMocks());

  it('locks an account after 8 wrong passwords, even with the right one', async () => {
    usersService.findForLogin.mockResolvedValue(student);
    const compare = jest.spyOn(UsersService, 'comparePassword');
    compare.mockResolvedValue(false);
    for (let i = 0; i < LOGIN_FAILURE_LIMIT; i++) {
      await expect(service.validateUser('pilot7', 'bad')).rejects.toThrow(
        LOGIN_BAD_PASSWORD,
      );
    }
    compare.mockResolvedValue(true);
    await expect(service.validateUser('pilot7', 'right')).rejects.toThrow(
      /Too many incorrect passwords/,
    );
  });

  it('clears the failure count on a successful login', async () => {
    usersService.findForLogin.mockResolvedValue(student);
    const compare = jest.spyOn(UsersService, 'comparePassword');
    compare.mockResolvedValue(false);
    for (let i = 0; i < LOGIN_FAILURE_LIMIT - 1; i++) {
      await expect(service.validateUser('pilot7', 'bad')).rejects.toThrow();
    }
    compare.mockResolvedValue(true);
    await service.validateUser('pilot7', 'right');
    expect(limiter.count(loginFailureKey(student.id))).toBe(0);
  });

  it('signs reset links with the current token_version and a 60 min expiry', async () => {
    usersService.findForLogin.mockResolvedValue(student);
    await service.sendPasswordResetLink('PILOT7@school.org');
    expect(usersService.findForLogin).toHaveBeenCalledWith('PILOT7@school.org');
    expect(jwtService.sign).toHaveBeenCalledWith(
      { sub: 7, username: 'pilot7', ver: 3 },
      expect.objectContaining({ expiresIn: '60m' }),
    );
  });

  it('refuses a reset link once the password has changed (single use)', async () => {
    jwtService.verify.mockReturnValue({ sub: 7, ver: 2 });
    usersService.getUserById.mockResolvedValue(student);
    await expect(service.resetPassword('tok', 'newpassword')).rejects.toThrow(
      new UnauthorizedException(RESET_LINK_INVALID),
    );
    expect(usersService.updatePassword).not.toHaveBeenCalled();
  });

  it('refuses links issued before single-use links (no ver)', async () => {
    jwtService.verify.mockReturnValue({ sub: 7 });
    usersService.getUserById.mockResolvedValue(student);
    await expect(service.resetPassword('tok', 'newpassword')).rejects.toThrow(
      RESET_LINK_INVALID,
    );
  });

  it('resets with a matching link and lifts a login lockout', async () => {
    jwtService.verify.mockReturnValue({ sub: 7, ver: 3 });
    usersService.getUserById.mockResolvedValue(student);
    limiter.hit(loginFailureKey(7), 60_000);
    await service.resetPassword('tok', 'newpassword');
    expect(usersService.updatePassword).toHaveBeenCalledWith(7, 'new-hash');
    expect(limiter.count(loginFailureKey(7))).toBe(0);
  });

  describe('teacher reset codes', () => {
    it('issues a code for a student and stores only its hash', async () => {
      organizationService.getMemberRole.mockResolvedValue(OrgRole.Member);
      usersService.getUserById.mockResolvedValue(student);
      const result = await service.createMemberResetCode(4, 7, 99);
      expect(result.code).toMatch(/^[A-Z2-9]{4}-[A-Z2-9]{4}$/);
      const [, storedHash] = usersService.setResetCode.mock
        .calls[0] as unknown as [number, string];
      expect(storedHash).toBe(hashResetCode(7, result.code));
      expect(auditService.log).toHaveBeenCalledWith(
        7,
        AuditAction.RESET_CODE_CREATED,
        { orgId: 4, byUserId: 99 },
      );
    });

    it('refuses codes for managers and non-members', async () => {
      organizationService.getMemberRole.mockResolvedValue(OrgRole.Manager);
      await expect(service.createMemberResetCode(4, 7, 99)).rejects.toThrow(
        ForbiddenException,
      );
      organizationService.getMemberRole.mockResolvedValue(null);
      await expect(service.createMemberResetCode(4, 7, 99)).rejects.toThrow(
        NotFoundException,
      );
    });

    const liveCode = (code: string, attempts = 0) => ({
      hash: hashResetCode(7, code),
      expiresAt: new Date(Date.now() + 60_000),
      attempts,
    });

    it('accepts the code in any case/spacing, then clears it', async () => {
      usersService.findForLogin.mockResolvedValue(student);
      usersService.getResetCode.mockResolvedValue(liveCode('ABCD-EFGH'));
      await service.resetPasswordWithCode('pilot7', 'abcd efgh', 'newpassword');
      expect(usersService.updatePassword).toHaveBeenCalledWith(7, 'new-hash');
      expect(usersService.clearResetCode).toHaveBeenCalledWith(7);
    });

    it('counts a wrong code and refuses it', async () => {
      usersService.findForLogin.mockResolvedValue(student);
      usersService.getResetCode.mockResolvedValue(liveCode('ABCD-EFGH'));
      await expect(
        service.resetPasswordWithCode('pilot7', 'WXYZ-WXYZ', 'newpassword'),
      ).rejects.toThrow(RESET_CODE_INVALID);
      expect(usersService.incrementResetCodeAttempts).toHaveBeenCalledWith(7);
      expect(usersService.updatePassword).not.toHaveBeenCalled();
    });

    it('refuses the right code after 5 wrong tries or after expiry', async () => {
      usersService.findForLogin.mockResolvedValue(student);
      usersService.getResetCode.mockResolvedValue(liveCode('ABCD-EFGH', 5));
      await expect(
        service.resetPasswordWithCode('pilot7', 'ABCD-EFGH', 'newpassword'),
      ).rejects.toThrow(RESET_CODE_INVALID);
      usersService.getResetCode.mockResolvedValue({
        ...liveCode('ABCD-EFGH'),
        expiresAt: new Date(Date.now() - 1),
      });
      await expect(
        service.resetPasswordWithCode('pilot7', 'ABCD-EFGH', 'newpassword'),
      ).rejects.toThrow(RESET_CODE_INVALID);
      expect(usersService.updatePassword).not.toHaveBeenCalled();
    });
  });
});
