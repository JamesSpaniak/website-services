#!/usr/bin/env bash
#
# deploy-preflight.sh — read-only gate to run BEFORE ./pipeline.sh, especially
# from a Claude Code cloud session.
#
# Makes no changes to AWS and no changes to the repo. Every check is a read.
#
# Why this exists: state lives in S3 and every deploy shares it, so the old
# "am I holding the newest state file" question is gone. What is left to check is
# that the backend is reachable, that the state in it matches this AWS account,
# and that no stale lock from a crashed run is blocking the next apply.
#
# Usage:
#   ./scripts/deploy-preflight.sh              # fast checks only
#   ./scripts/deploy-preflight.sh --plan       # also run an infra-only terraform plan
#                                              # and fail on any destroy/replace
#
# Env overrides: AWS_REGION, ENVIRONMENT, TF_DIR, TF_STATE_BUCKET, TF_STATE_KEY
#
# See workflows/tech/deploy-from-cloud.md.

set -uo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
AWS_REGION="${AWS_REGION:-us-east-1}"
ENVIRONMENT="${ENVIRONMENT:-dev}"
TF_DIR="${TF_DIR:-${SCRIPT_DIR}/terraform}"
TFVARS_FILE="${TF_DIR}/env/${ENVIRONMENT}.tfvars"

# project_name identifies the stack and therefore the state key. Resolved up
# front because every backend check below needs it.
PROJECT_NAME="$(python3 - "${TFVARS_FILE}" <<'PY' 2>/dev/null
import re, sys
for line in open(sys.argv[1]):
    m = re.match(r'^\s*project_name\s*=\s*"([^"]+)"', line)
    if m:
        print(m.group(1)); break
PY
)"
BACKEND_ECS_CLUSTER="${PROJECT_NAME}-cluster"

# shellcheck source=scripts/ensure-state-backend.sh
source "${SCRIPT_DIR}/scripts/ensure-state-backend.sh"

# Resolve the backend and pull the authoritative state up front — the toolchain
# and credential checks below both read it. A copy is downloaded to a temp file;
# nothing is written back.
STATE_FILE=""
STATE_SOURCE="none"
STATE_TMP=""
trap '[[ -n "${STATE_TMP}" ]] && rm -f "${STATE_TMP}"' EXIT

if [[ -n "${PROJECT_NAME}" ]] && state_backend_resolve >/dev/null 2>&1; then
  if state_object_exists; then
    STATE_TMP="$(mktemp)"
    if aws s3api get-object --bucket "${TF_STATE_BUCKET}" --key "${TF_STATE_KEY}" \
        --region "${AWS_REGION}" "${STATE_TMP}" >/dev/null 2>&1; then
      STATE_FILE="${STATE_TMP}"
      STATE_SOURCE="s3://${TF_STATE_BUCKET}/${TF_STATE_KEY}"
    fi
  elif [[ -f "${TF_DIR}/terraform.tfstate" ]]; then
    STATE_FILE="${TF_DIR}/terraform.tfstate"
    STATE_SOURCE="local file (not yet migrated to S3)"
  fi
fi

RUN_PLAN=false
[[ "${1:-}" == "--plan" ]] && RUN_PLAN=true

FAILURES=0
WARNINGS=0

pass() { printf '  \033[32mok\033[0m    %s\n' "$1"; }
warn() { printf '  \033[33mwarn\033[0m  %s\n' "$1"; WARNINGS=$((WARNINGS + 1)); }
fail() { printf '  \033[31mFAIL\033[0m  %s\n' "$1"; FAILURES=$((FAILURES + 1)); }

section() { printf '\n%s\n' "$1"; }

# ─── Toolchain ──────────────────────────────────────────────────────────────────

section "Toolchain"

if command -v aws >/dev/null 2>&1; then
  pass "aws cli — $(aws --version 2>&1)"
else
  fail "aws cli not installed (cloud session: add scripts/cloud-setup.sh to the environment setup script)"
fi

STATE_TF_VERSION=""
if [[ -f "${STATE_FILE}" ]]; then
  STATE_TF_VERSION="$(python3 -c "import json;print(json.load(open('${STATE_FILE}')).get('terraform_version',''))" 2>/dev/null)"
fi

if command -v terraform >/dev/null 2>&1; then
  TF_VERSION="$(terraform version -json 2>/dev/null | python3 -c "import json,sys;print(json.load(sys.stdin)['terraform_version'])" 2>/dev/null)"
  if [[ -n "${STATE_TF_VERSION}" && "${TF_VERSION}" != "${STATE_TF_VERSION}" ]]; then
    warn "terraform ${TF_VERSION} but state was written by ${STATE_TF_VERSION} — a newer binary upgrades the state format in place"
  else
    pass "terraform ${TF_VERSION}"
  fi
else
  fail "terraform not installed (cloud session: add scripts/cloud-setup.sh to the environment setup script)"
fi

if docker info >/dev/null 2>&1; then
  pass "docker daemon running"
