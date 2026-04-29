---
phase: 316-refactor-tcp-secrets-out-of-php-source-i
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - /Users/jeet/techcloudpro/.gitignore
  - /Users/jeet/techcloudpro/api/_secrets.php
  - /Users/jeet/techcloudpro/api/_secrets.example.php
  - /Users/jeet/techcloudpro/api/.htaccess
  - /Users/jeet/techcloudpro/api/_visitor.php
  - /Users/jeet/techcloudpro/api/identify-from-email.php
  - /Users/jeet/techcloudpro/api/chat.php
  - /Users/jeet/techcloudpro/api/contact.php
  - /Users/jeet/techcloudpro/api/collect.php
  - /Users/jeet/techcloudpro/api/customize-architecture.php
  - /Users/jeet/techcloudpro/api/study-guide-download.php
  - /Users/jeet/techcloudpro/api/playground-load.php
  - /Users/jeet/techcloudpro/api/playground-render.php
  - /Users/jeet/techcloudpro/api/stats.php
  - .planning/quick/316-refactor-tcp-secrets-out-of-php-source-i/316-PRECHECK.md
  - .planning/quick/316-refactor-tcp-secrets-out-of-php-source-i/316-SUMMARY.md
autonomous: true
requirements:
  - SEC-316-01  # Centralize all TCP PHP secrets into untracked _secrets.php loaded on Hostinger
  - SEC-316-02  # Block _secrets.php from git via .gitignore + add tracked _secrets.example.php template
  - SEC-316-03  # Block web-serving of _secrets*.php via Apache .htaccess deny rule
  - SEC-316-04  # Refactor 10 PHP files (_visitor.php, identify-from-email.php, chat.php, contact.php, collect.php, customize-architecture.php, study-guide-download.php, playground-load.php, playground-render.php, stats.php) to require_once _secrets.php and use TCP_DB_* / TCP_BM_SHARED_SECRET / IPINFO_API_TOKEN constants
  - SEC-316-05  # Pre-push hygiene gate — secret-scan diff vs origin/main shows zero new occurrences of the secret values in the working-tree commits

user_setup: []

must_haves:
  truths:
    - "Secrets-touching: relocates live BM auth token + DB creds — production-server-config-impacting refactor"
    - "Order matters: _secrets.php must land on server BEFORE refactored code references it"
    - "All-or-nothing deploy: refactored PHP files deploy as single batch — partial state would break some endpoints"
    - "DOES NOT rewrite git history — old commit 63a9680 still has the secret value (rotation is Phase X follow-up)"
    - "Privacy unchanged: same secrets, just relocated"
    - "Web-serve denial proven: curl https://techcloudpro.com/api/_secrets.php returns 403/404 (NEVER 200 with PHP source)"
    - "Production unchanged: contact / playground / study-guide / email-click forms still write to identified_visitors and fire tcp_notify_new_lead helper post-refactor"
  artifacts:
    - path: "/Users/jeet/techcloudpro/api/_secrets.php"
      provides: "Centralized constant store for TCP_DB_HOST/NAME/USER/PASS + TCP_BM_SHARED_SECRET + IPINFO_API_TOKEN; gitignored"
      contains: "define('TCP_SECRETS_LOADED', true); define('TCP_DB_USER',..."
      tracked_in_git: false
    - path: "/Users/jeet/techcloudpro/api/_secrets.example.php"
      provides: "Tracked placeholder template + setup comment; future fresh-clones know to create _secrets.php"
      contains: "PASTE_DB_USER_HERE / PASTE_DB_PASS_HERE / PASTE_BM_SHARED_SECRET_HERE / PASTE_IPINFO_TOKEN_HERE"
      tracked_in_git: true
    - path: "/Users/jeet/techcloudpro/.gitignore"
      provides: "+1 line: api/_secrets.php (allows api/_secrets.example.php through)"
    - path: "/Users/jeet/techcloudpro/api/.htaccess"
      provides: "FilesMatch deny rule for _secrets*.php (Apache 2.4 syntax). Created if absent; appended-to if present."
    - path: "10 refactored PHP files"
      provides: "All require_once __DIR__ . '/_secrets.php' immediately after <?php; no inline DB/BM secret string literals"
      files: ["_visitor.php", "identify-from-email.php", "chat.php", "contact.php", "collect.php", "customize-architecture.php", "study-guide-download.php", "playground-load.php", "playground-render.php", "stats.php"]
  key_links:
    - from: "any refactored PHP file"
      to: "_secrets.php constants (TCP_DB_USER / TCP_DB_PASS / TCP_DB_NAME / TCP_DB_HOST)"
      via: "require_once + constant reference at PDO open site"
      pattern: "require_once __DIR__ . '/_secrets\\.php'"
    - from: "identify-from-email.php"
      to: "TCP_BM_SHARED_SECRET constant"
      via: "X-Identity-Token cURL header"
      pattern: "X-Identity-Token: \\. TCP_BM_SHARED_SECRET"
    - from: "Hostinger Apache"
      to: "/api/_secrets.php request"
      via: ".htaccess FilesMatch Require all denied"
      pattern: "<FilesMatch.*_secrets.*\\.php"
    - from: "git index"
      to: "api/_secrets.php"
      via: "_visitor.php (existing, unchanged) — _secrets.php SHOULD be excluded by .gitignore"
      pattern: "git status --porcelain api/_secrets.php → empty (ignored)"
    - 309-SUMMARY: TCP_BM_SHARED_SECRET origin (commit 63a9680, pre-existing in source)
    - 314-SUMMARY: latest helper state (post-mail unify) — no helper signature changes in 316
---

<objective>
Centralize all TechCloudPro PHP secrets (DB creds + BrandMonkz shared secret + IPInfo placeholder) into a single untracked `api/_secrets.php` on Hostinger, refactor 10 PHP source files to load constants from it, and add Apache + git defenses so the secrets file never reaches the web AND never enters git. Pre-push hygiene gate: after this plan runs, `git diff HEAD~11..HEAD` over the techcloudpro repo (the 11 commits this task adds: 1 scaffold + 10 refactor) MUST show zero occurrences of `Thirumala977!` or `32817b8c34738c7f4c0750719888cb6b841719880953df524d8625c97eb022b2`. NOTE: do NOT use `origin/main..HEAD` — the pre-existing 24-commit range already contains 63a9680 with the secret value; the gate is about NEW commits this task adds, not pre-existing ones. Old commit `63a9680` still contains the secret value verbatim — rotating that value is a MANDATORY Phase X follow-up post-push, NOT this plan.

Purpose: Pre-push hygiene gate so the 24-commit techcloudpro/main can be pushed without leaking NEW secret strings into source control. Stop the bleeding now; rotate-after-push later.

Output: Refactored techcloudpro repo with 10 atomic per-file commits + 1 scaffolding commit, secrets file living server-only on Hostinger, 9 verification batteries (A–I) all PASS, SUMMARY documenting verbatim probe outputs + Phase X rotation flagged as MANDATORY follow-up.

⚠️ DESTRUCTIVE-RISK to prod: any single endpoint break post-refactor = rajesh/jm/contact stop receiving lead notifications, contact form returns 500, playground returns 500. Highest-risk endpoint per quick-314 = contact.php. Test it specifically post-refactor.
</objective>

<execution_context>
@/Users/jeet/.claude/get-shit-done/workflows/execute-plan.md
@/Users/jeet/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@/Users/jeet/doordash-p2p/.planning/STATE.md
@/Users/jeet/doordash-p2p/CLAUDE.md
@/Users/jeet/doordash-p2p/.planning/quick/305-build-tcp-analytics-stats-php-on-techclo/305-SUMMARY.md
@/Users/jeet/doordash-p2p/.planning/quick/307-phase-1-identity-stack-form-fill-identit/307-SUMMARY.md
@/Users/jeet/doordash-p2p/.planning/quick/309-phase-2b-identity-stack-brandmonkz-sende/309-SUMMARY.md
@/Users/jeet/doordash-p2p/.planning/quick/314-unified-lead-notification-system-on-tech/314-SUMMARY.md

# Source files to refactor — read at task time, not now (executor will read each per-file)
# /Users/jeet/techcloudpro/api/_visitor.php
# /Users/jeet/techcloudpro/api/identify-from-email.php
# /Users/jeet/techcloudpro/api/chat.php
# /Users/jeet/techcloudpro/api/contact.php
# /Users/jeet/techcloudpro/api/collect.php
# /Users/jeet/techcloudpro/api/customize-architecture.php
# /Users/jeet/techcloudpro/api/study-guide-download.php
# /Users/jeet/techcloudpro/api/playground-load.php
# /Users/jeet/techcloudpro/api/playground-render.php
# /Users/jeet/techcloudpro/api/stats.php
</context>

<plan_known_facts>

