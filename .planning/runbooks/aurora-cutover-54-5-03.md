# Aurora Cutover Runbook — Phase 54.5 Plan 03

> Live record of the production cutover from Supabase → Aurora.
> Timestamps in UTC. Updated incrementally as each task completes.

## Pre-cutover state (verified before T-0)

- Operator GO received via orchestrator: 2026-05-15T04:5x:xxZ (Task 1 checkpoint satisfied)
- Aurora baseline: 4 real schemas with 153 tables (DDL only, 0 rows) — leftover from Wave 2 dryrun cleanup
  - **Wave 2 SUMMARY claimed Aurora was empty (4 real schemas, 0 tables) but reality showed 153 empty-table DDLs.** Treated as Rule-3 blocking auto-fix: dropped + recreated all 4 schemas before restore.
- 4 pre-flight env files present at `/tmp/preflight-env-<lambda>.json` (mode 600)
- 5 RLS policy real names captured at `/tmp/supabase-rls-policies.txt`
- Supabase password resolves from Secrets Manager (`zietra-aurora-prod/supabase-source-password-temp-EK6Egr`, 13 chars)
- All 4 Lambdas still on Supabase pooler (zero production impact during prep)
- Tooling verified: docker (postgres:17 image cached), jq 1.6, psql via Docker

## T-0: Cutover begin

T_START = 2026-05-15T04:57:25Z (epoch 1778821045)

## Task 2 — Final dump + restore + sequence resync + RLS cleanup + post-restore snapshot

### T+0:00 — Final Supabase row counts

- File: `/tmp/supabase-final-counts.csv`
- Lines: 153 (expected 153) — matches pre-cutover Wave 2 baseline
- Source: live `psql` via Docker postgres:17 against `aws-1-us-east-2.pooler.supabase.com:5432`

### T+0:01 — Final pg_dump from Supabase

- Command: `docker run --rm -e PGPASSWORD postgres:17 pg_dump -h aws-1-us-east-2.pooler.supabase.com -p 5432 -U postgres.lbpkbpfwdpnwlccmlfxn -d postgres --format=custom --no-owner --no-privileges --no-publications --no-subscriptions --schema=public --schema=crm --schema=turion --schema=turion_satellite --exclude-table='public._supabase_*'`
- File: `/tmp/zietra-supabase-final-20260514-215802.dump`
- Size: 730,408 bytes (713 KB)
- Verbose log: `/tmp/dump-final.log` (153 TABLE DATA entries)
- **Note:** Plan §verify-1 expected ≥ 1 MB; actual is 713 KB. Per Wave 2 finding #6, the size criterion is wrong (3070 rows compresses smaller); structural proof via 153 tables + parity diff is the correct verification.

### T+0:02 — Convert custom-format → plain SQL + strip PG17 GUCs + strip auth.X refs

Per Wave 2 lessons:
- Convert `pg_restore --file=...sql` to plain SQL (1.7 MB, 13116 lines)
- Strip `SET transaction_timeout = 0` (PG17-only) and `SET idle_in_transaction_session_timeout = 0` — sed line-delete
- Strip 7 `auth.X` references via Python script:
  - 2 ALTER TABLE … ADD CONSTRAINT … REFERENCES auth.users (multi-line strip via lookahead)
  - 5 CREATE POLICY … auth.uid() (multi-line statement collection)
- **Bug found in initial strip:** First-pass python script left orphan `ALTER TABLE` statements when the `ADD CONSTRAINT` line was the next line. Fixed: lookahead to find next non-blank line and strip BOTH.
- Result: `/tmp/zietra-supabase-final-stripped.sql`, 13112 lines, 7 STRIPPED markers, 0 functional auth.X references (3 remaining are inside SQL comments — harmless)

### T+0:03 — Aurora pre-restore prep (DEVIATION)

**Wave 2 SUMMARY claimed Aurora was empty post-Wave-2 cleanup. Reality showed 153 empty-table DDLs in real schemas.** Rule-3 auto-fix:
1. `DROP SCHEMA IF EXISTS turion_satellite CASCADE`
2. `DROP SCHEMA IF EXISTS turion CASCADE`
3. `DROP SCHEMA IF EXISTS crm CASCADE`
4. `DROP SCHEMA IF EXISTS public CASCADE`
5. `CREATE SCHEMA public; GRANT ALL`
6. Pre-create 4 extensions in public: citext 1.6, pgcrypto 1.3, uuid-ossp 1.1, pg_stat_statements 1.10
   (Required because the dump references `public.citext` for table column types but does NOT contain CREATE EXTENSION lines — pg_dump excluded extensions when we filtered to 4 app schemas.)
7. Patch dump to skip `CREATE SCHEMA public;` and `COMMENT ON SCHEMA public IS …` (sed line-delete) — would conflict with the pre-existing public schema.

### T+0:05 — pg_restore to Aurora real schemas

- Command: `docker run --rm -e PGPASSWORD -v /tmp:/host-tmp postgres:17 psql -h $WRITER -U zietra_admin -d zietra -v ON_ERROR_STOP=1 -f /host-tmp/zietra-supabase-final-stripped.sql`
- Exit code: **0**
- Log line count: 1093
- **Error count: 0**
- Tables created in real schemas: 153 (verified)

### T+1:30 — Sequence resync

- 8 sequences resynced (turion schema only — others have no serial PKs)
- Generated SQL: `/tmp/sequence-resync-final.sql` (8 lines)
- Apply log: `/tmp/seq-resync-final.log` (40 lines, 0 errors)

### T+1:35 — RLS policy cleanup

