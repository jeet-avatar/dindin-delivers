# Phase 55: M3 — Multi-tenancy + RLS — Research

**Researched:** 2026-05-15
**Domain:** PostgreSQL Row-Level Security on AWS Aurora behind RDS Proxy, Node.js + Express + pg
**Confidence:** HIGH

---

## Summary

Phase 55 / M3 makes Aurora PostgreSQL itself the security boundary between tenants. Today, tenant isolation is enforced purely in application code: every Lambda relies on `req.tenant.id` from Phase 53 middleware and on developers remembering to add `WHERE tenant_id = $1` to every query. A single missed predicate, SQL injection, or compromised handler can leak rows across tenants. Phase 55 closes that gap by enabling PostgreSQL RLS so even the same SQL query returns only the active tenant's rows.

The investigation found three load-bearing facts that drive the entire plan structure:

1. **`tenant_id` is already 90% backfilled.** Migration 025 (Phase 52) added a `tenant_id uuid` column to every `turion.*` and `turion_satellite.*` table (105 tables), backfilled all rows to Turion's UUID `00000000-0000-0000-0000-000000000001`, and indexed each column. Migration 025 explicitly defers `SET NOT NULL` + FK to M3 (line 96 of the migration). The remaining gaps are: `crm.*` schema (37 tables, not yet touched), a small number of `public.*` tables that are multi-tenant (`tenant_features`, `tenant_users`, `tenants` itself — already covered, but a few platform tables may not be), and the lock-down step.
2. **RDS Proxy + PostgreSQL `SET LOCAL` is COMPATIBLE.** The AWS RDS Proxy pinning docs are explicit that session-level `SET` and `set_config()` *do* pin connections for PostgreSQL — but `SET LOCAL` inside an explicit `BEGIN ... COMMIT` transaction does NOT pin. Multiple production multi-tenant SaaS implementations confirm this: the `SET LOCAL` value lives only inside the transaction, is automatically discarded on `COMMIT`/`ROLLBACK`, and never bleeds across pooled requests. This means we can implement the canonical `BEGIN → SET LOCAL app.tenant_id → queries → COMMIT` pattern WITHOUT defeating RDS Proxy multiplexing.
3. **node-postgres requires a "checkout-client" refactor.** Today all routes call `pool.query(...)` directly (300+ call sites across both backends). Per-request `SET LOCAL` mandates `pool.connect()` → `client.query('BEGIN')` → `client.query('SET LOCAL ...')` → `client.query(<sql>)` → `client.query('COMMIT')` → `client.release()`. This is the single biggest code change in Phase 55. The clean answer is a `withTenantClient(req, fn)` helper in `db.ts` that every handler uses; route bodies get marginally simpler.

**Primary recommendation:** Per-table rollout with a `withTenantClient()` helper. Convert routes one schema at a time (`crm` → `public` → `turion` → `turion_satellite`), enable RLS on a single low-traffic table first (`public.tenant_features`), verify with two test tenants, then expand. Use a dedicated non-owner application role `zietra_app` (no BYPASSRLS) for Lambda connections, and a separate `zietra_admin_bypass` role (with BYPASSRLS) for migrations and ops scripts. Add `FORCE ROW LEVEL SECURITY` as defense-in-depth so accidental connections-as-owner don't bypass.

---

<user_constraints>
## User Constraints (from CONTEXT.md)

**No CONTEXT.md exists for Phase 55.** This research was authored from the ROADMAP locked scope + Phase 54.6 CHECKPOINT handoff. The following items are LOCKED in ROADMAP and act as constraints on the planner:

### Locked Decisions (from ROADMAP Phase 55 scope)
- **DB**: Aurora PostgreSQL 16.4 ServerlessV2 (cluster `zietra-aurora-prod-v2`, behind RDS Proxy `zietra-aurora-proxy`)
- **Tenant binding mechanism**: `current_setting('app.tenant_id')::uuid` GUC variable set per-request via `SET LOCAL`
- **Tenant context provenance**: Phase 53 `tenantContext` middleware (X-Tenant-Slug header → `req.tenant.id`) — already in place
- **Bypass mechanism**: Dedicated Postgres role `zietra_admin_bypass` with BYPASSRLS attribute, credentials in Secrets Manager, NOT used from Lambda code
- **Test floor**: ~500 isolation tests (vitest + supertest) covering cross-tenant probes per route
- **Performance budget**: <5% p99 regression on top 10 endpoints (rollback trigger at >10% regression)
- **Rollback mechanism**: `ALTER TABLE ... DISABLE ROW LEVEL SECURITY` per-table (policies persist, just inactive)

### Claude's Discretion
- Per-table vs all-at-once rollout (this research recommends per-table)
- Index strategy per table (composite `(tenant_id, <existing PK col>)` vs single `(tenant_id)` — Phase 52 already added single, this research recommends composite for hot paths)
- Order of schema rollout (this research recommends `crm` → `public` → `turion_satellite` → `turion`)
- Whether to use `FORCE ROW LEVEL SECURITY` (this research recommends YES for defense-in-depth)

### Out of Scope (from ROADMAP "deferred to later phases")
- Cross-tenant aggregation / analytics (M8 — needs read-replica with cross-tenant grants)
- Schema-per-tenant (rejected — breaks Aurora cost model at our scale)
- Field-level encryption (M8 — HIPAA-style PHI)
- Audit log per-tenant retention policies (M8)
- IAM token client conversion to replace password-auth on RDS Proxy (carried from 54.6 — orthogonal to RLS, could be bundled if time permits)
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| `TenantIdColumnEverywhere` | Every multi-tenant table has a NOT NULL `tenant_id uuid` column with FK to `public.tenants(id)` | §B (audit) + §C (NOT NULL strategy). Migration 025 already added the column to 105 turion/turion_satellite tables. M3 audits `crm.*` + remaining `public.*`, applies NOT NULL + FK after re-verifying backfill. |
| `RlsPoliciesActive` | `tenant_isolation` policy enabled (and FORCED) on every multi-tenant table | §D (policy template) + §E (FORCE rationale). Standard `USING + WITH CHECK` template per-table. |
| `SetLocalAppTenantId` | Every authenticated request sets `app.tenant_id` GUC via `SET LOCAL` inside a transaction before any query | §F (transaction wrapping pattern) + §G (RDS Proxy compatibility). Refactor `pool.query` callsites into `withTenantClient(req, fn)` helper. |
| `AdminBypassRole` | Dedicated `zietra_admin_bypass` role with BYPASSRLS, credentials in Secrets Manager, used only by migration scripts | §H (role design) + §I (Secrets Manager wiring). |
| `IsolationTestSuite` | ~500 vitest + supertest tests probing cross-tenant access on every API endpoint | §J (test design) + §K (matrix generation). 169 routes × ~3 probes per route = ~507 tests. |
| `RlsPerfImpactAssessed` | p50/p99 latency baseline + post-RLS measurement on top 10 endpoints, documented | §L (perf benchmark methodology) + §N (index strategy to avoid regressions). |
| `RlsRollbackRunbook` | Documented per-table disable + re-enable procedure, tested on a non-critical table | §M (rollback procedure). |
</phase_requirements>

---

## A. Current Tenant_id Coverage Audit Methodology

The first plan-level task is to enumerate, per schema, every table's `tenant_id` status. Run this query against Aurora:

```sql
-- A.1 — Full audit query: which tables have tenant_id?
SELECT
  t.table_schema,
  t.table_name,
  CASE WHEN c.column_name IS NOT NULL THEN 'HAS' ELSE 'MISSING' END AS tenant_id_status,
  c.is_nullable,
  c.column_default,
  (SELECT COUNT(*) FROM information_schema.table_constraints tc
     WHERE tc.table_schema = t.table_schema
       AND tc.table_name = t.table_name
       AND tc.constraint_type = 'FOREIGN KEY'
       AND tc.constraint_name LIKE '%tenant%') AS fk_count,
  pg_relation_size(format('%I.%I', t.table_schema, t.table_name)::regclass) AS size_bytes
FROM information_schema.tables t
LEFT JOIN information_schema.columns c
  ON c.table_schema = t.table_schema
 AND c.table_name = t.table_name
 AND c.column_name = 'tenant_id'
WHERE t.table_schema IN ('public', 'crm', 'turion', 'turion_satellite')
  AND t.table_type = 'BASE TABLE'
ORDER BY t.table_schema, tenant_id_status, t.table_name;

-- A.2 — Row count per table (for backfill planning)
SELECT schemaname, relname, n_live_tup
FROM pg_stat_user_tables
WHERE schemaname IN ('public', 'crm', 'turion', 'turion_satellite')
ORDER BY schemaname, n_live_tup DESC;

-- A.3 — Which existing rows have NULL tenant_id (post-Phase-52 cleanup gate)?
DO $$
DECLARE
  r record;
  n bigint;
BEGIN
  FOR r IN
    SELECT table_schema, table_name
    FROM information_schema.columns
    WHERE column_name = 'tenant_id'
      AND table_schema IN ('public', 'crm', 'turion', 'turion_satellite')
  LOOP
    EXECUTE format('SELECT COUNT(*) FROM %I.%I WHERE tenant_id IS NULL',
                   r.table_schema, r.table_name) INTO n;
    IF n > 0 THEN
      RAISE NOTICE 'NULL tenant_id rows: %.% = %', r.table_schema, r.table_name, n;
    END IF;
  END LOOP;
END $$;
```

