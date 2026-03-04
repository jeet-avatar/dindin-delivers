---
phase: quick-79
plan: 79
subsystem: api-audit
tags: [anti-hallucination, api-alignment, customer-app, audit]
dependency_graph:
  requires: []
  provides: [customer-api-alignment-audit]
  affects: [ios-customer, android-customer, backend]
tech_stack:
  added: []
  patterns: [grep-verified-audit, cross-platform-alignment]
key_files:
  created:
    - .planning/quick/79-anti-hallucination-full-stack-api-alignm/CUSTOMER_API_ALIGNMENT_AUDIT.md
  modified: []
decisions:
  - "Android Apple Auth path mismatch is HIGH priority fix (DollorApiService.kt:51 uses wrong route)"
  - "11 dead endpoints in Android shared services (ChatService, NegotiationService, CallService) are aspirational and not called from customer UI"
  - "FCM token registration uses different paths on iOS vs Android -- both work but different contracts"
metrics:
  duration: 7m
  completed: 2026-03-04
  tasks_completed: 1
  tasks_total: 1
  files_created: 1
  files_modified: 0
---

# Quick Task 79: Customer App API Alignment Audit Summary

Full-stack anti-hallucination audit of every customer API call in iOS and Android against backend routes, with grep-verified line citations for every PASS/FAIL verdict.

## Results

- **79 unique endpoints audited** across iOS (P2PAPIService.swift) and Android (DollorApiService.kt + CustomerRideshareApiService.kt)
- **67 PASS** -- endpoint exists, method matches, auth pattern correct
- **5 FAIL** -- 1 HIGH (Android Apple Auth path mismatch), 4 LOW (dead code in shared services)
- **7 WARNING** -- cross-platform path divergences, non-blocking

## Key Findings

### HIGH Priority
1. **Android Apple Auth path broken**: `DollorApiService.kt:51` uses `@POST("auth/customer/apple-auth")` but backend only registers `/api/customer/apple-auth` (main_new.py:5814). Android customers using Apple Sign-In may get 404.

### Dead Code (11 endpoints)
- `ChatService.kt`: 5 endpoints for aspirational live chat (conversations, messages, read)
- `NegotiationService.kt`: 4 endpoints for aspirational negotiation service
- `CallService.kt`: 4 endpoints for aspirational voice call service (sessions, masked-number, initiate, logs)
- None of these are called from customer app UI flow

### Cross-Platform Divergences (non-blocking)
- Ride tracking: iOS `/api/erp/rides/{id}/track` vs Android `/api/rides/{id}/track` (both work)
- Profile update: iOS `/api/auth/customer/profile` vs Android `/api/customer/{id}/profile` (both work)
- FCM token: iOS `/api/erp/customers/{id}/fcm-token` vs Android `/api/notifications/register-token` (different contracts)

## Commits

| Task | Commit | Description |
|------|--------|-------------|
| 1 | c4db7439 | Customer API alignment audit (79 endpoints, 67 PASS, 5 FAIL, 7 WARNING) |

## Deviations from Plan

None -- plan executed exactly as written.

## Actionable Fixes (for future tasks)

1. **[HIGH] Fix Android Apple Auth path** -- change `auth/customer/apple-auth` to `customer/apple-auth` in DollorApiService.kt OR add backend alias
2. **[MEDIUM] Standardize FCM token registration** across platforms
3. **[MEDIUM] Guard dead shared services** behind SHOW_AI_FEATURES flag
4. **[LOW] Wire up Android notification endpoints** to backend (currently uses fake data)
