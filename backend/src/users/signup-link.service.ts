import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, In, Repository } from 'typeorm';
import * as crypto from 'crypto';
import { ConfigService } from '@nestjs/config';
import { SignupLink, SignupLinkKind } from './types/signup-link.entity';
import { Course } from '../courses/types/course.entity';
import { EmailService } from '../email/email.service';
import { AuditService } from '../audit/audit.service';
import { AuditAction } from '../audit/types/audit-action.enum';
import {
  CreateSignupLinkDto,
  SignupLinkInfo,
  SignupLinkRow,
} from './types/admin-users.dto';

/**
 * Admin-generated signup links (`/register?signup=CODE`).
 *
 * One-time links grant the listed courses free to the account that redeems
 * them. The schema also carries kind/max_uses/discount fields so multi-use
 * campaign links (e.g. discounted social-media promos) can be layered on
 * without a migration — see SignupLink entity docs.
 */
@Injectable()
export class SignupLinkService {
  private readonly logger = new Logger(SignupLinkService.name);

  constructor(
    @InjectRepository(SignupLink)
    private readonly signupLinkRepository: Repository<SignupLink>,
    @InjectRepository(Course)
    private readonly courseRepository: Repository<Course>,
    private readonly dataSource: DataSource,
    private readonly emailService: EmailService,
    private readonly configService: ConfigService,
    private readonly auditService: AuditService,
  ) {}

  async create(
    adminUserId: number,
    dto: CreateSignupLinkDto,
  ): Promise<SignupLinkRow> {
    const courses = await this.courseRepository.findBy({
      id: In(dto.course_ids),
    });
    if (courses.length !== dto.course_ids.length) {
      const found = new Set(courses.map((c) => c.id));
      const missing = dto.course_ids.filter((id) => !found.has(id));
      throw new BadRequestException(
        `Course(s) not found: ${missing.join(', ')}`,
      );
    }

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + (dto.expires_in_days ?? 30));

    const link = await this.signupLinkRepository.save(
      this.signupLinkRepository.create({
        code: crypto.randomBytes(8).toString('hex'),
        kind: SignupLinkKind.OneTime,
        email: dto.email?.trim().toLowerCase() || null,
        courseIds: dto.course_ids,
        note: dto.note?.trim() || null,
        maxUses: 1,
        useCount: 0,
        createdByUserId: adminUserId,
        expiresAt,
      }),
    );

    this.auditService.log(adminUserId, AuditAction.SIGNUP_LINK_CREATED, {
      signupLinkId: link.id,
      courseIds: dto.course_ids,
      email: link.email,
      note: link.note,
    });

    if (link.email) {
      const registerUrl = this.buildRegisterUrl(link.code);
      try {
        await this.emailService.sendSignupLinkEmail(
          link.email,
          courses.map((c) => c.title),
          registerUrl,
        );
      } catch (err) {
        this.logger.error(
          `Failed to send signup link email to ${link.email}: ${(err as Error).message}`,
        );
      }
    }

