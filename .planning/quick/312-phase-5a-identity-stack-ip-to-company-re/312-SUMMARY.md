---
phase: 312-phase-5a-identity-stack-ip-to-company-re
plan: 01
subsystem: tcp-identity-stack
tags: [tcp, php, hostinger, identity, ip-resolution, provider-abstraction, stub, sql, phase-5a]
dependency-graph:
  requires:
    - "305-SUMMARY.md (existing stats.php endpoint + auth gate + .htaccess whitelist)"
    - "307-SUMMARY.md (identified_visitors table + _visitor.php helpers + tcp_vid cookie)"
    - "310-SUMMARY.md (Phase 3 fingerprint + collect.php INSERT structure with device_fingerprint)"
    - "311-SUMMARY.md (Phase 4 stats.php hot_leads + by_org structure)"
    - "Hostinger MySQL u350621741_visitors (page_views + identified_visitors)"
  provides:
    - "tcp_resolve_ip_to_company() helper in _visitor.php with IP_LOOKUP_PROVIDER='stub' active"
    - "IP_LOOKUP_PROVIDER + IPINFO_API_TOKEN_PLACEHOLDER constants — Phase 5b release-blocker scaffolding"
    - "page_views.{company_name, company_domain, company_type} + idx_company_domain"
    - "identified_visitors.company_domain + idx_company_domain_iv"
    - "collect.php writes 3 new fields per pageview INSERT (NULL when stub returns null)"
    - "stats.php windows[*].by_company top-30 sibling of existing by_org block"
    - "Phase 5b release-blocker filed: flip provider constant + paste real token + add cache + TOS audit"
  affects:
    - "/Users/jeet/techcloudpro/api/_visitor.php (PATCH +81 — appended provider constants + helper)"
    - "/Users/jeet/techcloudpro/api/collect.php (PATCH +11/-3 — resolver call + INSERT extension)"
    - "/Users/jeet/techcloudpro/api/stats.php (PATCH +22 — by_company block per window)"
    - "Hostinger /api/_visitor.php (scp deployed)"
    - "Hostinger /tcp-analytics/collect.php (scp deployed)"
    - "Hostinger /tcp-analytics/stats.php (scp deployed)"
    - "DB: page_views (3 ADD COLUMN + 1 ADD INDEX) + identified_visitors (1 ADD COLUMN + 1 ADD INDEX)"
tech-stack:
  added: []
  patterns:
    - "Provider abstraction via PHP `define()` constant — single-line flip in Phase 5b"
    - "Stub-first deployment to lock data shape before real provider wiring"
    - "Coexist-with-org — page_views.org (ASN string from ip-api.com) UNCHANGED, page_views.company_* are an additional layer (NOT a replacement)"
    - "Total resolver — never throws, always returns 3-key array (NULL fields where lookup fails)"
    - "Private/loopback short-circuit — applies to ALL providers, never forward to real lookup"
    - "Single resolver call per request — placed AFTER fingerprint backfill, BEFORE INSERT"
    - "One-shot probe pattern (mirror 305/307/310) — schema migration + readback via probes deployed → run → DELETED + verified-removed"
key-files:
  created:
    - "/Users/jeet/doordash-p2p/.planning/quick/312-phase-5a-identity-stack-ip-to-company-re/IP_COMPANY_SCHEMA_PROBE.md"
    - "/Users/jeet/doordash-p2p/.planning/quick/312-phase-5a-identity-stack-ip-to-company-re/312-SUMMARY.md (this file)"
  modified:
    - "/Users/jeet/techcloudpro/api/_visitor.php (+81 — appended IP_LOOKUP_PROVIDER + IPINFO_API_TOKEN_PLACEHOLDER + tcp_resolve_ip_to_company)"
    - "/Users/jeet/techcloudpro/api/collect.php (+11/-3 — resolver call + 3 new INSERT columns)"
    - "/Users/jeet/techcloudpro/api/stats.php (+22 — by_company top-30 SQL block + JSON output key)"
