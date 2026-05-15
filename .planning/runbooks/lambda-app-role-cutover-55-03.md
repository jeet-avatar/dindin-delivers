# Lambda app-role cutover (Phase 55-03 Wave 3)

**Status:** EXECUTED — 2026-05-15T20:18Z. Both DB-using Lambdas now connect as `zietra_app` (NOBYPASSRLS). RLS policies are actively enforced for every request. Apps healthy.

---

## What this cutover does

Flip 2 production Lambdas from the Aurora master role (`zietra_admin`, BYPASSRLS) to the new restricted role (`zietra_app`, NOBYPASSRLS) so RLS policies start firing per-request. After this cutover, every DB query that doesn't `SET LOCAL app.tenant_id` raises Postgres error `42704` — proof RLS is active.

| Lambda | Before | After | DB-access? |
|--------|--------|-------|------------|
| `turion-demo-api` | `DATABASE_URL` env var = URL w/ zietra_admin | `DATABASE_URL` env var = URL w/ zietra_app | YES |
| `turion-satellite-api` | `DATABASE_URL_ARN` → secret value = URL w/ zietra_admin | `DATABASE_URL_ARN` → SAME secret w/ value mutated to URL w/ zietra_app | YES |
| `asc606-app` | (no DATABASE_URL — Next.js frontend) | unchanged | **NO** |
| `marquee-app` | (no env vars — static-site Lambda) | unchanged | **NO** |

Pre-flight env snapshot at `/tmp/lambda-env-pre-55-03/` (8 files mode 600 covering 4 Lambdas).

## Pre-flight verification

1. **Wave 2 sentinel:** `zietra_app` exists with NOBYPASSRLS (`migration 029 applied`, see 55-02 SUMMARY).
2. **RLS policies live:** 151 multi-tenant tables ENABLE+FORCE RLS (migration 030 applied).
3. **Secret exists:** `aws secretsmanager describe-secret --secret-id zietra-aurora/app-role` → ARN `...t0oumn`.
4. **Snapshots captured:** `ls /tmp/lambda-env-pre-55-03/ | wc -l` ≥ 8.
5. **Route refactor deployed:** both Lambdas redeployed via `build-and-push.sh` BEFORE flipping creds — every route handler wraps DB access in `withTenantClient(req, …)` which sets `app.tenant_id` inside the transaction.

## Cutover steps (executed 2026-05-15T20:11–20:18Z)

1. **Register zietra_app with RDS Proxy auth list:**
   ```bash
   aws rds modify-db-proxy --db-proxy-name zietra-aurora-proxy --region us-east-1 \
     --auth '[
       {"AuthScheme":"SECRETS","SecretArn":"arn:aws:secretsmanager:us-east-1:134607809447:secret:rds!cluster-16d5e38c-2fc2-4d06-8435-e4b01704bf74-mhV473","IAMAuth":"DISABLED","ClientPasswordAuthType":"POSTGRES_SCRAM_SHA_256"},
       {"AuthScheme":"SECRETS","SecretArn":"arn:aws:secretsmanager:us-east-1:134607809447:secret:zietra-aurora/app-role-t0oumn","IAMAuth":"DISABLED","ClientPasswordAuthType":"POSTGRES_SCRAM_SHA_256"}
     ]'
   ```

2. **Grant RDS Proxy IAM role access to read the new secret** (the 54.6-02 setup only granted `rds!cluster-*`):
   ```bash
   # Update inline policy 'secrets-and-kms' on role 'zietra-rds-proxy-role':
   # add zietra-aurora/app-role-* and zietra-aurora/admin-bypass-role-*
   aws iam put-role-policy --role-name zietra-rds-proxy-role \
     --policy-name secrets-and-kms \
     --policy-document file:///tmp/proxy-policy-updated.json
   # Force proxy to refresh by re-issuing modify-db-proxy with the same auth list.
   ```

3. **Build + push refactored backends:**
   ```bash
   cd /Users/jeet/turion-space-demo && ./build-and-push.sh
   cd /Users/jeet/turion-satellite && ./build-and-push.sh
   ```

4. **Snapshot Lambda env + IAM:**
   ```bash
   bash /Users/jeet/doordash-p2p/scripts/lambda-env-snapshot-pre-55-03.sh
   ```

5. **Flip the 2 DB-using Lambdas:**
   ```bash
   bash /Users/jeet/doordash-p2p/scripts/lambda-flip-to-app-role.sh
   ```
   Internally:
   - reads `zietra-aurora/app-role` Secrets Manager JSON
   - constructs URL strings with proxy endpoint + schema query string
   - turion-demo-api: `aws lambda update-function-configuration` overwrites `DATABASE_URL`
   - turion-satellite-api: `aws secretsmanager put-secret-value` rotates the value of the existing secret (env var unchanged) + bumps Lambda description to force cold start

## Smoke results (post-cutover, 2026-05-15T20:18Z)

| Endpoint | Expected | Actual | Verdict |
|----------|----------|--------|---------|
| `GET https://lo254mvukl.execute-api.us-east-1.amazonaws.com/api/health` | `{db:ok, status:ok}` | `{"db":"ok","status":"ok","schema":"turion","latency_ms":178}` | ✅ PASS |
| `GET https://rjydekliee.execute-api.us-east-1.amazonaws.com/api/health` | `{db:ok, status:ok}` | `{"db":"ok","status":"ok","schema":"turion_satellite","latency_ms":91,...}` | ✅ PASS |
| `GET /api/tenants/current` w/ `X-Tenant-Slug: turion` (demo) | Turion JSON | `{"id":"00000000-0000-0000-0000-000000000001","slug":"turion",...,"features":[13 modules]}` | ✅ PASS |
| `GET /api/tenants/current` w/ `X-Tenant-Slug: turion` (satellite) | Turion JSON | same Turion JSON | ✅ PASS |
| `GET /api/data/all` w/ `X-Tenant-Slug: turion`, no JWT | 401 (auth gate fires) | 401 | ✅ PASS |
| CloudWatch `DatabaseConnectionsCurrentlySessionPinned` (last 30 min Max) | ≤ 5 | **1** | ✅ PASS |

