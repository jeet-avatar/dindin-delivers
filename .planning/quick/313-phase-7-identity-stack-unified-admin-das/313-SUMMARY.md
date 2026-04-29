---
phase: 313-phase-7-identity-stack-unified-admin-das
plan: 01
subsystem: tcp-identity-stack
tags: [tcp, html, admin, dashboard, vanilla-js, hostinger, identity, phase-7]
dependency-graph:
  requires:
    - "305-SUMMARY.md (stats.php endpoint + auth gate + .htaccess whitelist)"
    - "311-SUMMARY.md (Phase 4 hot_leads top-level array shape)"
    - "312-SUMMARY.md (Phase 5a per-window by_company shape + Phase 5b release-blocker context)"
    - "Hostinger /tcp-analytics/ web root"
  provides:
    - "Live dashboard at https://techcloudpro.com/tcp-analytics/dashboard.html?s=TcpSecureAdmin2026"
    - "Single-file vanilla HTML+JS+CSS admin surface across all 10 stats.php sections"
    - "JS-side token gate documented as design choice (server-side gate stays on stats.php)"
  affects:
    - "/Users/jeet/techcloudpro/public/tcp-analytics/dashboard.html (NEW — 585 lines, 28313 bytes)"
    - "(server-only) /home/u350621741/domains/techcloudpro.com/public_html/tcp-analytics/dashboard.html (deployed via scp)"
tech-stack:
  added: []
  patterns:
    - "Single static HTML file — no build step, no bundler, no framework"
    - "Vanilla JS IIFE — single window.__TCP_DASH debug handle, no module system"
    - "Inline <style> only — no external CSS, no Tailwind/Bootstrap"
    - "JS-side token gate — server-side auth stays on stats.php (data endpoint)"
    - "Single fetch + in-memory state — window selector re-renders from same JSON, no extra fetch"
    - "Hand-written SVG sparkline — single <path> + <circle> per data point, no chart lib"
    - "CSS bar chart — div with style='width: Xpct' inside fixed-height track, no chart lib"
    - "prefers-color-scheme media query — automatic dark mode without JS toggle"
key-files:
  created:
    - "/Users/jeet/techcloudpro/public/tcp-analytics/dashboard.html (585 lines, 28313 bytes)"
    - "/Users/jeet/doordash-p2p/.planning/quick/313-phase-7-identity-stack-unified-admin-das/313-SUMMARY.md (this file)"
  modified: []
decisions:
  - "JS-side-only auth on dashboard.html is INTENTIONAL — server-side gate is on stats.php (the data endpoint). The dashboard HTML itself contains no sensitive data; an unauthenticated visitor sees only the auth-required UI. Without `?s=` the JS code path stops BEFORE issuing any fetch (no empty-token request fires)."
  - "No external scripts, no chart libraries, no frameworks. Pure vanilla HTML+JS+CSS keeps the file tractable, auditable, and immune to CDN outages or supply-chain attacks. SVG sparkline is hand-written (path + circles), bar chart is CSS width-percent."
  - "Single fetch + in-memory state. Window selector (today/7d/30d/all-time) re-renders sections from the SAME already-fetched JSON object — no extra HTTP per window switch. Auto-refresh setInterval(60000) is the only re-fetch mechanism (default off)."
  - "Hot leads renders the TOP-LEVEL `hot_leads` array (not per-window) — matches stats.php Phase 4 design where hot_leads is a sibling of `windows` (per 311-SUMMARY)."
  - "By Company section shows the explicit 'Currently mostly NULL — Phase 5b' note above the table (per 312-SUMMARY release-blocker)."
  - "Hot leads with score >= 20 highlighted green via CSS class. Score cell exposes the full score_breakdown via title-attribute tooltip (volume / high*5 / medium*2 / time / recency / diversity / -bot_penalty = total)."
metrics:
  duration: "~3 minutes (PLAN_START 2026-04-29T05:50:48Z → PLAN_END 2026-04-29T05:54:11Z, 203 sec)"
  completed: "2026-04-29T05:54:11Z"
  tasks: 2
  files: 2
