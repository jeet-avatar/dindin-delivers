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
    cur.execute('SELECT current_database(), inet_server_addr(), current_schema()')
    db_name, db_host, schema = cur.fetchone()
    print(f'[entrypoint] Connected to db={db_name} host={db_host} schema={schema}')
    stmts = [
        'ALTER TABLE ride_requests ADD COLUMN IF NOT EXISTS accessibility_requested BOOLEAN DEFAULT FALSE',
        'ALTER TABLE ride_requests ADD COLUMN IF NOT EXISTS accessibility_notes TEXT',
        'ALTER TABLE ride_requests ADD COLUMN IF NOT EXISTS access_for_all_fee FLOAT DEFAULT 0.10',
        'ALTER TABLE ride_requests ADD COLUMN IF NOT EXISTS payment_retry_count INTEGER DEFAULT 0',
    ]
    for stmt in stmts:
        cur.execute(stmt)
    conn.commit()
    # Verify in both information_schema and direct pg_attribute
    cur.execute(\"SELECT table_schema, column_name FROM information_schema.columns WHERE table_name='ride_requests' AND column_name='accessibility_requested'\")
    rows = cur.fetchall()
    print(f'[entrypoint] information_schema matches: {rows}')
    cur.execute(\"SELECT attname FROM pg_attribute JOIN pg_class ON attrelid=pg_class.oid JOIN pg_namespace ON relnamespace=pg_namespace.oid WHERE relname='ride_requests' AND attname='accessibility_requested' AND attnum > 0\")
    pg_rows = cur.fetchall()
    print(f'[entrypoint] pg_attribute matches: {pg_rows}')
    exists = bool(pg_rows)
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
echo "[entrypoint] Verifying columns via SQLAlchemy engine..."
python3 -c "
import os, sys, re
from sqlalchemy import create_engine, text
url = os.environ['DATABASE_URL']
url = re.sub(r'^postgres://', 'postgresql://', url)
engine = create_engine(url, connect_args={'options': '-c statement_timeout=5000'})
with engine.connect() as conn:
    result = conn.execute(text(\"SELECT inet_server_addr(), current_database()\"))
    host, db = result.fetchone()
    print(f'[entrypoint] SQLAlchemy engine: db={db} host={host}')
    result2 = conn.execute(text(\"SELECT attname FROM pg_attribute JOIN pg_class ON attrelid=pg_class.oid WHERE relname='ride_requests' AND attname='accessibility_requested' AND attnum > 0\"))
    row = result2.fetchone()
    if row:
        print('[entrypoint] SQLAlchemy sees accessibility_requested: YES')
    else:
        print('[entrypoint] SQLAlchemy sees accessibility_requested: NO — schema mismatch!', file=sys.stderr)
        sys.exit(1)
" && echo "[entrypoint] Migrations complete. Starting uvicorn..."

exec uvicorn main_new:app \
  --host 0.0.0.0 \
  --port 8080 \
  --workers 4 \
  --loop uvloop \
  --http httptools \
  --no-access-log \
  --proxy-headers \
  --forwarded-allow-ips "*"
