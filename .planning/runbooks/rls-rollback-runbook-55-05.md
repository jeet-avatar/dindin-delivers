# RLS Rollback Runbook — Phase 55 Plan 05

**Audience:** On-call operator faced with a suspected RLS-induced regression
in production (cross-tenant data leak, sustained query latency >10% above
55-04 baseline, Lambda 5xx spike correlated to an RLS-enabled table).

**Goal:** Restore service in <15 min by DISABLE-ing RLS on affected tables
(policies preserved — re-enable is trivial), with a per-Lambda credential
fallback if the bypass alone doesn't restore service.

**Authority:** Operator on-call. SNS topic `zietra-aurora-alarms` alerts
`jeetnair.in@gmail.com`. Confirm via CloudWatch console before pulling the
DISABLE handle — DISABLE-ing RLS removes a database-level isolation guarantee.

---

## Pre-condition — what triggers this runbook

One or more of the following:

1. **CloudWatch alarm `zietra-rls-lambda-p99-regression`** fires → Lambda
   `Duration` p99 > 1.10× the 55-04 baseline for 3 consecutive 5-min windows.
2. **CloudWatch alarm `zietra-rls-pinning-spike`** fires → RDS Proxy
   `DatabaseConnectionsCurrentlySessionPinned` > 5 for 5-min — indicates
   a stray non-`SET LOCAL` (likely a Wave-3 regression where `SET` slipped
   in outside a transaction).
3. **Customer report of cross-tenant data visibility** — a tenant sees rows
   that belong to another tenant.  RLS misconfiguration is one possible
   cause; investigate quickly and ENABLE rollback if confirmed.
4. **Smoke fails** — `curl https://lo254mvukl.execute-api.us-east-1.amazonaws.com/api/health`
   returns non-200 OR `curl https://rjydekliee.execute-api.us-east-1.amazonaws.com/api/health`
   returns non-200 AND CloudWatch confirms RLS-related error pattern in logs.

If NONE of the above are true, do **NOT** run this runbook — the symptom
is almost certainly unrelated to RLS.  Use `/gsd:debug` instead.

---

## Pre-condition — required access

- AWS CLI v1 logged into account `134607809447`, region `us-east-1`,
  with the `CRMaccesskey` IAM identity (read on Secrets Manager + Lambda
  invoke on `zietra-rls-runner-55-05` + Lambda update on the 4 production
  Lambdas).
- `jq` + `node` available locally.
- One-shot VPC Lambda `zietra-rls-runner-55-05` is deployed (verify with
  `aws lambda get-function --function-name zietra-rls-runner-55-05`).
  If absent, redeploy from `/tmp/55-02-migration-runner/` per the procedure
  in `aurora-vpc-migration-54-6-01.md`.
- Lambda SG → Aurora SG temp ingress rule (SG rule ID
  `sgr-0536781d1e94645ca`) is present.  Verify with
  `aws ec2 describe-security-group-rules --filters Name=group-id,Values=sg-099d916a8fe5cdb65`.

---

## Per-table DISABLE

For a SINGLE flagged table OR a small set, run the prebuilt script:

```bash
bash /Users/jeet/doordash-p2p/scripts/disable-rls-per-table.sh \
  public.tenant_features
# Or multiple:
bash /Users/jeet/doordash-p2p/scripts/disable-rls-per-table.sh \
  turion.deals turion.contacts crm.bookings
```

Behavior:

- Uses `zietra_admin` (master, table owner) for the `ALTER TABLE ... DISABLE
  ROW LEVEL SECURITY` statement (necessary because RLS-related DDL requires
  table ownership; `zietra_admin_bypass` has BYPASSRLS but is not owner).
- POLICIES are preserved (DISABLE only flips `pg_class.relrowsecurity` to
  `false`; the `tenant_isolation` policy stays in `pg_policy`).
