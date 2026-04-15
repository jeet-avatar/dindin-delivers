---
id: CASE-027
title: "No test coverage for Docker build or Terraform plan correctness"
phase: "05"
phase_name: "Docker & Terraform"
category: TEST_GAP
severity: LOW
status: PASS
created: 2026-04-10
updated: 2026-04-11
assignee: "Suresh"
agent: "gsd-executor"
blocks: []
blocked_by: []
files:
  - path: Dockerfile
    lines: "1-50"
  - path: docker-compose.yml
    lines: "1-60"
  - path: src/backend/tests/
    lines: ""
---

## Why This Case Was Created
CI/CD test coverage audit for infrastructure assets. The test suite in `src/backend/tests/` covers the Python application layer but has no test that validates the Docker build succeeds or that `docker-compose.yml` parses correctly. The `Dockerfile` and `docker-compose.yml` are modified by multiple phases (Phase 5, Phase 6 hardening, Phase 9 adding the new DB schema). A broken `COPY` directive or an invalid Compose service definition would only be caught on the next `docker compose up`, not in CI.

## What Is Wrong
The directory `src/backend/tests/` contains: `conftest.py`, `test_auth.py`, `test_chats.py`, `test_health.py`, `test_netsuite.py`, `test_rbac.py`, `test_security.py`, `test_user.py`. None of these files contain any test that:

1. Validates the `Dockerfile` is syntactically correct and builds successfully
2. Validates `docker-compose.yml` parses without errors (`docker compose config`)
3. Validates environment variables required by the Dockerfile are documented in `.env.example`

If a developer adds a new `COPY` directive referencing a file that doesn't exist, or changes a `RUN` command that breaks the layer cache in a way that fails silently in dev but fails in CI, there is no automated detection.

**Specific risk:** The `Dockerfile` uses a multi-stage build. If the `COPY --from=builder` path changes in the builder stage but not the final stage, `docker build` fails with a file-not-found error that pytest cannot detect.

## Why It Was Done This Way (Root Cause)
pytest is a Python test framework — it does not natively invoke Docker CLI commands. Docker build testing requires shell-level integration (bash scripts or a Makefile target). The Phase 5 plan focused on creating the Dockerfile and Compose file correctly for the first time; adding a CI validation layer for the infrastructure assets themselves was deferred.

## What Is Done Right
The Python test suite is comprehensive at the application layer (auth, chats, RBAC, security, health). The `Dockerfile` correctly uses multi-stage builds and the `docker-compose.yml` uses named volumes for data persistence. The `deploy.sh` script provides a reference deployment sequence.

## How To Fix It
**Step 1 — Create `scripts/validate-docker.sh` in the project root:**

```bash
#!/usr/bin/env bash
# validate-docker.sh — CI smoke test for Docker and Compose assets
# Does NOT build the full image (too slow for CI). Validates syntax and parse.

set -e

echo "=== Validating docker-compose.yml ==="
docker compose config --quiet
echo "docker-compose.yml: OK"

echo "=== Checking Dockerfile syntax (hadolint) ==="
if command -v hadolint &>/dev/null; then
    hadolint Dockerfile
    echo "Dockerfile: OK (hadolint)"
else
    echo "hadolint not installed — skipping lint (install: brew install hadolint)"
fi

echo "=== Checking required env vars in .env.example ==="
REQUIRED_VARS=(JWT_SECRET_KEY DATABASE_URL FRONTEND_BASE_URL OLLAMA_BASE_URL)
for var in "${REQUIRED_VARS[@]}"; do
    if grep -q "^${var}" .env.example 2>/dev/null; then
        echo ".env.example: $var OK"
    else
        echo "WARNING: $var not documented in .env.example"
    fi
done

echo "=== All Docker validation checks passed ==="
```

**Step 2 — Run `docker compose config` in CI pipeline.**

Add to `.github/workflows/` (or equivalent CI config):
```yaml
- name: Validate Docker Compose
  run: docker compose config --quiet
  working-directory: apps/arthaBuild
```

**Step 3 — Optional: add a `test_docker_compose_valid` pytest test using `subprocess`:**

```python
# src/backend/tests/test_infrastructure.py
import subprocess
import os
import pytest

def test_docker_compose_config_valid():
    """docker compose config must parse without errors."""
    project_root = os.path.join(os.path.dirname(__file__), "..", "..", "..", "..")
    result = subprocess.run(
        ["docker", "compose", "config", "--quiet"],
        capture_output=True,
        text=True,
        cwd=project_root,
    )
    assert result.returncode == 0, (
        f"docker compose config failed:\n{result.stderr}"
    )
```

Note: This test requires Docker to be installed on the CI runner. Mark it with `@pytest.mark.skipif(not shutil.which("docker"), reason="Docker not available")` for environments without Docker.

## Architecture Mapping

**Layer:** Deploy (infrastructure assets)

**Flow:**

    [Developer edits Dockerfile or docker-compose.yml]
                    ↓
    [git push → CI runs pytest]
                    ↓
    [No Docker tests → CI passes even with broken Dockerfile]
                    ↓
    [docker compose up fails in staging]
                    ↑
             GAP LIVES HERE — no CI gate on infra assets

**Upstream:** Developer changes to `Dockerfile`, `docker-compose.yml`, `nginx/` config
**Downstream:** `deploy.sh`, staging environment, production environment

## Verification
- [ ] Grep proof: `grep -rn "docker\|compose\|Dockerfile" src/backend/tests/` — confirms no existing Docker tests
- [ ] Test proof: `bash scripts/validate-docker.sh` (after creating the script)
- [ ] Runtime proof: `docker compose config --quiet` returns exit code 0

## Downstream Impact
**Impact if unfixed:** System Failure (on deploy)

A broken `Dockerfile` or `docker-compose.yml` causes `docker compose up` to fail in staging or production. This is a deployment blocker. Without automated validation, the failure is only discovered at deploy time, not at commit time. Low probability but high blast radius — a broken infrastructure asset blocks all deployments until fixed.

## Links
- Phase SUMMARY: `.planning/phases/05-docker-terraform/05-01-SUMMARY.md`
- Architecture doc: `docs/ARCHITECTURE.md`
- Related cases: CASE-028
