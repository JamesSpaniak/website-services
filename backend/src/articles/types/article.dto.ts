import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  ValidateNested,
} from 'class-validator';
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

  @ApiProperty({
    description: 'HTML for text blocks, URL for image/video blocks',
  })
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

  @ApiPropertyOptional({
    description:
      'URL segment (lowercase words joined by hyphens). Generated from the title when omitted on create; kept unchanged when omitted on update.',
    example: 'drone-careers-2026',
  })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, {
    message: 'slug must be lowercase letters, numbers and single hyphens',
  })
  slug?: string;

  @ApiPropertyOptional({ type: [String], example: ['Schools', 'Part 107'] })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(8)
  @IsString({ each: true })
  @MaxLength(40, { each: true })
  tags?: string[];

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
  /** Estimated reading time at ~230 words per minute (min 1). Computed, not stored. */
  read_minutes?: number;
}

type ArticleFull = ArticleDto & ArticleDtoResponseOnly;

type ArticleSlim = Omit<ArticleDto, 'body' | 'content_blocks'> &
  ArticleDtoResponseOnly;

export { ArticleFull, ArticleSlim };
