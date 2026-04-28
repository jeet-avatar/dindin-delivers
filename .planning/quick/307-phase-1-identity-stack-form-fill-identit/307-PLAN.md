---
phase: 307-phase-1-identity-stack-form-fill-identit
plan: 01
type: execute
wave: 1
depends_on: ["305-build-tcp-analytics-stats-php-on-techclo", "306-extend-tcp-analytics-stats-php-with-traf"]
files_modified:
  - "/Users/jeet/techcloudpro/api/_visitor.php"           # NEW helper
  - "/Users/jeet/techcloudpro/api/contact.php"            # patch
  - "/Users/jeet/techcloudpro/api/customize-architecture.php"  # patch
  - "/Users/jeet/techcloudpro/api/study-guide-download.php"    # patch
  - "/Users/jeet/techcloudpro/api/stats.php"              # extend
  - "(server-only) /home/u350621741/domains/techcloudpro.com/public_html/tcp-analytics/collect.php"  # patch
  - "(DB-only) u350621741_visitors.identified_visitors"   # CREATE TABLE
  - "(DB-only) u350621741_visitors.page_views.visitor_id" # ALTER TABLE
autonomous: true
requirements: ["IDENTITY-01-form-fill-chain"]
must_haves:
  truths:
    - "Submitting any of the 3 form-bearing endpoints (contact / customize-architecture / study-guide-download) creates or updates a row in identified_visitors keyed by email"
    - "Every form submission sets a first-party tcp_vid cookie (.techcloudpro.com, 1yr, Lax) on the response"
    - "Every page_views row written by collect.php after this ships includes a visitor_id column populated from the request's tcp_vid cookie when present"
    - "If the same email later submits a form from a NEW browser/device, both visitor_ids resolve to the canonical first-seen visitor_id (no duplicate person rows)"
    - "GET /tcp-analytics/stats.php?s=TcpSecureAdmin2026 returns identified_visits.{pageviews_with_visitor_id, distinct_identified_people, top_visitors[]} per window"
    - "PII (name/email/company/phone) is stored ONLY when the user explicitly provides it via form fields — no covert/external enrichment"
  artifacts:
    - path: "/Users/jeet/techcloudpro/api/_visitor.php"
      provides: "tcp_get_or_create_visitor_id(), tcp_upsert_identified_visitor(PDO, …), tcp_db()"
      min_lines: 60
    - path: "/Users/jeet/techcloudpro/api/contact.php"
      provides: "form-fill identity capture on POST success path"
      contains: "tcp_upsert_identified_visitor"
    - path: "/Users/jeet/techcloudpro/api/customize-architecture.php"
      provides: "form-fill identity capture inside email-gate block"
      contains: "tcp_upsert_identified_visitor"
    - path: "/Users/jeet/techcloudpro/api/study-guide-download.php"
      provides: "form-fill identity capture on lead-insert success path"
      contains: "tcp_upsert_identified_visitor"
    - path: "/Users/jeet/techcloudpro/api/stats.php"
      provides: "identified_visits block per window"
      contains: "identified_visits"
    - path: "(DB) u350621741_visitors.identified_visitors"
      provides: "person-of-record table for form submitters"
      contains: "visitor_id (UNIQUE), email (INDEX), name, company, phone, source_form, first_seen_at, last_seen_at"
    - path: "(DB) u350621741_visitors.page_views.visitor_id"
      provides: "JOIN key from anonymous pageview to identified person"
      contains: "VARCHAR(64) NULL, indexed"
  key_links:
    - from: "form POST handler (any of contact/customize/study-guide)"
      to: "identified_visitors row"
      via: "tcp_upsert_identified_visitor() in _visitor.php"
      pattern: "tcp_upsert_identified_visitor\\("
    - from: "browser cookie tcp_vid"
      to: "page_views.visitor_id"
      via: "collect.php reads $_COOKIE['tcp_vid'] and writes the column"
      pattern: "\\$_COOKIE\\[.tcp_vid.\\]"
    - from: "page_views.visitor_id"
      to: "identified_visitors.visitor_id"
      via: "stats.php JOIN inside identified_visits block"
      pattern: "JOIN identified_visitors"
    - from: "second browser submitting same email"
      to: "canonical first-seen visitor_id"
      via: "tcp_upsert_identified_visitor() email-lookup branch"
      pattern: "WHERE email = "
privacy_classification: "PII-touching — name/email/company/phone stored at user's explicit form-fill request"
---

<objective>
Build the form-fill identity chain so we can answer "who from a named prospect actually visited which pages and when?" — for any visitor who has EVER submitted a form on techcloudpro.com.

**The chain (3 hops):**

1. **Capture (form submit):** when a user submits contact / customize-architecture / study-guide-download, persist them in `identified_visitors` and set a first-party `tcp_vid` cookie scoped to `.techcloudpro.com`.
2. **Link (every pageview):** the existing `tracker.js` → `/tcp-analytics/collect.php` writes a `page_views` row on every pageview. Patch `collect.php` to also store `$_COOKIE['tcp_vid']` into a new `page_views.visitor_id` column.
3. **Report:** extend `stats.php` to JOIN `page_views.visitor_id` to `identified_visitors` and emit a per-window `identified_visits` block (pageview count, distinct identified people, top 20 named visitors).

Purpose: today `stats.php` answers "how many visits and from where" but every visitor is anonymous. After this ships we can pull a named list — "Rajesh @ TechCloudPro viewed /pricing 4 times last week" — for the prospect cohort that has ever filled a form.

Output: 3 patched PHP endpoints + 1 new helper + extended stats.php + 1 new DB table + 1 new column on page_views + collect.php patched on the server.
</objective>

