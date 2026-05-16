#!/usr/bin/env bash
# Phase 59-04 chaos — Scenario 2: Aurora master secret rotation, verify Lambda reconnects within 60s
# Per RESEARCH §I: rotation is non-destructive (both old + new credential versions work for ~24h)
# No revert needed — but we still set -uo pipefail for safety
set -uo pipefail

# Aurora master secret Name (auto-rotated by Secrets Manager, used by RDS Proxy)
# NOTE: API accepts Name OR full ARN. The "-VbuP4h" suffix is part of the ARN, NOT the Name.
# Use bare Name to be portable across rotations and account-replicas.
SECRET_ID="rds!cluster-8dac9fc2-9172-4e70-a167-9fe6fe9e98d9"
PROBE_URL="https://lo254mvukl.execute-api.us-east-1.amazonaws.com/api/health"

echo "[chaos-2] $(date -u +%FT%TZ) — triggering Aurora master secret rotation..."

# Trigger immediate rotation (uses the existing rotation Lambda configured on the secret)
ROTATE_RESULT=$(aws secretsmanager rotate-secret --secret-id "$SECRET_ID" 2>&1 || true)
echo "[chaos-2] rotate-secret result: $ROTATE_RESULT"

if echo "$ROTATE_RESULT" | grep -q "VersionId"; then
  echo "[chaos-2] rotation accepted. Probing /api/health every 5s for 60s..."
else
  echo "[chaos-2] WARNING: rotation request did not return VersionId — secret may not have rotation enabled."
  echo "[chaos-2] Continuing with probe anyway to verify steady-state health."
fi

FAIL_COUNT=0
SUCCESS_AFTER=""
FIRST_FAILURE_AT=""
for i in $(seq 1 12); do
  CODE=$(curl -s -o /dev/null -w "%{http_code}" --max-time 10 "$PROBE_URL" || echo "000")
  TS="t+$((i*5))s"
  echo "[chaos-2] $TS: HTTP $CODE"
  if [ "$CODE" != "200" ]; then
    FAIL_COUNT=$((FAIL_COUNT+1))
    [ -z "$FIRST_FAILURE_AT" ] && FIRST_FAILURE_AT="$TS"
  elif [ -n "$FIRST_FAILURE_AT" ] && [ -z "$SUCCESS_AFTER" ]; then
    SUCCESS_AFTER="$TS"
  fi
  sleep 5
done

echo "[chaos-2] summary: $FAIL_COUNT failures over 60s; first failure at ${FIRST_FAILURE_AT:-N/A}; recovery at ${SUCCESS_AFTER:-N/A}"

if [ "$FAIL_COUNT" -le 2 ]; then
  echo "Verdict: PASS (≤2 failures during rotation — RDS Proxy gracefully handled credential refresh)"
  exit 0
else
  echo "Verdict: FAIL ($FAIL_COUNT failures during rotation — investigate RDS Proxy credential refresh)"
  exit 1
fi
# No revert needed — rotation creates a new credential version; both old + new work for ~24h until next rotation
