---
phase: 308-phase-2a-identity-stack-tcp-receiver-for
plan: 01
subsystem: tcp-identity-stack
tags: [tcp, php, identity, hostinger, pii, cookies, email-click, brandmonkz, phase-2a]
dependency-graph:
  requires:
    - "307-SUMMARY.md (identified_visitors table + _visitor.php helpers + tcp_vid cookie + stats.php JOIN)"
    - "Hostinger MySQL u350621741_visitors (identified_visitors, page_views.visitor_id)"
  provides:
    - "/api/identify-from-email.php — email-click identity capture endpoint (stub mode + future BM API placeholder)"
    - "Inline JS hook on index.html and ai-playground.html that POSTs ?_tcp_uid then strips it via history.replaceState"
    - "source_form='email-click' surface inside identified_visitors / stats.php top_visitors"
  affects:
    - "/Users/jeet/techcloudpro/api/identify-from-email.php (NEW)"
    - "/Users/jeet/techcloudpro/index.html (PATCHED — inline hook before ahrefs + tracker.js)"
    - "/Users/jeet/techcloudpro/public/tools/ai-playground.html (PATCHED — inline hook before html2canvas + tracker.js)"
tech-stack:
  added: []
  patterns:
    - "Stub-flag + cURL-placeholder dual mode (synthetic E2E now, BM API in Phase 2b)"
    - "Method gate (POST-only → 405) with all OTHER failure paths returning HTTP 200 + {ok:false}"
    - "uid regex /^[A-Za-z0-9_-]{1,64}$/ rejects script/SQL/path-traversal injection"
    - "history.replaceState() AFTER fetch() initiated — strips _tcp_uid from URL, history, and referrer"
    - "Throwable catch degrades DB / OOM / type errors to {ok:false} so a broken endpoint never breaks user pages"
key-files:
  created:
    - "/Users/jeet/techcloudpro/api/identify-from-email.php (102 lines)"
    - "/Users/jeet/doordash-p2p/.planning/quick/308-phase-2a-identity-stack-tcp-receiver-for/308-SUMMARY.md"
  modified:
    - "/Users/jeet/techcloudpro/index.html (+19 lines — inline hook before ahrefs)"
    - "/Users/jeet/techcloudpro/public/tools/ai-playground.html (+19 lines — inline hook before html2canvas)"
    - "(server-only) /home/u350621741/domains/techcloudpro.com/public_html/api/identify-from-email.php"
    - "(server-only) /home/u350621741/domains/techcloudpro.com/public_html/index.html"
    - "(server-only) /home/u350621741/domains/techcloudpro.com/public_html/tools/ai-playground.html"
decisions:
  - "Reuse Phase 1 helpers verbatim (tcp_db / tcp_get_or_create_visitor_id / tcp_set_visitor_cookie / tcp_upsert_identified_visitor) — zero re-implementation"
  - "STUB MODE active in this task: client-supplied email/name/company are trusted ONLY when TCP_IDENTITY_STUB=true. MUST be flipped to false before Phase 2b ships to real prospects"
  - "Hook placed BEFORE ahrefs (not just before tracker.js) so URL is cleaned even before ahrefs reads referrer/window.location"
  - "history.replaceState() rather than location.replace() — no page reload, no fetch race, preserves scroll/state"
  - "405 ONLY on GET. ALL other failure paths return HTTP 200 + {ok:false}. A malformed/malicious request must NEVER surface a 4xx/5xx that page-monitoring tools or browser dev tools would flag"
  - "Cookie set BEFORE any echo (PHP setcookie() ordering rule) — tcp_get_or_create_visitor_id() is called BEFORE the {ok:true} echo, after all validation passes"
metrics:
  duration: "~10 minutes"
  completed: "2026-04-28T20:42:00Z"
  tasks: 2
  files: 3
---

# Quick Task 308: TCP Identity-Stack Phase 2a — Email-Click Identity Receiver Summary

## One-liner

Receiver side of the email-click identity chain — when a recipient hits `techcloudpro.com/...?_tcp_uid=<emailLogId>` from a (future) BrandMonkz click-tracked email, an inline JS hook fires BEFORE ahrefs/tracker.js, POSTs the opaque uid to `/api/identify-from-email.php`, strips it from the URL via `history.replaceState`, and the PHP endpoint upserts an `identified_visitors` row with `source_form='email-click'` plus the canonical `tcp_vid` cookie — so subsequent pageviews JOIN to the named prospect in `stats.php`.

## What was built

### 1. `/api/identify-from-email.php` (102 lines, NEW)

PHP endpoint with TWO modes controlled by `define('TCP_IDENTITY_STUB', true)`:

| Mode | Trigger | Source of email/name/company |
|------|---------|------------------------------|
| **Stub** (this task) | `TCP_IDENTITY_STUB=true` AND body has email+name+company | Trusted from request body — for synthetic E2E only |
| **Production** (Phase 2b) | `TCP_IDENTITY_STUB=false` | cURL `GET https://brandmonkz.com/api/email-log/<uid>/contact` with `X-Identity-Token` shared secret, 3s/2s timeouts |

After resolving identity, the endpoint:
1. Mints/reads the `tcp_vid` cookie via `tcp_get_or_create_visitor_id()` (Phase 1 helper).
2. Calls `tcp_upsert_identified_visitor(..., source_form='email-click', ...)` which returns the canonical visitor_id.
3. If canonical differs from this request's vid, calls `tcp_set_visitor_cookie(canonical)` so subsequent pageviews from this device link to the canonical row.
4. Returns `{"ok": true}`.

ALL failure paths (bad uid regex, malformed JSON, DB exception, BM API down, missing email) return HTTP 200 + `{"ok": false}`. ONLY GET → HTTP 405. A `Throwable` catch ensures even unexpected runtime errors degrade gracefully.

### 2. Inline JS hook (`index.html` + `public/tools/ai-playground.html`, +19 lines each)

Identical 17-line script tag injected:
- **index.html**: BEFORE the ahrefs analytics tag and BEFORE the tracker.js tag (so URL is clean before ANY analytics reads it).
- **ai-playground.html**: BEFORE the html2canvas tag and BEFORE the tracker.js tag.

Hook behavior:
1. Read `?_tcp_uid` from `URLSearchParams`.
2. If absent → return immediately (zero-cost no-op for organic traffic).
3. If present → `fetch()` POSTs `{uid: <uid>}` to `/api/identify-from-email.php` with `credentials: 'include'`, then immediately strips `_tcp_uid` via `URLSearchParams.delete()` + `history.replaceState()`.
4. Wrapped in try/catch — never throws, never blocks page render.

By the time tracker.js fires its first pageview, the URL no longer contains `_tcp_uid`, so it never enters `page_views.referrer` / browser history / Ahrefs page event.

## Verification — verbatim live evidence

Per CLAUDE.md verification protocol: every test below was RUN against the live `https://techcloudpro.com` deployment, with the output PASTED VERBATIM. Default curl UA is blocked by Cloudflare WAF; all tests use Safari UA.

### Test 1 — Stub-mode happy path

```
HTTP/2 200
content-type: application/json
set-cookie: tcp_vid=82fdb32fe72b32d4724644af1d4454fa; expires=Wed, 28 Apr 2027 20:39:59 GMT; Max-Age=31536000; path=/; domain=.techcloudpro.com; secure; SameSite=Lax

{"ok":true}
```

Cookie jar after request:
```
.techcloudpro.com  TRUE  /  TRUE  1808944799  tcp_vid  82fdb32fe72b32d4724644af1d4454fa
```

Synthetic email: `tcp-308-emailclick-1777408798@example.com`. visitor_id `82fdb32fe72b32d4724644af1d4454fa` (32-hex), 1-year expiry, Secure, SameSite=Lax, scoped to `.techcloudpro.com`.

### Test 2 — DB row landed with source_form='email-click'

Probe SELECT on `identified_visitors WHERE source_form='email-click' AND email LIKE 'tcp-308-emailclick-%'`:

```json
{
    "rows": [
        {
            "visitor_id": "82fdb32fe72b32d4724644af1d4454fa",
            "email": "tcp-308-emailclick-1777408798@example.com",
            "name": "Phase 2a Test",
            "company": "BrandMonkz Email Test",
            "source_form": "email-click",
            "first_seen_at": "2026-04-28 20:39:59"
        }
    ]
}
```

`visitor_id` matches the cookie verbatim → cookie-to-DB linkage is intact. (Probe `_probe-308.php` was deployed under `/api/`, queried, then SSH-deleted; cleanup confirmed `ls: ... No such file or directory`.)

### Test 3 — stats.php JOIN surfaces email-click visitor

After firing one collect.php pageview as the same visitor (cookie jar reused, `type:'pageview'`), then querying stats.php with the admin token:

```bash
curl '...stats.php?s=TcpSecureAdmin2026' | jq '.windows.today.identified_visits.top_visitors[] | select(.source_form == "email-click")'
```

