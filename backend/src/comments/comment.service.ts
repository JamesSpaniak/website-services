import {
    Injectable,
    NotFoundException,
    ForbiddenException,
    BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Comment } from './types/comment.entity';
import { CommentVote } from './types/comment-vote.entity';
import { CommentResponse, CommentAuthor } from './types/comment.dto';
import { Role } from '../users/types/role.enum';

@Injectable()
export class CommentService {
    constructor(
        @InjectRepository(Comment)
        private commentRepository: Repository<Comment>,
        @InjectRepository(CommentVote)
        private voteRepository: Repository<CommentVote>,
    ) {}

    async getCommentsForArticle(articleId: number, currentUserId?: number): Promise<CommentResponse[]> {
        const comments = await this.commentRepository.find({
            where: { articleId },
            relations: ['user'],
            order: { created_at: 'ASC' },
        });

        let userVotedCommentIds = new Set<number>();
        if (currentUserId && comments.length > 0) {
            const commentIds = comments.map((c) => c.id);
            const votes = await this.voteRepository
                .createQueryBuilder('v')
                .select('v.commentId')
                .where('v.userId = :userId', { userId: currentUserId })
                .andWhere('v.commentId IN (:...commentIds)', { commentIds })
                .getRawMany();
            userVotedCommentIds = new Set(votes.map((v) => v.v_comment_id));
        }

        return this.buildTree(comments, userVotedCommentIds);
    }

    async createComment(
        articleId: number,
        userId: number,
        body: string,
        parentId?: number,
    ): Promise<CommentResponse> {
        if (parentId) {
            const parent = await this.commentRepository.findOne({
                where: { id: parentId, articleId },
            });
            if (!parent) {
                throw new BadRequestException('Parent comment not found in this article.');
            }
        }

        const comment = this.commentRepository.create({
            articleId,
            userId,
            body,
            parentId: parentId || null,
        });
        const saved = await this.commentRepository.save(comment);

        const full = await this.commentRepository.findOne({
            where: { id: saved.id },
            relations: ['user'],
        });

        return this.toResponse(full!, false);
    }

    async updateComment(commentId: number, userId: number, userRole: Role, body: string): Promise<CommentResponse> {
        const comment = await this.commentRepository.findOne({
            where: { id: commentId },
            relations: ['user'],
        });
        if (!comment) throw new NotFoundException('Comment not found.');

        if (comment.userId !== userId && userRole !== Role.Admin) {
            throw new ForbiddenException('You can only edit your own comments.');
        }

        comment.body = body;
        await this.commentRepository.save(comment);

        return this.toResponse(comment, false);
    }

    async deleteComment(commentId: number, userId: number, userRole: Role): Promise<void> {
        const comment = await this.commentRepository.findOne({ where: { id: commentId } });
        if (!comment) throw new NotFoundException('Comment not found.');

        if (comment.userId !== userId && userRole !== Role.Admin) {
            throw new ForbiddenException('You can only delete your own comments.');
        }

        await this.commentRepository.remove(comment);
    }

    async toggleUpvote(commentId: number, userId: number): Promise<{ upvote_count: number; has_upvoted: boolean }> {
        const comment = await this.commentRepository.findOne({ where: { id: commentId } });
        if (!comment) throw new NotFoundException('Comment not found.');

        const existing = await this.voteRepository.findOne({
            where: { commentId, userId },
        });

        if (existing) {
            await this.voteRepository.remove(existing);
            comment.upvote_count = Math.max(0, comment.upvote_count - 1);
            await this.commentRepository.save(comment);
            return { upvote_count: comment.upvote_count, has_upvoted: false };
        }

        const vote = this.voteRepository.create({ commentId, userId });
        await this.voteRepository.save(vote);
        comment.upvote_count += 1;
        await this.commentRepository.save(comment);
        return { upvote_count: comment.upvote_count, has_upvoted: true };
    }

    private buildTree(comments: Comment[], userVotedIds: Set<number>): CommentResponse[] {
        const map = new Map<number, CommentResponse>();
        const roots: CommentResponse[] = [];

        for (const c of comments) {
            map.set(c.id, this.toResponse(c, userVotedIds.has(c.id)));
        }

        for (const c of comments) {
            const node = map.get(c.id)!;
            if (c.parentId && map.has(c.parentId)) {
                map.get(c.parentId)!.replies.push(node);
            } else {
                roots.push(node);
            }
        }

        return roots;
    }

    private toResponse(comment: Comment, hasUpvoted: boolean): CommentResponse {
        const author: CommentAuthor = {
            id: comment.user.id!,
            username: comment.user.username,
            first_name: comment.user.first_name,
            last_name: comment.user.last_name,
            picture_url: comment.user.picture_url,
        };

        return {
            id: comment.id,
            body: comment.body,
            author,
            parent_id: comment.parentId,
            upvote_count: comment.upvote_count,
            has_upvoted: hasUpvoted,
            created_at: comment.created_at,
            updated_at: comment.updated_at,
            replies: [],
        };
    }
}
