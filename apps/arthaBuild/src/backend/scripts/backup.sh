#!/usr/bin/env bash
# ArthaBuild SQLite Backup — Phase 15 OPS-01
# Env vars required:
#   OPS_BACKUP_S3_BUCKET  — target S3 bucket name (required)
#   DB_PATH               — path to arthaBuild.db (default: /app/data/arthaBuild.db)
#
# Usage (cron example — daily at 02:00 UTC):
#   0 2 * * * OPS_BACKUP_S3_BUCKET=my-bucket /app/scripts/backup.sh >> /var/log/arthabuild-backup.log 2>&1
#
# The script uploads with AES-256 server-side encryption and exits 0 on success.
set -euo pipefail

DB_PATH="${DB_PATH:-/app/data/arthaBuild.db}"
BUCKET="${OPS_BACKUP_S3_BUCKET:?OPS_BACKUP_S3_BUCKET must be set}"
TIMESTAMP=$(date -u +%Y%m%dT%H%M%SZ)
DEST="s3://${BUCKET}/backups/arthaBuild-${TIMESTAMP}.db"

echo "[backup] Copying ${DB_PATH} to ${DEST}"
aws s3 cp "${DB_PATH}" "${DEST}" --sse AES256
echo "[backup] Done: ${DEST}"
