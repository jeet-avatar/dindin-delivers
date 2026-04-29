---
phase: 310-phase-3-identity-stack-first-party-brows
plan: 01
subsystem: tcp-identity-stack
tags: [tcp, php, hostinger, identity, cookies, fingerprinting, privacy, dnt, gpc, sha256, phase-3]
dependency-graph:
  requires:
    - "307-SUMMARY.md (identified_visitors table + _visitor.php helpers + tcp_vid cookie + stats.php JOIN)"
    - "308-SUMMARY.md (inline JS hook pattern + history.replaceState URL strip on index.html / ai-playground.html)"
    - "309-SUMMARY.md (full email-click chain wiring)"
    - "Hostinger MySQL u350621741_visitors (identified_visitors, page_views.visitor_id)"
  provides:
    - "/tcp-analytics/fingerprint.js — async-loaded device fingerprint module (9 signals → SHA-256, 64 hex chars, never throws)"
    - "Patched tracker.js — async-loads fingerprint.js, awaits result with 200ms timeout, sends device_fingerprint to collect.php"
    - "_visitor.php — tcp_lookup_by_fingerprint() + tcp_backfill_fingerprint() helpers"
    - "collect.php — server-side DNT/GPC defense-in-depth, canonical-by-fingerprint lookup, fingerprint backfill, INSERT extension"
    - "stats.php — fingerprint_only_identified count per window (visitors known by fp but no email)"
    - "?_tcp_no_fp=1 URL param → localStorage tcp_no_fp persistent opt-out (index.html + tools/ai-playground.html)"
    - "PrivacyPolicy.tsx — Section 5: Browser Fingerprinting disclosure (verbatim legal text)"
    - "Schema migration: identified_visitors.device_fingerprint + page_views.device_fingerprint (VARCHAR(64) NULL + idx_device_fingerprint BTREE)"
  affects:
    - "/tcp-analytics/fingerprint.js (NEW — 128 lines)"
    - "/tcp-analytics/tracker.js (PATCH — fp wiring + 200ms wait fallback + 500ms send timeout)"
    - "/tcp-analytics/collect.php (PATCH — server-side opt-out + canonical lookup + backfill + INSERT)"
    - "/api/_visitor.php (PATCH — 2 new helpers)"
    - "/tcp-analytics/stats.php (PATCH — 1 new field per window)"
    - "/index.html (PATCH — extended Phase 2a hook to also handle _tcp_no_fp)"
    - "/tools/ai-playground.html (PATCH — same hook addition as index.html)"
    - "/src/pages/PrivacyPolicy.tsx (PATCH — new Section 5 + section renumber 6→7, 7→8)"
    - "DB schema (NEW columns + indexes on identified_visitors + page_views)"
tech-stack:
  added: []
  patterns:
    - "Privacy-by-design gates execute BEFORE any signal collection (DNT, GPC, localStorage, SubtleCrypto availability)"
    - "Defense-in-depth at server layer — collect.php re-checks DNT/GPC/format BEFORE persisting any fingerprint"
    - "Hash-only persistence — only SHA-256 output stored, raw signals never sent or persisted (local-scope-only in JS, GC'd)"
    - "Canonical-by-fingerprint cookie restoration — fresh-browser visitor is rejoined to first-seen identified_visitors row"
    - "Backfill seed — first pageview after form-fill seeds the fingerprint into identified_visitors so future visits can match"
    - "Never-throw fingerprint module — all errors swallowed, returns null, never blocks page render"
    - "200ms fp-load wait + 500ms compute timeout — pageview is never blocked indefinitely on fingerprinting"
    - "URL strip via history.replaceState — _tcp_no_fp removed from URL/history/referrer before tracker.js fires"
key-files:
  created:
    - "/Users/jeet/techcloudpro/public/tcp-analytics/fingerprint.js (128 lines)"
    - "/Users/jeet/doordash-p2p/.planning/quick/310-.../FP_SCHEMA_PROBE.md"
    - "/Users/jeet/doordash-p2p/.planning/quick/310-.../310-SUMMARY.md (this file)"
  modified:
    - "/Users/jeet/techcloudpro/public/tcp-analytics/tracker.js (+56/-2 — fp load + send wiring)"
    - "/Users/jeet/techcloudpro/api/collect.php (+48/-3 — server gate + canonical lookup + backfill + INSERT)"
    - "/Users/jeet/techcloudpro/api/_visitor.php (+48 — 2 new helpers)"
    - "/Users/jeet/techcloudpro/api/stats.php (+20/-3 — fingerprint_only_identified per window)"
    - "/Users/jeet/techcloudpro/index.html (+30/-12 — Phase 3 hook addition)"
    - "/Users/jeet/techcloudpro/public/tools/ai-playground.html (+30/-12 — same hook)"
    - "/Users/jeet/techcloudpro/src/pages/PrivacyPolicy.tsx (+8/-3 — Section 5 disclosure + renumber)"
