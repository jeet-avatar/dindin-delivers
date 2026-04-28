---
phase: 305-build-tcp-analytics-stats-php-on-techclo
plan: 01
subsystem: tcp-analytics
tags: [tcp, php, analytics, hostinger, stats-endpoint]
dependency-graph:
  requires:
    - "Hostinger MySQL u350621741_visitors (page_views table)"
    - "tcp-analytics .htaccess whitelist"
  provides:
    - "https://techcloudpro.com/tcp-analytics/stats.php?s=TcpSecureAdmin2026 JSON endpoint"
    - "Programmatic 4-window pageview analytics (today/7d/30d/all_time)"
  affects:
    - "/tcp-analytics/.htaccess (added 'stats' to FilesMatch whitelist)"
tech-stack:
  added: []
  patterns: ["hash_equals timing-safe auth", "PDO localhost connection (chat.php pattern)"]
key-files:
  created:
    - "/Users/jeet/techcloudpro/api/stats.php (119 lines)"
    - "/Users/jeet/doordash-p2p/.planning/quick/305-build-tcp-analytics-stats-php-on-techclo/SCHEMA_PROBE.md"
  modified:
    - "(server-only) /home/u350621741/domains/techcloudpro.com/public_html/tcp-analytics/.htaccess"
decisions:
  - "Use page_views (1,629 rows), NOT events (133 rows) — events is for chat/click discrete actions, not pageviews"
  - "Reuse exact PDO line from chat.php:141-145 (single source of truth for DB creds on this host)"
  - "Match admin.php 404-on-fail pattern (hash_equals + bare exit, no error body leak)"
  - "Updated tcp-analytics/.htaccess to add 'stats' to whitelist regex (was admin|collect|trap only)"
metrics:
  duration: "~5 minutes"
  completed: "2026-04-28T17:36:00Z"
---

# Quick Task 305: TCP Analytics stats.php Summary

## One-liner

Token-gated JSON analytics endpoint at `/tcp-analytics/stats.php` returning 4-window pageview counts (today/7d/30d/all_time × total_pageviews/unique_sessions/by_page/by_day) sourced from the live `page_views` table on Hostinger.

## What was built

A single PHP file (`/Users/jeet/techcloudpro/api/stats.php`, 119 lines) deployed to Hostinger at `/home/u350621741/domains/techcloudpro.com/public_html/tcp-analytics/stats.php`. The endpoint:

1. Gates access with `?s=TcpSecureAdmin2026` via `hash_equals()` timing-safe compare → 404 with empty body on miss/mismatch (matches the existing `admin.php` pattern; no info leak).
2. Connects to `u350621741_visitors` MySQL via PDO using the verbatim credentials line from `chat.php:141-145` (no new secrets introduced).
3. Returns JSON with 4 time windows × 4 metrics each: `today | last_7d | last_30d | all_time` × `{total_pageviews, unique_sessions, by_page (top 25), by_day (last 90)}`.

A schema probe was deployed first (Task 1) to capture the exact `DESCRIBE page_views` columns *before* any SQL was written — anti-hallucination evidence saved at `SCHEMA_PROBE.md`. The probe was deleted from the server immediately after use.

## Verification — verbatim curl output

### Test A: no token (expect 404)

```
=== TEST A: no token ===
HTTP 404
--- BODY (first 200 chars) ---
                            ← empty body (0 bytes)
```

### Test B: wrong token (expect 404)

```
=== TEST B: wrong token ===
HTTP 404
--- BODY (first 200 chars) ---
                            ← empty body (0 bytes)
```

### Test C: correct token (expect 200 + JSON)

```
=== TEST C: correct token ===
HTTP 200
--- BODY (first 100 lines) ---
{
    "generated_at": "2026-04-28T17:35:46+00:00",
    "source_table": "page_views",
    "windows": {
        "today": {
            "total_pageviews": 121,
            "unique_sessions": 118,
            "by_page": [
                { "page": "/", "views": 6 },
                { "page": "/blog/cyberark-vs-delinea-vs-beyondtrust-pam-comparison/", "views": 6 },
                { "page": "/blog/generative-ai-use-cases-mid-market/", "views": 4 },
                ...
            ],
            "by_day": [...]
        },
        "last_7d":  { "total_pageviews": 223, ... },
        "last_30d": { "total_pageviews": 1629, ... },
        "all_time": { "total_pageviews": 1629, ... }
    }
}
```

### Python validator output

```
OK — all 4 windows present with required keys

Window           Pageviews   Sessions   PagesIdx   DaysIdx
------------------------------------------------------------
today                  121        118        25         1
last_7d                223        215        25         3
last_30d              1629       1353        25        18
last_30d              1629       1353        25        18
all_time              1629       1353        25        18

Source table: page_views
Generated at: 2026-04-28T17:35:46+00:00
Top page (all_time): {'page': '/', 'views': 335}
Most recent day (all_time): {'day': '2026-04-28', 'views': 121}
```

