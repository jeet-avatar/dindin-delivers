---
phase: 310-phase-3-identity-stack-first-party-brows
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  # NEW
  - /Users/jeet/techcloudpro/public/tcp-analytics/fingerprint.js
  # PATCHED (local repo)
  - /Users/jeet/techcloudpro/api/_visitor.php
  - /Users/jeet/techcloudpro/api/collect.php
  - /Users/jeet/techcloudpro/api/stats.php
  - /Users/jeet/techcloudpro/index.html
  - /Users/jeet/techcloudpro/public/tools/ai-playground.html
  - /Users/jeet/techcloudpro/src/pages/PrivacyPolicy.tsx
  # PATCHED (server-only — exists on Hostinger; baseline scp first)
  - /Users/jeet/techcloudpro/public/tcp-analytics/tracker.js
  # SCHEMA MIGRATION
  - .planning/quick/310-phase-3-identity-stack-first-party-brows/FP_SCHEMA_PROBE.md
autonomous: false
requirements:
  - PRIV-310-DNT-CLIENT
  - PRIV-310-DNT-SERVER
  - PRIV-310-GPC-CLIENT
  - PRIV-310-GPC-SERVER
  - PRIV-310-OPTOUT-LOCALSTORAGE
  - PRIV-310-OPTOUT-URLPARAM
  - PRIV-310-FIRST-PARTY-ONLY
  - PRIV-310-HASH-NOT-SIGNALS
  - PRIV-310-DISCLOSURE
  - FP-310-COMPUTE-9-SIGNALS
  - FP-310-SHA256-VIA-SUBTLECRYPTO
  - FP-310-COOKIE-CLEAR-DEDUPE
  - FP-310-CANONICAL-LOOKUP
  - FP-310-STATS-FP-ONLY-COUNT
  - FP-310-SCHEMA-MIGRATION
  - FP-310-TRACKER-BASELINE-FIRST
must_haves:
  privacy_classification: fingerprinting
  truths:
    - "PII/tracking-touching: stores device fingerprint hash linked to visitor_id"
    - "Privacy-respecting: DNT and GPC are gates at BOTH client and server layers (defense-in-depth)"
    - "First-party only: hash never leaves our DB; no external services receive it"
    - "Hash-only storage: SHA256 32-char output stored, raw signal values are never persisted"
    - "User opt-out persists: ?_tcp_no_fp=1 sets localStorage flag forever; hook respects it on every subsequent visit"
    - "Disclosure-required: privacy policy MUST be updated and live on site before deploy is complete"
    - "Cookie-clear dedup works: same device with cleared cookie matches existing identified_visitors row via fingerprint"
  artifacts:
    - path: /Users/jeet/techcloudpro/public/tcp-analytics/fingerprint.js
      provides: "Async-loaded device-fingerprint module: collects 9 signals, SHA256 via SubtleCrypto, gates DNT/GPC/opt-out BEFORE any signal collection"
      min_lines: 100
    - path: /Users/jeet/techcloudpro/public/tcp-analytics/tracker.js
      provides: "Patched: load fingerprint.js, await result, pass device_fingerprint to collect.php (after baseline scp from server)"
    - path: /Users/jeet/techcloudpro/api/collect.php
      provides: "Server-side DNT/GPC defense-in-depth: stores NULL device_fingerprint when HTTP_DNT=1 or HTTP_SEC_GPC=1; canonical visitor_id lookup by fingerprint"
    - path: /Users/jeet/techcloudpro/api/_visitor.php
      provides: "tcp_lookup_by_fingerprint(PDO, string $fp): ?string — returns canonical visitor_id or null"
    - path: /Users/jeet/techcloudpro/api/stats.php
      provides: "fingerprint_only_identified count per window (visitors known by fingerprint but with NULL email)"
    - path: /Users/jeet/techcloudpro/index.html
      provides: "?_tcp_no_fp=1 URL param handling: sets localStorage tcp_no_fp=1, strips param via history.replaceState BEFORE tracker fires"
    - path: /Users/jeet/techcloudpro/public/tools/ai-playground.html
      provides: "Same opt-out URL param handling as index.html"
    - path: /Users/jeet/techcloudpro/src/pages/PrivacyPolicy.tsx
      provides: "Disclosure paragraph: first-party fingerprinting, DNT/GPC honored, opt-out URL param documented"
    - schema:
        table: identified_visitors
        column: device_fingerprint
        ddl: "ALTER TABLE identified_visitors ADD COLUMN device_fingerprint VARCHAR(64) NULL, ADD INDEX idx_device_fingerprint (device_fingerprint)"
    - schema:
        table: page_views
        column: device_fingerprint
        ddl: "ALTER TABLE page_views ADD COLUMN device_fingerprint VARCHAR(64) NULL, ADD INDEX idx_device_fingerprint (device_fingerprint)"
  key_links:
    - from: "fingerprint.js"
      to: "tracker.js"
      via: "async load + window-scoped function call"
      pattern: "loadFingerprint\\(|window\\.tcpFingerprint"
    - from: "tracker.js"
      to: "collect.php"
      via: "POST body field device_fingerprint"
      pattern: "device_fingerprint"
    - from: "collect.php"
      to: "_visitor.php tcp_lookup_by_fingerprint()"
      via: "canonical lookup before INSERT"
      pattern: "tcp_lookup_by_fingerprint"
    - from: "index.html / tools/ai-playground.html opt-out hook"
      to: "localStorage tcp_no_fp"
      via: "_tcp_no_fp=1 URL param sets localStorage flag, then history.replaceState strips param"
      pattern: "_tcp_no_fp|tcp_no_fp"
    - from: "Phase 1 SUMMARY"
      to: ".planning/quick/307-phase-1-identity-stack-form-fill-identit/307-SUMMARY.md"
      via: "Reuse identified_visitors schema + _visitor.php helpers"
    - from: "Phase 2a SUMMARY"
      to: ".planning/quick/308-phase-2a-identity-stack-tcp-receiver-for/308-SUMMARY.md"
      via: "Inline JS hook pattern + history.replaceState URL strip"
---

<objective>
Phase 3 of the TCP identity-stack: add first-party browser fingerprinting to techcloudpro.com so that when a known visitor (already in `identified_visitors` from Phase 1 form-fills or Phase 2 email-clicks) clears their `tcp_vid` cookie, the next pageview re-identifies them via a SHA256 hash of 9 stable device-level signals — restoring the canonical `visitor_id` and avoiding a duplicate row.