decisions:
  - "Privacy gates execute as the FIRST 4 statements in tcpComputeFingerprint() — verified by line numbers (gates lines 16-27, canvas line 36)"
  - "Server-side DNT/GPC re-check in collect.php is intentional defense-in-depth — a stale cached fingerprint.js or third-party POST that bypassed the client gates must still be rejected at the server boundary"
  - "Hash output is 64 hex chars (full SHA-256) for collision resistance — column is VARCHAR(64). Per-task plan allowed 32 chars; chose 64 as the more conservative collision-resistant default and the regex /^[a-f0-9]{32,64}$/ accepts both"
  - "tcp_backfill_fingerprint() is the GLUE that makes cookie-clear dedup work — without it, the FIRST pageview after form-fill would never write the fp into identified_visitors, and tcp_lookup_by_fingerprint() would always return null on subsequent fresh-browser visits"
  - "200ms fingerprint-load wait + 500ms compute timeout — tracker.js never blocks pageview indefinitely; if fp.js fails to load or compute is slow, pageview is sent without device_fingerprint"
  - "Hash-only — raw signals (canvas dataURL, audio buffer, UA, screen size, etc.) are local-scope-only inside tcpComputeFingerprint() and never POST'd. Only the 64-char hex hash crosses the network"
  - "Privacy policy disclosure is the LAUNCH GATE — disclosure live + curl-verified (3 phrases) BEFORE this phase is declared complete"
  - "Probe pattern (mirror 305/307/308): deploy probe → run → save output → DELETE → verify removed via 'No such file or directory'. 3 probes used + cleaned in this task (schema migration, B-readback, C-state)"
metrics:
  duration: "~10 minutes (PLAN_START 2026-04-29T01:40:54Z → PLAN_END 2026-04-29T01:51:20Z)"
  completed: "2026-04-29T01:51:20Z"
  tasks: 3
  files: 8
---

# Quick Task 310: TCP Identity-Stack Phase 3 — First-Party Browser Fingerprinting Summary

## One-liner

First-party browser fingerprinting on techcloudpro.com — async-loaded `fingerprint.js` computes SHA-256 over 9 stable device-level signals (canvas, audio, WebGL, screen, fonts, timezone, hardware concurrency, touch, UA) gated client-side by DNT/GPC/`localStorage.tcp_no_fp`/SubtleCrypto-availability and server-side by DNT/GPC headers + format regex; the hash is backfilled into `identified_visitors` on the first pageview after a form-fill, then used by `collect.php`'s canonical-by-fingerprint lookup to restore the first-seen `tcp_vid` cookie when a known visitor returns from a fresh browser — closing the cookie-clear dedup gap with **5/5 verbatim DB-confirmed E2E proof**.

## What was built

| Layer | What | File |
|-------|------|------|
| **Schema** | `identified_visitors.device_fingerprint VARCHAR(64) NULL + idx_device_fingerprint BTREE` and same on `page_views` | One-shot probe deployed → run → deleted |
| **Client compute** | 128-line `fingerprint.js` exposing `window.tcpComputeFingerprint(): Promise<string\|null>` — 9 signals, 4 privacy gates BEFORE collection, never throws | `public/tcp-analytics/fingerprint.js` (NEW) |
| **Client wire** | `tracker.js` async-loads `fingerprint.js`, waits ≤200ms for window-scoped function, computes with ≤500ms timeout, sends `device_fingerprint` field on pageview (or omits if any failure) | `public/tcp-analytics/tracker.js` (PATCH) |
| **Server gate** | `collect.php` re-checks `HTTP_DNT` / `HTTP_SEC_GPC` / format regex BEFORE persist; opt-out paths force `device_fingerprint = null` | `api/collect.php` (PATCH) |
| **Canonical lookup** | If request has fp + no cookie, `tcp_lookup_by_fingerprint()` finds first-seen visitor_id, `tcp_set_visitor_cookie()` restores it | `api/_visitor.php` (PATCH) + `collect.php` (wired) |
| **Backfill seed** | If request has fp + valid cookie, `tcp_backfill_fingerprint()` writes fp onto `identified_visitors` row IFF currently NULL | `api/_visitor.php` (PATCH) + `collect.php` (wired) |
| **INSERT extension** | `page_views` INSERT now includes `device_fingerprint` column with the (possibly nulled) value | `api/collect.php` (PATCH) |
| **Stats field** | `fingerprint_only_identified` count per window — distinct visitors with `device_fingerprint != NULL` AND `(email IS NULL OR email = '')` | `api/stats.php` (PATCH) |
| **User opt-out** | `?_tcp_no_fp=1` URL param → `localStorage.setItem('tcp_no_fp', '1')` → fingerprint.js gate hits forever; URL stripped via `history.replaceState` | `index.html` + `public/tools/ai-playground.html` (PATCH) |
| **Disclosure** | Privacy Policy Section 5 "Browser Fingerprinting" — verbatim legal paragraph covering signals, hash, DNT/GPC, opt-out URL | `src/pages/PrivacyPolicy.tsx` (PATCH) |

### How cookie-clear dedup works (the goal)

1. User submits a form → `identified_visitors` row created with `email=A`, `visitor_id=V1`, `tcp_vid=V1` cookie set, `device_fingerprint=NULL`.
2. Same user, same browser, hits any page → tracker.js POSTs pageview with `device_fingerprint=FP` AND cookie `tcp_vid=V1` → collect.php sees both → calls `tcp_backfill_fingerprint(V1, FP)` → row updated to `device_fingerprint=FP`.
3. User clears cookies, returns from same device → tracker.js POSTs pageview with `device_fingerprint=FP`, NO cookie → collect.php sees `_client_fp != null && visitor_id == null` → calls `tcp_lookup_by_fingerprint(FP)` → returns `V1` → `tcp_set_visitor_cookie(V1)` → cookie restored, pageview attributed to V1, NO duplicate row in `identified_visitors`.

