#!/usr/bin/env bash
# Phase 54.5 smoke — zietra-api
# Schema: public (or _dryrun_public in dry-run mode)
# APIGW: zietra-api Lambda has NO active APIGW integration as of 2026-05-15
#        (Lambda exists with env vars + nodejs20 runtime, but no route mounts it).
#        Phase 53/54.1 contract endpoint /api/tenants/current is NOT live anywhere.
#        Smoke is therefore DB-direct only — no HTTP probe.
# DB invariants: tenants=3 + tenant_users=6 + tenant_features=39 (per baseline)
# Sentinel write: INSERT-then-DELETE in tenant_features (only if SMOKE_WRITE=1)
set -euo pipefail

source /tmp/aurora-cutover.env
MASTER_PW=$(aws secretsmanager get-secret-value --secret-id "$MASTER_SECRET_ARN" \
  --region us-east-1 --query SecretString --output text | jq -r .password)

SCHEMA_PREFIX="${SMOKE_SCHEMA_PREFIX:-}"   # '_dryrun_' for dry-run, '' for production
PUBLIC_SCHEMA="${SCHEMA_PREFIX}public"

echo "[smoke-zietra-api] schema=$PUBLIC_SCHEMA SMOKE_WRITE=${SMOKE_WRITE:-0}"

# ============ Lambda HTTP probe — SKIPPED ============
# Rationale: zietra-api Lambda exists but has no APIGW integration as of phase 54.5-02.
# When 54.1 Wave 2 lands the invite endpoints, this section can be filled in.
echo "  HTTP probe: SKIPPED (zietra-api Lambda has no live APIGW route)"

# ============ DB invariants (Phase 53/54.1 contracts) ============
# Read directly against the schema. Same query path the Lambda would use post-cutover.
EXP_TENANTS=$(grep "^public.tenants," /tmp/supabase-baseline-counts.csv | cut -d, -f2)
EXP_USERS=$(grep "^public.tenant_users," /tmp/supabase-baseline-counts.csv | cut -d, -f2)
EXP_FEATURES=$(grep "^public.tenant_features," /tmp/supabase-baseline-counts.csv | cut -d, -f2)

ACTUAL_TENANTS=$(docker run --rm -e PGPASSWORD="$MASTER_PW" postgres:17 psql \
  -h "$WRITER" -U zietra_admin -d zietra -At -c \
  "SELECT count(*) FROM ${PUBLIC_SCHEMA}.tenants;" 2>/dev/null)
[ "$EXP_TENANTS" = "$ACTUAL_TENANTS" ] || { \
  echo "FAIL: ${PUBLIC_SCHEMA}.tenants expected=$EXP_TENANTS actual=$ACTUAL_TENANTS"; exit 1; }
echo "  ${PUBLIC_SCHEMA}.tenants count: $ACTUAL_TENANTS (matches baseline)"

ACTUAL_USERS=$(docker run --rm -e PGPASSWORD="$MASTER_PW" postgres:17 psql \
  -h "$WRITER" -U zietra_admin -d zietra -At -c \
  "SELECT count(*) FROM ${PUBLIC_SCHEMA}.tenant_users;" 2>/dev/null)
[ "$EXP_USERS" = "$ACTUAL_USERS" ] || { \
  echo "FAIL: ${PUBLIC_SCHEMA}.tenant_users expected=$EXP_USERS actual=$ACTUAL_USERS"; exit 1; }
echo "  ${PUBLIC_SCHEMA}.tenant_users count: $ACTUAL_USERS (matches baseline)"

ACTUAL_FEATURES=$(docker run --rm -e PGPASSWORD="$MASTER_PW" postgres:17 psql \
  -h "$WRITER" -U zietra_admin -d zietra -At -c \
  "SELECT count(*) FROM ${PUBLIC_SCHEMA}.tenant_features;" 2>/dev/null)
[ "$EXP_FEATURES" = "$ACTUAL_FEATURES" ] || { \
  echo "FAIL: ${PUBLIC_SCHEMA}.tenant_features expected=$EXP_FEATURES actual=$ACTUAL_FEATURES"; exit 1; }
