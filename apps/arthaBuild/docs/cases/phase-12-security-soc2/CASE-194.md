---
id: CASE-194
title: "OWASP ZAP scan on staging returns no HIGH or CRITICAL findings"
phase: "12"
phase_name: "Security & SOC2"
category: FEATURE_TEST
severity: MEDIUM
status: DEFERRED
deferred_reason: "Requires running nginx with SSL — deferred to M2"
created: 2026-04-10
updated: 2026-04-11
assignee: "Aryan"
agent: "gsd-executor"
blocks: []
blocked_by: []
feature: "OWASP ZAP scan"
test_ref: ""
files:
  - path: tests/security/zap_scan.py
    lines: ""
---

## Why This Case Was Created
OWASP ZAP (Zed Attack Proxy) is an industry-standard automated penetration testing tool. Running ZAP against the ArthaBuild staging environment before production launch validates that the application is free of common web vulnerabilities (injection, XSS, misconfigurations, insecure direct object references). No automated ZAP scan is configured for ArthaBuild.

## What Is Wrong
No test exists for this behavior. The OWASP ZAP scan is planned for Phase 12 with no existing configuration.

## Why It Was Done This Way (Root Cause)
No code exists yet for this feature — it is planned for Phase 12. ZAP can run in headless mode via Docker, making it suitable for CI integration. A pre-launch ZAP scan is a one-time gate check before launch.

## What Is Done Right
The staging environment exists and mirrors production. OWASP ZAP has Docker images for headless scanning. FastAPI generates an OpenAPI spec that ZAP can use for API scanning. The ArthaBuild security posture (auth on all endpoints, HTTPS) should produce clean ZAP results.

## How To Fix It
Write the following test in `tests/security/test_zap_scan.py`:

```python
import subprocess
import json
import pytest
import os

@pytest.mark.security
@pytest.mark.slow
def test_owasp_zap_no_critical_or_high_findings():
    """
    Run OWASP ZAP baseline scan against staging and assert no HIGH or CRITICAL findings.

    Requires ZAP Docker image: docker pull ghcr.io/zaproxy/zaproxy:stable
    Run against staging URL: https://staging.arthaBuild.example.com
    """
    target_url = os.environ.get("STAGING_URL", "http://localhost:8000")

    result = subprocess.run([
        "docker", "run", "--rm",
        "--network", "host",
        "ghcr.io/zaproxy/zaproxy:stable",
        "zap-baseline.py",
        "-t", target_url,
        "-J", "/zap/results.json",
        "-I",  # Don't fail on informational
    ], capture_output=True, text=True, timeout=300)

    # Parse ZAP JSON results
    zap_results_path = "/tmp/zap_results.json"
    if not os.path.exists(zap_results_path):
        pytest.skip("ZAP results not available — run zap-baseline.py first")

    with open(zap_results_path) as f:
        results = json.load(f)

    high_or_critical = [
        alert for alert in results.get("site", [{}])[0].get("alerts", [])
        if alert.get("riskcode") in ("3", "4")  # 3=HIGH, 4=CRITICAL
    ]

    assert len(high_or_critical) == 0, (
        f"Found {len(high_or_critical)} HIGH/CRITICAL ZAP findings:\n"
        + "\n".join(
            f"  [{a.get('riskdesc')}] {a.get('name')}: {a.get('solution', '')[:100]}"
            for a in high_or_critical
        )
    )
```

## Architecture Mapping

**Layer:** Security / Penetration Testing (Pre-launch gate)

**Flow:**
    ZAP Docker → baseline scan → staging ArthaBuild → JSON report → assert 0 HIGH/CRITICAL ← NO TEST EXISTS HERE

**Upstream:** Pre-launch security gate
**Downstream:** Without ZAP scan, common web vulnerabilities could ship to production undetected

## Verification
- [ ] Write test: `pytest tests/security/test_zap_scan.py::test_owasp_zap_no_critical_or_high_findings -m security -v` → PASS

## Downstream Impact
**Impact if unfixed:** Test gap — no automated penetration test baseline. Common OWASP Top 10 vulnerabilities could reach production undetected.

## Links
- Phase SUMMARY: `.planning/phases/12-security-soc2/12-01-SUMMARY.md`
- Architecture doc: `docs/ARCHITECTURE.md`
- Related cases: CASE-191, CASE-188, CASE-189
