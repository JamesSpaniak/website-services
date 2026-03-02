#!/usr/bin/env bash
#
# reconcile-state.sh — Terraform state reconciliation for secrets + CloudFront signing keys.
#
# Sourced by pipeline.sh inside the Terraform working directory subshell.
# Expects these variables to be set by the caller:
#   PROJECT_NAME, AWS_REGION, TFVARS_ARGS, VAR_ARGS, CF_PUBLIC_KEY_PEM, CF_PUBLIC_KEY_FILE
#
set -euo pipefail

# ─── Helpers ────────────────────────────────────────────────────────────────────

tf_import() {
  local tf_address="$1"
  local resource_id="$2"
  terraform import -input=false \
    ${TFVARS_ARGS[@]+"${TFVARS_ARGS[@]}"} \
    ${VAR_ARGS[@]+"${VAR_ARGS[@]}"} \
    -var "cloudfront_signing_public_key_pem=${CF_PUBLIC_KEY_PEM}" \
    "${tf_address}" \
    "${resource_id}"
}

tf_state_has() {
  terraform state show "$1" >/dev/null 2>&1
}

tf_state_attr() {
  local address="$1" attr="$2"
  terraform state show "${address}" 2>/dev/null | \
    awk -v a="${attr}" '$1 == a && $2 == "=" { gsub(/[" ,]/, "", $3); print $3; exit }'
}