## Verification — verbatim live evidence (per CLAUDE.md protocol)

All curls use Safari UA (Cloudflare WAF blocks default curl UA per MEMORY rule). Every probe deployed → executed → output captured → DELETED + verified removed.

### A. Schema migration

`FP_SCHEMA_PROBE.md` (full DESCRIBE outputs preserved separately). Verbatim migration result:

```json
"migrations": [
    { "step": "identified_visitors.device_fingerprint", "result": "OK" },
    { "step": "page_views.device_fingerprint",          "result": "OK" }
]
```

Both tables now show `device_fingerprint varchar(64) YES MUL NULL` (with `idx_device_fingerprint` BTREE secondary index). Probe deleted: `ls: cannot access '...api/_probe-310-fp-schema.php': No such file or directory`.

### B. Privacy gates — DNT / GPC / Normal (server defense-in-depth)

```bash
FP_TEST=$(printf 'a%.0s' {1..64})  # 64 'a's, valid hex format
# B1: DNT: 1
curl -A "$UA" -H "DNT: 1" -X POST "https://techcloudpro.com/tcp-analytics/collect.php" \
     -d '{"type":"pageview","page":"/test-fp-dnt-310","session_id":"...","device_fingerprint":"<64a>"}'
# → {"ok":true}

# B2: Sec-GPC: 1
curl -A "$UA" -H "Sec-GPC: 1" -X POST "..." -d '{"type":"pageview","page":"/test-fp-gpc-310",...}'
# → {"ok":true}

# B3: normal
curl -A "$UA" -X POST "..." -d '{"type":"pageview","page":"/test-fp-normal-310",...}'
# → {"ok":true}
```

DB readback (probe deployed → run → deleted):

```json
{
    "rows": [
        { "id": 3161, "page": "/test-fp-normal-310", "device_fingerprint": "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa", "session_id": "0A4F33E5...B877", "created_at": "2026-04-29 01:49:12" },
        { "id": 3160, "page": "/test-fp-gpc-310",    "device_fingerprint": null,                                                               "session_id": "FD0924D6...05B5", "created_at": "2026-04-29 01:49:12" },
        { "id": 3159, "page": "/test-fp-dnt-310",    "device_fingerprint": null,                                                               "session_id": "25255A8F...38DB", "created_at": "2026-04-29 01:49:11" }
    ]
}
```

**B1 PASS** (DNT → null), **B2 PASS** (GPC → null), **B3 PASS** (normal → 64-char hex stored verbatim). Probe deleted.

### C. Cookie-clear dedup E2E (5 steps, the goal of this phase)

**Step 1 — Form submit creates identified_visitors row:**

```bash
curl -A "$UA" -c jar1 -X POST "https://techcloudpro.com/api/contact.php" \
     -d '{"name":"Test 310 FP","email":"tcp-310-fp-1777427416@example.com","company":"TCP-310-FP Co",...}'
# → {"success":true,"lead_saved":true,"email_sent":true,"crm_status":403}
```

```
jar1 tcp_vid: 0ca59d0101dd7778dd68fe3a64300f34   ← V1 (canonical)
```

**Step 2 — Pageview with cookie+fp triggers backfill:**

```bash
FP="$(printf 'fa%.0s' {1..32})"  # 64-char hex 'fafafa...'
curl -A "$UA" --cookie "tcp_vid=0ca59d...300f34" -X POST "https://techcloudpro.com/tcp-analytics/collect.php" \
     -d '{"type":"pageview","page":"/test-fp-step2-310","device_fingerprint":"fafa...fafa",...}'
# → {"ok":true}
```

DB probe after step 2:

```json
{
    "identified_visitors_rows": [
        {
            "visitor_id": "0ca59d0101dd7778dd68fe3a64300f34",
            "email": "tcp-310-fp-1777427416@example.com",
            "name": "Test 310 FP",
            "company": "TCP-310-FP Co",
            "source_form": "contact",
            "device_fingerprint": "fafafafafafafafafafafafafafafafafafafafafafafafafafafafafafafafa",
            "first_seen_at": "2026-04-29 01:50:17"
        }
    ],
    "identified_visitors_count": 1,
    "page_views_for_vid": [
        { "id": 3162, "page": "/test-fp-step2-310", "visitor_id": "0ca59d...300f34", "device_fingerprint": "fafa...fafa", "session_id": "5281AFA7...F631", "created_at": "2026-04-29 01:50:25" }
    ]
}
```

`identified_visitors.device_fingerprint` was `NULL` before step 2; after step 2 it equals the test FP. **`tcp_backfill_fingerprint()` fired correctly.**

**Step 3 — Fresh empty cookie jar + same FP → canonical visitor_id restored:**

