# Phase 54.5 CONTEXT — Aurora Postgres migration audit

> Concrete inventory of Supabase usage as of 2026-05-15. Source for the planner.
> Supabase project: `lbpkbpfwdpnwlccmlfxn` · Region: `us-east-2` · Pooler host: `aws-1-us-east-2.pooler.supabase.com` · DB user: `postgres.lbpkbpfwdpnwlccmlfxn`
> Migration target: Aurora Postgres in `us-east-1` (account `134607809447`).

---

## A. Lambda env vars pointing at Supabase

Audited 14 Lambdas in `us-east-1` (`turion-*`, `marquee-*`, `asc606-*`, `zietra-*`).

| Lambda | Env Var(s) | Pooler host:port | Schema | Action at cutover |
|--------|-----------|------------------|--------|-------------------|
| `turion-demo-api` | `DATABASE_URL` (inline plaintext) | `…pooler.supabase.com:6543` (pgbouncer) | `turion` | Update env var → Aurora writer endpoint |
| `turion-satellite-api` | `DATABASE_URL_ARN` → secret `turion-satellite/production/database-url-NCbgX6` | `…pooler.supabase.com:6543` (pgbouncer) | `turion_satellite` | Rotate secret value → Aurora |
| `zietra-crm-api` | `DATABASE_URL`, `DIRECT_URL`, `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` | `…pooler.supabase.com:6543` + `:5432` | `crm` | Update env vars → Aurora; drop SUPABASE_* (unused — no `@supabase/*` imports in repo) |
| `zietra-api` | `SUPABASE_DB_URL`, `SUPABASE_DB_URL_SERVICE`, `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` | `…pooler.supabase.com:6543` | `public` (default) | Update DB URL vars → Aurora; drop SUPABASE_* |
| `marquee-app` | `null` (no env vars) | n/a — uses **SQLite at /tmp** (per Lambda Description) | n/a | **OUT OF SCOPE** |
| `asc606-app` | `MARQUEE_API_TOKEN`, `ASC606_STORE_BUCKET=asc606-store-prod`, `MARQUEE_JWT_SECRET` | n/a — uses **S3 store + Marquee API** | n/a | **OUT OF SCOPE** |
| `marquee-hourly-report`, `marquee-visitor-alert`, `zietra-tracker`, all 4 `zietra-cognito-*` | none with DB | n/a | n/a | **OUT OF SCOPE** |

**4 Lambdas to flip at cutover: `turion-demo-api`, `turion-satellite-api`, `zietra-crm-api`, `zietra-api`.**

Note: all use port `6543` (pgbouncer) despite the prior memory note that "migrations need port 5432" — port choice is a runtime detail, not a connection-string lock-in.

---

## B. AWS Secrets Manager secrets containing DB connection

| Secret ARN | Lambda(s) using it | Current host | Action at cutover |
|------------|--------------------|--------------|-------------------|
| `turion-satellite/production/database-url-NCbgX6` | `turion-satellite-api` | Supabase pooler `:6543` schema=`turion_satellite` | Rotate → Aurora |
| `dollor/production/zietra-meet-8vOBAN` | (zietra-meet — verify which Lambda reads it; likely zietra-crm-api or unused) | Supabase pooler `:6543` schema=`crm` | Rotate → Aurora |
| `turion-satellite/production/supabase-anon-key-cxGmm1` | (probably unused — repo has no `@supabase/*` imports) | n/a | DELETE post-cutover |
| `dollor/staging/database-url-QrJCDo` | Dollor mobile staging | **`dollor-db.c23qcukqe810.us-east-1.rds.amazonaws.com:5432`** = RDS already | **OUT OF SCOPE** |
| `dollor/production/database-v2-gd1oKf` | Dollor mobile prod | RDS `dollor-db…us-east-1` | **OUT OF SCOPE** |
| `vibingticket/database-YokeMt` | VibingTicket | RDS `dollor-db…us-east-1` (db `vibingticket`) | **OUT OF SCOPE** |

---

## C. Supabase DB inventory

- **Total size**: 25 MB (entire `postgres` database — trivial to dump/restore).
- **Schemas in use** (12 total): `public`, `crm`, `turion`, `turion_satellite` are the only **app** schemas. Supabase-internal: `auth`, `storage`, `realtime`, `graphql`, `graphql_public`, `extensions`, `pgbouncer`, `vault`.
- **Per-schema row + table counts**:

  | Schema | Tables | Rows |
  |--------|--------|------|
  | `turion_satellite` | 48 | 2017 |
  | `turion` | 57 | 959 |
  | `crm` | 37 | 44 |
  | `public` | 11 | 50 (incl. tenants=3, tenant_users=6, tenant_features=39) |
  | (Supabase-internal: auth/storage/realtime ignored) | — | 441 |
  | **App total** | **153 tables** | **3070 rows** |

