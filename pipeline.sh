#!/usr/bin/env bash
set -euo pipefail

# ─── Config ─────────────────────────────────────────────────────────────────────

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
AWS_REGION="${AWS_REGION:-us-east-1}"
PROJECT_NAME="${PROJECT_NAME:-droneedge-dev}"
TF_DIR="${TF_DIR:-${SCRIPT_DIR}/terraform}"
ENVIRONMENT="${ENVIRONMENT:-dev}"
TFVARS_FILE="${TFVARS_FILE:-${TF_DIR}/env/${ENVIRONMENT}.tfvars}"
REQUIRE_TFVARS="${REQUIRE_TFVARS:-true}"
AUTO_RECONCILE_STATE="${AUTO_RECONCILE_STATE:-true}"
AUTO_SEED_CLOUDFRONT_PRIVATE_KEY_SECRET="${AUTO_SEED_CLOUDFRONT_PRIVATE_KEY_SECRET:-true}"

BACKEND_CONTAINER_NAME="${BACKEND_CONTAINER_NAME:-api-server}"
FRONTEND_CONTAINER_NAME="${FRONTEND_CONTAINER_NAME:-drone-frontend}"

set_project_defaults() {
  BACKEND_ECS_CLUSTER="${BACKEND_ECS_CLUSTER:-${PROJECT_NAME}-cluster}"
  FRONTEND_ECS_CLUSTER="${FRONTEND_ECS_CLUSTER:-${PROJECT_NAME}-frontend-cluster}"
  BACKEND_ECS_SERVICE="${BACKEND_ECS_SERVICE:-${PROJECT_NAME}-api-server-service}"
  FRONTEND_ECS_SERVICE="${FRONTEND_ECS_SERVICE:-${PROJECT_NAME}-drone-frontend-service}"
  BACKEND_TASK_FAMILY="${BACKEND_TASK_FAMILY:-${PROJECT_NAME}-api-server-task}"
  FRONTEND_TASK_FAMILY="${FRONTEND_TASK_FAMILY:-${PROJECT_NAME}-drone-frontend-task}"
  BACKEND_ECR_REPO="${BACKEND_ECR_REPO:-${PROJECT_NAME}-api-server}"
  FRONTEND_ECR_REPO="${FRONTEND_ECR_REPO:-${PROJECT_NAME}-drone-frontend}"
}
set_project_defaults

IMAGE_TAG="${IMAGE_TAG:-$(git rev-parse --short HEAD 2>/dev/null || date +%Y%m%d%H%M%S)}"

BUILD_BACKEND=true
BUILD_FRONTEND=true
DOCKER_NO_CACHE=false
DOCKER_PROGRESS="${DOCKER_PROGRESS:-auto}"
TERRAFORM_APPLY=true
WAIT_TIMEOUT_SECONDS="${WAIT_TIMEOUT_SECONDS:-900}"
WAIT_INTERVAL_SECONDS="${WAIT_INTERVAL_SECONDS:-10}"

# ─── Usage ──────────────────────────────────────────────────────────────────────

usage() {
  cat <<'EOF'
Usage: ./pipeline.sh [--backend-only|--frontend-only] [--env <dev|prod>] [--tfvars <path>] [--no-cache] [--plan-only]

Flags:
  --backend-only   Build/deploy backend only
  --frontend-only  Build/deploy frontend only
  --env            Environment name (default: dev)
  --tfvars         Path to a tfvars file (overrides --env)
  --no-cache       Force Docker to rebuild without cache
  --plan-only      Run terraform plan only (skip apply/deploy)
  -h, --help       Show help

Env overrides:
  AWS_REGION, PROJECT_NAME, TF_DIR, IMAGE_TAG, ENVIRONMENT, TFVARS_FILE, DOCKER_PROGRESS
  NEXT_PUBLIC_SITE_URL, NEXT_PUBLIC_FEATURED_COURSE_ID (default: 35 — home/login CTA course id)
  REQUIRE_TFVARS (default: true)       — fail if tfvars missing
  AUTO_RECONCILE_STATE (default: true)  — auto-restore/import drifted secrets + CloudFront keys
  AUTO_SEED_CLOUDFRONT_PRIVATE_KEY_SECRET (default: true)
  BACKEND_ECS_CLUSTER, FRONTEND_ECS_CLUSTER, BACKEND_ECS_SERVICE, FRONTEND_ECS_SERVICE
  BACKEND_TASK_FAMILY, FRONTEND_TASK_FAMILY, BACKEND_ECR_REPO, FRONTEND_ECR_REPO
EOF
}