- Re-enable later via:

  ```bash
  # Manual re-enable on a table-by-table basis after the underlying cause is
  # fixed.  Re-uses the same one-shot Lambda:
  MASTER_SECRET_ARN=arn:aws:secretsmanager:us-east-1:134607809447:secret:rds!cluster-16d5e38c-2fc2-4d06-8435-e4b01704bf74-mhV473
  MASTER=$(aws secretsmanager get-secret-value --secret-id "$MASTER_SECRET_ARN" --query SecretString --output text --region us-east-1)
  MUSER=$(echo "$MASTER" | jq -r .username)
  MPW=$(echo "$MASTER" | jq -r .password)
  PG_PW="$MPW" PG_USER="$MUSER" SQL="ALTER TABLE public.tenant_features ENABLE ROW LEVEL SECURITY;" node -e '
    const fs=require("fs");
    fs.writeFileSync("/tmp/re.json",JSON.stringify({
      password:process.env.PG_PW, user:process.env.PG_USER,
      host:"zietra-aurora-prod-v2.cluster-c23qcukqe810.us-east-1.rds.amazonaws.com",
      sql:process.env.SQL
    }));'
  aws lambda invoke --function-name zietra-rls-runner-55-05 --payload fileb:///tmp/re.json --region us-east-1 /tmp/re-out.json
  ```

For a WHOLE-SCHEMA flip (worst case — disable RLS on every table in turion.* etc.):

```bash
# Generate the list dynamically, then feed to disable-rls-per-table.sh
BYPASS_SECRET=$(aws secretsmanager get-secret-value --secret-id zietra-aurora/admin-bypass-role --query SecretString --output text --region us-east-1)
BYPASS_PW=$(echo "$BYPASS_SECRET" | jq -r .password)
PG_PW="$BYPASS_PW" PG_USER=zietra_admin_bypass SQL="SELECT n.nspname||'.'||c.relname FROM pg_class c JOIN pg_namespace n ON c.relnamespace=n.oid WHERE n.nspname='turion' AND c.relkind='r' AND c.relrowsecurity=true;" node -e '
  const fs=require("fs");
  fs.writeFileSync("/tmp/list.json",JSON.stringify({password:process.env.PG_PW,user:process.env.PG_USER,host:"zietra-aurora-prod-v2.cluster-c23qcukqe810.us-east-1.rds.amazonaws.com",sql:process.env.SQL}));'
aws lambda invoke --function-name zietra-rls-runner-55-05 --payload fileb:///tmp/list.json --region us-east-1 /tmp/list-out.json >/dev/null
TABLES=$(jq -r '.result.rows[][]' /tmp/list-out.json | xargs)
bash /Users/jeet/doordash-p2p/scripts/disable-rls-per-table.sh $TABLES
```

---

## Per-Lambda DATABASE_URL revert (fallback)

If DISABLE-ing RLS does NOT restore service, the suspicion shifts to the
Lambda credential layer.  Revert the 4 Lambdas from `zietra-aurora/app-role`
(zietra_app, RLS-subject) back to the master credential ARN (the 55-03
fallback retention path — master is retained as fallback specifically for
this rollback).

```bash
MASTER_ARN=arn:aws:secretsmanager:us-east-1:134607809447:secret:rds!cluster-16d5e38c-2fc2-4d06-8435-e4b01704bf74-mhV473

# For each Lambda, replace DATABASE_URL with a master-credential connection string.
# (The master role bypasses RLS by default — it is the cluster superuser equivalent.)
MASTER=$(aws secretsmanager get-secret-value --secret-id "$MASTER_ARN" --query SecretString --output text --region us-east-1)
MUSER=$(echo "$MASTER" | jq -r .username)
MPW_RAW=$(echo "$MASTER" | jq -r .password)
# URL-encode the password (postgresql conn strings require it for special chars)
MPW=$(node -e "console.log(encodeURIComponent(process.argv[1]))" "$MPW_RAW")

for FN in turion-demo-api turion-satellite-api asc606-app marquee-app; do
  # Read current env, replace DATABASE_URL while preserving other vars
  CURRENT_ENV=$(aws lambda get-function-configuration --function-name "$FN" \
    --query 'Environment.Variables' --output json --region us-east-1)
  NEW_DSN="postgres://${MUSER}:${MPW}@zietra-aurora-proxy.proxy-c23qcukqe810.us-east-1.rds.amazonaws.com:5432/zietra?sslmode=require"
  NEW_ENV=$(echo "$CURRENT_ENV" | jq --arg dsn "$NEW_DSN" '.DATABASE_URL = $dsn')
  echo "{\"Variables\":$NEW_ENV}" > /tmp/lambda-env.json
  aws lambda update-function-configuration --function-name "$FN" \
    --environment file:///tmp/lambda-env.json --region us-east-1
done

# Wait for Lambdas to update
for FN in turion-demo-api turion-satellite-api asc606-app marquee-app; do
  aws lambda wait function-updated --function-name "$FN" --region us-east-1
done
```

