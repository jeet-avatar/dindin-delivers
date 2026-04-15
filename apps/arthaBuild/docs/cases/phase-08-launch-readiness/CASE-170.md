---
id: CASE-170
title: "SQLite DB backup script can restore DB and pass health check"
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
feature: "DB backup/restore"
test_ref: ""
files:
  - path: scripts/backup_db.sh
    lines: ""
  - path: scripts/restore_db.sh
    lines: ""
---

## Why This Case Was Created
ArthaBuild stores all customer data in a SQLite database. Customers need a backup and restore procedure for disaster recovery. The backup script should export the DB file and the restore script should import it. After restore, the application health check must pass. No automated test verifies the backup/restore round-trip works.

## What Is Wrong
No test exists for this behavior. A backup/restore procedure that appears to work but silently corrupts the DB is worse than no backup — false confidence. Without an automated test, the restore procedure is only verified when a real disaster occurs.

## Why It Was Done This Way (Root Cause)
Phase 08 plans backup/restore scripts as part of launch readiness. SQLite backup uses the `.backup()` API or a file copy with WAL checkpoint. The scripts are planned but not yet implemented.

## What Is Done Right
No code exists yet for this feature — it is planned for Phase 08. SQLite supports online backups via `VACUUM INTO` or the `sqlite3` command-line backup. The DB file is in the mounted volume `/app/data/arthaBuild.db`.

## How To Fix It
Write the following test in `tests/integration/test_backup_restore.py`:

```python
import subprocess
import shutil
import tempfile
import requests
import pytest
import os

@pytest.mark.integration
def test_backup_restore_round_trip():
    """
    Verify the backup script creates a valid backup and the restore script
    can restore it. Post-restore health check must pass.
    """
    backup_dir = tempfile.mkdtemp()
    backup_path = os.path.join(backup_dir, "arthabuild_backup.db")

    try:
        # 1. Run backup
        result = subprocess.run(
            ["bash", "scripts/backup_db.sh", backup_path],
            capture_output=True, text=True, timeout=30,
        )
        assert result.returncode == 0, f"Backup failed:\n{result.stderr}"
        assert os.path.exists(backup_path), "Backup file not created"
        assert os.path.getsize(backup_path) > 0, "Backup file is empty"

        # 2. Verify backup is valid SQLite
        result = subprocess.run(
            ["sqlite3", backup_path, "PRAGMA integrity_check;"],
            capture_output=True, text=True, timeout=10,
        )
        assert "ok" in result.stdout.lower(), f"Backup DB integrity check failed: {result.stdout}"

        # 3. Run restore
        result = subprocess.run(
            ["bash", "scripts/restore_db.sh", backup_path],
            capture_output=True, text=True, timeout=30,
        )
        assert result.returncode == 0, f"Restore failed:\n{result.stderr}"

        # 4. Health check must pass after restore
        resp = requests.get("http://localhost:8000/api/health", timeout=10)
        assert resp.status_code == 200, f"Health check failed after restore: {resp.text}"

    finally:
        shutil.rmtree(backup_dir, ignore_errors=True)
```

## Architecture Mapping

**Layer:** Operations / Disaster Recovery

**Flow:**
    backup_db.sh → SQLite .backup() → backup file → restore_db.sh → replace DB → health check PASS ← NO TEST EXISTS HERE

**Upstream:** Scheduled backup cron or pre-maintenance backup
**Downstream:** If broken, disaster recovery fails — permanent data loss

## Verification
- [ ] Write test: `pytest tests/integration/test_backup_restore.py::test_backup_restore_round_trip -v` → PASS

## Downstream Impact
**Impact if unfixed:** Test gap — no automated regression detection for backup/restore. A broken backup procedure is discovered only during a real disaster.

## Links
- Phase SUMMARY: `.planning/phases/08-launch-readiness/08-01-SUMMARY.md`
- Architecture doc: `docs/ARCHITECTURE.md`
- Related cases: CASE-153, CASE-193