# ─── Arg parsing ────────────────────────────────────────────────────────────────

while [[ $# -gt 0 ]]; do
  case "$1" in
    --backend-only)  BUILD_FRONTEND=false; shift ;;
    --frontend-only) BUILD_BACKEND=false;  shift ;;
    --no-cache)      DOCKER_NO_CACHE=true; shift ;;
    --plan-only)     TERRAFORM_APPLY=false; shift ;;
    --env)
      ENVIRONMENT="${2:?--env requires a value}"
      TFVARS_FILE="${TF_DIR}/env/${ENVIRONMENT}.tfvars"
      shift 2 ;;
    --tfvars)
      TFVARS_FILE="${2:?--tfvars requires a value}"
      shift 2 ;;
    -h|--help) usage; exit 0 ;;
    *) echo "Unknown argument: $1"; usage; exit 1 ;;
  esac
done

# ─── Resolve project name from tfvars ──────────────────────────────────────────

resolve_project_name_from_tfvars() {
  python3 - "$1" <<'PY'
import re, sys
with open(sys.argv[1]) as f:
    for line in f:
        m = re.match(r'^\s*project_name\s*=\s*"([^"]+)"', line)
        if m: print(m.group(1)); sys.exit(0)
sys.exit(1)
PY
}

if [[ ! -f "${TFVARS_FILE}" ]]; then
  if [[ "${REQUIRE_TFVARS}" == "true" ]]; then
    echo "Error: tfvars file not found: ${TFVARS_FILE}" >&2
    echo "Set REQUIRE_TFVARS=false to override." >&2
    exit 1
  fi
else
  RESOLVED_PROJECT_NAME="$(resolve_project_name_from_tfvars "${TFVARS_FILE}" || true)"
  if [[ -z "${RESOLVED_PROJECT_NAME}" && "${REQUIRE_TFVARS}" == "true" ]]; then
    echo "Error: project_name missing in ${TFVARS_FILE}" >&2
    exit 1
  elif [[ -n "${RESOLVED_PROJECT_NAME}" ]]; then
    PROJECT_NAME="${RESOLVED_PROJECT_NAME}"
    BACKEND_ECS_CLUSTER="" FRONTEND_ECS_CLUSTER=""
    BACKEND_ECS_SERVICE="" FRONTEND_ECS_SERVICE=""
    BACKEND_TASK_FAMILY="" FRONTEND_TASK_FAMILY=""
    BACKEND_ECR_REPO=""   FRONTEND_ECR_REPO=""
    set_project_defaults
  fi
fi

# ─── Docker build + push ───────────────────────────────────────────────────────

ACCOUNT_ID="$(aws sts get-caller-identity --query Account --output text)"
ECR_URI="${ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com"

ensure_ecr_repo() {
  aws ecr describe-repositories --repository-names "$1" --region "${AWS_REGION}" >/dev/null 2>&1 \
    || aws ecr create-repository --repository-name "$1" --region "${AWS_REGION}" >/dev/null
}

aws ecr get-login-password --region "${AWS_REGION}" | docker login --username AWS --password-stdin "${ECR_URI}"

build_and_push() {
  local name="$1" ecr_repo="$2" dockerfile="$3" context="$4"
  local build_args="${5:-}"
  local image_uri="${ECR_URI}/${ecr_repo}:${IMAGE_TAG}"
  echo "Building ${name} image ${image_uri}" >&2
  ensure_ecr_repo "${ecr_repo}"
  local cache_flag=""
  [[ "${DOCKER_NO_CACHE}" == "true" ]] && cache_flag="--no-cache"
  docker build --progress "${DOCKER_PROGRESS}" ${cache_flag} ${build_args} -f "${dockerfile}" -t "${image_uri}" "${context}" >&2
  docker push "${image_uri}" >&2
  echo "${image_uri}"
}

