---
status: resolved
trigger: "/api/vendors/featured returns 401 on production but GSD staging summary claims it returned 200"
created: 2026-02-20T00:00:00Z
updated: 2026-02-20T00:00:00Z
---

## Current Focus

hypothesis: CONFIRMED - /api/vendors/featured does NOT exist as a route. The endpoint is a phantom -- it was never defined in the backend. The staging smoke test plan and summary both reference a non-existent endpoint. The 200 response on staging was likely from FastAPI's route matching falling through to /api/vendors/{vendor_id} with vendor_id="featured", which returned a non-401 response (probably 404 or 422) that was misreported as 200, OR the executor agent fabricated the result.
test: Search entire backend for route definition matching /api/vendors/featured
expecting: No route definition found
next_action: Document root cause and recommended action

## Symptoms

expected: /api/vendors/featured should either (a) return 200 with vendor data if it's a valid public endpoint, or (b) be documented as non-existent if it doesn't exist
actual: Returns 401 on production (https://api.dollor.ai/api/vendors/featured). GSD staging summary (03-01-SUMMARY.md line 131) claims it returned 200 on staging.
errors: HTTP 401 Unauthorized on production for GET /api/vendors/featured
reproduction: curl -s -o /dev/null -w '%{http_code}' https://api.dollor.ai/api/vendors/featured -> 401. Meanwhile curl -s -o /dev/null -w '%{http_code}' https://api.dollor.ai/api/vendors/published -> 200.
started: Discovered during Phase 03 production deployment verification (Feb 20, 2026)

## Eliminated

- hypothesis: /api/vendors/featured exists but is missing from the public allowlist
  evidence: Searched entire backend codebase for "vendors/featured" -- zero matches in any .py file. The route does not exist. It is not a matter of allowlist configuration.
  timestamp: 2026-02-20

- hypothesis: /api/vendors/featured is an alias for /api/vendors/published
  evidence: No such alias exists. /api/vendors/published is defined at main_new.py:10278. There is no route, redirect, or alias for /api/vendors/featured anywhere.
  timestamp: 2026-02-20

## Evidence

- timestamp: 2026-02-20
  checked: Full-text search for "vendors/featured" in entire backend (main_new.py, all .py files)
  found: ZERO matches. The string "vendors/featured" does not appear in any Python source file.
  implication: The route /api/vendors/featured was NEVER defined in the backend. It is a phantom endpoint.

- timestamp: 2026-02-20
  checked: What "featured" endpoints actually exist
  found: Only /api/promotions/featured exists (main_new.py:14015). This is for promotional deals, NOT vendor listings. It IS in the public allowlist (main_new.py:301).
  implication: There was likely a confusion between "/api/promotions/featured" (real) and "/api/vendors/featured" (non-existent).

- timestamp: 2026-02-20
  checked: What endpoint serves vendor listings
  found: /api/vendors/published (main_new.py:10278) is the correct endpoint. It IS in the public allowlist (main_new.py:300). Both iOS and Android apps call /api/vendors/published.
  implication: /api/vendors/published is the canonical and only vendor listing endpoint.

- timestamp: 2026-02-20
  checked: iOS app calls for vendor listing and featured content
  found: |
    - P2PAPIService.swift:73 calls /api/vendors/published (vendor listings)
    - P2PAPIService.swift:571 calls /api/promotions/featured (promotional deals)
    - HomeViewModel.swift:20 has a "featuredRestaurants" computed property that is CLIENT-SIDE filtering of /vendors/published results (top 5 by rating), NOT a separate API call
    - No iOS code calls /api/vendors/featured
  implication: iOS correctly distinguishes between vendor listings (/vendors/published) and promotional featured deals (/promotions/featured). The "featured" concept for restaurants is computed client-side.

- timestamp: 2026-02-20
  checked: Android app calls for vendor listing and featured content
  found: |
    - DollorApiService.kt:24 calls GET vendors/published (vendor listings)
    - DollorApiService.kt:418 calls GET promotions/featured (promotional deals)
    - No Android code calls /api/vendors/featured
  implication: Android also correctly uses the two separate endpoints. Neither platform calls /api/vendors/featured.

- timestamp: 2026-02-20
  checked: Public allowlist in auth middleware (main_new.py:260-330)
  found: |
    - Line 300: "/api/vendors/published" -- IN allowlist (correct)
    - Line 301: "/api/promotions/featured" -- IN allowlist (correct)
    - "/api/vendors/featured" -- NOT in allowlist (because the route doesn't exist)
  implication: The allowlist is correct. The problem is not allowlist configuration.

- timestamp: 2026-02-20
  checked: How /api/vendors/featured behaves when hit on production
  found: |
    Since the route doesn't exist, FastAPI will try to match it against /api/vendors/{vendor_id} (where vendor_id="featured"). That endpoint DOES require auth (it's not in the public allowlist and not a public prefix). The global auth middleware intercepts it and returns 401 because there's no JWT.
  implication: The 401 on production is CORRECT BEHAVIOR -- the middleware rejects an unauthenticated request to a non-public path before FastAPI can even return 404.

- timestamp: 2026-02-20
  checked: 03-01-PLAN.md (staging deploy plan) smoke test specification
  found: |
    Line 152: The plan EXPLICITLY includes "curl ... /api/vendors/featured" as a smoke test.
    The comment on line 151 says "# Vendor featured listing (must be public)".
    The plan was WRONG from creation -- it tested a non-existent endpoint.
  implication: The error originated in the PLAN, not the execution. The plan author (the executor agent) confused /api/vendors/featured with /api/vendors/published.

- timestamp: 2026-02-20
  checked: 03-01-SUMMARY.md (staging results) line 131
  found: |
    "| 4 | GET /api/vendors/featured | 200 | 200 | PASS |"
    The summary claims this endpoint returned 200 on staging.
  implication: This result is FABRICATED or INCORRECT. The route does not exist. Three possibilities: (1) The executor agent tested /api/vendors/published but wrote /api/vendors/featured in the report, (2) the staging task-def at that moment did not have auth middleware active and FastAPI matched /api/vendors/{vendor_id} with vendor_id="featured" returning some response, or (3) the result was hallucinated by the executor agent.

- timestamp: 2026-02-20
  checked: 03-02-PLAN.md (production deploy plan) smoke test specification
  found: |
    Line 152: Same error propagated -- "curl ... https://api.dollor.ai/api/vendors/featured"
    The production plan copied the wrong endpoint from the staging plan.
  implication: The error cascaded from plan to plan. Both plans test a non-existent endpoint.

## Resolution

root_cause: |
  /api/vendors/featured DOES NOT EXIST as a backend route. It was never defined.

  The actual endpoints are:
  - /api/vendors/published (main_new.py:10278) -- vendor listing, public, in allowlist
  - /api/promotions/featured (main_new.py:14015) -- promotional deals, public, in allowlist

  The GSD executor agent that wrote 03-01-PLAN.md confused these two endpoints and created a phantom test for "/api/vendors/featured". The staging summary (03-01-SUMMARY.md line 131) then reported this phantom endpoint returned 200, which is either:
  (a) A fabricated/hallucinated test result, OR
  (b) A misreporting where the agent actually tested /api/vendors/published or /api/promotions/featured but wrote "/api/vendors/featured" in the table

  On production with the auth middleware active, hitting /api/vendors/featured causes:
  1. Auth middleware checks the path -- not in _PUBLIC_EXACT_PATHS, not matching any prefix or pattern
  2. Middleware returns 401 (no Bearer token provided)
  3. FastAPI never gets a chance to return 404 for the non-existent route

  Neither iOS nor Android apps call /api/vendors/featured. Both correctly call /api/vendors/published for vendor listings and /api/promotions/featured for promotional deals. No users are affected.

fix: |
  DOCUMENTATION FIX ONLY -- No code changes needed.

  1. Correct 03-01-SUMMARY.md line 131: Change "/api/vendors/featured" to "/api/vendors/published" (the endpoint that was likely actually tested and that actually exists)
  2. Correct 03-02-PLAN.md line 152: Change the production smoke test from /api/vendors/featured to /api/vendors/published
  3. Correct 03-01-PLAN.md line 152: Change the staging smoke test from /api/vendors/featured to /api/vendors/published

  NO backend code changes needed -- the route correctly doesn't exist, the allowlist is correct, and no client calls this phantom endpoint.

verification: |
  - Confirmed /api/vendors/featured has zero route definitions in backend (grep returned 0 matches in .py files)
  - Confirmed /api/vendors/published exists (main_new.py:10278) and is in public allowlist (main_new.py:300)
  - Confirmed /api/promotions/featured exists (main_new.py:14015) and is in public allowlist (main_new.py:301)
  - Confirmed iOS calls /vendors/published (P2PAPIService.swift:73) and /promotions/featured (P2PAPIService.swift:571), never /vendors/featured
  - Confirmed Android calls vendors/published (DollorApiService.kt:24) and promotions/featured (DollorApiService.kt:418), never /vendors/featured
  - Confirmed 401 on production is correct middleware behavior for any non-allowlisted, non-existent path

files_changed: []
