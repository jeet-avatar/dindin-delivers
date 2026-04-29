---
phase: 319-expand-ai-crawler-whitelist-in-collect-p
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - /Users/jeet/techcloudpro/api/collect.php
  - /tmp/tcp-analytics-portable/api/collect.php
  - /tmp/tcp-analytics-portable/README.md
  - /tmp/tcp-analytics-portable.zip
  - /Users/jeet/doordash-p2p/.planning/quick/319-expand-ai-crawler-whitelist-in-collect-p/319-SUMMARY.md
  - /Users/jeet/doordash-p2p/.planning/STATE.md
autonomous: true
requirements:
  - REQ-AEO-VISIBILITY-01
  - REQ-AEO-VISIBILITY-02
  - REQ-AEO-VISIBILITY-03

must_haves:
  truths:
    - "ChatGPT-User UA POST to /tcp-analytics/collect.php lands in page_views with is_bot=0"
    - "GPTBot, ClaudeBot, Claude-Web, PerplexityBot, Perplexity-User, Applebot, Amazonbot, DuckDuckBot all land is_bot=0"
    - "Googlebot + Bingbot regression — both still land is_bot=0 (no whitelist breakage)"
    - "Adversarial scrapers (SemrushBot, AhrefsBot, curl, python-requests, HeadlessChrome, SemrushBot-BA) all still land is_bot=1"
    - "Real Safari UA (no bot keyword) still lands is_bot=0 (no false positive regression)"
    - "Both deploy targets in sync — sha256(api/collect.php) == sha256(tcp-analytics/collect.php) on Hostinger"
    - "Portable bundle README.md lists expanded whitelist; zip rebuilt with new collect.php"
    - "All probe scripts deleted post-verification (404 confirmed)"
  artifacts:
    - path: "/Users/jeet/techcloudpro/api/collect.php"
      provides: "Expanded $_is_good_bot regex covering 15 AI/search crawler families"
      contains: "preg_match.*googlebot.*bingbot.*gptbot.*chatgpt-user.*claudebot.*claude-web.*perplexitybot.*perplexity-user.*applebot.*amazonbot.*duckduckbot.*mistralai-user.*cohere-ai.*mojeekbot.*kagibot"
    - path: "/tmp/tcp-analytics-portable/api/collect.php"
      provides: "Mirrored expanded whitelist in portable bundle"
      contains: "perplexitybot"
    - path: "/tmp/tcp-analytics-portable/README.md"
      provides: "Updated Bot Detection section listing expanded AI crawler whitelist"
      contains: "ChatGPT"
    - path: "/tmp/tcp-analytics-portable.zip"
      provides: "Rebuilt drop-in zip with expanded whitelist"
    - path: "/Users/jeet/doordash-p2p/.planning/quick/319-expand-ai-crawler-whitelist-in-collect-p/319-SUMMARY.md"
      provides: "Verbatim 18-UA verification battery + sha256 deploy proof + commit hashes"
  key_links:
    - from: "collect.php $_is_good_bot regex"
      to: "$is_bot=0 line 78 clear"
      via: "if ($_is_good_bot) $is_bot = 0;"
      pattern: "_is_good_bot.*is_bot = 0"
    - from: "Local /Users/jeet/techcloudpro/api/collect.php"
      to: "Hostinger /api/collect.php AND /tcp-analytics/collect.php"
      via: "scp dual-deploy + sha256 verify"
      pattern: "sha256sum.*collect.php"
    - from: "Updated local collect.php"
      to: "/tmp/tcp-analytics-portable/api/collect.php (sanitized copy)"
      via: "cp + sed sanitize + re-zip"
      pattern: "tcp-analytics-portable.zip"
---

<objective>
Expand the SEO/AI crawler whitelist in `collect.php` from 2 bots (Googlebot, Bingbot) to 15 bots covering all major AEO/GEO ranking surfaces (ChatGPT, Claude, Perplexity, Apple Intelligence, Amazon Q, DuckDuckGo, Mistral, Cohere, Mojeek, Kagi). Goal: AI crawlers stop being silently filtered out of dashboard analytics so AEO ranking visibility becomes measurable.

Purpose: The post-quick-318 stack persists ALL pageviews including bots, but `stats.php` filters `is_bot = 0` in 14 SQL blocks. Currently every AI crawler hits the BOT_UA_REGEX on line 39 (catches `chatgpt|claudebot|claude-web|gptbot|perplexitybot|amazonbot|applebot|...`) → stored as is_bot=1 → invisible in dashboard. Expanding the whitelist on line 43 inverts that for the 15 search-engine-class bots while keeping adversarial scrapers (Semrush, Ahrefs, curl, headless) filtered.

