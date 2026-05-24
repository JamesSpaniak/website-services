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