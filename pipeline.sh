#!/usr/bin/env bash
set -euo pipefail

# Config (override via env vars)
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
AWS_REGION="${AWS_REGION:-us-east-1}"
PROJECT_NAME="${PROJECT_NAME:-droneedge-dev}"
TF_DIR="${TF_DIR:-${SCRIPT_DIR}/terraform}"
ENVIRONMENT="${ENVIRONMENT:-dev}"
TFVARS_FILE="${TFVARS_FILE:-${TF_DIR}/env/${ENVIRONMENT}.tfvars}"

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
  BACKEND_ECS_CLUSTER, FRONTEND_ECS_CLUSTER, BACKEND_ECS_SERVICE, FRONTEND_ECS_SERVICE
  BACKEND_TASK_FAMILY, FRONTEND_TASK_FAMILY
  BACKEND_CONTAINER_NAME, FRONTEND_CONTAINER_NAME
  BACKEND_ECR_REPO, FRONTEND_ECR_REPO
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --backend-only)
      BUILD_FRONTEND=false
      shift
      ;;
    --frontend-only)
      BUILD_BACKEND=false
      shift
      ;;
    --no-cache)
      DOCKER_NO_CACHE=true
      shift
      ;;
    --plan-only)
      TERRAFORM_APPLY=false
      shift
      ;;
    --env)
      ENVIRONMENT="${2:-}"
      if [[ -z "${ENVIRONMENT}" ]]; then
        echo "--env requires a value" >&2
        exit 1
      fi
      TFVARS_FILE="${TF_DIR}/env/${ENVIRONMENT}.tfvars"
      shift 2
      ;;
    --tfvars)
      TFVARS_FILE="${2:-}"
      if [[ -z "${TFVARS_FILE}" ]]; then
        echo "--tfvars requires a value" >&2
        exit 1
      fi
      shift 2
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      echo "Unknown argument: $1"
      usage
      exit 1
      ;;
  esac
done

if [[ -f "${TFVARS_FILE}" ]]; then
  PROJECT_NAME="$(python3 - "${TFVARS_FILE}" <<'PY'
import re
import sys
path = sys.argv[1]
with open(path, "r", encoding="utf-8") as f:
    for line in f:
        match = re.match(r"\s*project_name\s*=\s*\"([^\"]+)\"", line)
        if match:
            print(match.group(1))
            break
PY
  )"
  if [[ -n "${PROJECT_NAME}" ]]; then
    BACKEND_ECS_CLUSTER=""
    FRONTEND_ECS_CLUSTER=""
    BACKEND_ECS_SERVICE=""
    FRONTEND_ECS_SERVICE=""
    BACKEND_TASK_FAMILY=""
    FRONTEND_TASK_FAMILY=""
    BACKEND_ECR_REPO=""
    FRONTEND_ECR_REPO=""
    set_project_defaults
  fi
fi

ACCOUNT_ID="$(aws sts get-caller-identity --query Account --output text)"
ECR_URI="${ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com"

ensure_ecr_repo() {
  local repo_name="$1"
  if ! aws ecr describe-repositories --repository-names "${repo_name}" --region "${AWS_REGION}" >/dev/null 2>&1; then
    aws ecr create-repository --repository-name "${repo_name}" --region "${AWS_REGION}" >/dev/null
  fi
}

docker_login() {
  aws ecr get-login-password --region "${AWS_REGION}" | docker login --username AWS --password-stdin "${ECR_URI}"
}

docker_login