Privacy posture is NON-NEGOTIABLE: DNT and GPC headers gate the entire fingerprint at BOTH client and server, an `?_tcp_no_fp=1` URL param + `localStorage.tcp_no_fp` provide a permanent user-driven opt-out, the hash is first-party only (never sent to external services), only the SHA256 output is persisted (raw signals never), and the existing /privacy-policy page MUST be updated with a disclosure paragraph before deploy is complete.

Purpose: cookie-clear dedup is the single biggest source of inflation in `identified_visitors` since Phase 1 shipped. Fingerprint matching closes the gap.

Output:
- New `fingerprint.js` (~150 lines) deployed to `/tcp-analytics/fingerprint.js`
- Patched `tracker.js`, `collect.php`, `_visitor.php`, `stats.php`, `index.html`, `tools/ai-playground.html`, `PrivacyPolicy.tsx`
- Schema migration via one-shot probe (mirrors 305/307 pattern), probe deleted post-migration
- Live E2E proof of cookie-clear dedup with verbatim curl/DB outputs in SUMMARY
</objective>

<execution_context>
@/Users/jeet/.claude/get-shit-done/workflows/execute-plan.md
@/Users/jeet/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md
@/Users/jeet/doordash-p2p/CLAUDE.md
@.planning/quick/305-build-tcp-analytics-stats-php-on-techclo/305-SUMMARY.md
@.planning/quick/307-phase-1-identity-stack-form-fill-identit/307-SUMMARY.md
@.planning/quick/308-phase-2a-identity-stack-tcp-receiver-for/308-SUMMARY.md
@.planning/quick/309-phase-2b-identity-stack-brandmonkz-sende/309-SUMMARY.md
@/Users/jeet/techcloudpro/api/_visitor.php
@/Users/jeet/techcloudpro/index.html
</context>

<deploy_constants>
SSH host: 147.93.101.51
SSH port: 65002
SSH user: u350621741
SSH key: ~/.ssh/id_ed25519
Web root: /home/u350621741/domains/techcloudpro.com/public_html
Auth gate (stats.php): ?s=TcpSecureAdmin2026 (via hash_equals)
WAF rule: Cloudflare blocks default curl UA — ALL test curls MUST use Safari UA
Safari UA: Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15
DB creds (inline pattern from 305+): host=localhost db=u350621741_visitors user=u350621741_jeet977 pw=Thirumala977!
Frontend bundle: techcloudpro is a Vite SPA — PrivacyPolicy.tsx changes require `npm run build` then dist/ deploy
</deploy_constants>

<tasks>