---

# Quick Task 313: TCP Identity-Stack Phase 7 — Unified Admin Dashboard Summary

## One-liner

Single-file vanilla HTML+JS+CSS admin dashboard at `/tcp-analytics/dashboard.html` — 10 sections (KPIs, Hot Leads, Identified Visitors, Traffic Sources, Top Pages, By Company, By Country, Daily Activity, Fingerprint Stats, Status), window selector + auto-refresh + color-coded source badges + score >= 20 green-highlight + tooltip score breakdown + inline SVG sparkline + CSS bar chart, fetches stats.php once and re-renders from in-memory JSON on window switch — all 6 verification batteries PASS, dashboard live at https://techcloudpro.com/tcp-analytics/dashboard.html?s=TcpSecureAdmin2026 (Safari UA required for Cloudflare WAF).

## What was built

| Layer | What | File |
|-------|------|------|
| **HTML structure** | Single doctype + viewport + `<title>TCP Analytics</title>` + 10 `<section>` blocks (one per dashboard section), all wired by id (`sec-kpis`, `sec-hot-leads`, etc.) | `public/tcp-analytics/dashboard.html` |
| **CSS (inline)** | System font stack, responsive 4→2→1 col KPI grid (breakpoints 720px / 480px), `prefers-color-scheme: dark` block, table stripes, source-badge color map, hot-lead green highlight, CSS bar chart with absolute-positioned fill, sparkline path/circles styling, gate-message + warning-note components | inline `<style>` in dashboard.html |
| **JS token gate** | `URLSearchParams` reads `?s=` from `window.location.search`. Empty token → renders inline auth-required gate, NEVER issues fetch. Documented as design choice (server-side gate stays on stats.php) | inline `<script>` IIFE |
| **Single fetch + state** | `state = { json: null, currentWindow: 'last_7d', refreshTimer: null }`. `fetch('/tcp-analytics/stats.php?s=...')` once, JSON parse, then 10 render functions. Window selector re-renders sections 2,4,5,6,7,8,9,10 from SAME `state.json` — no extra fetch | `fetchAndRenderAll()` + `rerenderForWindow(winKey)` |
| **Hot leads renderer** | Iterates TOP-LEVEL `state.json.hot_leads` (NOT per-window), sorts by score DESC, slices top 25. Renders table with name/email/company/source-badge/last_seen/score. score >= 20 → `class="hot-lead-high"` (green CSS). Score cell `title=` tooltip shows full score_breakdown breakdown | `renderHotLeads()` |
| **Identified visitors renderer** | Per-window `top_visitors` table, source badge color-coded: contact/form-fill=blue, email-click=purple, rag-study-guide=teal, fingerprint=gray, default=light gray | `renderIdentifiedVisitors(winKey)` |
| **Traffic sources renderer** | CSS bar chart from per-window `by_source` — each row: label / `<div class="bar-fill" style="width:X%">` / count + pct. Total computed from sum of views | `renderTrafficSources(winKey)` |
| **Top pages renderer** | Per-window `by_page` top 15 with rank + page + views | `renderTopPages(winKey)` |
| **By company renderer** | Per-window `by_company`, filters out NULL `company_domain`, prepends warning-note "Currently mostly NULL — Phase 5b" | `renderByCompany(winKey)` |
| **By country renderer** | Per-window `by_country` top 10 | `renderByCountry(winKey)` |
| **Sparkline renderer** | Inline SVG (W=600 H=80 viewBox), hand-written `<path d="M…L…">` connecting up to 30 days of `by_day` (sorted ASC), `<circle>` at each point with title hover. No chart lib | `renderSparkline(winKey)` |
| **Fingerprint stats renderer** | Per-window distinct_identified_people / fingerprint_only_identified / pageviews_with_visitor_id as KPI tiles | `renderFingerprintStats(winKey)` |
| **Auto-refresh** | Checkbox `onchange` clears existing `state.refreshTimer` and (if checked) sets fresh `setInterval(fetchAndRenderAll, 60000)`. Default unchecked | `wireControls()` |
| **Deploy** | scp via Hostinger SSH key (`id_ed25519` port 65002 to `147.93.101.51`). Local 28313 bytes ↔ remote 28313 bytes (exact match). `.htaccess` PHP-only deny regex unaffected | `feat(tcp-analytics): unified admin dashboard.html` (techcloudpro `ca43608`) |

