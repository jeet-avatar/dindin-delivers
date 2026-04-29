---
phase: 318-tcp-bot-detection-filtering-add-user-age
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - /Users/jeet/techcloudpro/api/collect.php
  - /Users/jeet/techcloudpro/api/stats.php
  - /Users/jeet/techcloudpro/public/tcp-analytics/tracker.js
  - (server-only) Hostinger MySQL u350621741_visitors.page_views (ALTER ADD user_agent + is_bot)
  - /tmp/tcp-analytics-portable/SCHEMA.sql
  - /tmp/tcp-analytics-portable/README.md
  - /tmp/tcp-analytics-portable/api/collect.php
  - /tmp/tcp-analytics-portable/api/stats.php
  - /tmp/tcp-analytics-portable/public/analytics/tracker.js
  - /tmp/tcp-analytics-portable.zip
  - /Users/jeet/doordash-p2p/.planning/STATE.md
  - /Users/jeet/doordash-p2p/.planning/quick/318-tcp-bot-detection-filtering-add-user-age/318-SUMMARY.md
autonomous: true
requirements:
  - "BOT-01: Application-layer bot filter independent of Cloudflare bot-fight"
  - "BOT-02: page_views.user_agent column persists raw UA (Phase 311 follow-up #1 closure)"
  - "BOT-03: page_views.is_bot column flags bots from server UA regex + client-side headless signal"
  - "BOT-04: stats.php pageview SQL filters is_bot=0 alongside is_test=0 (filters stack)"
  - "BOT-05: Portable zip refreshed with SCHEMA + README + sanitized PHP/JS reflecting bot detection"

must_haves:
  truths:
    - "Application-layer bot filter — Cloudflare-independent: works whether CF bot fight is on or off"
    - "Mirrors quick-317 is_test pattern — both filters stack via WHERE is_test=0 AND is_bot=0"
    - "Belt-and-suspenders detection — UA regex (server-side) + headless signal (client-side)"
    - "Existing legacy pageviews (1,724+) stay is_bot=0 — historical data not retroactively classified"
    - "Privacy unchanged — UA is already sent with every HTTP request, just persisted now"
    - "All 12+ pageview SQL blocks in stats.php now filter is_bot=0 (executor MUST grep before patching)"
    - "Real-deliverable Safari UA + headless:false → is_bot=0 (regression preserved end-to-end)"
    - "Default curl/8.x UA → is_bot=1 (defense-in-depth — regex catches it)"
    - "Headless-flagged JS payload with normal Safari UA → is_bot=1 (JS layer catches headless browsers UA spoofing)"
    - "Portable zip is sanitized — zero TCP-specific values (no api.dollor.ai, no Thirumala977!, no 32817b8c..., no TcpSecureAdmin2026, no _tcp_no_fp local-storage key)"
  artifacts:
    - path: "(server-side) MySQL u350621741_visitors.page_views"
      provides: "user_agent VARCHAR(500) NULL + is_bot TINYINT(1) NOT NULL DEFAULT 0 + idx_is_bot BTREE"
    - path: "/Users/jeet/techcloudpro/api/collect.php"
      provides: "Server-side UA capture + bot-detection regex + headless-flag accept + 2 new INSERT columns"
    - path: "/Users/jeet/techcloudpro/api/stats.php"
      provides: "12+ pageview SQL blocks filter is_bot=0 alongside existing is_test=0"
    - path: "/Users/jeet/techcloudpro/public/tcp-analytics/tracker.js"
      provides: "Headless-detection JS (navigator.webdriver / !window.chrome / HeadlessChrome regex) + headless field in payload"
    - path: "/tmp/tcp-analytics-portable.zip"
      provides: "Re-bundled portable kit with SCHEMA.sql is_bot/user_agent + README bot-detection section + sanitized PHP/JS"
    - path: "/Users/jeet/doordash-p2p/.planning/quick/318-tcp-bot-detection-filtering-add-user-age/318-SUMMARY.md"
      provides: "Phase summary with verbatim verification batteries A-I"
  key_links:
    - from: "tracker.js"
      to: "collect.php"
      via: "JSON payload field 'headless: <boolean>'"
      pattern: "headless:.*navigator\\.webdriver"
    - from: "collect.php"
      to: "page_views.is_bot column"
      via: "BOT_UA_REGEX preg_match OR body['headless']===true"
      pattern: "preg_match.*BOT_UA_REGEX|headless.*===.*true"
    - from: "stats.php"
      to: "page_views.is_bot column"
      via: "WHERE pv.is_bot = 0 (or AND is_bot = 0) — stacks with existing is_test = 0"
      pattern: "is_bot\\s*=\\s*0"
    - from: "317-SUMMARY (is_test pattern reference)"
      to: "318 (is_bot pattern mirrors 317)"
      via: "Same probe-then-decide schema migration + same WHERE filter pattern"
    - from: "311-SUMMARY Phase X follow-up #1 (raw user_agent column)"
      to: "318 Task 1 (closes the follow-up by adding the column)"
      via: "ALTER TABLE page_views ADD COLUMN user_agent VARCHAR(500) NULL"
---

<objective>
Add application-layer bot detection + filtering to the TCP analytics stack so the dashboard shows clean human-only counts even with Cloudflare bot-fight disabled (artha needs AI scrolling). Mirrors quick-317 is_test pattern: schema migration → server-side regex + client-side headless signal → stack the new is_bot=0 filter alongside the existing is_test=0 filter in every pageview SQL block in stats.php. After live TCP verification, regenerate the portable zip with the new schema + README section + sanitized code so other sites can drop it in.

Purpose: Cloudflare bot-fight will be turned OFF on TCP because artha.build's AI scrolling needs unhindered access. Without an application-layer filter, organic dashboard counts will inflate by 30-60% (estimated bot traffic from organic feeds, scrapers, monitoring tools, headless crawlers). This task gives TCP a CF-independent defense and ships the same mechanism back into the portable kit.

Output:
- Schema: page_views.{user_agent VARCHAR(500), is_bot TINYINT(1) DEFAULT 0} + idx_is_bot BTREE
- collect.php patched with UA capture + bot detection regex + headless body flag accept
- tracker.js patched with headless JS detection (always fires — independent of fingerprint.js DNT/GPC gating)
- stats.php patched with is_bot=0 filter on every pageview SQL block (executor MUST grep first)
- Portable zip refreshed with new SCHEMA + README section + sanitized files
- 318-SUMMARY.md with verbatim verification batteries A-I
</objective>

