#!/usr/bin/env bash
# scripts/disable-rls-per-table.sh — Phase 55 Plan 05 — emergency RLS disable.
#
# Idempotent. Disables Row-Level Security on the listed schema-qualified tables.
# Policies are PRESERVED — re-enable via:
#     ALTER TABLE <schema>.<table> ENABLE ROW LEVEL SECURITY;
#
# Usage:
#     bash scripts/disable-rls-per-table.sh public.tenant_features crm.bookings
#
# Connects to Aurora via the one-shot VPC Lambda pattern (Phase 55-01) using
# the `zietra_admin_bypass` Postgres role (BYPASSRLS).  Aurora is in private
# subnets; this script orchestrates a Lambda invocation rather than direct psql.
#
# Pre-requisites:
#   - /tmp/55-02-migration-runner/  exists with index.js + node_modules (zip artifact)
#   - aws CLI v1/v2 logged in to account 134607809447, region us-east-1
#   - jq + node available on operator machine
#   - Lambda SG → Aurora SG ingress rule exists (see rls-rollback-runbook-55-05.md §Pre-req-2)

set -euo pipefail

if [ $# -lt 1 ]; then
  echo "Usage: $0 schema.table [schema.table ...]" >&2
  exit 1
fi

REGION=us-east-1
RUNNER_FN=zietra-rls-runner-55-05
AURORA_HOST=zietra-aurora-prod-v2.cluster-c23qcukqe810.us-east-1.rds.amazonaws.com

# Fetch master credentials (zietra_admin is the table OWNER — required for ALTER TABLE).
# zietra_admin_bypass has BYPASSRLS but is NOT the owner; DDL operations must
# use the master role per Postgres ownership semantics.
MASTER_SECRET_ARN=arn:aws:secretsmanager:us-east-1:134607809447:secret:rds!cluster-16d5e38c-2fc2-4d06-8435-e4b01704bf74-mhV473
MASTER_SECRET=$(aws secretsmanager get-secret-value \
  --secret-id "$MASTER_SECRET_ARN" \
  --query SecretString --output text --region "$REGION")
MASTER_USER=$(echo "$MASTER_SECRET" | jq -r .username)
MASTER_PW=$(echo "$MASTER_SECRET" | jq -r .password)

for FQ in "$@"; do
  SCHEMA=$(echo "$FQ" | cut -d. -f1)
  TABLE=$(echo "$FQ" | cut -d. -f2)
  SQL="ALTER TABLE ${SCHEMA}.${TABLE} DISABLE ROW LEVEL SECURITY;"
  TMP=$(mktemp)
  MASTER_PW="$MASTER_PW" MASTER_USER="$MASTER_USER" SQL="$SQL" AURORA_HOST="$AURORA_HOST" TMP="$TMP" \
    node -e '
      const fs = require("fs");
      const payload = {
        password: process.env.MASTER_PW,
        user: process.env.MASTER_USER,
        host: process.env.AURORA_HOST,
        sql: process.env.SQL,
      };
      fs.writeFileSync(process.env.TMP, JSON.stringify(payload));
    '
  OUT=$(mktemp)
  aws lambda invoke --function-name "$RUNNER_FN" \
    --payload "fileb://${TMP}" \
    --region "$REGION" \
    "$OUT" >/dev/null
  OK=$(jq -r '.ok // false' "$OUT")
  ERR=$(jq -r '.error // ""' "$OUT")
  if [ "$OK" != "true" ]; then
    echo "[rls-disable] $FQ — FAILED: $ERR" >&2
    rm -f "$TMP" "$OUT"
    exit 1
  fi
  echo "[rls-disable] $FQ — DISABLED (policy 'tenant_isolation' preserved; re-enable trivially)"
  rm -f "$TMP" "$OUT"
done
