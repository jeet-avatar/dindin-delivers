# Phase 02: iOS API Verification - Context

**Gathered:** 2026-02-22
**Status:** Ready for planning

<domain>
## Phase Boundary

Verify every API call in all 3 iOS apps (Customer, Driver, Restaurant) against actual backend routes. This is a pure audit phase — document findings, create a fix plan, but do NOT fix mismatches during this phase. Fixes happen in a separate session before distribution.

</domain>

<decisions>
## Implementation Decisions

### Mismatch handling
- Every mismatch requires user approval before any fix — one by one, not batched
- Fix strategy decided case by case (discuss with user whether to fix client or add backend alias)
- Check every API call regardless of whether the feature is actively used — report all as issues with root cause analysis
- Dead/unused API calls: document them with downstream effect analysis (what happens if used, what happens if deleted)

### Verification scope (full contract)
- Verify for each API call: URL path, HTTP method, auth header, request body shape, response model parsing, Content-Type header
- Response model verification: field names AND data types must match (String vs Int, optional vs required)
- Output: structured markdown report per app AND TODO comments in iOS code where issues are found
- Also verify: base URL points to api.dollor.ai (production) in production config
- Also cross-check: backend endpoint has correct auth decorator (Depends(require_customer), etc.)

### Fix-in-place policy
- This phase is audit-only — do NOT fix mismatches during verification
- Create a separate FIX_PLAN.md listing all issues with fix approach
- Prioritize fixes: critical (app crash/wrong data), medium (feature broken), low (cosmetic/unused)
- Critical mismatches BLOCK Phase 04 (iOS Distribution) — must be fixed before building

### Last build baseline
- Verify against the last TestFlight builds (not just current source)
- Check TestFlight build numbers and trace back to the source commit
- This ensures we're verifying what was actually shipped, not just what's in the repo now

### Claude's Discretion
- Report formatting details and table layout
- How to organize the per-app verification reports
- Technical approach to extracting API calls from Swift source

</decisions>

<specifics>
## Specific Ideas

- P2PAPIService.swift is the main API service file for Customer app — all API calls go through it
- Driver and Restaurant apps have their own API service files
- Backend routes are in main_new.py and separate router files (bid_routes.py, order_flow.py, etc.)
- v1.2 already fixed 3 iOS + 5 Android broken API paths — some may have been missed
- The API registry script (`scripts/extract-api-endpoints.py`) can regenerate the full backend route list

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 02-ios-api-verification*
*Context gathered: 2026-02-22*
