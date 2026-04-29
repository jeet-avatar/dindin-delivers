---
phase: 311-phase-4-identity-stack-behavioral-lead-s
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - /Users/jeet/techcloudpro/api/stats.php
  - /Users/jeet/techcloudpro/api/_visitor.php
autonomous: true
requirements:
  - "Q311-LEAD-SCORE: hot_leads array surfaced in stats.php as global top-25 by composite engagement score"
  - "Q311-INTENT-CLASS: classify_page_intent() helper buckets URLs into high (5x) / medium (2x) / low (1x)"
  - "Q311-BOT-PENALTY: known-bot user agents penalized -100 (decision: which page_views column to use must be probed BEFORE coding)"
  - "Q311-NO-REGRESSION: existing per-window identified_visits.top_visitors blocks unchanged"
  - "Q311-AUTH-PRESERVED: ?s=TcpSecureAdmin2026 still required; missing/wrong → 404"
  - "Q311-DEPLOY-VERIFIED: Hostinger deploy confirmed via curl + jq, score_breakdown sums correctly, Diego Palmieri appears with non-zero score"

must_haves:
  truths:
    - "stats.php response has a top-level `hot_leads` array (not nested inside windows) sorted by score DESC"
    - "Each hot_lead entry has score_breakdown that sums to score (within 0.01 PHP rounding tolerance)"
    - "Diego Palmieri @ Mizkan America Inc (the Phase 2b real-PII E2E entry) appears in hot_leads with non-zero score"
    - "Existing identified_visits.top_visitors blocks under each of today/last_7d/last_30d/all_time still return same shape — no regression"
    - "Auth gate still returns 404 when ?s param is missing or wrong"
    - "High-intent paths (/contact, /pricing, /tools/, /demo, /book, /schedule, /get-started) score 5x volume"
    - "Medium-intent paths (/products, /services, /case-studies, /clients, /leadership) score 2x volume"
    - "Bot-detection approach is documented in stats.php inline comment AND the executor inspected page_views columns BEFORE choosing"
  artifacts:
    - path: "/Users/jeet/techcloudpro/api/stats.php"
      provides: "hot_leads top-level array; SQL aggregate with intent CASE expressions; PHP score computation + sort + slice top 25"
      contains: "hot_leads"
    - path: "/Users/jeet/techcloudpro/api/_visitor.php"
      provides: "tcp_classify_page_intent($page) helper returning 'high'|'medium'|'low' (extension only — existing functions untouched)"
      contains: "function tcp_classify_page_intent"
    - path: ".planning/quick/311-phase-4-identity-stack-behavioral-lead-s/311-SUMMARY.md"
      provides: "Verbatim curl evidence: hot_leads count, top-3 score_breakdown sums, Diego Palmieri score row, regression check that identified_visits.top_visitors per window unchanged"
      min_lines: 80
  key_links:
    - from: "/Users/jeet/techcloudpro/api/stats.php"
      to: "/Users/jeet/techcloudpro/api/_visitor.php"
      via: "require_once + tcp_classify_page_intent() call (only if helper extracted to _visitor.php — executor may inline if cleaner; document choice)"
      pattern: "tcp_classify_page_intent|CASE WHEN.*pricing"
    - from: "/Users/jeet/techcloudpro/api/stats.php"
      to: "MySQL u350621741_visitors.identified_visitors + .page_views"
      via: "single LEFT JOIN aggregate query with CASE expressions for intent counts"
      pattern: "LEFT JOIN page_views|JOIN page_views pv"
---

<objective>
Add a global top-level `hot_leads` array to TCP analytics stats.php that ranks identified visitors by a composite engagement score (volume + intent-weighted pageviews + time-on-site + recency + diversity − bot penalty). Pure SQL aggregation + PHP scoring on data already collected in Phases 1-3. No new collection, no privacy impact.

Purpose: Phase 4 of the TCP identity stack. Phases 1-3 made visitors identifiable; this phase ranks them so sales follow-up is prioritized by behavioral intent — not just "they came back twice".

