#!/bin/sh
set -e

echo "[entrypoint] Preparing Alembic migrations..."

# Stamp all known-applied revisions that were deployed without alembic tracking.
# These columns already exist in the DB. Stamping prevents alembic from trying
# to re-apply them (which would fail with DuplicateColumn errors).
echo "[entrypoint] Stamping known-applied migration heads..."
alembic stamp 004_delivery_decision || echo "[entrypoint] Note: stamp 004_delivery_decision skipped or already stamped"
alembic stamp add_kot_integration || echo "[entrypoint] Note: stamp add_kot_integration skipped or already stamped"
alembic stamp 20260318_payment_retry_count || echo "[entrypoint] Note: stamp 20260318_payment_retry_count skipped or already stamped"

echo "[entrypoint] Running new Alembic migrations..."
alembic upgrade heads
echo "[entrypoint] Migrations complete. Starting uvicorn..."

exec uvicorn main_new:app \
  --host 0.0.0.0 \
  --port 8080 \
  --workers 4 \
  --loop uvloop \
  --http httptools \
  --no-access-log \
  --proxy-headers \
  --forwarded-allow-ips "*"
