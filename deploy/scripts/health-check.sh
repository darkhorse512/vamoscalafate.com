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
for app in vamoscalafate-web vamoscalafate-admin; do
  if pm2 jlist 2>/dev/null | grep -q "\"name\":\"$app\""; then
    STATUS="$(pm2 jlist | node -e "
      let d='';process.stdin.on('data',c=>d+=c).on('end',()=>{
        const p=JSON.parse(d).find(x=>x.name==='$app');
        console.log(p ? p.pm2_env.status : 'missing');
      })" 2>/dev/null)"
    [ "$STATUS" = "online" ] && check "$app process" ok || check "$app process" "status=$STATUS"
  else
    check "$app process" "not managed by pm2"
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
  DATABASE_URL="$(grep -E '^DATABASE_URL=' "$ENV_FILE" | head -1 | cut -d= -f2- | tr -d '"'"'"'')"
  if psql "$DATABASE_URL" -c 'SELECT 1' > /dev/null 2>&1; then
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
