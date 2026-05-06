#!/usr/bin/env bash
# restore.sh — Restore a REVA PostgreSQL backup
#
# Usage:
#   ./scripts/restore.sh backups/hun_consignment_20260506_020000.sql.gz
#
# WARNING: This will DROP and recreate the database. Use with caution.
# ─────────────────────────────────────────────────────────────────────────────

set -euo pipefail

BACKUP_FILE="${1:?Usage: $0 <backup-file.sql.gz>}"

POSTGRES_HOST="${POSTGRES_HOST:-localhost}"
POSTGRES_PORT="${POSTGRES_PORT:-5432}"
POSTGRES_DB="${POSTGRES_DB:-hun_consignment}"
POSTGRES_USER="${POSTGRES_USER:-postgres}"

if [[ ! -f "$BACKUP_FILE" ]]; then
  echo "ERROR: Backup file not found: $BACKUP_FILE"
  exit 1
fi

echo "[$(date -Iseconds)] Restoring $BACKUP_FILE → $POSTGRES_DB"

read -rp "This will OVERWRITE the '$POSTGRES_DB' database. Continue? [y/N] " confirm
[[ "$confirm" =~ ^[Yy]$ ]] || { echo "Aborted."; exit 0; }

# Drop and recreate
psql -h "$POSTGRES_HOST" -p "$POSTGRES_PORT" -U "$POSTGRES_USER" -c "DROP DATABASE IF EXISTS ${POSTGRES_DB};" postgres
psql -h "$POSTGRES_HOST" -p "$POSTGRES_PORT" -U "$POSTGRES_USER" -c "CREATE DATABASE ${POSTGRES_DB};" postgres

# Restore
gunzip -c "$BACKUP_FILE" | psql -h "$POSTGRES_HOST" -p "$POSTGRES_PORT" -U "$POSTGRES_USER" -d "$POSTGRES_DB"

echo "[$(date -Iseconds)] Restore complete."
