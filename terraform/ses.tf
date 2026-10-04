# =============================================================================
# Amazon SES — marketing email on news.thedroneedge.com (launch plan Z1)
#
# Marketing mail (waitlist confirmation, broadcasts, sequences) sends from its
# own subdomain so complaints never touch the reputation of the root domain,
# which delivers verification + password-reset mail via the Google Workspace
# relay (email_dns.tf). Transactional mail stays on that relay for now.
#
# Not automated here: SES production access (leaving the sandbox) is an
# account-level request made once in the SES console. Until it is granted,
# SES only delivers to verified recipients (200/day).
#
# DKIM verification completes minutes–hours after the CNAMEs below resolve.
#
# --- Two-step apply for the SNS -> backend HTTPS subscription ---------------
# SNS POSTs a SubscriptionConfirmation to the endpoint the moment the
# subscription is created; the backend (Z2, POST /email/ses-events) must
# already be live to confirm it, otherwise the subscription sits in
# "PendingConfirmation" and SNS deletes it after 3 days.
#   1. Apply with ses_events_subscription_enabled = false (default): identity,
#      DNS, configuration set, SNS topic, IAM, secrets, env vars.
#      Deploy the backend that serves /api/email/ses-events.
#   2. Set ses_events_subscription_enabled = true in env/<env>.tfvars and run
#      the pipeline again. Check the subscription shows "Confirmed" in the SNS
#      console (topic ${project_name}-ses-events).
# =============================================================================

locals {
  ses_marketing_domain   = "news.${var.domain_name}"
  ses_mail_from_domain   = "bounce.news.${var.domain_name}"
  ses_from_email         = "hello@news.${var.domain_name}"
  ses_from_address       = "Drone Edge <${local.ses_from_email}>"
  ses_reply_to           = "support@${var.domain_name}"
  ses_events_webhook_url = "https://${var.domain_name}/api/email/ses-events"
}

# --- Domain identity + Easy DKIM ---------------------------------------------

resource "aws_sesv2_email_identity" "marketing" {
  email_identity         = local.ses_marketing_domain
  configuration_set_name = aws_sesv2_configuration_set.marketing.configuration_set_name

  dkim_signing_attributes {
    next_signing_key_length = "RSA_2048_BIT"
  }
}

# Easy DKIM always returns exactly three tokens.
resource "aws_route53_record" "ses_marketing_dkim" {
  count   = 3
  zone_id = aws_route53_zone.main.zone_id
  name    = "${aws_sesv2_email_identity.marketing.dkim_signing_attributes[0].tokens[count.index]}._domainkey.${local.ses_marketing_domain}"
  type    = "CNAME"
  ttl     = 1800
  records = ["${aws_sesv2_email_identity.marketing.dkim_signing_attributes[0].tokens[count.index]}.dkim.amazonses.com"]
}

# --- Custom MAIL FROM (bounce.news.…) — aligns SPF with the From domain ------

resource "aws_sesv2_email_identity_mail_from_attributes" "marketing" {
  email_identity         = aws_sesv2_email_identity.marketing.email_identity
  behavior_on_mx_failure = "USE_DEFAULT_VALUE"
  mail_from_domain       = local.ses_mail_from_domain
}

resource "aws_route53_record" "ses_mail_from_mx" {
  zone_id = aws_route53_zone.main.zone_id
  name    = local.ses_mail_from_domain
  type    = "MX"
  ttl     = 3600
  records = ["10 feedback-smtp.${var.aws_region}.amazonses.com"]
}

resource "aws_route53_record" "ses_mail_from_spf" {
  zone_id = aws_route53_zone.main.zone_id
  name    = local.ses_mail_from_domain
  type    = "TXT"
  ttl     = 3600
  records = ["v=spf1 include:amazonses.com ~all"]
}

