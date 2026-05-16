#!/usr/bin/env bash
# Phase 59 cross-cutting smoke — verifies all 11 requirements + 4 plans
# Run from operator's machine. Some checks gracefully skip if ZIETRA_TURION_JWT absent.
set -uo pipefail

HOST="https://zietra.com"
TURION_ERP="https://lo254mvukl.execute-api.us-east-1.amazonaws.com"
TURION_SAT="https://rjydekliee.execute-api.us-east-1.amazonaws.com"
JWT="${ZIETRA_TURION_JWT:-}"
MARKETING_DIR="${ZIETRA_MARKETING_DIR:-/Users/jeet/zietra/marketing}"

PASS=0; FAIL=0; SKIP=0
RESULTS=""
check() {
  local name="$1"; local expected="$2"; local actual="$3"
  if [ "$actual" = "$expected" ]; then
    PASS=$((PASS+1))
    RESULTS+="OK   $name ($actual)\n"
  else
    FAIL=$((FAIL+1))
    RESULTS+="FAIL $name (expected=$expected, got=$actual)\n"
  fi
}
skip() {
  local name="$1"; local reason="$2"
  SKIP=$((SKIP+1))
  RESULTS+="SKIP $name ($reason)\n"
}

echo "=== Phase 59 cross-cutting smoke — $(date -u +%FT%TZ) ==="

# === 59-01: SES VPCE ===
VPCE_STATE=$(aws ec2 describe-vpc-endpoints \
  --filters Name=service-name,Values=com.amazonaws.us-east-1.email Name=vpc-id,Values=vpc-012ab4500dcd4ee41 \
  --query 'VpcEndpoints[0].State' --output text 2>/dev/null || echo "missing")
check "59-01 SES VPCE state" "available" "$VPCE_STATE"

# === 59-01: /api/contact 200 ===
CONTACT_CODE=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$TURION_ERP/api/contact" \
  -H "Origin: $HOST" -H "Content-Type: application/json" \
  -d '{"name":"phase-59 smoke","email":"jeetnair.in+phase-59-smoke@gmail.com","intent":"support","message":"phase 59 smoke ten chars"}' --max-time 15)
check "59-01 POST /api/contact returns 200" "200" "$CONTACT_CODE"

# === 59-01: [contact] SES delivered log present (wait 30s then check) ===
echo "[smoke] waiting 30s for SES delivered log..."
sleep 30
SES_LOG=$(aws logs filter-log-events --log-group-name /aws/lambda/turion-demo-api \
  --filter-pattern '"[contact] SES delivered"' --max-items 1 \
  --start-time $(($(date +%s) - 300))000 --query 'events[0].message' --output text 2>/dev/null || echo "None")
SES_PRESENT="missing"
[ -n "$SES_LOG" ] && [ "$SES_LOG" != "None" ] && SES_PRESENT="present"
check "59-01 [contact] SES delivered log present" "present" "$SES_PRESENT"

# === 59-01: audit_log_v2 table + FORCE RLS (DB-direct via psql) ===
# Aurora proxy is in private VPC (10.x address space) — not reachable from operator machine.
# Skip unless ZIETRA_DB_VIA_BASTION=1 is set (operator-with-bastion scenario).
PSQL=$(command -v psql || command -v /opt/homebrew/bin/psql || echo "missing")
if [ "${ZIETRA_DB_VIA_BASTION:-0}" = "1" ] && [ "$PSQL" != "missing" ]; then
  MASTER_PW=$(aws secretsmanager get-secret-value \
    --secret-id 'rds!cluster-8dac9fc2-9172-4e70-a167-9fe6fe9e98d9' \
    --region us-east-1 --query 'SecretString' --output text 2>/dev/null \
    | python3 -c 'import json,sys; print(json.loads(sys.stdin.read())["password"])' 2>/dev/null || echo "")
  if [ -n "$MASTER_PW" ]; then
    RLS=$(PGPASSWORD="$MASTER_PW" "$PSQL" \
      -h zietra-aurora-proxy.proxy-c23qcukqe810.us-east-1.rds.amazonaws.com \
      -U zietra_admin -d zietra -t -c \
      "SELECT relrowsecurity::text || '|' || relforcerowsecurity::text FROM pg_class WHERE relname='audit_log_v2';" \
      2>/dev/null | tr -d ' \n' || echo "error")
    check "59-01 audit_log_v2 RLS+FORCE" "t|t" "$RLS"
    unset MASTER_PW
  else
    skip "59-01 audit_log_v2 RLS+FORCE" "could not retrieve master password"
  fi