## Pinning verdict (RESEARCH §G.3 sentinel)

`SET LOCAL app.tenant_id = …` inside a transaction does NOT pin the proxy connection — confirmed empirically. Max pinning during cutover = **1** (far below the 5-conn alarm threshold).

## Rollback CLI (executable copy-paste)

If post-cutover smoke fails or pinning spikes >5, restore both Lambdas to `zietra_admin`:

```bash
# Rollback turion-demo-api: restore plaintext DATABASE_URL from snapshot
OLD_ENV=$(jq '{Variables: .Environment.Variables}' /tmp/lambda-env-pre-55-03/turion-demo-api.config.json)
echo "$OLD_ENV" > /tmp/rollback-demo.json
aws lambda update-function-configuration --function-name turion-demo-api \
  --environment "file:///tmp/rollback-demo.json" --region us-east-1
aws lambda wait function-updated --function-name turion-demo-api --region us-east-1

# Rollback turion-satellite-api: rotate the secret value back to zietra_admin URL.
# Get the original URL from snapshot... but the snapshot captures the ARN, not the
# secret value (which has been overwritten). FIX: re-derive zietra_admin URL by
# reading the rds!cluster master secret and building the URL.
MASTER_SECRET_ARN="arn:aws:secretsmanager:us-east-1:134607809447:secret:rds!cluster-16d5e38c-2fc2-4d06-8435-e4b01704bf74-mhV473"
MASTER_JSON=$(aws secretsmanager get-secret-value --secret-id "$MASTER_SECRET_ARN" --query SecretString --output text)
M_USER=$(echo "$MASTER_JSON" | jq -r .username)
M_PASS=$(echo "$MASTER_JSON" | jq -r .password)
M_HOST=$(echo "$MASTER_JSON" | jq -r .host)
M_PORT=$(echo "$MASTER_JSON" | jq -r .port)
M_DB=$(echo "$MASTER_JSON" | jq -r .dbname)
M_PASS_ENC=$(python3 -c "import urllib.parse, sys; print(urllib.parse.quote(sys.argv[1], safe=''))" "$M_PASS")
SAT_URL_OLD="postgres://${M_USER}:${M_PASS_ENC}@${M_HOST}:${M_PORT}/${M_DB}?schema=turion_satellite&sslmode=require"

aws secretsmanager put-secret-value \
  --secret-id arn:aws:secretsmanager:us-east-1:134607809447:secret:turion-satellite/production/database-url-NCbgX6 \
  --secret-string "$SAT_URL_OLD" --region us-east-1
aws lambda update-function-configuration \
  --function-name turion-satellite-api \
  --description "Rollback to zietra_admin $(date -u +%Y-%m-%dT%H:%M:%SZ)" \
  --region us-east-1
aws lambda wait function-updated --function-name turion-satellite-api --region us-east-1
```

After rollback verify with `curl <api>/api/health` → expect `{db:ok}` and pinning metric stable.

NOTE: rolling back the creds does NOT undo Wave 2's `FORCE ROW LEVEL SECURITY`. Even as `zietra_admin`, queries on RLS'd tables still require `SET LOCAL app.tenant_id`. To FULLY roll back, also revert `withTenantClient` route refactor (`git revert` the 14 satellite + 14 demo route commits).

## Failure-mode reference

| Symptom | Likely cause | Fix |
|---------|--------------|-----|
| `42704 unrecognized configuration parameter "app.tenant_id"` | Route missed in Wave-3 refactor; falls through to direct `pool.query` without GUC | Grep `pool\.query` in routes/*.ts, wrap missing site |
| `permission denied for relation X` | `zietra_app` missing GRANT on table X | Re-run migration 029 (idempotent GRANTs); audit `pg_class` ACL |
| `This RDS proxy has no credentials for the role zietra_app` | Proxy IAM role can't read the new secret | Update `secrets-and-kms` inline policy on `zietra-rds-proxy-role` to include `zietra-aurora/app-role-*`, then re-issue `modify-db-proxy` to force refresh |
| `DatabaseConnectionsCurrentlySessionPinned > 5` | Someone used `SET app.tenant_id` (session-level) instead of `SET LOCAL` | grep `set_config.*false\)` and `SET app\.` — convert to `SET LOCAL` form |
| App returns 0 rows on /api/data/all | `req.tenant.id` doesn't match the tenant_id column of the row → RLS filtering out | Verify `X-Tenant-Slug` header maps to the right tenant via `/api/tenants/current` |

## Reproducibility

Both scripts are idempotent:
- `lambda-env-snapshot-pre-55-03.sh` overwrites the snapshot dir; safe to re-run.
- `lambda-flip-to-app-role.sh` overwrites the DATABASE_URL env var + secret value to the SAME zietra_app URL each time; safe to re-run.

The RDS Proxy `modify-db-proxy` auth list is a SET (not a list), so re-applying it is a no-op when the entries are identical.

## Phase 55-03 closure

Wave 3 complete. RLS is now actively enforced for every API request on both turion-demo-api and turion-satellite-api. Wave 4 (Plan 55-04) implements automated cross-tenant isolation tests + perf benchmark.
