#!/usr/bin/env bash
#
# purge-state-from-history.sh — remove committed terraform.tfstate blobs from
# this repository.
#
# There are two very different cases, and the script tells them apart because
# they carry completely different risk:
#
#   REACHABLE — a commit on a remote branch contains the state file. Fixing this
#     means rewriting history and force-pushing: every SHA changes and every
#     other clone must be resynced. The script rewrites locally and then STOPS;
#     the push is always a deliberate human step.
#
#   ORPHANED — the blobs exist only as unreachable objects in this clone
#     (typically left behind by an earlier rebase). Nothing was ever published.
#     Cleanup is a local garbage collect: no rewrite, no force-push, no impact
#     on anyone else.
#
# As of 2026-09-22 this repo is the ORPHANED case — see workflows/tech/terraform-state.md.
#
# Rotate credentials on their own schedule regardless. If a blob was ever
# published, deleting it now does not un-publish it.
#
# Usage:
#   ./scripts/purge-state-from-history.sh              # report only
#   ./scripts/purge-state-from-history.sh --confirm    # act on what it found

set -euo pipefail

REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "${REPO_DIR}"

CONFIRM=false
[[ "${1:-}" == "--confirm" ]] && CONFIRM=true

PATHSPEC='terraform/*.tfstate*'
FILTER_PATHS=(
  --path terraform/terraform.tfstate
  --path terraform/terraform.tfstate.backup
  --path-glob 'terraform/*.tfstate*'
)

say()  { printf '%s\n' "$1"; }
step() { printf '\n\033[1m%s\033[0m\n' "$1"; }
die()  { printf '\033[31mError: %s\033[0m\n' "$1" >&2; exit 1; }

# ─── Classify ───────────────────────────────────────────────────────────────────

step "Scanning"

git fetch origin --prune >/dev/null 2>&1 || say "  (could not reach origin — judging from the last fetch)"

# Commits on remote-tracking refs only. --all would also count local orphans and
# overstate the problem, which is exactly the distinction that matters here.
REMOTE_COMMITS="$(git log --remotes --full-history --oneline -- "${PATHSPEC}" | wc -l | tr -d ' ')"

ORPHAN_BLOBS="$(git rev-list --all --objects --reflog -- "${PATHSPEC}" 2>/dev/null \
  | awk '$2 ~ /tfstate/ {print $1}' | sort -u | wc -l | tr -d ' ')"

say "  commits on remote branches containing state: ${REMOTE_COMMITS}"
say "  state blob objects present in this clone:    ${ORPHAN_BLOBS}"
say "  .git size: $(du -sh .git | cut -f1)"

if [[ "${REMOTE_COMMITS}" == "0" && "${ORPHAN_BLOBS}" == "0" ]]; then
  step "Clean"
  say "  No terraform state in history and no leftover objects. Nothing to do."
  exit 0
fi

# ─── Case 1: orphaned objects only ──────────────────────────────────────────────

if [[ "${REMOTE_COMMITS}" == "0" ]]; then
  step "Orphaned objects only — no history rewrite needed"
  say "  Nothing on any remote branch contains the state file, so these blobs"
  say "  were never published. They are unreachable objects in this clone and a"
  say "  garbage collect removes them. No force-push, no impact on other clones."

  if [[ "${CONFIRM}" != "true" ]]; then
    say ""
    say "  Re-run with --confirm to expire reflogs and garbage collect."
    exit 0
  fi

  step "Collecting"
  SIZE_BEFORE="$(du -sh .git | cut -f1)"
  git reflog expire --expire=now --expire-unreachable=now --all
  git gc --prune=now
  say "  .git went from ${SIZE_BEFORE} to $(du -sh .git | cut -f1)"

  REMAINING="$(git rev-list --all --objects --reflog -- "${PATHSPEC}" 2>/dev/null \
    | awk '$2 ~ /tfstate/ {print $1}' | sort -u | wc -l | tr -d ' ')"
  [[ "${REMAINING}" == "0" ]] \
    && say "  verified: no state objects remain" \
    || say "  ${REMAINING} object(s) still reachable — something references them; investigate before assuming they are gone"
  exit 0
fi

# ─── Case 2: published history — needs a rewrite ────────────────────────────────

step "Published state found — history rewrite required"

git log --remotes --full-history --format='    %h %ad %s' --date=short -- "${PATHSPEC}" | head -20
say ""
say "  Branches that would be rewritten:"
git for-each-ref --format='    %(refname:short)' refs/heads refs/remotes

if [[ "${CONFIRM}" != "true" ]]; then
  step "Report only"
  say "  Nothing changed. Read workflows/tech/terraform-state.md § Purging published"
  say "  state, confirm every clone owner is reachable, then re-run with --confirm."
  exit 0
fi

command -v git-filter-repo >/dev/null 2>&1 \
  || die "git-filter-repo not installed — brew install git-filter-repo"
[[ -z "$(git status --porcelain)" ]] \
  || die "working tree is dirty — commit or stash everything first"

step "Backup"
BACKUP="${REPO_DIR}/../website-services-prepurge-$(date -u +%Y%m%dT%H%M%SZ).git"
git clone --mirror . "${BACKUP}" >/dev/null 2>&1 \
  || die "mirror backup failed — refusing to rewrite without one"
say "  full mirror saved to ${BACKUP}"

step "Rewrite"
ORIGIN_URL="$(git remote get-url origin 2>/dev/null || true)"
# --force: filter-repo refuses on a non-fresh clone. It drops the origin remote
# on purpose so nothing can be pushed by reflex; re-added below.
git filter-repo --force --invert-paths "${FILTER_PATHS[@]}"
if [[ -n "${ORIGIN_URL}" ]] && ! git remote get-url origin >/dev/null 2>&1; then
  git remote add origin "${ORIGIN_URL}"
  say "  origin restored: ${ORIGIN_URL}"
fi

step "Verify"
STILL="$(git log --all --full-history --oneline -- "${PATHSPEC}" | wc -l | tr -d ' ')"
[[ "${STILL}" == "0" ]] \
  && say "  no state blobs remain in local history" \
  || die "${STILL} commits still reference state — do not push; restore from ${BACKUP}"

step "Not done automatically — the irreversible part"
cat <<EOF
  1. Sanity-check before anything leaves this machine:

       git log --oneline -10
       ./scripts/deploy-preflight.sh     # state is in S3, not git — must still pass

  2. Force-push the rewritten branches:

       git push --force-with-lease origin --all
       git push --force-with-lease origin --tags

  3. Every other clone must resync — their history no longer exists upstream:

       git fetch origin && git reset --hard origin/<branch>

  Backup if anything looks wrong: ${BACKUP}
EOF
