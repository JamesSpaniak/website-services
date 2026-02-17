resource "aws_s3_bucket" "logs" {
  bucket = "${var.project_name}-logs-${data.aws_caller_identity.current.account_id}"
}

resource "aws_s3_bucket_versioning" "logs" {
  bucket = aws_s3_bucket.logs.id
  versioning_configuration {
    status = "Enabled"
  }
}

# Policy to allow CloudWatch Logs to write to the S3 bucket
resource "aws_s3_bucket_policy" "logs" {
  bucket = aws_s3_bucket.logs.id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action    = "s3:GetBucketAcl"
        Effect    = "Allow"
        Resource  = aws_s3_bucket.logs.arn
        Principal = { "Service" = "logs.${var.aws_region}.amazonaws.com" }
      },
      {
        Action    = "s3:PutObject"
        Effect    = "Allow"
        Resource  = "${aws_s3_bucket.logs.arn}/*"
        Principal = { "Service" = "logs.${var.aws_region}.amazonaws.com" }
        Condition = {
          StringEquals = { "s3:x-amz-acl" = "bucket-owner-full-control" }
        }
      },
    ]
  })
}

resource "aws_cloudwatch_log_group" "api_server" {
  name              = "/ecs/${var.project_name}/api-server"
  retention_in_days = 30 # Keep logs in CloudWatch for 30 days before they are archived to S3
}

/*
This resource demonstrates how to perform a one-time export of logs from CloudWatch to S3.
For automated, periodic archival (e.g., daily), you would typically trigger this task
using an AWS Lambda function scheduled with Amazon EventBridge.
resource "aws_cloudwatch_log_export_task" "api_server_export" {
  task_name           = "${var.project_name}-api-export-${formatdate("YYYYMMDDhhmmss", timestamp())}"
  log_group_name      = aws_cloudwatch_log_group.api_server.name
  from                = (timestamp() - 86400) * 1000 # Export logs from the last 24 hours
  to                  = timestamp() * 1000
  destination         = aws_s3_bucket.logs.bucket
  destination_prefix  = "api-server-exports"
}
*/

data "aws_caller_identity" "current" {}