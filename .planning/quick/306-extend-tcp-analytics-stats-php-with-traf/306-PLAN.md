---
phase: 306-extend-tcp-analytics-stats-php-with-traf
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - /Users/jeet/techcloudpro/api/stats.php
autonomous: true
requirements:
  - "TCP-306-01: Each of 4 existing windows MUST gain by_source / by_utm / by_org / by_country alongside existing fields"
  - "TCP-306-02: Existing total_pageviews / unique_sessions / by_page / by_day MUST be preserved unchanged"
  - "TCP-306-03: Referrer classification MUST happen in PHP (not SQL) so the buckets are easy to read and extend"
  - "TCP-306-04: Verification curl MUST use Safari/Chrome UA (Cloudflare WAF rule) and MUST paste verbatim parsed by_source + top-10 by_org + by_utm into SUMMARY"
must_haves:
  truths:
    - "GET /tcp-analytics/stats.php?s=TcpSecureAdmin2026 returns HTTP 200 + JSON"
    - "Response.windows.{today,last_7d,last_30d,all_time} each contain by_source AND by_utm AND by_org AND by_country alongside existing total_pageviews / unique_sessions / by_page / by_day"
    - "by_source buckets every page_view's referrer into one of: direct, google, chatgpt, perplexity, bing, duckduckgo, linkedin, facebook, twitter, youtube, reddit, email, other-search, other-referral (sum of all bucket counts == total_pageviews for that window)"
    - "by_org excludes empty/null org strings; by_country excludes empty/null country strings"
    - "Wrong/missing token still returns HTTP 404 with empty body (existing auth behavior preserved)"
  artifacts:
    - path: "/Users/jeet/techcloudpro/api/stats.php"
      provides: "Extended stats endpoint with traffic-source breakdowns"
      contains: "classify_source"
    - path: "/Users/jeet/doordash-p2p/.planning/quick/306-extend-tcp-analytics-stats-php-with-traf/306-SUMMARY.md"
      provides: "Live curl evidence + verbatim by_source / top-10 by_org / by_utm parsed from response"
  key_links:
    - from: "stats.php window loop"
      to: "classify_source($referrer) PHP helper"
      via: "foreach over fetched referrers, increment $by_source[$bucket]"
      pattern: "classify_source"
    - from: "stats.php"
      to: "page_views.org / page_views.country / page_views.utm_*"
      via: "GROUP BY queries with TRIM / NULLIF / LIMIT 30 (org), LIMIT 20 (country), LIMIT 25 (utm)"
      pattern: "GROUP BY.*org|country|utm_source"
---

<objective>
Extend the live `/tcp-analytics/stats.php` JSON endpoint so that each of the 4 existing time windows (today, last_7d, last_30d, all_time) ALSO returns 4 new aggregations: `by_source` (referrer classified into 14 buckets), `by_utm` (top utm_source+medium+campaign tuples), `by_org` (top 30 organizations), `by_country` (top 20 countries). Existing fields stay byte-identical.

Purpose: Today the endpoint answers "how many pageviews?" — after this change it also answers the actual business question "WHO visited and FROM WHERE?" (direct vs ChatGPT vs Google vs LinkedIn, which orgs, which countries, which campaigns).

Output: Updated `stats.php` (single file) deployed to Hostinger + a SUMMARY.md with verbatim curl evidence pasted from the live endpoint.
</objective>

<execution_context>
@/Users/jeet/.claude/get-shit-done/workflows/execute-plan.md
@/Users/jeet/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@/Users/jeet/doordash-p2p/CLAUDE.md
@/Users/jeet/techcloudpro/api/stats.php
@/Users/jeet/doordash-p2p/.planning/quick/305-build-tcp-analytics-stats-php-on-techclo/SCHEMA_PROBE.md
@/Users/jeet/doordash-p2p/.planning/quick/305-build-tcp-analytics-stats-php-on-techclo/305-SUMMARY.md

