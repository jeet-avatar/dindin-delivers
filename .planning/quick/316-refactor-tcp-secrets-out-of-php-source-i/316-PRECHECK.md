# 316-PRECHECK.md

Pre-flight inspection findings for quick task 316. All STOP gates checked + recorded.

## 1A — Pre-flight findings

### Files containing TCP secrets (verbatim grep output)

```
=== DB user 'u350621741_jeet977' ===
api/_visitor.php:19:        'u350621741_jeet977',
api/collect.php:56:$db_user = 'u350621741_jeet977';
api/playground-load.php:46:        'u350621741_jeet977',
api/study-guide-download.php:68:        'u350621741_jeet977',
api/chat.php:143:        'u350621741_jeet977',
api/stats.php:61:        'u350621741_jeet977',
api/customize-architecture.php:375:        'u350621741_jeet977',
api/playground-render.php:43:        'u350621741_jeet977',

=== DB pass 'Thirumala977!' ===
api/collect.php:57:$db_pass = 'Thirumala977!';
api/_visitor.php:20:        'Thirumala977!',
api/playground-load.php:47:        'Thirumala977!',
api/study-guide-download.php:69:        'Thirumala977!',
api/chat.php:144:        'Thirumala977!',
api/stats.php:62:        'Thirumala977!',
api/playground-render.php:44:        'Thirumala977!',
api/customize-architecture.php:376:        'Thirumala977!',

=== BM secret '32817b8c...' ===
api/identify-from-email.php:17:define('TCP_BM_SHARED_SECRET', '32817b8c34738c7f4c0750719888cb6b841719880953df524d8625c97eb022b2');

=== IPInfo placeholder ===
api/_visitor.php:376:    define('IPINFO_API_TOKEN_PLACEHOLDER', 'PHASE_5B_PASTE_TOKEN_HERE');
```

### Gate α — _secrets.php tracking status

```
$ git ls-files api/_secrets.php
(empty output)
```

RESULT: **PROCEED** — _secrets.php is NOT tracked in git.

### Gate γ — Existing /api/.htaccess on Hostinger

```
$ ssh ... ls /home/u350621741/.../api/.htaccess
(no .htaccess in /api/)
```

BRANCH: **γ.1** — No .htaccess exists in /api/, will create fresh in step 1B.4.
APACHE VERSION: assumed 2.4 (Hostinger shared hosting since 2024+).

### Gate δ — Files to refactor (final list)

10 files (matches plan list exactly):

1. `_visitor.php` — DB creds (lines 19-20) + IPInfo placeholder (line 376)
2. `identify-from-email.php` — BM shared secret (line 17), no inline DB creds
3. `chat.php` — DB creds (lines 143-144)
4. `contact.php` — no inline secrets (uses tcp_db() via _visitor.php)
5. `collect.php` — DB creds (lines 56-57)
6. `customize-architecture.php` — DB creds (lines 375-376)
7. `study-guide-download.php` — DB creds (lines 68-69)
8. `playground-load.php` — DB creds (lines 46-47)
9. `playground-render.php` — DB creds (lines 43-44)
10. `stats.php` — DB creds (lines 61-62)

RESULT: **PROCEED** — N == 10. No files outside the enumerated list contain the secret strings. No `.bak`, `seo/`, or archived files leak.

### Current .gitignore (pre-edit)

```
# Logs
logs
*.log
npm-debug.log*
yarn-debug.log*
yarn-error.log*
pnpm-debug.log*
lerna-debug.log*

node_modules
dist
dist-ssr
*.local

# Editor directories and files
.vscode/*
!.vscode/extensions.json
.idea
.DS_Store
*.suo
*.ntvs*
*.njsproj
*.sln
*.sw?
```

## 1B — Scaffold actions taken

### .gitignore additions

Appended 4 lines (block):

```
# === Quick task 316 — TCP secrets refactor ===
# api/_secrets.php holds DB creds + BM shared secret + IPInfo token
# It MUST NEVER be committed. Tracked template: api/_secrets.example.php
api/_secrets.php
```

### api/_secrets.example.php (created, tracked)

35 lines. Contains PASTE_DB_NAME_HERE / PASTE_DB_USER_HERE / PASTE_DB_PASS_HERE / PASTE_BM_SHARED_SECRET_HERE / PHASE_5B_PASTE_TOKEN_HERE placeholders + setup-comment docblock.

### api/_secrets.php (created LOCALLY, gitignored)

17 lines. Real values (4 DB creds + BM secret + IPInfo placeholder).

```
$ git check-ignore api/_secrets.php
api/_secrets.php

$ git status --porcelain api/_secrets.php
(empty)
```

Confirmed: file exists locally but excluded from git.

### api/.htaccess (created fresh, γ.1 branch)

```apache
# TCP API directory — quick task 316
# Block direct web access to the secrets file (defense in depth;
# .gitignore already prevents the file from entering git).
<FilesMatch "^_secrets.*\.php$">
    Require all denied
</FilesMatch>
```

## 1C — Scaffolding commit

Filed below upon `git commit`. Files staged: 3 (`.gitignore`, `api/_secrets.example.php`, `api/.htaccess`). `api/_secrets.php` intentionally NOT staged (gitignored). Verified via `git diff --cached` review.
