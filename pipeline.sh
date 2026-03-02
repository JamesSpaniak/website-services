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
  local image_uri="${ECR_URI}/${ecr_repo}:${IMAGE_TAG}"
  echo "Building ${name} image ${image_uri}"
  ensure_ecr_repo "${ecr_repo}"
  local cache_flag=""
  [[ "${DOCKER_NO_CACHE}" == "true" ]] && cache_flag="--no-cache"
  docker build --progress "${DOCKER_PROGRESS}" ${cache_flag} -f "${dockerfile}" -t "${image_uri}" "${context}"
  docker push "${image_uri}"
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
  FRONTEND_IMAGE_URI="$(build_and_push "frontend" "${FRONTEND_ECR_REPO}" drone/Dockerfile drone)"
else
  FRONTEND_IMAGE_URI="$(get_current_task_image "${FRONTEND_TASK_FAMILY}" "${FRONTEND_CONTAINER_NAME}")"
fi

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
  local cluster="$1" service="$2" image="$3"
  aws ecs update-service --cluster "${cluster}" --service "${service}" \
    --force-new-deployment --region "${AWS_REGION}" >/dev/null
  echo "Deploy triggered: ${service} with ${image}"
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

if [[ "${TERRAFORM_APPLY}" == "true" ]]; then
  [[ "${BUILD_BACKEND}" == "true" ]]  && ecs_force_deploy "${BACKEND_ECS_CLUSTER}"  "${BACKEND_ECS_SERVICE}"  "${BACKEND_IMAGE_URI}"
  [[ "${BUILD_FRONTEND}" == "true" ]] && ecs_force_deploy "${FRONTEND_ECS_CLUSTER}" "${FRONTEND_ECS_SERVICE}" "${FRONTEND_IMAGE_URI}"
  [[ "${BUILD_BACKEND}" == "true" ]]  && wait_for_service_stable "${BACKEND_ECS_CLUSTER}"  "${BACKEND_ECS_SERVICE}"
  [[ "${BUILD_FRONTEND}" == "true" ]] && wait_for_service_stable "${FRONTEND_ECS_CLUSTER}" "${FRONTEND_ECS_SERVICE}"
fi
