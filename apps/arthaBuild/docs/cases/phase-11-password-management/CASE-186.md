---
id: CASE-186
title: "Unverified users cannot access chat or NetSuite endpoints (403)"
phase: "11"
phase_name: "Password Management"
category: FEATURE_TEST
severity: LOW
status: DONE
created: 2026-04-10
updated: 2026-04-11
assignee: "Arjun"
agent: "gsd-executor"
blocks: []
blocked_by: []
feature: "Email verification enforcement"
test_ref: "tests/test_user.py"
files:
  - path: src/backend/routers/user.py
    lines: ""
  - path: src/backend/routers/chat.py
    lines: ""
---

## Why This Case Was Created
Email verification is only effective if unverified users are blocked from core functionality. An unverified user who can still access `/api/chat` and `/api/netsuite/*` renders the verification requirement meaningless. The auth middleware must check `email_verified` and return 403 for unverified users attempting to access protected features. No test verifies this enforcement.

## What Is Wrong
No test exists for this behavior. The email verification enforcement is planned for Phase 11 with no existing implementation.

## Why It Was Done This Way (Root Cause)
No code exists yet for this feature — it is planned for Phase 11. The `User.email_verified` field is planned. The enforcement should live in the auth middleware to avoid duplicating the check in every endpoint.

## What Is Done Right
The JWT auth middleware exists and is the right place to add the verification check. The `User.email_verified` field pattern is established. The `/api/user/resend-verification` endpoint (CASE-185) provides the escape hatch.

## How To Fix It
Write the following test in `tests/test_user.py`:

```python
@pytest.mark.asyncio
async def test_unverified_user_cannot_access_chat(client, db_session, test_user, auth_headers):
    """
    Verify that an unverified user receives 403 when attempting to access /api/chat.
    """
    test_user.email_verified = False
    db_session.commit()

    resp = await client.post(
        "/api/chat",
        json={"message": "Hello", "session_id": "s1"},
        headers=auth_headers,
    )
    assert resp.status_code == 403, (
        f"Expected 403 for unverified user on /api/chat, got {resp.status_code}"
    )
    data = resp.json()
    assert "verify" in str(data).lower() or "email" in str(data).lower()


@pytest.mark.asyncio
async def test_unverified_user_cannot_access_netsuite(client, db_session, test_user, auth_headers):
    """
    Verify unverified users are blocked from /api/netsuite/status.
    """
    test_user.email_verified = False
    db_session.commit()

    resp = await client.get("/api/netsuite/status", headers=auth_headers)
    assert resp.status_code == 403
```

## Architecture Mapping

**Layer:** Auth Middleware / Email Verification Enforcement (Backend)

**Flow:**
    request → JWT verify → check email_verified → 403 if False (except verify/resend endpoints) ← NO TEST EXISTS HERE

**Upstream:** User who registered but has not clicked the verification email
**Downstream:** If missing, unverified users (potentially bots or attackers) have full product access

## Verification
- [ ] Write test: `pytest tests/test_user.py::test_unverified_user_cannot_access_chat -v` → PASS

## Downstream Impact
**Impact if unfixed:** Test gap — no automated regression detection for verification enforcement. Email verification provides no security if not enforced.

## Links
- Phase SUMMARY: `.planning/phases/11-password-management/11-01-SUMMARY.md`
- Architecture doc: `docs/ARCHITECTURE.md`
- Related cases: CASE-185, CASE-181
