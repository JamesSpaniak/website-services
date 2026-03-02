import { Injectable, Logger } from '@nestjs/common';
import { getSignedUrl } from '@aws-sdk/cloudfront-signer';

@Injectable()
export class SignedUrlService {
    private readonly logger = new Logger(SignedUrlService.name);
    private readonly cloudfrontDomain: string;
    private readonly keyPairId: string;
    private readonly privateKey: string;
    private readonly urlTtlSeconds = 3600;

    constructor() {
        this.cloudfrontDomain = process.env.CLOUDFRONT_MEDIA_DOMAIN || 'media.thedroneedge.com';
        this.keyPairId = process.env.CLOUDFRONT_KEY_PAIR_ID || '';
        this.privateKey = (process.env.CLOUDFRONT_SIGNING_PRIVATE_KEY || '').replace(/\\n/g, '\n');
    }

    private get enabled(): boolean {
        return Boolean(this.keyPairId && this.privateKey);
    }

    signUrl(s3Key: string): string {
        const url = `https://${this.cloudfrontDomain}/${s3Key}`;

        if (!this.enabled) {
            this.logger.warn('CloudFront signing not configured — returning unsigned URL');
            return url;
        }

        const dateLessThan = new Date(Date.now() + this.urlTtlSeconds * 1000).toISOString();

        return getSignedUrl({
            url,
            keyPairId: this.keyPairId,
            privateKey: this.privateKey,
            dateLessThan,
        });
    }

    /**
     * Converts a `video_url` stored in course JSON into a signed URL if the
     * path starts with the courses/videos prefix. YouTube/Vimeo URLs pass through.
     */
    signVideoUrl(videoUrl: string | undefined): string | undefined {
        if (!videoUrl) return undefined;

        if (videoUrl.startsWith('courses/videos/')) {
            return this.signUrl(videoUrl);
        }

        const prefix = `https://${this.cloudfrontDomain}/courses/videos/`;
        if (videoUrl.startsWith(prefix)) {
            const key = videoUrl.substring(`https://${this.cloudfrontDomain}/`.length);
            return this.signUrl(key);
        }

        return videoUrl;
    }
}
