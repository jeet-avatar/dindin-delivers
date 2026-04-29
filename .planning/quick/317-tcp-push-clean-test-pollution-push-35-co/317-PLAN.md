---
phase: 317-tcp-push-clean-test-pollution-push-35-co
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - "/Users/jeet/techcloudpro/api/stats.php"
  - "/Users/jeet/techcloudpro/api/_visitor.php"
  - "(server-only) /home/u350621741/.../api/stats.php"
  - "(server-only) /home/u350621741/.../api/_visitor.php"
  - "(server-only) /home/u350621741/.../tcp-analytics/stats.php"
  - "(remote) github.com/jeet-avatar/techcloudpro main (push)"
  - "(server-side schema) identified_visitors.is_test column + idx_is_test index"
  - "(server-side data) identified_visitors UPDATE is_test=1 WHERE <synthetic patterns>"
  - "/Users/jeet/doordash-p2p/.planning/quick/317-.../317-SUMMARY.md"
autonomous: true
requirements:
  - "TCP-317-PUSH: push 35 commits techcloudpro local main → origin/main (irreversible; private repo; secrets from old commits ride along; rotation deferred)"
  - "TCP-317-AUDIT: classify Keith Vanwey identified_visitors row as REAL prospect or TEST pollution before mass-flagging"
  - "TCP-317-SCHEMA: ALTER identified_visitors ADD COLUMN is_test TINYINT(1) NOT NULL DEFAULT 0 + INDEX idx_is_test"
  - "TCP-317-FLAG: mark synthetic test rows as is_test=1 (REVERSIBLE; never DELETE in this task)"
  - "TCP-317-FILTER: stats.php hot_leads SQL + identified_visits.top_visitors per-window SQL filter on iv.is_test = 0"
  - "TCP-317-AUTOFLAG: tcp_upsert_identified_visitor() auto-sets is_test=1 on synthetic patterns at INSERT (no maintenance after this task)"
must_haves:
  truths:
    - "TCP-only scope honored: zero touches to BrandMonkz/AWS/dollor.ai backend/Zietra/ArthaBuild/any other repo"
    - "Push is IRREVERSIBLE: secrets in old commits (TCP_BM_SHARED_SECRET in 63a9680, DB password back to b817407) enter github.com/jeet-avatar/techcloudpro on first push — repo is private, but credentials are now in remote history; rotation deferred to Phase X (NOT this task)"
    - "Cleanup is REVERSIBLE: is_test=1 flag, never DELETE — false positives recoverable via single UPDATE is_test=0 WHERE id IN (...)"
    - "Real-prospect visibility restored: hot_leads + identified_visits.top_visitors per-window filter is_test=0 going forward"
    - "Future synthetic tests auto-flag: tcp_upsert_identified_visitor() sets is_test=1 on INSERT when email matches synthetic patterns; existing rows preserved (UPDATE path does NOT flip is_test, allowing manual reclassification)"
    - "Stop-and-ask gates honored: ε (push fails) blocks all DB ops; ζ (dry-run count 0 or wildly off) blocks UPDATE; η (real-looking rows in dry-run sample) blocks UPDATE; θ (schema ALTER fails) blocks all subsequent steps"
  artifacts:
    - path: "github.com/jeet-avatar/techcloudpro origin/main"
      provides: "35 commits pushed (~24 pre-existing + 11 from quick-316)"
      contains: "post-push: git log origin/main..HEAD --oneline = empty"
    - path: "MySQL u350621741_visitors.identified_visitors"
      provides: "is_test TINYINT(1) NOT NULL DEFAULT 0 column + idx_is_test index"
      contains: "DESCRIBE shows new column at end; SHOW INDEX confirms idx_is_test"
    - path: "/Users/jeet/techcloudpro/api/stats.php"
      provides: "hot_leads SQL + identified_visits per-window SQL filter on iv.is_test = 0"
      contains: "WHERE iv.is_test = 0 (or AND iv.is_test = 0 if WHERE already exists)"
    - path: "/Users/jeet/techcloudpro/api/_visitor.php"
      provides: "tcp_upsert_identified_visitor() auto-flags synthetic emails on INSERT"
      contains: "preg_match for is_test detection (DRY: same regex as tcp_notify_new_lead skip-list)"
    - path: "/Users/jeet/doordash-p2p/.planning/quick/317-.../317-SUMMARY.md"
      provides: "Verbatim verification battery outputs (A-I) + Phase X follow-ups"
      contains: "git push output, schema DESCRIBE, dry-run count + sample, UPDATE rows-affected, 9 verification batteries"
  key_links:
    - from: "/Users/jeet/techcloudpro/api/_visitor.php (tcp_upsert_identified_visitor INSERT)"
      to: "/Users/jeet/techcloudpro/api/_visitor.php (tcp_notify_new_lead skip-list regex)"
      via: "DRY synthetic-email regex (single source of truth)"
      pattern: "preg_match.*@(example|test|localhost)\\..*|^tcp-3[0-9]{2}-|\\+test"
    - from: "/Users/jeet/techcloudpro/api/stats.php (hot_leads SQL)"
      to: "MySQL identified_visitors.is_test"
      via: "WHERE iv.is_test = 0 (additive filter)"
      pattern: "iv\\.is_test\\s*=\\s*0"
    - from: "/Users/jeet/techcloudpro/api/stats.php (identified_visits.top_visitors per-window SQL)"
      to: "MySQL identified_visitors.is_test"
      via: "AND iv.is_test = 0 (added to existing JOIN)"
      pattern: "iv\\.is_test\\s*=\\s*0"
---

<objective>
Push 35 unpushed commits to github.com/jeet-avatar/techcloudpro/main (Phases 1-7 of identity stack + secrets refactor), then add an `is_test` flag to `identified_visitors`, mark ~13-15 synthetic test rows as `is_test=1`, filter them out of `stats.php` hot_leads + per-window top_visitors, and wire auto-flagging into `tcp_upsert_identified_visitor()` so future synthetic tests don't pollute the dashboard.

Purpose: Real prospects (Diego Palmieri @ Mizkan, Keith Vanwey if classified real, future organic identifications) become visible in the dashboard without being drowned by synthetic test rows from quick tasks 307-316. Make cleanup REVERSIBLE (flag, never delete) and AUTOMATIC (regex match on INSERT) so this is the last manual cleanup pass needed.

Output:
- 35 commits live on origin/main (irreversible, deferred-rotation acknowledged)
- `identified_visitors.is_test` schema column live
- ~13-15 rows flagged as is_test=1 (REVERSIBLE)
- `stats.php` filters out is_test=1 in 2 SQL blocks
- `_visitor.php` tcp_upsert auto-flags new synthetic rows
- Per-task atomic commits in techcloudpro (stats.php + _visitor.php)
- 9 verification batteries (A-I) with verbatim live evidence
- 317-SUMMARY.md in dollor.ai with Phase X follow-ups
</objective>

<execution_context>
@/Users/jeet/.claude/get-shit-done/workflows/execute-plan.md
@/Users/jeet/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md
@CLAUDE.md
@.planning/quick/305-build-tcp-analytics-stats-php-on-techclo/305-SUMMARY.md
@.planning/quick/307-phase-1-identity-stack-form-fill-identit/307-SUMMARY.md
@.planning/quick/311-phase-4-identity-stack-behavioral-lead-s/311-SUMMARY.md
@.planning/quick/314-unified-lead-notification-system-on-tech/314-SUMMARY.md
@.planning/quick/315-fix-lead-scoring-recency-inflation-in-st/315-SUMMARY.md
@.planning/quick/316-refactor-tcp-secrets-out-of-php-source-i/316-SUMMARY.md
@/Users/jeet/techcloudpro/api/_visitor.php
@/Users/jeet/techcloudpro/api/stats.php
</context>

