import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateCommentDto {
    @ApiProperty({ description: 'Comment body text' })
    @IsString()
    @IsNotEmpty()
    @MaxLength(5000)
    body: string;

    @ApiPropertyOptional({ description: 'Parent comment ID for replies' })
    @IsOptional()
    @IsInt()
    parent_id?: number;
}

export class UpdateCommentDto {
    @ApiProperty()
    @IsString()
    @IsNotEmpty()
    @MaxLength(5000)
    body: string;
}

export class CommentAuthor {
    id: number;
    username: string;
    first_name?: string;
    last_name?: string;
    picture_url?: string;
}

export class CommentResponse {
    id: number;
    body: string;
    author: CommentAuthor;
    parent_id: number | null;
    upvote_count: number;
    has_upvoted: boolean;
    created_at: Date;
    updated_at: Date;
    replies: CommentResponse[];
}
