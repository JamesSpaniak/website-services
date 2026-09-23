#!/usr/bin/env bash
#
# verify-state-backend.sh — rehearse the S3 backend migration without touching
# the real state.
#
# Run this BEFORE the first ./pipeline.sh that migrates state, and any time the
# backend config changes. It:
#
#   1. bootstraps the state bucket if missing (idempotent; an empty bucket
#      touches no existing infrastructure)
#   2. copies the current state to a throwaway rehearsal key
#   3. binds Terraform to that rehearsal key and runs an infra-only plan —
#      "no changes" proves the state round-trips through S3 intact
#   4. proves locking is enforced by planting a lock and asserting the next
#      plan refuses to run
#   5. deletes the rehearsal key
#
# Isolation is two things, and both are needed:
#   - TF_DATA_DIR points at a temp directory, so terraform/.terraform is never
#     rebound and the real state key is never written.
#   - terraform/terraform.tfstate is saved and restored around the run. Binding
#     a remote backend makes Terraform treat a legacy local state file as
#     superseded: it rotates the content into terraform.tfstate.backup and
#     truncates the original. Harmless during the real migration (the content is
#     already in S3 by then), destructive during a rehearsal that is supposed to
#     change nothing.
#
# Usage:  ./scripts/verify-state-backend.sh [--env dev|prod]
#
# See workflows/tech/deploy-from-cloud.md § Migrating state to S3.

set -uo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
AWS_REGION="${AWS_REGION:-us-east-1}"
ENVIRONMENT="${ENVIRONMENT:-dev}"
TF_DIR="${TF_DIR:-${SCRIPT_DIR}/terraform}"

[[ "${1:-}" == "--env" ]] && ENVIRONMENT="${2:?--env requires a value}"
TFVARS_FILE="${TF_DIR}/env/${ENVIRONMENT}.tfvars"

FAILURES=0
pass() { printf '  \033[32mok\033[0m    %s\n' "$1"; }
warn() { printf '  \033[33mwarn\033[0m  %s\n' "$1"; }
fail() { printf '  \033[31mFAIL\033[0m  %s\n' "$1"; FAILURES=$((FAILURES + 1)); }
section() { printf '\n%s\n' "$1"; }

[[ -f "${TFVARS_FILE}" ]] || { echo "No ${TFVARS_FILE}" >&2; exit 1; }
PROJECT_NAME="$(python3 - "${TFVARS_FILE}" <<'PY'
import re, sys
for line in open(sys.argv[1]):
    m = re.match(r'^\s*project_name\s*=\s*"([^"]+)"', line)
    if m:
        print(m.group(1)); break
PY
)"
[[ -n "${PROJECT_NAME}" ]] || { echo "No project_name in ${TFVARS_FILE}" >&2; exit 1; }

BACKEND_ECS_CLUSTER="${PROJECT_NAME}-cluster"

# shellcheck source=scripts/ensure-state-backend.sh
source "${SCRIPT_DIR}/scripts/ensure-state-backend.sh"

echo "Rehearsing backend for ${PROJECT_NAME} (${ENVIRONMENT})"

# ─── Isolation ──────────────────────────────────────────────────────────────────

TMP_DATA_DIR="$(mktemp -d)"
STATE_COPY="$(mktemp)"
export TF_DATA_DIR="${TMP_DATA_DIR}"
REHEARSAL_KEY=""

# Preserve a pre-migration local state file; terraform init will truncate it.
LEGACY_STATE="${TF_DIR}/terraform.tfstate"
LEGACY_SAVE=""
if [[ -s "${LEGACY_STATE}" ]]; then
  LEGACY_SAVE="$(mktemp)"
  cp "${LEGACY_STATE}" "${LEGACY_SAVE}"
fi

