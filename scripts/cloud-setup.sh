#!/usr/bin/env bash
#
# cloud-setup.sh — Claude Code cloud environment setup script.
#
# This is the source of truth for what gets pasted into the **Setup script**
# field of the cloud environment at claude.ai/code (environment selector →
# settings icon). It is NOT run from the repo: the setup script runs before
# Claude Code launches and must be self-contained.
#
# Installs the two tools pipeline.sh needs that cloud sessions do not ship:
#   - AWS CLI v2   (pipeline.sh calls aws for ECR/ECS/Secrets Manager/CloudFront)
#   - Terraform    (pinned to the version recorded in terraform/terraform.tfstate)
#
# Docker is pre-installed but dockerd is NOT running, and the environment cache
# is a filesystem snapshot that does not keep running processes — so the daemon
# is started per session by the SessionStart hook (scripts/cloud-session-start.sh).
#
# Constraints this script is written around:
#   - must exit 0, or the session fails to start
#   - must finish in ~5 minutes, or the environment cache cannot build
#   - *.amazonaws.com and releases.hashicorp.com are on the default Trusted
#     network allowlist, so both downloads work without a Custom policy
#
# See workflows/tech/deploy-from-cloud.md.

set -uo pipefail

TERRAFORM_VERSION="1.13.3"   # keep in sync with terraform/terraform.tfstate
TMP="$(mktemp -d)"

install_awscli() {
  curl -fsSL -o "${TMP}/awscli.zip" \
    "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" || return 1
  unzip -q -o "${TMP}/awscli.zip" -d "${TMP}" || return 1
  "${TMP}/aws/install" --bin-dir /usr/local/bin --install-dir /usr/local/aws-cli --update || return 1
}

install_terraform() {
  curl -fsSL -o "${TMP}/terraform.zip" \
    "https://releases.hashicorp.com/terraform/${TERRAFORM_VERSION}/terraform_${TERRAFORM_VERSION}_linux_amd64.zip" || return 1
  unzip -q -o "${TMP}/terraform.zip" -d /usr/local/bin || return 1
  chmod +x /usr/local/bin/terraform || return 1
}

# Independent downloads — run them in parallel to stay inside the 5 minute budget.
install_awscli   > "${TMP}/aws.log"       2>&1 &
aws_pid=$!
install_terraform > "${TMP}/terraform.log" 2>&1 &
tf_pid=$!

wait "${aws_pid}" || { echo "WARN: aws cli install failed"; tail -20 "${TMP}/aws.log"; }
wait "${tf_pid}"  || { echo "WARN: terraform install failed"; tail -20 "${TMP}/terraform.log"; }

echo "--- cloud-setup.sh results ---"
aws --version       2>&1 || echo "aws:       MISSING"
terraform version   2>&1 | head -1 || echo "terraform: MISSING"

rm -rf "${TMP}"

# Never fail the session over a tool install; deploy-preflight.sh reports what is missing.
exit 0
