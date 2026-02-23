---
phase: 02-ios-api-verification
verified: 2026-02-22T00:00:00Z
status: gaps_found
score: 3/4 success criteria verified
re_verification: false
gaps:
  - truth: "Every URL path in the Restaurant app's API service matches a registered backend route (OR mismatches are documented)"
    status: partial
    reason: "REQUIREMENTS.md API-03 checkbox is still unchecked ([ ]) and ROADMAP.md 02-03-PLAN.md is marked [ ] — both stale. The work IS done (commit 1e99f13a, report exists with 40 verified calls) but the documentation trail is inconsistent. A downstream reader of REQUIREMENTS.md would conclude API-03 is incomplete."
    artifacts:
      - path: ".planning/REQUIREMENTS.md"
        issue: "API-03 marked [ ] (Pending) at line 12 and line 58 of traceability table. Last-updated note says only 'API-01 complete'. Should be [x] after commit 1e99f13a."
      - path: ".planning/ROADMAP.md"
        issue: "02-03-PLAN.md plan checkbox marked [ ] instead of [x]. Phase 02 completion note says 'completed 2026-02-23' at line 18 (correct) but internal plan list is inconsistent."
    missing:
      - "Update REQUIREMENTS.md: change `- [ ] **API-03**` to `- [x] **API-03**` and update traceability table Status from Pending to Complete"
      - "Update REQUIREMENTS.md last-updated note to reflect API-03 completion"
      - "Update ROADMAP.md: change `- [ ] 02-03-PLAN.md` to `- [x] 02-03-PLAN.md`"
human_verification: []
---

# Phase 02: iOS API Verification — Verification Report

**Phase Goal:** Verify every API call in all 3 iOS apps (Customer, Driver, Restaurant) against actual backend routes. Document findings, create fix plan, do NOT fix mismatches during this phase.
**Verified:** 2026-02-22
**Status:** gaps_found
**Re-verification:** No — initial verification
**Score:** 3/4 success criteria verified

---

## Goal Achievement

### Success Criteria from ROADMAP.md

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Every URL path in P2PAPIService.swift (Customer) matches a registered backend route OR is documented as a mismatch | VERIFIED | 02-01-REPORT-CUSTOMER.md: 163 calls verified, 119 OK, 44 mismatches documented with severity and fix approach. Commit e35546b9. |
| 2 | Every URL path in the Driver app's API service matches a registered backend route OR is documented as a mismatch | VERIFIED | 02-02-REPORT-DRIVER.md: 53 calls verified, 49 OK, 4 mismatches (3 critical, 1 medium) documented. Commit 812d0e9b. |
| 3 | Every URL path in the Restaurant app's API service matches a registered backend route OR is documented as a mismatch | VERIFIED | 02-03-REPORT-RESTAURANT.md: 40 calls verified, 37 OK, 3 medium mismatches documented. Commit 1e99f13a. Report is substantive (167 lines, 38 OK rows). |
| 4 | Any mismatches found are documented with a fix plan (backend alias or client fix) | VERIFIED | FIX_PLAN.md consolidates all 51 mismatches across 3 apps with severity, fix side, fix description, effort estimate, and recommended fix order. Phase 04 blocker status explicitly stated: YES. |

**Score:** 4/4 success criteria substantively achieved

---

## Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `.planning/phases/02-ios-api-verification/02-01-REPORT-CUSTOMER.md` | Complete iOS Customer app API verification report with Summary section | VERIFIED | 530 lines, 98 `OK` rows, 60 `mismatch` references, all required sections present |
| `.planning/phases/02-ios-api-verification/02-02-REPORT-DRIVER.md` | Complete iOS Driver app API verification report with Summary section | VERIFIED | 243 lines, 49 OK rows, 4 MISMATCH rows, Summary section present at line 11 |
| `.planning/phases/02-ios-api-verification/02-03-REPORT-RESTAURANT.md` | Complete iOS Restaurant app API verification report with Summary section | VERIFIED | 167 lines, 38 OK rows, 6 mismatch references, Summary section present |
| `.planning/phases/02-ios-api-verification/FIX_PLAN.md` | Consolidated fix plan with `## Critical` section | VERIFIED | 90 lines, `## Critical Mismatches` at line 15, Summary + Phase 04 blocker status + Estimated Total Effort all present |

---

## Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `apps/ios/eatfair-ios-shared/Sources/EatFairShared/Services/P2PAPIService.swift` | `apps/web/p2p-platform/backend/main_new.py` | URL path matching (Customer) | WIRED | 88 customer-facing functions cross-referenced; line references recorded in report (e.g., `/api/vendors/published` → `main_new.py:10278`) |
| `apps/ios/eatfair-ios-shared/Sources/EatFairShared/Services/P2PAPIService.swift` | `apps/web/p2p-platform/backend/main_new.py` | URL path matching (Driver) | WIRED | 52 driver functions cross-referenced; backend alias architecture at lines 21026-21060 documented |
| `apps/ios/eatfair-ios-shared/Sources/EatFairShared/Services/P2PAPIService.swift` | `apps/web/p2p-platform/backend/main_new.py` | URL path matching (Restaurant) | WIRED | 39 vendor functions cross-referenced; `promotions.py`, `order_flow.py` routes verified |
| iOS source files | Report mismatches | TODO comments at call sites | WIRED | 23 `// TODO: [SEVERITY] API mismatch` comments confirmed in actual iOS files across 7 service files |
| `apps/ios/Config/Production.xcconfig` | `https://api.dollor.ai` | API_BASE_URL config | WIRED | Confirmed: `API_BASE_URL = https:/$()/api.dollor.ai` |
| `apps/ios/Config/Staging.xcconfig` | `https://d34u5ixl0bulv4.cloudfront.net` | API_BASE_URL config | WIRED | Confirmed: `API_BASE_URL = https:/$()/d34u5ixl0bulv4.cloudfront.net` |

