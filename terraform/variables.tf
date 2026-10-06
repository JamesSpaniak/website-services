variable "aws_region" {
  description = "The AWS region to deploy resources in."
  type        = string
  default     = "us-east-1"
}

variable "project_name" {
  description = "A name for the project to prefix resources."
  type        = string
  default     = "personal-site"
}

variable "domain_name" {
  description = "The root domain name (e.g., example.com)."
  type        = string
  # Replace with your actual domain name
  default = "thedroneedge.com"
}

variable "api_subdomain" {
  description = "The subdomain for the API (e.g., api)."
  type        = string
  default     = "api"
}

variable "frontend_subdomain" {
  description = "The subdomain for the frontend app (e.g., app)."
  type        = string
  default     = "app"
}

variable "dev_subdomain" {
  description = "The environment subdomain prefix (e.g., dev)."
  type        = string
  default     = "dev"
}

variable "media_subdomain" {
  description = "The subdomain for media content (e.g., media)."
  type        = string
  default     = "media"
}

variable "stripe_publishable_key" {
  description = "Stripe publishable key for the frontend."
  type        = string
  default     = ""
}

variable "stripe_pro_price_id_monthly" {
  description = "Stripe Price ID for monthly Pro subscription (price_...). Empty disables Pro Checkout until set."
  type        = string
  default     = ""
}

variable "stripe_pro_price_id_yearly" {
  description = "Optional Stripe Price ID for yearly Pro subscription."
  type        = string
  default     = ""
}

variable "stripe_secret_key_managed" {
  description = "Manage the value of the <project>-stripe-secret-key secret in Terraform (set from TF_VAR_stripe_secret_key on first apply, replaced with ./pipeline.sh --rotate-stripe). False keeps the value that was set by hand before this existed. Turn on at the live cutover (docs/tech/stripe-sandbox-test-plan.md § 8)."
  type        = bool
  default     = false
}

variable "stripe_secret_key" {
  description = "Stripe secret key (sk_live_/sk_test_ or restricted rk_). Pass at apply time with TF_VAR_stripe_secret_key — never put it in tfvars or chat. Only read when the secret version is created or replaced (--rotate-stripe)."
  type        = string
  default     = ""
  sensitive   = true

  validation {
    condition     = var.stripe_secret_key == "" || can(regex("^(sk|rk)_(live|test)_", var.stripe_secret_key))
    error_message = "stripe_secret_key must start with sk_live_, sk_test_, rk_live_ or rk_test_."
  }
}

variable "stripe_webhook_enabled" {
  description = "Inject STRIPE_WEBHOOK_SECRET into the API task. Set true only after the Stripe webhook endpoint exists and its signing secret has been stored in the <project>-stripe-webhook-secret Secrets Manager secret — ECS refuses to start a task whose referenced secret has no value."
  type        = bool
  default     = false
}

variable "stripe_webhook_secret" {
  description = "Stripe webhook signing secret (whsec_...). Pass at apply time with TF_VAR_stripe_webhook_secret — never put it in tfvars. Only read when the secret version is first created (stripe_webhook_enabled); rotate with --replace 'aws_secretsmanager_secret_version.stripe_webhook_secret[0]'."
  type        = string
  default     = ""
  sensitive   = true

  validation {
    condition     = var.stripe_webhook_secret == "" || startswith(var.stripe_webhook_secret, "whsec_")
    error_message = "stripe_webhook_secret must start with whsec_."
  }
}

variable "frontend_debug_logging" {
  description = "Set to 1 to enable NEXT_PUBLIC_DEBUG_LOGGING in the frontend task (visible in AWS console). Actual debug output is enabled at build time via pipeline build-arg; this is for visibility/consistency."
  type        = string
  default     = "1"
}

variable "email_enabled" {
  description = "Enable outbound email sending."
  type        = bool
  default     = true
}

variable "email_host" {
  description = "SMTP host for outbound email."
  type        = string
  default     = "smtp-relay.gmail.com"
}

variable "email_port" {
  description = "SMTP port for outbound email."
  type        = number
  default     = 587
}

variable "email_from" {
  description = "From address for outbound emails."
  type        = string
  default     = "DroneEdge <donotreply@thedroneedge.com>"
}

variable "admin_email" {
  description = "Admin email address for contact form."
  type        = string
  default     = "james@thedroneedge.com"
}

variable "support_email_from" {
  description = "From address for support/transactional emails (password resets, verifications)."
  type        = string
  default     = "DroneEdge Support <support@thedroneedge.com>"
}

variable "cloudfront_signing_public_key_pem" {
  description = "RSA public key PEM for CloudFront signed URLs (course videos)."
  type        = string
  sensitive   = true
}

variable "waf_ip_rate_limit" {
  description = "CloudFront WAF rate-based block threshold (requests per IP per 5-minute window). Classroom NATs share one IP; 1000 was too low."
  type        = number
  default     = 20000
}

variable "cloudwatch_log_retention_days" {
  description = "Retention for application and VPC flow log groups (lower = lower CloudWatch Logs cost)."
  type        = number
  default     = 7
}

variable "enable_vpc_flow_logs" {
  description = "VPC Flow Logs to CloudWatch are high-volume. Set false to disable and save cost; re-enable for forensics."
  type        = bool
  default     = true
}

variable "seed_test_data" {
  description = "Seed dev-only test fixtures (test admin, test student, test organization) on backend boot. Keep false for prod."
  type        = bool
  default     = false
}

variable "analytics_retention_months" {
  description = "Months of raw product_events kept in Postgres before the nightly job archives a partition to the analytics-archive bucket (Glacier IR) and drops it."
  type        = number
  default     = 12
}

variable "entitlements_authoritative" {
  description = "PD22 switch: when true, course access is read from the entitlements ledger instead of user_courses_purchased + users Pro columns. Flip only after 14 clean nights of the reconciliation gate checks (GET /reporting/health)."
  type        = bool
  default     = false
}

variable "test_user_password" {
  description = "Password for dev-only test fixtures. When set (and seed_test_data is true) terraform manages the secret value so no out-of-band seeding is needed. Leave empty in prod."
  type        = string
  default     = ""
  sensitive   = true
}

variable "marketing_postal_address" {
  description = "CAN-SPAM physical address for marketing email footer; mailer refuses to send while empty."
  type        = string
  default     = ""
}

variable "ses_events_subscription_enabled" {
  description = "Create the SNS -> https://<domain>/api/email/ses-events subscription for SES events. Enable only after the backend serving that endpoint is deployed, so it can confirm the subscription (two-step apply, see ses.tf)."
  type        = bool
  default     = false
}

variable "ses_custom_tracking_domain_enabled" {
  description = "Wrap marketing-email links and the open pixel with the branded click.news.<domain> tracking domain. Enable only after ses_tracking.tf has been applied and SES shows the subdomain as Verified (two-step apply, see ses_tracking.tf)."
  type        = bool
  default     = false
}
