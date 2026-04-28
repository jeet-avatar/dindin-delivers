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
    - "/Users/jeet/techcloudpro/api/stats.php (+93 lines: classify_source helper + 4 new queries per window)"
  created:
    - "/Users/jeet/doordash-p2p/.planning/quick/306-extend-tcp-analytics-stats-php-with-traf/306-SUMMARY.md"
decisions:
  - "Classify referrers in PHP (not SQL) -- easier to read/extend, hostname keyword match needs parse_url not GROUP BY"
  - "Stream all referrers per window (no GROUP BY referrer) -- needed for parse_url matching; ~1.6k rows = trivial"
  - "TRIM + NULLIF on org/country/utm_source to drop empty/whitespace-only rows"
  - "by_source emitted as ordered list (not assoc map) for stable JSON output"
  - "Top limits per spec: by_org=30, by_country=20, by_utm=25"
metrics:
  duration: "~5 minutes"
  completed: "2026-04-28T19:23Z"
---

# Quick Task 306: Extend TCP Analytics stats.php with Traffic-Source Breakdowns

## One-liner

Each of the 4 existing time windows on `/tcp-analytics/stats.php` now ALSO returns by_source / by_utm / by_org / by_country -- answering "WHO visited and FROM WHERE?" not just "how many?".

## What was built

Extended `api/stats.php` (was 119 lines -> now 213 lines, +93 insertions, 0 deletions) by adding a `classify_source()` PHP helper plus 4 new aggregations inside the existing window loop. Existing fields (total_pageviews, unique_sessions, by_page, by_day) are byte-identical -- the diff is purely additive.

### Endpoint

`https://techcloudpro.com/tcp-analytics/stats.php?s=TcpSecureAdmin2026` (browser UA required to bypass Cloudflare WAF)

### Response shape per window (8 keys, was 4)

```
windows.{today | last_7d | last_30d | all_time}
    total_pageviews   (count)                        ← existing
    unique_sessions   (count distinct session_id)    ← existing
    by_page           (top 25 paths)                 ← existing
    by_day            (last 90 days date-grouped)    ← existing
    by_source         (referrer -> 14 buckets)       ← NEW
    by_utm            (top 25 utm tuples)            ← NEW
    by_org            (top 30 ISP/orgs)              ← NEW
    by_country        (top 20 countries)             ← NEW
```

### `classify_source()` buckets (14 total)

`direct, google, chatgpt, perplexity, bing, duckduckgo, linkedin, facebook, twitter, youtube, reddit, email, other-search, other-referral`

Order-sensitive: longer/more-specific matches first. `google.` is checked AFTER yahoo/yandex/baidu/naver/ecosia (the `other-search` bucket) so it doesn't swallow them.

## Verification -- verbatim live evidence

**Test A (auth gate -- wrong token, expect 404):**

```
HTTP 404
```

**Test B (correct token, expect 200):**

```
HTTP 200, bytes=46881
```

**Test C (python validator -- structure + bucket sums + bucket names + empty-row check):**