| # | Fact | Source |
|---|------|--------|
| 1 | DB creds in source: `'u350621741_jeet977'` / `'Thirumala977!'` / `'u350621741_visitors'` / `'localhost'` | _visitor.php:17-20, chat.php:141-145, etc. |
| 2 | BM shared secret in source: `define('TCP_BM_SHARED_SECRET', '32817b8c34738c7f4c0750719888cb6b841719880953df524d8625c97eb022b2')` | identify-from-email.php:17 |
| 3 | IPInfo placeholder in source: `define('IPINFO_API_TOKEN_PLACEHOLDER', 'PHASE_5B_PASTE_TOKEN_HERE')` | _visitor.php:376 |
| 4 | Anthropic API key NOT in repo today — sed-injected on server at deploy time. Leave that mechanism untouched (do NOT centralize Anthropic key into _secrets.php — different injection lifecycle, would break Vite-dist deploy pattern per memory `tcp-blog-aeo-pattern`) | chat.php:24 (placeholder), customize-architecture.php:27 (placeholder), match-usecase.php:23 (placeholder) |
| 5 | Hostinger SSH: `u350621741@147.93.101.51` port `65002` via `~/.ssh/id_ed25519` | 305-SUMMARY |
| 6 | Web doc root: `/home/u350621741/domains/techcloudpro.com/public_html/api/` | 305-SUMMARY |
| 7 | Cloudflare WAF blocks default curl UA → all curl probes MUST use Safari UA `'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15'` | MEMORY rule, 305/307/309-SUMMARY |
| 8 | NO local PHP runtime on Mac → use live curl as syntax oracle (smoke test post-deploy: 4xx not 500 = parses) | 306, 314-SUMMARY |
| 9 | match-usecase.php contains NO DB creds (only Anthropic placeholder) — DO NOT touch in 316 | grep verified pre-plan |
| 10 | _secrets.example.php = TRACKED in git (it's the template). _secrets.php = NEVER tracked | this plan |
| 11 | Existing `.htaccess` does NOT exist at `/Users/jeet/techcloudpro/api/.htaccess` locally — Hostinger may have one server-side (gate γ check Task 1) | grep verified pre-plan |
| 12 | If gate γ trips (.htaccess on Hostinger has unexpected structure / non-empty rules), STOP-and-ask before adding new directives — could lock down legitimate endpoints | gate γ |
| 13 | Apache 2.4 deny syntax: `<FilesMatch "^_secrets.*\.php$">Require all denied</FilesMatch>`. Apache 2.2 (legacy) syntax: `<FilesMatch>Order allow,deny / Deny from all</FilesMatch>`. Hostinger uses Apache 2.4 — but verify in Task 1. | Apache docs |
| 14 | Hostinger does NOT trigger automatic deploys — code lives on Hostinger ONLY when scp'd. Local techcloudpro repo state ≠ server state. Atomic-deploy = single scp batch with `-O` flag for explicit per-file copies, NOT recursive rsync (avoids accidental .htaccess overwrite if mismatched). | 309/314-SUMMARY |
| 15 | git branch `main` has 24 unpushed commits. We add 11 more (1 scaffold + 10 refactor) → 35 unpushed before push. Old commits stay — secret remains in commit `63a9680`. Force-push is OUT OF SCOPE for this plan (Decision Point: defer to Phase X rotation). | git log + STATE.md |
| 16 | STOP-and-ask gate α: if `git ls-files api/_secrets.php` returns non-empty (somehow already tracked), STOP — `git rm --cached api/_secrets.php` requires user confirmation | gate α |
| 17 | STOP-and-ask gate β: if any production endpoint test fails post-refactor (DB connection error, BM auth error), STOP and revert via `git revert <commit>` + scp the reverted version. Don't continue if a single endpoint is broken. | gate β |
| 18 | STOP-and-ask gate δ: if grep finds secrets in MORE files than the 10 enumerated above (e.g., archived `.bak`, `seo/`, etc.), STOP and ask before refactoring those — could be legacy/archived code that shouldn't be touched | gate δ |
| 19 | Probe-then-delete pattern: deploy a `_probe-316.php` that prints `defined('TCP_SECRETS_LOADED'), TCP_DB_USER, TCP_DB_NAME, TCP_DB_HOST, strlen(TCP_BM_SHARED_SECRET), defined('IPINFO_API_TOKEN')` → curl with Safari UA → DELETE on server → curl confirms 404. Same pattern as 305/307/310/314 schema probes. NEVER print full secret values; only `strlen()` for the BM token. | this plan |
| 20 | Highest-risk endpoint per quick-314 = `contact.php` — rajesh/jm/contact stop receiving lead notifications if it 500s. Battery 6 (regression) MUST hit contact.php with real-deliverable email `jeetnair.in+phase9-secrets-contact-<ts>@gmail.com` and verify HTTP 200 + identified_visitors row + tcp_notify_new_lead helper fired. | quick-314 Battery 6 |

</plan_known_facts>

<tasks>

<task type="auto">
  <name>Task 1: Pre-flight inspect + scaffold local files (NO deploys)</name>
  <files>
    .planning/quick/316-refactor-tcp-secrets-out-of-php-source-i/316-PRECHECK.md
    /Users/jeet/techcloudpro/.gitignore
    /Users/jeet/techcloudpro/api/_secrets.php
    /Users/jeet/techcloudpro/api/_secrets.example.php
    /Users/jeet/techcloudpro/api/.htaccess
  </files>

  <action>
**STEP 1A — Inspect current state (zero changes).** Open `316-PRECHECK.md` and append verbatim findings as you go. Do NOT proceed if any STOP gate trips.

```bash
# 1A.1 — Find ALL secret occurrences across api/*.php (gate δ)
cd /Users/jeet/techcloudpro
echo "=== DB user 'u350621741_jeet977' ===" >> .planning-precheck.tmp
grep -rn "u350621741_jeet977" api/ 2>/dev/null
echo "=== DB pass 'Thirumala977!' ==="
grep -rn "Thirumala977!" api/ 2>/dev/null
echo "=== BM secret '32817b8c...' ==="
grep -rn "32817b8c34738c7f4c0750719888cb6b841719880953df524d8625c97eb022b2" api/ 2>/dev/null
echo "=== IPInfo placeholder ==="
grep -rn "PHASE_5B_PASTE_TOKEN_HERE" api/ 2>/dev/null
```

Expected files (record actual): `_visitor.php`, `identify-from-email.php`, `chat.php`, `contact.php`, `collect.php`, `customize-architecture.php`, `study-guide-download.php`, `playground-load.php`, `playground-render.php`, `stats.php`. **STOP-AND-ASK gate δ:** if grep returns ANY file outside this list (e.g. `*.bak`, `seo/*.php`, archived files, non-`api/` location), STOP and surface the unexpected file to the user — do NOT silently expand scope.

```bash
# 1A.2 — Confirm _secrets.php is NOT already tracked (gate α)
cd /Users/jeet/techcloudpro
git ls-files api/_secrets.php
# Expected output: EMPTY. If non-empty, STOP — file is somehow already tracked, requires git rm --cached
```

```bash
# 1A.3 — Inspect existing .htaccess on Hostinger /api/ (gate γ)
ssh -p 65002 -i ~/.ssh/id_ed25519 u350621741@147.93.101.51 \
  "ls -la /home/u350621741/domains/techcloudpro.com/public_html/api/.htaccess 2>/dev/null && \
   echo '--- CONTENTS ---' && \
   cat /home/u350621741/domains/techcloudpro.com/public_html/api/.htaccess 2>/dev/null || \
   echo '(no .htaccess in /api/)'"
```

**STOP-AND-ASK gate γ:** Three branches:
- (γ.1) **No .htaccess exists in /api/** → safe path. Will create a brand-new minimal one in step 1B.4.
- (γ.2) **.htaccess exists with ONLY a `RewriteEngine On` / `Options -Indexes` / similarly-additive rules** → safe path. Append the deny rule to the LOCAL copy + scp later in Task 2.
- (γ.3) **.htaccess exists with `Require` / `Deny` / `Allow` / regex denylist / unfamiliar directives** → STOP and ask user — the existing rules might be load-bearing for unrelated files; do NOT blindly append.

Also confirm Apache version:
```bash
ssh -p 65002 -i ~/.ssh/id_ed25519 u350621741@147.93.101.51 \
  "echo '<?php echo apache_get_version(); ?>' > /tmp/_apver.php && \
   php -r 'echo PHP_SAPI;' && echo"  # may not work on shared host
# Fallback: send `<?php phpinfo(); ?>` probe later if needed.
```
For our purposes, default-assume Apache 2.4 syntax (Hostinger shared hosting since 2024+ runs Apache 2.4) — but record the version finding in PRECHECK if obtainable.

```bash
# 1A.4 — Read current .gitignore to know where to append
cat /Users/jeet/techcloudpro/.gitignore
```

Record verbatim in PRECHECK: list of secret-containing files (must be the 10 expected), gate-α result (untracked), gate-γ branch (γ.1/γ.2/γ.3), Apache version if obtainable, current .gitignore contents.

---

**STEP 1B — Scaffold local files (atomic; LOCAL filesystem only; no scp yet).**

**1B.1 — Append to `.gitignore`:**

Edit `/Users/jeet/techcloudpro/.gitignore` to add (preserve existing content):
```
# === Quick task 316 — TCP secrets refactor ===
# api/_secrets.php holds DB creds + BM shared secret + IPInfo token
# It MUST NEVER be committed. Tracked template: api/_secrets.example.php
api/_secrets.php
```

Verify:
```bash
cd /Users/jeet/techcloudpro
git check-ignore api/_secrets.php  # should output the path (means ignored)
```

**1B.2 — Create `api/_secrets.example.php` (TRACKED template):**

```php
<?php
/**
 * TCP Secrets — TEMPLATE (tracked in git as a placeholder).
 *
 * Setup on a fresh clone:
 *   1. cp api/_secrets.example.php api/_secrets.php
 *   2. Replace each PASTE_*_HERE with the real value (DB user/pass/host/db
 *      name from Hostinger MySQL panel; BM shared secret from AWS SM
 *      `brandmonkz/production/tcp-identity-shared-secret`; IPInfo token
 *      from ipinfo.io once Phase 5b lands).
 *   3. .gitignore already excludes api/_secrets.php — verify with
 *      `git check-ignore api/_secrets.php` before committing anything.
 *   4. .htaccess in this directory denies web access to _secrets*.php —
 *      verify with `curl https://techcloudpro.com/api/_secrets.php` returns
 *      403/404, NEVER 200 with PHP source.
 *
 * Quick task 316 (2026-04-29). See .planning/quick/316-.../316-SUMMARY.md.
 */

if (defined('TCP_SECRETS_LOADED')) return;
define('TCP_SECRETS_LOADED', true);

// MySQL on Hostinger
define('TCP_DB_HOST', 'localhost');
define('TCP_DB_NAME', 'PASTE_DB_NAME_HERE');
define('TCP_DB_USER', 'PASTE_DB_USER_HERE');
define('TCP_DB_PASS', 'PASTE_DB_PASS_HERE');

// BrandMonkz shared secret for /api/identify-from-email.php
define('TCP_BM_SHARED_SECRET', 'PASTE_BM_SHARED_SECRET_HERE');

// IPInfo API token (Phase 5b — currently a placeholder; do not call ipinfo
// yet, IP_LOOKUP_PROVIDER stays at 'stub' until token is real)
define('IPINFO_API_TOKEN', 'PHASE_5B_PASTE_TOKEN_HERE');
```

**1B.3 — Create `api/_secrets.php` (LOCAL only, NEVER committed):**

```php
<?php
/**
 * TCP Secrets — server-only, NEVER committed. See _secrets.example.php for setup.
 * Quick task 316 (2026-04-29).
 */

if (defined('TCP_SECRETS_LOADED')) return;
define('TCP_SECRETS_LOADED', true);

define('TCP_DB_HOST', 'localhost');
define('TCP_DB_NAME', 'u350621741_visitors');
define('TCP_DB_USER', 'u350621741_jeet977');
define('TCP_DB_PASS', 'Thirumala977!');

define('TCP_BM_SHARED_SECRET', '32817b8c34738c7f4c0750719888cb6b841719880953df524d8625c97eb022b2');

define('IPINFO_API_TOKEN', 'PHASE_5B_PASTE_TOKEN_HERE');
```

After creating, immediately re-verify gate α:
```bash
cd /Users/jeet/techcloudpro
git status --porcelain api/_secrets.php
# Expected: EMPTY (file is gitignored, won't show as untracked-new)
git status --porcelain api/_secrets.example.php
# Expected: "?? api/_secrets.example.php" (untracked-new — will be added in scaffolding commit)
```

If `api/_secrets.php` shows as `??` (untracked-new), STOP — gitignore didn't take effect. Re-check 1B.1.

**1B.4 — Create / patch `api/.htaccess`:**

Branch on gate-γ result from 1A.3:

- **γ.1 (no .htaccess exists)** — create a fresh minimal `/Users/jeet/techcloudpro/api/.htaccess`:
```apache
# TCP API directory — quick task 316
# Block direct web access to the secrets file (defense in depth;
# .gitignore already prevents the file from entering git).
<FilesMatch "^_secrets.*\.php$">
    Require all denied
</FilesMatch>
```

- **γ.2 (additive-only existing .htaccess on Hostinger)** — pull the existing file down first, then append:
```bash
scp -P 65002 -i ~/.ssh/id_ed25519 \
  u350621741@147.93.101.51:/home/u350621741/domains/techcloudpro.com/public_html/api/.htaccess \
  /Users/jeet/techcloudpro/api/.htaccess.from-server
# Diff for sanity: cat .htaccess.from-server
# Then create local /api/.htaccess = old contents + appended deny block.
```
Append the same `<FilesMatch>` block to the BOTTOM of the pulled file. Save as `/Users/jeet/techcloudpro/api/.htaccess`. Delete `.htaccess.from-server` after merge.

- **γ.3 (unexpected directives)** — STOP and ask user. Do not proceed past 1B.4.

---

**STEP 1C — Atomic commit (scaffolding only, NO deploys yet).**

```bash
cd /Users/jeet/techcloudpro
git add .gitignore api/_secrets.example.php api/.htaccess
# Note: api/_secrets.php is intentionally NOT staged (gitignored).
git status                # confirm api/_secrets.php is NOT in staged list
git diff --cached         # review diff once
git commit -m "$(cat <<'EOF'
chore(secrets): scaffold _secrets.example.php + .gitignore + .htaccess

Quick task 316 — pre-push hygiene gate. Adds:
  - api/_secrets.example.php (tracked template with PASTE_*_HERE)
  - .gitignore: api/_secrets.php (file itself is server-only)
  - api/.htaccess: deny web access to ^_secrets.*\.php$

api/_secrets.php (real values) is created LOCALLY but NOT committed.
Refactor of 10 PHP files to require_once _secrets.php follows in
subsequent commits (Task 2). Anthropic key injection mechanism
(separate sed-on-deploy lifecycle) intentionally left untouched.

Old commit 63a9680 still contains the BM shared secret value verbatim;
secret rotation is a MANDATORY Phase X follow-up post-push.

Refs: .planning/quick/316-refactor-tcp-secrets-out-of-php-source-i/316-PLAN.md
EOF
)"
```

---

**STEP 1D — Append findings to PRECHECK.md.** Format:

```markdown
# 316-PRECHECK.md

