#!/usr/bin/env bash
# Builds the frozen, post-camp static site into `out/` for GitHub Pages.
#
# `app/api/**` (admin + snapshot routes) and `app/admin/**` (admin UI) can't survive
# `output: "export"` -- they need cookies/fs-writes/live GitHub calls that only make sense in the
# normal dynamic-mode server (kept in the repo for next camp season, untouched). `middleware.ts`
# is likewise unsupported by static export. So this script temporarily moves those three paths out
# of the tree, builds with STATIC_EXPORT=1 (see next.config.mjs), then restores them -- on success
# or failure -- so the dynamic-mode source tree is never left in a half-exported state.
set -euo pipefail
cd "$(dirname "$0")/.."

STAGING=".export-staging"
rm -rf "$STAGING"
mkdir -p "$STAGING"

restore() {
  [ -d "$STAGING/api" ] && mv "$STAGING/api" app/api
  [ -d "$STAGING/admin" ] && mv "$STAGING/admin" app/admin
  [ -d "$STAGING/openapi.json" ] && mv "$STAGING/openapi.json" app/openapi.json
  [ -f "$STAGING/middleware.ts" ] && mv "$STAGING/middleware.ts" middleware.ts
  rm -rf "$STAGING"
}
trap restore EXIT

[ -d app/api ] && mv app/api "$STAGING/api"
[ -d app/admin ] && mv app/admin "$STAGING/admin"
# Documents the admin-only API surface above -- pointless (and unbuildable under
# output:"export") once that surface doesn't exist in the frozen static site.
[ -d app/openapi.json ] && mv app/openapi.json "$STAGING/openapi.json"
[ -f middleware.ts ] && mv middleware.ts "$STAGING/middleware.ts"

STATIC_EXPORT=1 npx next build

echo "static export written to ./out"
