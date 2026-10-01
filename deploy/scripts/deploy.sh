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

# ─────────────────────────────────────────────────────────────────────────────
# PM2 ownership
#
# The running applications belong to ONE pm2 daemon: the `vamos` user's, which
# systemd resurrects at boot (pm2-vamos.service). A bare `pm2` command talks to
# whichever daemon belongs to the invoking user, so running this script with
# sudo silently addressed root's own empty daemon instead. That daemon then
# started a second copy of both apps, which died on EADDRINUSE while the OLD
# build kept serving traffic — and the health check below still saw 200,
# because something was answering. Deploys reported success for hours while
# shipping nothing.
#
# Addressing the daemon explicitly, by user and PM2_HOME, makes that
# impossible regardless of who runs the script.
# ─────────────────────────────────────────────────────────────────────────────
PM2_USER="${PM2_USER:-vamos}"
PM2_HOME_DIR="${PM2_HOME_DIR:-/home/$PM2_USER/.pm2}"

pm2_do() {
  if [ "$(id -un)" = "$PM2_USER" ]; then
    PM2_HOME="$PM2_HOME_DIR" pm2 "$@"
  else
    runuser -u "$PM2_USER" -- env "PM2_HOME=$PM2_HOME_DIR" pm2 "$@"
  fi
}

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

# The apps run as $PM2_USER but a build run by root leaves root-owned output.
# Next then cannot create .next/cache, so every optimised image is re-encoded
# on every request — the site stays up and merely gets slow, which is why this
# went unnoticed. Realign ownership rather than requiring the build to run as
# a particular user.
if [ "$(id -un)" != "$PM2_USER" ]; then
  step "Realigning build ownership to $PM2_USER"
  chown -R "$PM2_USER:$PM2_USER" web/.next admin/.next || fail "chown build output"
fi

# ─────────────────────────────────────────────────────────────────────────────
# Immutable releases
#
# `next build` deletes and rewrites .next while it runs. When PM2 served
# straight out of .next/standalone, the live server spent the whole build
# reading files that were vanishing under it — every deploy produced a minute
# of "client reference manifest does not exist" errors for real visitors.
#
# Now each build is copied to releases/<app>-<sha>-<time>, and current/<app>
# is a symlink swapped atomically (rename(2)) to point at it. PM2 runs from
# current/, so the build never touches the files being served, and the switch
# is a single filesystem operation followed by a graceful reload.
#
# Only the image-optimisation cache is shared across releases, so a deploy
# does not throw away every resized photo and trigger a burst of re-encoding.
# The data cache is deliberately NOT shared: a new release must never read
# query results cached by the previous release's code, whose shapes may differ.
# ─────────────────────────────────────────────────────────────────────────────
step "Publishing release"
RELEASE_TAG="$(git rev-parse --short HEAD)-$(date +%Y%m%d%H%M%S)"
mkdir -p releases current shared
for app in web admin; do
  dest="releases/$app-$RELEASE_TAG"
  cp -a "$app/.next/standalone" "$dest" || fail "copy $app release"
  mkdir -p "shared/$app-images" "$dest/$app/.next/cache"
  rm -rf "$dest/$app/.next/cache/images"
  ln -s "$APP_DIR/shared/$app-images" "$dest/$app/.next/cache/images"
  ln -sfn "$APP_DIR/$dest" "current/.$app.next"
  mv -T "current/.$app.next" "current/$app" || fail "switch $app release"
  echo "  $app → $dest"
done
if [ "$(id -un)" != "$PM2_USER" ]; then
  chown -R "$PM2_USER:$PM2_USER" releases current shared
fi

# Keep the three newest releases per app for a fast manual rollback:
#   ln -sfn "$APP_DIR/releases/<older>" current/web && pm2 reload ...
for app in web admin; do
  ls -1dt releases/$app-* 2>/dev/null | tail -n +4 | xargs -r rm -rf
done

step "Reloading processes"
# `pm2 reload` keeps a process's original script path. If the ecosystem file
# now points somewhere else (as when serving moved to current/), re-register
# that app so the change actually takes effect, then reload as normal.
for app in web admin; do
  # Resolve APP_DIR itself (it may be a symlink) but not current/, which is
  # meant to stay a symlink in the registered path.
  expected="$(cd "$APP_DIR" && pwd -P)/current/$app/$app/server.js"
  registered="$(pm2_do jlist 2>/dev/null | node -e "
    let raw = ''; process.stdin.on('data', (c) => (raw += c)).on('end', () => {
      const proc = JSON.parse(raw || '[]').find((p) => p.name === 'vamoscalafate-$app')
      process.stdout.write(proc ? proc.pm2_env.pm_exec_path : '')
    })")"
  if [ -n "$registered" ] && [ "$registered" != "$expected" ]; then
    echo "  vamoscalafate-$app: script moved, re-registering"
    pm2_do delete "vamoscalafate-$app" >/dev/null || fail "pm2 delete $app"
  fi
done
pm2_do startOrReload ecosystem.config.cjs --env production --update-env || fail "pm2 reload"
pm2_do save

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

# A 200 only proves SOMETHING is listening. If a stale process still holds the
# port, the new build never binds and the old one answers happily — which is
# exactly how a broken deploy reported success while shipping nothing.
#
# The App Router does not put the build id in the HTML, so instead we take an
# asset hash the served page references and check that file exists in the
# build we just produced. A fresh build renames its chunks, so a stale server
# necessarily points at a filename that is no longer on disk.
step "Verifying the running build is the one just built"
for app in web admin; do
  if [ "$app" = web ]; then port=3000; path=/; else port=3001; path=/login; fi

  asset="$(curl -s --max-time 10 "http://127.0.0.1:$port$path" \
    | grep -o '/_next/static/chunks/[A-Za-z0-9._-]*\.css' | head -1 || true)"

  if [ -z "$asset" ]; then
    echo "  $app → no stylesheet reference found; cannot verify" >&2
    continue
  fi

  if [ -f "current/$app/$app/.next${asset#/_next}" ]; then
    echo "  $app → serving ${asset##*/}, which is in this build"
  else
    echo
    echo "ERROR: $app is serving ${asset##*/}, which this build did not" >&2
    echo "produce. A stale process is almost certainly still holding port" >&2
    echo "$port outside this pm2 daemon. Find it with:" >&2
    echo "  ss -ltnp | grep :$port" >&2
    echo "Stop it, then re-run this script." >&2
    exit 1
  fi
done

# Warm the image cache in the background so the first visitors after the
# deploy are not the ones waiting for image encoding.
nohup "$APP_DIR/deploy/scripts/warm-images.sh" >> /var/log/vamoscalafate/warm-images.log 2>&1 &

echo
echo "Deploy complete: $(git rev-parse --short HEAD)"
pm2 status
