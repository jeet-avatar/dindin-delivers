---
id: CASE-086
title: "GET /api/health includes suitecloud_ready field"
phase: "02"
phase_name: "NetSuite TBA Session"
category: FEATURE_TEST
severity: INFO
status: PASS
created: 2026-04-10
updated: 2026-04-10
assignee: "Kavya"
agent: "gsd-verifier"
blocks: []
blocked_by: []
feature: "GET /api/health (SuiteCloud readiness)"
test_ref: "tests/test_netsuite.py::test_health_includes_suitecloud_ready"
files:
  - path: src/backend/routers/health.py
    lines: "1-50"
---

## Why This Case Was Created
Verifies that the health endpoint exposes a `suitecloud_ready` boolean field indicating whether the SuiteCloud CLI is installed and reachable. The Phase 04 frontend uses this field to display a CLI installation warning to users before they attempt a deployment.

## What Is Wrong
N/A — this test PASSES. If this case ever changes to status: FAIL, investigate:
- `routers/health.py` (or `rawapi.py`) — confirm the health response dict includes a `suitecloud_ready` key; if the key was renamed or removed, the frontend will not receive the field
- The SuiteCloud CLI check — whether it uses `subprocess.run(["suitecloud", "--version"])` or checks for file existence; if the check method changed, the field may always return `False` even when the CLI is present
- Response schema — confirm the Pydantic model or dict returned by the health route includes `suitecloud_ready` as an explicit field, not a dynamic extra

## Why It Was Done This Way (Root Cause)
The health endpoint was extended in Phase 02 to include SuiteCloud CLI readiness alongside the base `{status: "ok"}` response. The check is implemented as a subprocess call or file existence check that detects whether `suitecloud` (the SuiteCloud CLI binary) is on the system PATH. In test environments, this typically returns `False` (CLI not installed in CI), which is a valid and expected result — the test asserts only that the field is present and is a boolean, not that it is `True`.

## What Is Done Right
This test establishes the contract between the backend health endpoint and the Phase 04 frontend: the `suitecloud_ready` key must always be present in the health response so the frontend can render the correct UI state (warning banner vs. clear status). The test is environment-agnostic — it accepts both `true` and `false` values, making it safe to run in CI without the CLI installed.

## How To Fix It
**This test is passing.** To run it:
```bash
cd src/backend
pytest tests/test_netsuite.py::test_health_includes_suitecloud_ready -v
```
If the test fails, check:
1. `routers/health.py` — confirm `suitecloud_ready` key is present in the response body
2. Confirm the value is a Python `bool` (not a string `"true"` or `None`)
3. If the health route was recently refactored, confirm the key was not accidentally dropped during the rewrite

## Architecture Mapping

**Layer:** Backend Router (health)

**Flow:**
    [GET /api/health]
      → [routers/health.py check_suitecloud_cli() → bool]
        → [return {status: "ok", suitecloud_ready: <bool>}]
                ↑ THIS TEST COVERS THE suitecloud_ready FIELD

**Upstream:** Phase 04 frontend polls GET /api/health on mount
**Downstream:** Frontend renders CLI installation warning if `suitecloud_ready: false`; deploy button may be disabled or show a pre-flight warning

## Verification
- [ ] Test passes: `pytest tests/test_netsuite.py::test_health_includes_suitecloud_ready -v`

## Downstream Impact
**Impact if unfixed:** Phase 04 frontend cannot detect whether the SuiteCloud CLI is installed. Users may attempt SuiteScript deployments and receive an opaque error instead of a clear "install the CLI first" message, degrading the onboarding experience.

## Links
- Phase SUMMARY: `.planning/phases/02-netsuite-tba-session/02-01-SUMMARY.md`
- Architecture doc: `docs/ARCHITECTURE.md`
- Related cases: CASE-087 (health returns 200), CASE-088 (health response shape), CASE-080 (deploy without TBA session)