wait_for_service_stable() {
  local cluster="$1"
  local service="$2"
  local start_ts
  start_ts="$(date +%s)"

  echo "Waiting for ${service} to stabilize..."
  while true; do
    local now_ts elapsed desired running pending deployment_count primary_pending primary_running primary_desired
    now_ts="$(date +%s)"
    elapsed=$((now_ts - start_ts))
    if (( elapsed > WAIT_TIMEOUT_SECONDS )); then
      echo "Timed out waiting for ${service} to stabilize after ${WAIT_TIMEOUT_SECONDS}s" >&2
      exit 1
    fi

    desired="$(aws ecs describe-services \
      --cluster "${cluster}" \
      --services "${service}" \
      --region "${AWS_REGION}" \
      --query "services[0].desiredCount" \
      --output text)"

    running="$(aws ecs describe-services \
      --cluster "${cluster}" \
      --services "${service}" \
      --region "${AWS_REGION}" \
      --query "services[0].runningCount" \
      --output text)"

    pending="$(aws ecs describe-services \
      --cluster "${cluster}" \
      --services "${service}" \
      --region "${AWS_REGION}" \
      --query "services[0].pendingCount" \
      --output text)"

    deployment_count="$(aws ecs describe-services \
      --cluster "${cluster}" \
      --services "${service}" \
      --region "${AWS_REGION}" \
      --query "length(services[0].deployments)" \
      --output text)"

    primary_desired="$(aws ecs describe-services \
      --cluster "${cluster}" \
      --services "${service}" \
      --region "${AWS_REGION}" \
      --query "services[0].deployments[?status=='PRIMARY'].desiredCount | [0]" \
      --output text)"

    primary_running="$(aws ecs describe-services \
      --cluster "${cluster}" \
      --services "${service}" \
      --region "${AWS_REGION}" \
      --query "services[0].deployments[?status=='PRIMARY'].runningCount | [0]" \
      --output text)"

    primary_pending="$(aws ecs describe-services \
      --cluster "${cluster}" \
      --services "${service}" \
      --region "${AWS_REGION}" \
      --query "services[0].deployments[?status=='PRIMARY'].pendingCount | [0]" \
      --output text)"

    if [[ "${running}" == "${desired}" && "${pending}" == "0" && "${deployment_count}" == "1" && "${primary_running}" == "${primary_desired}" && "${primary_pending}" == "0" ]]; then
      echo "${service} is stable (running ${running}/${desired})"
      break
    fi

    echo "Still deploying ${service} (running ${running}/${desired}, pending ${pending}, deployments ${deployment_count})"
    sleep "${WAIT_INTERVAL_SECONDS}"
  done
}

get_current_task_image() {
  local task_family="$1"
  local container_name="$2"
  local image
  image="$(aws ecs describe-task-definition \
    --task-definition "${task_family}" \
    --region "${AWS_REGION}" \
    --query "taskDefinition.containerDefinitions[?name=='${container_name}'].image | [0]" \
    --output text)"
  if [[ -z "${image}" || "${image}" == "None" ]]; then
    echo "Unable to resolve current image for ${task_family}:${container_name}" >&2
    exit 1
  fi
  echo "${image}"
}

BACKEND_IMAGE_URI=""
FRONTEND_IMAGE_URI=""

if [[ "${BUILD_BACKEND}" == "true" ]]; then
  BACKEND_IMAGE_URI="${ECR_URI}/${BACKEND_ECR_REPO}:${IMAGE_TAG}"
  echo "Building backend image ${BACKEND_IMAGE_URI}"
  ensure_ecr_repo "${BACKEND_ECR_REPO}"
  if [[ "${DOCKER_NO_CACHE}" == "true" ]]; then
    docker build --progress "${DOCKER_PROGRESS}" --no-cache -f backend/Dockerfile -t "${BACKEND_IMAGE_URI}" backend
  else
    docker build --progress "${DOCKER_PROGRESS}" -f backend/Dockerfile -t "${BACKEND_IMAGE_URI}" backend
  fi
  docker push "${BACKEND_IMAGE_URI}"
else
  BACKEND_IMAGE_URI="$(get_current_task_image "${BACKEND_TASK_FAMILY}" "${BACKEND_CONTAINER_NAME}")"
fi

