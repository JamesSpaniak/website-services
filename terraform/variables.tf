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