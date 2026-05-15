#!/usr/bin/env bash
# Phase 54.5 smoke — zietra-crm-api
# Schema: crm (or _dryrun_crm in dry-run mode)
# APIGW: fzonke39pf.execute-api.us-east-1.amazonaws.com (HTTP API named "zietra-api" in console — but routes to zietra-crm-api Lambda)
# Health endpoints discovered: GET / returns service banner, GET /ping returns "Healthy Connection"
# (NOTE: GET /health returns 503 when Supabase pooler is slow — use /ping as canary instead)
# DB row-count parity: crm.contacts
# Sentinel write: INSERT-then-DELETE in crm.bookings (only if SMOKE_WRITE=1)
set -euo pipefail

source /tmp/aurora-cutover.env
MASTER_PW=$(aws secretsmanager get-secret-value --secret-id "$MASTER_SECRET_ARN" \
  --region us-east-1 --query SecretString --output text | jq -r .password)

SCHEMA_PREFIX="${SMOKE_SCHEMA_PREFIX:-}"   # '_dryrun_' for dry-run, '' for production
CRM_SCHEMA="${SCHEMA_PREFIX}crm"

echo "[smoke-zietra-crm] schema=$CRM_SCHEMA SMOKE_WRITE=${SMOKE_WRITE:-0}"

# ============ READ smoke: HTTP /ping (Lambda warmth canary, no DB dependency) ============
HTTP_PING=$(curl -fsS https://fzonke39pf.execute-api.us-east-1.amazonaws.com/ping)
[ "$HTTP_PING" = "Healthy Connection" ] \
  || { echo "FAIL: zietra-crm-api /ping (got: $HTTP_PING)"; exit 1; }
echo "  HTTP /ping: $HTTP_PING"

# ============ DB row-count parity check on crm.contacts ============
EXPECTED=$(grep "^crm.contacts," /tmp/supabase-baseline-counts.csv | cut -d, -f2)
ACTUAL=$(docker run --rm -e PGPASSWORD="$MASTER_PW" postgres:17 psql \
  -h "$WRITER" -U zietra_admin -d zietra -At -c \
  "SELECT count(*) FROM ${CRM_SCHEMA}.contacts;" 2>/dev/null)
[ "$EXPECTED" = "$ACTUAL" ] || { \
  echo "FAIL: ${CRM_SCHEMA}.contacts expected=$EXPECTED actual=$ACTUAL"; exit 1; }
echo "  ${CRM_SCHEMA}.contacts row-count parity: $ACTUAL (matches baseline)"

# ============ Sentinel write (skipped in dry-run; SMOKE_WRITE=1 to enable) ============
if [ "${SMOKE_WRITE:-0}" = "1" ]; then
  SENTINEL="SMOKE-545-$(date +%s)"
  # Use bookings table (low-stakes, write-frequent in normal CRM use)
  BOOKING_ID=$(docker run --rm -e PGPASSWORD="$MASTER_PW" postgres:17 psql \
    -h "$WRITER" -U zietra_admin -d zietra -At -v ON_ERROR_STOP=1 -c \
    "INSERT INTO ${CRM_SCHEMA}.bookings (id, link_id, name, email, scheduled_at, duration_minutes, created_at) \
     SELECT gen_random_uuid(), id, '$SENTINEL', 'smoke@local.test', now(), 15, now() \
     FROM ${CRM_SCHEMA}.booking_links LIMIT 1 RETURNING id;" 2>/dev/null)
  [ -n "$BOOKING_ID" ] || { echo "FAIL: crm sentinel booking insert returned no id"; exit 1; }
  docker run --rm -e PGPASSWORD="$MASTER_PW" postgres:17 psql \
    -h "$WRITER" -U zietra_admin -d zietra -c \
    "DELETE FROM ${CRM_SCHEMA}.bookings WHERE id='$BOOKING_ID';" >/dev/null
  echo "  sentinel write+delete OK ($BOOKING_ID)"
fi

echo "PASS: zietra-crm-api"
