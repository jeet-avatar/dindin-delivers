---
id: CASE-089
title: "App startup raises RuntimeError when JWT_SECRET_KEY env var is missing"
phase: "01"
phase_name: "Foundation & Auth Backend"
category: FEATURE_TEST
severity: INFO
status: PASS
created: 2026-04-10
updated: 2026-04-10
assignee: "Arjun"
agent: "gsd-verifier"
blocks: []
blocked_by: []
feature: "App startup validation (JWT_SECRET_KEY)"
test_ref: "tests/test_health.py::test_startup_fails_without_jwt_secret_key"
files:
  - path: src/backend/rawapi.py
    lines: "848-855"
---

## Why This Case Was Created
Verifies that the ArthaBuild backend refuses to start when `JWT_SECRET_KEY` is absent from the environment. If the app started without a signing key, all JWTs would be signed with an empty string or default value — trivially forgeable by any attacker. The startup guard prevents silent auth bypass in misconfigured deployments.

## What Is Wrong
N/A — this test PASSES. If this case ever changes to status: FAIL, investigate:
- `rawapi.py:848-855` — confirm there is an explicit `os.environ["JWT_SECRET_KEY"]` check (or equivalent) that raises `RuntimeError` or `SystemExit` when the key is absent; if this check was removed, the app starts silently with a broken auth system
- Confirm the check runs at module import time or in a FastAPI startup event, not lazily on first JWT operation (lazy check means the app appears healthy until the first login attempt)
- Confirm the test patches or unsets `JWT_SECRET_KEY` from the environment before importing or starting the app — if the test environment always has the key set, the test may not actually exercise the guard

## Why It Was Done This Way (Root Cause)
`rawapi.py:848-855` checks `os.environ.get("JWT_SECRET_KEY")` at startup (module load or `@app.on_event("startup")`) and raises `RuntimeError("JWT_SECRET_KEY environment variable is required")` if the value is absent or empty. This is a fail-fast pattern: better to crash loudly at startup than to run silently with broken security. The CLAUDE.md project law specifies PyJWT with HS256 — HS256 with an empty key produces valid-looking tokens that can be forged by anyone who knows the algorithm.

## What Is Done Right
The test verifies the startup guard is active and wired correctly. It exercises the fail-fast behavior that protects against deployment misconfiguration — the most common source of "we deployed without secrets" production incidents. By catching this at startup rather than at first use, the error is surfaced immediately in CI and deployment logs.

## How To Fix It
**This test is passing.** To run it:
```bash
cd src/backend
pytest tests/test_health.py::test_startup_fails_without_jwt_secret_key -v
```
If the test fails, check:
1. `rawapi.py:848-855` — confirm the startup guard exists and raises `RuntimeError` (not just logs a warning)
2. Confirm the test correctly unsets `JWT_SECRET_KEY` before the module is imported or the app is instantiated
3. Confirm the error is raised early enough that the test can catch it — not after uvicorn starts accepting connections

## Architecture Mapping

**Layer:** Application Startup (environment validation)

**Flow:**
    [uvicorn starts rawapi.py — JWT_SECRET_KEY not set]
      → [rawapi.py:848-855 os.environ["JWT_SECRET_KEY"] → KeyError / os.environ.get() → None]
        → [raise RuntimeError("JWT_SECRET_KEY environment variable is required")]
          → [app fails to start — no routes registered]
                ↑ THIS TEST COVERS THIS GUARD

**Upstream:** Docker Compose / ECS task definition — must set `JWT_SECRET_KEY` in the environment
**Downstream:** All JWT signing and verification fails silently if this guard is absent

## Verification
- [ ] Test passes: `pytest tests/test_health.py::test_startup_fails_without_jwt_secret_key -v`

## Downstream Impact
**Impact if unfixed:** App starts with a missing or empty JWT signing key. All issued JWTs are signed with an empty secret and can be forged by any attacker who knows the algorithm is HS256. This bypasses the entire authentication system, giving any caller admin-level access to all protected endpoints.

## Links
- Phase SUMMARY: `.planning/phases/01-foundation-and-auth-backend/01-01-SUMMARY.md`
- Architecture doc: `docs/ARCHITECTURE.md`
- Related cases: CASE-087 (health returns 200), CASE-088 (health response shape), CASE-079 (expired JWT check)
