#!/usr/bin/env bash
#
# ensure-state-backend.sh — resolve, bootstrap, and initialise the S3 remote
# Terraform backend.
#
# Sourced by pipeline.sh (which bootstraps and initialises) and by
# deploy-preflight.sh (which only calls the read-only helpers).
#
# Deliberately sets no shell options: deploy-preflight.sh runs without `set -e`
# because it counts failures instead of aborting on them. Every function here
# returns a meaningful exit code instead.
#
# Expects from the caller:
#   AWS_REGION, PROJECT_NAME, TF_DIR, SCRIPT_DIR (repo root)
#   ACCOUNT_ID           — optional, resolved here when unset
#   BACKEND_ECS_CLUSTER  — optional, used only for the empty-state guard
#
# Sets:
#   TF_STATE_BUCKET, TF_STATE_KEY, TF_BACKEND_ARGS (array)
#
# See workflows/tech/deploy-from-cloud.md.

# ─── Resolution ─────────────────────────────────────────────────────────────────

state_backend_resolve() {
  if [[ -z "${ACCOUNT_ID:-}" ]]; then
    ACCOUNT_ID="$(aws sts get-caller-identity --query Account --output text 2>/dev/null)" || {
      echo "Error: cannot resolve AWS account id — check credentials." >&2
      return 1
    }
  fi

  # One bucket per account; the key namespaces each stack inside it.
  TF_STATE_BUCKET="${TF_STATE_BUCKET:-droneedge-tfstate-${ACCOUNT_ID}}"

  # Keyed by project_name, not by --env: --tfvars can point at prod.tfvars while
  # ENVIRONMENT is still "dev", and the project_name in the file being applied is
  # the only reliable identity of the stack.
  TF_STATE_KEY="${TF_STATE_KEY:-${PROJECT_NAME}/terraform.tfstate}"

  TF_BACKEND_ARGS=(
    -backend-config="bucket=${TF_STATE_BUCKET}"
    -backend-config="key=${TF_STATE_KEY}"
    -backend-config="region=${AWS_REGION}"
  )
}

# ─── Read-only probes ───────────────────────────────────────────────────────────

# 0 = exists, 1 = absent, 2 = cannot tell (permissions/network)
state_bucket_exists() {
  local out rc
  out="$(aws s3api head-bucket --bucket "${TF_STATE_BUCKET}" --region "${AWS_REGION}" 2>&1)"
  rc=$?
  [[ ${rc} -eq 0 ]] && return 0
  grep -qiE '404|Not Found|NoSuchBucket' <<<"${out}" && return 1
  echo "Error: cannot read state bucket ${TF_STATE_BUCKET}: ${out}" >&2
  return 2
}

state_object_exists() {
  aws s3api head-object \
    --bucket "${TF_STATE_BUCKET}" --key "${TF_STATE_KEY}" \
    --region "${AWS_REGION}" >/dev/null 2>&1
}

# LastModified of the lock object, or empty when unlocked. A lock that outlives
# the run that took it blocks every later apply until it is force-unlocked.
state_lock_modified() {
  aws s3api head-object \
    --bucket "${TF_STATE_BUCKET}" --key "${TF_STATE_KEY}.tflock" \
    --region "${AWS_REGION}" --query 'LastModified' --output text 2>/dev/null || true
}

_state_resource_count_from_file() {
  python3 -c "import json,sys;print(len(json.load(open(sys.argv[1])).get('resources',[])))" "$1" 2>/dev/null || echo "0"
}

# Resource count in the remote state, or -1 when there is no remote state.
remote_state_resource_count() {
  local tmp count
  state_object_exists || { echo "-1"; return 0; }
  tmp="$(mktemp)"
  if aws s3api get-object \
      --bucket "${TF_STATE_BUCKET}" --key "${TF_STATE_KEY}" \
      --region "${AWS_REGION}" "${tmp}" >/dev/null 2>&1; then
    count="$(_state_resource_count_from_file "${tmp}")"
  else
    count="-1"
  fi
  rm -f "${tmp}"
  echo "${count}"
}

local_state_resource_count() {
  local f="${TF_DIR}/terraform.tfstate"
  [[ -f "${f}" ]] || { echo "0"; return 0; }
  _state_resource_count_from_file "${f}"
}

# True when the stack is already deployed in AWS. Used to refuse an apply that
# would otherwise start from an empty state and try to create everything twice.
live_stack_exists() {
  [[ -n "${BACKEND_ECS_CLUSTER:-}" ]] || return 1
  local status
  status="$(aws ecs describe-clusters --clusters "${BACKEND_ECS_CLUSTER}" \
    --region "${AWS_REGION}" --query 'clusters[0].status' --output text 2>/dev/null || true)"
  [[ "${status}" == "ACTIVE" ]]
}

# ─── Bootstrap ──────────────────────────────────────────────────────────────────

