output "nat_gateway_eip" {
  description = "The public IP of the NAT Gateway. Whitelist this in Google Workspace SMTP relay settings."
  value       = aws_eip.nat.public_ip
}

output "media_cloudfront_domain" {
  description = "CloudFront domain for the media distribution."
  value       = aws_cloudfront_distribution.media_distribution.domain_name
}

output "nameservers" {
  description = "Route53 nameservers for the hosted zone. Set these at your domain registrar."
  value       = aws_route53_zone.main.name_servers
}