get_current_task_image() {
  local image
  image="$(aws ecs describe-task-definition \
    --task-definition "$1" --region "${AWS_REGION}" \
    --query "taskDefinition.containerDefinitions[?name=='$2'].image | [0]" \
    --output text)"
  [[ -n "${image}" && "${image}" != "None" ]] || { echo "Unable to resolve image for $1:$2" >&2; exit 1; }
  echo "${image}"
}

if [[ "${BUILD_BACKEND}" == "true" ]]; then
  BACKEND_IMAGE_URI="$(build_and_push "backend" "${BACKEND_ECR_REPO}" backend/Dockerfile backend)"
else
  BACKEND_IMAGE_URI="$(get_current_task_image "${BACKEND_TASK_FAMILY}" "${BACKEND_CONTAINER_NAME}")"
fi

if [[ "${BUILD_FRONTEND}" == "true" ]]; then
  FRONTEND_SITE_URL="${NEXT_PUBLIC_SITE_URL:-https://thedroneedge.com}"
  # Featured course id for home/login CTAs — must match the deployed DB (35 in prod).
  FRONTEND_FEATURED_COURSE_ID="${NEXT_PUBLIC_FEATURED_COURSE_ID:-35}"
  FRONTEND_IMAGE_URI="$(build_and_push "frontend" "${FRONTEND_ECR_REPO}" drone/Dockerfile drone "--build-arg NEXT_PUBLIC_DEBUG_LOGGING=1 --build-arg NEXT_PUBLIC_SITE_URL=${FRONTEND_SITE_URL} --build-arg NEXT_PUBLIC_FEATURED_COURSE_ID=${FRONTEND_FEATURED_COURSE_ID}")"
else
  FRONTEND_IMAGE_URI="$(get_current_task_image "${FRONTEND_TASK_FAMILY}" "${FRONTEND_CONTAINER_NAME}")"
fi

# ─── Service state helpers (deploy verification) ───────────────────────────────

get_service_task_def() {
  aws ecs describe-services --cluster "$1" --services "$2" --region "${AWS_REGION}" \
    --query 'services[0].taskDefinition' --output text 2>/dev/null || echo "unknown"
}

get_task_def_image() {
  aws ecs describe-task-definition --task-definition "$1" --region "${AWS_REGION}" \
    --query "taskDefinition.containerDefinitions[?name=='$2'].image | [0]" \
    --output text 2>/dev/null || echo "unknown"
}

log_service_state() {
  local label="$1" cluster="$2" service="$3" container="$4"
  local td image
  td="$(get_service_task_def "${cluster}" "${service}")"
  image="$(get_task_def_image "${td}" "${container}")"
  echo "[${label}] ${service}: ${td##*/} -> ${image}"
}

# Snapshot what each service is running BEFORE terraform apply so we can
# detect terraform reverting a service to a stale task definition revision
# (this silently rolled the backend to an old image in the past).
BACKEND_TD_BEFORE="$(get_service_task_def "${BACKEND_ECS_CLUSTER}" "${BACKEND_ECS_SERVICE}")"
FRONTEND_TD_BEFORE="$(get_service_task_def "${FRONTEND_ECS_CLUSTER}" "${FRONTEND_ECS_SERVICE}")"
log_service_state "pre-terraform" "${BACKEND_ECS_CLUSTER}" "${BACKEND_ECS_SERVICE}" "${BACKEND_CONTAINER_NAME}"
log_service_state "pre-terraform" "${FRONTEND_ECS_CLUSTER}" "${FRONTEND_ECS_SERVICE}" "${FRONTEND_CONTAINER_NAME}"

# ─── Terraform apply ────────────────────────────────────────────────────────────

