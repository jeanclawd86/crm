#!/bin/bash
# CRM Database Backup Script
# Backs up Vercel Postgres (Neon) to local SQL dumps
# Usage: ./backup.sh [optional-tag]
#
# Keeps last 30 backups. Run manually or via cron.

set -euo pipefail

BACKUP_DIR="$(dirname "$0")/backups"
TIMESTAMP=$(date +%Y%m%d-%H%M%S)
TAG="${1:-}"
FILENAME="crm-backup-${TIMESTAMP}${TAG:+-$TAG}.sql.gz"

export PATH="/usr/local/opt/libpq/bin:$PATH"

# Get connection string from Vercel project
CRM_PROJECT_DIR="/tmp/crm"
if [ ! -f "$CRM_PROJECT_DIR/.env.local" ]; then
  echo "⚠️  No .env.local found. Pulling from Vercel..."
  cd "$CRM_PROJECT_DIR" && vercel env pull .env.local --yes >/dev/null 2>&1
fi

DB_URL=$(grep "^POSTGRES_URL=" "$CRM_PROJECT_DIR/.env.local" | head -1 | sed 's/^POSTGRES_URL=//' | tr -d '"')

if [ -z "$DB_URL" ]; then
  echo "❌ Could not find POSTGRES_URL"
  exit 1
fi

mkdir -p "$BACKUP_DIR"

echo "📦 Backing up CRM database..."
pg_dump "$DB_URL" --no-owner --no-privileges --clean --if-exists 2>/dev/null | gzip > "$BACKUP_DIR/$FILENAME"

SIZE=$(du -h "$BACKUP_DIR/$FILENAME" | cut -f1)
echo "✅ Backup saved: $BACKUP_DIR/$FILENAME ($SIZE)"

# Keep last 30 backups, delete older
cd "$BACKUP_DIR"
ls -t crm-backup-*.sql.gz 2>/dev/null | tail -n +31 | xargs rm -f 2>/dev/null || true

COUNT=$(ls crm-backup-*.sql.gz 2>/dev/null | wc -l | tr -d ' ')
echo "📁 Total backups: $COUNT"