<execution_context>
@/Users/jeet/.claude/get-shit-done/workflows/execute-plan.md
@/Users/jeet/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@/Users/jeet/doordash-p2p/CLAUDE.md
@/Users/jeet/doordash-p2p/.planning/STATE.md
@/Users/jeet/doordash-p2p/.planning/quick/305-build-tcp-analytics-stats-php-on-techclo/305-SUMMARY.md
@/Users/jeet/doordash-p2p/.planning/quick/310-phase-3-identity-stack-first-party-brows/310-SUMMARY.md
@/Users/jeet/doordash-p2p/.planning/quick/311-phase-4-identity-stack-behavioral-lead-s/311-SUMMARY.md
@/Users/jeet/doordash-p2p/.planning/quick/315-fix-lead-scoring-recency-inflation-in-st/315-SUMMARY.md
@/Users/jeet/doordash-p2p/.planning/quick/316-refactor-tcp-secrets-out-of-php-source-i/316-SUMMARY.md
@/Users/jeet/doordash-p2p/.planning/quick/317-tcp-push-clean-test-pollution-push-35-co/317-SUMMARY.md
@/Users/jeet/techcloudpro/api/collect.php
@/Users/jeet/techcloudpro/api/stats.php
@/Users/jeet/techcloudpro/public/tcp-analytics/tracker.js
@/Users/jeet/techcloudpro/public/tcp-analytics/fingerprint.js
</context>

<preflight>
Before any code changes, capture pre-fix baseline numbers so post-fix delta is measurable:

```bash
UA="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15"

# Capture pre-fix total_pageviews + unique_sessions for ALL 4 windows
curl -sA "$UA" "https://techcloudpro.com/tcp-analytics/stats.php?s=TcpSecureAdmin2026" \
  | jq '.windows | to_entries | map({window: .key, total_pageviews: .value.total_pageviews, unique_sessions: .value.unique_sessions})' \
  | tee /tmp/318-prefix-counts.json
```

Save the output verbatim — Battery F will compare AFTER counts to this BEFORE snapshot to compute the bot-pollution delta.

If the output shape differs from expectation (e.g. windows missing or fields renamed), STOP and inspect — the surface changed since 317 and the plan needs to be revalidated.
</preflight>

<stop_and_ask_gates>
Four blocking gates that pause execution and surface the issue to the user:

| Gate | Trigger | Action |
|------|---------|--------|
| **λ** | Schema ALTER fails (e.g. `ERROR 1060: Duplicate column name 'is_bot'` from prior partial run) | STOP. Run `DESCRIBE page_views` via probe; report current state; ask whether to skip ALTER (column already exists) or DROP + re-add (destructive) |
| **μ** | stats.php has MORE pageview SQL blocks than the 12 enumerated in Task 2 (e.g. a new block was added in 312/313/314 between 317 and 318) | STOP. List ALL discovered blocks via grep; ask user to confirm which need is_bot=0 filter before patching |
| **ν** | Bot regex catches a real-Safari-mobile UA in test (false positive) — e.g. iOS Safari UA contains "Crawler" or "Mobile/15E148" matches `mobile|crawl` | STOP. Show the false-positive UA + which regex segment matched; ask user to refine regex before deploying |
| **ξ** | Phase 6 re-bundle finds NEW TCP-specific values that weren't there before (e.g. a new domain reference, secret token, or IP literal in the patched files) | STOP. List the leaked tokens; ask user to confirm sanitization replacements before zipping |

All 4 gates MUST be honored. None should trigger in the happy path.
</stop_and_ask_gates>

<tasks>

<task type="auto">
  <name>Task 1: Schema migration + collect.php + tracker.js — server UA capture + bot detection + client headless signal</name>
  <files>
    /Users/jeet/techcloudpro/api/collect.php
    /Users/jeet/techcloudpro/public/tcp-analytics/tracker.js
    (server-side schema) MySQL u350621741_visitors.page_views ALTER ADD user_agent + is_bot + idx_is_bot
  </files>
  <action>
**Phase 1 — SCHEMA migration (probe pattern, mirror 305/307/310/312/316/317):**

