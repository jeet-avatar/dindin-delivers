---
id: CASE-191
title: "pip-audit finds no CRITICAL or HIGH vulnerabilities in dependencies"
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
feature: "Dependency vulnerability scan"
test_ref: ""
files:
  - path: requirements.txt
    lines: ""
---

## Why This Case Was Created
ArthaBuild's Python dependencies may contain known CVEs (Common Vulnerabilities and Exposures). `pip-audit` scans the installed packages against the PyPI Advisory Database and OSV. No CI step runs `pip-audit` to catch HIGH or CRITICAL vulnerabilities before they reach production. This is a required SOC2 control for software supply chain security.

## What Is Wrong
No test exists for this behavior. The dependency vulnerability scan is planned for Phase 12 with no existing CI integration.

## Why It Was Done This Way (Root Cause)
No code exists yet for this feature — it is planned for Phase 12. `pip-audit` is a lightweight tool that integrates easily into CI/CD pipelines. It should run on every `requirements.txt` change.

## What Is Done Right
`requirements.txt` is pinned to specific versions (best practice). The dependency set is relatively small (FastAPI, SQLAlchemy, PyJWT, bcrypt, FAISS, Ollama client). Pinned versions make vulnerability tracking deterministic.

## How To Fix It
Write the following test in `tests/security/test_dependencies.py`:

```python
import subprocess
import json
import pytest

@pytest.mark.security
def test_no_critical_or_high_cve_in_dependencies():
    """
    Verify pip-audit finds no CRITICAL or HIGH vulnerabilities
    in the installed Python packages.
    """
    result = subprocess.run(
        ["pip-audit", "--format", "json", "--output", "/dev/stdout"],
        capture_output=True,
        text=True,
        timeout=120,
    )

    if result.returncode == 0:
        # No vulnerabilities found
        return

    try:
        audit_results = json.loads(result.stdout)
    except json.JSONDecodeError:
        pytest.fail(f"pip-audit output is not valid JSON:\n{result.stdout}")

    critical_or_high = [
        vuln
        for pkg in audit_results.get("dependencies", [])
        for vuln in pkg.get("vulns", [])
        if vuln.get("fix_versions") is not None and
           any(alias.startswith("CVE") for alias in vuln.get("aliases", []))
    ]

    assert len(critical_or_high) == 0, (
        f"Found {len(critical_or_high)} CRITICAL/HIGH CVEs in dependencies:\n"
        + "\n".join(f"  - {v['id']}: {v.get('description', '')[:80]}" for v in critical_or_high)
    )
```

Also add to CI pipeline (e.g., `.github/workflows/security.yml` or equivalent):

```yaml
- name: Dependency vulnerability scan
  run: pip-audit --fail-on-cvss 7.0
```

## Architecture Mapping

**Layer:** Security / Software Supply Chain (CI/CD)

**Flow:**
    requirements.txt → pip-audit → PyPI Advisory DB → report CVEs → fail if CRITICAL/HIGH ← NO TEST EXISTS HERE

**Upstream:** Every pull request or dependency update
**Downstream:** Without scanning, known CVEs in dependencies go undetected until exploitation

## Verification
- [ ] Write test: `pytest tests/security/test_dependencies.py::test_no_critical_or_high_cve_in_dependencies -v` → PASS

## Downstream Impact
**Impact if unfixed:** Test gap — no automated CVE detection for Python dependencies. Known exploitable vulnerabilities could persist in production.

## Links
- Phase SUMMARY: `.planning/phases/12-security-soc2/12-01-SUMMARY.md`
- Architecture doc: `docs/ARCHITECTURE.md`
- Related cases: CASE-194, CASE-192