ensure_state_bucket() {
  state_backend_resolve || return 1

  # `|| rc=$?` rather than a bare call: pipeline.sh runs under `set -e`, where a
  # bare non-zero return would abort before the bootstrap below could run.
  local rc=0
  state_bucket_exists || rc=$?
  case ${rc} in
    0) echo "State backend: s3://${TF_STATE_BUCKET}/${TF_STATE_KEY}"; return 0 ;;
    2) return 1 ;;
  esac

  echo "State bucket ${TF_STATE_BUCKET} not found — bootstrapping it."
  terraform -chdir="${TF_DIR}/bootstrap" init -input=false >&2 || return 1
  terraform -chdir="${TF_DIR}/bootstrap" apply -input=false -auto-approve \
    -var "aws_region=${AWS_REGION}" \
    -var "bucket_name=${TF_STATE_BUCKET}" >&2 || return 1

  state_bucket_exists || {
    echo "Error: bootstrap finished but ${TF_STATE_BUCKET} is still unreadable." >&2
    return 1
  }
  echo "State backend created: s3://${TF_STATE_BUCKET}/${TF_STATE_KEY}"
}

# ─── Local state archival ───────────────────────────────────────────────────────

# Moves, never deletes. The files are gitignored either way.
archive_local_state() {
  local reason="$1"
  local dest="${TF_DIR}/.state-pre-s3-backup/$(date -u +%Y%m%dT%H%M%SZ)"
  local moved=0 f

  shopt -s nullglob
  for f in "${TF_DIR}"/terraform.tfstate "${TF_DIR}"/terraform.tfstate.backup "${TF_DIR}"/terraform.tfstate.*.backup; do
    [[ -f "${f}" ]] || continue
    mkdir -p "${dest}"
    mv "${f}" "${dest}/"
    moved=$((moved + 1))
  done
  shopt -u nullglob

  if [[ ${moved} -gt 0 ]]; then
    echo "Archived ${moved} local state file(s) to ${dest#"${SCRIPT_DIR}/"} (${reason})."
  fi
}

# ─── Guarded init ───────────────────────────────────────────────────────────────

terraform_init_backend() {
  state_backend_resolve || return 1

  local remote local_count
  remote="$(remote_state_resource_count)"
  local_count="$(local_state_resource_count)"

  if [[ "${remote}" -gt 0 ]]; then
    # Remote is authoritative. -reconfigure rebinds without ever copying the
    # local file upward, so a stale laptop state cannot clobber the shared one.
    terraform -chdir="${TF_DIR}" init -input=false -reconfigure "${TF_BACKEND_ARGS[@]}" || return 1
    echo "Terraform state: s3://${TF_STATE_BUCKET}/${TF_STATE_KEY} (${remote} resources)"
    archive_local_state "remote state is authoritative"
    return 0
  fi

  if [[ "${remote}" -eq 0 && "${local_count}" -gt 0 ]]; then
    echo "############################################################################" >&2
    echo "## ABORT: s3://${TF_STATE_BUCKET}/${TF_STATE_KEY} exists but holds 0 resources," >&2
    echo "## while ${TF_DIR}/terraform.tfstate holds ${local_count}." >&2
    echo "## Applying now would try to recreate the whole stack. Resolve by hand:" >&2
    echo "##   aws s3api list-object-versions --bucket ${TF_STATE_BUCKET} \\" >&2
    echo "##     --prefix ${TF_STATE_KEY}" >&2
    echo "## and restore the good version, or delete the empty object to re-migrate." >&2
    echo "############################################################################" >&2
    return 1
  fi

  if [[ "${remote}" -lt 0 && "${local_count}" -gt 0 ]]; then
    echo "Migrating ${local_count} resources from local state to s3://${TF_STATE_BUCKET}/${TF_STATE_KEY}"
    terraform -chdir="${TF_DIR}" init -input=false -migrate-state -force-copy "${TF_BACKEND_ARGS[@]}" || return 1

    local now
    now="$(remote_state_resource_count)"
    if [[ "${now}" -lt "${local_count}" ]]; then
      # Drop the short copy so the next run retries the migration instead of
      # adopting it as authoritative. Bucket versioning keeps it recoverable.
      aws s3api delete-object --bucket "${TF_STATE_BUCKET}" --key "${TF_STATE_KEY}" \
        --region "${AWS_REGION}" >/dev/null 2>&1 || true
      echo "Error: migration wrote ${now} resources, expected ${local_count}." >&2
      echo "Removed the short remote copy; local state is untouched at ${TF_DIR}/terraform.tfstate." >&2
      echo "Recover the removed object with:" >&2
      echo "  aws s3api list-object-versions --bucket ${TF_STATE_BUCKET} --prefix ${TF_STATE_KEY}" >&2
      return 1
    fi
    echo "Migration verified: ${now} resources now in S3."
    archive_local_state "migrated to the S3 backend"
    return 0
  fi

  # No state in either place.
  if live_stack_exists; then
    echo "############################################################################" >&2
    echo "## ABORT: no Terraform state found (neither S3 nor local), but ECS cluster" >&2
    echo "##   ${BACKEND_ECS_CLUSTER} is ACTIVE in ${AWS_REGION}." >&2
    echo "## Applying from empty state would try to recreate live infrastructure." >&2
    echo "## Recover the state before deploying — see workflows/tech/deploy-from-cloud.md" >&2
    echo "## § Recovering state." >&2
    echo "############################################################################" >&2
    return 1
  fi

  terraform -chdir="${TF_DIR}" init -input=false -reconfigure "${TF_BACKEND_ARGS[@]}" || return 1
  echo "Terraform state: s3://${TF_STATE_BUCKET}/${TF_STATE_KEY} (new, empty)"
}