cleanup() {
  # Restore first — it matters most if something below fails.
  if [[ -n "${LEGACY_SAVE}" && -s "${LEGACY_SAVE}" ]]; then
    if ! cmp -s "${LEGACY_SAVE}" "${LEGACY_STATE}"; then
      cp "${LEGACY_SAVE}" "${LEGACY_STATE}"
      echo "  restored ${LEGACY_STATE#"${SCRIPT_DIR}/"} (terraform init had truncated it)"
    fi
    rm -f "${LEGACY_SAVE}"
  fi
  if [[ -n "${REHEARSAL_KEY}" ]]; then
    # Remove every version so the rehearsal leaves nothing behind.
    python3 - "${TF_STATE_BUCKET}" "${REHEARSAL_KEY}" "${AWS_REGION}" <<'PY' 2>/dev/null || true
import json, subprocess, sys
bucket, prefix, region = sys.argv[1], sys.argv[2], sys.argv[3]
out = subprocess.run(
    ["aws", "s3api", "list-object-versions", "--bucket", bucket,
     "--prefix", prefix, "--region", region, "--output", "json"],
    capture_output=True, text=True)
if out.returncode:
    sys.exit(0)
data = json.loads(out.stdout or "{}")
for group in ("Versions", "DeleteMarkers"):
    for item in data.get(group, []):
        subprocess.run(
            ["aws", "s3api", "delete-object", "--bucket", bucket,
             "--key", item["Key"], "--version-id", item["VersionId"],
             "--region", region],
            capture_output=True)
PY
  fi
  rm -rf "${TMP_DATA_DIR}" "${STATE_COPY}"
}
trap cleanup EXIT

# ─── 1. Bucket ──────────────────────────────────────────────────────────────────

section "State bucket"

if ensure_state_bucket >/dev/null 2>&1; then
  pass "s3://${TF_STATE_BUCKET} reachable"
else
  state_backend_resolve >/dev/null 2>&1
  fail "could not create or read s3://${TF_STATE_BUCKET:-?}"
  echo; exit 1
fi

VERSIONING="$(aws s3api get-bucket-versioning --bucket "${TF_STATE_BUCKET}" \
  --region "${AWS_REGION}" --query 'Status' --output text 2>/dev/null)"
[[ "${VERSIONING}" == "Enabled" ]] \
  && pass "versioning enabled (state rollback available)" \
  || fail "versioning is '${VERSIONING}' — a bad write would be unrecoverable"

REHEARSAL_KEY="_rehearsal/${PROJECT_NAME}/terraform.tfstate"

# ─── 2. Source state ────────────────────────────────────────────────────────────

section "Source state"

REMOTE_COUNT="$(remote_state_resource_count)"
LOCAL_COUNT="$(local_state_resource_count)"

if [[ "${REMOTE_COUNT}" -gt 0 ]]; then
  aws s3api get-object --bucket "${TF_STATE_BUCKET}" --key "${TF_STATE_KEY}" \
    --region "${AWS_REGION}" "${STATE_COPY}" >/dev/null 2>&1
  pass "using remote state, ${REMOTE_COUNT} resources (already migrated)"
elif [[ "${LOCAL_COUNT}" -gt 0 ]]; then
  cp "${TF_DIR}/terraform.tfstate" "${STATE_COPY}"
  pass "using local state, ${LOCAL_COUNT} resources (not yet migrated)"
else
  fail "no state found locally or in S3 — nothing to rehearse"
  echo; exit 1
fi

aws s3api put-object --bucket "${TF_STATE_BUCKET}" --key "${REHEARSAL_KEY}" \
  --body "${STATE_COPY}" --region "${AWS_REGION}" >/dev/null 2>&1 \
  && pass "copied to s3://${TF_STATE_BUCKET}/${REHEARSAL_KEY}" \
  || { fail "could not write the rehearsal key"; echo; exit 1; }

# ─── 3. Bind and plan ───────────────────────────────────────────────────────────

section "Terraform against the rehearsal key"

if terraform -chdir="${TF_DIR}" init -input=false -reconfigure \
    -backend-config="bucket=${TF_STATE_BUCKET}" \
    -backend-config="key=${REHEARSAL_KEY}" \
    -backend-config="region=${AWS_REGION}" >/dev/null 2>&1; then
  pass "init bound to the S3 backend"
else
  fail "terraform init against S3 failed"
  echo; exit 1
fi

live_image() {
  aws ecs describe-task-definition --task-definition "$1" --region "${AWS_REGION}" \
    --query "taskDefinition.containerDefinitions[?name=='$2'].image | [0]" --output text 2>/dev/null
}
BACKEND_IMAGE="$(live_image "${PROJECT_NAME}-api-server-task" "api-server")"
FRONTEND_IMAGE="$(live_image "${PROJECT_NAME}-drone-frontend-task" "drone-frontend")"

