# CloudFront's origin-facing address ranges. It counts as ~55 rules against the
# security group's 60-rule inbound quota, so it can back exactly one rule.
data "aws_ec2_managed_prefix_list" "cloudfront_origin_facing" {
  name = "com.amazonaws.global.cloudfront.origin-facing"
}

resource "aws_security_group" "lb_sg" {
  name        = "${var.project_name}-lb-sg"
  description = "Allow HTTP/HTTPS traffic to ALB"
  vpc_id      = aws_vpc.main.id

  # CloudFront → ALB is HTTP-only (cloudfront_frontend.tf origin), and every
  # public hostname resolves to CloudFront, so nothing legitimate reaches the
  # ALB from anywhere else. 0.0.0.0/0 on 80 and 443 lets callers skip the WAF
  # and write their own X-Forwarded-For chain (TODO "Shared-IP + bot
  # hardening" B). alb_cloudfront_only_ingress switches to the prefix list.
  dynamic "ingress" {
    for_each = var.alb_cloudfront_only_ingress ? [] : [80, 443]
    content {
      from_port   = ingress.value
      to_port     = ingress.value
      protocol    = "tcp"
      cidr_blocks = ["0.0.0.0/0"]
    }
  }

  dynamic "ingress" {
    for_each = var.alb_cloudfront_only_ingress ? [1] : []
    content {
      description     = "CloudFront origin-facing only"
      from_port       = 80
      to_port         = 80
      protocol        = "tcp"
      prefix_list_ids = [data.aws_ec2_managed_prefix_list.cloudfront_origin_facing.id]
    }
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}

# Shared secret CloudFront adds to every origin request. The prefix list alone
# admits any CloudFront distribution — including someone else's pointed at this
# ALB — so the listeners also require this header once
# alb_require_origin_header is true.
resource "random_password" "origin_verify" {
  length  = 40
  special = false
}

locals {
  origin_verify_header = "X-Origin-Verify"
}

resource "aws_lb" "main" {
  name               = "${var.project_name}-alb"
  internal           = false
  load_balancer_type = "application"
  security_groups    = [aws_security_group.lb_sg.id]
  subnets            = [for k, v in aws_subnet.public : v.id]
}

resource "aws_lb_listener" "http" {
  load_balancer_arn = aws_lb.main.arn
  port              = "80"
  protocol          = "HTTP"

  # Two-step rollout: apply with alb_require_origin_header = false (CloudFront
  # starts sending the header), wait for the distribution to finish deploying,
  # then flip to true. Requests without the header then get 403.
  dynamic "default_action" {
    for_each = var.alb_require_origin_header ? [] : [1]
    content {
      type             = "forward"
      target_group_arn = aws_lb_target_group.frontend_tg.arn
    }
  }

  dynamic "default_action" {
    for_each = var.alb_require_origin_header ? [1] : []
    content {
      type = "fixed-response"
      fixed_response {
        content_type = "text/plain"
        message_body = "Forbidden"
        status_code  = "403"
      }
    }
  }
}

resource "aws_lb_listener_rule" "http_origin_verified" {
  listener_arn = aws_lb_listener.http.arn
  priority     = 1

  condition {
    http_header {
      http_header_name = local.origin_verify_header
      values           = [random_password.origin_verify.result]
    }
  }

  action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.frontend_tg.arn
  }
}


resource "aws_lb_listener" "https" {
  load_balancer_arn = aws_lb.main.arn
  port              = "443"
  protocol          = "HTTPS"
  ssl_policy        = "ELBSecurityPolicy-2016-08"
  certificate_arn   = aws_acm_certificate.main.arn
  depends_on        = [aws_acm_certificate_validation.main]

  # Two-step rollout: apply with alb_require_origin_header = false (CloudFront
  # starts sending the header), wait for the distribution to finish deploying,
  # then flip to true. Requests without the header then get 403.
  dynamic "default_action" {
    for_each = var.alb_require_origin_header ? [] : [1]
    content {
      type             = "forward"
      target_group_arn = aws_lb_target_group.frontend_tg.arn
    }
  }

  dynamic "default_action" {
    for_each = var.alb_require_origin_header ? [1] : []
    content {
      type = "fixed-response"
      fixed_response {
        content_type = "text/plain"
        message_body = "Forbidden"
        status_code  = "403"
      }
    }
  }
}

resource "aws_lb_listener_rule" "https_origin_verified" {
  listener_arn = aws_lb_listener.https.arn
  priority     = 1

  condition {
    http_header {
      http_header_name = local.origin_verify_header
      values           = [random_password.origin_verify.result]
    }
  }

  action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.frontend_tg.arn
  }
}