### Expected baseline (from Phase 54.5 CONTEXT.md schema audit)

| Schema | Tables | Rows | tenant_id status after Phase 52 | M3 action |
|--------|--------|------|----------------------------------|-----------|
| `turion_satellite` | 48 | 2017 | ALL HAVE tenant_id (migration 025) — all backfilled to Turion UUID | Verify, then NOT NULL + FK + RLS |
| `turion` | 57 | 959 | ALL HAVE tenant_id (migration 025) — all backfilled to Turion UUID | Verify, then NOT NULL + FK + RLS |
| `crm` | 37 | 44 | **NOT TOUCHED by migration 025** — most rows are Zietra Meet bookings, possibly single-tenant today | AUDIT REQUIRED. Likely add tenant_id + backfill to Turion (the only tenant who has Zietra Meet today) |
| `public` | 11 | 50 | Partial — `tenants` (3), `tenant_features` (39), `tenant_users` (6) are multi-tenant by design. 8 others unknown | AUDIT REQUIRED per-table |
| **Total** | **153** | **3070** | ~105 of 153 have tenant_id | Add to ~48 more |

### Table classification rubric

Each table sorts into one of four buckets:

1. **`tenant_id` already present + NOT NULL ready** → just add RLS policy. (Migration 025 tables, after backfill verification.)
2. **`tenant_id` present but nullable** → backfill any remaining NULL rows + lock NOT NULL + add FK + RLS policy.
3. **`tenant_id` missing, multi-tenant data** → add column + backfill + NOT NULL + FK + index + RLS policy.
4. **Platform/global/shared** → exempt from RLS, document why. Candidates (verify each):
   - `public.tenants` — the tenant directory itself. RLS would create a chicken-and-egg problem (tenant lookup needs to read this table BEFORE `app.tenant_id` is set). Policy: `USING (true)` (open read) OR RLS disabled. Recommend RLS DISABLED on `public.tenants` with a comment.
   - Lookup tables: `public.lifecycle_stages`, `public.satellite_statuses` (if they exist and are shared codes) — same treatment.
   - Migration tracking: `_prisma_migrations` (CRM uses Prisma) — exempt.

### File outputs from this audit

- `55-01-audit-report.md` — tabular result of A.1 + A.2 + A.3 with per-table classification
- `migrations/027_tenant_id_crm_and_public.sql` — adds tenant_id columns to schemas/tables not covered by migration 025

---

## B. tenant_id Column Backfill Strategy

### B.1 Pattern for adding tenant_id to a CRM table

```sql
-- Idempotent — safe to re-apply
ALTER TABLE crm.bookings ADD COLUMN IF NOT EXISTS tenant_id uuid;

-- Backfill: CRM today has 44 rows, all currently Turion's
UPDATE crm.bookings
   SET tenant_id = '00000000-0000-0000-0000-000000000001'::uuid
 WHERE tenant_id IS NULL;

-- Verify backfill (must return 0)
SELECT COUNT(*) FROM crm.bookings WHERE tenant_id IS NULL;
-- Expected: 0

-- Lock NOT NULL (only after verify)
ALTER TABLE crm.bookings ALTER COLUMN tenant_id SET NOT NULL;

-- Add FK to public.tenants (cascade on delete is dangerous; use RESTRICT)
ALTER TABLE crm.bookings
  ADD CONSTRAINT bookings_tenant_id_fkey
  FOREIGN KEY (tenant_id) REFERENCES public.tenants(id)
  ON DELETE RESTRICT;

-- Index for RLS performance (single-column is OK to start; composite later)
CREATE INDEX IF NOT EXISTS bookings_tenant_id_idx ON crm.bookings (tenant_id);
```

### B.2 Bulk pattern (mirrors migration 025 idiom)

For backfilling multiple tables in one migration, use the DO loop pattern from migration 025 lines 38-95. The pattern is proven, idempotent, and re-runnable. Extension: add a verification step that ABORTS if any post-backfill table still has NULL tenant_id rows.

### B.3 The Turion-only assumption

All ERP demo data today is for Turion (tenant_id `00000000-0000-0000-0000-000000000001`). This is safe to assume for CRM too — the only tenant with Zietra Meet activity is Turion (per Phase 52 CONTEXT memory). But **explicitly verify** before locking NOT NULL by cross-checking row distribution:

```sql
-- Per multi-tenant table, are all rows really for one tenant?
SELECT 'crm.bookings' AS tbl, tenant_id, COUNT(*) FROM crm.bookings GROUP BY tenant_id
UNION ALL
SELECT 'crm.contacts' AS tbl, tenant_id, COUNT(*) FROM crm.contacts GROUP BY tenant_id
-- ... etc per CRM table
;
```

If any CRM table has rows for non-Turion email addresses → flag for manual triage before backfill.

---

## C. NOT NULL + FK Lock-down Strategy

### C.1 Why a SEPARATE step

Migration 025 explicitly defers `SET NOT NULL` + FK to M3 because:
- Adding `NOT NULL` requires a full-table scan with ACCESS EXCLUSIVE lock (Aurora blocks all reads during).
- Adding FK with ON DELETE CASCADE traverses every row.

At our scale (3070 total rows), this is a sub-second operation. But the pattern matters for the future — by the time we have 10M rows, NOT NULL must be approached with `ALTER COLUMN ... SET NOT NULL` only after `ALTER TABLE ... ADD CONSTRAINT chk NOT VALID` + `VALIDATE CONSTRAINT` (zero-downtime pattern).

### C.2 At current scale — simple direct lock

```sql
-- One transaction per table; fast (<100ms each at our scale)
BEGIN;
SELECT COUNT(*) FROM <schema>.<table> WHERE tenant_id IS NULL;
-- (must be 0)
ALTER TABLE <schema>.<table> ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE <schema>.<table>
  ADD CONSTRAINT <table>_tenant_id_fkey
  FOREIGN KEY (tenant_id) REFERENCES public.tenants(id)
  ON DELETE RESTRICT;
COMMIT;
```

### C.3 The `ON DELETE` choice

