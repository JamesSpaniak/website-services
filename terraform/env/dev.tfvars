aws_region = "us-east-1"
project_name = "droneedge-dev"
domain_name = "thedroneedge.com"
api_subdomain = "api"
frontend_subdomain = "app"
stripe_publishable_key = "pk_test_51T1cg92Rw6cpyMyJI6BOeozOuntx5b1qpgz6yyKfiJZpJMQCclii0IRATMtCQhRknFkJ52JnG2dRSX7CKsYDet8S00WqOUxzWc"
# Create recurring Prices in Stripe Dashboard, then paste price_... IDs here (same mode as secret key).
stripe_pro_price_id_monthly = ""
stripe_pro_price_id_yearly  = ""
email_enabled = true
email_host = "smtp-relay.gmail.com"
email_port = 587
email_from = "DroneEdge <donotreply@thedroneedge.com>"
admin_email = "james@thedroneedge.com"
frontend_debug_logging = "1"
# Keep false: env/dev.tfvars is live prod and test_user_password is weak. Was true but never reached the task (env propagation gap fixed 2026-09-12).
seed_test_data = false

# PD22 / PA36 — course access is read from the entitlements ledger (set false to roll back)
entitlements_authoritative = true
analytics_retention_months = 12
test_user_password = "password"
