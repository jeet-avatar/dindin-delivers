"""
Alembic migration integrity tests.
CASE-009: alembic upgrade head must succeed.
CASE-029: alembic current shows head after upgrade.
"""
import subprocess
import os

BACKEND_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def test_alembic_upgrade_head_succeeds():
    """CASE-009: alembic upgrade head exits 0 (all migrations apply cleanly)."""
    result = subprocess.run(
        ["alembic", "upgrade", "head"],
        cwd=BACKEND_DIR,
        capture_output=True,
        text=True,
    )
    assert result.returncode == 0, f"alembic upgrade head failed:\n{result.stderr}"


def test_alembic_current_shows_head():
    """CASE-029: After upgrade, alembic current output contains 'head'."""
    result = subprocess.run(
        ["alembic", "current"],
        cwd=BACKEND_DIR,
        capture_output=True,
        text=True,
    )
    assert result.returncode == 0
    combined = result.stdout.lower() + result.stderr.lower()
    assert "head" in combined, \
        f"Expected 'head' in alembic current output:\n{result.stdout}\n{result.stderr}"