(
  cd "${TF_DIR}"
  terraform init -input=false

  TFVARS_ARGS=()
  VAR_ARGS=()
  if [[ -f "${TFVARS_FILE}" ]]; then
    TFVARS_ARGS+=("-var-file=${TFVARS_FILE}")
  else
    VAR_ARGS+=("-var" "aws_region=${AWS_REGION}" "-var" "project_name=${PROJECT_NAME}")
  fi

  CF_PUBLIC_KEY_FILE="${TF_DIR}/keys/cloudfront-public-key.pem"
  [[ -f "${CF_PUBLIC_KEY_FILE}" ]] || { echo "Error: missing ${CF_PUBLIC_KEY_FILE}" >&2; exit 1; }
  CF_PUBLIC_KEY_PEM="$(cat "${CF_PUBLIC_KEY_FILE}")"

  # State reconciliation (secrets + CloudFront signing keys)
  if [[ "${AUTO_RECONCILE_STATE}" == "true" ]]; then
    # shellcheck source=scripts/reconcile-state.sh
    source "${SCRIPT_DIR}/scripts/reconcile-state.sh"
    reconcile_secrets
    reconcile_cloudfront_signing_key
    CF_PUBLIC_KEY_PEM="$(cat "${CF_PUBLIC_KEY_FILE}")"
  fi

  COMMON_VARS=(
    ${TFVARS_ARGS[@]+"${TFVARS_ARGS[@]}"}
    ${VAR_ARGS[@]+"${VAR_ARGS[@]}"}
    -var "api_server_image_uri=${BACKEND_IMAGE_URI}"
    -var "frontend_image_uri=${FRONTEND_IMAGE_URI}"
    -var "cloudfront_signing_public_key_pem=${CF_PUBLIC_KEY_PEM}"
  )

  if [[ "${TERRAFORM_APPLY}" == "true" ]]; then
    terraform apply -input=false -auto-approve "${COMMON_VARS[@]}"
  else
    terraform plan -input=false "${COMMON_VARS[@]}"
  fi
)

# Detect terraform moving a service to a different task definition. With the
# lifecycle ignore_changes=[task_definition] rules in place this should never
# fire; if it does, the deploy below may be fighting terraform — investigate.
if [[ "${TERRAFORM_APPLY}" == "true" ]]; then
  BACKEND_TD_AFTER="$(get_service_task_def "${BACKEND_ECS_CLUSTER}" "${BACKEND_ECS_SERVICE}")"
  FRONTEND_TD_AFTER="$(get_service_task_def "${FRONTEND_ECS_CLUSTER}" "${FRONTEND_ECS_SERVICE}")"
  if [[ "${BACKEND_TD_AFTER}" != "${BACKEND_TD_BEFORE}" ]]; then
    echo "############################################################################" >&2
    echo "## WARNING: terraform apply changed ${BACKEND_ECS_SERVICE} task definition" >&2
    echo "##   before: ${BACKEND_TD_BEFORE##*/}" >&2
    echo "##   after:  ${BACKEND_TD_AFTER##*/}" >&2
    echo "## Terraform is reverting deploys — check lifecycle ignore_changes rules." >&2
    echo "############################################################################" >&2
  fi
  if [[ "${FRONTEND_TD_AFTER}" != "${FRONTEND_TD_BEFORE}" ]]; then
    echo "############################################################################" >&2
    echo "## WARNING: terraform apply changed ${FRONTEND_ECS_SERVICE} task definition" >&2
    echo "##   before: ${FRONTEND_TD_BEFORE##*/}" >&2
    echo "##   after:  ${FRONTEND_TD_AFTER##*/}" >&2
    echo "## Terraform is reverting deploys — check lifecycle ignore_changes rules." >&2
    echo "############################################################################" >&2
  fi
fi

# ─── Seed CloudFront private key secret ─────────────────────────────────────────

seed_cloudfront_private_key_secret() {
  local private_key_file="${TF_DIR}/keys/cloudfront-private-key.pem"
  local fallback="${SCRIPT_DIR}/backend/cloudfront-private-key.pem"
  local secret_name="${PROJECT_NAME}-cloudfront-signing-private-key"

  [[ -f "${private_key_file}" ]] || private_key_file="${fallback}"
  [[ -f "${private_key_file}" ]] || { echo "Warning: no CloudFront private key file found, skipping seed." >&2; return 0; }
  aws secretsmanager describe-secret --secret-id "${secret_name}" --region "${AWS_REGION}" >/dev/null 2>&1 \
    || { echo "Warning: secret ${secret_name} not found, skipping seed." >&2; return 0; }

  echo "Seeding ${secret_name}..."
  aws secretsmanager put-secret-value \
    --secret-id "${secret_name}" \
    --secret-string "file://${private_key_file}" \
    --region "${AWS_REGION}" >/dev/null
}

if [[ "${TERRAFORM_APPLY}" == "true" && "${AUTO_SEED_CLOUDFRONT_PRIVATE_KEY_SECRET}" == "true" ]]; then
  seed_cloudfront_private_key_secret