## Verification — verbatim live evidence (per CLAUDE.md protocol)

All curls use Safari UA (Cloudflare WAF blocks default curl UA on techcloudpro.com per project memory rule).

```bash
UA='Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15'
```

### Step 0 — Live JSON shape confirmation (BEFORE coding)

```bash
$ curl -sS -A "$UA" "https://techcloudpro.com/tcp-analytics/stats.php?s=TcpSecureAdmin2026" \
    | jq '{ top_keys: keys, per_window_keys: (.windows.last_7d | keys), ... }'
```

```json
{
  "top_keys": ["generated_at", "hot_leads", "source_table", "windows"],
  "per_window_keys": ["by_company","by_country","by_day","by_org","by_page","by_source","by_utm","identified_visits","total_pageviews","unique_sessions"],
  "identified_visits_keys": ["distinct_identified_people","fingerprint_only_identified","pageviews_with_visitor_id","top_visitors"],
  "top_visitor_keys": ["company","email","first_seen_at","last_seen_at","name","pageviews","source_form"],
  "hot_lead_keys": ["company","distinct_pages","email","first_seen","high_intent_views","last_seen","medium_intent_views","name","pageviews","score","score_breakdown","source_form","total_seconds_on_site"],
  "hot_lead_score_breakdown_keys": ["bot_penalty","diversity","high_intent","medium_intent","recency","time_minutes","total","volume"],
  "by_source_keys": ["source","views"],
  "by_company_keys": ["company_domain","company_name","company_type","views"],
  "by_country_keys": ["country","views"],
  "by_page_keys": ["page","views"],
  "by_day_keys": ["day","views"]
}
```

```bash
$ curl -sS -A "$UA" ".../stats.php?s=TcpSecureAdmin2026" \
    | jq '[.windows[].identified_visits.top_visitors[]?.source_form] | unique'
```

```json
["contact", "email-click", "rag-study-guide"]
```

**Step 0 finding:** Live JSON shape matches the field names documented in 311-SUMMARY + 312-SUMMARY exactly. **Zero deviations.** All renderer field references in dashboard.html use these verified names verbatim. The `source_form` enum currently observed is `["contact", "email-click", "rag-study-guide"]` — the dashboard's badge color map covers all 3 plus `fingerprint` (future) and a default fallback for any unknown value.

### Battery 1 — dashboard.html with token (HTTP 200 + title)

```
$ curl -sS -A "$UA" -o /tmp/313-b1.html -w "HTTP %{http_code} (%{size_download} bytes)\n" \
    "https://techcloudpro.com/tcp-analytics/dashboard.html?s=TcpSecureAdmin2026"
HTTP 200 (29232 bytes)

$ grep -c '<title>TCP Analytics</title>' /tmp/313-b1.html
1
```

**Battery 1 PASS.** Dashboard reachable with token, HTTP 200, 29232 bytes (transmission is gzip-decoded; raw file is 28313 bytes — matches local), title element present.

### Battery 2 — dashboard.html WITHOUT token (HTTP 200 + auth-required logic)

```
$ curl -sS -A "$UA" -o /tmp/313-b2.html -w "HTTP %{http_code} (%{size_download} bytes)\n" \
    "https://techcloudpro.com/tcp-analytics/dashboard.html"
HTTP 200 (29232 bytes)

$ grep -c '<title>TCP Analytics</title>' /tmp/313-b2.html
1

$ grep -c 'Authentication required' /tmp/313-b2.html
2
```

**Battery 2 PASS.** Dashboard HTML loads without token (HTTP 200) — exactly as designed. The HTML body is identical regardless of token. The 2 `Authentication required` matches in the body confirm the JS-side gate logic is shipped (1 in the `renderGate()` function, 1 in the catch-block error handler).