elif command -v docker >/dev/null 2>&1; then
  fail "docker daemon not running — pipeline.sh cannot build images (cloud session: run scripts/cloud-session-start.sh)"
else
  fail "docker not installed"
fi

# ─── AWS identity ───────────────────────────────────────────────────────────────

section "AWS credentials"

CALLER_ACCOUNT=""
if command -v aws >/dev/null 2>&1; then
  CALLER_JSON="$(aws sts get-caller-identity --output json 2>&1)"
  if [[ $? -eq 0 ]]; then
    CALLER_ACCOUNT="$(echo "${CALLER_JSON}" | python3 -c "import json,sys;print(json.load(sys.stdin)['Account'])" 2>/dev/null)"
    CALLER_ARN="$(echo "${CALLER_JSON}" | python3 -c "import json,sys;print(json.load(sys.stdin)['Arn'])" 2>/dev/null)"
    pass "authenticated as ${CALLER_ARN}"
  else
    fail "aws sts get-caller-identity failed: ${CALLER_JSON}"
  fi
fi

# The account the current state was built against, read out of any ARN in state.
STATE_ACCOUNT=""
if [[ -f "${STATE_FILE}" ]]; then
  STATE_ACCOUNT="$(python3 - "${STATE_FILE}" <<'PY' 2>/dev/null
import json, re, sys
with open(sys.argv[1]) as fh:
    blob = fh.read()
m = re.search(r'arn:aws:[a-z0-9-]+:[a-z0-9-]*:(\d{12}):', blob)
print(m.group(1) if m else "")
PY
)"
fi

if [[ -n "${CALLER_ACCOUNT}" && -n "${STATE_ACCOUNT}" ]]; then
  if [[ "${CALLER_ACCOUNT}" == "${STATE_ACCOUNT}" ]]; then
    pass "credentials point at the same AWS account as terraform state"
  else
    fail "account mismatch — credentials are for ${CALLER_ACCOUNT}, state was built against ${STATE_ACCOUNT}"
  fi
fi

# ─── Terraform state freshness ──────────────────────────────────────────────────

section "Terraform state"

if [[ -z "${TF_STATE_BUCKET:-}" ]]; then
  fail "could not resolve the state backend — check AWS credentials and terraform/env/${ENVIRONMENT}.tfvars"
elif [[ ! -f "${STATE_FILE}" ]]; then
  if live_stack_exists; then
    fail "no state in s3://${TF_STATE_BUCKET}/${TF_STATE_KEY} and none on disk, but ${BACKEND_ECS_CLUSTER} is live — deploying would try to recreate it"
  else
    warn "no state yet at s3://${TF_STATE_BUCKET}/${TF_STATE_KEY} — first deploy of ${PROJECT_NAME} will create it"
  fi
