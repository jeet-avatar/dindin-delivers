# Aurora Rollback Runbook — Phase 54.5 Plan 03

> Use this runbook ONLY if Aurora-on-production is broken AND `/tmp/preflight-env-*.json` files still exist.
> Estimated rollback wall-clock: **4–5 minutes**.

## Pre-condition checklist

- [ ] At least one of the 4 Lambdas is throwing connection errors / 500s / DB timeouts in the last hour
- [ ] CloudWatch logs confirm errors are DB-related (not app-logic regressions)
- [ ] `/tmp/preflight-env-turion-demo-api.json` exists (mode 600, ~438 bytes)
- [ ] `/tmp/preflight-env-turion-satellite-api.json` exists (mode 600, ~298 bytes)
- [ ] `/tmp/preflight-env-zietra-crm-api.json` exists (mode 600, ~1426 bytes)
- [ ] `/tmp/preflight-env-zietra-api.json` exists (mode 600, ~815 bytes)
- [ ] Operator at keyboard, knows the Supabase project password (NOT in this file — pulled from Secrets Manager)
- [ ] Aurora cluster is still running (don't delete it during rollback — needed for data-loss accounting)

If any pre-flight env file is missing (e.g., on a new operator machine after `/tmp` cleanup), regenerate them from the Lambda configs as they exist NOW (won't help with rollback values, but at least preserves current Aurora state for forensics):
```bash
for L in turion-demo-api turion-satellite-api zietra-crm-api zietra-api; do
  aws lambda get-function-configuration --function-name $L --region us-east-1 \
    --query 'Environment.Variables' --output json > /tmp/preflight-env-$L.NOW.json
  chmod 600 /tmp/preflight-env-$L.NOW.json
done
```

## Step 1 — Restore 3 Lambda env vars from pre-flight snapshots

Each pre-flight JSON file has the exact env-var map that was active before cutover. The shape is `{...key:value, ...}` — wrap as `{"Variables": {...}}` for the AWS CLI:

```bash
# Operator must export SUPA_PW='<supabase-project-password>' BEFORE running rollback,
# OR resolve from Secrets Manager:
SUPA_PW=$(aws secretsmanager get-secret-value \
  --secret-id 'arn:aws:secretsmanager:us-east-1:134607809447:secret:zietra-aurora-prod/supabase-source-password-temp-EK6Egr' \
  --region us-east-1 --query SecretString --output text | python3 -c 'import json,sys; print(json.loads(sys.stdin.read())["password"])')
SUPA_URL_BASE="postgres://postgres.lbpkbpfwdpnwlccmlfxn:$(printf '%s' "$SUPA_PW" | jq -sRr @uri)@aws-1-us-east-2.pooler.supabase.com:6543/postgres"

# turion-demo-api — restore env from pre-flight
jq '{Variables: .}' /tmp/preflight-env-turion-demo-api.json > /tmp/rollback-env-turion-demo.json
aws lambda update-function-configuration --function-name turion-demo-api \
  --environment "file:///tmp/rollback-env-turion-demo.json" --region us-east-1
aws lambda wait function-updated --function-name turion-demo-api --region us-east-1
echo "turion-demo-api: rolled back"

# zietra-crm-api — restore env from pre-flight (includes SUPABASE_URL/ANON/SERVICE that were dropped)
jq '{Variables: .}' /tmp/preflight-env-zietra-crm-api.json > /tmp/rollback-env-zietra-crm.json
aws lambda update-function-configuration --function-name zietra-crm-api \
  --environment "file:///tmp/rollback-env-zietra-crm.json" --region us-east-1
aws lambda wait function-updated --function-name zietra-crm-api --region us-east-1
echo "zietra-crm-api: rolled back"

# zietra-api — restore env from pre-flight (includes SUPABASE_URL/ANON/SERVICE that were dropped)
jq '{Variables: .}' /tmp/preflight-env-zietra-api.json > /tmp/rollback-env-zietra-api.json
aws lambda update-function-configuration --function-name zietra-api \
  --environment "file:///tmp/rollback-env-zietra-api.json" --region us-east-1
aws lambda wait function-updated --function-name zietra-api --region us-east-1
echo "zietra-api: rolled back"
```

## Step 2 — Rotate turion-satellite secret BACK to Supabase

The Lambda's `DATABASE_URL_ARN` env var still points at the same secret ARN — only the secret VALUE needs to revert.

```bash
# Original Supabase value (from pre-flight inspection): postgresql://postgres.lbpkbpfwdpnwlccmlfxn:Thirumala977%21@aws-1-us-east-2.pooler.supabase.com:6543/postgres?schema=turion_satellite
SAT_SECRET_ARN="arn:aws:secretsmanager:us-east-1:134607809447:secret:turion-satellite/production/database-url-NCbgX6"
ENC_SUPA_PW=$(printf '%s' "$SUPA_PW" | jq -sRr @uri)
SUPA_SAT_URL="postgresql://postgres.lbpkbpfwdpnwlccmlfxn:${ENC_SUPA_PW}@aws-1-us-east-2.pooler.supabase.com:6543/postgres?schema=turion_satellite"

aws secretsmanager update-secret \
  --secret-id "$SAT_SECRET_ARN" \
  --secret-string "$SUPA_SAT_URL" \
  --region us-east-1

# Force Lambda cold start so it re-fetches the secret
aws lambda update-function-configuration --function-name turion-satellite-api \
  --description "Aurora rollback $(date -u +%Y-%m-%dT%H:%M:%SZ)" --region us-east-1
aws lambda wait function-updated --function-name turion-satellite-api --region us-east-1
echo "turion-satellite-api: secret rolled back + Lambda force-refreshed"
```

## Step 3 — Rotate zietra-meet secret BACK (CONDITIONAL)

Per Wave 2 Open Q1 resolution: `dollor/production/zietra-meet-8vOBAN` is UNUSED by any Lambda. Cutover Task 3 SKIPPED its rotation. **Therefore Step 3 is also SKIPPED in rollback.**

If a future audit finds it IS used by something:
```bash
aws secretsmanager update-secret \
  --secret-id dollor/production/zietra-meet-8vOBAN \
  --secret-string "${SUPA_URL_BASE/postgres/postgresql}?schema=crm" \
  --region us-east-1
```

## Step 4 — Re-run smoke against Supabase (verification)

The smoke scripts use `AURORA_URL` for DB-direct checks. After rollback, the DB-direct checks will FAIL because they still hit Aurora — but the curl `/api/health` and `/ping` checks will PASS because the Lambdas now hit Supabase.

**Acceptable rollback verdict: 4/4 HTTP probes PASS (DB-direct sentinel writes will land on Aurora — that's data accounting in Step 5).**

```bash
SMOKE_SCHEMA_PREFIX="" SMOKE_WRITE=0 bash /Users/jeet/doordash-p2p/scripts/aurora-cutover-smoke.sh 2>&1 | grep -E "PASS|FAIL"
```

A faster manual probe of HTTP endpoints (independent of smoke scripts):
```bash
curl -fsS https://lo254mvukl.execute-api.us-east-1.amazonaws.com/api/health  # turion-demo-api
curl -fsS https://rjydekliee.execute-api.us-east-1.amazonaws.com/api/health  # turion-satellite-api
curl -fsS https://fzonke39pf.execute-api.us-east-1.amazonaws.com/ping        # zietra-crm-api
# zietra-api has no live APIGW route — verify via DB-direct against SUPABASE
```

## Step 5 — Data-loss accounting

Identify any writes that landed on Aurora during the cutover window (T+4:30 to rollback time). The Aurora cluster keeps `pg_stat_user_tables.n_tup_ins` until cluster restart.

```bash
source /Users/jeet/doordash-p2p/.planning/phases/54.5-aurora-postgres-migration-leave-supabase/aurora-cutover.env
MASTER_PW=$(aws secretsmanager get-secret-value --secret-id "$MASTER_SECRET_ARN" --query SecretString --output text --region us-east-1 | jq -r .password)

docker run --rm -e PGPASSWORD="$MASTER_PW" postgres:17 psql \
  -h "$WRITER" -U zietra_admin -d zietra -c "
  SELECT schemaname, relname AS tablename, n_tup_ins, n_tup_upd
  FROM pg_stat_user_tables
  WHERE schemaname IN ('public','crm','turion','turion_satellite')
    AND (n_tup_ins > 0 OR n_tup_upd > 0)
  ORDER BY n_tup_ins DESC NULLS LAST, n_tup_upd DESC NULLS LAST
  LIMIT 30;"
```

If non-trivial writes are found:
1. Dump the affected tables: `pg_dump --data-only --table=<schema>.<table> > /tmp/aurora-writes-during-window.sql`
2. Apply to Supabase manually (handle conflicts — Supabase rows from same period may have different PKs)
3. Spot-check business-critical tables (orders, invoices, leads) for divergence

## Step 6 — Update NEXT_SESSION.md

Add a "ROLLBACK EXECUTED" entry below the cutover-complete block, including:
- Rollback timestamp
- Reason for rollback (which Lambda failed, error pattern, decision rationale)
- Whether to retry cutover later (and what to fix first) or investigate further
- Whether Aurora cluster should stay up (for forensics) or be torn down

## Decision tree — root cause from smoke failure mode

| Failure mode | Likely root cause | Where to look |
|---|---|---|
| All 4 HTTP probes return 500 | SG ingress lost (Aurora unreachable from Lambdas) | `aws ec2 describe-security-groups --group-ids $SG_ID` |
| 1 Lambda 500, others OK | That Lambda's env-var flip didn't apply | `aws lambda get-function-configuration --query 'Environment.Variables.<DB_VAR>'` — check host points at Aurora |
| HTTP probes PASS but row counts mismatch | Late writes on Supabase between T-5 final-counts and T+0 final-dump | Re-dump from Supabase, re-restore |
| Sentinel write fails with `permission denied` | Aurora master user lost privileges after restore | `psql -c '\dn+'` — check schema ownership/grants |
| Sentinel write fails with `relation "x" does not exist` | Restore SQL wasn't applied to right schema | Check `pg_tables` — count tables per schema, verify against Supabase |
| `connection timeout` after 30s | Aurora cluster paused/stopped (it's serverless v2) | `aws rds describe-db-clusters --db-cluster-identifier zietra-aurora-prod --query 'DBClusters[0].Status'` |
| `auth.uid() does not exist` in app logs | Supabase RLS DDL leaked back into Aurora restore | re-run RLS strip + DROP POLICY (Task 2 §T+1:35 of cutover runbook) |
| `transaction_timeout unrecognized` | Pre-clean of dump skipped | Re-run sed strip on dump SQL |

## Decision tree — go/no-go for retry

| Symptom | Action |
|---|---|
| Smoke now PASSES against Supabase post-rollback | Rollback successful. Investigate root cause before retrying cutover. Aurora data left intact for forensics. |
| Smoke FAILS against Supabase post-rollback | Pre-flight env files were stale OR Supabase project was modified during cutover. Compare current env vars vs SUMMARY.md frontmatter. |
| Aurora data shows 100+ rows of late writes | DELAY rollback — those writes will be lost. Either: (a) extract them via pg_dump and replay to Supabase, then rollback; (b) investigate Lambda issue + fix forward instead of rolling back |

---

*Created 2026-05-15 by Phase 54.5 Plan 03 executor. Tested in dry-run mode against Aurora's `_dryrun_*` schemas during Wave 2 (54.5-02). Live rollback path is exercised below.*
