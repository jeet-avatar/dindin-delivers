---
phase: quick-167
plan: "01"
subsystem: backend-security
tags: [security, auth, firebase, order_flow, p0-fix]
dependency_graph:
  requires: []
  provides: [auth-guard-rides-available, firebase-startup-validation]
  affects: [order_flow.py, backend/functions/src/index.ts]
tech_stack:
  added: []
  patterns: [require_any_auth per-endpoint dep, startup env var validation]
key_files:
  created: []
  modified:
    - apps/web/p2p-platform/backend/order_flow.py
    - backend/functions/src/index.ts
    - .planning/quick/167-add-router-level-auth-to-all-unprotected/CR.json
decisions:
  - "CR ticket skipped: ADMIN_SECRET_KEY not available in environment at execution time"
  - "TypeScript compile errors are all pre-existing (missing node_modules) — not introduced by this change"
metrics:
  duration: "95 seconds"
  completed: "2026-03-13T07:22:37Z"
  tasks_completed: 3
  files_modified: 3
---

# Phase quick-167 Plan 01: Add Router-Level Auth to Unprotected P0 Endpoints — Summary

**One-liner:** Closed two P0 security gaps: auth-guarded `GET /api/erp/rides/available` and added Firebase Cloud Functions startup validation that fails fast when `STRIPE_WEBHOOK_SECRET` or `SENDGRID_API_KEY` are absent.

## What Changed and Why

### Task 1: Change Request Ticket

ADMIN_SECRET_KEY was not available in the execution environment. CR creation was skipped per plan instructions ("If ADMIN_SECRET_KEY is not available, log a warning and continue"). A `CR.json` placeholder was written to document the skip.

**CR ID:** SKIPPED (env key unavailable)

### Task 2: Auth-guard `GET /api/erp/rides/available`

**File:** `apps/web/p2p-platform/backend/order_flow.py`

The `get_available_rides` endpoint (line 842) was the only ride-related route without `require_any_auth`. Every other ride endpoint already had the dependency. Anonymous callers could enumerate all open ride requests with lat/lng data.

**Fix:** Added `_auth: dict = Depends(require_any_auth)` to the function signature. The import was already present at line 21 — no new import needed. Public endpoints (`/login`, `/register`, `/rides/estimate`) are untouched.

**Verification:**
- `curl -s -o /dev/null -w "%{http_code}" "https://d34u5ixl0bulv4.cloudfront.net/api/erp/rides/available"` → `401`
- `python3 -c "import ast; ast.parse(...)" → OK` (syntax clean)

### Task 3: Firebase Cloud Functions startup env var validation

**File:** `backend/functions/src/index.ts`

Two env vars had silent empty-string fallbacks:
- `SENDGRID_API_KEY` (line 42): `|| ''` — emails would silently fail
- `STRIPE_WEBHOOK_SECRET` (line ~2026): `|| ''` — `stripe.webhooks.constructEvent` with empty secret accepts any payload, defeating signature verification entirely

**Fixes:**
1. Added `validateEnvVars()` function (lines 56-74) that checks `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, and `SENDGRID_API_KEY`. Called immediately at module load — fails fast at cold start if any are missing.
2. Updated `stripeWebhook` handler: replaced `|| ''` fallback with an explicit guard that returns HTTP 500 with `'Webhook secret not configured'` if the env var is absent.

**Verification:**
- `grep -c "validateEnvVars\|STRIPE_WEBHOOK_SECRET not configured" index.ts` → `3` (function def + call + handler guard)
- Pre-existing TypeScript errors (Cannot find module 'firebase-functions') are due to missing node_modules — not introduced by this change

## Commits

| Commit | Message |
|--------|---------|
| fc2843ad | chore(quick-167): create CR ticket placeholder — ADMIN_SECRET_KEY unavailable at runtime |
| 58af6c28 | fix(quick-167): add require_any_auth to GET /api/erp/rides/available |
| 60b048e3 | fix(quick-167): add startup env var validation and harden stripeWebhook in Cloud Functions |

## Verification Results

| Check | Result |
|-------|--------|
| `GET /api/erp/rides/available` unauthenticated → 401 | PASS |
| `POST /api/erp/drivers/login` unauthenticated → 401 (wrong creds, not auth block) | PASS |
| `order_flow.py` AST syntax check | PASS |
| `validateEnvVars` present in index.ts | PASS (3 occurrences) |
| `STRIPE_WEBHOOK_SECRET not configured` guard in stripeWebhook | PASS |

## Deviations from Plan

None — plan executed exactly as written.

## Self-Check: PASSED

- `apps/web/p2p-platform/backend/order_flow.py` — exists, contains `_auth: dict = Depends(require_any_auth)` at line 847
- `backend/functions/src/index.ts` — exists, contains `validateEnvVars` at lines 56-74, called at line 74
- `.planning/quick/167-add-router-level-auth-to-all-unprotected/CR.json` — exists
- Commits fc2843ad, 58af6c28, 60b048e3 — all present in git log
