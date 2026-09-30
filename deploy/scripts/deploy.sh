#!/usr/bin/env bash
#
# Git-based deployment for Vamos Calafate.
#
#   cd /var/www/vamoscalafate && ./deploy/scripts/deploy.sh
#
# Sequence:
#   1. pull            2. install deps       3. generate Prisma client
#   4. run migrations  5. build both apps    6. reload PM2
#
# Migrations run BEFORE the build so the new code never starts against an old
# schema. PM2 `reload` is used rather than `restart`, so in-flight requests
# finish instead of being dropped.

set -Eeuo pipefail

APP_DIR="${APP_DIR:-/var/www/vamoscalafate}"
BRANCH="${BRANCH:-main}"

cd "$APP_DIR"

step() { echo; echo "── $1 ────────────────────────────────────────────"; }

fail() {
  echo
  echo "DEPLOY FAILED at: $1" >&2
  echo "The previous version is still running - PM2 was not reloaded." >&2
  exit 1
}

step "Checking working tree"
if [ -n "$(git status --porcelain)" ]; then
  echo "Working tree has uncommitted changes:" >&2
  git status --short >&2
  fail "dirty working tree"
fi

step "Pulling $BRANCH"
git fetch --prune origin
PREVIOUS="$(git rev-parse HEAD)"
git checkout "$BRANCH"
git pull --ff-only origin "$BRANCH" || fail "git pull"
echo "  $PREVIOUS → $(git rev-parse HEAD)"

step "Installing dependencies"
# --frozen-lockfile makes the deploy reproducible: it fails rather than
# silently resolving different versions than were tested.
pnpm install --frozen-lockfile || fail "pnpm install"

step "Generating Prisma client"
pnpm db:generate || fail "prisma generate"

step "Applying database migrations"
# `migrate deploy` only applies committed migrations; it never generates or
# resets, so it is safe to run against production.
pnpm db:migrate:deploy || fail "prisma migrate deploy"

step "Building applications"
pnpm build || fail "build"

step "Reloading processes"
pm2 reload ecosystem.config.cjs --env production --update-env || fail "pm2 reload"
pm2 save

step "Health check"
sleep 5
WEB_STATUS="$(curl -s -o /dev/null -w '%{http_code}' --max-time 10 http://127.0.0.1:3000/ || echo 000)"
ADMIN_STATUS="$(curl -s -o /dev/null -w '%{http_code}' --max-time 10 http://127.0.0.1:3001/login || echo 000)"

echo "  web   → $WEB_STATUS"
echo "  admin → $ADMIN_STATUS"

if [ "$WEB_STATUS" != "200" ] || [ "$ADMIN_STATUS" != "200" ]; then
  echo
  echo "WARNING: an application did not respond with 200." >&2
  echo "Check: pm2 logs --lines 50" >&2
  echo "Roll back with: git reset --hard $PREVIOUS && ./deploy/scripts/deploy.sh" >&2
  exit 1
fi

echo
echo "Deploy complete: $(git rev-parse --short HEAD)"
pm2 status