tf_state_list_item() {
  terraform state show "aws_cloudfront_key_group.video_signing" 2>/dev/null | \
    awk '
      $1 == "items" { in_items = 1; next }
      in_items && /\]/ { exit }
      in_items { gsub(/[",\[\] ]/, "", $0); if ($0 != "") { print; exit } }
    '
}

aws_secret_pending_deletion() {
  local name="$1"
  local d
  d="$(aws secretsmanager describe-secret --secret-id "${name}" --region "${AWS_REGION}" \
    --query 'DeletedDate' --output text 2>/dev/null || true)"
  [[ -n "${d}" && "${d}" != "None" ]]
}

aws_secret_exists() {
  aws secretsmanager describe-secret --secret-id "$1" --region "${AWS_REGION}" >/dev/null 2>&1
}

cf_public_key_exists() {
  aws cloudfront get-public-key --id "$1" --query 'PublicKey.Id' --output text >/dev/null 2>&1
}

cf_key_group_item() {
  local kg_id="$1"
  aws cloudfront get-key-group --id "${kg_id}" \
    --query 'KeyGroup.KeyGroupConfig.Items[0]' --output text 2>/dev/null || true
}

cf_key_group_id_by_name() {
  aws cloudfront list-key-groups \
    --query "KeyGroupList.Items[?KeyGroupConfig.Name=='$1'].Id | [0]" \
    --output text 2>/dev/null || true
}

cf_public_key_id_by_name() {
  aws cloudfront list-public-keys \
    --query "PublicKeyList.Items[?PublicKeyConfig.Name=='$1'].Id | [0]" \
    --output text 2>/dev/null || true
}

none_guard() { [[ -n "$1" && "$1" != "None" ]]; }

# ─── Secrets reconciliation ─────────────────────────────────────────────────────

reconcile_secrets() {
  local pair suffix tf_addr secret_name
  local secrets=(
    "stripe-secret-key:aws_secretsmanager_secret.stripe_secret_key"
    "jwt-secret:aws_secretsmanager_secret.jwt_secret"
    "admin-seed-password:aws_secretsmanager_secret.admin_seed_password"
    "grafana-otel-headers:aws_secretsmanager_secret.grafana_otel_headers"
    "cloudfront-signing-private-key:aws_secretsmanager_secret.cloudfront_signing_private_key"
  )

  for pair in "${secrets[@]}"; do
    suffix="${pair%%:*}"
    tf_addr="${pair#*:}"
    secret_name="${PROJECT_NAME}-${suffix}"

    if aws_secret_pending_deletion "${secret_name}"; then
      echo "Restoring secret ${secret_name} (scheduled deletion)..."
      aws secretsmanager restore-secret --secret-id "${secret_name}" --region "${AWS_REGION}" >/dev/null
    fi

    if ! tf_state_has "${tf_addr}" && aws_secret_exists "${secret_name}"; then
      echo "Importing ${secret_name} -> ${tf_addr}..."
      tf_import "${tf_addr}" "${secret_name}" >/dev/null
    fi
  done
}

# ─── CloudFront signing key reconciliation ──────────────────────────────────────

resolve_authoritative_cf_key_id() {
  local key_name="${PROJECT_NAME}-video-signing-key"
  local kg_name="${PROJECT_NAME}-video-signing-group"
  local id=""

  # 1) Live key-group lookup
  local kg_live
  kg_live="$(cf_key_group_id_by_name "${kg_name}")"
  if none_guard "${kg_live:-}"; then
    id="$(cf_key_group_item "${kg_live}")"
  fi

  # 2) Key-group item from Terraform state
  if ! none_guard "${id:-}"; then
    id="$(tf_state_list_item || true)"
  fi

  # 3) Key-group id from state -> AWS lookup
  if ! none_guard "${id:-}"; then
    local kg_state
    kg_state="$(tf_state_attr "aws_cloudfront_key_group.video_signing" "id" || true)"
    if none_guard "${kg_state:-}"; then
      id="$(cf_key_group_item "${kg_state}")"
    fi
  fi

  # 4) Direct name lookup
  if ! none_guard "${id:-}"; then
    id="$(cf_public_key_id_by_name "${key_name}")"
  fi

  none_guard "${id:-}" && echo "${id}" || true
}

reconcile_cloudfront_signing_key() {
  local key_name="${PROJECT_NAME}-video-signing-key"
  local kg_name="${PROJECT_NAME}-video-signing-group"
  local auth_id state_id

  auth_id="$(resolve_authoritative_cf_key_id)"
  echo "CloudFront key discovery: authoritative_key_id=${auth_id:-<none>}"

  # ── Public key binding ──
  if none_guard "${auth_id:-}" && cf_public_key_exists "${auth_id}"; then
    state_id="$(tf_state_attr "aws_cloudfront_public_key.video_signing" "id" || true)"

    if [[ -z "${state_id}" || "${state_id}" == "None" || "${state_id}" != "${auth_id}" ]]; then
      terraform state rm "aws_cloudfront_public_key.video_signing" >/dev/null 2>&1 || true
      echo "Importing CloudFront public key ${auth_id}..."
      tf_import "aws_cloudfront_public_key.video_signing" "${auth_id}"
    fi

    # Sync local PEM from live key to prevent encoded_key drift
    local live_pem
    live_pem="$(aws cloudfront get-public-key --id "${auth_id}" \
      --query 'PublicKey.PublicKeyConfig.EncodedKey' --output text)"
    if none_guard "${live_pem:-}"; then
      printf '%s\n' "${live_pem}" > "${CF_PUBLIC_KEY_FILE}"
      CF_PUBLIC_KEY_PEM="${live_pem}"
    fi
  fi

  # ── Stale state repair ──
  state_id="$(tf_state_attr "aws_cloudfront_public_key.video_signing" "id" || true)"
  if none_guard "${state_id:-}" && ! cf_public_key_exists "${state_id}"; then
    echo "Stale CloudFront key ${state_id} in state; removing..."
    terraform state rm "aws_cloudfront_public_key.video_signing" >/dev/null 2>&1 || true
    if none_guard "${auth_id:-}" && cf_public_key_exists "${auth_id}"; then
      echo "Re-importing CloudFront public key ${auth_id}..."
      tf_import "aws_cloudfront_public_key.video_signing" "${auth_id}"
    fi
  fi

  # ── Key group binding ──
  if ! tf_state_has "aws_cloudfront_key_group.video_signing"; then
    local kg_id
    kg_id="$(cf_key_group_id_by_name "${kg_name}")"
    if none_guard "${kg_id:-}"; then
      echo "Importing CloudFront key group ${kg_id}..."
      tf_import "aws_cloudfront_key_group.video_signing" "${kg_id}" >/dev/null
    fi
  fi

  # ── Hard gate ──
  if ! tf_state_has "aws_cloudfront_public_key.video_signing"; then
    echo "Error: aws_cloudfront_public_key.video_signing is not bound in Terraform state." >&2
    echo "Run: terraform import aws_cloudfront_public_key.video_signing <KEY_ID>" >&2
    exit 1
  fi
}
