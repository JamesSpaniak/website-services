# =============================================================================
# Branded open/click tracking domain for marketing email — click.news.…
# (newsletter plan § 5 metrics; docs/tech/backend-data.md "Newsletter — /newsletter")
#
# SES rewrites every link in marketing mail (and adds an open pixel) so it can
# publish CLICK / OPEN events. Without this file those links point at the
# AWS-owned r.<region>.awstrack.me; with it they point at our own subdomain,
# which reads as trustworthy to people and spam filters.
#
# Per AWS docs ("Configuring custom domains to handle open and click
# tracking", Option 2 HTTPS):
#   - the subdomain is its own verified SES identity (Easy DKIM below);
#   - a CloudFront distribution fronts r.<region>.awstrack.me, HTTPS-only to
#     the origin, forwarding the viewer Host header (AllViewer origin request
#     policy) and never caching (every open/click must reach SES);
#   - an ACM cert (us-east-1) covers the subdomain;
#   - the configuration set's TrackingOptions name the domain, HttpsPolicy REQUIRE.
#
# --- Regions -------------------------------------------------------------------
# SES is regional: the identity, configuration set, tracking origin and events
# all live in var.aws_region, and the origin MUST be that region's awstrack.me
# (a tracking domain only works for mail sent from the same region). Each
# email is sent once, by whichever region the backend's SES client calls
# (AWS_REGION in ecs_backend.tf) — servers elsewhere do not cause double sends.
# This stack is single-region: a second regional copy would collide on the
# click.news / bounce.news / _dmarc.news DNS names. See docs/TODO.md
# ("SES multi-region") before running the stack in another region.
#
# --- Two-step apply (same pattern as the SNS subscription in ses.tf) ---------
#   1. Apply with ses_custom_tracking_domain_enabled = false (default): creates
#      the identity, DKIM records, cert, distribution and alias. Wait until SES
#      shows click.news.… as "Verified" and this returns 200 with both
#      x-amz-ses-region: <var.aws_region> and x-amz-ses-request-protocol: https:
#        curl --head https://click.news.<domain>/favicon.ico
#      A 502 means CloudFront rejected the origin TLS (see the Host header note
#      below) — leave the flag off; tracking keeps working via awstrack.me.
#   2. Set ses_custom_tracking_domain_enabled = true and run the pipeline again
#      — the configuration set starts wrapping links with the branded domain.
# =============================================================================

locals {
  ses_tracking_domain = "click.news.${var.domain_name}"
  ses_tracking_origin = "r.${var.aws_region}.awstrack.me"
}

# --- SES identity for the tracking subdomain ---------------------------------

resource "aws_sesv2_email_identity" "tracking" {
  email_identity = local.ses_tracking_domain

  dkim_signing_attributes {
    next_signing_key_length = "RSA_2048_BIT"
  }
}

resource "aws_route53_record" "ses_tracking_dkim" {
  count   = 3
  zone_id = aws_route53_zone.main.zone_id
  name    = "${aws_sesv2_email_identity.tracking.dkim_signing_attributes[0].tokens[count.index]}._domainkey.${local.ses_tracking_domain}"
  type    = "CNAME"
  ttl     = 1800
  records = ["${aws_sesv2_email_identity.tracking.dkim_signing_attributes[0].tokens[count.index]}.dkim.amazonses.com"]
}

# --- Certificate (CloudFront certs must live in us-east-1; so does this stack) -

resource "aws_acm_certificate" "ses_tracking" {
  domain_name       = local.ses_tracking_domain
  validation_method = "DNS"

  lifecycle {
    create_before_destroy = true
  }
}

resource "aws_route53_record" "ses_tracking_cert_validation" {
  for_each = {
    for dvo in aws_acm_certificate.ses_tracking.domain_validation_options : dvo.domain_name => {
      name   = dvo.resource_record_name
      record = dvo.resource_record_value
      type   = dvo.resource_record_type
    }
  }

  allow_overwrite = true
  name            = each.value.name
  records         = [each.value.record]
  ttl             = 60
  type            = each.value.type
  zone_id         = aws_route53_zone.main.zone_id
}

resource "aws_acm_certificate_validation" "ses_tracking" {
  certificate_arn         = aws_acm_certificate.ses_tracking.arn
  validation_record_fqdns = [for record in aws_route53_record.ses_tracking_cert_validation : record.fqdn]
}

# --- CloudFront in front of the SES tracking endpoint ------------------------

data "aws_cloudfront_cache_policy" "caching_disabled" {
  name = "Managed-CachingDisabled"
}

# Forwards the viewer Host header (click.news.…) so SES can match the link to
# the configuration set — AWS's SES doc requires this. Unconfirmed: CloudFront
# normally validates a custom origin's certificate against the forwarded Host
# rather than the origin domain, and SES's docs don't say how awstrack.me
# satisfies that for a verified tracking domain. The step-1 curl check is the
# proof; a 502 there means this does not hold.
data "aws_cloudfront_origin_request_policy" "all_viewer" {
  name = "Managed-AllViewer"
}

resource "aws_cloudfront_distribution" "ses_tracking" {
  enabled         = true
  comment         = "${var.project_name} SES open/click tracking (${local.ses_tracking_domain})"
  aliases         = [local.ses_tracking_domain]
  price_class     = "PriceClass_100"
  is_ipv6_enabled = true
  http_version    = "http2and3"

  origin {
    origin_id   = "ses-tracking"
    domain_name = local.ses_tracking_origin

    custom_origin_config {
      http_port              = 80
      https_port             = 443
      origin_protocol_policy = "https-only"
      origin_ssl_protocols   = ["TLSv1.2"]
    }
  }

  default_cache_behavior {
    target_origin_id         = "ses-tracking"
    viewer_protocol_policy   = "redirect-to-https"
    allowed_methods          = ["GET", "HEAD", "OPTIONS"]
    cached_methods           = ["GET", "HEAD"]
    compress                 = false
    cache_policy_id          = data.aws_cloudfront_cache_policy.caching_disabled.id
    origin_request_policy_id = data.aws_cloudfront_origin_request_policy.all_viewer.id
  }

  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }

  viewer_certificate {
    acm_certificate_arn      = aws_acm_certificate_validation.ses_tracking.certificate_arn
    ssl_support_method       = "sni-only"
    minimum_protocol_version = "TLSv1.2_2021"
  }
}

resource "aws_route53_record" "ses_tracking_alias" {
  for_each = toset(["A", "AAAA"])
  zone_id  = aws_route53_zone.main.zone_id
  name     = local.ses_tracking_domain
  type     = each.value

  alias {
    name                   = aws_cloudfront_distribution.ses_tracking.domain_name
    zone_id                = aws_cloudfront_distribution.ses_tracking.hosted_zone_id
    evaluate_target_health = false
  }
}