## 1A — Pre-flight findings

### Files containing TCP secrets (verbatim grep output)
[paste]

### Gate α — _secrets.php tracking status
git ls-files api/_secrets.php → [empty/non-empty]
RESULT: [PROCEED / STOP]

### Gate γ — Existing /api/.htaccess on Hostinger
[paste verbatim cat output, or "(no .htaccess in /api/)"]
BRANCH: [γ.1 / γ.2 / γ.3]
APACHE VERSION (if known): [2.4.x / unknown]

### Gate δ — Files to refactor (final list)
[N files; N == 10 for clean run; if N > 10 STOP]

### Current .gitignore
[paste verbatim]

## 1B — Scaffold actions taken

### .gitignore additions
[paste 4-line diff]

### api/_secrets.example.php (created)
[file size + line count]

### api/_secrets.php (created LOCALLY, gitignored)
[file size + line count]
git status check: [shows ?? or empty?]
git check-ignore api/_secrets.php: [outputs path = ignored]

### api/.htaccess (created or patched)
[paste contents]

## 1C — Scaffolding commit
techcloudpro SHA: [paste]
Files: 3 (.gitignore, api/_secrets.example.php, api/.htaccess)
api/_secrets.php absent from commit: [confirmed via git show --stat]
```
  </action>

  <verify>
```bash
# 1. _secrets.php exists locally + has expected content
test -f /Users/jeet/techcloudpro/api/_secrets.php && \
  grep -c "TCP_DB_USER" /Users/jeet/techcloudpro/api/_secrets.php
# Expected: 1

# 2. _secrets.php is gitignored
cd /Users/jeet/techcloudpro && git check-ignore api/_secrets.php
# Expected: api/_secrets.php (echoed)

# 3. _secrets.php NOT in git
cd /Users/jeet/techcloudpro && git ls-files api/_secrets.php
# Expected: empty

# 4. _secrets.example.php IS in git after commit
cd /Users/jeet/techcloudpro && git ls-files api/_secrets.example.php
# Expected: api/_secrets.example.php

# 5. .htaccess has deny rule
grep -E "^_secrets|<FilesMatch.*_secrets" /Users/jeet/techcloudpro/api/.htaccess
# Expected: 1+ line match

# 6. PRECHECK.md exists
test -f .planning/quick/316-refactor-tcp-secrets-out-of-php-source-i/316-PRECHECK.md
# Expected: success

# 7. Scaffolding commit landed
cd /Users/jeet/techcloudpro && git log -1 --pretty='%h %s'
# Expected: starts with "chore(secrets): scaffold _secrets.example.php"
```
  </verify>

  <done>
- 316-PRECHECK.md captures: secret-file enumeration, gate α/γ/δ outcomes, current .gitignore state, Apache version finding (or "unknown")
- /Users/jeet/techcloudpro/api/_secrets.php exists with all 6 constants (TCP_SECRETS_LOADED + 4 DB + 1 BM + 1 IPInfo)
- /Users/jeet/techcloudpro/api/_secrets.example.php exists with PASTE_*_HERE placeholders + setup-comment docblock
- /Users/jeet/techcloudpro/.gitignore includes `api/_secrets.php` line; `git check-ignore` confirms ignored
- /Users/jeet/techcloudpro/api/.htaccess contains `<FilesMatch "^_secrets.*\.php$">Require all denied</FilesMatch>` (Apache 2.4 syntax) — created fresh OR appended to existing
- Scaffolding commit landed in techcloudpro repo (1 commit, 3 files staged: .gitignore + _secrets.example.php + .htaccess; _secrets.php NOT in commit — verify via `git show --stat HEAD`)
- All 3 STOP-and-ask gates checked + recorded in PRECHECK
- ZERO production impact yet — nothing deployed to Hostinger
  </done>
</task>

<task type="auto">
  <name>Task 2: Deploy _secrets.php FIRST, refactor 10 PHP files in atomic commits, single-batch deploy, run 7 verification batteries</name>
  <files>
    /Users/jeet/techcloudpro/api/_visitor.php
    /Users/jeet/techcloudpro/api/identify-from-email.php
    /Users/jeet/techcloudpro/api/chat.php
    /Users/jeet/techcloudpro/api/contact.php
    /Users/jeet/techcloudpro/api/collect.php
    /Users/jeet/techcloudpro/api/customize-architecture.php
    /Users/jeet/techcloudpro/api/study-guide-download.php
    /Users/jeet/techcloudpro/api/playground-load.php
    /Users/jeet/techcloudpro/api/playground-render.php
    /Users/jeet/techcloudpro/api/stats.php
  </files>

  <action>
**Phase B — Deploy _secrets.php to Hostinger FIRST (BEFORE any code references it).**

```bash
# B.1 — scp _secrets.php to Hostinger /api/
scp -P 65002 -i ~/.ssh/id_ed25519 \
  /Users/jeet/techcloudpro/api/_secrets.php \
  u350621741@147.93.101.51:/home/u350621741/domains/techcloudpro.com/public_html/api/_secrets.php

# B.2 — Confirm landed (sha256 check vs local)
LOCAL_SHA=$(shasum -a 256 /Users/jeet/techcloudpro/api/_secrets.php | awk '{print $1}')
REMOTE_SHA=$(ssh -p 65002 -i ~/.ssh/id_ed25519 u350621741@147.93.101.51 \
  "shasum -a 256 /home/u350621741/domains/techcloudpro.com/public_html/api/_secrets.php | awk '{print \$1}'")
