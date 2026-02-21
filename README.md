# Personal Site
Backend -- backend, Frontend -- drone


## Todo List 
### Frontend
- Video and Image components (how will video be served?) -- Infra/CDN related
    - Initial is vimeo for video + public/ folder for images. - Complete-->Test video todo
    - Future Goal is to do s3 + aws cloudfront + aws mediaconvert
- integrate stripe SDK into purchase-flow
- Usability
    - Course preview/list should be more clear if user owns the course
    - Course/Unit/Section/Exam needs enhancements around nested boxes
    - Dark mode / theme unification across pages
### Backend
- Shorten JWT token and add refresh token -- check
- Move sessions to postgres
- Setup infra for everything together + Validate migrations all work
- Usability
    - Article content enhancement to support images within text
    - Purchasing course flow and memberships for monthly stuff, scheduled job to update for expired memberships, emails and purchase things.
        - How will security be managed of the card?
### Infra
- Test terraform
- AWS->Github connection
    - Step 1: Create the OIDC Identity Provider in AWS
    - Step 2: Create the IAM Role for GitHub Actions
    - Step 3: Attach Permissions
    - Step 4: Name and Create the Role
    - Step 5: Configure GitHub Secrets



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
Courses continue using JSON payloads with `image_url` and `video_url` fields per unit.

**Upload flow:** Admin UI -> Backend generates presigned S3 PUT URL -> Browser uploads
directly to S3 -> CloudFront URL is stored in article/course data.

### Edge Cases & Research Points

#### Security
- **Presigned URL abuse**: Presigned URLs expire in 10 minutes, but a leaked URL allows
  anyone to upload to that key. Consider adding request conditions (content-length-range)
  to the presigned URL to prevent oversized uploads. Research `s3:PutObject` conditions.
- **Content-Type validation**: The backend validates MIME type via regex, but the actual
  uploaded file content is not verified server-side. A malicious user could upload an
  executable with an `image/jpeg` content type. Consider adding a Lambda@Edge or S3 event
  trigger that validates file headers post-upload.
- **XSS in HTML body/text blocks**: Article body and text content blocks render via
  `dangerouslySetInnerHTML`. The backend should sanitize HTML (already has `sanitize-html`
  dependency). Ensure all admin-submitted HTML is sanitized before storage.
- **Article write endpoints** now require Admin role. Previously these were unguarded.

#### Performance & Cost
- **Large video uploads**: Browser-based uploads of large video files (>1GB) may time out
  or fail. Research S3 multipart upload via presigned URLs for large files. The current
  implementation uses a single PUT which is limited to 5GB.
- **CloudFront cache invalidation**: When media is updated/replaced at the same key, the
  old version may be served from CloudFront cache. Either use unique keys per upload
  (current approach with UUIDs) or implement cache invalidation.
- **Video transcoding**: Self-hosted videos are served as-is. For broad device/bandwidth
  support, research AWS MediaConvert or Elastic Transcoder to generate HLS/DASH adaptive
  bitrate streams. This would require additional terraform resources and a processing
  pipeline.
- **Image optimization**: Next.js Image component handles optimization for CloudFront images,
  but consider adding S3 lifecycle rules for cleanup of orphaned media.

#### Data Integrity
- **Orphaned media**: If an admin uploads a file but doesn't save the article/course, the
  S3 object remains. Implement a periodic cleanup job that cross-references S3 objects
  against database references, or track uploaded keys in a `media` table.
- **Content blocks backward compatibility**: Old articles use `body` (HTML string), new ones
  can use `content_blocks` (JSONB array). The frontend falls back to `body` when
  `content_blocks` is empty. Ensure both paths are tested.
- **Migration safety**: The migration adds nullable columns only, so existing data is
  unaffected. No data migration needed.

#### Frontend
- **Admin page authorization**: The admin page is client-side guarded. A determined user
  could access the route, but all API calls require Admin JWT. The guard is UX only.
- **Content block editor**: The current editor is basic (HTML textarea for text blocks).
  Research integrating a rich text editor (TipTap, Lexical, or Slate) for a better
  authoring experience.
- **Video component**: Now supports YouTube, Vimeo, AND self-hosted video via `<video>` tag.
  Self-hosted video detection checks for file extensions (.mp4, .webm, .mov) or domains
  containing "cloudfront.net" or "media.". This heuristic may need refinement.
- **Image uploads in course units**: Each unit supports image/video upload with subfolder
  scoping (e.g., `courses/{courseId}/{unitId}/`). Sub-units are not yet editable in the
  visual editor; use the JSON editor for deeply nested structures.

#### Infrastructure
- **S3 CORS**: Configured to allow PUT from the production and dev frontend domains. Update
  the terraform `cors_rule.allowed_origins` if additional environments are added.
- **IAM permissions**: The ECS task role has `s3:PutObject`, `s3:DeleteObject`, and
  `s3:ListBucket` on the media bucket. The presigned URL is signed with the task role's
  credentials via the SDK.
- **Local development**: S3 operations require valid AWS credentials. For local dev without
  AWS access, consider using LocalStack or mocking the media service. The env vars
  `S3_MEDIA_BUCKET`, `CLOUDFRONT_MEDIA_DOMAIN`, and `AWS_REGION` are configurable.
- **CloudFront signed URLs/cookies**: Currently media is publicly accessible via CloudFront.
  If content should be gated (e.g., paid course videos), research CloudFront signed URLs
  or signed cookies with a key pair managed via terraform.

#### Future Enhancements
- Rich text editor integration (TipTap/Lexical) for content block text editing
- Drag-and-drop media upload with progress bar
- Media library browser (select from previously uploaded files)
- Video transcoding pipeline (MediaConvert -> S3 -> CloudFront)
- CloudFront signed URLs for premium content
- S3 lifecycle rules for storage class transitions (IA after 90 days)
- Content versioning/draft system for articles and courses
- Bulk import/export of course JSON payloads