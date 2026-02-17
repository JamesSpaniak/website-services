resource "aws_secretsmanager_secret" "stripe_secret_key" {
  name = "${var.project_name}-stripe-secret-key"
}

resource "aws_secretsmanager_secret" "jwt_secret" {
  name = "${var.project_name}-jwt-secret"
}

resource "aws_secretsmanager_secret" "admin_seed_password" {
  name = "${var.project_name}-admin-seed-password"
}

