---
phase: 314-unified-lead-notification-system-on-tech
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - /Users/jeet/techcloudpro/api/_visitor.php
  - /Users/jeet/techcloudpro/api/contact.php
  - /Users/jeet/techcloudpro/api/customize-architecture.php
  - /Users/jeet/techcloudpro/api/study-guide-download.php
  - /Users/jeet/techcloudpro/api/identify-from-email.php
autonomous: true
requirements:
  - "TCP-314-A: Unified tcp_notify_new_lead() helper in _visitor.php — skip-list (synthetic / +test / example domains), per-visitor 1hr throttle via identified_visitors.last_notified_at, never throws, never blocks user-facing request"
  - "TCP-314-B: identified_visitors schema gains last_notified_at TIMESTAMP NULL via probe migration (anti-hallucination DESCRIBE evidence captured)"
  - "TCP-314-C: tcp_upsert_identified_visitor() returns array [canonical_visitor_id, is_new_email] (BREAKING CHANGE — all 3 existing callers updated atomically)"
  - "TCP-314-D: contact.php existing inline mail() block at lines 68-78 REMOVED and replaced with tcp_notify_new_lead() call (regression-tested — rajesh/jm still notified)"
  - "TCP-314-E: customize-architecture.php (ai-playground) calls tcp_notify_new_lead() ONLY when is_new_email==true and email gate passed"
  - "TCP-314-F: study-guide-download.php (rag-study-guide) calls tcp_notify_new_lead() ONLY when is_new_email==true"
  - "TCP-314-G: identify-from-email.php (email-click) calls tcp_notify_new_lead() ONLY when is_new_email==true (synthetic test prefixes still skip-listed)"
  - "TCP-314-H: Live E2E batteries 3-7 from real-deliverable mailbox jeetnair.in+phase8-* prove every endpoint pings rajesh/jm/contact on first submit and silently throttles on second submit within 1hr"

must_haves:
  truths:
    - "Every NEW prospect (any of 4 forms) triggers a notification email to contact@/rajesh@/jm@techcloudpro.com on first submit"
    - "Repeat submit by same visitor_id within 1 hour does NOT re-trigger notification (throttle)"
    - "Synthetic test emails (example.com / +test / tcp-3XX-* prefix) are silently skipped — no notifications sent during E2E or development"
    - "Existing contact form behaviour preserved — rajesh@/jm@/contact@ still receive an email when a real prospect submits the contact form"
    - "Notification helper failure never breaks the user-facing form submit (best-effort, error_log only)"
    - "Hostinger mail() returning false is documented and logged but does NOT fail the test (Hostinger SPF alignment is out of our control)"
  artifacts:
    - path: "/Users/jeet/techcloudpro/api/_visitor.php"
      provides: "tcp_notify_new_lead() helper + extended tcp_upsert_identified_visitor() returning [canonical_id, is_new_email]"
      contains: "function tcp_notify_new_lead"
    - path: "/Users/jeet/techcloudpro/api/contact.php"
      provides: "contact form handler with helper-driven notification (inline mail() block removed)"
      contains: "tcp_notify_new_lead("
    - path: "/Users/jeet/techcloudpro/api/customize-architecture.php"
      provides: "playground form with helper-driven notification on new email"
      contains: "tcp_notify_new_lead("
    - path: "/Users/jeet/techcloudpro/api/study-guide-download.php"
      provides: "study-guide form with helper-driven notification on new email"
      contains: "tcp_notify_new_lead("
    - path: "/Users/jeet/techcloudpro/api/identify-from-email.php"
      provides: "email-click receiver with helper-driven notification on new email (gated by skip-list)"
      contains: "tcp_notify_new_lead("
    - path: ".planning/quick/314-unified-lead-notification-system-on-tech/314-SCHEMA_PROBE.md"
      provides: "Verbatim DESCRIBE identified_visitors output proving last_notified_at column exists"
      contains: "last_notified_at"
    - path: ".planning/quick/314-unified-lead-notification-system-on-tech/314-SUMMARY.md"
      provides: "Summary with verbatim curl + mail-log evidence for batteries 3-7"
      contains: "tcp_notify_new_lead"
  key_links:
    - from: "contact.php / customize-architecture.php / study-guide-download.php / identify-from-email.php"
      to: "_visitor.php tcp_notify_new_lead()"
      via: "PHP function call after tcp_upsert_identified_visitor() returns is_new_email==true"
      pattern: "tcp_notify_new_lead\\("
    - from: "tcp_notify_new_lead()"
      to: "identified_visitors.last_notified_at"
      via: "SELECT before send (throttle check) + UPDATE after send (record)"
      pattern: "last_notified_at"
    - from: "tcp_upsert_identified_visitor()"
      to: "all 3 (now 4) callers"
      via: "RETURN VALUE CHANGED from string -> array — BREAKING CHANGE, all callers updated in same task"
      pattern: "list\\(\\$canonical_vid, \\$is_new_email\\) ="
---

<objective>
Convert TechCloudPro's lead-capture surface from "only contact.php emails the team" to "every NEW prospect identified by ANY source pings rajesh/jm/contact in real-time, with proper per-visitor throttling and synthetic-test skip-list."

Purpose: today the team only finds out about playground / study-guide / email-click leads when manually checking the dashboard. After this task, the team gets a real-time email for every fresh prospect across all 4 identification surfaces, throttled to 1 notification per visitor_id per hour.