<execution_context>
@/Users/jeet/.claude/get-shit-done/workflows/execute-plan.md
@/Users/jeet/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@/Users/jeet/doordash-p2p/.planning/STATE.md
@/Users/jeet/doordash-p2p/CLAUDE.md
@/Users/jeet/doordash-p2p/.planning/quick/305-build-tcp-analytics-stats-php-on-techclo/305-SUMMARY.md
@/Users/jeet/doordash-p2p/.planning/quick/305-build-tcp-analytics-stats-php-on-techclo/SCHEMA_PROBE.md
@/Users/jeet/doordash-p2p/.planning/quick/306-extend-tcp-analytics-stats-php-with-traf/306-SUMMARY.md
@/Users/jeet/techcloudpro/api/stats.php
@/Users/jeet/techcloudpro/api/contact.php
@/Users/jeet/techcloudpro/api/customize-architecture.php
@/Users/jeet/techcloudpro/api/study-guide-download.php
@/Users/jeet/techcloudpro/api/playground-load.php
@/Users/jeet/techcloudpro/api/chat.php
</context>

<known_facts>

**Pre-verified by planner — DO NOT re-discover:**

| Fact | Source |
|------|--------|
| DB host: `localhost` (Hostinger), DB name: `u350621741_visitors`, user: `u350621741_jeet977`, password: `Thirumala977!` | chat.php:142-144, stats.php:59-64, study-guide-download.php:62-66 (already committed across 4+ files) |
| SSH host: `147.93.101.51` port `65002` user `u350621741`. The alias `techcloudpro.com:22` does NOT resolve to SSH. | 306-SUMMARY.md DEVIATION-2 |
| Server doc-root for /api: `/home/u350621741/domains/techcloudpro.com/public_html/api/` | implied by stats.php deploy at sibling `/tcp-analytics/`; verify with `ssh ls` in Task 1 |
| Server doc-root for /tcp-analytics: `/home/u350621741/domains/techcloudpro.com/public_html/tcp-analytics/` (collect.php lives here) | 305-SUMMARY.md key-files |
| .htaccess for `/api/` ALREADY allows arbitrary `*.php` files — only `/tcp-analytics/.htaccess` has a tight whitelist | 305-SUMMARY.md DEVIATION-1 documents the WHITELIST is on tcp-analytics ONLY, not /api/ |
| Cloudflare WAF rejects default curl UA with 403 — must use browser UA on every test curl | 305-SUMMARY.md DEVIATION-2 |
| `playground-load.php` is read-only (GET by submission_id, no PII input) — DO NOT patch | verified by planner via direct file read 2026-04-28 |
| Form field names confirmed: contact.php uses `name/email/company/phone` (lines 33-36); customize-architecture.php uses same (lines 57-60); study-guide-download.php uses `name/email/company` only (lines 49-51, no phone) | direct grep, 2026-04-28 |
| stats.php auth gate: `?s=TcpSecureAdmin2026` via `hash_equals()`, 404 on miss | stats.php:20-24 |
| stats.php windows array structure: `today | last_7d | last_30d | all_time`, each is a SQL WHERE predicate | stats.php:75-81 |
| customize-architecture.php saves to `playground_submissions` table around line 369-381 (already inserts name/company/email/phone) — the helper call goes IMMEDIATELY AFTER that INSERT succeeds | direct grep |
| study-guide-download.php saves to `study_guide_leads` table around line 79-82 — helper call goes after that INSERT | direct grep |
| contact.php sends an email and pushes to CRM (line 124) — helper call goes BEFORE the final json_encode response so the cookie header makes it back to the client | direct grep |
| `setcookie()` MUST be called BEFORE any `echo` or `header('Content-Type:...')` writes the body, or PHP swallows it silently | PHP cookie behavior — applies to ALL 3 endpoints |

**Privacy stance (must be reflected in code comments + SUMMARY):**

- Only data the user typed into a form is stored. No reverse-IP, no covert fingerprinting, no third-party data brokers.
- `tcp_vid` is a 32-hex-char random ID, first-party, `.techcloudpro.com` only, 1yr expiry, `Lax` SameSite, `Secure`, NOT `HttpOnly` (frontend tracker.js needs to read it).
- Stats endpoint already gated by admin token (305) — identified_visits block inherits that gate.
- DB credentials in plaintext PHP is a PRE-EXISTING risk (committed in chat.php / stats.php / study-guide-download.php since 305). NOT addressed in this task; SUMMARY must call this out as Phase X follow-up.
</known_facts>

<tasks>

<task type="auto">
<name>Task 1: Schema migration via probe (mirror 305 workflow)</name>
<files>
  - /Users/jeet/doordash-p2p/.planning/quick/307-phase-1-identity-stack-form-fill-identit/IDENTITY_SCHEMA_PROBE.md (NEW — evidence file)
  - /tmp/tcp-307-schema-probe.php (LOCAL TEMP — deleted after task)
  - (server-only) /home/u350621741/domains/techcloudpro.com/public_html/tcp-analytics/tcp-307-schema-probe.php (deployed, executed, DELETED)
</files>

<action>
Mirror the exact pattern used in Task 305 SCHEMA_PROBE.md. **Do NOT** edit any application code in this task — schema first, then verify, then delete the probe.

**Step A — Build the probe locally** at `/tmp/tcp-307-schema-probe.php`:

```php
<?php
// Identity-stack schema probe — 307. Token-gated, one-shot, deleted after use.
$secret = $_GET['s'] ?? '';
if (!hash_equals('TcpSecureAdmin2026', $secret)) { http_response_code(404); exit; }
header('Content-Type: application/json');
try {
    $pdo = new PDO(
        'mysql:host=localhost;dbname=u350621741_visitors;charset=utf8mb4',
        'u350621741_jeet977', 'Thirumala977!',
        [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]
    );
    $log = [];

    // 1) CREATE identified_visitors
    $pdo->exec(<<<SQL
CREATE TABLE IF NOT EXISTS identified_visitors (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  visitor_id    VARCHAR(64)  NOT NULL UNIQUE,
  email         VARCHAR(255) NOT NULL,
  name          VARCHAR(255) NULL,
  company       VARCHAR(255) NULL,
  phone         VARCHAR(64)  NULL,
  source_form   VARCHAR(64)  NOT NULL,
  first_seen_ip VARCHAR(45)  NULL,
  first_seen_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_seen_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_email (email),
  INDEX idx_visitor_id (visitor_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
SQL);
    $log[] = ['step' => 'CREATE identified_visitors', 'result' => 'OK'];

    // 2) ALTER page_views — guard against re-run (column may already exist)
    $cols = $pdo->query("SHOW COLUMNS FROM page_views LIKE 'visitor_id'")->fetchAll();
    if (count($cols) === 0) {
        $pdo->exec("ALTER TABLE page_views ADD COLUMN visitor_id VARCHAR(64) NULL AFTER session_id");
        $pdo->exec("ALTER TABLE page_views ADD INDEX idx_visitor_id (visitor_id)");
        $log[] = ['step' => 'ALTER page_views ADD visitor_id + INDEX', 'result' => 'OK'];
    } else {
        $log[] = ['step' => 'ALTER page_views', 'result' => 'SKIPPED — visitor_id already present'];
    }

    // 3) Verify final schema
    $verify = [
        'identified_visitors_describe' => $pdo->query("DESCRIBE identified_visitors")->fetchAll(PDO::FETCH_ASSOC),
        'page_views_visitor_id'        => $pdo->query("SHOW COLUMNS FROM page_views LIKE 'visitor_id'")->fetchAll(PDO::FETCH_ASSOC),
        'page_views_indexes'           => $pdo->query("SHOW INDEX FROM page_views WHERE Key_name = 'idx_visitor_id'")->fetchAll(PDO::FETCH_ASSOC),
        'identified_visitors_count'    => (int)$pdo->query("SELECT COUNT(*) FROM identified_visitors")->fetchColumn(),
    ];
    echo json_encode(['migrations' => $log, 'verify' => $verify], JSON_PRETTY_PRINT);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['error' => $e->getMessage()]);
}
```

**Step B — Deploy probe to server:**

```bash
scp -P 65002 /tmp/tcp-307-schema-probe.php \
  u350621741@147.93.101.51:/home/u350621741/domains/techcloudpro.com/public_html/tcp-analytics/tcp-307-schema-probe.php
```

If 305-style `.htaccess` rejects this filename (it likely will — whitelist is `admin|collect|trap|stats`), you have two choices:

- **Option A (preferred):** ssh in and temporarily add `tcp-307-schema-probe` to the whitelist regex (mirror the 305 workaround). Restore the whitelist immediately after probe runs.
- **Option B (faster):** rename the probe to `stats-probe-307.php` AFTER `stats` in regex won't match it — actually it would, the regex is `^(stats|admin|collect|trap)\.php$` exact-anchored. Stick with Option A.

**Step C — Execute and capture evidence:**

```bash
curl -sS -A 'Mozilla/5.0 (Macintosh) AppleWebKit/605.1.15 Safari/605.1.15' \
  'https://techcloudpro.com/tcp-analytics/tcp-307-schema-probe.php?s=TcpSecureAdmin2026' \
  | tee /tmp/tcp-307-schema-probe.json
```

Expect HTTP 200, JSON body with:
- `migrations[].result == "OK"` for both steps (or "SKIPPED" if re-run)
- `verify.identified_visitors_describe` showing 10 columns including `visitor_id` UNIQUE + `email` INDEX
- `verify.page_views_visitor_id` showing 1 row with `Field=visitor_id, Type=varchar(64), Null=YES`
- `verify.page_views_indexes` showing 1 row `Key_name=idx_visitor_id, Column_name=visitor_id`
- `verify.identified_visitors_count == 0` (fresh table)

**Step D — DELETE the probe + restore .htaccess:**

```bash
ssh -p 65002 u350621741@147.93.101.51 \
  'rm /home/u350621741/domains/techcloudpro.com/public_html/tcp-analytics/tcp-307-schema-probe.php'
# then re-deploy whitelist .htaccess WITHOUT tcp-307-schema-probe (back to admin|collect|trap|stats)
rm /tmp/tcp-307-schema-probe.php
```

Verify deletion with a follow-up curl that returns HTTP 404.

**Step E — Write evidence file** `/Users/jeet/doordash-p2p/.planning/quick/307-phase-1-identity-stack-form-fill-identit/IDENTITY_SCHEMA_PROBE.md` containing:
- Probed at: ISO timestamp
- Verbatim contents of `/tmp/tcp-307-schema-probe.json`
- Confirmation curl that probe is gone (HTTP 404)
- Note: `.htaccess` reverted to original whitelist
</action>

<verify>
1. `cat /Users/jeet/doordash-p2p/.planning/quick/307-phase-1-identity-stack-form-fill-identit/IDENTITY_SCHEMA_PROBE.md` shows the live JSON output with `migrations[*].result` all "OK" and `verify.identified_visitors_describe` listing all 10 columns.
2. Final curl to `…/tcp-analytics/tcp-307-schema-probe.php?s=TcpSecureAdmin2026` returns HTTP 404 (probe deleted).
3. ssh-grep on the .htaccess confirms the regex is back to `admin|collect|trap|stats` (no `tcp-307-schema-probe` residue).
</verify>

<done>
- `identified_visitors` table exists in `u350621741_visitors` with the exact 10-column schema from <known_facts>.
- `page_views.visitor_id` column exists, type `varchar(64) NULL`, indexed as `idx_visitor_id`.
- Probe PHP file is gone from server (404 on follow-up curl). Local `/tmp/tcp-307-schema-probe.php` deleted.
- `IDENTITY_SCHEMA_PROBE.md` evidence file committed alongside this plan in dollor.ai repo (commit comes in Task 3).
- `.htaccess` whitelist restored to its 305-era state.
</done>
</task>

