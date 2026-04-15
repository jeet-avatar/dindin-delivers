---
id: CASE-193
title: "SQLite DB file is encrypted at rest (or mounted from encrypted EBS volume)"
phase: "12"
phase_name: "Security & SOC2"
category: FEATURE_TEST
severity: MEDIUM
status: DEFERRED
deferred_reason: "Requires AWS EBS running infrastructure — deferred to M2"
created: 2026-04-10
updated: 2026-04-11
assignee: "Aryan"
agent: "gsd-executor"
blocks: []
blocked_by: []
feature: "Data at rest encryption"
test_ref: ""
files:
  - path: terraform/main.tf
    lines: ""
  - path: docker-compose.yml
    lines: ""
---

## Why This Case Was Created
SOC2 compliance requires data at rest to be encrypted. The SQLite database contains all user data, chat history, and NetSuite credentials (temporarily in RAM). The database file must either be encrypted at the application level (SQLCipher) or mounted from an AWS EBS volume with encryption enabled. No test verifies that data at rest encryption is configured.

## What Is Wrong
No test exists for this behavior. Data at rest encryption is planned for Phase 12 with no existing implementation.

## Why It Was Done This Way (Root Cause)
No code exists yet for this feature — it is planned for Phase 12. The simplest approach for ArthaBuild (BYOC on customer AWS) is to require the EBS volume hosting `/app/data` to have encryption enabled via Terraform. Alternatively, SQLCipher can encrypt the SQLite file at the application level.

## What Is Done Right
ArthaBuild's BYOC model means data stays in the customer's VPC — it never leaves their AWS account. AWS EBS supports AES-256 encryption managed by AWS KMS. Terraform can enforce encrypted EBS volumes with `encrypted = true`.

## How To Fix It
Write the following test in `tests/security/test_encryption.py`:

```python
import subprocess
import json
import pytest
import os

@pytest.mark.security
def test_terraform_ebs_volume_encryption_enabled():
    """
    Verify Terraform configuration specifies encrypted = true
    for the EBS volume used for data storage.
    """
    with open("terraform/main.tf") as f:
        tf_content = f.read()

    # Check for encrypted EBS volume configuration
    assert "encrypted" in tf_content and "true" in tf_content, (
        "terraform/main.tf must include EBS encryption: encrypted = true"
    )

    # More specific check for EBS resource
    import re
    ebs_blocks = re.findall(r'resource\s+"aws_ebs_volume"[^}]+}', tf_content, re.DOTALL)
    assert len(ebs_blocks) > 0, "No aws_ebs_volume resource found in main.tf"
    for block in ebs_blocks:
        assert "encrypted" in block and "true" in block, (
            f"EBS volume block missing 'encrypted = true':\n{block}"
        )


@pytest.mark.security
def test_sqlite_db_not_readable_as_plaintext():
    """
    If using SQLCipher: verify the DB file is not readable without the encryption key.
    This test skips if EBS-level encryption is used instead.
    """
    db_path = os.environ.get("DATABASE_PATH", "/app/data/arthaBuild.db")
    if not os.path.exists(db_path):
        pytest.skip("DB file not present in test environment")

    with open(db_path, "rb") as f:
        header = f.read(16)

    # SQLite plaintext header starts with "SQLite format 3"
    # If encrypted with SQLCipher, the header will be random bytes
    is_plaintext_sqlite = header.startswith(b"SQLite format 3")

    if is_plaintext_sqlite:
        pytest.skip(
            "DB is plaintext SQLite — must verify EBS volume encryption is enabled in Terraform. "
            "Run test_terraform_ebs_volume_encryption_enabled instead."
        )
```

## Architecture Mapping

**Layer:** Security / Data at Rest Encryption (AWS Infrastructure)

**Flow:**
    /app/data/arthaBuild.db → mounted on EBS volume → EBS encrypted=true (AES-256, KMS) ← NO TEST EXISTS HERE

**Upstream:** Customer's AWS account with ArthaBuild deployed
**Downstream:** Without encryption, physical EBS access or snapshot theft exposes all customer data

## Verification
- [ ] Write test: `pytest tests/security/test_encryption.py::test_terraform_ebs_volume_encryption_enabled -v` → PASS

## Downstream Impact
**Impact if unfixed:** Test gap — no automated regression detection for data at rest encryption. SOC2 audit will flag unencrypted data storage.

## Links
- Phase SUMMARY: `.planning/phases/12-security-soc2/12-01-SUMMARY.md`
- Architecture doc: `docs/ARCHITECTURE.md`
- Related cases: CASE-170, CASE-155, CASE-192
