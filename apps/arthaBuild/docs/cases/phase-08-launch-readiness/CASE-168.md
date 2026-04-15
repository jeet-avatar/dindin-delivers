---
id: CASE-168
title: "Docker image build uses multi-stage build to minimize production image size"
phase: "08"
phase_name: "Launch Readiness"
category: FEATURE_TEST
severity: LOW
status: DONE
created: 2026-04-10
updated: 2026-04-11
assignee: "Suresh"
agent: "gsd-executor"
blocks: []
blocked_by: []
feature: "Docker image optimization"
test_ref: ""
files:
  - path: Dockerfile
    lines: ""
---

## Why This Case Was Created
ArthaBuild ships as a Docker image that customers pull and run in their AWS VPC. A large image (e.g., 5GB+ from dev dependencies) increases pull time, storage costs, and attack surface. A multi-stage Dockerfile separates build-time dependencies (pip install, node_modules) from the production image (only runtime dependencies). No test verifies the image uses multi-stage build or meets a size budget.

## What Is Wrong
No test exists for this behavior. A single-stage Dockerfile includes all build tools and dev dependencies in the production image — unnecessarily large and insecure.

## Why It Was Done This Way (Root Cause)
Phase 08 is the launch readiness phase. Image optimization is a planned hardening task. The Dockerfile may currently be a single-stage build. This PENDING case records the test requirement.

## What Is Done Right
No code exists yet for this feature — it is planned for Phase 08. The backend uses Python 3.11 with pip. The frontend uses Node.js 20 to build static assets. Both can benefit from multi-stage builds.

## How To Fix It
Write the following test in `tests/infra/test_docker_image.py`:

```python
import subprocess
import pytest

@pytest.mark.infra
def test_dockerfile_uses_multi_stage_build():
    """
    Verify Dockerfile contains at least 2 FROM statements (multi-stage build).
    """
    with open("Dockerfile") as f:
        content = f.read()

    from_lines = [line.strip() for line in content.splitlines() if line.strip().upper().startswith("FROM")]
    assert len(from_lines) >= 2, (
        f"Expected multi-stage Dockerfile (2+ FROM statements), found: {from_lines}"
    )


@pytest.mark.infra
def test_production_image_size_under_budget():
    """
    Verify the production Docker image is under the 3GB size budget.
    """
    result = subprocess.run(
        ["docker", "build", "--target", "production", "-t", "arthabuild-test:latest", "."],
        capture_output=True, text=True, timeout=300,
    )
    assert result.returncode == 0, f"Docker build failed:\n{result.stderr}"

    size_result = subprocess.run(
        ["docker", "image", "inspect", "arthabuild-test:latest",
         "--format", "{{.Size}}"],
        capture_output=True, text=True,
    )
    size_bytes = int(size_result.stdout.strip())
    size_gb = size_bytes / (1024 ** 3)
    assert size_gb < 3.0, f"Production image too large: {size_gb:.1f}GB (budget: 3GB)"
```

## Architecture Mapping

**Layer:** Infrastructure / Docker Build

**Flow:**
    Dockerfile (multi-stage) → build stage (pip install + npm build) → production stage (runtime only) → small image ← NO TEST EXISTS HERE

**Upstream:** Customer pulls Docker image for installation
**Downstream:** If single-stage, image is 5-8GB — slow pull, high storage cost, increased attack surface

## Verification
- [ ] Write test: `pytest tests/infra/test_docker_image.py -v` → PASS

## Downstream Impact
**Impact if unfixed:** Test gap — no automated regression detection for image optimization. A dependency addition could bloat the image significantly.

## Links
- Phase SUMMARY: `.planning/phases/08-launch-readiness/08-01-SUMMARY.md`
- Architecture doc: `docs/ARCHITECTURE.md`
- Related cases: CASE-151, CASE-167