<task type="auto">
<name>Task 2: Build helper, patch 3 endpoints + collect.php, extend stats.php, deploy all</name>
<files>
  - /Users/jeet/techcloudpro/api/_visitor.php (NEW)
  - /Users/jeet/techcloudpro/api/contact.php (PATCH)
  - /Users/jeet/techcloudpro/api/customize-architecture.php (PATCH)
  - /Users/jeet/techcloudpro/api/study-guide-download.php (PATCH)
  - /Users/jeet/techcloudpro/api/stats.php (EXTEND — additive only, no rewrite)
  - /tmp/collect.php (LOCAL — pulled from server, patched, redeployed)
  - (server-only) /home/u350621741/domains/techcloudpro.com/public_html/api/_visitor.php (DEPLOY)
  - (server-only) …/api/contact.php (DEPLOY)
  - (server-only) …/api/customize-architecture.php (DEPLOY)
  - (server-only) …/api/study-guide-download.php (DEPLOY)
  - (server-only) …/api/stats.php (DEPLOY — note: stats.php in the LIVE deploy lives under /tcp-analytics/, not /api/. The /api/stats.php in the local repo is the source-of-truth file — confirm the live deploy target path before scp)
  - (server-only) …/tcp-analytics/collect.php (DEPLOY patched version)
</files>

<action>

### Step A — Pre-flight: confirm live deploy paths

`stats.php` is the only file with a confusing dual-location story (305 deployed it under `/tcp-analytics/` while keeping the source in `/api/`). Run this before any scp:

```bash
ssh -p 65002 u350621741@147.93.101.51 'ls -la \
  /home/u350621741/domains/techcloudpro.com/public_html/api/contact.php \
  /home/u350621741/domains/techcloudpro.com/public_html/api/customize-architecture.php \
  /home/u350621741/domains/techcloudpro.com/public_html/api/study-guide-download.php \
  /home/u350621741/domains/techcloudpro.com/public_html/tcp-analytics/collect.php \
  /home/u350621741/domains/techcloudpro.com/public_html/tcp-analytics/stats.php'
```

All 5 must exist. If any are missing, **STOP and ask the user** before guessing alternative paths.

