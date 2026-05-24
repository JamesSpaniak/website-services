import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { OrganizationMember } from 'src/organizations/types/organization-member.entity';
import { OrgRole } from 'src/organizations/types/org-role.enum';
import { Role } from 'src/users/types/role.enum';

/**
 * Allows access when the authenticated user is either:
 *  - An Admin (site-wide), or
 *  - A Manager in at least one organization.
 *
 * Fine-grained org-ownership checks (e.g. ensuring the manager belongs to the
 * *specific* org being accessed) are handled at the service/controller level.
 */
@Injectable()
export class ManagerOrAdminGuard implements CanActivate {
  constructor(
    @InjectRepository(OrganizationMember)
    private readonly memberRepository: Repository<OrganizationMember>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) return false;

    // Site admins always pass
    if (user.role === Role.Admin) return true;

    // Check if the user has the 'manager' role in any organization
    const count = await this.memberRepository.count({
      where: { userId: user.userId, role: OrgRole.Manager },
    });

    return count > 0;
  }
}
