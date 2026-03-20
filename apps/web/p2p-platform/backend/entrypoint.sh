#!/bin/sh
set -e

echo "[entrypoint] Running Alembic migrations..."
alembic upgrade head
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
