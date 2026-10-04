aws_region = "us-east-1"
project_name = "droneedge-dev"
domain_name = "thedroneedge.com"
api_subdomain = "api"
frontend_subdomain = "app"
stripe_publishable_key = "pk_test_51T1cg92Rw6cpyMyJI6BOeozOuntx5b1qpgz6yyKfiJZpJMQCclii0IRATMtCQhRknFkJ52JnG2dRSX7CKsYDet8S00WqOUxzWc"
# Create recurring Prices in Stripe Dashboard, then paste price_... IDs here (same mode as secret key).
# Drone Edge sandbox: Drone Edge Pro $35/mo. Swap for the live price at cutover.
stripe_pro_price_id_monthly = "price_1ULulr2Rw6cpyMyJcc0cCqmA"
stripe_pro_price_id_yearly  = ""
# PA41 — first apply needs TF_VAR_stripe_webhook_secret=whsec_... (pipeline.sh checks).
stripe_webhook_enabled = true
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

# Z1 — SES marketing email (ses.tf). Postal address is the CAN-SPAM footer line;
# the mailer refuses to send while it is empty.
marketing_postal_address = "502 W 7th St, Ste 100, Erie, PA 16502, USA"
# Two-step apply: flip to true only after the backend serving
# /api/email/ses-events is deployed, then re-run the pipeline.
ses_events_subscription_enabled = false
