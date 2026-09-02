output "nat_gateway_eip" {
  description = "The public IP of the NAT Gateway. Whitelist this in Google Workspace SMTP relay settings."
  value       = aws_eip.nat.public_ip
}

output "ops_alerts_topic_arn" {
  description = "SNS topic for CloudWatch ops alarms (email to admin_email after subscription confirm)."
  value       = aws_sns_topic.alerts.arn
}

output "media_cloudfront_domain" {
  description = "CloudFront domain for the media distribution."
  value       = aws_cloudfront_distribution.media_distribution.domain_name
}

output "frontend_cloudfront_id" {
  description = "CloudFront distribution ID for the frontend. Use for cache invalidation after deploys."
  value       = aws_cloudfront_distribution.frontend_distribution.id
}

output "nameservers" {
  description = "Route53 nameservers for the hosted zone. Set these at your domain registrar."
  value       = aws_route53_zone.main.name_servers
}
