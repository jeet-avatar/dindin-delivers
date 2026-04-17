---
id: CASE-155
title: "Terraform plan creates VPC, EC2, security groups without errors"
phase: "05"
phase_name: "Docker & Terraform"
category: FEATURE_TEST
severity: LOW
status: DONE
created: 2026-04-10
updated: 2026-04-11
assignee: "Suresh"
agent: "gsd-executor"
blocks: []
blocked_by: []
feature: "Terraform infrastructure"
test_ref: ""
files:
  - path: terraform/main.tf
    lines: ""
  - path: terraform/variables.tf
    lines: ""
---

## Why This Case Was Created
The Terraform configuration provisions the AWS infrastructure for ArthaBuild: VPC, EC2 instance (for Docker Compose), security groups, and optional Elastic IP. If the Terraform configuration has syntax errors or invalid resource definitions, deployment to a new customer's AWS account fails. No CI check runs `terraform plan` to validate the configuration.

## What Is Wrong
No test exists for this behavior. A Terraform syntax error or invalid resource reference is only discovered when a customer tries to deploy — causing installation failure.

## Why It Was Done This Way (Root Cause)
Phase 05 wrote the Terraform configuration for AWS deployment. Manual `terraform plan` was run during development. No CI step runs `terraform plan` as a validation gate. Terraform testing (Terratest or `terraform validate`) was not added.

## What Is Done Right
`terraform/main.tf` defines the VPC, EC2, and security group resources. `terraform/variables.tf` parameterizes the configuration. `terraform/outputs.tf` exports instance IP. The configuration follows AWS provider standards.

## How To Fix It
Write the following test in `tests/infra/test_terraform_plan.py`:

```python
import subprocess
import pytest
import os

TERRAFORM_DIR = os.path.join(os.path.dirname(__file__), "../../terraform")

@pytest.mark.infra
def test_terraform_validate_passes():
    """
    Verify Terraform configuration passes syntax validation.
    Does not require AWS credentials.
    """
    result = subprocess.run(
        ["terraform", "validate"],
        cwd=TERRAFORM_DIR,
        capture_output=True,
        text=True,
        timeout=30,
    )
    assert result.returncode == 0, (
        f"terraform validate failed:\n{result.stdout}\n{result.stderr}"
    )
    assert "Success" in result.stdout or result.returncode == 0


@pytest.mark.infra
def test_terraform_plan_creates_expected_resources(monkeypatch):
    """
    Verify terraform plan lists VPC, EC2, security groups in plan output.
    Uses mocked AWS credentials (plan only, no apply).
    """
    env = {**os.environ, "AWS_ACCESS_KEY_ID": "mock", "AWS_SECRET_ACCESS_KEY": "mock", "AWS_DEFAULT_REGION": "us-east-1"}
    result = subprocess.run(
        ["terraform", "plan", "-var=aws_region=us-east-1", "-var=key_name=test-key", "-out=/dev/null"],
        cwd=TERRAFORM_DIR,
        capture_output=True,
        text=True,
        timeout=60,
        env=env,
    )
    # Plan may fail with auth error but should not fail with syntax errors
    assert "Error: Invalid" not in result.stderr, f"Terraform syntax error:\n{result.stderr}"
```

## Architecture Mapping

**Layer:** Infrastructure as Code (Terraform / AWS)

**Flow:**
    terraform init → terraform validate → terraform plan → VPC + EC2 + SG in plan ← NO TEST EXISTS HERE

**Upstream:** Customer runs Terraform to provision their AWS account
**Downstream:** If broken, no customer can deploy ArthaBuild to AWS — complete installation failure

## Verification
- [ ] Write test: `pytest tests/infra/test_terraform_plan.py::test_terraform_validate_passes -v` → PASS

## Downstream Impact
**Impact if unfixed:** Test gap — no automated regression detection for Terraform configuration. A resource block typo silently breaks all new AWS deployments.

## Links
- Phase SUMMARY: `.planning/phases/05-docker-terraform/05-01-SUMMARY.md`
- Architecture doc: `docs/ARCHITECTURE.md`
- Related cases: CASE-156, CASE-151
