variable "api_server_image_uri" {
  description = "The URI of the api_server Docker image in ECR."
  type        = string
}

resource "aws_ecs_cluster" "main" {
  name = "${var.project_name}-cluster"
}

resource "aws_security_group" "ecs_tasks_sg" {
  name        = "${var.project_name}-ecs-tasks-sg"
  description = "Allow inbound traffic to ECS tasks"
  vpc_id      = aws_vpc.main.id

  ingress {
    from_port   = 3000
    to_port     = 3000
    protocol    = "tcp"
    security_groups = [aws_security_group.internal_lb_sg.id]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}

resource "aws_iam_role" "ecs_task_execution_role" {
  name = "${var.project_name}-ecs-task-execution-role"

  assume_role_policy = jsonencode({
    Version   = "2012-10-17"
    Statement = [
      {
        Action    = "sts:AssumeRole"
        Effect    = "Allow"
        Principal = {
          Service = "ecs-tasks.amazonaws.com"
        }
      },
    ]
  })
}

resource "aws_iam_role_policy_attachment" "ecs_task_execution_role_policy" {
  role       = aws_iam_role.ecs_task_execution_role.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy"
}

resource "aws_iam_policy" "secrets_manager_policy" {
  name        = "${var.project_name}-secrets-manager-policy"
  description = "Allow ECS tasks to read backend secrets"

  policy = jsonencode({
    Version   = "2012-10-17"
    Statement = [
      {
        Effect   = "Allow"
        Action   = [
          "secretsmanager:GetSecretValue",
          "secretsmanager:DescribeSecret"
        ]
        Resource = [
          aws_secretsmanager_secret.db_credentials.arn,
          aws_secretsmanager_secret.stripe_secret_key.arn,
          aws_secretsmanager_secret.jwt_secret.arn,
          aws_secretsmanager_secret.admin_seed_password.arn
        ]
      }
    ]
  })
}

resource "aws_iam_role_policy_attachment" "ecs_task_execution_role_secrets_attachment" {
  role       = aws_iam_role.ecs_task_execution_role.name
  policy_arn = aws_iam_policy.secrets_manager_policy.arn
}

resource "aws_iam_role" "ecs_task_role" {
  name = "${var.project_name}-ecs-task-role"

  assume_role_policy = jsonencode({
    Version   = "2012-10-17"
    Statement = [
      {
        Action    = "sts:AssumeRole"
        Effect    = "Allow"
        Principal = {
          Service = "ecs-tasks.amazonaws.com"
        }
      },
    ]
  })
}

resource "aws_iam_policy" "cloudwatch_logs_policy" {
  name        = "${var.project_name}-cloudwatch-logs-policy"
  description = "Allows ECS tasks to write logs to CloudWatch via Winston"

  policy = jsonencode({
    Version   = "2012-10-17"
    Statement = [
      {
        Effect   = "Allow"
        Action   = [
          "logs:CreateLogStream",
          "logs:PutLogEvents",
          "logs:DescribeLogStreams"
        ]
        Resource = "${aws_cloudwatch_log_group.api_server.arn}:*"
      },
    ]
  })
}

resource "aws_iam_role_policy_attachment" "ecs_task_role_cloudwatch_attachment" {
  role       = aws_iam_role.ecs_task_role.name
  policy_arn = aws_iam_policy.cloudwatch_logs_policy.arn
}

resource "aws_iam_policy" "s3_media_policy" {
  name        = "${var.project_name}-s3-media-policy"
  description = "Allow ECS backend tasks to manage objects in the media S3 bucket"

  policy = jsonencode({
    Version   = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "s3:PutObject",
          "s3:DeleteObject",
          "s3:ListBucket",
        ]
        Resource = [
          aws_s3_bucket.media.arn,
          "${aws_s3_bucket.media.arn}/*",
        ]
      },
    ]
  })
}

resource "aws_iam_role_policy_attachment" "ecs_task_role_s3_media_attachment" {
  role       = aws_iam_role.ecs_task_role.name
  policy_arn = aws_iam_policy.s3_media_policy.arn
}

