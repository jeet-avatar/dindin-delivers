---
phase: 308-phase-2a-identity-stack-tcp-receiver-for
plan: 01
type: execute
wave: 1
depends_on: ["307-phase-1-identity-stack-form-fill-identit"]
files_modified:
  - "/Users/jeet/techcloudpro/api/identify-from-email.php"   # NEW
  - "/Users/jeet/techcloudpro/index.html"                    # PATCHED — inline JS hook
  - "/Users/jeet/techcloudpro/public/tools/ai-playground.html" # PATCHED — inline JS hook
  - "(server-only) /home/u350621741/domains/techcloudpro.com/public_html/api/identify-from-email.php"
  - "(server-only) /home/u350621741/domains/techcloudpro.com/public_html/index.html"
  - "(server-only) /home/u350621741/domains/techcloudpro.com/public_html/tools/ai-playground.html"
autonomous: true
requirements:
  - "TCP-IDENT-2A-01"   # Email-click identity capture endpoint (stub-mode + future BM API)
  - "TCP-IDENT-2A-02"   # URL-cleaning JS hook before tracker.js fires
  - "TCP-IDENT-2A-03"   # Silent failure mode — never block page rendering
pii_touching: true   # CRITICAL: handles email/name/company; reuses Phase 1 _visitor.php helpers
user_setup: []

must_haves:
  truths:
    - "When techcloudpro.com is loaded with ?_tcp_uid=<id>, the inline JS POSTs that uid to /api/identify-from-email.php BEFORE tracker.js fires its first pageview"
    - "After the POST, the URL no longer contains _tcp_uid (history.replaceState strips it) — so referrer headers, browser history, tracker.js page events, and Ahrefs never see the opaque id"
    - "In stub mode (TCP_IDENTITY_STUB=true + body has email/name/company), the endpoint upserts an identified_visitors row with source_form='email-click' and sets the canonical tcp_vid cookie"
    - "All failure paths (bad uid, malformed JSON, missing uid, BM API down, DB exception) return HTTP 200 + {ok:false} — NEVER 4xx/5xx, NEVER an exception page"
    - "GET requests to the endpoint are rejected with HTTP 405 (only POST allowed)"
    - "stats.php?s=... shows the synthetic email-click visitor in today.identified_visits.top_visitors with source_form='email-click' (Phase 1 JOIN already supports this — zero stats.php code changes)"
    - "Cross-device dedup from Phase 1 still works: same email twice returns the same canonical visitor_id, regardless of incoming uid"
  artifacts:
    - path: "/Users/jeet/techcloudpro/api/identify-from-email.php"
      provides: "Email-click identity capture endpoint (~80 lines)"
      contains: "TCP_IDENTITY_STUB, tcp_upsert_identified_visitor, json_decode"
    - path: "/Users/jeet/techcloudpro/index.html"
      provides: "Inline ~15-line JS hook BEFORE the tracker.js script tag"
      contains: "_tcp_uid, /api/identify-from-email.php, history.replaceState"
    - path: "/Users/jeet/techcloudpro/public/tools/ai-playground.html"
      provides: "Inline ~15-line JS hook BEFORE the tracker.js script tag"
      contains: "_tcp_uid, /api/identify-from-email.php, history.replaceState"
  key_links:
    - from: "index.html / ai-playground.html inline JS"
      to: "POST /api/identify-from-email.php"
      via: "fetch() with credentials:'include' on DOMContentLoaded"
      pattern: "_tcp_uid.*identify-from-email"
    - from: "identify-from-email.php"
      to: "tcp_upsert_identified_visitor() in _visitor.php"
      via: "require_once __DIR__ . '/_visitor.php'"
      pattern: "require_once.*_visitor.php"
    - from: "Inline JS"
      to: "URL state"
      via: "history.replaceState() AFTER fetch() initiated"
      pattern: "history\\.replaceState"
    - from: "Inline JS placement"
      to: "tracker.js"
      via: "must appear EARLIER in <head> than <script async src=\"/tcp-analytics/tracker.js\">"
      pattern: "ordering — verifiable via grep -n on index.html"