<known_facts>

## Constants from prior work (anti-hallucination — verified at plan-time)

| Fact | Value | Source |
|------|-------|--------|
| Hostinger SSH host | `147.93.101.51` | 305-SUMMARY, 306-SUMMARY |
| Hostinger SSH port | `65002` | 305-SUMMARY |
| Hostinger SSH user | `u350621741` | 305-SUMMARY |
| Hostinger SSH key | `~/.ssh/id_ed25519` | 305-SUMMARY |
| Hostinger api/ path | `/home/u350621741/domains/techcloudpro.com/public_html/api/` | 314-SUMMARY |
| Hostinger tcp-analytics/ path | `/home/u350621741/domains/techcloudpro.com/public_html/tcp-analytics/` | 305-SUMMARY |
| Cloudflare WAF curl bypass | `-A "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15"` | MEMORY |
| Auth gate token | `?s=TcpSecureAdmin2026` | 305-SUMMARY |
| Local techcloudpro repo | `/Users/jeet/techcloudpro/` | MEMORY (techcloudpro-standalone-repo) |
| Pre-patch baseline (post-quick-316) | `_secrets.php` exists; tracked files clean | 316-SUMMARY Battery G |
| stats.php live URL | `https://techcloudpro.com/tcp-analytics/stats.php?s=TcpSecureAdmin2026` | 315-SUMMARY |
| Dual-deploy quirk | `api/stats.php` (refactored, post-316) vs `tcp-analytics/stats.php` (live URL) — both must be updated | 316-SUMMARY Battery H + Phase X #6 |
| _secrets.php require_once line | `require_once __DIR__ . '/_secrets.php';` (already at top of stats.php + _visitor.php post-316) | 316-SUMMARY |
| tcp_notify_new_lead skip-list (DRY source of truth for "is this a synthetic email") | Three regex (verbatim from `_visitor.php:188-190`):<br>1. `/@(example\|test\|localhost)\.(com\|org\|test)$/i`<br>2. `/^tcp-3[0-9]{2}-/`<br>3. `strpos($email_norm, '+test') !== false` | 314-SUMMARY (`_visitor.php:188-190`) |
| Synthetic name patterns observed in identified_visitors (from 311-SUMMARY V3 + 315-SUMMARY V2) | `Test 310 FP`, `Test 307 Contact`, `Test 307 SG`, `Phase 2a Recheck`, `Phase 2a Test`, `Phase 8 SG Test`, `Phase 8 Contact Test`, `Phase 8 PG Test`, `Phase 8 Regression Test`, `Live Verify <ts>`, `Task2 Stub` | 311 + 315 SUMMARYs |
| Real-PII row in identified_visitors | Diego Palmieri @ Mizkan America Inc (email diego.palmieri@mizkan.com) — from quick-309 BM round-trip; **synthetic E2E** but contact data is real-looking; per STATE.md user clarification "Diego Palmieri @ Mizkan was a synthetic E2E test, not a real prospect" | 309-SUMMARY + STATE.md |
| Ambiguous row | Keith Vanwey (keithav@osw.io per 311-SUMMARY V3) — needs Phase 2 audit | 311-SUMMARY |
| Total identified_visitors rows pre-task | ~13 (per 315-SUMMARY V2 BEFORE table) | 315-SUMMARY |
| Pre-existing post-quick-316 commits awaiting push | ~35 (per CONTEXT) — must verify with `git log origin/main..HEAD --oneline \| wc -l` BEFORE push | CONTEXT |

## Probe deploy/cleanup pattern (mandatory — mirror 305/307/310/311/312/314/316)

For every server-side DB read or write:
1. Write probe PHP file locally to `/tmp/_probe-317-<purpose>.php`
2. `scp -P 65002 -i ~/.ssh/id_ed25519` to `/home/u350621741/.../api/_probe-317-<purpose>.php`
3. `curl -A "$UA" https://techcloudpro.com/api/_probe-317-<purpose>.php` (or wherever deployed)
4. Capture verbatim response → write into 317-SUMMARY.md
5. `ssh ... 'rm -f /home/u350621741/.../api/_probe-317-<purpose>.php'`
6. `curl ... -o /dev/null -w "%{http_code}"` → expect 404 (verify removal)

Probes MUST require_once /home/u350621741/.../api/_secrets.php (do NOT inline DB credentials).

</known_facts>

<stop_and_ask_gates>

**ε — Push fails:** If `git push origin main` returns auth error, network error, or non-fast-forward refusal — STOP. Do NOT proceed to Phase 2+. Report verbatim error to user. Push is the only irreversible step; if it fails, the rest of the task waits.

**ζ — Dry-run count is 0 or wildly off:** If Phase 4 dry-run COUNT = 0 → STOP (regex too tight, missed everything). If COUNT > 25 (much higher than observed ~13-15) → STOP (regex too loose, will over-flag). Report count + sample to user, refine patterns, re-run dry-run.

**η — Phase 4 sample shows real-looking rows:** If the 5-row sample includes any row that looks like a real prospect (real-deliverable email domain, plausible name, real-looking IP) — STOP. The regex is over-matching. Refine and re-run.

**θ — Schema ALTER fails:** If ALTER returns "column already exists" (partial prior run) or any other error — STOP. Inspect identified_visitors columns via DESCRIBE probe. Decide: skip ALTER if column exists with correct type + default, or report error to user.

</stop_and_ask_gates>

<tasks>

<task type="auto">
  <name>Task 1: Push 35 commits + audit Keith Vanwey row</name>
  <files>
    - github.com/jeet-avatar/techcloudpro origin/main (push, no local file change)
    - /tmp/_probe-317-keith.php (write, scp, curl, delete — server-side)
  </files>
  <action>
**PHASE 1 — PUSH (IRREVERSIBLE, DO FIRST):**

```bash
cd /Users/jeet/techcloudpro

# Pre-push verification: confirm working tree is clean (post-316 should be clean)
git status

# Confirm no _secrets.php in staged or working tree leak (Battery G from 316 already proved this)
git ls-files | grep -E '_secrets\.php$' && echo "ERROR: _secrets.php is tracked — STOP" || echo "OK: _secrets.php is gitignored"
test -f /Users/jeet/techcloudpro/api/_secrets.php && echo "OK: _secrets.php exists locally (untracked)" || echo "WARN: _secrets.php missing locally"

# Count commits about to push
COMMIT_COUNT=$(git log origin/main..HEAD --oneline | wc -l | tr -d ' ')
echo "About to push $COMMIT_COUNT commits"
echo "=== commits about to push (verbatim) ==="
git log origin/main..HEAD --oneline

# Push
git push origin main
PUSH_EXIT=$?

# ⚠️ STOP-AND-ASK GATE ε
if [ $PUSH_EXIT -ne 0 ]; then
    echo "❌ PUSH FAILED with exit $PUSH_EXIT — STOP. Do NOT proceed to Phase 2."
    echo "Report this to the user and wait for instructions."
    exit 1
fi

# Post-push verification: should be empty
echo "=== post-push verification ==="
git log origin/main..HEAD --oneline | wc -l   # expect 0
git log -3 --oneline                          # show top 3 to confirm we're synced
```

Save verbatim push output (the `*-> main` line, packed objects count, total bytes pushed) into `317-SUMMARY.md` Battery A. **DO NOT proceed to Phase 2 if push fails.** If push succeeds, continue.

