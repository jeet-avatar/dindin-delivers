---
phase: 313-phase-7-identity-stack-unified-admin-das
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - "/Users/jeet/techcloudpro/public/tcp-analytics/dashboard.html (NEW — single static file ~400-500 lines vanilla HTML+JS+CSS)"
  - "(server-only) /home/u350621741/domains/techcloudpro.com/public_html/tcp-analytics/dashboard.html (scp deploy target)"
  - "(server-only, IF NEEDED) /home/u350621741/domains/techcloudpro.com/public_html/tcp-analytics/.htaccess (extend FilesMatch whitelist to include dashboard.html — only if Apache blocks dashboard.html)"
  - "/Users/jeet/doordash-p2p/.planning/quick/313-phase-7-identity-stack-unified-admin-das/313-SUMMARY.md (NEW)"
autonomous: true
requirements:
  - "TCP-IDENTITY-PHASE-7-DASHBOARD"
user_setup: []

must_haves:
  truths:
    - "Visiting https://techcloudpro.com/tcp-analytics/dashboard.html?s=TcpSecureAdmin2026 in a real browser renders 10 dashboard sections populated with live stats.php data"
    - "Visiting the same URL without ?s= shows an inline auth-required message — does NOT crash, does NOT make a fetch with empty token"
    - "Switching the window selector (today / 7d / 30d / all-time) re-renders KPI tiles + per-window sections from the SAME already-fetched JSON object — no new fetch fires"
    - "Hot Leads section renders the top-level hot_leads array (NOT per-window) and includes Diego Palmieri @ Mizkan America Inc"
    - "By Company section renders the per-window by_company array, shows the 'mostly NULL until Phase 5b' note, and skips rows where company_domain IS NULL"
    - "Auto-refresh checkbox, when checked, schedules setInterval(60000) → fetch + re-render; default = unchecked"
    - "Hot leads with score >= 20 are visually highlighted in green"
    - "Source badges in Identified Visitors are color-coded: form-fill/contact=blue, email-click=purple, rag-study-guide=teal, fingerprint=gray"
    - "stats.php auth gate (404/404/200) regression check still passes after deploy"
  artifacts:
    - path: "/Users/jeet/techcloudpro/public/tcp-analytics/dashboard.html"
      provides: "Single static admin dashboard — vanilla HTML+JS+CSS, no build step, no external chart libs, no dependencies beyond browser fetch+JSON.parse+CSS"
      contains: "<title>TCP Analytics</title>"
      min_lines: 350
    - path: "(server) /home/u350621741/domains/techcloudpro.com/public_html/tcp-analytics/dashboard.html"
      provides: "Live dashboard endpoint reachable at https://techcloudpro.com/tcp-analytics/dashboard.html?s=TcpSecureAdmin2026 with browser UA"
  key_links:
    - from: "dashboard.html (JS)"
      to: "/tcp-analytics/stats.php?s=<token>"
      via: "fetch() with token from window.location URLSearchParams('s')"
      pattern: "fetch.*stats\\.php.*\\?s="
    - from: "dashboard.html (JS)"
      to: "window.location.search"
      via: "new URLSearchParams to extract ?s= verbatim — no transformation, no encoding shenanigans"
      pattern: "URLSearchParams"
    - from: "Window selector radio buttons"
      to: "single in-memory JSON object"
      via: "onchange handler re-runs render functions over already-fetched JSON.windows[selectedKey]"
      pattern: "onchange.*render"
    - from: "Hot leads table"
      to: "JSON.hot_leads (top-level, NOT JSON.windows[*].hot_leads)"
      via: "direct array iteration, sorted by score DESC, sliced to 25"
      pattern: "json\\.hot_leads"
---

<objective>
Build and deploy `/Users/jeet/techcloudpro/public/tcp-analytics/dashboard.html` — a single-file vanilla HTML+JS+CSS admin dashboard that renders the existing stats.php JSON across 10 sections with a window selector, auto-refresh checkbox, color-coded source badges, simple SVG sparkline + CSS bar charts (NO chart libraries), and a JS-side token gate via `?s=` URL param. Deploy to Hostinger, run all 6 verification batteries, and write the SUMMARY with verbatim curl evidence per CLAUDE.md.

Purpose: Phase 7 of TCP identity-stack — single human-friendly admin surface to view all the analytics + identity data already collected by Phases 1-6 (305-312). Pure rendering of already-collected, already-authorized data — no new collection, no new endpoints, no new privacy concerns.