---

## Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|-------------|-------------|--------|----------|
| API-01 | 02-01-PLAN.md | All iOS Customer app API calls verified against actual backend routes | SATISFIED | 163 calls verified, commit e35546b9, REQUIREMENTS.md marked [x] |
| API-02 | 02-02-PLAN.md | All iOS Driver app API calls verified against actual backend routes | SATISFIED | 53 calls verified, commit 812d0e9b, REQUIREMENTS.md marked [x] |
| API-03 | 02-03-PLAN.md | All iOS Restaurant app API calls verified against actual backend routes | SATISFIED (implementation) / BLOCKED (documentation) | 40 calls verified, commit 1e99f13a — but REQUIREMENTS.md still shows `[ ]` at line 12 and `Pending` at line 58. Work is done; tracking artifact is stale. |

### Orphaned Requirements

No requirements mapped to Phase 02 in REQUIREMENTS.md outside of API-01, API-02, API-03.

---

## Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `.planning/REQUIREMENTS.md` | 12, 58 | `[ ] API-03` and `Pending` — stale status after work completed | Warning | Downstream reader believes Restaurant verification is incomplete; could cause unnecessary re-execution |
| `.planning/REQUIREMENTS.md` | 79 | `Last updated: 2026-02-22 -- API-01 complete` | Warning | Stale update note does not reflect API-02 or API-03 completion |
| `.planning/ROADMAP.md` | (02-03-PLAN.md line) | `- [ ] 02-03-PLAN.md` — plan checkbox not checked after execution | Warning | ROADMAP shows plan as incomplete when it was executed (commit 1e99f13a) |

**Note:** These are documentation staleness issues, not code anti-patterns. The phase goal (verify and document) was achieved. These stale checkboxes do not block the goal but could mislead future agents or humans reviewing project state.

---

## Human Verification Required

None. This phase is audit/documentation only — all outputs are files that can be read and verified programmatically.

---

## Gaps Summary

### The core finding

The phase goal was achieved: all 3 iOS apps were audited, 256 total API calls were verified (163 Customer + 53 Driver + 40 Restaurant), 51 mismatches were documented, and a consolidated FIX_PLAN.md with prioritized fix order and Phase 04 blocker status was created. 23 TODO comments were placed in actual iOS source files at mismatch call sites.

### The gap

REQUIREMENTS.md and ROADMAP.md were not updated to reflect completion of the Restaurant app verification (API-03). The stale tracking state means:

- Any process reading REQUIREMENTS.md to determine if Phase 02 is complete will conclude it is not (API-03 still shows `[ ]`)
- The ROADMAP.md plan list shows 02-03-PLAN.md as `[ ]` even though commit `1e99f13a` (`feat(02-03): verify iOS Restaurant app API calls + consolidated FIX_PLAN`) exists

The fix is minimal: update 3 lines in REQUIREMENTS.md and 1 line in ROADMAP.md.

### Key mismatches found (for reference — phase goal was to document, not fix)

Total: 51 mismatches across 3 apps

**Critical (must fix before Phase 04):**
1. Driver: `uploadDriverDocument` — backend alias maps POST to wrong handler; uploads silently fail
2. Driver: `fetchRideChatMessages` + `sendRideChatMessage` — use `customerToken` instead of `driverToken`; rideshare chat broken for drivers (401s)

**Medium (should fix before Phase 04):**
4. Driver: `saveDriverFCMToken` — PUT vs POST → 405, push notifications broken
5. Customer: `updateCustomerProfile` — path `/api/customer/{id}/profile` does not exist
6. Restaurant: `updateMenuItem` + `toggleItemAvailability` — PATCH vs PUT → 405, menu editing broken
7. Restaurant: `assignStockImages` — missing vendorToken → 401
8. Restaurant: `getAIEmployeeStats` — missing auth header → 401

**Dead code (40 of 51 mismatches):** 5 service files (TripBoardService, NegotiationService, ChatService, CallService, DollorV3Service, ACHPaymentService) and partial LegalService have no backend routes — aspirational code never wired to a backend.

---

## Verification Methodology

- Artifact existence: confirmed via file read and line counts
- Substantiveness: confirmed `OK` row counts (98/49/38 respectively), section headers, and backend line references
- Commits: verified e35546b9, 812d0e9b, 1e99f13a exist in git log
- TODO comments: grepped actual iOS source files — 23 comments confirmed
- Base URL configs: read Production.xcconfig and Staging.xcconfig directly
- Requirements cross-reference: checked REQUIREMENTS.md lines 10-58 against plan frontmatter

---

_Verified: 2026-02-22_
_Verifier: Claude (gsd-verifier)_