echo "local:  $LOCAL_SHA"
echo "remote: $REMOTE_SHA"
[ "$LOCAL_SHA" = "$REMOTE_SHA" ] && echo "MATCH" || echo "MISMATCH — abort"
```

```bash
# B.3 — Probe: confirm _secrets.php loads + all 6 constants defined.
# Probe writes to a NEW file _probe-316.php that does NOT print secret VALUES (only strlen/defined).
cat > /tmp/_probe-316.php <<'PROBE'
<?php
require_once __DIR__ . '/_secrets.php';
header('Content-Type: application/json');
echo json_encode([
  'TCP_SECRETS_LOADED' => defined('TCP_SECRETS_LOADED'),
  'TCP_DB_HOST_defined' => defined('TCP_DB_HOST'),
  'TCP_DB_NAME_defined' => defined('TCP_DB_NAME'),
  'TCP_DB_USER_defined' => defined('TCP_DB_USER'),
  'TCP_DB_PASS_defined' => defined('TCP_DB_PASS'),
  'TCP_DB_PASS_strlen'  => defined('TCP_DB_PASS') ? strlen(TCP_DB_PASS) : 0,
  'TCP_BM_SHARED_SECRET_defined' => defined('TCP_BM_SHARED_SECRET'),
  'TCP_BM_SHARED_SECRET_strlen'  => defined('TCP_BM_SHARED_SECRET') ? strlen(TCP_BM_SHARED_SECRET) : 0,
  'IPINFO_API_TOKEN_defined' => defined('IPINFO_API_TOKEN'),
]);
PROBE

scp -P 65002 -i ~/.ssh/id_ed25519 /tmp/_probe-316.php \
  u350621741@147.93.101.51:/home/u350621741/domains/techcloudpro.com/public_html/api/_probe-316.php

# Curl probe with Safari UA (Cloudflare WAF rule)
UA='Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15'
curl -sS -A "$UA" https://techcloudpro.com/api/_probe-316.php | tee /tmp/_probe-316-output.json

# Expected (verbatim — record in SUMMARY):
# {"TCP_SECRETS_LOADED":true,"TCP_DB_HOST_defined":true,"TCP_DB_NAME_defined":true,
#  "TCP_DB_USER_defined":true,"TCP_DB_PASS_defined":true,"TCP_DB_PASS_strlen":13,
#  "TCP_BM_SHARED_SECRET_defined":true,"TCP_BM_SHARED_SECRET_strlen":64,
#  "IPINFO_API_TOKEN_defined":true}

# B.4 — DELETE probe + verify removed
ssh -p 65002 -i ~/.ssh/id_ed25519 u350621741@147.93.101.51 \
  "rm /home/u350621741/domains/techcloudpro.com/public_html/api/_probe-316.php"
curl -sS -A "$UA" -o /dev/null -w "%{http_code}\n" \
  https://techcloudpro.com/api/_probe-316.php
# Expected: 404
rm /tmp/_probe-316.php
```

If B.3 doesn't show all 9 booleans true with strlen 13 (TCP_DB_PASS) and strlen 64 (TCP_BM_SHARED_SECRET), STOP — gate β triggers, fix _secrets.php and re-deploy before continuing.

---

**Phase C — Refactor 10 PHP files locally with atomic per-file commits.**

⚠️ Critical order:
1. `_visitor.php` FIRST (defines `tcp_db()` helper that other files depend on)
2. Then files that don't use `tcp_db()` but open their own PDO: `chat.php`, `collect.php`, `playground-load.php`, `playground-render.php`, `customize-architecture.php`, `study-guide-download.php`, `stats.php`
3. Then `contact.php` (uses `tcp_db()` from _visitor.php — depends on Step 1 commit)
4. Then `identify-from-email.php` (uses `tcp_db()` AND has its own `define('TCP_BM_SHARED_SECRET',...)` line to remove)

Refactor pattern for each file. Read the file first, then apply EXACTLY these changes:

**For `_visitor.php`:**
- Add `require_once __DIR__ . '/_secrets.php';` immediately after the docblock comment block ends (BEFORE `function tcp_db()`).
- Replace lines 17-20 (the `new PDO(...)` body inside `tcp_db()`):
  ```php
  // BEFORE:
  return new PDO(
      'mysql:host=localhost;dbname=u350621741_visitors;charset=utf8mb4',
      'u350621741_jeet977',
      'Thirumala977!',
      [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION, PDO::ATTR_TIMEOUT => 5]
  );
  // AFTER:
  return new PDO(
      'mysql:host=' . TCP_DB_HOST . ';dbname=' . TCP_DB_NAME . ';charset=utf8mb4',
      TCP_DB_USER,
      TCP_DB_PASS,
      [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION, PDO::ATTR_TIMEOUT => 5]
  );
  ```
- Remove the `IPINFO_API_TOKEN_PLACEHOLDER` define block (lines ~375-377). The `IPINFO_API_TOKEN` constant is now provided by _secrets.php — but `tcp_resolve_ip_to_company()` currently references `IPINFO_API_TOKEN_PLACEHOLDER` in a comment only, NOT as runtime code. Verify with grep before removing — if it's only in comments, the rename is documentation-only.
- After edit, commit:
```bash
cd /Users/jeet/techcloudpro
git add api/_visitor.php
git commit -m "refactor(api): _visitor.php — load DB creds + IPInfo token from _secrets.php

Quick task 316. tcp_db() now uses TCP_DB_HOST/NAME/USER/PASS constants
from _secrets.php instead of inline literals.

Refs: .planning/quick/316-.../316-PLAN.md"
```

**For `chat.php`:**
- Add `require_once __DIR__ . '/_secrets.php';` BEFORE the existing `header()` calls at the top (NOTE: chat.php currently has no `require_once`. Add immediately after the closing `*/` of the docblock).
- Replace lines 141-145 (the inline PDO open in the analytics try block):
  ```php
  $apdo = new PDO(
      'mysql:host=' . TCP_DB_HOST . ';dbname=' . TCP_DB_NAME . ';charset=utf8mb4',
      TCP_DB_USER,
      TCP_DB_PASS,
      [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION, PDO::ATTR_TIMEOUT => 3]
  );
  ```
- Anthropic key line (line 24, `$ANTHROPIC_API_KEY = 'ANTHROPIC_API_KEY_HERE';`) — DO NOT TOUCH. That uses the sed-on-deploy lifecycle and is out of scope for this plan.
- Commit:
```bash
git add api/chat.php
git commit -m "refactor(api): chat.php — load DB creds from _secrets.php"
```

**For `collect.php`:**
- Add `require_once __DIR__ . '/_secrets.php';` after the OPTIONS short-circuit + method gate (around line 16, BEFORE the rate-limit block to ensure constants are available even if rate-limited).
- Replace the `$db_host = 'localhost'; $db_name = 'u350621741_visitors'; $db_user = 'u350621741_jeet977'; $db_pass = 'Thirumala977!';` block (lines 54-57) with:
  ```php
  $db_host = TCP_DB_HOST;
  $db_name = TCP_DB_NAME;
  $db_user = TCP_DB_USER;
  $db_pass = TCP_DB_PASS;
  ```
  (Keep the local-variable indirection so the existing `new PDO("mysql:host=$db_host;...", $db_user, $db_pass)` line below stays unchanged.)
- Commit:
```bash
git add api/collect.php
git commit -m "refactor(api): collect.php — load DB creds from _secrets.php"
```

**For `contact.php`:**
- Already has `require_once __DIR__ . '/_visitor.php';` (line 8). _visitor.php now loads _secrets.php transitively. But to keep contact.php self-documenting (and not silently dependent on _visitor.php's behavior), ALSO add `require_once __DIR__ . '/_secrets.php';` immediately AFTER the existing `_visitor.php` require. The constant `if (defined('TCP_SECRETS_LOADED')) return;` guard makes this idempotent.
- contact.php has NO direct PDO open today — it uses `tcp_db()` via `tcp_upsert_identified_visitor()`. So no PDO line replacement needed.
- Commit:
```bash
git add api/contact.php
git commit -m "refactor(api): contact.php — explicit require_once _secrets.php

Highest-risk endpoint per quick-314 (rajesh/jm/contact lead emails).
Idempotent require_once guarded by TCP_SECRETS_LOADED constant."
```

**For `customize-architecture.php`:**
- Already requires `_visitor.php`. Add explicit `require_once __DIR__ . '/_secrets.php';` after.
- Replace the inline PDO open (lines 373-378):
  ```php
  $pdo = new PDO(
      'mysql:host=' . TCP_DB_HOST . ';dbname=' . TCP_DB_NAME . ';charset=utf8mb4',
      TCP_DB_USER,
      TCP_DB_PASS,
      [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION, PDO::ATTR_TIMEOUT => 3]
  );
  ```
- Anthropic key line (line 27) — DO NOT TOUCH (sed-on-deploy lifecycle).
- Commit:
```bash
git add api/customize-architecture.php
git commit -m "refactor(api): customize-architecture.php — load DB creds from _secrets.php"
```

**For `study-guide-download.php`:**
- Already requires `_visitor.php`. Add explicit `require_once __DIR__ . '/_secrets.php';`.
- Replace the inline PDO open (lines 66-71):
  ```php
  $pdo = new PDO(
      'mysql:host=' . TCP_DB_HOST . ';dbname=' . TCP_DB_NAME . ';charset=utf8mb4',
      TCP_DB_USER,
      TCP_DB_PASS,
      [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION, PDO::ATTR_TIMEOUT => 3]
  );
  ```
- Commit:
```bash
git add api/study-guide-download.php
git commit -m "refactor(api): study-guide-download.php — load DB creds from _secrets.php"
```

**For `playground-load.php`:**
- No existing require_once. Add `require_once __DIR__ . '/_secrets.php';` after the OPTIONS short-circuit at line ~21.
- Replace the inline PDO open (lines 44-49):
  ```php
  $pdo = new PDO(
      'mysql:host=' . TCP_DB_HOST . ';dbname=' . TCP_DB_NAME . ';charset=utf8mb4',
      TCP_DB_USER,
      TCP_DB_PASS,
      [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION, PDO::ATTR_TIMEOUT => 3]
  );
  ```
- Commit:
```bash
git add api/playground-load.php
git commit -m "refactor(api): playground-load.php — load DB creds from _secrets.php"
```

**For `playground-render.php`:**
- No existing require_once. Add `require_once __DIR__ . '/_secrets.php';` immediately after the rate-limit `file_put_contents` line (around line 38).
- Replace the inline PDO open (lines 41-46):
  ```php
  $pdo = new PDO(
      'mysql:host=' . TCP_DB_HOST . ';dbname=' . TCP_DB_NAME . ';charset=utf8mb4',
      TCP_DB_USER,
      TCP_DB_PASS,
      [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION, PDO::ATTR_TIMEOUT => 3]
  );
  ```
- Commit:
```bash
git add api/playground-render.php
git commit -m "refactor(api): playground-render.php — load DB creds from _secrets.php"
```

**For `stats.php`:**
- No existing require_once. Add `require_once __DIR__ . '/_secrets.php';` immediately AFTER the auth gate (after the `hash_equals` exit at line 24, BEFORE the `header('Content-Type: ...')` call at line 26).
- Replace the inline PDO open (lines 59-64):
  ```php
  $pdo = new PDO(
      'mysql:host=' . TCP_DB_HOST . ';dbname=' . TCP_DB_NAME . ';charset=utf8mb4',
      TCP_DB_USER,
      TCP_DB_PASS,
      [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION, PDO::ATTR_TIMEOUT => 5]
  );
  ```
- Commit:
```bash
git add api/stats.php
git commit -m "refactor(api): stats.php — load DB creds from _secrets.php"
```

**For `identify-from-email.php` (LAST — has both DB indirection via tcp_db AND inline BM secret define):**
- Already requires `_visitor.php`. Add explicit `require_once __DIR__ . '/_secrets.php';` AFTER the _visitor.php require (line 19).
- Remove line 17 entirely: `define('TCP_BM_SHARED_SECRET', '32817b8c34738c7f4c0750719888cb6b841719880953df524d8625c97eb022b2');` — TCP_BM_SHARED_SECRET is now provided by _secrets.php (same constant name, same value, no other code changes).
- Verify the `CURLOPT_HTTPHEADER => ['X-Identity-Token: ' . TCP_BM_SHARED_SECRET, ...]` line at line 64 still works — it references the TCP_BM_SHARED_SECRET constant which is now defined in _secrets.php instead of inline. No code change here, just a different define source.
- Commit:
```bash
git add api/identify-from-email.php
git commit -m "refactor(api): identify-from-email.php — load BM shared secret from _secrets.php

