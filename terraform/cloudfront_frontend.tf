resource "aws_wafv2_web_acl" "frontend" {
  name  = "${var.project_name}-frontend-waf"
  scope = "CLOUDFRONT"

  default_action {
    allow {}
  }

  rule {
    name     = "AWSManagedRulesCommonRuleSet"
    priority = 1

    override_action {
      none {}
    }

    statement {
      managed_rule_group_statement {
        name        = "AWSManagedRulesCommonRuleSet"
        vendor_name = "AWS"

        rule_action_override {
          name = "CrossSiteScripting_BODY"
          action_to_use {
            count {}
          }
        }

        rule_action_override {
          name = "SizeRestrictions_BODY"
          action_to_use {
            count {}
          }
        }
      }
    }

    visibility_config {
      sampled_requests_enabled   = true
      cloudwatch_metrics_enabled = true
      metric_name                = "${var.project_name}-waf-common"
    }
  }

  rule {
    name     = "AWSManagedRulesKnownBadInputs"
    priority = 2

    override_action {
      none {}
    }

    statement {
      managed_rule_group_statement {
        name        = "AWSManagedRulesKnownBadInputsRuleSet"
        vendor_name = "AWS"
      }
    }

    visibility_config {
      sampled_requests_enabled   = true
      cloudwatch_metrics_enabled = true
      metric_name                = "${var.project_name}-waf-bad-inputs"
    }
  }

  rule {
    name     = "RateLimit"
    priority = 3

    action {
      block {}
    }

    statement {
      rate_based_statement {
        limit              = 1000
        aggregate_key_type = "IP"
      }
    }

    visibility_config {
      sampled_requests_enabled   = true
      cloudwatch_metrics_enabled = true
      metric_name                = "${var.project_name}-waf-rate-limit"
    }
  }

  visibility_config {
    sampled_requests_enabled   = true
    cloudwatch_metrics_enabled = true
    metric_name                = "${var.project_name}-waf"
  }
}

resource "aws_cloudfront_distribution" "frontend_distribution" {
  origin {
    domain_name = aws_lb.main.dns_name
    origin_id   = "ALB-${var.project_name}-frontend"

    custom_origin_config {
      http_port              = 80
      https_port             = 443
      origin_protocol_policy = "http-only"
      origin_ssl_protocols   = ["TLSv1.2"]
    }
  }

  enabled         = true
  is_ipv6_enabled = true
  # Do NOT set default_root_object for Next.js on ALB — it would map / → /index.html at the origin and return 404.
  # (S3 static sites use index.html; App Router serves /.)

  # Include www — Route53 points www → this distribution; omitting www here causes
  # CloudFront to return 403 for Host: www..., which blocks Google indexing.
  aliases = [
    var.domain_name,
    "www.${var.domain_name}",
    "${var.frontend_subdomain}.${var.domain_name}",
    "${var.frontend_subdomain}.${var.dev_subdomain}.${var.domain_name}"
  ]

  # ── Static JS/CSS chunks — long-lived, no auth needed ─────────────────────
  ordered_cache_behavior {
    path_pattern           = "/_next/static/*"
    target_origin_id       = "ALB-${var.project_name}-frontend"
    viewer_protocol_policy = "redirect-to-https"
    allowed_methods        = ["GET", "HEAD"]
    cached_methods         = ["GET", "HEAD"]
    compress               = true

    forwarded_values {
      query_string = false
      headers      = []
      cookies {
        forward = "none"
      }
    }

    min_ttl     = 0
    default_ttl = 86400    # 1 day
    max_ttl     = 31536000 # 1 year (Next.js hashes chunk filenames)
  }

  # ── Next.js image optimisation — cache by URL+query, strip cookies ─────────
  ordered_cache_behavior {
    path_pattern           = "/_next/image*"
    target_origin_id       = "ALB-${var.project_name}-frontend"
    viewer_protocol_policy = "redirect-to-https"
    allowed_methods        = ["GET", "HEAD"]
    cached_methods         = ["GET", "HEAD"]
    compress               = true

    forwarded_values {
      # query_string carries the src URL, width, and quality — must be forwarded
      query_string = true
      headers      = []
      cookies {
        forward = "none"
      }
    }

    min_ttl     = 0
    default_ttl = 86400    # 1 day
    max_ttl     = 2592000  # 30 days
  }

  # ── Public-folder static files (favicon, OG images, etc.) ─────────────────
  ordered_cache_behavior {
    path_pattern           = "/images/*"
    target_origin_id       = "ALB-${var.project_name}-frontend"
    viewer_protocol_policy = "redirect-to-https"
    allowed_methods        = ["GET", "HEAD"]
    cached_methods         = ["GET", "HEAD"]
    compress               = true

    forwarded_values {
      query_string = false
      headers      = []
      cookies {
        forward = "none"
      }
    }

    min_ttl     = 0
    default_ttl = 3600    # 1 hour
    max_ttl     = 86400   # 1 day
  }

  default_cache_behavior {
    target_origin_id       = "ALB-${var.project_name}-frontend"
    viewer_protocol_policy = "redirect-to-https"
    allowed_methods        = ["GET", "HEAD", "OPTIONS", "PUT", "POST", "PATCH", "DELETE"]
    cached_methods         = ["GET", "HEAD"]

    forwarded_values {
      query_string = true
      # Content-Type required so POST body (e.g. /api/analytics/event) is parsed as JSON at origin/backend
      headers      = ["Authorization", "Content-Type", "Origin", "Referer"]

      cookies {
        forward = "all"
      }
    }
  }

  viewer_certificate {
    acm_certificate_arn = aws_acm_certificate_validation.main.certificate_arn
    ssl_support_method  = "sni-only"
  }

  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }

  web_acl_id = aws_wafv2_web_acl.frontend.arn
}