Output: Single helper `tcp_notify_new_lead()` in `_visitor.php`, extended `tcp_upsert_identified_visitor()` returning new-email signal, schema migration adding `last_notified_at`, and 4 patched endpoints — all deployed and live-verified with verbatim curl evidence.
</objective>

<execution_context>
@/Users/jeet/.claude/get-shit-done/workflows/execute-plan.md
@/Users/jeet/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@/Users/jeet/doordash-p2p/CLAUDE.md
@/Users/jeet/doordash-p2p/.planning/STATE.md
@/Users/jeet/doordash-p2p/.planning/quick/305-build-tcp-analytics-stats-php-on-techclo/305-SUMMARY.md
@/Users/jeet/doordash-p2p/.planning/quick/307-phase-1-identity-stack-form-fill-identit/307-SUMMARY.md
@/Users/jeet/doordash-p2p/.planning/quick/308-phase-2a-identity-stack-tcp-receiver-for/308-SUMMARY.md
@/Users/jeet/doordash-p2p/.planning/quick/309-phase-2b-identity-stack-brandmonkz-sende/309-SUMMARY.md
@/Users/jeet/doordash-p2p/.planning/quick/310-phase-3-identity-stack-first-party-brows/310-SUMMARY.md
@/Users/jeet/techcloudpro/api/_visitor.php
@/Users/jeet/techcloudpro/api/contact.php
@/Users/jeet/techcloudpro/api/customize-architecture.php
@/Users/jeet/techcloudpro/api/study-guide-download.php
@/Users/jeet/techcloudpro/api/identify-from-email.php
</context>

<tasks>

<task type="auto">
  <name>Task 1: Schema migration + helper + extend upsert + patch all 4 endpoints (LOCAL ONLY, no deploy)</name>
  <files>
    /Users/jeet/techcloudpro/api/_visitor.php
    /Users/jeet/techcloudpro/api/contact.php
    /Users/jeet/techcloudpro/api/customize-architecture.php
    /Users/jeet/techcloudpro/api/study-guide-download.php
    /Users/jeet/techcloudpro/api/identify-from-email.php
    /Users/jeet/doordash-p2p/.planning/quick/314-unified-lead-notification-system-on-tech/314-SCHEMA_PROBE.md
  </files>
  <action>
**MANDATORY FIRST STEP — read each target file FRESH from disk before editing.** The line numbers in this plan's planning_context (e.g. "contact.php lines 68-78") may have shifted since prior summaries were written. Use `cat -n` or `Read` to confirm exact current locations of the inline mail() block and the existing tcp_upsert_identified_visitor() call sites.

---

**STEP A — Schema migration probe (REQUIRED, anti-hallucination)**

Mirror the probe pattern from 307/310 SUMMARYs (deploy → run → SAVE OUTPUT → DELETE → verify removed):

1. Write `/tmp/_probe-314-schema.php` locally containing a single-shot script that:
   - Opens PDO via the same line every TCP file uses (`mysql:host=localhost;dbname=u350621741_visitors;charset=utf8mb4`, `u350621741_jeet977`, `Thirumala977!`)
   - Runs `ALTER TABLE identified_visitors ADD COLUMN last_notified_at TIMESTAMP NULL DEFAULT NULL` wrapped in try/catch (idempotent — succeeds if not present, catches "Duplicate column name" silently)
   - Runs `DESCRIBE identified_visitors` and emits JSON
   - Outputs `{"migration":"OK"|"ALREADY_PRESENT", "describe":[...]}`

2. SCP the probe to Hostinger `/home/u350621741/domains/techcloudpro.com/public_html/api/_probe-314-schema.php` (host=`147.93.101.51`, port=`65002`, user=`u350621741`, key=`~/.ssh/id_ed25519`).

3. Curl it WITH BROWSER UA: `curl -A "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15" "https://techcloudpro.com/api/_probe-314-schema.php"`. Expected: HTTP 200 + JSON showing `last_notified_at varchar... timestamp YES NULL` in the DESCRIBE output.

4. Save VERBATIM output to `.planning/quick/314-unified-lead-notification-system-on-tech/314-SCHEMA_PROBE.md` (preserve full DESCRIBE table).

5. SSH-delete the probe: `ssh -p 65002 -i ~/.ssh/id_ed25519 u350621741@147.93.101.51 "rm /home/u350621741/domains/techcloudpro.com/public_html/api/_probe-314-schema.php"`. Verify removed: `curl -A "$UA" -o /dev/null -w "%{http_code}" "https://techcloudpro.com/api/_probe-314-schema.php"` should return 404 (or whatever .htaccess returns for missing files).

---

**STEP B — Add tcp_notify_new_lead() helper to _visitor.php**

Append after the existing helpers (after `tcp_resolve_ip_to_company` at line 292+). Function signature:

```php
function tcp_notify_new_lead(
    PDO $pdo,
    string $visitor_id,
    string $email,
    ?string $name,
    ?string $company,
    string $source_form,
    array $extra = []
): bool
```

Implementation order (this order is load-bearing — skip-list FIRST, throttle SECOND, send THIRD, record FOURTH):

1. **Skip-list checks (silent return false):**
   - `preg_match('/@(example|test|localhost)\.(com|org|test)$/i', $email)` → return false
   - `preg_match('/^tcp-3[0-9]{2}-/', $email)` → return false (synthetic test prefix from quick-307+)
   - `strpos($email, '+test') !== false` → return false (alias filter)

