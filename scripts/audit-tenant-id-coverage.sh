#!/usr/bin/env bash
# scripts/audit-tenant-id-coverage.sh — Phase 55-01 prerequisite
#
# Audits tenant_id column presence + NULL row counts across all 4 schemas:
#   public, crm, turion, turion_satellite
#
# Outputs:
#   /tmp/audit-A1-columns.csv     — per-table column presence + size
#   /tmp/audit-A2-rowcounts.csv   — per-table live row count
#   /tmp/audit-A3-nulls.txt       — NOTICE lines for tables with NULL tenant_id rows
#
# ⚠️ KNOWN ISSUE — direct psql does NOT work post-54.6 VPC migration.
# Aurora cluster `zietra-aurora-prod-v2` lives in PRIVATE subnets only
# (subnet-052ed80f6904b9fe7 / subnet-07893035668f1b015, both MapPublicIpOnLaunch=false,
# no IGW route on PRIV_RT). Setting `publicly-accessible=true` on the writer instance
# flips public DNS to a public IP but the underlying ENI is still in a private subnet
# with no route to the internet, so TCP from the operator's laptop times out.
#
# Phase 55-01 worked around this by deploying a one-shot VPC-attached Lambda
# (`zietra-tenant-id-audit-oneshot`, runtime=nodejs20.x, in subnets/SG matching
# turion-demo-api) that ran the audit queries via the RDS Proxy and returned JSON,
# then deleted itself post-audit. See 55-01-audit-report.md for the JSON output.
#
# This script is kept as a REFERENCE for the SQL queries (A.1, A.2, A.3) and as a
# starting point IF private-subnet psql becomes viable later (e.g., via SSM Session
# Manager + a public-subnet bastion EC2). For now, the canonical audit method is
# the one-shot Lambda pattern — see 55-01-SUMMARY.md for the full recipe.
#
# Strategy (RESERVED for future operator-IP /32 access pattern):
#   1. Source vpc-migration.handoff.sh for env vars (NEW_CLUSTER, NEW_ENDPOINT,
#      NEW_MASTER_SECRET_ARN, AURORA_NEW_SG)
#   2. Resolve master password from Secrets Manager
#   3. Temporarily authorize operator IP /32 on Aurora SG + flip writer publicly-accessible
#   4. Run audit queries via psql
#   5. Trap reverts SG + publicly-accessible flag on exit (always)
#
# Idempotent: re-running produces the same /tmp/* outputs; SG ingress add is silent on dup.

set -euo pipefail

# === 1. Resolve env from 54.6-01 handoff ===
HANDOFF_FILE="/Users/jeet/doordash-p2p/.planning/phases/54.6-enterprise-hardening-starter-pack-vpc-rds-proxy-waf-guardduty-close-sg/vpc-migration.handoff.sh"
if [[ ! -f "$HANDOFF_FILE" ]]; then
  echo "ERROR: handoff file not found: $HANDOFF_FILE" >&2
  exit 1
fi
# shellcheck source=/dev/null
source "$HANDOFF_FILE"

: "${NEW_ENDPOINT:?env from handoff missing NEW_ENDPOINT}"
: "${NEW_MASTER_SECRET_ARN:?env from handoff missing NEW_MASTER_SECRET_ARN}"
: "${AURORA_NEW_SG:?env from handoff missing AURORA_NEW_SG}"
: "${NEW_CLUSTER:?env from handoff missing NEW_CLUSTER}"

echo "[audit] Resolving master password from Secrets Manager…"
NEW_MASTER_PW=$(aws secretsmanager get-secret-value \
  --secret-id "$NEW_MASTER_SECRET_ARN" \
  --query SecretString --output text --region us-east-1 \
  | jq -r .password)
[[ -z "$NEW_MASTER_PW" ]] && { echo "ERROR: empty password from Secrets Manager"; exit 1; }