decisions:
  - "Provider abstraction is a `define()` constant + switch{} — one-line change in Phase 5b. Stub branch returns deterministic mock data for 8.8.* (Google LLC) and 13.107.* (Microsoft Corporation); ipinfo and maxmind branches exist as TODO stubs that return all-null."
  - "page_views.org column is UNCHANGED — backward-compat guarantee. by_org block in stats.php remains byte-identical. company_* columns are an ADDITIONAL layer, NOT a replacement. by_company and by_org coexist in stats.php JSON."
  - "Schema columns are nullable VARCHAR — additive, never breaks existing INSERTs. New indexes are non-unique BTREE for fast GROUP BY in stats.php by_company."
  - "Single resolver call per pageview, placed AFTER the Phase 3 fingerprint backfill block but BEFORE the INSERT. tcp_resolve_ip_to_company() never throws — wraps all error paths."
  - "Private/loopback IPs (127., 10., 192.168.) short-circuit the switch with company_type='internal'. Bypasses provider entirely (no point + provider TOS may charge for noise)."
  - "Probe path /api/_probe-312-* (not /tcp-analytics/) because /tcp-analytics/.htaccess deny-by-default regex `^(?!admin|collect|trap|stats).*\\.php$` pre-empts PHP. /api/ has no .htaccess — mirrors 310 pattern."
metrics:
  duration: "~5 minutes (PLAN_START 2026-04-29T03:54:01Z → PLAN_END 2026-04-29T03:58:57Z)"
  completed: "2026-04-29T03:58:57Z"
  tasks: 2
  files: 5
---

# Quick Task 312: TCP Identity-Stack Phase 5a — IP-to-Company Stub Provider Scaffold Summary

## One-liner

Provider-abstracted IP-to-company resolver scaffold on techcloudpro.com — `tcp_resolve_ip_to_company()` with `IP_LOOKUP_PROVIDER='stub'` returning deterministic mock data for 8.8.*/13.107.* prefixes, 6 schema migrations applied (page_views + identified_visitors get 4 new nullable columns + 2 indexes), `collect.php` writes 3 new fields per pageview INSERT, `stats.php` emits `by_company` top-30 sibling of existing `by_org` (UNCHANGED), 6/6 verification batteries PASS verbatim — Phase 5b is now a single-line provider flip + token paste + caching + TOS audit, NOT a re-architecture.

## What was built

| Layer | What | File |
|-------|------|------|
| **Provider abstraction** | `IP_LOOKUP_PROVIDER` + `IPINFO_API_TOKEN_PLACEHOLDER` constants + `tcp_resolve_ip_to_company(string $ip): array` total resolver with switch{} for stub/ipinfo/maxmind branches | `api/_visitor.php` (PATCH +81) |
| **Schema migration** | `page_views.{company_name,company_domain,company_type}` VARCHAR NULL + `idx_company_domain` BTREE; `identified_visitors.company_domain` + `idx_company_domain_iv` BTREE — applied via one-shot probe → run → deleted | DB only (probe artifact in IP_COMPANY_SCHEMA_PROBE.md) |
| **collect.php wiring** | Single `tcp_resolve_ip_to_company($ip)` call per request placed AFTER Phase 3 fingerprint backfill, BEFORE INSERT. INSERT extended from 20 to 23 columns with 3 new bound parameters. Existing `$org` ASN-level field UNCHANGED | `api/collect.php` (PATCH +11/-3) |
| **stats.php by_company** | Top-30 GROUP BY `(company_domain, company_name, company_type)` with `WHERE company_domain IS NOT NULL`. Inserted AFTER block 7 (by_org) and BEFORE block 8 (by_country). `'by_company' => $by_company` added to `$result[$name]` array right after `'by_org'` | `api/stats.php` (PATCH +22) |

## Verification — verbatim live evidence (per CLAUDE.md protocol)

All curls use Safari UA (Cloudflare WAF blocks default curl UA per project memory rule).

### Battery 1 — Schema migration

Full DESCRIBE output preserved in `IP_COMPANY_SCHEMA_PROBE.md`. All 6 ALTERs returned `OK` verbatim:

```json
"migrations": [
    { "step": "ALTER TABLE page_views ADD COLUMN company_name VARCHAR(255) NULL",   "result": "OK" },
    { "step": "ALTER TABLE page_views ADD COLUMN company_domain VARCHAR(255) NULL", "result": "OK" },
    { "step": "ALTER TABLE page_views ADD COLUMN company_type VARCHAR(64) NULL",    "result": "OK" },
    { "step": "ALTER TABLE page_views ADD INDEX idx_company_domain (company_domain)", "result": "OK" },
    { "step": "ALTER TABLE identified_visitors ADD COLUMN company_domain VARCHAR(255) NULL",  "result": "OK" },
    { "step": "ALTER TABLE identified_visitors ADD INDEX idx_company_domain_iv (company_domain)", "result": "OK" }
]
```

`page_views_new_cols` shows the 3 new columns AND **`org` (existing column UNCHANGED — backward-compat preserved)**:

```json
"page_views_new_cols": [
    { "COLUMN_NAME": "company_domain", "DATA_TYPE": "varchar", "IS_NULLABLE": "YES" },
    { "COLUMN_NAME": "company_name",   "DATA_TYPE": "varchar", "IS_NULLABLE": "YES" },
    { "COLUMN_NAME": "company_type",   "DATA_TYPE": "varchar", "IS_NULLABLE": "YES" },
    { "COLUMN_NAME": "org",            "DATA_TYPE": "varchar", "IS_NULLABLE": "YES" }
]
```

Both indexes verified by SHOW INDEX (Cardinality=1, BTREE, Non_unique=1, Null=YES). Probe deleted: `ls: cannot access ...api/_probe-312-schema.php: No such file or directory`.

**Battery 1 PASS.**

### Battery 2 — POST with X-Forwarded-For: 8.8.8.8 → Google LLC row

```bash
SESS2="b2-1777435064"
curl -sS -A "$UA" -H "X-Forwarded-For: 8.8.8.8" \
  -X POST "https://techcloudpro.com/tcp-analytics/collect.php" \
  -H "Content-Type: application/json" \
  -d "{\"type\":\"pageview\",\"page\":\"/test-312-google-stub\",\"session_id\":\"$SESS2\"}"
# → {"ok":true}
```

DB readback (probe `_probe-312-readback.php` deployed → run → deleted):

```json
{
    "id": 3173,
    "page": "/test-312-google-stub",
    "session_id": "b2-1777435064",
    "ip": "8.8.8.8",
    "company_name": "Google LLC",
    "company_domain": "google.com",
    "company_type": "hosting",
    "created_at": "2026-04-29 03:57:45"
}
```

**Battery 2 PASS** — exact stub branch values written verbatim. The 8.8.* prefix branch fired correctly.

### Battery 3 — POST with X-Forwarded-For: 192.168.1.1 → all-NULL with company_type='internal'

```bash
SESS3="b3-1777435064"
curl -sS -A "$UA" -H "X-Forwarded-For: 192.168.1.1" \
  -X POST "https://techcloudpro.com/tcp-analytics/collect.php" \
  -H "Content-Type: application/json" \
  -d "{\"type\":\"pageview\",\"page\":\"/test-312-internal-stub\",\"session_id\":\"$SESS3\"}"
# → {"ok":true}
```

DB readback:

```json
{
    "id": 3174,
    "page": "/test-312-internal-stub",
    "session_id": "b3-1777435064",
    "ip": "192.168.1.1",
    "company_name": null,
    "company_domain": null,
    "company_type": "internal",
    "created_at": "2026-04-29 03:57:46"
}
```

**Battery 3 PASS** — private-IP short-circuit fired BEFORE any provider lookup. company_name/domain are NULL, company_type is the literal "internal" bucket.

### Battery 4 — POST with X-Forwarded-For: 203.0.113.42 → all-NULL (unmapped in stub)

```bash
SESS4="b4-1777435064"
curl -sS -A "$UA" -H "X-Forwarded-For: 203.0.113.42" \
  -X POST "https://techcloudpro.com/tcp-analytics/collect.php" \
  -H "Content-Type: application/json" \
  -d "{\"type\":\"pageview\",\"page\":\"/test-312-unmapped-stub\",\"session_id\":\"$SESS4\"}"
# → {"ok":true}
```

