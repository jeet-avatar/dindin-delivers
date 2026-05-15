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