else
  skip "59-01 audit_log_v2 RLS+FORCE" "Aurora in private VPC; set ZIETRA_DB_VIA_BASTION=1 to test via bastion (DB-direct verified in 59-01 SUMMARY)"
fi

# === 59-02: CloudWatch dashboard ===
WIDGET_COUNT=$(aws cloudwatch get-dashboard --dashboard-name zietra-prod-overview \
  --query 'DashboardBody' --output text 2>/dev/null \
  | jq '.widgets | length' 2>/dev/null || echo "0")
if [ "$WIDGET_COUNT" -ge 11 ] 2>/dev/null; then
  check "59-02 dashboard widgets >=11" "ok" "ok"
else
  check "59-02 dashboard widgets >=11" "ok" "got=$WIDGET_COUNT"
fi

# === 59-02: status page ===
STATUS_CODE=$(curl -s -o /dev/null -w "%{http_code}" --max-time 10 https://status.zietra.com)
check "59-02 https://status.zietra.com" "200" "$STATUS_CODE"
STATUS_JSON_OK=$(curl -s --max-time 10 https://status.zietra.com/api/status \
  | jq -r 'if (.overall_status // .status) and (.components // .checks) then "ok" else "bad" end' 2>/dev/null || echo "bad")
check "59-02 /api/status JSON shape" "ok" "$STATUS_JSON_OK"

# === 59-02: /api/audit-log (admin) ===
if [ -n "$JWT" ]; then
  AUDIT_CODE=$(curl -s -o /dev/null -w "%{http_code}" --max-time 10 "$TURION_ERP/api/audit-log" \
    -H "Authorization: Bearer $JWT" -H "X-Tenant-Slug: turion")
  check "59-02 /api/audit-log (admin)" "200" "$AUDIT_CODE"
else
  skip "59-02 /api/audit-log (admin)" "ZIETRA_TURION_JWT not set"
fi
AUDIT_UNAUTH=$(curl -s -o /dev/null -w "%{http_code}" --max-time 10 \
  -H "X-Tenant-Slug: turion" \
  "$TURION_ERP/api/audit-log")
check "59-02 /api/audit-log (unauth + tenant → 401)" "401" "$AUDIT_UNAUTH"

# === 59-03: /docs/api ===
DOCS_API_CODE=$(curl -s -o /dev/null -w "%{http_code}" --max-time 10 "$HOST/docs/api")
check "59-03 /docs/api" "200" "$DOCS_API_CODE"
OPENAPI_PATHS=$(curl -s --max-time 10 "$HOST/docs/openapi.yaml" 2>/dev/null | grep -cE "^  /" || echo "0")
if [ "$OPENAPI_PATHS" -ge 30 ] 2>/dev/null; then
  check "59-03 openapi paths >=30" "ok" "ok"
else
  check "59-03 openapi paths >=30" "ok" "got=$OPENAPI_PATHS"
fi

# === 59-03: per-module OG images (13 modules) ===
for slug in crm sales purchase items plm mes quality lean-erp-pro asc606 royalty dropship ai-agents qb-migration; do
  CODE=$(curl -s -o /dev/null -w "%{http_code}" --max-time 10 "$HOST/og/modules/$slug.png")
  CT=$(curl -sI --max-time 10 "$HOST/og/modules/$slug.png" | grep -i '^content-type' | awk -F': ' '{print $2}' | tr -d '\r' | head -c 9)
  check "59-03 OG /og/modules/$slug.png 200" "200" "$CODE"
  check "59-03 OG /og/modules/$slug.png content-type" "image/png" "$CT"
done

# === 59-03: per-case-study OG images (3) ===
for slug in turion-space marquee-anni sample-saas-svc; do
  CODE=$(curl -s -o /dev/null -w "%{http_code}" --max-time 10 "$HOST/og/case-studies/$slug.png")
  check "59-03 OG /og/case-studies/$slug.png 200" "200" "$CODE"
done

# === 59-03: PageHelmet usage in all page components ===
if [ -d "$MARKETING_DIR/src/pages" ]; then
  MISSING=$(grep -L "PageHelmet" "$MARKETING_DIR"/src/pages/*.tsx 2>/dev/null | wc -l | tr -d ' ')
  check "59-03 PageHelmet retrofit (0 missing)" "0" "$MISSING"
  INLINE=$(grep -lE "from 'react-helmet-async'" "$MARKETING_DIR"/src/pages/*.tsx 2>/dev/null | grep -v NotFoundPage | wc -l | tr -d ' ')
  check "59-03 inline-Helmet count (0 non-exception)" "0" "$INLINE"
else
  skip "59-03 PageHelmet retrofit" "$MARKETING_DIR not found"
fi

# === 59-04: chaos scripts exist + use trap+set -uo pipefail ===
for f in /Users/jeet/doordash-p2p/scripts/chaos/scenario-*.sh; do
  base=$(basename "$f")
  if grep -q "set -uo pipefail" "$f"; then
    check "59-04 $base has set -uo pipefail" "ok" "ok"
  else
    check "59-04 $base has set -uo pipefail" "ok" "missing"
  fi
  case "$base" in
    scenario-2-*) ;;
    *)
      if grep -q "^trap " "$f"; then
        check "59-04 $base has trap revert" "ok" "ok"
      else
        check "59-04 $base has trap revert" "ok" "missing"
      fi
      ;;
  esac
done

# === 59-04: production state baseline (post-chaos sanity) ===
TIMEOUT=$(aws lambda get-function-configuration --function-name turion-demo-api --query Timeout --output text 2>/dev/null || echo "?")
check "59-04 Lambda timeout (post-chaos)" "30" "$TIMEOUT"
PROXY_PCT=$(aws rds describe-db-proxy-target-groups --db-proxy-name zietra-aurora-proxy \
  --query 'TargetGroups[0].ConnectionPoolConfig.MaxConnectionsPercent' --output text 2>/dev/null || echo "?")
check "59-04 RDS Proxy MaxConn% (post-chaos)" "100" "$PROXY_PCT"

# === Cleanup smoke contact submission ===
# Only attempted via bastion — Aurora is private VPC. Operator can manually clean
# via the audit-log UI or via the bastion psql.
if [ "${ZIETRA_DB_VIA_BASTION:-0}" = "1" ] && [ "$PSQL" != "missing" ]; then
  MASTER_PW=$(aws secretsmanager get-secret-value \
    --secret-id 'rds!cluster-8dac9fc2-9172-4e70-a167-9fe6fe9e98d9' \
    --region us-east-1 --query 'SecretString' --output text 2>/dev/null \
    | python3 -c 'import json,sys; print(json.loads(sys.stdin.read())["password"])' 2>/dev/null || echo "")
  if [ -n "$MASTER_PW" ]; then
    PGPASSWORD="$MASTER_PW" "$PSQL" \
      -h zietra-aurora-proxy.proxy-c23qcukqe810.us-east-1.rds.amazonaws.com \
      -U zietra_admin -d zietra \
      -c "DELETE FROM public.contact_submissions WHERE email LIKE 'jeetnair.in+phase-59-smoke%';" 2>/dev/null \
      && echo "[smoke] cleaned up test contact submission"
    unset MASTER_PW
  fi
fi

echo -e "$RESULTS"
echo "=== $PASS pass, $FAIL fail, $SKIP skip ==="
echo -e "$RESULTS" > /tmp/phase-59-smoke-results.txt
echo "=== $PASS pass, $FAIL fail, $SKIP skip ===" >> /tmp/phase-59-smoke-results.txt
[ "$FAIL" = "0" ]
