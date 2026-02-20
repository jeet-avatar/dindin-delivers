# Phase 01: Unit Test Fixes — Align Tests with Production Code

## Goal
Fix all 17 unit test failures caused by tests being stale/behind production code changes. Tests were written against old behavior; production code has since been updated. Every fix aligns the test assertion with the verified production source of truth.

## Scope
- 6 test files, 7 distinct changes, covering 17 individual test failures
- 0 production logic changes (except Change 7: demo email allowlist which is a targeted production enhancement)
- Backend only: `apps/web/p2p-platform/backend/`

## Success Criteria
- All 356 tests pass (353 currently passing + 3 remaining)
- Zero regressions in existing passing tests
- Every change traceable to a production source of truth

---

## Tasks

### Task 1: Fix tax rate assertions (9% → 6%) ✅ DONE
**File**: `tests/unit/test_api_config.py:74`
**Change**: `assert config["taxRate"] == 0.09` → `assert config["taxRate"] == 0.06`
**Source of truth**: `main_new.py:1341` — `"taxRate": 0.06`
**Tests fixed**: 1

### Task 2: Fix tax rate in pricing model test ✅ DONE
**File**: `tests/unit/test_dollor_pricing_model.py:171-173`
**Change**: Method renamed `test_config_tax_rate_is_six_percent`, assert `0.09` → `0.06`
**Source of truth**: `main_new.py:1341` — `"taxRate": 0.06`
**Tests fixed**: 1

### Task 3: Add PENDING_DELIVERY_PROOF to OrderStatus count ✅ DONE
**File**: `tests/unit/test_models.py:152-155`
**Change**: Added `assert OrderStatus.PENDING_DELIVERY_PROOF.value == "pending_delivery_proof"`, count 13 → 14
**Source of truth**: `models.py:404` — `PENDING_DELIVERY_PROOF = "pending_delivery_proof"`
**Tests fixed**: 1

### Task 4: Add ONLINE to DriverStatus count ✅ DONE
**File**: `tests/unit/test_models.py:174-176`
**Change**: Added `assert DriverStatus.ONLINE.value == "online"`, count 5 → 6
**Source of truth**: `models.py:708` — `ONLINE = "online"`
**Tests fixed**: 1

### Task 5: Fix SMTP timeout assertion ✅ DONE
**File**: `tests/unit/test_email_service.py:59`
**Change**: `assert_called_once_with('smtp.gmail.com', 587)` → `assert_called_once_with('smtp.gmail.com', 587, timeout=30)`
**Source of truth**: `email_service.py:323` — `smtplib.SMTP(SMTP_HOST, SMTP_PORT, timeout=30)`
**Tests fixed**: 1

### Task 6: Patch IS_PRODUCTION=False on 11 test methods ✅ DONE
**Files**: `tests/unit/test_email_service.py` (10 methods), `tests/unit/test_stripe_integration.py` (1 method)
**Change**: Added `@patch('email_service.IS_PRODUCTION', False)` decorator
**Source of truth**: `email_service.py:410` — production validates recipients in DB; test emails don't exist in DB
**Tests fixed**: 11 (9 in TestSendEmail, 2 in TestEmailEdgeCases, 1 in TestCreateOrder [stripe])

### Task 7: Fix order number prefix assertion ✅ DONE
**File**: `tests/unit/test_stripe_integration.py:239`
**Change**: `startswith("ORD-")` → `startswith("DOLL") or startswith("ORD-")`
**Source of truth**: `stripe_integration.py:247` — `f"DOLL{datetime.now().year}{order_count + 1:03d}"`
**Tests fixed**: 1

### Task 8: Add demo email allowlist to production validation ✅ DONE
**File**: `email_service.py:192-200` (production code)
**Change**: Added allowlist for 3 demo emails that bypass DB validation
**Source of truth**: CLAUDE.md demo credentials — these emails must work for App Store review
**Tests fixed**: 0 (enables email flow for demo accounts, not a test fix)

### Task 9: Fix driver approval email subject assertion — "Approved" → "ACTION REQUIRED" ✅ DONE
**File**: `tests/unit/test_email_service.py` — `TestSendDriverApprovalEmail::test_driver_approval_email_success`
**Change**: `assert "Approved" in call_args[1]` → `assert "ACTION REQUIRED" in call_args[1]`
**Source of truth**: `email_service.py:767` — `subject = f"ACTION REQUIRED: Activate Your Dollor.AI Driver Account"`
**Tests fixed**: 1
**Done criteria**: Test passes, assertion matches production subject line

### Task 10: Fix driver approval email driver_code assertion ✅ DONE
**File**: `tests/unit/test_email_service.py` — `TestSendDriverApprovalEmail::test_driver_approval_email_contains_driver_code`
**Change**: Update subject assertion from "Approved" to "ACTION REQUIRED"
**Source of truth**: `email_service.py:767`
**Tests fixed**: 1
**Done criteria**: Test passes, driver_code still verified in body

### Task 11: Fix driver approval email login_link assertion ✅ DONE
**File**: `tests/unit/test_email_service.py` — `TestSendDriverApprovalEmail::test_driver_approval_email_contains_login_link`
**Change**: Update subject assertion from "Approved" to "ACTION REQUIRED"
**Source of truth**: `email_service.py:767`
**Tests fixed**: 1
**Done criteria**: Test passes, login link still verified in body

---

## Verification Plan
1. Run `pytest tests/unit/ -v --tb=short` — all 356 tests must pass
2. Confirm 0 failures, 0 errors in the 5 target test files
3. Grep for any remaining `"Approved"` assertions in test_email_service.py — should be 0
4. Verify no production behavior changed (only test assertions updated for tasks 9-11)
