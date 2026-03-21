---
phase: quick-215
verified: 2026-03-21T19:00:00Z
status: human_needed
score: 4/4 must-haves verified
human_verification:
  - test: "Call /api/demo/reset-ride-state with ADMIN_SECRET_KEY and verify current production blocked state is cleared"
    expected: '{"success": true, "customer_email": "demo.customer@dollor.ai", "cancelled_rides": N, "has_unpaid_balance_cleared": true} — then log in as demo.customer and confirm has_unpaid_balance=false in profile'
    why_human: "ADMIN_SECRET_KEY is stored in AWS Secrets Manager and was not available in the executor or verifier shell. The endpoint is live and returns 403 (secured), but the actual state-clearing call cannot be made programmatically without the key."
---

# Phase quick-215: Fix Demo Customer Ride Request Blocked — Verification Report

**Phase Goal:** Fix demo.customer ride request blocked in production — extend /api/demo/setup and add /api/demo/reset-ride-state endpoint that clears has_unpaid_balance and cancels stuck OPEN/BIDDING rides for demo.customer.
**Verified:** 2026-03-21
**Status:** human_needed (all automated checks pass; one manual step requires ADMIN_SECRET_KEY)
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | demo.customer can request a ride after /api/demo/setup | VERIFIED | `main_new.py:19846-19861` — existing-customer branch cancels OPEN/BIDDING rides and clears `has_unpaid_balance` via SQL UPDATE after password reset |
| 2 | demo.customer can request a ride after /api/demo/reset-ride-state | VERIFIED | `main_new.py:20079-20113` — standalone endpoint cancels OPEN/BIDDING rides and clears `has_unpaid_balance` |
| 3 | OPEN/BIDDING rides for demo.customer are cancelled on reset | VERIFIED | ORM loop at `main_new.py:19852-19855` (setup) and `20097-20100` (reset endpoint) sets status to `RideRequestStatus.CANCELLED` |
| 4 | has_unpaid_balance is cleared to False for demo.customer on reset | VERIFIED | SQL UPDATE `has_unpaid_balance = false` at `main_new.py:19856-19859` (setup) and `20102-20105` (reset endpoint) |

**Score:** 4/4 truths verified

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `apps/web/p2p-platform/backend/main_new.py` | /api/demo/setup extended + /api/demo/reset-ride-state added | VERIFIED | `def reset_demo_ride_state` at line 20080; ride state reset block at lines 19846-19861 in `setup_demo_accounts` |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `/api/demo/setup` (line 19805) | `customers.has_unpaid_balance + ride_requests.status` | SQL UPDATE + ORM cancel loop | WIRED | Lines 19847-19861: `RideRequest.status.in_([OPEN, BIDDING])` → `CANCELLED` loop + `UPDATE customers SET has_unpaid_balance = false` |
| `/api/demo/reset-ride-state` (line 20079) | `customers.has_unpaid_balance + ride_requests.status` | `_require_admin_secret()` guard + same ORM/SQL pattern | WIRED | Lines 20084-20106: uses shared `_require_admin_secret()` helper (line 672), ORM cancel loop, SQL UPDATE, `db.commit()` |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|-------------|-------------|--------|----------|
| FIX-DEMO-RIDE-BLOCK | 215-PLAN.md | Clear ride state so demo.customer can request rides without 402/429 blocks | SATISFIED | Both endpoints implemented, deployed, and live on production (commit `2fcaca2a`, CI run `23386040742` success) |

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| None found | — | — | — | — |

No stub returns, no TODO/placeholder comments, no empty handlers found in the modified sections.

### Human Verification Required

#### 1. Clear Current Production Blocked State

**Test:** With ADMIN_SECRET_KEY from AWS Secrets Manager, run:
```bash
curl -s -X POST "https://api.dollor.ai/api/demo/reset-ride-state?secret_key=YOUR_ADMIN_SECRET_KEY" \
  | python3 -m json.tool
```
**Expected:** `{"success": true, "customer_email": "demo.customer@dollor.ai", "cancelled_rides": N, "has_unpaid_balance_cleared": true}`

Then verify end-state:
```bash
TOKEN=$(curl -s -X POST "https://api.dollor.ai/api/customers/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"demo.customer@dollor.ai","password":"DemoCustomer2025!"}' \
  | python3 -c "import sys,json; print(json.load(sys.stdin).get('access_token','NO_TOKEN'))")

curl -s -H "Authorization: Bearer $TOKEN" "https://api.dollor.ai/api/customers/profile" \
  | python3 -c "import sys, json; d=json.load(sys.stdin); print('has_unpaid_balance:', d.get('has_unpaid_balance', 'FIELD_NOT_IN_RESPONSE'))"
```
**Expected:** `has_unpaid_balance: False`

**Why human:** ADMIN_SECRET_KEY is not available in the executor or verifier shell — it lives in AWS Secrets Manager (`dollor/production/admin-yCDIFY`). The endpoint itself is confirmed live (returns 403 without the key).

### Gaps Summary

No code gaps. All four must-have truths are verified in the codebase. The single pending item is an operational step (calling the new endpoint with the admin key to clear the current production blocked state for demo.customer). This is a one-time manual action that cannot be automated without the secret.

**What is confirmed working:**
- Commit `2fcaca2a` merged to main
- Production CI run `23386040742` completed with conclusion: success
- `/api/demo/reset-ride-state` returns HTTP 403 on production (endpoint is live and secured)
- `/api/demo/setup` extended with full ride state reset logic in the existing-customer branch
- Python AST parse: OK — no syntax errors
- `_require_admin_secret()` shared helper at line 672 is used correctly — consistent with all other demo endpoints

---

_Verified: 2026-03-21_
_Verifier: Claude (gsd-verifier)_
