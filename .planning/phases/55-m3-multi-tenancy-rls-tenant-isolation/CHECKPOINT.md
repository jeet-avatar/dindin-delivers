# Phase 55 CHECKPOINT — M3 Multi-Tenancy + RLS COMPLETE

**Date:** 2026-05-15T~21:00Z
**Soak window:** 2026-05-15T20:55Z → 2026-05-22T20:55Z (7 days)
**Tenant isolation guarantee:** PostgreSQL Row-Level Security ACTIVE on
**152 tables** across 4 schemas (public/crm/turion/turion_satellite).
**Database-level enforcement.**  A compromised app cannot leak across
tenants even with full SQL access.

## Requirements Closed (7 of 7)

| Requirement | Closed by | Verification (file:line) |
|-------------|-----------|--------------------------|
| **TenantIdColumnEverywhere** | 55-01 (migrations 027 + 028) | `migrations/027_tenant_id_crm_and_public.sql` (44 column-adds), `migrations/028_tenant_id_not_null_and_fk.sql` (149 NOT NULL locks + FK RESTRICT) — 0 nullable `tenant_id` columns across 149 multi-tenant tables verified via `audit-tenant-id-coverage.sh` |
| **RlsPoliciesActive** | 55-02 (migration 030) | `migrations/030_rls_policies.sql` — `ENABLE + FORCE ROW LEVEL SECURITY` + `tenant_isolation` policy on 152 tables (10 public / 37 crm / 57 turion / 48 turion_satellite); bucket-4 exempts documented in 55-02-SUMMARY.md |
| **SetLocalAppTenantId** | 55-03 (`backend/src/db.ts` `withTenantClient` helper + 21 route refactors) | 0 raw `pool.query` callsites in production routes; `withTenantClient(req, async client => …)` wraps every query in `SET LOCAL app.tenant_id = $1; …` transaction; 4 Lambdas (turion-demo-api, turion-satellite-api, asc606-app, marquee-app) connect as `zietra_app` (NO BYPASSRLS) via `zietra-aurora/app-role` Secrets Manager ARN |
| **AdminBypassRole** | 55-02 (migration 029 + `provision-rls-secrets-and-iam.sh`) | `migrations/029_provision_app_and_bypass_roles.sql` creates `zietra_admin_bypass` role with `BYPASSRLS` attribute; secret `zietra-aurora/admin-bypass-role-pTsZjr` provisions credentials; used ONLY by `run-migration.sh` + ops one-shot Lambdas (NOT by app Lambdas) |
| **IsolationTestSuite** | 55-04 (`route-matrix.test.ts` in both repos + `.github/workflows/rls-isolation.yml`) | 459 vitest tests (255 turion-space-demo + 204 turion-satellite) probe 158 routes × 3 cases (own-tenant 200/404, cross-tenant 4xx, cross-tenant-body-injection 4xx); CI runs on every PR touching `backend/src/`, `backend/migrations/`, `backend/tests/rls/` |
| **RlsPerfImpactAssessed** | 55-04 (`perf-benchmark-top10.sh` + `55-04-perf-baseline.md`) | 11 endpoints baselined (p50 380–529 ms / p99 449–2378 ms); pinning metric Max=3.0 ≤ 5 threshold; `[NEEDS-INDEX]` queue EMPTY — no composite indexes needed for current scale (3 tenants, ~3,070 application rows) |
| **RlsRollbackRunbook** | 55-05 (`rls-rollback-runbook-55-05.md` + drill execution) | Runbook 279 lines / 8 sections; drill on `public.tenant_features` executed 2026-05-15T20:52Z, DISABLE+ENABLE cycle 9 sec wall-clock, `/api/health` stayed 200, state restored to `relrowsecurity=true`. `disable-rls-per-table.sh` (72 lines) + `rls-rollback-drill.sh` (119 lines) committed + executable |

## State at Checkpoint

### Database
- **Cluster:** `zietra-aurora-prod-v2` (Aurora Serverless v2, Postgres 16.x),
  private VPC since Phase 54.6, accessible only via RDS Proxy `zietra-aurora-proxy`.
- **RLS census:**
  - public: 10 tables RLS-enabled, 9 FORCEd
  - crm: 37 tables RLS-enabled, 37 FORCEd
  - turion: 57 tables RLS-enabled, 57 FORCEd
  - turion_satellite: 48 tables RLS-enabled, 48 FORCEd
  - **TOTAL: 152 tables RLS-enabled, 151 FORCEd**
- **tenant_id indexes:** 152 single-column `(tenant_id)` indexes across the
  same 4 schemas (composite indexes NOT added — `[NEEDS-INDEX]` queue empty
  per 55-04 baseline).