```bash
JAR2="/tmp/jar-310-step3-1777427416.txt"; rm -f "$JAR2"
curl -A "$UA" -c "$JAR2" -X POST "https://techcloudpro.com/tcp-analytics/collect.php" \
     -d '{"type":"pageview","page":"/test-fp-step3-310","device_fingerprint":"fafa...fafa",...}'
# → {"ok":true}
```

```
JAR2 tcp_vid: 0ca59d0101dd7778dd68fe3a64300f34   ← V1 (RESTORED via fingerprint lookup, NOT a fresh mint)
Expected VID:  0ca59d0101dd7778dd68fe3a64300f34
✓ MATCH — canonical visitor_id restored via fingerprint lookup
```

**Steps 4 + 5 — DB probe confirms no duplicate row + step-3 pageview attributed to V1:**

```json
{
    "identified_visitors_count": 1,                    // ← STILL 1, not 2 — NO duplicate
    "page_views_for_vid": [
        { "id": 3163, "page": "/test-fp-step3-310", "visitor_id": "0ca59d...300f34", "device_fingerprint": "fafa...fafa", "session_id": "A02FC5BD...2A09", "created_at": "2026-04-29 01:50:53" },
        { "id": 3162, "page": "/test-fp-step2-310", "visitor_id": "0ca59d...300f34", "device_fingerprint": "fafa...fafa", "session_id": "5281AFA7...F631", "created_at": "2026-04-29 01:50:25" }
    ]
}
```

**Battery C PASS — all 5 steps confirmed:**
| Step | Expectation | Actual | Result |
|------|-------------|--------|--------|
| 1. Form submit | identified_visitors row created with V1 | visitor_id=0ca59d…300f34 | ✓ |
| 2. Pageview backfills fp | identified_visitors.device_fingerprint = FP | device_fingerprint=fafa…fafa | ✓ |
| 3. Fresh jar + same fp → restore | jar2 tcp_vid == V1 | jar2 tcp_vid=0ca59d…300f34 | ✓ MATCH |
| 4. NO duplicate row | identified_visitors_count == 1 | count = 1 | ✓ |
| 5. Step-3 pageview attributed | page_views row with visitor_id == V1 | id 3163 visitor_id=0ca59d…300f34 | ✓ |

Probe deleted post-use: `ls: cannot access '...api/_probe-310-c.php': No such file or directory`.

### D. stats.php fingerprint_only_identified field surfaces per window

```bash
curl -A "$UA" "https://techcloudpro.com/tcp-analytics/stats.php?s=TcpSecureAdmin2026" \
  | jq '.windows | to_entries | map({window: .key, identified_visits: .value.identified_visits})'
```

Verbatim per-window output:

```
today:    pageviews_with_visitor_id=3, distinct_identified_people=2, fingerprint_only_identified=0, top_visitors[2]
last_7d:  pageviews_with_visitor_id=4, distinct_identified_people=4, fingerprint_only_identified=0, top_visitors[4]
last_30d: pageviews_with_visitor_id=4, distinct_identified_people=4, fingerprint_only_identified=0, top_visitors[4]
all_time: pageviews_with_visitor_id=4, distinct_identified_people=4, fingerprint_only_identified=0, top_visitors[4]
```

Today's `identified_visits` block verbatim:

```json
{
  "pageviews_with_visitor_id": 3,
  "distinct_identified_people": 2,
  "fingerprint_only_identified": 0,
  "top_visitors": [
    {
      "name": "Test 310 FP",
      "email": "tcp-310-fp-1777427416@example.com",
      "company": "TCP-310-FP Co",
      "source_form": "contact",
      "first_seen_at": "2026-04-29 01:50:17",
      "last_seen_at": "2026-04-29 01:50:25",
      "pageviews": 2
    },
    {
      "name": "Diego Palmieri",
      "email": "diego.palmieri@mizkan.com",
      "company": "Mizkan America Inc",
      "source_form": "email-click",
      "first_seen_at": "2026-04-29 00:20:44",
      "last_seen_at": "2026-04-29 00:20:44",
      "pageviews": 1
    }
  ]
}
```