DB readback:

```json
{
    "id": 3175,
    "page": "/test-312-unmapped-stub",
    "session_id": "b4-1777435064",
    "ip": "203.0.113.42",
    "company_name": null,
    "company_domain": null,
    "company_type": null,
    "created_at": "2026-04-29 03:57:47"
}
```

**Battery 4 PASS** — public IP not matching either stub prefix returned all-null. Critically: NO fallback to `$org` (the ASN-level field), all 3 columns are pure NULL. This proves the resolver output and the existing `$org` field stay decoupled — by_company and by_org are separate lenses.

Probe deleted post-readback:
```
ls: cannot access '/home/u350621741/domains/techcloudpro.com/public_html/api/_probe-312-readback.php': No such file or directory
```

### Battery 5 — stats.php by_company present in all 4 windows + by_org REGRESSION CHECK

```bash
curl -sS -A "$UA" "https://techcloudpro.com/tcp-analytics/stats.php?s=TcpSecureAdmin2026" \
  | jq '.windows | to_entries | map({window: .key, by_company_present: (.value.by_company != null), by_company_count: (.value.by_company | length), by_org_present: (.value.by_org != null), by_org_count: (.value.by_org | length)})'
```

Verbatim output:

```json
[
  { "window": "today",    "by_company_present": true, "by_company_count": 1, "by_org_present": true, "by_org_count":  9 },
  { "window": "last_7d",  "by_company_present": true, "by_company_count": 1, "by_org_present": true, "by_org_count": 30 },
  { "window": "last_30d", "by_company_present": true, "by_company_count": 1, "by_org_present": true, "by_org_count": 30 },
  { "window": "all_time", "by_company_present": true, "by_company_count": 1, "by_org_present": true, "by_org_count": 30 }
]
```

today.by_company sample (Google LLC entry from B2):

```json
[
  {
    "company_name": "Google LLC",
    "company_domain": "google.com",
    "company_type": "hosting",
    "views": 1
  }
]
```

today.by_org sample (regression intact — same `org / views` structure as 306+):

```json
[
  { "org": "Cox Communications",        "views": 7 },
  { "org": "PT Kawan Lama Sejahtera",   "views": 2 },
  { "org": "DZCRD Networks Ltd",        "views": 1 }
]
```

**Battery 5 PASS** — by_company present in ALL 4 windows with the Google LLC stub entry from B2 surfaced. by_org also present in ALL 4 windows with byte-identical `{org, views}` structure (regression intact — no field renaming, no shape change).

### Battery 6 — Auth gate regression (no token=404, wrong=404, correct=200)

```
$ curl -sS -A "$UA" -o /dev/null -w "%{http_code}\n" "https://techcloudpro.com/tcp-analytics/stats.php"
404
$ curl -sS -A "$UA" -o /dev/null -w "%{http_code}\n" "https://techcloudpro.com/tcp-analytics/stats.php?s=WRONG"
404
$ curl -sS -A "$UA" -o /dev/null -w "%{http_code}\n" "https://techcloudpro.com/tcp-analytics/stats.php?s=TcpSecureAdmin2026"
200
```

**Battery 6 PASS** — 305-era timing-safe `hash_equals` gate intact. Missing/wrong token → 404 (no body leak). Correct token → 200.

## PHASE 5B RELEASE-BLOCKER

**This phase is SCAFFOLDING ONLY.** Stub mode is for E2E lock-in only. **NOT useful in real production until Phase 5b token is wired.** Today, only IPs starting with `8.8.*` and `13.107.*` resolve. Every real visitor's `page_views.{company_name, company_domain, company_type}` row will be NULL. **Do NOT advertise this as a working feature externally.**

### Release-blocker checklist (must close before declaring "IP-to-company live")