Output:
- Patched `/Users/jeet/techcloudpro/api/stats.php` with new `hot_leads` array at top level (sibling of `windows`)
- Patched `/Users/jeet/techcloudpro/api/_visitor.php` with `tcp_classify_page_intent()` helper (or inline in stats.php — executor's call, must be documented)
- Deployed to Hostinger 147.93.101.51 via scp (mirror 305-310 pattern)
- 311-SUMMARY.md with verbatim curl + jq evidence
</objective>

<execution_context>
@/Users/jeet/.claude/get-shit-done/workflows/execute-plan.md
@/Users/jeet/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
# Required reads — anti-hallucination evidence
@/Users/jeet/doordash-p2p/.planning/quick/305-build-tcp-analytics-stats-php-on-techclo/SCHEMA_PROBE.md
@/Users/jeet/doordash-p2p/.planning/quick/307-phase-1-identity-stack-form-fill-identit/IDENTITY_SCHEMA_PROBE.md
@/Users/jeet/doordash-p2p/.planning/quick/310-phase-3-identity-stack-first-party-brows/310-SUMMARY.md

# Files to patch
@/Users/jeet/techcloudpro/api/stats.php
@/Users/jeet/techcloudpro/api/_visitor.php

# Pattern reference — existing PHP-side classifier in stats.php (classify_source) is the model for tcp_classify_page_intent
# Pattern reference — Phase 3 / 310 deploy via scp to Hostinger 147.93.101.51:65002 with key ~/.ssh/id_ed25519, user u350621741
</context>

<tasks>

<task type="auto">
  <name>Task 1: Implement hot_leads scoring + helper + deploy + verify (single atomic task)</name>
  <files>
    /Users/jeet/techcloudpro/api/_visitor.php
    /Users/jeet/techcloudpro/api/stats.php
  </files>
  <action>
**STEP 0 — Confirm bot-detection field BEFORE writing any code.**

Per SCHEMA_PROBE.md (line 28-52), `page_views` HAS a `browser VARCHAR(50)` column populated by tracker.js's UA parsing. There is NO explicit `is_bot` column and NO raw `user_agent` column on page_views.

Inspect the actual rows to decide bot-detection approach:

```bash
ssh -p 65002 -i ~/.ssh/id_ed25519 u350621741@147.93.101.51 \
  "cd /home/u350621741/domains/techcloudpro.com/public_html/tcp-analytics && \
   php -r 'require __DIR__ . \"/../api/_visitor.php\"; \$pdo = tcp_db(); \
   \$rows = \$pdo->query(\"SELECT DISTINCT browser FROM page_views WHERE browser IS NOT NULL AND browser != \\\"\\\" ORDER BY browser\")->fetchAll(PDO::FETCH_COLUMN); \
   echo json_encode(\$rows, JSON_PRETTY_PRINT);'"
```

(If this exact remote-php invocation is fragile, alternative: deploy a one-shot probe `_probe-311-browsers.php` that returns the distinct browser list as JSON, run it, save output, DELETE it — same pattern as 307/310. Either path works; the goal is to KNOW what browser values exist before deciding the bot regex.)

Document the chosen approach in stats.php as an inline comment block at the hot_leads SQL site:
- If `browser` contains values like `"bot"`, `"crawler"`, `"spider"`, `"Googlebot"`, etc. → use a `browser REGEXP 'bot|crawler|spider|headless|curl|wget|python-requests'` predicate in the SQL CASE for bot_penalty.
- If `browser` ONLY contains real browser names (Chrome, Safari, Firefox, Edge) → tracker.js already filters bots OR they're rare. Document this finding and set bot_penalty = 0 in PHP (do NOT silently drop the field — keep the JSON shape stable, just always-zero for now). File a Phase X follow-up note in 311-SUMMARY.md.

Save the distinct-browser-list output verbatim into 311-SUMMARY.md (Battery A) before continuing.

**STEP 1 — Add tcp_classify_page_intent() helper to _visitor.php.**

Append this helper after the existing `tcp_backfill_fingerprint()` function (~line 175 in _visitor.php). Mirror the style of stats.php's existing `classify_source()`.

```php
/**
 * Classify a URL path into a coarse intent bucket for lead scoring (quick task 311).
 * Buckets are PHP-side (not SQL) so they're easy to read + extend.
 * Empty/null → 'low'. Order matters: longer/more-specific prefixes first.
 *
 * @return 'high'|'medium'|'low'
 */
function tcp_classify_page_intent(?string $page): string {
    if ($page === null || $page === '') return 'low';
    $p = strtolower($page);
    // HIGH intent — buying signals
    if (strpos($p, '/contact')      === 0) return 'high';
    if (strpos($p, '/pricing')      === 0) return 'high';
    if (strpos($p, '/tools/')       === 0) return 'high';
    if (strpos($p, '/demo')         === 0) return 'high';
    if (strpos($p, '/book')         === 0) return 'high';
    if (strpos($p, '/schedule')     === 0) return 'high';
    if (strpos($p, '/get-started')  === 0) return 'high';
    // MEDIUM intent — research signals
    if (strpos($p, '/products')     === 0) return 'medium';
    if (strpos($p, '/services')     === 0) return 'medium';
    if (strpos($p, '/case-studies') === 0) return 'medium';
    if (strpos($p, '/clients')      === 0) return 'medium';
    if (strpos($p, '/leadership')   === 0) return 'medium';
    // Everything else (blog, /, etc.)
    return 'low';
}
```

Decision note: keep classification in BOTH places — SQL CASE expressions to compute high_intent_views / medium_intent_views aggregates (cheap, set-based), AND this PHP helper available for future per-row reclassification or other endpoints. The SQL CASE patterns must mirror the PHP helper exactly (same prefixes, same precedence). Document this in stats.php with a comment pointing at tcp_classify_page_intent.

**STEP 2 — Patch stats.php with hot_leads SQL + scoring.**

Insert AFTER the `foreach ($windows as $name => $where)` loop closes (after line 250 `}`) and BEFORE the final `echo json_encode(...)` call (line 252). Do NOT touch any code inside the per-window loop — that preserves the regression-check contract.

Add this block:

```php
        // ── HOT LEADS — Phase 4 / quick task 311 ─────────────────────────────────
        // Global top-25 identified visitors ranked by composite behavioral score.
        // Sibling of `windows` (NOT per-window). Different lens than identified_visits.top_visitors:
        //   identified_visits.top_visitors = sorted by raw pageviews per window
        //   hot_leads                       = sorted by composite score across all_time
        //
        // Score formula:
        //   pageviews * 1
        //   + high_intent_views * 5      (contact, pricing, tools/, demo, book, schedule, get-started)
        //   + medium_intent_views * 2    (products, services, case-studies, clients, leadership)
        //   + min(60, total_seconds / 60.0)   (capped at 60 minutes — bots can't dominate)
        //   + recency_bonus              (+10 if last_seen ≥ NOW()-7d, +3 if ≥ NOW()-30d, else 0)
        //   + (distinct_pages * 0.5)     (diversity)
        //   - bot_penalty                (-100 if browser matches bot regex; see Step 0 finding)
        //
        // Intent prefixes MUST mirror tcp_classify_page_intent() in _visitor.php exactly.
        $hot_rows = $pdo->query(
            "SELECT
                iv.id, iv.visitor_id, iv.email, iv.name, iv.company, iv.source_form,
                iv.first_seen_at, iv.last_seen_at,
                COUNT(pv.id)                                  AS pageviews,
                COUNT(DISTINCT pv.page)                       AS distinct_pages,
                COALESCE(SUM(pv.time_on_page), 0)             AS total_seconds,
                SUM(CASE
                    WHEN pv.page LIKE '/contact%'
                      OR pv.page LIKE '/pricing%'
                      OR pv.page LIKE '/tools/%'
                      OR pv.page LIKE '/demo%'
                      OR pv.page LIKE '/book%'
                      OR pv.page LIKE '/schedule%'
                      OR pv.page LIKE '/get-started%'
                    THEN 1 ELSE 0 END)                        AS high_intent_views,
                SUM(CASE
                    WHEN pv.page LIKE '/products%'
                      OR pv.page LIKE '/services%'
                      OR pv.page LIKE '/case-studies%'
                      OR pv.page LIKE '/clients%'
                      OR pv.page LIKE '/leadership%'
                    THEN 1 ELSE 0 END)                        AS medium_intent_views,
                /* Bot signal — see Step 0 inline note for chosen approach.
                   If page_views.browser values include bot strings, this evaluates to 1.
                   If page_views.browser only holds real browser names, this is always 0. */
                MAX(CASE
                    WHEN pv.browser REGEXP 'bot|crawler|spider|headless|curl|wget|python|scraper'
                    THEN 1 ELSE 0 END)                        AS is_bot,
                TIMESTAMPDIFF(DAY, iv.last_seen_at, NOW())    AS days_since_seen
             FROM identified_visitors iv
             LEFT JOIN page_views pv ON pv.visitor_id = iv.visitor_id
             GROUP BY iv.id
             ORDER BY pageviews DESC
             LIMIT 200"
        )->fetchAll(PDO::FETCH_ASSOC);

        $hot_leads = [];
        foreach ($hot_rows as $r) {
            $pv          = (int)   $r['pageviews'];
            $dp          = (int)   $r['distinct_pages'];
            $secs        = (int)   $r['total_seconds'];
            $hi          = (int)   $r['high_intent_views'];
            $mi          = (int)   $r['medium_intent_views'];
            $is_bot      = (int)   $r['is_bot'] === 1;
            $days        = $r['days_since_seen'] === null ? null : (int) $r['days_since_seen'];

            $volume      = (float) $pv;
            $high_score  = (float) ($hi * 5);
            $med_score   = (float) ($mi * 2);
            $time_min    = min(60.0, $secs / 60.0);
            $recency     = ($days !== null && $days <= 7) ? 10.0
                         : (($days !== null && $days <= 30) ? 3.0 : 0.0);
            $diversity   = $dp * 0.5;
            $bot_penalty = $is_bot ? 100.0 : 0.0;
            $total       = $volume + $high_score + $med_score + $time_min + $recency + $diversity - $bot_penalty;

            $hot_leads[] = [
                'name'                  => $r['name'],
                'email'                 => $r['email'],
                'company'               => $r['company'],
                'source_form'           => $r['source_form'],
                'first_seen'            => $r['first_seen_at'],
                'last_seen'             => $r['last_seen_at'],
                'pageviews'             => $pv,
                'distinct_pages'        => $dp,
                'total_seconds_on_site' => $secs,
                'high_intent_views'     => $hi,
                'medium_intent_views'   => $mi,
                'score'                 => round($total, 2),
                'score_breakdown'       => [
                    'volume'        => round($volume, 2),
                    'high_intent'   => round($high_score, 2),
                    'medium_intent' => round($med_score, 2),
                    'time_minutes'  => round($time_min, 2),
                    'recency'       => round($recency, 2),
                    'diversity'     => round($diversity, 2),
                    'bot_penalty'   => round($bot_penalty, 2),
                    'total'         => round($total, 2),
                ],
            ];
        }

        // Sort by score DESC, slice top 25 (we queried 200 to give the score sort headroom)
        usort($hot_leads, function($a, $b) { return $b['score'] <=> $a['score']; });
        $hot_leads = array_slice($hot_leads, 0, 25);
```

Then update the final `echo json_encode(...)` to include `hot_leads`:

```php
        echo json_encode([
            'generated_at' => gmdate('c'),
            'source_table' => $TABLE,
            'windows'      => $result,
            'hot_leads'    => $hot_leads,
        ], JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES);
```

Do NOT modify any of:
- The auth gate (line 18-24)
- `classify_source()` (line 34-55)
- The `foreach ($windows ...)` loop body (lines 83-250) — every per-window block must stay byte-identical except for whitespace
- The `catch (Exception $e)` block

Atomic-commit boundary: this is a single commit `feat(api): hot_leads behavioral lead scoring (quick task 311)`. The _visitor.php helper is part of the same commit because stats.php's CASE expressions document the helper's intent contract.

**STEP 3 — Commit locally in techcloudpro repo.**

```bash
cd /Users/jeet/techcloudpro
git add api/stats.php api/_visitor.php
git commit -m "feat(api): hot_leads behavioral lead scoring (quick task 311)

Adds top-level hot_leads array to stats.php — global top 25 identified
visitors ranked by composite engagement score (volume + intent-weighted
pageviews + time-on-site + recency + diversity − bot penalty).

- New _visitor.php helper: tcp_classify_page_intent(\$page)
- New stats.php SQL: single JOIN-aggregate over identified_visitors +
  page_views with intent CASE expressions, PHP scoring + sort + top-25 slice
- Bot detection via page_views.browser REGEXP (see inline comment for
  schema-probe finding from Step 0)
- Existing per-window identified_visits.top_visitors UNCHANGED — different
  lens (volume sort vs score sort)
- Auth gate unchanged"
```

**STEP 4 — Deploy to Hostinger via scp (mirror 305-310 pattern).**

```bash
scp -P 65002 -i ~/.ssh/id_ed25519 /Users/jeet/techcloudpro/api/_visitor.php \
  u350621741@147.93.101.51:/home/u350621741/domains/techcloudpro.com/public_html/api/_visitor.php

scp -P 65002 -i ~/.ssh/id_ed25519 /Users/jeet/techcloudpro/api/stats.php \
  u350621741@147.93.101.51:/home/u350621741/domains/techcloudpro.com/public_html/tcp-analytics/stats.php
```

(Note: stats.php lives under `/tcp-analytics/` on the server even though the source is in `/api/` in the repo. Verify path with one of: `ssh -p 65002 -i ~/.ssh/id_ed25519 u350621741@147.93.101.51 'ls /home/u350621741/domains/techcloudpro.com/public_html/tcp-analytics/stats.php'` BEFORE deploy. If the path differs, follow the path used by Phase 310's deploy in 310-SUMMARY.md line 49.)

**STEP 5 — Verify live (curl + jq).**

Use Safari UA per MEMORY rule (Cloudflare WAF blocks default curl UA on techcloudpro.com).

```bash
UA='Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15'

# V1 — auth gate still works (regression)
curl -s -A "$UA" -o /dev/null -w "%{http_code}\n" "https://techcloudpro.com/tcp-analytics/stats.php"
# Expect: 404
curl -s -A "$UA" -o /dev/null -w "%{http_code}\n" "https://techcloudpro.com/tcp-analytics/stats.php?s=WRONG"
# Expect: 404
curl -s -A "$UA" -o /dev/null -w "%{http_code}\n" "https://techcloudpro.com/tcp-analytics/stats.php?s=TcpSecureAdmin2026"
# Expect: 200

# V2 — hot_leads is at top level, NOT inside windows
curl -s -A "$UA" "https://techcloudpro.com/tcp-analytics/stats.php?s=TcpSecureAdmin2026" \
  | jq 'keys, (.hot_leads | type), (.hot_leads | length)'
# Expect: ["generated_at","hot_leads","source_table","windows"], "array", N (probably 1-5 given small identified_visitors count)

# V3 — score_breakdown sums correctly for the top 3
curl -s -A "$UA" "https://techcloudpro.com/tcp-analytics/stats.php?s=TcpSecureAdmin2026" \
  | jq '.hot_leads[0:3] | map({email: .email, score: .score, breakdown_sum: ((.score_breakdown.volume + .score_breakdown.high_intent + .score_breakdown.medium_intent + .score_breakdown.time_minutes + .score_breakdown.recency + .score_breakdown.diversity) - .score_breakdown.bot_penalty), breakdown_total: .score_breakdown.total})'
# Expect: each entry's score === breakdown_sum (within 0.01 — PHP round() rounding)

# V4 — Diego Palmieri @ Mizkan America Inc shows up with non-zero score
curl -s -A "$UA" "https://techcloudpro.com/tcp-analytics/stats.php?s=TcpSecureAdmin2026" \
  | jq '.hot_leads[] | select(.company | test("Mizkan"; "i")) | {name, email, company, score, score_breakdown}'
# Expect: one or more rows; .score > 0

# V5 — REGRESSION: existing identified_visits.top_visitors per-window blocks unchanged
curl -s -A "$UA" "https://techcloudpro.com/tcp-analytics/stats.php?s=TcpSecureAdmin2026" \
  | jq '.windows | to_entries | map({window: .key, has_top_visitors: (.value.identified_visits.top_visitors != null), top_visitors_keys: (if (.value.identified_visits.top_visitors | length) > 0 then (.value.identified_visits.top_visitors[0] | keys) else [] end)})'
# Expect: all 4 windows show has_top_visitors=true, keys = ["company","email","first_seen_at","last_seen_at","name","pageviews","source_form"]
# (Same shape as before — proves we didn't accidentally rewrite the per-window block)

# V6 — REGRESSION: per-window field counts (today/last_7d/last_30d/all_time)
curl -s -A "$UA" "https://techcloudpro.com/tcp-analytics/stats.php?s=TcpSecureAdmin2026" \
  | jq '.windows | to_entries | map({window: .key, fields: (.value | keys)})'
# Expect: each window has exactly: ["by_country","by_day","by_org","by_page","by_source","by_utm","identified_visits","total_pageviews","unique_sessions"]
```

If V1-V6 all pass, capture verbatim outputs in 311-SUMMARY.md.

If V3 mismatches by more than 0.02 (rounding tolerance), STOP and debug. Likely cause: forgetting the bot_penalty SUBTRACTION in PHP (formula is `+ ... - bot_penalty`) — but breakdown.bot_penalty is positive in the JSON. Make sure jq calculation in V3 also does `(positive_terms_sum) - bot_penalty`.

**STEP 6 — Write 311-SUMMARY.md.**

Mirror 310-SUMMARY.md structure. Required sections:
1. One-liner
2. What was built (table)
3. Verification — verbatim curl evidence:
   - Battery A: distinct browser values from page_views (Step 0 probe output)
   - Battery V1: auth gate 404/404/200
   - Battery V2: top-level hot_leads array + length
   - Battery V3: top-3 score_breakdown sum check (paste actual numbers)
   - Battery V4: Diego Palmieri row with score
   - Battery V5: regression check — identified_visits.top_visitors per-window keys unchanged
   - Battery V6: regression check — per-window field list unchanged
4. Files changed (table)
5. Phase X follow-ups (at minimum: refine bot regex if Step 0 found gaps; consider exposing hot_leads with `?window=` filter; consider score formula tuning after 30 days of real data)
6. Rollback playbook (Tier 1: scp pre-patch baseline back; Tier 2: git revert)
7. Commit hashes
8. Self-Check (mirror 310-SUMMARY)

**STEP 7 — Atomic commit summary in dollor.ai repo.**

```bash
cd /Users/jeet/doordash-p2p
node /Users/jeet/.claude/get-shit-done/bin/gsd-tools.cjs commit "docs(quick-311): TCP identity-stack Phase 4 — behavioral lead scoring" --files .planning/quick/311-phase-4-identity-stack-behavioral-lead-s/311-PLAN.md .planning/quick/311-phase-4-identity-stack-behavioral-lead-s/311-SUMMARY.md
```

Per CLAUDE.md, do NOT push to remote unless user asks.
  </action>
  <verify>
1. `grep -n "function tcp_classify_page_intent" /Users/jeet/techcloudpro/api/_visitor.php` returns one match
2. `grep -n "hot_leads" /Users/jeet/techcloudpro/api/stats.php` returns at least 3 matches (block comment, $hot_leads var, JSON output key)
3. `grep -n "high_intent_views\|medium_intent_views\|score_breakdown" /Users/jeet/techcloudpro/api/stats.php` returns the SQL CASE rows + the PHP breakdown rows
4. Live curl V1 returns 404, 404, 200 for missing/wrong/correct ?s param
5. Live curl V2: `jq 'keys'` includes "hot_leads" at the root level (not inside windows)
6. Live curl V3: top-3 `score == sum(positive_breakdown_terms) - bot_penalty` within ±0.01
7. Live curl V4: at least one hot_leads entry matches `Mizkan` (case-insensitive) with score > 0
8. Live curl V5: every window's `identified_visits.top_visitors[0]` has the exact 7 keys it had before (regression)
9. Live curl V6: every window's top-level keys list is identical to the pre-patch list (regression)
10. 311-SUMMARY.md exists at .planning/quick/311-phase-4-identity-stack-behavioral-lead-s/311-SUMMARY.md and contains "Battery A", "Battery V1" through "Battery V6", and verbatim curl outputs
11. `git log --oneline -2` in /Users/jeet/techcloudpro shows the new feat commit on top
12. `git log --oneline -1` in /Users/jeet/doordash-p2p shows the docs(quick-311) commit on top
  </verify>
  <done>
- /Users/jeet/techcloudpro/api/_visitor.php has tcp_classify_page_intent() helper appended
- /Users/jeet/techcloudpro/api/stats.php emits top-level hot_leads array (sibling of windows) with score + score_breakdown per entry
- Hostinger production deploy verified live (curl + jq, all 6 verification batteries pass)
- score_breakdown.total === score within ±0.01 for top-3 entries
- Diego Palmieri @ Mizkan America Inc visible in hot_leads with non-zero score
- All existing per-window blocks (today/last_7d/last_30d/all_time identified_visits.top_visitors + 8 other fields) unchanged — regression batteries V5+V6 PASS
- Auth gate (?s=TcpSecureAdmin2026) preserved — regression battery V1 PASS
- 311-SUMMARY.md written with Battery A (distinct browser values), V1-V6 verbatim curl evidence, files-changed table, Phase X follow-ups, rollback playbook
- 1 atomic commit in techcloudpro: feat(api): hot_leads behavioral lead scoring (quick task 311)
- 1 atomic commit in dollor.ai: docs(quick-311): TCP identity-stack Phase 4 — behavioral lead scoring
- No push to remote (per CLAUDE.md)
- Bot-detection approach documented inline in stats.php with Step 0 probe finding
  </done>
</task>

</tasks>

<verification>
Run all 6 verification batteries (V1-V6) plus Battery A (Step 0 browser probe). Each curl output must be saved verbatim into 311-SUMMARY.md.

Privacy review: zero new privacy concerns. All data in hot_leads is derived from rows already authorized + disclosed in Phases 1-3 (form-fill identification + first-party fingerprinting). No new PII collected, no new fields written, no new disclosure required. State this verbatim in 311-SUMMARY.md.
</verification>

<success_criteria>
- `hot_leads` array surfaces at top level of stats.php JSON response
- Score formula matches spec: pageviews*1 + high*5 + med*2 + min(60, secs/60) + recency_bonus + dp*0.5 - bot_penalty
- score_breakdown.total === score within ±0.01 for ALL hot_leads entries (verified for top-3)
- Diego Palmieri visible with non-zero score
- All existing structure (auth gate, per-window identified_visits.top_visitors, by_source/by_org/by_country/by_utm/fingerprint_only_identified) unchanged
- Step 0 documented bot-detection approach in stats.php inline comment + 311-SUMMARY.md Battery A
- 1 atomic commit per repo (techcloudpro feat + dollor.ai docs)
- No push to remote
</success_criteria>

<output>
After completion, create `.planning/quick/311-phase-4-identity-stack-behavioral-lead-s/311-SUMMARY.md`
</output>