if [[ "${BUILD_FRONTEND}" == "true" ]]; then
  FRONTEND_IMAGE_URI="${ECR_URI}/${FRONTEND_ECR_REPO}:${IMAGE_TAG}"
  echo "Building frontend image ${FRONTEND_IMAGE_URI}"
  ensure_ecr_repo "${FRONTEND_ECR_REPO}"
  if [[ "${DOCKER_NO_CACHE}" == "true" ]]; then
    docker build --progress "${DOCKER_PROGRESS}" --no-cache -f drone/Dockerfile -t "${FRONTEND_IMAGE_URI}" drone
  else
    docker build --progress "${DOCKER_PROGRESS}" -f drone/Dockerfile -t "${FRONTEND_IMAGE_URI}" drone
  fi
  docker push "${FRONTEND_IMAGE_URI}"
else
  FRONTEND_IMAGE_URI="$(get_current_task_image "${FRONTEND_TASK_FAMILY}" "${FRONTEND_CONTAINER_NAME}")"
fi

(
  cd "${TF_DIR}"
  terraform init -input=false
  TFVARS_ARGS=()
  VAR_ARGS=()
  if [[ -f "${TFVARS_FILE}" ]]; then
    TFVARS_ARGS+=("-var-file=${TFVARS_FILE}")
  else
    echo "Warning: tfvars file not found: ${TFVARS_FILE}" >&2
    VAR_ARGS+=(
      "-var" "aws_region=${AWS_REGION}"
      "-var" "project_name=${PROJECT_NAME}"
    )
  fi
  if [[ "${TERRAFORM_APPLY}" == "true" ]]; then
    terraform apply -input=false -auto-approve \
      ${TFVARS_ARGS[@]+"${TFVARS_ARGS[@]}"} \
      ${VAR_ARGS[@]+"${VAR_ARGS[@]}"} \
      -var "api_server_image_uri=${BACKEND_IMAGE_URI}" \
      -var "frontend_image_uri=${FRONTEND_IMAGE_URI}"
  else
    terraform plan -input=false \
      ${TFVARS_ARGS[@]+"${TFVARS_ARGS[@]}"} \
      ${VAR_ARGS[@]+"${VAR_ARGS[@]}"} \
      -var "api_server_image_uri=${BACKEND_IMAGE_URI}" \
      -var "frontend_image_uri=${FRONTEND_IMAGE_URI}"
  fi
)

if [[ "${TERRAFORM_APPLY}" == "true" && "${BUILD_BACKEND}" == "true" ]]; then
  aws ecs update-service \
    --cluster "${BACKEND_ECS_CLUSTER}" \
    --service "${BACKEND_ECS_SERVICE}" \
    --force-new-deployment \
    --region "${AWS_REGION}" >/dev/null
  echo "Backend deploy triggered for ${BACKEND_ECS_SERVICE} with ${BACKEND_IMAGE_URI}"
fi

if [[ "${TERRAFORM_APPLY}" == "true" && "${BUILD_FRONTEND}" == "true" ]]; then
  aws ecs update-service \
    --cluster "${FRONTEND_ECS_CLUSTER}" \
    --service "${FRONTEND_ECS_SERVICE}" \
    --force-new-deployment \
    --region "${AWS_REGION}" >/dev/null
  echo "Frontend deploy triggered for ${FRONTEND_ECS_SERVICE} with ${FRONTEND_IMAGE_URI}"
fi

if [[ "${TERRAFORM_APPLY}" == "true" && "${BUILD_BACKEND}" == "true" ]]; then
  wait_for_service_stable "${BACKEND_ECS_CLUSTER}" "${BACKEND_ECS_SERVICE}"
fi


if [[ "${TERRAFORM_APPLY}" == "true" && "${BUILD_FRONTEND}" == "true" ]]; then
  wait_for_service_stable "${FRONTEND_ECS_CLUSTER}" "${FRONTEND_ECS_SERVICE}"
fi