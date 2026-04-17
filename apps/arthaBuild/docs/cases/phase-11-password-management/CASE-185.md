---
id: CASE-185
title: "POST /api/user/resend-verification resends email verification link"
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
feature: "POST /api/user/resend-verification"
test_ref: "tests/test_user.py"
files:
  - path: src/backend/routers/user.py
    lines: ""
---

## Why This Case Was Created
New users must verify their email address before accessing the product. If the initial verification email is not received (spam folder, wrong email), users need a way to resend it. The resend endpoint must: validate the user exists, is not already verified, and rate-limit resend requests to prevent email abuse. No test verifies this endpoint.

## What Is Wrong
No test exists for this behavior. The resend verification endpoint is planned for Phase 11 with no existing implementation.

## Why It Was Done This Way (Root Cause)
No code exists yet for this feature — it is planned for Phase 11. Email sending infrastructure is needed (SMTP or AWS SES). The `User.email_verified` and `User.email_verification_token` fields are planned for this phase.

## What Is Done Right
The auth registration endpoint issues a verification token. The email infrastructure (SMTP settings) is configured via environment variables. Rate limiting patterns exist in the codebase.

## How To Fix It
Write the following test in `tests/test_user.py`:

```python
@pytest.mark.asyncio
async def test_resend_verification_succeeds_for_unverified_user(client, db_session, test_user):
    """
    Verify POST /api/user/resend-verification sends a new verification email
    for an unverified user.
    """
    test_user.email_verified = False
    db_session.commit()

    with patch("src.backend.routers.user.send_verification_email") as mock_send:
        mock_send.return_value = True

        resp = await client.post(
            "/api/user/resend-verification",
            json={"email": test_user.email},
        )
        assert resp.status_code == 200
        mock_send.assert_called_once()


@pytest.mark.asyncio
async def test_resend_verification_returns_400_for_already_verified_user(client, db_session, test_user):
    """Verify already-verified users cannot trigger resend."""
    test_user.email_verified = True
    db_session.commit()

    resp = await client.post(
        "/api/user/resend-verification",
        json={"email": test_user.email},
    )
    assert resp.status_code == 400


@pytest.mark.asyncio
async def test_resend_verification_returns_404_for_unknown_email(client):
    """Verify unknown email returns 404."""
    resp = await client.post(
        "/api/user/resend-verification",
        json={"email": "nobody@example.com"},
    )
    assert resp.status_code == 404
```

## Architecture Mapping

**Layer:** User Management / Email Verification (Backend)

**Flow:**
    POST /api/user/resend-verification → check user exists and unverified → rate check → send_verification_email() → 200 ← NO TEST EXISTS HERE

**Upstream:** New user who did not receive or lost the verification email
**Downstream:** If broken, users stuck in unverified state with no way to access the product

## Verification
- [ ] Write test: `pytest tests/test_user.py::test_resend_verification_succeeds_for_unverified_user -v` → PASS

## Downstream Impact
**Impact if unfixed:** Test gap — no automated regression detection for verification resend. New users get permanently stuck without a way to verify their account.

## Links
- Phase SUMMARY: `.planning/phases/11-password-management/11-01-SUMMARY.md`
- Architecture doc: `docs/ARCHITECTURE.md`
- Related cases: CASE-186, CASE-181