Output: Live dashboard at `https://techcloudpro.com/tcp-analytics/dashboard.html?s=TcpSecureAdmin2026` (browser UA required to bypass Cloudflare WAF — same constraint as stats.php).
</objective>

<execution_context>
@/Users/jeet/.claude/get-shit-done/workflows/execute-plan.md
@/Users/jeet/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@/Users/jeet/doordash-p2p/.planning/STATE.md
@/Users/jeet/doordash-p2p/CLAUDE.md
@/Users/jeet/doordash-p2p/.planning/quick/305-build-tcp-analytics-stats-php-on-techclo/305-SUMMARY.md
@/Users/jeet/doordash-p2p/.planning/quick/311-phase-4-identity-stack-behavioral-lead-s/311-SUMMARY.md
@/Users/jeet/doordash-p2p/.planning/quick/312-phase-5a-identity-stack-ip-to-company-re/312-SUMMARY.md
@/Users/jeet/techcloudpro/api/stats.php
</context>

<deploy_constants>
| Constant | Value |
|----------|-------|
| Hostinger SSH host | `147.93.101.51` |
| Hostinger SSH port | `65002` |
| Hostinger SSH user | `u350621741` |
| Hostinger SSH key | `~/.ssh/id_ed25519` |
| Web root | `/home/u350621741/domains/techcloudpro.com/public_html` |
| Dashboard target path on server | `<web root>/tcp-analytics/dashboard.html` |
| Local source path | `/Users/jeet/techcloudpro/public/tcp-analytics/dashboard.html` |
| Admin token | `TcpSecureAdmin2026` |
| Stats endpoint URL | `https://techcloudpro.com/tcp-analytics/stats.php?s=TcpSecureAdmin2026` |
| Dashboard URL after deploy | `https://techcloudpro.com/tcp-analytics/dashboard.html?s=TcpSecureAdmin2026` |
| Required UA for curl | `Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15` (Safari — Cloudflare WAF blocks default curl UA on techcloudpro.com per project memory rule) |
</deploy_constants>

<tasks>

<task type="auto">
  <name>Task 1: Confirm live JSON shape, build dashboard.html, deploy, run all 6 verification batteries</name>
  <files>
    /Users/jeet/techcloudpro/public/tcp-analytics/dashboard.html
    (server) /home/u350621741/domains/techcloudpro.com/public_html/tcp-analytics/dashboard.html
    (server, conditional) /home/u350621741/domains/techcloudpro.com/public_html/tcp-analytics/.htaccess
  </files>
  <action>
**Step 0 — MANDATORY: Confirm live JSON field names BEFORE writing the renderer**

Defense against hallucinating field names. Run these two curls verbatim and pipe through jq to capture the EXACT keys the dashboard will consume. Save the output to scratch (do NOT commit) and use it as the only source of truth for field references in the JS:

```bash
UA='Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15'

# 0a — Top-level + per-window keys
curl -sS -A "$UA" "https://techcloudpro.com/tcp-analytics/stats.php?s=TcpSecureAdmin2026" \
  | jq '{ top_keys: keys, per_window_keys: (.windows.last_7d | keys), identified_visits_keys: (.windows.last_7d.identified_visits | keys), top_visitor_keys: (.windows.last_7d.identified_visits.top_visitors[0] // {} | keys), hot_lead_keys: (.hot_leads[0] // {} | keys), hot_lead_score_breakdown_keys: (.hot_leads[0].score_breakdown // {} | keys), by_source_keys: (.windows.last_7d.by_source[0] // {} | keys), by_company_keys: (.windows.last_7d.by_company[0] // {} | keys), by_country_keys: (.windows.last_7d.by_country[0] // {} | keys), by_page_keys: (.windows.last_7d.by_page[0] // {} | keys), by_day_keys: (.windows.last_7d.by_day[0] // {} | keys) }'

# 0b — Distinct source_form values currently in identified_visits.top_visitors (so badge color map is data-driven, not invented)
curl -sS -A "$UA" "https://techcloudpro.com/tcp-analytics/stats.php?s=TcpSecureAdmin2026" \
  | jq '[.windows[].identified_visits.top_visitors[]?.source_form] | unique'
```

Use the captured key names verbatim in the JS. Per 311+312 SUMMARYs, expected shape is:

- Top-level: `generated_at`, `source_table`, `windows`, `hot_leads`
- Per-window: `total_pageviews`, `unique_sessions`, `by_page`, `by_day`, `by_source`, `by_utm`, `by_org`, `by_company`, `by_country`, `identified_visits`
- `identified_visits`: `pageviews_with_visitor_id`, `distinct_identified_people`, `fingerprint_only_identified`, `top_visitors`
- `top_visitors[i]`: `name`, `email`, `company`, `source_form`, `first_seen_at`, `last_seen_at`, `pageviews`
- `hot_leads[i]`: `name`, `email`, `company`, `source_form`, `first_seen`, `last_seen`, `pageviews`, `distinct_pages`, `total_seconds_on_site`, `high_intent_views`, `medium_intent_views`, `score`, `score_breakdown`
- `score_breakdown`: `volume`, `high_intent`, `medium_intent`, `time_minutes`, `recency`, `diversity`, `bot_penalty`, `total`
- `by_source[i]`: `source`, `views`
- `by_page[i]`: `page`, `views`
- `by_day[i]`: `day`, `views`
- `by_country[i]`: `country`, `views`
- `by_company[i]`: `company_name`, `company_domain`, `company_type`, `views`
- `by_org[i]`: `org`, `views`

If the live JSON deviates from any of these, USE THE LIVE SHAPE, not the SUMMARY shape. Note any deviation in the SUMMARY's "Deviations from Plan" section.

**Step 1 — Create the local file**

Create `/Users/jeet/techcloudpro/public/tcp-analytics/dashboard.html` (parent directory `/Users/jeet/techcloudpro/public/tcp-analytics/` may not exist — `mkdir -p` first). Single self-contained file, ~400-500 lines.

Required structure:

1. `<!doctype html>` + `<html lang="en">` + `<head>` with `<title>TCP Analytics</title>` + viewport meta tag
2. Inline `<style>` block — system font stack, `prefers-color-scheme` for light/dark, responsive grid, mobile-friendly down to ~360px
3. `<body>` containing:
   - Header bar `<header>` — h1 "TCP Analytics", last-updated `<time>` (filled from `generated_at`), 4 radio inputs (today/last_7d/last_30d/all_time, default `last_7d` checked), auto-refresh checkbox
   - 10 `<section>` blocks, each with an h2 and a content `<div>` (id'd for re-render)
4. Inline `<script>` block at end of body — vanilla JS, no modules, no async/await imports

JS responsibilities (all inside ONE IIFE — no globals beyond a single `window.__TCP_DASH` debug handle):

a) **Token gate (JS-side ONLY — server-side gate is on stats.php)**: read `?s=` from `window.location.search` via `URLSearchParams`. If missing or empty, render an inline auth-required message in the body and STOP — do NOT fetch with empty token. Note in a comment that this is a documented design choice (not a bug): the data behind the dashboard is gated by stats.php's server-side token check; this client gate is a UX nicety.

b) **Initial fetch**: `fetch('/tcp-analytics/stats.php?s=' + encodeURIComponent(token))` then `.json()`. Failure modes:
   - Non-2xx → "Authentication required. Append `?s=YOUR_TOKEN` to the URL." with a hint link to verify the token works on stats.php directly
   - 2xx but malformed JSON → "Stats endpoint returned malformed data" + `<a href="/tcp-analytics/stats.php?s=...">view raw</a>`

c) **State**: a single module-scoped `let state = { json: null, currentWindow: 'last_7d', refreshTimer: null }`. Window selector and auto-refresh checkbox both manipulate this object.