---

<objective>
Build the TechCloudPro RECEIVER side of the email-click identity chain. When BrandMonkz wraps an outbound techcloudpro.com URL with `?_tcp_uid=<emailLogId>` (Phase 2b — not yet shipped), the recipient's first pageview must (a) capture identity by linking the opaque uid to a real prospect via the BrandMonkz contact lookup API, (b) write that identity into Phase 1's `identified_visitors` table with `source_form='email-click'`, (c) set the canonical `tcp_vid` cookie so all subsequent pageviews JOIN to the named prospect in `stats.php`, and (d) leave zero PII in the URL/referrer/history.

Purpose: Closes the "WHO clicked the email AND visited which pages" loop. Phase 1 already gave us "WHO filled a form AND visited which pages" — Phase 2a extends the named-visitor surface to anyone who clicks a tagged BrandMonkz email link, even if they never fill a form.

Output:
- New PHP endpoint `/api/identify-from-email.php` (~80 lines) with stub mode for E2E testing today + cURL placeholder for the future BM API call.
- Inline ~15-line JS hook injected into `index.html` and `public/tools/ai-playground.html` BEFORE the tracker.js script tag.
- Verbatim curl/DB evidence proving stub-mode E2E works, all failure modes return 200+{ok:false}, and stats.php JOIN surfaces the synthetic email-click visitor.

⚠️ PII-touching code path: this endpoint receives email + name + company (in stub mode) or fetches them from BrandMonkz (in production mode). Treat with the same care as Phase 1's contact.php / customize-architecture.php / study-guide-download.php.
</objective>

<execution_context>
@/Users/jeet/.claude/get-shit-done/workflows/execute-plan.md
@/Users/jeet/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md
@CLAUDE.md
@.planning/quick/305-build-tcp-analytics-stats-php-on-techclo/305-SUMMARY.md
@.planning/quick/306-extend-tcp-analytics-stats-php-with-traf/306-SUMMARY.md
@.planning/quick/307-phase-1-identity-stack-form-fill-identit/307-SUMMARY.md
@/Users/jeet/techcloudpro/api/_visitor.php
@/Users/jeet/techcloudpro/api/contact.php
@/Users/jeet/techcloudpro/index.html
@/Users/jeet/techcloudpro/public/tools/ai-playground.html
</context>

<tasks>

