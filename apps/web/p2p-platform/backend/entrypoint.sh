#!/bin/sh
set -e

echo "[entrypoint] Applying missing ride_requests columns directly..."
# Add columns that were blocked by a VARCHAR(32) overflow in alembic_version.
# Uses IF NOT EXISTS for full idempotency. Runs BEFORE alembic to guarantee
# columns exist even if the alembic version tracking is in a bad state.
python3 -c "
import psycopg2, os, sys, re
raw_url = os.environ['DATABASE_URL']
# Strip SQLAlchemy dialect prefix if present (e.g. postgresql+psycopg2:// -> postgresql://)
url = re.sub(r'^postgresql\+\w+://', 'postgresql://', raw_url)
url = re.sub(r'^postgres\+\w+://', 'postgres://', url)
try:
    conn = psycopg2.connect(url)
    cur = conn.cursor()
    cur.execute('SELECT current_database(), inet_server_addr()')
    db_name, db_host = cur.fetchone()
    print(f'[entrypoint] Connected to db={db_name} host={db_host}')
    stmts = [
        'ALTER TABLE ride_requests ADD COLUMN IF NOT EXISTS accessibility_requested BOOLEAN DEFAULT FALSE',
        'ALTER TABLE ride_requests ADD COLUMN IF NOT EXISTS accessibility_notes TEXT',
        'ALTER TABLE ride_requests ADD COLUMN IF NOT EXISTS access_for_all_fee FLOAT DEFAULT 0.10',
        'ALTER TABLE ride_requests ADD COLUMN IF NOT EXISTS payment_retry_count INTEGER DEFAULT 0',
    ]
    for stmt in stmts:
        cur.execute(stmt)
    conn.commit()
    cur.execute(\"SELECT column_name FROM information_schema.columns WHERE table_name='ride_requests' AND column_name='accessibility_requested'\")
    exists = cur.fetchone()
    if not exists:
        print('[entrypoint] FATAL: column not found after commit', file=sys.stderr)
        sys.exit(1)
    cur.close()
    conn.close()
    print('[entrypoint] ride_requests columns verified OK')
except Exception as e:
    print('[entrypoint] ERROR in direct column fix: ' + str(e), file=sys.stderr)
    sys.exit(1)
"

echo "[entrypoint] Stamping known-applied migration branches..."
# These migrations were applied to the DB without alembic tracking.
# Stamping ensures alembic does not try to re-apply them, which would
# fail with DuplicateColumn/DuplicateObject errors.
alembic stamp 004_delivery_decision || true
alembic stamp add_kot_integration || true
alembic stamp 20260320_driver_cancel_tracking || true
alembic stamp 20260321_rr_accessibility || true

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
