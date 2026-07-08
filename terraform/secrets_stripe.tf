resource "aws_secretsmanager_secret" "stripe_secret_key" {
  name = "${var.project_name}-stripe-secret-key"
}

resource "aws_secretsmanager_secret" "stripe_webhook_secret" {
  name = "${var.project_name}-stripe-webhook-secret"
}

resource "aws_secretsmanager_secret" "jwt_secret" {
  name = "${var.project_name}-jwt-secret"
}

resource "aws_secretsmanager_secret" "admin_seed_password" {
  name = "${var.project_name}-admin-seed-password"
}

# Password for dev-only test fixtures (test admin/user). Only referenced by the
# task when seed_test_data is true.
resource "aws_secretsmanager_secret" "test_user_password" {
  name = "${var.project_name}-test-user-password"
}

# Manage the value in terraform so the secret is never empty when the task
# references it (avoids the create-secret-then-deploy ordering trap). Skipped
# when no password is provided (e.g. prod), leaving the secret unmanaged.
resource "aws_secretsmanager_secret_version" "test_user_password" {
  count         = var.seed_test_data && var.test_user_password != "" ? 1 : 0
  secret_id     = aws_secretsmanager_secret.test_user_password.id
  secret_string = var.test_user_password
}

resource "aws_secretsmanager_secret" "grafana_otel_headers" {
  name = "${var.project_name}-grafana-otel-headers"
}

resource "aws_secretsmanager_secret" "cloudfront_signing_private_key" {
  name = "${var.project_name}-cloudfront-signing-private-key"
}