```json
[
  {
    "name": "Phase 2a Test",
    "email": "tcp-308-emailclick-1777408798@example.com",
    "company": "BrandMonkz Email Test",
    "source_form": "email-click",
    "first_seen_at": "2026-04-28 20:39:59",
    "last_seen_at": "2026-04-28 20:39:59",
    "pageviews": 1
  }
]
```

End-to-end JOIN proven: cookie → page_views.visitor_id → identified_visitors → top_visitors with `pageviews=1`. Phase 1's stats.php JOIN code surfaces email-click visitors with ZERO stats.php changes — `source_form='email-click'` is just another value in the existing column.

### Test 4 — Failure-mode matrix (verbatim)

| Test | Method | Body | Status | Body |
|------|--------|------|--------|------|
| 4a | GET | (none) | **HTTP/2 405** | `{"ok":false,"error":"method_not_allowed"}` |
| 4b | POST | `not-json{` | **HTTP/2 200** | `{"ok":false}` |
| 4c | POST | `{}` | **HTTP/2 200** | `{"ok":false}` |
| 4d | POST | `{"uid":"<script>alert(1)</script>"}` | **HTTP/2 200** | `{"ok":false}` |
| 4e | POST | `{"uid":"a"*65}` (66 chars) | **HTTP/2 200** | `{"ok":false}` |

All 5 expected outcomes match. The uid regex `/^[A-Za-z0-9_-]{1,64}$/` rejected 4d (`<` and `>` not in charset) and 4e (length > 64).

### Test 5 — Live HTML serves the hook BEFORE tracker.js

`https://techcloudpro.com/?_phase2a_smoke=$EPOCH`:

```
9:    /* TCP Identity-Stack Phase 2a — capture _tcp_uid from email-click URLs and strip
10:       it from the URL before tracker.js / ahrefs read referrer/page state. */
14:        var uid = p.get('_tcp_uid');
22:        p.delete('_tcp_uid');
28:    <script src="https://analytics.ahrefs.com/analytics.js" data-key="oz7w6rUoQPs2VLdXREu8tQ" async></script>
29:    <script async src="/tcp-analytics/tracker.js"></script>
```

Hook block runs lines 9-22. ahrefs at line 28. tracker.js at line 29. Ordering invariant verified: `_tcp_uid` script is FIRST in the head.

`https://techcloudpro.com/tools/ai-playground.html?_phase2a_smoke=$EPOCH`:

```
9:/* TCP Identity-Stack Phase 2a — capture _tcp_uid from email-click URLs and strip
10:   it from the URL before tracker.js / ahrefs read referrer/page state. */
14:    var uid = p.get('_tcp_uid');
22:    p.delete('_tcp_uid');
29:<script async src="/tcp-analytics/tracker.js"></script>
```

Same ordering on the playground HTML. (Cache-bust `?_phase2a_smoke=<epoch>` was used to bypass Cloudflare HTML cache; DO NOT trigger CF purge for this task — the cache will expire naturally.)

### Test 6 — Cross-device dedup proven

Re-submit the SAME synthetic email from a fresh, cookie-less request:

Response headers (TWO `Set-Cookie` headers — first is mint, second is canonical rewrite):

```
set-cookie: tcp_vid=d66e28689af78eaf4330f19b3448492e; expires=Wed, 28 Apr 2027 20:41:40 GMT; ...
set-cookie: tcp_vid=82fdb32fe72b32d4724644af1d4454fa; expires=Wed, 28 Apr 2027 20:41:40 GMT; ...
```

Cookie-jar diff:

```
JAR1 tcp_vid: 82fdb32fe72b32d4724644af1d4454fa
JAR2 tcp_vid: 82fdb32fe72b32d4724644af1d4454fa   ← SAME (canonical first-seen)
```

Phase 1's email-canonical lookup branch fired exactly as designed. Same email → same canonical visitor_id, regardless of incoming uid or cookie state.

## Privacy stance

- **Stub mode is on (TCP_IDENTITY_STUB=true). This is a Phase 2b release-blocker.** While the flag is true, the endpoint TRUSTS client-supplied `email`/`name`/`company` in the request body — that is fine for synthetic E2E testing TODAY but would be an open identity-injection surface against real users (anyone could POST a forged email and get tagged as that prospect in `identified_visitors`). **DO NOT FORGET TO FLIP `TCP_IDENTITY_STUB` to `false` once Phase 2b BrandMonkz endpoint ships.**
- **URL is stripped to remove the opaque uid.** The inline hook calls `history.replaceState()` immediately after `fetch()` is initiated. By the time tracker.js fires its first pageview event, the URL no longer contains `_tcp_uid`, so:
  - `document.referrer` on the next navigation does NOT leak the uid to the next site.
  - `page_views.referrer` does NOT capture the uid.
  - Browser history (back button, history API) does NOT show the uid.
  - Ahrefs analytics does NOT see the uid.
