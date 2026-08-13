import {
  BadRequestException,
  ForbiddenException,
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
      throw new BadRequestException('User already has access to this course.');
    }

    await this.incrementTokenVersion(userId);
    this.auditService.log(adminUserId, AuditAction.COURSE_GRANTED, {
      targetUserId: userId,
      courseId,
      courseTitle: course.title,
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

    await this.dataSource.query(
      `DELETE FROM "exam_attempts" WHERE "user_id" = $1`,
      [id],
    );
    await this.userRepository.delete(id);
    this.auditService.log(actingAdminId, AuditAction.USER_DELETED, {
      targetUserId: id,
      username: user.username,
      email: user.email,
    });
    this.logger.log(
      `Admin ${actingAdminId} deleted user ${id} (${user.username})`,
    );
  }

  async deleteUser(id: number): Promise<void> {
    await this.userRepository.delete(id);
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
      this.logger.log(
        `Deactivated ${expiredUsers.length} expired Pro memberships.`,
      );
    } else {
      this.logger.log('No expired Pro memberships found.');
    }
  }
}