(Note: `last_30d == all_time` is correct — the table currently holds 18 days of data, all within the 30-day window.)

## DB table queried

| Table | Rows | Columns used |
|-------|------|--------------|
| `page_views` | 1,629 | `created_at` (TS), `session_id` (SESS), `page` (PAGE), `id` |

Schema confirmed live by `DESCRIBE page_views` — full output in `SCHEMA_PROBE.md`. The `events` table (133 rows) was inspected but **not** used because it stores discrete UI events (chat_message, click), not pageviews.

## Files changed

| File | Repo | Status |
|------|------|--------|
| `api/stats.php` | github.com/jeet-avatar/techcloudpro | created (119 lines) |
| `tcp-analytics/.htaccess` | server-only (Hostinger) | added `stats` to whitelist |
| `.planning/quick/305-.../SCHEMA_PROBE.md` | dollor.ai | created |
| `.planning/quick/305-.../305-SUMMARY.md` | dollor.ai | created (this file) |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] tcp-analytics .htaccess required whitelist update**

- **Found during:** Task 1 (initial probe deploy returned 403, not 404 or 200)
- **Issue:** `/tcp-analytics/.htaccess` had `<FilesMatch "^(?!admin|collect|trap).*\.php$"> Require all denied`. Apache rejected `tcp-stats-probe.php` (and would have rejected `stats.php`) before PHP could even gate on the token. The plan implicitly assumed PHP would handle the 404, but Apache pre-empts.
- **Fix:** Backed up the file (`.htaccess.bak.305`), then deployed an updated `.htaccess` that adds `stats` (and temporarily `tcp-stats-probe`) to the whitelist regex. After probe was deleted, re-tightened the regex to whitelist only `admin|collect|trap|stats`.
- **Files modified:** `/home/u350621741/domains/techcloudpro.com/public_html/tcp-analytics/.htaccess` (server-only — local repo doesn't track this file).
- **Tracked here so future deploys** to `/tcp-analytics/` know to update this whitelist when adding new endpoints.

**2. [Rule 1 - Bug] Cloudflare WAF blocked initial curl probes with 403**

- **Found during:** First test of probe URL.
- **Issue:** Default `curl/8.x` User-Agent gets HTTP 403 from Cloudflare WAF on `techcloudpro.com` (matches the global memory rule — same as brandmonkz.com).
- **Fix:** Re-ran all curl tests with `-A "Mozilla/5.0 ... Chrome/130.0.0.0 Safari/537.36"`. All 3 verification tests in this summary used browser UA. Documented for future TCP endpoint testing.

### Architectural changes

None.

### Out-of-scope items deferred

- `seo/` directory exists as untracked in `/Users/jeet/techcloudpro/` git status; left untouched (not part of this task).
- The `.htaccess.bak.305` backup file remains on the server. Safe to leave (not web-served by name; Apache hides dotfiles by default + Hostinger config); the user can SSH-delete it during the next maintenance window.

## CR ticket

**Skipped:** This task ships PHP code to Hostinger (TCP infrastructure), not dollor.ai infrastructure. The `.agents/skills/ticketed-task/` skill targets the `api.dollor.ai` admin portal CR system, which is irrelevant for TCP-only deploys.

## Authentication gates

None — Hostinger SSH access via `id_ed25519` (key was installed via prior `ssh-copy-id` on 2026-03-28 per command history), no manual credentials needed.

## Commit hashes

| Repo | SHA | Description |
|------|-----|-------------|
| `dollor.ai` (this repo) | `4c63820b` | docs(quick-305): SCHEMA_PROBE.md |
| `techcloudpro` | `c0d55a8` | feat(tcp-analytics): stats.php endpoint |
| `dollor.ai` (this repo) | _final commit at end of task_ | docs(quick-305): SUMMARY + STATE |

Neither dollor.ai nor techcloudpro was pushed — per CLAUDE.md, only push when user asks.

## Live URL

`https://techcloudpro.com/tcp-analytics/stats.php?s=TcpSecureAdmin2026` (browser UA required to bypass Cloudflare WAF)

## Self-Check

- [x] `/Users/jeet/techcloudpro/api/stats.php` — FOUND (119 lines)
- [x] `/Users/jeet/doordash-p2p/.planning/quick/305-build-tcp-analytics-stats-php-on-techclo/SCHEMA_PROBE.md` — FOUND
- [x] Hostinger `tcp-analytics/stats.php` — FOUND (4252 bytes, deployed 17:35 UTC)
- [x] Hostinger `tcp-analytics/tcp-stats-probe.php` — REMOVED (verified)
- [x] Test C JSON validates — passed (`OK — all 4 windows present`)
- [x] dollor.ai commit `4c63820b` — present in `git log`
- [x] techcloudpro commit `c0d55a8` — present in `git log`

## Self-Check: PASSED
