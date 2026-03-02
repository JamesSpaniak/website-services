import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Comment } from './types/comment.entity';
import { CommentVote } from './types/comment-vote.entity';
import { CommentController } from './comment.controller';
import { CommentService } from './comment.service';

@Module({
    imports: [TypeOrmModule.forFeature([Comment, CommentVote])],
    controllers: [CommentController],
    providers: [CommentService],
})
export class CommentModule {}
