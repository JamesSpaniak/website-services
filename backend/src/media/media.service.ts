import { Injectable, Logger } from '@nestjs/common';
import {
    S3Client,
    PutObjectCommand,
    DeleteObjectCommand,
    DeleteObjectsCommand,
    ListObjectsV2Command,
    CreateMultipartUploadCommand,
    CompleteMultipartUploadCommand,
    UploadPartCommand,
    AbortMultipartUploadCommand,
} from '@aws-sdk/client-s3';
import { CloudFrontClient, CreateInvalidationCommand } from '@aws-sdk/client-cloudfront';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { v4 as uuidv4 } from 'uuid';
import { MediaFolder } from './types/media.dto';

const MAX_BYTES: Record<MediaFolder, number> = {
    [MediaFolder.PROFILES]: 2 * 1024 * 1024,        // 2 MB
    [MediaFolder.ARTICLES]: 100 * 1024 * 1024,       // 100 MB
    [MediaFolder.COURSES]:  5 * 1024 * 1024 * 1024,  // 5 GB (multipart for large videos)
};

const PRESIGNED_URL_EXPIRY = 600;
const MULTIPART_PART_EXPIRY = 3600;
const MULTIPART_THRESHOLD = 100 * 1024 * 1024; // 100 MB — use multipart above this

@Injectable()
export class MediaService {
    private readonly logger = new Logger(MediaService.name);
    private readonly s3Client: S3Client;
    private readonly cfClient: CloudFrontClient;
    private readonly bucketName: string;
    private readonly cloudfrontDomain: string;
    private readonly cloudfrontDistributionId: string;

    constructor() {
        this.bucketName = process.env.S3_MEDIA_BUCKET || 'droneedge-media';
        this.cloudfrontDomain = process.env.CLOUDFRONT_MEDIA_DOMAIN || 'media.thedroneedge.com';
        this.cloudfrontDistributionId = process.env.CLOUDFRONT_DISTRIBUTION_ID || '';

        const region = process.env.AWS_REGION || 'us-east-1';
        this.s3Client = new S3Client({ region });
        this.cfClient = new CloudFrontClient({ region });
    }

    getMaxBytes(folder: MediaFolder): number {
        return MAX_BYTES[folder];
    }

    async generatePresignedUploadUrl(
        filename: string,
        contentType: string,
        folder: MediaFolder,
        subfolder?: string,
        maxBytes?: number,
    ): Promise<{ uploadUrl: string; publicUrl: string; key: string }> {
        const ext = filename.substring(filename.lastIndexOf('.'));
        const uniqueName = `${uuidv4()}${ext}`;
        const keyParts = [folder, subfolder, uniqueName].filter(Boolean);
        const key = keyParts.join('/');

        const effectiveMaxBytes = maxBytes ?? MAX_BYTES[folder];

        const command = new PutObjectCommand({
            Bucket: this.bucketName,
            Key: key,
            ContentType: contentType,
        });

        const uploadUrl = await getSignedUrl(this.s3Client, command, {
            expiresIn: PRESIGNED_URL_EXPIRY,
            signableHeaders: new Set(['content-type']),
            ...(effectiveMaxBytes <= MULTIPART_THRESHOLD
                ? { conditions: [['content-length-range', 1, effectiveMaxBytes]] }
                : {}),
        });

        const publicUrl = `https://${this.cloudfrontDomain}/${key}`;
        this.logger.log(`Presigned URL for ${key} (max ${effectiveMaxBytes} bytes)`);

        return { uploadUrl, publicUrl, key };
    }

    // ── Multipart upload (large files) ─────────────────────────────────

    async initiateMultipartUpload(
        filename: string,
        contentType: string,
        folder: MediaFolder,
        subfolder?: string,
    ): Promise<{ uploadId: string; key: string; publicUrl: string }> {
        const ext = filename.substring(filename.lastIndexOf('.'));
        const uniqueName = `${uuidv4()}${ext}`;
        const key = [folder, subfolder, uniqueName].filter(Boolean).join('/');

        const { UploadId } = await this.s3Client.send(
            new CreateMultipartUploadCommand({
                Bucket: this.bucketName,
                Key: key,
                ContentType: contentType,
            }),
        );

        this.logger.log(`Initiated multipart upload ${UploadId} for ${key}`);
        return {
            uploadId: UploadId,
            key,
            publicUrl: `https://${this.cloudfrontDomain}/${key}`,
        };
    }

