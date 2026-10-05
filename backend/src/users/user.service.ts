import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, LessThan, Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User } from './types/user.entity';
import { UpdateUserDto, UserDto, UserFull } from './types/user.dto';
import {
  AdminUserCourse,
  AdminUserRow,
  CourseAccessSource,
} from './types/admin-users.dto';
import { Role } from './types/role.enum';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Course } from '../courses/types/course.entity';
import { OrganizationMember } from '../organizations/types/organization-member.entity';
import { AuditService } from '../audit/audit.service';
import { AuditAction } from '../audit/types/audit-action.enum';
import { EntitlementService } from '../commerce/entitlement.service';
import { ProductEventsService } from '../product-events/product-events.service';
import { OrgRole } from '../organizations/types/org-role.enum';
import { EmailService } from '../email/email.service';
import { Stripe } from 'stripe';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Course)
    private courseRepository: Repository<Course>,
    @InjectRepository(OrganizationMember)
    private orgMemberRepository: Repository<OrganizationMember>,
    private dataSource: DataSource,
    private auditService: AuditService,
    private entitlements: EntitlementService,
    private productEvents: ProductEventsService,
    private emailService: EmailService,
    @Inject('STRIPE_CLIENT') private stripe: Stripe,
  ) {}
  private readonly logger = new Logger(UsersService.name);

  static async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, 10);
  }

  static async comparePassword(
    password: string,
    expectedPassword: string,
  ): Promise<boolean> {
    if (!(password && expectedPassword)) return false;
    try {
      return bcrypt.compare(password, expectedPassword);
    } catch {
      return false;
    }
  }

  async getUserById(id: number): Promise<User> {
    return this.userRepository.findOne({
      where: { id: id },
      join: {
        alias: 'user',
        leftJoinAndSelect: {
          purchasedCourses: 'user.purchased_courses',
        },
      },
    });
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return this.userRepository.findOne({
      where: { username: username },
      relations: ['purchased_courses'],
    });
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    return this.userRepository.findOne({
      where: { email: email },
    });
  }

  /**
   * Resolve a login identifier to a user. Accepts username or email.
   * Username match is case-insensitive when the exact spelling misses
   * (classrooms type Michael.Atkinson vs michael.atkinson). Email is
   * always compared case-insensitively. If the identifier contains `@`,
   * email is tried first.
   */
  async findForLogin(identifier: string): Promise<User | undefined> {
    const ident = identifier.trim();
    if (!ident) return undefined;

    const ci = ident.toLowerCase();
    const looksLikeEmail = ident.includes('@');
    const withCourses = () =>
      this.userRepository
        .createQueryBuilder('user')
        .leftJoinAndSelect('user.purchased_courses', 'purchased_courses');

    const byUsernameExact = () => this.getUserByUsername(ident);
    const byUsernameCi = () =>
      withCourses().where('LOWER(user.username) = :ci', { ci }).getOne();
    const byEmailCi = () =>
      withCourses().where('LOWER(user.email) = :ci', { ci }).getOne();

    if (looksLikeEmail) {
      return (
        (await byEmailCi()) ||
        (await byUsernameExact()) ||
        (await byUsernameCi()) ||
        undefined
      );
    }
    return (
      (await byUsernameExact()) ||
      (await byUsernameCi()) ||
      (await byEmailCi()) ||
      undefined
    );
  }

  async getUserByVerificationToken(token: string): Promise<User | undefined> {
    return this.userRepository.findOne({
      where: { email_verification_token: token },
    });
  }

  async getUsers(): Promise<User[]> {
    return this.userRepository.find();
  }

  async saveUser(userDto: UserDto): Promise<User> {
    await this.assertUniqueUsernameAndEmail(userDto.username, userDto.email);

    const hashedPassword = await UsersService.hashPassword(userDto.password);
    const user: User = {
      ...userDto,
      password: hashedPassword,
      role: Role.User,
      is_email_verified: true,
      email_verification_token: null,
      email_verification_expires_at: null,
      pro_membership_expires_at: undefined,
      purchased_courses: undefined,
      token_version: 0,
    };
    return this.userRepository.save(user);
  }

  async createUnverifiedUser(
    userDto: UserDto,
    verificationToken: string,
    expiresAt: Date,
  ): Promise<User> {
    await this.assertUniqueUsernameAndEmail(userDto.username, userDto.email);

    const hashedPassword = await UsersService.hashPassword(userDto.password);
    const user: User = {
      ...userDto,
      password: hashedPassword,
      role: Role.User,
      is_email_verified: false,
      email_verification_token: verificationToken,
      email_verification_expires_at: expiresAt,
      pro_membership_expires_at: undefined,
      purchased_courses: undefined,
      token_version: 0,
    };
    return this.userRepository.save(user);
  }

  private async assertUniqueUsernameAndEmail(
    username: string,
    email: string,
  ): Promise<void> {
    const [existingUsername, existingEmail] = await Promise.all([
      this.userRepository.findOne({ where: { username } }),
      this.userRepository.findOne({ where: { email } }),
    ]);
    if (existingUsername) {
      throw new BadRequestException(`Username "${username}" is already taken.`);
    }
    if (existingEmail) {
      throw new BadRequestException(`Email "${email}" is already registered.`);
    }
  }

  async updateUser(id: number, data: UpdateUserDto): Promise<User> {
    const user = await this.userRepository.findOneBy({ id });
    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }
    // Explicitly pick the updatable profile fields. Never merge the raw body:
    // extra keys (role, password, token_version, ...) must not reach the
    // entity even if the global ValidationPipe configuration regresses.
    if (data.email !== undefined) user.email = data.email;
    if (data.first_name !== undefined) user.first_name = data.first_name;
    if (data.last_name !== undefined) user.last_name = data.last_name;
    if (data.picture_url !== undefined) user.picture_url = data.picture_url;
    user.token_version = (user.token_version || 0) + 1;
    return this.userRepository.save(user);
  }

  async updatePassword(id: number, password: string): Promise<void> {
    const user = await this.userRepository.findOneBy({ id });
    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }
    user.password = password; // The password should already be hashed
    user.token_version = (user.token_version || 0) + 1;
    await this.userRepository.save(user);
  }

  /**
   * Full user list for the admin dashboard, including org membership and
   * per-course access provenance (purchase / admin gift / signup link).
   */
  async getUsersAdmin(): Promise<AdminUserRow[]> {
    const [users, memberships, accessRows] = await Promise.all([
      this.userRepository.find({ order: { submitted_at: 'DESC' } }),
      this.orgMemberRepository.find({ relations: ['organization'] }),
      this.dataSource.query(`
        SELECT ucp."usersId"        AS user_id,
               ucp."coursesId"      AS course_id,
               ucp."source"         AS source,
               ucp."granted_at"     AS granted_at,
               ucp."signup_link_id" AS signup_link_id,
               granter."username"   AS granted_by_username,
               c."title"            AS title
        FROM "user_courses_purchased" ucp
        JOIN "courses" c ON c."id" = ucp."coursesId"
        LEFT JOIN "users" granter ON granter."id" = ucp."granted_by_user_id"
      `) as Promise<
        Array<{
          user_id: number;
          course_id: number;
          source: CourseAccessSource;
          granted_at: Date | null;
          signup_link_id: number | null;
          granted_by_username: string | null;
          title: string;
        }>
      >,
    ]);

    const orgByUserId = new Map(
      memberships.map((m) => [
        m.userId,
        {
          id: m.organizationId,
          name: m.organization?.name ?? '',
          role: m.role,
        },
      ]),
    );
    const coursesByUserId = new Map<number, AdminUserCourse[]>();
    for (const row of accessRows) {
      const list = coursesByUserId.get(row.user_id) ?? [];
      list.push({
        id: row.course_id,
        title: row.title,
        source: row.source,
        granted_at: row.granted_at
          ? new Date(row.granted_at).toISOString()
          : null,
        granted_by_username: row.granted_by_username,
        signup_link_id: row.signup_link_id,
      });
      coursesByUserId.set(row.user_id, list);
    }

    return users.map((u) => ({
      id: u.id,
      username: u.username,
      email: u.email,
      first_name: u.first_name ?? null,
      last_name: u.last_name ?? null,
      role: u.role,
      is_email_verified: u.is_email_verified,
      submitted_at: u.submitted_at?.toISOString() ?? '',
      organization: orgByUserId.get(u.id) ?? null,
      courses: coursesByUserId.get(u.id) ?? [],
    }));
  }

  /** Gift a course to a user (admin action) — recorded with source='admin_grant'. */
  async grantCourseAccess(
    adminUserId: number,
    userId: number,
    courseId: number,
  ): Promise<void> {
    const user = await this.userRepository.findOneBy({ id: userId });
    if (!user) throw new NotFoundException(`User with ID ${userId} not found`);
    const course = await this.courseRepository.findOneBy({ id: courseId });
    if (!course)
      throw new NotFoundException(`Course with ID ${courseId} not found`);

    const result = await this.dataSource.query(
      `INSERT INTO "user_courses_purchased" ("usersId", "coursesId", "source", "granted_by_user_id")
       VALUES ($1, $2, 'admin_grant', $3)
       ON CONFLICT ("usersId", "coursesId") DO NOTHING
       RETURNING "usersId"`,
      [userId, courseId, adminUserId],
    );
    if (!result.length) {
      // Legacy row already there. Refuse only if the ledger agrees; otherwise
      // an earlier ledger write failed — fall through and repair it (matters
      // once ENTITLEMENTS_AUTHORITATIVE reads the ledger).
      if (await this.entitlements.hasLiveAccess(userId, courseId)) {
        throw new BadRequestException(
          'User already has access to this course.',
        );
      }
      this.logger.warn(
        `grantCourseAccess: user ${userId} has course ${courseId} in legacy table only — repairing ledger`,
      );
    } else {
      await this.incrementTokenVersion(userId);
      this.auditService.log(adminUserId, AuditAction.COURSE_GRANTED, {
        targetUserId: userId,
        courseId,
        courseTitle: course.title,
      });
    }
    await this.entitlements.grantCourse(userId, courseId, {
      source: 'admin_grant',
      grantedByUserId: adminUserId,
    });
  }

  /** Revoke a user's course access regardless of how it was acquired. */
  async revokeCourseAccess(
    adminUserId: number,
    userId: number,
    courseId: number,
  ): Promise<void> {
    const result = await this.dataSource.query(
      `DELETE FROM "user_courses_purchased" WHERE "usersId" = $1 AND "coursesId" = $2 RETURNING "usersId"`,
      [userId, courseId],
    );
    if (!result.length || !result[0]?.length) {
      throw new NotFoundException('User does not have access to this course.');
    }

    await this.incrementTokenVersion(userId);
    this.auditService.log(adminUserId, AuditAction.COURSE_REVOKED, {
      targetUserId: userId,
      courseId,
    });
    await this.entitlements.revokeCourse(userId, courseId, 'admin');
  }

  /**
   * Admin delete: refuses self-deletion and admin accounts, and removes
   * exam_attempts rows first (plain int user_id, no FK cascade). Everything
   * else (sessions, progress, comments, org membership, audit) cascades or
   * SET NULLs at the database level.
   */
  async deleteUserAsAdmin(id: number, actingAdminId: number): Promise<void> {
    const user = await this.userRepository.findOneBy({ id });
    if (!user) throw new NotFoundException(`User with ID ${id} not found`);
    if (id === actingAdminId)
      throw new BadRequestException(
        'You cannot delete your own account from the admin dashboard.',
      );
    if (user.role === Role.Admin)
      throw new ForbiddenException('Admin accounts cannot be deleted here.');

    await this.purgeAccount(user);
    this.auditService.log(actingAdminId, AuditAction.USER_DELETED, {
      targetUserId: id,
      username: user.username,
      email: user.email,
    });
    this.logger.log(
      `Admin ${actingAdminId} deleted user ${id} (${user.username})`,
    );
  }

  /**
   * Self-service deletion (App Store 5.1.1(v), privacy § 9). Requires the
   * current password. Refused for admins, and for students in a school
   * account — the school controls those accounts under its agreement.
   * Teachers (org managers) may delete their own account.
   */
  async deleteOwnAccount(userId: number, password: string): Promise<void> {
    const user = await this.userRepository.findOneBy({ id: userId });
    if (!user) throw new NotFoundException('User not found.');
    if (user.role === Role.Admin) {
      throw new ForbiddenException('Admin accounts cannot be self-deleted.');
    }
    const membership = await this.orgMemberRepository.findOneBy({ userId });
    if (membership?.role === OrgRole.Member) {
      throw new ForbiddenException(
        'Your school manages this account. Ask your teacher, or email us to delete it.',
      );
    }
    if (!(await UsersService.comparePassword(password, user.password))) {
      // 400, not 401: the web client treats 401 as an expired session and refreshes.
      throw new BadRequestException('Incorrect password.');
    }

    await this.purgeAccount(user);
    // Null actor: audit rows cascade-delete with their user (privacy § 7).
    this.auditService.log(null, AuditAction.USER_SELF_DELETED, {
      targetUserId: userId,
      username: user.username,
      email: user.email,
    });
    this.logger.log(`User ${userId} deleted their own account`);
  }

  /**
   * Shared by admin and self-service deletion so both remove the same data.
   * Database first (one transaction), then the Stripe customer: if the
   * database step fails nothing is touched in Stripe; if Stripe fails the
   * account is still gone and the admin is alerted to finish it by hand.
   */
  private async purgeAccount(user: User): Promise<void> {
    await this.deleteUser(user.id);
    if (user.stripe_customer_id) {
      await this.deleteStripeCustomer(user.id, user.stripe_customer_id);
    }
  }

  /**
   * Deletes the account and everything keyed on it. FK cascades cover
   * progress, entitlements, video_progress, memberships, comments, sessions
   * and the user's own audit rows; `orders` keep the row with `user_id` set
   * to NULL (tax / dispute retention, privacy § 7). The tables below have no
   * FK to users by design (partitioned or legacy), so they are cleared
   * explicitly. Waitlist / newsletter `leads` are keyed by email, not user,
   * and go too so a deleted user is never mailed again (NL-A1). The S3
   * analytics archive holds no user ids (PD23).
   */
  async deleteUser(id: number): Promise<void> {
    await this.userRepository.manager.transaction(async (tx) => {
      const user = await tx.getRepository(User).findOneBy({ id });
      if (!user) return;
      await tx.query(`DELETE FROM product_events WHERE user_id = $1`, [id]);
      await tx.query(`DELETE FROM product_events_daily WHERE user_id = $1`, [
        id,
      ]);
      await tx.query(`DELETE FROM exam_attempt_history WHERE user_id = $1`, [
        id,
      ]);
      await tx.query(`DELETE FROM exam_attempts WHERE user_id = $1`, [id]);
      await tx.query(
        `UPDATE exams SET created_by_user_id = NULL WHERE created_by_user_id = $1`,
        [id],
      );
      if (user.email) {
        const email = user.email.trim().toLowerCase();
        await tx.query(`DELETE FROM leads WHERE email = $1`, [email]);
        await tx.query(`DELETE FROM newsletter_sends WHERE email = $1`, [
          email,
        ]);
        await tx.query(`DELETE FROM newsletter_events WHERE email = $1`, [
          email,
        ]);
      }
      await tx.getRepository(User).delete(id);
    });
  }

  /**
   * Deleting a Stripe customer also cancels its subscriptions immediately
   * (no refund — Pro is cancel-anytime, no partial months). The resulting
   * customer.subscription.deleted webhook finds no user and is a no-op.
   */
  private async deleteStripeCustomer(
    userId: number,
    customerId: string,
  ): Promise<void> {
    try {
      await this.stripe.customers.del(customerId);
    } catch (err) {
      const message = (err as Error).message;
      this.logger.error(
        `Stripe customer ${customerId} for deleted user ${userId} not removed: ${message}`,
      );
      await this.emailService
        .sendAdminAlert(
          'Account deletion: Stripe customer needs manual removal',
          `User ${userId} deleted their Drone Edge account, but deleting Stripe customer ${customerId} failed:\n\n${message}\n\nIn the Stripe Dashboard, cancel any active subscription for this customer and delete the customer.`,
        )
        .catch((e) =>
          this.logger.error(`Admin alert failed: ${(e as Error).message}`),
        );
    }
  }

  async incrementTokenVersion(userId: number): Promise<void> {
    const user = await this.userRepository.findOneBy({ id: userId });
    if (user) {
      user.token_version = (user.token_version || 0) + 1;
      await this.userRepository.save(user);
    }
  }

  /**
   * A scheduled job that runs daily to deactivate expired Pro memberships.
   */
  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async handleExpiredProMemberships() {
    this.logger.log(
      'Running scheduled job: Deactivating expired Pro memberships...',
    );
    const expiredUsers = await this.userRepository.find({
      where: {
        role: Role.Pro,
        pro_membership_expires_at: LessThan(new Date()),
      },
    });

    if (expiredUsers.length > 0) {
      for (const user of expiredUsers) {
        user.role = Role.User;
        user.pro_membership_expires_at = null;
        user.token_version = (user.token_version || 0) + 1; // Invalidate tokens
      }
      await this.userRepository.save(expiredUsers);
      for (const user of expiredUsers) {
        await this.entitlements.revokePro(user.id, 'expired');
        this.auditService.log(user.id, AuditAction.PRO_EXPIRED, {});
        void this.productEvents.record({
          userId: user.id,
          event: 'pro_expired',
        });
      }
      this.logger.log(
        `Deactivated ${expiredUsers.length} expired Pro memberships.`,
      );
    } else {
      this.logger.log('No expired Pro memberships found.');
    }
  }
}
