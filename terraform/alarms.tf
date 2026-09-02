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
  alarm_name          = "${var.project_name}-nat-no-egress"
  alarm_description   = "NAT gateway established no connections for 2 hours. SMTP, Stripe, and OTLP egress are likely down even if the NAT still shows available."
  namespace           = "AWS/NATGateway"
  metric_name         = "ConnectionEstablishedCount"
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
