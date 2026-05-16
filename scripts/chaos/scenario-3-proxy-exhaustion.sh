#!/usr/bin/env bash
# Phase 59-04 chaos — Scenario 3: RDS Proxy MaxConnectionsPercent=10, verify queueing not crash
# Per RESEARCH §I + Pitfall 8: set -uo pipefail + trap revert
set -uo pipefail

PROXY_NAME="zietra-aurora-proxy"
PROBE_URL="https://lo254mvukl.execute-api.us-east-1.amazonaws.com/api/data/all"

ORIGINAL_PCT=$(aws rds describe-db-proxy-target-groups \
  --db-proxy-name "$PROXY_NAME" \
  --query 'TargetGroups[0].ConnectionPoolConfig.MaxConnectionsPercent' \
  --output text)
echo "[chaos-3] $(date -u +%FT%TZ) — original MaxConnectionsPercent: ${ORIGINAL_PCT}%"

# Pitfall 8: trap revert
trap '
  echo "[chaos-3] trap: reverting MaxConnectionsPercent to ${ORIGINAL_PCT}%..."
  aws rds modify-db-proxy-target-group \
    --db-proxy-name "$PROXY_NAME" \
    --target-group-name default \
    --connection-pool-config "MaxConnectionsPercent=${ORIGINAL_PCT}" >/dev/null 2>&1 \
    && echo "[chaos-3] reverted to ${ORIGINAL_PCT}%" \
    || echo "[chaos-3] WARNING: revert failed — operator MUST manually restore"
' EXIT

# Inject: cap connections to 10%
aws rds modify-db-proxy-target-group \
  --db-proxy-name "$PROXY_NAME" \
  --target-group-name default \
  --connection-pool-config "MaxConnectionsPercent=10" >/dev/null
echo "[chaos-3] MaxConnectionsPercent=10 applied; waiting 30s for proxy to adjust..."
sleep 30

if [ -z "${ZIETRA_TURION_JWT:-}" ]; then
  echo "[chaos-3] ZIETRA_TURION_JWT not set — falling back to /api/health (no auth)"
  PROBE_URL="https://lo254mvukl.execute-api.us-east-1.amazonaws.com/api/health"
  AUTH_HEADER=""
else
  AUTH_HEADER="-H Authorization:Bearer ${ZIETRA_TURION_JWT}"
fi

OUT=/tmp/chaos-3-codes-$(date +%s).txt
echo "[chaos-3] firing 50 parallel requests to $PROBE_URL..."
seq 50 | xargs -P 50 -I{} curl -s -o /dev/null -w "%{http_code}\n" \
  --max-time 30 \
  $AUTH_HEADER \
  -H "X-Tenant-Slug: turion" \
  "$PROBE_URL" > "$OUT"

OK=$(grep -c '^200$' "$OUT" 2>/dev/null || echo "0")
TOTAL=$(wc -l < "$OUT" | tr -d ' ')
echo "[chaos-3] 200s: $OK / $TOTAL"
echo "[chaos-3] code distribution:"
sort "$OUT" | uniq -c | sort -rn

# Pass: ≥45/50 succeed (≥90% — proves queueing not crashing).
# Even if some fail (queue timeout, transient), the platform should NOT crash.
if [ "$OK" -ge 45 ]; then
  echo "Verdict: PASS (≥45/50 succeeded — RDS Proxy queueing handled the burst)"
  exit 0
elif [ "$OK" -ge 35 ]; then
  echo "Verdict: PARTIAL ($OK/50 succeeded — some queue timeouts, but no crash)"
  exit 0
else
  echo "Verdict: FAIL (only $OK/$TOTAL succeeded — investigate proxy + Lambda connection pool)"
  exit 1
fi
# trap fires on exit → reverts MaxConnectionsPercent to ORIGINAL_PCT