⚠️ ACKNOWLEDGED RISK (document in SUMMARY): old commit `63a9680` (Phase 2b) retains `TCP_BM_SHARED_SECRET = 32817b8c...` verbatim in its diff; old commits back to `b817407` (Phase 1) retain inline DB password `Thirumala977!` and DB user. Repo is private. Rotation deferred per user "no BM work" instruction. **Phase X follow-up MANDATORY** (already filed in 316-SUMMARY but re-state in 317-SUMMARY).

**PHASE 2 — AUDIT KEITH VANWEY:**

Per 311-SUMMARY V3, the row is `keithav@osw.io` named "Keith Vanwey". Determine REAL vs TEST.

Write `/tmp/_probe-317-keith.php`:

```php
<?php
require_once __DIR__ . '/_secrets.php';
header('Content-Type: application/json');
try {
    $pdo = new PDO('mysql:host=' . TCP_DB_HOST . ';dbname=' . TCP_DB_NAME . ';charset=utf8mb4',
                   TCP_DB_USER, TCP_DB_PASS, [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION, PDO::ATTR_TIMEOUT => 5]);
    $iv = $pdo->query("SELECT id, visitor_id, email, name, company, source_form, first_seen_at, last_seen_at, first_seen_ip, last_notified_at FROM identified_visitors WHERE LOWER(name) LIKE '%vanwey%' OR LOWER(email) LIKE '%vanwey%' OR LOWER(email) LIKE '%osw.io%'")->fetchAll(PDO::FETCH_ASSOC);
    $vids = array_column($iv, 'visitor_id');
    $pv = [];
    if (!empty($vids)) {
        $place = implode(',', array_fill(0, count($vids), '?'));
        $stmt = $pdo->prepare("SELECT id, visitor_id, page, referrer, country, city, browser, device, created_at, time_on_page FROM page_views WHERE visitor_id IN ($place) ORDER BY created_at ASC LIMIT 50");
        $stmt->execute($vids);
        $pv = $stmt->fetchAll(PDO::FETCH_ASSOC);
    }
    echo json_encode(['identified_visitors' => $iv, 'page_views' => $pv, 'pv_count' => count($pv)], JSON_PRETTY_PRINT);
} catch (Throwable $e) { echo json_encode(['error' => $e->getMessage()]); }
```

Deploy + run + delete (mirror 305/307/310/311/312/314/316 probe pattern):

```bash
UA="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15"

scp -P 65002 -i ~/.ssh/id_ed25519 /tmp/_probe-317-keith.php \
    u350621741@147.93.101.51:/home/u350621741/domains/techcloudpro.com/public_html/api/_probe-317-keith.php

# Note: api/.htaccess from quick-316 denies _secrets*.php but NOT _probe-*.php — so this curl works
curl -s -A "$UA" "https://techcloudpro.com/api/_probe-317-keith.php" | tee /tmp/317-keith-audit.json

ssh -p 65002 -i ~/.ssh/id_ed25519 u350621741@147.93.101.51 \
    "rm -f /home/u350621741/domains/techcloudpro.com/public_html/api/_probe-317-keith.php"

curl -s -A "$UA" -o /dev/null -w "%{http_code}\n" "https://techcloudpro.com/api/_probe-317-keith.php"
# expect 404
```

Save verbatim probe output into 317-SUMMARY.md Battery B.

**Decision criteria** (document verdict verbatim in plan output AND 317-SUMMARY):

| Signal | REAL prospect | TEST pollution |
|--------|---------------|----------------|
| Email domain | Real corporate / consumer (e.g. osw.io, gmail.com) | example.com / test.com / localhost.test |
| First-seen IP | Real residential or corporate (public, not 127.* / 192.168.* / 10.*) | 127.* / 192.168.* / 10.* / empty |
| Page views count | ≥1 with realistic time_on_page values | 0 page_views OR all from synthetic test paths |
| source_form | Plausible (contact / ai-playground / rag-study-guide / email-click) with real referrer | None of the above OR matches synthetic E2E pattern |
| Name pattern | Real-name-shaped | "Test N", "Phase N", "Task N", "Live Verify N", "Verify N" |

If REAL → Keith stays unflagged (do NOT include in Phase 5 UPDATE).
If TEST → Keith is flagged in Phase 5 UPDATE.

Plan output should explicitly state: `KEITH_VERDICT: REAL` or `KEITH_VERDICT: TEST` with 1-sentence justification.
  </action>
  <verify>
1. `git log origin/main..HEAD --oneline | wc -l` returns `0` post-push
2. Push output saved verbatim to 317-SUMMARY Battery A (showing X commits, Y deltas, total bytes)
3. /tmp/317-keith-audit.json contains valid JSON with `identified_visitors` array (1 row expected) + `page_views` array
4. Probe deleted: HTTP 404 on second curl
5. Plan output (and SUMMARY) explicitly states `KEITH_VERDICT: REAL` or `KEITH_VERDICT: TEST` with justification citing specific signals from probe output
  </verify>
  <done>
- 35 commits visible on github.com/jeet-avatar/techcloudpro origin/main
- Local `git log origin/main..HEAD` is empty
- Keith Vanwey row classified (verdict + reason recorded in summary)
- Probe file removed from server
- Push risk acknowledged in SUMMARY (BM secret + DB password in old commits → Phase X rotation)
- If push failed: STOPPED here, no further work attempted, user notified
  </done>
</task>

<task type="auto">
  <name>Task 2: Schema migration + dry-run + flag + filter + auto-flag + deploy + 9 verification batteries</name>
  <files>
    - /Users/jeet/techcloudpro/api/stats.php (modify — 2 SQL blocks add `iv.is_test = 0` filter)
    - /Users/jeet/techcloudpro/api/_visitor.php (modify — tcp_upsert_identified_visitor INSERT path adds is_test auto-flag)
    - /tmp/_probe-317-schema.php (write, scp, curl, delete)
    - /tmp/_probe-317-dryrun.php (write, scp, curl, delete)
    - /tmp/_probe-317-update.php (write, scp, curl, delete)
    - /tmp/_probe-317-spotcheck.php (write, scp, curl, delete)
    - /tmp/_probe-317-verify.php (write, scp, curl, delete)
    - (server-only) /home/u350621741/.../api/stats.php (scp deploy)
    - (server-only) /home/u350621741/.../api/_visitor.php (scp deploy)
    - (server-only) /home/u350621741/.../tcp-analytics/stats.php (scp deploy — dual-deploy per 316 Battery H)
  </files>
  <action>

**PHASE 3 — SCHEMA MIGRATION (probe-then-decide):**

Write `/tmp/_probe-317-schema.php`:

```php
<?php
require_once __DIR__ . '/_secrets.php';
header('Content-Type: application/json');
try {
    $pdo = new PDO('mysql:host=' . TCP_DB_HOST . ';dbname=' . TCP_DB_NAME . ';charset=utf8mb4',
                   TCP_DB_USER, TCP_DB_PASS, [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]);

    // Pre-check: does column already exist? (idempotent — gate θ)
    $cols = $pdo->query("DESCRIBE identified_visitors")->fetchAll(PDO::FETCH_ASSOC);
    $existing = array_column($cols, 'Field');

    $log = [];
    if (in_array('is_test', $existing)) {
        $log[] = ['step' => 'is_test column already exists — skipping ALTER', 'result' => 'SKIPPED'];
    } else {
        $pdo->exec("ALTER TABLE identified_visitors
                    ADD COLUMN is_test TINYINT(1) NOT NULL DEFAULT 0,
                    ADD INDEX idx_is_test (is_test)");
        $log[] = ['step' => 'ALTER TABLE identified_visitors ADD is_test + idx_is_test', 'result' => 'OK'];
    }

    // Post-check
    $cols_after = $pdo->query("DESCRIBE identified_visitors")->fetchAll(PDO::FETCH_ASSOC);
    $idx = $pdo->query("SHOW INDEX FROM identified_visitors WHERE Key_name = 'idx_is_test'")->fetchAll(PDO::FETCH_ASSOC);

    echo json_encode([
        'log' => $log,
        'columns_after' => $cols_after,
        'idx_is_test' => $idx,
    ], JSON_PRETTY_PRINT);
} catch (Throwable $e) {
    echo json_encode(['error' => $e->getMessage()]);
}
```

