#!/usr/bin/env bash
# Safe production deploy: pull main, gate on tests/build, restart, health-check,
# and auto-rollback if anything fails. Designed to run unattended as root (e.g.
# from root's crontab) so deploys never depend on a human running ad-hoc SSH
# commands by hand. Runs git/pnpm as the madcamp user (who owns the repo) via
# `sudo -u madcamp`, and only touches systemctl directly as root -- this avoids
# granting the madcamp service account any new sudo privileges.
#
# Never touches public/data/snapshots/*.json (except seed.json) or
# src/participants/participants.csv: both are gitignored runtime data, so
# plain git operations here (fetch/merge --ff-only/reset --hard) cannot
# clobber them. Do not add `git clean` to this script -- that would delete
# those untracked files.
set -euo pipefail

REPO_DIR="/opt/madcamp-git-tracker"
SERVICE="madcamp-git-tracker"
LOCK_FILE="/tmp/madcamp-deploy.lock"
LOG_FILE="$REPO_DIR/deploy.log"
PNPM_VERSION="10.25.0"

exec 9>"$LOCK_FILE"
if ! flock -n 9; then
  echo "$(date -Iseconds) deploy already in progress, skipping" >>"$LOG_FILE"
  exit 0
fi

log() { echo "$(date -Iseconds) $*" >>"$LOG_FILE"; }
as_madcamp() { sudo -u madcamp bash -lc "cd '$REPO_DIR' && $*"; }

as_madcamp "git fetch origin main --quiet"
PREV_SHA="$(as_madcamp 'git rev-parse HEAD')"
NEW_SHA="$(as_madcamp 'git rev-parse origin/main')"

if [ "$PREV_SHA" = "$NEW_SHA" ]; then
  exit 0
fi

log "deploying $PREV_SHA -> $NEW_SHA"

rollback() {
  log "FAILED, rolling back to $PREV_SHA"
  as_madcamp "git reset --hard '$PREV_SHA'" >>"$LOG_FILE" 2>&1
  as_madcamp "corepack prepare pnpm@$PNPM_VERSION --activate" >>"$LOG_FILE" 2>&1
  as_madcamp "pnpm install --frozen-lockfile" >>"$LOG_FILE" 2>&1
  as_madcamp "pnpm build" >>"$LOG_FILE" 2>&1
  systemctl restart "$SERVICE"
  log "rollback complete, service restarted at $PREV_SHA"
  exit 1
}
trap rollback ERR

as_madcamp "git merge --ff-only origin/main" >>"$LOG_FILE" 2>&1
as_madcamp "corepack prepare pnpm@$PNPM_VERSION --activate" >>"$LOG_FILE" 2>&1
as_madcamp "pnpm install --frozen-lockfile" >>"$LOG_FILE" 2>&1
as_madcamp "pnpm exec tsc --noEmit" >>"$LOG_FILE" 2>&1
as_madcamp "pnpm exec vitest run tests/unit" >>"$LOG_FILE" 2>&1
as_madcamp "pnpm build" >>"$LOG_FILE" 2>&1

systemctl restart "$SERVICE"
sleep 3

trap - ERR
if ! curl -sf http://127.0.0.1:3000/api/health >/dev/null 2>&1; then
  rollback
fi

log "deployed $NEW_SHA successfully"
