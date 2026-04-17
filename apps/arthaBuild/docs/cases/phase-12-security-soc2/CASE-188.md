---
id: CASE-188
title: "All HTTP requests are redirected to HTTPS in production (Nginx redirect)"
phase: "12"
phase_name: "Security & SOC2"
category: FEATURE_TEST
severity: MEDIUM
status: DEFERRED
deferred_reason: "Requires running OWASP ZAP tool against live deployment — deferred to M2"
created: 2026-04-10
updated: 2026-04-11
assignee: "Aryan"
agent: "gsd-executor"
blocks: []
blocked_by: []
feature: "HTTPS redirect"
test_ref: ""
files:
  - path: nginx/nginx.conf
    lines: ""
---

## Why This Case Was Created
All ArthaBuild traffic must be encrypted in transit. Any HTTP request should be redirected to HTTPS with a 301 redirect. Without this, credentials (including JWT tokens in Authorization headers) can be transmitted in plaintext over the network — a critical security vulnerability in production. No test verifies this redirect is configured.

## What Is Wrong
No test exists for this behavior. The HTTPS redirect is a planned security hardening for Phase 12. Without it, HTTP traffic carries unencrypted credentials.

## Why It Was Done This Way (Root Cause)
No code exists yet for this feature — it is planned for Phase 12. ArthaBuild runs in a customer VPC. TLS termination happens at the Nginx level or at the ALB. The Nginx configuration must include a server block on port 80 that returns 301 to the HTTPS equivalent.

## What Is Done Right
The Nginx configuration exists. HTTPS is the target deployment mode. The customer provisions an SSL certificate (self-signed or ACM). The redirect pattern is a standard Nginx configuration.

## How To Fix It
Write the following test in `tests/security/test_https_redirect.py`:

```python
import requests
import pytest

@pytest.mark.security
def test_http_redirects_to_https():
    """
    Verify that HTTP requests to port 80 are redirected to HTTPS with 301.
    """
    resp = requests.get("http://localhost:80/api/health", allow_redirects=False, timeout=5)
    assert resp.status_code in (301, 302), (
        f"Expected HTTP redirect (301/302), got {resp.status_code}"
    )
    location = resp.headers.get("Location", "")
    assert location.startswith("https://"), (
        f"Redirect location should be HTTPS, got: {location}"
    )


def test_nginx_conf_has_http_redirect_block():
    """
    Verify the nginx.conf file has an HTTP to HTTPS redirect configuration.
    """
    with open("nginx/nginx.conf") as f:
        content = f.read()

    has_redirect = ("return 301 https://" in content or
                    "rewrite ^ https://" in content or
                    "301 https" in content)
    assert has_redirect, (
        "nginx.conf must have HTTP to HTTPS redirect (301). "
        "Add: return 301 https://$host$request_uri;"
    )
```

## Architecture Mapping

**Layer:** Infrastructure / TLS Enforcement (Nginx)

**Flow:**
    HTTP request → nginx:80 → 301 redirect → https://host/path ← NO TEST EXISTS HERE

**Upstream:** Any client connecting over HTTP
**Downstream:** Without redirect, JWT tokens transmitted in plaintext — complete credential exposure

## Verification
- [ ] Write test: `pytest tests/security/test_https_redirect.py -v` → PASS

## Downstream Impact
**Impact if unfixed:** Test gap — no automated regression detection for HTTPS enforcement. An Nginx config change could silently disable HTTPS redirect, exposing all credentials.

## Links
- Phase SUMMARY: `.planning/phases/12-security-soc2/12-01-SUMMARY.md`
- Architecture doc: `docs/ARCHITECTURE.md`
- Related cases: CASE-152, CASE-195, CASE-189
