#!/bin/sh
set -e

echo "[entrypoint] Stamping known-applied migration branches..."
# These migrations were applied to the DB without alembic tracking.
# Stamping ensures alembic does not try to re-apply them, which would
# fail with DuplicateColumn/DuplicateObject errors.
alembic stamp 004_delivery_decision || true
alembic stamp add_kot_integration || true
alembic stamp 20260320_driver_cancel_tracking || true

echo "[entrypoint] Running pending Alembic migrations..."
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
