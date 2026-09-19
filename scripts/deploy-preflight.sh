#!/usr/bin/env bash
#
# deploy-preflight.sh — read-only gate to run BEFORE ./pipeline.sh, especially
# from a Claude Code cloud session.
#
# Makes no changes to AWS and no changes to the repo. Every check is a read.
#
# Why this exists: terraform/providers.tf has no backend block, so state is the
# local file terraform/terraform.tfstate, which is committed to git. Whoever
# deploys must be holding the newest state. A cloud session that starts from a
# stale committed snapshot and runs `terraform apply -auto-approve` will try to
# reconcile the difference — which is how resources get destroyed and recreated.
#
# Usage:
#   ./scripts/deploy-preflight.sh              # fast checks only
#   ./scripts/deploy-preflight.sh --plan       # also run an infra-only terraform plan
#                                              # and fail on any destroy/replace
#
# Env overrides: AWS_REGION, ENVIRONMENT, TF_DIR, STATE_MAX_AGE_DAYS
#
# See workflows/tech/deploy-from-cloud.md.

set -uo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
AWS_REGION="${AWS_REGION:-us-east-1}"
ENVIRONMENT="${ENVIRONMENT:-dev}"
TF_DIR="${TF_DIR:-${SCRIPT_DIR}/terraform}"
TFVARS_FILE="${TF_DIR}/env/${ENVIRONMENT}.tfvars"
STATE_FILE="${TF_DIR}/terraform.tfstate"
STATE_MAX_AGE_DAYS="${STATE_MAX_AGE_DAYS:-7}"

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

if [[ ! -f "${STATE_FILE}" ]]; then
  fail "no ${STATE_FILE#"${SCRIPT_DIR}/"} — this repo keeps state in git; fetch the branch that has it"
else
  SERIAL="$(python3 -c "import json;print(json.load(open('${STATE_FILE}')).get('serial','?'))" 2>/dev/null)"
  RESOURCES="$(python3 -c "import json;print(len(json.load(open('${STATE_FILE}')).get('resources',[])))" 2>/dev/null)"
  pass "state serial ${SERIAL}, ${RESOURCES} resources, terraform ${STATE_TF_VERSION}"

  if git -C "${SCRIPT_DIR}" rev-parse --git-dir >/dev/null 2>&1; then
    if [[ -n "$(git -C "${SCRIPT_DIR}" status --porcelain "${STATE_FILE}")" ]]; then
      warn "state file has uncommitted changes — commit it before anyone else deploys"
    fi

    LAST_COMMIT_EPOCH="$(git -C "${SCRIPT_DIR}" log -1 --format=%ct -- "${STATE_FILE}" 2>/dev/null)"
    if [[ -n "${LAST_COMMIT_EPOCH}" ]]; then
      AGE_DAYS=$(( ( $(date +%s) - LAST_COMMIT_EPOCH ) / 86400 ))
      LAST_COMMIT_DATE="$(git -C "${SCRIPT_DIR}" log -1 --format=%cs -- "${STATE_FILE}" 2>/dev/null)"
      if (( AGE_DAYS > STATE_MAX_AGE_DAYS )); then
        warn "state last committed ${LAST_COMMIT_DATE} (${AGE_DAYS} days ago) — confirm no laptop deploy happened since, then run --plan"
      else
        pass "state last committed ${LAST_COMMIT_DATE} (${AGE_DAYS} days ago)"
      fi
    fi

    BRANCH="$(git -C "${SCRIPT_DIR}" rev-parse --abbrev-ref HEAD 2>/dev/null)"
    if git -C "${SCRIPT_DIR}" rev-parse --verify --quiet "origin/${BRANCH}" >/dev/null 2>&1; then
      BEHIND="$(git -C "${SCRIPT_DIR}" rev-list --count "HEAD..origin/${BRANCH}" 2>/dev/null)"
      if [[ "${BEHIND}" != "0" ]]; then
        fail "branch ${BRANCH} is ${BEHIND} commits behind origin — you may not have the newest state; git pull first"
      else
        pass "branch ${BRANCH} is level with origin"
      fi
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
    PROJECT_NAME="$(python3 - "${TFVARS_FILE}" <<'PY' 2>/dev/null
import re, sys
for line in open(sys.argv[1]):
    m = re.match(r'^\s*project_name\s*=\s*"([^"]+)"', line)
    if m:
        print(m.group(1)); break
PY
)"
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
        terraform init -input=false >/dev/null 2>&1
        terraform plan -input=false -no-color \
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
        DESTROYS="$(grep -cE '^\s+# .* will be destroyed|^\s+# .* must be replaced' "${PLAN_OUT}")"
        if [[ "${DESTROYS}" -gt 0 ]]; then
          fail "plan contains ${DESTROYS} destroy/replace actions — DO NOT DEPLOY, your state is out of sync with AWS:"
          grep -E '^\s+# .* will be destroyed|^\s+# .* must be replaced' "${PLAN_OUT}" | head -20
        else
          pass "${SUMMARY:-plan clean} — no destroys or replacements"
        fi
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
