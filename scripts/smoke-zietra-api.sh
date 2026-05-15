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
  SENTINEL="SMOKE-545-$(date +%s)"
  # Use a low-stakes table — just confirm write+delete round-trip works.
  # Insert a fake feature row tied to first tenant.
  TENANT_ID=$(docker run --rm -e PGPASSWORD="$MASTER_PW" postgres:17 psql \
    -h "$WRITER" -U zietra_admin -d zietra -At -c \
    "SELECT id FROM ${PUBLIC_SCHEMA}.tenants LIMIT 1;" 2>/dev/null)
  docker run --rm -e PGPASSWORD="$MASTER_PW" postgres:17 psql \
    -h "$WRITER" -U zietra_admin -d zietra -v ON_ERROR_STOP=1 -c \
    "INSERT INTO ${PUBLIC_SCHEMA}.tenant_features (tenant_id, feature_key, enabled) \
     VALUES ('$TENANT_ID', '$SENTINEL', false);" >/dev/null
  COUNT=$(docker run --rm -e PGPASSWORD="$MASTER_PW" postgres:17 psql \
    -h "$WRITER" -U zietra_admin -d zietra -At -c \
    "SELECT count(*) FROM ${PUBLIC_SCHEMA}.tenant_features WHERE feature_key='$SENTINEL';" 2>/dev/null)
  [ "$COUNT" = "1" ] || { echo "FAIL: zietra sentinel missing"; exit 1; }
  docker run --rm -e PGPASSWORD="$MASTER_PW" postgres:17 psql \
    -h "$WRITER" -U zietra_admin -d zietra -c \
    "DELETE FROM ${PUBLIC_SCHEMA}.tenant_features WHERE feature_key='$SENTINEL';" >/dev/null
  echo "  sentinel write+delete OK"
fi

echo "PASS: zietra-api"
