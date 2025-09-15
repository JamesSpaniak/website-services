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
  default = "example.com"
}

variable "api_subdomain" {
  description = "The subdomain for the API (e.g., api)."
  type        = string
  default     = "api"
}