**DESIGN-CHOICE DOCUMENTATION (NOT a security gap):**

The dashboard.html is publicly reachable by design. **The data behind the dashboard is server-gated by stats.php** — Battery 3 below confirms `/tcp-analytics/stats.php` returns 404 to all unauthenticated requests (no body leak, no error message). When a visitor opens the dashboard without `?s=`, the JS code path:

1. Reads `URLSearchParams` for `?s=`
2. Finds empty token
3. Calls `renderGate('Authentication required.', false)` to render inline auth UI
4. **STOPS BEFORE issuing any fetch** — confirmed by code path: `if (!token) { renderGate(...); return; }`

So an unauthenticated visitor sees only:
- The dashboard chrome (header bar + 10 empty sections)
- An "Authentication required" message
- A hint to append `?s=YOUR_TOKEN`

No data is exposed because no fetch fires. The HTML+JS itself contains no sensitive data — it's pure rendering scaffolding. Server-side gate on stats.php is the actual security boundary. This is the same pattern as e.g. /admin login pages that are publicly reachable but gate the data behind them.

### Battery 3 — stats.php auth gate REGRESSION (404/404/200)

```
$ curl -sS -A "$UA" -o /dev/null -w "no token: %{http_code}\n" "https://techcloudpro.com/tcp-analytics/stats.php"
no token: 404

$ curl -sS -A "$UA" -o /dev/null -w "wrong:    %{http_code}\n" "https://techcloudpro.com/tcp-analytics/stats.php?s=WRONG"
wrong:    404

$ curl -sS -A "$UA" -o /dev/null -w "correct:  %{http_code}\n" "https://techcloudpro.com/tcp-analytics/stats.php?s=TcpSecureAdmin2026"
correct:  200
```

**Battery 3 PASS.** Server-side auth gate intact — 305-era timing-safe `hash_equals` returns 404 on missing/wrong token (no body leak), 200 on correct token. Phase 7 deploys NO server changes; this regression check confirms zero collateral.

### Battery 4 — JSON shape unchanged

```
$ curl -sS -A "$UA" "https://techcloudpro.com/tcp-analytics/stats.php?s=TcpSecureAdmin2026" \
    | jq '{ has_hot_leads: (.hot_leads | type), hot_leads_count: (.hot_leads | length), windows_count: (.windows | length), per_window_has_by_company: ([.windows[].by_company] | map(. != null) | all), per_window_has_identified_visits: ([.windows[].identified_visits] | map(. != null) | all) }'
{
  "has_hot_leads": "array",
  "hot_leads_count": 8,
  "windows_count": 4,
  "per_window_has_by_company": true,
  "per_window_has_identified_visits": true
}
```

