# Personal Site
Backend -- backend, Frontend -- drone


## Todo List 
### Frontend
- integrate stripe SDK into purchase-flow (subscriptions as well to use portal?)
- Usability
    - Course preview/list should be more clear if user owns the course
    - Course/Unit/Section/Exam needs enhancements around nested boxes
### Backend
- Usability
    - Article content enhancement to support images within text
    - Purchasing course flow and memberships for monthly stuff, scheduled job to update for expired memberships, emails and purchase things.
        
### Infra




### Content
- Article 1
- Course 1
- Images

---

## Media & Content Management System

### Architecture Overview

Admin uploads media (images/videos) via presigned S3 URLs. Files are stored in the
`{project_name}-media` S3 bucket and served through CloudFront at `media.{domain}`.
Articles support both legacy HTML body and structured content blocks (text/image/video).
Courses use JSON payloads with `images_url` (gallery), optional legacy `image_url` (merged server-side), and `video_url` per course/unit.

**Upload flow:** Admin UI -> Backend generates presigned S3 PUT URL -> Browser uploads
directly to S3 -> CloudFront URL is stored in article/course data.

### Edge Cases & Research Points

#### Security (implemented)
- **Presigned URL size limits**: Every presigned URL includes a `content-length-range`
  condition. Limits: profiles 2 MB, articles 100 MB, courses 5 GB. The backend enforces
  the limit per folder via `MAX_BYTES` in `media.service.ts`.
- **Content-Type enforcement**: MIME type validated by backend regex on the DTO (`class-validator`
  `@Matches`). The presigned URL is locked to the declared `ContentType`; S3 rejects uploads
  that don't match.
- **Admin page server-side gating**: Next.js middleware (`drone/src/middleware.ts`) decodes
  the JWT from the `access_token` cookie and blocks unauthenticated/unauthorized users from
  loading `/admin` or `/manager` routes. The client-side guards remain as a UX fallback.
- **XSS in HTML body/text blocks**: Article body and text content blocks render via
  `dangerouslySetInnerHTML`. The backend has `sanitize-html` — ensure all admin-submitted
  HTML is sanitized before storage.
- **Article write endpoints** require Admin role.

#### Security (remaining)
- **Content-Type post-upload validation**: The actual uploaded file content is not verified
  server-side after upload. A malicious admin could upload an executable with an `image/jpeg`
  content type. Consider adding a Lambda@Edge or S3 event trigger that validates file
  headers post-upload.

#### Performance & Cost (implemented)
- **Multipart uploads**: Files over 100 MB can use the multipart upload API
  (`POST /media/multipart/initiate`, `POST /media/multipart/part-url`,
  `POST /media/multipart/complete`). Each part gets its own presigned URL (1 hour expiry).
  This supports uploads up to 5 TB and is resilient to network interruptions.
  Multipart uploads to the raw-video bucket still trigger the existing MediaConvert
  transcoding pipeline (S3 -> Lambda -> MediaConvert -> HLS).
- **CloudFront cache invalidation**: On media delete or bulk delete, the backend
  automatically creates a CloudFront invalidation for the affected paths via
  `cloudfront:CreateInvalidation`. The ECS task role has the required IAM permission.
  Combined with UUID-based keys, this ensures stale content is purged promptly.
- **Orphaned media cleanup**: `GET /media/orphans` previews orphaned S3 keys (files not
  referenced by any article, course, or user profile). `DELETE /media/orphans` removes them.
  A 24-hour grace period excludes recently uploaded files to protect in-flight bulk uploads.
- **Video transcoding**: Raw video uploads to the `{project_name}-raw-video` bucket trigger
  MediaConvert (720p + 480p HLS). Raw files expire after 7 days.
- **Image optimization**: Next.js Image component handles CloudFront images.

#### Data Integrity
- **Content blocks backward compatibility**: Old articles use `body` (HTML string), new ones
  can use `content_blocks` (JSONB array). The frontend falls back to `body` when
  `content_blocks` is empty.
- **Migration safety**: Migrations add nullable columns only; existing data is unaffected.

#### Frontend
- **Content block editor**: The current editor is basic (HTML textarea for text blocks).
  Research integrating a rich text editor (TipTap, Lexical, or Slate).
- **Video component**: Supports YouTube, Vimeo, and self-hosted video via `<video>` tag.
  Self-hosted video detection checks for file extensions (.mp4, .webm, .mov) or domains
  containing "cloudfront.net" or "media.".
- **Image uploads in course units**: Each unit supports image/video upload with subfolder
  scoping (e.g., `courses/{courseId}/{unitId}/`). Sub-units use the JSON editor.

#### Infrastructure
- **S3 CORS**: Configured to allow PUT and POST from the production and dev frontend
  domains. POST is required for multipart upload initiation.
- **IAM permissions**: The ECS task role has `s3:PutObject`, `s3:DeleteObject`,
  `s3:ListBucket` on the media bucket and `cloudfront:CreateInvalidation` on the media
  distribution.
- **Local development**: S3 operations require valid AWS credentials. The env vars
  `S3_MEDIA_BUCKET`, `CLOUDFRONT_MEDIA_DOMAIN`, `CLOUDFRONT_DISTRIBUTION_ID`, and
  `AWS_REGION` are configurable.
- **CloudFront signed URLs**: Paid course videos under `courses/videos/*` require signed
  URLs via a CloudFront key group managed in terraform. The backend's `SignedUrlService`
  signs on read.

#### Future Enhancements
- Rich text editor integration (TipTap/Lexical) for content block text editing
- Drag-and-drop media upload with progress bar
- Media library browser (select from previously uploaded files)
- S3 lifecycle rules for storage class transitions (IA after 90 days)
- Content versioning/draft system for articles and courses
- Bulk import/export of course JSON payloads
- Scheduled orphan cleanup job (currently admin-triggered only)