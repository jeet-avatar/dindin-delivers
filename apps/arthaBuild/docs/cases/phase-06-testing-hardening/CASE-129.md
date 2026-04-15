---
id: CASE-129
title: "JWT_SECRET_KEY is not a known weak default value"
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
feature: "JWT secret strength check"
test_ref: "tests/test_security.py::test_weak_jwt_default_not_present"
files:
  - path: src/backend/main.py
    lines: ""
  - path: src/backend/routers/auth.py
    lines: ""
---

## Why This Case Was Created
Verifies that the `JWT_SECRET_KEY` environment variable is not set to a known-weak default
value such as `"secret"`, `"changeme"`, `"default"`, or an empty string. A weak or default
JWT secret allows attackers to forge arbitrary tokens, bypassing authentication entirely.

## What Is Wrong
N/A — this test PASSES. If this case ever changes to status: FAIL, investigate:
- The test environment's `.env` or `conftest.py` may be setting `JWT_SECRET_KEY` to one of
  the known-weak values listed above
- A new test fixture may have introduced `JWT_SECRET_KEY = "secret"` for convenience without
  updating the secret to a strong random value
- The production Docker Compose or Terraform may be using a placeholder default that was
  inadvertently used in the test environment as well

## Why It Was Done This Way (Root Cause)
The test reads `os.environ.get("JWT_SECRET_KEY", "")` and asserts it is not in the set
`{"", "secret", "changeme", "default", "changeit", "your-secret-key"}`. The test does not
require a specific minimum entropy level (which would be impractical to measure), but blocks
the most common copy-paste mistakes from tutorial configurations. In the test environment,
`conftest.py` sets `JWT_SECRET_KEY` to a randomly generated value of sufficient length.

## What Is Done Right
- Checks the actual runtime value of the secret (not just whether the variable is set)
- Uses a denylist of the most common weak defaults drawn from known security incidents
- Fails immediately with a clear message if a weak default is detected

## How To Fix It
**This test is passing.** To run it:
```bash
cd src/backend
pytest tests/test_security.py::test_weak_jwt_default_not_present -v
```
If failing in CI, ensure `JWT_SECRET_KEY` is set to a strong random value (at least 32
random bytes, hex-encoded) in the CI environment or `conftest.py`.

## Architecture Mapping

**Layer:** Environment Configuration → JWT Signing

**Flow:**
    test_weak_jwt_default_not_present()
      → os.environ.get("JWT_SECRET_KEY")
        → assert value not in KNOWN_WEAK_DEFAULTS  ← THIS TEST COVERS THIS

    Runtime:
      create_access_token(...)
        → jwt.encode(payload, JWT_SECRET_KEY, algorithm="HS256")
          → strong secret → token cannot be forged offline

**Upstream:** Deployment configuration (Docker Compose env, AWS Secrets Manager)
**Downstream:** All JWT signatures use the strong secret; forged tokens are rejected

## Verification
- [ ] Test passes: `pytest tests/test_security.py::test_weak_jwt_default_not_present -v`

## Downstream Impact
**Impact if unfixed:** An attacker who knows (or guesses) the weak JWT secret can sign
arbitrary payloads, creating admin tokens for any user ID and bypassing all RBAC controls.

## Links
- Phase SUMMARY: `.planning/phases/06-testing-hardening/06-01-SUMMARY.md`
- Architecture doc: `docs/ARCHITECTURE.md`
- Related cases: CASE-128 (rate limit), CASE-130 (CORS), CASE-119 (JWT role claim), CASE-120 (JWT jti claim)