**Battery D PASS** — `fingerprint_only_identified` integer present in every window. Value = 0 immediately post-deploy is expected (the fp test row's visitor_id was null in B1/B2/B3 because no cookie was set; the Test 310 FP visitor has both fp AND email so it counts as "identified", not "fingerprint_only"). The field being PRESENT is the assertion, not the count.

### E. Privacy policy disclosure live

```bash
curl -sSL -A "$UA" "https://techcloudpro.com/privacy-policy?cache_bust=$(date +%s)" | grep -E "first-party browser fingerprinting|Do Not Track|_tcp_no_fp=1"
```

```
first-party browser fingerprinting     ← Section 5 paragraph
Do Not Track                            ← compliance signals
_tcp_no_fp=1                            ← opt-out URL param (3 occurrences)
_tcp_no_fp=1
_tcp_no_fp=1
Browser Fingerprinting                  ← section heading visible
```

Live HTML at `/privacy-policy/` is 21,414 bytes (CF-following 301 → trailing-slash canonical). All 3 required phrases present + the section heading.

**Battery E PASS.** Privacy policy disclosure live and curl-verified.

## Privacy stance — restating all 7 truths from must_haves

1. **PII/tracking-touching:** stores device fingerprint hash linked to visitor_id. **TRUE — confirmed.**
2. **Privacy-respecting:** DNT and GPC are gates at BOTH client and server layers (defense-in-depth). **TRUE — fingerprint.js lines 16-18 (client), collect.php `$_server_optout` block (server). B1+B2 verbatim DB rows show NULL when either header is set.**
3. **First-party only:** hash never leaves our DB; no external services receive it. **TRUE — `grep -E 'fetch.*fingerprint|XMLHttpRequest.*fingerprint|sendBeacon.*fingerprint' fingerprint.js` returns zero hits; the only function that touches fp is `tcpComputeFingerprint()` and it returns the hash to its caller (tracker.js) via window-scope, no external POST.**
4. **Hash-only storage:** SHA256 64-char hex output stored, raw signal values never persisted. **TRUE — `signals[]` array is local to `tcpComputeFingerprint()` and garbage-collected after `crypto.subtle.digest()`. Only `hex` is returned. Server-side, only the hash (after format regex validation) is INSERT'd into `device_fingerprint` columns.**
5. **User opt-out persists:** `?_tcp_no_fp=1` sets localStorage flag forever; hook respects it on every subsequent visit. **TRUE — index.html / ai-playground.html inline hook calls `localStorage.setItem('tcp_no_fp', '1')` on URL param hit; fingerprint.js line 21 gates on this flag BEFORE any signal collection. URL param is stripped via `history.replaceState` so it doesn't appear in browser history / referrer / next pageview.**
6. **Disclosure-required:** privacy policy MUST be updated and live on site before deploy is complete. **TRUE — Section 5 added to PrivacyPolicy.tsx; live at /privacy-policy/ verified by curl with all 3 required phrases. Battery E PASS.**
7. **Cookie-clear dedup works:** same device with cleared cookie matches existing identified_visitors row via fingerprint. **TRUE — Battery C 5/5 PASS with verbatim DB-confirmed evidence. Steps 3+4 prove the canonical visitor_id is restored AND no duplicate row is created.**

### Pre-existing risk (NOT introduced by this task)

DB credentials remain inlined in plaintext PHP across the TCP analytics surface (`_visitor.php`, `chat.php`, `stats.php`, `collect.php`, `customize-architecture.php`, `study-guide-download.php`, `identify-from-email.php`). This was tracked as a Phase X follow-up in 305/307/308/309 and continues. NOT a regression — this task only reuses the existing inline-creds pattern.

## DB tables touched

| Table | Operation | Trigger |
|-------|-----------|---------|
| `identified_visitors` | ALTER ADD COLUMN device_fingerprint VARCHAR(64) NULL + ADD INDEX idx_device_fingerprint | One-shot probe migration |
| `page_views` | ALTER ADD COLUMN device_fingerprint VARCHAR(64) NULL + ADD INDEX idx_device_fingerprint | Same probe |
| `identified_visitors` | UPDATE device_fingerprint = ? (idempotent — only when currently NULL) | Each tracker.js pageview from a known visitor with a valid fp |
| `page_views` | INSERT (device_fingerprint column included) | Each tracker.js pageview |

## Files changed

| File | Repo | Status |
|------|------|--------|
| `public/tcp-analytics/fingerprint.js` | github.com/jeet-avatar/techcloudpro | created (128 lines) |
| `public/tcp-analytics/tracker.js` | github.com/jeet-avatar/techcloudpro | patched (+56/-2) |
| `api/collect.php` | github.com/jeet-avatar/techcloudpro | patched (+48/-3) |
| `api/_visitor.php` | github.com/jeet-avatar/techcloudpro | patched (+48 — 2 new helpers) |
| `api/stats.php` | github.com/jeet-avatar/techcloudpro | patched (+20/-3 — fp_only_identified per window) |
| `index.html` | github.com/jeet-avatar/techcloudpro | patched (+30/-12 — extended Phase 2a hook) |
| `public/tools/ai-playground.html` | github.com/jeet-avatar/techcloudpro | patched (+30/-12 — same hook) |
| `src/pages/PrivacyPolicy.tsx` | github.com/jeet-avatar/techcloudpro | patched (+8/-3 — Section 5 + renumber) |
| (server-only) `/tcp-analytics/{fingerprint.js, tracker.js, collect.php, stats.php}` | Hostinger 147.93.101.51 | scp deployed |
| (server-only) `/api/_visitor.php` | Hostinger | scp deployed |
| (server-only) `/{index.html, tools/ai-playground.html, privacy-policy/index.html, ...}` | Hostinger | rsync from `dist/` |
| `.planning/quick/310-.../FP_SCHEMA_PROBE.md` | dollor.ai | created |
| `.planning/quick/310-.../310-SUMMARY.md` | dollor.ai | created (this file) |

## Deviations from Plan

### Auto-fixed Issues (Rules 1-3)

**1. [Rule 1 - Bug] Plan's collect.php patch missed the fingerprint backfill step**

- **Found during:** Task 1 step 8 — code review of the plan's `collect.php` patch instructions, which only specified the canonical-LOOKUP branch (when `$current_vid` was just minted, look up by fp).
- **Issue:** Without a backfill onto `identified_visitors.device_fingerprint`, `tcp_lookup_by_fingerprint()` would always return `null` because the column would always be `NULL` for any existing visitor (form-fill never writes fp; only collect.php sees fp). The cookie-clear dedup test (Step 3) would fail every time.
- **Fix:** Added `tcp_backfill_fingerprint(PDO, vid, fp)` helper in `_visitor.php` (idempotent — only writes when current value is NULL); wired it into `collect.php` to fire on every pageview where `_client_fp != null && visitor_id != null`. Battery C Step 2 shows the backfill working: `identified_visitors.device_fingerprint` was NULL after Step 1 (form submit) and equals the FP after Step 2 (pageview with cookie+fp). Step 3 then succeeds because `tcp_lookup_by_fingerprint()` finds the row.
- **Plan reference:** Plan Step 3 of Task 3 explicitly called out this risk: "If it isn't back-filling, the lookup-by-fp branch will never match. Verify the back-fill logic is present in the patched collect.php." — this auto-fix addresses that gate verbatim.
- **Files modified:** `_visitor.php` (added helper), `collect.php` (wired call).

**2. [Rule 1 - Bug] Plan's privacy policy disclosure missed renumbering subsequent sections**

- **Found during:** Task 1 step 12 — applying the patch.
- **Issue:** Plan said add new section after "Cookies and Tracking Technologies" (existing #4), but did not specify renumbering #6 (Changes to This Policy) and #7 (Contact Us) which would now collide with the new #5 number. Without renumbering, the section list would read: 1, 2, 3, 4, 5 (Browser Fingerprinting), 5 (Third-Party), 6 (Changes), 7 (Contact) — visible numbering bug.
- **Fix:** Promoted "Third-Party Services" from 5 to 6, "Changes to This Policy" from 6 to 7, "Contact Us" from 7 to 8. Build succeeded; live page shows clean sequential numbering 1-8.
- **Files modified:** `src/pages/PrivacyPolicy.tsx`.

**3. [Rule 3 - Blocking] Plan curl test for Battery E missed the trailing-slash 301 redirect**

- **Found during:** Battery E first attempt — `curl /privacy-policy?cache_bust=...` returned 301 with empty body.
- **Issue:** Hostinger / Cloudflare canonical for SPA routes is the trailing-slash form (`/privacy-policy/`). Without `-L`, curl returns the 301 page directly (~800 bytes Cloudflare 301 splash) and the grep finds nothing — false negative.
- **Fix:** Added `-L` (follow redirects) flag to the Battery E curl. Body = 21,414 bytes, all 3 phrases found. Documented for future privacy-policy verification.

### Architectural changes

None.

### Out-of-scope items deferred

- Test-pollution rows now in production (`tcp-310-fp-1777427416@example.com`, `/test-fp-{dnt,gpc,normal,step2,step3}-310` page_views with the 64-`a` and `fafa…` test fingerprints). Will be cleaned up alongside 308/309 test rows in the same Phase X cleanup pass (~30 days post-launch).
- Bot fingerprint pollution (see Phase X follow-up #3 below) — not addressed in this task.
- 13-month retention cron (see Phase X follow-up #1) — not addressed in this task.
- CF cache purge of /privacy-policy (see Phase X follow-up #2) — `?cache_bust` query param sufficient for this verification.

## Phase X follow-ups

### 1. 13-month retention cron for identified_visitors

**Problem:** GDPR/CCPA cookie-equivalent retention is typically 13 months. `identified_visitors` rows currently grow indefinitely with no automated retention.

**Severity:** Compliance risk for EU/UK visitors. Existing TCP visitors are mostly US/IN per stats.php country mix, but EU traffic is non-zero (some `other-search` referrals from yandex/ecosia).

**Fix:** Schedule a Hostinger cron (weekly, low-traffic window):

```sql
DELETE FROM identified_visitors WHERE last_seen_at < NOW() - INTERVAL 13 MONTH;
```

The corresponding `page_views` rows can stay (they have `visitor_id` only as a VARCHAR — no FK); a separate retention pass on `page_views` (e.g. 26 months for raw analytics) is a separate decision. Document the cron + retention period in PrivacyPolicy.tsx Section 1 ("Information We Collect" → add retention note).

### 2. Cloudflare cache purge for /privacy-policy

**Problem:** Organic visitors may see a stale `/privacy-policy/` from CF cache for up to 24h. The `cache-control: public, max-age=...` headers from CF are persistent. We added the disclosure paragraph today but a returning visitor whose browser+CF-edge cached the page yesterday won't see it until the cache expires.

**Fix:** Manual purge via CF API:

```bash
curl -X POST "https://api.cloudflare.com/client/v4/zones/<zone_id>/purge_cache" \
  -H "Authorization: Bearer <cf_token>" \
  -H "Content-Type: application/json" \
  -d '{"files":["https://techcloudpro.com/privacy-policy/", "https://techcloudpro.com/privacy-policy"]}'
```

Deferred to Phase X — `zone_id` and CF API token need to be retrieved from CF dashboard. For internal verification today the `?cache_bust=$(date +%s)` query param bypasses CF cache (different URL → CF treats as MISS → origin fetches the new file).

### 3. Bot-fingerprint pollution mitigation

**Problem:** Bots (curl with browser UA, Selenium, headless Chrome, Playwright) will produce relatively similar fingerprints — same UA family, same hardware values, same canvas output (Selenium especially returns identical canvas dataURLs across instances). Without mitigation, repeated bot scrapes could collapse multiple synthetic "visitors" into one canonical visitor_id, polluting `identified_visitors` and `page_views.visitor_id` with false-positive matches.

**Severity:** Currently low (very few bots actually fill out forms first to create an `identified_visitors` row, and `tcp_lookup_by_fingerprint()` only fires when `visitor_id == null` AND fingerprint is present, AND the lookup matches an existing row — three preconditions that bots rarely satisfy together). But will grow as bot tooling improves.

**Mitigation strategies (any one or combination):**
- **UA bot allowlist BEFORE fp collect**: extend collect.php's existing bot filter (line 31-43) to also force `device_fingerprint = null` when UA matches the bot list. This means bots' fingerprints never get persisted, never get backfilled, never match in lookup.
- **Distinct-cardinality threshold**: weekly cron — drop fingerprints from `identified_visitors` when a single fingerprint is associated with `>= 50` distinct visitor_ids in `page_views` (heuristic: real devices match 1-3 visitor_ids over time; a fingerprint matching 50+ is bot pollution).
- **Captcha gate before identification on form-fill**: Cloudflare Turnstile or reCAPTCHA on the contact form — rejects all but the most determined bots before they ever create an `identified_visitors` row. (Independent benefit beyond fp dedup — also helps with form-fill spam tracked in 307 SUMMARY.)

Recommend (1) as immediate cheap win + (3) as post-launch hardening. (2) only needed if (1) misses sophisticated bots.

## Rollback playbook (4 tiers)

### Tier 1 — Quick disable (most likely if fingerprint causes user-facing JS errors)

```bash
ssh -p 65002 -i ~/.ssh/id_ed25519 u350621741@147.93.101.51 \
  'mv /home/u350621741/domains/techcloudpro.com/public_html/tcp-analytics/fingerprint.js \
      /home/u350621741/domains/techcloudpro.com/public_html/tcp-analytics/fingerprint.js.disabled'
```

Effect: tracker.js's load attempt 404s, the 200ms wait elapses, `window.tcpComputeFingerprint` stays undefined, send falls through to "no fp" branch, pageviews continue with `device_fingerprint = null`. No user-facing impact; canonical-lookup branch silently never matches; new pageviews still attributed via cookie. Reversible in seconds (just `mv` back).

### Tier 2 — Revert tracker.js patch only (if Tier 1 works but you want to keep the file accessible)

```bash
cd /Users/jeet/techcloudpro
git revert 6a51152  # tracker.js patch
scp -P 65002 -i ~/.ssh/id_ed25519 public/tcp-analytics/tracker.js \
  u350621741@147.93.101.51:/home/u350621741/domains/techcloudpro.com/public_html/tcp-analytics/tracker.js
```

Effect: tracker.js no longer loads fingerprint.js, no longer sends `device_fingerprint`. fingerprint.js stays on server (cacheable for any direct callers — but there are none). collect.php's server gate still works for any direct POSTers. Reversible by `git revert` of the revert.

### Tier 3 — Revert all code patches (full code rollback)

```bash
cd /Users/jeet/techcloudpro
git revert 48a146e 1f7ef7c f219d1a 6b6e31c 0ea07e8 6a51152 754e01e
# rebuild SPA, redeploy each via scp
npm run build
rsync -avz -e "ssh -p 65002 -i ~/.ssh/id_ed25519" dist/ u350621741@147.93.101.51:/home/u350621741/domains/techcloudpro.com/public_html/
# scp api/_visitor.php and api/stats.php and tcp-analytics/* baselines back
```

Effect: privacy policy reverts to pre-310 wording, stats.php loses `fingerprint_only_identified` field (existing dashboards keyed on the field would break — but no internal dashboards consume it yet), inline HTML hooks lose the `_tcp_no_fp` handling (only `_tcp_uid` from Phase 2a stays). Schema columns stay — they're additive nullable, no impact.

### Tier 4 — Drop schema columns (only if needed for clean-room rollback)

```sql
ALTER TABLE page_views DROP INDEX idx_device_fingerprint, DROP COLUMN device_fingerprint;
ALTER TABLE identified_visitors DROP INDEX idx_device_fingerprint, DROP COLUMN device_fingerprint;
```

Effect: nuclear rollback. All fingerprint data lost. Re-running Phase 3 would require re-migrating + re-collecting fingerprints. ONLY needed if regulatory pressure demands clean-room data removal.

## CR ticket

Skipped — TCP infrastructure (Hostinger PHP + Vite SPA), not the dollor.ai admin portal. Same precedent as 305-309.

## Authentication gates

None — Hostinger SSH key already installed (`id_ed25519`, host `147.93.101.51` port `65002`, user `u350621741`). No manual credentials needed.

## Commit hashes

| Repo | SHA | Description |
|------|-----|-------------|
| `techcloudpro` | `d0d5631` | chore(tcp-analytics): import tracker.js baseline from server (pre-fp patch) |
| `techcloudpro` | `afd6d69` | chore(api): import collect.php baseline from server (pre-fp patch) |
| `techcloudpro` | `754e01e` | feat(tcp-analytics): fingerprint.js — first-party device fingerprint with DNT/GPC/opt-out gates |
| `techcloudpro` | `6a51152` | feat(tcp-analytics): tracker.js loads fingerprint.js + sends device_fingerprint to collect.php |
| `techcloudpro` | `0ea07e8` | feat(api): collect.php server-side DNT/GPC defense-in-depth + canonical fp lookup |
| `techcloudpro` | `6b6e31c` | feat(api): tcp_lookup_by_fingerprint() + tcp_backfill_fingerprint() helpers |
| `techcloudpro` | `f219d1a` | feat(api): stats.php fingerprint_only_identified count per window |
| `techcloudpro` | `1f7ef7c` | feat(html): _tcp_no_fp=1 URL param sets persistent localStorage opt-out |
| `techcloudpro` | `48a146e` | docs(privacy): disclose first-party browser fingerprinting + DNT/GPC honoring + opt-out URL param |
| `dollor.ai` (this repo) | _final commit at end of Task 3_ | docs(quick-310): TCP identity-stack Phase 3 — first-party browser fingerprinting |

Per CLAUDE.md, neither pushed to remote unless user asks. **9 atomic commits in techcloudpro** (2 baselines + 7 patches), **1 commit in dollor.ai**.

## Live URLs

- Fingerprint module: `https://techcloudpro.com/tcp-analytics/fingerprint.js` (HTTP 200, 6427 bytes, served with CF caching)
- Tracker (patched): `https://techcloudpro.com/tcp-analytics/tracker.js`
- Collect endpoint (server-gated): `https://techcloudpro.com/tcp-analytics/collect.php`
- Stats endpoint (admin-token gated): `https://techcloudpro.com/tcp-analytics/stats.php?s=TcpSecureAdmin2026`
- Privacy disclosure: `https://techcloudpro.com/privacy-policy/` (Section 5 "Browser Fingerprinting")
- Per-device opt-out URL: `https://techcloudpro.com/?_tcp_no_fp=1` (sets localStorage flag, strips param)

## Self-Check

- [x] `/Users/jeet/techcloudpro/public/tcp-analytics/fingerprint.js` — FOUND (128 lines, ≥100 required)
- [x] Privacy gates BEFORE signal collection (lines 16, 18, 21, 27 vs canvas line 36)
- [x] Contains `navigator.doNotTrack`, `globalPrivacyControl`, `tcp_no_fp`, `crypto.subtle.digest` literals
- [x] `_visitor.php` contains `function tcp_lookup_by_fingerprint(`
- [x] `_visitor.php` contains `function tcp_backfill_fingerprint(`
- [x] `collect.php` contains `HTTP_DNT`, `HTTP_SEC_GPC`, `device_fingerprint`, `tcp_lookup_by_fingerprint`
- [x] `stats.php` contains `fingerprint_only_identified` AND `device_fingerprint IS NOT NULL`
- [x] `index.html` contains `_tcp_no_fp` AND `localStorage.setItem('tcp_no_fp', '1')`
- [x] `public/tools/ai-playground.html` contains `_tcp_no_fp` AND `localStorage.setItem('tcp_no_fp', '1')`
- [x] `PrivacyPolicy.tsx` contains "first-party browser fingerprinting" AND "Do Not Track" AND "_tcp_no_fp"
- [x] `npm run build` succeeded — 98/98 pages pre-rendered, dist/privacy-policy/index.html contains all 3 phrases
- [x] tracker.js baseline committed BEFORE patches (commit `d0d5631` precedes `6a51152`)
- [x] collect.php baseline committed BEFORE patches (commit `afd6d69` precedes `0ea07e8`)
- [x] FP_SCHEMA_PROBE.md saved with verbatim "OK" results + DESCRIBE outputs
- [x] Schema probe deleted from server (verified `No such file or directory`)
- [x] Battery A — schema migration evidence preserved
- [x] Battery B1 — DNT: 1 → device_fingerprint = NULL in page_views row 3159
- [x] Battery B2 — Sec-GPC: 1 → device_fingerprint = NULL in page_views row 3160
- [x] Battery B3 — normal request → device_fingerprint = 64-char hex in page_views row 3161
- [x] Battery C Step 1 — form submit creates identified_visitors row with V1 cookie
- [x] Battery C Step 2 — pageview with cookie+fp backfills FP onto identified_visitors row
- [x] Battery C Step 3 — fresh empty cookie jar + same FP → canonical V1 cookie restored
- [x] Battery C Step 4 — identified_visitors_count == 1 (NO duplicate row)
- [x] Battery C Step 5 — step-3 pageview attributed to canonical V1 visitor_id
- [x] Battery D — fingerprint_only_identified field present in all 4 windows
- [x] Battery E — privacy policy live, all 3 required phrases curl-confirmed
- [x] All probes deleted from server (3 probes total: schema, B-readback, C-state)
- [x] 7 atomic commits + 2 baseline commits in techcloudpro
- [x] No pushes to any remote (per CLAUDE.md push policy)
- [x] All 3 Phase X follow-ups documented (retention cron, CF purge, bot pollution)
- [x] 4-tier rollback playbook complete

## Self-Check: PASSED
