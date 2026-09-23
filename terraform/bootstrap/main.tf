# Bootstrap for the S3 remote state backend.
#
# This is a separate root module on purpose: it holds ONLY the state bucket, so
# an apply here can never touch the ~128 real resources in the main module. Its
# own state stays local and is never committed.
#
# scripts/ensure-state-backend.sh applies this exactly once — when the bucket
# does not exist yet. Every later deploy sees the bucket and skips it, so losing
# this local state is harmless. To adopt an existing bucket instead:
#   terraform -chdir=terraform/bootstrap import aws_s3_bucket.tfstate <bucket>

terraform {
  required_version = ">= 1.10"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = var.aws_region
}

variable "aws_region" {
  description = "Region the state bucket lives in. Must match the backend's region."
  type        = string
  default     = "us-east-1"
}

variable "bucket_name" {
  description = "Globally unique name for the state bucket (account id suffix keeps it unique)."
  type        = string
}

resource "aws_s3_bucket" "tfstate" {
  bucket = var.bucket_name

  # Every environment's state lives here. Deleting it loses the map between
  # Terraform and 128 live resources.
  lifecycle {
    prevent_destroy = true
  }

  tags = {
    Name = var.bucket_name
  }
}

# The recovery mechanism for a clobbered or truncated state. Do not disable.
resource "aws_s3_bucket_versioning" "tfstate" {
  bucket = aws_s3_bucket.tfstate.id

  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "tfstate" {
  bucket = aws_s3_bucket.tfstate.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

resource "aws_s3_bucket_public_access_block" "tfstate" {
  bucket = aws_s3_bucket.tfstate.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_policy" "tfstate" {
  bucket = aws_s3_bucket.tfstate.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid       = "DenyInsecureTransport"
        Effect    = "Deny"
        Principal = "*"
        Action    = "s3:*"
        Resource = [
          aws_s3_bucket.tfstate.arn,
          "${aws_s3_bucket.tfstate.arn}/*",
        ]
        Condition = {
          Bool = { "aws:SecureTransport" = "false" }
        }
      },
    ]
  })

  depends_on = [aws_s3_bucket_public_access_block.tfstate]
}

# Keep 90 days of old state versions for rollback without growing forever.
resource "aws_s3_bucket_lifecycle_configuration" "tfstate" {
  bucket = aws_s3_bucket.tfstate.id

  rule {
    id     = "expire-old-state-versions"
    status = "Enabled"

    filter {}

    noncurrent_version_expiration {
      noncurrent_days = 90
    }

    abort_incomplete_multipart_upload {
      days_after_initiation = 7
    }
  }

  depends_on = [aws_s3_bucket_versioning.tfstate]
}

output "bucket" {
  value = aws_s3_bucket.tfstate.id
}