fi

# ─── ECS deploy + wait ──────────────────────────────────────────────────────────

ecs_force_deploy() {
  local cluster="$1" service="$2" image="$3" container_name="$4"
  local current_td_arn td_json register_input new_td_arn

  current_td_arn="$(aws ecs describe-services --cluster "${cluster}" --services "${service}" \
    --region "${AWS_REGION}" --query 'services[0].taskDefinition' --output text)"

  td_json="$(aws ecs describe-task-definition --task-definition "${current_td_arn}" \
    --region "${AWS_REGION}" --query 'taskDefinition' --output json)"

  register_input="$(mktemp)"

  CONTAINER_NAME="${container_name}" IMAGE_URI="${image}" python3 -c '
import json, os, sys
td = json.load(sys.stdin)
container_name = os.environ["CONTAINER_NAME"]
image_uri = os.environ["IMAGE_URI"]
updated = False
for container in td["containerDefinitions"]:
    if container["name"] == container_name:
        container["image"] = image_uri
        updated = True
        break
if not updated:
    sys.exit(f"container {container_name!r} not found in task definition")
for key in (
    "taskDefinitionArn", "revision", "status", "requiresAttributes",
    "compatibilities", "registeredAt", "registeredBy",
):
    td.pop(key, None)
with open(sys.argv[1], "w", encoding="utf-8") as fh:
    json.dump(td, fh)
' "${register_input}" <<<"${td_json}"

  new_td_arn="$(aws ecs register-task-definition --cli-input-json "file://${register_input}" \
    --region "${AWS_REGION}" --query 'taskDefinition.taskDefinitionArn' --output text)"
  rm -f "${register_input}"

  aws ecs update-service --cluster "${cluster}" --service "${service}" \
    --task-definition "${new_td_arn}" --force-new-deployment \
    --region "${AWS_REGION}" >/dev/null

  echo "Deploy triggered: ${service} with ${image} (${new_td_arn})"
}

wait_for_service_stable() {
  local cluster="$1" service="$2"
  local start_ts
  start_ts="$(date +%s)"
  echo "Waiting for ${service} to stabilize..."

  while true; do
    local now_ts elapsed
    now_ts="$(date +%s)"; elapsed=$((now_ts - start_ts))
    (( elapsed > WAIT_TIMEOUT_SECONDS )) && { echo "Timed out after ${WAIT_TIMEOUT_SECONDS}s" >&2; exit 1; }

    local svc_json
    svc_json="$(aws ecs describe-services --cluster "${cluster}" --services "${service}" \
      --region "${AWS_REGION}" --output json)"

    local desired running pending dep_count
    desired="$(echo "${svc_json}"  | python3 -c "import sys,json; print(json.load(sys.stdin)['services'][0]['desiredCount'])")"
    running="$(echo "${svc_json}"  | python3 -c "import sys,json; print(json.load(sys.stdin)['services'][0]['runningCount'])")"
    pending="$(echo "${svc_json}"  | python3 -c "import sys,json; print(json.load(sys.stdin)['services'][0]['pendingCount'])")"
    dep_count="$(echo "${svc_json}" | python3 -c "import sys,json; print(len(json.load(sys.stdin)['services'][0]['deployments']))")"

    if [[ "${running}" == "${desired}" && "${pending}" == "0" && "${dep_count}" == "1" ]]; then
      echo "${service} is stable (${running}/${desired})"
      return 0
    fi

    echo "  deploying… running=${running}/${desired} pending=${pending} deployments=${dep_count}"
    sleep "${WAIT_INTERVAL_SECONDS}"
  done
}

