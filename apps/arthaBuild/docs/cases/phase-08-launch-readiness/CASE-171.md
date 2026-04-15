---
id: CASE-171
title: "CloudWatch alarm fires when /api/health returns non-200 for 3 consecutive minutes"
phase: "08"
phase_name: "Launch Readiness"
category: FEATURE_TEST
severity: LOW
status: DEFERRED
deferred_reason: "Requires AWS infrastructure or load testing tool — deferred to M2"
created: 2026-04-10
updated: 2026-04-11
assignee: "Suresh"
agent: "gsd-executor"
blocks: []
blocked_by: []
feature: "CloudWatch monitoring"
test_ref: ""
files:
  - path: terraform/monitoring.tf
    lines: ""
---

## Why This Case Was Created
Production monitoring requires a CloudWatch alarm that fires when the ArthaBuild health endpoint returns non-200 responses for 3 or more consecutive minutes. This alarm sends an SNS notification to the customer's ops team. Without this alarm, extended outages go undetected until a user reports them. No test verifies the CloudWatch alarm configuration exists and is correctly wired.

## What Is Wrong
No test exists for this behavior. A Terraform configuration error could silently prevent the alarm from being created, leaving the system without any monitoring.

## Why It Was Done This Way (Root Cause)
Phase 08 plans CloudWatch monitoring as part of launch readiness. The Terraform configuration for monitoring resources is planned but not yet implemented. This PENDING case records the test requirement.

## What Is Done Right
No code exists yet for this feature — it is planned for Phase 08. AWS CloudWatch supports metric alarms on ALB target health check metrics. Terraform has an `aws_cloudwatch_metric_alarm` resource. The SNS topic for notifications is planned.

## How To Fix It
Write the following test in `tests/infra/test_monitoring.py`:

```python
import subprocess
import json
import pytest

@pytest.mark.infra
def test_terraform_plan_includes_cloudwatch_alarm():
    """
    Verify the Terraform plan includes a CloudWatch alarm for health check failures.
    """
    result = subprocess.run(
        ["terraform", "show", "-json", "terraform.tfplan"],
        capture_output=True, text=True, timeout=30,
    )
    if result.returncode != 0:
        pytest.skip("terraform plan not available — run terraform plan first")

    plan = json.loads(result.stdout)
    resource_changes = plan.get("resource_changes", [])
    alarm_resources = [
        r for r in resource_changes
        if r.get("type") == "aws_cloudwatch_metric_alarm"
    ]
    assert len(alarm_resources) >= 1, (
        "No aws_cloudwatch_metric_alarm found in Terraform plan"
    )

    # Verify alarm targets health endpoint metric
    alarm = alarm_resources[0]
    values = alarm.get("change", {}).get("after", {})
    assert values.get("evaluation_periods", 0) >= 3, \
        "Alarm should evaluate over at least 3 periods"
    assert "HealthyHostCount" in str(values) or "health" in str(values).lower(), \
        "Alarm should reference health check metric"
```

## Architecture Mapping

**Layer:** Infrastructure / CloudWatch Monitoring (Terraform)

**Flow:**
    ALB health check → CloudWatch metric → alarm (3 consecutive failures) → SNS notification → ops team ← NO TEST EXISTS HERE

**Upstream:** Backend container becomes unhealthy
**Downstream:** If missing, extended outages are only discovered by user complaints — no ops visibility

## Verification
- [ ] Write test: `pytest tests/infra/test_monitoring.py::test_terraform_plan_includes_cloudwatch_alarm -v` → PASS

## Downstream Impact
**Impact if unfixed:** Test gap — no automated regression detection for monitoring configuration. Outages go undetected without alarms.

## Links
- Phase SUMMARY: `.planning/phases/08-launch-readiness/08-01-SUMMARY.md`
- Architecture doc: `docs/ARCHITECTURE.md`
- Related cases: CASE-155, CASE-164, CASE-167