Output:
- Single-line edit in `/Users/jeet/techcloudpro/api/collect.php` (replace strpos chain with preg_match regex of 15 bots) + 20-line comment block above it
- Mirrored update in portable bundle at `/tmp/tcp-analytics-portable/api/collect.php` + README + re-zip
- Dual-deploy to Hostinger `/api/collect.php` AND `/tcp-analytics/collect.php` with sha256 match verify
- 18-UA live verification battery (11 should land is_bot=0, 6 scrapers stay is_bot=1, 1 real Safari stays is_bot=0)
- 1 atomic commit in techcloudpro + 1 commit in dollor.ai

NO schema changes. NO new data collected. Privacy stance unchanged from quick-318.
</objective>

<execution_context>
@/Users/jeet/.claude/get-shit-done/workflows/execute-plan.md
@/Users/jeet/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@/Users/jeet/doordash-p2p/CLAUDE.md
@/Users/jeet/doordash-p2p/.planning/STATE.md
@/Users/jeet/doordash-p2p/.planning/quick/318-tcp-bot-detection-filtering-add-user-age/318-SUMMARY.md
@/Users/jeet/techcloudpro/api/collect.php

# Reference structures (for sanitize patterns + dual-deploy command precedent):
# - sanitize regex: u350621741|Thirumala977|32817b8c|TcpSecureAdmin2026|techcloudpro\.com  (must return empty after sanitize)
# - dual-deploy paths: /home/u350621741/domains/techcloudpro.com/public_html/api/  AND  /home/u350621741/domains/techcloudpro.com/public_html/tcp-analytics/
# - Hostinger SSH: -P 65002 -i ~/.ssh/id_ed25519 u350621741@147.93.101.51
# - Stats endpoint (auth-gated, for cross-check): https://techcloudpro.com/tcp-analytics/stats.php?s=TcpSecureAdmin2026
</context>

<tasks>

<task type="auto">
  <name>Task 1: Expand whitelist regex in collect.php + dual-deploy + 18-UA verification battery + portable bundle re-zip</name>
  <files>
    /Users/jeet/techcloudpro/api/collect.php
    /tmp/tcp-analytics-portable/api/collect.php
    /tmp/tcp-analytics-portable/README.md
    /tmp/tcp-analytics-portable.zip
  </files>
  <action>
**Phase 1 — Pre-flight inspect (STOP-and-ASK gate ο):**

1. Read `/Users/jeet/techcloudpro/api/collect.php` lines 35-50 to confirm the current state matches expectation:
   - Line 39 should have `$BOT_UA_REGEX = '/...chatgpt|claudebot|claude-web|gptbot|perplexitybot|amazonbot|...applebot|.../i';`
   - Line 43 should have: `$_is_good_bot = (strpos($_bot_ua, 'googlebot') !== false || strpos($_bot_ua, 'bingbot') !== false);`
   - Line 78 should have: `if ($_is_good_bot) $is_bot = 0;`
2. **GATE ο — STOP if line 43 does NOT match the strpos chain.** This means collect.php has been refactored since quick-318; the whitelist may now live elsewhere. Surface the discrepancy to the user before proceeding. Do NOT guess — the line drift is the gate trigger.
3. Capture pre-deploy sha256 of local + both Hostinger paths for a clean before/after pair:
   ```bash
   shasum -a 256 /Users/jeet/techcloudpro/api/collect.php
   ssh -p 65002 -i ~/.ssh/id_ed25519 u350621741@147.93.101.51 \
     "sha256sum /home/u350621741/domains/techcloudpro.com/public_html/api/collect.php \
                /home/u350621741/domains/techcloudpro.com/public_html/tcp-analytics/collect.php"
   ```
   All three should match (post-quick-318 = `0c069237...`). If they diverge, STOP — there's drift.

**Phase 2 — Edit `/Users/jeet/techcloudpro/api/collect.php`:**

Replace line 43 ONLY (single line — Edit tool, do NOT touch line 39 BOT_UA_REGEX or anything else) with this multi-line block (20 lines comment + 4 lines code = ~24 lines total):

