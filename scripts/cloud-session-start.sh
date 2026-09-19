#!/usr/bin/env bash
#
# cloud-session-start.sh — SessionStart hook, cloud sessions only.
#
# Registered in .claude/settings.json. Runs on every cloud session start and
# resume, after Claude Code launches.
#
# The environment cache is a filesystem snapshot: it keeps what the setup
# script installed, but not anything that was merely running. dockerd is a
# running process, so it has to be started here rather than in the setup
# script, on every session.
#
# Exits 0 always — a hook failure should never block a session.

set -uo pipefail

# Local sessions have Docker running already and their own toolchain; do nothing.
if [ "${CLAUDE_CODE_REMOTE:-}" != "true" ]; then
  exit 0
fi

if ! docker info >/dev/null 2>&1; then
  mkdir -p /var/log
  nohup dockerd >/var/log/dockerd.log 2>&1 &
  for _ in $(seq 1 15); do
    docker info >/dev/null 2>&1 && break
    sleep 1
  done
fi

docker info >/dev/null 2>&1 \
  && echo "cloud-session-start: docker daemon ready" \
  || echo "cloud-session-start: WARN docker daemon did not start (see /var/log/dockerd.log)"

exit 0
