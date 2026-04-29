---
phase: 312-phase-5a-identity-stack-ip-to-company-re
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - /Users/jeet/techcloudpro/api/_visitor.php
  - /Users/jeet/techcloudpro/api/collect.php
  - /Users/jeet/techcloudpro/api/stats.php
  - /Users/jeet/doordash-p2p/.planning/quick/312-phase-5a-identity-stack-ip-to-company-re/312-SUMMARY.md
  - /Users/jeet/doordash-p2p/.planning/quick/312-phase-5a-identity-stack-ip-to-company-re/IP_COMPANY_SCHEMA_PROBE.md
  - Hostinger /tcp-analytics/stats.php (scp)
  - Hostinger /tcp-analytics/collect.php (scp)
  - Hostinger /api/_visitor.php (scp)
  - Hostinger DB u350621741_visitors (page_views ALTER + identified_visitors ALTER, via one-shot probe)
autonomous: true
requirements:
  - PROVIDER-ABSTRACTION
  - STUB-RESOLVER
  - SCHEMA-MIGRATION
  - COLLECT-WIRE
  - STATS-BY-COMPANY
  - PHASE-5B-RELEASE-BLOCKER

must_haves:
  truths:
    - "PHP constant IP_LOOKUP_PROVIDER='stub' is the active provider; ipinfo and maxmind branches exist as TODO stubs only"
    - "tcp_resolve_ip_to_company('8.8.8.8') returns {company_name: 'Google LLC', company_domain: 'google.com', company_type: 'hosting'}"
    - "tcp_resolve_ip_to_company('192.168.1.1') returns all-null with company_type='internal' (private/loopback never reach external lookup)"
    - "tcp_resolve_ip_to_company('203.0.113.42') returns all-null with company_type=null (unmapped in stub — real provider would resolve)"
    - "page_views has 3 new nullable columns: company_name, company_domain, company_type, plus index idx_company_domain"
    - "identified_visitors has 1 new nullable column: company_domain, plus index idx_company_domain_iv"
    - "collect.php pageview INSERT now writes those 3 fields per row (NULL when stub returns null)"
    - "Existing page_views.org column is UNCHANGED — backward-compat guarantee, by_org block in stats.php still emits"
    - "stats.php windows[*] now contain a new by_company block (top 30) sibling of the existing by_org block"
    - "stats.php auth gate (?s=TcpSecureAdmin2026) still 404 on missing/wrong, 200 on correct"
    - "Phase 5b release-blocker is documented in SUMMARY: flip provider constant + replace IPINFO_API_TOKEN_PLACEHOLDER before going live"
  artifacts:
    - path: "/Users/jeet/techcloudpro/api/_visitor.php"
      provides: "tcp_resolve_ip_to_company() helper + IP_LOOKUP_PROVIDER and IPINFO_API_TOKEN_PLACEHOLDER constants"
      contains: "function tcp_resolve_ip_to_company"
    - path: "/Users/jeet/techcloudpro/api/collect.php"
      provides: "Per-request IP→company resolution + 3 new INSERT fields on page_views"
      contains: "tcp_resolve_ip_to_company"
    - path: "/Users/jeet/techcloudpro/api/stats.php"
      provides: "by_company top-30 aggregation per window"
      contains: "by_company"
    - path: "/Users/jeet/doordash-p2p/.planning/quick/312-phase-5a-identity-stack-ip-to-company-re/IP_COMPANY_SCHEMA_PROBE.md"
      provides: "Verbatim DESCRIBE output proving 3 new page_views columns + 1 new identified_visitors column + 2 indexes"
      contains: "company_domain"
    - path: "/Users/jeet/doordash-p2p/.planning/quick/312-phase-5a-identity-stack-ip-to-company-re/312-SUMMARY.md"
      provides: "Verbatim verification outputs for all 6 batteries + Phase 5b release-blocker section"
      contains: "Phase 5b release-blocker"
  key_links:
    - from: "collect.php (line 94 IP capture)"
      to: "_visitor.php tcp_resolve_ip_to_company()"
      via: "single function call before pageview INSERT"
      pattern: "tcp_resolve_ip_to_company\\(\\$ip\\)"
    - from: "collect.php pageview INSERT"
      to: "page_views.{company_name,company_domain,company_type}"
      via: "3 new bound parameters in INSERT statement"
      pattern: "company_name.*company_domain.*company_type"
    - from: "stats.php window foreach loop"
      to: "by_company aggregation"
      via: "GROUP BY company_domain with WHERE company_domain IS NOT NULL"
      pattern: "GROUP BY company_domain"
    - from: "stats.php"
      to: "existing by_org block (regression check)"
      via: "block must remain byte-identical to pre-patch"
      pattern: "by_org"
---

<objective>
Phase 5a of the TCP identity stack — install the IP-to-company resolution SCAFFOLD with provider abstraction so Phase 5b can flip a single constant to activate real IPInfo/MaxMind once a token is acquired. This task is STUB-ONLY: no external API calls, no token wiring, no real enrichment. The stub returns deterministic mock data for a small set of test IPs (8.8.* → Google, 13.107.* → Microsoft, private/loopback → 'internal' bucket, everything else → null). The point is to lock the data shape, schema, INSERT path, and stats aggregation now so Phase 5b is a one-line provider flip + token paste + cache layer + TOS audit, not a re-architecture.