Deploy + run + delete (probe pattern). Save output to Battery C.

**⚠️ STOP-AND-ASK GATE θ:** If response contains `error` AND error is NOT "Duplicate column name 'is_test'" — STOP. Report to user. If error IS "Duplicate column name" → fine (idempotent rerun), continue.

Verify post-state: `is_test TINYINT(1) NOT NULL DEFAULT 0` column present + `idx_is_test` BTREE index visible.

**PHASE 4 — DRY-RUN COUNT (NO writes):**

Write `/tmp/_probe-317-dryrun.php`:

```php
<?php
require_once __DIR__ . '/_secrets.php';
header('Content-Type: application/json');
try {
    $pdo = new PDO('mysql:host=' . TCP_DB_HOST . ';dbname=' . TCP_DB_NAME . ';charset=utf8mb4',
                   TCP_DB_USER, TCP_DB_PASS, [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]);

    // Synthetic patterns — DRY with tcp_notify_new_lead skip-list (extended for names + Diego clarification)
    // Patterns: email regex (3 classes) + name regex + Keith pollution case (parameterized)
    $sql_count = "
        SELECT COUNT(*) AS n
        FROM identified_visitors
        WHERE
            email REGEXP '@(example|test|localhost)\\\\.(com|org|test)$'
         OR email REGEXP '^tcp-3[0-9]{2}-'
         OR email LIKE '%+test%'
         OR name REGEXP '^(Phase [0-9]|Test [0-9]|Task[0-9]|Live Verify|Verify [0-9])'
         OR LOWER(name) = 'diego palmieri'
         /* KEITH_PLACEHOLDER */
    ";

    // If KEITH_VERDICT was TEST in Task 1, the executor MUST replace the comment with:
    //    OR LOWER(name) = 'keith vanwey'
    // If KEITH_VERDICT was REAL, leave the comment as-is (no Keith match).
    $sql_count = str_replace('/* KEITH_PLACEHOLDER */', '/* keith stays unflagged */', $sql_count);
    // ↑ EXECUTOR: edit this str_replace based on Task 1 verdict before running probe.
    //   For TEST: str_replace('/* KEITH_PLACEHOLDER */', "OR LOWER(name) = 'keith vanwey'", $sql_count)

    $count = (int) $pdo->query($sql_count)->fetchColumn();

    // Sample: same WHERE, return 5 rows verbatim
    $sql_sample = str_replace('SELECT COUNT(*) AS n', 'SELECT id, visitor_id, email, name, company, source_form, first_seen_at, is_test', $sql_count) . ' LIMIT 5';
    $sample = $pdo->query($sql_sample)->fetchAll(PDO::FETCH_ASSOC);

    // Counter-sample: 5 rows that would NOT be flagged (sanity check the boundary)
    $sql_unflagged = "SELECT id, visitor_id, email, name, company, source_form, first_seen_at, is_test
                      FROM identified_visitors
                      WHERE NOT (
                          email REGEXP '@(example|test|localhost)\\\\.(com|org|test)$'
                       OR email REGEXP '^tcp-3[0-9]{2}-'
                       OR email LIKE '%+test%'
                       OR name REGEXP '^(Phase [0-9]|Test [0-9]|Task[0-9]|Live Verify|Verify [0-9])'
                       OR LOWER(name) = 'diego palmieri'
                      )
                      LIMIT 5";
    $unflagged_sample = $pdo->query($sql_unflagged)->fetchAll(PDO::FETCH_ASSOC);

    $total = (int) $pdo->query("SELECT COUNT(*) FROM identified_visitors")->fetchColumn();

    echo json_encode([
        'total_rows' => $total,
        'to_be_flagged_count' => $count,
        'to_be_flagged_sample' => $sample,
        'would_remain_unflagged_sample' => $unflagged_sample,
    ], JSON_PRETTY_PRINT);
} catch (Throwable $e) {
    echo json_encode(['error' => $e->getMessage()]);
}
```

**EXECUTOR:** Before deploying probe, replace the `KEITH_PLACEHOLDER` comment based on Task 1 KEITH_VERDICT:
- KEITH_VERDICT = TEST: change `'/* keith stays unflagged */'` to `"OR LOWER(name) = 'keith vanwey'"`
- KEITH_VERDICT = REAL: leave `/* keith stays unflagged */` as-is

Deploy + run + delete. Save to Battery D.

**⚠️ STOP-AND-ASK GATES ζ + η:**
- If `to_be_flagged_count == 0` → STOP. Regex too tight — report sample to user, refine, retry.
- If `to_be_flagged_count > 25` → STOP. Regex too loose — report to user.
- Inspect `to_be_flagged_sample` (5 rows). If ANY row looks like a real prospect (real-deliverable email domain, plausible name, realistic IP) → STOP gate η. Report and refine.
- Expected count: ~13-15 (or +1 if Keith=TEST). If count is between 8-20 + sample looks synthetic → continue.

**PHASE 5 — UPDATE (REVERSIBLE flag, NEVER delete):**

Write `/tmp/_probe-317-update.php`:

```php
<?php
require_once __DIR__ . '/_secrets.php';
header('Content-Type: application/json');
try {
    $pdo = new PDO('mysql:host=' . TCP_DB_HOST . ';dbname=' . TCP_DB_NAME . ';charset=utf8mb4',
                   TCP_DB_USER, TCP_DB_PASS, [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]);

    // Capture pre-state for spot-check + reversibility audit
    $pre_test_count = (int) $pdo->query("SELECT COUNT(*) FROM identified_visitors WHERE is_test = 1")->fetchColumn();
    $pre_total = (int) $pdo->query("SELECT COUNT(*) FROM identified_visitors")->fetchColumn();

    // Capture exact ID list BEFORE update (for reversibility — paste into 317-SUMMARY)
    $sql_ids = "
        SELECT id, email, name FROM identified_visitors
        WHERE is_test = 0 AND (
            email REGEXP '@(example|test|localhost)\\\\.(com|org|test)$'
         OR email REGEXP '^tcp-3[0-9]{2}-'
         OR email LIKE '%+test%'
         OR name REGEXP '^(Phase [0-9]|Test [0-9]|Task[0-9]|Live Verify|Verify [0-9])'
         OR LOWER(name) = 'diego palmieri'
         /* KEITH_PLACEHOLDER */
        )
    ";
    // EXECUTOR: same KEITH_PLACEHOLDER substitution as Phase 4
    $ids_to_flag = $pdo->query($sql_ids)->fetchAll(PDO::FETCH_ASSOC);
    $id_csv = implode(',', array_column($ids_to_flag, 'id'));

    // The UPDATE itself
    $sql_update = "
        UPDATE identified_visitors SET is_test = 1
        WHERE is_test = 0 AND (
            email REGEXP '@(example|test|localhost)\\\\.(com|org|test)$'
         OR email REGEXP '^tcp-3[0-9]{2}-'
         OR email LIKE '%+test%'
         OR name REGEXP '^(Phase [0-9]|Test [0-9]|Task[0-9]|Live Verify|Verify [0-9])'
         OR LOWER(name) = 'diego palmieri'
         /* KEITH_PLACEHOLDER */
        )
    ";
    $rows_affected = $pdo->exec($sql_update);

    // Capture post-state
    $post_test_count = (int) $pdo->query("SELECT COUNT(*) FROM identified_visitors WHERE is_test = 1")->fetchColumn();
    $post_total = (int) $pdo->query("SELECT COUNT(*) FROM identified_visitors")->fetchColumn();

    // Spot-check 5 flagged + 5 unflagged
    $flagged_sample = $pdo->query("SELECT id, email, name, source_form, is_test FROM identified_visitors WHERE is_test = 1 LIMIT 5")->fetchAll(PDO::FETCH_ASSOC);
    $unflagged_sample = $pdo->query("SELECT id, email, name, source_form, is_test FROM identified_visitors WHERE is_test = 0 LIMIT 10")->fetchAll(PDO::FETCH_ASSOC);

    echo json_encode([
        'pre_state' => ['total' => $pre_total, 'is_test_count' => $pre_test_count],
        'rows_affected' => $rows_affected,
        'flagged_ids_for_reversibility' => $ids_to_flag,
        'flagged_id_csv' => $id_csv,
        'post_state' => ['total' => $post_total, 'is_test_count' => $post_test_count],
        'spot_check' => [
            'flagged_5' => $flagged_sample,
            'unflagged_first_10' => $unflagged_sample,
        ],
        'reversibility_sql' => "UPDATE identified_visitors SET is_test = 0 WHERE id IN ($id_csv)",
    ], JSON_PRETTY_PRINT);
} catch (Throwable $e) {
    echo json_encode(['error' => $e->getMessage()]);
}
```