2. **Throttle check** — `SELECT last_notified_at FROM identified_visitors WHERE visitor_id = ? LIMIT 1`. If row exists AND `last_notified_at` is NOT NULL AND `last_notified_at > NOW() - INTERVAL 1 HOUR`, return false silently. (Use server NOW() comparison via SQL: `SELECT (last_notified_at > (NOW() - INTERVAL 1 HOUR)) AS throttled` to avoid PHP timezone issues.)

3. **Build email** — read contact.php's CURRENT From/Reply-To/Recipient block VERBATIM (do not re-derive from memory). At time of plan writing, contact.php uses:
   - `$fromAddr = 'noreply@techcloudpro.com';`
   - `$recipients = 'contact@techcloudpro.com, rajesh@techcloudpro.com, jm@techcloudpro.com';`
   - `From: TechCloudPro Contact <noreply@techcloudpro.com>`
   - `Reply-To: {name} <{email}>`
   - MIME-Version + Content-Type: text/html; charset=UTF-8 + X-Mailer

   Re-use the EXACT From + Recipients values. Subject for the new helper:
   ```
   [TCP Lead] {name_or_unknown} @ {company_or_unknown} via {source_form}
   ```
   Where `name_or_unknown = ($name && trim($name) !== '') ? $name : '(unknown)'` and same for company.

   Body (HTML, mirror contact.php's existing styling for visual consistency — copy the inline `<style>` block):
   - Section header: "New TCP Lead Identified"
   - Fields: Name / Email (mailto:) / Company / Source Form / Visitor ID / First Seen / IP / Page / Referrer
   - Pull `first_seen_at` from `identified_visitors` table (extra SELECT in the SQL, or include in the throttle SELECT)
   - Footer: stats dashboard link `https://techcloudpro.com/tcp-analytics/stats.php?s=TcpSecureAdmin2026`
   - Read `extra['ip']`, `extra['page']`, `extra['referrer']` with null-safe defaults

4. **Send via `@mail()`** — wrap in `@` to suppress warnings (Hostinger may emit notices). Capture return value into `$success`.

5. **On `$success === true`** — `UPDATE identified_visitors SET last_notified_at = NOW() WHERE visitor_id = ?`. On `$success === false` — `error_log("TechCloudPro tcp_notify_new_lead mail() failed for visitor_id=$visitor_id email=$email source=$source_form")`. Return `$success`.

6. **Wrap entire body in try/catch (Throwable)** — on exception, error_log and return false. NEVER throw upward. Helper is best-effort like `tcp_upsert_identified_visitor`.

---

**STEP C — Extend tcp_upsert_identified_visitor() return signature (BREAKING CHANGE)**

Currently returns `string` (line 76-129 in `_visitor.php`). Change to return `array` with shape `[canonical_visitor_id, is_new_email]`.

Detection logic for `is_new_email`:
- Set `$is_new_email = false` initially.
- After the canonical-by-email SELECT (line 92-95), if the SELECT returns a non-empty `$canonical` → email already exists → `is_new_email = false` (keep false).
- Otherwise (canonical SELECT returned nothing), the next branch is the INSERT-or-update. Use a deterministic detection:
  - Check `$pdo->prepare("SELECT 1 FROM identified_visitors WHERE email = ? OR visitor_id = ?")->execute([$email_norm, $visitor_id]); $exists = $stmt->fetchColumn();` BEFORE the INSERT
  - If `$exists === false` (truly new) → `is_new_email = true`. Otherwise → `is_new_email = false`.
- Note: this adds ONE extra SELECT before INSERT in the new-row path, which is acceptable overhead (form submits are not a hot path).

Update return statements:
- Old: `return $canonical;` → New: `return [$canonical, false];`  (cross-device merge — email known)
- Old: `return $visitor_id;` (after INSERT) → New: `return [$visitor_id, $is_new_email];`
- Defensive early-return at line 89: `return $visitor_id;` → `return [$visitor_id, false];`

Update the docblock to reflect the new return type.

---

**STEP D — Update all 3 EXISTING callers atomically (per CLAUDE.md anti-inconsistency rule)**

Read each file FRESH and find the current location of the `tcp_upsert_identified_visitor(...)` call:

**D1. contact.php** (currently around line 132-140):
```php
// OLD
$canonical = tcp_upsert_identified_visitor(...);
if ($canonical !== $visitor_id) { tcp_set_visitor_cookie($canonical); }

// NEW
[$canonical, $is_new_email] = tcp_upsert_identified_visitor(...);
if ($canonical !== $visitor_id) { tcp_set_visitor_cookie($canonical); }
if ($is_new_email) {
    tcp_notify_new_lead($pdo_ident, $canonical, $email, $name, $company, 'contact', [
        'ip' => $_SERVER['REMOTE_ADDR'] ?? null,
        'page' => '/contact/',
        'referrer' => $_SERVER['HTTP_REFERER'] ?? null,
    ]);
}
```

**D1b. contact.php — REMOVE inline mail() block** (currently around lines 68-78). Confirm exact location by reading file fresh. The block to remove starts with `// ---- Email via Hostinger native mail() ----` and ends after `error_log("TechCloudPro contact mail() failed: ...")`. Replace with a comment: `// Notification handled by tcp_notify_new_lead() — see identity capture block below.`

   Also update the final `echo json_encode(...)` — `email_sent` field currently equals `$success` from the inline mail(); after refactor, `$success` no longer exists. Replace with `'email_sent' => null` (or `'notification_status' => 'handled_by_helper'` — pick one and document). The contact form's frontend may consume `email_sent` — search the local repo for `email_sent` references in TS/JS to confirm no breaking change. If frontend depends on it, keep the key but set value to `null`.

**D2. customize-architecture.php** (currently around line 397-403):
```php
// OLD (inside the !empty($email) guard)
$canonical = tcp_upsert_identified_visitor(...);
if ($canonical !== $visitor_id) { tcp_set_visitor_cookie($canonical); }

// NEW
[$canonical, $is_new_email] = tcp_upsert_identified_visitor(...);
if ($canonical !== $visitor_id) { tcp_set_visitor_cookie($canonical); }
if ($is_new_email) {
    tcp_notify_new_lead($pdo, $canonical, $email, $name, $company, 'ai-playground', [
        'ip' => $ip,
        'page' => '/tools/ai-playground.html',
        'referrer' => $_SERVER['HTTP_REFERER'] ?? null,
    ]);
}
```

**D3. study-guide-download.php** (currently around line 92-98):
```php
[$canonical, $is_new_email] = tcp_upsert_identified_visitor(...);
if ($canonical !== $visitor_id) { tcp_set_visitor_cookie($canonical); }
if ($is_new_email) {
    tcp_notify_new_lead($pdo, $canonical, $email, $name, $company, 'rag-study-guide', [
        'ip' => $ip,
        'page' => '/tools/rag-study-guide.html',
        'referrer' => $_SERVER['HTTP_REFERER'] ?? null,
    ]);
}
```

**D4. identify-from-email.php** (currently around line 85-91):
```php
[$canonical, $is_new_email] = tcp_upsert_identified_visitor(...);
if ($canonical !== $vid) { tcp_set_visitor_cookie($canonical); }
if ($is_new_email) {
    tcp_notify_new_lead($pdo, $canonical, $email, $name, $company, 'email-click', [
        'ip' => $_SERVER['REMOTE_ADDR'] ?? null,
        'page' => $_SERVER['HTTP_REFERER'] ?? null,
        'referrer' => $_SERVER['HTTP_REFERER'] ?? null,
    ]);
}
```

The `tcp_notify_new_lead()` calls are themselves wrapped by the existing try/catch around the upsert block (already present in all 4 files). NO additional try/catch needed at the call site.

---

**STEP E — Atomic per-file commits (NO `-A`)**

Per `<constraints>` block: ONE commit per file, in order:

```
cd /Users/jeet/techcloudpro
git add api/_visitor.php
git commit -m "feat(api): tcp_notify_new_lead() helper + extend tcp_upsert_identified_visitor() return signature

Adds last_notified_at-throttled email notification for newly-identified
prospects. Helper has skip-list (synthetic / +test / example.com) and
1-hour per-visitor throttle. Best-effort — never throws.

BREAKING: tcp_upsert_identified_visitor() now returns [vid, is_new_email]
instead of vid. Callers MUST be updated in the same change set."

git add api/contact.php
git commit -m "refactor(api): contact.php — replace inline mail() with tcp_notify_new_lead()

Removes the lines 68-78 inline mail() block. Notification now flows
through the unified helper, which throttles per-visitor and skip-lists
synthetic test emails. Existing rajesh/jm/contact recipient list and
From/Reply-To headers preserved verbatim."

git add api/customize-architecture.php
git commit -m "feat(api): playground — notify rajesh/jm on new ai-playground prospect"

git add api/study-guide-download.php
git commit -m "feat(api): study-guide — notify rajesh/jm on new rag-study-guide prospect"

git add api/identify-from-email.php
git commit -m "feat(api): email-click — notify rajesh/jm on new email-click prospect"
```

DO NOT push to remote (per CLAUDE.md). Stop after `git log` confirms 5 atomic commits exist locally.

---

**STEP F — PHP syntax check (lint gate before deploy)**

Run `php -l` on each modified file:
```bash
for f in /Users/jeet/techcloudpro/api/_visitor.php \
         /Users/jeet/techcloudpro/api/contact.php \
         /Users/jeet/techcloudpro/api/customize-architecture.php \
         /Users/jeet/techcloudpro/api/study-guide-download.php \
         /Users/jeet/techcloudpro/api/identify-from-email.php; do
  php -l "$f"
done
```

All 5 must report "No syntax errors detected". If any error → fix → re-stage → amend the relevant commit (per CLAUDE.md: amend is OK ONLY for hook-failed commits not yet on remote, which applies here since we haven't pushed).
  </action>
  <verify>
1. `cat .planning/quick/314-unified-lead-notification-system-on-tech/314-SCHEMA_PROBE.md` shows `last_notified_at` column in DESCRIBE output
2. Probe file removed from server: `curl -sI -A "$UA" https://techcloudpro.com/api/_probe-314-schema.php | head -1` returns 404 (or the .htaccess equivalent)
3. `grep -c 'tcp_notify_new_lead' /Users/jeet/techcloudpro/api/_visitor.php` ≥ 1 (the function definition)
4. `grep -c 'tcp_notify_new_lead(' /Users/jeet/techcloudpro/api/{contact,customize-architecture,study-guide-download,identify-from-email}.php` returns 4 (one per endpoint)
5. `grep -c 'list($canonical, $is_new_email)' /Users/jeet/techcloudpro/api/{contact,customize-architecture,study-guide-download,identify-from-email}.php` returns 4 — OR equivalent destructuring pattern (`[$canonical, $is_new_email]`)
6. `grep -c '@mail(' /Users/jeet/techcloudpro/api/contact.php` returns 0 (inline block removed)
7. `php -l` passes on all 5 files (no syntax errors)
8. `cd /Users/jeet/techcloudpro && git log --oneline -5` shows 5 atomic commits, one per file
9. NO remote pushes occurred — `git status` should show "Your branch is ahead of 'origin/main' by N commits" but no push command was issued
  </verify>
  <done>
- last_notified_at column live in identified_visitors (DESCRIBE evidence in 314-SCHEMA_PROBE.md)
- tcp_notify_new_lead() helper defined in _visitor.php with skip-list, throttle, mail(), error_log
- tcp_upsert_identified_visitor() returns [canonical_id, is_new_email] tuple
- All 4 endpoints (contact, customize-architecture, study-guide-download, identify-from-email) call tcp_notify_new_lead() conditionally on is_new_email
- contact.php inline mail() block at lines 68-78 (or current equivalent) REMOVED
- All 5 PHP files pass php -l syntax check
- 5 atomic commits exist locally, none pushed
- Deploy probe deleted from server, 314-SCHEMA_PROBE.md preserved locally
  </done>
</task>

<task type="auto">
  <name>Task 2: Deploy + live E2E batteries 3-7 + SUMMARY with verbatim mail-log + curl evidence</name>
  <files>
    /Users/jeet/doordash-p2p/.planning/quick/314-unified-lead-notification-system-on-tech/314-SUMMARY.md
  </files>
  <action>
**STEP A — Deploy all 5 files to Hostinger**

```bash
SSH_OPTS="-P 65002 -i ~/.ssh/id_ed25519"
DEST="u350621741@147.93.101.51:/home/u350621741/domains/techcloudpro.com/public_html/api/"

scp $SSH_OPTS /Users/jeet/techcloudpro/api/_visitor.php "$DEST"
scp $SSH_OPTS /Users/jeet/techcloudpro/api/contact.php "$DEST"
scp $SSH_OPTS /Users/jeet/techcloudpro/api/customize-architecture.php "$DEST"
scp $SSH_OPTS /Users/jeet/techcloudpro/api/study-guide-download.php "$DEST"
scp $SSH_OPTS /Users/jeet/techcloudpro/api/identify-from-email.php "$DEST"
```

**CRITICAL post-deploy step (per memory `tcp-blog-aeo-pattern`):** the local `customize-architecture.php` has placeholder `'ANTHROPIC_API_KEY_HERE'` at line 27. After scp, the deployed file will break the playground unless the placeholder is sed-replaced with the real key. The real key lives in the deployed `chat.php` on the server. Run on the server:

```bash
ssh -p 65002 -i ~/.ssh/id_ed25759 u350621741@147.93.101.51 << 'EOF'
REAL_KEY=$(grep -oE 'sk-ant-api03-[A-Za-z0-9_-]+' /home/u350621741/domains/techcloudpro.com/public_html/api/chat.php | head -1)
if [ -n "$REAL_KEY" ]; then
  sed -i "s|ANTHROPIC_API_KEY_HERE|$REAL_KEY|" /home/u350621741/domains/techcloudpro.com/public_html/api/customize-architecture.php
  echo "Key injection: OK"
  grep -c "sk-ant-api03" /home/u350621741/domains/techcloudpro.com/public_html/api/customize-architecture.php
else
  echo "Key injection: FAILED — chat.php has no sk-ant-api03 key"
  exit 1
fi
EOF
```

Expected: `Key injection: OK` + count = 1.

---

**STEP B — Smoke test all 4 endpoints exist + parseable**

```bash
UA='Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15'

# contact.php — empty body (expect 400 invalid request, NOT 500 parse error)
curl -A "$UA" -X POST -H "Content-Type: application/json" -d '{}' https://techcloudpro.com/api/contact.php -w "\nHTTP %{http_code}\n"
# Expect: HTTP 400 + {"error":"Name and email required"} or similar — proves PHP file parses

# customize-architecture.php — empty body (expect 400)
curl -A "$UA" -X POST -H "Content-Type: application/json" -d '{}' https://techcloudpro.com/api/customize-architecture.php -w "\nHTTP %{http_code}\n"
# Expect: HTTP 400 + {"error":"Industry and use case required"}

# study-guide-download.php — empty body (expect 400)
curl -A "$UA" -X POST -H "Content-Type: application/json" -d '{}' https://techcloudpro.com/api/study-guide-download.php -w "\nHTTP %{http_code}\n"
# Expect: HTTP 400 + {"error":"Name is required"}

# identify-from-email.php — GET (expect 405)
curl -A "$UA" https://techcloudpro.com/api/identify-from-email.php -w "\nHTTP %{http_code}\n"
# Expect: HTTP 405 + {"ok":false,"error":"method_not_allowed"}
```

If ANY of these returns HTTP 500 → PHP parse error in deployed file → STOP, debug via error log: `ssh ... "tail -50 /home/u350621741/logs/error_log"`.

---

**STEP C — Battery 1: Helper unit-tests via probe PHP file (skip-list verification)**

Deploy a minimal probe `_probe-314-helper.php` that calls `tcp_notify_new_lead()` directly with synthetic inputs:

```php
<?php
require_once __DIR__ . '/_visitor.php';
header('Content-Type: application/json');
$pdo = tcp_db();
$test_vid = 'aabbccddeeff00112233445566778899'; // 32-hex synthetic, not in DB
$results = [];

$results['skip_example_com'] = tcp_notify_new_lead($pdo, $test_vid, 'test@example.com', 'X', 'Y', 'contact');
// expect: false (skip-list match @example.com)

$results['skip_tcp_synth'] = tcp_notify_new_lead($pdo, $test_vid, 'tcp-308-foo@gmail.com', 'X', 'Y', 'contact');
// expect: false (skip-list match tcp-3XX- prefix)

$results['skip_alias_test'] = tcp_notify_new_lead($pdo, $test_vid, 'foo+test@gmail.com', 'X', 'Y', 'contact');
// expect: false (skip-list match +test alias)

echo json_encode($results, JSON_PRETTY_PRINT);
```

SCP, curl with browser UA, capture verbatim output, save to SUMMARY. Expected: all 3 keys = `false`. SSH-delete probe.

---

**STEP D — Battery 2: Live E2E via contact.php with real-deliverable mailbox**

Real-deliverable address: `jeetnair.in+phase8-contact-test@gmail.com` (per `<constraints>`, MUST use real-deliverable per memory `feedback_smoke_test_real_mailbox`).

```bash
EMAIL="jeetnair.in+phase8-contact-test-$(date +%s)@gmail.com"
COOKIE_JAR=/tmp/jar-314-contact.txt; rm -f "$COOKIE_JAR"

# First submit — expect notification fires
curl -A "$UA" -c "$COOKIE_JAR" -X POST -H "Content-Type: application/json" \
  -d "{\"name\":\"Phase 8 Contact Test\",\"email\":\"$EMAIL\",\"company\":\"TCP Phase 8 Co\",\"phone\":\"+1-555-0314\",\"message\":\"Phase 8 first submit\"}" \
  https://techcloudpro.com/api/contact.php

# Probe DB to confirm last_notified_at is set
# (deploy probe file as in Battery 1, query SELECT visitor_id, email, last_notified_at FROM identified_visitors WHERE email=$EMAIL, capture verbatim)

# Wait 5s, second submit with SAME cookie jar (same visitor_id) — expect throttle (no new notification)
sleep 5
curl -A "$UA" -b "$COOKIE_JAR" -c "$COOKIE_JAR" -X POST -H "Content-Type: application/json" \
  -d "{\"name\":\"Phase 8 Contact Test\",\"email\":\"$EMAIL\",\"company\":\"TCP Phase 8 Co\",\"phone\":\"+1-555-0314\",\"message\":\"Phase 8 second submit (should throttle)\"}" \
  https://techcloudpro.com/api/contact.php

# Probe DB again — last_notified_at should be UNCHANGED from first submit (throttle worked)
# Probe error_log for "TechCloudPro tcp_notify_new_lead mail() failed" — capture verbatim
```

Capture verbatim curl output AND the DB probe results AND any error_log lines into SUMMARY.

**HOSTINGER mail() POLICY (per `<constraints>`):** if the first submit's `last_notified_at` IS set, mail() returned true → SUCCESS. If `last_notified_at` is NULL but error_log shows "tcp_notify_new_lead mail() failed" → DOCUMENT the outcome but DO NOT GATE on success. Hostinger's shared mail server may reject from non-SPF-aligned envelopes (techcloudpro.com From: header may not have proper SPF for outbound mail()). The HELPER WORKED if it attempted the send — the SMTP outcome is out of our control. Document this in SUMMARY explicitly.

---

**STEP E — Battery 3: Live E2E via customize-architecture.php (playground)**

```bash
EMAIL="jeetnair.in+phase8-playground-test-$(date +%s)@gmail.com"

curl -A "$UA" -X POST -H "Content-Type: application/json" \
  -d "{\"industry\":\"Healthcare\",\"use_case\":\"Phase 8 test\",\"email\":\"$EMAIL\",\"name\":\"Phase 8 Playground Test\",\"company\":\"TCP Phase 8 PG Co\"}" \
  https://techcloudpro.com/api/customize-architecture.php
```

Note: this endpoint calls Anthropic API (~$0.50, ~75s latency per 308-SUMMARY). It is acceptable to run ONE real call for verification. Capture HTTP code + truncated response body. Probe DB for `WHERE email=$EMAIL AND source_form='ai-playground'` to confirm row + last_notified_at set.

If Anthropic API budget is a concern, an alternative: skip the full call and instead deploy `_probe-314-playground.php` that bypasses Anthropic and directly calls `tcp_upsert_identified_visitor` + checks `is_new_email` returns true. Document which path was used.

---

**STEP F — Battery 4: Live E2E via study-guide-download.php**

```bash
EMAIL="jeetnair.in+phase8-sg-test-$(date +%s)@gmail.com"

curl -A "$UA" -X POST -H "Content-Type: application/json" \
  -d "{\"name\":\"Phase 8 SG Test\",\"email\":\"$EMAIL\",\"company\":\"TCP Phase 8 SG Co\"}" \
  https://techcloudpro.com/api/study-guide-download.php
```

Expect: HTTP 200 + `{"ok":true,"download_url":"/tools/rag-study-guide.html",...}`. Probe DB for `WHERE email=$EMAIL AND source_form='rag-study-guide'`. Confirm last_notified_at set.

---

**STEP G — Battery 5: identify-from-email.php with synthetic test data (expect SKIPPED notification)**

This test confirms the skip-list correctly silences synthetic test traffic from the email-click receiver. Use a `tcp-3XX-` prefix email (which the skip-list catches):

The endpoint with TCP_IDENTITY_STUB=false (per 309-SUMMARY) requires a real BM emailLogId to resolve PII server-side. This means we CANNOT directly test the email-click path with a synthetic email without re-flipping the stub flag. Two options:

**Option G1 (preferred):** Use the most recent live BM emailLogId pattern from 309-SUMMARY to test the full chain (BM lookup → real PII → notification). This will create a notification for a REAL prospect, which is the production behavior. To avoid notifying about a stale prospect, use a CURRENT campaign emailLogId. If unavailable, skip option G1.

**Option G2 (acceptable fallback):** Deploy `_probe-314-emailclick.php` that directly calls the helper chain WITH a `tcp-314-emailclick-test@example.com` synthetic email and verifies `tcp_notify_new_lead()` returns false (skip-list). Document explicitly in SUMMARY that option G2 was used because real-PII test from live BM was deferred.

Whichever option is chosen, capture verbatim evidence in SUMMARY.

---

**STEP H — Battery 6: Regression test — existing contact form behavior preserved**

This is the highest-risk regression per `<constraints>`. The original prod path (rajesh/jm dependent) MUST still work.

```bash
# Same test as Battery 2 but use a DIFFERENT real-deliverable address that doesn't collide with skip-list
EMAIL="jeetnair.in+phase8-regression-$(date +%s)@gmail.com"

curl -A "$UA" -X POST -H "Content-Type: application/json" \
  -d "{\"name\":\"Phase 8 Regression Test\",\"email\":\"$EMAIL\",\"company\":\"Regression Co\",\"message\":\"Verify rajesh/jm still notified after refactor\"}" \
  https://techcloudpro.com/api/contact.php
```

Expected outcomes (capture all):
1. HTTP 200 + `{"success":true,"lead_saved":true,...}` body
2. `leads.jsonl` on server has the new entry (probe `tail -1 /home/u350621741/.../leads/leads.jsonl`)
3. `identified_visitors` row created (probe DB)
4. `last_notified_at` SET on the row (proof helper fired)
5. error_log MAY show "tcp_notify_new_lead mail() failed" (if Hostinger SMTP rejects) — document but don't fail
6. Compare to old path: BEFORE the refactor, `email_sent` field in response = `$success`. AFTER the refactor, the field is `null` (or whatever was decided in Step D1b). Document the schema change in SUMMARY for any frontend consumers.

---

**STEP I — Cleanup**

SSH-delete ALL probe files deployed during testing:
```bash
ssh -p 65002 -i ~/.ssh/id_ed25519 u350621741@147.93.101.51 \
  "rm -f /home/u350621741/domains/techcloudpro.com/public_html/api/_probe-314-*.php"
```

Verify removed: `curl -sI -A "$UA" https://techcloudpro.com/api/_probe-314-helper.php | head -1` returns 404.

---

**STEP J — Write SUMMARY**

Mirror the structure of 307/308/309/310 SUMMARYs exactly. Required sections:

- Frontmatter (phase, plan, dependency-graph, tech-stack, key-files, decisions, metrics)
- One-liner
- What was built (helper + extended upsert + 4 endpoints, schema migration)
- Verification — VERBATIM evidence (each battery 1-6, with full curl outputs and DB probe outputs preserved)
- Privacy stance (notification emails contain PII, going to internal team only — same as contact.php has had since launch, NOT a new external disclosure)
- Hostinger mail() policy explanation (per <constraints>: mail() returning false documented but not failure-gating)
- DB tables touched
- Files changed
- Deviations from Plan (Rules 1-3 auto-fixes if any)
- Phase X follow-ups (Slack/webhook path, daily digest, per-source toggle — all per planning_context)
- Rollback playbook (contact.php is highest risk — `git revert <contact.php commit>` is Tier 1)
- CR ticket: skipped (TCP infra)
- Authentication gates: none
- Commit hashes (5 techcloudpro + 1 dollor.ai)
- Live URLs (no new endpoints — additive helper)
- Self-Check checklist

**Final dollor.ai commit:**
```bash
cd /Users/jeet/doordash-p2p
git add .planning/quick/314-unified-lead-notification-system-on-tech/314-SCHEMA_PROBE.md \
        .planning/quick/314-unified-lead-notification-system-on-tech/314-PLAN.md \
        .planning/quick/314-unified-lead-notification-system-on-tech/314-SUMMARY.md
git commit -m "docs(quick-314): unified lead-notification system — PLAN + SCHEMA_PROBE + SUMMARY"
```

NO push to remote (per CLAUDE.md).
  </action>
  <verify>
1. `curl -sI -A "$UA" https://techcloudpro.com/api/contact.php -X POST` returns 4xx (NOT 500) — file parses on server
2. `curl -sI -A "$UA" https://techcloudpro.com/api/_probe-314-helper.php` returns 404 — probe deleted
3. `cat .planning/quick/314-unified-lead-notification-system-on-tech/314-SUMMARY.md` exists and contains all 6 batteries with verbatim curl outputs
4. SUMMARY contains string "Hostinger mail() policy" or equivalent documentation of the SPF caveat
5. `cd /Users/jeet/doordash-p2p && git log --oneline -1` shows the docs commit
6. `cd /Users/jeet/techcloudpro && git log --oneline -5` shows the 5 atomic Task 1 commits unchanged
7. NO git push commands in the bash history during this task
8. SUMMARY contains explicit Phase X follow-ups: Slack/webhook, daily digest, per-source toggle
9. SUMMARY contains explicit rollback playbook with `git revert <contact.php commit>` as Tier 1
10. For each battery 2-6 in SUMMARY: a clear PASS/DOCUMENTED-FAILURE-OF-MAIL marker (per `<constraints>`, mail() failure is documented but not a failure)
  </verify>
  <done>
- All 5 PHP files deployed to Hostinger
- Anthropic key injection on customize-architecture.php confirmed (sk-ant-api03 count == 1)
- Smoke tests prove all 4 endpoints parse on server (4xx not 500)
- Battery 1 (skip-list unit tests): 3/3 PASS verbatim
- Battery 2 (contact.php first + throttle): verbatim curl output preserved, last_notified_at evidence in SUMMARY
- Battery 3 (playground): verbatim output, source_form='ai-playground' DB row evidence
- Battery 4 (study-guide): verbatim output, source_form='rag-study-guide' DB row evidence
- Battery 5 (email-click): option G1 or G2 documented and verified
- Battery 6 (regression — contact form): rajesh/jm/contact still get notified OR mail() failure is documented per <constraints>; lead still saved to leads.jsonl + identified_visitors
- All probe files deleted from server (404 confirmed)
- 314-SUMMARY.md written following 307/308/309/310 template with all 6 batteries, privacy stance, mail() policy, Phase X follow-ups, rollback playbook, self-check
- Final dollor.ai commit lands docs only — no remote pushes anywhere
  </done>
</task>

</tasks>

<verification>
**Phase-level checks (cross-cutting):**

1. **No remote pushes** — `cd /Users/jeet/techcloudpro && git status` and `cd /Users/jeet/doordash-p2p && git status` should both show "Your branch is ahead of origin/main" but no push command was run during this task. Per CLAUDE.md.

2. **Atomic per-file commits in techcloudpro** — `git log --oneline -5` shows 5 commits, one per file. Per `<constraints>`.

3. **Schema migration verified by probe** — 314-SCHEMA_PROBE.md preserves verbatim DESCRIBE output proving `last_notified_at` exists.

4. **All 4 endpoints wired** — grep counts in verify section confirm tcp_notify_new_lead( appears once per endpoint.

5. **Inline mail() block removed from contact.php** — grep `@mail(` returns 0 in contact.php.

6. **Breaking change consistent** — all 4 callers updated atomically (no remaining caller using old `string` return type).

7. **Skip-list works** — Battery 1 verbatim output shows 3/3 false returns for synthetic test patterns.

8. **Throttle works** — Battery 2 verbatim output shows second submit with same cookie does NOT update last_notified_at OR sends a second mail() (the implementation queries server NOW() comparison so this is deterministic).

9. **Regression preserved** — Battery 6 verbatim output confirms contact form still saves lead + still attempts mail() with rajesh/jm/contact recipient list.

10. **Hostinger mail() failure documented but not failing** — SUMMARY explicitly notes per `<constraints>`: "If Hostinger mail() returns false, this is documented but not gated upon — Hostinger's shared mail server may reject from non-SPF-aligned envelopes."
</verification>

<success_criteria>
- [ ] last_notified_at column added to identified_visitors (DESCRIBE evidence)
- [ ] tcp_notify_new_lead() helper exists in _visitor.php with skip-list, throttle, mail(), error_log
- [ ] tcp_upsert_identified_visitor() returns [canonical_id, is_new_email] tuple (BREAKING CHANGE)
- [ ] All 3 existing callers (contact, customize-architecture, study-guide-download) updated for new return shape
- [ ] identify-from-email.php (4th caller) wired with helper call
- [ ] contact.php inline mail() block REMOVED (grep `@mail(` returns 0)
- [ ] All 5 PHP files pass `php -l` syntax check
- [ ] All 5 files deployed to Hostinger
- [ ] customize-architecture.php Anthropic key injection confirmed on server
- [ ] Battery 1 (helper unit tests): 3/3 skip-list returns false
- [ ] Battery 2 (contact.php E2E): first submit fires notification (last_notified_at set OR mail() failure logged), second submit within 1hr is throttled
- [ ] Battery 3 (playground E2E): notification fires for new ai-playground prospect
- [ ] Battery 4 (study-guide E2E): notification fires for new rag-study-guide prospect
- [ ] Battery 5 (email-click): synthetic skip-list verified OR live BM round-trip documented
- [ ] Battery 6 (regression): contact form still works end-to-end (lead saved + helper attempted mail)
- [ ] All probe files deleted from server (404 confirmed)
- [ ] 5 atomic commits in techcloudpro repo (one per file), 1 docs commit in dollor.ai
- [ ] No remote pushes
- [ ] 314-SCHEMA_PROBE.md + 314-SUMMARY.md written following 307/308/309/310 template
</success_criteria>

<output>
After completion:
- `.planning/quick/314-unified-lead-notification-system-on-tech/314-SCHEMA_PROBE.md` (verbatim DESCRIBE evidence)
- `.planning/quick/314-unified-lead-notification-system-on-tech/314-SUMMARY.md` (full task summary)
- 5 commits on `gsd/phase-21-mixmind-native-pioneer-usb-export` branch in `/Users/jeet/techcloudpro`
- 1 commit on `gsd/phase-21-mixmind-native-pioneer-usb-export` branch in `/Users/jeet/doordash-p2p`
</output>