- **Fire-and-forget.** The fetch() is unwaited and its result is discarded (`.catch(function(){})`). If the endpoint is slow or down, page rendering is not blocked.
- **Opaque emailLogId.** The uid is BrandMonkz's internal `emailLogId` — a random opaque string, not an email address or PII. Even if it leaked, it identifies an outbound campaign send, not a person.
- **No external network calls in stub mode.** The cURL placeholder is dead code while `TCP_IDENTITY_STUB=true`. In Phase 2b production mode, cURL hits `https://brandmonkz.com/api/email-log/<uid>/contact` ONLY with a 3s total timeout + 2s connect timeout, gated by an `X-Identity-Token` shared secret.
- **All failure modes are page-safe.** `Throwable` catch + `goto fail` ensure DB outages, malformed JSON, OOM, type errors, BM API timeouts, missing emails, etc. all return HTTP 200 + `{ok:false}`. Page-monitoring tools and browser dev tools will never flag this endpoint as a 4xx/5xx error source.

### Pre-existing risk (NOT introduced by this task)

DB credentials are inlined in plaintext PHP via `_visitor.php` (created in 307). The new `identify-from-email.php` reuses `_visitor.php` and inherits this risk — does NOT introduce a new copy. Continues to be tracked as a Phase X follow-up across all TCP PHP files.

## ⚠️ Phase 2b TODO — DO NOT FORGET

The receiver side is now live. The SENDER side (BrandMonkz) is a separate task list:

1. **BrandMonkz must build `GET /api/email-log/<id>/contact`** returning `{email, name, company}`, gated by an `X-Identity-Token` shared-secret header. Endpoint must:
   - Look up the emailLog row by id, return its associated contact's email/name/company.
   - Reject (401) any request without a valid `X-Identity-Token` matching the shared secret.
   - Rate-limit (already applied across BM API).
   - Return 404 if id unknown — TCP endpoint will degrade to `{ok:false}` on non-200.

2. **BrandMonkz click-tracking redirect must wrap outbound `techcloudpro.com` URLs** as `<original-url>?_tcp_uid=<emailLogId>`. Implementation note: BM's existing click-tracking uses `https://brandmonkz.com/api/tracking/click/{id}` (per memory) — the redirect target URL must have `?_tcp_uid=<emailLogId>` appended, preserving any existing query params on the original URL (use `URL.searchParams.set` or equivalent).

3. **Generate the shared secret** (e.g. 32-char random hex), store in:
   - BrandMonkz env: `TCP_IDENTITY_TOKEN=<secret>` (used to validate incoming `X-Identity-Token`).
   - Hostinger PHP file: SSH in, edit `/home/u350621741/domains/techcloudpro.com/public_html/api/identify-from-email.php`, replace `define('TCP_BM_SHARED_SECRET', 'PHASE_2B_PLACEHOLDER_REPLACE_ME')` with the same secret value.

4. **Flip the stub flag.** SSH to Hostinger and edit `/api/identify-from-email.php`: change `define('TCP_IDENTITY_STUB', true)` → `define('TCP_IDENTITY_STUB', false)`. After this flip:
   - Synthetic E2E tests that submit `{uid, email, name, company}` directly will FAIL (expected — that surface is closed).
   - Real BM email clicks (with valid emailLogId + valid shared secret) will continue to work.
   - Verify by sending a real test email through BM and clicking — `identified_visitors` should get a `source_form='email-click'` row with the recipient's actual email.

After (4) ships, the stub branch in identify-from-email.php is dead code. A future cleanup pass can remove it; until then, leaving it in is harmless because the flag is false.

## DB tables touched

| Table | Operation | Trigger |
|-------|-----------|---------|
| `identified_visitors` | INSERT or UPDATE (canonical-by-email) via `tcp_upsert_identified_visitor()` | Each successful POST to /api/identify-from-email.php |
| `page_views` | INSERT (from collect.php, with `visitor_id` from cookie) | Each tracker.js pageview from a visitor with the cookie |

ZERO schema changes in this task — Phase 1's tables and helpers were sufficient.

## Files changed

| File | Repo | Status |
|------|------|--------|
| `api/identify-from-email.php` | github.com/jeet-avatar/techcloudpro | created (102 lines) |
| `index.html` | github.com/jeet-avatar/techcloudpro | patched (+19 lines, inline hook) |
| `public/tools/ai-playground.html` | github.com/jeet-avatar/techcloudpro | patched (+19 lines, inline hook) |
| (server-only) `/api/identify-from-email.php` | Hostinger | deployed (3999 bytes) |
| (server-only) `/index.html` | Hostinger | deployed (1415 bytes) |
| (server-only) `/tools/ai-playground.html` | Hostinger | deployed (181894 bytes) |
| `.planning/quick/308-.../308-SUMMARY.md` | dollor.ai | created (this file) |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] collect.php pageview test required `type:'pageview'` field**