<task type="auto">
  <name>Task 1: Build identify-from-email.php endpoint + inline JS hooks + deploy to Hostinger</name>
  <files>
    /Users/jeet/techcloudpro/api/identify-from-email.php
    /Users/jeet/techcloudpro/index.html
    /Users/jeet/techcloudpro/public/tools/ai-playground.html
    (server-only) /home/u350621741/domains/techcloudpro.com/public_html/api/identify-from-email.php
    (server-only) /home/u350621741/domains/techcloudpro.com/public_html/index.html
    (server-only) /home/u350621741/domains/techcloudpro.com/public_html/tools/ai-playground.html
  </files>
  <action>
    **Step A — Create `/Users/jeet/techcloudpro/api/identify-from-email.php`** (target: ~80 lines).

    Required structure (in this order — ordering matters because setcookie() must fire before any echo):

    ```php
    <?php
    /**
     * TCP Identity-Stack Phase 2a — Email-click identity receiver.
     *
     * SECURITY NOTE: TCP_IDENTITY_STUB MUST be set to false BEFORE Phase 2b ships
     * to production. While true, the endpoint trusts client-supplied email/name/
     * company in the request body — that is fine for synthetic E2E testing but
     * would be an open identity-injection surface against real users.
     */

    // ⚠️ STUB FLAG — leave true for Phase 2a E2E verification.
    // Set to false the moment BrandMonkz `/api/email-log/<id>/contact` is live (Phase 2b).
    define('TCP_IDENTITY_STUB', true);

    // BM API URL + shared-secret header — placeholders. Wired in Phase 2b.
    define('TCP_BM_LOOKUP_URL', 'https://brandmonkz.com/api/email-log/');
    define('TCP_BM_SHARED_SECRET', 'PHASE_2B_PLACEHOLDER_REPLACE_ME');

    require_once __DIR__ . '/_visitor.php';

    // 1) Method gate — only POST. GET → 405 (the ONLY non-200 response code).
    if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
        http_response_code(405);
        header('Content-Type: application/json');
        echo json_encode(['ok' => false, 'error' => 'method_not_allowed']);
        exit;
    }

    // From here on EVERY failure path returns HTTP 200 + {ok:false}.
    // This guarantees a malformed/malicious request never breaks user pages.
    try {
        // 2) Read + validate body
        $raw = file_get_contents('php://input');
        $body = json_decode($raw, true);
        if (!is_array($body)) { goto fail; }

        $uid = $body['uid'] ?? '';
        // uid format: alphanumeric + dash + underscore, 1..64 chars
        if (!is_string($uid) || $uid === '' || !preg_match('/^[A-Za-z0-9_-]{1,64}$/', $uid)) {
            goto fail;
        }

        // 3) Resolve uid → contact info
        $email = null; $name = null; $company = null;

        if (TCP_IDENTITY_STUB && isset($body['email'], $body['name'], $body['company'])) {
            // STUB MODE — trust client (E2E only; flag MUST be false in real prod)
            $email   = trim((string)$body['email']);
            $name    = trim((string)$body['name']);
            $company = trim((string)$body['company']);
        } else {
            // PRODUCTION MODE — call BrandMonkz lookup (Phase 2b endpoint)
            $ch = curl_init(TCP_BM_LOOKUP_URL . rawurlencode($uid) . '/contact');
            curl_setopt_array($ch, [
                CURLOPT_RETURNTRANSFER => true,
                CURLOPT_TIMEOUT        => 3,                // 3-second cap
                CURLOPT_CONNECTTIMEOUT => 2,
                CURLOPT_HTTPHEADER     => [
                    'Accept: application/json',
                    'X-Identity-Token: ' . TCP_BM_SHARED_SECRET,
                ],
            ]);
            $resp = curl_exec($ch);
            $code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
            curl_close($ch);
            if ($code !== 200 || !$resp) { goto fail; }
            $data = json_decode($resp, true);
            if (!is_array($data) || empty($data['email'])) { goto fail; }
            $email   = trim((string)$data['email']);
            $name    = trim((string)($data['name'] ?? ''));
            $company = trim((string)($data['company'] ?? ''));
        }

        if ($email === '' || !filter_var($email, FILTER_VALIDATE_EMAIL)) { goto fail; }

        // 4) Mint/read tcp_vid cookie (this MUST happen before any echo)
        $vid = tcp_get_or_create_visitor_id();

        // 5) Upsert into identified_visitors with source_form='email-click'
        $pdo = tcp_db();
        $canonical = tcp_upsert_identified_visitor(
            $pdo, $vid, $email, $name, $company, null, 'email-click', $_SERVER['REMOTE_ADDR'] ?? null
        );
        // 6) Cross-device dedup — if canonical differs, rewrite the cookie
        if ($canonical !== $vid) {
            tcp_set_visitor_cookie($canonical);
        }

        header('Content-Type: application/json');
        // Do NOT return raw visitor_id — cookie is set, that's enough.
        echo json_encode(['ok' => true]);
        exit;

    } catch (Throwable $e) {
        error_log('[identify-from-email] exception: ' . $e->getMessage());
        // fall through to fail
    }

    fail:
    header('Content-Type: application/json');
    echo json_encode(['ok' => false]);
    exit;
    ```

    Key spec points (verify all 7 in your finished file):
    1. `TCP_IDENTITY_STUB` defined as a `define()` constant at top, value `true` for this task.
    2. `require_once __DIR__ . '/_visitor.php'` — DO NOT re-implement DB/cookie helpers.
    3. Method gate: only POST → 405. ALL other failure paths → HTTP 200 + `{ok:false}`.
    4. uid validation: regex `/^[A-Za-z0-9_-]{1,64}$/` — rejects `<script>`, SQL, etc.
    5. Stub branch fires ONLY when `TCP_IDENTITY_STUB=true` AND body has email+name+company.
    6. cURL has 3s timeout + 2s connect timeout — never let a slow BM API tie up the Hostinger PHP-FPM worker.
    7. Catch `Throwable` so DB exceptions, OOM, type errors, etc. all degrade to `{ok:false}`.

    **Step B — Patch `/Users/jeet/techcloudpro/index.html`**.

    Current relevant block (lines 7-10):
    ```
        <script src="https://analytics.ahrefs.com/analytics.js" data-key="oz7w6rUoQPs2VLdXREu8tQ" async></script>
        <script async src="/tcp-analytics/tracker.js"></script>
      </head>
    ```

    INSERT the inline hook IMMEDIATELY BEFORE the Ahrefs script tag (so the URL is cleaned even before Ahrefs reads it). Use this verbatim block (it's the spec from the planning context):

    ```html
        <script>
        /* TCP Identity-Stack Phase 2a — capture _tcp_uid from email-click URLs and strip
           it from the URL before tracker.js / ahrefs read referrer/page state. */
        (function() {
          try {
            var p = new URLSearchParams(window.location.search);
            var uid = p.get('_tcp_uid');
            if (!uid) return;
            fetch('/api/identify-from-email.php', {
              method: 'POST',
              credentials: 'include',
              headers: {'Content-Type': 'application/json'},
              body: JSON.stringify({uid: uid})
            }).catch(function(){});
            p.delete('_tcp_uid');
            var newUrl = window.location.pathname + (p.toString() ? '?' + p.toString() : '') + window.location.hash;
            window.history.replaceState({}, '', newUrl);
          } catch (e) { /* silent */ }
        })();
        </script>
    ```

    The resulting `<head>` order MUST be: inline-308-hook → ahrefs → tracker.js. Verify via `grep -n` after the edit.

    **Step C — Patch `/Users/jeet/techcloudpro/public/tools/ai-playground.html`**.

    Current relevant block (lines 7-9):
    ```
    <script src="https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js"></script>
    <script async src="/tcp-analytics/tracker.js"></script>
    ```

    INSERT the same inline hook IMMEDIATELY BEFORE the html2canvas script tag (so it runs before tracker.js).

    Use the EXACT same `<script>` block as Step B — copy/paste, no edits.

    **Step D — Verify .htaccess permits `/api/identify-from-email.php`**.

    Before scp'ing, SSH-check the existing .htaccess in `/api/`:
    ```bash
    ssh -p 65002 u350621741@147.93.101.51 'cat /home/u350621741/domains/techcloudpro.com/public_html/api/.htaccess 2>/dev/null'
    ```

    If output is non-empty AND contains a `FilesMatch` rule that whitelists ONLY specific filenames (similar to the `tcp-analytics/.htaccess` pattern documented in 305-SUMMARY), STOP and ASK the user before deploying. The new endpoint name `identify-from-email.php` is unfamiliar to any existing whitelist and may need an explicit add. If the .htaccess is missing or doesn't gate `*.php` execution, proceed.

    **Step E — Deploy to Hostinger** using the proven scp pattern from 305/306/307:

    ```bash
    # PHP endpoint
    scp -P 65002 /Users/jeet/techcloudpro/api/identify-from-email.php \
        u350621741@147.93.101.51:/home/u350621741/domains/techcloudpro.com/public_html/api/

    # Patched HTMLs
    scp -P 65002 /Users/jeet/techcloudpro/index.html \
        u350621741@147.93.101.51:/home/u350621741/domains/techcloudpro.com/public_html/

    scp -P 65002 /Users/jeet/techcloudpro/public/tools/ai-playground.html \
        u350621741@147.93.101.51:/home/u350621741/domains/techcloudpro.com/public_html/tools/
    ```

    Then SSH and verify the 3 file sizes/timestamps:
    ```bash
    ssh -p 65002 u350621741@147.93.101.51 'ls -la /home/u350621741/domains/techcloudpro.com/public_html/api/identify-from-email.php /home/u350621741/domains/techcloudpro.com/public_html/index.html /home/u350621741/domains/techcloudpro.com/public_html/tools/ai-playground.html'
    ```

    **Step F — Cloudflare cache note**: index.html is likely cached at the CF edge. For verification, append a cache-bust query param (e.g. `?_p2a_smoke=$(date +%s)`) to bypass — DO NOT trigger a CF purge for this task. The cache will expire naturally; the inline hook works regardless of when the cached HTML refreshes.
  </action>
  <verify>
    1. Local file exists: `wc -l /Users/jeet/techcloudpro/api/identify-from-email.php` → expect 60-100 lines.
    2. Stub flag present: `grep -n "TCP_IDENTITY_STUB" /Users/jeet/techcloudpro/api/identify-from-email.php` → 1 define + at least 1 use.
    3. _visitor.php imported: `grep -c "_visitor.php" /Users/jeet/techcloudpro/api/identify-from-email.php` → 1.
    4. Inline hook present in index.html BEFORE tracker.js: `grep -n "_tcp_uid\|tracker.js\|ahrefs" /Users/jeet/techcloudpro/index.html` — line(s) for `_tcp_uid` MUST be lower-numbered than the `tracker.js` line.
    5. Same check for ai-playground.html: `grep -n "_tcp_uid\|tracker.js" /Users/jeet/techcloudpro/public/tools/ai-playground.html` — `_tcp_uid` line < `tracker.js` line.
    6. Server file deployed: `ssh ... ls -la .../api/identify-from-email.php` returns size > 1500 bytes (sanity).
    7. Server HTML carries the hook: `ssh ... grep -c "_tcp_uid" .../index.html .../tools/ai-playground.html` → both files return ≥1.
  </verify>
  <done>
    - Local: `identify-from-email.php` written with stub-mode + BM cURL placeholder + Throwable catch + uid regex + 405-on-GET.
    - Local: `index.html` and `public/tools/ai-playground.html` both have the inline hook in the right position (before tracker.js).
    - Server: all 3 files deployed via scp, sizes verified via ssh.
    - .htaccess in /api/ either permits the new file outright OR (if it gates by filename) the user has been asked and approval recorded.
  </done>
</task>

<task type="auto">
  <name>Task 2: E2E verification — stub-mode happy path + 5 failure modes + stats.php JOIN proof + cross-device dedup</name>
  <files>
    /Users/jeet/doordash-p2p/.planning/quick/308-phase-2a-identity-stack-tcp-receiver-for/308-SUMMARY.md (created)
  </files>
  <action>
    Run the full verification battery and paste verbatim curl/DB outputs into 308-SUMMARY.md. Per CLAUDE.md verification protocol: "I updated the file" is NOT proof — RUN it, SHOW the output, TRACE the code path.

    **Mandatory tooling notes (from 305/306/307 deviations — do not repeat):**
    - All curl tests MUST use a Safari User-Agent: `-A "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15"`. Default `curl/8.x` UA gets 403 from Cloudflare WAF.
    - Hostinger SSH is `host=147.93.101.51 port=65002 user=u350621741`. Domain `techcloudpro.com:22` does NOT route SSH.
    - Use unique synthetic email per run: `tcp-308-emailclick-$(date +%s)@example.com`.

    **Test 1 — Stub-mode happy path (HTTP 200 + {ok:true} + Set-Cookie header):**

    ```bash
    UA="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15"
    EMAIL="tcp-308-emailclick-$(date +%s)@example.com"
    curl -sS -i -A "$UA" -X POST \
      -H 'Content-Type: application/json' \
      --cookie-jar /tmp/308-jar1.txt \
      -d "{\"uid\":\"308-stub-test\",\"email\":\"$EMAIL\",\"name\":\"Phase 2a Test\",\"company\":\"BrandMonkz Email Test\"}" \
      'https://techcloudpro.com/api/identify-from-email.php'
    ```

    Expected: `HTTP/2 200`, body `{"ok":true}`, response includes `set-cookie: tcp_vid=<32-hex>; ...; domain=.techcloudpro.com`.

    Capture the verbatim response. SAVE the cookie jar — Test 6 reuses it.

    **Test 2 — DB row landed with source_form='email-click':**

    Use the same synthetic-probe pattern from 307-SUMMARY (deploy a tiny PHP probe under /tcp-analytics/, scp + curl + delete). Probe body:

    ```php
    <?php
    require __DIR__ . '/../api/_visitor.php';
    header('Content-Type: application/json');
    $pdo = tcp_db();
    $stmt = $pdo->prepare("SELECT visitor_id, email, name, company, source_form, first_seen_at FROM identified_visitors WHERE source_form='email-click' AND email LIKE 'tcp-308-emailclick-%' ORDER BY first_seen_at DESC LIMIT 5");
    $stmt->execute();
    echo json_encode(['rows' => $stmt->fetchAll(PDO::FETCH_ASSOC)], JSON_PRETTY_PRINT);
    ```

    Save probe at `/Users/jeet/doordash-p2p/.planning/quick/308-phase-2a-identity-stack-tcp-receiver-for/_probe-308.php` (gitignored), scp under tcp-analytics/, curl-fetch with the admin token if .htaccess requires whitelisting (otherwise drop in /api/ and curl directly), capture output, then SSH-delete the probe.

    Expected: at least 1 row matching `email=$EMAIL`, `name="Phase 2a Test"`, `company="BrandMonkz Email Test"`, `source_form="email-click"`. Save verbatim.

    **Test 3 — stats.php JOIN surfaces the synthetic email-click visitor:**

    First, fire a tracker.js pageview as the same visitor so the JOIN produces a row:
    ```bash
    curl -sS -A "$UA" -X POST \
      --cookie /tmp/308-jar1.txt \
      -H 'Content-Type: application/json' \
      -d '{"page":"/308-emailclick-test-page","session_id":"308sess1","referrer":""}' \
      'https://techcloudpro.com/tcp-analytics/collect.php'
    ```

    Then hit stats:
    ```bash
    curl -sS -A "$UA" 'https://techcloudpro.com/tcp-analytics/stats.php?s=TcpSecureAdmin2026' \
      | python3 -c "import json, sys; d=json.load(sys.stdin); tv=d['windows']['today']['identified_visits']['top_visitors']; print(json.dumps([v for v in tv if v['source_form']=='email-click'], indent=2))"
    ```

    Expected: at least 1 entry with `source_form='email-click'`, the synthetic email, and `pageviews >= 1`. Save verbatim.

    **Test 4 — Failure modes (each MUST return HTTP 200 + {ok:false}, EXCEPT GET which is 405):**

    ```bash
    # 4a — GET → 405
    curl -sS -i -A "$UA" 'https://techcloudpro.com/api/identify-from-email.php'
    # 4b — Malformed JSON body → 200 + {ok:false}
    curl -sS -i -A "$UA" -X POST -H 'Content-Type: application/json' \
      -d 'not-json{' 'https://techcloudpro.com/api/identify-from-email.php'
    # 4c — Missing uid → 200 + {ok:false}
    curl -sS -i -A "$UA" -X POST -H 'Content-Type: application/json' \
      -d '{}' 'https://techcloudpro.com/api/identify-from-email.php'
    # 4d — Bad uid (HTML injection) → 200 + {ok:false}
    curl -sS -i -A "$UA" -X POST -H 'Content-Type: application/json' \
      -d '{"uid":"<script>alert(1)</script>"}' 'https://techcloudpro.com/api/identify-from-email.php'
    # 4e — Bad uid (too long >64) → 200 + {ok:false}
    curl -sS -i -A "$UA" -X POST -H 'Content-Type: application/json' \
      -d "{\"uid\":\"$(printf 'a%.0s' {1..65})\"}" 'https://techcloudpro.com/api/identify-from-email.php'
    ```

    Expected results table (paste into SUMMARY):
    | Test | Method | Body | Status | Body |
    |------|--------|------|--------|------|
    | 4a | GET | (none) | 405 | `{"ok":false,"error":"method_not_allowed"}` |
    | 4b | POST | `not-json{` | 200 | `{"ok":false}` |
    | 4c | POST | `{}` | 200 | `{"ok":false}` |
    | 4d | POST | `{"uid":"<script>..."}` | 200 | `{"ok":false}` |
    | 4e | POST | `{"uid":"a"*65}` | 200 | `{"ok":false}` |

    **Test 5 — Live JS hook present in served HTML:**

    ```bash
    curl -sS -A "$UA" 'https://techcloudpro.com/?_phase2a_smoke=1' \
      | grep -E '_tcp_uid|tracker.js' | head -5
    ```

    Expected: lines for `_tcp_uid` AND `tracker.js`. The `_tcp_uid` line MUST appear FIRST (earlier line position) in the output. If CF caches old HTML (no `_tcp_uid` match), retry after appending a fresh cache-bust param OR document that CF purge is needed and stop.

    Repeat for ai-playground:
    ```bash
    curl -sS -A "$UA" 'https://techcloudpro.com/tools/ai-playground.html?_phase2a_smoke=1' \
      | grep -E '_tcp_uid|tracker.js' | head -5
    ```

    **Test 6 — Cross-device dedup (Phase 1 behavior preserved through Phase 2a):**

    Re-submit the SAME synthetic email with NO cookie (fresh jar):
    ```bash
    curl -sS -i -A "$UA" -X POST \
      -H 'Content-Type: application/json' \
      --cookie-jar /tmp/308-jar2.txt \
      -d "{\"uid\":\"308-stub-test-2\",\"email\":\"$EMAIL\",\"name\":\"Phase 2a Test\",\"company\":\"BrandMonkz Email Test\"}" \
      'https://techcloudpro.com/api/identify-from-email.php'
    ```

    Expected: TWO `Set-Cookie: tcp_vid=...` headers in the response — one with a brand-new mint, then one rewriting to the canonical (first-seen) visitor_id.

    Then diff the cookie jars:
    ```bash
    grep tcp_vid /tmp/308-jar1.txt /tmp/308-jar2.txt
    ```

    Expected: BOTH jars end with the SAME `tcp_vid` value (the canonical first-seen one). Save verbatim.

    **Step Z — Write `308-SUMMARY.md`** following the 307-SUMMARY structure:
    - Frontmatter (phase/plan/tags/dependency-graph/tech-stack/key-files/decisions/metrics)
    - One-liner
    - What was built
    - Verification — verbatim live evidence (Tests 1-6 with curl outputs)
    - Privacy stance (call out: STUB MODE active; MUST be flipped to false in Phase 2b)
    - Files changed
    - Deviations from Plan (any auto-fixes)
    - **Phase 2b TODO section** (REQUIRED — this is the BrandMonkz side):
      1. BrandMonkz must build `GET /api/email-log/<id>/contact` returning `{email, name, company}`, gated by `X-Identity-Token` shared secret
      2. BrandMonkz click-tracking redirect must wrap outbound `techcloudpro.com` URLs as `<original-url>?_tcp_uid=<emailLogId>` (preserve any existing query params in original URL)
      3. Generate shared secret, store in BM env (`TCP_IDENTITY_TOKEN`) AND on Hostinger (replace `TCP_BM_SHARED_SECRET` placeholder in identify-from-email.php)
      4. Once Phase 2b ships: SSH to Hostinger and flip `define('TCP_IDENTITY_STUB', true)` → `false` in `/api/identify-from-email.php`. After that, the stub branch is dead code and synthetic E2E tests will fail — that is expected.
    - CR ticket (skip — TCP infra)
    - Auth gates (none — SSH key already installed)
    - Commit hashes (techcloudpro repo + dollor.ai repo)
    - Live URL (`https://techcloudpro.com/api/identify-from-email.php`)
    - Self-Check (boxed list with FOUND/MISSING per artifact)
  </action>
  <verify>
    - `308-SUMMARY.md` exists and contains all 6 test sections with verbatim curl output (no paraphrasing).
    - SUMMARY's "Phase 2b TODO" section enumerates all 4 follow-up items above.
    - SUMMARY's "Privacy stance" explicitly notes STUB mode is on and MUST be flipped after 2b.
    - All 5 failure-mode rows in the table show the expected status + body.
    - Test 6 jar diff shows identical canonical `tcp_vid` across both jars.
    - Test 3 stats.php output contains at least 1 row with `source_form='email-click'`.
  </verify>
  <done>
    - 6/6 tests executed with verbatim output captured in SUMMARY.
    - DB has at least 1 `identified_visitors` row with `source_form='email-click'` and the synthetic email.
    - stats.php JOIN surfaces the synthetic email-click visitor in `today.identified_visits.top_visitors`.
    - All 5 failure modes return HTTP 200 + `{ok:false}` (except GET → 405).
    - Cross-device dedup proven (jar diff shows canonical vid reuse).
    - Phase 2b TODO is explicit and complete.
    - Synthetic probe file deleted from server (or kept for one re-verification cycle then deleted — note in SUMMARY).
  </done>
</task>

</tasks>

<verification>
**Layer-by-layer verification (per CLAUDE.md verification protocol):**

- **Backend (PHP endpoint)**:
  - grep proof: `identify-from-email.php` contains `TCP_IDENTITY_STUB`, `_visitor.php`, `tcp_upsert_identified_visitor`, regex `/^[A-Za-z0-9_-]{1,64}$/`, `Throwable` catch.
  - run proof: 6 curl tests produce expected status codes + bodies (Test 1: 200+ok, Tests 4a-e: 405/200×4, Test 6: dual Set-Cookie).

- **Database (identified_visitors)**:
  - file:line proof: `_visitor.php:99` (canonical lookup branch), `_visitor.php:113` (insert-or-update), already verified live in 307.
  - run proof: synthetic-probe query returns row with email + source_form='email-click'.

- **Frontend (inline JS hook)**:
  - file:line trace: `index.html:7` (new hook) → `index.html:8` (ahrefs) → `index.html:9` (tracker.js). Same ordering in `public/tools/ai-playground.html`.
  - run proof: live curl of homepage HTML shows `_tcp_uid` script BEFORE `tracker.js` script tag.

- **End-to-end (the full chain)**:
  - Cookie minted by PHP → tracker.js reads it on next pageview → collect.php INSERTs into page_views.visitor_id → stats.php JOINs to identified_visitors → email-click visitor surfaces in `top_visitors` block. Test 3 proves the entire chain.

- **Privacy & failure-mode invariants**:
  - 5 failure modes return HTTP 200 (page-safe) — Tests 4b/4c/4d/4e + Throwable catch.
  - URL is stripped of `_tcp_uid` via `history.replaceState` — verifiable via `grep` on hook source (Test 5 indirectly confirms presence).
  - Stub mode disclosed in SUMMARY with explicit "flip to false" instruction for Phase 2b.
</verification>

<success_criteria>
1. PHP endpoint `/api/identify-from-email.php` deployed and serves on `https://techcloudpro.com/api/identify-from-email.php`.
2. Inline hook present in BOTH `index.html` and `public/tools/ai-playground.html`, positioned BEFORE tracker.js.
3. Stub-mode happy path: HTTP 200 + `{ok:true}` + valid Set-Cookie tcp_vid header.
4. All 5 documented failure modes return either HTTP 200+{ok:false} (4 cases) or HTTP 405 (GET only).
5. `identified_visitors` row created with `source_form='email-click'` for synthetic test email.
6. `stats.php?s=...` `windows.today.identified_visits.top_visitors` includes the synthetic email-click visitor with pageviews >= 1.
7. Cross-device dedup: same email submitted twice → same canonical `tcp_vid`.
8. SUMMARY documents Phase 2b TODO (4 items: BM endpoint, URL wrapping, shared secret, flip stub flag).
9. SUMMARY explicitly flags STUB mode as a Phase 2b release-blocker.
10. Both repos committed (techcloudpro: feat; dollor.ai: docs).
</success_criteria>

<output>
After completion, create `/Users/jeet/doordash-p2p/.planning/quick/308-phase-2a-identity-stack-tcp-receiver-for/308-SUMMARY.md` following the 307-SUMMARY structure (frontmatter + one-liner + what was built + verbatim verification + privacy stance + Phase 2b TODO + files changed + deviations + commit hashes + self-check).
</output>