Purpose: De-risk Phase 5b by proving the contract (helper signature, schema columns, INSERT wiring, stats block) end-to-end against synthetic POSTs today.
Output: Patched _visitor.php + collect.php + stats.php (deployed to Hostinger), schema migration applied, IP_COMPANY_SCHEMA_PROBE.md saved, SUMMARY with verbatim 6-battery proofs + explicit Phase 5b release-blocker section.
</objective>

<execution_context>
@/Users/jeet/.claude/get-shit-done/workflows/execute-plan.md
@/Users/jeet/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@/Users/jeet/doordash-p2p/CLAUDE.md
@/Users/jeet/doordash-p2p/.planning/quick/305-build-tcp-analytics-stats-php-on-techclo/SCHEMA_PROBE.md
@/Users/jeet/doordash-p2p/.planning/quick/307-phase-1-identity-stack-form-fill-identit/IDENTITY_SCHEMA_PROBE.md
@/Users/jeet/doordash-p2p/.planning/quick/310-phase-3-identity-stack-first-party-brows/310-SUMMARY.md
@/Users/jeet/doordash-p2p/.planning/quick/311-phase-4-identity-stack-behavioral-lead-s/311-SUMMARY.md
@/Users/jeet/techcloudpro/api/_visitor.php
@/Users/jeet/techcloudpro/api/collect.php
@/Users/jeet/techcloudpro/api/stats.php
</context>

<tasks>

<task type="auto">
  <name>Task 1: Provider abstraction + schema migration + collect.php INSERT wiring + stats.php by_company + verify (single-shot deploy)</name>
  <files>
    /Users/jeet/techcloudpro/api/_visitor.php
    /Users/jeet/techcloudpro/api/collect.php
    /Users/jeet/techcloudpro/api/stats.php
    Hostinger DB u350621741_visitors (via one-shot probe)
    Hostinger /api/_visitor.php
    Hostinger /tcp-analytics/collect.php
    Hostinger /tcp-analytics/stats.php
    /Users/jeet/doordash-p2p/.planning/quick/312-phase-5a-identity-stack-ip-to-company-re/IP_COMPANY_SCHEMA_PROBE.md
  </files>
  <action>
Execute the following in order. Each step has anti-hallucination guardrails — DO NOT skip the inspect/grep/curl evidence steps.

═══════════════════════════════════════════════════════════════════════════════
STEP 0 — INSPECT collect.php FIRST (MANDATORY anti-hallucination gate)
═══════════════════════════════════════════════════════════════════════════════

You MUST read /Users/jeet/techcloudpro/api/collect.php top-to-bottom before touching it. Confirm with grep that line numbers are stable:

  grep -n 'HTTP_X_FORWARDED_FOR' /Users/jeet/techcloudpro/api/collect.php
  grep -n 'INSERT INTO page_views' /Users/jeet/techcloudpro/api/collect.php
  grep -n 'device_fingerprint' /Users/jeet/techcloudpro/api/collect.php

Expected (per repo state at plan time, but VERIFY before patching):
  - $ip capture at the line containing `$ip = $_SERVER['HTTP_X_FORWARDED_FOR']` (currently ~line 94)
  - INSERT INTO page_views statement (currently ~line 190)
  - device_fingerprint already wired into INSERT — DO NOT remove or reorder existing fields

If the line numbers have drifted, follow the ACTUAL location — never edit by line number, edit by anchor text.

═══════════════════════════════════════════════════════════════════════════════
STEP 1 — Patch /Users/jeet/techcloudpro/api/_visitor.php (provider abstraction + helper)
═══════════════════════════════════════════════════════════════════════════════

APPEND (do NOT replace existing content) at the end of _visitor.php, BEFORE the closing of the file (file currently ends at the closing `}` of `tcp_classify_page_intent`). Add a new section:

