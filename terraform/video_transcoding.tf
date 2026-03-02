# ── Raw video upload bucket ──

resource "aws_s3_bucket" "raw_video" {
  bucket = "${var.project_name}-raw-video"
}

resource "aws_s3_bucket_public_access_block" "raw_video" {
  bucket                  = aws_s3_bucket.raw_video.id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_lifecycle_configuration" "raw_video" {
  bucket = aws_s3_bucket.raw_video.id

  rule {
    id     = "expire-raw-after-7-days"
    status = "Enabled"
    filter {}
    expiration {
      days = 7
    }
  }
}

# ── MediaConvert IAM role ──

resource "aws_iam_role" "mediaconvert" {
  name = "${var.project_name}-mediaconvert-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect    = "Allow"
        Principal = { Service = "mediaconvert.amazonaws.com" }
        Action    = "sts:AssumeRole"
      }
    ]
  })
}

resource "aws_iam_role_policy" "mediaconvert" {
  name = "${var.project_name}-mediaconvert-s3"
  role = aws_iam_role.mediaconvert.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = ["s3:GetObject"]
        Resource = "${aws_s3_bucket.raw_video.arn}/*"
      },
      {
        Effect = "Allow"
        Action = ["s3:PutObject"]
        Resource = "${aws_s3_bucket.media.arn}/courses/videos/*"
      }
    ]
  })
}

# ── Lambda: trigger MediaConvert on raw video upload ──

resource "aws_iam_role" "transcode_lambda" {
  name = "${var.project_name}-transcode-lambda-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect    = "Allow"
        Principal = { Service = "lambda.amazonaws.com" }
        Action    = "sts:AssumeRole"
      }
    ]
  })
}

resource "aws_iam_role_policy" "transcode_lambda" {
  name = "${var.project_name}-transcode-lambda-policy"
  role = aws_iam_role.transcode_lambda.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect   = "Allow"
        Action   = ["logs:CreateLogGroup", "logs:CreateLogStream", "logs:PutLogEvents"]
        Resource = "arn:aws:logs:*:*:*"
      },
      {
        Effect   = "Allow"
        Action   = ["mediaconvert:CreateJob", "mediaconvert:DescribeEndpoints"]
        Resource = "*"
      },
      {
        Effect   = "Allow"
        Action   = ["iam:PassRole"]
        Resource = aws_iam_role.mediaconvert.arn
      },
      {
        Effect   = "Allow"
        Action   = ["s3:GetObject", "s3:PutObjectTagging"]
        Resource = "${aws_s3_bucket.raw_video.arn}/*"
      }
    ]
  })
}

data "archive_file" "transcode_trigger" {
  type        = "zip"
  source_file = "${path.module}/lambda/transcode-trigger.js"
  output_path = "${path.module}/lambda/transcode-trigger.zip"
}

resource "aws_lambda_function" "transcode_trigger" {
  function_name    = "${var.project_name}-transcode-trigger"
  role             = aws_iam_role.transcode_lambda.arn
  handler          = "transcode-trigger.handler"
  runtime          = "nodejs20.x"
  timeout          = 30
  filename         = data.archive_file.transcode_trigger.output_path
  source_code_hash = data.archive_file.transcode_trigger.output_base64sha256

  environment {
    variables = {
      MEDIA_BUCKET       = aws_s3_bucket.media.bucket
      MEDIACONVERT_ROLE  = aws_iam_role.mediaconvert.arn
      OUTPUT_PREFIX      = "courses/videos"
      AWS_REGION_CUSTOM  = var.aws_region
    }
  }
}

resource "aws_lambda_permission" "s3_invoke_transcode" {
  statement_id  = "AllowS3Invoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.transcode_trigger.arn
  principal     = "s3.amazonaws.com"
  source_arn    = aws_s3_bucket.raw_video.arn
}

resource "aws_s3_bucket_notification" "raw_video" {
  bucket = aws_s3_bucket.raw_video.id

  lambda_function {
    lambda_function_arn = aws_lambda_function.transcode_trigger.arn
    events              = ["s3:ObjectCreated:*"]
    filter_suffix       = ".mp4"
  }

  lambda_function {
    lambda_function_arn = aws_lambda_function.transcode_trigger.arn
    events              = ["s3:ObjectCreated:*"]
    filter_suffix       = ".mov"
  }

  lambda_function {
    lambda_function_arn = aws_lambda_function.transcode_trigger.arn
    events              = ["s3:ObjectCreated:*"]
    filter_suffix       = ".mkv"
  }

  lambda_function {
    lambda_function_arn = aws_lambda_function.transcode_trigger.arn
    events              = ["s3:ObjectCreated:*"]
    filter_suffix       = ".webm"
  }

  depends_on = [aws_lambda_permission.s3_invoke_transcode]
}

# ── Lambda: handle MediaConvert completion ──

data "archive_file" "transcode_complete" {
  type        = "zip"
  source_file = "${path.module}/lambda/transcode-complete.js"
  output_path = "${path.module}/lambda/transcode-complete.zip"
}

resource "aws_iam_role" "transcode_complete_lambda" {
  name = "${var.project_name}-transcode-complete-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect    = "Allow"
        Principal = { Service = "lambda.amazonaws.com" }
        Action    = "sts:AssumeRole"
      }
    ]
  })
}

resource "aws_iam_role_policy" "transcode_complete_lambda" {
  name = "${var.project_name}-transcode-complete-policy"
  role = aws_iam_role.transcode_complete_lambda.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect   = "Allow"
        Action   = ["logs:CreateLogGroup", "logs:CreateLogStream", "logs:PutLogEvents"]
        Resource = "arn:aws:logs:*:*:*"
      },
      {
        Effect   = "Allow"
        Action   = ["s3:PutObjectTagging", "s3:GetObjectTagging"]
        Resource = "${aws_s3_bucket.raw_video.arn}/*"
      }
    ]
  })
}

resource "aws_lambda_function" "transcode_complete" {
  function_name    = "${var.project_name}-transcode-complete"
  role             = aws_iam_role.transcode_complete_lambda.arn
  handler          = "transcode-complete.handler"
  runtime          = "nodejs20.x"
  timeout          = 15
  filename         = data.archive_file.transcode_complete.output_path
  source_code_hash = data.archive_file.transcode_complete.output_base64sha256

  environment {
    variables = {
      RAW_BUCKET = aws_s3_bucket.raw_video.bucket
    }
  }
}

resource "aws_cloudwatch_event_rule" "mediaconvert_complete" {
  name = "${var.project_name}-mediaconvert-complete"

  event_pattern = jsonencode({
    source      = ["aws.mediaconvert"]
    "detail-type" = ["MediaConvert Job State Change"]
    detail = {
      status = ["COMPLETE", "ERROR"]
    }
  })
}

resource "aws_cloudwatch_event_target" "mediaconvert_complete" {
  rule = aws_cloudwatch_event_rule.mediaconvert_complete.name
  arn  = aws_lambda_function.transcode_complete.arn
}

resource "aws_lambda_permission" "eventbridge_invoke_complete" {
  statement_id  = "AllowEventBridgeInvoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.transcode_complete.arn
  principal     = "events.amazonaws.com"
  source_arn    = aws_cloudwatch_event_rule.mediaconvert_complete.arn
}

# ── Outputs ──

output "raw_video_bucket" {
  value = aws_s3_bucket.raw_video.bucket
}