```php
// Quick task 319 — expanded AI/search crawler whitelist for AEO/GEO visibility.
// These bots are cleared back to is_bot=0 so they show up in dashboard analytics
// (by_company, by_org, hot_leads, total_pageviews). Bot crawl access itself is
// unchanged — this filter is analytics-only, NOT access control.
//
// Whitelisted (15 bot families):
//   googlebot       — Google Search index + Google AI Overviews
//   bingbot         — Bing Search + Microsoft Copilot
//   gptbot          — OpenAI training crawler
//   chatgpt-user    — ChatGPT live browsing (cites pages in answers)
//   claudebot       — Anthropic training crawler
//   claude-web      — Claude live browsing
//   perplexitybot   — Perplexity training crawler
//   perplexity-user — Perplexity live citation crawler
//   applebot        — Apple Intelligence + Spotlight + Safari Smart Search
//   amazonbot       — Amazon Q + Alexa
//   duckduckbot     — DuckDuckGo + DuckDuckGo Assist
//   mistralai-user  — Mistral citation crawler
//   cohere-ai       — Cohere RAG retrieval
//   mojeekbot       — Mojeek (independent search index)
//   kagibot         — Kagi search
//
// NOT whitelisted (intentional — stay is_bot=1):
//   - Adversarial SEO scrapers: semrush, ahrefs, mj12, dataforseo, petalbot
//   - Generic crawl tooling: curl, wget, python-requests, axios, java, go-http
//   - Headless: phantomjs, headlesschrome, selenium-driven UAs (caught by body flag)
//   - yandex / baidu — relevant for RU/CN markets but TCP doesn't target those today
//   - 'you' / 'ya-bot' — substring too short → would false-positive on real Safari UAs
//     containing the literal token "you" anywhere. SKIPPED for FP safety.
$_is_good_bot = (bool) preg_match(
    '/googlebot|bingbot|gptbot|chatgpt-user|claudebot|claude-web|perplexitybot|perplexity-user|applebot|amazonbot|duckduckbot|mistralai-user|cohere-ai|mojeekbot|kagibot/i',
    $_bot_ua
);
```

After edit, verify with grep:
```bash
grep -n '_is_good_bot' /Users/jeet/techcloudpro/api/collect.php
# Expected: 1 line with `(bool) preg_match` (not strpos), 1 line with `if ($_is_good_bot) $is_bot = 0;` (line 78ish, unchanged)
grep -c 'perplexitybot' /Users/jeet/techcloudpro/api/collect.php
# Expected: 2 — once in code, once in comment
```

**Phase 3 — Atomic commit in techcloudpro:**

```bash
cd /Users/jeet/techcloudpro
git status --short            # MUST show only api/collect.php modified
git diff api/collect.php      # spot-check the diff is whitelist-only
git add api/collect.php       # NEVER `git add -A` — atomic per-file commit
git commit -m "feat(api): expand AI/search crawler whitelist in collect.php — 15 bot families clear is_bot=0 for AEO/GEO visibility (quick task 319)"
```

DO NOT push. User policy: only push when explicitly asked.

**Phase 4 — Dual-deploy to Hostinger:**

```bash
scp -P 65002 -i ~/.ssh/id_ed25519 \
  /Users/jeet/techcloudpro/api/collect.php \
  u350621741@147.93.101.51:/home/u350621741/domains/techcloudpro.com/public_html/api/collect.php

scp -P 65002 -i ~/.ssh/id_ed25519 \
  /Users/jeet/techcloudpro/api/collect.php \
  u350621741@147.93.101.51:/home/u350621741/domains/techcloudpro.com/public_html/tcp-analytics/collect.php
```

Verify sha256 sync:
```bash
LOCAL_SHA=$(shasum -a 256 /Users/jeet/techcloudpro/api/collect.php | awk '{print $1}')
ssh -p 65002 -i ~/.ssh/id_ed25519 u350621741@147.93.101.51 \
  "sha256sum /home/u350621741/domains/techcloudpro.com/public_html/api/collect.php \
             /home/u350621741/domains/techcloudpro.com/public_html/tcp-analytics/collect.php"
# Both server hashes MUST equal $LOCAL_SHA
```

If hashes differ → STOP, scp failed silently → re-run + re-verify before going to Phase 5.

**Phase 5 — Deploy probe script (mirrors 305/307/310/312/316/317/318 pattern):**

Write `/tmp/_probe-319-row.php` (LOCAL TEMP) — token-gated row inspector:

```php
<?php
require_once __DIR__ . '/_secrets.php';
header('Content-Type: application/json');

// Token gate (mirrors stats.php auth pattern)
$expected = 'TcpSecureAdmin2026';
$got = $_GET['s'] ?? '';
if (!hash_equals($expected, $got)) {
    http_response_code(404);
    echo json_encode(['error' => 'not_found']);
    exit;
}

$sid = $_GET['sid'] ?? '';
if (!preg_match('/^[A-Za-z0-9_-]+$/', $sid) || strlen($sid) > 100) {
    http_response_code(400);
    echo json_encode(['error' => 'invalid_sid']);
    exit;
}

$pdo = new PDO("mysql:host=" . TCP_DB_HOST . ";dbname=" . TCP_DB_NAME . ";charset=utf8mb4",
               TCP_DB_USER, TCP_DB_PASS,
               [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]);
$stmt = $pdo->prepare("SELECT id, page, session_id, user_agent, is_bot, created_at
                         FROM page_views WHERE session_id = ? ORDER BY id DESC LIMIT 5");
$stmt->execute([$sid]);
echo json_encode(['rows' => $stmt->fetchAll(PDO::FETCH_ASSOC)], JSON_PRETTY_PRINT);
```

