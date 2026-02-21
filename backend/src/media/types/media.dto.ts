import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsOptional, IsString, Matches } from 'class-validator';

export enum MediaFolder {
    ARTICLES = 'articles',
    COURSES = 'courses',
}

export class PresignedUrlRequestDto {
    @ApiProperty({ description: 'Original filename including extension' })
    @IsString()
    @IsNotEmpty()
    filename: string;

    @ApiProperty({ description: 'MIME type of the file', example: 'image/jpeg' })
    @IsString()
    @IsNotEmpty()
    @Matches(/^(image\/(jpeg|png|gif|webp|svg\+xml)|video\/(mp4|webm|quicktime))$/, {
        message: 'contentType must be a supported image or video MIME type',
    })
    contentType: string;

    @ApiProperty({ enum: MediaFolder, description: 'Target folder (articles or courses)' })
    @IsEnum(MediaFolder)
    folder: MediaFolder;

    @ApiPropertyOptional({ description: 'Optional subfolder path, e.g. a course or article ID' })
    @IsOptional()
    @IsString()
    subfolder?: string;
}

export class PresignedUrlResponseDto {
    @ApiProperty({ description: 'Presigned PUT URL for direct upload to S3' })
    uploadUrl: string;

    @ApiProperty({ description: 'Public CloudFront URL where the file will be accessible after upload' })
    publicUrl: string;

    @ApiProperty({ description: 'The S3 object key' })
    key: string;
}

export class DeleteMediaDto {
    @ApiProperty({ description: 'The S3 object key to delete' })
    @IsString()
    @IsNotEmpty()
    key: string;
}
