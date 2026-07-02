#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."

set -a
source .env.local
set +a

mkdir -p data/sync-reports
{
  echo "=== $(date -Iseconds) ==="
  ./node_modules/.bin/tsx scripts/sync-github.ts
  echo
} >> data/sync-reports/cron.log 2>&1
