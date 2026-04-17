---
id: CASE-195
title: "Nginx is configured to use only TLS 1.2+ and strong cipher suites"
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
feature: "TLS hardening"
test_ref: ""
files:
  - path: nginx/nginx.conf
    lines: ""
---

## Why This Case Was Created
TLS 1.0 and 1.1 are deprecated and vulnerable (POODLE, BEAST attacks). The Nginx configuration must restrict TLS to version 1.2 and 1.3 only, and use strong cipher suites (forward secrecy, no RC4, no 3DES). This is required by SOC2 and PCI-DSS. No test verifies the TLS configuration enforces these restrictions.

## What Is Wrong
No test exists for this behavior. TLS hardening is planned for Phase 12 with no existing enforcement. A default Nginx configuration may allow TLS 1.0 and weak ciphers.

## Why It Was Done This Way (Root Cause)
No code exists yet for this feature — it is planned for Phase 12. Nginx's `ssl_protocols` and `ssl_ciphers` directives control TLS version and cipher selection. The Mozilla SSL Configuration Generator provides recommended configurations. This is a pure configuration change in `nginx.conf`.

## What Is Done Right
Nginx is used as the TLS termination point. The Nginx configuration file exists. HTTPS is the target deployment mode. The Mozilla intermediate TLS configuration is a well-tested starting point.

## How To Fix It
Write the following test in `tests/security/test_tls_config.py`:

```python
import subprocess
import pytest
import re

@pytest.mark.security
def test_nginx_conf_disables_old_tls_versions():
    """
    Verify nginx.conf explicitly sets ssl_protocols to TLS 1.2 and 1.3 only.
    TLS 1.0 and 1.1 must not be enabled.
    """
    with open("nginx/nginx.conf") as f:
        content = f.read()

    # Find ssl_protocols directive
    protocols_match = re.search(r'ssl_protocols\s+([^;]+);', content)
    assert protocols_match, "nginx.conf missing ssl_protocols directive"

    protocols = protocols_match.group(1)
    assert "TLSv1.2" in protocols or "TLSv1.3" in protocols, \
        f"TLS 1.2/1.3 must be in ssl_protocols, got: {protocols}"
    assert "TLSv1.0" not in protocols, \
        f"TLS 1.0 must not be in ssl_protocols (deprecated), got: {protocols}"
    assert "TLSv1.1" not in protocols, \
        f"TLS 1.1 must not be in ssl_protocols (deprecated), got: {protocols}"


@pytest.mark.security
def test_nginx_conf_uses_strong_cipher_suites():
    """
    Verify nginx.conf uses strong cipher suites — no RC4, no 3DES, no NULL.
    """
    with open("nginx/nginx.conf") as f:
        content = f.read()

    ciphers_match = re.search(r'ssl_ciphers\s+([^;]+);', content)
    assert ciphers_match, "nginx.conf missing ssl_ciphers directive"

    ciphers = ciphers_match.group(1).upper()

    weak_ciphers = ["RC4", "NULL", "DES", "EXPORT", "MD5", "aNULL", "eNULL"]
    for weak in weak_ciphers:
        # Check if weak cipher is included (not excluded)
        if f"!{weak}" not in ciphers and weak in ciphers:
            pytest.fail(f"Weak cipher '{weak}' found in ssl_ciphers: {ciphers}")


@pytest.mark.security
def test_tls_connection_rejects_tls_1_0(tmp_path):
    """
    Verify the running Nginx rejects TLS 1.0 connections.
    Requires openssl CLI.
    """
    result = subprocess.run([
        "openssl", "s_client", "-tls1", "-connect", "localhost:443",
        "-verify_return_error"
    ], input="", capture_output=True, text=True, timeout=5)

    # TLS 1.0 connection should fail
    assert result.returncode != 0, (
        "TLS 1.0 connection succeeded — nginx should reject TLS 1.0"
    )
```

## Architecture Mapping

**Layer:** Infrastructure / TLS Hardening (Nginx)

**Flow:**
    TLS handshake → nginx ssl_protocols check → reject TLS < 1.2 → ssl_ciphers filter → strong cipher only ← NO TEST EXISTS HERE

**Upstream:** Any client attempting to connect with old TLS version
**Downstream:** Without TLS hardening, weak TLS versions can be exploited (POODLE, BEAST, SWEET32)

## Verification
- [ ] Write test: `pytest tests/security/test_tls_config.py -v` → PASS

## Downstream Impact
**Impact if unfixed:** Test gap — no automated regression detection for TLS configuration. An Nginx config reset could re-enable deprecated TLS versions.

## Links
- Phase SUMMARY: `.planning/phases/12-security-soc2/12-01-SUMMARY.md`
- Architecture doc: `docs/ARCHITECTURE.md`
- Related cases: CASE-188, CASE-189, CASE-194