scp it:
```bash
scp -P 65002 -i ~/.ssh/id_ed25519 /tmp/_probe-319-row.php \
  u350621741@147.93.101.51:/home/u350621741/domains/techcloudpro.com/public_html/api/_probe-319-row.php
```

Smoke-test the probe gate (no token = 404, valid sid = 200 with empty rows):
```bash
UA="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15"
curl -sA "$UA" -o /dev/null -w "no_token=%{http_code}\n" "https://techcloudpro.com/api/_probe-319-row.php?sid=TEST"
# Expect: 404
curl -sA "$UA" "https://techcloudpro.com/api/_probe-319-row.php?s=TcpSecureAdmin2026&sid=NONEXIST" | head -3
# Expect: {"rows":[]}
```

**Phase 6 — 18-UA verification battery:**

For each UA below, generate a unique session_id (`UA-shortname-$(date +%s)`), POST a pageview to `https://techcloudpro.com/tcp-analytics/collect.php` with that UA, then probe via `_probe-319-row.php?s=TcpSecureAdmin2026&sid=...` and assert is_bot value.

**Use a single bash loop to run all 18.** Save raw output to `/tmp/319-battery-results.json` for verbatim inclusion in SUMMARY.

```bash
TS=$(date +%s)
ADMIN_UA="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 Safari/605.1.15"
TOKEN="TcpSecureAdmin2026"
RESULTS=()

declare -a TESTS=(
  # name|UA|expected_is_bot
  "GOOGLEBOT|Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)|0"
  "BINGBOT|Mozilla/5.0 (compatible; bingbot/2.0; +http://www.bing.com/bingbot.htm)|0"
  "GPTBOT|Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko; compatible; GPTBot/1.2; +https://openai.com/gptbot)|0"
  "CHATGPTUSER|Mozilla/5.0 AppleWebKit/605.1.15 (compatible; ChatGPT-User/1.0; +https://openai.com/bot)|0"
  "CLAUDEBOT|Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko; compatible; ClaudeBot/1.0; +claudebot@anthropic.com)|0"
  "CLAUDEWEB|Claude-Web/1.0|0"
  "PERPLEXITYBOT|Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko; compatible; PerplexityBot/1.0; +https://perplexity.ai/perplexitybot)|0"
  "PERPLEXITYUSER|Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko; compatible; Perplexity-User/1.0; +https://perplexity.ai/perplexity-user)|0"
  "APPLEBOT|Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_5) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/13.1.1 Safari/605.1.15 (Applebot/0.1; +http://www.apple.com/go/applebot)|0"
  "AMAZONBOT|Mozilla/5.0 (compatible; Amazonbot/0.1; +https://developer.amazon.com/support/amazonbot)|0"
  "DUCKDUCKBOT|DuckDuckBot/1.1; (+http://duckduckgo.com/duckduckbot.html)|0"
  "SEMRUSH|Mozilla/5.0 (compatible; SemrushBot/7~bl; +http://www.semrush.com/bot.html)|1"
  "AHREFS|Mozilla/5.0 (compatible; AhrefsBot/7.0; +http://ahrefs.com/robot/)|1"
  "CURL|curl/8.7.1|1"
  "PYREQ|python-requests/2.31.0|1"
  "HEADLESS|Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/119.0.0.0 Safari/537.36|1"
  "SEMRUSHBA|Mozilla/5.0 (compatible; SemrushBot-BA; +http://www.semrush.com/bot.html)|1"
  "SAFARI|Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15|0"
)

PASS=0
FAIL=0
for entry in "${TESTS[@]}"; do
  IFS='|' read -r NAME UA EXPECTED <<< "$entry"
  SID="UA319-${NAME}-${TS}"
  PAGE="/test-319-${NAME}-${TS}"

  # POST pageview
  curl -sA "$UA" -X POST -H 'Content-Type: application/json' \
    -d "{\"type\":\"pageview\",\"page\":\"${PAGE}\",\"session_id\":\"${SID}\"}" \
    https://techcloudpro.com/tcp-analytics/collect.php > /dev/null

  # Probe row
  ROW=$(curl -sA "$ADMIN_UA" "https://techcloudpro.com/api/_probe-319-row.php?s=${TOKEN}&sid=${SID}")
  ACTUAL=$(echo "$ROW" | python3 -c "import json,sys; d=json.load(sys.stdin); print(d['rows'][0]['is_bot']) if d.get('rows') else print('NOROW')")

  if [ "$ACTUAL" = "$EXPECTED" ]; then
    echo "PASS  ${NAME}  expected=${EXPECTED} actual=${ACTUAL}"
    PASS=$((PASS+1))
  else
    echo "FAIL  ${NAME}  expected=${EXPECTED} actual=${ACTUAL}  UA=${UA:0:80}"
    FAIL=$((FAIL+1))
  fi
done | tee /tmp/319-battery-results.txt

echo "----"
echo "Total PASS=${PASS}  FAIL=${FAIL}"
```