```
OK -- all 4 windows have OLD + NEW keys

=== Bucket-sum sanity check (all windows) ===
  today       by_source.sum=  125  total_pageviews=  125  OK
  last_7d     by_source.sum=  227  total_pageviews=  227  OK
  last_30d    by_source.sum= 1633  total_pageviews= 1633  OK
  all_time    by_source.sum= 1633  total_pageviews= 1633  OK

=== ALL_TIME by_source (verbatim) ===
  direct                1091
  google                 440
  other-referral          71
  bing                    12
  chatgpt                 10
  youtube                  6
  email                    2
  linkedin                 1

=== ALL_TIME by_org (top 10) ===
  Cox Communications Inc.                               98
  Cox Communications Inc                                79
  Google LLC                                            67
  LogicWeb Inc                                          65
  Bharti Airtel Limited                                 61
  AWS EC2 (us-east-1)                                   49
  Vietnam Posts and Telecommunications Group            49
  Reliance Jio Infocomm Limited                         35
  Frontier Communications Corporation                   33
  Blazing SEO, LLC                                      32

=== ALL_TIME by_utm ===
  src=chatgpt.com          med=(none)          camp=(none)                        5
  src=clutch.co            med=referral_profile camp=(none)                        4
  src=heroagencies.com/agency/techcloudpro-vibing-world-inc med=referral        camp=agency_page                   1
  src=linkedin             med=post            camp=netsuite-q2-2026              1

=== ALL_TIME by_country (top 10) ===
  United States                   1011
  India                            208
  Vietnam                           66
  China                             61
  Singapore                         33
  Canada                            20
  Hong Kong                         16
  United Kingdom                    14
  Israel                            13
  Japan                             11

=== Empty/null entry check ===
  today       by_org empties=0  by_country empties=0
  last_7d     by_org empties=0  by_country empties=0
  last_30d    by_org empties=0  by_country empties=0
  all_time    by_org empties=0  by_country empties=0

All assertions PASSED.
```

### What this tells us about TCP traffic

- **66.8% direct** (1091 / 1633) — bookmarks, type-ins, dark social, app/email clients that strip referrers
- **27.0% Google** (440 / 1633) — organic + ads search dominates referred traffic
- **10 ChatGPT visits** — non-zero AEO presence, but tiny next to Google (~2.3% of Google volume)
- **0 Perplexity / DuckDuckGo / Facebook / Twitter / Reddit** — cold on every alt-search and social channel
- **Cox Communications #1+2 org** (177 combined) — same ISP showing under two slightly different org-string spellings; future cleanup candidate
- **US 62% / India 13% / Vietnam 4%** by country — US-anchored audience with notable India tail
- **Top campaign**: `linkedin / post / netsuite-q2-2026` only fired once → next priority is wiring more campaign UTMs

## DB columns queried

| Column | Used by | Filter |
|--------|---------|--------|
| `referrer` | by_source | streamed all rows in window, parse_url + hostname match in PHP |
| `org` | by_org | `IS NOT NULL AND TRIM(org) != ''`, `GROUP BY TRIM(org)`, LIMIT 30 |
| `country` | by_country | `IS NOT NULL AND TRIM(country) != ''`, LIMIT 20 |
| `utm_source`, `utm_medium`, `utm_campaign` | by_utm | `utm_source IS NOT NULL AND TRIM(utm_source) != ''`, LIMIT 25 |

Schema source of truth: 305-SUMMARY.md / SCHEMA_PROBE.md (no re-probe needed -- columns confirmed live in 305).

## Files changed

| File | Repo | Status |
|------|------|--------|
| `api/stats.php` | github.com/jeet-avatar/techcloudpro | extended (+93 lines, 0 deletions) |
| `.planning/quick/306-.../306-SUMMARY.md` | dollor.ai | created (this file) |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Local PHP linter unavailable -> deferred to live curl as syntax oracle**

- **Found during:** Task 1 Step D (`php -l` step)
- **Issue:** Plan called for `php -l /Users/jeet/techcloudpro/api/stats.php` to syntax-check before scp. Local machine has no PHP installed (`which php` -> not found) and Docker daemon was not running, so no offline lint was possible.
- **Fix:** Did a manual structural review (function declared at top level before try-block, all 8 SELECT queries terminated, all 4 `foreach (...) {}` loops closed with `unset($row)`, balanced braces) then deployed and used the live HTTP 200 response as the syntax oracle. If PHP had a syntax error the curl would have returned HTTP 500 with a database-error JSON or a blank body -- it returned HTTP 200 with valid JSON parsed cleanly by python3, so syntax is provably correct.
- **Files modified:** none -- review-only.
- **Tracked here so the next TCP deploy** knows local lint is unavailable and the live curl is the proof gate.

**2. [Rule 3 - Blocking] scp host alias `techcloudpro.com:22` did not resolve to SSH**