resource "aws_ecs_task_definition" "api_server" {
  family                   = "${var.project_name}-api-server-task"
  network_mode             = "awsvpc"
  requires_compatibilities = ["FARGATE"]
  cpu                      = "256"  # 0.25 vCPU
  memory                   = "512"  # 512 MB
  execution_role_arn       = aws_iam_role.ecs_task_execution_role.arn
  task_role_arn            = aws_iam_role.ecs_task_role.arn

  container_definitions = jsonencode([
    {
      name      = "api-server"
      image     = var.api_server_image_uri
      essential = true
      portMappings = [
        {
          containerPort = 3000
          hostPort      = 3000
        }
      ]
      logConfiguration = {
        logDriver = "awslogs"
        options = {
          awslogs-group         = aws_cloudwatch_log_group.api_server.name
          awslogs-region        = var.aws_region
          awslogs-stream-prefix = "api-server"
        }
      }
      # Pass database credentials securely from Secrets Manager
      secrets = [
        {
          name      = "DB_PASSWORD"
          valueFrom = "${aws_secretsmanager_secret.db_credentials.arn}:password::"
        },
        {
          name      = "STRIPE_SECRET_KEY"
          valueFrom = aws_secretsmanager_secret.stripe_secret_key.arn
        },
        {
          name      = "JWT_SECRET"
          valueFrom = aws_secretsmanager_secret.jwt_secret.arn
        },
        {
          name      = "ADMIN_SEED_PASSWORD"
          valueFrom = aws_secretsmanager_secret.admin_seed_password.arn
        }
      ]
      environment = [
        { name = "DB_HOST", value = aws_rds_cluster.aurora_cluster.endpoint },
        { name = "DB_USER", value = jsondecode(aws_secretsmanager_secret_version.db_credentials.secret_string).username },
        { name = "DB_NAME", value = "blog" },
        { name = "DB_PORT", value = "5432" },
        { name = "DB_SSL", value = "true" },
        { name = "FRONTEND_URL", value = "https://${var.domain_name}" },
        { name = "NODE_ENV", value = "production" },
        { name = "AWS_REGION", value = var.aws_region },
        { name = "CLOUDWATCH_LOG_GROUP_NAME", value = aws_cloudwatch_log_group.api_server.name },
        { name = "CLOUDWATCH_LOG_STREAM_NAME", value = "${var.project_name}-api-stream" },
        { name = "EMAIL_ENABLED", value = tostring(var.email_enabled) },
        { name = "EMAIL_HOST", value = var.email_host },
        { name = "EMAIL_PORT", value = tostring(var.email_port) },
        { name = "EMAIL_FROM", value = var.email_from },
        { name = "SUPPORT_EMAIL_FROM", value = var.support_email_from },
        { name = "ADMIN_EMAIL", value = var.admin_email },
        { name = "S3_MEDIA_BUCKET", value = aws_s3_bucket.media.bucket },
        { name = "CLOUDFRONT_MEDIA_DOMAIN", value = "${var.media_subdomain}.${var.domain_name}" }
      ]
    }
  ])
}

resource "aws_ecs_service" "api_server" {
  name            = "${var.project_name}-api-server-service"
  cluster         = aws_ecs_cluster.main.id
  task_definition = aws_ecs_task_definition.api_server.arn
  desired_count   = 1
  launch_type     = "FARGATE"

  network_configuration {
    subnets         = [for k, v in aws_subnet.private : v.id]
    security_groups = [aws_security_group.ecs_tasks_sg.id]
  }

  load_balancer {
    target_group_arn = aws_lb_target_group.api_internal_tg.arn
    container_name   = "api-server"
    container_port   = 3000
  }

  depends_on = [aws_lb_listener.backend_internal_http]
}

resource "aws_appautoscaling_target" "ecs_target" {
  max_capacity       = 3 # The maximum number of tasks to run
  min_capacity       = 1 # The minimum number of tasks to run
  resource_id        = "service/${aws_ecs_cluster.main.name}/${aws_ecs_service.api_server.name}"
  scalable_dimension = "ecs:service:DesiredCount"
  service_namespace  = "ecs"
}

resource "aws_appautoscaling_policy" "scale_up" {
  name               = "${var.project_name}-scale-up"
  policy_type        = "TargetTrackingScaling"
  resource_id        = aws_appautoscaling_target.ecs_target.resource_id
  scalable_dimension = aws_appautoscaling_target.ecs_target.scalable_dimension
  service_namespace  = aws_appautoscaling_target.ecs_target.service_namespace

  target_tracking_scaling_policy_configuration {
    predefined_metric_specification {
      predefined_metric_type = "ECSServiceAverageCPUUtilization"
    }

    target_value       = 75.0 # Target 75% average CPU utilization
    scale_in_cooldown  = 300  # Cooldown period (in seconds) before scaling in
    scale_out_cooldown = 60   # Cooldown period (in seconds) before scaling out again
  }
}