Removes inline define('TCP_BM_SHARED_SECRET', '32817b8c...').
Constant now provided by _secrets.php (same value, same name).
Existing TCP_BM_LOOKUP_URL define stays inline (URL is not a secret).

⚠️ Old commit 63a9680 still contains the secret value verbatim.
Rotation is a MANDATORY Phase X follow-up post-push (NOT in 316)."
```

After all 10 refactor commits (plus the prior scaffold = 11 new commits total), verify count:
```bash
cd /Users/jeet/techcloudpro
git log --oneline | head -12
# Expect (top to bottom):
#   <new>: refactor(api): identify-from-email.php
#   <new>: refactor(api): stats.php
#   <new>: refactor(api): playground-render.php
#   <new>: refactor(api): playground-load.php
#   <new>: refactor(api): study-guide-download.php
#   <new>: refactor(api): customize-architecture.php
#   <new>: refactor(api): contact.php
#   <new>: refactor(api): collect.php
#   <new>: refactor(api): chat.php
#   <new>: refactor(api): _visitor.php
#   <previous>: chore(secrets): scaffold _secrets.example.php
```

---

**Phase D — Atomic single-batch deploy of all 10 refactored PHP files (correct order: read real Anthropic key BEFORE scp, scp, then re-inject).**

```bash
SERVER=u350621741@147.93.101.51
DEST=/home/u350621741/domains/techcloudpro.com/public_html/api
UA='Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15'

# D.1 — Read real Anthropic key from server's existing chat.php BEFORE scp
# (otherwise scp would overwrite chat.php with the placeholder and the
# key would be unrecoverable from the api/ directory).
# Tighten the regex to bounded-shape characters (avoid greedy [^"']*) and
# allow future api version bumps (api03, api04, ...).
REAL_ANTHROPIC=$(ssh -p 65002 -i ~/.ssh/id_ed25519 $SERVER \
  "grep -oE 'sk-ant-api[0-9]+-[A-Za-z0-9_-]+' $DEST/chat.php | head -1")
echo "Anthropic key length on server: ${#REAL_ANTHROPIC}"
# Expect: ~108 chars. If 0 or unexpected shape, STOP — server's chat.php
# is stale or already broken. Do NOT proceed to scp (would lose the key).

# Key-shape sanity check before sed-inject (must start sk-ant-api<digits>-)
if [[ "$REAL_ANTHROPIC" =~ ^sk-ant-api[0-9]+- ]]; then
  echo "Anthropic key shape OK"
else
  echo "key shape unexpected — got: '${REAL_ANTHROPIC:0:20}...'"
  exit 1
fi

# D.2 — Single-batch scp (overwrites server with placeholder versions).
# Explicit per-file targets to avoid accidental .htaccess overwrite.
cd /Users/jeet/techcloudpro/api
scp -P 65002 -i ~/.ssh/id_ed25519 \
  _visitor.php identify-from-email.php chat.php contact.php collect.php \
  customize-architecture.php study-guide-download.php playground-load.php \
  playground-render.php stats.php \
  $SERVER:$DEST/

# D.3 — sed re-inject Anthropic key on chat.php + customize-architecture.php
# (NOT match-usecase.php — we don't refactor that file in 316)
ssh -p 65002 -i ~/.ssh/id_ed25519 $SERVER \
  "sed -i 's|ANTHROPIC_API_KEY_HERE|$REAL_ANTHROPIC|' $DEST/chat.php $DEST/customize-architecture.php && \
   echo 'chat.php key count:' && grep -cE 'sk-ant-api[0-9]+-' $DEST/chat.php && \
   echo 'customize-architecture.php key count:' && grep -cE 'sk-ant-api[0-9]+-' $DEST/customize-architecture.php"
# Expect: each prints "1"
```

---

**Phase E — Run 7 verification batteries (A–I per constraints).**

```bash
SERVER=u350621741@147.93.101.51
UA='Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15'
TS=$(date +%s)

# Battery A — _secrets.php loaded server-side (re-deploy probe + curl + delete)
cat > /tmp/_probe-316.php <<'PROBE'
<?php
require_once __DIR__ . '/_secrets.php';
header('Content-Type: application/json');
echo json_encode([
  'TCP_SECRETS_LOADED' => defined('TCP_SECRETS_LOADED'),
  'TCP_DB_USER_strlen' => defined('TCP_DB_USER') ? strlen(TCP_DB_USER) : 0,
  'TCP_BM_SHARED_SECRET_strlen' => defined('TCP_BM_SHARED_SECRET') ? strlen(TCP_BM_SHARED_SECRET) : 0,
  'IPINFO_API_TOKEN_defined' => defined('IPINFO_API_TOKEN'),
]);
PROBE
scp -P 65002 -i ~/.ssh/id_ed25519 /tmp/_probe-316.php \
  $SERVER:/home/u350621741/domains/techcloudpro.com/public_html/api/_probe-316.php
echo "=== Battery A ==="
curl -sS -A "$UA" https://techcloudpro.com/api/_probe-316.php
ssh -p 65002 -i ~/.ssh/id_ed25519 $SERVER \
  "rm /home/u350621741/domains/techcloudpro.com/public_html/api/_probe-316.php"
curl -sS -A "$UA" -o /dev/null -w "probe-deletion-check: %{http_code}\n" \
  https://techcloudpro.com/api/_probe-316.php
# Expect: probe response {"TCP_SECRETS_LOADED":true,...,"TCP_DB_USER_strlen":18,"TCP_BM_SHARED_SECRET_strlen":64,"IPINFO_API_TOKEN_defined":true}
# Then deletion-check: 404
rm /tmp/_probe-316.php

# Battery B — gitignore working
cd /Users/jeet/techcloudpro
echo "=== Battery B ==="
git check-ignore api/_secrets.php           # echoes path
git status --porcelain api/_secrets.php     # empty
git ls-files api/_secrets.php               # empty
# Expect: first prints "api/_secrets.php", other two empty.

# Battery C — .htaccess deny rule (THE BIG ONE)
echo "=== Battery C ==="
curl -sS -A "$UA" -o /dev/null -w "%{http_code}\n" https://techcloudpro.com/api/_secrets.php
# Expect: 403 (preferred) or 404 (also acceptable). NOT 200, NEVER 200.
# If 200, STOP — secrets are web-accessible. Drop everything, fix .htaccess.

# Battery D — DB writes still work (synthetic POST to contact.php)
echo "=== Battery D ==="
curl -sS -A "$UA" -X POST -H 'Content-Type: application/json' \
  -d "{\"name\":\"Phase 9 Secrets D\",\"email\":\"jeetnair.in+phase9-secrets-D-${TS}@gmail.com\",\"company\":\"Phase 9 Co\",\"phone\":\"+1-555-0316\",\"service\":\"AI\",\"message\":\"Battery D — secrets refactor\",\"_source\":\"phase9-secrets\"}" \
  https://techcloudpro.com/api/contact.php
# Expect: HTTP 200 + {"success":true,"lead_saved":true,"email_sent":null,"crm_status":...}

# Battery E — tcp_notify_new_lead helper still fires (verify via DB readback probe)
# Real-deliverable email used in D — rajesh/jm/contact actually receives it.
# Probe to confirm row + last_notified_at populated:
EMAIL_ENC="jeetnair.in%2Bphase9-secrets-D-${TS}%40gmail.com"
cat > /tmp/_probe-316-db.php <<PROBE
<?php
require_once __DIR__ . '/_secrets.php';
require_once __DIR__ . '/_visitor.php';
\$pdo = tcp_db();
\$stmt = \$pdo->prepare("SELECT visitor_id, email, source_form, first_seen_at, last_notified_at FROM identified_visitors WHERE email = ? LIMIT 1");
\$stmt->execute(['jeetnair.in+phase9-secrets-D-${TS}@gmail.com']);
header('Content-Type: application/json');
echo json_encode(['row' => \$stmt->fetch(PDO::FETCH_ASSOC)]);
PROBE
scp -P 65002 -i ~/.ssh/id_ed25519 /tmp/_probe-316-db.php \
  $SERVER:/home/u350621741/domains/techcloudpro.com/public_html/api/_probe-316-db.php