```php
/**
 * Phase 5a (quick task 312) — IP-to-company resolution provider abstraction.
 *
 * IP_LOOKUP_PROVIDER selects the active resolver:
 *   'stub'    — deterministic mock data for a small set of test IPs (THIS PHASE)
 *   'ipinfo'  — Phase 5b: real cURL to api.ipinfo.io with IPINFO_API_TOKEN
 *   'maxmind' — Phase 5b: local MaxMind GeoLite2 ASN+City DB lookup
 *
 * Phase 5b release-blocker (file in SUMMARY):
 *   1. Flip IP_LOOKUP_PROVIDER from 'stub' to 'ipinfo' or 'maxmind'.
 *   2. Replace IPINFO_API_TOKEN_PLACEHOLDER with a real token from ipinfo.io
 *      (or wire MaxMind DB path).
 *   3. Add a caching layer (e.g. APCu or sys_get_temp_dir TTL file) so we
 *      don't burn provider quota on repeat IPs within the same session.
 *   4. Audit provider TOS for retention rules.
 *   5. Confirm Privacy Policy still covers this — IP→company is metadata
 *      about a connection we already had, not new PII collection.
 */
if (!defined('IP_LOOKUP_PROVIDER')) {
    define('IP_LOOKUP_PROVIDER', 'stub');
}
if (!defined('IPINFO_API_TOKEN_PLACEHOLDER')) {
    define('IPINFO_API_TOKEN_PLACEHOLDER', 'PHASE_5B_PASTE_TOKEN_HERE');
}

/**
 * Resolve an IP to a company tuple.
 *
 * Returns an associative array with EXACTLY these 3 keys (never throws):
 *   ['company_name' => ?string, 'company_domain' => ?string, 'company_type' => ?string]
 *
 * company_type buckets used by stub (ipinfo/maxmind branches will mirror):
 *   'hosting'  — cloud/hosting provider (e.g. Google, AWS)
 *   'business' — corporate network (e.g. Microsoft Corp)
 *   'isp'      — consumer ISP
 *   'internal' — private/loopback (NEVER look up in real provider)
 *   null       — unmapped / lookup failed
 */
function tcp_resolve_ip_to_company(string $ip): array {
    $null_result = ['company_name' => null, 'company_domain' => null, 'company_type' => null];

    // Private / loopback short-circuit — applies to ALL providers, never
    // forward to real lookup (no point + provider TOS may charge for noise).
    if ($ip === '' ||
        strpos($ip, '10.') === 0 ||
        strpos($ip, '192.168.') === 0 ||
        strpos($ip, '127.') === 0) {
        return ['company_name' => null, 'company_domain' => null, 'company_type' => 'internal'];
    }

    switch (IP_LOOKUP_PROVIDER) {
        case 'stub':
            // Deterministic mock data — used to lock the data shape end-to-end
            // before Phase 5b wires a real provider. Two recognised prefixes,
            // everything else returns all-null (real provider WOULD resolve).
            if (strpos($ip, '8.8.') === 0) {
                return ['company_name' => 'Google LLC', 'company_domain' => 'google.com', 'company_type' => 'hosting'];
            }
            if (strpos($ip, '13.107.') === 0) {
                return ['company_name' => 'Microsoft Corporation', 'company_domain' => 'microsoft.com', 'company_type' => 'business'];
            }
            return $null_result;

        case 'ipinfo':
            // PHASE 5b: replace with real cURL to api.ipinfo.io/<ip>?token=...
            // Expected response shape (per ipinfo.io docs):
            //   {"ip": "...", "org": "AS15169 Google LLC", "company": {"name":"...","domain":"...","type":"hosting"}}
            // Map company.name → company_name, company.domain → company_domain, company.type → company_type.
            // Add 5s timeout, swallow all errors, return $null_result on failure.
            return $null_result;

        case 'maxmind':
            // PHASE 5b: replace with real MaxMind GeoLite2-ASN + GeoIP2-Domain reader.
            // Map ASN org → company_name, registered domain → company_domain, type heuristic → company_type.
            return $null_result;

        default:
            return $null_result;
    }
}
```

Commit (atomic, per-file):
  cd /Users/jeet/techcloudpro
  git add api/_visitor.php
  git commit -m "feat(api): tcp_resolve_ip_to_company() stub provider for Phase 5a (quick task 312)"

═══════════════════════════════════════════════════════════════════════════════
STEP 2 — Schema migration via one-shot probe (mirror 305/307/310 pattern)
═══════════════════════════════════════════════════════════════════════════════

Create a token-gated probe at /tmp/tcp-312-schema-probe.php:

```php
<?php
if (($_GET['s'] ?? '') !== 'TcpSecureAdmin2026') { http_response_code(404); exit; }
header('Content-Type: application/json');

$pdo = new PDO('mysql:host=localhost;dbname=u350621741_visitors;charset=utf8mb4',
               'u350621741_jeet977', 'Thirumala977!',
               [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION, PDO::ATTR_TIMEOUT => 5]);

$out = ['migrations' => [], 'verify' => []];

// page_views: 3 new columns + 1 index
$ddls_pv = [
    "ALTER TABLE page_views ADD COLUMN company_name VARCHAR(255) NULL",
    "ALTER TABLE page_views ADD COLUMN company_domain VARCHAR(255) NULL",
    "ALTER TABLE page_views ADD COLUMN company_type VARCHAR(64) NULL",
    "ALTER TABLE page_views ADD INDEX idx_company_domain (company_domain)",
];
foreach ($ddls_pv as $sql) {
    try { $pdo->exec($sql); $out['migrations'][] = ['step' => $sql, 'result' => 'OK']; }
    catch (Throwable $e) { $out['migrations'][] = ['step' => $sql, 'result' => 'ERROR: ' . $e->getMessage()]; }
}

// identified_visitors: 1 new column + 1 index
$ddls_iv = [
    "ALTER TABLE identified_visitors ADD COLUMN company_domain VARCHAR(255) NULL",
    "ALTER TABLE identified_visitors ADD INDEX idx_company_domain_iv (company_domain)",
];
foreach ($ddls_iv as $sql) {
    try { $pdo->exec($sql); $out['migrations'][] = ['step' => $sql, 'result' => 'OK']; }
    catch (Throwable $e) { $out['migrations'][] = ['step' => $sql, 'result' => 'ERROR: ' . $e->getMessage()]; }
}

// Verify
$out['verify']['page_views_new_cols'] = $pdo->query(
    "SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE
     FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = 'u350621741_visitors' AND TABLE_NAME = 'page_views'
       AND COLUMN_NAME IN ('company_name','company_domain','company_type','org')
     ORDER BY COLUMN_NAME"
)->fetchAll(PDO::FETCH_ASSOC);

$out['verify']['identified_visitors_new_cols'] = $pdo->query(
    "SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE
     FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = 'u350621741_visitors' AND TABLE_NAME = 'identified_visitors'
       AND COLUMN_NAME = 'company_domain'"
)->fetchAll(PDO::FETCH_ASSOC);

$out['verify']['indexes_pv'] = $pdo->query(
    "SHOW INDEX FROM page_views WHERE Key_name = 'idx_company_domain'"
)->fetchAll(PDO::FETCH_ASSOC);

$out['verify']['indexes_iv'] = $pdo->query(
    "SHOW INDEX FROM identified_visitors WHERE Key_name = 'idx_company_domain_iv'"
)->fetchAll(PDO::FETCH_ASSOC);

echo json_encode($out, JSON_PRETTY_PRINT);
```