- **Found during:** Task 1 Step E
- **Issue:** Plan's scp command targeted `u350621741@techcloudpro.com:...` on the default port 22. Connection timed out (`Operation timed out` after 75s) because Hostinger SSH does not run on the public domain on port 22. Port 65002 against the same host also returned `No route to host`.
- **Fix:** Searched `~/.zsh_history` for prior successful Hostinger SSH commands, found host IP `147.93.101.51` on port 65002 used in earlier deploys (matches the pattern from `apps/techcloudpro/public/tcp-analytics/*.php` deploy in Mar 2026). Used `scp -P 65002 ... u350621741@147.93.101.51:...` -- succeeded silently.
- **Files modified:** none -- deploy command only.
- **Tracked here so the next TCP scp** uses the IP, not the domain alias. Update the 305 SUMMARY note about "SSH key installed" to also document host=`147.93.101.51` port=`65002`.

### Architectural changes

None.

### Out-of-scope items deferred

- `seo/` directory exists as untracked in `/Users/jeet/techcloudpro/` git status; left untouched (not part of this task; same as 305).
- The duplicate `Cox Communications Inc.` vs `Cox Communications Inc` org rows (98 + 79 = 177 same-ISP views split into two entries) suggest a future de-dup pass (`org_canonical` column or `LOWER(REGEXP_REPLACE(org, '[.,]+$', ''))` GROUP BY). Out of scope for 306 -- noted for a future task.

## CR ticket

Skipped -- TCP infrastructure (Hostinger), not dollor.ai admin portal.

## Authentication gates

None -- Hostinger SSH key already installed (305). Host is `147.93.101.51` on port `65002`.

## Commit hashes

| Repo | SHA | Description |
|------|-----|-------------|
| `techcloudpro` | `8ade7b6` | feat(tcp-analytics): add traffic-source breakdowns to stats.php (PUSHED to origin/main) |
| `dollor.ai` | `8e907fc3` | docs(quick-306): SUMMARY (local-only, NOT pushed per CLAUDE.md) |

## Live URL

`https://techcloudpro.com/tcp-analytics/stats.php?s=TcpSecureAdmin2026` (browser UA required to bypass Cloudflare WAF)

## Self-Check

- [x] `/Users/jeet/techcloudpro/api/stats.php` -- modified, contains `classify_source` AND 4 new aggregations per window
- [x] Server file at `/home/u350621741/domains/techcloudpro.com/public_html/tcp-analytics/stats.php` updated (8841 bytes, was 4252)
- [x] Curl with Safari UA returns 200 with token, 404 without
- [x] All 4 windows x 8 keys present in JSON
- [x] Sum of by_source[].views == total_pageviews per window (asserted in verify script across all 4 windows: 125/227/1633/1633)
- [x] by_source bucket names are subset of {direct, google, chatgpt, perplexity, bing, duckduckgo, linkedin, facebook, twitter, youtube, reddit, email, other-search, other-referral} (asserted)
- [x] by_org / by_country empties = 0 in all 4 windows (asserted)
- [x] techcloudpro commit `8ade7b6` pushed to origin/main

## Self-Check: PASSED

- FOUND: `/Users/jeet/techcloudpro/api/stats.php` (213 lines, contains `classify_source` + 20 `by_*` mentions)
- FOUND: server file at `/home/u350621741/domains/techcloudpro.com/public_html/tcp-analytics/stats.php` (8841 bytes via `ls -la` over SSH)
- FOUND: techcloudpro commit `8ade7b6` in `git log` of github.com/jeet-avatar/techcloudpro@main
- FOUND: `/Users/jeet/doordash-p2p/.planning/quick/306-extend-tcp-analytics-stats-php-with-traf/306-SUMMARY.md` (this file, 11320 bytes)
- LIVE PROOF: 4 windows × 8 keys, bucket-sum exact match across all windows (125/227/1633/1633), 0 empty entries in by_org/by_country, all bucket names valid