EXECUTOR: same KEITH_PLACEHOLDER substitution as Phase 4 (in BOTH the count SQL and the UPDATE SQL).

Deploy + run + delete. Save to Battery E.

**Sanity check inline:** `rows_affected` should equal `to_be_flagged_count` from Phase 4 (or differ by ≤1 if a synthetic row got created between probes). `post_total == pre_total` (no rows deleted). `post_test_count - pre_test_count == rows_affected`.

Inspect `unflagged_first_10` — should NOT contain any clearly-synthetic email/name. If it does → flag boundary issue, document in deviations.

**PHASE 6 — STATS.PHP FILTER:**

Inspect current `/Users/jeet/techcloudpro/api/stats.php` to find exact line numbers for:
1. The hot_leads SQL block (search: `LEFT JOIN page_views pv ON pv.visitor_id = iv.visitor_id` — currently around line 335 per quick-315 baseline)
2. The per-window `identified_visits.top_visitors` SQL (search: `JOIN identified_visitors iv ON iv.visitor_id = pv.visitor_id` inside the foreach — currently around line 232)

Apply two surgical edits:

**Edit 1 — hot_leads SQL** (current ~line 334-337 has `FROM identified_visitors iv LEFT JOIN page_views pv ON pv.visitor_id = iv.visitor_id GROUP BY iv.id`). Add a `WHERE iv.is_test = 0` clause BETWEEN the LEFT JOIN and GROUP BY:

```sql
FROM identified_visitors iv
LEFT JOIN page_views pv ON pv.visitor_id = iv.visitor_id
WHERE iv.is_test = 0          -- ← NEW (quick task 317)
GROUP BY iv.id
ORDER BY pageviews DESC
LIMIT 200
```

**Edit 2 — per-window top_visitors SQL** (current ~line 228-238 has `FROM page_views pv JOIN identified_visitors iv ON iv.visitor_id = pv.visitor_id WHERE $where GROUP BY iv.id`). The existing `WHERE $where` clause already filters by time window. Add `AND iv.is_test = 0` to it:

```sql
FROM `$TABLE` pv
JOIN identified_visitors iv ON iv.visitor_id = pv.visitor_id
WHERE $where
  AND iv.is_test = 0          -- ← NEW (quick task 317)
GROUP BY iv.id
ORDER BY pageviews DESC
LIMIT 20
```

Also add doc-comment lines above each block referencing quick task 317 (mirror 311 + 315 doc style).

