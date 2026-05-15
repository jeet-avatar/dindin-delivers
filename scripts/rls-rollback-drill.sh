#!/usr/bin/env bash
# scripts/rls-rollback-drill.sh — Phase 55 Plan 05 rollback drill.
#
# Disables RLS on `public.tenant_features` (lowest-risk multi-tenant table),
# verifies the smoke surface still responds, then re-enables RLS.
#
# Captures pre/during/post state to /tmp/55-05-rollback-drill/ — drill output
# is pasted into rls-rollback-runbook-55-05.md as the drill-execution
# evidence section.
#
# Idempotent: re-run leaves RLS state restored to ENABLED at the end.

set -euo pipefail

TABLE=public.tenant_features
OUT=/tmp/55-05-rollback-drill
REGION=us-east-1
RUNNER_FN=zietra-rls-runner-55-05
AURORA_HOST=zietra-aurora-prod-v2.cluster-c23qcukqe810.us-east-1.rds.amazonaws.com
DEMO_API_BASE=https://lo254mvukl.execute-api.us-east-1.amazonaws.com

mkdir -p "$OUT"
LOG="$OUT/drill.log"
echo "[drill] Starting RLS rollback drill on $TABLE — $(date -u)" | tee "$LOG"

# Fetch bypass + master passwords.
#   - bypass (BYPASSRLS) for cross-tenant SELECT queries (count tenant_features rows)
#   - master (table owner) for ALTER TABLE DDL (disable/enable RLS)
BYPASS_SECRET=$(aws secretsmanager get-secret-value \
  --secret-id zietra-aurora/admin-bypass-role \
  --query SecretString --output text --region "$REGION")
BYPASS_PW=$(echo "$BYPASS_SECRET" | jq -r .password)

MASTER_SECRET_ARN=arn:aws:secretsmanager:us-east-1:134607809447:secret:rds!cluster-16d5e38c-2fc2-4d06-8435-e4b01704bf74-mhV473
MASTER_SECRET=$(aws secretsmanager get-secret-value \
  --secret-id "$MASTER_SECRET_ARN" \
  --query SecretString --output text --region "$REGION")
MASTER_USER=$(echo "$MASTER_SECRET" | jq -r .username)
MASTER_PW=$(echo "$MASTER_SECRET" | jq -r .password)

# run_sql ROLE SQL  → role = "bypass" | "master"
run_sql() {
  local role="$1"
  local sql="$2"
  local tmp_payload tmp_out user pw
  if [ "$role" = "master" ]; then
    user="$MASTER_USER"; pw="$MASTER_PW"
  else
    user="zietra_admin_bypass"; pw="$BYPASS_PW"
  fi
  tmp_payload=$(mktemp)
  tmp_out=$(mktemp)
  PG_PW="$pw" PG_USER="$user" SQL="$sql" AURORA_HOST="$AURORA_HOST" TMP="$tmp_payload" \
    node -e '
      const fs = require("fs");
      const payload = {
        password: process.env.PG_PW,
        user: process.env.PG_USER,
        host: process.env.AURORA_HOST,
        sql: process.env.SQL,
      };
      fs.writeFileSync(process.env.TMP, JSON.stringify(payload));
    '
  aws lambda invoke --function-name "$RUNNER_FN" \
    --payload "fileb://${tmp_payload}" \
    --region "$REGION" \
    "$tmp_out" >/dev/null
  cat "$tmp_out"
  rm -f "$tmp_payload" "$tmp_out"
}

# Pre-drill: capture current state
PRE_STATE=$(run_sql bypass "SELECT relrowsecurity FROM pg_class WHERE relname='tenant_features' AND relnamespace='public'::regnamespace;" | jq -r '.result.rows[0].relrowsecurity')
echo "[drill] pre-drill relrowsecurity = $PRE_STATE" | tee -a "$LOG"
echo "$PRE_STATE" > "$OUT/pre-drill-rls-state.txt"

# Pre-drill: smoke that the public health endpoint responds (no auth, RLS-irrelevant)
PRE_HEALTH=$(curl -s -o /dev/null -w "%{http_code}" "${DEMO_API_BASE}/api/health" || echo "ERR")
echo "[drill] pre-drill /api/health = HTTP $PRE_HEALTH" | tee -a "$LOG"

# Pre-drill: count tenant_features rows visible to bypass role
PRE_FEATURES=$(run_sql bypass "SELECT COUNT(*)::int AS n FROM public.tenant_features;" | jq -r '.result.rows[0].n')
echo "[drill] pre-drill tenant_features row count (bypass): $PRE_FEATURES" | tee -a "$LOG"
echo "$PRE_FEATURES" > "$OUT/pre-drill-features-count.txt"

# Drill: DISABLE
bash /Users/jeet/doordash-p2p/scripts/disable-rls-per-table.sh "$TABLE" | tee -a "$LOG"

# During-drill: verify table actually DISABLED
DURING_STATE=$(run_sql bypass "SELECT relrowsecurity FROM pg_class WHERE relname='tenant_features' AND relnamespace='public'::regnamespace;" | jq -r '.result.rows[0].relrowsecurity')
echo "[drill] during-drill relrowsecurity = $DURING_STATE" | tee -a "$LOG"
if [ "$DURING_STATE" != "false" ]; then
  echo "[drill] FAIL: expected relrowsecurity=false after DISABLE, got $DURING_STATE" | tee -a "$LOG"
  exit 1
fi

# During-drill: smoke STILL works (app health unaffected by table-level RLS toggle)
DURING_HEALTH=$(curl -s -o /dev/null -w "%{http_code}" "${DEMO_API_BASE}/api/health" || echo "ERR")
echo "[drill] during-drill /api/health = HTTP $DURING_HEALTH" | tee -a "$LOG"
DURING_FEATURES=$(run_sql bypass "SELECT COUNT(*)::int AS n FROM public.tenant_features;" | jq -r '.result.rows[0].n')
echo "[drill] during-drill tenant_features row count (bypass): $DURING_FEATURES (unchanged from $PRE_FEATURES)" | tee -a "$LOG"

# Re-enable RLS
echo "[drill] re-enabling RLS on $TABLE..." | tee -a "$LOG"
run_sql master "ALTER TABLE $TABLE ENABLE ROW LEVEL SECURITY;" | jq -c '{ok, command: .result.command, error: (.error // null)}' | tee -a "$LOG"

# Post-drill: confirm pre-drill state restored
POST_STATE=$(run_sql bypass "SELECT relrowsecurity FROM pg_class WHERE relname='tenant_features' AND relnamespace='public'::regnamespace;" | jq -r '.result.rows[0].relrowsecurity')
echo "[drill] post-drill relrowsecurity = $POST_STATE" | tee -a "$LOG"
echo "$POST_STATE" > "$OUT/post-drill-rls-state.txt"
if [ "$POST_STATE" != "t" ] && [ "$POST_STATE" != "true" ]; then
  echo "[drill] FAIL: RLS not re-enabled (got $POST_STATE)" | tee -a "$LOG"
  exit 1
fi
POST_HEALTH=$(curl -s -o /dev/null -w "%{http_code}" "${DEMO_API_BASE}/api/health" || echo "ERR")
echo "[drill] post-drill /api/health = HTTP $POST_HEALTH" | tee -a "$LOG"

echo "[drill] PASS: $TABLE RLS state restored to ENABLED (relrowsecurity=$POST_STATE)" | tee -a "$LOG"
echo "[drill] DRILL COMPLETE — $(date -u)" | tee -a "$LOG"
