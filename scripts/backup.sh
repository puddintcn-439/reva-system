#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# backup.sh — PostgreSQL database backup script for REVA / R.E.V.A system
#
# Usage:
#   ./scripts/backup.sh                  # backup to ./backups/
#   BACKUP_DIR=/mnt/backups ./scripts/backup.sh
#
# Recommended cron (daily at 02:00, keep 30 days):
#   0 2 * * * /app/scripts/backup.sh >> /var/log/reva-backup.log 2>&1
#
# Environment variables (can be set in .env.production or shell):
#   POSTGRES_HOST     default: localhost
#   POSTGRES_PORT     default: 5432
#   POSTGRES_DB       default: hun_consignment
#   POSTGRES_USER     default: postgres
#   PGPASSWORD        required in non-interactive environments
#   BACKUP_DIR        default: ./backups
#   BACKUP_RETAIN_DAYS default: 30
# ─────────────────────────────────────────────────────────────────────────────

set -euo pipefail

POSTGRES_HOST="${POSTGRES_HOST:-localhost}"
POSTGRES_PORT="${POSTGRES_PORT:-5432}"
POSTGRES_DB="${POSTGRES_DB:-hun_consignment}"
POSTGRES_USER="${POSTGRES_USER:-postgres}"
BACKUP_DIR="${BACKUP_DIR:-$(dirname "$0")/../backups}"
BACKUP_RETAIN_DAYS="${BACKUP_RETAIN_DAYS:-30}"

TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
FILENAME="${POSTGRES_DB}_${TIMESTAMP}.sql.gz"

mkdir -p "$BACKUP_DIR"

echo "[$(date -Iseconds)] Starting backup: $FILENAME"

pg_dump \
  -h "$POSTGRES_HOST" \
  -p "$POSTGRES_PORT" \
  -U "$POSTGRES_USER" \
  -d "$POSTGRES_DB" \
  --no-password \
  --format=plain \
  --no-owner \
  --no-acl \
  | gzip > "${BACKUP_DIR}/${FILENAME}"

SIZE=$(du -sh "${BACKUP_DIR}/${FILENAME}" | cut -f1)
echo "[$(date -Iseconds)] Backup complete: ${BACKUP_DIR}/${FILENAME} (${SIZE})"

# ── Prune old backups ─────────────────────────────────────────
echo "[$(date -Iseconds)] Pruning backups older than ${BACKUP_RETAIN_DAYS} days..."
find "$BACKUP_DIR" -name "${POSTGRES_DB}_*.sql.gz" -mtime "+${BACKUP_RETAIN_DAYS}" -delete
echo "[$(date -Iseconds)] Done."
