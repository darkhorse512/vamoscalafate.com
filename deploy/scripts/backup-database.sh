#!/usr/bin/env bash
#
# PostgreSQL backup for Vamos Calafate.
#
# Install as a daily cron job — see DEPLOYMENT.md:
#   0 3 * * * /var/www/vamoscalafate/deploy/scripts/backup-database.sh
#
# Produces a compressed custom-format dump, which `pg_restore` can restore
# selectively (a single table, say) — a plain SQL dump cannot.
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
  exit 1
}

trap 'fail "unexpected error on line $LINENO"' ERR

# DATABASE_URL is read from the app's environment file so there is exactly one
# place where the credentials live.
ENV_FILE="${ENV_FILE:-/var/www/vamoscalafate/web/.env}"
[ -f "$ENV_FILE" ] || fail "environment file not found: $ENV_FILE"

# shellcheck disable=SC2046
DATABASE_URL="$(grep -E '^DATABASE_URL=' "$ENV_FILE" | head -1 | cut -d= -f2- | tr -d '"'"'"'')"
[ -n "$DATABASE_URL" ] || fail "DATABASE_URL not set in $ENV_FILE"

mkdir -p "$BACKUP_DIR"
chmod 700 "$BACKUP_DIR"

DUMP_FILE="$BACKUP_DIR/vamoscalafate-$TIMESTAMP.dump"

log "starting backup → $DUMP_FILE"

# -Fc  custom format (compressed, selectively restorable)
# --no-owner / --no-privileges keeps the dump portable across roles.
pg_dump --dbname="$DATABASE_URL" \
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

log "backup complete ($SIZE), verified"

# ── Retention ──────────────────────────────────────────────────────────────
DELETED="$(find "$BACKUP_DIR" -name 'vamoscalafate-*.dump' -mtime "+$RETENTION_DAYS" -print -delete | wc -l)"
log "pruned $DELETED backups older than $RETENTION_DAYS days"

# ── OFFSITE COPY — NOT CONFIGURED ──────────────────────────────────────────
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
  log "WARNING: no offsite copy configured — this backup exists only on this server"
fi

trap - ERR
exit 0
