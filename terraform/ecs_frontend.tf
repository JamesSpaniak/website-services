variable "frontend_image_uri" {
  description = "The URI of the frontend Docker image in ECR."
  type        = string
}

resource "aws_ecs_cluster" "frontend" {
  name = "${var.project_name}-frontend-cluster"
}

resource "aws_cloudwatch_log_group" "frontend" {
  name              = "/ecs/${var.project_name}/frontend"
  retention_in_days = 30
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

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
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
  cpu                      = "256"
  memory                   = "512"
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
        { name = "NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY", value = var.stripe_publishable_key }
      ]
    }
  ])
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