**STOP-and-ASK gates inside Phase 6:**
- **GATE π** — Any of the 11 whitelisted UAs returns is_bot=1 → STOP. Regex broken (most likely cause: typo or missing alternation pipe). Fix the regex, re-deploy, re-run battery from scratch.
- **GATE ρ** — Any of the 6 scraper UAs returns is_bot=0 → STOP. False negative leak (most likely cause: a scraper keyword accidentally matched a whitelist token, e.g. if someone added `bot` standalone). Fix and re-run.
- **GATE σ** — Real Safari (test 18) returns is_bot=1 → STOP. False positive on real users — regex anchoring failure.

If FAIL count > 0, investigate before proceeding. Do NOT continue past Phase 6 with any failure.

**Phase 7 — Probe cleanup:**

```bash
ssh -p 65002 -i ~/.ssh/id_ed25519 u350621741@147.93.101.51 \
  "rm -f /home/u350621741/domains/techcloudpro.com/public_html/api/_probe-319-row.php"

# Verify 404
curl -sA "$ADMIN_UA" -o /dev/null -w "%{http_code}\n" \
  "https://techcloudpro.com/api/_probe-319-row.php?s=${TOKEN}&sid=any"
# Expected: 404
```

**Phase 8 — Portable bundle update + re-zip:**

```bash
# 8a. Copy new collect.php into bundle
cp /Users/jeet/techcloudpro/api/collect.php /tmp/tcp-analytics-portable/api/collect.php

# 8b. Sanitize TCP-specific tokens (mirrors quick-318 ξ-gate sanitization)
sed -i.bak \
  -e 's/u350621741_visitors/YOUR_DB_NAME/g' \
  -e 's/techcloudpro\.com/YOUR_DOMAIN.example/g' \
  -e 's/tcp-analytics/analytics/g' \
  /tmp/tcp-analytics-portable/api/collect.php
rm -f /tmp/tcp-analytics-portable/api/collect.php.bak

# 8c. Verify sanitize PASS (must return empty)
grep -E 'u350621741|Thirumala977|32817b8c|TcpSecureAdmin2026|techcloudpro\.com' \
  /tmp/tcp-analytics-portable/api/collect.php
# Expected: no output. If any match → STOP, re-run sanitize.

# 8d. Update README.md "## Bot Detection" section — replace the old whitelist
#     paragraph (which says "Googlebot + Bingbot whitelisted") with the expanded list.
#     Locate via: grep -n '## Bot Detection' /tmp/tcp-analytics-portable/README.md
#     Replace the bullet list under that section with the 15-bot list from the comment block.

# 8e. Re-zip
cd /tmp
rm -f tcp-analytics-portable.zip
zip -r tcp-analytics-portable.zip tcp-analytics-portable -x '*.bak' '*.DS_Store'
ls -la /tmp/tcp-analytics-portable.zip

# 8f. Verify zip contents
unzip -l /tmp/tcp-analytics-portable.zip | grep -E 'collect\.php|README\.md'
# Expected: both listed, sizes reasonable (collect.php ~10K, README ~5-15K)

# 8g. Verify the zipped collect.php has the new whitelist
unzip -p /tmp/tcp-analytics-portable.zip tcp-analytics-portable/api/collect.php | grep -c 'perplexitybot'
# Expected: 2 (once in code, once in comment)
```

**Phase 9 — Final state proof for SUMMARY:**

Save the following verbatim outputs to `/tmp/319-evidence/`:
- `local-sha256.txt` — `shasum -a 256 /Users/jeet/techcloudpro/api/collect.php`
- `server-sha256.txt` — `ssh ... "sha256sum .../api/collect.php .../tcp-analytics/collect.php"` (both should equal local)
- `battery-results.txt` — full output of Phase 6 loop (18 lines + total)
- `probe-cleanup-404.txt` — output of Phase 7 cleanup curl
- `bundle-listing.txt` — `unzip -l /tmp/tcp-analytics-portable.zip`
- `git-log.txt` — `cd /Users/jeet/techcloudpro && git log --oneline -1`

These files are the verbatim evidence for Task 2's SUMMARY.

**Why preg_match (not strpos array) — design note:**
- `strpos` chain is O(n) per haystack and grows linearly per added bot. With 15 bots × ~2 us each = ~30 us added latency.
- `preg_match` with single alternation regex compiles once, single-pass match — O(n) over haystack regardless of alternation count → ~5 us total.
- More importantly: regex stays readable as a single source-of-truth list. Adding bot 16 = add `|newbot` to one string, not a new strpos call.