echo "  ${PUBLIC_SCHEMA}.tenant_features count: $ACTUAL_FEATURES (matches baseline)"

# ============ Sentinel write (skipped in dry-run; SMOKE_WRITE=1 to enable) ============
if [ "${SMOKE_WRITE:-0}" = "1" ]; then
  # tenant_features has a CHECK constraint locking module_code to 13 valid values
  # AND a composite PK (tenant_id, module_code) — INSERT-of-fake-module is impossible.
  # Use UPDATE-then-revert pattern instead: toggle expires_at on a real row, verify, restore.
  TARGET=$(docker run --rm -e PGPASSWORD="$MASTER_PW" postgres:17 psql \
    -h "$WRITER" -U zietra_admin -d zietra -At -c \
    "SELECT tenant_id || '|' || module_code FROM ${PUBLIC_SCHEMA}.tenant_features ORDER BY enabled_at LIMIT 1;" \
    2>/dev/null | head -n 1)
  TENANT_ID="${TARGET%%|*}"
  MODULE_CODE="${TARGET##*|}"
  [ -n "$TENANT_ID" ] && [ -n "$MODULE_CODE" ] || { echo "FAIL: no tenant_features row to write-test against"; exit 1; }

  SENTINEL_TS="2099-01-01T00:00:00Z"
  # Capture original
  ORIGINAL=$(docker run --rm -e PGPASSWORD="$MASTER_PW" postgres:17 psql \
    -h "$WRITER" -U zietra_admin -d zietra -At -c \
    "SELECT COALESCE(expires_at::text, 'NULL') FROM ${PUBLIC_SCHEMA}.tenant_features WHERE tenant_id='$TENANT_ID' AND module_code='$MODULE_CODE';" \
    2>/dev/null | head -n 1)

  # UPDATE: set expires_at to a sentinel value
  docker run --rm -e PGPASSWORD="$MASTER_PW" postgres:17 psql \
    -h "$WRITER" -U zietra_admin -d zietra -v ON_ERROR_STOP=1 -c \
    "UPDATE ${PUBLIC_SCHEMA}.tenant_features SET expires_at='$SENTINEL_TS' WHERE tenant_id='$TENANT_ID' AND module_code='$MODULE_CODE';" >/dev/null

  # Verify the write took
  VERIFY=$(docker run --rm -e PGPASSWORD="$MASTER_PW" postgres:17 psql \
    -h "$WRITER" -U zietra_admin -d zietra -At -c \
    "SELECT to_char(expires_at, 'YYYY') FROM ${PUBLIC_SCHEMA}.tenant_features WHERE tenant_id='$TENANT_ID' AND module_code='$MODULE_CODE';" \
    2>/dev/null | head -n 1)
  [ "$VERIFY" = "2099" ] || { echo "FAIL: zietra sentinel UPDATE not visible (got '$VERIFY')"; exit 1; }

  # Revert
  if [ "$ORIGINAL" = "NULL" ]; then
    docker run --rm -e PGPASSWORD="$MASTER_PW" postgres:17 psql \
      -h "$WRITER" -U zietra_admin -d zietra -c \
      "UPDATE ${PUBLIC_SCHEMA}.tenant_features SET expires_at=NULL WHERE tenant_id='$TENANT_ID' AND module_code='$MODULE_CODE';" >/dev/null
  else
    docker run --rm -e PGPASSWORD="$MASTER_PW" postgres:17 psql \
      -h "$WRITER" -U zietra_admin -d zietra -c \
      "UPDATE ${PUBLIC_SCHEMA}.tenant_features SET expires_at='$ORIGINAL' WHERE tenant_id='$TENANT_ID' AND module_code='$MODULE_CODE';" >/dev/null
  fi
  echo "  sentinel UPDATE+revert OK on ($TENANT_ID, $MODULE_CODE)"
fi

echo "PASS: zietra-api"