else
  SERIAL="$(python3 -c "import json;print(json.load(open('${STATE_FILE}')).get('serial','?'))" 2>/dev/null)"
  RESOURCES="$(python3 -c "import json;print(len(json.load(open('${STATE_FILE}')).get('resources',[])))" 2>/dev/null)"
  pass "state serial ${SERIAL}, ${RESOURCES} resources, terraform ${STATE_TF_VERSION}"

  if [[ "${STATE_SOURCE}" == s3://* ]]; then
    pass "backend: ${STATE_SOURCE}"
  else
    warn "state is still the ${STATE_SOURCE} — the next ./pipeline.sh migrates it to S3 (rehearse first: ./scripts/verify-state-backend.sh)"
  fi

  LOCK_AT="$(state_lock_modified)"
  if [[ -n "${LOCK_AT}" && "${LOCK_AT}" != "None" ]]; then
    fail "state is LOCKED since ${LOCK_AT} — another deploy is running, or a crashed run left the lock behind:"
    printf '        aws s3api head-object --bucket %s --key %s.tflock\n' "${TF_STATE_BUCKET}" "${TF_STATE_KEY}"
    printf '        cd terraform && terraform force-unlock <LOCK_ID>   # only if nothing is actually running\n'
  else
    pass "state is unlocked"
  fi
fi

# Code freshness. State is shared now, so this is about deploying stale code,
# not about holding the wrong state.
if git -C "${SCRIPT_DIR}" rev-parse --git-dir >/dev/null 2>&1; then
  BRANCH="$(git -C "${SCRIPT_DIR}" rev-parse --abbrev-ref HEAD 2>/dev/null)"
  if git -C "${SCRIPT_DIR}" rev-parse --verify --quiet "origin/${BRANCH}" >/dev/null 2>&1; then
    BEHIND="$(git -C "${SCRIPT_DIR}" rev-list --count "HEAD..origin/${BRANCH}" 2>/dev/null)"
    if [[ "${BEHIND}" != "0" ]]; then
      fail "branch ${BRANCH} is ${BEHIND} commits behind origin — you would deploy stale code; git pull first"
    else
      pass "branch ${BRANCH} is level with origin"
    fi
  fi
fi

# ─── Required files ─────────────────────────────────────────────────────────────

section "Required files"

[[ -f "${TFVARS_FILE}" ]] \
  && pass "${TFVARS_FILE#"${SCRIPT_DIR}/"}" \
  || fail "missing ${TFVARS_FILE#"${SCRIPT_DIR}/"}"

[[ -f "${TF_DIR}/keys/cloudfront-public-key.pem" ]] \
  && pass "terraform/keys/cloudfront-public-key.pem" \
  || fail "missing terraform/keys/cloudfront-public-key.pem — pipeline.sh exits on this"

if [[ -f "${TF_DIR}/keys/cloudfront-private-key.pem" || -f "${SCRIPT_DIR}/backend/cloudfront-private-key.pem" ]]; then
  pass "cloudfront private key present — secret will be re-seeded"
else
  warn "no cloudfront private key on disk (not in git) — pipeline skips the secret seed step; fine unless the secret was recreated"
fi

# ─── Infra-only terraform plan ──────────────────────────────────────────────────

if [[ "${RUN_PLAN}" == "true" ]]; then
  section "Terraform plan (infra only, current live images)"

  if [[ ${FAILURES} -gt 0 ]]; then
    warn "skipping plan — fix the failures above first"
  else
    live_image() {
      aws ecs describe-task-definition --task-definition "$1" --region "${AWS_REGION}" \
        --query "taskDefinition.containerDefinitions[?name=='$2'].image | [0]" --output text 2>/dev/null
    }
    BACKEND_IMAGE="$(live_image "${PROJECT_NAME}-api-server-task" "api-server")"
    FRONTEND_IMAGE="$(live_image "${PROJECT_NAME}-drone-frontend-task" "drone-frontend")"

    if [[ -z "${BACKEND_IMAGE}" || "${BACKEND_IMAGE}" == "None" || -z "${FRONTEND_IMAGE}" || "${FRONTEND_IMAGE}" == "None" ]]; then
      fail "could not read the live ECS task images — cannot build an image-neutral plan"
    else
      PLAN_OUT="$(mktemp)"
      (
        cd "${TF_DIR}" || exit 1
        # Isolated TF_DATA_DIR so this read-only gate never rebinds the real
        # terraform/.terraform, and -lock=false so it never takes a state lock.
        export TF_DATA_DIR="$(mktemp -d)"
        trap 'rm -rf "${TF_DATA_DIR}"' EXIT
        terraform init -input=false -reconfigure "${TF_BACKEND_ARGS[@]}" >/dev/null 2>&1
        terraform plan -input=false -no-color -lock=false \
          -var-file="${TFVARS_FILE}" \
          -var "api_server_image_uri=${BACKEND_IMAGE}" \
          -var "frontend_image_uri=${FRONTEND_IMAGE}" \
          -var "cloudfront_signing_public_key_pem=$(cat "${TF_DIR}/keys/cloudfront-public-key.pem")"
      ) > "${PLAN_OUT}" 2>&1
      PLAN_RC=$?

      if [[ ${PLAN_RC} -ne 0 ]]; then
        fail "terraform plan failed — output:"
        tail -30 "${PLAN_OUT}"
      else
        SUMMARY="$(grep -E '^Plan: |^No changes\.' "${PLAN_OUT}" | tail -1)"
        DESTROYS="$(grep -E '^\s+# .* will be destroyed|^\s+# .* must be replaced' "${PLAN_OUT}" || true)"
        # Creates are a stop too: a create for something that already exists in
        # AWS means state lost it, and the apply dies partway on AlreadyExists,
        # leaving a half-applied change. New task-definition revisions are normal.
        CREATES="$(grep -E '^\s+# .* will be created' "${PLAN_OUT}" \
          | grep -v 'aws_ecs_task_definition' || true)"

        if [[ -n "${DESTROYS}" ]]; then
          fail "plan destroys or replaces resources — DO NOT DEPLOY, state is out of sync with AWS:"
          sed 's/^ */        /' <<<"${DESTROYS}" | head -20
        fi
        if [[ -n "${CREATES}" ]]; then
          fail "plan creates resources that state does not know about — verify none of these already exist in AWS:"
          sed 's/^ */        /' <<<"${CREATES}" | head -20
        fi
        [[ -z "${DESTROYS}${CREATES}" ]] && pass "${SUMMARY:-plan clean} — no destroys, replacements, or unexpected creates"
        echo "  full plan: ${PLAN_OUT}"
      fi
    fi
  fi
fi

# ─── Verdict ────────────────────────────────────────────────────────────────────

section "Verdict"
if [[ ${FAILURES} -gt 0 ]]; then
  printf '  \033[31m%d failure(s), %d warning(s) — do not deploy\033[0m\n\n' "${FAILURES}" "${WARNINGS}"
  exit 1
fi
printf '  \033[32mclear: 0 failures, %d warning(s)\033[0m\n' "${WARNINGS}"
[[ "${RUN_PLAN}" == "true" ]] \
  || printf '  run again with --plan before an actual deploy\n'
echo
exit 0