# Critical context (already verified live in 305 — DO NOT re-probe)
# - Source code lives at /Users/jeet/techcloudpro/api/stats.php (techcloudpro standalone repo, NOT dollor.ai)
# - Server target: /home/u350621741/domains/techcloudpro.com/public_html/tcp-analytics/stats.php on Hostinger
# - Auth gate uses hash_equals('TcpSecureAdmin2026', $_GET['s']) — keep verbatim
# - .htaccess already whitelists 'stats' (fixed in 305) — no .htaccess edit needed
# - Cloudflare WAF blocks default curl UA — verification MUST use a Safari/Chrome UA (-A flag)
# - DB creds (verbatim from chat.php:141-145, already in stats.php): u350621741_visitors / u350621741_jeet977 / Thirumala977!
# - Schema CONFIRMED: page_views has referrer (varchar 500), org (varchar 255 INDEXED), utm_source/medium/campaign (varchar 100, utm_source INDEXED), country (varchar 100), created_at (timestamp INDEXED)
# - Table size: ~1,629 rows — small enough that PHP-side aggregation is fine; SQL-side GROUP BY is also fine. Use whichever is clearer.
</context>

<tasks>

<task type="auto">
  <name>Task 1: Extend stats.php with by_source / by_utm / by_org / by_country aggregations + deploy to Hostinger</name>
  <files>/Users/jeet/techcloudpro/api/stats.php</files>
  <action>
Edit `/Users/jeet/techcloudpro/api/stats.php` (currently 119 lines). DO NOT rewrite from scratch — keep the existing auth gate, PDO connection, $TABLE/$TS_COL/$SESS_COL/$PAGE_COL constants, $windows array, and the existing 4 sub-queries (total_pageviews / unique_sessions / by_page / by_day) byte-identical. Only ADD the 4 new aggregations inside the `foreach ($windows as $name => $where)` loop, before the `$result[$name] = [...]` assignment.

### Step A — Add a `classify_source()` helper near the top of the file

Place this helper as a top-level function ABOVE the `try {` block (after the auth gate exit, before the try). Use lowercased hostname matching with parse_url. PHP code (paste as-is):

```php
/**
 * Classify a referrer URL into a coarse traffic-source bucket.
 * Buckets are intentionally PHP-side (not SQL) so they're easy to read + extend.
 * Empty/null/no-host → "direct". Hostname keyword match → branded bucket.
 * Anything else with a host → "other-referral".
 */
function classify_source(?string $referrer): string {
    if ($referrer === null || trim($referrer) === '') return 'direct';
    $host = parse_url($referrer, PHP_URL_HOST);
    if (!$host) return 'direct';
    $h = strtolower($host);

    // Order matters: longer/more-specific matches first
    if (strpos($h, 'chatgpt.com') !== false || strpos($h, 'chat.openai.com') !== false) return 'chatgpt';
    if (strpos($h, 'perplexity.ai') !== false) return 'perplexity';
    if (strpos($h, 'duckduckgo.com') !== false) return 'duckduckgo';
    if (strpos($h, 'bing.com') !== false) return 'bing';
    if (strpos($h, 'linkedin.com') !== false || strpos($h, 'lnkd.in') !== false) return 'linkedin';
    if (strpos($h, 'facebook.com') !== false || strpos($h, 'fb.com') !== false) return 'facebook';
    if (strpos($h, 'twitter.com') !== false || strpos($h, 't.co') !== false || strpos($h, 'x.com') !== false) return 'twitter';
    if (strpos($h, 'youtube.com') !== false || strpos($h, 'youtu.be') !== false) return 'youtube';
    if (strpos($h, 'reddit.com') !== false) return 'reddit';
    if (strpos($h, 'mail.') !== false || strpos($h, 'outlook.') !== false || strpos($h, 'gmail.') !== false) return 'email';
    if (strpos($h, 'yahoo.') !== false || strpos($h, 'yandex.') !== false || strpos($h, 'baidu.') !== false || strpos($h, 'naver.') !== false || strpos($h, 'ecosia.') !== false) return 'other-search';
    // google. AFTER yahoo etc. — but BEFORE other-referral. NB: 'google.' also catches google.co.uk, google.de, etc.
    if (strpos($h, 'google.') !== false) return 'google';
    return 'other-referral';
}
```

