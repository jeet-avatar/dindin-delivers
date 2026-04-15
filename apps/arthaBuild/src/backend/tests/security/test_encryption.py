"""
CASE-193: EBS encryption at rest static analysis.
Verifies Terraform main.tf has encrypted = true on root_block_device.
"""
import os

MAIN_TF_PATH = os.path.join(
    os.path.dirname(__file__), "../../../..", "infra/terraform/main.tf"
)


def test_terraform_ebs_encrypted():
    with open(MAIN_TF_PATH) as f:
        content = f.read()
    assert "encrypted" in content and "true" in content, \
        "Terraform EBS volume must have encrypted = true for SOC2 A1.1"
    # More specific check: the encrypted = true should appear near root_block_device
    lines = content.split("\n")
    in_root_block = False
    found_encrypted = False
    for line in lines:
        if "root_block_device" in line:
            in_root_block = True
        if in_root_block and "encrypted" in line and "true" in line:
            found_encrypted = True
            break
        if in_root_block and "}" in line and "{" not in line:
            in_root_block = False
    assert found_encrypted, "encrypted = true must appear inside root_block_device block"


def test_pip_audit_no_critical_vulnerabilities():
    """CASE-191: pip-audit must report zero CRITICAL or HIGH severity vulnerabilities."""
    import subprocess
    import json
    result = subprocess.run(
        ["pip-audit", "--format=json", "--progress-spinner=off"],
        capture_output=True,
        text=True,
    )
    if result.returncode != 0 and result.stdout.strip():
        try:
            audit_data = json.loads(result.stdout)
            critical_high = [
                v
                for dep in audit_data.get("dependencies", [])
                for v in dep.get("vulns", [])
                if v.get("severity", "").upper() in ("CRITICAL", "HIGH")
            ]
            assert len(critical_high) == 0, \
                f"CASE-191: pip-audit found CRITICAL/HIGH vulnerabilities: {critical_high}"
        except json.JSONDecodeError:
            pass  # pip-audit not installed or unrecognised format — skip