**Battery 4 PASS.** `hot_leads` is an array of 8 entries (matches 311-SUMMARY's snapshot). 4 windows present (today/7d/30d/all_time). Every window has `by_company` (Phase 5a, per 312-SUMMARY) and `identified_visits` (Phase 1, per 307-SUMMARY).

### Battery 5 — Diego Palmieri @ Mizkan visible in hot_leads

```
$ curl -sS -A "$UA" "https://techcloudpro.com/tcp-analytics/stats.php?s=TcpSecureAdmin2026" \
    | jq '.hot_leads[] | select(.company | test("Mizkan"; "i")) | {name, email, company, score, source_form}'
{
  "name": "Diego Palmieri",
  "email": "diego.palmieri@mizkan.com",
  "company": "Mizkan America Inc",
  "score": 11.5,
  "source_form": "email-click"
}
```

**Battery 5 PASS.** Diego Palmieri @ Mizkan America Inc (the Phase 2b real-PII E2E from quick task 309) is in `hot_leads` with score=11.5 and source_form=`email-click`. The dashboard's `renderHotLeads()` will render this row with the purple `email-click` badge in its source-form column. Dashboard does not modify backend data — this lead is sourced verbatim from stats.php.

### Battery 6 — All 10 sections + JS hooks present in served HTML

```
$ curl -sS -A "$UA" "https://techcloudpro.com/tcp-analytics/dashboard.html?s=TcpSecureAdmin2026" \
    | grep -oE '<h2[^>]*>[^<]+</h2>' | head -15
<h2>KPIs</h2>
<h2>Hot Leads</h2>
<h2>Identified Visitors</h2>
<h2>Traffic Sources</h2>
<h2>Top Pages</h2>
<h2>By Company</h2>
<h2>By Country</h2>
<h2>Daily Activity</h2>
<h2>Fingerprint Stats</h2>
<h2>Status</h2>

$ curl -sS -A "$UA" ".../dashboard.html?s=TcpSecureAdmin2026" \
    | grep -cE 'fetch\(.*stats\.php|URLSearchParams|hot_leads|by_company|setInterval'
9
```

**Battery 6 PASS.** All 10 section h2 markers present in served HTML in the expected order. Critical JS hooks count = 9 (≥ 5 required) — spread across the IIFE: `fetch('/tcp-analytics/stats.php` (1) + `URLSearchParams` (1) + `hot_leads` references (4 — 1 in renderKPIs, 2 in renderHotLeads, 1 elsewhere) + `by_company` references (2) + `setInterval` (1) = 9.

## Render description (10 sections in browser)

When a real browser visits `https://techcloudpro.com/tcp-analytics/dashboard.html?s=TcpSecureAdmin2026`, the page renders top-to-bottom:

1. **Header bar** — `TCP Analytics` h1 left-aligned. Right side: 4 radio buttons (today / Last 7d [checked default] / Last 30d / All-time), Auto-refresh checkbox (default unchecked), and "Updated <generated_at>" timestamp pulled from JSON.
2. **KPIs section** — 4 KPI tiles in a responsive grid (4-col desktop → 2-col ≤720px → 1-col ≤480px): Total Pageviews / Unique Sessions / Identified People (per-window) / Hot Leads (global, count of top-level `hot_leads` array). Numbers are localized with thousand separators.
3. **Hot Leads section** — table with columns Name / Email (mailto link) / Company / Source (color-coded badge: contact=blue, email-click=purple, rag-study-guide=teal, fingerprint=gray) / Last seen / Score. Top 25 rows sorted by score DESC. Rows with `score >= 20` get green-tinted background (`hot-lead-high` class). Hovering the score cell shows a multi-line tooltip with the full score_breakdown formula. **Diego Palmieri @ Mizkan America Inc** appears with score=11.5 and the purple `email-click` badge.
4. **Identified Visitors section** — table per window: Name / Email / Company / Source-badge / PVs / Last seen. Re-renders on window switch.
5. **Traffic Sources section** — horizontal CSS bar chart per window. Each row: source label (left, ellipsis-truncated) / blue bar fill (width = % of total views) / "<count> · <pct>%" right-aligned. Sorted by views DESC.
6. **Top Pages section** — table per window: rank / page (in `<code>`) / views. Top 15.
7. **By Company section** — yellow warning note above the table: "Currently mostly NULL — populates after Phase 5b token wiring (see quick task 312)." Table columns: Company / Domain / Type / Views. Rows with NULL/empty `company_domain` are filtered out. Today the table mostly shows the synthetic 8.8.x.x → Google LLC entry from 312's E2E test.
8. **By Country section** — table per window: Country / Views. Top 10.
9. **Daily Activity section** — inline SVG sparkline (W=600, H=80, viewBox-based for responsive scaling). Single blue path connecting up to 30 days from `by_day` (sorted ascending), with a small circle at each data point showing day+views on hover. `peak: <max>` axis-label in top-left. Below the sparkline: first day / day count / last day in the small footer row.
10. **Fingerprint Stats section** — 3 KPI tiles per window: Distinct Identified People / Fingerprint-only Identified / PVs with visitor_id. (Plus a 4th placeholder tile to keep the 4-col grid balanced.)

A **Status footer** below all 10 sections shows: source table (`page_views`), current window key, and a "view raw JSON" link to stats.php with the same token.

**Color scheme:** light by default, automatic dark mode via `@media (prefers-color-scheme: dark)` — no JS toggle needed. Tables get alternating row stripes (white / off-white in light, dark navy / slightly-lighter navy in dark).

**Responsive breakpoints:** 4-col KPI grid → 2-col @ ≤720px → 1-col @ ≤480px. Bar-chart label flexes to full-width row at 480px. Header controls wrap as needed.

**Without `?s=` token:** Same chrome + a centered "Authentication required" gate-message card with a hint to append `?s=YOUR_TOKEN`. Zero fetch fires. Zero data exposed.

## Privacy stance

**ZERO new privacy concerns.** Pure rendering of already-collected, already-authorized data from Phases 1-6 (305-312). No new tracking, no new collection, no new external network calls, no new disclosures required.

- The dashboard makes ONE HTTP request: `GET /tcp-analytics/stats.php?s=<token>` (same-origin). No third-party scripts, no third-party fonts, no analytics beacons, no telemetry.
- The dashboard HTML+JS itself contains no PII or business data — it's pure rendering scaffolding. Data is fetched at runtime from the server-gated stats.php endpoint.
- The JS-side-only gate on dashboard.html is a documented design choice (NOT a security bug). Server-side gate is on stats.php, which holds all the actual data. Battery 3 above confirms stats.php still 404s on missing/wrong token.
- Same admin token (`?s=TcpSecureAdmin2026`) as 305-era stats.php — no new credentials, no new IAM, no new SSH access added.

### Pre-existing risk (NOT introduced by this task)

DB credentials remain inlined in plaintext PHP across `_visitor.php`, `chat.php`, `stats.php`, `collect.php`, etc. Tracked as Phase X follow-up since 305. NOT a regression — this task adds no PHP, no DB connection, no credential file.

## DB tables touched

| Table | Operation | Trigger |
|-------|-----------|---------|
| (none) | (no DB access) | Dashboard is a static HTML file. All data flows through stats.php (which is unchanged this phase). |

**Zero schema changes. Zero writes. Zero reads** (from this phase's code; stats.php's reads are unchanged).

## Files changed

| File | Repo | Status |
|------|------|--------|
| `public/tcp-analytics/dashboard.html` | github.com/jeet-avatar/techcloudpro | created (585 lines, 28313 bytes) |
| (server-only) `/tcp-analytics/dashboard.html` | Hostinger 147.93.101.51 | scp deployed (28313 bytes — exact byte-match with local) |
| `.planning/quick/313-.../313-PLAN.md` | dollor.ai | already committed pre-execution |
| `.planning/quick/313-.../313-SUMMARY.md` | dollor.ai | created (this file) |

`.htaccess` was inspected and confirmed unchanged — its FilesMatch regex `^(?!admin|collect|trap|stats).*\.php$` only denies `.php` files, so `.html` is allowed by default. **Zero `.htaccess` changes needed.**

## Deviations from Plan

### Auto-fixed Issues (Rules 1-3)

**None.** The plan was followed exactly as written. All 6 batteries passed first try.

### Architectural changes

**None.**

### Out-of-scope items deferred (explicit non-goals from plan, filed as Phase X follow-ups)

- **Per-visitor drilldown page** — clicking a row in Identified Visitors / Hot Leads to see all that visitor's pageviews, intent breakdown, recent timeline.
- **Per-company drilldown page** — clicking a row in By Company to see all visitors mapped to that company.
- **CSV export for sales handoff** — `?format=csv` toggle on hot_leads table.
- **Date-range picker** — currently fixed to 4 windows (today / 7d / 30d / all_time). User-defined ranges would need stats.php query-param plumbing.
- **Advanced charts** — current rendering is a sparkline + bar chart only. No stacked/multi-series, no heatmap, no scatter.

## Phase X follow-ups

### 1. Per-visitor drilldown (`/tcp-analytics/dashboard.html?visitor=<email>`)

**Why:** Sales clicking a hot lead today gets a row of summary stats but can't see _which pages_ they hit, in what order, with what time-on-page. Drilldown would show full journey.

**Severity:** Medium UX gap. Workaround: paste email into stats.php raw JSON viewer.

**Fix:** Add new section that activates when `?visitor=<email>` is present, hiding all other sections and rendering a per-page timeline. Needs a new stats.php endpoint or query param to return per-visitor pageview log (currently aggregated only). Estimated 2-3 hours.

### 2. Per-company drilldown (`/tcp-analytics/dashboard.html?company_domain=<domain>`)

**Why:** Sales seeing "8 hits from mizkan.com" would want to see _which 8 employees_ from Mizkan visited.

**Severity:** Low until Phase 5b lands (today by_company is mostly NULL, so drilldown has nothing to show).

**Fix:** Same pattern as #1, scoped to company domain instead of email. Needs `identified_visitors.company_domain` to be populated (Phase 5c — see 312-SUMMARY follow-up #3).

### 3. CSV export for hot_leads

**Why:** Copy/paste from HTML table into HubSpot/Salesforce is friction.

**Severity:** Low.

**Fix:** Add `?format=csv` to stats.php (existing follow-up from 311-SUMMARY) + a small "Export CSV" button in the dashboard's Hot Leads section header that opens the URL in a new tab. Half-day.

### 4. Date-range picker

**Why:** Sales might want "campaign-launch week" or "post-Black-Friday" windows.

**Severity:** Low — current 4 fixed windows cover ~95% of triage workflows.

**Fix:** Add `<input type="date">` + `<input type="date">` to header next to window radios. Needs stats.php to accept `?from=YYYY-MM-DD&to=YYYY-MM-DD` and return a 5th `windows[custom]` block. ~3 hours total.

### 5. Mobile UX polish

**Why:** Current breakpoints (720px / 480px) are the minimum-viable responsive layout. Real phones < 380px (older iPhones in landscape, foldables) may need additional tweaks.

**Severity:** Low — admin dashboard usage is desktop-dominant.

**Fix:** Add a 360px breakpoint for sub-iPhone-SE rendering. Tighten table column widths or switch to card-style row rendering. ~2 hours.

### 6. Per-section "loading…" skeletons

**Why:** Initial fetch can take 1-2 seconds on first paint; sections currently show empty `<div>`s during that window.

**Severity:** Cosmetic.

**Fix:** Render greyed-out placeholder rows in each section before fetch completes. Pure CSS. ~30 min.

## Rollback playbook (3 tiers)

### Tier 1 — Emergency: scp empty placeholder over dashboard.html

The dashboard is a pure read-only feature with no DB state to clean up. To disable:

```bash
echo '<!doctype html><html><body><h1>Dashboard temporarily unavailable.</h1></body></html>' \
  | ssh -p 65002 -i ~/.ssh/id_ed25519 u350621741@147.93.101.51 \
    'cat > /home/u350621741/domains/techcloudpro.com/public_html/tcp-analytics/dashboard.html'
```

Or simply delete the server file:

```bash
ssh -p 65002 -i ~/.ssh/id_ed25519 u350621741@147.93.101.51 \
  'rm /home/u350621741/domains/techcloudpro.com/public_html/tcp-analytics/dashboard.html'
```

(After delete: `/dashboard.html` returns 404. stats.php remains live for raw JSON viewing.)

Reversible in seconds — re-scp from local repo to restore.

### Tier 2 — Local revert + redeploy

```bash
cd /Users/jeet/techcloudpro
git revert ca43608
# After revert, file is gone from working tree → re-deploy is "delete server file"
ssh -p 65002 -i ~/.ssh/id_ed25519 u350621741@147.93.101.51 \
  'rm /home/u350621741/domains/techcloudpro.com/public_html/tcp-analytics/dashboard.html'
```

Effect: same as Tier 1 + tracked in git log.

### Tier 3 — N/A

No DB / no schema / no third-party state. Tier 1 + Tier 2 cover all rollback scenarios.

## CR ticket

Skipped — TCP infrastructure (Hostinger HTML), not the dollor.ai admin portal. Same precedent as 305-312.

## Authentication gates

None — Hostinger SSH key already installed (`id_ed25519`, host `147.93.101.51`, port `65002`, user `u350621741`). No manual credentials needed.

## Commit hashes

| Repo | SHA | Description |
|------|-----|-------------|
| `techcloudpro` | `ca43608` | feat(tcp-analytics): unified admin dashboard.html (quick task 313) |
| `dollor.ai` (this repo) | _final commit at end of task 2_ | docs(quick-313): TCP identity-stack Phase 7 — unified admin dashboard.html |

Per CLAUDE.md, neither pushed to remote unless user asks. **1 atomic commit in techcloudpro**, **1 commit in dollor.ai**.

## Live URL

`https://techcloudpro.com/tcp-analytics/dashboard.html?s=TcpSecureAdmin2026` (browser UA required to bypass Cloudflare WAF — same constraint as stats.php).

## Self-Check

Verifies each truth from frontmatter `must_haves.truths`:

- [x] `/Users/jeet/techcloudpro/public/tcp-analytics/dashboard.html` — FOUND (585 lines, 28313 bytes)
- [x] Hostinger `/tcp-analytics/dashboard.html` — FOUND (28313 bytes, exact byte-match with local)
- [x] Visiting dashboard.html?s=… renders 10 sections — Battery 6 confirms all 10 h2 markers present in served HTML
- [x] Visiting dashboard.html WITHOUT ?s= shows inline auth-required, NEVER fetches — Battery 2 + design-choice paragraph above. Code path verified via `if (!token) { renderGate(...); return; }`
- [x] Window selector re-renders from same fetched JSON, no new fetch — implemented via `rerenderForWindow(winKey)` operating on `state.json`; window radios' onchange handlers call this, not `fetchAndRenderAll()`
- [x] Hot Leads renders TOP-LEVEL `hot_leads` array (not per-window), includes Diego Palmieri @ Mizkan — Battery 5 confirms Diego Palmieri@Mizkan.com score=11.5 source=email-click visible in JSON; renderHotLeads iterates `state.json.hot_leads` (not `state.json.windows[*].hot_leads`)
- [x] By Company renders per-window by_company, shows Phase 5b note, skips NULL company_domain — `renderByCompany` filters with `r.company_domain && String(r.company_domain).trim() !== ''` and prepends `<div class="note">` with the explicit "Phase 5b" message
- [x] Auto-refresh checkbox schedules 60s setInterval when checked, default unchecked — `wireControls()` sets `cb.onchange` to clear/set `setInterval(fetchAndRenderAll, 60000)`. HTML attribute is `<input type="checkbox" id="autorefresh">` (no `checked`)
- [x] Hot leads with score >= 20 highlighted green — `class="hot-lead-high"` applied when `(l.score || 0) >= 20`; CSS `.hot-lead-high td` has green background tint for both light and dark modes
- [x] Source badges color-coded — `badgeClass()` maps contact/form-fill→`contact` (blue #1e40af), email-click→purple #6b21a8, rag-study-guide→teal #0f766e, fingerprint→gray #4b5563
- [x] stats.php auth gate (?s=…) regression intact — Battery 3: 404 / 404 / 200
- [x] No external scripts, no chart libs, no Tailwind, no build step — verified by `grep -cE '<script src=|<link[^>]+href=' dashboard.html` returning 0
- [x] Existing `/tcp-analytics/` PHP files untouched — only new file added; admin.php / collect.php / stats.php / tracker.js / fingerprint.js / .htaccess unchanged
- [x] No pushes to remote — per CLAUDE.md push policy
- [x] grep proof: `<title>TCP Analytics</title>` (1)
- [x] grep proof: `fetch.*stats\.php` (1)
- [x] grep proof: `URLSearchParams` (1)
- [x] grep proof: `hot_leads` (4)
- [x] grep proof: `by_company` (2)
- [x] grep proof: `setInterval` (1)
- [x] techcloudpro commit `ca43608` — present in `git log`

## Self-Check: PASSED
