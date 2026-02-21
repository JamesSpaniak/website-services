import { Injectable, Logger } from '@nestjs/common';
import { S3Client, PutObjectCommand, DeleteObjectCommand, DeleteObjectsCommand, ListObjectsV2Command } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { v4 as uuidv4 } from 'uuid';
import { MediaFolder } from './types/media.dto';

@Injectable()
export class MediaService {
    private readonly logger = new Logger(MediaService.name);
    private readonly s3Client: S3Client;
    private readonly bucketName: string;
    private readonly cloudfrontDomain: string;
    private readonly presignedUrlExpiry = 600; // 10 minutes

    constructor() {
        this.bucketName = process.env.S3_MEDIA_BUCKET || 'droneedge-media';
        this.cloudfrontDomain = process.env.CLOUDFRONT_MEDIA_DOMAIN || 'media.thedroneedge.com';

        this.s3Client = new S3Client({
            region: process.env.AWS_REGION || 'us-east-1',
        });
    }

    async generatePresignedUploadUrl(
        filename: string,
        contentType: string,
        folder: MediaFolder,
        subfolder?: string,
    ): Promise<{ uploadUrl: string; publicUrl: string; key: string }> {
        const ext = filename.substring(filename.lastIndexOf('.'));
        const uniqueName = `${uuidv4()}${ext}`;
        const keyParts = [folder, subfolder, uniqueName].filter(Boolean);
        const key = keyParts.join('/');

        const command = new PutObjectCommand({
            Bucket: this.bucketName,
            Key: key,
            ContentType: contentType,
        });

        const uploadUrl = await getSignedUrl(this.s3Client, command, {
            expiresIn: this.presignedUrlExpiry,
        });

        const publicUrl = `https://${this.cloudfrontDomain}/${key}`;

        this.logger.log(`Generated presigned URL for key: ${key}`);

        return { uploadUrl, publicUrl, key };
    }

    async deleteMedia(key: string): Promise<void> {
        const command = new DeleteObjectCommand({
            Bucket: this.bucketName,
            Key: key,
        });

        await this.s3Client.send(command);
        this.logger.log(`Deleted media: ${key}`);
    }

    /**
     * Extracts S3 keys from CloudFront URLs that belong to this media bucket.
     */
    extractKeysFromUrls(urls: string[]): string[] {
        const prefix = `https://${this.cloudfrontDomain}/`;
        return urls
            .filter(url => url.startsWith(prefix))
            .map(url => url.substring(prefix.length));
    }

    async deleteMultipleMedia(keys: string[]): Promise<void> {
        if (keys.length === 0) return;

        // S3 DeleteObjects supports up to 1000 keys per request
        const batches: string[][] = [];
        for (let i = 0; i < keys.length; i += 1000) {
            batches.push(keys.slice(i, i + 1000));
        }

        for (const batch of batches) {
            const command = new DeleteObjectsCommand({
                Bucket: this.bucketName,
                Delete: {
                    Objects: batch.map(key => ({ Key: key })),
                    Quiet: true,
                },
            });
            await this.s3Client.send(command);
        }

        this.logger.log(`Deleted ${keys.length} media objects from S3`);
    }

    async listMedia(folder: MediaFolder, subfolder?: string): Promise<{ key: string; publicUrl: string; lastModified?: Date; size?: number }[]> {
        const prefix = [folder, subfolder].filter(Boolean).join('/') + '/';

        const command = new ListObjectsV2Command({
            Bucket: this.bucketName,
            Prefix: prefix,
        });

        const response = await this.s3Client.send(command);

        return (response.Contents || []).map((obj) => ({
            key: obj.Key,
            publicUrl: `https://${this.cloudfrontDomain}/${obj.Key}`,
            lastModified: obj.LastModified,
            size: obj.Size,
        }));
    }
}
