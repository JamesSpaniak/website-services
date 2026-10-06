resource "aws_secretsmanager_secret" "stripe_secret_key" {
  name = "${var.project_name}-stripe-secret-key"
}

resource "aws_secretsmanager_secret" "stripe_webhook_secret" {
  name = "${var.project_name}-stripe-webhook-secret"
}

# Live cutover / key rotation without the AWS CLI (Terraform owns the value):
# created once from TF_VAR_stripe_secret_key when stripe_secret_key_managed is
# on, ignored afterwards so routine deploys never need the key, and replaced by
# `./pipeline.sh --rotate-stripe`. create_before_destroy: the new value becomes
# AWSCURRENT before the old version is retired, so the secret is never empty.
resource "aws_secretsmanager_secret_version" "stripe_secret_key" {
  count         = var.stripe_secret_key_managed ? 1 : 0
  secret_id     = aws_secretsmanager_secret.stripe_secret_key.id
  secret_string = var.stripe_secret_key

  lifecycle {
    ignore_changes        = [secret_string]
    create_before_destroy = true
  }
}

# Value is set once, from TF_VAR_stripe_webhook_secret, when the webhook is
# enabled. ignore_changes keeps later deploys (which don't pass the var) from
# blanking it; pipeline.sh refuses the first apply if the var is missing.
resource "aws_secretsmanager_secret_version" "stripe_webhook_secret" {
  count         = var.stripe_webhook_enabled ? 1 : 0
  secret_id     = aws_secretsmanager_secret.stripe_webhook_secret.id
  secret_string = var.stripe_webhook_secret

  lifecycle {
    ignore_changes        = [secret_string]
    create_before_destroy = true
  }
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

# HMAC key for signed unsubscribe tokens in marketing email (Z3). Same
# ordering-trap fix as test_user_password: terraform generates and stores the
# value, so the secret is never empty when the task references it. Rotating it
# (-replace=random_password.leads_unsubscribe_secret) invalidates every
# unsubscribe link already sent.
resource "random_password" "leads_unsubscribe_secret" {
  length  = 64
  special = false
}

resource "aws_secretsmanager_secret" "leads_unsubscribe_secret" {
  name = "${var.project_name}-leads-unsubscribe-secret"
}

resource "aws_secretsmanager_secret_version" "leads_unsubscribe_secret" {
  secret_id     = aws_secretsmanager_secret.leads_unsubscribe_secret.id
  secret_string = random_password.leads_unsubscribe_secret.result
}

resource "aws_secretsmanager_secret" "grafana_otel_headers" {
  name = "${var.project_name}-grafana-otel-headers"
}

resource "aws_secretsmanager_secret" "cloudfront_signing_private_key" {
  name = "${var.project_name}-cloudfront-signing-private-key"
}