**Why NOT add yandex/baidu:**
- TCP doesn't target Russian or Chinese markets in 2026. Yandex/Baidu hits are low-ranking-signal noise — keeping them is_bot=1 prevents dashboard pollution.
- If user later expands to those markets, future task adds them by appending `|yandexbot|baiduspider` to the regex.

**Why NOT add 'you' or 'ya-bot':**
- `you` is a 3-character substring. Real Safari UA on certain device strings contains literal "you" (e.g. spelling artifacts). False-positive risk too high.
- `ya-bot` is short and could collide with future legitimate UA tokens. Defensive default = SKIP.
- Documented in the comment block above the regex so future maintainers know it's intentional.
  </action>
  <verify>
- `grep -c 'perplexitybot' /Users/jeet/techcloudpro/api/collect.php` returns 2
- `grep '_is_good_bot.*preg_match' /Users/jeet/techcloudpro/api/collect.php` returns 1 line
- `cd /Users/jeet/techcloudpro && git log --oneline -1` shows the new commit with "319" or "AI/search crawler whitelist" in message
- Hostinger sha256 of `/api/collect.php` AND `/tcp-analytics/collect.php` both match local sha256
- `/tmp/319-battery-results.txt` shows `Total PASS=18 FAIL=0`
- Probe `_probe-319-row.php` returns 404 after cleanup
- `/tmp/tcp-analytics-portable.zip` exists, includes updated collect.php with `perplexitybot` (2 matches)
- Sanitize grep on bundle returns empty (no TCP token leaks)
  </verify>
  <done>
ChatGPT-User, GPTBot, ClaudeBot, Claude-Web, PerplexityBot, Perplexity-User, Applebot, Amazonbot, DuckDuckBot all land is_bot=0 in `page_views` table. Googlebot + Bingbot regression preserved (still is_bot=0). Adversarial scrapers (Semrush, Ahrefs, curl, python-requests, HeadlessChrome, SemrushBot-BA) all stay is_bot=1. Real Safari UA stays is_bot=0. Portable zip rebuilt + sanitized. 1 atomic commit in techcloudpro (NOT pushed). Probe deleted (404 confirmed).
  </done>
</task>

<task type="auto">
  <name>Task 2: Write 319-SUMMARY.md, append STATE.md entry, atomic dollor.ai commit</name>
  <files>
    /Users/jeet/doordash-p2p/.planning/quick/319-expand-ai-crawler-whitelist-in-collect-p/319-SUMMARY.md
    /Users/jeet/doordash-p2p/.planning/STATE.md
  </files>
  <action>
**Phase 1 — Write SUMMARY.md** at `/Users/jeet/doordash-p2p/.planning/quick/319-expand-ai-crawler-whitelist-in-collect-p/319-SUMMARY.md`.

Use the same frontmatter+narrative structure as `318-SUMMARY.md`. Mandatory sections (in order):

1. **Frontmatter** with: phase, plan, subsystem, tags (`tcp, php, hostinger, bot-detection, ai-crawler-whitelist, aeo, geo, portable-bundle`), dependency-graph (requires: 305/310/318-SUMMARY; provides: expanded whitelist; affects: collect.php + bundle), tech-stack (added: none, patterns: regex-instead-of-strpos-chain, sanitize-before-zip), key-files (created: 319-SUMMARY.md; modified: collect.php + bundle artifacts), decisions, metrics.
2. **One-liner** — single sentence: "Expanded `$_is_good_bot` whitelist in collect.php from 2 bots (Googlebot/Bingbot) to 15 bot families covering all major AI/search engines (ChatGPT, Claude, Perplexity, Apple, Amazon, DuckDuckGo, Mistral, Cohere, Mojeek, Kagi) — AEO/GEO crawlers now visible in dashboard analytics. 18-UA verification battery PASS verbatim."
3. **What was built** — table: `Layer | What | Where`. 4 rows minimum: server whitelist, dual-deploy, portable bundle, atomic commit.
4. **Verification — verbatim live evidence** — paste verbatim outputs from `/tmp/319-evidence/*`:
   - Battery A — 11 whitelisted UAs (Googlebot, Bingbot, GPTBot, ChatGPT-User, ClaudeBot, Claude-Web, PerplexityBot, Perplexity-User, Applebot, Amazonbot, DuckDuckBot) all is_bot=0
   - Battery B — 6 scrapers (SemrushBot, AhrefsBot, curl, python-requests, HeadlessChrome, SemrushBot-BA) all is_bot=1
   - Battery C — Real Safari is_bot=0 (regression preserved)
   - sha256 sync — local + 2× server all equal
   - Probe cleanup 404