d) **Render functions** (one per section — each takes `state.json` and the current window key, mutates the section's content div):
   1. `renderHeader()` — set `<time>` from `json.generated_at`
   2. `renderKPIs(window)` — 4 tiles: `total_pageviews`, `unique_sessions`, `identified_visits.distinct_identified_people`, `json.hot_leads.length` (top-level, identical across all windows)
   3. `renderHotLeads()` — table from `json.hot_leads` (top-level, NOT per-window): name, email, company, source_form badge, last_seen, score. Sort by score DESC, slice top 25. Highlight rows with `score >= 20` in green (CSS class). Pure-CSS hover tooltip using `title` attribute on the score cell containing the score_breakdown formatted as multi-line text (volume / high_intent×5 / medium_intent×2 / time_minutes / recency / diversity / -bot_penalty = total)
   4. `renderIdentifiedVisitors(window)` — table from `windows[window].identified_visits.top_visitors`: every entry. Color-coded source_form badge using inline-style or CSS classes:
      - `form-fill` / `contact` → blue (#1e40af bg, white text)
      - `email-click` → purple (#6b21a8 bg, white text)
      - `rag-study-guide` → teal (#0f766e bg, white text)
      - `fingerprint` → gray (#4b5563 bg, white text)
      - default → light gray (#9ca3af bg, white text)
      Show pageview count + last_seen_at.
   5. `renderTrafficSources(window)` — horizontal CSS bar chart from `windows[window].by_source`. Each row: source label + count + computed % of total + a `<div>` with `style="width: ${pct}%"`. No chart lib. Compute total from sum of `views` across array.
   6. `renderTopPages(window)` — ordered list from `windows[window].by_page`, top 15.
   7. `renderByCompany(window)` — table from `windows[window].by_company`: company_name / company_domain / company_type / views. Filter out rows where `company_domain` is null/empty. Above the table render a `<p>` note: "Currently mostly NULL — populates after Phase 5b token wiring (see quick task 312)."
   8. `renderByCountry(window)` — table from `windows[window].by_country`, top 10.
   9. `renderSparkline(window)` — INLINE SVG sparkline manually drawn from `windows[window].by_day` (up to 30 days). Width ~600, height ~80, viewBox-based for responsive scaling. Single `<path>` connecting points + small `<circle>` at each point. Linear scale on views axis. Sort by `day` ASC. NO chart library.
   10. `renderFingerprintStats(window)` — show `windows[window].identified_visits.fingerprint_only_identified` as count + `windows[window].identified_visits.distinct_identified_people` as count, side by side.

e) **Window selector**: each radio's `onchange` calls a `rerenderForWindow(newWindow)` function that calls renderers 2,4,5,6,7,8,9,10 with the new key. Renderers 1 (header) and 3 (hot_leads) do NOT re-run since they're not per-window. NO refetch fires on window change.

f) **Auto-refresh**: checkbox `onchange` clears any existing `state.refreshTimer` and, if checked, sets a fresh `setInterval(60000)` that calls `fetchAndRenderAll()`. Default unchecked.

g) **Single fetch entry point** `fetchAndRenderAll()` — fetch + parse + assign `state.json` + call all 10 renderers in order. Used by initial page load AND by auto-refresh tick.

CSS requirements:

- System font stack: `-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif`
- Responsive grid: KPI tiles in 4-col on desktop, collapse to 2-col under ~720px, 1-col under ~480px
- `@media (prefers-color-scheme: dark)` block: dark bg, light text
- Tables: 100% width, alternating row stripes, borderless except header bottom-border
- Source badge: small rounded `border-radius: 4px`, padding `2px 8px`, font-size 0.75em, font-weight 600
- Score-highlight class for hot leads >= 20: green background tint
- Bar chart: container `position: relative; height: 24px; background: #f3f4f6;` with inner `<div>` having `position: absolute; left: 0; top: 0; bottom: 0; width: ${pct}%; background: #3b82f6;`
- Sparkline SVG: `path { fill: none; stroke: currentColor; stroke-width: 2; } circle { fill: currentColor; }`
- DO NOT use Tailwind, Bootstrap, or any external CSS

**Step 2 — Local sanity check (BEFORE deploy)**

Open the file locally with a browser via `file://` URL. The token-gate will show the auth-required message (no `?s=` param) — this proves the gate logic works without network. Verify:
- Page renders with title
- Auth-required message visible
- No console errors (open dev tools)

If this fails, fix and re-test before deploy.

**Step 3 — Check .htaccess whitelist BEFORE deploy**

Per task 305-SUMMARY: `/tcp-analytics/.htaccess` has a `<FilesMatch "^(?!admin|collect|trap|stats).*\.php$"> Require all denied`. The regex is `.php$` — by inspection it ONLY denies `.php` files, so `.html` files should be allowed by default. BUT verify before assuming:

```bash
ssh -p 65002 -i ~/.ssh/id_ed25519 u350621741@147.93.101.51 \
  'cat /home/u350621741/domains/techcloudpro.com/public_html/tcp-analytics/.htaccess'
```

Inspect the output:
- If FilesMatch regex ends with `\.php$` (PHP-only deny) → `.html` is allowed by default. Proceed to Step 4 with no .htaccess change.
- If FilesMatch regex covers `.html` or `.*` (broader deny) → STOP and surface to user. The plan's expectation is PHP-only deny per 305-SUMMARY; if reality differs, ask before extending the whitelist regex (don't silently broaden access).
- If `.htaccess` doesn't exist → unexpected, STOP and ask.

If a fix IS needed: extend FilesMatch to allow `dashboard.html` specifically (NOT all `.html`). E.g. add `<Files "dashboard.html"> Require all granted </Files>` block. Backup first: `cp .htaccess .htaccess.bak.313`.

**Step 4 — Deploy via scp**

```bash
scp -P 65002 -i ~/.ssh/id_ed25519 \
  /Users/jeet/techcloudpro/public/tcp-analytics/dashboard.html \
  u350621741@147.93.101.51:/home/u350621741/domains/techcloudpro.com/public_html/tcp-analytics/dashboard.html
```

Confirm size on server matches local (sanity check):

```bash
LOCAL_SIZE=$(wc -c < /Users/jeet/techcloudpro/public/tcp-analytics/dashboard.html)
echo "Local: $LOCAL_SIZE"
ssh -p 65002 -i ~/.ssh/id_ed25519 u350621741@147.93.101.51 \
  'wc -c /home/u350621741/domains/techcloudpro.com/public_html/tcp-analytics/dashboard.html'
```

**Step 5 — Run all 6 verification batteries (capture VERBATIM output for SUMMARY)**

All curls use Safari UA (Cloudflare WAF rule).

```bash
UA='Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15'
```

**Battery 1 — dashboard.html reachable with token (200 + HTML)**

```bash
curl -sS -A "$UA" -o /tmp/313-b1.html -w "HTTP %{http_code} (%{size_download} bytes)\n" \
  "https://techcloudpro.com/tcp-analytics/dashboard.html?s=TcpSecureAdmin2026"
grep -c '<title>TCP Analytics</title>' /tmp/313-b1.html
```

Expected: HTTP 200, byte count > 10000 (or whatever local size was), grep returns 1.

**Battery 2 — dashboard.html WITHOUT token still reachable (200 — JS-side gate)**

```bash
curl -sS -A "$UA" -o /dev/null -w "HTTP %{http_code}\n" \
  "https://techcloudpro.com/tcp-analytics/dashboard.html"
```

Expected: HTTP 200. THIS IS BY DESIGN, NOT A SECURITY HOLE — document this clearly in SUMMARY: server-side gate is on stats.php (the data endpoint), this client gate is UX. Verify the served HTML still contains the auth-required logic.

**Battery 3 — stats.php auth gate REGRESSION (404/404/200)**

```bash
curl -sS -A "$UA" -o /dev/null -w "no token: %{http_code}\n" "https://techcloudpro.com/tcp-analytics/stats.php"
curl -sS -A "$UA" -o /dev/null -w "wrong:    %{http_code}\n" "https://techcloudpro.com/tcp-analytics/stats.php?s=WRONG"
curl -sS -A "$UA" -o /dev/null -w "correct:  %{http_code}\n" "https://techcloudpro.com/tcp-analytics/stats.php?s=TcpSecureAdmin2026"
```

Expected: 404 / 404 / 200.

**Battery 4 — JSON shape unchanged (regression)**

```bash
curl -sS -A "$UA" "https://techcloudpro.com/tcp-analytics/stats.php?s=TcpSecureAdmin2026" \
  | jq '{ has_hot_leads: (.hot_leads | type), hot_leads_count: (.hot_leads | length), windows_count: (.windows | length), per_window_has_by_company: ([.windows[].by_company] | map(. != null) | all), per_window_has_identified_visits: ([.windows[].identified_visits] | map(. != null) | all) }'
```

Expected: `has_hot_leads = "array"`, `hot_leads_count >= 1`, `windows_count = 4`, all nested booleans = true.

**Battery 5 — Diego Palmieri @ Mizkan visible in hot_leads**

```bash
curl -sS -A "$UA" "https://techcloudpro.com/tcp-analytics/stats.php?s=TcpSecureAdmin2026" \
  | jq '.hot_leads[] | select(.company | test("Mizkan"; "i")) | {name, email, company, score, source_form}'
```

Expected: returns Diego Palmieri @ Mizkan America Inc with non-zero score (per 311-SUMMARY, score = 11.5).

**Battery 6 — Live in-browser smoke (HUMAN-VERIFIABLE description, captured via curl HTML scrape)**

NOT a checkpoint — executor performs this with curl + grep against the served HTML to confirm structural readiness:

```bash
# Confirm all 10 sections are present in the served HTML by grepping for their h2 markers
curl -sS -A "$UA" "https://techcloudpro.com/tcp-analytics/dashboard.html?s=TcpSecureAdmin2026" \
  | grep -oE '<h2[^>]*>[^<]+</h2>' | head -15
```

Expected: returns at least 10 h2 elements covering: KPIs / Hot Leads / Identified Visitors / Traffic Sources / Top Pages / By Company / By Country / Daily Activity / Fingerprint Stats. (Header bar's h1 is separate.)

Also confirm critical JS hooks are present:

```bash
curl -sS -A "$UA" "https://techcloudpro.com/tcp-analytics/dashboard.html?s=TcpSecureAdmin2026" \
  | grep -cE 'fetch\(.*stats\.php|URLSearchParams|hot_leads|by_company|setInterval'
```

Expected: count >= 5 (one per critical JS hook).

If any battery fails, FIX and re-run all 6 from scratch. Capture verbatim output of all 6 (success cases) for the SUMMARY.

**Anti-hallucination guardrails**:
- DO NOT invent stats.php field names. If Step 0 jq output shows a field name different from this plan, USE THE LIVE NAME and document the deviation in SUMMARY.
- DO NOT use any chart library. SVG sparkline must be hand-written `<path>` + `<circle>`. Bars must be `<div style="width:Xpct">`.
- DO NOT load any external script or stylesheet. `<link>` and `<script src="...">` are forbidden. Inline only.
- DO NOT use template literals' tagged-template features beyond plain interpolation. Plain `${}` only.
- DO NOT add server-side auth at .htaccess level. The gate stays JS-side per design.
- DO NOT push to git remote. Local commit only per CLAUDE.md push policy.
  </action>
  <verify>
1. `wc -l /Users/jeet/techcloudpro/public/tcp-analytics/dashboard.html` returns ≥ 350 lines
2. `grep -c '<title>TCP Analytics</title>' /Users/jeet/techcloudpro/public/tcp-analytics/dashboard.html` returns 1
3. `grep -c 'fetch.*stats\.php' /Users/jeet/techcloudpro/public/tcp-analytics/dashboard.html` returns ≥ 1
4. `grep -c 'URLSearchParams' /Users/jeet/techcloudpro/public/tcp-analytics/dashboard.html` returns ≥ 1
5. `grep -c 'hot_leads' /Users/jeet/techcloudpro/public/tcp-analytics/dashboard.html` returns ≥ 2
6. `grep -c 'by_company' /Users/jeet/techcloudpro/public/tcp-analytics/dashboard.html` returns ≥ 2
7. `grep -c 'setInterval' /Users/jeet/techcloudpro/public/tcp-analytics/dashboard.html` returns ≥ 1
8. `grep -cE '<script src=|<link[^>]+href=' /Users/jeet/techcloudpro/public/tcp-analytics/dashboard.html` returns 0 (no external scripts/styles)
9. All 6 verification batteries pass with verbatim output captured
10. ssh remote file size matches local (`wc -c`) within ±5 bytes
  </verify>
  <done>
- /Users/jeet/techcloudpro/public/tcp-analytics/dashboard.html exists locally (~400-500 lines)
- Hostinger /tcp-analytics/dashboard.html serves with HTTP 200 + matching byte count
- Battery 1: HTML served with TCP Analytics title (200 OK + grep PASS)
- Battery 2: Dashboard reachable without token (200 + auth-required message in body)
- Battery 3: stats.php auth gate intact (404/404/200)
- Battery 4: JSON shape regression PASS (hot_leads array, 4 windows, all per-window blocks present)
- Battery 5: Diego Palmieri @ Mizkan visible in hot_leads with non-zero score
- Battery 6: All 10 section h2 markers + ≥5 critical JS hooks present in served HTML
- .htaccess unchanged (PHP-only deny doesn't affect .html) OR documented deviation if executor had to extend whitelist
- One atomic commit on techcloudpro repo: `feat(tcp-analytics): unified admin dashboard.html (quick task 313)`
- No git push to remote
  </done>
</task>

<task type="auto">
  <name>Task 2: Write 313-SUMMARY.md with verbatim curl evidence + render description + commit</name>
  <files>/Users/jeet/doordash-p2p/.planning/quick/313-phase-7-identity-stack-unified-admin-das/313-SUMMARY.md</files>
  <action>
Write `/Users/jeet/doordash-p2p/.planning/quick/313-phase-7-identity-stack-unified-admin-das/313-SUMMARY.md` following the project's SUMMARY pattern (mirror 311 + 312 structure).

Required sections:

1. **Frontmatter** — phase, plan, subsystem (`tcp-identity-stack`), tags `[tcp, html, admin, dashboard, vanilla-js, hostinger, identity, phase-7]`, dependency-graph (requires 305+311+312, provides "unified admin dashboard at /tcp-analytics/dashboard.html"), tech-stack `added: []`, key-files (created: dashboard.html + 313-SUMMARY.md), decisions (JS-side auth gate is design choice, no chart libs by constraint, single static file = zero deploy complexity, 4 hardcoded windows match stats.php windows), metrics

2. **One-liner** — single sentence describing what shipped

3. **What was built** — table: layer / what / file. Cover: HTML structure, CSS responsive layout + dark mode, 10 render functions, window selector + auto-refresh, JS-side token gate, deploy.

4. **Verification — verbatim live evidence** — paste all 6 batteries' verbatim output. Include:
   - Step 0 jq output (live JSON shape confirmation — was every field name as expected? document any deviation)
   - Battery 1: HTTP 200 + grep title found
   - Battery 2: HTTP 200 with documented design rationale paragraph (server-side gate is on stats.php, client gate is UX)
   - Battery 3: 404 / 404 / 200 (regression intact)
   - Battery 4: jq output showing hot_leads array + 4 windows + all blocks
   - Battery 5: Diego Palmieri row from hot_leads
   - Battery 6: 10 h2 markers + JS hooks count

5. **Render description (in lieu of screenshot)** — bullet list describing each of the 10 sections as they appear in browser, e.g.:
   - "Header: TCP Analytics title left-aligned, 4 radio buttons (today/7d/30d/all-time, default 7d), auto-refresh checkbox to right, last-updated timestamp from generated_at"
   - "KPI tiles: 4 large numbers in a 4-col grid — Total Pageviews / Unique Sessions / Distinct Identified People / Hot Leads Count"
   - "Hot Leads: table with N rows, Diego Palmieri @ Mizkan America Inc visible at row N, scores >= 20 (if any) highlighted green, score-breakdown tooltip on hover"
   - ...etc for all 10

6. **Files changed** — table

7. **Privacy stance** — "ZERO new privacy concerns. Pure rendering of already-collected, already-authorized data from Phases 1-6 (305-312). No new tracking, no new collection, no new external network calls. Same auth model as stats.php (server-side token check on the JSON endpoint, client-side UX gate on the dashboard HTML)." Also note the JS-side-only auth on dashboard.html as a documented design choice.

8. **Deviations from Plan** — Auto-fixed (any battery retries / .htaccess surprises) / Architectural changes / Out-of-scope deferred (the explicit non-goals: per-visitor drilldown, per-company drilldown, CSV export, date-range picker, advanced charts)

9. **Phase X follow-ups** — file the explicit non-goals as separate Phase X items, plus any new ones discovered during execution (e.g., dark-mode polish, mobile breakpoint adjustments)

10. **Rollback playbook** — Tier 1: scp empty placeholder over dashboard.html (or just delete the server file — pure read-only feature, no DB state to clean up). Tier 2: `git revert <commit>` + redeploy. No Tier 3 needed.

11. **CR ticket** — "Skipped — TCP infrastructure (Hostinger HTML), not the dollor.ai admin portal. Same precedent as 305-312."

12. **Authentication gates** — None (Hostinger SSH key already installed)

13. **Commit hashes** — techcloudpro SHA + dollor.ai SHA

14. **Live URL** — `https://techcloudpro.com/tcp-analytics/dashboard.html?s=TcpSecureAdmin2026` (browser UA required)

15. **Self-Check** — checkboxes verifying each `must_haves.truth` from frontmatter

16. **Self-Check: PASSED** — final line

After writing, commit on dollor.ai:
```bash
cd /Users/jeet/doordash-p2p
git add .planning/quick/313-phase-7-identity-stack-unified-admin-das/313-SUMMARY.md \
        .planning/quick/313-phase-7-identity-stack-unified-admin-das/313-PLAN.md
git commit -m "docs(quick-313): TCP identity-stack Phase 7 — unified admin dashboard.html

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

Do NOT push (per CLAUDE.md push policy).
  </action>
  <verify>
1. `test -f /Users/jeet/doordash-p2p/.planning/quick/313-phase-7-identity-stack-unified-admin-das/313-SUMMARY.md` returns 0
2. SUMMARY contains all 6 verbatim battery outputs
3. SUMMARY contains the 10-section render description
4. SUMMARY contains the JS-side auth design-choice paragraph (NOT flagged as security bug)
5. `cd /Users/jeet/doordash-p2p && git log --oneline -1 -- .planning/quick/313-phase-7-identity-stack-unified-admin-das/` shows the commit
6. `grep -c "Self-Check: PASSED" SUMMARY.md` returns 1
  </verify>
  <done>
- 313-SUMMARY.md written with verbatim curl evidence for all 6 batteries
- Render description covers all 10 sections
- JS-side auth flagged as design choice (not bug)
- Phase X follow-ups filed for explicit non-goals (drilldowns, CSV export, date-range picker, advanced charts)
- 1 atomic commit on dollor.ai
- No git push to remote
  </done>
</task>

</tasks>

<verification>
Phase-level checks (run after both tasks complete):

1. **File presence on disk**:
   - `test -f /Users/jeet/techcloudpro/public/tcp-analytics/dashboard.html`
   - `test -f /Users/jeet/doordash-p2p/.planning/quick/313-phase-7-identity-stack-unified-admin-das/313-SUMMARY.md`

2. **File presence on Hostinger server**:
   - `ssh -p 65002 -i ~/.ssh/id_ed25519 u350621741@147.93.101.51 'ls -la /home/u350621741/domains/techcloudpro.com/public_html/tcp-analytics/dashboard.html'` returns size > 10000 bytes

3. **All 6 verification batteries** pass and are documented verbatim in SUMMARY

4. **Goal-backward truths re-validated**:
   - With token → HTML loads with all 10 sections (Battery 1 + 6)
   - Without token → HTML loads + JS shows auth-required (Battery 2)
   - hot_leads visible (Battery 4 + 5, Diego Palmieri PASS)
   - by_company present in all 4 windows with NULL note (Battery 4 + Battery 6 grep for "Phase 5b")
   - stats.php auth regression intact (Battery 3)

5. **Two atomic commits**:
   - techcloudpro: `feat(tcp-analytics): unified admin dashboard.html`
   - dollor.ai: `docs(quick-313): TCP identity-stack Phase 7 — unified admin dashboard.html`

6. **No remote pushes** (per CLAUDE.md)
</verification>

<success_criteria>
- `https://techcloudpro.com/tcp-analytics/dashboard.html?s=TcpSecureAdmin2026` returns HTTP 200 with browser UA, ≥10000 bytes, contains `<title>TCP Analytics</title>`
- All 10 sections render from live stats.php JSON in a real browser (Battery 6 confirms structural readiness via HTML scrape)
- Window selector switches re-render KPIs + per-window sections from same fetched JSON (no extra fetch)
- Hot Leads table includes Diego Palmieri @ Mizkan America Inc with score 11.5 (or current real-time value)
- By Company section shows the "Currently mostly NULL — Phase 5b" note
- Auto-refresh checkbox toggles a 60s setInterval that calls fetchAndRenderAll()
- JS-side-only auth on dashboard.html documented as design choice (not security bug) — server-side gate stays on stats.php
- stats.php auth gate regression PASS (404/404/200)
- Zero new privacy concerns (pure rendering of already-collected data)
- Two atomic commits, no remote pushes
- 313-SUMMARY.md written with verbatim curl evidence for all 6 batteries + 10-section render description + Phase X follow-ups
</success_criteria>

<output>
After completion, both tasks produce:
- `/Users/jeet/techcloudpro/public/tcp-analytics/dashboard.html` (NEW, ~400-500 lines)
- Live deployment at `https://techcloudpro.com/tcp-analytics/dashboard.html?s=TcpSecureAdmin2026`
- `/Users/jeet/doordash-p2p/.planning/quick/313-phase-7-identity-stack-unified-admin-das/313-SUMMARY.md` (NEW)
- 1 atomic commit on `techcloudpro` repo (feat: dashboard.html)
- 1 atomic commit on `dollor.ai` repo (docs: SUMMARY + PLAN)
</output>