<task type="auto">
  <name>Task 1: Schema migration + locate privacy policy + scp tracker.js baseline + write all code locally (no deploys)</name>
  <files>
    /Users/jeet/doordash-p2p/.planning/quick/310-phase-3-identity-stack-first-party-brows/FP_SCHEMA_PROBE.md
    /Users/jeet/techcloudpro/public/tcp-analytics/tracker.js
    /Users/jeet/techcloudpro/public/tcp-analytics/fingerprint.js
    /Users/jeet/techcloudpro/api/_visitor.php
    /Users/jeet/techcloudpro/api/collect.php
    /Users/jeet/techcloudpro/api/stats.php
    /Users/jeet/techcloudpro/index.html
    /Users/jeet/techcloudpro/public/tools/ai-playground.html
    /Users/jeet/techcloudpro/src/pages/PrivacyPolicy.tsx
  </files>
  <action>
    Pre-flight gates (STOP-and-ask if any fails):

    1. **Confirm privacy policy file is editable** — `/Users/jeet/techcloudpro/src/pages/PrivacyPolicy.tsx` already exists (route `/privacy-policy`, section "Cookies and Tracking Technologies" at line ~33-35). If for any reason this file is missing/unreadable, STOP and ask user. Confirmed reachable: `https://techcloudpro.com/privacy-policy`.

    2. **scp tracker.js baseline DOWN** (the server is the source of truth — local repo has no `public/tcp-analytics/` dir):
       ```bash
       mkdir -p /Users/jeet/techcloudpro/public/tcp-analytics
       scp -P 65002 -i ~/.ssh/id_ed25519 \
         u350621741@147.93.101.51:/home/u350621741/domains/techcloudpro.com/public_html/tcp-analytics/tracker.js \
         /Users/jeet/techcloudpro/public/tcp-analytics/tracker.js
       ```
       If the scp fails (file doesn't exist on server), STOP and ask user — the entire phase depends on tracker.js existing on the server.

    3. **Commit unchanged tracker.js baseline FIRST** — this protects against destructive overwrite of any server-only changes:
       ```bash
       cd /Users/jeet/techcloudpro
       git add public/tcp-analytics/tracker.js
       git commit -m "chore(tcp-analytics): import tracker.js baseline from server (pre-fp patch)"
       ```

    4. **Schema migration via one-shot probe** (mirror 305/307 pattern). Create `_probe-310-fp-schema.php` ONLY on the server (NOT in local repo), gated by `?s=TcpSecureAdmin2026` token, body:
       ```php
       <?php
       header('Content-Type: application/json');
       if (!hash_equals('TcpSecureAdmin2026', $_GET['s'] ?? '')) { http_response_code(404); exit; }
       require_once __DIR__ . '/_visitor.php';
       try {
         $pdo = tcp_db();
         $migrations = [];
         try {
           $pdo->exec("ALTER TABLE identified_visitors ADD COLUMN device_fingerprint VARCHAR(64) NULL, ADD INDEX idx_device_fingerprint (device_fingerprint)");
           $migrations[] = ['step' => 'identified_visitors.device_fingerprint', 'result' => 'OK'];
         } catch (Throwable $e) { $migrations[] = ['step' => 'identified_visitors.device_fingerprint', 'result' => 'ERR: ' . $e->getMessage()]; }
         try {
           $pdo->exec("ALTER TABLE page_views ADD COLUMN device_fingerprint VARCHAR(64) NULL, ADD INDEX idx_device_fingerprint (device_fingerprint)");
           $migrations[] = ['step' => 'page_views.device_fingerprint', 'result' => 'OK'];
         } catch (Throwable $e) { $migrations[] = ['step' => 'page_views.device_fingerprint', 'result' => 'ERR: ' . $e->getMessage()]; }
         $iv = $pdo->query("DESCRIBE identified_visitors")->fetchAll(PDO::FETCH_ASSOC);
         $pv = $pdo->query("DESCRIBE page_views")->fetchAll(PDO::FETCH_ASSOC);
         echo json_encode(['migrations' => $migrations, 'identified_visitors' => $iv, 'page_views' => $pv], JSON_PRETTY_PRINT);
       } catch (Throwable $e) { echo json_encode(['fatal' => $e->getMessage()]); }
       ```
       Deploy probe to `/api/_probe-310-fp-schema.php`. Hit it with Safari UA + `?s=TcpSecureAdmin2026`. Save verbatim JSON output to `FP_SCHEMA_PROBE.md`.

       If EITHER ALTER fails with anything other than "Duplicate column name" (idempotency), STOP and ask user — do NOT proceed.

       Delete probe immediately: `ssh ... 'rm /home/.../api/_probe-310-fp-schema.php'`. Verify removed.

    5. **Write `fingerprint.js`** (~150 lines, NEW) at `/Users/jeet/techcloudpro/public/tcp-analytics/fingerprint.js`. Public API: expose `window.tcpComputeFingerprint()` returning `Promise<string|null>` (32-hex SHA256 or `null` if opted out / errored). Structure:

       ```js
       /* TCP Identity-Stack Phase 3 — first-party device fingerprint.
          Privacy: gates DNT, GPC, and localStorage tcp_no_fp BEFORE any signal collection.
          First-party only — hash never leaves techcloudpro.com.
          Hash-only — only the SHA256 output is persisted; raw signals are never sent. */
       (function () {
         async function tcpComputeFingerprint() {
           try {
             // PRIVACY GATES — early return BEFORE any signal collection
             if (navigator.doNotTrack === '1' || window.doNotTrack === '1' || navigator.msDoNotTrack === '1') return null;
             // Sec-GPC is exposed as navigator.globalPrivacyControl on supporting browsers
             if (navigator.globalPrivacyControl === true) return null;
             try {
               if (window.localStorage && window.localStorage.getItem('tcp_no_fp') === '1') return null;
             } catch (_) { /* localStorage may throw in private mode — treat as opt-out */ return null; }
             if (!window.crypto || !window.crypto.subtle || !window.crypto.subtle.digest) return null;

             // SIGNAL COLLECTION — wrapped in try-blocks; missing signals just become empty strings
             const signals = [];
             // 1. Canvas
             try {
               const c = document.createElement('canvas');
               c.width = 200; c.height = 50;
               const ctx = c.getContext('2d');
               ctx.textBaseline = 'top';
               ctx.font = '14px Arial';
               ctx.fillStyle = '#f60';
               ctx.fillRect(125, 1, 62, 20);
               ctx.fillStyle = '#069';
               ctx.fillText('TCP-fp-310', 2, 15);
               ctx.fillStyle = 'rgba(102, 204, 0, 0.7)';
               ctx.fillText('TCP-fp-310', 4, 17);
               signals.push(c.toDataURL());
             } catch (_) { signals.push(''); }
             // 2. Audio (use OfflineAudioContext oscillator render)
             try {
               const AC = window.OfflineAudioContext || window.webkitOfflineAudioContext;
               if (AC) {
                 const ac = new AC(1, 5000, 44100);
                 const osc = ac.createOscillator();
                 osc.type = 'triangle';
                 osc.frequency.value = 10000;
                 const compressor = ac.createDynamicsCompressor();
                 osc.connect(compressor); compressor.connect(ac.destination);
                 osc.start(0);
                 const buf = await ac.startRendering();
                 let sum = 0;
                 const data = buf.getChannelData(0);
                 for (let i = 0; i < data.length; i++) sum += Math.abs(data[i]);
                 signals.push(sum.toFixed(8));
               } else { signals.push(''); }
             } catch (_) { signals.push(''); }
             // 3. WebGL
             try {
               const gl = document.createElement('canvas').getContext('webgl');
               if (gl) {
                 const dbg = gl.getExtension('WEBGL_debug_renderer_info');
                 const vendor = dbg ? gl.getParameter(dbg.UNMASKED_VENDOR_WEBGL) : '';
                 const renderer = dbg ? gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL) : '';
                 signals.push(vendor + '|' + renderer);
               } else { signals.push(''); }
             } catch (_) { signals.push(''); }
             // 4. Screen
             signals.push([screen.width, screen.height, screen.colorDepth, screen.pixelDepth, window.devicePixelRatio || 1].join('x'));
             // 5. Fonts (cheap proxy: list a few common fonts and measure widths)
             try {
               const baseFonts = ['monospace', 'sans-serif', 'serif'];
               const testFonts = ['Arial', 'Verdana', 'Times New Roman', 'Courier New', 'Helvetica', 'Georgia', 'Comic Sans MS'];
               const span = document.createElement('span');
               span.style.position = 'absolute'; span.style.left = '-9999px'; span.style.fontSize = '72px';
               span.textContent = 'mmmmmmmmmmlli';
               document.body.appendChild(span);
               const baseWidths = {};
               for (const bf of baseFonts) { span.style.fontFamily = bf; baseWidths[bf] = span.offsetWidth; }
               const detected = [];
               for (const tf of testFonts) {
                 for (const bf of baseFonts) {
                   span.style.fontFamily = `'${tf}', ${bf}`;
                   if (span.offsetWidth !== baseWidths[bf]) { detected.push(tf); break; }
                 }
               }
               document.body.removeChild(span);
               signals.push(detected.sort().join(','));
             } catch (_) { signals.push(''); }
             // 6. Timezone
             try { signals.push(Intl.DateTimeFormat().resolvedOptions().timeZone || ''); } catch (_) { signals.push(''); }
             // 7. Hardware concurrency
             signals.push(String(navigator.hardwareConcurrency || ''));
             // 8. Touch support
             signals.push([navigator.maxTouchPoints || 0, ('ontouchstart' in window) ? 1 : 0].join('|'));
             // 9. UA + platform + language
             signals.push([navigator.userAgent || '', navigator.platform || '', (navigator.languages || [navigator.language || '']).join(',')].join('|'));

             // HASH — SHA256, take first 32 hex chars (column is VARCHAR(64) so full 64 also valid; choose 64 for collision resistance)
             const enc = new TextEncoder();
             const buf = await window.crypto.subtle.digest('SHA-256', enc.encode(signals.join('||')));
             const arr = new Uint8Array(buf);
             let hex = '';
             for (let i = 0; i < arr.length; i++) hex += arr[i].toString(16).padStart(2, '0');
             return hex; // 64 hex chars
           } catch (_) {
             return null; // never throw
           }
         }
         window.tcpComputeFingerprint = tcpComputeFingerprint;
       })();
       ```

       Privacy invariants verified by code review:
       - Lines 4-9 (gates) execute BEFORE any signal collection (lines 11+).
       - Hash output is the ONLY thing returned. Raw `signals[]` array is local-scope-only and garbage collected.
       - Function `return null` on any opt-out path — caller knows to skip the POST.
       - All errors swallowed (returns null). Never throws, never blocks page render.

    6. **Patch `tracker.js`** (locally, AFTER baseline commit) to:
       a. Async-load `fingerprint.js`: `var s = document.createElement('script'); s.src = '/tcp-analytics/fingerprint.js'; s.async = true; document.head.appendChild(s);`
       b. On pageview send: `if (window.tcpComputeFingerprint) { window.tcpComputeFingerprint().then(fp => { sendCollect({ ..., device_fingerprint: fp || null }); }); } else { sendCollect({ ..., device_fingerprint: null }); }`
       c. The exact integration MUST preserve the current pageview flow — wrap the new fingerprint logic so that if fingerprint.js fails to load OR `tcpComputeFingerprint` is undefined within ~500ms, the pageview is sent WITHOUT `device_fingerprint` (do NOT block the pageview).
       d. After patching, do NOT commit yet — Task 2 will commit per-file as part of the deploy step.

    7. **Patch `_visitor.php`** — add new function at the end of the file:
       ```php
       function tcp_lookup_by_fingerprint(PDO $pdo, string $fp): ?string {
           if (!preg_match('/^[a-f0-9]{32,64}$/', $fp)) return null;
           $stmt = $pdo->prepare("SELECT visitor_id FROM identified_visitors WHERE device_fingerprint = ? ORDER BY first_seen_at ASC LIMIT 1");
           $stmt->execute([$fp]);
           $vid = $stmt->fetchColumn();
           return $vid ?: null;
       }
       ```
       Mirrors the email-canonical lookup branch in `tcp_upsert_identified_visitor()`. Returns the FIRST-SEEN canonical visitor_id (deterministic).

    8. **Patch `collect.php`** — three changes (file is server-only, but the local repo has the canonical version at `/Users/jeet/techcloudpro/api/collect.php`. NOTE: per 307 SUMMARY "(server-only) collect.php" — this file does NOT exist in the local repo. Therefore: scp it DOWN first, just like tracker.js, then patch + redeploy):

       ```bash
       scp -P 65002 -i ~/.ssh/id_ed25519 \
         u350621741@147.93.101.51:/home/u350621741/domains/techcloudpro.com/public_html/tcp-analytics/collect.php \
         /Users/jeet/techcloudpro/api/collect.php
       cd /Users/jeet/techcloudpro && git add api/collect.php && git commit -m "chore(api): import collect.php baseline from server (pre-fp patch)"
       ```

       If scp fails, STOP and ask user.

       Patch changes:
       a. **Server-side DNT/GPC defense-in-depth** — at the top, after JSON body parse:
          ```php
          $server_optout = (
              ($_SERVER['HTTP_DNT'] ?? '') === '1' ||
              ($_SERVER['HTTP_SEC_GPC'] ?? '') === '1'
          );
          $client_fp = trim($body['device_fingerprint'] ?? '');
          if ($server_optout || !preg_match('/^[a-f0-9]{32,64}$/', $client_fp)) {
              $client_fp = null;
          }
          ```
       b. **Canonical lookup** — if `$client_fp` is non-null AND (`$_COOKIE['tcp_vid']` is missing OR was just newly minted in this request — track via the helper's return semantics):
          ```php
          require_once __DIR__ . '/_visitor.php';
          // ... existing pageview INSERT logic ...
          $current_vid = $_COOKIE['tcp_vid'] ?? '';
          $just_minted = !preg_match('/^[a-f0-9]{32}$/', $current_vid);
          if ($client_fp && $just_minted) {
              $canonical = tcp_lookup_by_fingerprint($pdo, $client_fp);
              if ($canonical) {
                  tcp_set_visitor_cookie($canonical);
                  $current_vid = $canonical;
              }
          }
          ```
       c. **INSERT** — extend the existing `INSERT INTO page_views (...)` to include the `device_fingerprint` column with the (possibly nulled) `$client_fp`.

       Note: the actual existing structure of collect.php may differ — patch must adapt to reality. If the existing collect.php has structures not anticipated here (e.g. it doesn't already require `_visitor.php`), the patch must add the require. After the scp baseline you can read it.

    9. **Patch `stats.php`** — add new field per window. Inside the existing per-window loop (each of today/last_7d/last_30d/all_time), add ONE NEW SQL query:
       ```sql
       SELECT COUNT(DISTINCT pv.visitor_id) AS fingerprint_only_identified
       FROM page_views pv
       LEFT JOIN identified_visitors iv ON iv.visitor_id = pv.visitor_id
       WHERE pv.created_at >= ? AND pv.device_fingerprint IS NOT NULL
         AND (iv.email IS NULL OR iv.email = '')
       ```
       Add the result to `$window['fingerprint_only_identified'] = (int)$row['fingerprint_only_identified'];`. Place inside the existing `identified_visits` block (so it surfaces alongside `pageviews_with_visitor_id`, `distinct_identified_people`, `top_visitors`).

    10. **Patch `index.html`** — extend the existing inline JS hook to ALSO handle `_tcp_no_fp=1`. Just BEFORE the existing `_tcp_uid` block, add:
        ```js
        // _tcp_no_fp=1 → permanent opt-out
        var nofp = p.get('_tcp_no_fp');
        if (nofp === '1') {
          try { window.localStorage.setItem('tcp_no_fp', '1'); } catch(_) {}
          p.delete('_tcp_no_fp');
          // history.replaceState happens later in the existing block
        }
        ```
        Ensure the `history.replaceState` call also strips `_tcp_no_fp` (it will, because we delete it from URLSearchParams `p` before the replaceState call).

    11. **Patch `public/tools/ai-playground.html`** — same change as index.html (identical opt-out hook addition).

    12. **Patch `src/pages/PrivacyPolicy.tsx`** — add new section after the existing "Cookies and Tracking Technologies" section (around line 35). Add a new `<section>` with the heading "Browser Fingerprinting" containing this disclosure paragraph (verbatim, no rewording — legal/compliance posture):

        > "We use first-party browser fingerprinting to recognize repeat visitors who have previously identified themselves through a form submission or an email click on our site. The fingerprint is a one-way SHA-256 hash computed from a small set of stable device-level signals (canvas rendering, audio buffer, WebGL renderer, screen dimensions, available fonts, timezone, hardware concurrency, touch support, and user-agent string) and is stored only on our servers. The hash is never shared with any third party. We respect the W3C Do Not Track (DNT) and Global Privacy Control (Sec-GPC) signals — if your browser sends either, we skip fingerprint collection entirely. To opt out persistently on a single device, append `?_tcp_no_fp=1` to any URL on this site (e.g. `https://techcloudpro.com/?_tcp_no_fp=1`); we will set a per-device flag in your browser's localStorage that disables fingerprint collection on every subsequent visit until you clear browser storage."

        Match the styling/structure of adjacent sections (same heading tag, same wrapper, same Tailwind classes if any).

    DO NOT DEPLOY anything yet (except the schema probe, which is deployed-then-deleted in step 4). All other patches stay local.
  </action>
  <verify>
    A. Schema migration evidence saved verbatim to `FP_SCHEMA_PROBE.md` showing both ALTER TABLE results = "OK", DESCRIBE outputs include `device_fingerprint varchar(64) YES MUL NULL` on both tables.
    B. Server-side probe deleted: `ssh ... 'ls /home/.../api/_probe-310-fp-schema.php' 2>&1 | grep "No such file"`.
    C. tracker.js baseline committed BEFORE any patch (verify with `git log -- public/tcp-analytics/tracker.js | head` showing baseline-import commit precedes any patch commit).
    D. collect.php baseline committed similarly.
    E. fingerprint.js exists locally, `wc -l` ≥ 100, contains `navigator.doNotTrack`, `globalPrivacyControl`, `tcp_no_fp`, `crypto.subtle.digest` literals, and the privacy gates appear BEFORE the canvas signal collection (confirm by line numbers).
    F. _visitor.php contains `function tcp_lookup_by_fingerprint(`.
    G. collect.php (post-patch) contains `HTTP_DNT`, `HTTP_SEC_GPC`, `device_fingerprint`, `tcp_lookup_by_fingerprint`.
    H. stats.php (post-patch) contains `fingerprint_only_identified` and `device_fingerprint IS NOT NULL`.
    I. index.html and tools/ai-playground.html both contain `_tcp_no_fp` and `localStorage.setItem('tcp_no_fp', '1')`.
    J. PrivacyPolicy.tsx contains "first-party browser fingerprinting" AND "Do Not Track" AND "_tcp_no_fp=1".
    K. `cd /Users/jeet/techcloudpro && npm run build` succeeds (PrivacyPolicy.tsx change must compile).
  </verify>
  <done>
    - Schema migration is LIVE on prod MySQL with both new columns + indexes.
    - All local code changes written, fingerprint.js created, tracker.js + collect.php baselines committed, all patches staged but NOT deployed.
    - Privacy policy compiled in dist/ and ready to deploy.
    - Probe file deleted from server.
    - No commits beyond the two baseline-imports yet.
  </done>
</task>

<task type="auto">
  <name>Task 2: Deploy all patches + run verification A (schema), B (privacy gates), D (stats field), E (privacy policy live)</name>
  <files>
    /Users/jeet/techcloudpro/public/tcp-analytics/fingerprint.js
    /Users/jeet/techcloudpro/public/tcp-analytics/tracker.js
    /Users/jeet/techcloudpro/api/collect.php
    /Users/jeet/techcloudpro/api/_visitor.php
    /Users/jeet/techcloudpro/api/stats.php
    /Users/jeet/techcloudpro/index.html
    /Users/jeet/techcloudpro/public/tools/ai-playground.html
    /Users/jeet/techcloudpro/dist/
  </files>
  <action>
    1. **Atomic per-file commits** (no `-A`):
       ```bash
       cd /Users/jeet/techcloudpro
       git add public/tcp-analytics/fingerprint.js
       git commit -m "feat(tcp-analytics): fingerprint.js — first-party device fingerprint with DNT/GPC/opt-out gates"

       git add public/tcp-analytics/tracker.js
       git commit -m "feat(tcp-analytics): tracker.js loads fingerprint.js + sends device_fingerprint to collect.php"

       git add api/collect.php
       git commit -m "feat(api): collect.php server-side DNT/GPC defense-in-depth + canonical fp lookup"

       git add api/_visitor.php
       git commit -m "feat(api): tcp_lookup_by_fingerprint() helper for canonical visitor_id by fp"

       git add api/stats.php
       git commit -m "feat(api): stats.php fingerprint_only_identified count per window"

       git add index.html public/tools/ai-playground.html
       git commit -m "feat(html): _tcp_no_fp=1 URL param sets persistent localStorage opt-out"

       git add src/pages/PrivacyPolicy.tsx
       git commit -m "docs(privacy): disclose first-party browser fingerprinting + DNT/GPC honoring + opt-out URL param"
       ```

    2. **Build the SPA** so dist/ contains the new PrivacyPolicy:
       ```bash
       cd /Users/jeet/techcloudpro && npm run build
       ```
       Then commit dist/ if the repo tracks it (check `git status dist/` — if changes, commit as `chore(dist): rebuild for fp + privacy policy update`).

    3. **Deploy to Hostinger via scp** (305-309 pattern):
       ```bash
       SSH="ssh -p 65002 -i ~/.ssh/id_ed25519 u350621741@147.93.101.51"
       SCP="scp -P 65002 -i ~/.ssh/id_ed25519"
       SVR=u350621741@147.93.101.51:/home/u350621741/domains/techcloudpro.com/public_html

       # tcp-analytics/
       $SCP /Users/jeet/techcloudpro/public/tcp-analytics/fingerprint.js  $SVR/tcp-analytics/fingerprint.js
       $SCP /Users/jeet/techcloudpro/public/tcp-analytics/tracker.js      $SVR/tcp-analytics/tracker.js

       # api/
       $SCP /Users/jeet/techcloudpro/api/collect.php   $SVR/tcp-analytics/collect.php
       $SCP /Users/jeet/techcloudpro/api/_visitor.php  $SVR/api/_visitor.php
       $SCP /Users/jeet/techcloudpro/api/stats.php     $SVR/tcp-analytics/stats.php

       # SPA dist/
       rsync -avz -e "ssh -p 65002 -i ~/.ssh/id_ed25519" /Users/jeet/techcloudpro/dist/ $SVR/

       # entry HTML files (Vite emits these into dist/, but the standalone tools/ HTML is direct):
       $SCP /Users/jeet/techcloudpro/public/tools/ai-playground.html $SVR/tools/ai-playground.html
       ```
       Note: the index.html in repo root may be the SOURCE for Vite's dist/index.html. Check what Vite emits — the deployed `index.html` should be `dist/index.html`. If the build replaces the inline hook (Vite usually preserves it as long as it's outside `<div id="root">`), verify the deployed file via `curl https://techcloudpro.com/?cache_bust=<epoch>` contains the `_tcp_no_fp` literal.

    4. **STOP-and-ask gates:**
       - If any scp fails with permission denied → STOP, ask user.
       - If `npm run build` fails → STOP, fix locally before deploying.
       - If post-deploy `curl https://techcloudpro.com/tcp-analytics/fingerprint.js` returns 404 or 403 → check `/tcp-analytics/.htaccess` whitelist (305 SUMMARY noted that this file restricts non-listed PHP files; `.js` is unaffected by the FilesMatch PHP rule but verify).

    5. **Verification A — schema (paste verbatim):** copy `FP_SCHEMA_PROBE.md` outputs into the SUMMARY (Task 3 will compose).

    6. **Verification B — privacy gates (live curl tests):**
       ```bash
       UA="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15"
       FP_TEST=$(printf 'a%.0s' {1..64})  # 64 'a's, valid hex format

       # B1: DNT: 1 server-side
       SESS=$(uuidgen | tr -d -)
       curl -sS -A "$UA" -H "DNT: 1" -H "Content-Type: application/json" \
         -X POST "https://techcloudpro.com/tcp-analytics/collect.php" \
         -d "{\"type\":\"pageview\",\"page\":\"/test-fp-dnt\",\"session_id\":\"$SESS\",\"referrer\":\"\",\"device_fingerprint\":\"$FP_TEST\"}"

       # B2: Sec-GPC: 1 server-side
       SESS=$(uuidgen | tr -d -)
       curl -sS -A "$UA" -H "Sec-GPC: 1" -H "Content-Type: application/json" \
         -X POST "https://techcloudpro.com/tcp-analytics/collect.php" \
         -d "{\"type\":\"pageview\",\"page\":\"/test-fp-gpc\",\"session_id\":\"$SESS\",\"referrer\":\"\",\"device_fingerprint\":\"$FP_TEST\"}"

       # B3: Normal request — fingerprint stored
       SESS=$(uuidgen | tr -d -)
       curl -sS -A "$UA" -H "Content-Type: application/json" \
         -X POST "https://techcloudpro.com/tcp-analytics/collect.php" \
         -d "{\"type\":\"pageview\",\"page\":\"/test-fp-normal\",\"session_id\":\"$SESS\",\"referrer\":\"\",\"device_fingerprint\":\"$FP_TEST\"}"
       ```

       After each, deploy a one-shot DB-readback probe (same pattern as Task 1's schema probe — gated by `?s=TcpSecureAdmin2026`, deleted post-use):
       ```php
       SELECT page, device_fingerprint FROM page_views
       WHERE page IN ('/test-fp-dnt','/test-fp-gpc','/test-fp-normal')
       ORDER BY id DESC LIMIT 5;
       ```
       Expected:
       - `/test-fp-dnt` → device_fingerprint IS NULL
       - `/test-fp-gpc` → device_fingerprint IS NULL
       - `/test-fp-normal` → device_fingerprint = '$FP_TEST' (the 64-a string)

       Delete the probe.

       B4: localStorage opt-out — visit `https://techcloudpro.com/?_tcp_no_fp=1` in a real browser (or curl just to verify the inline hook is in the HTML; full localStorage verification requires the cookie-clear E2E in Task 3).

    7. **Verification D — stats field surfaces:**
       ```bash
       curl -sS -A "$UA" "https://techcloudpro.com/tcp-analytics/stats.php?s=TcpSecureAdmin2026" \
         | jq '.windows.today.identified_visits.fingerprint_only_identified, .windows.last_7d.identified_visits.fingerprint_only_identified'
       ```
       Expected: integer values present (likely 0 immediately post-deploy since no real fp visitors yet — the value being PRESENT is the assertion, not the count).

    8. **Verification E — privacy policy disclosure live:**
       ```bash
       curl -sS -A "$UA" "https://techcloudpro.com/privacy-policy?cache_bust=$(date +%s)" \
         | grep -i "first-party browser fingerprinting\|do not track\|_tcp_no_fp"
       ```
       Expected: 3 grep hits (one per phrase). If any missing, the SPA bundle didn't propagate — re-run `npm run build` + redeploy.

       NOTE: Cloudflare HTML cache can serve a stale page. The `?cache_bust=$(date +%s)` query param bypasses CF cache. DO NOT trigger a CF purge — phase X follow-up notes purge may be needed for organic users; for this verification, the cache-bust query param is sufficient.
  </action>
  <verify>
    A (schema): FP_SCHEMA_PROBE.md migrations [{"step": "...", "result": "OK"}, {"step": "...", "result": "OK"}].
    B1 (DNT server): page_views row for /test-fp-dnt has device_fingerprint = NULL.
    B2 (GPC server): page_views row for /test-fp-gpc has device_fingerprint = NULL.
    B3 (normal): page_views row for /test-fp-normal has device_fingerprint = the 64-char hex test value.
    D (stats): stats.php JSON contains `fingerprint_only_identified: <integer>` in each window's identified_visits block.
    E (policy live): grep on https://techcloudpro.com/privacy-policy returns the 3 expected phrases.
    Per-file commits exist (8 commits): fingerprint.js, tracker.js, collect.php, _visitor.php, stats.php, index.html+ai-playground.html, PrivacyPolicy.tsx, dist (if tracked).
    All probe files deleted from server.
  </verify>
  <done>
    - All code deployed live to https://techcloudpro.com.
    - 4 of 5 verification batteries pass (A, B, D, E). C deferred to Task 3 (cookie-clear E2E).
    - Privacy policy live and contains the disclosure verbatim.
    - All probe files removed from server.
  </done>
</task>

<task type="auto">
  <name>Task 3: Cookie-clear dedup E2E (verification C) + commits + SUMMARY with verbatim outputs</name>
  <files>
    .planning/quick/310-phase-3-identity-stack-first-party-brows/310-SUMMARY.md
    .planning/STATE.md
  </files>
  <action>
    1. **Cookie-clear dedup E2E test (the goal of this phase):**

       Step 1 — Submit a synthetic form to identified_visitors with email A. Use the existing 307 form-fill flow (POST to `/api/contact.php` with `name=Test 310 FP`, `email=tcp-310-fp-<EPOCH>@example.com`, `company=TCP-310-FP Co`, `_honey=` (empty), `message=phase 310 fp test`). Capture the `tcp_vid` cookie from the response.

       Step 2 — Capture a fingerprint by hitting collect.php with a known-value fingerprint:
       ```bash
       FP="$(printf 'fa%.0s' {1..32})"  # 64-char hex 'fafafa...'
       SESS=$(uuidgen | tr -d -)
       curl -sS -A "$UA" -H "Content-Type: application/json" \
         --cookie "tcp_vid=$VID_FROM_STEP1" \
         -X POST "https://techcloudpro.com/tcp-analytics/collect.php" \
         -d "{\"type\":\"pageview\",\"page\":\"/test-fp-step2\",\"session_id\":\"$SESS\",\"referrer\":\"\",\"device_fingerprint\":\"$FP\"}"
       ```
       Then deploy a one-shot DB probe to confirm `identified_visitors.device_fingerprint = $FP` for the email — IF collect.php is responsible for back-filling identified_visitors.device_fingerprint when a known visitor_id has none (this is part of the canonical-lookup logic Task 1 specified). If it isn't back-filling, the lookup-by-fp branch will never match. Verify the back-fill logic is present in the patched collect.php.

       Step 3 — Clear cookies (i.e., simulate a fresh browser): use a NEW empty cookie jar.
       ```bash
       SESS=$(uuidgen | tr -d -)
       JAR=/tmp/jar-310-$EPOCH.txt
       rm -f $JAR
       curl -sS -A "$UA" -c $JAR -H "Content-Type: application/json" \
         -X POST "https://techcloudpro.com/tcp-analytics/collect.php" \
         -d "{\"type\":\"pageview\",\"page\":\"/test-fp-step3\",\"session_id\":\"$SESS\",\"referrer\":\"\",\"device_fingerprint\":\"$FP\"}"
       cat $JAR | grep tcp_vid
       ```
       Expected: the `tcp_vid` cookie in the new jar = the canonical visitor_id from Step 1, NOT a brand-new mint. (collect.php's canonical-lookup logic detects: cookie missing → fingerprint provided → lookup matches → set cookie to canonical.)

       Step 4 — Verify NO new identified_visitors row was created. DB probe:
       ```sql
       SELECT COUNT(*) FROM identified_visitors WHERE email = 'tcp-310-fp-<EPOCH>@example.com';
       -- expected: 1 (NOT 2)
       ```

       Step 5 — Verify the new pageview is attributed to the canonical visitor:
       ```sql
       SELECT visitor_id FROM page_views WHERE page = '/test-fp-step3' ORDER BY id DESC LIMIT 1;
       -- expected: the canonical visitor_id from Step 1
       ```

       If ANY of Steps 1-5 fail, STOP and ask user — the canonical lookup is the entire point of this phase. Likely root causes: (a) collect.php is not back-filling identified_visitors.device_fingerprint, (b) the lookup query is wrong, (c) the cookie isn't being set on response.

    2. **Update STATE.md** — append a new line to "Last activity:" with this task's summary (one paragraph, mirror 305/307/308/309 style).

    3. **Write 310-SUMMARY.md** at `.planning/quick/310-phase-3-identity-stack-first-party-brows/310-SUMMARY.md`. Required sections:
       - **One-liner**
       - **What was built** (fingerprint.js, tracker.js patch, collect.php patch + DNT/GPC + canonical lookup, _visitor.php helper, stats.php field, opt-out URL handling, privacy policy disclosure, schema migration)
       - **Verification — verbatim live evidence:**
         - A. Schema migration (paste FP_SCHEMA_PROBE.md output verbatim)
         - B1/B2/B3. DNT/GPC/normal curl + DB readback (paste verbatim)
         - C. Cookie-clear dedup 5-step E2E (paste verbatim)
         - D. stats.php fingerprint_only_identified field (paste curl + jq output)
         - E. Privacy policy disclosure live (paste curl + grep output)
       - **Privacy stance** — restate all 7 truths from must_haves frontmatter.
       - **DB tables touched** (table | operation | trigger).
       - **Files changed** (file | repo | status).
       - **Phase X follow-ups** — explicitly note 3 items:
         1. **13-month retention cron**: `DELETE FROM identified_visitors WHERE last_seen_at < NOW() - INTERVAL 13 MONTH;` — schedule via Hostinger cron post-launch (deferred to Phase X).
         2. **Cloudflare cache purge for privacy policy**: organic visitors may see a stale /privacy-policy from CF cache for up to 24h. To force-update, run `curl -X POST "https://api.cloudflare.com/client/v4/zones/<zone_id>/purge_cache" -H "Authorization: Bearer <token>" -d '{"files":["https://techcloudpro.com/privacy-policy"]}'`. Deferred to Phase X (zone_id + token would need to be retrieved).
         3. **Bot-fingerprint pollution**: bots (curl, Selenium, headless Chrome) will produce similar fingerprints (same UA, same hardware values, same canvas output) and could collapse multiple bot visitors into one canonical visitor. Mitigation strategies (UA-based bot exclusion, fingerprint-distinct-cardinality threshold, captcha gate before fp collect) deferred to Phase X.
       - **Rollback playbook**: 4 tiers (revert tracker.js patch only / revert all code / drop schema columns / nuclear).
       - **Commit hashes** (techcloudpro and dollor.ai).
       - **Self-Check** — checkbox list mirroring 309's self-check structure.

    4. **Commit dollor.ai changes:**
       ```bash
       cd /Users/jeet/doordash-p2p
       git add .planning/quick/310-phase-3-identity-stack-first-party-brows/FP_SCHEMA_PROBE.md
       git add .planning/quick/310-phase-3-identity-stack-first-party-brows/310-PLAN.md
       git add .planning/quick/310-phase-3-identity-stack-first-party-brows/310-SUMMARY.md
       git add .planning/STATE.md
       git commit -m "docs(quick-310): identity-stack Phase 3 — first-party browser fingerprinting"
       ```

    5. **Per CLAUDE.md, do NOT push** to either repo unless user asks.
  </action>
  <verify>
    Step 1: form submit returns 200, cookie is set in response, identified_visitors row inserted.
    Step 2: page_views row has device_fingerprint = $FP, and identified_visitors row updated to have device_fingerprint = $FP.
    Step 3: new cookie jar has tcp_vid = canonical visitor_id from Step 1.
    Step 4: COUNT(*) = 1 for that email (no duplicate row).
    Step 5: pageview attributed to canonical visitor_id.
    SUMMARY.md contains verbatim outputs from all 5 verification batteries (A-E).
    All 3 Phase X follow-ups documented.
    Rollback playbook covers all 4 tiers.
    All code committed atomically (no -A).
    No pushes to remote.
  </verify>
  <done>
    - Cookie-clear dedup E2E PASSES with verbatim DB-confirmed evidence.
    - SUMMARY.md complete with all verification batteries.
    - STATE.md updated.
    - Phase X follow-ups recorded.
    - Rollback playbook complete.
  </done>
</task>

</tasks>

<verification>

Phase-level verification = Task 3's E2E PLUS all Task 2 batteries:

**A. Schema migration** — both ALTER TABLE statements executed successfully on prod MySQL; columns + indexes confirmed via DESCRIBE.

**B. Privacy gates (server-side defense-in-depth):**
- B1. `DNT: 1` header → device_fingerprint stored as NULL.
- B2. `Sec-GPC: 1` header → device_fingerprint stored as NULL.
- B3. Normal request → device_fingerprint stored verbatim.
- B4. localStorage opt-out — covered indirectly by Task 1's code-presence check (full E2E requires real browser).

**C. Cookie-clear dedup (the goal):**
- 5-step E2E proves a cleared-cookie revisit with the same fingerprint restores the canonical visitor_id, no duplicate row, pageview attributed correctly.

**D. stats.php new field:**
- `fingerprint_only_identified` integer present in all 4 windows.

**E. Privacy policy live:**
- `https://techcloudpro.com/privacy-policy` rendered HTML contains the 3 required phrases.

</verification>

<success_criteria>

1. Schema migrated cleanly (FP_SCHEMA_PROBE.md saved with verbatim "OK" results).
2. fingerprint.js exists at /tcp-analytics/fingerprint.js, all 4 privacy gates (DNT, GPC, localStorage tcp_no_fp, SubtleCrypto availability) execute BEFORE any signal collection.
3. Server-side DNT/GPC defense-in-depth verified by curl (B1/B2 store NULL).
4. Normal request stores fingerprint (B3 stores test value).
5. Cookie-clear dedup E2E (Task 3) passes — same email + same fingerprint → 1 identified_visitors row, canonical cookie restored.
6. stats.php exposes `fingerprint_only_identified` count per window.
7. /privacy-policy page on live site contains "first-party browser fingerprinting", "Do Not Track", and "_tcp_no_fp=1" verbatim.
8. tracker.js + collect.php baselines committed BEFORE patches (no destructive overwrite).
9. All 3 Phase X follow-ups documented in SUMMARY (retention cron, CF purge, bot pollution).
10. No pushes to either repo (per CLAUDE.md push policy).

</success_criteria>

<rollback_paths>

**Tier 1 — Quick disable** (highest probability rollback if fingerprint causes user-facing JS errors):
```bash
ssh -p 65002 -i ~/.ssh/id_ed25519 u350621741@147.93.101.51 \
  'mv /home/u350621741/domains/techcloudpro.com/public_html/tcp-analytics/fingerprint.js \
      /home/u350621741/domains/techcloudpro.com/public_html/tcp-analytics/fingerprint.js.disabled'
```
Effect: tracker.js's load attempt 404s, the timeout fallback fires, pageviews continue without device_fingerprint. No user-facing impact.

**Tier 2 — Revert tracker.js** (if Tier 1 insufficient):
```bash
cd /Users/jeet/techcloudpro
git revert <tracker-patch-sha>
scp -P 65002 -i ~/.ssh/id_ed25519 public/tcp-analytics/tracker.js \
  u350621741@147.93.101.51:/home/u350621741/domains/techcloudpro.com/public_html/tcp-analytics/tracker.js
```

**Tier 3 — Revert all code patches:**
```bash
cd /Users/jeet/techcloudpro
git revert <stats sha> <_visitor sha> <collect sha> <tracker sha> <fingerprint sha> <html sha> <privacy sha>
# redeploy each via scp
```
Schema columns can stay — they're additive nullable, no impact.

**Tier 4 — Drop schema columns** (only if needed for clean-room rollback):
```sql
ALTER TABLE page_views DROP INDEX idx_device_fingerprint, DROP COLUMN device_fingerprint;
ALTER TABLE identified_visitors DROP INDEX idx_device_fingerprint, DROP COLUMN device_fingerprint;
```

</rollback_paths>

<phase_x_followups>

1. **13-month retention cron** — `DELETE FROM identified_visitors WHERE last_seen_at < NOW() - INTERVAL 13 MONTH;` weekly via Hostinger cron. Matches GDPR cookie-equivalent retention. Documented in SUMMARY.

2. **Cloudflare cache purge for privacy policy** — organic visitors may see stale /privacy-policy for up to 24h. Manual purge possible via CF API (zone_id + token from CF dashboard). Documented in SUMMARY; not automated for this phase.

3. **Bot-fingerprint pollution** — bots produce similar fingerprints (same UA family, same hardware values, same canvas output). Mitigation: UA-based bot allowlist before fingerprint POST, distinct-cardinality threshold (drop fingerprints seen across >50 distinct visitor_ids), captcha gate before identification. Deferred to Phase X.

</phase_x_followups>

<output>
After completion, the following artifacts MUST exist:
- `.planning/quick/310-phase-3-identity-stack-first-party-brows/310-PLAN.md` (this file)
- `.planning/quick/310-phase-3-identity-stack-first-party-brows/FP_SCHEMA_PROBE.md` (Task 1)
- `.planning/quick/310-phase-3-identity-stack-first-party-brows/310-SUMMARY.md` (Task 3)
- 8+ atomic commits in /Users/jeet/techcloudpro (2 baseline-imports + 6+ patch commits + dist build)
- 1 commit in /Users/jeet/doordash-p2p (PLAN + SCHEMA_PROBE + SUMMARY + STATE)
- All 7 patched files deployed live to Hostinger
- All 5 verification batteries (A, B, C, D, E) passed with verbatim evidence in SUMMARY.md
</output>
