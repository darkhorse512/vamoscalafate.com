#!/usr/bin/env bash
#
# Restore a Vamos Calafate database dump.
#
#   ./restore-database.sh /var/backups/vamoscalafate/vamoscalafate-<ts>.dump
#
# DESTRUCTIVE: this replaces the contents of the target database. It stops the
# application first, because restoring underneath a running app produces
# inconsistent state and confusing errors.
#
# Rehearse this on a staging database. An untested restore procedure is not a
# backup strategy - it is a hope.

set -Eeuo pipefail

DUMP_FILE="${1:-}"
ENV_FILE="${ENV_FILE:-/var/www/vamoscalafate/web/.env}"

if [ -z "$DUMP_FILE" ] || [ ! -f "$DUMP_FILE" ]; then
  echo "Usage: $0 <path-to-dump-file>" >&2
  echo "Available backups:" >&2
  ls -1t /var/backups/vamoscalafate/*.dump 2>/dev/null | head -10 >&2 || echo "  (none found)" >&2
  exit 1
fi

# shellcheck source=lib-dburl.sh
. "$(dirname "$(readlink -f "$0")")/lib-dburl.sh"

DATABASE_URL="$(read_database_url "$ENV_FILE")"
[ -n "$DATABASE_URL" ] || { echo "DATABASE_URL not found in $ENV_FILE" >&2; exit 1; }

# libpq tools reject Prisma's extra query parameters.
PG_URL="$(libpq_url "$DATABASE_URL")"

echo "About to restore:"
echo "  dump:     $DUMP_FILE"
echo "  database: ${DATABASE_URL%%\?*}"
echo
echo "This REPLACES the current contents of that database."
read -r -p "Type 'restore' to continue: " CONFIRM
[ "$CONFIRM" = "restore" ] || { echo "Aborted."; exit 1; }

# A safety dump of the current state, in case the restore is the mistake.
SAFETY="/var/backups/vamoscalafate/pre-restore-$(date -u +%Y%m%dT%H%M%SZ).dump"
echo "Taking a safety dump of the current database → $SAFETY"
pg_dump --dbname="$PG_URL" --format=custom --compress=9 --file="$SAFETY"

echo "Stopping application processes…"
pm2 stop vamoscalafate-web vamoscalafate-admin || true

echo "Restoring…"
# --clean --if-exists drops existing objects first; without it the restore
# collides with the current schema.
pg_restore --dbname="$PG_URL" \
           --clean --if-exists \
           --no-owner --no-privileges \
           --jobs=2 \
           "$DUMP_FILE"

echo "Applying any migrations newer than the dump…"
cd /var/www/vamoscalafate && pnpm db:migrate:deploy

echo "Restarting application processes…"
pm2 start vamoscalafate-web vamoscalafate-admin

echo
echo "Restore complete. Safety dump of the previous state: $SAFETY"