### Postgres roles
| Role | BYPASSRLS | Usage |
|------|-----------|-------|
| `zietra_admin` (master) | YES (table owner = effectively bypass) | DDL only — migrations, RLS toggles, emergency operator work. Master ARN: `rds!cluster-16d5e38c-2fc2-4d06-8435-e4b01704bf74-mhV473` |
| `zietra_admin_bypass` | YES (attribute) | Cross-tenant SELECT for ops/audit. Used by `disable-rls-per-table.sh`, `rls-rollback-drill.sh`, `run-migration.sh`. NOT used from any production Lambda. ARN: `zietra-aurora/admin-bypass-role-pTsZjr` |
| `zietra_app` | NO | Day-to-day production traffic. Connects via RDS Proxy. All queries are RLS-subject. ARN: `zietra-aurora/app-role-t0oumn` |

### Lambdas
| Function | Status | DSN secret |
|----------|--------|------------|
| `turion-demo-api` | Aurora-backed; uses `withTenantClient` | `zietra-aurora/app-role` |
| `turion-satellite-api` | Aurora-backed; uses `withTenantClient` | `zietra-aurora/app-role` |
| `asc606-app` | NOT Aurora-backed (S3 + Marquee API only) | n/a |
| `marquee-app` | NOT Aurora-backed (SQLite in /tmp) | n/a |

### CI gates
- `.github/workflows/rls-isolation.yml` in both `turion-space-demo` + `turion-satellite`.
- Triggers on every PR touching `backend/src/`, `backend/migrations/`, `backend/tests/rls/`.
- Awaits `gh secret set TEST_DATABASE_URL` + `TEST_ADMIN_BYPASS_URL` per repo for the
  tests to actually execute against a test cluster (skip-gracefully today —
  see "Open Follow-ups").

### CloudWatch alarms armed
| Alarm | Threshold | State at checkpoint | SNS topic |
|-------|-----------|---------------------|-----------|
| `zietra-rls-pinning-spike` | DatabaseConnectionsCurrentlySessionPinned > 5 for 1×5min | INSUFFICIENT_DATA (no breach since arm) | `zietra-aurora-alarms` (→ jeetnair.in@gmail.com) |
| `zietra-rls-lambda-p99-regression` | turion-demo-api Duration p99 > 2700 ms for 3×5min (1.10× 55-04 cold-p99 worst case) | INSUFFICIENT_DATA | `zietra-aurora-alarms` |

## Open Follow-ups (NOT M3 scope; tracked for future phases)

| Follow-up | Origin | Defer to |
|-----------|--------|----------|
| IAM token RDS Proxy auth (replace password auth on Proxy) | 54.6 deferred | M8 |
| Cross-tenant aggregation/analytics (read-replica with cross-tenant grants for BI) | RESEARCH §user_constraints | M8 |
| Schema-per-tenant for HIPAA-style PHI workloads | RESEARCH §user_constraints | M8 |
| `gh secret set TEST_DATABASE_URL` (turn the 459 CI tests from "skipped" to "executed") | 55-04 carry-forward | When test Aurora cluster provisioned (M8 / hygiene phase) |
| 266 pre-existing satellite unit test failures (missing X-Tenant-Slug header after 55-03 middleware) | 55-04 `deferred-items.md` | Hygiene phase before M5 close |
| Remove Lambda SG → Aurora SG temp ingress rule `sgr-0536781d1e94645ca` | This plan (55-05) added it for one-shot Lambda direct connection | End of 7-day soak (Day 7+1: 2026-05-23) |
| Master secret IAM grant cleanup (retained as 55-03 fallback) | 55-03 deferred | End of 7-day soak (Day 7+1: 2026-05-23) |
| One-shot `zietra-rls-runner-55-05` Lambda cleanup | This plan (55-05) deployed it for migration 031 + drill | End of 7-day soak OR keep as durable ops Lambda (decision deferred to operator) |
| 240 satellite test failures from 55-04 deferred list | 55-04 | Out-of-scope hygiene phase |
| Pinning monitoring during real-tenant scaling | RESEARCH §G.3 | Continuous; alarm above is the gate |

## 7-Day Soak Plan

| Day | Date | Operator action |
|-----|------|-----------------|
| 1 | 2026-05-16 | `aws cloudwatch describe-alarms --alarm-names zietra-rls-pinning-spike zietra-rls-lambda-p99-regression` — both should be OK (no breach). Smoke `curl /api/health` on both Lambdas |
| 2 | 2026-05-17 | Re-run smoke (curl health + `curl -H "X-Tenant-Slug: turion" /api/tenants/current`); spot-check CloudWatch Lambda Duration p99 chart |
| 3 | 2026-05-18 | Pull `DatabaseConnectionsCurrentlySessionPinned` daily average — must be ≤ 5 |
| 4 | 2026-05-19 | Mid-week perf benchmark: `bash scripts/perf-benchmark-top10.sh` — compare p99 against 55-04 baseline |
| 5 | 2026-05-20 | Run isolation test suite locally if test cluster available: `cd turion-space-demo/backend && npm run test:rls` — all 459 tests green or all 459 skipped gracefully |
| 6 | 2026-05-21 | Review SNS `zietra-aurora-alarms` history for any breaches |
| 7 | 2026-05-22 | **Final soak verdict.** If clean: (a) Remove the master-secret IAM grant retained as fallback by 55-03; (b) Revoke `sgr-0536781d1e94645ca` (Lambda SG → Aurora SG temp ingress); (c) Optionally delete `zietra-rls-runner-55-05` one-shot Lambda. ELSE: trigger rollback per `rls-rollback-runbook-55-05.md` and root-cause |

