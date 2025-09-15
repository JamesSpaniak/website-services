resource "aws_secretsmanager_secret" "db_credentials" {
  name = "${var.project_name}-db-credentials"
}

resource "aws_secretsmanager_secret_version" "db_credentials" {
  secret_id     = aws_secretsmanager_secret.db_credentials.id
  secret_string = jsonencode({
    username = "postgres",
    password = "YourSecurePassword123!" # Replace with a generated password in production
  })
}

resource "aws_db_subnet_group" "aurora_sng" {
  name       = "${var.project_name}-aurora-sng"
  # This assumes a vpc.tf file creates a vpc module with private_subnets output
  subnet_ids = [for k, v in aws_subnet.private : v.id]

  tags = {
    Name = "${var.project_name}-aurora-sng"
  }
}

resource "aws_security_group" "aurora_sg" {
  name        = "${var.project_name}-aurora-sg"
  description = "Allow inbound traffic to Aurora"
  vpc_id      = aws_vpc.main.id

  # Allow traffic from the ECS service security group
  ingress {
    from_port       = 5432
    to_port         = 5432
    protocol        = "tcp"
    security_groups = [aws_security_group.ecs_tasks_sg.id]
  }
}

resource "aws_rds_cluster" "aurora_cluster" {
  cluster_identifier      = "${var.project_name}-aurora-cluster"
  engine                  = "aurora-postgresql"
  engine_mode             = "provisioned"
  engine_version          = "14.10"
  database_name           = "blog"
  master_username         = jsondecode(aws_secretsmanager_secret_version.db_credentials.secret_string).username
  master_password         = jsondecode(aws_secretsmanager_secret_version.db_credentials.secret_string).password
  db_subnet_group_name    = aws_db_subnet_group.aurora_sng.name
  vpc_security_group_ids  = [aws_security_group.aurora_sg.id]
  skip_final_snapshot     = true
  backup_retention_period = 7

  serverlessv2_scaling_configuration {
    min_capacity = 0.5
    max_capacity = 2
  }
}