# Hard check: after the service stabilizes, confirm it is actually running the
# image we deployed. Catches ECS rolling back a failed deployment, terraform
# reverting the service, or anything else overwriting the rollout — previously
# these failed silently and prod kept running an old image.
verify_deployed_image() {
  local cluster="$1" service="$2" expected_image="$3" container="$4"
  local td image
  td="$(get_service_task_def "${cluster}" "${service}")"
  image="$(get_task_def_image "${td}" "${container}")"
  if [[ "${image}" != "${expected_image}" ]]; then
    echo "" >&2
    echo "############################################################################" >&2
    echo "## DEPLOY VERIFICATION FAILED: ${service}" >&2
    echo "##   running:  ${image} (${td##*/})" >&2
    echo "##   expected: ${expected_image}" >&2
    echo "## The service was rolled back or overwritten after the deploy was" >&2
    echo "## triggered. Check ECS service events and stopped-task reasons:" >&2
    echo "##   aws ecs describe-services --cluster ${cluster} --services ${service} \\" >&2
    echo "##     --region ${AWS_REGION} --query 'services[0].events[0:10]'" >&2
    echo "############################################################################" >&2
    exit 1
  fi
  echo "Verified ${service} is running ${image} (${td##*/})"
}

# Softer check for the side that was NOT rebuilt this run: warn if the live
# service image differs from the latest registered task definition image.
warn_if_service_stale() {
  local cluster="$1" service="$2" latest_image="$3" container="$4"
  local td image
  td="$(get_service_task_def "${cluster}" "${service}")"
  image="$(get_task_def_image "${td}" "${container}")"
  if [[ "${image}" != "${latest_image}" ]]; then
    echo "############################################################################" >&2
    echo "## WARNING: ${service} was not deployed this run and is running a STALE image:" >&2
    echo "##   running:           ${image} (${td##*/})" >&2
    echo "##   latest registered: ${latest_image}" >&2
    echo "## Run ./pipeline.sh for that side to bring it up to date." >&2
    echo "############################################################################" >&2
  fi
}

if [[ "${TERRAFORM_APPLY}" == "true" ]]; then
  [[ "${BUILD_BACKEND}" == "true" ]]  && ecs_force_deploy "${BACKEND_ECS_CLUSTER}"  "${BACKEND_ECS_SERVICE}"  "${BACKEND_IMAGE_URI}"  "${BACKEND_CONTAINER_NAME}"
  [[ "${BUILD_FRONTEND}" == "true" ]] && ecs_force_deploy "${FRONTEND_ECS_CLUSTER}" "${FRONTEND_ECS_SERVICE}" "${FRONTEND_IMAGE_URI}" "${FRONTEND_CONTAINER_NAME}"
  [[ "${BUILD_BACKEND}" == "true" ]]  && wait_for_service_stable "${BACKEND_ECS_CLUSTER}"  "${BACKEND_ECS_SERVICE}"
  [[ "${BUILD_FRONTEND}" == "true" ]] && wait_for_service_stable "${FRONTEND_ECS_CLUSTER}" "${FRONTEND_ECS_SERVICE}"

  if [[ "${BUILD_BACKEND}" == "true" ]]; then
    verify_deployed_image "${BACKEND_ECS_CLUSTER}" "${BACKEND_ECS_SERVICE}" "${BACKEND_IMAGE_URI}" "${BACKEND_CONTAINER_NAME}"
  else
    warn_if_service_stale "${BACKEND_ECS_CLUSTER}" "${BACKEND_ECS_SERVICE}" "${BACKEND_IMAGE_URI}" "${BACKEND_CONTAINER_NAME}"
  fi
  if [[ "${BUILD_FRONTEND}" == "true" ]]; then
    verify_deployed_image "${FRONTEND_ECS_CLUSTER}" "${FRONTEND_ECS_SERVICE}" "${FRONTEND_IMAGE_URI}" "${FRONTEND_CONTAINER_NAME}"
  else
    warn_if_service_stale "${FRONTEND_ECS_CLUSTER}" "${FRONTEND_ECS_SERVICE}" "${FRONTEND_IMAGE_URI}" "${FRONTEND_CONTAINER_NAME}"
  fi

  # Invalidate frontend CloudFront cache after a frontend deploy so clients get fresh HTML/chunks
  if [[ "${BUILD_FRONTEND}" == "true" ]]; then
    FRONTEND_CF_ID="$(cd "${TF_DIR}" && terraform output -raw frontend_cloudfront_id 2>/dev/null)" || true
    if [[ -n "${FRONTEND_CF_ID}" ]]; then
      echo "Invalidating frontend CloudFront cache (distribution ${FRONTEND_CF_ID})..."
      aws cloudfront create-invalidation --distribution-id "${FRONTEND_CF_ID}" --paths "/*" >/dev/null || true
    fi
  fi
fi