echo "=== Battery E ==="
curl -sS -A "$UA" https://techcloudpro.com/api/_probe-316-db.php
ssh -p 65002 -i ~/.ssh/id_ed25519 $SERVER \
  "rm /home/u350621741/domains/techcloudpro.com/public_html/api/_probe-316-db.php"
rm /tmp/_probe-316-db.php
# Expect: {"row":{"visitor_id":"...","email":"jeetnair.in+phase9-secrets-D-...@gmail.com","source_form":"contact","first_seen_at":"...","last_notified_at":"..."}}
# CRITICAL: last_notified_at must be NON-NULL (helper fired). If null, gate β trips — STOP.

# Battery F — identify-from-email.php authenticates with BM (stub-mode test)
# We use stub mode by inverting TCP_IDENTITY_STUB temporarily? No — that flag
# is set to false in source. Instead, send a synthetic POST that exercises
# the cURL-into-BM code path. Expect {ok:false} (BM rejects unknown uid)
# but NOT a 500. The 500 case is what proves require_once + constant works.
echo "=== Battery F ==="
curl -sS -A "$UA" -X POST -H 'Content-Type: application/json' \
  -d '{"uid":"phase9-secrets-synthetic-uid-not-in-bm"}' \
  https://techcloudpro.com/api/identify-from-email.php
# Expect: HTTP 200 + {"ok":false}  (BM lookup fails, but PHP did NOT 500
# — proves require_once chain + TCP_BM_SHARED_SECRET constant accessible)

# Battery G — SECRET SCAN against THIS task's added commits only
# (HEAD~11 = the commit BEFORE the scaffold commit this task adds, so
# HEAD~11..HEAD covers exactly the 11 commits 316 introduces: 1 scaffold
# + 10 refactor. Using origin/main..HEAD would FALSELY FAIL because the
# 24-commit pre-existing range already includes 63a9680 with the secret.)
cd /Users/jeet/techcloudpro
echo "=== Battery G ==="
echo "--- searching THIS task's 11 new commits (HEAD~11..HEAD) ---"
git diff HEAD~11..HEAD --no-color | grep -E "32817b8c34738c7f4c0750719888cb6b841719880953df524d8625c97eb022b2|Thirumala977!" | head -5
# Expect: ZERO matches. (Old commit 63a9680 still has the secret — that's
# tracked as Phase X rotation; 316 only cleans the NEW commits this task adds.)
# If matches found, STOP — refactor missed a file.

echo "--- searching ALL working-tree files ---"
grep -rn "32817b8c34738c7f4c0750719888cb6b841719880953df524d8625c97eb022b2\|Thirumala977!" \
  --include="*.php" /Users/jeet/techcloudpro/api/ 2>/dev/null
# Expect: matches ONLY in api/_secrets.php (which is gitignored). NO matches in other api/*.php.

# Battery H — auth gate on stats.php still works
echo "=== Battery H ==="
curl -sS -A "$UA" -o /dev/null -w "no-token: %{http_code}\n" https://techcloudpro.com/tcp-analytics/stats.php
curl -sS -A "$UA" -o /dev/null -w "wrong-token: %{http_code}\n" https://techcloudpro.com/tcp-analytics/stats.php?s=wrong
curl -sS -A "$UA" -o /dev/null -w "right-token: %{http_code}\n" https://techcloudpro.com/tcp-analytics/stats.php?s=TcpSecureAdmin2026
# Note: tcp-analytics/stats.php is the path on the SERVER (different dir from api/).
# Expect: 404, 404, 200.

# Battery I — All refactored files start with require_once _secrets.php
echo "=== Battery I ==="
cd /Users/jeet/techcloudpro
for f in _visitor.php identify-from-email.php chat.php contact.php collect.php \
         customize-architecture.php study-guide-download.php playground-load.php \
         playground-render.php stats.php; do
  c=$(grep -c "require_once.*_secrets\\.php" "api/$f")
  echo "$f: $c"
done
# Expect: each prints "1" (one require_once line per file)
```

After all 7 batteries pass (A–I, skipping F real-mode per constraints — stub-mode {ok:false} response from F is sufficient), record verbatim outputs in SUMMARY.md (Task 3).

If ANY battery fails, gate β trips — STOP immediately, document the failure in SUMMARY, and revert via `git revert HEAD~10..HEAD` (revert all 10 refactor commits) + scp the reverted files back. Do NOT push to origin until 316 is fully green or fully reverted.
  </action>

  <verify>
```bash
SERVER=u350621741@147.93.101.51
UA='Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15'

# 1. _secrets.php deployed to Hostinger
ssh -p 65002 -i ~/.ssh/id_ed25519 $SERVER \
  "test -f /home/u350621741/domains/techcloudpro.com/public_html/api/_secrets.php && echo OK"
# Expected: OK

# 2. Web access to _secrets.php denied
curl -sS -A "$UA" -o /dev/null -w "%{http_code}\n" https://techcloudpro.com/api/_secrets.php
# Expected: 403 or 404

# 3. 10 refactored files deployed (sha256 match)
for f in _visitor.php identify-from-email.php chat.php contact.php collect.php \
         customize-architecture.php study-guide-download.php playground-load.php \
         playground-render.php stats.php; do
  L=$(shasum -a 256 /Users/jeet/techcloudpro/api/$f | awk '{print $1}')
  R=$(ssh -p 65002 -i ~/.ssh/id_ed25519 $SERVER "shasum -a 256 /home/u350621741/domains/techcloudpro.com/public_html/api/$f | awk '{print \$1}'")
  # chat.php + customize-architecture.php expected to differ (Anthropic key sed)
  case $f in
    chat.php|customize-architecture.php) echo "$f: skip (sed-injected)";;
    *) [ "$L" = "$R" ] && echo "$f: MATCH" || echo "$f: MISMATCH";;
  esac
done
# Expected: 8x MATCH + 2x skip

# 4. 10 atomic refactor commits in techcloudpro
cd /Users/jeet/techcloudpro
git log --oneline | head -11 | grep -c "refactor(api):"
# Expected: 10

# 5. Battery G clean — scan ONLY the 11 commits this task adds (1 scaffold + 10 refactor)
# NOT origin/main..HEAD (which would pick up old 63a9680 secret in pre-existing 24-commit range)
git diff HEAD~11..HEAD --no-color | grep -cE "32817b8c34738c7f4c0750719888cb6b841719880953df524d8625c97eb022b2|Thirumala977!"
# Expected: 0