if [[ -z "${BACKEND_IMAGE}" || "${BACKEND_IMAGE}" == "None" ]]; then
  warn "no live ECS task definitions — skipping the plan check (nothing deployed yet)"
else
  PLAN_OUT="$(mktemp)"
  terraform -chdir="${TF_DIR}" plan -input=false -no-color -lock-timeout=60s \
    -var-file="${TFVARS_FILE}" \
    -var "api_server_image_uri=${BACKEND_IMAGE}" \
    -var "frontend_image_uri=${FRONTEND_IMAGE}" \
    -var "cloudfront_signing_public_key_pem=$(cat "${TF_DIR}/keys/cloudfront-public-key.pem")" \
    > "${PLAN_OUT}" 2>&1
  PLAN_RC=$?

  if [[ ${PLAN_RC} -ne 0 ]]; then
    fail "plan against S3-backed state failed:"
    tail -20 "${PLAN_OUT}"
  else
    SUMMARY="$(grep -E '^Plan: |^No changes\.' "${PLAN_OUT}" | tail -1)"

    # Any planned action means the state disagrees with AWS. **Creates matter as
    # much as destroys**: when state is missing a resource that already exists,
    # Terraform plans to create a duplicate and the apply dies on
    # AlreadyExists / AlreadyAssociated. Task definitions are excluded because a
    # new revision is registered on every apply by design.
    DRIFT="$(grep -E '^\s+# .* (will be|must be) ' "${PLAN_OUT}" \
      | grep -v 'aws_ecs_task_definition' || true)"

    if [[ -n "${DRIFT}" ]]; then
      fail "the state does NOT match AWS — $(wc -l <<<"${DRIFT}" | tr -d ' ') resource(s) drifted:"
      sed 's/^ */        /' <<<"${DRIFT}" | head -15
      printf '        migrating will carry this drift forward; import the missing\n'
      printf '        resources before deploying (see terraform-state.md)\n'
    else
      pass "${SUMMARY:-plan clean} — state matches AWS, no drift"
    fi
  fi
  rm -f "${PLAN_OUT}"
fi

# ─── 4. Locking ─────────────────────────────────────────────────────────────────

section "State locking"

LOCK_KEY="${REHEARSAL_KEY}.tflock"
LOCK_BODY="$(mktemp)"
cat > "${LOCK_BODY}" <<'JSON'
{"ID":"verify-state-backend","Operation":"rehearsal","Who":"verify-state-backend.sh","Version":"1.13.3"}
JSON

if aws s3api put-object --bucket "${TF_STATE_BUCKET}" --key "${LOCK_KEY}" \
    --body "${LOCK_BODY}" --region "${AWS_REGION}" >/dev/null 2>&1; then
  LOCK_TEST="$(terraform -chdir="${TF_DIR}" plan -input=false -no-color -lock-timeout=0s \
    -var-file="${TFVARS_FILE}" \
    -var "api_server_image_uri=x" -var "frontend_image_uri=x" \
    -var "cloudfront_signing_public_key_pem=x" 2>&1)"
  # Match the specific lock error, not any mention of "lock" — a plan that fails
  # for an unrelated reason still prints ".terraform.lock.hcl" and would
  # otherwise read as a pass.
  if grep -qE 'Error acquiring the state lock|ConditionalRequestConflict|state lock' <<<"${LOCK_TEST}"; then
    pass "a held lock blocks a concurrent run — no two-writer split possible"
  else
    fail "terraform did NOT report a lock conflict — concurrent applies may not be prevented"
    printf '        last lines: %s\n' "$(tail -3 <<<"${LOCK_TEST}" | tr '\n' ' ')"
  fi
  aws s3api delete-object --bucket "${TF_STATE_BUCKET}" --key "${LOCK_KEY}" \
    --region "${AWS_REGION}" >/dev/null 2>&1
else
  warn "could not plant a test lock — skipping the locking check"
fi
rm -f "${LOCK_BODY}"

# ─── Verdict ────────────────────────────────────────────────────────────────────

section "Verdict"
if [[ ${FAILURES} -gt 0 ]]; then
  printf '  \033[31m%d failure(s) — do not migrate yet\033[0m\n\n' "${FAILURES}"
  exit 1
fi
printf '  \033[32mclear — ./pipeline.sh will migrate state safely\033[0m\n'
printf '  the real state key (%s) was never written\n\n' "${TF_STATE_KEY}"
exit 0
