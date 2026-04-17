---
id: CASE-169
title: "JWT_SECRET_KEY rotation invalidates old tokens gracefully"
phase: "08"
phase_name: "Launch Readiness"
category: FEATURE_TEST
severity: LOW
status: PASS
created: 2026-04-10
updated: 2026-04-11
assignee: "Suresh"
agent: "gsd-executor"
blocks: []
blocked_by: []
feature: "Secret rotation"
test_ref: ""
files:
  - path: src/backend/auth_utils.py
    lines: ""
---

## Why This Case Was Created
`JWT_SECRET_KEY` must be rotatable for security incidents (key compromise, periodic rotation). When the key is rotated, all existing tokens signed with the old key become invalid. Users should receive a 401 and be prompted to log in again — not a crash or a silent error. No test verifies that key rotation invalidates old tokens and triggers proper 401 responses.

## What Is Wrong
No test exists for this behavior. An unhandled `InvalidSignatureError` from PyJWT during key rotation could cause 500 errors instead of clean 401 responses.

## Why It Was Done This Way (Root Cause)
Phase 08 is the launch readiness phase. Key rotation handling is a planned security hardening task. The JWT verification code uses `jwt.decode()` which raises `InvalidSignatureError` on key mismatch. Whether this is caught and returned as 401 vs 500 depends on exception handling in the auth middleware.

## What Is Done Right
The JWT verification uses PyJWT with HS256. The auth middleware exists. The `JWT_SECRET_KEY` is loaded from environment variables. A key rotation runbook is planned.

## How To Fix It
Write the following test in `tests/test_auth.py`:

```python
@pytest.mark.asyncio
async def test_jwt_key_rotation_invalidates_old_tokens(client):
    """
    Verify that after JWT_SECRET_KEY rotation, tokens signed with the
    old key return 401 (not 500).
    """
    import jwt
    from datetime import datetime, timedelta

    old_secret = "old-secret-key-12345"
    new_secret = "new-secret-key-67890"

    # Create a token signed with the old key
    old_token = jwt.encode(
        {"sub": "user@example.com", "exp": datetime.utcnow() + timedelta(hours=1)},
        old_secret,
        algorithm="HS256",
    )

    # Simulate key rotation: backend now uses new_secret
    with patch("src.backend.auth_utils.JWT_SECRET_KEY", new_secret):
        resp = await client.get(
            "/api/chats",
            headers={"Authorization": f"Bearer {old_token}"},
        )
        # Must return 401 (not 500 or 200)
        assert resp.status_code == 401, (
            f"Expected 401 after key rotation, got {resp.status_code}. "
            "Server may be returning 500 instead of handling InvalidSignatureError."
        )
        data = resp.json()
        assert "detail" in data  # Should have error message, not traceback
```

## Architecture Mapping

**Layer:** Auth Middleware / Key Rotation (Backend)

**Flow:**
    GET /api/chats → verify_token(old_signed_token, new_key) → InvalidSignatureError → return 401 (not 500) ← NO TEST EXISTS HERE

**Upstream:** Security incident requiring immediate key rotation
**Downstream:** If 500 instead of 401, monitoring alerts on server errors and users see crashes instead of login prompts

## Verification
- [ ] Write test: `pytest tests/test_auth.py::test_jwt_key_rotation_invalidates_old_tokens -v` → PASS

## Downstream Impact
**Impact if unfixed:** Test gap — no automated regression detection for key rotation handling. A rotation during a security incident could cause 500s for all users instead of clean reauthentication.

## Links
- Phase SUMMARY: `.planning/phases/08-launch-readiness/08-01-SUMMARY.md`
- Architecture doc: `docs/ARCHITECTURE.md`
- Related cases: CASE-156, CASE-188
