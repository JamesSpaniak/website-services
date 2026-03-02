import { CanActivate, ExecutionContext, Injectable, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { OrganizationMember } from './types/organization-member.entity';
import { OrgRole } from './types/org-role.enum';
import { Role } from '../users/types/role.enum';

@Injectable()
export class OrgManagerGuard implements CanActivate {
    constructor(
        @InjectRepository(OrganizationMember)
        private memberRepository: Repository<OrganizationMember>,
    ) {}

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const request = context.switchToHttp().getRequest();
        const user = request.user;

        if (!user) {
            throw new ForbiddenException('Authentication required.');
        }

        if (user.role === Role.Admin) {
            return true;
        }

        const orgId = parseInt(request.params.id, 10);
        if (isNaN(orgId)) {
            throw new ForbiddenException('Invalid organization ID.');
        }

        const membership = await this.memberRepository.findOne({
            where: { organizationId: orgId, userId: user.userId, role: OrgRole.Manager },
        });

        if (!membership) {
            throw new ForbiddenException('You must be a manager of this organization.');
        }

        return true;
    }
}