**Note:** Only 2 of the 4 Lambdas (`turion-demo-api`, `turion-satellite-api`)
have Aurora-backed routes today.  `asc606-app` uses S3 + Marquee API
(no DB); `marquee-app` uses local SQLite at `/tmp` (no Aurora).  If only
the 2 Aurora-backed Lambdas need revert, scope `FN in turion-demo-api
turion-satellite-api` to avoid touching no-op Lambdas.

---

## Restore from pre-RLS snapshot (last resort)

If DISABLE + Lambda revert STILL doesn't restore service, the database may
have been written with RLS-misrouted rows (e.g., `tenant_id` set to wrong
value while RLS was misbehaving).  Restore from the pre-RLS snapshot
captured before 55-03 cutover.

Snapshot ID + restore command live in
`/Users/jeet/doordash-p2p/.planning/runbooks/aurora-vpc-migration-54-6-01.md`
under §Restore from snapshot.  Restoring loses any writes since the
snapshot — coordinate with the operator before pulling this lever.

---

## Decision tree

```
Suspected RLS issue → check CloudWatch + customer report
│
├─ Single table flagged + p99 regressed > 10% sustained?
│  → DISABLE RLS on that one table.  Investigate composite index need
│    (drop `CREATE INDEX IF NOT EXISTS table_tenant_<col>_idx` into
│    a new migration; verify EXPLAIN; re-ENABLE).
│
├─ Multiple tables in same schema regressing?
│  → DISABLE RLS on the whole schema (turion.* OR crm.* OR turion_satellite.*).
│    Investigate per-route — likely a Wave-3 refactor miss
│    (`pool.query` somewhere bypassing `withTenantClient`).
│
├─ Cross-tenant data visibility confirmed (customer report)?
│  → DISABLE ALL RLS immediately on affected schema(s).
│    Open `/gsd:debug` ticket.  Do NOT re-enable until root cause + fix.
│
├─ Pinning alarm firing (> 5 sustained)?
│  → DISABLE-ing RLS won't help (Pinning is connection-state-leak, not RLS-policy issue).
│    Investigate `withTenantClient` usage — look for `SET` (no LOCAL) in code.
│    Use `/gsd:debug pinning-spike` to diagnose.
│
└─ Lambda 5xx spike correlated to RLS table?
   → DISABLE that table.  Check CloudWatch logs for the exact error.
     If error mentions "permission denied" or "current_setting", revert
     the Lambda DATABASE_URL to master (above) as second step.
```

---

## Drill output — proof rollback path works end-to-end

Executed 2026-05-15T20:52Z on `public.tenant_features` (lowest-risk
multi-tenant table — 39 rows, single feature lookup, no FK from a hot
table).  Drill log:

```
[drill] Starting RLS rollback drill on public.tenant_features — Fri May 15 20:52:04 UTC 2026
[drill] pre-drill relrowsecurity = true
[drill] pre-drill /api/health = HTTP 200
[drill] pre-drill tenant_features row count (bypass): 39
[rls-disable] public.tenant_features — DISABLED (policy 'tenant_isolation' preserved; re-enable trivially)
[drill] during-drill relrowsecurity = false
[drill] during-drill /api/health = HTTP 200
[drill] during-drill tenant_features row count (bypass): 39 (unchanged from 39)
[drill] re-enabling RLS on public.tenant_features...
{"ok":true,"command":"ALTER","error":null}
[drill] post-drill relrowsecurity = true
[drill] post-drill /api/health = HTTP 200
[drill] PASS: public.tenant_features RLS state restored to ENABLED (relrowsecurity=true)
[drill] DRILL COMPLETE — Fri May 15 20:52:13 UTC 2026
```

**Drill verdict: PASS.** Total wall-clock: 9 seconds.

Key observations:
- `pg_class.relrowsecurity` correctly flipped `true → false → true`.
- `/api/health` (public, RLS-irrelevant) stayed 200 throughout.
- Bypass-role row count unchanged (39) — DISABLE preserves data.
- Re-ENABLE was a single `ALTER TABLE` (1 SQL statement, sub-second).
- Drill artifacts persist in `/tmp/55-05-rollback-drill/`:
  - `drill.log` (above)
  - `pre-drill-rls-state.txt` (`t`)
  - `post-drill-rls-state.txt` (`t`)
  - `pre-drill-features-count.txt` (`39`)

---

## Verification commands post-rollback

After ANY rollback action, run all of:

```bash
# 1. Aurora reachable + healthy
curl -s -m 10 https://lo254mvukl.execute-api.us-east-1.amazonaws.com/api/health
curl -s -m 10 https://rjydekliee.execute-api.us-east-1.amazonaws.com/api/health

# 2. Smoke against the schemas
curl -s -m 10 -H "X-Tenant-Slug: turion" https://lo254mvukl.execute-api.us-east-1.amazonaws.com/api/tenants/current | jq .

# 3. Verify expected DISABLED-set
BYPASS_SECRET=$(aws secretsmanager get-secret-value --secret-id zietra-aurora/admin-bypass-role --query SecretString --output text --region us-east-1)
BYPASS_PW=$(echo "$BYPASS_SECRET" | jq -r .password)
PG_PW="$BYPASS_PW" PG_USER=zietra_admin_bypass SQL="SELECT n.nspname||'.'||c.relname AS table_, c.relrowsecurity FROM pg_class c JOIN pg_namespace n ON c.relnamespace=n.oid WHERE n.nspname IN ('public','crm','turion','turion_satellite') AND c.relkind='r' AND c.relrowsecurity=false;" node -e '
  const fs=require("fs");
  fs.writeFileSync("/tmp/v.json",JSON.stringify({password:process.env.PG_PW,user:process.env.PG_USER,host:"zietra-aurora-prod-v2.cluster-c23qcukqe810.us-east-1.rds.amazonaws.com",sql:process.env.SQL}));'
aws lambda invoke --function-name zietra-rls-runner-55-05 --payload fileb:///tmp/v.json --region us-east-1 /tmp/v-out.json >/dev/null
jq -r '.result.rows[] | "DISABLED: \(.table_)"' /tmp/v-out.json

# 4. Pinning metric within 5 min must be ≤ 5
aws cloudwatch get-metric-statistics --namespace AWS/RDS \
  --metric-name DatabaseConnectionsCurrentlySessionPinned \
  --dimensions Name=ProxyName,Value=zietra-aurora-proxy \
  --start-time $(date -u -v-5M +%Y-%m-%dT%H:%M:%S) \
  --end-time $(date -u +%Y-%m-%dT%H:%M:%S) \
  --period 60 --statistics Maximum --region us-east-1
```

All four MUST pass before declaring rollback complete.

---

## Post-rollback follow-up

1. Open a `/gsd:debug` session to root-cause why rollback was needed.
2. Document the rollback action in `.planning/STATE.md` under "Blockers".
3. Do NOT proceed to Phase 56 (M4 Stripe) until root cause is fixed AND
   RLS is re-enabled with green smoke.
4. Schedule a follow-up plan to add the missing composite index or fix
   the Lambda-side bug that triggered rollback.
