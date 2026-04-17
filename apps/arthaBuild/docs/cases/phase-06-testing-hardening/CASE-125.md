---
id: CASE-125
title: "POST /api/auth/login returns identical error for wrong password vs unknown email"
phase: "06"
phase_name: "Testing & Hardening"
category: FEATURE_TEST
severity: INFO
status: PASS
created: 2026-04-10
updated: 2026-04-10
assignee: "Kiran"
agent: "gsd-verifier"
blocks: []
blocked_by: []
feature: "POST /api/auth/login (anti-enumeration)"
test_ref: "tests/test_security.py::test_login_no_enumeration"
files:
  - path: src/backend/routers/auth.py
    lines: ""
---

## Why This Case Was Created
Verifies that the login endpoint returns the same HTTP status code and error detail string
for two distinct failure conditions: (a) an email that does not exist, and (b) a known email
with an incorrect password. Differentiating these responses allows attackers to enumerate
valid email addresses by observing the error text.

## What Is Wrong
N/A — this test PASSES. If this case ever changes to status: FAIL, investigate:
- `routers/auth.py` — the login handler may have separate branches for "user not found" vs
  "wrong password" that return different `detail` strings (e.g., "User not found" vs
  "Incorrect password")
- A refactor may have introduced an early 404 return for unknown emails before the password
  check, distinguishing the two failure modes by HTTP status code
- An ORM change may have caused the handler to raise a DB exception instead of returning a
  generic 401, leaking the failure type through the exception class

## Why It Was Done This Way (Root Cause)
The `login()` handler uses a single code path that always returns
`HTTPException(status_code=401, detail="Invalid credentials")` for both "email not found"
and "password mismatch" cases. The password is checked with `bcrypt.verify()` only after
finding the user; if the user is not found a dummy check is run to prevent timing
differences. The test asserts that both attempts return 401 and the same `detail` string.

## What Is Done Right
- Tests both failure paths (unknown email, wrong password) in the same test function
- Asserts identical HTTP status code (401) for both
- Asserts identical `detail` message for both, preventing even text-based enumeration

## How To Fix It
**This test is passing.** To run it:
```bash
cd src/backend
pytest tests/test_security.py::test_login_no_enumeration -v
```

## Architecture Mapping

**Layer:** Backend Router → Auth Logic

**Flow:**
    POST /api/auth/login {email: "unknown@x.com", password: "any"}
      → routers/auth.py:login()
        → user = query by email → None
          → (dummy bcrypt verify to avoid timing leak)
            → raise HTTPException(401, "Invalid credentials")  ← Path A

    POST /api/auth/login {email: "known@x.com", password: "wrong"}
      → routers/auth.py:login()
        → user = query by email → found
          → bcrypt.verify("wrong", user.hashed_password) → False
            → raise HTTPException(401, "Invalid credentials")  ← Path B
              (THIS TEST COVERS BOTH — asserts same message)

**Upstream:** Attacker submitting email guesses to determine valid accounts
**Downstream:** Both paths return identical 401 — no information leakage

## Verification
- [ ] Test passes: `pytest tests/test_security.py::test_login_no_enumeration -v`

## Downstream Impact
**Impact if unfixed:** Attackers can enumerate all registered email addresses by observing
login error messages, enabling targeted credential stuffing and phishing campaigns.

## Links
- Phase SUMMARY: `.planning/phases/06-testing-hardening/06-01-SUMMARY.md`
- Architecture doc: `docs/ARCHITECTURE.md`
- Related cases: CASE-124 (check-user no user_id), CASE-126 (forgot-password no enumeration)
