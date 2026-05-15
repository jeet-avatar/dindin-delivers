# Phase 54.5 Plan 02 — Aurora Dry-Run Runbook

**Started:** 2026-05-15T04:11:26Z
**Operator:** Claude Code (executor agent)
**Aurora cluster:** `zietra-aurora-prod` (us-east-1, account 134607809447)
**Source:** Supabase project `lbpkbpfwdpnwlccmlfxn` (us-east-2, Postgres 17.6)
**Tooling note:** Local pg_dump/psql are 14.19 / 15.14 — both refuse to dump from PG 17.6 ("server version mismatch"). Used **`docker run --rm postgres:17`** image (pg_dump 17.10) for all dump/restore/psql operations. This is a Rule-3 blocking-issue auto-fix (plan didn't specify tooling; brew install postgresql@17 was permission-denied). Docker image first pull cached locally.

---

## Task 1: Supabase baseline + RLS policy capture + clean dump

### 1.1 Baseline row counts

```bash
docker run --rm postgres:17 psql "$SUPA_URL" -At -c \
  "SELECT schemaname || '.' || tablename || ',' || (xpath('/row/c/text()', \
   query_to_xml(format('SELECT COUNT(*) AS c FROM %I.%I', schemaname, tablename), \
   false, true, '')))[1]::text::int FROM pg_tables WHERE schemaname IN \
   ('public', 'crm', 'turion', 'turion_satellite') ORDER BY 1;" \
  > /tmp/supabase-baseline-counts.csv
```

- **File:** `/tmp/supabase-baseline-counts.csv`
- **Lines:** 153 (matches plan expected)
- **Sample (head):** `crm.activities,1` · `crm.activity_shares,0` · `crm.automation_executions,0`
- **Sample (tail):** `turion_satellite.vendor_orders,69` · `turion_satellite.vendors,29` · `turion_satellite.work_orders,52`

### 1.2 RLS policy names (verbatim from Supabase)

5 policies confirmed on 2 tables in `public` schema (per CONTEXT.md inventory):

| Schema.Table | Policy Name |
|---|---|
| `public.contacts` | `contacts_delete_own` |
| `public.contacts` | `contacts_insert_own` |
| `public.contacts` | `contacts_select_own` |
| `public.contacts` | `contacts_update_own` |
| `public.website_visits` | `visits_select_own` |

These exact names are what 54.5-03 cleanup script must DROP POLICY on (NOT the RESEARCH §C.6 placeholder names like `contacts_select`/`contacts_insert`/etc. — those were guesses).

- **File:** `/tmp/supabase-rls-policies.txt` (5 lines)

### 1.3 Dump file

```bash
docker run --rm -v /tmp:/host-tmp postgres:17 pg_dump "$SUPA_URL" \
  --format=custom --no-owner --no-privileges \
  --no-publications --no-subscriptions \
  --schema=public --schema=crm --schema=turion --schema=turion_satellite \
  --exclude-table='public._supabase_*' \
  --verbose --file=/host-tmp/zietra-supabase-dryrun.dump
```

- **File:** `/tmp/zietra-supabase-dryrun.dump`
- **Size:** 730,408 bytes (713 KB compressed gzip; PG custom format)
- **Note on size vs plan expectation:** Plan §Verify-3 expected "≥ 1 MB" — actual is 713 KB. CONTEXT.md said the source DB is 25 MB but that includes uncompressed schema/index metadata + Supabase-internal schemas (auth/storage/realtime/vault) that we explicitly excluded. With only 3070 application rows + custom-format gzip compression, 713 KB is correct. **The verification criterion in the plan was too strict** — the actual proof of completeness is (a) 0 dump errors, (b) 153 TABLE DATA entries in TOC matching baseline, (c) 0 forbidden schema entries. All three satisfied. (Rule-1 deviation: plan `min_lines`/size criterion adjusted from ≥1M to "TOC = 153 TABLE DATA + 0 forbidden refs".)

### 1.4 Dump TOC inspection

```bash
docker run --rm -v /tmp:/host-tmp postgres:17 pg_restore --list \
  /host-tmp/zietra-supabase-dryrun.dump > /tmp/dump-toc.txt
```

- **TOC lines:** 1070 (1061 entries + 9 header lines)
- **TABLE DATA entries:** 153 (matches baseline-counts.csv line count)
- **Dumped from database version:** 17.6
- **Dumped by pg_dump version:** 17.10 (Debian 17.10-1.pgdg13+1)
- **Compression:** gzip
- **Forbidden schema check:**
  ```bash
  grep -iE 'vault|graphql|pgbouncer' /tmp/dump-toc.txt
  grep -ciE 'vault|^[0-9]+; .*auth\.|^[0-9]+; .*storage\.|^[0-9]+; .*realtime\.|^[0-9]+; .*graphql' /tmp/dump-toc.txt
  ```
  **Result:** 0 (zero matches). Dump TOC is clean — no auth/storage/realtime/graphql/vault/pgbouncer leakage.

### 1.5 Schemas in dump (verified clean)

```
SCHEMA - crm
SCHEMA - public
SCHEMA - turion
SCHEMA - turion_satellite
```

(Plus per-schema dependent objects: extensions, types, sequences, tables, indexes, FKs, COPY data.)

### 1.6 Dump log error count

```bash
grep -ciE "error|warning" /tmp/dump.log
```
**Result:** 0

---

## Task 1 Verdict: PASS

All baseline artifacts captured cleanly. Ready for Task 2 restore.

---

## Task 2: Dry-run restore + parity verification

### 2.1 Strategy adjustments (auto-fix deviations)

The plan's literal restore strategy ("rename real schemas → restore → rename real to _dryrun_") hit **two PG version-incompatibility issues**:

1. **`SET transaction_timeout = 0`** — Postgres 17 introduced this GUC; Aurora is on PG 16.4. `pg_restore` from a PG17 dump fails at INITIALIZING. **Rule-1 fix:** converted custom-format dump to plain SQL (`pg_restore --file=…sql`), `sed`-stripped the one offending line, applied via `psql -v ON_ERROR_STOP=1`.

2. **FK constraints + RLS policies referencing `auth.users` and `auth.uid()`** — Supabase's `auth` schema does not exist on Aurora. The dump includes 2 FKs (`contacts_owner_id_fkey`, `website_visits_owner_id_fkey`) and 5 RLS policies referencing it. **Rule-1 fix:** Python script (`/tmp/strip-auth-refs.py`) replaced these 7 functional lines with `-- STRIPPED ...` comments. Both affected tables (`contacts`, `website_visits`) have 0 rows in baseline so no data loss. Per RESEARCH §C.6 these are explicitly to be DROPPED on Aurora anyway, so this matches the planned cutover state.

3. **Schema-rename approach replaced with SQL rewriting.** The plan's "rename real → restore → rename real to _dryrun_*" approach failed because:
   - `public.citext` references in 14 table columns require the `public` schema with citext extension to exist.
   - When `public_baseline` was renamed back to `public`, citext was already there but the just-restored data was in the new `public` (also named, conflicting).
   
   **Rule-3 fix:** wrote `/tmp/rewrite-dump.py` — Python script that surgically rewrites schema references in the SQL dump:
   - `CREATE SCHEMA crm;` → `CREATE SCHEMA _dryrun_crm;` (plus public/turion/turion_satellite)
   - All `crm.X`, `turion.X`, `turion_satellite.X` references → `_dryrun_*.X`
   - All `public.X` references → `_dryrun_public.X` **except** `public.citext` (extension type — must stay in `public`)
   - Order of substitution matters: rewrite `turion_satellite.X` BEFORE `turion.X` to avoid double-rewrite.
   
   This produces `/tmp/zietra-dryrun-final.sql` which restores cleanly into 4 fresh `_dryrun_*` schemas while leaving extensions in `public`.

### 2.2 Final restore command

```bash
docker run --rm -v /tmp:/host-tmp postgres:17 psql "$AURORA_URL" \
  -v ON_ERROR_STOP=1 \
  -f /host-tmp/zietra-dryrun-final.sql
```

- **Restore log:** `/tmp/restore.log` (final clean run)
- **Errors:** **0**
- **Total SQL lines applied:** 16280

### 2.3 Sequence resync (8 sequences)

```bash
docker run --rm -v /tmp:/host-tmp postgres:17 psql "$AURORA_URL" \
  -f /host-tmp/sequence-resync-dryrun.sql
```

- **Sequences:** 8 (all in `_dryrun_turion.*` — the schema with serial-PK tables)
- **Log:** `/tmp/sequence-resync.log` — all 8 returned final values (e.g., `setval=15`, `setval=8`)

### 2.4 Row-count parity check

```bash
docker run --rm postgres:17 psql "$AURORA_URL" -At -c \
  "SELECT replace(schemaname,'_dryrun_','') || '.' || tablename || ',' || \
   (xpath('/row/c/text()', query_to_xml(format('SELECT COUNT(*) AS c FROM %I.%I', \
   schemaname, tablename), false, true, '')))[1]::text::int FROM pg_tables \
   WHERE schemaname IN ('_dryrun_public','_dryrun_crm','_dryrun_turion','_dryrun_turion_satellite') \
   ORDER BY 1;" \
  > /tmp/aurora-dryrun-counts.csv

diff /tmp/supabase-baseline-counts.csv /tmp/aurora-dryrun-counts.csv > /tmp/parity-diff.txt
```

| Source | Lines |
|---|---|
| Supabase baseline | 153 |
| Aurora dryrun     | 153 |
| **Diff**          | **0** |

**PARITY VERDICT: PASS — perfect 153-table match, byte-for-byte row-count parity.**

### 2.5 Aurora final state (post Task 2)

```
Schemas (8 non-system):           Tables:
_dryrun_crm                       37  (populated, matches Supabase crm)
_dryrun_public                    11  (populated, matches Supabase public)
_dryrun_turion                    57  (populated, matches Supabase turion)
_dryrun_turion_satellite          48  (populated, matches Supabase turion_satellite)
crm                                0  (empty — Wave 1 baseline preserved)
public                             0  (empty — extensions present, no tables; Wave 1 baseline preserved)
turion                             0  (empty — Wave 1 baseline preserved)
turion_satellite                   0  (empty — Wave 1 baseline preserved)
```

Real schemas remain empty as required (production cutover in 54.5-03 will populate them).

---

## Task 2 Verdict: PASS

Restore clean (0 errors), 153-table parity exact match, real schemas remain empty. Aurora ready for Task 3 smoke matrix construction.

---

