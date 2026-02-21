import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsBoolean, IsNotEmpty, IsOptional, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class ContentBlockDto {
    @ApiProperty()
    @IsString()
    @IsNotEmpty()
    id: string;

    @ApiProperty({ enum: ['text', 'image', 'video'] })
    @IsString()
    @IsNotEmpty()
    type: 'text' | 'image' | 'video';

    @ApiProperty({ description: 'HTML for text blocks, URL for image/video blocks' })
    @IsString()
    @IsNotEmpty()
    content: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    alt?: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    caption?: string;
}

export class ArticleDto {
    @ApiProperty()
    @IsString()
    @IsNotEmpty()
    title: string;

    @ApiProperty()
    @IsString()
    @IsNotEmpty()
    sub_heading: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    image_url?: string;

    @ApiProperty()
    @IsString()
    body: string;

    @ApiPropertyOptional({ type: [ContentBlockDto] })
    @IsOptional()
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => ContentBlockDto)
    content_blocks?: ContentBlockDto[];

    @ApiProperty()
    @IsBoolean()
    hidden: boolean;
}

class ArticleDtoResponseOnly {
    id?: number;
    submitted_at?: Date;
    updated_at?: Date;
}

type ArticleFull = ArticleDto & ArticleDtoResponseOnly;

type ArticleSlim = Omit<ArticleDto, 'body' | 'content_blocks'> & ArticleDtoResponseOnly;

export {
    ArticleFull,
    ArticleSlim,
}
