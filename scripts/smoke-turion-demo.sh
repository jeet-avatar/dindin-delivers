#!/usr/bin/env bash
# Phase 54.5 smoke — turion-demo-api
# Schema: turion (or _dryrun_turion in dry-run mode)
# APIGW: lo254mvukl.execute-api.us-east-1.amazonaws.com
# DB row-count parity: turion.audit_log
# Sentinel write: INSERT-then-DELETE in audit_log (only if SMOKE_WRITE=1)
set -euo pipefail

source /tmp/aurora-cutover.env
MASTER_PW=$(aws secretsmanager get-secret-value --secret-id "$MASTER_SECRET_ARN" \
  --region us-east-1 --query SecretString --output text | jq -r .password)

SCHEMA_PREFIX="${SMOKE_SCHEMA_PREFIX:-}"   # '_dryrun_' for dry-run, '' for production
TURION_SCHEMA="${SCHEMA_PREFIX}turion"

echo "[smoke-turion-demo] schema=$TURION_SCHEMA SMOKE_WRITE=${SMOKE_WRITE:-0}"

# ============ READ smoke: HTTP health endpoint ============
HTTP_HEALTH=$(curl -fsS https://lo254mvukl.execute-api.us-east-1.amazonaws.com/api/health)
echo "$HTTP_HEALTH" | jq -e '.db == "ok"' >/dev/null \
  || { echo "FAIL: turion-demo-api /api/health (got: $HTTP_HEALTH)"; exit 1; }
echo "  HTTP /api/health: db=ok"

# ============ DB row-count parity check ============
EXPECTED=$(grep "^turion.audit_log," /tmp/supabase-baseline-counts.csv | cut -d, -f2)
ACTUAL=$(docker run --rm -e PGPASSWORD="$MASTER_PW" postgres:17 psql \
  -h "$WRITER" -U zietra_admin -d zietra -At -c \
  "SELECT count(*) FROM ${TURION_SCHEMA}.audit_log;" 2>/dev/null)
[ "$EXPECTED" = "$ACTUAL" ] || { \
  echo "FAIL: ${TURION_SCHEMA}.audit_log expected=$EXPECTED actual=$ACTUAL"; exit 1; }
echo "  ${TURION_SCHEMA}.audit_log row-count parity: $ACTUAL (matches baseline)"

# ============ Sentinel write (skipped in dry-run; SMOKE_WRITE=1 to enable) ============
if [ "${SMOKE_WRITE:-0}" = "1" ]; then
  SENTINEL="SMOKE-545-$(date +%s)"
  docker run --rm -e PGPASSWORD="$MASTER_PW" postgres:17 psql \
    -h "$WRITER" -U zietra_admin -d zietra -v ON_ERROR_STOP=1 -c \
    "INSERT INTO ${TURION_SCHEMA}.audit_log (entity, entity_id, action, actor, after_data) \
     VALUES ('SMOKE_TEST', '$SENTINEL', 'cutover', 'smoke', '{}'::jsonb);" >/dev/null
  COUNT=$(docker run --rm -e PGPASSWORD="$MASTER_PW" postgres:17 psql \
    -h "$WRITER" -U zietra_admin -d zietra -At -c \
    "SELECT count(*) FROM ${TURION_SCHEMA}.audit_log WHERE entity_id='$SENTINEL';" 2>/dev/null)
  [ "$COUNT" = "1" ] || { echo "FAIL: turion sentinel missing"; exit 1; }
  docker run --rm -e PGPASSWORD="$MASTER_PW" postgres:17 psql \
    -h "$WRITER" -U zietra_admin -d zietra -c \
    "DELETE FROM ${TURION_SCHEMA}.audit_log WHERE entity_id='$SENTINEL';" >/dev/null
  echo "  sentinel write+delete OK"
fi

echo "PASS: turion-demo-api"