- **Indexes**: 463 total across the 4 app schemas (crm=176, satellite=136, turion=120, public=31).
- **Foreign keys**: 193 total across app schemas (turion_satellite=126, crm=58, public=9). `turion` schema has **0 FKs** — dump order won't matter for it.
- **Extensions**: `citext 1.6`, `pg_stat_statements 1.11`, `pgcrypto 1.3`, `plpgsql 1.0`, `supabase_vault 0.3.1`, `uuid-ossp 1.1`. **`supabase_vault` is Supabase-only** — Aurora replacement: drop (vault schema has 0 rows) or substitute KMS+secrets-manager.

---

## D. Supabase-specific feature usage

Searched `/Users/jeet/turion-space-demo`, `/Users/jeet/turion-satellite`, `/Users/jeet/asc606`, `/Users/jeet/doordash-p2p` (marquee not local).

- `@supabase/*` imports: **0 files** in any backend repo.
- `auth.uid()` / `auth.jwt()` calls in app code: **0**.
- `storage.from(...)` calls: **0**.
- Realtime channels / `supabase.channel(...)`: **0**.
- **RLS policies referencing `auth.uid()` in DB**: **5 policies** (`public.contacts` ×4, `public.website_visits` ×1) — both tables have **0 rows**. Drop or replace with app-level filtering at cutover.

**VERDICT: Pure Postgres usage at the application layer.** Backends use plain `postgres`/`pg` driver with `DATABASE_URL`. Migration is straightforward `pg_dump | pg_restore`. The only Supabase-specific artifacts are (a) RLS on two empty tables, (b) `supabase_vault` extension on an empty schema.

---

## E. ASC606 + Marquee DB scope

- **`marquee-app`**: SQLite-at-/tmp (per Lambda description). Not a Postgres consumer. **OUT OF SCOPE.**
- **`asc606-app`**: S3 store (`ASC606_STORE_BUCKET=asc606-store-prod`) + calls Marquee API for tenant data. No DB connection. **OUT OF SCOPE.**
- **`dollor-*` mobile prod/staging + vibingticket**: already on AWS RDS Postgres at `dollor-db.c23qcukqe810.us-east-1.rds.amazonaws.com`. **OUT OF SCOPE.**

---

## Open questions for the planner

1. **Aurora networking**: Lambdas currently have no VPC config (talk to public Supabase pooler). Aurora in a VPC requires either (a) public Aurora endpoint + SG allowlist for Lambda egress IPs (requires NAT/VPC) or (b) attaching the 4 Lambdas to the Aurora VPC subnets + security groups. (b) is the AWS-recommended pattern but adds cold-start latency. Pick one before provisioning.
2. **Maintenance window**: All 4 Lambdas serve demo traffic only. Cutover can be any time — confirm zero scheduled demos in next 7 days.
3. **`pg_dump` format**: Use `-Fc` (custom, parallel restore) — DB is 25 MB so dump completes in seconds either way; `-Fc` lets us `--jobs=4` on restore and selectively skip the `supabase_vault` + `auth/storage/realtime/graphql*/pgbouncer/extensions` schemas.
4. **Logical replication vs dump/restore**: 25 MB DB + tolerable demo downtime → pure dump/restore is sufficient (estimated <2 min cutover). No need for `pglogical` complexity.
5. **Aurora snapshot strategy**: Take a manual snapshot of the empty Aurora cluster pre-restore (rollback to clean state if restore fails), then a second snapshot immediately post-restore (rollback target if app traffic corrupts data in first hour).
6. **Schema-name preservation**: Apps connect via `?schema=turion` / `?schema=turion_satellite` / `?schema=crm` query params (Prisma-style). Aurora doesn't change this — `pg_restore` recreates schemas as-is. Verify Prisma migration history table (`_prisma_migrations`) is restored per-schema.
7. **`supabase_vault` extension**: Not available on Aurora. Vault schema is empty (0 rows) — safe to drop. Confirm no app code reads from `vault.*`.
8. **RLS on `public.contacts` + `public.website_visits`**: Both tables empty. Decision: drop the RLS policies on Aurora since app does its own filtering; or replicate the pattern with a Cognito-sub-derived `app.current_user_id` set via `SET LOCAL` per request.
9. **Connection pooling**: Supabase pgbouncer (`:6543`) handles connection multiplexing. Aurora needs RDS Proxy (recommended for Lambda) or app-side pool. Provision RDS Proxy alongside Aurora cluster.
10. **Cognito-config secret reuse**: `zietra/cognito-config-yP3J9B` is unrelated — leave as-is.

---

*Audit performed 2026-05-15. Sources: `aws lambda get-function-configuration`, `aws secretsmanager`, direct `psql` to Supabase pooler `:5432`, `grep` over local repos.*