NOTE: `google.` check is placed AFTER the other-search list because `googleusercontent.com` could otherwise mis-bucket (but actually only `google.` with trailing dot matches google.com / google.co.uk etc., so it's safe). Place it right before the final `other-referral` fallback — exactly as written above.

### Step B — Inside the foreach loop, AFTER the existing `by_day` query, ADD these 4 aggregations

Add this block immediately before `$result[$name] = [...]`:

```php
// 5) by_source — bucket referrers in PHP (cheap on 1.6k rows, easy to extend)
$by_source = [];
$ref_stmt = $pdo->query("SELECT referrer FROM `$TABLE` WHERE $where");
while (($ref = $ref_stmt->fetchColumn()) !== false) {
    $bucket = classify_source($ref === null ? null : (string)$ref);
    $by_source[$bucket] = ($by_source[$bucket] ?? 0) + 1;
}
arsort($by_source);
// Convert to ordered list of {source, views} for stable JSON output
$by_source_list = [];
foreach ($by_source as $bucket => $count) {
    $by_source_list[] = ['source' => $bucket, 'views' => (int)$count];
}

// 6) by_utm — top 25 (utm_source, utm_medium, utm_campaign) tuples; skip rows where utm_source is empty
$by_utm = $pdo->query(
    "SELECT
        COALESCE(NULLIF(TRIM(utm_source), ''), '(none)')   AS utm_source,
        COALESCE(NULLIF(TRIM(utm_medium), ''), '(none)')   AS utm_medium,
        COALESCE(NULLIF(TRIM(utm_campaign), ''), '(none)') AS utm_campaign,
        COUNT(*) AS views
     FROM `$TABLE`
     WHERE $where
       AND utm_source IS NOT NULL
       AND TRIM(utm_source) != ''
     GROUP BY utm_source, utm_medium, utm_campaign
     ORDER BY views DESC
     LIMIT 25"
)->fetchAll(PDO::FETCH_ASSOC);
foreach ($by_utm as &$row) { $row['views'] = (int)$row['views']; }
unset($row);

// 7) by_org — top 30; trim + drop empties so 'Unknown' / '' don't pollute the list
$by_org = $pdo->query(
    "SELECT TRIM(org) AS org, COUNT(*) AS views
     FROM `$TABLE`
     WHERE $where
       AND org IS NOT NULL
       AND TRIM(org) != ''
     GROUP BY TRIM(org)
     ORDER BY views DESC
     LIMIT 30"
)->fetchAll(PDO::FETCH_ASSOC);
foreach ($by_org as &$row) { $row['views'] = (int)$row['views']; }
unset($row);

// 8) by_country — top 20; trim + drop empties
$by_country = $pdo->query(
    "SELECT TRIM(country) AS country, COUNT(*) AS views
     FROM `$TABLE`
     WHERE $where
       AND country IS NOT NULL
       AND TRIM(country) != ''
     GROUP BY TRIM(country)
     ORDER BY views DESC
     LIMIT 20"
)->fetchAll(PDO::FETCH_ASSOC);
foreach ($by_country as &$row) { $row['views'] = (int)$row['views']; }
unset($row);
```

### Step C — Update the `$result[$name]` assignment to include the new fields

Change from:
```php
$result[$name] = [
    'total_pageviews' => $total,
    'unique_sessions' => $unique_sessions,
    'by_page'         => $by_page,
    'by_day'          => $by_day,
];
```
To:
```php
$result[$name] = [
    'total_pageviews' => $total,
    'unique_sessions' => $unique_sessions,
    'by_page'         => $by_page,
    'by_day'          => $by_day,
    'by_source'       => $by_source_list,
    'by_utm'          => $by_utm,
    'by_org'          => $by_org,
    'by_country'      => $by_country,
];
```

### Step D — Local PHP syntax check

```bash
php -l /Users/jeet/techcloudpro/api/stats.php
```
Expect: `No syntax errors detected`. If syntax errors, fix before deploy.

### Step E — Deploy to Hostinger via scp (same path 305 used)

```bash
scp /Users/jeet/techcloudpro/api/stats.php \
    u350621741@techcloudpro.com:/home/u350621741/domains/techcloudpro.com/public_html/tcp-analytics/stats.php
```
SSH key `id_ed25519` was installed in 305 — no password prompt expected. If prompted, abort and ask user.

### Why this approach (not alternatives)

- **PHP-side classification** (vs SQL CASE/REGEXP): the per-task instruction says "encode in PHP, NOT in SQL — easier to read/extend". A future bucket addition is a 1-line PHP edit, not an SQL rewrite.
- **One row-stream query for referrers** (vs `GROUP BY referrer`): the rules need hostname-aware matching, not exact-string GROUP BY. With ~1,629 rows total even on `all_time`, streaming + PHP `parse_url` is microseconds.
- **TRIM + NULLIF + IS NOT NULL** on org/country/utm: filters whitespace-only and NULL rows so the list shows real values only.
- **Top 30 / 20 / 25 limits** match the planning spec verbatim (org=30, country=20, utm=25).
- **Existing fields stay byte-identical**: do NOT touch lines 28-77 of stats.php (the auth gate, PDO line, $TABLE/$TS_COL/etc. constants, and the existing 4 queries). Only ADD between `unset($row);` after by_day and the `$result[$name] =` assignment.
  </action>
  <verify>
After scp succeeds, run these from a non-Hostinger shell:

```bash
UA='Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36'

# 1. Auth still gates: wrong token → 404
curl -sS -o /dev/null -w "%{http_code}\n" -A "$UA" \
  "https://techcloudpro.com/tcp-analytics/stats.php?s=WRONG"
# Expect: 404

# 2. Correct token → 200 + JSON
curl -sS -o /tmp/306-stats.json -w "%{http_code}\n" -A "$UA" \
  "https://techcloudpro.com/tcp-analytics/stats.php?s=TcpSecureAdmin2026"
# Expect: 200

# 3. JSON validates and contains the 4 new keys in every window
python3 -c "
import json, sys
d = json.load(open('/tmp/306-stats.json'))
required_old = {'total_pageviews','unique_sessions','by_page','by_day'}
required_new = {'by_source','by_utm','by_org','by_country'}
for w in ('today','last_7d','last_30d','all_time'):
    keys = set(d['windows'][w].keys())
    missing_old = required_old - keys
    missing_new = required_new - keys
    assert not missing_old, f'{w} missing OLD keys: {missing_old}'
    assert not missing_new, f'{w} missing NEW keys: {missing_new}'
print('OK — all 4 windows have OLD + NEW keys')
print()
print('=== ALL_TIME by_source (verbatim) ===')
for row in d['windows']['all_time']['by_source']:
    print(f\"  {row['source']:20s} {row['views']:>5d}\")
total_in_buckets = sum(r['views'] for r in d['windows']['all_time']['by_source'])
total_pv = d['windows']['all_time']['total_pageviews']
assert total_in_buckets == total_pv, f'bucket sum {total_in_buckets} != total_pageviews {total_pv}'
print(f'  Sum of buckets: {total_in_buckets} == total_pageviews: {total_pv} OK')
print()
print('=== ALL_TIME by_org (top 10) ===')
for row in d['windows']['all_time']['by_org'][:10]:
    print(f\"  {row['org'][:50]:50s} {row['views']:>5d}\")
print()
print('=== ALL_TIME by_utm ===')
for row in d['windows']['all_time']['by_utm']:
    print(f\"  src={row['utm_source']:20s} med={row['utm_medium']:15s} camp={row['utm_campaign']:25s} {row['views']:>5d}\")
print()
print('=== ALL_TIME by_country (top 10) ===')
for row in d['windows']['all_time']['by_country'][:10]:
    print(f\"  {row['country']:30s} {row['views']:>5d}\")
"
```

CRITICAL: **CAPTURE the python3 output verbatim** — it goes into the SUMMARY.md per Task 2.

If the bucket-sum assertion fails, the classify_source helper has a logic bug. Fix and redeploy.
  </verify>
  <done>
- `php -l` reports no syntax errors on local stats.php
- scp to Hostinger succeeds (no password prompt)
- Verification curl with Safari UA returns HTTP 200 with token, HTTP 404 without token
- All 4 windows in JSON contain {total_pageviews, unique_sessions, by_page, by_day, by_source, by_utm, by_org, by_country}
- Sum of by_source.views per window equals total_pageviews of that window (zero hallucination on classification)
- by_org and by_country contain no empty/null entries
  </done>
</task>

<task type="auto">
  <name>Task 2: Commit techcloudpro change + write 306-SUMMARY.md with verbatim live evidence + commit dollor.ai</name>
  <files>
    - /Users/jeet/doordash-p2p/.planning/quick/306-extend-tcp-analytics-stats-php-with-traf/306-SUMMARY.md
  </files>
  <action>
### Step A — Commit + push the techcloudpro change

```bash
cd /Users/jeet/techcloudpro
git add api/stats.php
git status   # verify ONLY api/stats.php is staged
git diff --cached --stat
git commit -m "$(cat <<'EOF'
feat(tcp-analytics): add traffic-source breakdowns to stats.php

Each of the 4 existing time windows (today/last_7d/last_30d/all_time) now
also returns: by_source (referrer bucketed into direct/google/chatgpt/
perplexity/bing/duckduckgo/linkedin/facebook/twitter/youtube/reddit/email/
other-search/other-referral), by_utm (top 25 utm tuples), by_org (top 30),
by_country (top 20).

Existing fields (total_pageviews, unique_sessions, by_page, by_day) are
byte-identical. Referrer classification is PHP-side (helper function) so
buckets are easy to read + extend without touching SQL.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
git push origin main
```

If the working tree has unrelated unstaged files (untracked drafts, etc.), DO NOT add them. Only `api/stats.php` should be in this commit.

### Step B — Write the SUMMARY

Create `/Users/jeet/doordash-p2p/.planning/quick/306-extend-tcp-analytics-stats-php-with-traf/306-SUMMARY.md` with frontmatter + the standard sections. CRITICAL: the "Verification — verbatim curl output" section MUST contain the actual python3 output captured in Task 1's verify step (not paraphrased — paste verbatim).

Required SUMMARY structure (use this exact frontmatter shape, mirror 305-SUMMARY.md style):

```markdown
---
phase: 306-extend-tcp-analytics-stats-php-with-traf
plan: 01
subsystem: tcp-analytics
tags: [tcp, php, analytics, hostinger, traffic-sources]
dependency-graph:
  requires:
    - "305-SUMMARY.md (existing stats.php endpoint + .htaccess whitelist)"
    - "Hostinger MySQL u350621741_visitors (page_views.referrer/org/utm_*/country)"
  provides:
    - "by_source / by_utm / by_org / by_country breakdowns on /tcp-analytics/stats.php"
  affects:
    - "/Users/jeet/techcloudpro/api/stats.php (extended, NOT rewritten)"
tech-stack:
  added: []
  patterns: ["PHP-side classify_source() helper", "TRIM + NULLIF for org/country dedupe"]
key-files:
  modified:
    - "/Users/jeet/techcloudpro/api/stats.php (+~70 lines: classify_source helper + 4 new queries per window)"
  created:
    - "/Users/jeet/doordash-p2p/.planning/quick/306-extend-tcp-analytics-stats-php-with-traf/306-SUMMARY.md"
decisions:
  - "Classify referrers in PHP (not SQL) — easier to read/extend, hostname keyword match needs parse_url not GROUP BY"
  - "Stream all referrers per window (no GROUP BY referrer) — needed for parse_url matching; ~1.6k rows = trivial"
  - "TRIM + NULLIF on org/country/utm_source to drop empty/whitespace-only rows"
  - "by_source emitted as ordered list (not assoc map) for stable JSON output"
  - "Top limits per spec: by_org=30, by_country=20, by_utm=25"
metrics:
  duration: "~10 minutes"
  completed: "2026-04-28T<HH:MM>Z"
---

# Quick Task 306: Extend TCP Analytics stats.php with Traffic-Source Breakdowns

## One-liner

Each of the 4 existing time windows on `/tcp-analytics/stats.php` now ALSO returns by_source / by_utm / by_org / by_country — answering "WHO visited and FROM WHERE?" not just "how many?".

## What was built

Extended `api/stats.php` (was 119 lines → now ~190 lines) by adding a `classify_source()` PHP helper plus 4 new aggregations inside the existing window loop. Existing fields (total_pageviews, unique_sessions, by_page, by_day) are byte-identical.

## Verification — verbatim live evidence

[paste the FULL python3 output from Task 1's verify block here verbatim — the
ALL_TIME by_source list, top-10 by_org, by_utm tuples, top-10 by_country.
Do NOT summarize. The user wants to see the answer to "who visited" directly
in this SUMMARY.]

## Files changed

| File | Repo | Status |
|------|------|--------|
| `api/stats.php` | github.com/jeet-avatar/techcloudpro | extended (+~70 lines) |
| `.planning/quick/306-.../306-SUMMARY.md` | dollor.ai | created (this file) |

## Deviations from Plan

[Use Rule 1/2/3 framework. If none, write "None — plan executed exactly as specified."]

## CR ticket

Skipped — TCP infrastructure (Hostinger), not dollor.ai admin portal.

## Authentication gates

None — Hostinger SSH key `id_ed25519` already installed (305).

## Commit hashes

| Repo | SHA | Description |
|------|-----|-------------|
| `techcloudpro` | <captured from git log> | feat(tcp-analytics): add traffic-source breakdowns |
| `dollor.ai` | <final commit> | docs(quick-306): SUMMARY |

## Live URL

`https://techcloudpro.com/tcp-analytics/stats.php?s=TcpSecureAdmin2026` (browser UA required)

## Self-Check

- [ ] `/Users/jeet/techcloudpro/api/stats.php` modified, contains `classify_source` AND 4 new aggregations per window
- [ ] Server file at `/home/u350621741/domains/techcloudpro.com/public_html/tcp-analytics/stats.php` updated (filesize > 4252 bytes)
- [ ] Curl with Safari UA returns 200 with token, 404 without
- [ ] All 4 windows × 8 keys present in JSON
- [ ] Sum of by_source[].views == total_pageviews per window (asserted in verify script)
- [ ] techcloudpro commit visible in `git log -1 --oneline`
- [ ] dollor.ai commit visible in `git log -1 --oneline`
```

### Step C — Commit dollor.ai SUMMARY

```bash
cd /Users/jeet/doordash-p2p
git add .planning/quick/306-extend-tcp-analytics-stats-php-with-traf/306-SUMMARY.md
git commit -m "$(cat <<'EOF'
docs(quick-306): SUMMARY for tcp-analytics stats.php traffic-source extension

Verbatim live evidence pasted: by_source buckets (chatgpt/google/direct/etc.),
top-10 by_org, by_utm tuples, top-10 by_country pulled from
https://techcloudpro.com/tcp-analytics/stats.php?s=TcpSecureAdmin2026.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

Per CLAUDE.md: do NOT push dollor.ai unless user asks. Pushing techcloudpro is fine (in Step A) because the deploy already happened — the push just keeps the standalone repo's `origin/main` in sync with the live server file.
  </action>
  <verify>
```bash
# techcloudpro commit landed + pushed
cd /Users/jeet/techcloudpro && git log -1 --oneline && git log -1 --stat | head -20
git status   # working tree clean (or unrelated untracked files only)

# dollor.ai SUMMARY committed
cd /Users/jeet/doordash-p2p && git log -1 --oneline
ls -la .planning/quick/306-extend-tcp-analytics-stats-php-with-traf/306-SUMMARY.md

# Verify SUMMARY actually contains real data (not placeholders)
grep -q 'chatgpt\|google\|direct\|perplexity' .planning/quick/306-extend-tcp-analytics-stats-php-with-traf/306-SUMMARY.md && echo "SUMMARY contains real source bucket names" || echo "FAIL — SUMMARY missing real evidence"
grep -q '\[paste' .planning/quick/306-extend-tcp-analytics-stats-php-with-traf/306-SUMMARY.md && echo "FAIL — SUMMARY still has placeholder text" || echo "OK — no placeholder text remaining"
```
  </verify>
  <done>
- techcloudpro commit lands on `origin/main` (push successful)
- dollor.ai 306-SUMMARY.md exists with verbatim curl/python output (not placeholders)
- All Self-Check items in SUMMARY pass
- `grep` confirms SUMMARY contains at least one real bucket name (chatgpt/google/direct/perplexity)
- `grep` confirms SUMMARY contains zero `[paste...]` or `<HH:MM>` placeholders
  </done>
</task>

</tasks>

<verification>
End-to-end: a single curl with Safari UA + correct token returns JSON where every window has 8 keys and bucket sums equal total_pageviews. The SUMMARY.md, when opened, shows the user the actual answer to "who visited my site and from where" without any further investigation needed.
</verification>

<success_criteria>
- `https://techcloudpro.com/tcp-analytics/stats.php?s=TcpSecureAdmin2026` returns HTTP 200 + JSON
- Every window object contains exactly these 8 keys: total_pageviews, unique_sessions, by_page, by_day, by_source, by_utm, by_org, by_country
- For every window, `sum(by_source[i].views) == total_pageviews` (proves classification is exhaustive)
- by_source bucket names are a strict subset of: direct, google, chatgpt, perplexity, bing, duckduckgo, linkedin, facebook, twitter, youtube, reddit, email, other-search, other-referral
- by_org and by_country contain no empty/whitespace-only entries
- 306-SUMMARY.md contains the python3 verification output verbatim — user can read the SUMMARY and immediately see WHO visited and from WHERE
- techcloudpro commit pushed to origin/main; dollor.ai commit local-only (per CLAUDE.md push policy)
</success_criteria>

<output>
After completion, ensure `.planning/quick/306-extend-tcp-analytics-stats-php-with-traf/306-SUMMARY.md` exists with verbatim live evidence and both repos have one new commit each.
</output>
