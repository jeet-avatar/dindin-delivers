#!/usr/bin/env bash
# Phase 54.5 smoke — turion-satellite-api
# Schema: turion_satellite (or _dryrun_turion_satellite in dry-run mode)
# APIGW: rjydekliee.execute-api.us-east-1.amazonaws.com
# DB invariants: satellites=4 + part_definitions=165
# Sentinel write: INSERT-then-DELETE in part_definitions (only if SMOKE_WRITE=1)
set -euo pipefail

source /tmp/aurora-cutover.env
MASTER_PW=$(aws secretsmanager get-secret-value --secret-id "$MASTER_SECRET_ARN" \
  --region us-east-1 --query SecretString --output text | jq -r .password)

SCHEMA_PREFIX="${SMOKE_SCHEMA_PREFIX:-}"   # '_dryrun_' for dry-run, '' for production
SAT_SCHEMA="${SCHEMA_PREFIX}turion_satellite"

echo "[smoke-turion-satellite] schema=$SAT_SCHEMA SMOKE_WRITE=${SMOKE_WRITE:-0}"

# ============ READ smoke: HTTP health endpoint ============
HTTP_HEALTH=$(curl -fsS https://rjydekliee.execute-api.us-east-1.amazonaws.com/api/health)
echo "$HTTP_HEALTH" | jq -e '.db == "ok"' >/dev/null \
  || { echo "FAIL: turion-satellite-api /api/health (got: $HTTP_HEALTH)"; exit 1; }
echo "  HTTP /api/health: db=ok"

# ============ DB invariants — known counts (cross-checked from baseline csv) ============
EXP_SAT=$(grep "^turion_satellite.satellites," /tmp/supabase-baseline-counts.csv | cut -d, -f2)
EXP_PD=$(grep "^turion_satellite.part_definitions," /tmp/supabase-baseline-counts.csv | cut -d, -f2)

ACTUAL_SAT=$(docker run --rm -e PGPASSWORD="$MASTER_PW" postgres:17 psql \
  -h "$WRITER" -U zietra_admin -d zietra -At -c \
  "SELECT count(*) FROM ${SAT_SCHEMA}.satellites;" 2>/dev/null)
[ "$EXP_SAT" = "$ACTUAL_SAT" ] || { \
  echo "FAIL: ${SAT_SCHEMA}.satellites expected=$EXP_SAT actual=$ACTUAL_SAT"; exit 1; }
echo "  ${SAT_SCHEMA}.satellites count: $ACTUAL_SAT (matches baseline)"

ACTUAL_PD=$(docker run --rm -e PGPASSWORD="$MASTER_PW" postgres:17 psql \
  -h "$WRITER" -U zietra_admin -d zietra -At -c \
  "SELECT count(*) FROM ${SAT_SCHEMA}.part_definitions;" 2>/dev/null)
[ "$EXP_PD" = "$ACTUAL_PD" ] || { \
  echo "FAIL: ${SAT_SCHEMA}.part_definitions expected=$EXP_PD actual=$ACTUAL_PD"; exit 1; }
echo "  ${SAT_SCHEMA}.part_definitions count: $ACTUAL_PD (matches baseline)"

# ============ Sentinel write (skipped in dry-run; SMOKE_WRITE=1 to enable) ============
if [ "${SMOKE_WRITE:-0}" = "1" ]; then
  SENTINEL="SMOKE-545-$(date +%s)"
  PART_ID=$(docker run --rm -e PGPASSWORD="$MASTER_PW" postgres:17 psql \
    -h "$WRITER" -U zietra_admin -d zietra -At -v ON_ERROR_STOP=1 -c \
    "INSERT INTO ${SAT_SCHEMA}.part_definitions (part_number, description, default_make_buy) \
     VALUES ('$SENTINEL', 'smoke part', 'MAKE') RETURNING id;" 2>/dev/null)
  [ -n "$PART_ID" ] || { echo "FAIL: satellite sentinel insert returned no id"; exit 1; }
  docker run --rm -e PGPASSWORD="$MASTER_PW" postgres:17 psql \
    -h "$WRITER" -U zietra_admin -d zietra -c \
    "DELETE FROM ${SAT_SCHEMA}.part_definitions WHERE id='$PART_ID';" >/dev/null
  echo "  sentinel write+delete OK ($PART_ID)"
fi

echo "PASS: turion-satellite-api"