Deploy:
  scp -P 65002 -i ~/.ssh/id_ed25519 /tmp/tcp-312-schema-probe.php \
    u350621741@147.93.101.51:/home/u350621741/domains/techcloudpro.com/public_html/tcp-analytics/

Run (Safari UA — Cloudflare WAF blocks default curl per project memory rule):
  UA="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15"
  curl -sS -A "$UA" "https://techcloudpro.com/tcp-analytics/tcp-312-schema-probe.php?s=TcpSecureAdmin2026" \
    | tee /tmp/tcp-312-schema-probe-output.json

Save the output VERBATIM into the project at:
  /Users/jeet/doordash-p2p/.planning/quick/312-phase-5a-identity-stack-ip-to-company-re/IP_COMPANY_SCHEMA_PROBE.md

(Match the format used in 307-IDENTITY_SCHEMA_PROBE.md — header section + verbatim JSON in a code block + cleanup verification at the bottom.)

DELETE the probe and verify deletion:
  ssh -p 65002 -i ~/.ssh/id_ed25519 u350621741@147.93.101.51 \
    "rm -f /home/u350621741/domains/techcloudpro.com/public_html/tcp-analytics/tcp-312-schema-probe.php && \
     ls /home/u350621741/domains/techcloudpro.com/public_html/tcp-analytics/tcp-312-schema-probe.php 2>&1"

Expected stderr: `cannot access ...: No such file or directory`. Paste verbatim into the SCHEMA_PROBE.md cleanup section.

ALSO delete /tmp/tcp-312-schema-probe.php and /tmp/tcp-312-schema-probe-output.json after copying the output.

GATE: Do NOT proceed to Step 3 until the probe output shows all 4 ALTERs returned `OK` AND the SHOW INDEX queries return exactly 1 row each (idx_company_domain on page_views, idx_company_domain_iv on identified_visitors). The verify.page_views_new_cols MUST also show `org` (the existing column) — its presence in the result set proves we didn't accidentally drop it.

═══════════════════════════════════════════════════════════════════════════════
STEP 3 — Patch /Users/jeet/techcloudpro/api/collect.php (call resolver + extend INSERT)
═══════════════════════════════════════════════════════════════════════════════

Three surgical edits inside the `if ($data['type'] === 'pageview')` block:

(a) AFTER the require_once for _visitor.php (currently at line ~169) and BEFORE the INSERT, add a single resolver call. Place it AFTER the existing fingerprint-canonical-lookup block but BEFORE the INSERT. ONE call per request — do NOT call it more than once.

```php
    // Phase 5a (quick task 312) — IP-to-company resolution.
    // Single call per request. tcp_resolve_ip_to_company() is total — never throws,
    // always returns a 3-key associative array. NULL fields → INSERT writes NULL
    // (do NOT fall back to $org which is the ASN-level field from ip-api.com).
    $_company = tcp_resolve_ip_to_company($ip);
```

(b) Extend the INSERT column list (currently 20 columns ending in `device_fingerprint`) with 3 new columns. Find the existing INSERT statement by searching for `INSERT INTO page_views`. Append AFTER `device_fingerprint`:

```sql
        INSERT INTO page_views
          (session_id, visitor_id, page, referrer, device, browser, country, region, city, org, timezone, ip,
           utm_source, utm_medium, utm_campaign, utm_term, utm_content, scroll_depth, time_on_page,
           device_fingerprint,
           company_name, company_domain, company_type)
        VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
```