# 6. Live contact form smoke test
TS=$(date +%s)
HTTP=$(curl -sS -A "$UA" -o /dev/null -w "%{http_code}" -X POST -H 'Content-Type: application/json' \
  -d "{\"name\":\"V\",\"email\":\"jeetnair.in+phase9-secrets-V-${TS}@gmail.com\",\"company\":\"V\",\"message\":\"V\"}" \
  https://techcloudpro.com/api/contact.php)
[ "$HTTP" = "200" ] && echo "contact OK" || echo "contact FAIL ($HTTP)"
# Expected: contact OK

# 7. Live identify-from-email smoke test (no 500)
HTTP=$(curl -sS -A "$UA" -o /dev/null -w "%{http_code}" -X POST -H 'Content-Type: application/json' \
  -d '{"uid":"verify-task-2-fake-uid"}' https://techcloudpro.com/api/identify-from-email.php)
[ "$HTTP" = "200" ] && echo "identify OK" || echo "identify FAIL ($HTTP)"
# Expected: identify OK (response body is {"ok":false} but HTTP is 200 — that's the success criterion: NOT 500)
```
  </verify>

  <done>
- /home/u350621741/.../api/_secrets.php exists on Hostinger with sha256 matching local
- Battery A passes: probe shows TCP_SECRETS_LOADED=true + 6 constants + correct strlens (TCP_DB_PASS=13, TCP_BM_SHARED_SECRET=64); probe deleted (404)
- Battery B passes: gitignore excludes _secrets.php; git ls-files empty; git status clean
- Battery C passes: curl _secrets.php returns 403 OR 404 (web-deny proven; NEVER 200)
- Battery D passes: contact.php POST returns HTTP 200 + lead_saved=true (DB write works via TCP_DB_* constants)
- Battery E passes: identified_visitors row created with non-null last_notified_at (helper fired post-refactor — proves no helper regression)
- Battery F passes: identify-from-email.php POST returns HTTP 200 + {ok:false} (NOT 500 — proves require_once chain + TCP_BM_SHARED_SECRET accessible)
- Battery G passes: zero `32817b8c...` or `Thirumala977!` matches in `git diff HEAD~11..HEAD` (the 11 commits this task adds — scaffold + 10 refactor)
- Battery H passes: stats.php auth gate intact (404 / 404 / 200)
- Battery I passes: all 10 refactored files have exactly 1 `require_once.*_secrets\.php` match (NOTE: 10 files — _visitor.php, identify-from-email.php, chat.php, contact.php, collect.php, customize-architecture.php, study-guide-download.php, playground-load.php, playground-render.php, stats.php)
- 10 atomic per-file refactor commits in techcloudpro repo
- Anthropic API key still functional on chat.php + customize-architecture.php (sed re-injection succeeded)
- ALL post-refactor production endpoints respond as expected; gate β not triggered
- ZERO secret values committed to working-tree branch HEAD relative to origin/main
  </done>
</task>

<task type="auto">
  <name>Task 3: Final secret-scan + write 316-SUMMARY.md + commit (does NOT push)</name>
  <files>
    .planning/quick/316-refactor-tcp-secrets-out-of-php-source-i/316-SUMMARY.md
  </files>

  <action>
**Step 3.1 — Final pre-push secret scan (one more time, paranoid).**

```bash
cd /Users/jeet/techcloudpro

# A. Working-tree scan
echo "=== A: Working tree files ==="
grep -rn "32817b8c34738c7f4c0750719888cb6b841719880953df524d8625c97eb022b2\|Thirumala977!" \
  --include="*.php" --exclude-dir=node_modules . 2>/dev/null
# Expected: matches ONLY in api/_secrets.php (which is gitignored)

# B. Diff scan over THIS task's 11 new commits ONLY
# (NOT origin/main..HEAD — pre-existing 24-commit range still contains 63a9680
# with the secret value verbatim; that's the Phase X rotation problem, not 316's.)
echo "=== B: Diff over 11 new commits (HEAD~11..HEAD) ==="
git diff HEAD~11..HEAD --no-color > /tmp/316-diff.txt
grep -E "32817b8c34738c7f4c0750719888cb6b841719880953df524d8625c97eb022b2|Thirumala977!" /tmp/316-diff.txt | head -5
# Expected: ZERO output

# C. Branch state
echo "=== C: Branch state ==="
git log origin/main..HEAD --oneline
# Expected: scaffolding commit + 10 refactor commits = 11 commits added (24 pre-existing + 11 new = 35 total ahead of origin/main)
```

**Step 3.2 — Write 316-SUMMARY.md.**

Frontmatter:
```yaml
---
phase: 316-refactor-tcp-secrets-out-of-php-source-i
plan: 01
subsystem: tcp-security
tags: [tcp, php, secrets, hostinger, refactor, pre-push-hygiene, security]
dependency-graph:
  requires:
    - "305-SUMMARY (DB creds inline pattern that 316 cleans up)"
    - "309-SUMMARY (TCP_BM_SHARED_SECRET origin in identify-from-email.php commit 63a9680)"
    - "314-SUMMARY (latest helper state — no signature change in 316)"
  provides:
    - "api/_secrets.php centralized constant store on Hostinger (server-only, gitignored)"
    - "api/_secrets.example.php tracked template for fresh-clones"
    - "api/.htaccess deny rule for ^_secrets.*\\.php$"
    - ".gitignore exclusion for api/_secrets.php"
    - "10 refactored PHP endpoints loading constants from _secrets.php"
  affects:
    - "/Users/jeet/techcloudpro/api/{_visitor.php, identify-from-email.php, chat.php, contact.php, collect.php, customize-architecture.php, study-guide-download.php, playground-load.php, playground-render.php, stats.php}"
    - "(server-only) Hostinger /api/_secrets.php (NEW) + .htaccess (PATCHED OR CREATED)"
tech-stack:
  added: []
  patterns:
    - "Centralized constant store with idempotent require_once + TCP_SECRETS_LOADED guard"
    - "Untracked secrets file pattern: scaffolded template (_secrets.example.php) tracked, real values (_secrets.php) gitignored + Apache-denied"
    - "Atomic per-file commits + single-batch scp (handle file ownership cleanly without partial-deploy state)"
    - "Probe-then-delete with strlen() over secret values (NEVER print full secret in probe response)"
    - "Pre-push hygiene gate: 'Battery G — git diff HEAD~11..HEAD (the 11 NEW commits this task adds) shows zero secret occurrences'"
decisions:
  - "Defer history rewrite (force-push) to Phase X. Old commit 63a9680 still has BM secret value verbatim. Repo is private. User picked 'refactor going forward', NOT history rewrite. Rotation post-push is the SAFE path."
  - "Anthropic key NOT centralized — uses separate sed-on-deploy lifecycle (per memory `tcp-blog-aeo-pattern`). Centralizing would break Vite-dist deploy pattern. Out of scope for 316."
  - "Tracked _secrets.example.php has setup comment instructing future clones how to recreate _secrets.php — no info leak."
  - "Apache 2.4 syntax (Require all denied) used — Hostinger shared hosting since 2024+ is Apache 2.4. Verified via [PRECHECK finding]."
  - "10 files refactored (not 9 as initial prompt suggested — _visitor.php has both tcp_db and IPInfo placeholder constants to clean up). Final list verified via Task 1 grep."
  - "Phase D Anthropic key re-injection ordering: read REAL key from server's chat.php BEFORE scp (or sed of overwritten files would inject a placeholder over the placeholder)."
metrics:
  duration: "[N] minutes (PLAN_START → PLAN_END)"
  completed: "[ISO timestamp]"
  tasks: 3
  files: 14 (4 new + 10 refactored)
---
```

Body sections (verbatim outputs from Battery A–I):

```markdown
# Quick Task 316: TCP Secrets Refactor Summary

## One-liner
Centralized all TCP PHP secrets (4 DB creds + BM shared secret + IPInfo token) into a single untracked `api/_secrets.php` on Hostinger, refactored 10 PHP source files to require_once it, scaffolded `.gitignore` + `.htaccess` + tracked `_secrets.example.php` template, and proved 9 verification batteries (A–I) PASS — pre-push hygiene gate satisfied. Old commit 63a9680 still contains the BM secret value verbatim (history-rewrite deferred to Phase X rotation, per user decision).

## What was built

[Insert summary table of 4 new files + 10 refactored files]

## Verification — verbatim live evidence

[Insert each Battery A–I verbatim output]

## Privacy stance
- Same data, different storage location. Zero new secret material introduced.
- _secrets.php denied at Apache layer — `curl https://techcloudpro.com/api/_secrets.php` → 403/404 (Battery C).
- _secrets.example.php contains only PASTE_*_HERE placeholders.
- Old commit 63a9680 in techcloudpro repo still has BM secret in plaintext — addressed by Phase X rotation, not 316.

## ⚠️ Phase X follow-ups (MANDATORY post-push)

### 1. ROTATE TCP_BM_SHARED_SECRET (mandatory after first push of refactor commits)

**Why mandatory:** old commit 63a9680 in techcloudpro/main has the BM shared secret value verbatim. Anyone with read access to the github.com/jeet-avatar/techcloudpro repo (or a leaked clone) gets the secret. Refactor stops the bleeding going forward but does NOT erase past disclosure.

**Steps:**
```bash
NEW_SECRET=$(openssl rand -hex 32)
aws secretsmanager put-secret-value \
  --secret-id brandmonkz/production/tcp-identity-shared-secret \
  --secret-string "{\"TCP_IDENTITY_SHARED_SECRET\":\"$NEW_SECRET\"}" \
  --region us-east-1
ssh -i ~/.ssh/brandmonkz-crm.pem ec2-user@100.24.213.224 \
  "sudo sed -i '/^TCP_IDENTITY_TOKEN=/d' /var/www/crm-backend/backend/.env && \
   echo 'TCP_IDENTITY_TOKEN=$NEW_SECRET' | sudo tee -a /var/www/crm-backend/backend/.env > /dev/null && \
   pm2 restart crm-backend --update-env"
# Update Hostinger _secrets.php with same NEW_SECRET, scp:
ssh -p 65002 -i ~/.ssh/id_ed25519 u350621741@147.93.101.51 \
  "sed -i \"s|32817b8c34738c7f4c0750719888cb6b841719880953df524d8625c97eb022b2|$NEW_SECRET|\" \
   /home/u350621741/domains/techcloudpro.com/public_html/api/_secrets.php"
```
Both ends MUST flip in same window or live click-tracking breaks. Recommend low-traffic window. Verify with synthetic POST to identify-from-email.php after rotation.

### 2. ROTATE TCP DB password
Same logic. Hostinger MySQL panel → reset password → update Hostinger _secrets.php. No second-system flip required (only one DB).

### 3. Audit other repos for hardcoded-secret pattern
- BrandMonkz: search for hardcoded API keys in CRM Module
- Zietra: search for hardcoded Supabase keys in deploy scripts
- ArthaBuild: already on .env pattern but verify no inline JWT_SECRET_KEY references

### 4. Migrate to AWS SSM Parameter Store / Hostinger secret panel
Long-term: move _secrets.php constants to AWS SSM (paid path) or Hostinger's Environment Variables panel (free, less audit). Auto-rotation + audit trail.

### 5. Pre-commit hook
Add a `.git/hooks/pre-commit` (or `pre-push` for the cheap version) that greps staged diff for known-secret patterns:
```bash
git diff --cached | grep -E "(Thirumala977|32817b8c34738c7f4c|sk-ant-api|sk_live_|AKIA[0-9A-Z]{16})" \
  && { echo "ABORT: secret detected in staged diff"; exit 1; }
```
Same as the dollor.ai pre-commit hook documented in CLAUDE.md.

## CR ticket
**Skipped** — TCP infrastructure (Hostinger PHP), not the dollor.ai admin portal. Same precedent as 305-315.

## Authentication gates
None — Hostinger SSH key already installed (id_ed25519, host 147.93.101.51 port 65002, user u350621741).

## Commit hashes
| Repo | SHA | Description |
|------|-----|-------------|
| techcloudpro | [SCAFFOLD] | chore(secrets): scaffold _secrets.example.php + .gitignore + .htaccess |
| techcloudpro | [V_HASH] | refactor(api): _visitor.php — load DB creds + IPInfo token from _secrets.php |
| techcloudpro | [CHAT_HASH] | refactor(api): chat.php — load DB creds from _secrets.php |
| techcloudpro | [COLLECT_HASH] | refactor(api): collect.php — load DB creds from _secrets.php |
| techcloudpro | [CONTACT_HASH] | refactor(api): contact.php — explicit require_once _secrets.php |
| techcloudpro | [CUSTOMIZE_HASH] | refactor(api): customize-architecture.php — load DB creds from _secrets.php |
| techcloudpro | [SG_HASH] | refactor(api): study-guide-download.php — load DB creds from _secrets.php |
| techcloudpro | [PL_HASH] | refactor(api): playground-load.php — load DB creds from _secrets.php |
| techcloudpro | [PR_HASH] | refactor(api): playground-render.php — load DB creds from _secrets.php |
| techcloudpro | [STATS_HASH] | refactor(api): stats.php — load DB creds from _secrets.php |
| techcloudpro | [IDENTIFY_HASH] | refactor(api): identify-from-email.php — load BM shared secret from _secrets.php |
| dollor.ai | [DOC_HASH] | docs(quick-316): TCP secrets refactor — PLAN + PRECHECK + SUMMARY |

Per CLAUDE.md, neither pushed unless user asks. **11 atomic commits in techcloudpro** (1 scaffold + 10 refactor), **1 commit in dollor.ai**.

## Self-Check
- [ ] /Users/jeet/techcloudpro/api/_secrets.php exists locally + sha256 matches Hostinger copy
- [ ] /Users/jeet/techcloudpro/api/_secrets.example.php tracked in git
- [ ] /Users/jeet/techcloudpro/.gitignore contains api/_secrets.php
- [ ] /Users/jeet/techcloudpro/api/.htaccess deny rule present
- [ ] All 10 refactored PHP files have `require_once.*_secrets\.php` (Battery I)
- [ ] Battery A: probe shows TCP_SECRETS_LOADED=true + 6 constants
- [ ] Battery B: gitignore working
- [ ] Battery C: curl _secrets.php returns 403 OR 404 (NEVER 200)
- [ ] Battery D: contact.php POST returns HTTP 200 + lead_saved=true
- [ ] Battery E: identified_visitors row + non-null last_notified_at
- [ ] Battery F: identify-from-email.php POST returns HTTP 200 + {ok:false} (NOT 500)
- [ ] Battery G: zero secret matches in `git diff HEAD~11..HEAD` (the 11 commits this task adds)
- [ ] Battery H: stats.php auth gate intact (404/404/200)
- [ ] Battery I: 10 of 10 refactored files have require_once line
- [ ] Anthropic key re-injected on chat.php + customize-architecture.php
- [ ] _probe-316.php + _probe-316-db.php deleted from server (404 confirmed)
- [ ] 5 Phase X follow-ups documented (BM rotation MANDATORY, DB rotation, multi-repo audit, SSM migration, pre-commit hook)
- [ ] No remote pushes (per CLAUDE.md)

## Self-Check: PASSED
```

**Step 3.3 — Commit SUMMARY (and PRECHECK from Task 1) into dollor.ai.**

```bash
cd /Users/jeet/doordash-p2p
git add .planning/quick/316-refactor-tcp-secrets-out-of-php-source-i/316-PLAN.md \
        .planning/quick/316-refactor-tcp-secrets-out-of-php-source-i/316-PRECHECK.md \
        .planning/quick/316-refactor-tcp-secrets-out-of-php-source-i/316-SUMMARY.md
git commit -m "$(cat <<'EOF'
docs(quick-316): TCP secrets refactor — PLAN + PRECHECK + SUMMARY

11 atomic commits in techcloudpro (1 scaffold + 10 refactor) relocate DB
creds + BM shared secret + IPInfo token from inline PHP literals to
untracked api/_secrets.php on Hostinger. .gitignore + .htaccess + tracked
_secrets.example.php template form the pre-push hygiene gate.

9 verification batteries (A–I) PASS verbatim:
  A: probe shows TCP_SECRETS_LOADED=true + 6 constants
  B: gitignore working
  C: curl _secrets.php → 403/404 (NEVER 200)
  D: contact.php POST → 200 + lead_saved=true
  E: identified_visitors row + non-null last_notified_at (helper fires)
  F: identify-from-email.php POST → 200 + {ok:false} (no 500)
  G: ZERO secret matches in `git diff HEAD~11..HEAD` (the 11 new commits)
  H: stats.php auth gate intact (404/404/200)
  I: 10 refactored files have require_once _secrets.php

DECISION POINT: refactor going forward, NOT history rewrite. Old commit
63a9680 still has BM secret value verbatim. Phase X rotation MANDATORY
post-push (filed in SUMMARY).
EOF
)"
```

Per CLAUDE.md, do NOT push. The user pushes when they're ready.

  </action>

  <verify>
```bash
# 1. SUMMARY exists + has frontmatter + 9 batteries documented
test -f .planning/quick/316-refactor-tcp-secrets-out-of-php-source-i/316-SUMMARY.md
grep -c "^### Battery [A-I]" .planning/quick/316-refactor-tcp-secrets-out-of-php-source-i/316-SUMMARY.md
# Expected: 9 or higher (9 batteries documented + may have sub-headers)

# 2. PRECHECK exists
test -f .planning/quick/316-refactor-tcp-secrets-out-of-php-source-i/316-PRECHECK.md

# 3. dollor.ai docs commit landed
cd /Users/jeet/doordash-p2p
git log -1 --pretty='%h %s' | grep -c "docs(quick-316)"
# Expected: 1

# 4. techcloudpro has 10 commits ahead of origin/main
cd /Users/jeet/techcloudpro
git log origin/main..HEAD --oneline | wc -l
# Expected: 11 (1 scaffold + 10 refactor) -- but the prompt was unsure
# whether 9 or 10 files would refactor. After Task 1 inspection, the
# actual count of files with secrets was [N]. Adjust expectation here:
# scaffold (1) + refactor (N) = (1 + N) commits ahead of origin/main.

# 5. No pushes happened
git status -uno | grep -c "Your branch is ahead"
# Expected: 1 (we're ahead but not pushed)
```
  </verify>

  <done>
- 316-SUMMARY.md exists with verbatim Battery A–I outputs (9 batteries documented + final secret-scan result)
- 316-PRECHECK.md committed alongside (created in Task 1)
- dollor.ai has 1 docs commit for quick-316
- techcloudpro repo has scaffolding-commit + N-refactor-commits ahead of origin/main (N == final file count from Task 1 grep, expected 10 per prompt analysis)
- 5 Phase X follow-ups documented (BM rotation MANDATORY first; DB rotation second; multi-repo audit; SSM migration; pre-commit hook)
- DECISION POINT recorded: option α (refactor going forward) chosen, option β (history rewrite) deferred
- No `git push` commands executed (per CLAUDE.md push policy)
- Self-Check section in SUMMARY has all 17 checkboxes ticked
  </done>
</task>

</tasks>

<verification>
Phase-level checks (run AFTER all 3 tasks complete):

1. **Pre-push hygiene gate satisfied** (scan ONLY the 11 commits this task adds — NOT origin/main..HEAD, which would falsely fail because pre-existing 63a9680 still has the secret):
```bash
cd /Users/jeet/techcloudpro
git diff HEAD~11..HEAD --no-color | \
  grep -cE "32817b8c34738c7f4c0750719888cb6b841719880953df524d8625c97eb022b2|Thirumala977!"
# Expected: 0
```

2. **All endpoints functional in production:**
```bash
UA='Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15'

# contact (highest risk per quick-314)
curl -sS -A "$UA" -X POST -H 'Content-Type: application/json' \
  -d '{"name":"V","email":"jeetnair.in+phase9-final@gmail.com","company":"V","message":"V"}' \
  https://techcloudpro.com/api/contact.php
# Expected: 200 + lead_saved=true

# stats (auth gate + DB read)
curl -sS -A "$UA" -o /dev/null -w "%{http_code}\n" \
  https://techcloudpro.com/tcp-analytics/stats.php?s=TcpSecureAdmin2026
# Expected: 200

# identify-from-email (BM secret accessible)
curl -sS -A "$UA" -X POST -H 'Content-Type: application/json' \
  -d '{"uid":"final-verify"}' https://techcloudpro.com/api/identify-from-email.php
# Expected: 200 + {"ok":false}

# _secrets.php denied
curl -sS -A "$UA" -o /dev/null -w "%{http_code}\n" https://techcloudpro.com/api/_secrets.php
# Expected: 403 or 404
```

3. **No probe files left on server:**
```bash
ssh -p 65002 -i ~/.ssh/id_ed25519 u350621741@147.93.101.51 \
  "ls -la /home/u350621741/domains/techcloudpro.com/public_html/api/_probe-316*.php 2>&1"
# Expected: "No such file or directory"
```
</verification>

<success_criteria>
✅ All measurable + curl-verifiable:

1. `curl https://techcloudpro.com/api/_secrets.php` returns 403 OR 404 (Battery C; NEVER 200)
2. `curl POST https://techcloudpro.com/api/contact.php` with valid body returns HTTP 200 + `lead_saved:true` (Battery D)
3. `curl POST https://techcloudpro.com/api/identify-from-email.php` returns HTTP 200 (NOT 500) (Battery F)
4. `curl https://techcloudpro.com/tcp-analytics/stats.php?s=TcpSecureAdmin2026` returns HTTP 200 + JSON (Battery H)
5. `git diff HEAD~11..HEAD` over techcloudpro (the 11 commits this task adds: 1 scaffold + 10 refactor) contains ZERO occurrences of `32817b8c34738c7f4c0750719888cb6b841719880953df524d8625c97eb022b2` OR `Thirumala977!` (Battery G — pre-push hygiene gate; NOTE: `origin/main..HEAD` would FALSELY FAIL because pre-existing commit 63a9680 still has the secret — that's tracked as Phase X rotation, not 316)
6. `git check-ignore /Users/jeet/techcloudpro/api/_secrets.php` echoes the path (gitignore working — Battery B)
7. All 10 refactored PHP files have exactly 1 `require_once.*_secrets\.php` match (Battery I)
8. `identified_visitors.last_notified_at` row created on contact.php POST is NON-NULL (Battery E — helper fires post-refactor; quick-314 regression preserved)
9. /Users/jeet/techcloudpro/api/_secrets.example.php tracked in git; setup-comment docblock present
10. SUMMARY.md documents all 9 batteries verbatim + 5 Phase X follow-ups (BM secret rotation flagged MANDATORY)
</success_criteria>

<output>
After all 3 tasks complete:
- `.planning/quick/316-refactor-tcp-secrets-out-of-php-source-i/316-PRECHECK.md` (Task 1 inspection findings)
- `.planning/quick/316-refactor-tcp-secrets-out-of-php-source-i/316-SUMMARY.md` (Task 3 verbatim verification + Phase X follow-ups + commit hashes)
- 11 atomic commits in `/Users/jeet/techcloudpro/` (1 scaffolding + 10 refactor)
- 1 docs commit in `/Users/jeet/doordash-p2p/` (PLAN + PRECHECK + SUMMARY)
- ZERO git pushes (CLAUDE.md push policy — user pushes when ready)
- ⚠️ MANDATORY post-push action: rotate TCP_BM_SHARED_SECRET per Phase X follow-up #1 in SUMMARY
</output>
