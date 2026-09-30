#!/usr/bin/env bash
#
# Issue Let's Encrypt certificates and switch Nginx from the HTTP-only
# bootstrap config to the full TLS configuration.
#
#   sudo /var/www/vamoscalafate/deploy/scripts/enable-tls.sh you@vamoscalafate.com
#
# PREREQUISITES — this will fail without them:
#   1. vamoscalafate.com, www and admin must all resolve to THIS server
#   2. If the records are behind Cloudflare's proxy, either grey-cloud them
#      for the duration or turn OFF "Always Use HTTPS" — the HTTP-01 challenge
#      must reach the origin over port 80
#   3. Ports 80 and 443 must be open

set -Eeuo pipefail

EMAIL="${1:-}"
APP_DIR="${APP_DIR:-/var/www/vamoscalafate}"
DOMAINS=(vamoscalafate.com www.vamoscalafate.com admin.vamoscalafate.com)

if [ -z "$EMAIL" ]; then
  echo "Usage: $0 <email-for-expiry-notices>" >&2
  exit 1
fi

step() { echo; echo "── $1 ──────────────────────────────────────"; }

step "Checking DNS"
THIS_IP="$(curl -fsS --max-time 10 https://api.ipify.org)"
echo "  this server: $THIS_IP"

RESOLVE_FAIL=0
for d in "${DOMAINS[@]}"; do
  GOT="$(dig +short "$d" A | tail -1)"
  if [ -z "$GOT" ]; then
    echo "  ✗ $d does not resolve"
    RESOLVE_FAIL=1
  elif [ "$GOT" = "$THIS_IP" ]; then
    echo "  ✓ $d → $GOT"
  else
    # Behind the Cloudflare proxy the A record shows a Cloudflare address.
    # That is expected, but the challenge still has to reach this origin.
    echo "  ! $d → $GOT (not this server — Cloudflare proxy, or wrong record)"
    RESOLVE_FAIL=1
  fi
done

if [ "$RESOLVE_FAIL" = "1" ]; then
  echo
  echo "  One or more names do not point here directly."
  echo "  If they are orange-clouded in Cloudflare, set them to DNS only,"
  echo "  wait a minute, and re-run. Re-enable the proxy afterwards."
  echo
  read -r -p "Continue anyway? [y/N] " GO
  [ "$GO" = "y" ] || exit 1
fi

step "Verifying the ACME challenge path is reachable"
mkdir -p /var/www/certbot/.well-known/acme-challenge
TOKEN="preflight-$(date +%s)"
echo "$TOKEN" > "/var/www/certbot/.well-known/acme-challenge/$TOKEN"

PRE="$(curl -fsS --max-time 10 "http://vamoscalafate.com/.well-known/acme-challenge/$TOKEN" || echo FAIL)"
rm -f "/var/www/certbot/.well-known/acme-challenge/$TOKEN"

if [ "$PRE" = "$TOKEN" ]; then
  echo "  ✓ challenge path serves correctly"
else
  echo "  ✗ challenge path did not return the expected token (got: $PRE)"
  echo "    Certbot will fail. Check DNS, the firewall, and Cloudflare's"
  echo "    'Always Use HTTPS' setting."
  exit 1
fi

step "Requesting certificates"
certbot certonly --webroot -w /var/www/certbot \
  -d vamoscalafate.com -d www.vamoscalafate.com \
  --email "$EMAIL" --agree-tos --no-eff-email --non-interactive

certbot certonly --webroot -w /var/www/certbot \
  -d admin.vamoscalafate.com \
  --email "$EMAIL" --agree-tos --no-eff-email --non-interactive

step "Installing Certbot's recommended TLS options"
# The full config includes these; Certbot only writes them when it manages
# nginx itself, so fetch them if they are missing.
[ -f /etc/letsencrypt/options-ssl-nginx.conf ] || \
  curl -fsS -o /etc/letsencrypt/options-ssl-nginx.conf \
    https://raw.githubusercontent.com/certbot/certbot/master/certbot-nginx/certbot/_internal/tls_configs/options-ssl-nginx.conf
[ -f /etc/letsencrypt/ssl-dhparams.pem ] || \
  curl -fsS -o /etc/letsencrypt/ssl-dhparams.pem \
    https://raw.githubusercontent.com/certbot/certbot/master/certbot/certbot/ssl-dhparams.pem

step "Switching to the full TLS configuration"
cp "$APP_DIR/deploy/nginx/snippets/"*.conf /etc/nginx/snippets/
cp "$APP_DIR/deploy/nginx/vamoscalafate.conf" /etc/nginx/sites-available/vamoscalafate
ln -sf /etc/nginx/sites-available/vamoscalafate /etc/nginx/sites-enabled/vamoscalafate
rm -f /etc/nginx/sites-enabled/vamoscalafate-bootstrap

if ! nginx -t; then
  echo
  echo "  Full config failed validation — reverting to the bootstrap config." >&2
  rm -f /etc/nginx/sites-enabled/vamoscalafate
  ln -sf /etc/nginx/sites-available/vamoscalafate-bootstrap /etc/nginx/sites-enabled/
  nginx -t && systemctl reload nginx
  exit 1
fi

systemctl reload nginx

step "Verifying"
for d in "${DOMAINS[@]}"; do
  CODE="$(curl -s -o /dev/null -w '%{http_code}' --max-time 15 "https://$d/" || echo 000)"
  echo "  https://$d → $CODE"
done

echo
echo "TLS is live. Renewal is automatic (systemctl status certbot.timer)."
echo
echo "NEXT: re-enable the Cloudflare orange cloud, and set"
echo "      SSL/TLS → Overview → Full (strict)."