- **Found during:** Task 2 Test 3 (firing tracker pageview)
- **Issue:** Plan's curl command for Test 3 sent `{"page":..., "session_id":..., "referrer":""}` but collect.php (line 71) requires `type` field — without it, returns HTTP 400 `{"error":"invalid"}`. Plan was missing `"type":"pageview"` in the body.
- **Fix:** Re-fired with corrected body `{"type":"pageview", "page":..., "session_id":..., "referrer":""}` — got HTTP 200 `{"ok":true}` and pageview was inserted with the cookie's visitor_id. Subsequent stats.php query proved the JOIN.
- **Files modified:** none — test command only.
- **Tracked here so future tracker.js pageview smoke tests** include the `type` field. (Real tracker.js obviously sets this; only synthetic curl tests can omit it.)

### Architectural changes

None.

### Out-of-scope items deferred (filed as Phase 2b / future follow-ups)

- **TCP_IDENTITY_STUB=true** must be flipped to false in Phase 2b — see Phase 2b TODO section above. This is the SINGLE most important follow-up.
- **`TCP_BM_SHARED_SECRET` placeholder** must be replaced with a real secret in Phase 2b.
- **Stub branch dead-code cleanup** — after Phase 2b stabilizes, remove the stub branch from identify-from-email.php in a separate maintenance task.
- **DB-creds-in-PHP** — pre-existing risk carried over from 305/306/307. Not addressed here. Tracked as Phase X.
- **`seo/` directory still untracked** in `/Users/jeet/techcloudpro/` git status (carried forward from 305/306/307).

## CR ticket

Skipped — TCP infrastructure (Hostinger PHP), not the dollor.ai admin portal. Same precedent as 305 + 306 + 307.

## Authentication gates

None — Hostinger SSH key already installed. Host=`147.93.101.51`, port=`65002`, user=`u350621741`. No manual credentials needed.

## Commit hashes

| Repo | SHA | Description |
|------|-----|-------------|
| `techcloudpro` | `3c43df0` | feat(api): identity-stack phase 2a — email-click identity receiver |
| `dollor.ai` (this repo) | _final commit at end of task_ | docs(quick-308): SUMMARY |

Per CLAUDE.md, neither pushed unless user asks.

## Live URL

`https://techcloudpro.com/api/identify-from-email.php` — POST only, all failure paths return 200+{ok:false}, GET → 405. (Browser UA required to bypass Cloudflare WAF for any direct testing.)

## Self-Check

- [x] `/Users/jeet/techcloudpro/api/identify-from-email.php` — FOUND (102 lines)
- [x] `TCP_IDENTITY_STUB` defined and used (line 13 + line 46)
- [x] `_visitor.php` required (line 19)
- [x] uid regex `/^[A-Za-z0-9_-]{1,64}$/` present
- [x] `Throwable` catch present (line 95)
- [x] `tcp_upsert_identified_visitor(...,'email-click',...)` call present (line 80-83)
- [x] index.html — `_tcp_uid` hook at lines 9-23, BEFORE ahrefs (line 28) and tracker.js (line 29)
- [x] ai-playground.html — `_tcp_uid` hook at lines 9-22, BEFORE html2canvas (line 28) and tracker.js (line 29)
- [x] Server `api/identify-from-email.php` — FOUND (3999 bytes)
- [x] Server `index.html` — FOUND, contains `_tcp_uid` 3x
- [x] Server `tools/ai-playground.html` — FOUND, contains `_tcp_uid` 3x
- [x] Test 1 stub-mode happy path — HTTP 200 + {ok:true} + Set-Cookie
- [x] Test 2 DB row exists with source_form='email-click'
- [x] Test 3 stats.php top_visitors surfaces synthetic email-click visitor with pageviews=1
- [x] Test 4a GET → 405, 4b/4c/4d/4e → 200 + {ok:false}
- [x] Test 5 live HTML serves hook BEFORE tracker.js (both pages)
- [x] Test 6 cross-device dedup — same canonical tcp_vid in both jars
- [x] Synthetic probe `_probe-308.php` removed from server (`ls: ... No such file or directory`)
- [x] techcloudpro commit `3c43df0` — present in `git log`

## Self-Check: PASSED
