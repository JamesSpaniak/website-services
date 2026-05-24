variable "frontend_image_uri" {
  description = "The URI of the frontend Docker image in ECR. Leave empty for infra-only applies."
  type        = string
  default     = ""
}

resource "aws_ecs_cluster" "frontend" {
  name = "${var.project_name}-frontend-cluster"
}

resource "aws_cloudwatch_log_group" "frontend" {
  name              = "/ecs/${var.project_name}/frontend"
  retention_in_days = var.cloudwatch_log_retention_days
}

resource "aws_security_group" "frontend_tasks_sg" {
  name        = "${var.project_name}-frontend-tasks-sg"
  description = "Allow inbound traffic to frontend ECS tasks"
  vpc_id      = aws_vpc.main.id

  ingress {
    from_port       = 8080
    to_port         = 8080
    protocol        = "tcp"
    security_groups = [aws_security_group.lb_sg.id]
  }

  # HTTP — internal ALB (backend API proxy)
  egress {
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["10.0.0.0/16"]
  }

  # HTTPS — AWS APIs (via VPC endpoints + NAT)
  egress {
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  # DNS
  egress {
    from_port   = 53
    to_port     = 53
    protocol    = "udp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "${var.project_name}-frontend-tasks-sg"
  }
}

resource "aws_lb_target_group" "frontend_tg" {
  name        = "${var.project_name}-frontend-tg"
  port        = 8080
  protocol    = "HTTP"
  vpc_id      = aws_vpc.main.id
  target_type = "ip"
}

resource "aws_lb_listener_rule" "frontend_http" {
  listener_arn = aws_lb_listener.http.arn
  priority     = 100

  action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.frontend_tg.arn
  }

  condition {
    host_header {
      values = [
        "${var.frontend_subdomain}.${var.domain_name}",
        "${var.frontend_subdomain}.${var.dev_subdomain}.${var.domain_name}",
        "${var.domain_name}",
        "www.${var.domain_name}"
      ]
    }
  }
}

resource "aws_lb_listener_rule" "frontend_https" {
  listener_arn = aws_lb_listener.https.arn
  priority     = 101

  action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.frontend_tg.arn
  }

  condition {
    host_header {
      values = [
        "${var.frontend_subdomain}.${var.domain_name}",
        "${var.frontend_subdomain}.${var.dev_subdomain}.${var.domain_name}",
        "${var.domain_name}",
        "www.${var.domain_name}"
      ]
    }
  }
}

resource "aws_ecs_task_definition" "frontend" {
  family                   = "${var.project_name}-drone-frontend-task"
  network_mode             = "awsvpc"
  requires_compatibilities = ["FARGATE"]
  cpu                      = "512"  # 0.5 vCPU
  memory                   = "1024" # 1 GB
  execution_role_arn       = aws_iam_role.ecs_task_execution_role.arn
  task_role_arn            = aws_iam_role.ecs_task_role.arn

  container_definitions = jsonencode([
    {
      name      = "drone-frontend"
      image     = var.frontend_image_uri
      essential = true
      portMappings = [
        {
          containerPort = 8080
          hostPort      = 8080
        }
      ]
      logConfiguration = {
        logDriver = "awslogs"
        options = {
          awslogs-group         = aws_cloudwatch_log_group.frontend.name
          awslogs-region        = var.aws_region
          awslogs-stream-prefix = "frontend"
        }
      }
      environment = [
        { name = "API_INTERNAL_BASE_URL", value = "http://${aws_lb.backend_internal.dns_name}" },
        { name = "NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY", value = var.stripe_publishable_key },
        { name = "NEXT_PUBLIC_CLOUDFRONT_DOMAIN", value = "media.thedroneedge.com" },
        { name = "NEXT_PUBLIC_DEBUG_LOGGING", value = var.frontend_debug_logging }
      ]
    }
  ])

  # Pipeline updates image via var; we ignore container_definitions changes so Terraform
  # does not overwrite. To push new env vars (e.g. NEXT_PUBLIC_DEBUG_LOGGING), taint once:
  #   terraform taint aws_ecs_task_definition.frontend
  # then apply so the task definition is recreated with the new definition.
  lifecycle {
    ignore_changes = [container_definitions]
  }
}

resource "aws_ecs_service" "frontend" {
  name            = "${var.project_name}-drone-frontend-service"
  cluster         = aws_ecs_cluster.frontend.id
  task_definition = aws_ecs_task_definition.frontend.arn
  desired_count   = 1
  launch_type     = "FARGATE"

  network_configuration {
    subnets         = [for k, v in aws_subnet.private : v.id]
    security_groups = [aws_security_group.frontend_tasks_sg.id]
  }

  load_balancer {
    target_group_arn = aws_lb_target_group.frontend_tg.arn
    container_name   = "drone-frontend"
    container_port   = 8080
  }

  depends_on = [aws_lb_listener.http, aws_lb_listener.https]
}

resource "aws_appautoscaling_target" "frontend_ecs_target" {
  max_capacity       = 3
  min_capacity       = 1
  resource_id        = "service/${aws_ecs_cluster.frontend.name}/${aws_ecs_service.frontend.name}"
  scalable_dimension = "ecs:service:DesiredCount"
  service_namespace  = "ecs"
}

resource "aws_appautoscaling_policy" "frontend_scale_up" {
  name               = "${var.project_name}-frontend-scale-up"
  policy_type        = "TargetTrackingScaling"
  resource_id        = aws_appautoscaling_target.frontend_ecs_target.resource_id
  scalable_dimension = aws_appautoscaling_target.frontend_ecs_target.scalable_dimension
  service_namespace  = aws_appautoscaling_target.frontend_ecs_target.service_namespace

  target_tracking_scaling_policy_configuration {
    predefined_metric_specification {
      predefined_metric_type = "ECSServiceAverageCPUUtilization"
    }

    target_value       = 75.0
    scale_in_cooldown  = 300
    scale_out_cooldown = 60
  }
}