- [ ] Flip `IP_LOOKUP_PROVIDER` constant in `_visitor.php` from `'stub'` to `'ipinfo'` or `'maxmind'`
- [ ] Replace `IPINFO_API_TOKEN_PLACEHOLDER` with real token (acquire at https://ipinfo.io/signup — free tier supports 50K lookups/mo, "Basic" tier $99/mo for 250K)
- [ ] Implement the `'ipinfo'` or `'maxmind'` branch body (currently both return `$null_result`):
  - For ipinfo: `curl_init('https://api.ipinfo.io/' . $ip . '?token=' . $token)` with 5s timeout. Map `company.name`, `company.domain`, `company.type` from response JSON. Swallow all errors → return `$null_result`.
  - For maxmind: open GeoLite2-ASN.mmdb + GeoIP2-Domain.mmdb readers (cached in static var), look up ASN org → company_name, registered domain → company_domain, type heuristic → company_type.
- [ ] Add caching layer (APCu or `sys_get_temp_dir()` TTL file, 24-hour key) — don't burn provider quota on repeat IPs within the same session. Suggested: `'tcp_company_lookup_' . md5($ip)` with 86400s TTL.
- [ ] Audit provider TOS for retention rules — ipinfo and MaxMind both allow indefinite storage of resolved data (the ASN-org / company-name strings are public-record metadata about the IP allocation), but verify before turning on.
- [ ] Re-run Battery 4 with a real public IP (e.g. cloudflare 1.1.1.1) — should now resolve to non-null `{company_name: "Cloudflare, Inc.", company_domain: "cloudflare.com", company_type: "hosting"}`.
- [ ] Privacy Policy review — IP→company is metadata about the connection we already had (page_views.ip has been stored since Phase 1), NOT new PII collection. We're labeling existing data, not adding new collection. If reviewer disagrees, file Privacy Policy update before release.
- [ ] (Optional) Backfill the existing 1660+ `page_views` rows by running the resolver against `page_views.ip` for rows with `company_domain IS NULL`. Throttle to provider quota.

**Stub-mode warning, restated:** the only IPs that resolve today are `8.8.x.x` and `13.107.x.x`. Every real visitor since deploy has a `page_views.{company_name, company_domain, company_type}` triple of NULL/NULL/NULL (or NULL/NULL/internal for private IPs). The infrastructure is ready, but the data is empty until Phase 5b lands.

## Privacy stance

**ZERO new privacy concerns this phase.**

- **No external API calls.** Stub branch is pure deterministic in-process logic — no `curl`, no `file_get_contents` to any external host, no `fopen` over network sockets. Verifiable with `grep -E 'curl|file_get_contents|fopen|fsockopen' /Users/jeet/techcloudpro/api/_visitor.php` (note: the existing `tcp_db()` PDO connection is local-only on Hostinger).
- **No new PII collection.** `page_views.ip` has been stored since Phase 1 (task 305 era and earlier). This phase only DERIVES company metadata FROM that already-stored IP. The 3 new columns are labels for existing data, not new collection.
- **Stub mode = mock data only.** company_name='Google LLC' is a hard-coded literal in the switch{} for IPs starting with 8.8.*. No external service was queried to produce it.
- **Phase 5b will require a privacy review** — see release-blocker checklist above. Privacy Policy already covers `page_views.ip` and "Cookies and Tracking Technologies"; whether company-name lookup needs an explicit disclosure is a reviewer call.

### Pre-existing risk (NOT introduced by this task)

DB credentials remain inlined in plaintext PHP across `_visitor.php`, `chat.php`, `stats.php`, `collect.php`, `customize-architecture.php`, `study-guide-download.php`, `identify-from-email.php`. Tracked as Phase X follow-up since 305/307/308/309/310/311. NOT a regression — this task only reuses the existing inline-creds pattern in `_visitor.php`.

## DB tables touched

| Table | Operation | Trigger |
|-------|-----------|---------|
| `page_views` | ALTER ADD COLUMN × 3 (company_name, company_domain, company_type) + ADD INDEX idx_company_domain | One-shot probe migration |
| `page_views` | INSERT (3 new columns appended to existing 20-column INSERT) | Each tracker.js pageview → collect.php |
| `identified_visitors` | ALTER ADD COLUMN company_domain + ADD INDEX idx_company_domain_iv | Same probe |
| `identified_visitors` | (no writes this phase — column added but not yet populated) | N/A |

`identified_visitors.company_domain` is added but never written to in this phase. Phase 5c is expected to backfill it from form-fill email's domain (e.g. `diego.palmieri@mizkan.com` → `mizkan.com`).

## Files changed

| File | Repo | Status |
|------|------|--------|
| `api/_visitor.php` | github.com/jeet-avatar/techcloudpro | patched (+81 — provider constants + helper) |
| `api/collect.php` | github.com/jeet-avatar/techcloudpro | patched (+11/-3 — resolver call + INSERT extension) |
| `api/stats.php` | github.com/jeet-avatar/techcloudpro | patched (+22 — by_company block per window) |
| (server-only) `/api/_visitor.php` | Hostinger 147.93.101.51 | scp deployed |
| (server-only) `/tcp-analytics/collect.php` | Hostinger 147.93.101.51 | scp deployed |
| (server-only) `/tcp-analytics/stats.php` | Hostinger 147.93.101.51 | scp deployed |
| `.planning/quick/312-.../IP_COMPANY_SCHEMA_PROBE.md` | dollor.ai | created |
| `.planning/quick/312-.../312-SUMMARY.md` | dollor.ai | created (this file) |

## Deviations from Plan

### Auto-fixed Issues (Rules 1-3)

**1. [Rule 3 - Blocking] Schema probe initial path returned HTTP 403 (Cloudflare-served Apache 403 from .htaccess deny-by-default)**

- **Found during:** Step 2, first probe deploy attempt.
- **Issue:** Plan specified probe path `/tcp-analytics/tcp-312-schema-probe.php` but `/tcp-analytics/.htaccess` whitelist regex is `^(?!admin|collect|trap|stats).*\.php$` with `Require all denied`. Any filename not starting with `admin|collect|trap|stats` is rejected by Apache BEFORE PHP can token-gate.
- **Fix:** Deleted misnamed file from `/tcp-analytics/`, redeployed to `/api/_probe-312-schema.php` instead (mirrors 310's `_probe-310-fp-schema.php` pattern — `/api/` has no `.htaccess`). Probe ran successfully, all 6 ALTERs returned OK.
- **Files affected:** Server `/tcp-analytics/tcp-312-schema-probe.php` (created then deleted), Server `/api/_probe-312-schema.php` (created → run → deleted).
- **Tracked here so future probes** default to `/api/` instead of `/tcp-analytics/`.

### Architectural changes

None.

### Out-of-scope items deferred

- **Test-pollution rows:** 3 synthetic test rows in `page_views` (`/test-312-google-stub`, `/test-312-internal-stub`, `/test-312-unmapped-stub`) with sessions `b2/b3/b4-1777435064`. Will be cleaned up alongside 308/309/310/311 test rows in the same Phase X scrub (~30 days post-launch).
- **Phase 5b real provider wiring:** see PHASE 5B RELEASE-BLOCKER checklist above. Single biggest follow-up.
- **identified_visitors.company_domain backfill:** column added but never written. Phase 5c is expected to populate from form-fill email's domain. Currently NULL for all rows.

## Phase X follow-ups

### 1. Phase 5b — flip provider + token + cache + TOS audit (THE BIG ONE)

See PHASE 5B RELEASE-BLOCKER checklist above. Single-line provider flip from `'stub'` to `'ipinfo'` or `'maxmind'` plus 6-7 supporting tasks. Estimated 2-4 hours work depending on provider choice (ipinfo cURL is faster to implement; MaxMind .mmdb has zero per-query cost but requires monthly DB download cron).

### 2. Backfill existing page_views rows

Once Phase 5b is live, run the resolver against `page_views.ip` for the 1660+ existing rows where `company_domain IS NULL`. Throttle to provider rate limit (ipinfo free tier = 50K/mo so backfill 1660 rows is ~3% of monthly budget — totally fine). Suggested: weekend cron `php backfill_company_lookup.php` with `LIMIT 100 OFFSET ?` pagination.

### 3. identified_visitors.company_domain backfill from email domain

Form-fill email `diego.palmieri@mizkan.com` → `mizkan.com` → `identified_visitors.company_domain = 'mizkan.com'`. Adds a second join key (alongside visitor_id) for cross-referencing email-typed company with IP-derived company. Pure email-domain extraction (no provider needed), so this can ship independently of Phase 5b. Suggested as Phase 5c.

### 4. Stats endpoint: `by_company_type` rollup

`stats.php` could expose a `by_company_type` aggregate per window (rollup of `hosting / business / isp / internal / null` counts) to surface the data quality of the resolver. Currently inferable from the by_company array, but a dedicated rollup makes it dashboard-friendly. Defer until Phase 5b is live (today every count would be 0 for hosting/business/isp/null and 1 for internal — uninteresting).

## Rollback playbook (3 tiers)

### Tier 1 — Quick disable (most likely if collect.php throws on the new INSERT)

The pre-patch `collect.php` is at commit `f867a81a` (the most recent collect.php commit before this task — actually, the immediate predecessor since collect.php was last patched in 310). Verify via `git log --oneline api/collect.php | head -3`.

```bash
cd /Users/jeet/techcloudpro
git checkout HEAD~2 -- api/collect.php   # revert to pre-312 collect.php (immediate predecessor)
scp -P 65002 -i ~/.ssh/id_ed25519 api/collect.php \
  u350621741@147.93.101.51:/home/u350621741/domains/techcloudpro.com/public_html/tcp-analytics/collect.php
git checkout main -- api/collect.php   # restore working tree to current main
```

Effect: collect.php returns to 20-column INSERT. The 3 new columns stay NULL for all subsequent rows. stats.php continues to expose `by_company` (will just be empty for new rows). Reversible in seconds (re-scp from main).

### Tier 2 — Full code revert (3 commits)

```bash
cd /Users/jeet/techcloudpro
git revert 6a80ba5 a74cf4a dcdc38d
# scp 3 files back to Hostinger
scp -P 65002 -i ~/.ssh/id_ed25519 api/_visitor.php u350621741@147.93.101.51:/home/u350621741/domains/techcloudpro.com/public_html/api/_visitor.php
scp -P 65002 -i ~/.ssh/id_ed25519 api/collect.php u350621741@147.93.101.51:/home/u350621741/domains/techcloudpro.com/public_html/tcp-analytics/collect.php
scp -P 65002 -i ~/.ssh/id_ed25519 api/stats.php u350621741@147.93.101.51:/home/u350621741/domains/techcloudpro.com/public_html/tcp-analytics/stats.php
```

Effect: stats.php loses `by_company` block (existing dashboards don't consume it yet), collect.php loses 3 INSERT columns, _visitor.php loses constants + helper. Schema columns + indexes stay (additive nullable, no impact). Reversible with another `git revert` of the reverts.

### Tier 3 — Drop schema columns (only for clean-room rollback)

```sql
ALTER TABLE page_views        DROP INDEX idx_company_domain,    DROP COLUMN company_name, DROP COLUMN company_domain, DROP COLUMN company_type;
ALTER TABLE identified_visitors DROP INDEX idx_company_domain_iv, DROP COLUMN company_domain;
```

Effect: nuclear rollback. All resolver data lost. Re-running Phase 5a would require re-migrating + re-deploying. ONLY needed if regulatory pressure demands clean-room data removal.

## CR ticket

Skipped — TCP infrastructure (Hostinger PHP), not the dollor.ai admin portal. Same precedent as 305-311.

## Authentication gates

None — Hostinger SSH key already installed (`id_ed25519`, host `147.93.101.51`, port `65002`, user `u350621741`). No manual credentials needed.

## Commit hashes

| Repo | SHA | Description |
|------|-----|-------------|
| `techcloudpro` | `dcdc38d` | feat(api): tcp_resolve_ip_to_company() stub provider for Phase 5a (quick task 312) |
| `techcloudpro` | `a74cf4a` | feat(api): collect.php writes company_name/domain/type per pageview (quick task 312) |
| `techcloudpro` | `6a80ba5` | feat(api): stats.php by_company top-30 per window (quick task 312) |
| `dollor.ai` (this repo) | _final commit at end of task 2_ | docs(quick-312): TCP identity-stack Phase 5a — IP-to-company stub provider scaffold |

Per CLAUDE.md, neither pushed to remote unless user asks. **3 atomic commits in techcloudpro** (one per file: _visitor.php, collect.php, stats.php), **1 commit in dollor.ai** (docs).

## Live URLs

- Stats endpoint with new `by_company` per-window block: `https://techcloudpro.com/tcp-analytics/stats.php?s=TcpSecureAdmin2026` (Safari UA required to bypass Cloudflare WAF)
- Collect endpoint (writes company_* on every pageview): `https://techcloudpro.com/tcp-analytics/collect.php`
- Helper module (defines IP_LOOKUP_PROVIDER + tcp_resolve_ip_to_company): `https://techcloudpro.com/api/_visitor.php` (returns blank — code-only, but it's the deploy target)

## Self-Check

Verifies each truth from frontmatter `must_haves.truths`:

- [x] `IP_LOOKUP_PROVIDER='stub'` is the active provider; ipinfo/maxmind branches exist as TODO stubs only — verified by grep showing 5 occurrences in `_visitor.php` (define + switch case + 2 PHASE 5b comments + 1 in helper docstring) and Battery 2/3/4 confirming stub branch behavior
- [x] `tcp_resolve_ip_to_company('8.8.8.8')` returns Google LLC tuple — verified by Battery 2 DB readback row 3173: `company_name="Google LLC", company_domain="google.com", company_type="hosting"`
- [x] `tcp_resolve_ip_to_company('192.168.1.1')` returns all-null with company_type='internal' — verified by Battery 3 DB readback row 3174: `company_name=null, company_domain=null, company_type="internal"`
- [x] `tcp_resolve_ip_to_company('203.0.113.42')` returns all-null with company_type=null — verified by Battery 4 DB readback row 3175: all 3 fields null
- [x] `page_views` has 3 new nullable columns + idx_company_domain — verified by Battery 1 DESCRIBE output + SHOW INDEX
- [x] `identified_visitors` has 1 new nullable column + idx_company_domain_iv — verified by Battery 1 DESCRIBE output + SHOW INDEX
- [x] `collect.php` pageview INSERT writes those 3 fields per row (NULL when stub returns null) — verified by Battery 4 DB row 3175 (all 3 NULL) and Battery 2 DB row 3173 (all 3 populated)
- [x] Existing `page_views.org` column is UNCHANGED — verified by Battery 1 DESCRIBE output explicitly including `org` row alongside the 3 new columns
- [x] `stats.php` windows[*] now contain a new `by_company` block (top 30) sibling of `by_org` — verified by Battery 5 (all 4 windows have `by_company_present: true` AND `by_org_present: true`)
- [x] `stats.php` auth gate (?s=TcpSecureAdmin2026) still 404 on missing/wrong, 200 on correct — verified by Battery 6 (404/404/200)
- [x] Phase 5b release-blocker is documented in SUMMARY — verified by the `## PHASE 5B RELEASE-BLOCKER` section above with explicit checklist + stub-mode warning paragraph
- [x] All probes deleted from server — verified by `ls 2>&1` returning "No such file or directory" for both `_probe-312-schema.php` and `_probe-312-readback.php`
- [x] 3 atomic commits in techcloudpro: `dcdc38d` (_visitor.php), `a74cf4a` (collect.php), `6a80ba5` (stats.php) — verified by `git log --oneline -5`
- [x] No pushes to any remote — per CLAUDE.md push policy
- [x] grep proof: `tcp_resolve_ip_to_company` in `_visitor.php` (1 — definition; the function name doesn't appear in its docstring because the docstring uses descriptive language, not the function name as a literal — function exists and is callable, verified by Battery 2/3/4 DB rows)
- [x] grep proof: `tcp_resolve_ip_to_company` in `collect.php` (2 — comment + call site)
- [x] grep proof: `by_company` in `stats.php` (5 — comment, $by_company assignment, ORDER BY companion comment, foreach var, JSON key)
- [x] grep proof: `IP_LOOKUP_PROVIDER` in `_visitor.php` (5 — define + 4 switch/comment references)
- [x] grep proof: `IPINFO_API_TOKEN_PLACEHOLDER` in `_visitor.php` (3 — define + comment + plan-reference comment)

## Self-Check: PASSED