# === 2. Temporary operator-IP /32 access ===
OPERATOR_IP=$(curl -s https://checkip.amazonaws.com/)
[[ -z "$OPERATOR_IP" ]] && { echo "ERROR: could not resolve operator public IP"; exit 1; }
OPERATOR_CIDR="${OPERATOR_IP}/32"
echo "[audit] Operator IP: $OPERATOR_CIDR — adding to Aurora SG $AURORA_NEW_SG (temporary)…"
aws ec2 authorize-security-group-ingress --group-id "$AURORA_NEW_SG" \
  --protocol tcp --port 5432 --cidr "$OPERATOR_CIDR" --region us-east-1 2>/dev/null || true

echo "[audit] Flipping writer publicly-accessible=true (transient)…"
aws rds modify-db-instance --db-instance-identifier "${NEW_CLUSTER}-writer" \
  --publicly-accessible --apply-immediately --region us-east-1 >/dev/null
aws rds wait db-instance-available --db-instance-identifier "${NEW_CLUSTER}-writer" --region us-east-1

# Wait for public DNS to propagate — host should resolve to a non-RFC1918 address
echo "[audit] Waiting up to 180s for public DNS to propagate to cluster endpoint…"
for i in $(seq 1 36); do
  RESOLVED_IP=$(host -t A "$NEW_ENDPOINT" 2>/dev/null | awk '/has address/ {print $NF; exit}')
  if [[ -n "$RESOLVED_IP" && ! "$RESOLVED_IP" =~ ^10\. && ! "$RESOLVED_IP" =~ ^172\.(1[6-9]|2[0-9]|3[01])\. && ! "$RESOLVED_IP" =~ ^192\.168\. ]]; then
    echo "[audit]   Resolved $NEW_ENDPOINT -> $RESOLVED_IP (public, ready)"
    break
  fi
  echo "[audit]   attempt $i: resolved=${RESOLVED_IP:-none} (still private/unresolved)… sleeping 5s"
  sleep 5
done
if [[ -z "$RESOLVED_IP" || "$RESOLVED_IP" =~ ^10\. ]]; then
  echo "ERROR: public DNS did not propagate within 180s" >&2
  exit 1
fi

cleanup() {
  echo "[audit] CLEANUP: reverting publicly-accessible=false and revoking operator IP $OPERATOR_CIDR"
  aws rds modify-db-instance --db-instance-identifier "${NEW_CLUSTER}-writer" \
    --no-publicly-accessible --apply-immediately --region us-east-1 >/dev/null 2>&1 || true
  aws ec2 revoke-security-group-ingress --group-id "$AURORA_NEW_SG" \
    --protocol tcp --port 5432 --cidr "$OPERATOR_CIDR" --region us-east-1 2>/dev/null || true
}
trap cleanup EXIT

# === 3. A.1 — column presence + size ===
echo "[audit] A.1 — column presence audit…"
PGPASSWORD="$NEW_MASTER_PW" psql -h "$NEW_ENDPOINT" -U zietra_admin -d zietra -At -F',' -c "
  SELECT t.table_schema, t.table_name,
    CASE WHEN c.column_name IS NOT NULL THEN 'HAS' ELSE 'MISSING' END,
    coalesce(c.is_nullable,''), coalesce(c.column_default,''),
    pg_relation_size(format('%I.%I', t.table_schema, t.table_name)::regclass)
  FROM information_schema.tables t
  LEFT JOIN information_schema.columns c
    ON c.table_schema = t.table_schema
   AND c.table_name = t.table_name
   AND c.column_name = 'tenant_id'
  WHERE t.table_schema IN ('public','crm','turion','turion_satellite')
    AND t.table_type = 'BASE TABLE'
  ORDER BY t.table_schema, t.table_name;
" > /tmp/audit-A1-columns.csv

# === 4. A.2 — row counts ===
echo "[audit] A.2 — row counts…"
PGPASSWORD="$NEW_MASTER_PW" psql -h "$NEW_ENDPOINT" -U zietra_admin -d zietra -At -F',' -c "
  SELECT schemaname, relname, n_live_tup FROM pg_stat_user_tables
  WHERE schemaname IN ('public','crm','turion','turion_satellite')
  ORDER BY schemaname, n_live_tup DESC;
" > /tmp/audit-A2-rowcounts.csv

# === 5. A.3 — NULL tenant_id check (only on tables that HAVE the column) ===
echo "[audit] A.3 — NULL tenant_id row scan…"
PGPASSWORD="$NEW_MASTER_PW" psql -h "$NEW_ENDPOINT" -U zietra_admin -d zietra -c "
DO \$\$
DECLARE r record; n bigint;
BEGIN
  FOR r IN SELECT table_schema, table_name FROM information_schema.columns
           WHERE column_name = 'tenant_id'
             AND table_schema IN ('public','crm','turion','turion_satellite') LOOP
    EXECUTE format('SELECT COUNT(*) FROM %I.%I WHERE tenant_id IS NULL', r.table_schema, r.table_name) INTO n;
    IF n > 0 THEN RAISE NOTICE 'NULL tenant_id rows: %.% = %', r.table_schema, r.table_name, n; END IF;
  END LOOP;
  RAISE NOTICE 'A.3 audit complete';
END \$\$;
" 2>&1 | tee /tmp/audit-A3-nulls.txt

echo ""
echo "AUDIT COMPLETE — outputs:"
wc -l /tmp/audit-A1-columns.csv /tmp/audit-A2-rowcounts.csv /tmp/audit-A3-nulls.txt
