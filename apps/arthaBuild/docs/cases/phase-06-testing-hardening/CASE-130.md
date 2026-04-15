---
id: CASE-130
title: "CORS is not configured with wildcard origin and credentials=True simultaneously"
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
feature: "CORS security (no wildcard + credentials)"
test_ref: "tests/test_security.py::test_cors_not_wildcard_with_credentials"
files:
  - path: src/backend/main.py
    lines: ""
---

## Why This Case Was Created
Verifies that the FastAPI `CORSMiddleware` is not configured with `allow_origins=["*"]` and
`allow_credentials=True` simultaneously. This combination is forbidden by the CORS
specification — browsers reject such responses — and indicates a misconfiguration that would
break authenticated cross-origin requests while providing a false sense of openness.

## What Is Wrong
N/A — this test PASSES. If this case ever changes to status: FAIL, investigate:
- `main.py` — `CORSMiddleware` may have been updated with `allow_origins=["*"]` while
  `allow_credentials=True` was left in place (e.g., by a developer trying to "open up" CORS
  for local testing)
- A deployment script may be overriding the CORS origin list at runtime with a wildcard
  via an environment variable that is being parsed incorrectly

## Why It Was Done This Way (Root Cause)
The test reads the `CORSMiddleware` configuration from `main.py` (via `inspect.getsource`
or by importing and inspecting the app's middleware stack) and asserts that when
`allow_credentials=True`, the `allow_origins` list does not contain `"*"`. The correct
configuration uses explicit origin allowlists (e.g., `["http://localhost:5173",
"https://app.arthaBuild.com"]`) so that browsers can honour the `Access-Control-Allow-Credentials`
header. Wildcard + credentials is both a browser error and a security indicator.

## What Is Done Right
- Reads the actual middleware configuration rather than making a live HTTP request, catching
  misconfigurations at import time
- Checks both sides of the invalid combination: only fails if BOTH `allow_credentials=True`
  AND `"*"` in `allow_origins` are true simultaneously
- Single allowable wildcard with `allow_credentials=False` is not flagged

## How To Fix It
**This test is passing.** To run it:
```bash
cd src/backend
pytest tests/test_security.py::test_cors_not_wildcard_with_credentials -v
```
If failing, update `main.py` to use an explicit origin list:
```python
allow_origins=["http://localhost:5173", "https://your-domain.com"],
allow_credentials=True,
```

## Architecture Mapping

**Layer:** FastAPI Middleware Configuration → Browser CORS Policy

**Flow:**
    test_cors_not_wildcard_with_credentials()
      → inspect CORSMiddleware config in main.py
        → if allow_credentials == True:
            assert "*" not in allow_origins  ← THIS TEST COVERS THIS

    Browser runtime:
      Fetch with credentials: "include" to /api/chats
        → server sends Access-Control-Allow-Origin: https://app.arthaBuild.com
          → browser allows (explicit origin) → request succeeds

**Upstream:** Frontend React app making authenticated API calls from a browser
**Downstream:** Correct CORS response allows credentialed requests from allowed origins only

## Verification
- [ ] Test passes: `pytest tests/test_security.py::test_cors_not_wildcard_with_credentials -v`

## Downstream Impact
**Impact if unfixed:** If wildcard + credentials is set, browsers silently block all
authenticated cross-origin requests, making the API completely unusable from the frontend.
Conversely, if discovered by a security auditor, the misconfiguration is flagged as a
CORS bypass vulnerability even though browsers already block it.

## Links
- Phase SUMMARY: `.planning/phases/06-testing-hardening/06-01-SUMMARY.md`
- Architecture doc: `docs/ARCHITECTURE.md`
- Related cases: CASE-127 (no OpenAI keys), CASE-128 (rate limit), CASE-129 (weak JWT secret)
