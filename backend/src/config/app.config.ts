import { DataSourceOptions } from 'typeorm';
import { Article } from '../articles/types/article.entity';
import { User } from '../users/types/user.entity';
import { Course } from '../courses/types/course.entity';
import { Progress } from '../progress/types/progress.entity';
import { Session } from '../auth/types/session.entity';
import { Organization } from '../organizations/types/organization.entity';
import { OrganizationMember } from '../organizations/types/organization-member.entity';
import { InviteCode } from '../organizations/types/invite-code.entity';
import { AuditLog } from '../audit/types/audit-log.entity';
import { Comment } from '../comments/types/comment.entity';
import { CommentVote } from '../comments/types/comment-vote.entity';


const useSsl = process.env.DB_SSL === 'true' || process.env.DB_SSL === '1';

const defaultConnection: DataSourceOptions = {
    type: 'postgres',
    database: process.env.DB_NAME || 'blog',
    username: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT || '5432'),
    ssl: useSsl ? { rejectUnauthorized: false } : undefined,
    synchronize: false,
    entities: [
        Article,
        Course,
        User,
        Progress,
        Session,
        Organization,
        OrganizationMember,
        InviteCode,
        AuditLog,
        Comment,
        CommentVote,
    ],
    migrations: [
        'dist/**/migrations/**'
    ]
};

export {
    defaultConnection,
}