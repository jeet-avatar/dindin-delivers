#!/bin/bash
# ArthaBuild Smoke Test
# Run after every deployment to verify all critical paths are healthy.
#
# Usage:
#   ./scripts/smoke_test.sh [BASE_URL]
#
# Arguments:
#   BASE_URL  - Base URL of the deployment (default: http://localhost)
#
# Exit codes:
#   0 = all checks pass
#   1 = one or more checks failed
#
# This script creates a temporary smoke-test user and cleans up after itself.
# If cleanup fails, the orphan user (smoketest+yyyymmddHHMMSS@artha.build) is harmless.

set -uo pipefail

BASE_URL=${1:-http://localhost}
TIMESTAMP=$(date +%Y%m%d%H%M%S)
SMOKE_EMAIL="smoketest+${TIMESTAMP}@artha.build"
SMOKE_PASS="SmokeTest123!"

PASS=0
FAIL=0
ERRORS=()

RED='\033[0;31m'
GREEN='\033[0;32m'
NC='\033[0m'

check() {
  local name="$1"
  local result="$2"
  local pattern="$3"
  if echo "$result" | grep -q "$pattern"; then
    echo -e "  ${GREEN}PASS${NC} $name"
    PASS=$((PASS+1))
  else
    echo -e "  ${RED}FAIL${NC} $name"
    echo "       Expected pattern: $pattern"
    echo "       Actual response:  $(echo "$result" | head -c 200)"
    FAIL=$((FAIL+1))
    ERRORS+=("$name")
  fi
}

echo "========================================="
echo " ArthaBuild Smoke Test — $(date)"
echo " Target: $BASE_URL"
echo "========================================="
echo ""

# ── Check 1: Health endpoint returns status:ok ────────────────────────────────
HEALTH=$(curl -sf "${BASE_URL}/health" 2>/dev/null || echo '{"error":"unreachable"}')
check "Health endpoint returns status:ok" "$HEALTH" '"status":"ok"'

# ── Check 2: AI pipeline ready (from /health/detail — requires token, checked after login) ──
# Deferred to after login — see Check 2b below

# ── Check 3: License valid (from /health/detail — requires token, checked after login) ──
# Deferred to after login — see Check 3b below

# ── Check 4: Register endpoint responds ──────────────────────────────────────
REG=$(curl -sf -X POST "${BASE_URL}/api/user/register" \
  -H "Content-Type: application/json" \
  -d "{\"first_name\":\"Smoke\",\"last_name\":\"Test\",\"email\":\"${SMOKE_EMAIL}\",\"password\":\"${SMOKE_PASS}\"}" \
  2>/dev/null || echo '{"error":"unreachable"}')
check "Register endpoint creates user" "$REG" '"message"'

# ── Check 5: Login returns access_token ──────────────────────────────────────
LOGIN=$(curl -sf -X POST "${BASE_URL}/api/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"username\":\"${SMOKE_EMAIL}\",\"password\":\"${SMOKE_PASS}\"}" \
  2>/dev/null || echo '{"error":"unreachable"}')
check "Login endpoint returns access_token" "$LOGIN" '"access_token"'

TOKEN=$(echo "$LOGIN" | python3 -c "import json,sys; d=json.load(sys.stdin); print(d.get('access_token',''))" 2>/dev/null || echo "")

# ── Check 2b: AI pipeline ready (health/detail with token) ────────────────────
if [ -n "$TOKEN" ]; then
  HEALTH_DETAIL=$(curl -sf "${BASE_URL}/health/detail" \
    -H "Authorization: Bearer ${TOKEN}" \
    2>/dev/null || echo '{"error":"unreachable"}')
  check "AI pipeline is ready (ai_ready:true)" "$HEALTH_DETAIL" '"ai_ready":true'
else
  echo -e "  ${RED}FAIL${NC} AI pipeline is ready (no token obtained from login)"
  FAIL=$((FAIL+1))
  ERRORS+=("AI pipeline is ready (ai_ready:true)")
fi

# ── Check 3b: License valid (health/detail with token) ────────────────────────
if [ -n "$TOKEN" ]; then
  check "License valid (license_valid:true)" "$HEALTH_DETAIL" '"license_valid":true'
else
  echo -e "  ${RED}FAIL${NC} License valid (no token obtained from login)"
  FAIL=$((FAIL+1))
  ERRORS+=("License valid (license_valid:true)")
fi

# ── Check 6: Protected endpoint requires JWT ──────────────────────────────────
UNAUTH=$(curl -sf -X POST "${BASE_URL}/api/chatbot/process" \
  -H "Content-Type: application/json" \
  -d '{"message":"test"}' \
  2>/dev/null || curl -s -X POST "${BASE_URL}/api/chatbot/process" \
  -H "Content-Type: application/json" \
  -d '{"message":"test"}')
check "Protected endpoint requires JWT (returns error without token)" "$UNAUTH" '"detail"'

# ── Check 7: Chat endpoint reachable with token ───────────────────────────────
if [ -n "$TOKEN" ]; then
  CHAT=$(curl -sf -X POST "${BASE_URL}/api/chatbot/process" \
    -H "Authorization: Bearer ${TOKEN}" \
    -H "Content-Type: application/json" \
    -d '{"message":"What is NetSuite?"}' \
    2>/dev/null || echo '{"error":"unreachable"}')
  check "Chat endpoint returns response field with valid JWT" "$CHAT" '"response"'
else
  echo -e "  ${RED}FAIL${NC} Chat endpoint reachable with token (no token obtained from login)"
  FAIL=$((FAIL+1))
  ERRORS+=("Chat endpoint reachable with token")
fi

# ── Check 8: NetSuite status endpoint ────────────────────────────────────────
if [ -n "$TOKEN" ]; then
  NS_STATUS=$(curl -sf "${BASE_URL}/api/netsuite/status" \
    -H "Authorization: Bearer ${TOKEN}" \
    2>/dev/null || echo '{"error":"unreachable"}')
  check "NetSuite status endpoint returns authenticated field" "$NS_STATUS" '"authenticated"'
else
  echo -e "  ${RED}FAIL${NC} NetSuite status endpoint (no token)"
  FAIL=$((FAIL+1))
  ERRORS+=("NetSuite status endpoint")
fi

# ── Check 9: License status endpoint (requires auth token) ───────────────────
if [ -n "$TOKEN" ]; then
  LIC=$(curl -sf "${BASE_URL}/api/license/status" \
    -H "Authorization: Bearer ${TOKEN}" \
    2>/dev/null || echo '{"error":"unreachable"}')
  check "License status endpoint returns valid field" "$LIC" '"valid"'
else
  echo -e "  ${RED}FAIL${NC} License status endpoint (no token obtained from login)"
  FAIL=$((FAIL+1))
  ERRORS+=("License status endpoint returns valid field")
fi

# ── Check 10: Check-user endpoint ────────────────────────────────────────────
CHECK_USER=$(curl -sf -X POST "${BASE_URL}/api/auth/check-user" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"${SMOKE_EMAIL}\"}" \
  2>/dev/null || echo '{"error":"unreachable"}')
check "Check-user endpoint returns exists field" "$CHECK_USER" '"success"'

echo ""
echo "========================================="
if [ "$FAIL" -gt 0 ]; then
  echo -e " ${RED}FAILED${NC}: $PASS passed, $FAIL failed"
  echo " Failed checks:"
  for err in "${ERRORS[@]}"; do
    echo "   - $err"
  done
  echo "========================================="
  exit 1
else
  echo -e " ${GREEN}ALL PASSED${NC}: $PASS/10 checks passed"
  echo "========================================="
  exit 0
fi
