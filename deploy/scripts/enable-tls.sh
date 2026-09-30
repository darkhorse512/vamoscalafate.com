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
# The full nginx config includes these two files. Certbot only writes them to
# /etc/letsencrypt when it manages nginx itself (`--nginx`), and we use
# `certonly`, so copy them from the installed package.
#
# Sourced locally rather than downloaded: the upstream raw-GitHub paths move
# between releases, and a 404 mid-deploy is a poor failure mode.
if [ ! -f /etc/letsencrypt/options-ssl-nginx.conf ]; then
  SRC="$(find /usr/lib/python3 /usr/lib/python3.* /usr/share \
          -name options-ssl-nginx.conf -path '*tls_configs*' 2>/dev/null | head -1 || true)"
  if [ -n "$SRC" ]; then
    cp "$SRC" /etc/letsencrypt/options-ssl-nginx.conf
    echo "  copied options-ssl-nginx.conf from $SRC"
  else
    # Last resort: a conservative modern policy equivalent to Certbot's.
    cat > /etc/letsencrypt/options-ssl-nginx.conf <<'TLSCONF'
ssl_session_cache shared:le_nginx_SSL:10m;
ssl_session_timeout 1440m;
ssl_session_tickets off;
ssl_protocols TLSv1.2 TLSv1.3;
ssl_prefer_server_ciphers off;
ssl_ciphers "ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384:ECDHE-ECDSA-CHACHA20-POLY1305:ECDHE-RSA-CHACHA20-POLY1305:DHE-RSA-AES128-GCM-SHA256:DHE-RSA-AES256-GCM-SHA384";
TLSCONF
    echo "  wrote a built-in TLS policy (certbot's copy not found)"
  fi
fi

if [ ! -f /etc/letsencrypt/ssl-dhparams.pem ]; then
  SRC="$(find /usr/lib/python3 /usr/lib/python3.* /usr/share \
          -name ssl-dhparams.pem 2>/dev/null | head -1 || true)"
  if [ -n "$SRC" ]; then
    cp "$SRC" /etc/letsencrypt/ssl-dhparams.pem
    echo "  copied ssl-dhparams.pem from $SRC"
  else
    echo "  generating dhparams (this takes a minute)…"
    openssl dhparam -out /etc/letsencrypt/ssl-dhparams.pem 2048 2>/dev/null
  fi
fi

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