Also `scp` collect.php DOWN to `/tmp/collect.php` so you can patch the LIVE file (the local repo doesn't have it).

### Step B — Pre-flight: confirm 4-endpoint email-capture map

The plan was authored against grep output. Re-confirm by reading the success-paths of each endpoint right now:

| Endpoint | Captures | source_form value | Insertion point |
|----------|----------|-------------------|-----------------|
| contact.php | name, email, company, phone | `'contact'` | line ~80 (after disk save, before final json_encode) |
| customize-architecture.php | name, email, company, phone | `'ai-playground'` | immediately after the `INSERT INTO playground_submissions` succeeds (~line 381) |
| study-guide-download.php | name, email, company (no phone) | `'rag-study-guide'` | immediately after the `INSERT INTO study_guide_leads` succeeds (~line 81) |

If any of these 3 endpoints does NOT actually capture an email, **STOP and ask the user** (rather than silently skipping).

### Step C — Create `/Users/jeet/techcloudpro/api/_visitor.php`

Single file, ~80 lines. Three functions, all defensive:

```php
<?php
/**
 * TCP Identity Helper — form-fill identity chain (Phase 1, quick task 307).
 *
 * Privacy: this module persists ONLY data the user typed into a form
 * (name/email/company/phone). No external API enrichment. No covert
 * fingerprinting. The cookie is a first-party random ID linking the same
 * user across pageviews on .techcloudpro.com.
 *
 * Pre-existing risk (NOT in this task): DB creds inlined in PHP across
 * chat.php / stats.php / study-guide-download.php / customize-architecture.php
 * since task 305. Tracked as Phase X follow-up.
 */

/** Open a PDO to u350621741_visitors using the same line every TCP file uses. */
function tcp_db(): PDO {
    return new PDO(
        'mysql:host=localhost;dbname=u350621741_visitors;charset=utf8mb4',
        'u350621741_jeet977',
        'Thirumala977!',
        [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION, PDO::ATTR_TIMEOUT => 5]
    );
}

/**
 * Read or mint the tcp_vid cookie. Returns the visitor_id string.
 * MUST be called BEFORE any echo/header('Content-Type:') in the caller —
 * setcookie() needs to fire before body bytes are flushed.
 */
function tcp_get_or_create_visitor_id(): string {
    $vid = $_COOKIE['tcp_vid'] ?? '';
    if (!preg_match('/^[a-f0-9]{32}$/', $vid)) {
        $vid = bin2hex(random_bytes(16));
        setcookie('tcp_vid', $vid, [
            'expires'  => time() + 31536000,   // 1 year
            'path'     => '/',
            'domain'   => '.techcloudpro.com',
            'secure'   => true,
            'httponly' => false,               // tracker.js needs to read it
            'samesite' => 'Lax',
        ]);
        // Also reflect in $_COOKIE so callers in the same request see it.
        $_COOKIE['tcp_vid'] = $vid;
    }
    return $vid;
}

/**
 * Force the cookie to a SPECIFIC value (used for cross-device unification:
 * when a known email shows up under a new visitor_id, we rewrite the cookie
 * to the canonical first-seen visitor_id).
 */
function tcp_set_visitor_cookie(string $vid): void {
    setcookie('tcp_vid', $vid, [
        'expires'  => time() + 31536000,
        'path'     => '/',
        'domain'   => '.techcloudpro.com',
        'secure'   => true,
        'httponly' => false,
        'samesite' => 'Lax',
    ]);
    $_COOKIE['tcp_vid'] = $vid;
}

/**
 * Upsert an identified visitor and return the CANONICAL visitor_id.
 *
 * If the email already exists under a different visitor_id (cross-device case),
 * we keep the FIRST-SEEN visitor_id and return it. The caller should call
 * tcp_set_visitor_cookie() with the returned value so subsequent pageviews
 * link to the canonical ID.
 *
 * Otherwise: insert (or update name/company/phone if they were re-supplied)
 * and bump last_seen_at via the ON UPDATE CURRENT_TIMESTAMP column.
 */
function tcp_upsert_identified_visitor(
    PDO $pdo,
    string $visitor_id,
    string $email,
    ?string $name,
    ?string $company,
    ?string $phone,
    string $source_form,
    ?string $ip = null
): string {
    $email_norm = strtolower(trim($email));
    if ($email_norm === '' || !filter_var($email_norm, FILTER_VALIDATE_EMAIL)) {
        // Defensive — caller should have validated, but never trust.
        return $visitor_id;
    }

    // 1) Canonical lookup by email (cross-device unification)
    $stmt = $pdo->prepare("SELECT visitor_id FROM identified_visitors WHERE email = ? LIMIT 1");
    $stmt->execute([$email_norm]);
    $canonical = $stmt->fetchColumn();

    if ($canonical && $canonical !== $visitor_id) {
        // Update the canonical row's last_seen + any fresh fields, return canonical id.
        $stmt = $pdo->prepare(
            "UPDATE identified_visitors
             SET name        = COALESCE(NULLIF(?, ''), name),
                 company     = COALESCE(NULLIF(?, ''), company),
                 phone       = COALESCE(NULLIF(?, ''), phone),
                 source_form = ?,
                 last_seen_at = CURRENT_TIMESTAMP
             WHERE visitor_id = ?"
        );
        $stmt->execute([$name ?? '', $company ?? '', $phone ?? '', $source_form, $canonical]);
        return $canonical;
    }

    // 2) Insert-or-update on visitor_id (idempotent, handles re-submits in same browser)
    $stmt = $pdo->prepare(
        "INSERT INTO identified_visitors
            (visitor_id, email, name, company, phone, source_form, first_seen_ip)
         VALUES (?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE
            email        = VALUES(email),
            name         = COALESCE(NULLIF(VALUES(name), ''),    name),
            company      = COALESCE(NULLIF(VALUES(company), ''), company),
            phone        = COALESCE(NULLIF(VALUES(phone), ''),   phone),
            source_form  = VALUES(source_form),
            last_seen_at = CURRENT_TIMESTAMP"
    );
    $stmt->execute([
        $visitor_id, $email_norm, $name, $company, $phone, $source_form, $ip
    ]);
    return $visitor_id;
}
```

### Step D — Patch the 3 form endpoints

For EACH of `contact.php`, `customize-architecture.php`, `study-guide-download.php`:

1. Add `require_once __DIR__ . '/_visitor.php';` near the top, AFTER the opening `<?php` tag but BEFORE any `header()` or echo.
2. **Critical:** call `$visitor_id = tcp_get_or_create_visitor_id();` BEFORE any `header('Content-Type: …')` already in the file. (PHP buffers cookies until first body byte.) For files where `header(Content-Type)` is at the very top, you may need to MOVE the helper call before it — re-read the file and verify ordering.
3. After the existing successful insert/save (specific line shown in <known_facts>), add:

```php
try {
    $pdo_ident = tcp_db();
    $canonical = tcp_upsert_identified_visitor(
        $pdo_ident, $visitor_id, $email, $name, $company,
        $phone ?? null,    // study-guide-download has no phone — pass null
        'contact'          // or 'ai-playground' / 'rag-study-guide'
    );
    if ($canonical !== $visitor_id) {
        tcp_set_visitor_cookie($canonical);
    }
} catch (Exception $e) {
    error_log('tcp identity capture failed (contact): ' . $e->getMessage());
    // Do NOT fail the user-facing request — identity is best-effort.
}
```

`source_form` literal must match: `'contact'` for contact.php, `'ai-playground'` for customize-architecture.php, `'rag-study-guide'` for study-guide-download.php.

For `customize-architecture.php`: the existing code already opens its own `$pdo` (line ~369 area). Re-use that connection if convenient — the helper accepts any PDO. For the other two, `tcp_db()` is fine.

For `study-guide-download.php`: pass `null` for `$phone` since it isn't captured.

### Step E — Patch `collect.php`

```bash
scp -P 65002 u350621741@147.93.101.51:/home/u350621741/domains/techcloudpro.com/public_html/tcp-analytics/collect.php /tmp/collect.php
cp /tmp/collect.php /tmp/collect.php.orig.307
```

Open `/tmp/collect.php`. Find the existing `INSERT INTO page_views (...)` statement. Add `visitor_id` to the column list AND a corresponding placeholder in the VALUES, then bind `$_COOKIE['tcp_vid'] ?? null` (validate format with the same `^[a-f0-9]{32}$` regex; if it doesn't match, pass `null` — never insert garbage).

**Do NOT call `tcp_get_or_create_visitor_id()` from collect.php** — that would race with form-fill flows and could mint a brand-new ID for an already-identified user before they fill the form. collect.php is read-only for the cookie.

### Step F — Extend `stats.php`

Inside the existing `foreach ($windows as $name => $where)` loop, AFTER the existing 8 metric blocks but BEFORE `$result[$name] = [...]`, add:

```php
// 9) identified_visits — JOIN page_views.visitor_id to identified_visitors
//    Reveals which named prospects (form-fill) viewed pages in this window.
$pageviews_with_vid = (int) $pdo->query(
    "SELECT COUNT(*) FROM `$TABLE`
     WHERE $where AND visitor_id IS NOT NULL AND visitor_id != ''"
)->fetchColumn();

$distinct_identified = (int) $pdo->query(
    "SELECT COUNT(DISTINCT pv.visitor_id)
     FROM `$TABLE` pv
     JOIN identified_visitors iv ON iv.visitor_id = pv.visitor_id
     WHERE $where"
)->fetchColumn();

$top_visitors = $pdo->query(
    "SELECT iv.name, iv.email, iv.company, iv.source_form,
            iv.first_seen_at, iv.last_seen_at,
            COUNT(*) AS pageviews
     FROM `$TABLE` pv
     JOIN identified_visitors iv ON iv.visitor_id = pv.visitor_id
     WHERE $where
     GROUP BY iv.id
     ORDER BY pageviews DESC
     LIMIT 20"
)->fetchAll(PDO::FETCH_ASSOC);
foreach ($top_visitors as &$row) { $row['pageviews'] = (int) $row['pageviews']; }
unset($row);
```

Add the new key inside the existing `$result[$name] = [...]` array (do NOT remove or reorder existing keys):

```php
'identified_visits' => [
    'pageviews_with_visitor_id' => $pageviews_with_vid,
    'distinct_identified_people' => $distinct_identified,
    'top_visitors'              => $top_visitors,
],
```

### Step G — Deploy all 6 files

```bash
# 5 files to /api/
scp -P 65002 \
  /Users/jeet/techcloudpro/api/_visitor.php \
  /Users/jeet/techcloudpro/api/contact.php \
  /Users/jeet/techcloudpro/api/customize-architecture.php \
  /Users/jeet/techcloudpro/api/study-guide-download.php \
  u350621741@147.93.101.51:/home/u350621741/domains/techcloudpro.com/public_html/api/

# stats.php — confirm the LIVE target from Step A. Likely deploys to BOTH:
#  - /api/stats.php (source-of-truth file in repo)  AND
#  - /tcp-analytics/stats.php (the gated endpoint URL)
# If those are linked / re-served from one location, only deploy once.
scp -P 65002 /Users/jeet/techcloudpro/api/stats.php \
  u350621741@147.93.101.51:/home/u350621741/domains/techcloudpro.com/public_html/tcp-analytics/stats.php

# patched collect.php
scp -P 65002 /tmp/collect.php \
  u350621741@147.93.101.51:/home/u350621741/domains/techcloudpro.com/public_html/tcp-analytics/collect.php
```

After deploy, smoke-curl each endpoint with browser UA to confirm they're not throwing 500 (a syntax error would).

### Step H — Sanity asserts (lightweight, full E2E lives in Task 3)

- `php -l` if available locally on each modified file (305/306 noted local PHP isn't installed; rely on live curl). On every file: deploy → curl → expect 200 (for stats.php and the GET-able endpoints) or 405/400 (for POST-only endpoints with empty GET body — that's still proof the file parsed).
- `curl -sS -A 'Mozilla/...' https://techcloudpro.com/tcp-analytics/stats.php?s=TcpSecureAdmin2026 | python3 -c 'import sys,json; d=json.load(sys.stdin); assert "identified_visits" in d["windows"]["all_time"]; print("OK")'`
</action>

<verify>
1. `_visitor.php` exists locally + on server, contains all 3 functions (`tcp_db`, `tcp_get_or_create_visitor_id`, `tcp_upsert_identified_visitor`) and `tcp_set_visitor_cookie`.
2. Each of `contact.php`, `customize-architecture.php`, `study-guide-download.php` contains exactly one `tcp_upsert_identified_visitor(` call.
3. `collect.php` (server-pulled to /tmp/collect.php) contains `visitor_id` in the page_views INSERT column list AND the regex-validated cookie bind.
4. `stats.php` contains `identified_visits` AND `JOIN identified_visitors` AND `top_visitors`.
5. Live curl `https://techcloudpro.com/tcp-analytics/stats.php?s=TcpSecureAdmin2026` returns 200 with `identified_visits.pageviews_with_visitor_id` (likely 0 at this point — that's fine; Task 3 generates real data).
6. POST to `https://techcloudpro.com/api/contact.php` with `Content-Type: application/json` and an empty body: HTTP 400 expected (proves the file parses + still rejects bad input).
</verify>

<done>
- 4 local PHP files created/patched in `/Users/jeet/techcloudpro/api/`.
- 6 files deployed to Hostinger across `/api/` and `/tcp-analytics/`.
- All 4 endpoints (contact, customize-architecture, study-guide-download, stats) return non-500 on smoke curls.
- stats.php JSON for any window contains the new `identified_visits` key.
</done>
</task>

<task type="auto">
<name>Task 3: End-to-end verification + commit + summary</name>
<files>
  - /Users/jeet/doordash-p2p/.planning/quick/307-phase-1-identity-stack-form-fill-identit/307-SUMMARY.md (NEW)
  - dollor.ai commit (docs)
  - techcloudpro commit (feat)
</files>

<action>

### Step A — Synthetic E2E with cookie tracing

For each of the 3 form endpoints, fire one synthetic submission with a UNIQUE recognizable test email (e.g. `tcp-307-contact-test+<unix-ts>@inbox.tcp-307-test.invalid`). Use `-c /tmp/cookies.txt` so we capture the Set-Cookie header. Use a browser UA.

**A1 — contact.php:**
```bash
TS=$(date +%s)
curl -sS -i -A 'Mozilla/5.0 (Macintosh) AppleWebKit/605.1.15' \
  -c /tmp/cookies.txt \
  -H 'Content-Type: application/json' \
  --data-raw "{\"name\":\"Test 307 Contact\",\"email\":\"tcp-307-contact-${TS}@example.com\",\"company\":\"TCP-307 Test Co\",\"phone\":\"+1-555-0307\"}" \
  https://techcloudpro.com/api/contact.php | tee /tmp/307-contact.out
grep -i 'tcp_vid' /tmp/cookies.txt   # MUST show a 32-hex value scoped to .techcloudpro.com
```

**A2 — customize-architecture.php:** craft a minimal valid JSON body (industry/use_case/security/cloud/stack/timeframe/start_when/company/name/email/phone — peek at lines 57-90 of the live file to confirm the required fields). Same `-c /tmp/cookies-307-arch.txt` cookie capture.

**A3 — study-guide-download.php:**
```bash
TS=$(date +%s)
curl -sS -i -A 'Mozilla/5.0 (Macintosh) AppleWebKit/605.1.15' \
  -c /tmp/cookies-307-sg.txt \
  -H 'Content-Type: application/json' \
  --data-raw "{\"name\":\"Test 307 SG\",\"email\":\"tcp-307-sg-${TS}@example.com\",\"company\":\"TCP-307 SG Co\"}" \
  https://techcloudpro.com/api/study-guide-download.php
grep -i 'tcp_vid' /tmp/cookies-307-sg.txt
```

For each: assert HTTP 200 + Set-Cookie header for `tcp_vid` is present.

### Step B — Cookie-flow verification (the page-views chain)

Using ONE of the cookie jars from Step A, hit a `tracker.js`-instrumented endpoint to verify collect.php records the visitor_id:

```bash
# Locate a tracker page or simulate the collect.php POST directly.
# tracker.js POSTs to /tcp-analytics/collect.php — find a real page
# referrer that triggers it, OR simulate the same POST with the cookie jar.
curl -sS -i -A 'Mozilla/5.0 (Macintosh) AppleWebKit/605.1.15' \
  -b /tmp/cookies.txt \
  -H 'Content-Type: application/json' \
  --data-raw '{"page":"/tcp-307-test-page","referrer":"","session_id":"tcp307sess'"$TS"'"}' \
  https://techcloudpro.com/tcp-analytics/collect.php
```

(Inspect actual collect.php request shape from the file you scp'd in Task 2 Step E to send valid keys.)

Then query stats.php and verify:

```bash
curl -sS -A 'Mozilla/5.0 (Macintosh) AppleWebKit/605.1.15' \
  'https://techcloudpro.com/tcp-analytics/stats.php?s=TcpSecureAdmin2026' \
  | python3 -c '
import sys, json
d = json.load(sys.stdin)
iv = d["windows"]["today"]["identified_visits"]
assert iv["pageviews_with_visitor_id"] >= 1, "no linked pageview"
assert iv["distinct_identified_people"] >= 1, "no identified person"
assert any("tcp-307" in (v["email"] or "") for v in iv["top_visitors"]), "test visitor missing from top_visitors"
print("OK — identified_visits chain verified")
print(json.dumps(iv, indent=2))
'
```

### Step C — Cross-device dedup verification (the email-canonical branch)

Submit the SAME `tcp-307-contact-${TS}` email a second time but with NO cookie jar (simulating a different browser):

```bash
curl -sS -i -A 'Mozilla/5.0 (Macintosh) AppleWebKit/605.1.15' \
  -c /tmp/cookies-307-second.txt \
  -H 'Content-Type: application/json' \
  --data-raw "{\"name\":\"Test 307 Contact\",\"email\":\"tcp-307-contact-${TS}@example.com\",\"company\":\"TCP-307 Test Co\"}" \
  https://techcloudpro.com/api/contact.php
```

The Set-Cookie in `/tmp/cookies-307-second.txt` should be the SAME `tcp_vid` value as `/tmp/cookies.txt` (canonical-by-email branch fired and reset the cookie). Diff them:

```bash
grep tcp_vid /tmp/cookies.txt /tmp/cookies-307-second.txt
# Both lines should contain the SAME 32-hex value.
```

If they DIFFER: the canonical branch has a bug — investigate before declaring done.

### Step D — Privacy + auth gate re-checks

```bash
# Auth gate on stats.php still 404s without token
curl -sS -o /dev/null -w '%{http_code}\n' \
  -A 'Mozilla/5.0' \
  https://techcloudpro.com/tcp-analytics/stats.php
# Expect: 404
```

Confirm `identified_visitors` table contains ONLY the test rows we just inserted (plus any real form-fills that happened during deploy). Spot-check by querying via a one-shot probe IF needed (mirror Task 1 cleanup) OR via a separate SSH read:

```bash
ssh -p 65002 u350621741@147.93.101.51 \
  "mysql -u u350621741_jeet977 -p'Thirumala977!' u350621741_visitors -e 'SELECT COUNT(*) AS cnt, MAX(first_seen_at) AS latest FROM identified_visitors;'"
```

(If `mysql` CLI isn't on the Hostinger shared host, fall back to the curl-via-stats.php proof — the JOIN counts are sufficient.)

### Step E — Commit

**techcloudpro repo:**
```bash
cd /Users/jeet/techcloudpro
git add api/_visitor.php api/contact.php api/customize-architecture.php \
        api/study-guide-download.php api/stats.php
git commit -m "$(cat <<'EOF'
feat(api): identity-stack phase 1 — form-fill identity chain

Capture name+email+company from contact / customize-architecture / study-guide-download
into a new identified_visitors table, set a first-party tcp_vid cookie, and join it
to page_views in stats.php so we can answer "who visited" for any prospect that ever
filled a form.

- New api/_visitor.php helper: tcp_db(), tcp_get_or_create_visitor_id(),
  tcp_upsert_identified_visitor() with cross-device email-canonical branch.
- 3 form endpoints patched (additive, best-effort — identity capture failures
  do NOT fail the user-facing request).
- stats.php gains identified_visits block per window (pageviews_with_visitor_id,
  distinct_identified_people, top_visitors[20]).
- collect.php (server-only) patched separately to record $_COOKIE['tcp_vid']
  into the new page_views.visitor_id column.

Schema migration: identified_visitors table created + page_views.visitor_id
column added. Evidence in dollor.ai .planning/quick/307-.../IDENTITY_SCHEMA_PROBE.md.

Privacy: stores ONLY data the user typed into a form. No external enrichment.
First-party cookie scoped to .techcloudpro.com, 1yr, Lax, Secure.
EOF
)"
```

Per CLAUDE.md, do NOT push unless user asks.

**dollor.ai repo:**
```bash
cd /Users/jeet/doordash-p2p
git add .planning/quick/307-phase-1-identity-stack-form-fill-identit/
git commit -m "$(cat <<'EOF'
docs(quick-307): identity-stack Phase 1 — PLAN + SCHEMA_PROBE + SUMMARY

Form-fill identity chain shipped to techcloudpro.com:
- identified_visitors table + page_views.visitor_id column live
- 3 form endpoints + collect.php + stats.php patched
- E2E synthetic test confirms cookie → JOIN → stats round-trip
- Cross-device email-canonical branch verified (same email → same visitor_id)

techcloudpro repo: 1 commit (feat: identity-stack phase 1).
EOF
)"
```

### Step F — Write 307-SUMMARY.md

Mirror the structure of 306-SUMMARY.md exactly. Required sections:

- Frontmatter (`phase`, `plan`, `subsystem: tcp-identity-stack`, `tags: [tcp, php, identity, hostinger, pii]`, `dependency-graph`, `tech-stack`, `key-files`, `decisions`, `metrics`)
- One-liner
- What was built (3-hop chain)
- Verification — verbatim live evidence (paste the curl outputs from Steps A/B/C/D)
- DB tables created/altered
- Files changed table
- Deviations from Plan
- **Privacy stance** (NEW dedicated section): "ONLY user-typed form data is stored. No external enrichment. First-party cookie. Stats endpoint inherits 305 admin-token gate. DB-creds-in-PHP is a pre-existing risk filed for Phase X follow-up."
- CR ticket: skipped (TCP infrastructure)
- Authentication gates: none (SSH key present from 305)
- Commit hashes (techcloudpro + dollor.ai)
- Live URL: `https://techcloudpro.com/tcp-analytics/stats.php?s=TcpSecureAdmin2026` (browser UA required)
- Self-Check
</action>

<verify>
1. Step A: 3 cookie jars each contain a `tcp_vid` 32-hex value scoped to `.techcloudpro.com` (paste `grep tcp_vid` outputs into SUMMARY).
2. Step B: stats.php JSON contains at least 1 `pageviews_with_visitor_id`, 1 `distinct_identified_people`, and a `top_visitors` entry whose email starts with `tcp-307-` (paste verbatim into SUMMARY).
3. Step C: cookie jars from before+after second submission show the SAME tcp_vid value (canonical-by-email proof).
4. Step D: auth gate still 404s without the secret. SUMMARY notes count of identified_visitors rows after the run.
5. techcloudpro commit + dollor.ai commit exist (SHA captured in SUMMARY).
6. SUMMARY.md exists with all required sections, including the Privacy stance section.
</verify>

<done>
- Form submit on any of 3 endpoints sets `tcp_vid` cookie + creates `identified_visitors` row (proven verbatim).
- A page_views row written AFTER cookie set has the visitor_id column populated (proven verbatim via JOIN count in stats.php).
- Same email submitted from a second (cookie-less) curl reuses the canonical visitor_id (proven verbatim).
- `identified_visits` block returns valid data for at least one window (today).
- Two commits made (techcloudpro feat + dollor.ai docs), neither pushed (per CLAUDE.md).
- 307-SUMMARY.md written with privacy stance section + Phase X follow-up note (DB creds in PHP).
</done>
</task>

</tasks>

<verification>

**Goal-backward proof bundle (paste verbatim into SUMMARY):**

1. **Probe evidence** — `IDENTITY_SCHEMA_PROBE.md` showing CREATE + ALTER OK + DESCRIBE confirming columns.
2. **Cookie set proof** — `grep tcp_vid /tmp/cookies.txt` from each of 3 form submits, showing `.techcloudpro.com` scope.
3. **JOIN proof** — `stats.php` JSON for `today.identified_visits` showing non-zero counts and a `tcp-307-...@example.com` entry in `top_visitors`.
4. **Cross-device proof** — second submit with no cookie jar reuses the canonical `tcp_vid` (diff of two cookie jars).
5. **Auth gate proof** — `curl … stats.php` without `?s=…` returns 404 (gate intact).
6. **collect.php update proof** — JOIN count > 0 implies the column was populated; if uncertain, do `ssh … 'mysql -e "SELECT visitor_id FROM page_views WHERE visitor_id IS NOT NULL ORDER BY id DESC LIMIT 5"'`.

**Privacy proof:**
- No external HTTP calls in `_visitor.php` (grep `curl|file_get_contents|fopen|fsockopen` → 0 results).
- All inserted PII originates from `$data['name|email|company|phone']` only.

**Failure modes the SUMMARY must explicitly address:**
- DB connection drop in helper → caught, request still succeeds (best-effort capture).
- Cookie blocked by user → form-fill row still inserted; page_views never linked. (Acceptable — user opted out.)
- Robotic form submitters → will create identified_visitors rows. Out of scope; Phase 2 problem.
</verification>

<success_criteria>

- 6 server files in their correct deploy locations + 1 new DB table + 1 new column on page_views.
- All 5 verbatim proofs above pasted into 307-SUMMARY.md.
- 2 commits (techcloudpro feat, dollor.ai docs) — not pushed.
- IDENTITY_SCHEMA_PROBE.md preserved as historical artifact.
- Privacy stance section in SUMMARY explicitly notes:
  - Only user-typed form data is stored.
  - DB credentials in plaintext PHP is a PRE-EXISTING risk (since 305), NOT a regression introduced by this task. Filed as Phase X follow-up.
  - Cookie is first-party, 1yr, Lax, scoped to `.techcloudpro.com`.

**Stop-and-ask conditions (executor must NOT silently skip):**

1. If the live deploy paths in Task 2 Step A don't match expectations.
2. If any of the 3 form endpoints does NOT actually capture an email (re-grep the live file before patching — if email field is missing, ask the user before introducing a new code path).
3. If the `.htaccess` whitelist on `/tcp-analytics/` blocks the schema probe AND a temporary whitelist edit is unsafe (contact user).

**Constraints honored:**

- DB creds reuse the chat.php pattern verbatim (no new secrets mechanism, no env var introduction — that's a separate task).
- No research phase needed — schema, deploy method, auth all known from 305+306.
- Single plan, 3 tasks, ~30% context target.
</success_criteria>

<output>
After completion, create `.planning/quick/307-phase-1-identity-stack-form-fill-identit/307-SUMMARY.md` and append a single-paragraph entry to `.planning/STATE.md` describing the form-fill identity chain shipped (mirroring the 306 STATE entry style).
</output>