5. **Privacy stance** — single sentence + a "Pre-319 vs Post-319" 2-row table showing zero data-collection delta. (Same UA, same column, same retention. Only the *classification* expanded.)
6. **DB tables touched** — `page_views` INSERT only (+18 test rows, 11 with is_bot=0, 6 with is_bot=1, 1 real Safari with is_bot=0; net 12 visible + 6 filtered). Reversibility: `DELETE FROM page_views WHERE page LIKE '/test-319-%';`
7. **Files changed** — table: Path | Repo | Change | Commit. Includes the 1 techcloudpro commit + bundle artifacts (deploy, not commit) + the dollor.ai commit (added at end of this task).
8. **Deviations from Plan** — auto-fixed issues, architectural changes, out-of-scope items deferred, stop-and-ask gates (ο/π/ρ/σ — note which were triggered). Expected: ο NOT triggered if Phase 1 inspect passed; π/ρ/σ NOT triggered if battery PASSED.
9. **Phase X follow-ups** — pull from prompt:
   - #1: `is_good_bot` column on `page_views` (currently we recompute from regex on read; column would let us cache + index)
   - #2: Dedicated "AI Crawler Activity" dashboard panel (Option B from the conversation)
   - #3: Server-side log shim for non-JS-executing AI bots (GPTBot training, ClaudeBot training crawl don't run JS so tracker.js never fires; we'd need to instrument nginx/apache log → DB)
   - #4: Yandex / Baidu whitelisting if user expands to RU/CN markets
   - #5: Carry-over from 318 #6 — pre-commit hook for sensitive literals (still not implemented)