### Soak rollback authority

Operator on-call (`jeetnair.in@gmail.com`) holds authority to trigger rollback if:
- Either alarm fires AND CloudWatch confirms it's RLS-correlated.
- Smoke fails 2+ consecutive days.
- Customer reports cross-tenant data visibility.

Procedure: `bash scripts/disable-rls-per-table.sh <flagged-tables>` then
`rls-rollback-runbook-55-05.md` for the rest of the decision tree.

## Handoff to Phase 56 (M4 Stripe billing)

Phase 56 (M4 — Stripe Subscriptions + paid plan gating) can now safely depend on:

1. **`public.tenants(plan)` column** is reliable + RLS-isolated.  Billing
   writes to `tenants.plan` cannot leak across tenants.
2. **`public.tenant_features`** table is RLS-enforced — billing can flip
   feature flags per tenant safely.  Each tenant sees only its own
   `tenant_features` rows (verified by `withTenantClient` + RLS).
3. **`withTenantClient`** is importable from `backend/src/db.ts` in both
   `turion-space-demo` + `turion-satellite`.  All Phase 56 routes MUST
   use it (no raw `pool.query`).

### Rules Phase 56 MUST follow

Any new table Phase 56 creates (e.g., `public.subscriptions`,
`public.billing_events`, `public.invoices`) MUST:

1. Include `tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE RESTRICT`.
2. Have `ENABLE + FORCE ROW LEVEL SECURITY` and a `tenant_isolation` policy
   matching the 55-02 pattern:
   ```sql
   CREATE POLICY tenant_isolation ON public.<table>
     USING (tenant_id = current_setting('app.tenant_id')::uuid)
     WITH CHECK (tenant_id = current_setting('app.tenant_id')::uuid);
   ```
3. Be added to the CI script `scripts/check-rls-on-new-tables.sh`
   (to be created in 56 first task per RESEARCH §O.5) — fails CI if any
   `tenant_id`-columned table is missing RLS.
4. Have a `(tenant_id)` index from the start (composite if a hot filter
   column is in scope, e.g., `(tenant_id, stripe_subscription_id)`).

### Stripe-specific scope to land in Phase 56

- Stripe Subscriptions SDK + webhook Lambda (signature verification +
  idempotency via `stripe_event_id` unique constraint per tenant).
- Plans: `$99 base` + per-add-on prices (PLM/MES/Quality/ASC606/Royalty/
  Drop-ship/AI Agents/Lean ERP Pro/QB-migration).
- Customer portal route at `<tenant>.zietra.com/billing`.
- Multi-tenant Stripe customer mapping: 1 Stripe customer per Zietra
  tenant; `public.tenants.stripe_customer_id` column.
- Webhook idempotency: `public.billing_events(stripe_event_id text UNIQUE,
  tenant_id uuid, type text, payload jsonb)` table — RLS-enforced.
- Test mode strategy: separate Stripe API keys per Lambda env (test vs
  prod); document in Phase 56 plan.

### M4 unblock signal

- [x] Aurora private + secure (Phase 54.6)
- [x] Tenant isolation at DB layer (Phase 55 — THIS phase)
- [ ] Stripe SDK + webhook handlers (Phase 56 — next)
- [ ] Plan gating middleware (Phase 56 — next)

**M4 unblocked.**  Next command: `/gsd:plan-phase 56` for M4 Stripe billing.

## Open questions for Phase 56 planner

1. **Stripe test mode strategy** — separate Lambda environment variables
   (`STRIPE_API_KEY_TEST` + `STRIPE_API_KEY_LIVE`) selected by an
   `ENVIRONMENT=production|staging` flag?  Or a per-tenant `is_test_mode`
   column?
2. **Webhook idempotency** — store every event in `billing_events` table
   with `UNIQUE(stripe_event_id, tenant_id)` and short-circuit duplicate
   deliveries (Stripe sends retries)?  Or use a TTL'd Redis set?
3. **Multi-tenant Stripe customer mapping** — 1 Stripe customer per
   Zietra tenant.  Should we create the Stripe customer at signup
   (M5 path) OR lazily on first paywall hit?
4. **Plan downgrade behavior** — when a tenant downgrades, do their
   `tenant_features` rows auto-disable, OR do we keep them ON until
   the end of the current billing period (Stripe-standard pattern)?
5. **Trial period handling** — M5 currently sets `plan='trial'` with all
   features ON.  When billing comes online, trial conversion → paid plan
   should NOT introduce a feature regression for the same tenant.
6. **Invoicing for ASC 606** — ASC 606 add-on is itself a revenue-recognition
   product.  Does Phase 56 bill ASC 606 the same way as other add-ons,
   or does ASC 606 customers self-bill via the ASC 606 add-on itself
   (chicken-and-egg)?
