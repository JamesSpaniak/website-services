import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Article, ContentBlock } from '../articles/types/article.entity';
import { Course } from '../courses/types/course.entity';
import { User } from '../users/types/user.entity';
import { CourseDetails, UnitData } from '../courses/types/course.dto';
import { MediaService } from './media.service';
import { migrateCoursePayloadImages } from '../courses/course-payload.util';

/**
 * Files younger than this are considered in-flight (e.g. bulk upload followed
 * by a course save). They are excluded from orphan detection.
 */
const GRACE_PERIOD_HOURS = 24;

@Injectable()
export class OrphanMediaService {
    private readonly logger = new Logger(OrphanMediaService.name);
    private readonly cloudfrontDomain: string;

    constructor(
        @InjectRepository(Article) private readonly articleRepo: Repository<Article>,
        @InjectRepository(Course) private readonly courseRepo: Repository<Course>,
        @InjectRepository(User) private readonly userRepo: Repository<User>,
        private readonly mediaService: MediaService,
    ) {
        this.cloudfrontDomain = process.env.CLOUDFRONT_MEDIA_DOMAIN || 'media.thedroneedge.com';
    }

    async findOrphans(): Promise<{ orphanKeys: string[]; totalS3: number; totalReferenced: number }> {
        const [referencedKeys, s3Objects] = await Promise.all([
            this.collectReferencedKeys(),
            this.mediaService.listAllMediaKeys(),
        ]);

        const refSet = new Set(referencedKeys);
        const cutoff = Date.now() - GRACE_PERIOD_HOURS * 3600 * 1000;

        const allMedia = await this.listMediaWithDates();
        const orphanKeys = allMedia
            .filter(obj => {
                if (refSet.has(obj.key)) return false;
                if (obj.lastModified && obj.lastModified.getTime() > cutoff) return false;
                return true;
            })
            .map(obj => obj.key);

        return { orphanKeys, totalS3: s3Objects.length, totalReferenced: refSet.size };
    }

    async deleteOrphans(): Promise<{ deleted: number }> {
        const { orphanKeys } = await this.findOrphans();
        if (orphanKeys.length === 0) return { deleted: 0 };

        await this.mediaService.deleteMultipleMedia(orphanKeys);
        this.logger.log(`Deleted ${orphanKeys.length} orphaned media files`);
        return { deleted: orphanKeys.length };
    }

    private async collectReferencedKeys(): Promise<string[]> {
        const keys: string[] = [];

        const articles = await this.articleRepo.find();
        for (const article of articles) {
            this.extractArticleKeys(article, keys);
        }

        const courses = await this.courseRepo.find();
        for (const course of courses) {
            this.extractCourseKeys(course, keys);
        }

        const users = await this.userRepo.find({ select: ['id', 'picture_url'] });
        for (const user of users) {
            if (user.picture_url) this.urlToKey(user.picture_url, keys);
        }

        return keys;
    }

    private extractArticleKeys(article: Article, keys: string[]): void {
        if (article.image_url) this.urlToKey(article.image_url, keys);
        if (article.content_blocks) {
            for (const block of article.content_blocks as ContentBlock[]) {
                if ((block.type === 'image' || block.type === 'video') && block.content) {
                    this.urlToKey(block.content, keys);
                }
            }
        }
    }

    private extractCourseKeys(course: Course, keys: string[]): void {
        let payload: CourseDetails;
        try {
            payload = JSON.parse(course.payload);
        } catch {
            return;
        }
        migrateCoursePayloadImages(payload);
        if (payload.images_url?.length) {
            for (const u of payload.images_url) this.urlToKey(u, keys);
        }
        if (payload.video_url) this.urlToKey(payload.video_url, keys);
        if (payload.units) this.extractUnitKeys(payload.units, keys);
    }

    private extractUnitKeys(units: UnitData[], keys: string[]): void {
        for (const unit of units) {
            if (unit.images_url?.length) {
                for (const u of unit.images_url) this.urlToKey(u, keys);
            }
            if (unit.video_url) this.urlToKey(unit.video_url, keys);
            if (unit.sub_units) this.extractUnitKeys(unit.sub_units, keys);
        }
    }

    private urlToKey(url: string, keys: string[]): void {
        const prefix = `https://${this.cloudfrontDomain}/`;
        if (url.startsWith(prefix)) {
            keys.push(url.substring(prefix.length));
        } else if (!url.startsWith('http')) {
            // Bare relative key (e.g. courses/videos/...)
            keys.push(url);
        }
    }

    private async listMediaWithDates(): Promise<{ key: string; lastModified?: Date }[]> {
        const { S3Client, ListObjectsV2Command } = await import('@aws-sdk/client-s3');
        const s3 = new S3Client({ region: process.env.AWS_REGION || 'us-east-1' });
        const bucket = process.env.S3_MEDIA_BUCKET || 'droneedge-media';

        const results: { key: string; lastModified?: Date }[] = [];
        let token: string | undefined;

        do {
            const res = await s3.send(
                new ListObjectsV2Command({ Bucket: bucket, ContinuationToken: token }),
            );
            for (const obj of res.Contents || []) {
                if (obj.Key) results.push({ key: obj.Key, lastModified: obj.LastModified });
            }
            token = res.IsTruncated ? res.NextContinuationToken : undefined;
        } while (token);

        return results;
    }
}
