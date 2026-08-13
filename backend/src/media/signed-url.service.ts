import {
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { getSignedCookies, getSignedUrl } from '@aws-sdk/cloudfront-signer';
import type { CookieOptions } from 'express';

const VIDEO_PATH_PREFIX = 'courses/videos/';

@Injectable()
export class SignedUrlService {
  private readonly logger = new Logger(SignedUrlService.name);
  private readonly cloudfrontDomain: string;
  private readonly keyPairId: string;
  private readonly privateKey: string;
  private readonly urlTtlSeconds = 3600;
  /**
   * Signed-cookie lifetime. Longer than the URL TTL so a student can pause
   * and resume within a study session without segment requests going 403.
   * Cookies are re-issued on every unit media fetch anyway.
   */
  private readonly cookieTtlSeconds = 6 * 3600;

  constructor() {
    this.cloudfrontDomain =
      process.env.CLOUDFRONT_MEDIA_DOMAIN || 'media.thedroneedge.com';
    this.keyPairId = process.env.CLOUDFRONT_KEY_PAIR_ID || '';
    this.privateKey = (
      process.env.CLOUDFRONT_SIGNING_PRIVATE_KEY || ''
    ).replace(/\\n/g, '\n');
  }

  private get enabled(): boolean {
    return Boolean(this.keyPairId && this.privateKey);
  }

  signUrl(s3Key: string): string {
    const url = `https://${this.cloudfrontDomain}/${s3Key}`;

    if (!this.enabled) {
      // Fail closed in production: returning an unsigned URL would let
      // paid course media be fetched (and shared) without access checks.
      if (process.env.NODE_ENV === 'production') {
        this.logger.error(
          'CloudFront signing not configured in production — refusing to serve unsigned media URL',
        );
        throw new InternalServerErrorException(
          'Media signing is not configured.',
        );
      }
      this.logger.warn(
        'CloudFront signing not configured — returning unsigned URL (non-production only)',
      );
      return url;
    }

    const dateLessThan = new Date(
      Date.now() + this.urlTtlSeconds * 1000,
    ).toISOString();

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

    if (videoUrl.startsWith(VIDEO_PATH_PREFIX)) {
      return this.signUrl(videoUrl);
    }

    const prefix = `https://${this.cloudfrontDomain}/${VIDEO_PATH_PREFIX}`;
    if (videoUrl.startsWith(prefix)) {
      const key = videoUrl.substring(
        `https://${this.cloudfrontDomain}/`.length,
      );
      return this.signUrl(key);
    }

    return videoUrl;
  }

  /**
   * True for HLS playlists under the protected video prefix. These cannot be
   * authorized with a single signed URL — the playlist references segment
   * files that carry no signature — so playback uses signed cookies instead.
   */
  isProtectedHlsUrl(videoUrl: string | undefined): boolean {
    if (!videoUrl) return false;
    const path = videoUrl.startsWith(`https://${this.cloudfrontDomain}/`)
      ? videoUrl.substring(`https://${this.cloudfrontDomain}/`.length)
      : videoUrl;
    return path.startsWith(VIDEO_PATH_PREFIX) && /\.m3u8(\?.*)?$/i.test(path);
  }

  /** Canonical absolute media URL for a stored video path or URL. */
  toAbsoluteMediaUrl(videoUrl: string): string {
    if (videoUrl.startsWith('https://')) return videoUrl;
    return `https://${this.cloudfrontDomain}/${videoUrl}`;
  }

  /**
   * CloudFront signed cookies authorizing every request under
   * `courses/videos/*` (playlists and segments) for cookieTtlSeconds.
   * Returns null when signing is not configured outside production.
   */
  signedVideoCookies(): Record<string, string> | null {
    if (!this.enabled) {
      if (process.env.NODE_ENV === 'production') {
        this.logger.error(
          'CloudFront signing not configured in production — refusing to issue video cookies',
        );
        throw new InternalServerErrorException(
          'Media signing is not configured.',
        );
      }
      this.logger.warn(
        'CloudFront signing not configured — skipping signed video cookies (non-production only)',
      );
      return null;
    }

    const policy = JSON.stringify({
      Statement: [
        {
          Resource: `https://${this.cloudfrontDomain}/${VIDEO_PATH_PREFIX}*`,
          Condition: {
            DateLessThan: {
              'AWS:EpochTime':
                Math.floor(Date.now() / 1000) + this.cookieTtlSeconds,
            },
          },
        },
      ],
    });

    return getSignedCookies({
      keyPairId: this.keyPairId,
      privateKey: this.privateKey,
      policy,
    }) as unknown as Record<string, string>;
  }

  /**
   * Cookie attributes so the browser sends the CloudFront cookies to the
   * media subdomain: parent-domain scoped (app and media share a registrable
   * domain), path-limited to the protected prefix.
   */
  videoCookieOptions(): CookieOptions {
    const domain =
      process.env.MEDIA_COOKIE_DOMAIN ||
      this.cloudfrontDomain.substring(this.cloudfrontDomain.indexOf('.') + 1);

    return {
      domain,
      path: `/${VIDEO_PATH_PREFIX.replace(/\/$/, '')}`,
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
      maxAge: this.cookieTtlSeconds * 1000,
    };
  }
}