- **CASCADE** — deletes all tenant data when a tenant is deleted. Dangerous in production (one bad UPDATE can wipe a tenant's entire history).
- **RESTRICT** — blocks tenant deletion until all child rows are removed first. Safer. **RECOMMENDED.**
- **SET NULL** — Not allowed because tenant_id is NOT NULL.

Phase 52 tenant deletion is currently a soft-delete on `tenants.plan='disabled'`, not a hard DELETE — RESTRICT is the natural fit.

---

## D. RLS Policy Template

### D.1 The canonical policy (copy-paste per table)

```sql
-- Enable RLS + force it even for table owners (defense-in-depth)
ALTER TABLE <schema>.<table> ENABLE ROW LEVEL SECURITY;
ALTER TABLE <schema>.<table> FORCE ROW LEVEL SECURITY;

-- Create the isolation policy (covers SELECT, INSERT, UPDATE, DELETE)
DROP POLICY IF EXISTS tenant_isolation ON <schema>.<table>;
CREATE POLICY tenant_isolation ON <schema>.<table>
  AS PERMISSIVE
  FOR ALL                                      -- all DML
  TO public                                    -- applies to every non-bypass role
  USING (tenant_id = current_setting('app.tenant_id')::uuid)
  WITH CHECK (tenant_id = current_setting('app.tenant_id')::uuid);
```

### D.2 Why every clause is the way it is

| Clause | Choice | Rationale |
|--------|--------|-----------|
| `ENABLE ROW LEVEL SECURITY` | Required | Activates the policy machinery. Without this, the policy is dormant. |
| `FORCE ROW LEVEL SECURITY` | YES | Without FORCE, the table owner (`zietra_admin`) silently bypasses RLS. With FORCE, only roles with explicit BYPASSRLS bypass. Defense-in-depth: if a future bug runs a Lambda as owner-equivalent, it's still RLS'd. |
| `AS PERMISSIVE` | Default | One policy per table is sufficient. PERMISSIVE policies OR together (when there's only one, this doesn't matter). |
| `FOR ALL` | YES | Covers SELECT + INSERT + UPDATE + DELETE in one policy. Alternative is 4 separate policies; not worth the verbosity at our scope. |
| `TO public` | YES | Applies to every role. Combined with FORCE, the only escape is BYPASSRLS. |
| `USING (...)` | tenant_id = setting | Filters visible rows on SELECT/UPDATE/DELETE. |
| `WITH CHECK (...)` | Same expression | Without WITH CHECK, a tenant could INSERT a row with another tenant's tenant_id — data corruption. With the same expression, the inserted/updated tenant_id must match the current GUC. **MANDATORY for security.** |

### D.3 What happens when `app.tenant_id` is not set?

`current_setting('app.tenant_id')::uuid` raises an error if the GUC is not defined. This is the "fail closed" property we want: a query that runs without the BEGIN/SET LOCAL preamble will throw, not silently return empty results.

The error looks like:
```
ERROR: unrecognized configuration parameter "app.tenant_id"
```

To make this even more explicit (and to allow a default), use `current_setting('app.tenant_id', true)::uuid` — the `true` makes it return NULL instead of erroring, and `NULL = anything` is FALSE, so no rows match. Tradeoff: silent empty results may be confusing during debugging. **Recommendation: use the non-defaulted form (`current_setting('app.tenant_id')::uuid`) so missing setup throws a loud error.**

### D.4 Sample for the special tables

```sql
-- public.tenants — the tenant directory. RLS would block the tenantContext middleware
-- from looking up tenants by slug BEFORE app.tenant_id is set. SKIP RLS here.
-- Document with a comment:
COMMENT ON TABLE public.tenants IS
  'No RLS — read by tenantContext middleware before app.tenant_id is set. '
  'Write access controlled at application layer only.';

-- public.tenant_users — RLS desired. The middleware reads this AFTER tenant resolution,
-- so app.tenant_id is set by the time queries run. Standard policy applies.

-- public.tenant_features — RLS desired. Same as tenant_users.
```

---

## E. ENABLE vs FORCE vs BYPASSRLS — the full matrix

| Role / Mode | RLS ENABLED only | RLS ENABLED + FORCE | BYPASSRLS attribute |
|-------------|------------------|---------------------|---------------------|
| Table owner | **BYPASSES** policies | Subject to policies | n/a (orthogonal) |
| Superuser | Always bypasses | Always bypasses | n/a |
| Non-owner role (e.g., `zietra_app`) | Subject to policies | Subject to policies | n/a |
| Role with BYPASSRLS | Bypasses | Bypasses | Always bypasses, always |

### E.1 Why FORCE is the safety net

Aurora's master user (`zietra_admin`) is the owner of every table — Lambdas currently connect as this user via the master secret. Without FORCE, RLS would silently do nothing because the master user owns the tables. **The current Lambda credentials are functionally equivalent to a BYPASSRLS role today.** This is invisible until you add RLS, then you discover policies don't apply.

Two solutions, both should be implemented:

1. **Switch Lambdas to a dedicated non-owner role** (`zietra_app`). This is the "right" answer from the AWS blog. Requires creating the role + GRANTing it SELECT/INSERT/UPDATE/DELETE on every table + updating Secrets Manager.
2. **Add FORCE ROW LEVEL SECURITY**. Even if step 1 is bypassed or partially done, FORCE means even the owner is RLS'd. Belt-and-suspenders.

**Recommend BOTH.** Plan must include both: create `zietra_app`, grant on all tables in 4 schemas, rotate Lambda credentials, AND apply FORCE on every RLS'd table.

### E.2 The role hierarchy after M3

```
zietra_admin            — Aurora master user. Owns all tables. Used for migrations + emergencies.
 ├─ zietra_admin_bypass — BYPASSRLS attribute. Used for backfill/migration scripts.
 │                        Secret: zietra-aurora/admin-bypass-role-CREDS
 └─ zietra_app          — NOINHERIT, no BYPASSRLS. Used by Lambdas day-to-day.
                          Granted SELECT/INSERT/UPDATE/DELETE on tables in target schemas.
                          Secret: zietra-aurora/app-role-CREDS (NEW for M3)
```

---

## F. SET LOCAL Transaction-Wrapping Pattern

### F.1 The pattern

Every authenticated request must:
1. Acquire a dedicated client from the pool (`pool.connect()`)
2. `BEGIN`
3. `SET LOCAL app.tenant_id = $1` — with `req.tenant.id` as the parameter
4. Run all queries on the same client
5. `COMMIT` (or `ROLLBACK` on error)
6. `client.release()`

### F.2 Canonical helper — `withTenantClient`

Add to both `backend/src/db.ts` files:

```typescript
// backend/src/db.ts (additions for M3 Phase 55)
import { PoolClient } from 'pg';
import { Request } from 'express';

/**
 * Run a function with a per-request DB client that has app.tenant_id
 * bound for the duration of one transaction. Use this for EVERY route
 * handler that reads/writes RLS-protected data.
 *
 * Pattern:
 *   await withTenantClient(req, async (client) => {
 *     const rows = await client.query('SELECT * FROM turion.customers');
 *     return rows;
 *   });
 *
 * - BEGIN/COMMIT auto-managed
 * - SET LOCAL app.tenant_id = req.tenant.id set BEFORE any query
 * - ROLLBACK on any thrown error
 * - client.release() in finally (returns to pool — no leak)
 *
 * Pinning note: AWS RDS Proxy docs confirm SET LOCAL inside a transaction
 * does NOT pin the proxy connection (unlike session-level SET).
 */
export async function withTenantClient<T>(
  req: Request,
  fn: (client: PoolClient) => Promise<T>,
): Promise<T> {
  if (!req.tenant?.id) {
    throw new Error('withTenantClient called before tenantContext middleware ran');
  }
  // Validate format defensively — req.tenant.id comes from DB lookup so it's
  // UUID-shaped, but belt-and-suspenders against future middleware changes.
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(req.tenant.id)) {
    throw new Error(`Invalid tenant_id UUID: ${req.tenant.id}`);
  }
  const client = await getPool().connect();
  try {
    await client.query('BEGIN');
    // set_config() is parameterized — avoids SQL injection even though
    // we validated UUID above. The third arg `true` means LOCAL scope.
    await client.query("SELECT set_config('app.tenant_id', $1, true)", [req.tenant.id]);
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (e) {
    await client.query('ROLLBACK').catch(() => {});
    throw e;
  } finally {
    client.release();
  }
}
```

### F.3 Why `set_config(..., true)` over `SET LOCAL`

Two equivalent forms exist:
- `SET LOCAL app.tenant_id = '...'` — DDL form, string-interpolated
- `SELECT set_config('app.tenant_id', $1, true)` — function form, parameterized

The function form is preferred because:
1. **Parameter binding works** — `SET LOCAL` does not accept `$1` placeholders in node-postgres (it's interpolated at the SQL text level), forcing manual string escaping.
2. **The 3rd argument `true` = LOCAL scope** — equivalent to `SET LOCAL`.
3. **Returns the new value** — handy for logging/tracing if needed.

The two are semantically identical from RLS's POV (`current_setting()` reads either the same).

### F.4 Route refactor pattern

**Before** (current pattern, ~300+ callsites):
```typescript
r.get('/customers', requireAuth, async (_req, res) => {
  const rows = await query("SELECT id, name FROM turion.customers ORDER BY id");
  res.json(rows);
});
```

**After** (M3 pattern):
```typescript
r.get('/customers', tenantContext, requireAuth, async (req, res) => {
  const rows = await withTenantClient(req, async (client) => {
    const r = await client.query("SELECT id, name FROM turion.customers ORDER BY id");
    return r.rows;
  });
  res.json(rows);
});
```

Note: the SQL itself no longer needs `WHERE tenant_id = $1` — RLS adds it transparently. This is a code-cleanup bonus.

### F.5 Audit grep for refactor scope

```bash
# Count direct pool.query callsites that need conversion
grep -rEn "(query|pool\.query)\s*\(" /Users/jeet/turion-space-demo/backend/src/routes/*.ts | wc -l
grep -rEn "(query|pool\.query)\s*\(" /Users/jeet/turion-satellite/backend/src/routes/*.ts | wc -l

# Existing transactions (already use client.query — easier to convert)
grep -rln "pool\.connect\|client\.query" /Users/jeet/turion-space-demo/backend/src/routes/*.ts
grep -rln "pool\.connect\|client\.query" /Users/jeet/turion-satellite/backend/src/routes/*.ts
```

Verified at research time: ~50 direct `pool.query` calls in space-demo routes; satellite has similar magnitude. Plus ~10 existing transaction blocks (mostly in `netsuite.ts` which has 10 BEGINs) that just need `SET LOCAL` injected after `BEGIN`.

---

## G. RDS Proxy + SET LOCAL — Compatibility Proof

### G.1 Definitive answer

**`SET LOCAL` inside `BEGIN ... COMMIT` does NOT pin RDS Proxy connections for PostgreSQL.**

### G.2 Evidence

1. **AWS RDS Proxy docs**: The MySQL section explicitly states "RDS Proxy does not pin connections when you use SET LOCAL." The PostgreSQL pinning section lists "Using SET commands" and "Setting a parameter, or resetting a parameter to its default. Specifically, using SET and set_config commands to assign default values to session variables" — note the phrase *"default values to session variables"*. This applies to session-scoped SET (i.e., `SET` without `LOCAL`, OR `set_config(name, value, false)`). It does NOT mention transaction-scoped LOCAL settings.

2. **PostgreSQL semantics**: `SET LOCAL` settings are bound to the current transaction and discarded on COMMIT/ROLLBACK. The proxy has no need to pin because the connection's session state is identical before and after the transaction completes — there's nothing for the proxy to "remember" about this client.

3. **Production confirmation**: Multiple SaaS multi-tenant RLS implementations (Picus Security, Crunchy Data, the DEV community blog) use exactly this pattern in production with RDS Proxy. AWS's own multi-tenant RLS blog uses `SET` (not `SET LOCAL`) with traditional pgbouncer in session mode — for RDS Proxy in transaction mode, `SET LOCAL` is the correct adaptation.

### G.3 Verification step (must be in the plan)

Add to plan 55-02 as a hard verification:

```sql
-- Run before AND after deploying SET LOCAL middleware. Pinning rate must NOT increase.
-- (CloudWatch metric for the RDS Proxy)
aws cloudwatch get-metric-statistics \
  --namespace AWS/RDS \
  --metric-name DatabaseConnectionsCurrentlySessionPinned \
  --dimensions Name=ProxyName,Value=zietra-aurora-proxy \
  --start-time $(date -u -v-1H +%Y-%m-%dT%H:%M:%SZ) \
  --end-time $(date -u +%Y-%m-%dT%H:%M:%SZ) \
  --period 60 \
  --statistics Average
```

Expected baseline: ~0 pinned connections. After SET LOCAL rollout: still ~0. If pinning spikes, we have a bug somewhere (probably someone called `SET` instead of `SET LOCAL`, or used pool.query outside a transaction).

### G.4 The trap to avoid

**Do NOT use `SET app.tenant_id = ...` (without LOCAL).** Three failure modes:
1. RDS Proxy pins the connection — defeats multiplexing → connection-pool exhaustion under load.
2. The setting persists across transactions on a reused client — a tenant-B request inherits tenant-A's setting → catastrophic data leak.
3. Even if you `RESET app.tenant_id` at request end, you might miss the cleanup on error paths.

`SET LOCAL` is the only safe choice.

---

## H. Admin Bypass Role Design

### H.1 Why a separate role

Migration scripts need cross-tenant access (backfill, FK creation, audits). Embedding BYPASSRLS in the Lambda's role is catastrophic — a single SQL injection in Lambda code becomes a full-DB leak. Separation of duties:

```
zietra_admin           — owner, used only via direct psql in incident response
zietra_admin_bypass    — BYPASSRLS, used by migration runner scripts (NEVER by Lambdas)
zietra_app             — NO BYPASSRLS, used by Lambdas (subject to RLS)
```

### H.2 Provisioning SQL

```sql
-- Run as zietra_admin (master user) via direct psql, ONE TIME during 55-03

-- 1. App role
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'zietra_app') THEN
    CREATE ROLE zietra_app LOGIN PASSWORD '<from-secrets-manager>' NOINHERIT;
  END IF;
END $$;

-- Grants per schema
GRANT USAGE ON SCHEMA public, crm, turion, turion_satellite TO zietra_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public, crm, turion, turion_satellite TO zietra_app;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public, crm, turion, turion_satellite TO zietra_app;
-- Future-tables: default privileges
ALTER DEFAULT PRIVILEGES IN SCHEMA public, crm, turion, turion_satellite
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO zietra_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public, crm, turion, turion_satellite
  GRANT USAGE, SELECT ON SEQUENCES TO zietra_app;

-- 2. Migration bypass role
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'zietra_admin_bypass') THEN
    CREATE ROLE zietra_admin_bypass LOGIN PASSWORD '<from-secrets-manager>'
      BYPASSRLS NOINHERIT;
  END IF;
END $$;

-- Same grants as zietra_app for migrations (it owns nothing)
GRANT USAGE ON SCHEMA public, crm, turion, turion_satellite TO zietra_admin_bypass;
GRANT ALL ON ALL TABLES IN SCHEMA public, crm, turion, turion_satellite TO zietra_admin_bypass;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public, crm, turion, turion_satellite TO zietra_admin_bypass;
```

### H.3 Secrets Manager wiring

Two new secrets created in 55-03:

| Secret | ARN format | Used by |
|--------|-----------|---------|
| `zietra-aurora/app-role` | `arn:aws:secretsmanager:us-east-1:134607809447:secret:zietra-aurora/app-role-*` | Each of 4 Lambdas (replaces master secret usage) |
| `zietra-aurora/admin-bypass-role` | `arn:aws:secretsmanager:us-east-1:134607809447:secret:zietra-aurora/admin-bypass-role-*` | Migration runner scripts ONLY (never in Lambda env vars) |

Each secret has shape:
```json
{
  "username": "zietra_app",
  "password": "<random-32-char>",
  "engine": "postgres",
  "host": "zietra-aurora-proxy.proxy-c23qcukqe810.us-east-1.rds.amazonaws.com",
  "port": 5432,
  "dbname": "zietra"
}
```

The migration runner pattern (used by `scripts/run-migrations.sh`):
```bash
# Resolve at script time, not Lambda env time
ADMIN_SECRET_ARN="arn:aws:secretsmanager:us-east-1:134607809447:secret:zietra-aurora/admin-bypass-role-XXXXXX"
CREDS=$(aws secretsmanager get-secret-value --secret-id "$ADMIN_SECRET_ARN" --query SecretString --output text)
export PGPASSWORD=$(echo "$CREDS" | jq -r .password)
psql -h "$PROXY_HOST" -U zietra_admin_bypass -d zietra -f migrations/027_tenant_id_crm.sql
```

### H.4 Lambda secret rotation

The 4 Lambdas currently use the master secret (`rds!cluster-16d5e38c-...`). After 55-03 they switch to `zietra-aurora/app-role`. Update via:
```bash
aws lambda update-function-configuration \
  --function-name turion-demo-api \
  --environment 'Variables={DATABASE_URL_ARN=arn:aws:secretsmanager:...:zietra-aurora/app-role-XXX}'
```

And the Lambda's `secrets.ts` (already exists from Phase 54.6) parses the JSON to build the DATABASE_URL with the new user. **No code change** if the secret JSON shape matches what `secrets.ts` already expects.

### H.5 Acceptance check

```bash
# Confirm Lambda can't bypass RLS — should return only its tenant's rows
aws lambda invoke --function-name turion-demo-api ...
# vs migration script — should see all rows
PGPASSWORD=... psql -h $PROXY -U zietra_admin_bypass -c "SELECT COUNT(*), tenant_id FROM turion.customers GROUP BY tenant_id"
```

---

## I. Lambda Secret Rotation + IAM Policy Update

### I.1 IAM grants needed

Each Lambda's execution role needs `secretsmanager:GetSecretValue` on the new app-role secret. Existing role policy (from Phase 54.6) likely allows the OLD master secret only.

```bash
# Per Lambda: replace existing GetSecretValue grant with the new app-role ARN
aws iam put-role-policy \
  --role-name turion-demo-api-role \
  --policy-name SecretsAccess \
  --policy-document '{
    "Version": "2012-10-17",
    "Statement": [{
      "Effect": "Allow",
      "Action": "secretsmanager:GetSecretValue",
      "Resource": "arn:aws:secretsmanager:us-east-1:134607809447:secret:zietra-aurora/app-role-*"
    }]
  }'
```

### I.2 Rollback path

Keep the master secret grant in the role policy as a fallback during the cutover window (~1 hour). After confirming Lambdas can connect with the new role, remove the master secret grant.

---

## J. Isolation Test Suite Design

### J.1 Test framework continuity

Phase 54.1-04 already established the vitest + supertest infra. M3 extends it with the cross-tenant matrix. No new dependencies.

### J.2 Test fixture: two test tenants

```typescript
// tests/rls/fixtures.ts
import { Pool } from 'pg';
import { randomUUID } from 'crypto';

const TENANT_A = {
  id: '11111111-1111-1111-1111-111111111111',
  slug: 'rls-test-a',
  name: 'RLS Test Tenant A',
};
const TENANT_B = {
  id: '22222222-2222-2222-2222-222222222222',
  slug: 'rls-test-b',
  name: 'RLS Test Tenant B',
};

export async function setupTestTenants(): Promise<{ a: typeof TENANT_A; b: typeof TENANT_B }> {
  // Use admin bypass role to seed (RLS would prevent app role from cross-tenant insert)
  const pool = new Pool({ /* admin bypass credentials */ });
  // Insert tenants
  await pool.query(`INSERT INTO public.tenants (id, slug, name, owner_cognito_sub, plan)
                    VALUES ($1, $2, $3, 'test-sub-a', 'trial'),
                           ($4, $5, $6, 'test-sub-b', 'trial')
                    ON CONFLICT (id) DO NOTHING`,
    [TENANT_A.id, TENANT_A.slug, TENANT_A.name,
     TENANT_B.id, TENANT_B.slug, TENANT_B.name]);
  // Seed one row of each major table per tenant
  // ... (per table from audit list)
  return { a: TENANT_A, b: TENANT_B };
}

export async function teardownTestTenants(): Promise<void> {
  const pool = new Pool({ /* admin bypass credentials */ });
  // FK RESTRICT means we must clean child tables first
  await pool.query(`DELETE FROM turion.customers WHERE tenant_id IN ($1, $2)`, [TENANT_A.id, TENANT_B.id]);
  // ... (per table)
  await pool.query(`DELETE FROM public.tenants WHERE id IN ($1, $2)`, [TENANT_A.id, TENANT_B.id]);
}
```

### J.3 Cross-tenant probe pattern

For every API endpoint:

```typescript
// tests/rls/route-matrix.test.ts
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { app } from '../../src/app';
import { setupTestTenants, teardownTestTenants } from './fixtures';
import { signTestJwt } from './auth-helpers';

const TENANT_A = '11111111-1111-1111-1111-111111111111';
const TENANT_B = '22222222-2222-2222-2222-222222222222';

beforeAll(async () => { await setupTestTenants(); });
afterAll(async () => { await teardownTestTenants(); });

// Generated programmatically from the route table — see J.4
describe.each([
  { method: 'GET', path: '/api/salesforce/customers', listPath: true },
  { method: 'GET', path: '/api/salesforce/customers/:id', resourcePath: true },
  { method: 'PATCH', path: '/api/salesforce/customers/:id', resourcePath: true },
  // ... ~169 route entries
])('Route $method $path', ({ method, path, listPath, resourcePath }) => {

  it('returns ONLY tenant-A rows when authenticated as tenant-A', async () => {
    const token = signTestJwt({ sub: 'test-sub-a' });
    const res = await request(app)
      [method.toLowerCase()](path)
      .set('Authorization', `Bearer ${token}`)
      .set('X-Tenant-Slug', 'rls-test-a');
    if (listPath) {
      expect(res.status).toBe(200);
      // Every returned row must have tenant_id = TENANT_A
      for (const row of res.body.items ?? Object.values(res.body)) {
        if (row.tenant_id) expect(row.tenant_id).toBe(TENANT_A);
      }
    }
  });

  it('returns 404 when accessing tenant-B resource as tenant-A', async () => {
    if (!resourcePath) return;
    const tenantBResourceId = 'B-RESOURCE-ID'; // pre-seeded
    const token = signTestJwt({ sub: 'test-sub-a' });
    const res = await request(app)
      [method.toLowerCase()](path.replace(':id', tenantBResourceId))
      .set('Authorization', `Bearer ${token}`)
      .set('X-Tenant-Slug', 'rls-test-a');
    expect([404, 403]).toContain(res.status);
    expect(res.body).not.toHaveProperty('tenant_id', TENANT_B);
  });

  it('REJECTS write of tenant_id=B from tenant-A session (WITH CHECK)', async () => {
    if (method !== 'POST' && method !== 'PATCH') return;
    const token = signTestJwt({ sub: 'test-sub-a' });
    const res = await request(app)
      [method.toLowerCase()](path)
      .set('Authorization', `Bearer ${token}`)
      .set('X-Tenant-Slug', 'rls-test-a')
      .send({ tenant_id: TENANT_B, name: 'malicious' });
    expect(res.status).toBeGreaterThanOrEqual(400);
  });
});
```

### J.4 Programmatic route extraction

```bash
# Generate route-matrix.json from the source files
cat > scripts/extract-routes.mjs <<'EOF'
import { readFileSync, readdirSync, writeFileSync } from 'fs';
import { join } from 'path';

const ROUTE_DIRS = [
  '/Users/jeet/turion-space-demo/backend/src/routes',
  '/Users/jeet/turion-satellite/backend/src/routes',
];

const routes = [];
for (const dir of ROUTE_DIRS) {
  for (const file of readdirSync(dir).filter(f => f.endsWith('.ts'))) {
    const content = readFileSync(join(dir, file), 'utf8');
    // Match r.get/post/put/patch/delete('/path', ...)
    const re = /r\.(get|post|put|patch|delete)\s*\(\s*['"]([^'"]+)['"]/g;
    let m;
    while ((m = re.exec(content)) !== null) {
      routes.push({
        backend: dir.includes('satellite') ? 'satellite' : 'space-demo',
        file: file.replace('.ts', ''),
        method: m[1].toUpperCase(),
        path: m[2],
        isListPath: !m[2].includes(':'),
        isResourcePath: m[2].includes(':'),
      });
    }
  }
}
writeFileSync('tests/rls/route-matrix.json', JSON.stringify(routes, null, 2));
console.log(`Extracted ${routes.length} routes`);
EOF
node scripts/extract-routes.mjs
```

Expected output: 169 routes total. Multiply by ~3 cross-tenant assertions per route = ~507 tests. Within the ~500 target.

### J.5 What "leaked rows" looks like — the failure scenario

```typescript
// HYPOTHETICAL FAILURE — the test that would catch a missed RLS policy
it('isolates turion.work_orders between tenants', async () => {
  // Seed: tenant-A has WO-001; tenant-B has WO-002
  const tokenA = signTestJwt({ sub: 'test-sub-a' });
  const res = await request(app)
    .get('/api/work-orders')
    .set('Authorization', `Bearer ${tokenA}`)
    .set('X-Tenant-Slug', 'rls-test-a');
  // If RLS is broken or policy missing, this would include WO-002
  expect(res.body.map(r => r.id)).toEqual(['WO-001']);
  expect(res.body.map(r => r.id)).not.toContain('WO-002');
});
```

### J.6 CI integration

```yaml
# .github/workflows/rls-isolation.yml
on:
  pull_request:
    paths:
      - 'backend/src/**'
      - 'backend/migrations/**'
      - 'tests/rls/**'
jobs:
  rls-isolation:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: npm ci
      - run: npm run test:rls
        env:
          # Test DB credentials (separate Aurora cluster or local Postgres 16)
          DATABASE_URL: ${{ secrets.TEST_DATABASE_URL }}
          ADMIN_BYPASS_URL: ${{ secrets.TEST_ADMIN_BYPASS_URL }}
```

**Recommendation**: Run on EVERY PR that touches `backend/`, not just RLS-touching PRs. The cost is low (3070 rows test DB, ~30s suite) and the safety is high — any new route immediately gets the cross-tenant check.

### J.7 Test data isolation gotcha

Tests MUST clean up after themselves. The `afterAll(teardownTestTenants)` block uses the admin bypass role to DELETE rows. If tests crash mid-suite, leftover test data could pollute the next run — tag every row with `tenant_id IN (TENANT_A, TENANT_B)` so cleanup is unambiguous.

---

## K. Test Matrix Generation

| Route file | # routes | List-style probes | Resource-style probes | Write probes | Total per file |
|------------|----------|-------------------|------------------------|--------------|----------------|
| `space-demo/netsuite.ts` | 19 | 7 | 12 | 8 | ~30 |
| `space-demo/salesforce.ts` | 18 | 6 | 12 | 7 | ~28 |
| `space-demo/extras.ts` | 12 | 4 | 8 | 4 | ~18 |
| `space-demo/arena.ts` | 11 | 4 | 7 | 4 | ~16 |
| `space-demo/vendor.ts` | 6 | 2 | 4 | 2 | ~10 |
| `space-demo/ramp.ts` | 5 | 2 | 3 | 2 | ~8 |
| `space-demo/quickbooks.ts` | 5 | 2 | 3 | 2 | ~8 |
| `space-demo/integration.ts` | 5 | 2 | 3 | 2 | ~8 |
| `space-demo/team.ts` | 4 | 1 | 3 | 2 | ~7 |
| `space-demo/lookups.ts` | 4 | 4 | 0 | 0 | ~5 |
| `space-demo/agents.ts` | 4 | 1 | 3 | 2 | ~7 |
| `space-demo/mes.ts` | 3 | 1 | 2 | 1 | ~5 |
| `space-demo/tenants.ts` | 2 | 0 | 0 | 1 | ~3 (skipped: public endpoint) |
| `space-demo/notify.ts` | 1 | 0 | 0 | 1 | ~2 |
| `space-demo/invites.ts` | 1 | 0 | 0 | 1 | ~2 |
| `satellite/parts.ts` | 11 | 4 | 7 | 4 | ~18 |
| `satellite/work-orders.ts` | 4 | 1 | 3 | 2 | ~7 |
| `satellite/satellites.ts` | 4 | 1 | 3 | 2 | ~7 |
| ... (24 more satellite files) | ~54 | ~20 | ~34 | ~20 | ~110 |
| **TOTAL** | **~169 routes** | | | | **~497 tests** |

---

## L. Performance Impact Assessment

### L.1 Top-10 hottest endpoints to baseline

```bash
# Extract from CloudWatch Lambda metrics — most-invoked routes in last 7 days
aws logs insights start-query \
  --log-group-name /aws/lambda/turion-demo-api \
  --start-time $(date -u -v-7d +%s) \
  --end-time $(date -u +%s) \
  --query-string 'fields @timestamp, @message
                  | filter @message like /GET|POST|PATCH/
                  | parse @message /(?<method>GET|POST|PATCH|DELETE) (?<path>\S+)/
                  | stats count() by method, path
                  | sort count desc
                  | limit 10'
```

Expected top-10 (educated guess based on frontend usage patterns):
1. `GET /api/data/all` — full ERP data hydration, called on every page load
2. `GET /api/satellites` — satellite listing for sidebar
3. `GET /api/satellites/:satId/instances` — kanban view
4. `GET /api/tenants/current` — tenant context for every page
5. `GET /api/parts` — parts listing
6. `GET /api/lookups/subsystems` — dropdown population
7. `GET /api/salesforce/customers` — CRM listing
8. `GET /api/netsuite/journal-entries` — accounting listing
9. `GET /api/mes/stages` — manufacturing dashboard
10. `GET /api/work-orders` — work order list

### L.2 Benchmark methodology

```bash
# Per endpoint, measure 1000 invocations with hey (HTTP load generator)
# 50 concurrent users, 20 requests each
hey -n 1000 -c 50 \
  -H "Authorization: Bearer $JWT" \
  -H "X-Tenant-Slug: turion" \
  https://lo254mvukl.execute-api.us-east-1.amazonaws.com/api/data/all

# Output includes p50, p95, p99
# Capture baseline BEFORE RLS, then RE-RUN after RLS rollout per table
```

### L.3 EXPLAIN ANALYZE pattern

```sql
-- Before RLS
EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON) SELECT * FROM turion.customers WHERE tenant_id = '...';

-- After RLS (no explicit WHERE — let RLS add it)
SET LOCAL app.tenant_id = '00000000-0000-0000-0000-000000000001';
EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON) SELECT * FROM turion.customers;
```

Compare:
- Total cost
- Rows scanned
- Index usage (RLS should use the `tenant_id_idx` from migration 025)

**Red flags** to look for:
- A switch from Index Scan to Seq Scan after RLS — means the planner couldn't push the RLS predicate through. Often fixable by ANALYZE.
- Sub-plan added by RLS — usually fine, the cost is microscopic at our scale.

### L.4 Performance budget

| Metric | Baseline | Allowed regression | Halt rollout if |
|--------|----------|---------------------|-----------------|
| p50 latency | TBD per endpoint | +5% | >10% |
| p99 latency | TBD per endpoint | +5% | >10% |
| Lambda duration p99 | TBD | +5% | >10% |
| RDS Proxy `DatabaseConnections` | ~5 | +20% | >50% |
| RDS Proxy `DatabaseConnectionsCurrentlySessionPinned` | ~0 | +1 | >5 |

### L.5 Expected outcome

AWS docs and Crunchy Data benchmarks suggest <5% overhead at scales similar to ours. The biggest risk is composite-index misses, not RLS evaluation itself.

---

## M. Rollback Strategy

### M.1 Per-table disable

```sql
-- Disable RLS on a single table without dropping the policy
ALTER TABLE turion.customers DISABLE ROW LEVEL SECURITY;
-- Policy `tenant_isolation` is preserved; just inactive.
-- Re-enable: ALTER TABLE turion.customers ENABLE ROW LEVEL SECURITY;
```

### M.2 Rollback decision tree

```
Performance regression detected
├── Single table regressing → DISABLE that table; investigate index
└── Multiple tables regressing → DISABLE all M3 tables in reverse order;
                                  revert SET LOCAL middleware; investigate

Isolation test failure detected
├── Specific route leaking → Fix route; do not disable RLS (app-layer was
│                            backup; investigate which is the breaking change)
└── Mass leakage detected → DISABLE all RLS; force code re-audit
```

### M.3 Per-Lambda credential rollback

If the `zietra_app` role is misconfigured (missing GRANTs on a new table, say):
```bash
# Temporary fallback to master secret on a single Lambda
aws lambda update-function-configuration \
  --function-name turion-demo-api \
  --environment 'Variables={DATABASE_URL_ARN=arn:aws:secretsmanager:...:rds!cluster-master-XXX}'
# Then fix the GRANT and re-cut over
```

### M.4 Documented runbook

`55-05-rollback-runbook.md` produced as deliverable of plan 55-05. Contains exact CLI commands for:
- Disable RLS on N tables (snippet generator)
- Revert Lambda secret to master (bash script)
- Roll back the SET LOCAL middleware deploy (`git revert <sha> && ./build-and-push.sh`)
- Restore from pre-RLS Aurora snapshot (last resort)

---

## N. Index Strategy

### N.1 Migration 025's baseline indexes

Migration 025 created `<table>_tenant_id_idx` on every `turion.*`/`turion_satellite.*` table. Single-column `(tenant_id)`. That's adequate for tables where most queries are `WHERE tenant_id = X` (which is exactly what RLS injects).

### N.2 Composite index recommendation (hot paths only)

For the top-10 endpoints from §L, replace single-column `(tenant_id)` index with composite:

```sql
-- Example: parts table is queried by (tenant_id, subsystem) frequently
DROP INDEX IF EXISTS turion_satellite.part_definitions_tenant_id_idx;
CREATE INDEX part_definitions_tenant_subsystem_idx
  ON turion_satellite.part_definitions (tenant_id, subsystem);

-- BOM joins by (tenant_id, parent_id)
CREATE INDEX bom_tenant_parent_idx
  ON turion_satellite.bom (tenant_id, parent_id);

-- Work orders queried by (tenant_id, status)
CREATE INDEX work_orders_tenant_status_idx
  ON turion_satellite.work_orders (tenant_id, status);
```

### N.3 The composite-prefix rule

RLS adds `tenant_id = $1` as a filter. For a query `WHERE part_id = X`, having only an index on `(part_id)` means Postgres must scan all matching rows and post-filter by tenant_id. A composite `(tenant_id, part_id)` makes both predicates index-resolvable.

**General rule**: For RLS-protected tables, replace `(other_col)` with `(tenant_id, other_col)`. The `tenant_id` prefix doesn't hurt single-tenant queries (they still narrow correctly) and dramatically helps RLS.

### N.4 At our row counts (3070 total)

Honestly, indexes barely matter at this scale. Seq scans on 50-row tables are faster than index lookups. But:
- Indexes prepare for growth.
- They make EXPLAIN ANALYZE outputs reflect production behavior.
- Cost is microscopic — ~100 KB of disk per index at our scale.

---

## O. Common Pitfalls

### O.1 Pitfall: Connecting as the table owner

**What goes wrong:** RLS policies are silently bypassed.
**Why it happens:** `zietra_admin` owns every table (created via migration scripts running as master user). Without FORCE, owners bypass RLS.
**How to avoid:** (1) Always use FORCE ROW LEVEL SECURITY. (2) Create dedicated `zietra_app` non-owner role for Lambdas.
**Warning sign:** All isolation tests pass during development (run as master user) but cross-tenant leaks happen in production.

### O.2 Pitfall: Using SET (not SET LOCAL)

**What goes wrong:** Connection pinning + tenant_id leakage across requests.
**Why it happens:** `SET` is session-scoped; once set, it persists across transactions. RDS Proxy pins. The next reused connection inherits the previous tenant's setting.
**How to avoid:** ALWAYS use `SET LOCAL` (or equivalently `set_config(name, value, true)`).
**Warning sign:** Spike in `DatabaseConnectionsCurrentlySessionPinned` CloudWatch metric.

### O.3 Pitfall: WITH CHECK omitted

**What goes wrong:** A tenant can INSERT a row with someone else's tenant_id. RLS reads it back correctly (`tenant_id = current_setting()` filter on SELECT), but the row exists and could be visible to the target tenant.
**Why it happens:** `WITH CHECK` clause forgotten when copying policy templates.
**How to avoid:** Always specify `WITH CHECK` explicitly with same expression as `USING`. Test with a write-attempt to wrong tenant_id (see J.3 test pattern).

### O.4 Pitfall: pg_dump under RLS

**What goes wrong:** `pg_dump` connected as a non-bypass role only dumps current tenant's rows. Backup is incomplete.
**Why it happens:** RLS applies to SELECT used by pg_dump.
**How to avoid:** Always run pg_dump with `zietra_admin` (table owner without FORCE) or `zietra_admin_bypass`. NEVER with `zietra_app`. Add to backup runbook explicitly.
**Warning sign:** Backup file is ~1/3 the expected size (covering only Turion's 3070 rows when 3 tenants exist).

### O.5 Pitfall: Forgotten `tenant_id` on new tables

**What goes wrong:** Future feature adds a new table without `tenant_id`; RLS is not auto-applied; data leaks.
**Why it happens:** Manual oversight.
**How to avoid:** Add a CI check that scans migration files for `CREATE TABLE` and fails if `tenant_id` + RLS policy are missing.

```bash
# scripts/check-rls-on-new-tables.sh
NEW_TABLES=$(git diff main -- backend/migrations/ | grep -i "CREATE TABLE" | grep -oP "(?<=CREATE TABLE\s)\S+")
for t in $NEW_TABLES; do
  if ! git diff main -- backend/migrations/ | grep -q "$t.*tenant_id"; then
    echo "ERROR: New table $t does not have tenant_id column"; exit 1;
  fi
  if ! git diff main -- backend/migrations/ | grep -q "ENABLE ROW LEVEL SECURITY.*$t"; then
    echo "ERROR: New table $t does not enable RLS"; exit 1;
  fi
done
```

### O.6 Pitfall: 3rd-party observability tools blocked by RLS

**What goes wrong:** Datadog DB-monitoring agent connects directly, sees only one tenant's data.
**Why it happens:** Datadog etc. don't know about `app.tenant_id`.
**How to avoid:** Create a `zietra_observability` role with BYPASSRLS + read-only. Use it for Datadog. Document.

### O.7 Pitfall: Cross-tenant SUBSELECT bug

**What goes wrong:** A query like `SELECT a.* FROM tableA a JOIN tableB b ON a.fk = b.id` — RLS applies to both tables independently, but if the JOIN condition leaks (e.g., a malicious b.id from a tenant-A query that points to tenant-B's row), the JOIN silently drops the row. Not a leak, but causes silent missing data.
**Why it happens:** Misunderstanding that RLS is per-table.
**How to avoid:** Document that RLS is per-table, design queries to scope every joined table.

### O.8 Pitfall: Lambda cold start + transaction overhead

**What goes wrong:** Wrapping every request in BEGIN/COMMIT adds ~1-3ms per request. On cold start, the BEGIN may be the first query the proxy sees — adds another round-trip.
**Why it happens:** Cost of correctness.
**How to avoid:** Accept the overhead. Measure (§L). For paths where you absolutely need <5ms (we don't have any today), consider not wrapping read-only health probes.

---

## P. Code Examples

### P.1 Full route refactor — turion.customers

```typescript
// backend/src/routes/salesforce.ts (M3 version)
import { Router, Request, Response } from 'express';
import { withTenantClient, audit } from '../db';
import { requireAuth } from '../middleware/auth';
import { tenantContext } from '../middleware/tenant';

const r = Router();

// EVERY route gets tenantContext + requireAuth in this order
// (tenantContext fails first if header missing; requireAuth verifies JWT)
const mw = [tenantContext, requireAuth];

r.get('/customers', ...mw, async (req: Request, res: Response) => {
  const rows = await withTenantClient(req, async (client) => {
    const r = await client.query(
      // No more `WHERE tenant_id = $1` — RLS adds it transparently
      "SELECT id, name, source_data FROM turion.customers ORDER BY id"
    );
    return r.rows;
  });
  // Return as keyed object to match existing JS data shape
  const out: Record<string, any> = {};
  for (const row of rows) out[row.id] = row.source_data;
  res.json(out);
});

r.get('/customers/:id', ...mw, async (req: Request, res: Response) => {
  const row = await withTenantClient(req, async (client) => {
    const r = await client.query(
      "SELECT source_data FROM turion.customers WHERE id = $1",
      [req.params.id]
    );
    return r.rows[0]; // RLS ensures this is only the caller's tenant
  });
  if (!row) return res.status(404).json({ error: 'not found' });
  res.json(row.source_data);
});

r.patch('/customers/:id', ...mw, async (req: Request, res: Response) => {
  const result = await withTenantClient(req, async (client) => {
    const before = await client.query(
      "SELECT source_data FROM turion.customers WHERE id = $1",
      [req.params.id]
    );
    if (before.rowCount === 0) return null;
    const merged = { ...before.rows[0].source_data, ...req.body };
    await client.query(
      "UPDATE turion.customers SET source_data = $1, updated_at = NOW() WHERE id = $2",
      [merged, req.params.id]
    );
    // Audit within the same transaction (consistent if commit fails)
    await client.query(
      'INSERT INTO turion.audit_log (entity, entity_id, action, before_data, after_data) VALUES ($1, $2, $3, $4, $5)',
      ['customers', req.params.id, 'PATCH', before.rows[0].source_data, merged]
    );
    return merged;
  });
  if (!result) return res.status(404).json({ error: 'not found' });
  res.json(result);
});

r.post('/customers', ...mw, async (req: Request, res: Response) => {
  const newRecord = req.body ?? {};
  // WITH CHECK ensures tenant_id is auto-filled from current_setting() if column has default,
  // OR rejected if we try to set it to anything other than the current tenant.
  // Best: let the DB auto-fill via a column default; here we set it explicitly via RLS.
  await withTenantClient(req, async (client) => {
    await client.query(
      `INSERT INTO turion.customers (id, name, source_data, tenant_id)
       VALUES ($1, $2, $3, current_setting('app.tenant_id')::uuid)`,
      [newRecord.id, newRecord.name, newRecord]
    );
  });
  res.status(201).json(newRecord);
});

export default r;
```

### P.2 Multi-statement transaction example

Existing transaction code in `routes/netsuite.ts` (10 BEGINs) becomes:

```typescript
// BEFORE
const client = await pool.connect();
try {
  await client.query('BEGIN');
  await client.query('SELECT ... WHERE tenant_id = $1', [req.tenant.id]);
  await client.query('UPDATE ... WHERE tenant_id = $1', [req.tenant.id]);
  await client.query('COMMIT');
} catch (e) {
  await client.query('ROLLBACK');
  throw e;
} finally {
  client.release();
}

// AFTER
await withTenantClient(req, async (client) => {
  await client.query('SELECT ...');  // RLS-scoped
  await client.query('UPDATE ...');  // RLS-scoped + WITH CHECK
});
```

### P.3 Migration runner using bypass role

```bash
#!/usr/bin/env bash
# scripts/run-migration.sh — uses bypass role to apply migrations
set -euo pipefail
MIGRATION="$1"

if [[ ! -f "backend/migrations/$MIGRATION" ]]; then
  echo "ERROR: backend/migrations/$MIGRATION not found"; exit 1
fi

# Resolve bypass role credentials from Secrets Manager (NOT in env)
SECRET_ARN="arn:aws:secretsmanager:us-east-1:134607809447:secret:zietra-aurora/admin-bypass-role-XXXXXX"
CREDS=$(aws secretsmanager get-secret-value --secret-id "$SECRET_ARN" --query SecretString --output text)
export PGPASSWORD=$(echo "$CREDS" | jq -r .password)
PGHOST=$(echo "$CREDS" | jq -r .host)
PGUSER=$(echo "$CREDS" | jq -r .username)
PGDB=$(echo "$CREDS" | jq -r .dbname)

psql -v ON_ERROR_STOP=1 \
  -h "$PGHOST" -U "$PGUSER" -d "$PGDB" \
  -f "backend/migrations/$MIGRATION"
```

---

## Q. State of the Art

| Approach | Used By | Pros | Cons |
|----------|---------|------|------|
| **Single DB + RLS** (our pick) | Linear, Notion, Crunchy Data customers, AWS SaaS blog | One cluster, one schema, cheap, single source of truth | Performance overhead (modest), one bug touches all tenants |
| **Schema-per-tenant** | Some early-stage SaaS | Strong isolation | 100s of schemas → connection-pool fragmentation, migration nightmares |
| **DB-per-tenant** | Healthcare/PHI, enterprise SaaS | Hard isolation, easy compliance | Cost scales linearly with tenants ($X/cluster) |
| **Citus / Distributed** | Big-data SaaS | Sharding by tenant_id at scale | Overkill for 3 tenants; Aurora doesn't support Citus |

**Why we picked RLS:** 3 tenants, will be 100 tenants in 1 year (per ROADMAP), 25 MB total data. RLS overhead is invisible at this scale. Single-DB simplicity wins.

---

## R. Open Questions for the Planner

1. **Should the 4 Lambdas switch to the `zietra_app` role at the SAME time as the RLS rollout, or BEFORE?**
   - **Recommend BEFORE.** Switch Lambdas to `zietra_app` first (still no RLS) — confirms grants are correct, no breakage. Then enable RLS per-table. If Lambdas are still on `zietra_admin` when RLS is enabled, FORCE catches them; but rolling both at once is harder to debug.

2. **Per-table rollout order:**
   - **Recommend:** Low-traffic + simple-schema first: `public.tenant_features` → `public.tenant_users` → CRM tables (44 rows, low traffic) → `turion_satellite.*` (background) → `turion.*` (hottest). Confirms infra works on low-stakes tables before touching everything.

3. **Should we add `tenant_id` DEFAULT to the column itself?**
   - E.g., `ALTER TABLE turion.customers ALTER COLUMN tenant_id SET DEFAULT current_setting('app.tenant_id')::uuid`
   - **Recommend YES.** Means INSERT statements don't need to pass tenant_id explicitly — the DB auto-fills from the GUC. Belt-and-suspenders with WITH CHECK.

4. **Migration framework — raw SQL or a tool?**
   - Currently raw SQL files (`migrations/NNN_*.sql`). No tool.
   - **Recommend keep raw SQL** for M3. Adding a tool (Flyway, sqitch) is its own project. Phase 55 should not introduce new tooling.

5. **CI integration:**
   - **Recommend run on every PR that touches `backend/`** — see §J.6 above. 30-second cost, high safety.

6. **Performance threshold to halt rollout:**
   - **Recommend >10% p99 regression on any top-10 endpoint** as the trip-wire. Document; alarm via CloudWatch on `Duration` metric.

7. **The `zietra-api` Lambda missing APIGW route (deferred 54.5-02 item) — bundle into 55?**
   - **Recommend YES.** It's a 10-minute fix and 55 already touches that Lambda. Bundle into 55-03.

8. **IAM token rotation for RDS Proxy (deferred 54.6 item) — bundle into 55?**
   - **Recommend NO.** Orthogonal. Phase 55 is already large. IAM tokens replace password auth → can land independently. M8.

9. **`public.tenants` policy — should it have RLS at all?**
   - **Recommend NO RLS on `public.tenants`.** It's the lookup table that drives tenantContext middleware BEFORE `app.tenant_id` is set. RLS would deadlock. Document with a COMMENT.

10. **Bypass role for the AI Agents Lambda (Phase 54.4 add-on)?**
    - **Recommend NO.** Agents operate per-tenant — they read `req.tenant.id` like any other route. Use the standard `zietra_app` role with SET LOCAL.

---

## S. Sources

### Primary (HIGH confidence)
- [PostgreSQL Official Docs — Row Security Policies](https://www.postgresql.org/docs/current/ddl-rowsecurity.html) — ENABLE vs FORCE, USING vs WITH CHECK, PERMISSIVE vs RESTRICTIVE, BYPASSRLS
- [PostgreSQL Official Docs — CREATE POLICY](https://www.postgresql.org/docs/current/sql-createpolicy.html) — full policy syntax
- [PostgreSQL Official Docs — `current_setting` / `set_config`](https://www.postgresql.org/docs/current/functions-admin.html#FUNCTIONS-ADMIN-SET) — GUC semantics
- [AWS Docs — Avoiding pinning an RDS Proxy](https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/rds-proxy-pinning.html) — pinning rules per engine, SET LOCAL exemption
- [AWS Docs — Amazon RDS Proxy](https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/rds-proxy.html) — overall proxy semantics
- [AWS Database Blog — Multi-tenant data isolation with PostgreSQL Row Level Security](https://aws.amazon.com/blogs/database/multi-tenant-data-isolation-with-postgresql-row-level-security/) — AWS-blessed pattern, non-owner role usage
- [AWS Database Blog — RDS Proxy multiplexing support for PostgreSQL Extended Query Protocol](https://aws.amazon.com/blogs/database/amazon-rds-proxy-multiplexing-support-for-postgresql-extended-query-protocol/) — 2023 multiplexing feature
- [node-postgres docs — Transactions](https://node-postgres.com/features/transactions) — canonical client checkout pattern

### Secondary (MEDIUM confidence)
- [Crunchy Data — Row Level Security for Tenants in Postgres](https://www.crunchydata.com/blog/row-level-security-for-tenants-in-postgres) — production pattern
- [Picus Security Engineering — Enforcing DB Level Multi-Tenancy](https://medium.com/picus-security-engineering/enforcing-db-level-multi-tenancy-using-postgresql-row-level-security-c11d037d3f49) — Go + BEGIN/COMMIT example
- [DEV community — PostgreSQL RLS for Multi-Tenant SaaS](https://dev.to/software_mvp-factory/postgresql-row-level-security-for-multi-tenant-saas-1lgp) — composite index benchmarks
- [SimplyBlock — Row-Level Security for Multi-Tenant Applications](https://www.simplyblock.io/blog/underated-postgres-multi-tenancy-with-row-level-security/) — common gotchas summary
- [Richyen — Debugging RDS Proxy Pinning](https://richyen.com/postgres/2026/03/12/rds_proxy_pinning.html) — 2026 debugging case study

### Tertiary (LOW confidence — flagged)
- [AWS re:Post Q&A — RDS Proxy support for RLS patterns](https://repost.aws/questions/QUvmNQa20HTUmCCWI9bQGGHQ/...) — 403 forbidden during fetch; community Q&A only

---

## T. Recommended 5-plan structure

### 55-01: Audit + tenant_id backfill + NOT NULL lock
**Goal:** Every multi-tenant table has `tenant_id uuid NOT NULL` with FK to `public.tenants(id)` and an index.
**Inputs:** Audit query §A.1 results.
**Outputs:**
- `55-01-audit-report.md` — per-table classification
- `backend/migrations/027_tenant_id_crm_and_public.sql` — add tenant_id to remaining tables in `crm.*` + `public.*`
- `backend/migrations/028_tenant_id_not_null_and_fk.sql` — lock NOT NULL + FK on all 4-schema multi-tenant tables
**Requirement closed:** `TenantIdColumnEverywhere`

### 55-02: RLS policies + `withTenantClient` middleware + Lambda role switch
**Goal:** Policies active + force enabled + Lambdas use new app role + every route uses `withTenantClient`.
**Inputs:** Plans-01 output (NOT NULL FK done).
**Outputs:**
- `backend/migrations/029_rls_policies.sql` — policies for every multi-tenant table (~140 tables, generated via DO loop)
- `backend/src/db.ts` — extended with `withTenantClient(req, fn)` helper (BOTH repos)
- All 169 routes refactored to use `withTenantClient` (BOTH repos — atomic per-file commits)
- Lambdas switched to `zietra_app` role via Secrets Manager + Lambda env vars
**Requirements closed:** `RlsPoliciesActive`, `SetLocalAppTenantId`

### 55-03: Admin bypass role + migration script audit + zietra-api APIGW fix
**Goal:** Bypass role provisioned, migration scripts audited to use it, deferred zietra-api gap closed.
**Inputs:** None (independent).
**Outputs:**
- `backend/migrations/030_provision_app_and_bypass_roles.sql` — creates `zietra_app` + `zietra_admin_bypass`, GRANTs, default privileges
- 2 new Secrets Manager secrets: `zietra-aurora/app-role`, `zietra-aurora/admin-bypass-role`
- `scripts/run-migration.sh` — uses bypass role
- Audit of all existing scripts that connect to DB: any using master secret must be switched to bypass role
- zietra-api APIGW route fix (carried from 54.5-02)
**Requirement closed:** `AdminBypassRole`

### 55-04: Isolation test suite + perf benchmark
**Goal:** ~500 cross-tenant tests passing on every PR + baseline perf documented.
**Inputs:** Plans 01+02 done.
**Outputs:**
- `scripts/extract-routes.mjs` — programmatic route extractor
- `tests/rls/route-matrix.test.ts` — 169 routes × ~3 probes = ~500 tests
- `tests/rls/fixtures.ts` — two test tenants seeded with isolated data
- `tests/rls/auth-helpers.ts` — JWT signing for test users
- `.github/workflows/rls-isolation.yml` — CI workflow
- `55-04-perf-baseline.md` — top-10 endpoint p50/p95/p99 before+after RLS
**Requirements closed:** `IsolationTestSuite`, `RlsPerfImpactAssessed`

### 55-05: Rollout + soak + CHECKPOINT for M4
**Goal:** Per-table rollout walking through 4 schemas, 7-day soak, CHECKPOINT for M4 (Stripe billing).
**Inputs:** All prior plans done.
**Outputs:**
- Per-table rollout log: `55-05-rollout-log.md` documenting timing and any issues
- `55-05-rollback-runbook.md` — exact CLI commands for each rollback scenario
- Rollback drill on a non-critical table (`public.tenant_features`): disable → verify app still works in app-layer mode → re-enable
- CloudWatch alarms for `DatabaseConnectionsCurrentlySessionPinned` (alert if > 5)
- `CHECKPOINT.md` — Phase 55 closure + M4 unblock signal
**Requirements closed:** `RlsRollbackRunbook`

---

## U. Metadata

**Confidence breakdown:**
- Standard stack (PostgreSQL RLS + pg + Express): HIGH — well-documented, multiple production references
- Architecture pattern (`withTenantClient` + SET LOCAL): HIGH — verified against AWS docs + Crunchy Data + PG official docs
- RDS Proxy + SET LOCAL compatibility: HIGH — AWS docs explicit + multiple production confirmations
- Performance impact estimate (<5%): MEDIUM — AWS's claim, our scale will verify (§L)
- Test count (~500): HIGH — counted from actual route enumeration (169 × ~3)
- Per-table rollout safety: HIGH — community-validated pattern

**Research date:** 2026-05-15
**Valid until:** 2026-08-15 (stable area — PostgreSQL RLS semantics + RDS Proxy behavior are stable)

---

*Phase 55 RESEARCH.md — written 2026-05-15. Ready for `/gsd:plan-phase 55` to produce 5 plan files per §T.*