Deploy a one-shot schema-migration probe (mirror 310's `_probe-310-fp-schema.php` pattern). Probe contents:

```php
<?php
require_once __DIR__ . '/_secrets.php';
header('Content-Type: application/json');
try {
    $pdo = new PDO('mysql:host=' . TCP_DB_HOST . ';dbname=' . TCP_DB_NAME . ';charset=utf8mb4', TCP_DB_USER, TCP_DB_PASS);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    $log = [];

    // Idempotency check — gate λ trigger if column already exists
    $cols = $pdo->query("DESCRIBE page_views")->fetchAll(PDO::FETCH_ASSOC);
    $names = array_column($cols, 'Field');
    if (in_array('is_bot', $names) || in_array('user_agent', $names)) {
        echo json_encode(['gate_lambda' => true, 'existing_columns' => array_intersect(['is_bot', 'user_agent'], $names), 'columns' => $names], JSON_PRETTY_PRINT);
        exit;
    }

    // Migration
    $pdo->exec("ALTER TABLE page_views
        ADD COLUMN user_agent VARCHAR(500) NULL,
        ADD COLUMN is_bot TINYINT(1) NOT NULL DEFAULT 0,
        ADD INDEX idx_is_bot (is_bot)");
    $log[] = ['step' => 'ALTER TABLE page_views ADD user_agent + is_bot + idx_is_bot', 'result' => 'OK'];

    // Verify
    $cols_after = $pdo->query("DESCRIBE page_views")->fetchAll(PDO::FETCH_ASSOC);
    $idx = $pdo->query("SHOW INDEX FROM page_views WHERE Key_name = 'idx_is_bot'")->fetchAll(PDO::FETCH_ASSOC);
    echo json_encode(['log' => $log, 'columns_after' => $cols_after, 'idx_is_bot' => $idx], JSON_PRETTY_PRINT);
} catch (Exception $e) {
    echo json_encode(['error' => $e->getMessage()]);
}
```

Deploy → curl with Safari UA → save verbatim output → DELETE probe → verify 404. If `gate_lambda=true` is returned, **STOP** at gate λ.

**Phase 2 — collect.php (server-side bot detection):**

Edit `/Users/jeet/techcloudpro/api/collect.php`. Three changes:

1. **Decode JSON body EARLY** (before bot-block exit). The current file has `$raw = file_get_contents('php://input'); $data = json_decode($raw, true);` at line 71-72, AFTER the bot-UA-block exit at line 52-55. We need `$data` available for headless flag check BEFORE the silent-drop. Move the decode block up to just after `if ($_SERVER['REQUEST_METHOD'] !== 'POST') exit` (around current line 18). Note: the bot-UA-list silent-drop at lines 31-55 is the LEGACY soft-block (silently echoes ok and exits without writing). It STAYS — but we add a parallel hard-store path that DOES write to DB with is_bot=1. **Read the file carefully and choose:** keep the legacy silent-drop OR convert it to a write-with-is_bot=1. **Recommendation:** convert it. A bot row with is_bot=1 is more useful than no row, because admin can inspect "what bots came at us" via stats.php with `?include_bots=1` future param. Action: REPLACE the existing `if (!$_is_good_bot && $_is_bot_ua) { echo json_encode(['ok' => true]); exit; }` block at lines 51-55 with a flag set: `$ua_says_bot = (!$_is_good_bot && $_is_bot_ua) ? 1 : 0;` — do NOT exit here.

2. **Add headless body flag check + stronger regex** (after JSON decode):

```php
// Quick task 318 — application-layer bot detection.
// Captures raw UA + computes is_bot flag from (a) UA regex, (b) JS-side headless flag.
// Persists ALL pageviews including bots (with is_bot=1) so admin can inspect bot traffic.
// stats.php filters is_bot=0 in all human-facing aggregates.
$ua_raw = substr((string)($_SERVER['HTTP_USER_AGENT'] ?? ''), 0, 500);
$BOT_UA_REGEX = '/bot|crawl|spider|scrape|headless|phantom|chatgpt|claudebot|claude-web|gptbot|perplexitybot|amazonbot|google(bot| |webcrawler)|bingbot|baidu|yandex|duckduckbot|slackbot|whatsapp|linkedinbot|facebookexternal|twitterbot|skypeuripreview|telegrambot|http_request|curl|wget|python-requests|axios\/|java\/|go-http|okhttp|libwww|nutch|httrack|semrush|ahrefs|majestic|mj12|dataforseo|petalbot|seznambot|applebot|amazon-route53|prerender|pingdom|gtmetrix|webpagetest|uptime/i';
$ua_says_bot = preg_match($BOT_UA_REGEX, $ua_raw) ? 1 : 0;
$body_says_headless = (isset($data['headless']) && $data['headless'] === true) ? 1 : 0;
$is_bot = ($ua_says_bot || $body_says_headless) ? 1 : 0;
```

The regex above SUPERSEDES the legacy `$_bot_ua_list` array — DELETE the legacy array (lines 35-46) since the new regex covers all those cases plus more (axios, java, go-http, prerender, etc.).

Keep the `$_is_good_bot` whitelist (googlebot/bingbot) — but apply it AFTER the bot computation by clearing the flag: `if ($_is_good_bot) $is_bot = 0;`. SEO-critical bots stay un-flagged so admin can still see them in the by_company / by_org lookups.

3. **Extend INSERT into page_views** (around current line 199-214). Add `user_agent` and `is_bot` to both column list and VALUES — bringing the count from 23 → 25 placeholders. Also append `$ua_raw, $is_bot` to the `$stmt->execute([...])` array.

```php
$stmt = $pdo->prepare("
    INSERT INTO page_views
      (session_id, visitor_id, page, referrer, device, browser, country, region, city, org, timezone, ip,
       utm_source, utm_medium, utm_campaign, utm_term, utm_content, scroll_depth, time_on_page,
       device_fingerprint,
       company_name, company_domain, company_type,
       user_agent, is_bot)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
");
$stmt->execute([
    $session_id, $visitor_id, $page, $referrer, $device, $browser,
    $country, $region, $city, $org, $timezone, $ip,
    $utm_source, $utm_medium, $utm_campaign, $utm_term, $utm_content,
    $scroll_depth, $time_on_page,
    $_client_fp,
    $_company['company_name'], $_company['company_domain'], $_company['company_type'],
    $ua_raw, $is_bot
]);
```

**Phase 3 — tracker.js (client-side headless detection):**

Edit `/Users/jeet/techcloudpro/public/tcp-analytics/tracker.js`. ONE addition:

After `var pvData=Object.assign({...},utms());` block (current line 51), insert:

```js
  // Quick task 318 — headless-browser detection. Fires regardless of DNT/GPC
  // (this is anti-bot signal, not a fingerprint — privacy-irrelevant).
  // navigator.webdriver: spec-compliant headless flag (Selenium, Playwright set this).
  // !window.chrome: on Chrome-family browsers chrome obj should exist; missing => spoofed UA.
  // HeadlessChrome / PhantomJS in UA: legacy headless tools.
  try {
    pvData.headless = !!(navigator.webdriver
      || /HeadlessChrome|PhantomJS/i.test(navigator.userAgent || '')
      || (/Chrom(e|ium)/.test(navigator.userAgent || '') && !window.chrome));
  } catch (_) { /* never block pageview */ }
```

NOTE the third clause: `!window.chrome` ALONE is wrong (legitimate Safari/Firefox don't have window.chrome). Gate it on UA-claims-Chrome — only flag if UA SAYS chrome but window.chrome is absent (spoofing signal).

**Deploy + atomic commits:**

```bash
cd /Users/jeet/techcloudpro

# Commit each file atomically (NO -A)
git add api/collect.php
git commit -m "feat(api): bot detection — UA regex + headless body flag + persist user_agent/is_bot to page_views (quick task 318)"

git add public/tcp-analytics/tracker.js
git commit -m "feat(tcp-analytics): tracker.js sends headless flag (navigator.webdriver/HeadlessChrome) to collect.php (quick task 318)"

# Deploy to Hostinger
SSH="ssh -p 65002 -i ~/.ssh/id_ed25519 u350621741@147.93.101.51"
SCP="scp -P 65002 -i ~/.ssh/id_ed25519"
$SCP api/collect.php u350621741@147.93.101.51:/home/u350621741/domains/techcloudpro.com/public_html/api/collect.php
$SCP public/tcp-analytics/tracker.js u350621741@147.93.101.51:/home/u350621741/domains/techcloudpro.com/public_html/tcp-analytics/tracker.js
```

**Verify Batteries A-E (verbatim curls + DB readback via probe):**

UA="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15"
GOOGLEBOT_UA="Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)"
CURL_UA="curl/8.7.1"
TS=$(date +%s)

**Battery A — Schema:** post-migration probe shows user_agent (varchar 500 YES) + is_bot (tinyint(1) NO MUL DEFAULT 0) + idx_is_bot BTREE in `DESCRIBE page_views`. Probe deleted (404 verified).

**Battery B — Googlebot UA → row stored with is_bot=1 + user_agent verbatim:**
```bash
curl -sA "$GOOGLEBOT_UA" -X POST -H 'Content-Type: application/json' \
  -d "{\"type\":\"pageview\",\"page\":\"/test-318-bot-googlebot-${TS}\",\"session_id\":\"BOT-GB-${TS}\"}" \
  https://techcloudpro.com/tcp-analytics/collect.php
# Expect: {"ok":true}
```
Then probe DB row by session_id and assert `is_bot == 1` AND `user_agent LIKE '%Googlebot%'`. **CRITICAL EDGE CASE:** `googlebot` matches the regex (`google(bot| |webcrawler)`) so is_bot=1, BUT the legacy `$_is_good_bot` whitelist would clear it to 0. **Decision per Phase 2 instructions above: googlebot's `$_is_good_bot=true` → is_bot=0 (we WANT googlebot in dashboards as SEO signal).** So the assertion is actually `is_bot == 0` for googlebot. Use a DIFFERENT bot UA for the is_bot=1 test:
```bash
EVIL_BOT="Mozilla/5.0 (compatible; SemrushBot/7~bl; +http://www.semrush.com/bot.html)"
curl -sA "$EVIL_BOT" -X POST ... -d "{\"type\":\"pageview\",\"page\":\"/test-318-bot-semrush-${TS}\",...}" ...
```
Then assert is_bot=1 AND user_agent contains "SemrushBot".

**Battery C — Headless JS payload (`{headless:true}`) with normal Safari UA → is_bot=1:**
```bash
curl -sA "$UA" -X POST -H 'Content-Type: application/json' \
  -d "{\"type\":\"pageview\",\"page\":\"/test-318-headless-${TS}\",\"session_id\":\"HEAD-${TS}\",\"headless\":true}" \
  https://techcloudpro.com/tcp-analytics/collect.php
```
Probe DB by session_id. Assert is_bot=1 AND user_agent matches the Safari UA.

**Battery D — Real Safari UA + headless:false (or absent) → is_bot=0:**
```bash
curl -sA "$UA" -X POST -H 'Content-Type: application/json' \
  -d "{\"type\":\"pageview\",\"page\":\"/test-318-real-safari-${TS}\",\"session_id\":\"REAL-${TS}\",\"headless\":false}" \
  https://techcloudpro.com/tcp-analytics/collect.php
```
Probe DB. Assert is_bot=0. **Gate ν check:** if a real Safari UA returns is_bot=1, the regex over-matches — STOP and refine.

**Battery E — Default curl/8.x UA → is_bot=1 (defense-in-depth):**
```bash
curl -X POST -H 'Content-Type: application/json' \
  -d "{\"type\":\"pageview\",\"page\":\"/test-318-curl-${TS}\",\"session_id\":\"CURL-${TS}\"}" \
  https://techcloudpro.com/tcp-analytics/collect.php
```
(NO `-A` flag — uses default curl/8.x UA, which Cloudflare WAF MAY 403 — if so, this proves CF is doing some work; in that case use `-A "curl/8.7.1"` explicitly to bypass WAF and still test app-layer detection.) Probe DB. Assert is_bot=1 AND user_agent contains "curl/".

All 4 single-row probes deployed → curl → captured → DELETED + 404 verified per probe.
  </action>
  <verify>
- DESCRIBE page_views shows user_agent VARCHAR(500) YES + is_bot TINYINT(1) NO MUL DEFAULT 0 + idx_is_bot BTREE
- Battery A probe deleted (curl returns 404)
- Battery B (SemrushBot UA) → is_bot=1 in DB
- Battery C (headless:true + Safari UA) → is_bot=1 in DB
- Battery D (Safari UA + headless:false) → is_bot=0 in DB (REGRESSION)
- Battery E (curl/8.7.1 UA) → is_bot=1 in DB
- All 4 row-readback probes deleted (404 verified)
- 2 atomic commits in techcloudpro: collect.php only + tracker.js only (NO -A)
- sha256 of deployed collect.php + tracker.js matches local
  </verify>
  <done>
- Schema: page_views has user_agent + is_bot + idx_is_bot
- collect.php captures UA, computes is_bot from regex+headless flag, INSERTs both new columns, googlebot whitelisted to is_bot=0
- tracker.js sends `headless: <boolean>` field in pageview JSON
- Batteries A-E PASS
- Gate ν NOT triggered (real Safari UA → is_bot=0)
  </done>
</task>

<task type="auto">
  <name>Task 2: stats.php — filter is_bot=0 in all 12+ pageview SQL blocks (executor MUST grep first)</name>
  <files>
    /Users/jeet/techcloudpro/api/stats.php
  </files>
  <action>
**MANDATORY FIRST STEP — GREP, don't trust prior summary line refs.** Run on /Users/jeet/techcloudpro/api/stats.php:

```bash
grep -nE 'FROM `?page_views`?|FROM \\$TABLE|JOIN page_views|JOIN \\$TABLE|page_views pv\\b' /Users/jeet/techcloudpro/api/stats.php
```

The plan enumerates 12 expected blocks (see list below). If grep finds MORE blocks, **STOP at gate μ** and surface to user before patching. If grep finds FEWER, also pause — code may have been refactored since 317.

**Expected 12 blocks (current line numbers approximate — re-verify with grep):**

| # | Metric | Approx Line | Pattern |
|---|--------|-------------|---------|
| 1 | total_pageviews | ~88 | `SELECT COUNT(*) FROM \`$TABLE\` WHERE $where` |
| 2 | unique_sessions | ~93 | `SELECT COUNT(DISTINCT \`$SESS_COL\`) FROM \`$TABLE\` WHERE $where ...` |
| 3 | by_page | ~102 | `SELECT \`$PAGE_COL\` ... FROM \`$TABLE\` WHERE $where GROUP BY ...` |
| 4 | by_day | ~118 | `SELECT DATE ... FROM \`$TABLE\` WHERE $where GROUP BY DATE` |
| 5 | by_source (referrer fetch) | ~134 | `SELECT referrer FROM \`$TABLE\` WHERE $where` |
| 6 | by_utm | ~147 | `SELECT ... utm_* FROM \`$TABLE\` WHERE $where AND utm_source ...` |
| 7 | by_org | ~165 | `SELECT TRIM(org) ... FROM \`$TABLE\` WHERE $where AND org ...` |
| 8 | by_company | ~183 | `SELECT TRIM(company_name) ... FROM \`$TABLE\` WHERE $where AND company_domain ...` |
| 9 | by_country | ~200 | `SELECT TRIM(country) ... FROM \`$TABLE\` WHERE $where AND country ...` |
| 10 | identified_visits.pageviews_with_visitor_id | ~218 | `SELECT COUNT(*) FROM \`$TABLE\` WHERE $where AND visitor_id ...` |
| 11 | identified_visits.distinct_identified_people | ~225 | `SELECT COUNT(DISTINCT pv.visitor_id) FROM \`$TABLE\` pv JOIN identified_visitors iv ... WHERE $where AND iv.is_test = 0` |
| 12 | identified_visits.top_visitors | ~235 | `SELECT iv.name ... FROM \`$TABLE\` pv JOIN identified_visitors iv ... WHERE $where AND iv.is_test = 0 GROUP BY iv.id` |
| 13 | fingerprint_only_identified | ~259 | `SELECT COUNT(DISTINCT pv.visitor_id) FROM \`$TABLE\` pv LEFT JOIN identified_visitors iv ... WHERE $where AND pv.device_fingerprint ...` |
| 14 | hot_leads (LEFT JOIN page_views) | ~314 | `SELECT iv.id ... FROM identified_visitors iv LEFT JOIN page_views pv ON pv.visitor_id = iv.visitor_id WHERE iv.is_test = 0 ...` |

**Filter pattern — mirrors quick-317:**

For each block, ADD `pv.is_bot = 0` (or `is_bot = 0` if no alias). Both filters must STACK — the existing `iv.is_test = 0` filter from quick-317 STAYS UNCHANGED.

Edit examples:

**Block 1 (total_pageviews) — add to bare WHERE:**
```php
"SELECT COUNT(*) FROM `$TABLE` WHERE $where AND is_bot = 0"
```

**Block 2 (unique_sessions) — add to existing WHERE chain:**
```php
"SELECT COUNT(DISTINCT `$SESS_COL`)
 FROM `$TABLE`
 WHERE $where
   AND `$SESS_COL` IS NOT NULL
   AND `$SESS_COL` != ''
   AND is_bot = 0"
```

**Blocks 3-9 (by_page, by_day, by_source, by_utm, by_org, by_company, by_country) — same pattern, AND is_bot = 0.**

**Block 10 (pageviews_with_visitor_id) — same pattern.** Note: 317-SUMMARY says this metric is intentionally not is_test-filtered (it's cookie cardinality not named-prospect activity). For is_bot, the user explicitly wants ALL pageview counts filtered. So this block GETS is_bot=0 even though it doesn't get is_test=0. Document the asymmetry inline.

**Block 11 (distinct_identified_people) — has alias `pv`:**
```php
"SELECT COUNT(DISTINCT pv.visitor_id)
 FROM `$TABLE` pv
 JOIN identified_visitors iv ON iv.visitor_id = pv.visitor_id
 WHERE $where
   AND iv.is_test = 0
   AND pv.is_bot = 0"
```

**Block 12 (top_visitors) — has alias `pv`:** same pattern, `AND pv.is_bot = 0`.

**Block 13 (fingerprint_only_identified) — has alias `pv`:**
```php
"... WHERE $where
   AND pv.device_fingerprint IS NOT NULL
   AND pv.device_fingerprint != ''
   AND (iv.email IS NULL OR iv.email = '')
   AND pv.is_bot = 0"
```

**Block 14 (hot_leads) — LEFT JOIN page_views with alias `pv`:** This is the trickiest one. Adding `pv.is_bot = 0` to the WHERE would convert the LEFT JOIN to an effective INNER JOIN (NULLs from un-joined identified_visitors with no pageviews would be filtered out). The proper place is in the `LEFT JOIN page_views pv ON ...` clause:

```php
"FROM identified_visitors iv
 LEFT JOIN page_views pv ON pv.visitor_id = iv.visitor_id
                         AND pv.is_bot = 0       /* quick task 318 — exclude bot pageviews from hot_leads aggregates */
 WHERE iv.is_test = 0
 GROUP BY iv.id ..."
```

This way bot pageviews are EXCLUDED from `COUNT(pv.id)`, `COUNT(DISTINCT pv.page)`, `SUM(pv.time_on_page)`, intent CASEs, but identified visitors with ZERO non-bot pageviews still appear (with pv counts = 0, just like before for visitors with no pageviews at all).

**Add doc-comment block at top of patch** documenting the dual-filter stack:

```php
// Quick task 318 — application-layer bot filter. Stacks with quick-317 is_test filter:
//   WHERE iv.is_test = 0 (synthetic test prospects — flagged at upsert time)
//   AND   pv.is_bot   = 0 (bot pageviews — flagged at collect time via UA regex + headless body flag)
// Both filters MUST be present in every pageview-counting SQL block. Removing either
// re-pollutes the dashboard. is_bot=1 rows are NOT deleted — they're persisted for
// admin inspection via a future ?include_bots=1 stats.php query param.
```

**Atomic commit + deploy:**

```bash
cd /Users/jeet/techcloudpro
git add api/stats.php
git commit -m "feat(api): stats.php filters is_bot=0 in 14 pageview SQL blocks — stacks with is_test filter (quick task 318)"

# Dual-deploy per quick-316 #6 / quick-317 closure
SCP="scp -P 65002 -i ~/.ssh/id_ed25519"
$SCP api/stats.php u350621741@147.93.101.51:/home/u350621741/domains/techcloudpro.com/public_html/api/stats.php
$SCP api/stats.php u350621741@147.93.101.51:/home/u350621741/domains/techcloudpro.com/public_html/tcp-analytics/stats.php
```

**Verify Batteries F-I (verbatim curls):**

UA="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15"

**Battery F — BEFORE/AFTER total_pageviews delta (uses /tmp/318-prefix-counts.json from preflight):**
```bash
# Capture AFTER snapshot
curl -sA "$UA" "https://techcloudpro.com/tcp-analytics/stats.php?s=TcpSecureAdmin2026" \
  | jq '.windows | to_entries | map({window: .key, total_pageviews: .value.total_pageviews, unique_sessions: .value.unique_sessions})' \
  | tee /tmp/318-postfix-counts.json

# Compute delta
paste <(jq -r '.[].total_pageviews' /tmp/318-prefix-counts.json) \
      <(jq -r '.[].total_pageviews' /tmp/318-postfix-counts.json) \
  | awk 'BEGIN{print "BEFORE\tAFTER\tDELTA\tPCT_BOT"} {d=$1-$2; p=($1>0)?(d*100.0/$1):0; printf "%d\t%d\t%d\t%.1f%%\n",$1,$2,d,p}'
```
**Expect:** non-zero positive delta. The 1,724+ legacy rows are is_bot=0 (legacy default) so they don't drop. ONLY new rows with bot UAs going forward will be filtered. So Battery F may show ZERO delta on day 1 — that's expected. Document this.

**Wait, re-think:** The bot UAs flagged in Batteries B+C+E in Task 1 add SOME is_bot=1 rows to the table. The delta will be: existing 1,724 (all is_bot=0) + new bot rows from testing (is_bot=1) + new human rows from testing. Expected delta = exact count of bot test rows added in Task 1. So AFTER total < BEFORE total + new-rows. Document the math.

**Battery G — auth gate stays 404/200:**
```bash
curl -sA "$UA" -o /dev/null -w "%{http_code}\n" "https://techcloudpro.com/tcp-analytics/stats.php"            # 404
curl -sA "$UA" -o /dev/null -w "%{http_code}\n" "https://techcloudpro.com/tcp-analytics/stats.php?s=WRONG"   # 404
curl -sA "$UA" -o /dev/null -w "%{http_code}\n" "https://techcloudpro.com/tcp-analytics/stats.php?s=TcpSecureAdmin2026"  # 200
```

**Battery H — _secrets.php require_once chain still intact:**
```bash
curl -sA "$UA" -o /dev/null -w "%{http_code}\n" "https://techcloudpro.com/api/_secrets.php"            # 403
curl -sA "$UA" -o /dev/null -w "%{http_code}\n" "https://techcloudpro.com/tcp-analytics/_secrets.php"  # 403
curl -sA "$UA" -X POST -H 'Content-Type: application/json' -d '{}' \
     -o /dev/null -w "%{http_code}\n" "https://techcloudpro.com/api/contact.php"  # 400 (validation, NOT 500 — proves require_once chain works after stats.php deploy)
```

**Battery I — is_test filter from quick-317 still works AND both filters stack:**

Submit a real-deliverable contact form first to ensure at least 1 is_test=0 row exists for filter visibility:
```bash
TS=$(date +%s)
curl -sA "$UA" -X POST -H 'Content-Type: application/json' \
  -d "{\"name\":\"Verify 318 Real\",\"email\":\"jeetnair.in+318-real-${TS}@gmail.com\",\"company\":\"Real 318 Co\",\"message\":\"q318 stack-filter verify\"}" \
  https://techcloudpro.com/api/contact.php
```

Then check hot_leads:
```bash
curl -sA "$UA" "https://techcloudpro.com/tcp-analytics/stats.php?s=TcpSecureAdmin2026" \
  | jq '.hot_leads | map({name, email, score})'
```
Assert: contains the new "Verify 318 Real" entry (is_test=0 stack works), does NOT contain any synthetic `@example.com` rows from quick-317 dataset (is_test filter stacked correctly).

Then submit a SYNTHETIC contact form to verify is_test=1 still flagged AND it doesn't appear in filtered hot_leads:
```bash
curl -sA "$UA" -X POST ... -d "{\"name\":\"Verify 318 Synth\",\"email\":\"verify-318-${TS}@example.com\",...}" ...
curl -sA "$UA" "https://techcloudpro.com/tcp-analytics/stats.php?s=TcpSecureAdmin2026" \
  | jq '.hot_leads[] | select(.email | contains("verify-318"))'  # Expect EMPTY
```
  </action>
  <verify>
- grep finds 12-14 pageview SQL blocks (gate μ NOT triggered)
- All 14 blocks have is_bot=0 (or pv.is_bot=0) added — single grep `grep -c "is_bot = 0\|is_bot=0" api/stats.php` should return 13+ (one per block; hot_leads block has it in JOIN ON not WHERE so might be `pv.is_bot = 0`)
- Battery F: BEFORE/AFTER delta computed and documented
- Battery G: 404/404/200 auth gate intact
- Battery H: 403/403/400 secrets gate + contact.php parse intact
- Battery I: real-deliverable hot_lead appears, synthetic does NOT
- 1 atomic commit in techcloudpro: stats.php only (NO -A)
- sha256 of deployed /api/stats.php + /tcp-analytics/stats.php both match local
  </verify>
  <done>
- stats.php filters is_bot=0 in all 14 pageview SQL blocks (12 base + identified_visits.distinct_identified_people + identified_visits.top_visitors)
- Both filters stack: WHERE iv.is_test = 0 AND pv.is_bot = 0
- Auth gate + secrets gate + contact.php all preserved (zero regressions)
- Real-deliverable test (jeetnair.in+318-real-${TS}@gmail.com) shows up in hot_leads
- Synthetic test (@example.com) does NOT show up
- Gate μ NOT triggered (block count matched expectation)
  </done>
</task>

<task type="auto">
  <name>Task 3: Re-bundle portable zip + write 318-SUMMARY + update STATE.md + commit dollor.ai docs</name>
  <files>
    /tmp/tcp-analytics-portable/SCHEMA.sql
    /tmp/tcp-analytics-portable/README.md
    /tmp/tcp-analytics-portable/api/collect.php
    /tmp/tcp-analytics-portable/api/stats.php
    /tmp/tcp-analytics-portable/public/analytics/tracker.js
    /tmp/tcp-analytics-portable.zip
    /Users/jeet/doordash-p2p/.planning/STATE.md
    /Users/jeet/doordash-p2p/.planning/quick/318-tcp-bot-detection-filtering-add-user-age/318-SUMMARY.md
  </files>
  <action>
**Phase 6 — RE-BUNDLE portable zip:**

The portable bundle staging dir is `/tmp/tcp-analytics-portable/` and the existing zip is `/tmp/tcp-analytics-portable.zip` (overwrite). Layout per inspection:

```
/tmp/tcp-analytics-portable/
├── api/
│   ├── _secrets.example.php
│   ├── _visitor.php
│   ├── collect.php
│   ├── contact.php
│   ├── identify-from-email.php
│   └── stats.php
├── docs/
├── public/analytics/
│   ├── dashboard.html
│   ├── fingerprint.js
│   └── tracker.js
├── snippets/
│   ├── form-fill-php-snippet.php
│   └── head-html-snippet.html
├── README.md
└── SCHEMA.sql
```

**Step 1 — Update SCHEMA.sql:**

In the `CREATE TABLE IF NOT EXISTS page_views` block, add the two new columns + index. Find the closest analogue (likely after `device_fingerprint VARCHAR(64)` or the company_* columns) and add:

```sql
  user_agent      VARCHAR(500) NULL,           -- raw UA string (quick task 318)
  is_bot          TINYINT(1)   NOT NULL DEFAULT 0,  -- bot flag from collect.php (quick task 318)
  ...
  KEY idx_is_bot (is_bot),
```

Read the existing SCHEMA.sql first to find the exact position + style match. If schema uses `CREATE TABLE` with idempotent ALTERs at bottom, append two ALTERs:

```sql
-- Quick task 318 — application-layer bot detection columns
ALTER TABLE page_views ADD COLUMN user_agent VARCHAR(500) NULL;
ALTER TABLE page_views ADD COLUMN is_bot TINYINT(1) NOT NULL DEFAULT 0;
ALTER TABLE page_views ADD INDEX idx_is_bot (is_bot);
```

**Step 2 — Update README.md:**

Add a new "## Bot Detection" section. Position it after the existing "## What's in the bundle" table, before "## Setup checklist". Content:

```markdown
## Bot Detection (quick task 318)

The bundle ships with **application-layer bot filtering** so dashboard counts are clean even with Cloudflare bot-fight disabled. Two signals stack:

**1. Server-side UA regex** (`collect.php`). On every pageview POST, the raw `HTTP_USER_AGENT` is captured (truncated to 500 chars) and matched against a regex covering common bot families: `bot|crawl|spider|scrape|headless|phantom|chatgpt|claudebot|gptbot|perplexitybot|bingbot|duckduckbot|semrush|ahrefs|curl|wget|python-requests|axios|java|go-http|okhttp|...`. If matched, `is_bot=1` is written to the row. Googlebot + Bingbot are explicitly **whitelisted** (cleared back to is_bot=0) so SEO crawlers stay visible in the by_company / by_org dashboards.

**2. Client-side headless detection** (`tracker.js`). Independent of any privacy gates (DNT/GPC), tracker.js sends `headless: <boolean>` in the payload computed from `navigator.webdriver` (Selenium/Playwright spec flag) + `HeadlessChrome|PhantomJS` UA regex + Chrome-claimed-but-window.chrome-missing (UA spoofing signal). If true, `collect.php` sets `is_bot=1` regardless of UA regex.

**3. Schema:** `page_views.is_bot TINYINT(1) NOT NULL DEFAULT 0` + `idx_is_bot` BTREE index. Default is 0 so legacy rows (pre-318) stay un-flagged.

**4. Filter:** `stats.php` adds `AND is_bot = 0` (or `pv.is_bot = 0` when aliased) to all 14 pageview SQL blocks. Stacks with the existing `is_test = 0` filter from quick-317. Bot rows are persisted (not deleted) so admins can inspect bot traffic via a future `?include_bots=1` query param.

**Note for Vue/React server-rendered sites:** the `Chrom(e|ium) without window.chrome` clause was carefully gated on UA-claims-Chrome to avoid false positives on legitimate Safari/Firefox (which never have `window.chrome`). If you see false positives on your own infra, the UA regex is the primary signal — you can disable the headless JS by removing the `pvData.headless = ...` line in tracker.js.

**Cloudflare interaction:** if you keep CF bot-fight ON, the two layers double-up (CF blocks at the edge, app-layer flags whatever sneaks through). If you turn CF bot-fight OFF (e.g. for AI scrolling), the app-layer is your only defense — keep it active.
```

**Step 3 — Sanitize the patched files going INTO the bundle.** Copy from techcloudpro then strip TCP-specific values:

```bash
# Copy patched files into staging
cp /Users/jeet/techcloudpro/api/collect.php /tmp/tcp-analytics-portable/api/collect.php
cp /Users/jeet/techcloudpro/api/stats.php /tmp/tcp-analytics-portable/api/stats.php
cp /Users/jeet/techcloudpro/public/tcp-analytics/tracker.js /tmp/tcp-analytics-portable/public/analytics/tracker.js

# Sanitize — replace TCP-specific values with placeholders.
# Pattern set used in prior bundle work (pre-318):
SAN="/tmp/tcp-analytics-portable"

# 1. Auth token TcpSecureAdmin2026 → YOUR_DASHBOARD_TOKEN_HERE
sed -i.bak 's/TcpSecureAdmin2026/YOUR_DASHBOARD_TOKEN_HERE/g' "$SAN/api/stats.php"

# 2. CORS origin techcloudpro.com → YOUR_DOMAIN.example
sed -i.bak 's|https://techcloudpro\.com|https://YOUR_DOMAIN.example|g' "$SAN/api/collect.php" "$SAN/public/analytics/tracker.js"

# 3. _tcp_no_fp localStorage key, _tcp_uid query param, tcp_vid cookie name — these are TCP brand strings.
#    DECISION: leave them as-is. They're the public API contract for any drop-in user — renaming
#    breaks the integration contract documented in README. NOT considered "TCP-specific leak"
#    because they're not secrets, they're identifiers. (Same precedent from prior bundle.)

# 4. /tcp-analytics/ path → /analytics/ (bundle uses /analytics/, TCP uses /tcp-analytics/)
sed -i.bak 's|/tcp-analytics/|/analytics/|g' "$SAN/public/analytics/tracker.js" "$SAN/api/collect.php"

# 5. Hostinger-specific: there shouldn't be any, but verify
grep -E 'u350621741|Thirumala977|32817b8c|techcloudpro\.com|TcpSecureAdmin' "$SAN/api/"*.php "$SAN/public/analytics/"*.js \
  && { echo "GATE ξ TRIGGERED — TCP leaks detected"; exit 1; } || echo "sanitize PASS"

# Cleanup .bak files
find "$SAN" -name '*.bak' -delete
```

**Gate ξ check:** if grep finds ANY of the patterns above (u350621741, Thirumala977!, 32817b8c, techcloudpro.com, TcpSecureAdmin), STOP and surface to user — sanitization regex needs extension before zipping.

**Step 4 — Re-zip:**

```bash
cd /tmp
rm -f tcp-analytics-portable.zip
cd tcp-analytics-portable
zip -r /tmp/tcp-analytics-portable.zip . -x '*.bak' -x '.DS_Store' -x '__MACOSX/*'
ls -la /tmp/tcp-analytics-portable.zip
unzip -l /tmp/tcp-analytics-portable.zip | head -30
```

**Step 5 — Write 318-SUMMARY.md** at `/Users/jeet/doordash-p2p/.planning/quick/318-tcp-bot-detection-filtering-add-user-age/318-SUMMARY.md`. Mirror the structure of 317-SUMMARY.md:
- Frontmatter with `phase`, `plan`, `subsystem: tcp-analytics`, `tags`, dependency-graph (provides + affects), tech-stack patterns, key-files (created + modified), decisions (5+ enumerated decisions), metrics (duration, completed, tasks, files)
- One-liner
- What was built (table per layer)
- Verbatim verification batteries A-I (every curl + DB readback verbatim, including pre-fix BEFORE counts and post-fix AFTER counts with delta math)
- Privacy stance (UA was already sent with every HTTP request; we just persist it now — zero new collection. is_bot column is server-classification field, not surfaced to users.)
- DB tables touched
- Files changed (table)
- Deviations from Plan (Auto-fixed Issues per Rules 1-3, Out-of-scope items deferred, Stop-and-ask gates with all 4 results)
- Phase X follow-ups (e.g. ?include_bots=1 query param, page_views.is_bot retroactive backfill via UA regex SQL, dashboard.html bot toggle, etc.)
- Rollback playbook (3 tiers)
- CR ticket (skipped — TCP precedent)
- Authentication gates (none — Hostinger SSH key)
- Commit hashes (techcloudpro: 3 commits — collect.php, tracker.js, stats.php; dollor.ai: 1 final commit)
- Live URL
- Self-Check checklist with all batteries marked

**Step 6 — Append to STATE.md.** Read tail of STATE.md to find the position, then append a 1-line entry under "Completed Milestones" or "Accumulated Context" matching the pattern of recent 305/310/311/315/316/317 entries:

```
- [Phase quick-318]: TCP bot detection — UA regex + headless body flag + page_views.{user_agent,is_bot} schema + 14 stats.php SQL filters; dual-filter stack (is_test AND is_bot); portable zip refreshed
```

**Step 7 — Commit dollor.ai docs:**

```bash
cd /Users/jeet/doordash-p2p
git add .planning/quick/318-tcp-bot-detection-filtering-add-user-age/318-PLAN.md \
        .planning/quick/318-tcp-bot-detection-filtering-add-user-age/318-SUMMARY.md \
        .planning/STATE.md
git commit -m "$(cat <<'EOF'
docs(quick-318): TCP bot detection — UA regex + headless flag + page_views is_bot column + portable zip refresh

- Phase 1: schema migration page_views.{user_agent VARCHAR(500), is_bot TINYINT(1) DEFAULT 0} + idx_is_bot
- Phase 2: collect.php server-side bot detection regex + headless body flag accept
- Phase 3: tracker.js navigator.webdriver / HeadlessChrome / spoof-detection signal
- Phase 4: stats.php 14 pageview SQL blocks now filter is_bot=0 — stacks with is_test=0 from quick-317
- Phase 5: 9 verification batteries A-I PASS verbatim
- Phase 6: portable zip /tmp/tcp-analytics-portable.zip refreshed with sanitized PHP/JS + SCHEMA + README bot-detection section
- Phase 7: STATE.md updated

Mirrors quick-317 is_test pattern. Cloudflare-independent — works whether CF bot-fight is on or off.
Closes quick-311 Phase X follow-up #1 (raw user_agent column).

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

Per CLAUDE.md push policy, do NOT push unless user asks.
  </action>
  <verify>
- /tmp/tcp-analytics-portable/SCHEMA.sql contains `is_bot TINYINT` AND `idx_is_bot`
- /tmp/tcp-analytics-portable/README.md contains "## Bot Detection"
- /tmp/tcp-analytics-portable/api/collect.php contains BOT_UA_REGEX
- /tmp/tcp-analytics-portable/api/stats.php contains `is_bot = 0` (multiple matches)
- /tmp/tcp-analytics-portable/public/analytics/tracker.js contains `navigator.webdriver`
- /tmp/tcp-analytics-portable.zip exists, ≥10KB, unzip -l shows expected layout
- Sanitize grep returns "sanitize PASS" (no TCP leaks)
- 318-SUMMARY.md exists with full structure
- STATE.md updated
- 1 dollor.ai atomic commit (NOT pushed per CLAUDE.md policy)
  </verify>
  <done>
- Portable zip refreshed at /tmp/tcp-analytics-portable.zip with all 318 changes
- SCHEMA.sql + README.md updated
- Sanitized PHP/JS — gate ξ NOT triggered
- 318-SUMMARY.md committed to dollor.ai
- STATE.md reflects quick-318 completion
  </done>
</task>

</tasks>

<verification>
Phase-level overall checks (executed by execute-phase wrapper):

1. All 9 verification batteries A-I PASS (recorded verbatim in 318-SUMMARY.md)
2. None of the 4 stop-and-ask gates (λ/μ/ν/ξ) triggered (or if any DID, user resolution recorded in deviations section)
3. 3 atomic commits in techcloudpro: `feat(api): bot detection ... collect.php`, `feat(tcp-analytics): tracker.js ...`, `feat(api): stats.php filters is_bot=0 ...`
4. 1 atomic commit in dollor.ai: `docs(quick-318): ...`
5. Schema migration probe deleted from server (404 verified)
6. All 4 row-readback probes from Battery B/C/D/E deleted (404 verified)
7. /tmp/tcp-analytics-portable.zip exists and contains sanitized 318 changes
8. Real-deliverable test inbox `jeetnair.in+318-real-${TS}@gmail.com` (per CLAUDE.md memory rule — never fabricate domains)
9. Pre-fix and post-fix total_pageviews snapshots both saved (/tmp/318-prefix-counts.json + /tmp/318-postfix-counts.json)
</verification>

<success_criteria>
- [ ] page_views schema has user_agent + is_bot + idx_is_bot
- [ ] collect.php captures UA, computes is_bot from regex+headless, INSERTs both columns
- [ ] tracker.js sends `headless` field in pageview JSON
- [ ] stats.php filters is_bot=0 in 14 pageview SQL blocks (gate μ honored)
- [ ] Both filters stack: `iv.is_test = 0 AND pv.is_bot = 0` (and `is_bot = 0` for un-aliased blocks)
- [ ] Battery A: schema migration successful + probe deleted
- [ ] Battery B: SemrushBot UA → is_bot=1 in DB
- [ ] Battery C: headless:true + Safari UA → is_bot=1 in DB
- [ ] Battery D: Safari UA + headless:false → is_bot=0 in DB (regression preserved — gate ν NOT triggered)
- [ ] Battery E: curl/8.7.1 UA → is_bot=1 in DB (defense-in-depth)
- [ ] Battery F: BEFORE/AFTER total_pageviews delta documented (math reconciles to bot test rows added in T1)
- [ ] Battery G: stats.php auth gate 404/404/200 intact
- [ ] Battery H: _secrets.php 403 in /api/ AND /tcp-analytics/, contact.php empty POST returns 400 (not 500)
- [ ] Battery I: real-deliverable hot_lead present, synthetic absent (is_test stack works)
- [ ] All 4 stop-and-ask gates (λ/μ/ν/ξ) honored — none triggered (or resolved if triggered)
- [ ] 3 techcloudpro atomic commits + 1 dollor.ai commit
- [ ] /tmp/tcp-analytics-portable.zip refreshed with sanitized 318 changes
- [ ] /tmp/tcp-analytics-portable/SCHEMA.sql has is_bot + idx_is_bot
- [ ] /tmp/tcp-analytics-portable/README.md has "## Bot Detection" section
- [ ] Sanitize grep returns "sanitize PASS" (zero TCP leaks)
- [ ] 318-SUMMARY.md created with verbatim batteries A-I + Phase X follow-ups + rollback playbook
- [ ] STATE.md updated
- [ ] No probes left on server (all 5 _probe-318-*.php return 404)
- [ ] Real-deliverable test inbox used (jeetnair.in+318-real-${TS}@gmail.com per CLAUDE.md memory rule)
</success_criteria>

<output>
After completion, create `/Users/jeet/doordash-p2p/.planning/quick/318-tcp-bot-detection-filtering-add-user-age/318-SUMMARY.md` with full structure mirroring 317-SUMMARY.md.
</output>