10. **Rollback playbook (4 tiers)** — same shape as 318 SUMMARY:
    - Tier 1: `git revert <319 commit>` + scp back the strpos chain (under 1 min)
    - Tier 2: Manually revert just line 43 if commit is messy
    - Tier 3: Disable the entire bot filter (toggle stats.php is_bot filter off — same as 318 Tier 1)
    - Tier 4: Drop schema columns (same as 318 Tier 4 — nuclear, don't use)
11. **CR ticket** — Skipped (TCP infrastructure, not dollor.ai admin portal — same precedent as 305-318).
12. **Authentication gates** — None (Hostinger SSH key already installed).
13. **Commit hashes** — table: techcloudpro `<sha>` collect.php; dollor.ai `<sha>` summary + state.
14. **Live URLs** — `https://techcloudpro.com/tcp-analytics/collect.php` (POST only) + stats.php endpoint.
15. **Self-Check** — checkbox list mirroring 318's Self-Check structure (~20 items).

**Phase 2 — Append STATE.md entry:**

Read `/Users/jeet/doordash-p2p/.planning/STATE.md`, find the most recent entry, and append a new entry below it following the same format. Entry should reference:
- Quick task ID: 319
- One-liner: "TCP collect.php — expanded AI/search crawler whitelist from 2 to 15 bots; ChatGPT/Claude/Perplexity now visible in dashboard analytics."
- Files touched: api/collect.php + bundle
- Verification: 18-UA battery PASS, sha256 dual-deploy synced
- Commit refs: techcloudpro <sha>, dollor.ai <sha>
- No regressions: googlebot/bingbot whitelist preserved; scrapers + curl + headless still filtered

**Phase 3 — Atomic dollor.ai commit:**

```bash
cd /Users/jeet/doordash-p2p
git status --short
# Should show:
#   .planning/quick/319-expand-ai-crawler-whitelist-in-collect-p/319-PLAN.md      (planner output, not edited by executor)
#   .planning/quick/319-expand-ai-crawler-whitelist-in-collect-p/319-SUMMARY.md   (new from this task)
#   .planning/STATE.md                                                            (appended)

git add .planning/quick/319-expand-ai-crawler-whitelist-in-collect-p/319-PLAN.md \
        .planning/quick/319-expand-ai-crawler-whitelist-in-collect-p/319-SUMMARY.md \
        .planning/STATE.md
# NEVER `git add -A`

git commit -m "$(cat <<'EOF'
docs(quick-319): TCP AI/search crawler whitelist expansion — 15 bot families clear is_bot=0 for AEO/GEO visibility

ChatGPT-User, GPTBot, ClaudeBot, Claude-Web, PerplexityBot, Perplexity-User,
Applebot, Amazonbot, DuckDuckBot now land is_bot=0 in TCP analytics.
Adversarial scrapers (Semrush/Ahrefs/curl/python-requests/HeadlessChrome) still
filtered. 18-UA verification battery PASS verbatim. Portable zip rebuilt.

techcloudpro commit: <sha-from-task-1>

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

DO NOT push. User policy: only push when explicitly asked.
  </action>
  <verify>
- `/Users/jeet/doordash-p2p/.planning/quick/319-expand-ai-crawler-whitelist-in-collect-p/319-SUMMARY.md` exists
- SUMMARY contains all 15 mandatory sections (frontmatter, one-liner, what built, verification, privacy, DB, files, deviations, Phase X, rollback, CR, auth, commits, URLs, self-check)
- SUMMARY contains verbatim battery output from Phase 6 of Task 1 (`Total PASS=18 FAIL=0`)
- SUMMARY contains both commit shas (techcloudpro + dollor.ai)
- STATE.md tail has new 319 entry
- `cd /Users/jeet/doordash-p2p && git log --oneline -1` shows the new dollor.ai commit
- `cd /Users/jeet/doordash-p2p && git status --short` returns empty (clean tree)
  </verify>
  <done>
SUMMARY.md captures the 18-UA verification battery verbatim. STATE.md updated. dollor.ai has 1 atomic commit (PLAN + SUMMARY + STATE together — single commit so the planning artifacts ship as a unit). Both repos clean (`git status --short` empty in each).
  </done>
</task>

</tasks>

<verification>
End-to-end phase verification (after both tasks complete):

1. **Whitelist works in production** — POST a fresh ChatGPT-User UA → row stored is_bot=0 in `page_views`:
   ```bash
   TS=$(date +%s)
   curl -sA "Mozilla/5.0 AppleWebKit/605.1.15 (compatible; ChatGPT-User/1.0; +https://openai.com/bot)" \
     -X POST -H 'Content-Type: application/json' \
     -d "{\"type\":\"pageview\",\"page\":\"/verify-319-final-${TS}\",\"session_id\":\"FINAL-${TS}\"}" \
     https://techcloudpro.com/tcp-analytics/collect.php
   # Expected: {"ok":true}
   # is_bot value already verified in Phase 6 battery; not re-probed (probe deleted in Phase 7)
   ```

2. **Atomic commit hygiene** — exactly 1 techcloudpro commit + 1 dollor.ai commit, no rogue files:
   ```bash
   cd /Users/jeet/techcloudpro && git log --oneline -1
   cd /Users/jeet/doordash-p2p && git log --oneline -1
   cd /Users/jeet/techcloudpro && git status --short        # empty
   cd /Users/jeet/doordash-p2p && git status --short        # empty
   ```

3. **No regression in stats.php** — auth gate still 404/404/200, dashboard JSON parses cleanly:
   ```bash
   UA="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 Safari/605.1.15"
   curl -sA "$UA" -o /dev/null -w "%{http_code}\n" "https://techcloudpro.com/tcp-analytics/stats.php?s=TcpSecureAdmin2026"
   # Expected: 200
   ```

4. **Bundle ships with new whitelist** — drop-in deployable artifact:
   ```bash
   unzip -p /tmp/tcp-analytics-portable.zip tcp-analytics-portable/api/collect.php | grep -c 'perplexitybot'
   # Expected: 2
   ```
</verification>

<success_criteria>
- [ ] `/Users/jeet/techcloudpro/api/collect.php` line 43 area uses `preg_match` regex (not strpos chain), covering 15 bot families
- [ ] Comment block above the regex documents all 15 whitelisted bots + the explicit NOT-whitelisted decisions (yandex, baidu, you, ya-bot)
- [ ] Hostinger sha256 of `/api/collect.php` AND `/tcp-analytics/collect.php` both match local sha256
- [ ] 18-UA battery: 11 whitelisted → is_bot=0, 6 scrapers → is_bot=1, 1 real Safari → is_bot=0 (PASS=18 FAIL=0)
- [ ] Probe `_probe-319-row.php` deleted from server (404 verified)
- [ ] `/tmp/tcp-analytics-portable.zip` rebuilt with sanitized expanded whitelist
- [ ] `/tmp/tcp-analytics-portable/README.md` Bot Detection section lists 15 whitelisted bots
- [ ] 1 atomic commit in techcloudpro (collect.php only, NOT pushed)
- [ ] 1 atomic commit in dollor.ai (PLAN + SUMMARY + STATE together, NOT pushed)
- [ ] STATE.md has new 319 entry
- [ ] SUMMARY.md captures verbatim 18-UA battery output, both sha256 sync proofs, probe-cleanup 404, both commit hashes
- [ ] Stats.php auth gate unchanged (404/404/200)
- [ ] No schema changes (zero ALTER TABLE)
- [ ] Privacy stance unchanged from quick-318 (same UA, same column, same retention — only classification expanded)
</success_criteria>

<output>
After completion, the SUMMARY at `/Users/jeet/doordash-p2p/.planning/quick/319-expand-ai-crawler-whitelist-in-collect-p/319-SUMMARY.md` is the canonical artifact. Both git trees clean, both repos local-only (not pushed). Hostinger live with expanded whitelist. Portable bundle refreshed.
</output>
