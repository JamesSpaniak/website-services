# Ops alerts. CloudWatch cannot email directly — alarms publish to this topic,
# which emails var.admin_email (same address as the monthly budget).
# First apply sends an AWS confirmation mail; until that link is clicked the
# alarm is still visible in the CloudWatch console but email will not arrive.

resource "aws_sns_topic" "alerts" {
  name = "${var.project_name}-ops-alerts"
}

resource "aws_sns_topic_policy" "alerts" {
  arn = aws_sns_topic.alerts.arn
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "AllowAccountOwner"
        Effect = "Allow"
        Principal = {
          AWS = "arn:aws:iam::${data.aws_caller_identity.current.account_id}:root"
        }
        # Topic policies reject sns:* ("action out of service scope").
        Action = [
          "sns:GetTopicAttributes",
          "sns:SetTopicAttributes",
          "sns:AddPermission",
          "sns:RemovePermission",
          "sns:DeleteTopic",
          "sns:Subscribe",
          "sns:ListSubscriptionsByTopic",
          "sns:Publish",
          "sns:Receive",
        ]
        Resource = aws_sns_topic.alerts.arn
      },
      {
        Sid    = "AllowCloudWatchAlarms"
        Effect = "Allow"
        Principal = {
          Service = "cloudwatch.amazonaws.com"
        }
        Action   = "sns:Publish"
        Resource = aws_sns_topic.alerts.arn
        Condition = {
          StringEquals = {
            "aws:SourceAccount" = data.aws_caller_identity.current.account_id
          }
        }
      },
    ]
  })
}

resource "aws_sns_topic_subscription" "alerts_email" {
  topic_arn = aws_sns_topic.alerts.arn
  protocol  = "email"
  endpoint  = var.admin_email
}

# Fires when the NAT translates zero connections for 2 hours. Catches the
# "available but data-plane dead" failure that Terraform drift does not see.
# Grafana OTLP + Stripe + SMTP should produce a steady trickle once egress works.
resource "aws_cloudwatch_metric_alarm" "nat_no_egress" {
  alarm_name        = "${var.project_name}-nat-no-egress"
  alarm_description = "NAT gateway established no connections for 2 hours. SMTP, Stripe, and OTLP egress are likely down even if the NAT still shows available."
  namespace         = "AWS/NATGateway"
  metric_name       = "ConnectionEstablishedCount"
  dimensions = {
    NatGatewayId = aws_nat_gateway.nat.id
  }
  statistic           = "Sum"
  period              = 3600
  evaluation_periods  = 2
  datapoints_to_alarm = 2
  threshold           = 1
  comparison_operator = "LessThanThreshold"
  treat_missing_data  = "breaching"

  alarm_actions = [aws_sns_topic.alerts.arn]
  ok_actions    = [aws_sns_topic.alerts.arn]
}

# SES sender reputation (account-wide; AWS/SES publishes these as fractions,
# 0.05 = 5%). AWS puts an account under review at 5% bounces / 0.1% complaints
# and may pause sending at 10% / 0.5%, so these fire at half the review level
# to leave time to stop a send and clean the list. The rates are computed over
# recent volume, so on a small list a single complaint can trip the complaint
# alarm — that is intended. No sends means no datapoints, so missing = OK.
resource "aws_cloudwatch_metric_alarm" "ses_bounce_rate" {
  alarm_name          = "${var.project_name}-ses-bounce-rate"
  alarm_description   = "SES account bounce rate above 2.5% (AWS review at 5%, pause at 10%). Stop the current send, check Admin → Newsletter results and the suppression list, and remove bad addresses before sending again."
  namespace           = "AWS/SES"
  metric_name         = "Reputation.BounceRate"
  statistic           = "Maximum"
  period              = 3600
  evaluation_periods  = 1
  threshold           = 0.025
  comparison_operator = "GreaterThanOrEqualToThreshold"
  treat_missing_data  = "notBreaching"

  alarm_actions = [aws_sns_topic.alerts.arn]
  ok_actions    = [aws_sns_topic.alerts.arn]
}

resource "aws_cloudwatch_metric_alarm" "ses_complaint_rate" {
  alarm_name          = "${var.project_name}-ses-complaint-rate"
  alarm_description   = "SES account complaint rate above 0.05% (AWS review at 0.1%, pause at 0.5%). Pause marketing sends, check which issue and segment drew the complaints, and confirm every recipient opted in."
  namespace           = "AWS/SES"
  metric_name         = "Reputation.ComplaintRate"
  statistic           = "Maximum"
  period              = 3600
  evaluation_periods  = 1
  threshold           = 0.0005
  comparison_operator = "GreaterThanOrEqualToThreshold"
  treat_missing_data  = "notBreaching"

  alarm_actions = [aws_sns_topic.alerts.arn]
  ok_actions    = [aws_sns_topic.alerts.arn]
}
