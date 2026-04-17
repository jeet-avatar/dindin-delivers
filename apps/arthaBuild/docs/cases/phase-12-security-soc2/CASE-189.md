---
id: CASE-189
title: "All responses include HSTS, X-Content-Type-Options, X-Frame-Options headers"
phase: "12"
phase_name: "Security & SOC2"
category: FEATURE_TEST
severity: MEDIUM
status: PASS
created: 2026-04-10
updated: 2026-04-11
assignee: "Aryan"
agent: "gsd-executor"
blocks: []
blocked_by: []
feature: "Security headers"
test_ref: ""
files:
  - path: nginx/nginx.conf
    lines: ""
  - path: src/backend/main.py
    lines: ""
---

## Why This Case Was Created
Security headers protect against common web attacks. HSTS prevents protocol downgrade attacks, `X-Content-Type-Options: nosniff` prevents MIME type sniffing, and `X-Frame-Options: DENY` prevents clickjacking. These headers are required for SOC2 compliance and pass security scanner checks. No test verifies these headers are present on all API responses.

## What Is Wrong
No test exists for this behavior. Security headers are planned for Phase 12 hardening. Without them, the system fails common security scanner tests.

## Why It Was Done This Way (Root Cause)
No code exists yet for this feature — it is planned for Phase 12. Security headers can be added at the Nginx level (affecting all responses) or via FastAPI middleware. The Nginx approach is preferred as it covers all responses uniformly.

## What Is Done Right
The Nginx configuration exists. FastAPI supports custom middleware for adding headers. The security headers themselves have no performance impact and are pure configuration additions.

## How To Fix It
Write the following test in `tests/security/test_security_headers.py`:

```python
import requests
import pytest

BASE_URL = "http://localhost:8000"

@pytest.mark.security
def test_security_headers_present_on_api_response():
    """
    Verify required security headers are present on all API responses.
    """
    resp = requests.get(f"{BASE_URL}/api/health", timeout=5)
    assert resp.status_code == 200

    headers = resp.headers

    # HSTS
    assert "Strict-Transport-Security" in headers, \
        "Missing HSTS header (Strict-Transport-Security)"

    # Content type sniffing protection
    assert headers.get("X-Content-Type-Options") == "nosniff", \
        f"Missing or wrong X-Content-Type-Options: {headers.get('X-Content-Type-Options')}"

    # Clickjacking protection
    x_frame = headers.get("X-Frame-Options", "")
    assert x_frame in ("DENY", "SAMEORIGIN"), \
        f"Missing or wrong X-Frame-Options: {x_frame}"

    # Optional but recommended
    assert "X-XSS-Protection" in headers or "Content-Security-Policy" in headers, \
        "Should have either X-XSS-Protection or Content-Security-Policy"
```

## Architecture Mapping

**Layer:** Infrastructure / Security Headers (Nginx)

**Flow:**
    any response → nginx add_header directives → HSTS + X-Content-Type-Options + X-Frame-Options ← NO TEST EXISTS HERE

**Upstream:** Any API or page response sent to client
**Downstream:** Without security headers, clickjacking, MIME sniffing, and protocol downgrade attacks are possible

## Verification
- [ ] Write test: `pytest tests/security/test_security_headers.py::test_security_headers_present_on_api_response -v` → PASS

## Downstream Impact
**Impact if unfixed:** Test gap — no automated regression detection for security headers. An Nginx config change could silently remove critical security headers.

## Links
- Phase SUMMARY: `.planning/phases/12-security-soc2/12-01-SUMMARY.md`
- Architecture doc: `docs/ARCHITECTURE.md`
- Related cases: CASE-188, CASE-190, CASE-195