# --- DMARC for the marketing subdomain ----------------------------------------
# Separate name from the root _dmarc record (email_dns.tf), so no conflict; a
# subdomain record takes precedence over the root policy for news.… mail.
resource "aws_route53_record" "ses_marketing_dmarc" {
  zone_id = aws_route53_zone.main.zone_id
  name    = "_dmarc.${local.ses_marketing_domain}"
  type    = "TXT"
  ttl     = 3600
  records = [
    "v=DMARC1; p=quarantine; rua=mailto:${var.admin_email}; pct=100; adkim=r; aspf=r"
  ]
}

# --- Configuration set + event destination ------------------------------------
# No tracking_options block: it requires a custom redirect domain (and its own
# HTTPS cert). Without it SES open/click tracking uses the AWS-owned domain,
# which still produces OPEN / CLICK events below.

resource "aws_sesv2_configuration_set" "marketing" {
  configuration_set_name = "${var.project_name}-marketing"

  reputation_options {
    reputation_metrics_enabled = true
  }

  sending_options {
    sending_enabled = true
  }

  suppression_options {
    suppressed_reasons = ["BOUNCE", "COMPLAINT"]
  }
}

resource "aws_sns_topic" "ses_events" {
  name = "${var.project_name}-ses-events"
}

resource "aws_sns_topic_policy" "ses_events" {
  arn = aws_sns_topic.ses_events.arn
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
        Resource = aws_sns_topic.ses_events.arn
      },
      {
        Sid    = "AllowSesPublish"
        Effect = "Allow"
        Principal = {
          Service = "ses.amazonaws.com"
        }
        Action   = "sns:Publish"
        Resource = aws_sns_topic.ses_events.arn
        Condition = {
          StringEquals = {
            "aws:SourceAccount" = data.aws_caller_identity.current.account_id
          }
        }
      },
    ]
  })
}

resource "aws_sesv2_configuration_set_event_destination" "marketing_sns" {
  configuration_set_name = aws_sesv2_configuration_set.marketing.configuration_set_name
  event_destination_name = "${var.project_name}-marketing-sns"

  event_destination {
    enabled              = true
    matching_event_types = ["BOUNCE", "COMPLAINT", "DELIVERY", "REJECT", "OPEN", "CLICK"]

    sns_destination {
      topic_arn = aws_sns_topic.ses_events.arn
    }
  }

  depends_on = [aws_sns_topic_policy.ses_events]
}

# Step 2 of the two-step apply (see header). SNS delivers JSON envelopes with
# Content-Type text/plain; the backend verifies the SNS signature, visits
# SubscribeURL on SubscriptionConfirmation, and handles Notification messages.
resource "aws_sns_topic_subscription" "ses_events_backend" {
  count                  = var.ses_events_subscription_enabled ? 1 : 0
  topic_arn              = aws_sns_topic.ses_events.arn
  protocol               = "https"
  endpoint               = local.ses_events_webhook_url
  raw_message_delivery   = false
  endpoint_auto_confirms = false
}

# --- Account-level suppression list ------------------------------------------
# SES itself refuses to send to addresses that hard-bounced or complained.
resource "aws_sesv2_account_suppression_attributes" "main" {
  suppressed_reasons = ["BOUNCE", "COMPLAINT"]
}

# --- IAM: backend task role may send as the marketing identity ---------------
# SESv2 SendEmail authorizes against both the identity and the configuration
# set, so both ARNs are listed. ses:FromAddress pins the sender address.
resource "aws_iam_policy" "ses_send_policy" {
  name        = "${var.project_name}-ses-send-policy"
  description = "Allow ECS backend tasks to send marketing email through SES (news subdomain + marketing configuration set)"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "ses:SendEmail",
          "ses:SendRawEmail",
        ]
        Resource = [
          aws_sesv2_email_identity.marketing.arn,
          aws_sesv2_configuration_set.marketing.arn,
        ]
        Condition = {
          StringEquals = {
            "ses:FromAddress" = local.ses_from_email
          }
        }
      },
    ]
  })
}

resource "aws_iam_role_policy_attachment" "ecs_task_role_ses_send_attachment" {
  role       = aws_iam_role.ecs_task_role.name
  policy_arn = aws_iam_policy.ses_send_policy.arn
}
