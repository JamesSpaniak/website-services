import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { UsersService } from './user.service';
import { Role } from './types/role.enum';
import { OrgRole } from '../organizations/types/org-role.enum';
import { AuditAction } from '../audit/types/audit-action.enum';

describe('UsersService — account deletion (AS1–AS4)', () => {
  const txQuery = jest.fn<Promise<unknown[]>, [string, unknown[]?]>(
    async () => [],
  );
  const txUserRepo = { findOneBy: jest.fn(), delete: jest.fn() };
  const tx = { query: txQuery, getRepository: () => txUserRepo };
  const userRepo = {
    findOneBy: jest.fn(),
    manager: {
      transaction: jest.fn(async (cb: (t: typeof tx) => unknown) => cb(tx)),
    },
  };
  const orgMemberRepo = { findOneBy: jest.fn() };
  const audit = { log: jest.fn() };
  const email = { sendAdminAlert: jest.fn(async () => undefined) };
  const stripe = { customers: { del: jest.fn(async () => ({})) } };

  let service: UsersService;

  const account = (over: Record<string, unknown> = {}) => ({
    id: 7,
    username: 'pilot',
    email: 'Pilot@Example.com',
    password: 'hash',
    role: Role.User,
    stripe_customer_id: null,
    ...over,
  });
  const sql = () => txQuery.mock.calls.map((c) => String(c[0]));

  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(UsersService, 'comparePassword').mockResolvedValue(true);
    service = new UsersService(
      userRepo as never,
      {} as never,
      orgMemberRepo as never,
      {} as never,
      audit as never,
      {} as never,
      {} as never,
      email as never,
      stripe as never,
    );
    orgMemberRepo.findOneBy.mockResolvedValue(null);
  });

  const givenUser = (u: ReturnType<typeof account>) => {
    userRepo.findOneBy.mockResolvedValue(u);
    txUserRepo.findOneBy.mockResolvedValue(u);
  };

  it('purges the account, its FK-less rows and its waitlist leads', async () => {
    givenUser(account());
    await service.deleteOwnAccount(7, 'secret');

    const statements = sql().join('\n');
    for (const table of [
      'product_events ',
      'product_events_daily',
      'exam_attempt_history',
      'exam_attempts ',
      'UPDATE exams',
      'leads',
    ]) {
      expect(statements).toContain(table);
    }
    const leadsCall = txQuery.mock.calls.find((c) =>
      String(c[0]).includes('leads'),
    );
    expect(leadsCall?.[1]).toEqual(['pilot@example.com']);
    expect(txUserRepo.delete).toHaveBeenCalledWith(7);
    expect(stripe.customers.del).not.toHaveBeenCalled();
    expect(audit.log).toHaveBeenCalledWith(
      null,
      AuditAction.USER_SELF_DELETED,
      expect.objectContaining({ targetUserId: 7, email: 'Pilot@Example.com' }),
    );
  });

  it('rejects a wrong password without deleting anything', async () => {
    givenUser(account());
    jest.spyOn(UsersService, 'comparePassword').mockResolvedValue(false);
    await expect(service.deleteOwnAccount(7, 'nope')).rejects.toThrow(
      BadRequestException,
    );
    expect(userRepo.manager.transaction).not.toHaveBeenCalled();
  });

  it('refuses admin accounts', async () => {
    givenUser(account({ role: Role.Admin }));
    await expect(service.deleteOwnAccount(7, 'secret')).rejects.toThrow(
      ForbiddenException,
    );
    expect(userRepo.manager.transaction).not.toHaveBeenCalled();
  });

  it('refuses students in a school account', async () => {
    givenUser(account());
    orgMemberRepo.findOneBy.mockResolvedValue({ role: OrgRole.Member });
    await expect(service.deleteOwnAccount(7, 'secret')).rejects.toThrow(
      /school manages/,
    );
    expect(userRepo.manager.transaction).not.toHaveBeenCalled();
  });

  it('lets a teacher (org manager) delete their own account', async () => {
    givenUser(account());
    orgMemberRepo.findOneBy.mockResolvedValue({ role: OrgRole.Manager });
    await service.deleteOwnAccount(7, 'secret');
    expect(txUserRepo.delete).toHaveBeenCalledWith(7);
  });

  it('deletes the Stripe customer after the database (cancels Pro)', async () => {
    givenUser(account({ role: Role.Pro, stripe_customer_id: 'cus_1' }));
    await service.deleteOwnAccount(7, 'secret');
    expect(stripe.customers.del).toHaveBeenCalledWith('cus_1');
    expect(txUserRepo.delete.mock.invocationCallOrder[0]).toBeLessThan(
      stripe.customers.del.mock.invocationCallOrder[0],
    );
    expect(email.sendAdminAlert).not.toHaveBeenCalled();
  });

  it('still deletes the account when Stripe fails, and alerts the admin', async () => {
    givenUser(account({ stripe_customer_id: 'cus_1' }));
    stripe.customers.del.mockRejectedValueOnce(new Error('stripe down'));
    await service.deleteOwnAccount(7, 'secret');
    expect(txUserRepo.delete).toHaveBeenCalledWith(7);
    expect(email.sendAdminAlert).toHaveBeenCalledWith(
      expect.stringContaining('Stripe'),
      expect.stringContaining('cus_1'),
    );
    expect(audit.log).toHaveBeenCalled();
  });

  it('admin delete runs the same purge and keeps the admin as actor', async () => {
    givenUser(account({ stripe_customer_id: 'cus_2' }));
    await service.deleteUserAsAdmin(7, 1);
    expect(sql().join('\n')).toContain('product_events_daily');
    expect(stripe.customers.del).toHaveBeenCalledWith('cus_2');
    expect(audit.log).toHaveBeenCalledWith(
      1,
      AuditAction.USER_DELETED,
      expect.objectContaining({ targetUserId: 7 }),
    );
  });
});