    return this.toRow(link, courses);
  }

  async list(): Promise<SignupLinkRow[]> {
    const links = await this.signupLinkRepository.find({
      relations: ['createdBy', 'usedBy'],
      order: { createdAt: 'DESC' },
    });
    const courseIds = [...new Set(links.flatMap((l) => l.courseIds))];
    const courses = courseIds.length
      ? await this.courseRepository.findBy({ id: In(courseIds) })
      : [];
    const courseById = new Map(courses.map((c) => [c.id, c]));
    return links.map((link) =>
      this.toRow(
        link,
        link.courseIds
          .map((id) => courseById.get(id))
          .filter(Boolean) as Course[],
      ),
    );
  }

  /** Revoke an unused link. Redeemed links are kept as provenance records. */
  async delete(id: number): Promise<void> {
    const link = await this.signupLinkRepository.findOneBy({ id });
    if (!link) {
      throw new NotFoundException(`Signup link ${id} not found.`);
    }
    if (link.useCount > 0) {
      throw new BadRequestException(
        'This link has been redeemed and cannot be deleted (kept for records).',
      );
    }
    await this.signupLinkRepository.delete(id);
  }

  /** Public lookup for the register page (`?signup=CODE`). Never throws for bad codes. */
  async getInfo(code: string): Promise<SignupLinkInfo> {
    const link = await this.signupLinkRepository.findOneBy({
      code: code.trim(),
    });
    if (!link) return { valid: false, reason: 'not_found' };
    if (link.expiresAt < new Date()) return { valid: false, reason: 'expired' };
    if (link.maxUses != null && link.useCount >= link.maxUses)
      return { valid: false, reason: 'used' };

    const courses = link.courseIds.length
      ? await this.courseRepository.findBy({ id: In(link.courseIds) })
      : [];
    return {
      valid: true,
      kind: link.kind,
      courses: courses.map((c) => ({ id: c.id, title: c.title })),
      email_locked: !!link.email,
      expires_at: link.expiresAt.toISOString(),
    };
  }

  /**
   * Validation-only check used before creating the account, so registration
   * fails fast on a bad code instead of leaving a linkless account behind.
   */
  async assertRedeemable(code: string, email: string): Promise<void> {
    const link = await this.signupLinkRepository.findOneBy({
      code: code.trim(),
    });
    if (!link) throw new BadRequestException('Invalid signup link.');
    this.assertLinkUsable(link, email);
  }

  /**
   * Redeem a link for a freshly registered user: locks the row, re-validates,
   * increments usage, and grants the listed courses with provenance
   * (`source = 'signup_link'`).
   */
  async consume(code: string, userId: number, email: string): Promise<void> {
    await this.dataSource.transaction(async (manager) => {
      const link = await manager
        .getRepository(SignupLink)
        .createQueryBuilder('link')
        .setLock('pessimistic_write')
        .where('link.code = :code', { code: code.trim() })
        .getOne();

      if (!link) throw new BadRequestException('Invalid signup link.');
      this.assertLinkUsable(link, email);

      await manager.update(SignupLink, link.id, {
        useCount: link.useCount + 1,
        usedByUserId: userId,
        usedAt: new Date(),
      });

      for (const courseId of link.courseIds) {
        await manager.query(
          `INSERT INTO "user_courses_purchased" ("usersId", "coursesId", "source", "signup_link_id")
                     VALUES ($1, $2, 'signup_link', $3)
                     ON CONFLICT ("usersId", "coursesId") DO NOTHING`,
          [userId, courseId, link.id],
        );
      }

      this.auditService.log(userId, AuditAction.SIGNUP_LINK_REDEEMED, {
        signupLinkId: link.id,
        courseIds: link.courseIds,
      });
    });
  }

  private assertLinkUsable(link: SignupLink, email: string): void {
    if (link.expiresAt < new Date()) {
      throw new BadRequestException('This signup link has expired.');
    }
    if (link.maxUses != null && link.useCount >= link.maxUses) {
      throw new BadRequestException('This signup link has already been used.');
    }
    if (link.email && link.email !== email.trim().toLowerCase()) {
      throw new BadRequestException(
        'This signup link is reserved for a different email address.',
      );
    }
  }

  private buildRegisterUrl(code: string): string {
    return `${this.configService.get<string>('FRONTEND_URL')}/register?signup=${code}`;
  }

  private toRow(link: SignupLink, courses: Course[]): SignupLinkRow {
    const now = new Date();
    const exhausted = link.maxUses != null && link.useCount >= link.maxUses;
    return {
      id: link.id,
      code: link.code,
      kind: link.kind,
      email: link.email,
      note: link.note,
      courses: courses.map((c) => ({ id: c.id, title: c.title })),
      max_uses: link.maxUses,
      use_count: link.useCount,
      created_by_username: link.createdBy?.username ?? null,
      used_by_username: link.usedBy?.username ?? null,
      used_at: link.usedAt ? link.usedAt.toISOString() : null,
      expires_at: link.expiresAt.toISOString(),
      created_at: link.createdAt.toISOString(),
      status: exhausted ? 'used' : link.expiresAt < now ? 'expired' : 'active',
    };
  }
}