(That's 23 placeholders now, was 20.)

(c) Extend the `$stmt->execute([...])` array with 3 new values, MATCHING the column order above. Append AFTER `$_client_fp`:

```php
    $stmt->execute([
        $session_id, $visitor_id, $page, $referrer, $device, $browser,
        $country, $region, $city, $org, $timezone, $ip,
        $utm_source, $utm_medium, $utm_campaign, $utm_term, $utm_content,
        $scroll_depth, $time_on_page,
        $_client_fp,
        $_company['company_name'], $_company['company_domain'], $_company['company_type']
    ]);
```

CRITICAL: Do NOT touch the existing `$org` variable, the `$_company` array does NOT replace it. `org` (ASN string from ip-api.com, ~line 124) and `company_name/domain/type` (from our resolver) coexist — backward compat.

Commit (atomic):
  cd /Users/jeet/techcloudpro
  git add api/collect.php
  git commit -m "feat(api): collect.php writes company_name/domain/type per pageview (quick task 312)"

═══════════════════════════════════════════════════════════════════════════════
STEP 4 — Patch /Users/jeet/techcloudpro/api/stats.php (add by_company per window)
═══════════════════════════════════════════════════════════════════════════════

Inside the existing `foreach ($windows as $name => $where) { ... }` loop, ADD a new aggregation block AFTER block 7 (by_org) and BEFORE block 8 (by_country). Anchor: locate the comment `// 7) by_org — top 30` and insert the new block AFTER its `unset($row);`.

```php
        // 7b) by_company — top 30 by Phase 5a IP-to-company resolver.
        //     DISTINCT from by_org: by_org is the ASN-level org string from ip-api.com
        //     (geo-time enrichment), by_company is from our IP_LOOKUP_PROVIDER stub
        //     (locked data shape for Phase 5b real provider). Both should coexist.
        //     Phase 5a (quick task 312).
        $by_company = $pdo->query(
            "SELECT TRIM(company_name)   AS company_name,
                    TRIM(company_domain) AS company_domain,
                    TRIM(company_type)   AS company_type,
                    COUNT(*)             AS views
             FROM `$TABLE`
             WHERE $where
               AND company_domain IS NOT NULL
               AND TRIM(company_domain) != ''
             GROUP BY TRIM(company_domain), TRIM(company_name), TRIM(company_type)
             ORDER BY views DESC
             LIMIT 30"
        )->fetchAll(PDO::FETCH_ASSOC);
        foreach ($by_company as &$row) { $row['views'] = (int) $row['views']; }
        unset($row);
```

Add `'by_company' => $by_company,` to the `$result[$name]` array — place it RIGHT AFTER `'by_org' => $by_org,` so the JSON shape is logically grouped.

DO NOT touch the existing by_org block. DO NOT remove or reorder any other field.

Commit (atomic):
  cd /Users/jeet/techcloudpro
  git add api/stats.php
  git commit -m "feat(api): stats.php by_company top-30 per window (quick task 312)"

═══════════════════════════════════════════════════════════════════════════════
STEP 5 — Deploy to Hostinger (scp the 3 files)
═══════════════════════════════════════════════════════════════════════════════

  scp -P 65002 -i ~/.ssh/id_ed25519 /Users/jeet/techcloudpro/api/_visitor.php \
    u350621741@147.93.101.51:/home/u350621741/domains/techcloudpro.com/public_html/api/_visitor.php

  scp -P 65002 -i ~/.ssh/id_ed25519 /Users/jeet/techcloudpro/api/collect.php \
    u350621741@147.93.101.51:/home/u350621741/domains/techcloudpro.com/public_html/tcp-analytics/collect.php

  scp -P 65002 -i ~/.ssh/id_ed25519 /Users/jeet/techcloudpro/api/stats.php \
    u350621741@147.93.101.51:/home/u350621741/domains/techcloudpro.com/public_html/tcp-analytics/stats.php

═══════════════════════════════════════════════════════════════════════════════
STEP 6 — Verification (6 batteries — capture VERBATIM output for SUMMARY)
═══════════════════════════════════════════════════════════════════════════════

UA="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15"

Battery 1 — Schema (already done in Step 2; reference IP_COMPANY_SCHEMA_PROBE.md).

Battery 2 — POST with `X-Forwarded-For: 8.8.8.8` should write Google LLC row:
  SESS="b2-$(date +%s)"
  curl -sS -A "$UA" -H "X-Forwarded-For: 8.8.8.8" \
    -X POST "https://techcloudpro.com/tcp-analytics/collect.php" \
    -H "Content-Type: application/json" \
    -d "{\"type\":\"pageview\",\"page\":\"/test-312-google-stub\",\"session_id\":\"$SESS\"}"
  # Expect: {"ok":true}
  # Save SESS for the readback probe.

Battery 3 — POST with `X-Forwarded-For: 192.168.1.1` should write all-NULL with company_type='internal':
  SESS3="b3-$(date +%s)"
  curl -sS -A "$UA" -H "X-Forwarded-For: 192.168.1.1" \
    -X POST "https://techcloudpro.com/tcp-analytics/collect.php" \
    -H "Content-Type: application/json" \
    -d "{\"type\":\"pageview\",\"page\":\"/test-312-internal-stub\",\"session_id\":\"$SESS3\"}"

Battery 4 — POST with random public IP (e.g. 203.0.113.42) should write all-NULL (unmapped in stub):
  SESS4="b4-$(date +%s)"
  curl -sS -A "$UA" -H "X-Forwarded-For: 203.0.113.42" \
    -X POST "https://techcloudpro.com/tcp-analytics/collect.php" \
    -H "Content-Type: application/json" \
    -d "{\"type\":\"pageview\",\"page\":\"/test-312-unmapped-stub\",\"session_id\":\"$SESS4\"}"

DB readback for B2/B3/B4 — deploy a second one-shot probe at /tmp/tcp-312-readback-probe.php:

```php
<?php
if (($_GET['s'] ?? '') !== 'TcpSecureAdmin2026') { http_response_code(404); exit; }
header('Content-Type: application/json');
$pdo = new PDO('mysql:host=localhost;dbname=u350621741_visitors;charset=utf8mb4',
               'u350621741_jeet977', 'Thirumala977!',
               [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]);
$rows = $pdo->query(
    "SELECT id, page, session_id, ip, company_name, company_domain, company_type, created_at
     FROM page_views
     WHERE page LIKE '/test-312-%'
     ORDER BY id DESC LIMIT 20"
)->fetchAll(PDO::FETCH_ASSOC);
echo json_encode(['rows' => $rows], JSON_PRETTY_PRINT);
```

Deploy → run → capture verbatim output → save into 312-SUMMARY.md → DELETE + verify removal (same pattern as Step 2).

Verbatim PASS criteria:
  - row for /test-312-google-stub: company_name="Google LLC", company_domain="google.com", company_type="hosting"
  - row for /test-312-internal-stub: company_name=null, company_domain=null, company_type="internal"
  - row for /test-312-unmapped-stub: company_name=null, company_domain=null, company_type=null

Battery 5 — stats.php by_company present in all 4 windows + by_org REGRESSION CHECK:
  curl -sS -A "$UA" "https://techcloudpro.com/tcp-analytics/stats.php?s=TcpSecureAdmin2026" \
    | jq '.windows | to_entries | map({window: .key, by_company_present: (.value.by_company != null), by_company_count: (.value.by_company | length), by_org_present: (.value.by_org != null), by_org_count: (.value.by_org | length)})'

PASS criteria:
  - by_company_present == true in ALL 4 windows
  - by_org_present == true in ALL 4 windows (regression — must not have disappeared)
  - by_company should contain at least 1 entry for "Google LLC" / "google.com" / "hosting" (from B2)

Capture a sample by_company entry verbatim:
  curl -sS -A "$UA" "https://techcloudpro.com/tcp-analytics/stats.php?s=TcpSecureAdmin2026" \
    | jq '.windows.today.by_company[0:3]'

Also capture the today.by_org block to PROVE regression check (compare keys/structure to pre-patch — should be unchanged):
  curl -sS -A "$UA" "https://techcloudpro.com/tcp-analytics/stats.php?s=TcpSecureAdmin2026" \
    | jq '.windows.today.by_org[0:3]'

Battery 6 — Auth gate regression (no token=404, wrong=404, correct=200):
  curl -sS -A "$UA" -o /dev/null -w "%{http_code}\n" "https://techcloudpro.com/tcp-analytics/stats.php"
  curl -sS -A "$UA" -o /dev/null -w "%{http_code}\n" "https://techcloudpro.com/tcp-analytics/stats.php?s=WRONG"
  curl -sS -A "$UA" -o /dev/null -w "%{http_code}\n" "https://techcloudpro.com/tcp-analytics/stats.php?s=TcpSecureAdmin2026"
  # Expect: 404 / 404 / 200

═══════════════════════════════════════════════════════════════════════════════
STEP 7 — Cleanup
═══════════════════════════════════════════════════════════════════════════════

  - All probes deleted from server (verified via `ls 2>&1` showing "No such file or directory")
  - /tmp/tcp-312-*.php deleted locally
  - 3 atomic commits in /Users/jeet/techcloudpro (one per file: _visitor.php, collect.php, stats.php)
  - DO NOT push to remote (per CLAUDE.md push policy — user pushes manually)

GATE: Only proceed to Task 2 (SUMMARY) once ALL 6 batteries return verbatim PASS evidence and ALL probes are confirmed deleted.
  </action>
  <verify>
1. IP_COMPANY_SCHEMA_PROBE.md exists in plan dir with verbatim "OK" results for all 4 ALTERs and DESCRIBE output proving 3 page_views columns + 1 identified_visitors column + 2 indexes.
2. grep proof patches landed:
     grep -c 'tcp_resolve_ip_to_company' /Users/jeet/techcloudpro/api/_visitor.php   # ≥ 2 (definition + docstring)
     grep -c 'tcp_resolve_ip_to_company' /Users/jeet/techcloudpro/api/collect.php    # ≥ 1
     grep -c 'by_company' /Users/jeet/techcloudpro/api/stats.php                     # ≥ 3 (var, comment, output key)
     grep -c "IP_LOOKUP_PROVIDER" /Users/jeet/techcloudpro/api/_visitor.php          # ≥ 2
     grep -c "IPINFO_API_TOKEN_PLACEHOLDER" /Users/jeet/techcloudpro/api/_visitor.php # ≥ 2
3. Battery 2 DB row: company_name="Google LLC", company_domain="google.com", company_type="hosting" — verbatim from readback probe JSON
4. Battery 3 DB row: company_name=null, company_domain=null, company_type="internal"
5. Battery 4 DB row: all 3 fields null (no fallback to $org)
6. Battery 5 stats: by_company present in 4 windows; by_org STILL present in 4 windows (regression)
7. Battery 5 sample: by_company[0] for some window contains a Google LLC entry from B2
8. Battery 6 auth: 404 / 404 / 200
9. All 3 probes deleted: `ls` returns "No such file or directory" on server for each
10. 3 atomic git commits in /Users/jeet/techcloudpro: one per file (_visitor.php, collect.php, stats.php)
  </verify>
  <done>
- _visitor.php has tcp_resolve_ip_to_company() helper + IP_LOOKUP_PROVIDER='stub' + IPINFO_API_TOKEN_PLACEHOLDER
- collect.php calls resolver once per request, writes 3 new fields to page_views INSERT
- stats.php emits by_company top-30 per window AND by_org top-30 still present (regression intact)
- Schema applied: page_views has company_name/domain/type + idx_company_domain; identified_visitors has company_domain + idx_company_domain_iv
- All 6 batteries PASS with verbatim evidence captured for SUMMARY
- All probes deleted from server (verified)
- 3 atomic commits in techcloudpro repo (no push)
  </done>
</task>

<task type="auto">
  <name>Task 2: SUMMARY with verbatim 6-battery proof + Phase 5b release-blocker section + commit</name>
  <files>
    /Users/jeet/doordash-p2p/.planning/quick/312-phase-5a-identity-stack-ip-to-company-re/312-SUMMARY.md
  </files>
  <action>
Write /Users/jeet/doordash-p2p/.planning/quick/312-phase-5a-identity-stack-ip-to-company-re/312-SUMMARY.md following the structure of 311-SUMMARY.md (recently shipped sibling).

REQUIRED sections — fill each with VERBATIM evidence from Task 1 (no paraphrasing):

1. **Frontmatter** — phase, plan, subsystem (`tcp-identity-stack`), tags, dependency-graph (requires 305/307/310/311 SUMMARYs + DB), provides (the 5 truths), affects (the 3 PHP files + 2 DB tables), tech-stack (added: none, patterns: provider abstraction / stub-first / coexist-with-org), key-files (created/modified), decisions (5+ items), metrics.

2. **One-liner** — single sentence summary (~50 words) capturing: provider-abstraction stub → schema migration → collect.php INSERT extension → stats.php by_company → 6 batteries PASS → Phase 5b is now a one-line provider flip.

3. **What was built** — table with Layer / What / File rows for each of: provider abstraction (constants + helper), schema migration, collect.php wiring, stats.php by_company block.

4. **Verification — verbatim live evidence** — sub-headers Battery 1 through Battery 6. For EACH battery paste:
   - The exact curl command(s) (Safari UA shown)
   - The verbatim JSON / DB output (from /tmp/tcp-312-*-output.json captures, or from copy-paste of stdout)
   - PASS/FAIL verdict with explicit reason

5. **PHASE 5B RELEASE-BLOCKER (CRITICAL — MUST appear with this header verbatim)** — explicit checklist:
   ```
   - [ ] Flip IP_LOOKUP_PROVIDER constant in _visitor.php from 'stub' to 'ipinfo' or 'maxmind'
   - [ ] Replace IPINFO_API_TOKEN_PLACEHOLDER with real token (acquire at https://ipinfo.io/signup)
   - [ ] Implement the ipinfo or maxmind branch body (currently returns null)
   - [ ] Add caching layer (APCu or sys_get_temp_dir TTL file) — don't burn provider quota on repeat IPs
   - [ ] Audit provider TOS for retention rules
   - [ ] Re-run Battery 4 with a real public IP (e.g. cloudflare 1.1.1.1) — should now resolve to non-null
   - [ ] Privacy Policy review — IP→company is metadata about the connection, NOT new PII collection
         (page_views.ip already stored since Phase 1; we are NOT adding new collection, just labeling)
         If reviewer disagrees, file Privacy Policy update before release.
   ```
   Add a paragraph below explicitly stating: "**Stub mode is for E2E lock-in only. NOT useful in real production until Phase 5b token is wired.** Today, only IPs starting with 8.8.* and 13.107.* resolve. Every real visitor's row will have NULL company fields. Do NOT advertise this as a working feature externally."

6. **Privacy stance** — restate: ZERO new privacy concerns this phase (mock data, no external API calls, no new PII). Reference Phase 1+ already storing page_views.ip.

7. **DB tables touched** — table: page_views (ALTER + INSERT), identified_visitors (ALTER only — no writes this phase).

8. **Files changed** — table: _visitor.php (+N/-N), collect.php (+N/-N), stats.php (+N/-N), Hostinger paths, dollor.ai SUMMARY.md.

9. **Deviations from Plan** — likely none if plan was followed; otherwise document under Auto-fixed Issues.

10. **Phase X follow-ups** — at minimum:
    - Phase 5b — flip provider + token + cache layer (THIS IS THE BIG ONE)
    - Backfill existing 1660 page_views rows with stub resolutions (or run a one-time backfill once Phase 5b is live)
    - Resolve company_domain on identified_visitors table (currently column added but never written — should be backfilled from form-fill email's domain in Phase 5c)

11. **Rollback playbook (3 tiers)** — Tier 1: scp pre-patch baselines back; Tier 2: git revert + redeploy; Tier 3: nuclear DROP COLUMN.

12. **CR ticket** — Skipped, TCP infra (consistent with 305-311 precedent).

13. **Commit hashes** — list 3 commits from /Users/jeet/techcloudpro: _visitor.php, collect.php, stats.php.

14. **Live URLs** — stats.php?s= URL with note about new by_company key.

15. **Self-Check** — checklist with [x] entries proving each truth in must_haves frontmatter.

After writing the SUMMARY:

  cd /Users/jeet/doordash-p2p
  git add .planning/quick/312-phase-5a-identity-stack-ip-to-company-re/312-PLAN.md \
          .planning/quick/312-phase-5a-identity-stack-ip-to-company-re/IP_COMPANY_SCHEMA_PROBE.md \
          .planning/quick/312-phase-5a-identity-stack-ip-to-company-re/312-SUMMARY.md
  git commit -m "docs(quick-312): TCP identity-stack Phase 5a — IP-to-company stub provider scaffold"
  </action>
  <verify>
- 312-SUMMARY.md exists with all 15 sections
- The exact header "PHASE 5B RELEASE-BLOCKER" appears in the SUMMARY (case-insensitive grep OK)
- Self-Check section has [x] for each of the 11 truths in frontmatter must_haves.truths
- All verbatim battery outputs are present (no "[redacted]" or "[output here]" placeholders)
- 1 atomic dollor.ai commit
  </verify>
  <done>
- 312-SUMMARY.md complete with verbatim evidence for all 6 batteries
- Phase 5b release-blocker section is explicit + checklist-formatted
- Stub-mode warning stated unambiguously
- dollor.ai commit landed
  </done>
</task>

</tasks>

<verification>
Combined verification (all must hold before declaring phase complete):

1. **Provider abstraction lives**: `grep -c 'IP_LOOKUP_PROVIDER\|IPINFO_API_TOKEN_PLACEHOLDER\|tcp_resolve_ip_to_company' /Users/jeet/techcloudpro/api/_visitor.php` ≥ 6
2. **Schema migration applied**: IP_COMPANY_SCHEMA_PROBE.md shows all 4 ALTERs OK + 2 indexes verified
3. **collect.php wired**: `grep -c 'tcp_resolve_ip_to_company\|company_name, company_domain, company_type' /Users/jeet/techcloudpro/api/collect.php` ≥ 2
4. **stats.php by_company present + by_org regression intact**: jq output of stats.php JSON shows both blocks in all 4 windows
5. **6 batteries PASS** with verbatim DB readback evidence for B2/B3/B4
6. **All probes deleted** (verified via `ls 2>&1` returning "No such file or directory")
7. **Phase 5b release-blocker** explicitly documented in SUMMARY with checklist
8. **4 atomic commits total**: 3 in techcloudpro (one per file), 1 in dollor.ai (docs)
9. **No remote pushes** — per CLAUDE.md push policy (user pushes manually)
</verification>

<success_criteria>
- IP_LOOKUP_PROVIDER='stub' is the active provider; ipinfo/maxmind branches exist as TODO stubs only
- Schema migration applied: 3 new page_views columns + 1 new identified_visitors column + 2 indexes
- Existing page_views.org column UNCHANGED (backward compat) — by_org block in stats.php still emits in all 4 windows
- collect.php writes company_name/company_domain/company_type per pageview based on stub resolver output (NULL when stub returns null)
- stats.php emits new by_company top-30 per window — sibling of (not replacement for) by_org
- 8.8.8.8 → Google LLC, 192.168.1.1 → all-null with company_type='internal', random public IP → all-null
- Auth gate regression check: stats.php returns 404 on missing/wrong token, 200 on correct
- Phase 5b release-blocker is filed in SUMMARY with explicit checklist (provider flip + token paste + caching + TOS audit + privacy review)
- Stub-mode warning is explicit in SUMMARY: "NOT useful in real prod until Phase 5b token is wired"
- 4 atomic commits (3 techcloudpro, 1 dollor.ai), no pushes
- All probes deleted from server with verbatim "No such file or directory" evidence
</success_criteria>

<output>
After completion, ensure:
- /Users/jeet/doordash-p2p/.planning/quick/312-phase-5a-identity-stack-ip-to-company-re/IP_COMPANY_SCHEMA_PROBE.md exists with verbatim probe output + cleanup verification
- /Users/jeet/doordash-p2p/.planning/quick/312-phase-5a-identity-stack-ip-to-company-re/312-SUMMARY.md exists with all 15 sections, verbatim 6-battery evidence, and explicit Phase 5b release-blocker
</output>