**Note on `distinct_identified_people`** (~line 222-225): the current SQL counts identified_visitors via JOIN on visitor_id but does NOT filter on `iv.is_test`. Decision: filter this too (consistency — if we don't show them in top_visitors, the count should match):

```sql
SELECT COUNT(DISTINCT pv.visitor_id)
FROM `$TABLE` pv
JOIN identified_visitors iv ON iv.visitor_id = pv.visitor_id
WHERE $where
  AND iv.is_test = 0          -- ← NEW (quick task 317)
```

**Note on `pageviews_with_visitor_id`** (~line 216-218): this counts page_views with non-null visitor_id WITHOUT joining identified_visitors. Decision: leave UNTOUCHED — this is a raw cookie-cardinality metric, not a "named prospect" metric. Document in code comment: "intentionally NOT filtered by is_test — counts cookie cardinality, not named prospect activity".

**Note on `fingerprint_only_identified`** (~line 248-256): this LEFT JOINs identified_visitors but the WHERE filters on `iv.email IS NULL OR iv.email = ''`. is_test=1 rows always have an email (synthetic but present), so they'd never match this WHERE anyway. Decision: leave UNTOUCHED — adding `AND iv.is_test = 0` would be a no-op. Document in code comment: "is_test filter not needed — WHERE iv.email IS NULL excludes is_test=1 rows by definition (synthetic rows have non-null emails)".

After edits, atomic commit:

```bash
cd /Users/jeet/techcloudpro
git add api/stats.php
git diff --cached api/stats.php  # verify diff is what we expect
git commit -m "fix(api): filter is_test=1 rows out of stats.php hot_leads + top_visitors (quick task 317)"
```

**PHASE 7 — _visitor.php AUTO-FLAG ON INSERT:**

Edit `/Users/jeet/techcloudpro/api/_visitor.php` `tcp_upsert_identified_visitor()` function. Locate the INSERT block (currently around lines 136-150 — `INSERT INTO identified_visitors ... ON DUPLICATE KEY UPDATE ...`).

Before the INSERT, add a synthetic-email detection helper (DRY with `tcp_notify_new_lead` skip-list at lines 188-190 — same regex):

```php
    // Quick task 317 — auto-flag synthetic test rows on INSERT.
    // Reuses tcp_notify_new_lead skip-list patterns (lines ~188-190) — single source
    // of truth for "is this a synthetic email". Only applies on INSERT path; the
    // ON DUPLICATE KEY UPDATE path does NOT touch is_test, allowing manual
    // reclassification (UPDATE identified_visitors SET is_test = 0 WHERE id IN ...)
    // to survive subsequent re-submits.
    $is_test_flag = (
        preg_match('/@(example|test|localhost)\.(com|org|test)$/i', $email_norm)
        || preg_match('/^tcp-3[0-9]{2}-/', $email_norm)
        || strpos($email_norm, '+test') !== false
    ) ? 1 : 0;
```

Modify the INSERT to include `is_test`:

```php
    $stmt = $pdo->prepare(
        "INSERT INTO identified_visitors
            (visitor_id, email, name, company, phone, source_form, first_seen_ip, is_test)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE
            email        = VALUES(email),
            name         = COALESCE(NULLIF(VALUES(name), ''),    name),
            company      = COALESCE(NULLIF(VALUES(company), ''), company),
            phone        = COALESCE(NULLIF(VALUES(phone), ''),   phone),
            source_form  = VALUES(source_form),
            last_seen_at = CURRENT_TIMESTAMP
            /* is_test intentionally NOT in UPDATE — preserves manual reclassification */"
    );
    $stmt->execute([
        $visitor_id, $email_norm, $name, $company, $phone, $source_form, $ip, $is_test_flag
    ]);
```

Also update the canonical-by-email cross-device branch (currently around lines 110-124, the UPDATE path) — should NOT touch is_test (preserves manual reclassification on canonical row).

Atomic commit:

```bash
cd /Users/jeet/techcloudpro
git add api/_visitor.php
git diff --cached api/_visitor.php  # verify
git commit -m "feat(api): tcp_upsert_identified_visitor auto-flags synthetic emails (quick task 317)"
```

**DEPLOY (single scp batch — atomic):**

```bash
cd /Users/jeet/techcloudpro

# Deploy stats.php to BOTH locations (api/ + tcp-analytics/) per 316 Battery H dual-deploy
scp -P 65002 -i ~/.ssh/id_ed25519 api/stats.php \
    u350621741@147.93.101.51:/home/u350621741/domains/techcloudpro.com/public_html/api/stats.php
scp -P 65002 -i ~/.ssh/id_ed25519 api/stats.php \
    u350621741@147.93.101.51:/home/u350621741/domains/techcloudpro.com/public_html/tcp-analytics/stats.php

# Deploy _visitor.php (api/ only — tcp-analytics has no _visitor.php)
scp -P 65002 -i ~/.ssh/id_ed25519 api/_visitor.php \
    u350621741@147.93.101.51:/home/u350621741/domains/techcloudpro.com/public_html/api/_visitor.php

# Verify deploy via sha256
LOCAL_STATS=$(sha256sum api/stats.php | cut -d' ' -f1)
LOCAL_VISITOR=$(sha256sum api/_visitor.php | cut -d' ' -f1)
ssh -p 65002 -i ~/.ssh/id_ed25519 u350621741@147.93.101.51 \
    "sha256sum /home/u350621741/domains/techcloudpro.com/public_html/api/stats.php \
              /home/u350621741/domains/techcloudpro.com/public_html/api/_visitor.php \
              /home/u350621741/domains/techcloudpro.com/public_html/tcp-analytics/stats.php"
echo "Local stats.php sha256:    $LOCAL_STATS"
echo "Local _visitor.php sha256: $LOCAL_VISITOR"
# stats.php on api/ AND tcp-analytics/ MUST match local sha
# _visitor.php on api/ MUST match local sha
```

**PHASE 8 — VERIFICATION (9 batteries):**

```bash
UA="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15"
TS=$(date +%s)
```

**Battery A — already captured in Task 1 (push verification). Re-confirm:**

```bash
cd /Users/jeet/techcloudpro && git log origin/main..HEAD --oneline | wc -l   # expect 0
```

**Battery B — Keith audit (already captured in Task 1).**

**Battery C — schema migration (already captured in Phase 3).**

**Battery D — dry-run count + sample (already captured in Phase 4).**

**Battery E — UPDATE rows-affected + spot-check (already captured in Phase 5).**

**Battery F — stats.php hot_leads filter (live curl):**

```bash
curl -s -A "$UA" "https://techcloudpro.com/tcp-analytics/stats.php?s=TcpSecureAdmin2026" \
    | jq '{hot_leads_count: (.hot_leads | length), hot_leads_top_5: .hot_leads[0:5] | map({name, email, score})}'
```

Expected: `hot_leads_count` smaller than the pre-fix 13. Specifically: only rows where `is_test = 0`. If Keith=REAL, expect Keith to remain. Diego Palmieri should be GONE (per STATE.md clarification: synthetic E2E). Test 310 FP, Test 307 *, Phase 8 *, etc. should all be GONE.

```bash
# Also re-verify identified_visits per-window filter
curl -s -A "$UA" "https://techcloudpro.com/tcp-analytics/stats.php?s=TcpSecureAdmin2026" \
    | jq '.windows | to_entries | map({window: .key, top_visitors_count: (.value.identified_visits.top_visitors | length), distinct_identified_people: .value.identified_visits.distinct_identified_people})'
```

Expected: per-window `top_visitors` lists exclude is_test=1 rows. `distinct_identified_people` reduced to count of is_test=0 rows in window.

Save verbatim to Battery F.

**Battery G — auto-flag on INSERT (synthetic):**

Synthetic POST to contact.php with `verify-${TS}@example.com`:

```bash
curl -s -A "$UA" -X POST -H 'Content-Type: application/json' \
    -d "{\"name\":\"Verify 317 Synthetic\",\"email\":\"verify-${TS}@example.com\",\"company\":\"Test\",\"message\":\"q317 auto-flag verify\"}" \
    https://techcloudpro.com/api/contact.php

# Should return HTTP 200 + lead_saved:true
```

Now probe the DB (write `/tmp/_probe-317-verify.php`):

```php
<?php
require_once __DIR__ . '/_secrets.php';
header('Content-Type: application/json');
try {
    $pdo = new PDO('mysql:host=' . TCP_DB_HOST . ';dbname=' . TCP_DB_NAME . ';charset=utf8mb4',
                   TCP_DB_USER, TCP_DB_PASS, [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]);
    $email = $_GET['e'] ?? '';
    $stmt = $pdo->prepare("SELECT id, email, name, source_form, is_test, first_seen_at FROM identified_visitors WHERE email = ? LIMIT 1");
    $stmt->execute([strtolower($email)]);
    echo json_encode(['row' => $stmt->fetch(PDO::FETCH_ASSOC)], JSON_PRETTY_PRINT);
} catch (Throwable $e) { echo json_encode(['error' => $e->getMessage()]); }
```

Deploy + run with the synthetic email:

```bash
SYNTHETIC_EMAIL=$(python3 -c "import urllib.parse; print(urllib.parse.quote(\"verify-${TS}@example.com\"))")
curl -s -A "$UA" "https://techcloudpro.com/api/_probe-317-verify.php?e=$SYNTHETIC_EMAIL"
# Expect: row.is_test = 1
```

Then verify it does NOT appear in hot_leads:

```bash
curl -s -A "$UA" "https://techcloudpro.com/tcp-analytics/stats.php?s=TcpSecureAdmin2026" \
    | jq ".hot_leads[] | select(.email == \"verify-${TS}@example.com\")"
# Expect: empty (no match — filter working)
```

Save to Battery G.

**Battery H — auto-flag on INSERT (real-deliverable, REGRESSION CHECK):**

Synthetic POST with REAL-deliverable email (per MEMORY rule — never fabricate domains):

```bash
curl -s -A "$UA" -X POST -H 'Content-Type: application/json' \
    -d "{\"name\":\"Verify 317 Real\",\"email\":\"jeetnair.in+q317-real-${TS}@gmail.com\",\"company\":\"Real Co\",\"message\":\"q317 real-flag verify\"}" \
    https://techcloudpro.com/api/contact.php

# Probe DB
REAL_EMAIL=$(python3 -c "import urllib.parse; print(urllib.parse.quote(\"jeetnair.in+q317-real-${TS}@gmail.com\"))")
curl -s -A "$UA" "https://techcloudpro.com/api/_probe-317-verify.php?e=$REAL_EMAIL"
# Expect: row.is_test = 0 (REAL email, NOT flagged — would appear in hot_leads going forward)
```

⚠️ Edge case to check: the email contains `+` but NOT `+test` substring. Verify is_test=0 (the `+test` rule is strpos NOT regex, so `+q317-real-` should NOT match).

Save to Battery H.

**Battery I — regressions:**

```bash
# I.1 — auth gate intact (305-era + 315-era pattern)
curl -s -A "$UA" -o /dev/null -w "no_token=%{http_code}\n" "https://techcloudpro.com/tcp-analytics/stats.php"
curl -s -A "$UA" -o /dev/null -w "wrong_token=%{http_code}\n" "https://techcloudpro.com/tcp-analytics/stats.php?s=WRONG"
curl -s -A "$UA" -o /dev/null -w "right_token=%{http_code}\n" "https://techcloudpro.com/tcp-analytics/stats.php?s=TcpSecureAdmin2026"
# Expect: 404 / 404 / 200

# I.2 — _secrets.php still denied at Apache layer (post-316 Battery C)
curl -s -A "$UA" -o /dev/null -w "secrets_php=%{http_code}\n" "https://techcloudpro.com/api/_secrets.php"
# Expect: 403 (Battery C from quick-316 must still hold)

# I.3 — _visitor.php still loads _secrets.php cleanly (helper chain integrity)
# Smoke test contact.php → if syntax broke, would return 500
curl -s -A "$UA" -o /dev/null -w "contact_smoke=%{http_code}\n" \
    -X POST -H 'Content-Type: application/json' -d '{}' \
    https://techcloudpro.com/api/contact.php
# Expect: 400 (validation error, NOT 500 — proves PHP parses)

# I.4 — total identified_visitors row count unchanged (no DELETEs)
# Captured in Phase 5 post-state already; re-confirm by counting hot_leads + recent rows in dashboard
```

Save to Battery I (4 sub-checks I.1 / I.2 / I.3 / I.4).

**CLEANUP:**

After Battery G+H complete:

```bash
ssh -p 65002 -i ~/.ssh/id_ed25519 u350621741@147.93.101.51 \
    "rm -f /home/u350621741/domains/techcloudpro.com/public_html/api/_probe-317-*.php"

# Verify all probes removed
for p in keith schema dryrun update verify; do
    curl -s -A "$UA" -o /dev/null -w "_probe-317-${p}.php=%{http_code}\n" \
        "https://techcloudpro.com/api/_probe-317-${p}.php"
done
# Expect: all 404
```

  </action>
  <verify>
1. **Phase 3:** schema probe DESCRIBE shows `is_test TINYINT(1) NOT NULL DEFAULT 0` + `idx_is_test` BTREE index
2. **Phase 4:** dry-run count is in 8-20 range (not 0, not >25), sample rows are clearly synthetic, gate ζ/η respected
3. **Phase 5:** rows_affected matches dry-run count ±1, post_total == pre_total (no deletes), unflagged sample contains real-PII rows or is empty
4. **Phase 6:** `git diff` shows surgical edits in stats.php — exactly 2 SQL blocks gain `iv.is_test = 0` (hot_leads + top_visitors per-window) + 1 block gains it (distinct_identified_people for consistency); pageviews_with_visitor_id and fingerprint_only_identified left UNTOUCHED with explanatory comments
5. **Phase 7:** `git diff` shows _visitor.php INSERT path adds is_test column + auto-flag detection; UPDATE path UNTOUCHED
6. **Deploy:** sha256 of local stats.php matches both api/ AND tcp-analytics/ on server; sha256 of local _visitor.php matches api/ on server
7. **Battery F:** hot_leads count drops from 13 to ≤5 (only is_test=0 rows remain); per-window top_visitors counts drop accordingly
8. **Battery G:** synthetic POST → DB row has is_test=1 + does NOT appear in hot_leads
9. **Battery H:** real-deliverable POST → DB row has is_test=0 + would appear in hot_leads
10. **Battery I:** auth 404/404/200, _secrets.php 403, contact.php 400 (not 500), no probe files left on server
11. Atomic commits in techcloudpro: 1 for stats.php, 1 for _visitor.php (NO `git add -A`)
  </verify>
  <done>
- Schema column live + indexed
- Dry-run + UPDATE both verified, rows_affected captured verbatim, reversibility SQL preserved (id list)
- stats.php deployed to BOTH api/ AND tcp-analytics/ (sha256 match)
- _visitor.php deployed to api/ (sha256 match)
- hot_leads now shows real prospects (Keith if real, no synthetic test rows)
- Future synthetic POSTs auto-flag (Battery G proven)
- Future real POSTs are NOT flagged (Battery H proven)
- All 4 regression checks pass (Battery I)
- All probe files removed from server
- 2 atomic commits in techcloudpro pushed pending (will push in Task 3 SUMMARY only if user re-asks; per CLAUDE.md, default is local-only)
- Note: per CLAUDE.md push policy, the 2 new commits in this task should be pushed in same workflow as Task 1's batch — but only if user has not changed instruction. Default: leave for next session unless plan output explicitly authorizes.
  </done>
</task>

<task type="auto">
  <name>Task 3: Write 317-SUMMARY.md + commit dollor.ai docs</name>
  <files>
    - /Users/jeet/doordash-p2p/.planning/quick/317-tcp-push-clean-test-pollution-push-35-co/317-SUMMARY.md
    - /Users/jeet/doordash-p2p/.planning/STATE.md (append entry)
  </files>
  <action>

Write `/Users/jeet/doordash-p2p/.planning/quick/317-tcp-push-clean-test-pollution-push-35-co/317-SUMMARY.md` mirroring 305-316 SUMMARY style:

**Required sections (in order):**

1. **YAML frontmatter** with `phase`, `plan: 01`, `subsystem: tcp-identity-stack`, `tags`, `dependency-graph` (requires + provides + affects), `tech-stack`, `patterns`, `key-files` (created + modified), `decisions` (push-with-deferred-rotation, flag-not-delete, KEITH_VERDICT, regex DRY with skip-list), `metrics` (duration + completed)

2. **One-liner** — single sentence summarizing the task

3. **What was built** — table with rows for: 35-commit push, schema column, dry-run, UPDATE, stats.php filter (2 blocks + comment), _visitor.php auto-flag, deploy

4. **KEITH_VERDICT verbatim** — REAL or TEST + 1-sentence justification + cite probe output

5. **Verification — verbatim live evidence (per CLAUDE.md protocol)** — 9 batteries A-I with verbatim captured outputs (no truncation, no paraphrase):
   - A: push verification
   - B: Keith audit
   - C: schema migration
   - D: dry-run count + sample
   - E: UPDATE rows-affected + spot-check + reversibility ID list
   - F: stats.php hot_leads + top_visitors filter
   - G: synthetic auto-flag
   - H: real-deliverable not-flagged regression
   - I: 4 regression sub-checks

6. **Privacy stance** — note this is purely classification of existing data (no new collection, no new disclosure required, admin-token gate unchanged)

7. **DB tables touched** — table with: ALTER ADD COLUMN, UPDATE rows, SELECT (no writes from queries)

8. **Files changed** — table mirror 314/315/316 style

9. **Deviations from Plan** — auto-fixed issues (Rules 1-3) + architectural changes (None expected) + out-of-scope items deferred

10. **⚠️ Phase X follow-ups (MANDATORY post-push)** — list at minimum:
    - **#1 ROTATE TCP_BM_SHARED_SECRET** (carryover from 316 — now MANDATORY since old commit 63a9680 is on origin)
    - **#2 ROTATE TCP DB password Thirumala977!** (carryover from 316 — now MANDATORY since old commits b817407+ on origin retain it)
    - **#3 Audit page_views for orphan rows** where visitor_id no longer in identified_visitors (low priority)
    - **#4 Optional hard-DELETE is_test=1 rows after 30 days** (after observing no false positives surface)
    - **#5 Dashboard toggle** to show/hide is_test=1 (filtered server-side only currently — could add client-side toggle to /tcp-analytics/dashboard.html for ad-hoc test verification)
    - **#6 tcp-analytics/* files still inline-secret** (carryover from 316 #3)
    - **#7 Pre-commit hook for techcloudpro** (carryover from 316 #6)

11. **Rollback playbook (3 tiers)**:
    - Tier 1: `UPDATE identified_visitors SET is_test = 0 WHERE id IN (<csv from Phase 5>)` — instant revert of flagging only (stats.php stays filtered, but no rows match → behavior identical to pre-task)
    - Tier 2: revert stats.php + _visitor.php commits + scp rollback (preserves schema + data)
    - Tier 3: ALTER TABLE DROP COLUMN is_test (only if regulatory clean-room rollback required — leaves zero trace)

12. **CR ticket** — Skipped (TCP infrastructure precedent 305-316)

13. **Authentication gates** — None (Hostinger SSH key already installed)

14. **Commit hashes** — table with techcloudpro commit (stats.php) + techcloudpro commit (_visitor.php) + dollor.ai commit (this SUMMARY)

15. **Live URL** — `https://techcloudpro.com/tcp-analytics/stats.php?s=TcpSecureAdmin2026` (browser UA required)

16. **Self-Check** — checklist of 15-20 items mirroring 314/315/316 style + final `## Self-Check: PASSED`

After SUMMARY written, append a single-line entry to STATE.md (top of "Current Position" section per existing pattern) summarizing the task outcome.

Then commit dollor.ai:

```bash
cd /Users/jeet/doordash-p2p
git add .planning/quick/317-tcp-push-clean-test-pollution-push-35-co/317-PLAN.md \
        .planning/quick/317-tcp-push-clean-test-pollution-push-35-co/317-SUMMARY.md \
        .planning/STATE.md
git commit -m "docs(quick-317): TCP push 35 commits + clean test pollution from identified_visitors"
```

Note: per CLAUDE.md push policy, do NOT push dollor.ai unless user explicitly asks.

  </action>
  <verify>
1. `317-SUMMARY.md` exists with all 16 required sections + YAML frontmatter
2. KEITH_VERDICT is explicitly recorded with justification
3. All 9 verification batteries (A-I) contain VERBATIM probe/curl outputs (no paraphrase, no `[truncated]`)
4. 7 Phase X follow-ups documented (with #1 + #2 marked MANDATORY)
5. 3-tier rollback playbook complete with literal SQL for Tier 1
6. Self-Check section passes (final `## Self-Check: PASSED` line present)
7. STATE.md appended with entry
8. dollor.ai commit hash captured (single commit, no `git add -A`)
9. No leaked secrets in committed files (run `git diff HEAD~1 | grep -E "Thirumala977|32817b8c34738c7f4c|sk-ant-api03"` → expect zero matches in additions)
  </verify>
  <done>
- 317-SUMMARY.md is the canonical record of this task — every claim backed by verbatim live evidence
- Phase X follow-ups elevated: BM secret + DB password rotations are now MANDATORY (push made them historical-public on origin)
- STATE.md reflects task completion
- dollor.ai commit created (local only)
- Anyone re-reading 317-SUMMARY.md 3 months later understands: what was pushed, why, what the cleanup did, what's still pending, and how to roll back any layer
  </done>
</task>

</tasks>

<verification>

**Overall phase verification (after all 3 tasks):**

```bash
# Push verification
cd /Users/jeet/techcloudpro && git log origin/main..HEAD --oneline | wc -l
# expect: 0 (all 35 commits on origin, plus the 2 new from Task 2 also pushed if executor authorized)
# OR: 2 (the Task 2 commits — stats.php + _visitor.php — are local only per CLAUDE.md default)
# Either is acceptable; document in SUMMARY which it is

# Schema verification (via probe — already ran in Battery C)
# is_test column exists, idx_is_test index exists

# Data verification (via probe — already ran in Battery E)
# rows_affected captured, total rows unchanged

# Code verification
cd /Users/jeet/techcloudpro
grep -c "iv.is_test = 0" api/stats.php   # expect 3 (hot_leads + top_visitors + distinct_identified_people)
grep -c "is_test_flag" api/_visitor.php  # expect 1
grep -c "VALUES (?, ?, ?, ?, ?, ?, ?, ?)" api/_visitor.php  # expect 1 (8 placeholders, was 7)

# Regression: hot_leads filter (Battery F)
UA="Mozilla/5.0 ... Safari/605.1.15"
curl -s -A "$UA" "https://techcloudpro.com/tcp-analytics/stats.php?s=TcpSecureAdmin2026" \
    | jq '.hot_leads | length'
# expect: ≤5 (only is_test=0 rows; was 13 pre-task)

# Regression: synthetic auto-flag (Battery G)
# Already proven in Task 2 — verify-${TS}@example.com → is_test=1 → not in hot_leads

# Regression: real-deliverable not-flagged (Battery H)
# Already proven in Task 2 — jeetnair.in+q317-real-${TS}@gmail.com → is_test=0

# Regression: auth gate (Battery I.1)
# 404 / 404 / 200

# Regression: _secrets.php apache deny (Battery I.2)
# 403

# No probes left on server (Battery I final)
# All _probe-317-*.php return 404

# Documentation
ls -la .planning/quick/317-tcp-push-clean-test-pollution-push-35-co/
# expect: 317-PLAN.md, 317-SUMMARY.md
```

</verification>

<success_criteria>

1. **35 commits live on origin/main** — `git log origin/main..HEAD --oneline | wc -l == 0` after push
2. **Push risk acknowledged** — SUMMARY explicitly states secrets in old commits + Phase X #1+#2 marked MANDATORY
3. **Keith Vanwey classified** — KEITH_VERDICT (REAL or TEST) with justification cited
4. **Schema migration completed** — `identified_visitors.is_test` column + index exist
5. **Dry-run prevented blind UPDATE** — count + sample inspected before flagging; gates ζ/η respected
6. **Rows flagged, not deleted** — `rows_affected` matches dry-run count ±1; `post_total == pre_total`
7. **Reversibility preserved** — Phase 5 captured exact ID CSV; Tier 1 rollback SQL is `UPDATE ... SET is_test = 0 WHERE id IN (<csv>)`
8. **stats.php filters live** — hot_leads SQL + top_visitors per-window SQL + distinct_identified_people each have `iv.is_test = 0` clause
9. **_visitor.php auto-flag live** — INSERT path detects synthetic patterns (DRY with tcp_notify_new_lead skip-list); UPDATE path untouched
10. **Dual-deploy stats.php** — sha256 of local matches BOTH `/api/stats.php` AND `/tcp-analytics/stats.php` on server
11. **Synthetic auto-flag proven** — Battery G: synthetic POST → is_test=1 + not in hot_leads
12. **Real-deliverable not-flagged** — Battery H: real POST → is_test=0 (regression check, the +alias case)
13. **Auth gates intact** — Battery I.1: 404/404/200 still works
14. **_secrets.php still 403** — Battery I.2: post-316 protection holds
15. **No PHP syntax errors** — Battery I.3: contact.php POST returns 400 (not 500)
16. **All probes deleted** — Battery I.final: 404 on all _probe-317-*.php URLs
17. **2 atomic commits in techcloudpro** — stats.php + _visitor.php as separate commits (NO `git add -A`)
18. **317-SUMMARY.md committed in dollor.ai** — single commit covering PLAN + SUMMARY + STATE.md update
19. **Stop-and-ask gates honored** — gates ε/ζ/η/θ each documented in SUMMARY (even if "not triggered")
20. **TCP-only scope honored** — zero touches to BrandMonkz, AWS Secrets Manager, dollor.ai backend, or any other repo

</success_criteria>

<output>
After completion, create `.planning/quick/317-tcp-push-clean-test-pollution-push-35-co/317-SUMMARY.md` capturing all 9 verification batteries verbatim and committing to dollor.ai (local only per CLAUDE.md push policy).
</output>