- Initial DISABLE inside heredoc was no-op-effect because dump's RLS DDL ran AFTER it (psql order issue) → re-issued explicit `ALTER TABLE … DISABLE ROW LEVEL SECURITY` after restore
- 5 policies dropped: `contacts_delete_own`, `contacts_insert_own`, `contacts_select_own`, `contacts_update_own`, `visits_select_own`
- Verified: `pg_policies` count = 0 for both tables, `pg_tables.rowsecurity` = false for both tables

### T+1:40 — Post-restore snapshot (background, paranoia layer)

- Snapshot ID: `zietra-aurora-pre-migration-cutover-2026-05-15`
- ARN: `arn:aws:rds:us-east-1:134607809447:cluster-snapshot:zietra-aurora-pre-migration-cutover-2026-05-15`
- Initial status: `creating` (will be `available` by Task 4 verify)

### T+1:45 — Parity GATE

- File: `/tmp/aurora-final-counts.csv` (153 lines)
- Diff: `diff /tmp/supabase-final-counts.csv /tmp/aurora-final-counts.csv > /tmp/parity-final.txt`
- **Parity diff line count: 0**
- **PARITY GATE PASSED** — Aurora row counts exactly match Supabase across all 153 tables

## Task 3 — 4 Lambda env vars/secrets flipped to Aurora

### T+2:05 — turion-demo-api

- **DEVIATION (Rule 3):** Plan-template inline JSON to `--environment "Variables=..."` failed with "Expected: '=', received: '\"'" because of special chars in env values. Switched to `file://` JSON input pattern.
- File: `/tmp/lambda-env-turion-demo.json` (455 bytes, `{Variables: {...}}` shape)
- Pre-flip: `DATABASE_URL` host = `aws-1-us-east-2.pooler.supabase.com:6543`
- Post-flip: `DATABASE_URL` host = `zietra-aurora-prod.cluster-c23qcukqe810.us-east-1.rds.amazonaws.com:5432`, `?schema=turion`
- LastUpdateStatus: Successful

### T+2:30 — turion-satellite-api (rotate secret + force cold start)

- **DEVIATION (Rule 3):** Plan secret-id `turion-satellite/production/database-url-NCbgX6` failed by-Name lookup (Wave 2 secret-id format). Used full ARN: `arn:aws:secretsmanager:us-east-1:134607809447:secret:turion-satellite/production/database-url-NCbgX6` — works.
- Pre-rotation secret host: `aws-1-us-east-2.pooler.supabase.com:6543` (`postgresql://postgres.lbpkbpfwdpnwlccmlfxn:Thirumala977%21@...`)
- Post-rotation secret host: `zietra-aurora-prod.cluster-c23qcukqe810.us-east-1.rds.amazonaws.com:5432`, `?schema=turion_satellite`
- Lambda description bumped (force cold start) — twice (once at first attempt before secret rotated, once after rotation succeeded)
- LastUpdateStatus: Successful

### T+3:00 — zietra-crm-api

- File: `/tmp/lambda-env-zietra-crm.json`
- Pre-flip key count: 24 (incl. SUPABASE_URL/ANON_KEY/SERVICE_ROLE_KEY)
- Post-flip key count: 21 (3 SUPABASE_* keys deleted)
- DATABASE_URL host: `zietra-aurora-prod...:5432`, `?schema=crm`
- DIRECT_URL host: `zietra-aurora-prod...:5432`, `?schema=crm`
- SUPABASE_*_URL/ANON/SERVICE remaining: 0
- LastUpdateStatus: Successful

### T+3:30 — zietra-api

- File: `/tmp/lambda-env-zietra-api.json`
- Pre-flip keys: ENVIRONMENT, FINGERPRINT_SALT, SUPABASE_ANON_KEY, SUPABASE_DB_URL, SUPABASE_DB_URL_SERVICE, SUPABASE_SERVICE_ROLE_KEY, SUPABASE_URL (7 total)
- Post-flip keys: ENVIRONMENT, FINGERPRINT_SALT, SUPABASE_DB_URL, SUPABASE_DB_URL_SERVICE (4 total — 3 SUPABASE_*_URL/ANON/SERVICE deleted)
- SUPABASE_DB_URL host: `zietra-aurora-prod...:5432`, `?schema=public`
- SUPABASE_DB_URL_SERVICE host: same
- **Note:** Per RESEARCH §D.3, env-var NAMES kept as `SUPABASE_DB_URL` / `SUPABASE_DB_URL_SERVICE` (baked into code). Renaming = code change = Phase 56+.
- LastUpdateStatus: Successful

### T+4:00 — Belt-and-suspenders force-refresh

- Description bump on turion-demo-api, zietra-crm-api, zietra-api (satellite already had two bumps)
- All 4 Lambdas LastUpdateStatus = Successful

### Skipped: dollor/production/zietra-meet-8vOBAN

Per Wave 2 Open Q1 resolution: secret is UNUSED by any Lambda. Skipped rotation as planned.

### Final verification

| Lambda | Status | Aurora refs in env | Supabase refs in env |
|--------|--------|---------------------|----------------------|
| turion-demo-api | Successful | 1 (DATABASE_URL) | 0 |
| turion-satellite-api | Successful | (via secret, not env) | 0 |
| zietra-crm-api | Successful | 2 (DATABASE_URL + DIRECT_URL) | 0 |
| zietra-api | Successful | 2 (SUPABASE_DB_URL + SUPABASE_DB_URL_SERVICE) | 0 |

Satellite secret value contains `zietra-aurora-prod`: VERIFIED.

## Task 4 — Production smoke matrix + SG hardening + NEXT_SESSION update

(populated by executor during Task 4)
