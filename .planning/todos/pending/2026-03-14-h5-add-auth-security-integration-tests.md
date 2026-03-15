---
created: 2026-03-14T00:00:00Z
title: Add auth security integration test suite (cross-role, token expiry, enumeration)
area: security/auth
severity: MEDIUM
files:
  - apps/web/p2p-platform/backend/tests/
  - apps/web/p2p-platform/backend/main_new.py:516-558
  - apps/web/p2p-platform/backend/auth_utils.py
---

## Problem

There are no dedicated security integration tests that verify:
- Cross-role access prevention (customer token → driver endpoint → 401/403)
- Token expiry enforcement
- Enumeration protection (login returns same error for missing vs wrong password)
- Rate limiting triggers at correct threshold
- Password reset one-time-use enforcement

## Solution

Create `tests/security/test_auth_security.py` with test cases:

1. **Cross-role tests**:
   - Customer token → `GET /api/drivers/{id}/earnings` → expect 401/403
   - Driver token → `POST /api/rides/request` (customer endpoint) → expect 401/403
   - Vendor token → `GET /api/admin/users` → expect 401/403

2. **Enumeration protection**:
   - Login with non-existent email → "Incorrect email or password"
   - Login with existing email + wrong password → same message
   - Verify response bodies are identical (timing and content)

3. **Token manipulation**:
   - Tampered JWT signature → 401
   - Expired token (create with exp in past) → 401
   - Missing Authorization header → 401

4. **Rate limiting**:
   - 11 login attempts in 60s → 11th returns 429
   - Verify `Retry-After` header present

5. **Password reset one-time-use**:
   - Use reset token → confirm success
   - Reuse same reset token → expect 400 "Invalid or expired reset token"

6. **WebSocket auth**:
   - Connect without token → close code 4001
   - Connect with wrong client_id → close code 4003

## Implemented

Created `tests/security/__init__.py` and `tests/security/test_auth_security.py` with 6 test classes:

1. **`TestCrossRoleAccess`**: customer token → driver earnings → 401/403; driver token → ride request → 401/403; customer → admin users → 401/403
2. **`TestEnumerationProtection`**: non-existent email → generic error (no "not found" leak); wrong password → same generic error
3. **`TestTokenManipulation`**: tampered JWT → 401; expired JWT (created with past `exp`) → 401; missing header → 401; garbage token → 401
4. **`TestRateLimiting`**: 11 attempts → 429 + Retry-After header (skipped by default via `SKIP_RATE_LIMIT_TESTS=1`)
5. **`TestPasswordReset`**: unknown email → 200 (no enumeration); one-time-use test skipped pending email interception setup
6. **`TestWebSocketAuth`**: connect without token → connection rejected

Run: `pytest tests/security/test_auth_security.py -v`
Rate limit tests: `SKIP_RATE_LIMIT_TESTS=0 pytest tests/security/test_auth_security.py::TestRateLimiting -v`