    async generatePartPresignedUrl(
        key: string,
        uploadId: string,
        partNumber: number,
    ): Promise<string> {
        const command = new UploadPartCommand({
            Bucket: this.bucketName,
            Key: key,
            UploadId: uploadId,
            PartNumber: partNumber,
        });

        return getSignedUrl(this.s3Client, command, { expiresIn: MULTIPART_PART_EXPIRY });
    }

    async completeMultipartUpload(
        key: string,
        uploadId: string,
        parts: { ETag: string; PartNumber: number }[],
    ): Promise<void> {
        await this.s3Client.send(
            new CompleteMultipartUploadCommand({
                Bucket: this.bucketName,
                Key: key,
                UploadId: uploadId,
                MultipartUpload: { Parts: parts },
            }),
        );
        this.logger.log(`Completed multipart upload for ${key}`);
    }

    async abortMultipartUpload(key: string, uploadId: string): Promise<void> {
        await this.s3Client.send(
            new AbortMultipartUploadCommand({
                Bucket: this.bucketName,
                Key: key,
                UploadId: uploadId,
            }),
        );
        this.logger.log(`Aborted multipart upload ${uploadId} for ${key}`);
    }

    // ── Delete + invalidate ────────────────────────────────────────────

    async deleteMedia(key: string): Promise<void> {
        await this.s3Client.send(
            new DeleteObjectCommand({ Bucket: this.bucketName, Key: key }),
        );
        void this.invalidateCloudFrontPaths([`/${key}`]).catch((err) =>
            this.logger.warn(`CF invalidation (delete ${key}): ${(err as Error).message}`),
        );
        this.logger.log(`Deleted media: ${key}`);
    }

    extractKeysFromUrls(urls: string[]): string[] {
        const prefix = `https://${this.cloudfrontDomain}/`;
        return urls
            .filter(url => url.startsWith(prefix))
            .map(url => url.substring(prefix.length));
    }

    async deleteMultipleMedia(keys: string[]): Promise<void> {
        if (keys.length === 0) return;

        const batches: string[][] = [];
        for (let i = 0; i < keys.length; i += 1000) {
            batches.push(keys.slice(i, i + 1000));
        }

        for (const batch of batches) {
            await this.s3Client.send(
                new DeleteObjectsCommand({
                    Bucket: this.bucketName,
                    Delete: { Objects: batch.map(k => ({ Key: k })), Quiet: true },
                }),
            );
        }

        // Do not await: invalidation can exceed ALB/API timeouts; objects are already gone from S3.
        void this.invalidateCloudFrontPaths(keys.map(k => `/${k}`)).catch((err) =>
            this.logger.warn(`CF invalidation after bulk delete: ${(err as Error).message}`),
        );
        this.logger.log(`Deleted ${keys.length} media objects from S3`);
    }

    // ── CloudFront invalidation ────────────────────────────────────────

    async invalidateCloudFrontPaths(paths: string[]): Promise<void> {
        if (!this.cloudfrontDistributionId || paths.length === 0) return;

        try {
            await this.cfClient.send(
                new CreateInvalidationCommand({
                    DistributionId: this.cloudfrontDistributionId,
                    InvalidationBatch: {
                        CallerReference: `${Date.now()}-${uuidv4().slice(0, 8)}`,
                        Paths: { Quantity: paths.length, Items: paths },
                    },
                }),
            );
            this.logger.log(`CloudFront invalidation created for ${paths.length} path(s)`);
        } catch (err) {
            this.logger.error(`CloudFront invalidation failed: ${(err as Error).message}`);
        }
    }

    // ── List / query ───────────────────────────────────────────────────

    async listMedia(folder: MediaFolder, subfolder?: string): Promise<{ key: string; publicUrl: string; lastModified?: Date; size?: number }[]> {
        const prefix = [folder, subfolder].filter(Boolean).join('/') + '/';

        const response = await this.s3Client.send(
            new ListObjectsV2Command({ Bucket: this.bucketName, Prefix: prefix }),
        );

        return (response.Contents || []).map((obj) => ({
            key: obj.Key,
            publicUrl: `https://${this.cloudfrontDomain}/${obj.Key}`,
            lastModified: obj.LastModified,
            size: obj.Size,
        }));
    }

    async listAllMediaKeys(): Promise<string[]> {
        const keys: string[] = [];
        let continuationToken: string | undefined;

        do {
            const response = await this.s3Client.send(
                new ListObjectsV2Command({
                    Bucket: this.bucketName,
                    ContinuationToken: continuationToken,
                }),
            );
            for (const obj of response.Contents || []) {
                if (obj.Key) keys.push(obj.Key);
            }
            continuationToken = response.IsTruncated ? response.NextContinuationToken : undefined;
        } while (continuationToken);

        return keys;
    }
}
