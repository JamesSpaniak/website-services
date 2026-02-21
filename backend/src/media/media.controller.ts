import { Body, Controller, Delete, Get, Logger, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { RolesGuard } from 'src/users/role.guard';
import { Roles } from 'src/users/role.decorator';
import { Role } from 'src/users/types/role.enum';
import { MediaService } from './media.service';
import { DeleteMediaDto, MediaFolder, PresignedUrlRequestDto, PresignedUrlResponseDto } from './types/media.dto';

@ApiTags('Media')
@Controller('media')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.Admin)
@ApiBearerAuth()
export class MediaController {
    private readonly logger = new Logger(MediaController.name);

    constructor(private readonly mediaService: MediaService) {}

    @ApiOperation({ summary: 'Generate a presigned S3 upload URL (Admin only)' })
    @ApiResponse({ status: 201, description: 'Presigned upload URL generated.', type: PresignedUrlResponseDto })
    @Post('presigned-url')
    async getPresignedUrl(@Body() dto: PresignedUrlRequestDto): Promise<PresignedUrlResponseDto> {
        this.logger.log(`Generating presigned URL for ${dto.filename} in ${dto.folder}`);
        return this.mediaService.generatePresignedUploadUrl(
            dto.filename,
            dto.contentType,
            dto.folder,
            dto.subfolder,
        );
    }

    @ApiOperation({ summary: 'List media files in a folder (Admin only)' })
    @ApiQuery({ name: 'folder', enum: MediaFolder })
    @ApiQuery({ name: 'subfolder', required: false })
    @Get()
    async listMedia(
        @Query('folder') folder: MediaFolder,
        @Query('subfolder') subfolder?: string,
    ) {
        return this.mediaService.listMedia(folder, subfolder);
    }

    @ApiOperation({ summary: 'Delete a media file by S3 key (Admin only)' })
    @ApiResponse({ status: 200, description: 'Media file deleted.' })
    @Delete()
    async deleteMedia(@Body() dto: DeleteMediaDto): Promise<void> {
        this.logger.log(`Deleting media: ${dto.key}`);
        return this.mediaService.deleteMedia(dto.key);
    }
}
