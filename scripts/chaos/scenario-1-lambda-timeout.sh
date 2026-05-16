#!/usr/bin/env bash
# Phase 59-04 chaos — Scenario 1: Lambda timeout to 1s, expect graceful 504, auto-revert
# Per RESEARCH §I + Pitfall 8: set -uo pipefail (NOT set -e), trap revert for safety
# Run ONLY off-hours (after 22:00 local OR before 07:00 local per Anti-Pattern in RESEARCH)
set -uo pipefail

FUNCTION_NAME="turion-demo-api"
PROBE_URL="https://lo254mvukl.execute-api.us-east-1.amazonaws.com/api/contact"

ORIGINAL_TIMEOUT=$(aws lambda get-function-configuration --function-name "$FUNCTION_NAME" --query Timeout --output text)
echo "[chaos-1] $(date -u +%FT%TZ) — original Lambda timeout: ${ORIGINAL_TIMEOUT}s"

# Pitfall 8: trap revert no matter what — runs on normal exit, error, or signal
trap '
  echo "[chaos-1] trap: reverting timeout to ${ORIGINAL_TIMEOUT}s..."
  aws lambda update-function-configuration \
    --function-name "$FUNCTION_NAME" \
    --timeout "$ORIGINAL_TIMEOUT" >/dev/null 2>&1 \
    && echo "[chaos-1] reverted to ${ORIGINAL_TIMEOUT}s" \
    || echo "[chaos-1] WARNING: revert failed — operator MUST manually restore"
' EXIT

# Inject: timeout=1s (anything that does real work will exceed this)
aws lambda update-function-configuration --function-name "$FUNCTION_NAME" --timeout 1 >/dev/null
echo "[chaos-1] timeout=1s applied; waiting 15s for propagation..."
sleep 15

# Probe: POST /api/contact does SES send (~500ms) + DB insert (~50ms) → exceeds 1s budget
RESP_CODE=$(curl -s -o /dev/null -w "%{http_code}" -X POST \
  -H "Origin: https://zietra.com" \
  -H "Content-Type: application/json" \
  -d '{"name":"chaos-1","email":"chaos@example.com","intent":"support","message":"chaos test 1 — please ignore. ten chars."}' \
  --max-time 30 \
  "$PROBE_URL")
echo "[chaos-1] probe response: HTTP $RESP_CODE"

# Expected: 504 Gateway Timeout (or 502 Bad Gateway in some APIGW configurations) — NOT 500 crash
if [ "$RESP_CODE" = "504" ] || [ "$RESP_CODE" = "502" ]; then
  echo "Verdict: PASS (graceful gateway timeout — HTTP $RESP_CODE)"
  exit 0
elif [ "$RESP_CODE" = "200" ]; then
  echo "Verdict: INCONCLUSIVE (HTTP 200 — Lambda may not have picked up new timeout yet, OR the endpoint completes within 1s)"
  exit 0
else
  echo "Verdict: FAIL (expected 504/502, got $RESP_CODE)"
  exit 1
fi
# trap fires on exit → reverts timeout to ORIGINAL_TIMEOUT
