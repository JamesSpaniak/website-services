import {
    Body,
    Controller,
    Delete,
    Get,
    Param,
    ParseIntPipe,
    Patch,
    Post,
    Request,
    UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { OptionalJwtAuthGuard } from '../auth/optional-jwt-auth.guard';
import { CommentService } from './comment.service';
import { CreateCommentDto, UpdateCommentDto, CommentResponse } from './types/comment.dto';

@ApiTags('Comments')
@Controller()
export class CommentController {
    constructor(private readonly commentService: CommentService) {}

    @ApiOperation({ summary: 'Get all comments for an article (threaded)' })
    @Get('articles/:articleId/comments')
    @UseGuards(OptionalJwtAuthGuard)
    async getComments(
        @Param('articleId', ParseIntPipe) articleId: number,
        @Request() req,
    ): Promise<CommentResponse[]> {
        return this.commentService.getCommentsForArticle(articleId, req.user?.userId);
    }

    @ApiOperation({ summary: 'Add a comment to an article' })
    @ApiBearerAuth()
    @Post('articles/:articleId/comments')
    @UseGuards(JwtAuthGuard)
    async createComment(
        @Param('articleId', ParseIntPipe) articleId: number,
        @Request() req,
        @Body() dto: CreateCommentDto,
    ): Promise<CommentResponse> {
        return this.commentService.createComment(articleId, req.user.userId, dto.body, dto.parent_id);
    }

    @ApiOperation({ summary: 'Edit a comment (own or admin)' })
    @ApiBearerAuth()
    @Patch('comments/:commentId')
    @UseGuards(JwtAuthGuard)
    async updateComment(
        @Param('commentId', ParseIntPipe) commentId: number,
        @Request() req,
        @Body() dto: UpdateCommentDto,
    ): Promise<CommentResponse> {
        return this.commentService.updateComment(commentId, req.user.userId, req.user.role, dto.body);
    }

    @ApiOperation({ summary: 'Delete a comment (own or admin)' })
    @ApiBearerAuth()
    @Delete('comments/:commentId')
    @UseGuards(JwtAuthGuard)
    async deleteComment(
        @Param('commentId', ParseIntPipe) commentId: number,
        @Request() req,
    ): Promise<void> {
        return this.commentService.deleteComment(commentId, req.user.userId, req.user.role);
    }

    @ApiOperation({ summary: 'Toggle upvote on a comment' })
    @ApiBearerAuth()
    @Post('comments/:commentId/upvote')
    @UseGuards(JwtAuthGuard)
    async toggleUpvote(
        @Param('commentId', ParseIntPipe) commentId: number,
        @Request() req,
    ): Promise<{ upvote_count: number; has_upvoted: boolean }> {
        return this.commentService.toggleUpvote(commentId, req.user.userId);
    }
}
