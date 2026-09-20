# ── Product-analytics cold archive (PA35) ──
#
# The nightly AnalyticsMaintenanceService streams `product_events` partitions
# older than ANALYTICS_RETENTION_MONTHS to
#   s3://<bucket>/product_events/<partition>.ndjson.gz
# (non-org rows only — PD23), then detaches and drops the partition. The files
# are written once and read only for audits, so they go straight to Glacier
# Instant Retrieval (millisecond access, ~¼ the price of Standard). Nothing is
# ever expired: the ledger tables stay in Postgres, this is the raw behavioural
# stream and it is small (~1–2 GB/year at 1 000 users).
#
# Docs: docs/tech/architecture.md § Environment, docs/tech/analytics-implementation-plan.md § 12.4

resource "aws_s3_bucket" "analytics_archive" {
  bucket = "${var.project_name}-analytics-archive"
}

resource "aws_s3_bucket_public_access_block" "analytics_archive" {
  bucket                  = aws_s3_bucket.analytics_archive.id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_versioning" "analytics_archive" {
  bucket = aws_s3_bucket.analytics_archive.id
  versioning_configuration {
    status = "Enabled" # a partition is archived exactly once; versioning guards against an accidental overwrite
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "analytics_archive" {
  bucket = aws_s3_bucket.analytics_archive.id
  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

resource "aws_s3_bucket_lifecycle_configuration" "analytics_archive" {
  bucket = aws_s3_bucket.analytics_archive.id

  rule {
    id     = "glacier-ir-from-day-one"
    status = "Enabled"
    filter {}
    transition {
      days          = 0
      storage_class = "GLACIER_IR"
    }
    noncurrent_version_expiration {
      noncurrent_days = 30
    }
    abort_incomplete_multipart_upload {
      days_after_initiation = 7
    }
  }
}

# The API task writes archives; it never needs to read or delete them.
resource "aws_iam_policy" "analytics_archive_policy" {
  name        = "${var.project_name}-analytics-archive-policy"
  description = "Allow ECS backend tasks to write product_events partition archives"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect   = "Allow"
        Action   = ["s3:PutObject"]
        Resource = ["${aws_s3_bucket.analytics_archive.arn}/product_events/*"]
      },
    ]
  })
}

resource "aws_iam_role_policy_attachment" "ecs_task_role_analytics_archive_attachment" {
  role       = aws_iam_role.ecs_task_role.name
  policy_arn = aws_iam_policy.analytics_archive_policy.arn
}
