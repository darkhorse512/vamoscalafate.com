#!/usr/bin/env bash
#
# PostgreSQL backup for Vamos Calafate.
#
# Install as a daily cron job - see DEPLOYMENT.md:
#   0 3 * * * /var/www/vamoscalafate/deploy/scripts/backup-database.sh
#
# Produces a compressed custom-format dump, which `pg_restore` can restore
# selectively (a single table, say) - a plain SQL dump cannot.
#
# NOTE: this script only creates local backups. Local-only backups do not
# survive the loss of the server. Copy them off-host; the OFFSITE_TARGET
# section below shows where to add that.

set -Eeuo pipefail

BACKUP_DIR="${BACKUP_DIR:-/var/backups/vamoscalafate}"
RETENTION_DAYS="${RETENTION_DAYS:-14}"
TIMESTAMP="$(date -u +%Y%m%dT%H%M%SZ)"
LOG_TAG="vamoscalafate-backup"

log() { logger -t "$LOG_TAG" "$1"; echo "[$(date -u +%FT%TZ)] $1"; }

fail() {
  log "FAILED: $1"
  # Remove any partial output. A zero-byte file sitting in the backup
  # directory looks like a backup and is the worst possible failure mode.
  [ -n "${DUMP_FILE:-}" ] && [ -f "$DUMP_FILE" ] && rm -f "$DUMP_FILE"
  exit 1
}

trap 'fail "unexpected error on line $LINENO"' ERR

# DATABASE_URL is read from the app's environment file so there is exactly one
# place where the credentials live.
ENV_FILE="${ENV_FILE:-/var/www/vamoscalafate/web/.env}"
[ -f "$ENV_FILE" ] || fail "environment file not found: $ENV_FILE"

# shellcheck source=lib-dburl.sh
. "$(dirname "$(readlink -f "$0")")/lib-dburl.sh"

DATABASE_URL="$(read_database_url "$ENV_FILE")"
[ -n "$DATABASE_URL" ] || fail "DATABASE_URL not set in $ENV_FILE"

# Prisma's connection string carries parameters libpq rejects; strip them.
PG_URL="$(libpq_url "$DATABASE_URL")"
PG_SCHEMA="$(url_schema "$DATABASE_URL")"

mkdir -p "$BACKUP_DIR"
chmod 700 "$BACKUP_DIR"

DUMP_FILE="$BACKUP_DIR/vamoscalafate-$TIMESTAMP.dump"

log "starting backup → $DUMP_FILE"

# -Fc  custom format (compressed, selectively restorable)
# --no-owner / --no-privileges keeps the dump portable across roles.
pg_dump --dbname="$PG_URL" \
        --schema="$PG_SCHEMA" \
        --format=custom \
        --compress=9 \
        --no-owner \
        --no-privileges \
        --file="$DUMP_FILE" \
  || fail "pg_dump returned non-zero"

chmod 600 "$DUMP_FILE"

SIZE="$(du -h "$DUMP_FILE" | cut -f1)"

# A dump that cannot be listed is not a backup. Verify before trusting it.
pg_restore --list "$DUMP_FILE" > /dev/null || fail "dump failed verification"

# A technically-valid but empty dump is also not a backup.
BYTES="$(stat -c %s "$DUMP_FILE")"
[ "$BYTES" -gt 10240 ] || fail "dump is only ${BYTES} bytes — refusing to call that a backup"

TABLES="$(pg_restore --list "$DUMP_FILE" | grep -c "TABLE DATA" || true)"
[ "$TABLES" -gt 10 ] || fail "dump contains only ${TABLES} tables — expected the full schema"

log "backup complete ($SIZE), verified"

# ── Retention ──────────────────────────────────────────────────────────────
DELETED="$(find "$BACKUP_DIR" -name 'vamoscalafate-*.dump' -mtime "+$RETENTION_DAYS" -print -delete | wc -l)"
log "pruned $DELETED backups older than $RETENTION_DAYS days"

# ── OFFSITE COPY - NOT CONFIGURED ──────────────────────────────────────────
# Backups on the same machine as the database are lost with that machine.
# Add ONE of the following and remove this notice once it is working:
#
#   # rsync to another host
#   rsync -az --delete "$BACKUP_DIR/" backup@offsite.example:/backups/vamoscalafate/
#
#   # any S3-compatible bucket (AWS, Cloudflare R2, Backblaze B2)
#   aws s3 cp "$DUMP_FILE" "s3://$BACKUP_BUCKET/vamoscalafate/" --storage-class STANDARD_IA
#
if [ -z "${OFFSITE_CONFIGURED:-}" ]; then
  log "WARNING: no offsite copy configured - this backup exists only on this server"
fi

trap - ERR
exit 0
