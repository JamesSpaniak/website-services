import { Body, Controller, Delete, Get, Logger, Post, Query, Request, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { RolesGuard } from 'src/users/role.guard';
import { Roles } from 'src/users/role.decorator';
import { Role } from 'src/users/types/role.enum';
import { MediaService } from './media.service';
import { DeleteMediaDto, MediaFolder, PresignedUrlRequestDto, PresignedUrlResponseDto, ProfilePictureRequestDto } from './types/media.dto';

@ApiTags('Media')
@Controller('media')
@ApiBearerAuth()
export class MediaController {
    private readonly logger = new Logger(MediaController.name);

    constructor(private readonly mediaService: MediaService) {}

    @ApiOperation({ summary: 'Generate a presigned upload URL for the current user\'s profile picture' })
    @ApiResponse({ status: 201, description: 'Presigned upload URL generated.', type: PresignedUrlResponseDto })
    @Post('profile-picture')
    @UseGuards(JwtAuthGuard)
    async getProfilePictureUrl(
        @Request() req,
        @Body() dto: ProfilePictureRequestDto,
    ): Promise<PresignedUrlResponseDto> {
        const userId = req.user.userId;
        this.logger.log(`Generating profile picture presigned URL for user ${userId}`);
        return this.mediaService.generatePresignedUploadUrl(
            dto.filename,
            dto.contentType,
            MediaFolder.PROFILES,
            String(userId),
            2 * 1024 * 1024, // 2 MB limit
        );
    }

    @ApiOperation({ summary: 'Generate a presigned S3 upload URL (Admin only)' })
    @ApiResponse({ status: 201, description: 'Presigned upload URL generated.', type: PresignedUrlResponseDto })
    @Post('presigned-url')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(Role.Admin)
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
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(Role.Admin)
    async listMedia(
        @Query('folder') folder: MediaFolder,
        @Query('subfolder') subfolder?: string,
    ) {
        return this.mediaService.listMedia(folder, subfolder);
    }

    @ApiOperation({ summary: 'Delete a media file by S3 key (Admin only)' })
    @ApiResponse({ status: 200, description: 'Media file deleted.' })
    @Delete()
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(Role.Admin)
    async deleteMedia(@Body() dto: DeleteMediaDto): Promise<void> {
        this.logger.log(`Deleting media: ${dto.key}`);
        return this.mediaService.deleteMedia(dto.key);
    }
}
