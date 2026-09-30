#!/usr/bin/env bash
#
# Health check for monitoring or a cron-based watchdog.
#
#   ./health-check.sh          # human-readable
#   ./health-check.sh --quiet  # exit code only, for cron
#
# Exit 0 when everything is healthy, 1 otherwise.

set -uo pipefail

QUIET="${1:-}"
FAILURES=0

# The applications run under the `vamos` user, so PM2's state lives in that
# user's home. Cron runs this as root, which has its own PM2 home and would
# otherwise report both processes as missing.
PM2_USER="${PM2_USER:-vamos}"
export PM2_HOME="${PM2_HOME:-/home/$PM2_USER/.pm2}"

say() { [ "$QUIET" = "--quiet" ] || echo "$1"; }

check() {
  local label="$1" status="$2"
  if [ "$status" = "ok" ]; then
    say "  ✓ $label"
  else
    say "  ✗ $label - $status"
    FAILURES=$((FAILURES + 1))
  fi
}

say "Vamos Calafate health check - $(date -u +%FT%TZ)"
say ""

# ── Application processes ──────────────────────────────────────────────────
PM2_LIST="$(pm2 jlist 2>/dev/null || echo '[]')"

for app in vamoscalafate-web vamoscalafate-admin; do
  STATUS="$(printf '%s' "$PM2_LIST" | node -e "
    let d='';process.stdin.on('data',c=>d+=c).on('end',()=>{
      try {
        const p=JSON.parse(d).find(x=>x.name==='$app');
        console.log(p ? p.pm2_env.status : 'not managed by pm2');
      } catch { console.log('could not read pm2 state'); }
    })" 2>/dev/null || echo 'could not read pm2 state')"

  if [ "$STATUS" = "online" ]; then
    check "$app process" ok
  else
    check "$app process" "$STATUS"
  fi
done

# ── HTTP ───────────────────────────────────────────────────────────────────
WEB="$(curl -s -o /dev/null -w '%{http_code}' --max-time 10 http://127.0.0.1:3000/ || echo 000)"
[ "$WEB" = "200" ] && check "web responds" ok || check "web responds" "HTTP $WEB"

ADMIN="$(curl -s -o /dev/null -w '%{http_code}' --max-time 10 http://127.0.0.1:3001/login || echo 000)"
[ "$ADMIN" = "200" ] && check "admin responds" ok || check "admin responds" "HTTP $ADMIN"

# ── Database ───────────────────────────────────────────────────────────────
ENV_FILE="${ENV_FILE:-/var/www/vamoscalafate/web/.env}"
if [ -f "$ENV_FILE" ]; then
  # shellcheck source=lib-dburl.sh
  . "$(dirname "$(readlink -f "$0")")/lib-dburl.sh"
  DATABASE_URL="$(read_database_url "$ENV_FILE")"
  if psql "$(libpq_url "$DATABASE_URL")" -c 'SELECT 1' > /dev/null 2>&1; then
    check "database reachable" ok
  else
    check "database reachable" "connection failed"
  fi
else
  check "environment file" "missing at $ENV_FILE"
fi

# ── Disk ───────────────────────────────────────────────────────────────────
USED="$(df -P /var/www | awk 'NR==2 {gsub(/%/,"",$5); print $5}')"
if [ "$USED" -lt 90 ]; then
  check "disk space (${USED}% used)" ok
else
  check "disk space" "${USED}% used - running low"
fi

# ── Backups ────────────────────────────────────────────────────────────────
LATEST="$(ls -1t /var/backups/vamoscalafate/*.dump 2>/dev/null | head -1)"
if [ -n "$LATEST" ]; then
  AGE_HOURS=$(( ( $(date +%s) - $(stat -c %Y "$LATEST") ) / 3600 ))
  if [ "$AGE_HOURS" -lt 48 ]; then
    check "recent backup (${AGE_HOURS}h old)" ok
  else
    check "recent backup" "latest is ${AGE_HOURS}h old"
  fi
else
  check "recent backup" "no backups found"
fi

# ── TLS expiry ─────────────────────────────────────────────────────────────
CERT="/etc/letsencrypt/live/vamoscalafate.com/fullchain.pem"
if [ -f "$CERT" ]; then
  EXPIRY="$(openssl x509 -enddate -noout -in "$CERT" | cut -d= -f2)"
  DAYS=$(( ( $(date -d "$EXPIRY" +%s) - $(date +%s) ) / 86400 ))
  if [ "$DAYS" -gt 14 ]; then
    check "TLS certificate (${DAYS}d left)" ok
  else
    check "TLS certificate" "expires in ${DAYS} days"
  fi
fi

say ""
if [ "$FAILURES" -eq 0 ]; then
  say "All checks passed."
  exit 0
fi

say "$FAILURES check(s) failed."
exit 1
