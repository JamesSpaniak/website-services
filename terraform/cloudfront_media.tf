resource "aws_s3_bucket" "media" {
  bucket = "${var.project_name}-media"
}

resource "aws_s3_bucket_cors_configuration" "media" {
  bucket = aws_s3_bucket.media.id

  cors_rule {
    allowed_headers = ["*"]
    allowed_methods = ["PUT", "POST"]
    allowed_origins = [
      "https://${var.domain_name}",
      "https://${var.frontend_subdomain}.${var.domain_name}",
      "https://${var.frontend_subdomain}.${var.dev_subdomain}.${var.domain_name}",
    ]
    expose_headers  = ["ETag"]
    max_age_seconds = 3600
  }
}

resource "aws_s3_bucket_public_access_block" "media" {
  bucket                  = aws_s3_bucket.media.id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_cloudfront_origin_access_control" "media" {
  name                              = "${var.project_name}-media-oac"
  description                       = "OAC for media bucket"
  origin_access_control_origin_type = "s3"
  signing_behavior                  = "always"
  signing_protocol                  = "sigv4"
}

# ── CloudFront signing key for paid course videos ──

resource "aws_cloudfront_public_key" "video_signing" {
  name        = "${var.project_name}-video-signing-key"
  encoded_key = var.cloudfront_signing_public_key_pem

  # Keep the existing CloudFront key stable across applies.
  # Rotate intentionally via a dedicated migration/runbook, not drift.
  lifecycle {
    ignore_changes = [encoded_key]
  }
}

resource "aws_cloudfront_key_group" "video_signing" {
  name  = "${var.project_name}-video-signing-group"
  items = [aws_cloudfront_public_key.video_signing.id]
}

# Managed policy: long TTLs, no query strings/cookies/headers in the cache key.
# Signed cookies are validated by CloudFront at the edge and never need to be
# forwarded to S3 or included in the cache key.
data "aws_cloudfront_cache_policy" "caching_optimized" {
  name = "Managed-CachingOptimized"
}

# hls.js fetches playlists/segments via XHR with credentials (the signed
# cookies), which requires exact-origin CORS + Allow-Credentials on responses.
resource "aws_cloudfront_response_headers_policy" "video_cors" {
  name = "${var.project_name}-video-cors"

  cors_config {
    access_control_allow_credentials = true

    access_control_allow_origins {
      items = [
        "https://${var.domain_name}",
        "https://www.${var.domain_name}",
        "https://${var.frontend_subdomain}.${var.domain_name}",
        "https://${var.frontend_subdomain}.${var.dev_subdomain}.${var.domain_name}",
        "http://localhost:8080",
      ]
    }

    # "*" is rejected when allow-credentials is true; list what hls.js sends.
    access_control_allow_headers {
      items = ["Range", "Origin", "Accept", "Accept-Encoding", "If-Range", "If-Match", "If-None-Match", "If-Modified-Since", "If-Unmodified-Since"]
    }

    access_control_allow_methods {
      items = ["GET", "HEAD", "OPTIONS"]
    }

    origin_override = true
  }
}

resource "aws_cloudfront_distribution" "media_distribution" {
  origin {
    domain_name              = aws_s3_bucket.media.bucket_regional_domain_name
    origin_id                = "S3-${var.project_name}-media"
    origin_access_control_id = aws_cloudfront_origin_access_control.media.id
  }

  enabled         = true
  is_ipv6_enabled = true

  aliases = ["${var.media_subdomain}.${var.domain_name}"]

  # Paid course videos require a CloudFront signature: signed cookies for HLS
  # (covers playlist + every segment), signed URLs for single-file mp4s.
  ordered_cache_behavior {
    path_pattern               = "courses/videos/*"
    target_origin_id           = "S3-${var.project_name}-media"
    viewer_protocol_policy     = "redirect-to-https"
    allowed_methods            = ["GET", "HEAD", "OPTIONS"]
    cached_methods             = ["GET", "HEAD"]
    trusted_key_groups         = [aws_cloudfront_key_group.video_signing.id]
    cache_policy_id            = data.aws_cloudfront_cache_policy.caching_optimized.id
    response_headers_policy_id = aws_cloudfront_response_headers_policy.video_cors.id
  }

  # Everything else (articles, profile pics, course images) is public
  default_cache_behavior {
    target_origin_id       = "S3-${var.project_name}-media"
    viewer_protocol_policy = "redirect-to-https"
    allowed_methods        = ["GET", "HEAD", "OPTIONS"]
    cached_methods         = ["GET", "HEAD"]

    forwarded_values {
      query_string = false
      cookies {
        forward = "none"
      }
    }
  }

  viewer_certificate {
    acm_certificate_arn = aws_acm_certificate_validation.main.certificate_arn
    ssl_support_method  = "sni-only"
  }

  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }
}

resource "aws_s3_bucket_policy" "media" {
  bucket = aws_s3_bucket.media.id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid       = "AllowCloudFrontRead"
        Effect    = "Allow"
        Principal = { Service = "cloudfront.amazonaws.com" }
        Action    = "s3:GetObject"
        Resource  = "${aws_s3_bucket.media.arn}/*"
        Condition = {
          StringEquals = {
            "AWS:SourceArn" = aws_cloudfront_distribution.media_distribution.arn
          }
        }
      }
    ]
  })
}

resource "aws_route53_record" "media_alias" {
  zone_id = aws_route53_zone.main.zone_id
  name    = "${var.media_subdomain}.${var.domain_name}"
  type    = "A"

  alias {
    name                   = aws_cloudfront_distribution.media_distribution.domain_name
    zone_id                = aws_cloudfront_distribution.media_distribution.hosted_zone_id
    evaluate_target_health = false
  }
}
